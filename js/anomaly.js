/* 第九层事故 - 第五层 Boss「失序之主 · THE ANOMALY」
   ================================================================
   规则失控的化身：三阶段，第三阶段起随机篡改游戏规则（全部可读/可预警/可反制/限时恢复）。
   接口契约与 voidking/voidripper 一致：spawn/update/hurt/clear + G.anomaly.active。
   ⚠️ H25 同类：boss.js 分发后必须同步 G.boss.active = 本实例。 */
'use strict';
(function(){
const AN = {};
AN.active = null;

/* ---------- 模型：故障立方堆叠体（错位闪动的绿/品红故障色） ---------- */
function buildMesh(){
  const g=new THREE.Group();
  const core=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.5,1.5), G.vcolMat);
  core.position.y=1.7; core.rotation.y=.6; g.add(core);
  const core2=new THREE.Mesh(new THREE.BoxGeometry(.9,.9,.9), G.vcolMat);
  core2.position.y=2.9; core2.rotation.x=.5; g.add(core2);
  const frags=new THREE.Group();
  for(let i=0;i<8;i++){
    const s=new THREE.Mesh(new THREE.BoxGeometry(.4+Math.random()*.3,.3,.4+Math.random()*.3), G.vcolMat);
    const a=i/8*Math.PI*2;
    s.position.set(Math.cos(a)*1.7,1.2+Math.random()*2.2,Math.sin(a)*1.7);
    s.rotation.set(Math.random()*3,Math.random()*3,0);
    frags.add(s);
  }
  g.add(frags);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.9,.09,6,18), G.vcolMat);
  ring.position.y=.4; ring.rotation.x=Math.PI/2; g.add(ring);
  const L1=new THREE.PointLight(0x50ff90, 2.2, 10, 2); L1.position.y=2; g.add(L1);
  const L2=new THREE.PointLight(0xff30c0, 1.6, 9, 2); L2.position.y=1; g.add(L2);
  const aura=new THREE.Sprite(G.pmat(0x50ff90)); aura.scale.set(3.4,3.4,1); aura.position.y=1.8; g.add(aura);
  const aura2=new THREE.Sprite(G.pmat(0xff30c0)); aura2.scale.set(2.4,2.4,1); aura2.position.y=1.8; g.add(aura2);
  return {g, refs:{core, core2, frags, ring, L1, L2, aura, aura2}};
}

/* ---------- 规则篡改池（全部限时 + 可读 + 可反制） ---------- */
const RULES=[
  {name:'武器过载延迟', tip:'你的射速被减半了！', dur:12, apply(state){
    const p=G.player;
    const idx=p.curW||0, w=p.weapons[idx];
    if(!w) return ()=>{};
    const r0=w.def.rate;
    /* 浅拷贝 def 只改 rate（恢复时还原字段）——def 为运行时对象，非全局表 */
    w.def=Object.assign({}, w.def, {rate:r0*.5});
    return ()=>{ w.def=Object.assign({}, w.def, {rate:r0}); };
  }},
  {name:'弹药冻结', tip:'装填系统被冻结——省着点打！', dur:10, apply(state){
    const p=G.player, idx=p.curW||0, w=p.weapons[idx];
    if(!w) return ()=>{};
    const r0=w.reloadT, mag0=w.def.mag;
    w.def=Object.assign({}, w.def, {mag:6});
    w.ammo=Math.min(w.ammo,6);
    return ()=>{ w.def=Object.assign({}, w.def, {mag:mag0}); };
  }},
  {name:'重力异常', tip:'移动漂移——所有动作都在打滑！', dur:10, apply(state){
    /* 视觉+体感：低频位移扰动玩家 */
    state._drift=setInterval(()=>{
      if(!G.player||G.player.dead) return;
      G.moveEntity(G.player,(Math.random()-.5)*.5,(Math.random()-.5)*.5);
    }, 300);
    return ()=>clearInterval(state._drift);
  }},
  {name:'敌人巨大化', tip:'异常体在放大它的仆从！', dur:14, apply(state){
    const list=G.enemies.list.filter(e=>!e.dead&&e.spawnT<=0&&e.type!=='r5_aip');
    const snap=list.map(e=>({e, s:e.mesh?e.mesh.scale.x:1, r:e.r}));
    list.forEach(e=>{ e.mesh&&e.mesh.scale.multiplyScalar(1.8); e.r*=1.6; e.maxhp=e.hp=Math.round(e.hp*1.3); });
    return ()=>snap.forEach(({e,s,r})=>{ e.mesh&&e.mesh.scale.setScalar(s); e.r=r; });
  }},
  {name:'空间封锁', tip:'部分地板即将脱离现实！', dur:9, apply(state){
    /* Boss 房随机 1/4 区域临时禁入（预警 2s → 封锁 → 恢复） */
    const f=G.floor; if(!f||!f.bossRoom) return ()=>{};
    const br=f.bossRoom;
    const cx=br.cx+ (Math.random()-.5)*8, cz=br.cz+(Math.random()-.5)*6;
    const cells=[];
    for(let x=Math.floor(cx)-2;x<=Math.floor(cx)+2;x++)
      for(let z=Math.floor(cz)-2;z<=Math.floor(cz)+2;z++){
        const t=f.tilesGet(x,z);
        if(t&&t.t==='floor') cells.push([x,z,t]);
      }
    const warn=new THREE.Mesh(new THREE.PlaneGeometry(5,4),
      new THREE.MeshBasicMaterial({color:0xff3050,transparent:true,opacity:.4,depthWrite:false}));
    warn.rotation.x=-Math.PI/2; warn.position.set(cx,.07,cz);
    G.scene.add(warn);
    const to=setTimeout(()=>{
      G.scene.remove(warn);
      const covers=[];
      for(const [x,z,t] of cells){
        f.tiles.delete(x+','+z);
        const cov=new THREE.Mesh(new THREE.PlaneGeometry(1.02,1.02), new THREE.MeshBasicMaterial({color:0x04030a,depthWrite:false}));
        cov.rotation.x=-Math.PI/2; cov.position.set(x+.5,.055,z+.5);
        G.scene.add(cov); covers.push([cov,x,z,t]);
      }
      G.fx.shake(.3);
      state._restore=setTimeout(()=>{
        for(const [cov,x,z,t] of covers){ G.scene.remove(cov); f.tiles.set(x+','+z,t); }
      }, 7000);
    }, 2000);
    return ()=>{ clearTimeout(to); clearTimeout(state._restore); G.scene.remove(warn); };
  }},
];

AN.spawn = function(x,z){
  const {g, refs}=buildMesh();
  const boss={
    x,z, vx:0,vz:0, r:1.0, hp:1600, maxhp:1600,
    dead:false, deadT:0, spawnT:.8, flashT:0, phase:1,
    mesh:g, refs,
    state:'intro', stateT:1.8, t:0, face:0, floatT:0,
    atkCd:2, tpCd:4, ruleCd:8, summonCd:6,
    ruleIdx:-1, ruleUndo:null, ruleTimer:0,
    photoT:0, photoBuf:0, dying:false, dyingT:0,
  };
  g.position.set(x,0,z);
  g.scale.setScalar(.01);
  G.scene.add(g);
  this.active=boss;
  G.ui.bossBar(true, '失序之主 · THE ANOMALY', 1);
  G.ui.banner('失序之主 · THE ANOMALY', '第五层领主——规则由它书写');
  G.audio.bossIntro('roar');
  G.fx.shake(.7);
  return boss;
};

AN.clear = function(){
  if(this.active){
    const b=this.active;
    if(b.ruleUndo){ try{b.ruleUndo();}catch(e){} b.ruleUndo=null; }
    G.scene.remove(b.mesh);
    this.active=null;
  }
  G.ui.bossBar(false);
};

/* 攻击：故障弹（扇形/螺旋/三连追踪） */
function shoot(boss, ang, opt){
  opt=opt||{};
  G.weapons.spawn({team:'e', x:boss.x+Math.cos(ang)*(boss.r+.3), z:boss.z+Math.sin(ang)*(boss.r+.3),
    ang, spd:opt.spd||5.2, dmg:1, size:opt.size||.2, color:opt.color||0x50ff90, life:3.4, pierce:opt.pierce||0});
}

AN.update = function(dt){
  const b=this.active;
  if(!b || b.dead) return;
  b.t+=dt;
  const p=G.player;
  /* 出生缩放 */
  if(b.spawnT>0){ b.spawnT-=dt; b.mesh.scale.setScalar(Math.max(.01,1-b.spawnT/.8)); return; }
  /* 死亡演出 */
  if(b.dying){
    b.dyingT+=dt;
    b.mesh.scale.setScalar(Math.max(.01,1-b.dyingT/1.5));
    b.refs.L1.intensity=2.2*(1-b.dyingT/1.5);
    if(b.dyingT>1.5){ b.dead=true; G.scene.remove(b.mesh); G.boss.active=null; G.game.bossDefeated(); }
    return;
  }
  /* intro */
  if(b.state==='intro'){ b.stateT-=dt; if(b.stateT<=0) b.state='cool'; return; }
  /* 浮动+碎片旋转 */
  b.floatT+=dt;
  b.mesh.position.y=Math.sin(b.floatT*1.6)*.15;
  b.refs.frags.rotation.y+=dt*1.4;
  b.refs.frags.children.forEach((s,i)=>{ s.position.y=1.7+Math.sin(b.floatT*2+i)*.35; });
  b.refs.ring.rotation.z+=dt*.8;
  b.refs.core.rotation.y+=dt*.5; b.refs.core2.rotation.y-=dt*.8;
  /* 朝向 */
  if(p && !p.dead) b.face=Math.atan2(p.z-b.z, p.x-b.x);
  /* 相位判定 */
  const hpr=b.hp/b.maxhp;
  const newPhase = hpr>.66?1 : hpr>.33?2 : 3;
  if(newPhase!==b.phase){
    b.phase=newPhase;
    G.ui.toast(newPhase===2?'失序之主开始篡改规则！':'现实正在崩解——它疯了！');
    G.fx.shake(.4); G.audio.sfx('glitch',{v:.7});
  }
  /* 移动：缓慢追踪+阶段 2+ 瞬移 */
  const d=Math.hypot(p.x-b.x, p.z-b.z)||1;
  if(d>4.5 && b.state!=='intro'){
    G.moveEntity(b, (p.x-b.x)/d*1.35*dt, (p.z-b.z)/d*1.35*dt);
  }
  b.tpCd-=dt;
  if(b.phase>=2 && b.tpCd<=0){
    b.tpCd=b.phase===3?3.5:5.5;
    G.fx.burst(b.x,.8,b.z,12,{color:0x50ff90,spd:3,life:.5,s0:.16,kind:'a',vy:1});
    const br=G.floor&&G.floor.bossRoom;
    if(br){ b.x=br.x0+2+Math.random()*(br.x1-br.x0-4); b.z=br.z0+2+Math.random()*(br.z1-br.z0-4); b.mesh.position.set(b.x,0,b.z); }
    G.fx.burst(b.x,.8,b.z,12,{color:0xff30c0,spd:3,life:.5,s0:.16,kind:'a',vy:1});
    G.audio.sfx('phase',{v:.5});
  }
  /* 攻击（攻击窗口） */
  if(b.state==='cool'){
    b.atkCd-=dt;
    if(b.atkCd<=0){
      b.atkCd=b.phase===3?1.4:2.1;
      const mode=Math.floor(Math.random()*3);
      if(mode===0){ // 扇形
        const n=b.phase===3?9:7;
        for(let k=0;k<n;k++) shoot(b, b.face+(k/(n-1)-.5)*1.1, {spd:5.5});
      } else if(mode===1){ // 螺旋
        let i=0;
        const iv=setInterval(()=>{
          if(b.dead||i>=12){ clearInterval(iv); return; }
          shoot(b, b.t*2.2+i*.5, {spd:4.6}); i++;
        }, 90);
      } else { // 三连追踪
        let i=0;
        const iv=setInterval(()=>{
          if(b.dead||i>=3){ clearInterval(iv); return; }
          const a=b.face+(Math.random()-.5)*.3;
          G.weapons.spawn({team:'e', x:b.x+Math.cos(a)*(b.r+.3), z:b.z+Math.sin(a)*(b.r+.3),
            ang:a, spd:6.4, dmg:1, size:.22, color:0xff30c0, life:3.2, homing:2.4});
          i++;
        }, 160);
      }
    }
  }
  /* 规则篡改（P2 起；P3 更频繁） */
  if(b.phase>=2){
    b.ruleCd-=dt;
    if(b.ruleCd<=0){
      if(b.ruleUndo){ try{b.ruleUndo();}catch(e){} b.ruleUndo=null; }
      b.ruleIdx=(b.ruleIdx+1+Math.floor(Math.random()*(RULES.length-1)))%RULES.length;
      const R=RULES[b.ruleIdx];
      b.ruleUndo=R.apply(b) || (()=>{});
      b.ruleTimer=R.dur;
      b.ruleCd=b.phase===3?7:11;
      G.ui.banner('规则篡改：'+R.name, R.tip);
      G.audio.sfx('glitch',{v:.8});
      G.fx.shake(.3);
    }
    if(b.ruleUndo){
      b.ruleTimer-=dt;
      if(b.ruleTimer<=0){ try{b.ruleUndo();}catch(e){} b.ruleUndo=null; G.ui.toast('规则恢复正常……暂时'); }
    }
  }
  /* 召唤（P3） */
  if(b.phase===3){
    b.summonCd-=dt;
    if(b.summonCd<=0){
      b.summonCd=9;
      for(let i=0;i<2;i++) G.game.spawnQueue.push({t:.3+i*.4, type:Math.random()<.5?'wisp':'gunner', elite:false, room:G.game.curRoom});
      G.ui.toast('它从裂缝里拉出了帮手');
    }
  }
};

AN.hurt = function(dmg){
  const b=this.active;
  if(!b || b.dying || b.state==='intro') return;
  b.hp-=dmg;
  b.flashT=.06;
  G.ui.bossBar(true, '失序之主 · THE ANOMALY', b.hp/b.maxhp);
  if(b.hp<=0 && !b.dying){
    b.dying=true; b.dyingT=0;
    if(b.ruleUndo){ try{b.ruleUndo();}catch(e){} b.ruleUndo=null; }
    G.fx.shake(.6);
    G.audio.sfx('explosion');
    G.fx.burst(b.x,1.5,b.z,30,{color:0x50ff90,spd:5,life:.9,s0:.22,kind:'a',vy:2});
  }
};

G.anomaly = AN;
})();
