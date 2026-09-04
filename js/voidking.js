/* 第九层事故 - 第三层 Boss：无面君主 · 虚空王座（三阶段 · 悬浮 · 弹幕/瞬移/召唤） */
'use strict';
(function(){
const GB = G.GeoBuilder;
const VK = { active:null };

/* ---------- 造型（模块级缓存；forward=+X，脸/眼缝开在 +X 面） ---------- */
let _bodyGeo=null;
function bodyGeo(){
  if(_bodyGeo) return _bodyGeo;
  const b=new GB();
  // 主躯干：倒梯形装甲壳
  b.box(0,1.15,0,1.35,1.15,.95,0x2a1840);
  b.box(0,1.5,.5,1.05,.5,.14,0x3a2a5a);            // 胸甲前板（+X 前方）
  b.box(0,1.12,.52,.5,.5,.1,0x0c0616);             // 胸口王座空洞（暗）
  b.sph(0,1.12,.55,.14,0xc060ff,5);                // 空洞内的虚空核心
  // 肩甲：两片悬浮斜板
  b.box(-.85,1.7,0,.5,.7,.9,0x3a2a5a);
  b.box(.85,1.7,0,.5,.7,.9,0x3a2a5a);
  b.box(-.85,2.08,0,.54,.1,.94,0x4a3570);
  b.box(.85,2.08,0,.54,.1,.94,0x4a3570);
  // 下摆碎裂装甲（视觉在 mantle 组内单独摆动，此处只做基环）
  b.cyl(0,.42,0,.62,.5,.24,0x1c1330,6);
  _bodyGeo=b.build(); return _bodyGeo;
}
let _headGeo=null;
function headGeo(){
  if(_headGeo) return _headGeo;
  const b=new GB();
  b.box(0,.1,0,.72,.78,.7,0x241a44);               // 无面头壳
  b.box(0,.1,.36,.5,.6,.1,0x0c0616);               // 面板凹陷
  b.box(0,.12,.42,.09,.5,.06,0xc060ff);            // 竖缝发光眼
  b.box(0,-.32,.3,.4,.14,.3,0x3a2a5a);             // 颔甲
  b.cone(0,.62,0,.1,.3,0x8a5cff,4);                // 头顶晶尖
  _headGeo=b.build(); return _headGeo;
}
let _throneGeo=null;
function throneGeo(){
  if(_throneGeo) return _throneGeo;
  const b=new GB();
  // 王座背架：背后高耸尖塔
  b.box(0,1.1,-.75,.9,2.2,.16,0x1c1330);
  b.cone(0,2.5,-.75,.3,.7,0x2a1840,4);
  b.box(-.5,1.3,-.75,.16,1.5,.12,0x2a1840);
  b.box(.5,1.3,-.75,.16,1.5,.12,0x2a1840);
  b.sph(0,2.85,-.75,.1,0xc060ff,4);
  _throneGeo=b.build(); return _throneGeo;
}
let _shardGeo=null;
function shardGeo(){
  if(_shardGeo) return _shardGeo;
  const b=new GB();
  b.cone(0,.1,0,.13,.26,0x8a5cff,4);   // 上半锥
  b.cone(0,-.1,0,.13,.26,0x6a3aa8,4);  // 下半锥 → 组成菱形晶体
  _shardGeo=b.build(); return _shardGeo;
}

VK.spawn = function(x,z){
  const g=new THREE.Group();
  const body=new THREE.Mesh(bodyGeo(), G.vcolMat); body.castShadow=true; g.add(body);
  const head=new THREE.Group();
  head.add(new THREE.Mesh(headGeo(), G.vcolMat));
  head.position.set(0,2.2,.1); g.add(head);
  const throne=new THREE.Mesh(throneGeo(), G.vcolMat); throne.position.set(0,0,0); g.add(throne);
  // 环绕晶体（4 片菱形，旋转动画）
  const shards=new THREE.Group();
  for(let i=0;i<4;i++){
    const s=new THREE.Mesh(shardGeo(), G.vcolMat);
    const a=i/4*G.TAU;
    s.position.set(Math.cos(a)*1.35,1.3,Math.sin(a)*1.35);
    s.scale.setScalar(.8+((i*37)%10)/22);
    shards.add(s);
  }
  g.add(shards);
  // 下摆碎裂装甲条（4 片，摆动动画）
  const mantle=new THREE.Group();
  for(let i=0;i<4;i++){
    const m=new THREE.Mesh((function(){ const b=new GB(); b.box(0,0,0,.2,.62,.14,i%2?0x241a44:0x1c1330); return b.build(); })(), G.vcolMat);
    const a=i/4*G.TAU+.4;
    m.position.set(Math.cos(a)*.5,.32,Math.sin(a)*.5);
    m.rotation.y=-a;
    m.userData.i=i;
    mantle.add(m);
  }
  g.add(mantle);
  const eyeLight=new THREE.PointLight(0xc060ff,0,7,2); eyeLight.position.set(0,2.2,.7); g.add(eyeLight);
  const aura=new THREE.Sprite(G.pmat(0x8a3ac0)); aura.scale.set(3.6,3.6,1); aura.position.y=1.4; g.add(aura);

  const boss={
    x, z, vx:0, vz:0, r:1.0, hp:1150, maxhp:1150,
    dead:false, deadT:0, spawnT:.7, flashT:0, phase:1,
    mesh:g, refs:{head, eye:null, shards, mantle, eyeLight, aura, body, throne},
    state:'intro', stateT:1.6, t:0, face:0,
    atkIdx:0, lastAtk:'', contactCd:0, stunT:0,
    photoT:0, photoBuf:0, photoPhase:'', photoDeath:false, // 薛定谔的拍立得状态
    hoverT:0, dying:false, blinkT:0,
  };
  g.position.set(x,0,z);
  g.scale.setScalar(.01);
  G.scene.add(g);
  this.active=boss;
  G.ui.bossBar(true, '无面君主 · 虚空王座', 1);
  G.ui.banner('无面君主', '第三层领主 · 虚空降临');
  G.audio.bossIntro('voidscream');   // 出场演出：环境让位→虚空洞啸→stinger→Boss 音乐
  G.fx.shake(.5);
  return boss;
};

VK.clear = function(){
  if(this.active){ G.scene.remove(this.active.mesh); this.active=null; }
};

function vshoot(ang, opt){
  opt=opt||{};
  const b=VK.active;
  G.weapons.spawn({
    team:'e', x:b.x+Math.cos(ang)*(b.r+.3), z:b.z+Math.sin(ang)*(b.r+.3),
    ang, spd:opt.spd||4.6, dmg:1, size:opt.size||.18,
    color:opt.color||0x9a40e0, life:opt.life||3.4, pierce:opt.pierce||0,
  });
}

VK.hurt = function(dmg){
  const b=this.active;
  if(!b || b.dead || b.spawnT>0 || b.state==='intro') return;
  // 照片状态：伤害记入 DamageBuffer，冻结期不扣真实 HP
  if(b.photoT>0 || b.photoPhase==='resolve'){ G.photo.record(b, dmg); return; }
  b.hp-=dmg;
  b.flashT=.06;
  G.fx.dmgNum(b.x+(Math.random()-.5), 2.6, b.z, Math.round(dmg), dmg>15);
  G.audio.sfx('hit',{v:.4});
  if(b.hp<=b.maxhp*.6 && b.phase===1){
    b.phase=2; b.state='phase'; b.stateT=1.0;
    G.audio.sfx('phase'); G.fx.shake(.6); G.fx.hitstop(.12);
    G.ui.toast('王座碎裂了！无面君主显出真容！');
    b.refs.aura.material=G.pmat(0xb050ff);
  } else if(b.hp<=b.maxhp*.25 && b.phase===2){
    b.phase=3; b.state='phase'; b.stateT=1.0;
    G.audio.sfx('voidscream'); G.fx.shake(.7); G.fx.hitstop(.15);
    G.ui.toast('无面君主进入了虚空暴走！');
    b.refs.aura.material=G.pmat(0xe8d8ff);
    b.refs.aura.scale.set(4.2,4.2,1);
  }
  if(b.hp<=0 && !b.dying){
    b.hp=0; b.dying=true; b.state='dying'; b.stateT=2.6;
    G.fx.slowmo(.25,1.2); G.fx.shake(.8);
    G.audio.sfx('voidscream');
  }
};

const ATTACKS = ['petals','lance','rings','blink','summon','wall'];

VK.update = function(dt){
  const b=this.active;
  if(!b) return;
  const p=G.player;
  b.t+=dt;
  if(b.spawnT>0){ b.spawnT-=dt; b.mesh.scale.setScalar(Math.max(.01,1-b.spawnT/.7)); return; }
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
  if(b.flashT>0){ b.flashT-=dt; if(!b._flashOn){ VK._flash(b,true); b._flashOn=true; } }
  else if(b._flashOn){ VK._flash(b,false); b._flashOn=false; }

  if(b.stunT>0){
    b.stunT-=dt;
    b.mesh.position.set(b.x,0,b.z);
    b.mesh.rotation.z=Math.sin(b.t*30)*.05;
    if(b.stunT<=0) b.mesh.rotation.z=0;
    return;
  }

  const d=p? G.dist(b.x,b.z,p.x,p.z):99;
  const a=p? G.angTo(b.x,b.z,p.x,p.z):0;
  const spdMul=b.phase===3?1.3:(b.phase===2?1.15:1);

  // 接触伤害
  b.contactCd-=dt;
  if(p && !p.dead && d<b.r+.5 && b.contactCd<=0 && p.rollT<=0 && !p.invulnT && !p.ghostT){
    p.hurt(1,a); b.contactCd=.9;
  }

  switch(b.state){
    case 'intro':
      b.stateT-=dt;
      b.mesh.position.y=Math.sin(b.t*6)*.06;
      if(b.stateT<=0){ b.state='cool'; b.stateT=.7; }
      break;
    case 'phase':
      b.stateT-=dt;
      b.mesh.position.y=Math.max(0,Math.sin((1-b.stateT)*Math.PI)*.4);
      if(b.stateT<=0){ b.state='cool'; b.stateT=.5; }
      break;
    case 'cool': {
      b.stateT-=dt;
      // 悬浮逼近 + 缓慢绕行
      let mx=Math.cos(a), mz=Math.sin(a);
      if(d<3.2){ mx=-mx; mz=-mz; }
      const s=Math.sin(b.t*.7)*.45;
      mx+=-Math.sin(a)*s; mz+=Math.cos(a)*s;
      const l=Math.hypot(mx,mz)||1;
      G.moveEntity(b, mx/l*1.15*spdMul*dt, mz/l*1.15*spdMul*dt);
      b.moving=true;
      if(b.stateT<=0){ this.pickAttack(d); }
      break; }
    case 'petals': {
      // 花瓣螺旋：相位3 时 4 臂反向旋转
      b.stateT-=dt;
      b.spT=(b.spT||0)-dt;
      if(b.spT<=0){
        b.spT=b.phase===3?.085:.1;
        b.spiralBase=(b.spiralBase||0)+(b.phase===3?-.5:.5);
        const arms=b.phase===3?4:(b.phase===2?3:2);
        for(let i=0;i<arms;i++) vshoot(b.spiralBase+i/arms*G.TAU,{spd:4.2,color:0x9a40e0,size:.17});
      }
      G.moveEntity(b, Math.cos(a)*.55*dt, Math.sin(a)*.55*dt);
      if(b.stateT<=0){ b.state='cool'; b.stateT=b.phase===3?.55:.95; }
      break; }
    case 'lance': {
      // 虚空长枪：3 连发高速狙击
      b.stateT-=dt;
      b.fireT=(b.fireT||0)-dt;
      if(b.fireT<=0 && b.lanceLeft>0){
        b.lanceLeft--;
        b.fireT=.28;
        const aim=G.angTo(b.x,b.z,p.x,p.z)+(Math.random()-.5)*.06;
        vshoot(aim,{spd:7.2,size:.15,color:0xc060ff,life:2.6});
        G.audio.sfx('smg',{v:.4});
        G.fx.sparks(b.x+Math.cos(aim)*1.2,1.6,b.z+Math.sin(aim)*1.2,0xc060ff);
      } else if(b.lanceLeft<=0 && b.stateT<.4){ b.state='cool'; b.stateT=.9; }
      if(b.stateT<=0){ b.state='cool'; b.stateT=.9; }
      break; }
    case 'rings': {
      // 三波同心环
      b.stateT-=dt;
      if(b.ringsLeft>0 && (b.ringT||0)<=0){
        b.ringsLeft--;
        b.ringT=.55;
        const n=b.phase===3?18:14;
        for(let i=0;i<n;i++) vshoot(i/n*G.TAU+(b.ringsLeft%2?Math.PI/n:0),{spd:3.9,color:0x7a30c0,size:.17});
        G.audio.sfx('plasma',{v:.5});
      } else b.ringT=(b.ringT||0)-dt;
      if(b.ringsLeft<=0 && b.stateT<=0){ b.state='cool'; b.stateT=1.0; }
      break; }
    case 'blink': {
      // 瞬移：淡出 → 玩家侧后 3.2 格 → 淡入 + 8 向弹
      b.stateT-=dt;
      if(b.blinkStage===0 && b.stateT<=0){
        b.blinkStage=1;
        const side=(G.rng.chance(.5)?1:-1);
        const ta=a+side*Math.PI/2;
        b.x=p.x+Math.cos(ta)*3.2; b.z=p.z+Math.sin(ta)*3.2;
        b.mesh.position.set(b.x,0,b.z);
        b.blinkStage=2; b.stateT=.25;
        G.audio.sfx('spawn');
        G.fx.burst(b.x,1.2,b.z,14,{color:0x9a40e0,spd:3.5,life:.5,s0:.2});
      } else if(b.blinkStage===2 && b.stateT<=0){
        for(let i=0;i<8;i++) vshoot(i/8*G.TAU,{spd:4.6,color:0xc060ff});
        G.audio.sfx('shotgun',{v:.5});
        b.state='cool'; b.stateT=b.phase===3?.6:1.0;
      }
      break; }
    case 'summon':
      b.stateT-=dt;
      if(b.stateT<=0){
        for(let i=0;i<2;i++) G.enemies.spawn('wisp', b.x+(Math.random()-.5)*3, b.z+(Math.random()-.5)*3);
        if(b.phase>=2) G.enemies.spawn('hexer', b.x+(Math.random()-.5)*3, b.z+(Math.random()-.5)*3);
        G.audio.sfx('spawn');
        b.state='cool'; b.stateT=1.2;
      }
      break;
    case 'wall': {
      // 虚空弹幕墙：垂直玩家方向一排，留缺口
      b.stateT-=dt;
      if(b.stateT<=0){
        const perp=a+Math.PI/2;
        const gap=G.rng.int(-3,3);
        for(let i=-5;i<=5;i++){
          if(Math.abs(i-gap)<2) continue;
          const ox=b.x+Math.cos(perp)*i*1.1, oz=b.z+Math.sin(perp)*i*1.1;
          G.weapons.spawn({team:'e', x:ox, z:oz, ang:a, spd:3.8, dmg:1, size:.2, color:0x8a3ac0, life:3.6});
        }
        G.audio.sfx('alarm',{v:.4});
        b.state='cool'; b.stateT=1.0;
      }
      break; }
    case 'dying': {
      b.stateT-=dt;
      b.mesh.position.y=Math.sin(b.t*30)*.05;
      if(b.stateT>0){
        if(!b.expT||b.expT<=0){
          b.expT=.35;
          // 碎片逐个飞爆：先炸环绕晶体
          const sh=b.refs.shards.children;
          const idx=Math.floor((2.6-b.stateT)/.35)%Math.max(1,sh.length);
          if(sh[idx]){ sh[idx].visible=false; }
          const ex=b.x+(Math.random()-.5)*2.2, ez=b.z+(Math.random()-.5)*2.2;
          G.weapons.explode(ex,ez,1.5,0,'none');
          G.fx.burst(ex,1.2,ez,10,{color:0x9a40e0,spd:4,life:.7,s0:.2});
          G.fx.shake(.4);
        } else b.expT-=dt;
      } else {
        b.dead=true;
        G.fx.hitstop(.2);
        G.fx.burst(b.x,1.4,b.z,32,{color:0xb060ff,spd:5,life:.9,s0:.25});
        G.fx.confetti(b.x,1.8,b.z);
        G.scene.remove(b.mesh);
        this.active=null;
        if(G.boss) G.boss.active=null;   // 与铁颚语义对齐：外部伤害判定依赖 G.boss.active
        G.ui.bossBar(false);
        G.game.bossDefeated();
      }
      return; }
  }

  // 朝向与悬浮动画（forward=+X → rotation.y=-face）
  if(p && b.state!=='blink') b.face=G.angLerp(b.face,a,Math.min(1,5*dt));
  b.mesh.rotation.y=-b.face;
  b.hoverT+=dt*(b.phase===3?3.2:2.2);
  if(b.state!=='intro'&&b.state!=='phase') b.mesh.position.set(b.x, Math.sin(b.hoverT)*.14+.1, b.z);
  if(b.moving){ b.moving=false; }
  // 环绕晶体旋转与公转
  const sh=b.refs.shards;
  sh.rotation.y+=dt*(b.phase===3?2.6:(b.phase===2?1.8:1.1));
  sh.children.forEach((c,i)=>{ c.rotation.x+=dt*2; c.position.y=1.3+Math.sin(b.t*2+i)*.15; });
  // 下摆摆动
  b.refs.mantle.children.forEach((m,i)=>{ m.rotation.z=Math.sin(b.t*2.4+i*1.5)*.14; });
  // 眼缝光呼吸
  b.refs.eyeLight.intensity=b.phase===3? 1.6+Math.sin(b.t*9)*.5 : (b.phase===2? 1.1:.7);
  // 血条
  G.ui.bossBar(true, b.phase===3?'无面君主 · 虚空暴走':(b.phase===2?'无面君主 · 王座碎裂':'无面君主 · 虚空王座'), b.hp/b.maxhp);
};

VK._flash = function(b,on){
  b.mesh.traverse(o=>{ if(o.isMesh){ if(on){ o.userData._om=o.material; o.material=G.flashMat; } else if(o.userData._om){ o.material=o.userData._om; } } });
};

VK.pickAttack = function(d){
  const b=this.active;
  let pool;
  if(b.phase===1) pool=['petals','petals','lance','lance','rings'];
  else if(b.phase===2) pool=['petals','lance','rings','blink','blink','wall','summon'];
  else pool=['petals','lance','lance','rings','blink','wall','summon','blink'];
  // 避免连续同一招
  let atk=G.rng.pick(pool);
  if(atk===b.lastAtk) atk=G.rng.pick(pool);
  b.lastAtk=atk;
  if(atk==='summon' && G.enemies.list.length>5) atk='rings';
  switch(atk){
    case 'petals': b.state='petals'; b.stateT=2.6; b.spT=0; b.spiralBase=Math.random()*G.TAU; G.audio.sfx('phase',{v:.4}); break;
    case 'lance': b.state='lance'; b.stateT=1.6; b.fireT=0; b.lanceLeft=3; G.audio.sfx('charge',{v:.45}); break;
    case 'rings': b.state='rings'; b.stateT=2.4; b.ringsLeft=3; b.ringT=0; break;
    case 'blink': b.state='blink'; b.stateT=.35; b.blinkStage=0; G.fx.burst(b.x,1.4,b.z,12,{color:0x9a40e0,spd:3,life:.5,s0:.2}); break;
    case 'summon': b.state='summon'; b.stateT=.5; G.audio.sfx('spawn'); break;
    case 'wall': b.state='wall'; b.stateT=.5; G.audio.sfx('alarm',{v:.4}); break;
  }
};

G.voidking = VK;
})();
