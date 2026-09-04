/* 第九层事故 - 【赌徒的灾难】Gambler's Calamity 武器系统
   职责清单（禁止逻辑散回其他模块）：
   ① DeckSystem：13 张迷你牌组（四花色×3 + Joker），抽牌入弃牌堆、耗尽/击杀重新洗牌
   ② CardEffectSystem：♠穿透衰减 / ♥吸血 / ♦必暴击+金币 / ♣五向散射（中心高两侧低）
   ③ JokerSystem：独立加权结果池（GOOD JACKPOT / MISFIRE / CHAOS / BLOOD DEBT /
      CATASTROPHE），揭牌戏剧化演出（慢动作+翻牌）
   ④ GamblingStreakSystem：连续花色计数 → 伤害加成 + Joker 权重上升
   ⑤ JackpotSystem：Streak 每 +5 触发一次（金币雨/横幅/铃声/震屏）；同花三条小爆
   ⑥ CardVFX：对象池纸牌飞行/揭牌翻面（Canvas 花色面，零运行时贴图分配）
   ⑦ HUD：STREAK ×N + LAST CARD（仅当前武器为赌徒时显示）
   武器属性/弹道全部复用 weapons.js（spawn/explode/bullet 池）；本模块不复制武器数值。 */
'use strict';
(function(){
const SUITS = ['spade','heart','diamond','club'];
const SUIT_INFO = {
  spade:  { sym:'♠', color:'#b8becc', fx:0x8a92a8 },
  heart:  { sym:'♥', color:'#e05a6a', fx:0xd84858 },
  diamond:{ sym:'♦', color:'#ffd23e', fx:0xe8c15a },
  club:   { sym:'♣', color:'#5ab87a', fx:0x4a9a6a },
  joker:  { sym:'★', color:'#c87aff', fx:0xb06aff },
};
const SUIT_PER_DECK = 3;                                   // 每花色 3 张 → 基础 13 张（12+Joker）
const STREAK_BONUS = s => s>=5 ? 1.30 : s>=3 ? 1.15 : s>=1 ? 1.05 : 1;
const CLUB_FALL = [1,.78,.78,.62,.62];                     // 梅花五向：中心最高
const JOKER_POOL = [                                       // 独立加权结果池（未来扩展 Ace/K/Q/J 直接 push）
  { id:'goodjackpot', w:3.75 },                            // 2026-09-02 调整：MISFIRE 减半的概率转入大奖
  { id:'misfire',     w:1.25 },
  { id:'chaos',       w:2.0 },
  { id:'blooddebt',   w:2.0 },
  { id:'catastrophe', w:1.5 },
];
const REVEAL_T = .3;                                       // Joker 揭牌时长（受慢动作放大）

const Gm = {
  deck:[], discard:[], recent:[], streak:0, jackpotAt:5,
  lastCard:null, lastEvent:'', jamT:0, wheelFast:0,
  reveal:null, _fly:[], _pool:[], _tex:{}, _hudBuilt:false, _els:null, _hudT:0, _shuffles:0,
  _jokerPick:null,                                          // 测试钩子：强制 Joker 结果

  /* ================= Deck System ================= */
  newDeck(){
    const jokers = 1 + (this.streak>=5 ? 2 : this.streak>=3 ? 1 : 0);   // Streak 越高，Joker 越多
    const d=[];
    for(const s of SUITS) for(let i=0;i<SUIT_PER_DECK;i++) d.push(s);
    for(let i=0;i<jokers;i++) d.push('joker');
    for(let i=d.length-1;i>0;i--){ const j=G.rng.int(0,i); const tmp=d[i]; d[i]=d[j]; d[j]=tmp; }
    return d;
  },
  shuffle(full){                                            // full：击杀/新局 → 全部重洗并播牌旋 VFX
    this.discard.length=0;
    this.deck=this.newDeck();
    this._shuffles++;
    if(full && this._active()) this._shuffleFx();
  },
  draw(){
    if(this.deck.length===0){ this.discard.length=0; this.deck=this.newDeck(); this._shuffleFx(); }
    const c=this.deck.pop();
    this.discard.push(c);
    return c;
  },
  onKill(){                                                 // 击杀 → 赌场重新洗牌
    if(!this._active()) return;
    this.shuffle(true);
  },

  /* ================= 开火链路（P.fire → chargeT → spawnPlayer 分流到此） ================= */
  release(p, ang, def){
    const card=this.draw();
    this.lastCard=card;
    const base=def.dmg*STREAK_BONUS(this.streak)*p.curDmgMul();
    const W=G.weapons, I=SUIT_INFO;
    this._flyCard(card,p,ang,false);                        // 弹出的旋转纸牌（纯视觉）
    if(card==='joker'){
      this.streak=0; this.recent.length=0;
      // 提前掷结果：CHAOS 揭牌不播慢动作，玩家保持全速吃满敌人减速窗口（2026-09-02 用户反馈）
      const result=this._jokerPick || this._rollJoker();
      this.reveal={t:0, ang, p, def, mesh:this._flyCard('joker',p,ang,true), result};
      G.audio.sfx('gsilence',{v:.55});                      // 先安静
      // 慢动作（2026-09-02：大奖/血债/灾难 0.45s；MISFIRE 0.5s——0.5+卡壳 0.5=1s 总惩罚；CHAOS 免慢动作）
      if(result==='misfire') G.fx.slowmo(.25,.5);
      else if(result!=='chaos') G.fx.slowmo(.25,.45);
      this._hud(true);
      return;
    }
    this.streak++;
    if(G.meta && this.streak>=8) G.meta.onStreak8();   // 局外里程碑：赌运亨通
    this.recent.push(card); if(this.recent.length>3) this.recent.shift();
    if(card==='spade'){
      W.spawn({team:'p',x:p.muzzleX,z:p.muzzleZ,ang,spd:18,dmg:base*1.15,size:.2,pierce:99,bounce:0,knock:3,
               life:13/18,crit:false,kind:'spade',color:I.spade.fx,dmgDecay:.85});
      G.audio.sfx('gspade',{v:.6});
    } else if(card==='heart'){
      W.spawn({team:'p',x:p.muzzleX,z:p.muzzleZ,ang,spd:15,dmg:base*0.9,size:.19,pierce:1,bounce:0,knock:2,
               life:11/15,crit:false,kind:'heart',color:I.heart.fx});
      G.audio.sfx('gheart',{v:.6});
    } else if(card==='diamond'){
      W.spawn({team:'p',x:p.muzzleX,z:p.muzzleZ,ang,spd:20,dmg:base*2.5,size:.2,pierce:0,bounce:0,knock:3,
               life:13/20,crit:true,kind:'diamond',color:I.diamond.fx});
      G.audio.sfx('gdiamond',{v:.6});
    } else if(card==='club'){
      for(let i=0;i<5;i++){
        W.spawn({team:'p',x:p.muzzleX,z:p.muzzleZ,ang:ang+(i-2)*.16,spd:16,dmg:base*CLUB_FALL[i],size:.14,
                 pierce:0,bounce:0,knock:2,life:16/16,crit:false,kind:'club',color:I.club.fx});
      }
      G.audio.sfx('gclub',{v:.6});
    }
    G.fx.shake(card==='diamond'?.05:.025);
    // 同花三条：最近 3 张同花色 → 小爆
    if(this.recent.length>=3 && this.recent[0]===this.recent[1] && this.recent[1]===this.recent[2]){
      this.lastEvent='threekind';
      W.explode(G.input.aimX,G.input.aimZ,1.8,18*p.curDmgMul(),'p');
      G.ui.banner('THREE OF A KIND','同 花 三 条 · GAMBLER\'S CALAMITY');
      G.audio.sfx('gjackpot',{v:.4});
      G.fx.shake(.22);
    }
    // JACKPOT：Streak 每 +5 必触发（下一档 10/15…）
    if(this.streak>=this.jackpotAt){
      this.jackpotAt+=5;
      this.lastEvent='jackpot';
      if(G.meta) G.meta.onJackpot();                   // 局外里程碑：头奖
      const n=6+G.rng.int(0,5);
      for(let i=0;i<n;i++) G.spawnPickup('money', p.x+(Math.random()-.5)*2.2, p.z+(Math.random()-.5)*1.8);
      G.ui.banner('JACKPOT！','GAMBLING STREAK ×'+this.streak+' · 大奖掉落');
      G.audio.sfx('gjackpot',{v:.8});
      G.fx.burst(p.x,.9,p.z,14,{color:0xffd23e,spd:3,life:.7,s0:.22});
      G.fx.burst(p.x,.9,p.z,10,{color:0xe8c15a,spd:2.2,life:.6,s0:.16});
      G.fx.ring(p.x,p.z,1.6,0xffd23e,.5);
      G.fx.shake(.4);
    }
    this._hud(true);
  },

  /* ================= Joker System ================= */
  _rollJoker(){
    let r=Math.random()*10.5;
    for(const j of JOKER_POOL){ r-=j.w; if(r<=0) return j.id; }
    return 'misfire';
  },
  _jokerResult(id,p,ang){
    const W=G.weapons;
    this.lastEvent=id;
    const ax=G.input.aimX, az=G.input.aimZ;
    if(id==='goodjackpot'){
      W.explode(ax,az,3.2,60*p.curDmgMul(),'p');
      for(let i=0;i<10;i++) G.spawnPickup('money', ax+(Math.random()-.5)*3, az+(Math.random()-.5)*2.4);
      G.ui.banner('JACKPOT！','G O O D   J A C K P O T · 大获全胜');
      G.audio.sfx('gjackpot',{v:.9});
      G.fx.burst(ax,.9,az,18,{color:0xffd23e,spd:3.4,life:.8,s0:.24});
      G.fx.burst(ax,.9,az,12,{color:0xc87aff,spd:2.6,life:.7,s0:.18});
      G.fx.shake(.5);
    } else if(id==='misfire'){
      this.jamT=0.5;                                        // 本次失败：短暂无法攻击（2026-09-02 二次缩短：1.2→0.7→0.5）
      G.ui.banner('BAD BET','MISFIRE · 卡壳 0.5 秒');
      G.audio.sfx('gbad',{v:.7});
      G.fx.shake(.2);
    } else if(id==='chaos'){
      for(const e of G.enemies.list){
        if(e.dead) continue;
        e.slowT=3; e.chaosT=3;                              // chaosT：持续醉步扰动（见 enemies.js 移动段）
        e.vx=(e.vx||0)+(Math.random()-.5)*3; e.vz=(e.vz||0)+(Math.random()-.5)*3;
        G.fx.particle(e.x,.8,e.z,{vy:.8,life:.4,color:0xb06aff,s0:.16,kind:'a'});
      }
      G.ui.banner('CHAOS','牌 桌 大 乱 · 全场混乱');
      G.audio.sfx('greveal',{v:.7});
      G.fx.shake(.3);
    } else if(id==='blooddebt'){
      W.explode(ax,az,2.6,45*p.curDmgMul(),'p');
      G.audio.sfx('gbad',{v:.8});
      G.ui.banner('BLOOD DEBT','血 债 · 巨大伤害，反噬 1 点生命');
      G.fx.shake(.45);
      p.invulnT=0;
      p.hurt(1, ang);                                       // 反噬：自伤 1（有受击保护，非永久）
    } else if(id==='catastrophe'){
      for(const e of G.enemies.list){ if(!e.dead) G.hurtEnemy(e,25,null,0,true); }
      p.invulnT=0;
      p.hurt(1, ang);
      G.fx.ring(p.x,p.z,2.6,0xb06aff,.5);
      G.fx.burst(p.x,.9,p.z,12,{color:0xb06aff,spd:3,life:.6,s0:.2});
      G.ui.banner('CATASTROPHE','灾 难 · 无差别浩劫');
      G.audio.sfx('gbad',{v:.8});
      G.fx.shake(.45);
    }
    this._hud(true);
  },

  /* ================= 每帧：Joker 揭牌时间线 / 纸牌飞行 / HUD ================= */
  update(dt){
    this.jamT=Math.max(0,this.jamT-dt);
    this.wheelFast=Math.max(0,this.wheelFast-dt*2);
    // Joker 揭牌：悬浮 → 慢慢翻面 → 结果
    if(this.reveal){
      const r=this.reveal; r.t+=dt;
      const k=Math.min(1,r.t/REVEAL_T);
      if(r.mesh){
        r.mesh.position.set(G.player?G.player.muzzleX:r.x||0, .9+Math.sin(r.t*7)*.07, G.player?G.player.muzzleZ:0);
        r.mesh.rotation.y=Math.PI*k;                        // 背面 → 正面
        r.mesh.rotation.z=Math.sin(r.t*3)*.15;
        if(k>=.5 && !r.flipped){ r.flipped=true; r.mesh.material.map=this._tex('joker'); r.mesh.material.needsUpdate=true;
          G.audio.sfx('greveal',{v:.7}); G.fx.shake(.12); }
        if(Math.random()<dt*10) G.fx.particle((G.player?G.player.x:0)+(Math.random()-.5),.9,(G.player?G.player.z:0)+(Math.random()-.5),
          {vy:.5,life:.4,color:0xb06aff,s0:.12,kind:'a'});
      }
      if(r.t>=REVEAL_T){
        if(r.mesh) this._recycle(r.mesh);
        const result=r.result;                              // 结果已在 release 时提前掷定
        this.reveal=null;
        this._jokerResult(result, r.p, r.ang);
      }
    }
    // 飞行纸牌（对象池回收）
    for(let i=this._fly.length-1;i>=0;i--){
      const f=this._fly[i]; f.t+=dt;
      if(f.reveal) continue;                                // 揭牌牌由 reveal 时间线驱动
      f.mesh.position.x+=f.vx*dt; f.mesh.position.z+=f.vz*dt;
      f.mesh.position.y=.85+Math.sin(f.t*14)*.05;
      f.mesh.rotation.z+=f.spin*dt;
      const op=Math.max(0,1-f.t/f.life);
      f.mesh.material.opacity=op;
      if(f.t>=f.life){ this._recycle(f.mesh); this._fly.splice(i,1); }
    }
    // HUD（懒构建：首帧 DOM 就绪后注入）
    if(!this._hudBuilt && document.getElementById('hud')) this._buildHud();
    this._hudT-=dt;
    if(this._hudBuilt && this._hudT<=0){ this._hudT=.12; this._refreshHud(); }
  },

  /* ================= Card VFX（对象池） ================= */
  _tex(name){
    if(this._tex[name]) return this._tex[name];
    const cv=document.createElement('canvas'); cv.width=64; cv.height=88;
    const x=cv.getContext('2d');
    if(name==='back'){
      x.fillStyle='#7a1e28'; x.fillRect(0,0,64,88);
      x.strokeStyle='#e8c15a'; x.lineWidth=3; x.strokeRect(5,5,54,78);
      x.fillStyle='#e8c15a'; x.font='bold 22px Georgia'; x.textAlign='center'; x.fillText('★',32,50);
    } else if(name==='joker'){
      x.fillStyle='#1a1024'; x.fillRect(0,0,64,88);
      x.strokeStyle='#c87aff'; x.lineWidth=3; x.strokeRect(4,4,56,80);
      x.fillStyle='#c87aff'; x.font='bold 34px Georgia'; x.textAlign='center'; x.fillText('★',32,44);
      x.fillStyle='#f0e2f8'; x.font='bold 13px Consolas'; x.fillText('JOKER',32,70);
    } else {
      const info=SUIT_INFO[name];
      x.fillStyle='#f2ead6'; x.fillRect(0,0,64,88);
      x.strokeStyle='#b8a878'; x.lineWidth=2; x.strokeRect(3,3,58,82);
      x.fillStyle=info.color; x.font='44px Georgia'; x.textAlign='center'; x.fillText(info.sym,32,56);
      x.font='bold 12px Consolas'; x.fillText(info.sym,9,16); x.fillText(info.sym,55,82);
    }
    const tx=new THREE.CanvasTexture(cv); tx.magFilter=THREE.NearestFilter; tx.disposableTx=true;
    this._tex[name]=tx;
    return tx;
  },
  _flyCard(card,p,ang,revealMode){
    let m=this._pool.pop();
    if(!m){
      m=new THREE.Mesh(new THREE.PlaneGeometry(.3,.42),
        new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide}));
      m.renderOrder=800;
    }
    m.material.map = revealMode ? this._tex('back') : this._tex(card);
    m.material.needsUpdate=true;
    m.material.opacity=1;
    m.position.set(p.muzzleX,.85,p.muzzleZ);
    m.rotation.set(0,0,Math.random()*G.TAU);
    G.scene.add(m);
    const f={mesh:m, vx:Math.cos(ang)*2.6, vz:Math.sin(ang)*2.6, t:0, life:.45, spin:10+Math.random()*6, reveal:revealMode};
    this._fly.push(f);
    return m;
  },
  _recycle(m){ G.scene.remove(m); this._pool.push(m); },
  _shuffleFx(){                                             // 击杀重洗：纸牌环绕旋转的感觉
    const p=G.player; if(!p) return;
    G.audio.sfx('gcard',{v:.5});
    for(let i=0;i<6;i++){
      const a=i/6*G.TAU;
      G.fx.particle(p.x+Math.cos(a)*.5,.9,p.z+Math.sin(a)*.5,
        {vx:Math.cos(a+2)*1.6,vz:Math.sin(a+2)*1.6,vy:.6,life:.4,color:i%2?0xf2ead6:0xe8c15a,s0:.12,kind:'a'});
    }
  },

  /* ================= HUD（STREAK ×N + LAST CARD，简洁不抢屏） ================= */
  _buildHud(){
    if(this._hudBuilt) return;
    this._hudBuilt=true;
    const hud=document.getElementById('hud');
    const d=document.createElement('div');
    d.id='gamblerHud'; d.className='hpanel'; d.style.display='none';
    d.innerHTML='<b id="gSym">—</b><span id="gStk">STREAK ×0</span><i id="gJam">卡壳中</i>';
    hud.appendChild(d);
    this._els={hud:d, sym:document.getElementById('gSym'), stk:document.getElementById('gStk'), jam:document.getElementById('gJam')};
  },
  _hud(force){ if(force){ this._hudT=0; } },
  _refreshHud(){
    if(!this._active()){
      if(this._els.hud.style.display!=='none') this._els.hud.style.display='none';
      return;
    }
    if(this._els.hud.style.display==='none') this._els.hud.style.display='block';
    const c=this.lastCard?SUIT_INFO[this.lastCard]:null;
    this._els.sym.textContent = c?c.sym:'—';
    this._els.sym.style.color = c?c.color:'#6a6152';
    const stk=this._els.stk;
    stk.textContent='STREAK ×'+this.streak + (this.streak>=this.jackpotAt-2?'　JACKPOT 临近':'');
    stk.style.color = this.streak>=3?'#ffd23e':'#b8ab8d';
    this._els.jam.style.display = this.jamT>0?'inline':'none';
  },

  /* ================= 入口 ================= */
  init(){ this._buildHud(); this.shuffle(false); },
  reset(){                                                  // 新局：一切归零（Run 生命周期）
    this.streak=0; this.jackpotAt=5; this.lastCard=null; this.lastEvent='';
    this.recent.length=0; this.jamT=0; this.wheelFast=0;
    if(this.reveal){ if(this.reveal.mesh) this._recycle(this.reveal.mesh); this.reveal=null; }
    for(const f of this._fly) this._recycle(f.mesh);
    this._fly.length=0;
    this.shuffle(false);
    this._hud(true);
  },
  _active(){
    const p=G.player, w=p&&p.weapons[p.curW];
    return !!(w && w.def.gambler);
  },
};
G.gambler = Gm;
})();
