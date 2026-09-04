/* 弹幕深渊 - 武器⑤【悖论骰子】：真 3D 悬浮机械骰体 / 每面独立视觉语言 / 现实不稳定度 / PARADOX 现实崩坏
   ---------------------------------------------------------------------------
   重做说明（2026-09-04）：旧实现（git 47f20df）被判定拉跨的三点，本版逐一解决——
     ① 旧版无骰子模型（只有数字环）→ 本版独立 3D 机械骰体：真六面骰 + 黄铜棱框 +
        发光符文角珠，悬浮于武器上方；掷骰高速翻滚，落定弹性归位并把结果面翻到顶部
     ② 旧版每点只有颜色 → 本版六个面独立视觉语言（面体材质按点数着色，落定时点亮；
        面光色 1灰/2黄/3橙/4冰蓝/5红/6白 + 大号 §N + 专属音效 + 对应弹道造型）
     ③ 旧版 PARADOX 只有 ring+flash → 本版四阶段全屏崩坏演出：hitstop 静止 →
        空间裂隙扩张（黑紫裂纹+紫色闪电枝）→ 现实错误（故障闪光/环境光闪烁/数字跳变）→
        BOOM 现实重置（全房真实伤害 + 大爆炸 + 强震屏）
   另补设计稿第九条「PARADOX CHARGE」：崩坏后接下来 5 次掷骰获得临时强化。

   职责清单（禁止逻辑散回其他模块）：
   - fire()/release()  开火接管：掷骰蓄力 · 1~6 各自真实攻击效果 · 连续计数/不稳定度 · PARADOX
   - update()          骰体动画（悬浮/翻滚/落定/面光）/ 不稳定度衰减 / 世界异常演出 / PARADOX 序列
   - paradox()         四阶段现实崩坏演出 + 全房真实伤害（精英×1.3，Boss hurtBoss 单次封顶）
   - clear()           换房/清场（game.cleanupDynamic 调用）
   数值常量集中在 K，调平衡只改这一处。测试可用 _force 强制点数。 */
'use strict';
(function(){
const GB = G.GeoBuilder;

/* ===== 数值常量（单一来源，改平衡只动这里） ===== */
const K = {
  CHARGE_T:.35,          // 掷骰蓄力时长（骰体高速翻滚）
  SETTLE_T:.16,          // 落定时长（旋转归位 + 弹性）
  FACE_GLOW:2.2,         // 结果面材质自发光强度（1~6 面按点数色点亮）
  PARADOX_CONS:4,        // 连续相同数字 4 次 → PARADOX
  INSTAB_DECAY:8,        // 现实不稳定度每秒衰减
  ONE_PUSH:6,            // 掷 1（厄运）额外推动的不稳定度（设计稿三：最差结果也在推进异常）
  FREEZE_T:1.2,          // 掷 4 冻结时长
  EXP_R:2.6, EXP_DMG:26, // 掷 6 毁灭（瞄准点爆炸）
  // PARADOX 全房伤害（Boss 单次封顶，与切割刀/点唱机/太阳左轮同一纪律）
  DMG_ENEMY:34, DMG_ELITE_MUL:1.3, DMG_BOSS:26,
  // PARADOX CHARGE（设计稿九：临时强化下一轮，禁止永久叠加）
  CHARGE_N:5, CHARGE_DMG:.25, CHARGE_R:.5, CHARGE_FREEZE:.35,
  // 世界异常阶段阈值（设计稿七）
  GLITCH_1:25, GLITCH_2:50, GLITCH_3:75,
  // PARADOX 四阶段时间轴（秒）
  SEQ_HITSTOP:.12, SEQ_CRACK:.15, SEQ_ERROR:.50, SEQ_BOOM:.80, SEQ_END:1.15,
};

/* ===== 六面视觉语言（设计稿十一）=====
   面光色：1 暗淡灰 / 2 双重黄 / 3 三重橙 / 4 冰蓝冻结 / 5 追踪红 / 6 巨大高亮白 */
const FC     = [0x9a9a9a, 0xffd23e, 0xff9a3e, 0x8fd0ff, 0xff5050, 0xffffff];
const FC_CSS = ['#9a9a9a','#ffd23e','#ff9a3e','#8fd0ff','#ff5050','#ffffff'];
const FD     = [0x34363c, 0x4a3c14, 0x4a2c12, 0x142c3c, 0x421a1a, 0x48484e]; // 面体暗色（未点亮）

/* 六面朝向（面组局部 +Z = 世界法线）与点数布点（设计稿十二：真骰面，对和 7） */
const FACES=[
  { rot:[-Math.PI/2,0,0],  pips:[[0,0]] },                                          // 1 顶
  { rot:[0,Math.PI/2,0],   pips:[[-.36,-.36],[.36,.36]] },                          // 2 前
  { rot:[0,0,0],           pips:[[-.36,-.36],[0,0],[.36,.36]] },                    // 3 右
  { rot:[0,Math.PI,0],     pips:[[-.36,-.36],[.36,-.36],[-.36,.36],[.36,.36]] },    // 4 左
  { rot:[0,-Math.PI/2,0],  pips:[[-.36,-.36],[.36,-.36],[0,0],[-.36,.36],[.36,.36]] }, // 5 后
  { rot:[Math.PI/2,0,0],   pips:[[-.42,-.36],[-.42,0],[-.42,.36],[.42,-.36],[.42,0],[.42,.36]] }, // 6 底
];
/* 把第 N 面翻到顶部（+Y，俯视可见）的目标四元数 */
const FACE_UP=(function(){
  const R=[[0,0,0],[0,0,Math.PI/2],[-Math.PI/2,0,0],[Math.PI/2,0,0],[0,0,-Math.PI/2],[Math.PI,0,0]];
  const out=[]; const e=new THREE.Euler();
  for(let i=0;i<6;i++){ e.set(R[i][0],R[i][1],R[i][2]); out.push(new THREE.Quaternion().setFromEuler(e)); }
  return out;
})();

/* ===== 骰子专用材质（⚠️ 绝不是共享材质：emissive 随面光逐帧改写，见 H7） ===== */
let _m=null;
function mats(){
  if(_m) return _m;
  const M=o=>new THREE.MeshStandardMaterial(Object.assign({roughness:.45,metalness:.75},o));
  _m={
    body: new THREE.MeshStandardMaterial({color:0x16181f, roughness:.5, metalness:.75}),
    brass: M({color:0xb08a3e, roughness:.3, metalness:.92}),
    rune:  M({color:0x2c3350, emissive:new THREE.Color(0x6a4aff), emissiveIntensity:.9}),
    pip:   M({color:0x0b0c10, roughness:.35, metalness:.6}),
    f:[],  // 六个面材（按点数暗色打底，掷骰结果点亮）
  };
  for(let i=0;i<6;i++) _m.f.push(M({color:FD[i], emissive:new THREE.Color(FC[i]), emissiveIntensity:0}));
  return _m;
}
function resetMats(){
  if(!_m) return;
  for(const k in _m){ if(k==='f') continue; _m[k].transparent=false; _m[k].opacity=1; }
  for(const f of _m.f){ f.transparent=false; f.opacity=1; }
}
function fade(op){ // 玩家死亡消散时同步淡出（player.animate 调用）
  if(!_m) return;
  for(const k in _m){ if(k==='f') continue; const m=_m[k]; m.transparent=true; m.opacity=op; }
  for(const f of _m.f){ f.transparent=true; f.opacity=op; }
}

/* ===== 骰体几何（模块级缓存） ===== */
let _g=null;
function geos(){
  if(_g) return _g;
  const H=.19;
  const body=new THREE.BoxGeometry(H*2,H*2,H*2);
  const plate=new THREE.BoxGeometry(H*2*.86,H*2*.86,.012);
  const pip=new THREE.SphereGeometry(.034,5,4);
  const corner=new THREE.OctahedronGeometry(.022,0);
  const ex=new THREE.BoxGeometry(H*2,.022,.022);   // X 向棱边
  const ey=new THREE.BoxGeometry(.022,H*2,.022);   // Y 向棱边
  const ez=new THREE.BoxGeometry(.022,.022,H*2);   // Z 向棱边
  /* 12 条棱边（机械结构）：[x,y,z,axis] axis:0=X 1=Y 2=Z */
  const edges=[];
  for(const sx of [-1,1]) for(const sz of [-1,1]) edges.push([0, sx*H, sz*H, 0]);
  for(const sx of [-1,1]) for(const sz of [-1,1]) edges.push([sx*H, 0, sz*H, 1]);
  for(const sx of [-1,1]) for(const sy of [-1,1]) edges.push([sx*H, sy*H, 0, 2]);
  _g={H, body, plate, pip, corner, ex, ey, ez, edges};
  return _g;
}

const S = {
  K, mats, resetMats, fade,
  lastRoll:0, cons:0, instab:0, _force:0, _chargeN:0,
  _rollState:'idle', _settleT:0, _showFace:0, _spin:null, _q0:null, _q1:null, _overglow:0,
  _crack:null, _seq:null, _glitchT:0, _glitch2T:0, _hudT:0,

  /* ---------- 状态复位（新一局 / 测试） ---------- */
  reset(){
    this.lastRoll=0; this.cons=0; this.instab=0; this._force=0; this._chargeN=0;
    this.clear();
  },

  /* ---------- 骰体构建（player.mkPlayerMesh 调用，挂到 refs.dice） ---------- */
  buildDie(){
    const g=geos(), M=mats();
    const grp=new THREE.Group();
    const spin=new THREE.Group();
    spin.add(new THREE.Mesh(g.body, M.body));
    for(const [x,y,z,axis] of g.edges){
      const e=new THREE.Mesh(axis===0?g.ex:(axis===1?g.ey:g.ez), M.brass);
      e.position.set(x,y,z); spin.add(e);
    }
    /* 六个面：面版 + 点数（面组局部 +Z 朝外，点数暗色凸点打在面版上） */
    for(let i=0;i<6;i++){
      const f=FACES[i];
      const fg=new THREE.Group();
      const plate=new THREE.Mesh(g.plate, M.f[i]);
      plate.position.z=g.H+.006;
      fg.add(plate);
      for(const [pu,pv] of f.pips){
        const pip=new THREE.Mesh(g.pip, M.pip);
        pip.position.set(pu*.30, pv*.30, g.H+.018);
        fg.add(pip);
      }
      fg.rotation.set(f.rot[0], f.rot[1], f.rot[2]);
      spin.add(fg);
    }
    /* 8 角发光符文（能量脉动，待机即“活着”） */
    for(let i=0;i<8;i++){
      const sx=i&1?1:-1, sy=(i>>1)&1?1:-1, sz=(i>>2)&1?1:-1;
      const c=new THREE.Mesh(g.corner, M.rune);
      c.position.set(sx*g.H, sy*g.H, sz*g.H);
      spin.add(c);
    }
    grp.add(spin);
    grp.position.set(.14,.30,-.10);      // 悬浮于武器上方偏前
    grp.userData.baseY=.30;
    grp.userData.refs={spin};
    grp.visible=false;
    return grp;
  },

  /* ---------- 开火接管：掷骰蓄力（骰体开始高速翻滚） ---------- */
  fire(p,w,aimAng){
    this._rollState='rolling';
    G.audio.sfx('diceRoll',{v:.5});
  },

  /* ---------- 掷骰结算（player 的 chargeT 结束时调用） ---------- */
  release(p, w, aimAng){
    const def=w.def;
    if(p.stormT<=0) w.ammo--;
    const roll=this._force || (1+((Math.random()*6)|0));
    this._force=0;
    this.cons = (roll===this.lastRoll)? this.cons+1 : 1;
    this.lastRoll = roll;
    this.instab = Math.min(100, this.cons*25);
    const charged = this._chargeN>0;
    if(charged) this._chargeN--;
    const mul = charged? 1+K.CHARGE_DMG : 1;

    /* 骰体落定演出：结果面翻到顶部 + 弹性归位 */
    this._showFace = roll;
    this._rollState = 'settle';
    this._settleT = K.SETTLE_T;
    const die = p.refs && p.refs.dice;
    if(die){
      const spin = die.userData.refs.spin;
      this._spin = spin;
      this._q0 = spin.quaternion.clone();
      this._q1 = FACE_UP[roll-1];
    }

    /* 掷骰结果反馈：咚 + 对应数字音 + 结果环 + 大号 §N（不看 HUD 也知道出了什么） */
    G.audio.sfx('diceStop',{v:.55});
    G.audio.sfx('dice'+roll,{v:.6});
    G.fx.ring(p.x, p.z, .9, FC[roll-1], .4);
    G.fx.dmgNum(p.x, 1.9, p.z, '§'+roll, roll===6, {color:FC_CSS[roll-1], scale: roll===6?1.7:1.35});
    if(roll===6) G.fx.shake(.28);

    /* 连续相同数字达到 PARADOX_CONS → 本次改为现实崩坏 */
    if(this.cons>=K.PARADOX_CONS){
      this.paradox(p,w,roll);
      if(w.ammo<=0 && p.stormT<=0) G.playerCtl.reload(p);
      return;
    }

    /* 1~6 各自真实攻击效果（kind 链均在 weapons.js） */
    const mk=o=>G.weapons.spawn(Object.assign({
      team:'p', x:p.muzzleX, z:p.muzzleZ, ang:aimAng, spd:10, dmg:0, size:.16, life:1,
      pierce:0, bounce:0, knock:2, wid:w.id, kind:'', color:FC[roll-1],
    }, o));
    switch(roll){
      case 1: // 厄运：单发弱弹 + 额外推动现实异常（最差结果也在推进）
        mk({dmg:def.dmg*.5*mul, life:.55, size:.13, color:0x8a8a90});
        this.instab = Math.min(100, this.instab+K.ONE_PUSH);
        break;
      case 2: // 双重：两枚略分散
        mk({ang:aimAng-.06, dmg:def.dmg*.85*mul, life:1.2});
        mk({ang:aimAng+.06, dmg:def.dmg*.85*mul, life:1.2});
        break;
      case 3: // 三重散射
        for(const da of [-.16,0,.16]) mk({ang:aimAng+da, dmg:def.dmg*.7*mul, life:1.3});
        break;
      case 4: // 冻结：现实决定此敌此刻不能行动（kind:dice4 命中→pinT 钉住）
        G.weapons.spawn({team:'p', x:p.muzzleX, z:p.muzzleZ, ang:aimAng, spd:8.5,
          dmg:def.dmg*.7*mul, size:.18, color:0x8fd0ff, life:1.2, pierce:0, knock:1,
          wid:w.id, kind:'dice4', pin:K.FREEZE_T+(charged?K.CHARGE_FREEZE:0)});
        break;
      case 5: // 追踪：红色锁定弹（kind:homing 自带追踪）
        G.weapons.spawn({team:'p', x:p.muzzleX, z:p.muzzleZ, ang:aimAng, spd:6.5,
          dmg:(def.dmg+3)*mul, size:.2, color:0xff5050, life:3, pierce:0, knock:2,
          wid:w.id, kind:'homing'});
        G.audio.sfx('shock',{v:.3});
        break;
      case 6: { // 毁灭：瞄准点大爆炸（4.5 格远处）
        const ax=p.x+Math.cos(aimAng)*4.5, az=p.z+Math.sin(aimAng)*4.5;
        G.weapons.explode(ax, az, K.EXP_R+(charged?K.CHARGE_R:0), K.EXP_DMG*mul, 'p');
        break; }
    }
    if(w.ammo<=0 && p.stormT<=0) G.playerCtl.reload(p);
  },

  /* ---------- PARADOX：四阶段现实崩坏演出（全屏） ---------- */
  paradox(p,w,roll){
    /* 现实重置：连续计数/不稳定度清零，进入 PARADOX CHARGE 窗口 */
    this.cons=0; this.lastRoll=0; this.instab=0;
    this._chargeN=K.CHARGE_N;
    /* 定位房间中心（裂隙演出用） */
    const room=G.roomAt(p.x,p.z)||G.game.curRoom;
    const cx=room? (room.x0+room.x1)/2 : p.x;
    const cz=room? (room.z0+room.z1)/2 : p.z;
    /* 阶段一「静止」：hitstop 冻结全游戏 + 音效被压低 */
    G.fx.hitstop(K.SEQ_HITSTOP);
    G.audio.duck(.55);
    G.audio.sfx('paradox',{v:.95});
    G.fx.screenFlash('rgba(40,10,60,.35)',.12);
    G.fx.shake(.12);
    /* 生成空间裂隙 + 序列状态机 */
    this._mkCrack(cx,cz);
    this._seq={t:0, cx, cz};
    G.ui.weapon(G.player);
  },

  /* ---------- 每帧更新（game.update 调用） ---------- */
  update(dt){
    const p=G.player;
    if(!p || p.dead) return;
    const die=p.refs && p.refs.dice;
    if(die && die.visible) this._dieAnim(p, dt);
    /* 不稳定度衰减 + 世界异常（不稳定是状态，与是否手持无关） */
    if(this.instab>0) this.instab=Math.max(0, this.instab-K.INSTAB_DECAY*dt);
    this.applyInstab(p, dt);
    if(this._seq) this._seqTick(p, dt);
  },

  /* ---------- 骰体动画 ---------- */
  _dieAnim(p, dt){
    const die=p.refs.dice, spin=die.userData.refs.spin, M=mats();
    die.position.y = die.userData.baseY + Math.sin(p.t*2.2)*.02;
    const st=this._rollState;
    if(st==='rolling'){
      spin.rotation.x+=dt*15; spin.rotation.y+=dt*21; spin.rotation.z+=dt*11;
      M.rune.emissiveIntensity = 1.6+Math.sin(p.t*40)*.5;
      if(Math.random()<.5){
        G.fx.particle(p.x+(Math.random()-.5)*.7, 1.05+(Math.random()-.5)*.2, p.z+(Math.random()-.5)*.7,
          {vx:(Math.random()-.5)*.6,vy:1.2,vz:(Math.random()-.5)*.6,life:.25,color:0xd8c8ff,s0:.12,kind:'a'});
      }
    } else if(st==='settle'){
      this._settleT-=dt;
      const k=Math.max(0,1-this._settleT/K.SETTLE_T);
      const ease=1-Math.pow(1-Math.min(1,k),3);
      if(this._q0 && this._q1) spin.quaternion.slerpQuaternions(this._q0, this._q1, Math.min(1,ease*1.2));
      const bounce=Math.abs(Math.sin(k*Math.PI*3))*.07;
      spin.scale.set(1+bounce, 1-bounce*.4, 1+bounce);
      if(this._settleT<=0){
        this._rollState='idle';
        if(this._q1) spin.quaternion.copy(this._q1);
        spin.scale.set(1,1,1);
      }
      M.rune.emissiveIntensity=1.2;
    } else {
      spin.rotation.y+=dt*.4;                                  // 待机缓慢自转
      spin.rotation.x=Math.sin(p.t*.6)*.12;
      M.rune.emissiveIntensity = .9+Math.sin(p.t*3.2)*.2;
    }
    /* 面光：结果面点亮 / PARADOX 临界（instab≥75）六面同时闪烁 / 崩坏演出期间过曝 */
    const show=this._showFace;
    for(let i=0;i<6;i++){
      let tgt=0;
      if(this._overglow>0) tgt=this._overglow*(0.7+Math.random()*.6);
      else if(show===i+1) tgt=K.FACE_GLOW;
      else if(this.instab>=K.GLITCH_3 && Math.random()<.25) tgt=K.FACE_GLOW*.4;
      M.f[i].emissiveIntensity += (tgt-M.f[i].emissiveIntensity)*Math.min(1,14*dt);
    }
  },

  /* ---------- 世界异常（按不稳定度分级，节流） ---------- */
  applyInstab(p, dt){
    if(this.instab>=K.GLITCH_2){
      this._glitchT-=dt;
      if(this._glitchT<=0){
        this._glitchT=.4-(this.instab/100)*.2;     // 越不稳越频繁
        G.fx.shake(.02+this.instab/100*.06);
        G.fx.screenFlash('rgba(180,120,255,'+(.04+this.instab/100*.08)+')',.05);
      }
    }
    if(this.instab>=K.GLITCH_3){
      this._glitch2T-=dt;
      if(this._glitch2T<=0){
        this._glitch2T=.3;
        const a=Math.random()*G.TAU, rr=2+Math.random()*3;   // 房间边缘裂缝粒子
        G.fx.particle(p.x+Math.cos(a)*rr, .5+Math.random()*.8, p.z+Math.sin(a)*rr,
          {vx:0,vy:.4,vz:0,life:.4,color:Math.random()<.5?0x2a1038:0x8a4aff,s0:.2,kind:'m'});
      }
    }
    /* HUD 轻微抖动（阶段二起），低于阈值还原 */
    const hud=document.getElementById('hud');
    if(hud){
      if(this.instab>=K.GLITCH_2){
        this._hudT-=dt;
        if(this._hudT<=0){ this._hudT=.06; hud.style.transform='translate('+((Math.random()-.5)*3)+'px,'+((Math.random()-.5)*3)+'px)'; }
      } else if(hud.style.transform){ hud.style.transform=''; }
    }
  },

  /* ---------- 空间裂隙（黑紫裂纹 + 紫色闪电枝） ---------- */
  _mkCrack(x,z){
    const grp=new THREE.Group();
    const coreMat=new THREE.MeshBasicMaterial({color:0x7a2ad0, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false});
    const shellMat=new THREE.MeshBasicMaterial({color:0x0a0512, transparent:true, opacity:0, depthWrite:false});
    const core=new THREE.Mesh(G.boxGeo(.1,1,.1), coreMat);
    core.position.y=1.3;
    const shell=new THREE.Mesh(G.boxGeo(.16,1,.16), shellMat);
    shell.position.y=1.4;
    grp.add(shell, core);
    grp.position.set(x,0,z);
    G.scene.add(grp);
    this._crack={g:grp, core, shell, x, z, t:0};
  },
  _crackTick(dt){
    const c=this._crack;
    c.t+=dt;
    const grow=Math.min(1, c.t/.35);
    c.core.scale.set(1+grow*.6, 2.6*(1+grow*1.2), 1+grow*.6);
    c.shell.scale.set(1+grow*.6, 3.0*(1+grow*1.2), 1+grow*.6);
    c.core.material.opacity = grow*.95;
    c.shell.material.opacity = grow*.6;
    if(Math.random()<.7){
      const a=Math.random()*G.TAU;
      G.fx.particle(c.x+Math.cos(a)*.3, .6+Math.random()*1.5, c.z+Math.sin(a)*.3,
        {vx:Math.cos(a)*1.6,vy:.3,vz:Math.sin(a)*1.6,life:.35,color:Math.random()<.5?0x0a0512:0x9a4aff,s0:.16,kind:'m'});
    }
    if(Math.random()<.2){
      G.fx.lightning(c.x+(Math.random()-.5)*.2, 2.4, c.z,
                     c.x+(Math.random()-.5)*3, .5, c.z+(Math.random()-.5)*3, 0x9a4aff, 6);
    }
  },
  _crackOff(){
    if(!this._crack) return;
    const c=this._crack;
    G.fx.burst(c.x,1.4,c.z,10,{color:0x6a3ab8,spd:2.5,life:.5,s0:.22,kind:'m'});
    G.scene.remove(c.g);
    c.core.material.dispose(); c.shell.material.dispose();
    this._crack=null;
  },

  /* ---------- PARADOX 序列状态机（时间轴见 K.SEQ_*） ---------- */
  _seqTick(p, dt){
    const seq=this._seq;
    seq.t+=dt;
    const t=seq.t;
    /* 阶段二：空间裂开——裂隙开始扩张 */
    if(t>=K.SEQ_CRACK && !seq.cracked){
      seq.cracked=true;
      if(G.lights && G.lights.ambient) seq.amb0=G.lights.ambient.intensity;
      G.audio.sfx('diceCrack',{v:.6});
    }
    /* 阶段三：现实错误——故障闪光 + 环境光闪烁 + 骰体过曝 + 数字跳变 */
    if(t>=K.SEQ_ERROR && !seq.errorDone){
      seq.errorDone=true;
      this._overglow=K.FACE_GLOW*1.4;
      G.fx.screenFlash('rgba(220,180,255,.4)',.1);
      G.fx.shake(.28);
      G.audio.sfx('diceCharge',{v:.5});
    }
    /* 阶段四：BOOM——现实重置 */
    if(t>=K.SEQ_BOOM && !seq.boomed){
      seq.boomed=true;
      this._boom(p, seq);
    }
    if(this._crack) this._crackTick(dt);
    if(seq.amb0!=null && t>=K.SEQ_ERROR && t<K.SEQ_END && G.lights && G.lights.ambient){
      G.lights.ambient.intensity = seq.amb0*(0.4+Math.sin(t*50)*.3);
    }
    if(t>=K.SEQ_ERROR && t<K.SEQ_BOOM && Math.random()<.3){   // 数字随机跳变
      G.fx.dmgNum(p.x+(Math.random()-.5)*.8, 1.4+Math.random()*.5, p.z+(Math.random()-.5)*.8,
        '§'+(1+((Math.random()*6)|0)), false, {scale:.9, color:'#c8a9ff'});
    }
    if(t>=K.SEQ_END){
      this._seq=null;
      this._overglow=0;
      if(seq.amb0!=null && G.lights && G.lights.ambient) G.lights.ambient.intensity=seq.amb0;
      this._crackOff();
    }
  },

  /* ---------- BOOM：现实重置（全房真实伤害 + 大爆炸） ---------- */
  _boom(p, seq){
    const angTo=(x,z)=>G.angTo(seq.cx,seq.cz,x,z);
    for(const e of G.enemies.list){
      if(e.dead || e.spawnT>0) continue;
      const dmg=K.DMG_ENEMY*(e.elite?K.DMG_ELITE_MUL:1);
      G.hurtEnemy(e, dmg, angTo(e.x,e.z), 4, true);   // ignoreBlock：现实崩坏无视格挡/护盾
      G.fx.burst(e.x,.7,e.z,8,{color:0xc87aff,spd:3.4,life:.5,s0:.16});
    }
    const boss=G.boss && G.boss.active;
    if(boss && !boss.dead) G.hurtBoss(K.DMG_BOSS);    // Boss 削弱：单次封顶
    /* 演出：BOOM */
    G.weapons.explode(seq.cx,seq.cz, 4.5, 0, 'p');    // 纯视觉大爆炸（伤害已直接结算，dmg 0 不伤人）
    G.fx.light(seq.cx,1.6,seq.cz,0xc87aff,5.5,.5);
    G.fx.ring(seq.cx,seq.cz,3.2,0xc87aff,.5);
    G.fx.ring(seq.cx,seq.cz,4.8,0x6a3ab8,.7);
    G.fx.screenFlash('rgba(230,210,255,.5)',.22);
    G.fx.shake(.55);
    G.fx.hitstop(.08);
    G.audio.sfx('paradoxBoom',{v:1});
    G.ui.toast('REALITY RESET——PARADOX CHARGE');
    G.ui.weapon(G.player);
  },

  /* ---------- 换房/清场（game.cleanupDynamic 与 onRoomEnter 调用） ---------- */
  clear(){
    if(this._crack){
      G.scene.remove(this._crack.g);
      this._crack.core.material.dispose(); this._crack.shell.material.dispose();
      this._crack=null;
    }
    if(this._seq && this._seq.amb0!=null && G.lights && G.lights.ambient){
      G.lights.ambient.intensity=this._seq.amb0;
    }
    this._seq=null; this._overglow=0;
    this._rollState='idle'; this._settleT=0; this._showFace=0;
    const hud=document.getElementById('hud');
    if(hud && hud.style.transform) hud.style.transform='';
  },
};

G.dice = S;
})();
