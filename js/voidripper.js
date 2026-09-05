/* 第九层事故 - 第四层 Boss：空间裂解者 · 失序核心（三阶段 · 悬浮 · 传送 · 战场裂解）
   与第三层无面君主的根本差异：
   - 无面君主：人形装甲+王座+竖缝眼，暗紫+虚空紫(0xc060ff)，近战+召唤+瞬移
   - 空间裂解者：纯几何悬浮核心+环绕碎片+能量环，深紫+青(0x00ffff)+品红(0xff00ff)，
     远程弹幕+传送+战场临时裂解（完全不同的 silhouette/颜色/攻击模式） */
'use strict';
(function(){
const GB = G.GeoBuilder;
const VR = { active:null };

/* ---------- 造型（模块级缓存；GeoBuilder 只支持 box/cyl/cone/sph/planeXZ） ---------- */
let _coreGeo=null;
function coreGeo(){
  if(_coreGeo) return _coreGeo;
  const b=new GB();
  // 中央核心：上下双锥体组成八面体（深紫）
  b.cone(0,.35,0,.6,.7,0x2a0a4a,6);
  b.cone(0,-.35,0,.6,.7,0x3a1a5a,6);
  b.sph(0,0,0,.35,0x4a1a7a,6);           // 内层球
  b.sph(0,0,0,.18,0x00ffff,5);           // 核心能量（青色）
  // 核心表面的能量裂纹
  b.box(0,.4,.3,.04,.25,.02,0xff00ff);
  b.box(.35,0,.3,.02,.04,.25,0x00ffff);
  b.box(-.3,.15,.35,.02,.2,.02,0xff00ff);
  _coreGeo=b.build(); return _coreGeo;
}
let _shardGeo=null;
function shardGeo(){
  if(_shardGeo) return _shardGeo;
  const b=new GB();
  // 空间碎片：细长双锥体（青品渐变）
  b.cone(0,.2,0,.1,.4,0x00ffff,4);
  b.cone(0,-.2,0,.1,.4,0xff00ff,4);
  _shardGeo=b.build(); return _shardGeo;
}
let _ringGeo=null;
function ringGeo(){
  if(_ringGeo) return _ringGeo;
  const b=new GB();
  // 底部能量环：用 12 个小盒子围成圈（青色+品红交替）
  for(let i=0;i<12;i++){
    const a=i/12*G.TAU;
    b.box(Math.cos(a)*.9,0,Math.sin(a)*.9,.18,.06,.18,i%2?0x00ffff:0xff00ff);
  }
  for(let i=0;i<8;i++){
    const a=i/8*G.TAU+.2;
    b.box(Math.cos(a)*.65,0,Math.sin(a)*.65,.12,.04,.12,i%2?0xff00ff:0x00ffff);
  }
  _ringGeo=b.build(); return _ringGeo;
}

VR.spawn = function(x,z){
  const g=new THREE.Group();
  // 中央核心（悬浮，上下浮动动画）
  const core=new THREE.Mesh(coreGeo(), G.vcolMat); core.castShadow=true;
  core.position.y=1.6; g.add(core);
  // 环绕碎片（6 片，旋转动画）
  const shards=new THREE.Group();
  for(let i=0;i<6;i++){
    const s=new THREE.Mesh(shardGeo(), G.vcolMat);
    const a=i/6*G.TAU;
    s.position.set(Math.cos(a)*1.2,1.6+Math.sin(a*2)*.2,Math.sin(a)*1.2);
    s.rotation.z=a; s.rotation.x=.3;
    shards.add(s);
  }
  g.add(shards);
  // 底部能量环（旋转）
  const ring=new THREE.Mesh(ringGeo(), G.vcolMat);
  ring.position.y=.3; g.add(ring);
  // 核心点光源（青色）
  const coreLight=new THREE.PointLight(0x00ffff, 2, 8, 2); coreLight.position.y=1.6; g.add(coreLight);
  // 能量光环（sprite）
  const aura=new THREE.Sprite(G.pmat(0x00ffff)); aura.scale.set(3,3,1); aura.position.y=1.6; g.add(aura);
  const aura2=new THREE.Sprite(G.pmat(0xff00ff)); aura2.scale.set(2.2,2.2,1); aura2.position.y=1.6; g.add(aura2);

  const boss={
    x,z, vx:0,vz:0, r:.9, hp:1200, maxhp:1200,
    dead:false, deadT:0, spawnT:.8, flashT:0, phase:1,
    mesh:g, refs:{core, shards, ring, coreLight, aura, aura2},
    state:'intro', stateT:1.6, t:0, face:0, floatT:0,
    atkIdx:0, atkCd:0, teleportCd:0, riftCd:0, summonCd:0, collapseCd:0,
    rifts:[], summons:[], collapseZones:[],
    enraged:false, photoT:0, photoBuf:0, dying:false,
  };
  g.position.set(x,0,z);
  g.scale.setScalar(.01);
  G.scene.add(g);
  this.active=boss;
  G.ui.bossBar(true, '空间裂解者 · 失序核心', 1);
  G.ui.banner('空间裂解者 · 失序核心', '第四层领主');
  G.audio.bossIntro('roar');
  G.fx.shake(.6);
  return boss;
};

VR.clear = function(){
  if(this.active){
    for(const s of this.active.summons){ if(!s.dead){ s.dead=true; G.scene.remove(s.mesh); } }
    for(const r of this.active.rifts){ if(r.mesh) G.scene.remove(r.mesh); }
    for(const c of this.active.collapseZones){ if(c.mesh) G.scene.remove(c.mesh); }
    G.scene.remove(this.active.mesh); this.active=null;
  }
  G.ui.bossBar(false);
};

/* ---------- 攻击：空间弹（3 连发追踪） ---------- */
function fireOrbs(boss, n){
  for(let i=0;i<n;i++){
    setTimeout(()=>{
      if(boss.dead) return;
      const a=Math.atan2(G.player.z-boss.z, G.player.x-boss.x);
      G.weapons.spawn({team:'e', x:boss.x, z:boss.z+1.6, ang:a, spd:5, dmg:12, size:.2, color:0x00ffff, life:3});
      G.audio.sfx('laser',{v:.3});
    }, i*180);
  }
}

/* ---------- 攻击：扇形弹幕（8 发） ---------- */
function fireFan(boss){
  const base=Math.atan2(G.player.z-boss.z, G.player.x-boss.x);
  for(let i=0;i<8;i++){
    const a=base+(i-3.5)*.18;
    G.weapons.spawn({team:'e', x:boss.x, z:boss.z+1.6, ang:a, spd:4.5, dmg:10, size:.18, color:0xff00ff, life:3.5});
  }
  G.audio.sfx('laser',{v:.4});
}

/* ---------- 攻击：螺旋弹幕（阶段3） ---------- */
function fireSpiral(boss){
  for(let i=0;i<12;i++){
    const a=boss.t*2+i*G.TAU/12;
    G.weapons.spawn({team:'e', x:boss.x, z:boss.z+1.6, ang:a, spd:4, dmg:8, size:.16, color:0x00ffff, life:4});
  }
  G.audio.sfx('laser',{v:.35});
}

/* ---------- 空间裂缝（减速区域） ---------- */
function spawnRift(boss){
  const x=boss.x+(Math.random()-.5)*6, z=boss.z+(Math.random()-.5)*6;
  const mesh=new THREE.Mesh(new THREE.RingGeometry(.8,1.2,16), new THREE.MeshBasicMaterial({color:0xff00ff, transparent:true, opacity:.5, side:THREE.DoubleSide}));
  mesh.rotation.x=-Math.PI/2; mesh.position.set(x,.05,z); G.scene.add(mesh);
  boss.rifts.push({x,z,r:1.2,mesh,t:0,life:6});
  G.fx.shake(.2);
}

/* ---------- 召唤虚空小怪 ---------- */
function summonMinions(boss){
  for(let i=0;i<2;i++){
    const a=Math.random()*G.TAU;
    const x=boss.x+Math.cos(a)*3, z=boss.z+Math.sin(a)*3;
    const e=G.enemies.spawn('voidacolyte', x, z, false);
    if(e){ e.spawnT=0; boss.summons.push(e); }
  }
  G.audio.sfx('summon',{v:.4});
}

/* ---------- 战场裂解（阶段3：临时虚空区域） ---------- */
function collapseZone(boss){
  const x=G.player.x+(Math.random()-.5)*4, z=G.player.z+(Math.random()-.5)*4;
  const mesh=new THREE.Mesh(new THREE.CircleGeometry(2,16), new THREE.MeshBasicMaterial({color:0x0a0020, transparent:true, opacity:.8}));
  mesh.rotation.x=-Math.PI/2; mesh.position.set(x,.02,z); G.scene.add(mesh);
  boss.collapseZones.push({x,z,r:2,mesh,t:0,life:5});
  G.fx.shake(.4);
  G.audio.sfx('explosion',{v:.3});
}

/* ---------- 短距离传送 ---------- */
function teleport(boss){
  const a=Math.random()*G.TAU;
  const d=3+Math.random()*3;
  const nx=boss.x+Math.cos(a)*d, nz=boss.z+Math.sin(a)*d;
  G.fx.particle(boss.x,1.6,boss.z,{vx:0,vy:2,vz:0,life:.5,color:0x00ffff,s0:.3,kind:'a',n:12});
  boss.x=nx; boss.z=nz;
  boss.mesh.position.set(nx,0,nz);
  G.fx.particle(nx,1.6,nz,{vx:0,vy:2,vz:0,life:.5,color:0xff00ff,s0:.3,kind:'a',n:12});
  G.audio.sfx('teleport',{v:.4});
  G.fx.shake(.2);
}

VR.update = function(dt){
  const boss=this.active;
  if(!boss) return;
  // 死亡演出（必须在 return 之前处理，否则 bossDefeated 永远不触发）
  if(boss.dead){
    boss.deadT+=dt;
    boss.mesh.scale.setScalar(Math.max(.01,1-boss.deadT*1.5));
    if(boss.refs.coreLight) boss.refs.coreLight.intensity=Math.max(0,2-boss.deadT*3);
    if(boss.deadT>1.5){
      G.scene.remove(boss.mesh);
      this.active=null;
      if(G.boss) G.boss.active=null;
      G.ui.bossBar(false);
      G.game.bossDefeated();
    }
    return;
  }
  boss.t+=dt;
  boss.floatT+=dt;

  // 出生动画
  if(boss.spawnT>0){
    boss.spawnT-=dt;
    const s=Math.min(1,(1.6-boss.spawnT)/1.6);
    boss.mesh.scale.setScalar(.01+s*.99);
    return;
  }

  // 阶段转换
  const hpRatio=boss.hp/boss.maxhp;
  if(boss.phase===1 && hpRatio<.66){
    boss.phase=2; boss.enraged=true;
    G.ui.bossBar(true, '空间裂解者 · 失序核心', 2);
    G.ui.banner('阶段 2', '空间不稳定');
    G.fx.shake(.5); G.audio.sfx('bossPhase',{v:.5});
  }
  if(boss.phase===2 && hpRatio<.33){
    boss.phase=3;
    G.ui.bossBar(true, '空间裂解者 · 失序核心', 3);
    G.ui.banner('阶段 3', '战场裂解');
    G.fx.shake(.7); G.audio.sfx('bossPhase',{v:.6});
  }

  // 悬浮动画
  boss.refs.core.position.y=1.6+Math.sin(boss.floatT*1.5)*.15;
  boss.refs.core.rotation.y+=dt*.8;
  boss.refs.core.rotation.x+=dt*.3;
  boss.refs.shards.rotation.y+=dt*(boss.phase===3?2:1.2);
  boss.refs.ring.rotation.y+=dt*1.5;
  boss.refs.aura.material.opacity=.3+Math.sin(boss.floatT*3)*.1;
  boss.refs.aura2.material.opacity=.2+Math.sin(boss.floatT*2.5)*.08;

  // AI：缓慢追踪玩家（悬浮，保持距离）
  const dx=G.player.x-boss.x, dz=G.player.z-boss.z, d=Math.hypot(dx,dz)||1;
  const spd=boss.phase===3?1.8:(boss.phase===2?1.4:1.0);
  if(d>4){ boss.vx=dx/d*spd; boss.vz=dz/d*spd; }
  else { boss.vx=-dz/d*spd*.5; boss.vz=dx/d*spd*.5; }
  boss.x+=boss.vx*dt; boss.z+=boss.vz*dt;
  boss.mesh.position.set(boss.x,0,boss.z);
  boss.face=Math.atan2(dz,dx);

  // 攻击冷却
  boss.atkCd-=dt;
  if(boss.atkCd<=0 && !G.player.dead){
    if(boss.phase===1){ fireOrbs(boss,3); boss.atkCd=2.2; }
    else if(boss.phase===2){
      if(boss.atkIdx%2===0){ fireFan(boss); boss.atkCd=1.8; }
      else { fireOrbs(boss,2); boss.atkCd=1.5; }
      boss.atkIdx++;
    } else { fireSpiral(boss); boss.atkCd=1.2; }
  }

  // 传送（阶段2/3）
  if(boss.phase>=2){
    boss.teleportCd-=dt;
    if(boss.teleportCd<=0){ teleport(boss); boss.teleportCd=boss.phase===3?3.5:5.5; }
  }
  // 空间裂缝（阶段2/3）
  if(boss.phase>=2){
    boss.riftCd-=dt;
    if(boss.riftCd<=0 && boss.rifts.length<3){ spawnRift(boss); boss.riftCd=boss.phase===3?4:6; }
  }
  // 召唤小怪（阶段2）
  if(boss.phase===2){
    boss.summonCd-=dt;
    if(boss.summonCd<=0 && boss.summons.filter(s=>!s.dead).length<4){ summonMinions(boss); boss.summonCd=10; }
  }
  // 战场裂解（阶段3）
  if(boss.phase===3){
    boss.collapseCd-=dt;
    if(boss.collapseCd<=0 && boss.collapseZones.length<2){ collapseZone(boss); boss.collapseCd=7; }
  }

  // 更新裂缝
  for(let i=boss.rifts.length-1;i>=0;i--){
    const r=boss.rifts[i];
    r.t+=dt; r.mesh.rotation.z+=dt*2;
    r.mesh.material.opacity=.5*(1-r.t/r.life);
    if(G.dist2(G.player.x,G.player.z,r.x,r.z)<r.r*r.r){ G.player.slowT=Math.max(G.player.slowT||0,.3); }
    if(r.t>=r.life){ G.scene.remove(r.mesh); boss.rifts.splice(i,1); }
  }
  // 更新裂解区
  for(let i=boss.collapseZones.length-1;i>=0;i--){
    const c=boss.collapseZones[i];
    c.t+=dt; c.mesh.material.opacity=.8*(1-c.t/c.life*.5);
    if(c.t>=c.life){ G.scene.remove(c.mesh); boss.collapseZones.splice(i,1); }
  }

  // 死亡触发（hp<=0 时设置 dead=true，死亡演出在 update 开头处理）
  if(boss.hp<=0 && !boss.dead){
    boss.dead=true; boss.dying=true; boss.deadT=0;
    G.fx.shake(1);
    G.audio.sfx('bossDeath',{v:.6});
    for(let i=0;i<30;i++){
      const a=Math.random()*G.TAU, sp=2+Math.random()*4;
      G.fx.particle(boss.x,1.6,boss.z,{vx:Math.cos(a)*sp,vy:1+Math.random()*3,vz:Math.sin(a)*sp,life:1+Math.random(),color:i%2?0x00ffff:0xff00ff,s0:.25,kind:'a'});
    }
  }
};

VR.hurt = function(dmg){
  const boss=this.active;
  if(!boss || boss.dead || boss.spawnT>0) return 0;
  boss.hp-=dmg;
  if(boss.hp<=0 && !boss.dying){ boss.hp=0; boss.dying=true; }
  boss.flashT=.08;
  boss.refs.core.material.emissive=0xffffff;
  setTimeout(()=>{ if(boss.refs.core) boss.refs.core.material.emissive=0x000000; },80);
  return dmg;
};

G.voidripper = VR;
})();
