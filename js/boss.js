/* 弹幕深渊 - Boss：铁颚·弹膛之王（三阶段 · 多攻击模式 · 弹幕） */
'use strict';
(function(){
const GB = G.GeoBuilder;
const B = { active:null };

/* ---------- 造型 ---------- */
let _bossGeo = null;
function bossGeo(){
  if(_bossGeo) return _bossGeo;
  const b = new GB();
  // 躯干与甲板
  b.box(0,.95,0,1.5,1.1,1.2,0x4a6a3a);
  b.box(0,1.05,.62,1.3,.7,.16,0x585040);          // 胸甲
  b.box(-.78,.95,0,.36,.9,.9,0x3a5228);            // 左肩
  b.box(.78,1.05,0,.5,1.0,1.0,0x585040);           // 右肩炮座
  b.box(0,1.62,0,1.1,.3,1.0,0x3a5228);             // 领口
  // 腿
  b.box(-.4,.28,0,.44,.56,.5,0x3a5228);
  b.box(.4,.28,0,.44,.56,.5,0x3a5228);
  b.box(-.42,.03,.08,.5,.14,.7,0x2a2018);
  b.box(.42,.03,.08,.5,.14,.7,0x2a2018);
  // 披风（深红）
  b.box(0,.9,-.62,1.3,1.3,.12,0x7a1a14);
  b.box(0,.3,-.62,1.1,.6,.12,0x601410);
  _bossGeo = b.build();
  return _bossGeo;
}
let _headGeo=null;
function headGeo(){
  if(_headGeo) return _headGeo;
  const b=new GB();
  b.box(0,.1,0,.9,.6,.8,0x527a40);                 // 头
  b.box(0,-.28,.2,.86,.34,.7,0x6a7480);            // 铁颚
  for(let i=0;i<5;i++){ b.box(-.32+i*.16,-.14,.52,.09,.14,.06,0xe8e0d0); } // 下牙
  for(let i=0;i<5;i++){ b.box(-.32+i*.16,.18,.5,.09,.14,.06,0xe8e0d0); }  // 上牙
  b.box(-.2,.14,.42,.14,.1,.05,0xff3020);          // 眼
  b.box(.2,.14,.42,.14,.1,.05,0xff3020);
  b.box(0,.05,.42,.3,.08,.06,0x2a2018);            // 鼻梁伤疤
  b.box(-.44,-.05,.1,.12,.4,.3,0x527a40);          // 耳
  b.box(.44,-.05,.1,.12,.4,.3,0x527a40);
  _headGeo=b.build(); return _headGeo;
}
let _crownGeo=null;
function crownGeo(){
  if(_crownGeo) return _crownGeo;
  const b=new GB();
  b.cyl(0,0,0,.34,.3,.22,0xd8a830,8);
  for(let i=0;i<5;i++){ const a=i/5*G.TAU; b.cone(Math.cos(a)*.26,.2,Math.sin(a)*.26,.06,.2,0xf0c850,4); }
  b.sph(0,.05,.3,.05,0xff3030,4);
  _crownGeo=b.build(); return _crownGeo;
}
let _gunGeo=null;
function gunGeo(){
  if(_gunGeo) return _gunGeo;
  const b=new GB();
  b.cyl(0,0,0,.18,.18,.5,0x303038,8);
  b.box(.35,.12,0,.5,.3,.3,0x484850);
  b.box(.3,-.08,0,.4,.16,.34,0x38383e);
  _gunGeo=b.build(); return _gunGeo;
}
let _barrelsGeo=null;
function barrelsGeo(){
  if(_barrelsGeo) return _barrelsGeo;
  const b=new GB();
  for(let i=0;i<4;i++){ const a=i/4*G.TAU; b.cyl(Math.cos(a)*.13,0,Math.sin(a)*.13,.045,.045,.72,0x8a8a94,5); }
  b.cyl(0,0,0,.1,.1,.74,0x282830,5);
  _barrelsGeo=b.build(); return _barrelsGeo;
}

B.spawn = function(x,z){
  // 第 3 层起分发到虚空君主（voidking.js），铁颚管线保持不变
  // ⚠️ this.active 必须同步指向新 Boss 实例：外部伤害判定（weapons/photo）全走 G.boss.active（BUG-001 教训）
  if(G.voidking && G.game && G.game.floorNum>=3){
    const b=G.voidking.spawn(x,z);
    this.active=b;
    return b;
  }
  const g = new THREE.Group();
  const body = new THREE.Mesh(bossGeo(), G.vcolMat); body.castShadow=true; g.add(body);
  const head = new THREE.Group();
  head.add(new THREE.Mesh(headGeo(), G.vcolMat));
  head.position.set(0,1.9,.1); g.add(head);
  const crown = new THREE.Mesh(crownGeo(), G.vcolMat); crown.position.set(0,.42,0); head.add(crown);
  const gun = new THREE.Group();
  const gunMount = new THREE.Mesh(gunGeo(), G.vcolMat); gunMount.rotation.z=-Math.PI/2;
  const barrelsGroup = new THREE.Group();
  const barrels = new THREE.Mesh(barrelsGeo(), G.vcolMat); barrels.rotation.z=-Math.PI/2;
  barrelsGroup.add(barrels);
  barrelsGroup.position.x=.55;
  gun.add(gunMount); gun.add(barrelsGroup);
  gun.position.set(.95,1.15,.2); g.add(gun);
  const eyeLight = new THREE.PointLight(0xff4020,0,6,2); eyeLight.position.set(0,1.6,.6); g.add(eyeLight);
  const aura = new THREE.Sprite(G.pmat(0xff5030)); aura.scale.set(3.4,3.4,1); aura.position.y=1.0; g.add(aura);

  const boss = {
    x, z, vx:0, vz:0, r:1.05, hp:900, maxhp:900,
    dead:false, deadT:0, spawnT:.6, flashT:0, phase:1,
    mesh:g, refs:{head, crown, gun, barrels:barrelsGroup, eyeLight, aura, body},
    state:'intro', stateT:1.4, t:0, face:0, walkT:0,
    atkIdx:0, lastAtk:'', contactCd:0, stunT:0,
    photoT:0, photoBuf:0, photoPhase:'', photoDeath:false, // 薛定谔的拍立得状态
    jawOpen:0, gunSpin:0, airY:0, dying:false, crownOff:false,
  };
  g.position.set(x,0,z);
  g.scale.setScalar(.01);
  G.scene.add(g);
  this.active = boss;
  G.ui.bossBar(true, '铁颚 · 弹膛之王', 1);
  G.ui.banner('铁颚 · 弹膛之王', '第二层领主');
  G.audio.bossIntro('roar');   // 出场演出：rumble→咆哮→stinger→Boss 音乐
  G.fx.shake(.5);
  return boss;
};

B.clear = function(){
  if(G.voidking && G.voidking.active){ G.voidking.clear(); }
  if(this.active){ G.scene.remove(this.active.mesh); this.active=null; }
  G.ui.bossBar(false);
};

function bshoot(ang, opt){
  opt=opt||{};
  const b=B.active;
  G.weapons.spawn({
    team:'e', x:b.x+Math.cos(ang)*(b.r+.3), z:b.z+Math.sin(ang)*(b.r+.3),
    ang, spd:opt.spd||4.8, dmg:1, size:opt.size||.19,
    color:opt.color||0xff4030, life:opt.life||3.2, pierce:opt.pierce||0,
  });
}

B.hurt = function(dmg){
  if(G.voidking && G.voidking.active){ G.voidking.hurt(dmg); return; }
  const b=this.active;
  if(!b || b.dead || b.spawnT>0 || b.state==='intro') return;
  // 照片状态：伤害记入 DamageBuffer，冻结期不扣真实 HP
  if(b.photoT>0 || b.photoPhase==='resolve'){ G.photo.record(b, dmg); return; }
  b.hp -= dmg;
  b.flashT=.06;
  G.fx.dmgNum(b.x+ (Math.random()-.5), 2.3, b.z, Math.round(dmg), dmg>15);
  G.audio.sfx('hit',{v:.4});
  if(b.hp<=b.maxhp*.6 && b.phase===1){
    b.phase=2; b.state='phase'; b.stateT=1.0;
    G.audio.sfx('phase'); G.fx.shake(.6); G.fx.hitstop(.12);
    G.ui.toast('铁颚的皇冠被击飞了！它被激怒了！');
    if(!b.crownOff){ b.crownOff=true; G.game.crownFly(b); }
    b.refs.aura.material = G.pmat(0xa02020);
  } else if(b.hp<=b.maxhp*.25 && b.phase===2){
    b.phase=3; b.state='phase'; b.stateT=1.0;
    G.audio.sfx('roar'); G.fx.shake(.7); G.fx.hitstop(.15);
    G.ui.toast('铁颚进入了狂暴状态！');
    b.refs.aura.material = G.pmat(0xe02020);
    b.refs.aura.scale.set(4,4,1);
  }
  if(b.hp<=0 && !b.dying){
    b.hp=0; b.dying=true; b.state='dying'; b.stateT=2.6;
    G.fx.slowmo(.25,1.2); G.fx.shake(.8);
    G.audio.sfx('roar');
  }
};

const ATTACKS = ['gatling','fans','charge','spiral','summon','slam','wall'];

B.update = function(dt){
  if(G.voidking && G.voidking.active){ G.voidking.update(dt); return; }
  const b=this.active;
  if(!b) return;
  const p=G.player;
  b.t+=dt;
  if(b.spawnT>0){ b.spawnT-=dt; b.mesh.scale.setScalar(Math.max(.01,1-b.spawnT/.6)); return; }
  if(b.dead) return;

  // 薛定谔的拍立得：Boss 照片状态——停止一切行动，2s 后冲洗结算
  if(b.photoT>0){
    b.photoT-=dt;
    G.photo.tickEntity(b,dt);
    b.mesh.position.set(b.x,0,b.z);
    if(b.photoT<=0) G.photo.beginResolveBoss(b);
    return;
  }
  if(b.photoPhase==='resolve'){
    b._resolveT-=dt;
    G.photo.tickResolve(b,dt);
    if(b._resolveT<=0) G.photo.applyResolveBoss(b);
    return;
  }

  // 闪白
  if(b.flashT>0){ b.flashT-=dt; if(!b._flashOn){ B._flash(b,true); b._flashOn=true; } }
  else if(b._flashOn){ B._flash(b,false); b._flashOn=false; }

  if(b.stunT>0){
    b.stunT-=dt;
    b.mesh.position.set(b.x,0,b.z);
    b.mesh.rotation.z=Math.sin(b.t*30)*.05;
    if(b.stunT<=0) b.mesh.rotation.z=0;
    return;
  }

  const d = p? G.dist(b.x,b.z,p.x,p.z):99;
  const a = p? G.angTo(b.x,b.z,p.x,p.z):0;
  const spdMul = b.phase===3?1.35:(b.phase===2?1.15:1);

  // 接触伤害
  b.contactCd-=dt;
  if(p && !p.dead && d<b.r+.5 && b.contactCd<=0 && p.rollT<=0 && !p.invulnT && !p.ghostT && b.state!=='air'){
    p.hurt(1,a); b.contactCd=.9;
  }

  switch(b.state){
    case 'intro':
      b.stateT-=dt;
      b.refs.head.rotation.x=Math.sin(b.t*20)*.08;
      if(b.stateT<=0){ b.state='cool'; b.stateT=.8; b.refs.head.rotation.x=0; }
      break;
    case 'phase':
      b.stateT-=dt;
      b.mesh.position.y=Math.max(0,Math.sin((1-b.stateT)*Math.PI)*.3);
      if(b.stateT<=0){ b.state='cool'; b.stateT=.5; }
      break;
    case 'cool': {
      b.stateT-=dt;
      // 缓慢逼近 + 绕行
      let mx=Math.cos(a), mz=Math.sin(a);
      if(d<3.5){ mx=-mx; mz=-mz; }
      const s=Math.sin(b.t*.8)*.4;
      mx+=-Math.sin(a)*s; mz+=Math.cos(a)*s;
      const l=Math.hypot(mx,mz)||1;
      G.moveEntity(b, mx/l*1.3*spdMul*dt, mz/l*1.3*spdMul*dt);
      b.moving=true;
      if(b.stateT<=0){ this.pickAttack(d); }
      break; }
    case 'gatling': {
      b.stateT-=dt; b.gunSpin+=dt*40;
      b.refs.barrels.rotation.x=b.gunSpin;
      if(b.stateT>2.2){ // 转管预热
        if(Math.random()<.3) G.fx.sparks(b.x+.95*Math.cos(b.face),1.2,b.z+.95*Math.sin(b.face),0xffa060);
      } else if(b.stateT>0){
        b.fireT=(b.fireT||0)-dt;
        if(b.fireT<=0){
          b.fireT=.085;
          const aim=G.angTo(b.x,b.z,p.x,p.z)+(Math.random()-.5)*.16;
          bshoot(aim,{spd:6.5,size:.16,color:0xffb040});
          G.audio.sfx('smg',{v:.35});
          G.fx.sparks(b.x+Math.cos(b.face)*1.3+Math.cos(aim)*.4,1.15,b.z+Math.sin(b.face)*1.3+Math.sin(aim)*.4,0xffc060);
        }
      } else { b.state='cool'; b.stateT=(b.phase===3?.5:.9)+Math.random()*.4; }
      break; }
    case 'fans': {
      b.stateT-=dt;
      b.refs.head.rotation.x=-.15;
      if(!b.fanT||b.fanT<=0){
        if(b.fansLeft>0){
          b.fansLeft--;
          const aim=G.angTo(b.x,b.z,p.x,p.z);
          const n=b.phase===3?11:9;
          for(let i=0;i<n;i++) bshoot(aim+(i/(n-1)-.5)*1.6,{spd:5,color:0xff6040});
          G.audio.sfx('shotgun',{v:.6});
          b.fanT=.42;
        } else { b.state='cool'; b.stateT=.9; b.refs.head.rotation.x=0; }
      } else b.fanT-=dt;
      break; }
    case 'chargeWind':
      b.stateT-=dt;
      b.mesh.position.x=b.x+(Math.random()-.5)*.08;
      if(b.stateT<=0){
        b.state='charge'; b.stateT=1.6;
        b.chargeAng=G.angTo(b.x,b.z,p.x,p.z);
        G.audio.sfx('charge');
      }
      break;
    case 'charge': {
      b.stateT-=dt;
      const ox=b.x,oz=b.z;
      G.moveEntity(b, Math.cos(b.chargeAng)*9*dt, Math.sin(b.chargeAng)*9*dt);
      b.face=G.angLerp(b.face,b.chargeAng,Math.min(1,8*dt));
      const moved=G.dist(ox,oz,b.x,b.z);
      G.fx.particle(b.x-Math.cos(b.chargeAng)*.8,.2,b.z-Math.sin(b.chargeAng)*.8,{vx:0,vy:.5,vz:0,life:.3,color:0x8a8070,kind:'m',s0:.3});
      if(moved<9*dt*.4 || b.stateT<=0 || (p&&G.dist(b.x,b.z,p.x,p.z)<b.r+.6)){
        // 冲撞结束
        G.fx.shake(.5); G.audio.sfx('shock');
        G.fx.ring(b.x,b.z,3,0xffc060,.4);
        for(let i=0;i<10;i++) bshoot(i/10*G.TAU,{spd:4});
        if(moved<9*dt*.4){ b.stunT=1.5; G.ui.toast('铁颚撞晕了！全力输出！'); }
        b.state='cool'; b.stateT=1.1;
      }
      break; }
    case 'spiral': {
      b.stateT-=dt;
      b.spT=(b.spT||0)-dt;
      if(b.spT<=0){
        b.spT=.09;
        b.spiralBase=(b.spiralBase||0)+.42;
        const arms = b.phase===3?4:2;
        for(let i=0;i<arms;i++) bshoot(b.spiralBase+i/arms*G.TAU,{spd:4.2,color:0xff5060,size:.17});
      }
      // 螺旋期间缓慢移动
      G.moveEntity(b, Math.cos(a)*.6*dt, Math.sin(a)*.6*dt);
      if(b.stateT<=0){ b.state='cool'; b.stateT=b.phase===3?.6:1.0; }
      break; }
    case 'summon':
      b.stateT-=dt;
      if(b.stateT<=0){
        for(let i=0;i<3;i++) G.enemies.spawn('beetle', b.x+(Math.random()-.5)*2.5, b.z+(Math.random()-.5)*2.5);
        G.audio.sfx('spawn');
        b.state='cool'; b.stateT=1.2;
      }
      break;
    case 'slam': {
      b.stateT-=dt;
      const k=1-b.stateT/.85;
      if(b.stateT>0){
        // 跃起追踪
        b.airY=Math.sin(k*Math.PI)*2.2;
        const tx=G.lerp(b.slamFromX, p.x, Math.min(1,k*1.15)), tz=G.lerp(b.slamFromZ, p.z, Math.min(1,k*1.15));
        b.x=tx; b.z=tz;
        b.mesh.position.y=b.airY;
      } else {
        // 落地
        b.mesh.position.y=0; b.airY=0;
        G.fx.shake(.6); G.audio.sfx('shock');
        G.fx.ring(b.x,b.z,2.2,0xffa040,.5); G.fx.ring(b.x,b.z,3.4,0xff6030,.7);
        G.fx.smoke(b.x,.3,b.z,8,true);
        const n=b.phase===3?20:16;
        for(let i=0;i<n;i++) bshoot(i/n*G.TAU+Math.random()*.2,{spd:4.6});
        if(p && G.dist(b.x,b.z,p.x,p.z)<2.4 && p.rollT<=0 && !p.invulnT) p.hurt(2,a);
        b.state='cool'; b.stateT=1.2;
      }
      break; }
    case 'wall': {
      b.stateT-=dt;
      if(b.stateT<=0){
        // 弹墙：垂直于玩家方向的一排弹幕，留缺口
        const perp=a+Math.PI/2;
        const gap=G.rng.int(-3,3);
        for(let i=-5;i<=5;i++){
          if(Math.abs(i-gap)<2) continue;
          const ox=b.x+Math.cos(perp)*i*1.1, oz=b.z+Math.sin(perp)*i*1.1;
          G.weapons.spawn({ team:'e', x:ox, z:oz, ang:a, spd:3.8, dmg:1, size:.2, color:0xd04050, life:3.6 });
        }
        G.audio.sfx('plasma',{v:.6});
        b.state='cool'; b.stateT=1.0;
      }
      break; }
    case 'dying': {
      b.stateT-=dt;
      b.mesh.position.y=Math.sin(b.t*30)*.05;
      if(b.stateT>0){
        if(!b.expT||b.expT<=0){
          b.expT=.4;
          const ex=b.x+(Math.random()-.5)*2, ez=b.z+(Math.random()-.5)*2;
          G.weapons.explode(ex,ez,1.6,0,'none');
          G.fx.shake(.4);
        } else b.expT-=dt;
      } else {
        b.dead=true;
        G.fx.hitstop(.2);
        G.fx.burst(b.x,1,b.z,30,{color:0xffa030,spd:5,life:.9,s0:.25});
        G.fx.confetti(b.x,1.5,b.z);
        G.scene.remove(b.mesh);
        this.active=null;
        G.ui.bossBar(false);
        G.game.bossDefeated();
      }
      return; }
  }

  // 朝向与动画
  if(p && b.state!=='charge') b.face=G.angLerp(b.face,a,Math.min(1,5*dt));
  b.mesh.rotation.y=-b.face;
  if(b.state!=='air'&&b.state!=='slam') b.mesh.position.set(b.x, b.mesh.position.y*Math.pow(.001,dt), b.z);
  if(b.moving){ b.walkT+=dt*7; b.moving=false; }
  b.refs.head.position.y=1.9+Math.sin(b.walkT)*.04;
  b.refs.gun.position.y=1.15+Math.sin(b.walkT+.5)*.03;
  // 眼睛发光
  b.refs.eyeLight.intensity = b.phase===3? 1.4+Math.sin(b.t*10)*.4 : (b.phase===2?.9:.5);
  // 血条
  G.ui.bossBar(true, b.phase===3?'铁颚 · 弹膛之王 · 狂暴':(b.phase===2?'铁颚 · 弹膛之王 · 暴怒':'铁颚 · 弹膛之王'), b.hp/b.maxhp);
};

B._flash = function(b,on){
  b.mesh.traverse(o=>{ if(o.isMesh){ if(on){ o.userData._om=o.material; o.material=G.flashMat; } else if(o.userData._om){ o.material=o.userData._om; } } });
};

B.pickAttack = function(d){
  const b=this.active;
  let pool;
  if(b.phase===1) pool=['gatling','gatling','fans','fans','charge'];
  else if(b.phase===2) pool=['gatling','fans','charge','spiral','spiral','summon','slam'];
  else pool=['gatling','spiral','spiral','fans','slam','wall','wall','charge','summon'];
  // 避免连续同一招
  let atk=G.rng.pick(pool);
  if(atk===b.lastAtk) atk=G.rng.pick(pool);
  b.lastAtk=atk;
  if(atk==='summon' && G.enemies.list.length>5) atk='fans';
  switch(atk){
    case 'gatling': b.state='gatling'; b.stateT=3.0; b.fireT=0; G.audio.sfx('charge',{v:.5}); break;
    case 'fans': b.state='fans'; b.stateT=1.8; b.fansLeft=3; b.fanT=0; break;
    case 'charge': b.state='chargeWind'; b.stateT=.6; break;
    case 'spiral': b.state='spiral'; b.stateT=2.6; b.spT=0; b.spiralBase=Math.random()*G.TAU; G.audio.sfx('phase',{v:.4}); break;
    case 'summon': b.state='summon'; b.stateT=.5; G.audio.sfx('spawn'); break;
    case 'slam': b.state='slam'; b.stateT=.85; b.slamFromX=b.x; b.slamFromZ=b.z; G.audio.sfx('charge',{v:.5}); break;
    case 'wall': b.state='wall'; b.stateT=.5; G.audio.sfx('alarm',{v:.4}); break;
  }
};

G.boss = B;
G.hurtBoss = dmg=>B.hurt(dmg);
})();
