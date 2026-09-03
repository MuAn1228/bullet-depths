/* 弹膛深渊 - 音频系统 2.0：总线混音 / 分层动态音乐 / 状态机 / 环境音 / 空间化 / 限流随机化
   ================================================================
   架构（2026-09-03 重制，公共 API 保持兼容：sfx/music/setVol/unlock/muted/_curTrack）：
   Master(Gain→Compressor→Destination)
     ├─ musicBus  → musicLP(LPF) ─┐ 分层动态音乐：每层独立 Gain（update() 每帧 lerp → 无爆音渐变）
     ├─ sfxBus                    │ 玩家武器/通用命中/爆炸（爆炸经 _duck 压音乐）
     ├─ playerBus                 │ 玩家专属（开火等）
     ├─ enemyBus                  │ 敌人（telegraph/死亡等，支持 sfxAt 定位声像）
     ├─ bossBus                   │ Boss 专属
     ├─ uiBus                     │ UI 反馈
     ├─ ambientBus                │ 环境音（房间 tone + 随机 drip/rumble/metal）
     └─ reverb(Convolver 生成 IR) ── 湿声 send（爆炸/Boss/奖励/裂隙类偏湿）
   音乐状态机（scheduler 每 30ms 前瞻调度，16 步×A/B 双小节，量化到小节切换防断拍）：
     title / f1(base+combat) / f2(base+combat) / f3(base+combat)
     boss(p1 + phase2 + enrage 三层，按 Boss 血量 60%/25% 自动叠层)
     base(hub) / victory / gameover
   战斗层由 curRoom.locked 实时驱动（探索 Base ↔ 战斗 Base+Combat 交叉淡化）；
   商店房音乐低通闷化；低血量心跳；音效随机化(音高±4%/音量±8%)与同名限流+全局
   voice cap（onended 回收计数）杜绝弹幕声音爆炸。 */
'use strict';
(function(){
const A = {
  ctx:null, master:null, comp:null, sfxGain:null, musGain:null,
  unlocked:false, muted:false,
  _noiseBuf:null, _musicTimer:null, _curTrack:null, _pending:null, _step:0, _nextT:0,
  buses:{}, musLP:null, musLayers:[], _combatTarget:0, _combatGain:0, _bossPh:1,
  _duckT:0, _hbT:0, _ambT:2, _drone:null, _droneF:null, _n:0,
  _lastP:{}, _gap:{},

  unlock(){
    if(this.unlocked || !window.AudioContext && !window.webkitAudioContext) return;
    try{
      this.ctx = new (window.AudioContext||window.webkitAudioContext)();
      const c=this.ctx;
      this.master = c.createGain(); this.master.gain.value = 0.55;
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value=-18; this.comp.ratio.value=6; this.comp.knee.value=12;
      this.master.connect(this.comp); this.comp.connect(c.destination);
      // 总线
      const mk=v=>{ const g=c.createGain(); g.gain.value=v; g.connect(this.master); return g; };
      this.musGain=mk(.6);  this.buses.music=this.musGain;
      this.sfxGain=mk(.85); this.buses.sfx=this.sfxGain;
      this.buses.player=mk(.9); this.buses.enemy=mk(.8); this.buses.boss=mk(.85);
      this.buses.ui=mk(.75);    this.buses.ambient=mk(.32);
      // 音乐 ducking 链（notes→musLP→musGain→duckG→master）+ 敌人总线声像
      this._duckG=c.createGain(); this._duckG.gain.value=1;
      this.musGain.disconnect(); this.musGain.connect(this._duckG); this._duckG.connect(this.master);
      if(c.createStereoPanner){ this._ePan=c.createStereoPanner(); this.buses.enemy.disconnect(); this.buses.enemy.connect(this._ePan); this._ePan.connect(this.master); }
      // 音乐低通（商店闷化）
      this.musLP=c.createBiquadFilter(); this.musLP.type='lowpass'; this.musLP.frequency.value=20000;
      this.musLP.connect(this.musGain);
      // 混响：生成式脉冲响应（0.9s 指数衰减立体声噪声）
      const ir=c.createBuffer(2, c.sampleRate*.9, c.sampleRate);
      for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch);
        for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.6); }
      const conv=c.createConvolver(); conv.buffer=ir;
      const wet=c.createGain(); wet.gain.value=.9;
      conv.connect(wet); wet.connect(this.master);
      this._reverb=conv; this._reverbIn=c.createGain(); this._reverbIn.gain.value=.14; this._reverbIn.connect(conv);
      // 噪声缓冲
      const len = c.sampleRate*1.2;
      this._noiseBuf = c.createBuffer(1,len,c.sampleRate);
      const d=this._noiseBuf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
      // 环境底噪（循环噪声→低通，房间 tone）
      const dr=c.createBufferSource(); dr.buffer=this._noiseBuf; dr.loop=true;
      this._droneF=c.createBiquadFilter(); this._droneF.type='lowpass'; this._droneF.frequency.value=160;
      this._drone=c.createGain(); this._drone.gain.value=.05;
      dr.connect(this._droneF); this._droneF.connect(this._drone); this._drone.connect(this.buses.ambient);
      dr.start();
      this.unlocked = true;
      if(this._curTrack) this.music(this._curTrack, true);
    }catch(e){ /* 无音频环境（无头测试） */ }
  },
  setVol(kind,v){ if(!this.ctx)return;
    const map={master:'master',music:'music',sfx:'sfx',ui:'ui',ambient:'ambient',player:'player',enemy:'enemy',boss:'boss'};
    if(kind==='master'){ this.master.gain.value=v; return; }
    const b=this.buses[map[kind]]; if(b) b.gain.value=v;
  },

  /* ============ 基础发声（自动随机化 + 限流 + 湿声 send） ============ */
  _rnd(){ return 1+(Math.random()*.08-.04); },
  _out(node, dest, wet){ node.connect(dest); if(wet) node.connect(this._reverbIn); },
  _osc(type, f0, f1, t0, dur, vol, dest, opt){
    opt=opt||{};
    if(this._n>56 && !opt.crit) return;
    if(!isFinite(f0)||!isFinite(t0)||!isFinite(dur)||!isFinite(vol)||(f1!=null&&!isFinite(f1))){
      if(!this._oscLogged){ this._oscLogged=1; console.error('OSC BAD type='+type+' f0='+f0+' f1='+f1+' t0='+t0+' dur='+dur+' vol='+vol+' track='+this._curTrack); }
      return;
    }
    const c=this.ctx, o=c.createOscillator(), g=c.createGain();
    const rp=opt.exact?1:this._rnd(), rv=1+(Math.random()*.16-.08);
    o.type=type; o.frequency.setValueAtTime(Math.max(1,f0*rp),t0);
    if(f1!=null) o.frequency.exponentialRampToValueAtTime(Math.max(1,f1*rp), t0+dur);
    if(opt.det) o.detune.value=opt.det;
    g.gain.setValueAtTime(Math.max(.0001,vol*rv),t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0+dur);
    if(opt.att) g.gain.setTargetAtTime(0, t0+dur*.6, dur*.25);
    o.connect(g); this._out(g, dest||this.sfxGain, opt.wet);
    o.start(t0); o.stop(t0+dur+.03);
    this._n++; o.onended=()=>{ this._n--; };
  },
  _noise(t0, dur, vol, fType, f0, f1, q, dest, opt){
    opt=opt||{};
    if(this._n>56 && !opt.crit) return;
    if(!isFinite(t0)||!isFinite(dur)||!isFinite(vol)){
      if(!this._nsLogged){ this._nsLogged=1; console.error('NS BAD t0='+t0+' dur='+dur+' vol='+vol+' type='+fType+' track='+this._curTrack+' step='+this._step); }
      return;
    }
    const c=this.ctx, s=c.createBufferSource(); s.buffer=this._noiseBuf; s.loop=true;
    const f=c.createBiquadFilter(); f.type=fType||'lowpass'; f.Q.value=q||1;
    const rp=opt.exact?1:this._rnd(), rv=1+(Math.random()*.16-.08);
    f.frequency.setValueAtTime(Math.max(20,(f0||3000)*rp),t0);
    if(f1!=null) f.frequency.exponentialRampToValueAtTime(Math.max(20,f1*rp), t0+dur);
    const g=c.createGain();
    g.gain.setValueAtTime(Math.max(.0001,vol*rv),t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0+dur);
    s.connect(f); f.connect(g); this._out(g, dest||this.sfxGain, opt.wet);
    s.start(t0); s.stop(t0+dur+.03);
    this._n++; s.onended=()=>{ this._n--; };
  },
  _punch(t0, f0, f1, dur, vol, dest, wet){ // 低频冲击：sine 下坠 + 高频 click
    this._osc('sine',f0,f1,t0,dur,vol,dest,{wet,exact:1});
    this._noise(t0,.02,vol*.5,'highpass',3000,null,1,dest,{wet:0});
  },

  /* ============ 音效库（全部重制：分层/瞬态/低频/尾音，名字保持兼容） ============ */
  sfx(name, opt){
    if(!this.unlocked || !this.ctx || this.muted) return;
    opt = opt||{};
    const now=performance.now(), gap=this._gap[name]!=null?this._gap[name]:(opt.min||40);
    if(!opt.force && now-(this._lastP[name]||0)<gap) return;      // 同名限流
    this._lastP[name]=now;
    const t = this.ctx.currentTime, v = opt.v==null?1:opt.v, S=this.sfxGain;
    const PB=this.buses.player, EB=this.buses.enemy, BB=this.buses.boss, U=this.buses.ui, W=.16;
    let dst=S;
    try{ switch(name){
      /* ---- 玩家武器（playerBus：各自声音语言） ---- */
      case 'pistol': dst=PB; this._noise(t,.03,.4*v,'highpass',2600,null,1,dst); this._noise(t,.09,.5*v,'bandpass',1700,500,2,dst,{wet:W}); this._punch(t,150,55,.11,.45*v,dst); break;
      case 'smg': dst=PB; this._gap[name]=30; this._noise(t,.035,.34*v,'highpass',2200,null,1,dst); this._osc('square',620,240,t,.045,.14*v,dst); this._punch(t,190,80,.06,.25*v,dst); break;
      case 'shotgun': dst=PB; this._punch(t,170,40,.24,.85*v,dst,W); this._noise(t,.26,.85*v,'lowpass',3400,260,1,dst,{wet:W}); this._noise(t,.5,.2*v,'lowpass',900,120,1,dst,{wet:.24}); break;
      case 'rifle': dst=PB; this._noise(t,.05,.55*v,'highpass',2000,null,1,dst); this._noise(t,.16,.6*v,'bandpass',1300,420,2,dst,{wet:W}); this._punch(t,220,60,.14,.5*v,dst); this._osc('square',420,180,t+.09,.07,.1*v,dst); break;
      case 'laser': dst=PB; this._osc('sawtooth',1300,640,t,.09,.15*v,dst); this._osc('sine',2300,1750,t,.08,.1*v,dst); this._noise(t,.04,.1*v,'highpass',4200,null,1,dst); break;
      case 'bee': dst=PB; this._osc('sawtooth',190,260,t,.11,.13*v,dst); this._osc('sawtooth',196,252,t,.11,.08*v,dst,{det:8}); break;
      case 'boomer': dst=PB; this._osc('square',290,720,t,.16,.2*v,dst); break;
      case 'plasma': dst=PB; this._osc('sine',950,190,t,.2,.32*v,dst,{wet:W}); this._osc('square',470,95,t,.18,.16*v,dst); this._noise(t,.1,.1*v,'bandpass',700,220,2,dst); break;
      case 'rocket': dst=PB; this._noise(t,.4,.45*v,'lowpass',1400,240,1,dst,{wet:W}); this._osc('sawtooth',150,70,t,.38,.3*v,dst); break;
      case 'rail': dst=PB; this._osc('sawtooth',2200,300,t,.16,.2*v,dst,{wet:W}); this._noise(t,.2,.4*v,'bandpass',1900,400,3,dst); this._punch(t,240,70,.16,.5*v,dst); break;
      case 'frost': dst=PB; this._noise(t,.18,.3*v,'bandpass',3400,900,2,dst); this._osc('sine',1600,700,t,.16,.14*v,dst); this._osc('sine',2150,980,t+.04,.14,.09*v,dst); break;
      case 'arc': dst=PB; this._osc('square',1100,500,t,.07,.16*v,dst); this._osc('sawtooth',1350,620,t,.07,.12*v,dst,{det:12}); this._noise(t,.09,.16*v,'highpass',2600,900,2,dst); break;
      /* ---- 命中/受击/死亡 ---- */
      case 'hit': this._gap[name]=35; this._noise(t,.05,.35*v,'bandpass',1900,700,2,dst); this._osc('square',260,110,t,.055,.13*v,dst); this._punch(t,180,70,.07,.22*v,dst); break;
      case 'hurt': dst=PB; this._noise(t,.1,.4*v,'lowpass',1600,260,1,dst); this._osc('sawtooth',280,58,t,.24,.42*v,dst); this._punch(t,210,60,.18,.55*v,dst); break;
      case 'die': dst=EB; this._gap[name]=45; this._noise(t,.3,.4*v,'lowpass',2100,190,1,dst,{wet:W}); this._osc('triangle',310,52,t,.28,.3*v,dst); this._punch(t,160,50,.12,.3*v,dst); break;
      case 'clank': this._osc('square',1750,880,t,.05,.16*v,dst); this._noise(t,.045,.22*v,'highpass',4100,null,1,dst); break;
      case 'break': this._noise(t,.2,.4*v,'highpass',1800,620,1,dst); this._osc('square',420,150,t,.12,.12*v,dst); break;
      case 'shock': this._noise(t,.3,.5*v,'lowpass',1900,90,1,dst,{wet:W}); this._punch(t,110,32,.3,.6*v,dst,W); break;
      /* ---- 通用机制 ---- */
      case 'roll': this._noise(t,.17,.26*v,'bandpass',680,1650,2,dst); break;
      case 'reload': this._osc('square',680,480,t,.05,.15*v,dst); this._noise(t,.05,.12*v,'highpass',2400,null,1,dst); this._osc('square',480,880,t+.13,.05,.17*v,dst); break;
      case 'reloadEnd': this._osc('square',880,1350,t,.07,.2*v,dst); this._noise(t,.05,.14*v,'highpass',3000,null,1,dst); break;
      case 'empty': this._osc('square',310,250,t,.05,.14*v,dst); break;
      case 'flip': this._noise(t,.15,.4*v,'lowpass',1050,280,1,dst); break;
      case 'spike': this._noise(t,.08,.3*v,'highpass',2500,null,2,dst); break;
      case 'charge': this._osc('sawtooth',95,720,t,.6,.26*v,dst); break;
      case 'tele': this._osc('sine',1400,280,t,.2,.25*v,dst,{wet:W}); break;
      case 'spawn': dst=EB; this._noise(t,.18,.3*v,'bandpass',620,1450,2,dst); break;
      case 'alarm': dst=EB; this._osc('square',700,480,t,.3,.2*v,dst); this._osc('square',700,480,t+.35,.3,.2*v,dst); break;
      case 'phase': this._osc('sawtooth',78,230,t,.5,.55*v,dst,{wet:W}); this._noise(t,.42,.35*v,'bandpass',380,1650,2,dst); break;
      case 'roar': dst=BB; this._osc('sawtooth',118,38,t,.8,.68*v,dst,{wet:W}); this._noise(t,.7,.42*v,'lowpass',820,110,1,dst,{wet:W}); this._osc('sawtooth',182,48,t+.1,.7,.5*v,dst,{wet:W}); break;
      case 'voidscream': dst=BB; this._osc('sawtooth',58,340,t,1,.55*v,dst,{wet:W}); this._osc('sine',240,88,t+.15,.8,.42*v,dst,{wet:W}); this._noise(t,.9,.32*v,'bandpass',300,2500,3,dst,{wet:W}); break;
      case 'shield': this._osc('sine',520,940,t,.15,.25*v,dst); this._noise(t,.1,.16*v,'highpass',3000,null,1,dst); break;
      case 'explosion': { // 三级爆炸：Attack+低频冲击+碎片+尾音（sz 由 W.explode 传入半径）
        const sz=opt.sz||2, big=sz>=2.3, small=sz<1.6;
        const d=big?.62:(small?.3:.45), lo=big?150:(small?220:180);
        this._noise(t,d*.7,.85*v,'lowpass',big?2800:2300,55,1,dst,{wet:.24,crit:1});
        this._punch(t,big?110:150,28,d*.8,.8*v,dst,{wet:.2,crit:1});
        this._noise(t+.04,d*.9,.4*v,'highpass',big?1600:2400,300,1,dst,{crit:1});
        this._noise(t+d*.5,.5,.16*v,'lowpass',700,90,1,dst,{wet:.3});
        this._duck(big?.5:.3); break; }
      /* ---- 拾取/奖励（稀有度分层） ---- */
      case 'coin': this._osc('square',1080,1560,t,.07,.16*v,dst); this._osc('square',1520,2140,t+.05,.09,.15*v,dst); break;
      case 'heart': this._osc('triangle',580,880,t,.12,.28*v,dst); this._osc('triangle',880,1180,t+.1,.14,.24*v,dst); break;
      case 'key': this._osc('square',1380,1880,t,.08,.16*v,dst); this._osc('square',1880,2520,t+.06,.1,.14*v,dst); break;
      case 'chest': this._osc('triangle',280,560,t,.3,.3*v,dst,{wet:W}); this._noise(t,.2,.24*v,'highpass',2500,null,1,dst); this._osc('sine',1560,2100,t+.22,.14,.1*v,dst,{wet:W}); break;
      case 'itemGet': [440,554,659,880].forEach((f,i)=>this._osc('square',f,f,t+i*.09,.14,.2*v,dst,{wet:W})); break;
      case 'rewardR': [523,659,784].forEach((f,i)=>this._osc('triangle',f,f*1.02,t+i*.08,.2,.22*v,dst,{wet:.24})); this._osc('sine',1046,1560,t+.26,.3,.16*v,dst,{wet:.3}); break;
      case 'rewardE': [392,523,659,784,1046].forEach((f,i)=>this._osc('square',f,f,t+i*.09,.22,.18*v,dst,{wet:.28})); this._punch(t+.4,180,60,.3,.4*v,dst,{wet:.3}); break;
      case 'rewardL': this._punch(t,200,45,.4,.7*v,dst,{wet:.3}); [523,659,784,1046,1318].forEach((f,i)=>this._osc('square',f,f*1.01,t+.15+i*.09,.24,.2*v,dst,{wet:.3})); this._osc('sine',2093,3200,t+.5,.5,.14*v,dst,{wet:.4}); break;
      case 'buy': this._osc('square',880,880,t,.08,.2*v,dst); this._osc('square',1320,1320,t+.08,.12,.2*v,dst); break;
      case 'error': this._osc('square',215,150,t,.16,.24*v,dst); break;
      /* ---- 门/房间/界面 ---- */
      case 'doorSlam': this._noise(t,.2,.5*v,'lowpass',900,140,1,dst); this._punch(t,95,38,.2,.55*v,dst); break;
      case 'doorOpen': this._noise(t,.3,.3*v,'bandpass',520,940,2,dst,{wet:W}); this._osc('sine',68,110,t,.25,.3*v,dst); break;
      case 'roomClear': [659,784,988].forEach((f,i)=>this._osc('triangle',f,f,t+i*.07,.16,.18*v,dst,{wet:.2})); break;
      case 'secret': [660,880,1100].forEach((f,i)=>this._osc('sine',f,f*1.5,t+i*.1,.3,.16*v,dst,{wet:.35})); break;
      case 'victory': [523,659,784,1047,784,1047,1318].forEach((f,i)=>this._osc('square',f,f,t+i*.11,.22,.2*v,dst,{wet:.24})); this._punch(t,200,55,.5,.5*v,dst,{wet:.3}); break;
      case 'defeat': [330,262,220,165].forEach((f,i)=>this._osc('triangle',f,f*.97,t+i*.22,.32,.3*v,dst,{wet:W})); this._punch(t,120,35,.8,.5*v,dst,{wet:.3}); break;
      case 'ui': this._osc('square',820,1020,t,.045,.12*v,dst); break;
      case 'blip': this._osc('square',620+Math.random()*300,900,t,.05,.09*v,dst); break;
      /* ---- Boss/机制专属（保持既有音色骨架，增强层次） ---- */
      case 'boomer2': break;
      case 'windup': for(let i=0;i<4;i++){ this._osc('square',420+i*150,null,t+i*.045,.035,.11*v,dst); } this._noise(t,.18,.08*v,'highpass',2800,5200,1,dst); break;
      case 'shutter': this._osc('square',2300,1100,t,.03,.3*v,dst); this._noise(t,.045,.28*v,'highpass',4200,null,1,dst); this._osc('square',1700,820,t+.055,.04,.26*v,dst); break;
      case 'gambler': this._noise(t,.05,.35*v,'highpass',2600,null,1,dst); this._osc('square',640,220,t,.06,.18*v,dst); break;
      case 'gspin': for(let i=0;i<5;i++){ this._osc('square',200+i*60,null,t+i*.05,.03,.09*v,dst); } this._noise(t,.26,.1*v,'bandpass',1500,3400,2,dst); break;
      case 'gcard': this._noise(t,.1,.3*v,'highpass',2400,null,1,dst); this._noise(t+.06,.08,.22*v,'bandpass',1700,2700,2,dst); break;
      case 'gspade': this._osc('sawtooth',900,280,t,.12,.2*v,dst); this._noise(t,.07,.18*v,'highpass',3200,null,1,dst); break;
      case 'gheart': this._osc('triangle',520,780,t,.14,.24*v,dst); this._osc('sine',780,1040,t+.08,.12,.18*v,dst); break;
      case 'gdiamond': this._osc('square',1200,1800,t,.09,.15*v,dst); this._osc('square',1800,2500,t+.06,.1,.14*v,dst); break;
      case 'gclub': this._noise(t,.11,.3*v,'bandpass',900,480,2,dst); this._osc('square',300,140,t,.1,.14*v,dst); break;
      case 'gsilence': this._osc('sine',220,140,t,.55,.2*v,dst); break;
      case 'greveal': this._noise(t,.2,.35*v,'bandpass',1200,2600,2,dst); this._osc('sine',440,660,t+.1,.15,.12*v,dst); break;
      case 'gjackpot': this._osc('square',880,null,t,.09,.2*v,dst); this._osc('square',1108,null,t+.09,.09,.2*v,dst); this._osc('square',1318,null,t+.18,.1,.22*v,dst); this._osc('square',1760,null,t+.27,.22,.24*v,dst); break;
      case 'gbad': this._osc('sawtooth',200,58,t,.42,.3*v,dst); this._noise(t,.3,.2*v,'lowpass',900,180,1,dst); break;
      case 'flashPop': this._noise(t,.22,.6*v,'highpass',1400,6500,1,dst); this._osc('sine',1900,320,t,.18,.28*v,dst); break;
      case 'freeze': this._osc('sine',880,180,t,.42,.22*v,dst); this._osc('triangle',1320,270,t,.42,.13*v,dst); this._noise(t,.35,.1*v,'bandpass',900,300,2,dst); break;
      case 'photoTick': this._osc('square',1080,1320,t,.04,.11*v,dst); break;
      case 'develop': this._noise(t,.32,.18*v,'bandpass',320,950,3,dst); this._osc('sine',210,460,t,.3,.11*v,dst); this._osc('sine',330,690,t+.12,.22,.09*v,dst); break;
      case 'photoBoom': this._noise(t,.5,.85*v,'lowpass',2300,70,1,dst,{wet:.24}); this._punch(t,150,26,.46,.75*v,dst,{wet:.24}); this._noise(t,.16,.35*v,'highpass',2600,null,1,dst); this._osc('sawtooth',90,320,t,.3,.2*v,dst); this._duck(.35); break;
      case 'shatter': this._noise(t,.34,.5*v,'highpass',1700,480,1,dst); for(let i=0;i<5;i++){ this._osc('square',2050-i*280,1150-i*190,t+i*.032,.04,.11*v,dst); } break;
      case 'voidblink': this._osc('sine',1600,180,t,.22,.3*v,dst); this._noise(t,.18,.25*v,'bandpass',2400,500,3,dst); break;
      case 'voidslash': this._noise(t,.12,.4*v,'highpass',1800,400,1,dst); this._osc('sawtooth',700,140,t,.1,.2*v,dst); break;
      case 'voidcharge': this._osc('sawtooth',60,240,t,.85,.3*v,dst); this._noise(t,.8,.12*v,'bandpass',200,900,2,dst); break;
      case 'voidorb': this._osc('sine',320,90,t,.25,.3*v,dst); this._noise(t,.12,.12*v,'bandpass',900,300,2,dst); break;
      case 'voidchant': [220,277,330].forEach((f,i)=>this._osc('sine',f,f*1.06,t+i*.12,.5,.16*v,dst,{wet:.2})); this._noise(t,.7,.08*v,'bandpass',500,1400,2,dst); break;
      case 'paperThrow': this._noise(t,.09,.18*v,'bandpass',1200,2600,2,dst); break;
      case 'paperCatch': this._noise(t,.05,.22*v,'bandpass',2000,900,2,dst); this._osc('square',1300,900,t,.04,.1*v,dst); break;
      case 'vinylShot': dst=PB; this._punch(t,150,40,.18,.55*v,dst); this._noise(t,.14,.28*v,'bandpass',900,2600,2,dst); this._osc('sawtooth',240,90,t,.1,.16*v,dst); break;
      case 'vinylBounce': this._punch(t,220,70,.06,.32*v,dst); this._noise(t,.05,.2*v,'highpass',2200,null,1,dst); break;
      case 'resonance': this._osc('square',620,1240,t,.12,.2*v,dst); this._osc('square',930,1860,t+.06,.1,.16*v,dst); this._noise(t,.14,.16*v,'bandpass',1600,3400,2,dst); break;
      case 'bassDrop': dst=PB; this._punch(t,120,30,.7,1*v,dst,{wet:.3,crit:1}); this._osc('sawtooth',70,30,t,.55,.5*v,dst,{crit:1}); this._noise(t,.5,.4*v,'lowpass',2400,80,1,dst,{wet:.3}); this._duck(.45); break;
      /* 献给太阳的左轮：机械音随温度分档（设计稿二十一），沸腾期心跳 / 主动散热喷气 / 蒸发嘶鸣 */
      case 'sunCool': this._osc('square',1500,900,t,.045,.22*v,dst); this._noise(t,.06,.16*v,'highpass',2000,700,1,dst); this._osc('sine',180,90,t,.08,.14*v,dst); break;
      case 'sunWarm': this._osc('square',1500,880,t,.05,.22*v,dst); this._noise(t,.07,.2*v,'highpass',1900,650,1,dst); this._osc('sine',150,70,t,.11,.2*v,dst); this._noise(t,.1,.08*v,'bandpass',500,240,1,dst); break;
      case 'sunHot': this._osc('square',1450,820,t,.055,.22*v,dst); this._noise(t,.08,.24*v,'highpass',1700,600,1,dst); this._osc('sawtooth',140,60,t,.16,.26*v,dst); this._noise(t,.14,.12*v,'bandpass',420,180,1,dst); break;
      case 'sunCrit': dst=PB; this._osc('square',1400,760,t,.06,.24*v,dst); this._noise(t,.09,.28*v,'highpass',1500,520,1,dst); this._osc('sawtooth',130,50,t,.2,.32*v,dst,{crit:1}); this._osc('sine',2600,3400,t,.1,.07*v,dst); this._noise(t,.18,.1*v,'bandpass',360,150,1,dst); break;
      case 'sunHeartbeat': dst=PB; this._osc('sine',62,40,t,.3,.55*v,dst,{crit:1}); this._osc('sine',48,30,t+.14,.4,.4*v,dst); break;
      case 'sunCharge': this._osc('sawtooth',220,1500,t,.2,.3*v,dst); this._noise(t,.2,.2*v,'bandpass',700,3200,2,dst); break;
      case 'sunshot': dst=PB; this._punch(t,180,42,.35,.9*v,dst,{wet:W,crit:1}); this._osc('sawtooth',1200,3200,t,.25,.18*v,dst,{det:14}); this._noise(t,.4,.25*v,'highpass',4000,1200,1,dst,{wet:W}); this._duck(.4); break;
      case 'sunEvaporate': this._noise(t,.34,.4*v,'bandpass',3400,600,2,dst,{wet:.2}); this._osc('sine',2600,300,t,.24,.16*v,dst); break;
      case 'sunImpact': dst=PB; this._punch(t,150,35,.5,.85*v,dst,{wet:.3,crit:1}); this._noise(t,.45,.3*v,'lowpass',3000,200,1,dst,{wet:.3}); this._duck(.35); break;
      case 'sunVent': this._noise(t,.3,.4*v,'bandpass',1500,3200,2,dst); this._noise(t,.22,.14*v,'highpass',4000,2400,1,dst); break;
      case 'overheatHiss': dst=PB; this._noise(t,.8,.7*v,'bandpass',1200,3400,2,dst,{wet:W}); this._osc('square',440,880,t,.12,.2*v,dst); this._punch(t,120,40,.25,.6*v,dst); break;
      case 'dryerTick': this._noise(t,.05,.06*v,'bandpass',700,1400,1,dst); break;
      case 'windBurst': this._noise(t,.4,.55*v,'lowpass',2800,300,1,dst); this._osc('sawtooth',140,60,t,.35,.25*v,dst); this._duck(.25); break;
      case 'riftSlash': this._noise(t,.12,.3*v,'highpass',2600,700,2,dst); this._osc('sawtooth',300,90,t,.1,.16*v,dst); break;
      case 'riftOpen': this._osc('sine',180,60,t,.3,.2*v,dst,{wet:.2}); this._noise(t,.25,.14*v,'bandpass',400,1200,2,dst); break;
      case 'riftTravel': this._osc('sine',1800,200,t,.16,.28*v,dst,{wet:.2}); this._noise(t,.14,.2*v,'bandpass',2800,600,3,dst); break;
      case 'riftCollapse': this._noise(t,.5,.7*v,'lowpass',2400,80,1,dst,{wet:.3,crit:1}); this._osc('sawtooth',260,40,t,.4,.3*v,dst,{crit:1}); this._noise(t+.1,.3,.3*v,'highpass',3400,900,2,dst,{crit:1}); this._duck(.4); break;
      case 'heartbeat': this._punch(t,85,45,.1,.5*v,this.buses.player); this._punch(t+.16,75,40,.09,.38*v,this.buses.player); break;
      case 'bossStinger': dst=BB; this._punch(t,180,32,.7,.8*v,dst,{wet:.3,crit:1}); this._noise(t,.6,.4*v,'lowpass',1100,140,1,dst,{wet:.3,crit:1}); this._osc('sawtooth',58,320,t+.15,.5,.4*v,dst,{wet:.3,crit:1}); break;
    }}catch(e){}
  },
  /* 定位声：按玩家位置做声像/衰减（敌人死亡等高频事件的空间感） */
  sfxAt(name,x,z,opt){
    opt=opt||{};
    const p=G.player;
    if(p){ const dx=x-p.x, dz=z-p.z, d=Math.hypot(dx,dz);
      opt.v=(opt.v||1)*Math.min(1,.6+d*.18);
      if(this._ePan) this._ePan.pan.value=G.clamp(dx/7,-1,1);
    }
    this.sfx(name,opt);
  },
  duck(d){ if(d>0) this._duckT=Math.max(this._duckT,d); },
  _duck(d){ this._duckT=Math.max(this._duckT||0,d); },

  /* ============ 分层动态音乐（16 步 ×A/B 双小节；层=独立 Gain 每帧 lerp） ============ */
  tracks: {
    title:{ bpm:76, base:{ bass:[28,0,31,0,26,0,31,0, 28,0,31,0,33,0,31,0], lead:[52,0,0,55,0,0,50,0, 52,0,0,47,0,0,0,0], hat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], vol:.5 } },
    f1:{ bpm:96,
      base:{ bass:{a:[38,0,0,0,41,0,0,0,43,0,0,36,0,0,45,0], b:[38,0,0,0,41,0,0,0,46,0,0,43,0,0,41,0]}, type:'tri',
             lead:{a:[0,0,0,62,0,0,65,0,0,0,0,0,69,0,0,0], b:[0,0,0,62,0,0,60,0,0,0,65,0,0,0,64,0]}, type2:'sine',
             kick:[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0], hat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], vol:.5 },
      combat:{ bass:[38,0,38,0,38,0,41,0,38,0,38,0,36,0,45,0], lead:[50,53,57,53,50,53,57,53,48,53,57,53,46,50,53,50],
               kick:[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1], hat:[1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1], vol:.55 } },
    f2:{ bpm:112,
      base:{ bass:{a:[32,0,32,0,32,0,39,0,32,0,32,0,31,0,27,0], b:[32,0,32,0,32,0,39,0,34,0,34,0,31,0,32,0]}, type:'saw',
             lead:{a:[0,0,0,0,0,0,0,55,0,0,0,0,0,0,0,0], b:[0,0,0,0,0,0,0,0,0,0,56,0,0,0,0,0]}, type2:'square',
             kick:[1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0], metal:[0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0], vol:.55 },
      combat:{ bass:[32,0,32,32,0,32,0,39,32,0,32,32,0,31,0,27], lead:[44,0,47,51,47,44,47,51,44,0,47,51,47,44,43,39],
               kick:[1,0,0,1,0,0,1,0,0,0,1,0,0,0,1,0], snare:[0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,1], hat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], vol:.6 } },
    f3:{ bpm:112,
      base:{ bass:{a:[24,0,24,0,27,0,26,0,22,0,22,0,25,0,27,26], b:[24,0,24,0,27,0,26,0,22,0,22,0,25,0,27,26]}, type:'tri',
             lead:{a:[49,0,52,0,56,0,52,0,51,0,54,0,58,0,54,0], b:[49,0,52,0,56,0,52,0,51,0,54,0,58,0,54,0]}, type2:'square',
             kick:[1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0], hat:[1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1], vol:.58 },
      combat:{ bass:[24,0,24,24,0,24,0,27,24,0,24,24,0,22,0,25], lead:[61,0,64,0,68,0,64,0,63,0,66,0,70,0,66,0],
               kick:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0], snare:[0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1], hat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], vol:.6 } },
    boss:{ bpm:140,
      base:{ bass:{a:[22,22,29,22,25,22,31,22, 22,22,29,22,25,27,26,25], b:[22,22,29,22,25,22,31,22, 22,22,29,22,25,27,26,25]}, type:'saw',
             lead:{a:[58,0,56,58,0,61,58,0, 56,0,53,56,0,58,56,53], b:[58,0,56,58,0,61,58,0, 56,0,53,56,0,58,56,53]}, type2:'square',
             kick:[1,0,0,1,1,0,0,1,1,0,0,1,1,0,1,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,1], hat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], vol:.6 },
      phase2:{ lead:[70,0,68,70,0,73,70,0, 68,0,65,68,0,70,68,65], snare:[1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1], hat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], vol:.5 },
      enrage:{ pulse:[76,0,76,0,76,0,76,0,76,0,76,0,76,0,76,0], kick:[1,1,0,1,1,0,0,1,1,0,0,1,1,0,1,1], noise:[0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,1], vol:.5 } },
    base:{ bpm:82, base:{ bass:[26,0,0,0,31,0,0,0, 28,0,0,0,33,0,31,0], lead:[52,0,55,0,0,59,0,0, 57,0,0,52,0,55,0,0], hat:[1,0,0,0,0,0,1,0, 0,0,1,0,0,0,0,0], kick:[1,0,0,0,0,0,0,0, 0,0,0,0,1,0,0,0], vol:.42 } },
    victory:{ bpm:118, base:{ bass:[36,0,0,43,0,0,45,0, 41,0,0,48,0,0,43,0], lead:[60,0,64,67,72,0,67,0, 69,0,72,76,72,0,67,64], hat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], vol:.5 } },
    gameover:{ bpm:60, base:{ bass:[31,0,0,0,0,0,0,0, 30,0,0,0,0,0,0,0], lead:[0,0,0,0,43,0,0,0, 0,0,0,0,42,0,0,0], vol:.45 } },
  },

  music(track, force){
    if(!track) return;
    if(this._curTrack===track && !force) return;
    this._curTrack = track;
    if(!this.unlocked || this.muted) return;
    if(track==='none'||!this.tracks[track]) return;
    this._pending = track;                       // 量化到下一小节切换，防断拍
    if(!this._musicTimer){
      this._step=0; this._bar=0; this._nextT=this.ctx.currentTime+.08;
      const self=this;
      this._musicTimer=setInterval(()=>self._sched(),30);
    }
  },
  /* 层增益（每帧 lerp，音符速度按层增益缩放 → 平滑交叉淡化无爆音） */
  _layerG:{combat:0, boss2:0, boss3:0},
  _layers(track){
    const T=this.tracks[track], out=[];
    if(!T) return out;
    if(track==='boss'){
      out.push({P:T.base,g:1});
      out.push({P:T.phase2,g:this._layerG.boss2});
      out.push({P:T.enrage,g:this._layerG.boss3});
      return out;
    }
    if(T.base) out.push({P:T.base,g:1});
    if(T.combat) out.push({P:T.combat,g:this._layerG.combat});
    return out;
  },
  _sched(){
    if(!this.unlocked || this.muted) return;
    const tr=this._curTrack, T=this.tracks[tr];
    if(!T) return;
    if(this._pending && this._pending!==tr){ tr=this._pending; this._curTrack=tr; this._step=0; this._bar=0; }
    const t=this.tracks[tr], bpm=t.bpm, stepDur=60/bpm/4;
    while(this._nextT < this.ctx.currentTime + .15){
      const s=this._step%16, tt=this._nextT;
      const key=(this._bar%2)?'b':'a';
      const midi=n=>440*Math.pow(2,(n-69)/12);
      try{
      for(const L of this._layers(tr)){
        if(L.g<.04) continue;
        const P=L.P, gv=L.g*(P.vol||.5);   // 层自带音量（base/combat/phase2 各异）
        const play=(arr,type,mul,fq)=>{ const n=arr[s]; if(n) this._mnote(type,midi(n),tt,stepDur,gv*(mul||1),fq); };
        if(P.bass) play(P.bass.a!=null?P.bass[key]:P.bass, P.type||'triangle', 1, 700);
        if(P.lead) play(P.lead.a!=null?P.lead[key]:P.lead, P.type2||'square', .45, 2400);
        if(P.kick&&P.kick[s]) this._mnote('sine',110,tt,stepDur,gv*1.5,120);
        if(P.snare&&P.snare[s]) this._noise(tt,.09,.16*gv,this.musLP,'bandpass',1800,900,1);
        if(P.hat&&P.hat[s]) this._noise(tt,.03,.07*gv,this.musLP,'highpass',7000,null,1);
        if(P.metal&&P.metal[s]) this._noise(tt,.12,.13*gv,this.musLP,'bandpass',3200,2200,6);
        if(P.pulse&&P.pulse[s]) this._mnote('sawtooth',midi(P.pulse[s]),tt,stepDur*.5,gv*.5,3000);
        if(P.noise&&P.noise[s]) this._noise(tt,.2,.1*gv,this.musLP,'bandpass',600,2400,1);
      }
      }catch(e){ if(!this._scLog){ this._scLog=1; console.error('SCHED THROW step='+this._step+' track='+tr+' : '+e.message); } }
      this._nextT+=stepDur; this._step++;
      if(this._step%16===0) this._bar++;
    }
  },
  _mnote(type,f,t,dur,vol,fq){                    // 音乐音符：musLP→musGain→duckG→master
    if(this._n>50) return;
    if(!isFinite(f)||!isFinite(t)||!isFinite(dur)||!isFinite(vol)){
      if(!this._mnLogged){ this._mnLogged=1; console.error('MN BAD f='+f+' t='+t+' dur='+dur+' vol='+vol+' step='+this._step+' bar='+this._bar+' track='+this._curTrack+' layerG='+JSON.stringify(this._layerG)); }
      return;
    }
    const c=this.ctx,o=c.createOscillator(),g=c.createGain(),lp=c.createBiquadFilter();
    lp.type='lowpass'; lp.frequency.value=fq||1200;
    o.type=type; o.frequency.value=f;
    g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(vol*.24,t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur*1.7);
    o.connect(g); g.connect(lp); lp.connect(this.musLP);
    o.start(t); o.stop(t+dur*1.8);
    this._n++; o.onended=()=>{this._n--;};
  },
  bossIntro(howl){                                // Boss 出场演出：环境让位→咆哮→stinger→Boss 音乐
    if(!this.unlocked){ this.music('boss',true); return; }
    this._ambT=1.2;
    this.sfx(howl||'roar',{v:1,min:1200,crit:1});
    this.sfx('bossStinger',{v:.9,min:1200,crit:1});
    this._duck(.9);
    setTimeout(()=>{ if(!this.muted) this.music('boss',true); },900);
  },
  stopMusic(){ this.music('none'); },
  /* 每帧：战斗层/Boss 阶段目标 → 层增益 lerp；商店闷化；ducking；低血心跳；环境音 */
  update(dt){
    if(!this.unlocked||!this.ctx) return;
    const g=G.game, p=g&&g.player;
    const inCombat=g && g.state==='play' && !g.inBase && g.curRoom && g.curRoom.locked;
    this._combatTarget=inCombat?1:0;   // 战斗层目标（update 统一写入，_sched/_layers 只读）
    const b=G.boss&&G.boss.active;
    const bph=(b&&!b.dead&&b.maxhp)?(b.hp/b.maxhp>.6?1:(b.hp/b.maxhp>.25?2:3)):1;
    // 层增益 lerp（≈0.8s 交叉淡化）
    const lp=(k,target)=>{ const cur=this._layerG[k]; this._layerG[k]=cur+(target-cur)*Math.min(1,3.5*dt); };
    lp('combat', inCombat?1:0);
    lp('boss2', bph>=2?1:0);
    lp('boss3', bph>=3?1:0);
    this._bossPh=bph;
    // 商店闷化 + ducking（duckG 独立于用户音量）
    const shop=g&&g.curRoom&&g.curRoom.type==='shop'&&g.state==='play';
    const lpf=shop?950:20000;
    this.musLP.frequency.value += (lpf-this.musLP.frequency.value)*Math.min(1,4*dt);
    if(this._duckT>0) this._duckT-=dt;
    const dg=this._duckT>0?.72:1;
    this._duckG.gain.value += (dg-this._duckG.gain.value)*Math.min(1,8*dt);
    // 低血量心跳
    if(p && !p.dead && g.state==='play' && p.hp<=p.maxHp/2){
      this._hbT-=dt;
      if(this._hbT<=0){ this._hbT=.75; this.sfx('heartbeat',{v:.6,min:200}); }
    } else this._hbT=Math.min(this._hbT,.2);
    // 环境音：底噪滤波随楼层 + 随机点缀（drip/rumble/energy/机械）
    const fl=g&&g.inBase?'base':(g?g.floorNum:1);
    this._droneF.frequency.value = fl==='base'?120:(fl===2?90:(fl===3?70:150));
    this._ambT-=dt;
    if(this._ambT<=0){
      this._ambT=3+Math.random()*5;
      const A2=this.buses.ambient, tt=this.ctx.currentTime;
      if(fl==='base') this._noise(tt,.4,.2*A2.gain.value,'bandpass',900,300,2,A2,{wet:1});
      else if(fl===1) this._osc('sine',1300,380,tt,.5,.12*A2.gain.value,A2,{wet:1});
      else if(fl===2) this._noise(tt,1.4,.3*A2.gain.value,'lowpass',300,60,1,A2,{wet:1});
      else this._osc('sine',420,660,tt,.9,.1*A2.gain.value,A2,{wet:1,det:14});
    }
  },
};
G.audio = A;
})();
