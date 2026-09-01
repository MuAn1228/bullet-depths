/* 弹膛深渊 - 敌人：9种类型 + 精英变体 + AI + 低多边形造型 */
'use strict';
(function(){
const GB = G.GeoBuilder;
const E = { defs:{}, geoCache:{}, list:[] };

/* ---------- 造型构建（按类型缓存几何，实例共享） ---------- */
function partGeo(key, fn){
  if(!E.geoCache[key]){ const b=new GB(); fn(b); E.geoCache[key]=b.build(); }
  return E.geoCache[key];
}
function M(geo, x,y,z){ const m=new THREE.Mesh(geo, G.vcolMat); m.position.set(x,y,z); m.castShadow=true; return m; }

/* 每种敌人造型：返回 {group, refs} */
E.makeMesh = function(type, elite){
  const g = new THREE.Group(); const r = {};
  const tint = elite ? 1.18 : 1;
  switch(type){
    case 'gunner': {
      r.body = M(partGeo('gun_body', b=>{ b.box(0,.42,0,.46,.5,.36,0x4a7a38); b.box(0,.2,0,.5,.14,.4,0x6a5230); b.box(0,.68,0,.4,.12,.32,0x3a5a28); }),0,0,0); g.add(r.body);
      r.head = new THREE.Group();
      r.head.add(M(partGeo('gun_head', b=>{ b.box(0,0,0,.36,.3,.32,0x5a8a44); b.box(-.24,.06,0,.14,.1,.06,0x5a8a44); b.box(.24,.06,0,.14,.1,.06,0x5a8a44); b.box(0,.17,0,.38,.1,.34,0xc03028); b.box(0,.1,.16,.07,.05,.03,0x201810); b.box(.12,.1,.16,.07,.05,.03,0x201810); }),0,0,0));
      r.head.position.y=.92; g.add(r.head);
      r.gun = M(partGeo('gun_pistol', b=>{ b.box(0,0,0,.3,.08,.08,0x383840); b.box(-.12,-.07,0,.08,.14,.08,0x584428); }),.34,.5,.12); g.add(r.gun);
      r.legL = M(partGeo('gun_leg', b=>b.box(0,-.08,0,.12,.2,.12,0x3a5a28)),-.1,.2,.12); r.legR = M(partGeo('gun_leg'),.1,.2,-.12);
      g.add(r.legL); g.add(r.legR);
      break; }
    case 'charger': {
      r.body = M(partGeo('ch_body', b=>{ b.box(0,.4,0,.56,.4,.6,0x9a4030); b.box(.3,.44,0,.3,.28,.34,0x7a3020); b.box(-.35,.5,0,.2,.12,.3,0x5a2818); }),0,0,0); g.add(r.body);
      r.head = new THREE.Group();
      r.head.add(M(partGeo('ch_head', b=>{
        b.box(0,0,0,.3,.26,.28,0x9a4030);
        b.cone(-.04,.22,.14,.07,.24,0xe8d8b0); b.cone(-.04,.22,-.14,.07,.24,0xe8d8b0);
        b.box(0,-.06,.16,.12,.08,.1,0x8a3828);
        b.box(-.07,.05,.15,.05,.04,.03,0xffe050); b.box(.07,.05,.15,.05,.04,.03,0xffe050);
      }),0,0,0));
      r.head.position.set(.48,.5,0); g.add(r.head);
      r.legL=M(partGeo('ch_leg',b=>b.box(0,-.1,0,.12,.22,.12,0x6a2818)),.2,.24,.24);
      r.legR=M(partGeo('ch_leg'),-.2,.24,-.24); r.legL2=M(partGeo('ch_leg'),.2,.24,-.24); r.legR2=M(partGeo('ch_leg'),-.2,.24,.24);
      g.add(r.legL,r.legR,r.legL2,r.legR2);
      break; }
    case 'shroom': {
      r.body = M(partGeo('sh_body', b=>{ b.cyl(0,.25,0,.2,.3,.5,0xd8cbb0); b.box(0,.05,0,.34,.1,.34,0x8a6a4a); b.box(-.08,.28,.14,.05,.06,.03,0x201810); b.box(.08,.28,.14,.05,.06,.03,0x201810); b.box(0,.2,.15,.14,.04,.03,0x603020); }),0,0,0); g.add(r.body);
      r.cap = M(partGeo('sh_cap', b=>{ b.sph(0,0,0,.48,0xc03830,7); b.sph(-.2,.14,.18,.1,0xf0e8d8,5); b.sph(.22,.1,-.14,.09,0xf0e8d8,5); b.sph(.05,.2,.2,.08,0xf0e8d8,5); }),0,.62,0); g.add(r.cap);
      r.cap.scale.set(1,.75,1);
      break; }
    case 'slime': {
      r.body = M(partGeo('sl_body', b=>{ b.sph(0,0,0,.4,0x50b860,7); b.box(-.1,.12,.3,.07,.09,.05,0x101810); b.box(.1,.12,.3,.07,.09,.05,0x101810); }),0,.3,0); g.add(r.body);
      r.body.scale.set(1,.8,1);
      break; }
    case 'shotgunner': {
      r.body = M(partGeo('sg_body', b=>{ b.box(0,.5,0,.6,.56,.48,0x6a5040); b.box(0,.42,.26,.5,.44,.1,0xd8d0c0); b.box(0,.78,0,.44,.14,.4,0x504030); b.box(0,.5,.24,.1,.3,.14,0x8a2020); }),0,0,0); g.add(r.body);
      r.head = new THREE.Group();
      r.head.add(M(partGeo('sg_head', b=>{ b.box(0,0,0,.34,.3,.32,0x7a5a44); b.box(0,.02,.17,.26,.12,.04,0x38302a); b.box(-.08,-.04,.17,.06,.04,.03,0xffe050); b.box(.08,-.04,.17,.06,.04,.03,0xffe050); }),0,0,0));
      r.head.position.y=1.0; g.add(r.head);
      r.gun = M(partGeo('sg_gun', b=>{ b.box(0,0,0,.5,.1,.14,0x30303a); b.box(.1,.02,0,.3,.06,.05,0x484858); b.box(.1,.02,.08,.3,.06,.05,0x484858); b.box(-.2,-.08,0,.1,.16,.12,0x584428); }),.42,.55,.18); g.add(r.gun);
      r.legL=M(partGeo('sg_leg',b=>b.box(0,-.1,0,.16,.24,.16,0x4a3a2c)),-.16,.26,.14); r.legR=M(partGeo('sg_leg'),.16,.26,-.14);
      g.add(r.legL,r.legR);
      break; }
    case 'sniper': {
      r.body = new THREE.Group();
      r.body.add(M(partGeo('sn_body', b=>{ b.sph(0,0,0,.34,0xb8bcc8,7); b.box(0,.36,0,.06,.2,.06,0x585c68); b.sph(0,.5,0,.07,0xc03028,4); }),0,0,0));
      r.iris = new THREE.Mesh(G.sphGeo(.12,6), G.bmat(0xff3030)); r.iris.position.set(.26,0,0); r.body.add(r.iris);
      for(let i=0;i<3;i++){ const leg=M(partGeo('sn_leg',b=>b.box(0,-.2,0,.06,.4,.06,0x585c68))); leg.position.set(0,-.1,0); leg.rotation.x=i/3*G.TAU; leg.rotation.x = Math.PI/3; r.body.add(leg); leg.position.set(-.05,-.35, Math.cos(i/3*G.TAU)*.2); leg.position.z=Math.sin(i/3*G.TAU)*.2; }
      r.body.position.y=.95; g.add(r.body);
      break; }
    case 'hexer': {
      r.body = new THREE.Group();
      r.body.add(M(partGeo('hx_body', b=>{ b.cone(0,0,0,.42,.9,0x5a3a80); b.cone(0,.28,0,.26,.4,0x402860); b.box(-.08,.3,.18,.06,.08,.04,0xffe050); b.box(.08,.3,.18,.06,.08,.04,0xffe050); b.cyl(.28,.0,.1,.04,.04,.8,0x8a7a98); b.sph(.28,.42,.1,.11,0xc060ff,5); }),0,0,0));
      r.body.position.y=.55; g.add(r.body);
      break; }
    case 'beetle': {
      r.body = M(partGeo('bt_body', b=>{ b.sph(0,0,0,.34,0x2a2a30,7); b.box(.28,.02,0,.2,.16,.24,0x3a3a44); }),0,.22,0); g.add(r.body);
      r.belly = new THREE.Mesh(G.sphGeo(.2,6), G.bmat(0xff3020)); r.belly.position.set(-.05,.16,0); g.add(r.belly);
      r.legs=[];
      for(let i=0;i<3;i++) for(const s of [-1,1]){ const l=M(partGeo('bt_leg',b=>b.box(0,0,0,.05,.06,.16,0x1a1a20))); l.position.set(-.1+i*.14,.12,s*.28); r.legs.push(l); g.add(l); }
      break; }
    case 'shield': {
      r.body = M(partGeo('sd_body', b=>{ b.box(0,.55,0,.5,.55,.4,0x68707c); b.box(0,.9,0,.34,.18,.34,0x505862); b.box(-.08,.92,.18,.06,.05,.04,0xffe050); b.box(.08,.92,.18,.06,.05,.04,0xffe050); }),0,0,0); g.add(r.body);
      r.shield = M(partGeo('sd_shield', b=>{ b.box(0,0,0,.14,1.0,.72,0x7a8494); b.box(.09,.05,0,.04,.9,.1,0xc8a040); b.box(.09,.3,0,.04,.36,.1,0xc8a040); }),.32,.55,0); g.add(r.shield);
      r.club = M(partGeo('sd_club', b=>{ b.cyl(0,0,0,.05,.05,.7,0x584428); b.box(0,.42,0,.2,.2,.2,0x7a8494); }),.3,.7,-.34); g.add(r.club);
      r.legL=M(partGeo('sd_leg',b=>b.box(0,-.1,0,.14,.22,.14,0x404650)),-.14,.24,.14); r.legR=M(partGeo('sd_leg'),.14,.24,-.14);
      g.add(r.legL,r.legR);
      break; }
    case 'wisp': { // 怨灵：半透明浮游幽灵，蛇形逼近后自爆
      r.body = new THREE.Group();
      const shell=new THREE.Mesh(partGeo('wi_shell', b=>{ b.sph(0,0,0,.34,0x9a7ac8,7); b.cone(0,-.32,0,.24,.3,0x7a5aa8,7); }), new THREE.MeshLambertMaterial({color:0x9a7ac8, transparent:true, opacity:.55}));
      shell.castShadow=true;
      r.body.add(shell);
      r.core=new THREE.Mesh(G.sphGeo(.13,6), G.bmat(0xe0c0ff)); r.core.position.set(0,.05,0); r.body.add(r.core);
      const eL=new THREE.Mesh(G.boxGeo(.07,.09,.03), G.bmat(0x301840)); eL.position.set(-.09,.1,.28); r.body.add(eL);
      const eR=eL.clone(); eR.position.x=.09; r.body.add(eR);
      r.body.position.y=.85; g.add(r.body);
      r.aura=new THREE.Sprite(G.pmat(0xb090e8)); r.aura.scale.set(1.1,1.1,1); r.aura.position.y=.85; g.add(r.aura);
      break; }
    case 'totem': { // 激光图腾：静止石柱，激活时双臂激光旋转扫射
      r.body = M(partGeo('tt_body', b=>{
        b.box(0,.14,0,.8,.28,.8,0x4c4452); b.cyl(0,.75,0,.28,.34,1.1,0x5c5262,6);
        b.box(0,1.4,0,.62,.2,.62,0x4c4452);
        b.sph(0,1.62,0,.17,0xff6040,6);
        b.box(-.14,.5,.3,.1,.16,.06,0x8a6a3a); b.box(.14,.5,.3,.1,.16,.06,0x8a6a3a);
      }),0,0,0); g.add(r.body);
      r.gem=new THREE.Mesh(G.sphGeo(.17,6), G.bmat(0xff6040)); r.gem.position.y=1.62; g.add(r.gem);
      // 双激光臂（沿本地 +x 方向伸出，激活时可见）
      const armGeo=partGeo('tt_arm', b=>{ b.box(2.6,0,0,5.2,.07,.07,0xff4030); });
      if(!E._laserMat) E._laserMat=new THREE.MeshBasicMaterial({color:0xff4030, transparent:true, opacity:.75, depthWrite:false});
      r.arms=new THREE.Group();
      const a1=new THREE.Mesh(armGeo,E._laserMat); a1.position.x=2.6;
      const a2=new THREE.Mesh(armGeo,E._laserMat); a2.position.x=2.6; a2.rotation.y=Math.PI;
      r.arms.add(a1,a2); r.arms.position.y=1.62; r.arms.visible=false;
      g.add(r.arms);
      break; }
    case 'bomber': { // 掷弹手：矮胖投弹兵，保持距离抛投炸弹
      r.body = M(partGeo('bm_body', b=>{
        b.box(0,.42,0,.62,.5,.5,0x6a7a3a); b.box(0,.66,0,.5,.2,.44,0x54622c);
        b.box(0,.36,.27,.44,.34,.1,0x8a8a80); b.box(0,.3,.3,.3,.14,.06,0x30302a);
        b.box(-.3,.3,.2,.16,.3,.16,0x54622c); b.box(.3,.3,.2,.16,.3,.16,0x54622c);
      }),0,0,0); g.add(r.body);
      r.head=new THREE.Group();
      r.head.add(M(partGeo('bm_head', b=>{
        b.box(0,0,0,.4,.3,.36,0x7a8a44);
        b.box(0,.17,0,.46,.1,.4,0x4a5424); // 头巾
        b.box(-.08,.02,.19,.06,.05,.03,0xffe050); b.box(.08,.02,.19,.06,.05,.03,0xffe050);
        b.box(0,-.08,.19,.18,.06,.04,0x3a4020);
      }),0,0,0));
      r.head.position.y=.92; g.add(r.head);
      r.bomb=M(partGeo('bm_bomb', b=>{ b.sph(0,0,0,.16,0x20201e,6); b.cyl(0,.18,0,.04,.04,.1,0x8a7a5a,5); }),.4,.62,.22); g.add(r.bomb);
      r.legL=M(partGeo('bm_leg',b=>b.box(0,-.09,0,.14,.2,.14,0x4a5424)),-.15,.22,.1); r.legR=M(partGeo('bm_leg'),.15,.22,-.1);
      g.add(r.legL,r.legR);
      break; }
  }
  if(elite){
    const aura = new THREE.Sprite(G.pmat(0xd03020)); aura.scale.set(1.6,1.6,1); aura.position.y=.5; g.add(aura); r.aura=aura;
  }
  return {group:g, refs:r};
};

/* ---------- 定义表 ---------- */
Object.assign(E.defs, {
  gunner:    { hp:16, spd:2.1, r:.35, cost:1, floors:[1,2], money:[1,3] },
  charger:   { hp:22, spd:2.6, r:.38, cost:1, floors:[1,2], money:[1,3] },
  shroom:    { hp:26, spd:0,   r:.36, cost:1, floors:[1],   money:[2,4] },
  slime:     { hp:13, spd:2.2, r:.34, cost:1, floors:[1,2], money:[0,2] },
  shotgunner:{ hp:46, spd:1.7, r:.44, cost:2, floors:[2],   money:[3,6] },
  sniper:    { hp:20, spd:2.3, r:.34, cost:2, floors:[2],   money:[2,5] },
  hexer:     { hp:30, spd:1.5, r:.36, cost:2, floors:[2],   money:[3,6] },
  beetle:    { hp:9,  spd:3.4, r:.3,  cost:1, floors:[2],   money:[1,2] },
  shield:    { hp:52, spd:1.25,r:.46, cost:2, floors:[2],   money:[3,7] },
  wisp:      { hp:10, spd:4.6, r:.3,  cost:1, floors:[1,2], money:[1,3] },
  totem:     { hp:40, spd:0,   r:.42, cost:2, floors:[1,2], money:[3,5] },
  bomber:    { hp:34, spd:1.9, r:.38, cost:2, floors:[2],   money:[3,6] },
});

E.spawn = function(type, x, z, elite){
  const def = this.defs[type];
  E._uid=(E._uid||0)+1;
  const e = {
    uid:E._uid,
    type, def, elite:!!elite,
    x, z, vx:0, vz:0,
    hp: def.hp*(elite?2.2:1), maxhp: def.hp*(elite?2.2:1),
    r: def.r*(elite?1.2:1), spd: def.spd*(elite?1.15:1),
    dead:false, spawnT:.45, flashT:0, face:0, walkT:0,
    photoT:0, photoBuf:0, photoPhase:'', photoDeath:false, // 薛定谔的拍立得状态
    t:0, atkCd: .6+Math.random()*.8, state:'idle', stateT:0,
    strafe: G.rng.chance(.5)?1:-1, strafeT:1+Math.random(),
    gen:0, hopT:0, hopAng:Math.random()*G.TAU, hopDur:.6+Math.random()*.4, fuse:-1, contactCd:0, ai:{}, slowT:0,
    baseSpd: def.spd*(elite?1.15:1),
  };
  const {group, refs} = this.makeMesh(type, elite);
  e.mesh = group; e.refs = refs;
  if(elite) group.scale.setScalar(1.22);
  group.position.set(x,0,z);
  group.scale.multiplyScalar(.01);
  G.scene.add(group);
  G.fx.poof(x,.3,z,0x8a8070);
  G.audio.sfx('spawn',{v:.5});
  this.list.push(e);
  return e;
};

E.clear = function(){
  G.photo.reset(); // 照片状态/缓冲/相框/碎片全部复位（材质换装还原）
  for(const e of this.list){ G.scene.remove(e.mesh); if(e.laser){ G.scene.remove(e.laser); } }
  this.list.length=0;
};

function eshoot(e, ang, opt){
  opt=opt||{};
  G.weapons.spawn({
    team:'e', x:e.x+Math.cos(ang)*(e.r+.2), z:e.z+Math.sin(ang)*(e.r+.2),
    ang, spd:opt.spd||5, dmg:1, size:opt.size||.17,
    color:opt.color||0xff4030, life:opt.life||2.4, pierce:opt.pierce||0,
  });
}

E.hurt = function(e, dmg, ang, knock, ignoreBlock){ // G.hurtEnemy 入口
  if(e.dead || e.spawnT>0) return;
  // 照片状态 / 冲洗期：伤害禁止直接扣真实 HP，全部记入 DamageBuffer 延迟结算
  if(e.photoT>0 || e.photoPhase==='resolve'){ G.photo.record(e, dmg); return; }
  // 盾卫正面格挡（爆炸等范围伤害无视格挡；破防踉跄期间无法格挡）
  // ang 为子弹飞行方向；来袭方向 = ang+PI；盾卫面朝来袭方向时格挡
  if(e.type==='shield' && !ignoreBlock && e.state!=='stun' && e.state!=='guardbreak'){
    let d = Math.atan2(Math.sin(e.face-ang-Math.PI), Math.cos(e.face-ang-Math.PI));
    if(Math.abs(d) < 0.55){
      e.guardHits=(e.guardHits||0)+1;
      G.audio.sfx('clank');
      G.fx.sparks(e.x+Math.cos(e.face)*.5,.6,e.z+Math.sin(e.face)*.5,0xc0d0e0);
      if(e.guardHits>=5){
        // 破防：连续格挡 5 次盾牌被震开，踉跄 2.5 秒（不格挡/不转身/不攻击），普通武器的输出窗口
        e.guardHits=0;
        e.state='guardbreak'; e.stateT=2.5;
        G.audio.sfx('doorSlam',{v:.7});
        G.fx.shake(.2);
        G.fx.dmgNum(e.x, 1.3, e.z, '破防!', false);
        G.fx.burst(e.x+Math.cos(e.face)*.5,.7,e.z+Math.sin(e.face)*.5,10,{color:0xc0d0e0,spd:3,life:.45,s0:.15,kind:'s'});
      } else {
        G.fx.dmgNum(e.x, 1.1, e.z, '格挡', false);
      }
      return;
    }
  }
  e.hp -= dmg;
  e.flashT = .07;
  G.fx.dmgNum(e.x, 1.1, e.z, Math.round(dmg), false);
  G.fx.blood(e.x,.6,e.z, e.type==='slime'?0x50b860:0xc03028);
  G.audio.sfx('hit',{v:.5});
  if(ang!=null && knock){ e.vx += Math.cos(ang)*knock*.6; e.vz += Math.sin(ang)*knock*.6; }
  if(e.hp<=0) this.kill(e, ang);
};

E.kill = function(e){
  if(e.dead) return;
  e.dead = true;
  if(e.photoDeath){ // 照片碎裂死亡：不用普通死亡烟雾，撕成相纸碎片
    G.photo.shatter(e);
    G.audio.sfx('die',{v:.4});
  } else {
    G.fx.poof(e.x,.5,e.z,0xc8c0b0);
    G.fx.blood(e.x,.5,e.z, e.type==='slime'?0x50b860:0xa02820);
    G.audio.sfx('die',{v:.6});
  }
  G.game.run.kills++;
  // 掉落
  const p=G.player, mul = p? p.st.moneyMul:1;
  const n = Math.round(G.rng.int(e.def.money[0],e.def.money[1]) * (e.elite?4:1) * mul);
  for(let i=0;i<n;i++) G.spawnPickup('money', e.x+(Math.random()-.5)*.5, e.z+(Math.random()-.5)*.5);
  const luck = p? p.st.luck:0;
  if(G.rng.chance(.03+luck*.012)) G.spawnPickup('key', e.x, e.z);
  if(p && p.st.vamp>0 && G.rng.chance(p.st.vamp)) G.spawnPickup('heart', e.x, e.z);
  else if(G.rng.chance(.02+luck*.01)) G.spawnPickup('heart', e.x, e.z);
  // 特殊死亡
  if(e.type==='beetle'){ G.weapons.explode(e.x,e.z,2.2,10,'any'); }
  if(e.type==='slime' && e.gen===0){
    for(let i=0;i<2;i++){
      const pos=this.nearbyLegalPos(e.x+(Math.random()-.5)*.8, e.z+(Math.random()-.5)*.8);
      if(pos){ const s=this.spawn('slime', pos.x, pos.z); if(s){ s.gen=1; s.hp=s.maxhp=7; s.r=.24; s.room=e.room; } }
    }
  }
  if(e.laser){ G.scene.remove(e.laser); e.laser=null; }
  G.scene.remove(e.mesh);
  G.fx.hitstop(.03);
};

/* ---------- AI 更新 ---------- */
E.update = function(dt){
  const p = G.player;
  for(let i=this.list.length-1;i>=0;i--){
    const e = this.list[i];
    if(e.dead){ this.list.splice(i,1); continue; }
    if(e.spawnT>0){
      e.spawnT-=dt;
      const k=1-e.spawnT/.45;
      e.mesh.scale.setScalar((e.elite?1.22:1)*Math.max(.01,k));
      continue;
    }
    // 薛定谔的拍立得：PHOTO_STATE——时间强制冻结（不移动/不攻击/不转向/无动画/无接触伤害）
    if(e.photoT>0){
      e.photoT-=dt;
      G.photo.tickEntity(e,dt);
      if(e.photoT<=0) G.photo.beginResolve(e);
      continue;
    }
    // 冲洗期：保持定格，红色墨水渗出，结束后一次性结算 DamageBuffer ×2
    if(e.photoPhase==='resolve'){
      e._resolveT-=dt;
      G.photo.tickResolve(e,dt);
      if(e._resolveT<=0) G.photo.applyResolve(e);
      continue;
    }
    // 减速状态（冰霜弹）：速度实时换算，所有 AI 自动生效
    if(e.slowT>0){ e.slowT-=dt; e.spd=e.baseSpd*.45; }
    else e.spd=e.baseSpd;

    e.t+=dt;
    const dToP = p? G.dist(e.x,e.z,p.x,p.z) : 99;
    const angToP = p? G.angTo(e.x,e.z,p.x,p.z) : 0;

    // 位置合法性自愈：敌人所在 tile 必须是可站立地面（floor 或开启的门）。
    // 若持续处于墙内等非法位置（出生错位/击退入墙/召唤落点异常），0.8 秒后自动消灭，
    // 彻底杜绝"看不见的敌人导致房间永不清剿"的软锁。
    {
      const tile=G.tileAt(e.x,e.z);
      const legal = tile && (tile.t==='floor' || (tile.t==='door' && tile.door.open));
      if(!legal){
        e._badPosT=(e._badPosT||0)+dt;
        if(e._badPosT>.8){
          G.fx.poof(e.x,.8,e.z,0x807868);
          G.fx.burst(e.x,.6,e.z,6,{color:0x9a8a70,spd:2,life:.5,s0:.2,kind:'m'});
          G.audio.sfx('die',{v:.35});
          e.dead=true; // 直接标记死亡，跳过掉落（非法位置掉落物同样不可达）
          if(e.laser){ G.scene.remove(e.laser); e.laser=null; }
          G.scene.remove(e.mesh);
          if(e.room && e.room.locked) G.ui.toast('一只敌人坠入深渊……');
          this.list.splice(i,1);
          continue;
        }
      } else e._badPosT=0;
    }
    // 房间归属实时纠正：敌人物理上在哪个房间就算哪个房间的（清剿判定永远与实际位置一致）
    {
      const r=G.roomAt(e.x,e.z);
      if(r) e.room=r;
    }

    // 击退衰减
    if(Math.abs(e.vx)>.01||Math.abs(e.vz)>.01){
      G.moveEntity(e, e.vx*dt, e.vz*dt);
      e.vx*=Math.pow(.0001,dt); e.vz*=Math.pow(.0001,dt);
    }
    // 掩体卡模排除：与实体道具重叠的敌人被径向推出（避免其被柱子完全遮挡而无法击杀，导致房间清剿软锁）
    for(const pr of G.props){
      if(pr.dead||!pr.blocksMove) continue;
      const rr=pr.r+e.r;
      const dx=e.x-pr.x, dz=e.z-pr.z;
      const d2=dx*dx+dz*dz;
      if(d2>1e-6 && d2<rr*rr){
        const d=Math.sqrt(d2);
        e.x=pr.x+dx/d*rr; e.z=pr.z+dz/d*rr;
      } else if(d2<=1e-6){
        e.x=pr.x+rr; e.z=pr.z;
      }
    }
    // 受击闪白
    if(e.flashT>0){
      e.flashT-=dt;
      if(!e._flashOn){ E.setFlashHelper(e,true); e._flashOn=true; }
    } else if(e._flashOn){ E.setFlashHelper(e,false); e._flashOn=false; }

    // 接触伤害
    e.contactCd-=dt;
    if(p && !p.dead && dToP < e.r+.42 && e.contactCd<=0 && p.rollT<=0 && !p.invulnT && !p.ghostT){
      p.hurt(1, angToP);
      e.contactCd=.8;
      e.vx-=Math.cos(angToP)*2; e.vz-=Math.sin(angToP)*2;
      if(p.st.thorns){ this.hurt(e, p.st.thorns, angToP+Math.PI, 0); }
    }

    // AI
    const ai = AI[e.type]; if(ai) ai(e, dt, dToP, angToP, p);

    // 动画通用
    const spd = Math.hypot(e.vx,e.vz);
    if(spd>.3 || e.moving){ e.walkT+=dt*(e.state==='charge'?18:9); }
    this.animate(e, dt, dToP);
  }
};

E.setFlashHelper = function(e,on){
  e.mesh.traverse(o=>{ if(o.isMesh){ if(on){ o.userData._om=o.material; o.material=G.flashMat; } else if(o.userData._om){ o.material=o.userData._om; } } });
};

E.animate = function(e, dt, dToP){
  const r=e.refs, m=e.mesh;
  m.position.set(e.x,0,e.z);
  if(e.type!=='shroom' && e.type!=='sniper' && e.type!=='hexer'){
    // 盾卫转身极慢（2.6/s）：绕背走位可行；其他敌人正常转向
    const tr = e.type==='shield'? 2.6 : 5;
    e.face = G.angLerp(e.face, e.targetFace!=null?e.targetFace:dToP, Math.min(1,tr*dt));
  }
  else e.face = G.angLerp(e.face, dToP, Math.min(1,10*dt));
  m.rotation.y = -e.face;
  const bob = Math.sin(e.walkT*2)*.04;
  switch(e.type){
    case 'gunner':
      if(r.legL){ r.legL.rotation.x=Math.sin(e.walkT)* .7; r.legR.rotation.x=-Math.sin(e.walkT)*.7; }
      r.body.position.y=bob*.5;
      r.gun.position.y=.5+Math.sin(e.t*2)*.01;
      r.gun.rotation.x = e.state==='aim' ? -.15 : 0;
      break;
    case 'charger':
      r.legL.rotation.x=Math.sin(e.walkT)*.8; r.legR.rotation.x=-Math.sin(e.walkT)*.8;
      r.legL2.rotation.x=-Math.sin(e.walkT)*.8; r.legR2.rotation.x=Math.sin(e.walkT)*.8;
      r.body.rotation.z = e.state==='windup'? Math.sin(e.t*40)*.06 : 0;
      r.body.position.x = e.state==='charge'? .1:0;
      break;
    case 'shroom': {
      const inf = e.state==='windup'? 1+Math.sin(e.stateT*20)*.08 : 1;
      r.cap.scale.set(inf, .75*(2-inf), inf);
      break; }
    case 'slime': {
      const hop = Math.max(0, Math.sin(e.hopT*Math.PI));
      r.body.position.y = .28 + hop*.5;
      const sq = 1 - hop*.25 + (e.hopT<.1?.15:0);
      r.body.scale.set(2-sq, sq*.9, 2-sq).multiplyScalar(.55);
      break; }
    case 'shotgunner':
      r.legL.rotation.x=Math.sin(e.walkT)*.6; r.legR.rotation.x=-Math.sin(e.walkT)*.6;
      r.gun.rotation.x = e.state==='windup'? -0.3 : 0;
      break;
    case 'sniper':
      r.body.position.y=.95+Math.sin(e.t*3)*.08;
      r.body.rotation.x = .25;
      r.iris.scale.setScalar(e.state==='aim'?1.5:1);
      break;
    case 'hexer':
      r.body.position.y=.55+Math.sin(e.t*2.5)*.07;
      r.body.rotation.y=Math.sin(e.t*1.7)*.15;
      break;
    case 'beetle': {
      r.belly.scale.setScalar(e.fuse>=0? 1+Math.sin(e.t*30)*.3 : 1);
      for(let i=0;i<r.legs.length;i++) r.legs[i].rotation.x=Math.sin(e.walkT*2+i)*.5;
      break; }
    case 'shield':
      r.legL.rotation.x=Math.sin(e.walkT)*.5; r.legR.rotation.x=-Math.sin(e.walkT)*.5;
      if(e.state==='guardbreak'){
        // 破防踉跄：盾牌垂下并颤动，直观暴露弱点窗口
        r.shield.rotation.x=.95;
        r.shield.position.y=.45+Math.sin(e.t*22)*.04;
        m.rotation.z=Math.sin(e.t*18)*.06;
      } else {
        r.shield.rotation.x = e.state==='swing'? -1.2*Math.min(1,e.stateT/.25) : 0;
        r.shield.position.y=.55;
        m.rotation.z=0;
      }
      break;
    case 'wisp': {
      // 浮游起伏 + 内核脉动，接近自爆时全身涨红
      const near = dToP<2.5;
      r.body.position.y = .85 + Math.sin(e.t*4)*.15;
      r.body.rotation.z = Math.sin(e.t*3)*.1;
      if(r.core) r.core.scale.setScalar(1+Math.sin(e.t*10)*.2+(near?.3:0));
      if(r.aura){
        const s=1.1+Math.sin(e.t*8)*.15+(near?.3:0);
        r.aura.scale.set(s,s,1);
        r.aura.material = G.pmat(near?0xff4030:0xb090e8);
      }
      break; }
    case 'totem': {
      // 待机时宝石缓慢脉动；激活时随激光闪烁
      const active = e.state==='active';
      if(r.gem){
        r.gem.scale.setScalar(active? 1.15+Math.sin(e.t*20)*.2 : 1+Math.sin(e.t*3)*.08);
        r.gem.material = G.bmat(active?0xff8040:0xff6040);
      }
      if(r.arms && r.arms.visible){
        r.arms.children.forEach(c=>{ c.material.opacity=.55+Math.sin(e.t*24)*.25; });
      }
      break; }
    case 'bomber':
      r.legL.rotation.x=Math.sin(e.walkT)*.55; r.legR.rotation.x=-Math.sin(e.walkT)*.55;
      r.head.rotation.x = e.state==='throw'? -.3 : 0;
      r.bomb.rotation.y += dt*3;
      break;
  }
};

/* 就近寻找合法落点（floor 或开门 tile），找不到返回 null —— 供召唤/分裂使用，杜绝落点入墙 */
E.nearbyLegalPos = function(x,z){
  for(let rad=0; rad<=2.2; rad+=.55){
    for(let k=0; k<8; k++){
      const a=k/8*G.TAU + rad*2;
      const tx=x+Math.cos(a)*rad, tz=z+Math.sin(a)*rad;
      const t=G.tileAt(tx,tz);
      if(t && (t.t==='floor' || (t.t==='door'&&t.door.open))){
        // 避开实体掩体
        const blocked=G.props.some(pr=>!pr.dead && pr.blocksMove && G.dist2(tx,tz,pr.x,pr.z)<(pr.r+.35)*(pr.r+.35));
        if(!blocked) return {x:tx,z:tz};
      }
    }
  }
  return null;
};

/* 追击加速：距玩家远（大房间）时提速逼近，近距恢复正常——收敛走位，大房间不再追不上 */
E.chaseSpd = function(e, d){
  return e.spd * (d>6? 1.6 : (d>4? 1.25 : 1));
};

/* ---------- 各类型 AI ---------- */
const AI = {
  gunner(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      e.strafeT-=dt; if(e.strafeT<=0){ e.strafe*=-1; e.strafeT=.8+Math.random()*1.2; }
      let mx=0,mz=0;
      if(d>6.5){ mx=Math.cos(a); mz=Math.sin(a); }
      else if(d<4){ mx=-Math.cos(a); mz=-Math.sin(a); }
      mx += -Math.sin(a)*e.strafe*.7; mz += Math.cos(a)*e.strafe*.7;
      const l=Math.hypot(mx,mz)||1;
      G.moveEntity(e, mx/l*E.chaseSpd(e,d)*dt, mz/l*E.chaseSpd(e,d)*dt);
      e.moving=true;
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<9){ e.state='aim'; e.stateT=.4; e.aimAng=a; }
    } else if(e.state==='aim'){
      e.stateT-=dt; e.aimAng=G.angLerp(e.aimAng,a,.1);
      e.targetFace=e.aimAng;
      if(e.stateT<=0){
        const shots = e.elite?3:2;
        for(let i=0;i<shots;i++) eshoot(e, e.aimAng+(Math.random()-.5)*.08, {spd:5.5});
        G.audio.sfx('pistol',{v:.5});
        G.fx.sparks(e.x+Math.cos(e.aimAng)*.5,.55,e.z+Math.sin(e.aimAng)*.5,0xffc060);
        e.state='idle'; e.atkCd=(e.elite?1.0:1.5)+Math.random()*.5;
      }
    }
  },
  charger(e,dt,d,a){
    if(e.state==='idle'){
      if(d>1 && d<99){ G.moveEntity(e, Math.cos(a)*E.chaseSpd(e,d)*dt*.8, Math.sin(a)*E.chaseSpd(e,d)*dt*.8); e.moving=true; }
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<7){ e.state='windup'; e.stateT=.5; e.chargeAng=a; G.audio.sfx('charge',{v:.35}); }
    } else if(e.state==='windup'){
      e.stateT-=dt; e.chargeAng=G.angLerp(e.chargeAng,a,.08); e.targetFace=e.chargeAng;
      if(e.stateT<=0){ e.state='charge'; e.stateT=1.3; G.audio.sfx('roll'); }
    } else if(e.state==='charge'){
      e.stateT-=dt;
      const ox=e.x, oz=e.z;
      G.moveEntity(e, Math.cos(e.chargeAng)*8.5*dt, Math.sin(e.chargeAng)*8.5*dt);
      e.moving=true; e.targetFace=e.chargeAng;
      const moved=G.dist(ox,oz,e.x,e.z);
      if(moved < 8.5*dt*.4){ // 撞墙
        e.state='stun'; e.stateT=1.1; G.fx.shake(.25); G.audio.sfx('doorSlam',{v:.4});
        G.fx.burst(e.x,.4,e.z,6,{color:0xc8b090,spd:2,life:.4,s0:.15});
      } else if(e.stateT<=0){ e.state='idle'; e.atkCd=1.6+Math.random(); }
      if(d<e.r+.5){ e.state='idle'; e.atkCd=1.8; }
    } else if(e.state==='stun'){
      e.stateT-=dt; if(e.stateT<=0){ e.state='idle'; e.atkCd=1.2; }
    }
  },
  shroom(e,dt,d){
    e.atkCd-=dt;
    if(e.state==='idle'){
      // 静态炮台缓慢漂移索敌（速度极低，保持"扎根"观感），索敌半径覆盖几乎整个房间
      const a=G.angTo(e.x,e.z,G.player.x,G.player.z);
      G.moveEntity(e, Math.cos(a)*.4*dt, Math.sin(a)*.4*dt);
      if(e.atkCd<=0 && d<14){ e.state='windup'; e.stateT=.5; }
    } else if(e.state==='windup'){
      e.stateT-=dt;
      if(e.stateT<=0){
        if(e.alt){ const a=G.angTo(e.x,e.z,G.player.x,G.player.z); for(let i=-1;i<=1;i++) eshoot(e,a+i*.16,{spd:6}); }
        else for(let i=0;i<8;i++) eshoot(e, i/8*G.TAU+e.t, {spd:3.8});
        e.alt=!e.alt;
        G.audio.sfx('plasma',{v:.4});
        e.state='idle'; e.atkCd=2.3+Math.random()*.6;
      }
    }
  },
  slime(e,dt,d,a){
    e.hopT+=dt/(e.hopDur||.8);
    if(e.hopT>=1){
      e.hopT=0; e.hopDur=.5+Math.random()*.4;
      e.hopAng=a+(Math.random()-.5)*.6;
    }
    if(e.hopT<.45){ G.moveEntity(e, Math.cos(e.hopAng)*E.chaseSpd(e,d)*dt, Math.sin(e.hopAng)*E.chaseSpd(e,d)*dt); e.moving=true; }
  },
  shotgunner(e,dt,d,a){
    if(e.state==='idle'){
      if(d>4.5){ G.moveEntity(e, Math.cos(a)*E.chaseSpd(e,d)*dt, Math.sin(a)*E.chaseSpd(e,d)*dt); e.moving=true; }
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<7){ e.state='windup'; e.stateT=.55; e.aimAng=a; }
    } else if(e.state==='windup'){
      e.stateT-=dt; e.aimAng=G.angLerp(e.aimAng,a,.06); e.targetFace=e.aimAng;
      if(e.stateT<=0){
        for(let i=0;i<6;i++) eshoot(e, e.aimAng+(i/5-.5)*.55, {spd:5+Math.random(), color:0xff8030});
        G.audio.sfx('shotgun',{v:.6});
        G.fx.sparks(e.x+Math.cos(e.aimAng)*.7,.55,e.z+Math.sin(e.aimAng)*.7,0xffa060);
        e.vx-=Math.cos(e.aimAng)*2; e.vz-=Math.sin(e.aimAng)*2;
        e.state='idle'; e.atkCd=2.0+Math.random()*.6;
      }
    }
  },
  sniper(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      // 保持远距 + 慢速绕行
      if(d<7){ G.moveEntity(e,-Math.cos(a)*E.chaseSpd(e,d)*dt,-Math.sin(a)*E.chaseSpd(e,d)*dt); e.moving=true; }
      else { G.moveEntity(e, -Math.sin(a)*e.spd*.5*dt, Math.cos(a)*e.spd*.5*dt); e.moving=true; }
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<11){ e.state='aim'; e.stateT=.95; e.lockAng=a; }
    } else if(e.state==='aim'){
      e.stateT-=dt;
      if(e.stateT>.35) e.lockAng=G.angLerp(e.lockAng,a,.09);
      if(!e.laser){
        const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
        e.laser=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xff3030,transparent:true,opacity:.5}));
        G.scene.add(e.laser);
      }
      const lx=e.x+Math.cos(e.lockAng), lz=e.z+Math.sin(e.lockAng);
      const pos=e.laser.geometry.attributes.position;
      pos.setXYZ(0,e.x+.3,1.0,e.z); pos.setXYZ(1,lx,.6,lz); pos.needsUpdate=true;
      e.laser.material.opacity = e.stateT<.35? .95 : .45;
      if(e.stateT<=0){
        G.scene.remove(e.laser); e.laser=null;
        eshoot(e,e.lockAng,{spd:11,size:.2,color:0xff6050,pierce:99});
        G.audio.sfx('rifle',{v:.7});
        e.state='idle'; e.atkCd=2.6+Math.random()*.8;
      }
    }
  },
  hexer(e,dt,d,a){
    e.moving=false;
    e.atkCd-=dt;
    if(e.state==='idle' && e.atkCd<=0){
      // 传送
      G.fx.poof(e.x,.6,e.z,0xc060ff);
      G.audio.sfx('tele',{v:.4});
      const room=G.roomAt(e.x,e.z);
      if(room){ const st=G.roomSpawnPos(room,e); e.x=st.x; e.z=st.z; }
      G.fx.poof(e.x,.6,e.z,0xc060ff);
      // 攻击选择
      const alive=G.enemies.list.length;
      if(alive<5 && G.rng.chance(.35)){
        // 召唤的小史莱姆继承房间归属，计入该房清剿判定（防止门提前开启或永不清剿）
        for(let i=0;i<2;i++){
          const pos=G.enemies.nearbyLegalPos(e.x+(Math.random()-.5)*2, e.z+(Math.random()-.5)*2);
          if(pos){ const s=G.enemies.spawn('slime', pos.x, pos.z); if(s) s.room=e.room; }
        }
        G.audio.sfx('spawn');
      } else {
        e.state='spiral'; e.stateT=1.1; e.spiralBase=Math.random()*G.TAU;
      }
      e.atkCd=3.4+Math.random();
    } else if(e.state==='spiral'){
      e.stateT-=dt;
      e.spiralT=(e.spiralT||0)+dt;
      if(e.spiralT>.09){
        e.spiralT=0;
        const a1=e.spiralBase+(1.1-e.stateT)*4;
        eshoot(e,a1,{spd:4,color:0xc060ff});
        eshoot(e,a1+Math.PI,{spd:4,color:0xc060ff});
      }
      if(e.stateT<=0) e.state='idle';
    }
  },
  beetle(e,dt,d,a){
    e.moving=true;
    if(e.fuse<0){
      G.moveEntity(e, Math.cos(a)*E.chaseSpd(e,d)*dt, Math.sin(a)*E.chaseSpd(e,d)*dt);
      if(d<2.4 || e.hp<=5){ e.fuse=.75; G.audio.sfx('alarm',{v:.5}); }
    } else {
      e.fuse-=dt;
      if(e.fuse<=0){ G.hurtEnemy(e,9999,0,0); }
    }
  },
  shield(e,dt,d,a){
    if(e.state==='guardbreak'){
      // 破防踉跄：不移动/不攻击/不转身（targetFace 冻结），玩家可绕背或正面强攻
      e.stateT-=dt;
      if(e.stateT<=0){ e.state='idle'; e.atkCd=Math.max(e.atkCd,.3); }
      return;
    }
    e.targetFace=a;
    if(e.state==='idle'){
      e.strafeT-=dt; if(e.strafeT<=0){ e.strafe*=-1; e.strafeT=1+Math.random(); }
      let mx=Math.cos(a),mz=Math.sin(a);
      mx+=-Math.sin(a)*e.strafe*.5; mz+=Math.cos(a)*e.strafe*.5;
      const l=Math.hypot(mx,mz)||1;
      G.moveEntity(e,mx/l*E.chaseSpd(e,d)*dt,mz/l*E.chaseSpd(e,d)*dt); e.moving=true;
      if(d<e.r+.9){ e.state='swing'; e.stateT=.4; G.audio.sfx('charge',{v:.3}); }
    } else if(e.state==='swing'){
      e.stateT-=dt;
      if(e.stateT<=0){
        const p=G.player;
        if(p && G.dist(e.x,e.z,p.x,p.z)<e.r+1.3 && p.rollT<=0 && !p.invulnT) p.hurt(1,a);
        G.fx.ring(e.x+Math.cos(a)*.8,e.z+Math.cos(a)*.8,1.2,0xd0d8e0,.25);
        G.audio.sfx('flip');
        e.state='idle';
      }
    }
  },
  /* 怨灵：蛇形逼近，近身自爆 */
  wisp(e,dt,d,a){
    e.moving=true;
    // 主方向朝玩家 + 垂直正弦横移（蛇形走位难以瞄准）
    const sway=Math.sin(e.t*6)*2.0;
    let mx=Math.cos(a)-Math.sin(a)*sway*.5, mz=Math.sin(a)+Math.cos(a)*sway*.5;
    const l=Math.hypot(mx,mz)||1;
    G.moveEntity(e, mx/l*E.chaseSpd(e,d)*dt, mz/l*E.chaseSpd(e,d)*dt);
    // 拖尾幽光
    if(Math.random()<.4) G.fx.particle(e.x,.7,e.z,{vx:0,vy:.3,vz:0,life:.3,color:0xb090e8,s0:.2,kind:'a'});
    // 近身自爆
    if(d<1.15){
      G.weapons.explode(e.x,e.z,1.7,2,'e');
      G.fx.burst(e.x,.8,e.z,10,{color:0xb090e8,spd:3,life:.5,s0:.2});
      G.enemies.kill(e);
    }
  },
  /* 激光图腾：蓄力→双臂激光旋转扫射→冷却 */
  totem(e,dt,d,a,p){
    e.atkCd-=dt;
    if(e.state==='idle'){
      if(e.atkCd<=0 && d<11){ e.state='windup'; e.stateT=.8; G.audio.sfx('charge',{v:.4}); }
    } else if(e.state==='windup'){
      e.stateT-=dt;
      if(e.refs.gem) e.refs.gem.scale.setScalar(1+Math.sin(e.t*25)*.25);
      if(e.stateT<=0){
        e.state='active'; e.stateT=3.2;
        e.spin=Math.random()*G.TAU;
        if(e.refs.arms) e.refs.arms.visible=true;
        G.audio.sfx('phase',{v:.5});
      }
    } else if(e.state==='active'){
      e.stateT-=dt;
      e.spin=(e.spin||0)+dt*.85; // 缓慢旋转扫射
      if(e.refs.arms) e.refs.arms.rotation.y=-e.spin;
      // 双臂激光判定：点到线段距离
      if(p && !p.dead){
        e.laserCd=(e.laserCd||0)-dt;
        if(e.laserCd<=0){
          for(const off of [0,Math.PI]){
            const ang=e.spin+off;
            const dx=p.x-e.x, dz=p.z-e.z;
            const proj=dx*Math.cos(ang)+dz*Math.sin(ang);
            const t=G.clamp(proj,0,5.2);
            const cx=e.x+Math.cos(ang)*t, cz=e.z+Math.sin(ang)*t;
            if(G.dist(p.x,p.z,cx,cz)<.4 && p.rollT<=0 && !p.invulnT){
              p.hurt(1, ang+Math.PI);
              e.laserCd=.4;
              break;
            }
          }
        }
      }
      if(e.stateT<=0){
        e.state='idle'; e.atkCd=2.6+Math.random()*.8;
        if(e.refs.arms) e.refs.arms.visible=false;
        if(e.refs.gem) e.refs.gem.scale.setScalar(1);
      }
    }
  },
  /* 掷弹手：保持中距，抛投炸弹（飞行弹丸，落地爆炸） */
  bomber(e,dt,d,a){
    e.moving=false;
    if(e.state==='idle'){
      e.strafeT-=dt; if(e.strafeT<=0){ e.strafe*=-1; e.strafeT=.9+Math.random(); }
      let mx=0,mz=0;
      if(d>6.5){ mx=Math.cos(a); mz=Math.sin(a); }
      else if(d<4.5){ mx=-Math.cos(a); mz=-Math.sin(a); }
      mx+=-Math.sin(a)*e.strafe*.4; mz+=Math.cos(a)*e.strafe*.4;
      const l=Math.hypot(mx,mz)||1;
      G.moveEntity(e,mx/l*E.chaseSpd(e,d)*dt,mz/l*E.chaseSpd(e,d)*dt); e.moving=true;
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<9.5){
        e.state='throw'; e.stateT=.45; e.aimAng=a;
      }
    } else if(e.state==='throw'){
      e.stateT-=dt; e.targetFace=e.aimAng;
      if(e.refs.bomb) e.refs.bomb.position.y=.62+Math.sin((1-e.stateT/.45)*Math.PI)*.5;
      if(e.stateT<=0){
        if(e.refs.bomb) e.refs.bomb.position.y=.62;
        const p=G.player;
        if(p){
          const dist=G.dist(e.x,e.z,p.x,p.z);
          G.weapons.spawn({
            team:'e', x:e.x+Math.cos(e.aimAng)*.6, z:e.z+Math.sin(e.aimAng)*.6,
            ang:e.aimAng, spd:Math.max(4,dist/.85), dmg:0, size:.22,
            color:0x202020, life:.85, kind:'bomb',
          });
          G.audio.sfx('boomer',{v:.5});
        }
        e.state='idle'; e.atkCd=2.4+Math.random()*.6;
      }
    }
  },
};

G.enemies = E;
G.hurtEnemy = (e,dmg,ang,knock,ignoreBlock)=> E.hurt(e,dmg,ang,knock,ignoreBlock);
})();
