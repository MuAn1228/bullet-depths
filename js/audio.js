/* 弹膛深渊 - 音频：WebAudio 程序化合成音效 + 步进音序器音乐 */
'use strict';
(function(){
const A = {
  ctx:null, master:null, sfxGain:null, musGain:null,
  unlocked:false, muted:false,   // muted：静音开关（截图模式等使用；修复 BUG-006 死开关）
  _noiseBuf:null, _musicTimer:null, _curTrack:null, _step:0, _nextT:0,

  unlock(){
    if(this.unlocked || !window.AudioContext && !window.webkitAudioContext) return;
    try{
      this.ctx = new (window.AudioContext||window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value=-14; comp.ratio.value=8;
      this.master.connect(comp); comp.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value=0.7; this.sfxGain.connect(this.master);
      this.musGain = this.ctx.createGain(); this.musGain.gain.value=0.5; this.musGain.connect(this.master);
      // 噪声缓冲
      const len = this.ctx.sampleRate*1.2;
      this._noiseBuf = this.ctx.createBuffer(1,len,this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
      this.unlocked = true;
      if(this._curTrack) this.music(this._curTrack, true);
    }catch(e){ /* 无音频环境（无头测试） */ }
  },
  setVol(kind,v){ if(!this.ctx)return;
    if(kind==='master') this.master.gain.value=v;
    if(kind==='music') this.musGain.gain.value=v;
    if(kind==='sfx') this.sfxGain.gain.value=v;
  },

  /* ---- 基础发声 ---- */
  _osc(type, f0, f1, t0, dur, vol, dest){
    const c=this.ctx; const o=c.createOscillator(), g=c.createGain();
    o.type=type; o.frequency.setValueAtTime(f0,t0);
    if(f1!=null) o.frequency.exponentialRampToValueAtTime(Math.max(1,f1), t0+dur);
    g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g); g.connect(dest||this.sfxGain); o.start(t0); o.stop(t0+dur+.02);
  },
  _noise(t0, dur, vol, fType, f0, f1, q, dest){
    const c=this.ctx; const s=c.createBufferSource(); s.buffer=this._noiseBuf; s.loop=true;
    const f=c.createBiquadFilter(); f.type=fType||'lowpass'; f.Q.value=q||1;
    f.frequency.setValueAtTime(f0||3000,t0);
    if(f1!=null) f.frequency.exponentialRampToValueAtTime(Math.max(20,f1), t0+dur);
    const g=c.createGain(); g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    s.connect(f); f.connect(g); g.connect(dest||this.sfxGain); s.start(t0); s.stop(t0+dur+.02);
  },

  /* ---- 音效库 ---- */
  sfx(name, opt){
    if(!this.unlocked || !this.ctx || this.muted) return;
    opt = opt||{};
    const t = this.ctx.currentTime + 0;
    const S = this.sfxGain;
    const v = opt.v==null?1:opt.v;
    try{ switch(name){
      case 'pistol': this._noise(t,.09,.5*v,'highpass',900,null,1); this._osc('square',420,90,t,.09,.22*v); break;
      case 'smg': this._noise(t,.05,.3*v,'highpass',1400,null,1); this._osc('square',520,160,t,.05,.14*v); break;
      case 'shotgun': this._noise(t,.22,.8*v,'lowpass',3200,300,1); this._osc('triangle',160,40,t,.2,.5*v); break;
      case 'rifle': this._noise(t,.14,.65*v,'bandpass',1600,500,2); this._osc('sawtooth',300,60,t,.13,.3*v); break;
      case 'rocket': this._noise(t,.5,.5*v,'lowpass',1200,200,1); this._osc('sawtooth',140,60,t,.4,.3*v); break;
      case 'laser': this._osc('sawtooth',1100,700,t,.08,.14*v); this._osc('sine',2200,1800,t,.08,.08*v); break;
      case 'bee': this._osc('sawtooth',180,240,t,.1,.12*v); break;
      case 'boomer': this._osc('square',300,700,t,.15,.2*v); break;
      case 'plasma': this._osc('sine',900,200,t,.18,.3*v); this._osc('square',450,100,t,.18,.15*v); break;
      case 'explosion': this._noise(t,.6,.9*v,'lowpass',2500,60,1); this._osc('sine',120,30,t,.5,.8*v); this._noise(t,.25,.4*v,'highpass',2000,null,1); break;
      case 'hit': this._noise(t,.06,.35*v,'bandpass',2000,800,2); this._osc('square',250,120,t,.06,.12*v); break;
      case 'clank': this._osc('square',1800,900,t,.05,.15*v); this._noise(t,.04,.2*v,'highpass',4000,null,1); break;
      case 'hurt': this._osc('sawtooth',260,60,t,.25,.5*v); this._noise(t,.15,.3*v,'lowpass',1500,300,1); break;
      case 'die': this._noise(t,.4,.5*v,'lowpass',2000,200,1); this._osc('triangle',300,50,t,.35,.35*v); break;
      case 'roll': this._noise(t,.18,.25*v,'bandpass',700,1600,2); break;
      case 'reload': this._osc('square',700,500,t,.05,.14*v); this._osc('square',500,900,t+.14,.05,.16*v); break;
      case 'reloadEnd': this._osc('square',900,1400,t,.07,.2*v); break;
      case 'empty': this._osc('square',320,260,t,.05,.14*v); break;
      case 'coin': this._osc('square',1100,1600,t,.07,.16*v); this._osc('square',1500,2100,t+.05,.09,.14*v); break;
      case 'heart': this._osc('triangle',600,900,t,.12,.3*v); this._osc('triangle',900,1200,t+.1,.14,.25*v); break;
      case 'key': this._osc('square',1400,1900,t,.08,.16*v); this._osc('square',1900,2500,t+.06,.1,.14*v); break;
      case 'chest': this._osc('triangle',300,600,t,.3,.3*v); this._noise(t,.2,.25*v,'highpass',2500,null,1); break;
      case 'itemGet': [440,554,659,880].forEach((f,i)=>this._osc('square',f,f,t+i*.09,.14,.2*v)); break;
      case 'buy': this._osc('square',900,900,t,.08,.2*v); this._osc('square',1350,1350,t+.08,.12,.2*v); break;
      case 'error': this._osc('square',220,160,t,.16,.25*v); break;
      case 'doorSlam': this._noise(t,.2,.5*v,'lowpass',900,150,1); this._osc('sine',90,40,t,.2,.5*v); break;
      case 'doorOpen': this._noise(t,.3,.3*v,'bandpass',500,900,2); this._osc('sine',70,110,t,.25,.3*v); break;
      case 'flip': this._noise(t,.15,.4*v,'lowpass',1000,300,1); break;
      case 'break': this._noise(t,.2,.4*v,'highpass',1800,600,1); this._osc('square',400,150,t,.12,.12*v); break;
      case 'spike': this._noise(t,.08,.3*v,'highpass',2500,null,2); break;
      case 'roar': this._osc('sawtooth',120,40,t,.8,.7*v); this._noise(t,.7,.4*v,'lowpass',800,120,1); this._osc('sawtooth',180,50,t+.1,.7,.5*v); break;
      case 'phase': this._osc('sawtooth',80,220,t,.5,.6*v); this._noise(t,.4,.35*v,'bandpass',400,1600,2); break;
      case 'charge': this._osc('sawtooth',100,700,t,.6,.25*v); break;
      case 'tele': this._osc('sine',1400,300,t,.2,.25*v); break;
      case 'spawn': this._noise(t,.18,.3*v,'bandpass',600,1400,2); break;
      case 'victory': [523,659,784,1047,784,1047].forEach((f,i)=>this._osc('square',f,f,t+i*.13,.2,.22*v)); break;
      case 'defeat': [330,262,220,165].forEach((f,i)=>this._osc('triangle',f,f*.97,t+i*.22,.3,.3*v)); break;
      case 'ui': this._osc('square',800,1000,t,.05,.12*v); break;
      case 'blip': this._osc('square',600+Math.random()*300,900,t,.05,.09*v); break;
      case 'alarm': this._osc('square',700,500,t,.3,.2*v); this._osc('square',700,500,t+.35,.3,.2*v); break;
      case 'shock': this._noise(t,.3,.5*v,'lowpass',1800,100,1); this._osc('sine',100,35,t,.3,.6*v); break;
      case 'shield': this._osc('sine',500,900,t,.15,.25*v); this._noise(t,.1,.15*v,'highpass',3000,null,1); break;
      /* ---- 薛定谔的拍立得 ---- */
      case 'windup': for(let i=0;i<4;i++){ this._osc('square',420+i*150,null,t+i*.045,.035,.11*v); } this._noise(t,.18,.08*v,'highpass',2800,5200,1); break; // 上发条棘轮
      case 'shutter': this._osc('square',2300,1100,t,.03,.3*v); this._noise(t,.045,.28*v,'highpass',4200,null,1); this._osc('square',1700,820,t+.055,.04,.26*v); break; // 「咔哒」快门
      /* ---- 赌徒的灾难：赌场音效组 ---- */
      case 'gambler': this._noise(t,.05,.35*v,'highpass',2600,null,1); this._osc('square',640,220,t,.06,.18*v); break;  // 弹牌「啪」
      case 'gspin': for(let i=0;i<5;i++){ this._osc('square',200+i*60,null,t+i*.05,.03,.09*v); } this._noise(t,.26,.1*v,'bandpass',1500,3400,2); break; // 左轮转动+齿轮
      case 'gcard': this._noise(t,.1,.3*v,'highpass',2400,null,1); this._noise(t+.06,.08,.22*v,'bandpass',1700,2700,2); break; // 洗牌「唰唰」
      case 'gspade': this._osc('sawtooth',900,280,t,.12,.2*v); this._noise(t,.07,.18*v,'highpass',3200,null,1); break; // 黑桃：锋利
      case 'gheart': this._osc('triangle',520,780,t,.14,.24*v); this._osc('sine',780,1040,t+.08,.12,.18*v); break;      // 红桃：温热
      case 'gdiamond': this._osc('square',1200,1800,t,.09,.15*v); this._osc('square',1800,2500,t+.06,.1,.14*v); break;  // 方块：金响
      case 'gclub': this._noise(t,.11,.3*v,'bandpass',900,480,2); this._osc('square',300,140,t,.1,.14*v); break;        // 梅花：散射
      case 'gsilence': this._osc('sine',220,140,t,.55,.2*v); break;                                                     // Joker 前沉寂
      case 'greveal': this._noise(t,.2,.35*v,'bandpass',1200,2600,2); this._osc('sine',440,660,t+.1,.15,.12*v); break;  // 揭牌「唰」
      case 'gjackpot': this._osc('square',880,null,t,.09,.2*v); this._osc('square',1108,null,t+.09,.09,.2*v); this._osc('square',1318,null,t+.18,.1,.22*v); this._osc('square',1760,null,t+.27,.22,.24*v); break; // 老虎机铃声上行
      case 'gbad': this._osc('sawtooth',200,58,t,.42,.3*v); this._noise(t,.3,.2*v,'lowpass',900,180,1); break;          // BAD BET 低沉失败
      case 'flashPop': this._noise(t,.22,.6*v,'highpass',1400,6500,1); this._osc('sine',1900,320,t,.18,.28*v); break; // 镁光爆发
      case 'freeze': this._osc('sine',880,180,t,.42,.22*v); this._osc('triangle',1320,270,t,.42,.13*v); this._noise(t,.35,.1*v,'bandpass',900,300,2); break; // 时间冻结
      case 'photoTick': this._osc('square',1080,1320,t,.04,.11*v); break; // 伤害记录
      case 'develop': this._noise(t,.32,.18*v,'bandpass',320,950,3); this._osc('sine',210,460,t,.3,.11*v); this._osc('sine',330,690,t+.12,.22,.09*v); break; // 照片冲洗
      case 'photoBoom': this._noise(t,.5,.85*v,'lowpass',2300,70,1); this._osc('sine',150,28,t,.46,.75*v); this._noise(t,.16,.35*v,'highpass',2600,null,1); this._osc('sawtooth',90,320,t,.3,.2*v); break; // 结算暴击
      case 'shatter': this._noise(t,.34,.5*v,'highpass',1700,480,1); for(let i=0;i<5;i++){ this._osc('square',2050-i*280,1150-i*190,t+i*.032,.04,.11*v); } break; // 照片碎裂
    }}catch(e){}
  },

  /* ---- 音乐步进音序器 ---- */
  tracks: {
    title:{ bpm:76, bass:[28,0,31,0,26,0,31,0, 28,0,31,0,33,0,31,0], lead:[52,0,0,55,0,0,50,0, 52,0,0,47,0,0,0,0], hat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], vol:.5 },
    f1:{ bpm:104, bass:[26,26,0,26,33,0,31,0, 24,24,0,24,31,0,29,0], lead:[50,0,53,0,57,0,53,0, 48,0,51,0,55,0,58,0], hat:[1,0,1,1,0,1,1,0,1,0,1,1,0,1,1,0], kick:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], vol:.5 },
    f2:{ bpm:96, bass:[22,0,22,25,0,22,0,20, 22,0,25,0,27,0,25,20], lead:[46,0,0,49,0,51,0,0, 53,0,51,0,49,0,46,0], hat:[1,1,0,1,1,0,1,0,1,1,0,1,1,0,1,1], kick:[1,0,1,0,0,0,1,0,1,0,1,0,0,1,0,0], snare:[0,0,0,0,1,0,0,0,0,0,1,0,1,0,0,1], vol:.55 },
    boss:{ bpm:140, bass:[22,22,29,22,25,22,31,22, 22,22,29,22,25,27,26,25], lead:[58,0,56,58,0,61,58,0, 56,0,53,56,0,58,56,53], hat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], kick:[1,0,0,1,1,0,0,1,1,0,0,1,1,0,1,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,1], vol:.6 },
  },
  music(track, force){
    if(!track) return;
    if(this._curTrack===track && !force) return;
    this._curTrack = track;
    if(!this.unlocked || this.muted) return;
    if(this._musicTimer){ clearInterval(this._musicTimer); this._musicTimer=null; }
    if(track==='none'||!this.tracks[track]) return;
    this._step=0; this._nextT=this.ctx.currentTime+0.08;
    const T=this.tracks[track];
    const stepDur = 60/T.bpm/4;
    const midi = n=> 440*Math.pow(2,(n-69)/12);
    const sched = ()=>{
      if(!this.unlocked) return;
      while(this._nextT < this.ctx.currentTime + 0.15){
        const s = this._step % 16;
        const t = this._nextT;
        const M = this.musGain;
        if(T.bass[s]) this._osc('triangle', midi(T.bass[s]-12), null, t, stepDur*1.8, .20*T.vol, M);
        if(T.lead && T.lead[s]) this._osc('square', midi(T.lead[s]), null, t, stepDur*1.4, .06*T.vol, M);
        if(T.kick && T.kick[s]) this._osc('sine', 150, 40, t, .1, .5*T.vol, M);
        if(T.snare && T.snare[s]) this._noise(t, .09, .16*T.vol, 'bandpass', 1800, 900, 1, M);
        if(T.hat && T.hat[s]) this._noise(t, .03, .07*T.vol, 'highpass', 7000, null, 1, M);
        if(s%2===0 && T.arp!==false){ // 轻琶音
          const base = T.lead ? 60 : 57;
          this._osc('square', midi(base + (s%8)), null, t, .05, .03*T.vol, M);
        }
        this._nextT += stepDur; this._step++;
      }
    };
    sched();
    this._musicTimer = setInterval(sched, 60);
  },
  stopMusic(){ this.music('none'); }
};
G.audio = A;
})();
