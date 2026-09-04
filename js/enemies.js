/* 弹幕深渊 - 敌人：16种类型 + 精英变体 + AI + 低多边形造型 */
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
    case 'voidstalker': { // 虚空掠影：半透明猎影，闪现至玩家背后突刺（第 3 层专属）
      r.body = new THREE.Group();
      const cloak = new THREE.Mesh(partGeo('vs_cloak', b=>{
        b.cone(0,.5,0,.36,1.0,0x241c34,7);       // 罩袍（底宽顶尖的幽灵剪影）
        b.sph(0,.55,0,.22,0x160f24,6);           // 躯体暗芯
        b.cone(0,1.05,0,.18,.3,0x1a1428,7);      // 兜帽尖
      }), new THREE.MeshLambertMaterial({color:0x241c34, transparent:true, opacity:.4}));
      cloak.castShadow=true;
      r.body.add(cloak); r.bodyMat=cloak.material;  // 每实例独立材质：透明度按状态驱动
      r.eye = new THREE.Mesh(G.boxGeo(.18,.035,.03), G.bmat(0xc9a0ff)); r.eye.position.set(.26,.72,0); r.body.add(r.eye);
      r.shards = new THREE.Group();               // 三片悬浮碎片（绕体旋转）
      for(let i=0;i<3;i++) r.shards.add(M(partGeo('vs_shard', b=>b.cone(0,.07,0,.05,.15,0x6a4a9a,4))));
      r.body.add(r.shards);
      r.body.position.y=.5; g.add(r.body);
      r.aura=new THREE.Sprite(G.pmat(0x8a5ac8)); r.aura.scale.set(1,1,1); r.aura.position.y=.75; g.add(r.aura);
      break; }
    case 'riftwatcher': { // 裂隙注视者：悬浮虚空巨眼 + 环绕碎晶，发射追踪虚空宝珠（第 3 层专属）
      r.body = new THREE.Group();
      r.body.add(M(partGeo('rw_ball', b=>{
        b.sph(0,0,0,.42,0x241c34,7);
        b.cone(.34,0,0,.16,.22,0x160f24,6);      // 眼窝前突
      }),0,0,0));
      r.iris = new THREE.Mesh(G.sphGeo(.15,6), G.bmat(0xd18aff)); r.iris.position.set(.44,.04,0); r.body.add(r.iris);
      r.tent=[];
      for(let i=0;i<4;i++){ const tn=M(partGeo('rw_tent', b=>b.cyl(0,-.2,0,.025,.06,.42,0x1a1428,5)));
        const ta=i/4*G.TAU; tn.position.set(Math.cos(ta)*.24,-.34,Math.sin(ta)*.24); r.tent.push(tn); r.body.add(tn); }
      r.crystals = new THREE.Group();             // 环绕碎晶（蓄力时收拢加速）
      for(let i=0;i<3;i++) r.crystals.add(M(partGeo('rw_cry', b=>{ b.cone(0,.1,0,.05,.18,0x9a6ae0,4); b.cone(0,-.06,0,.05,.14,0x7a4ab8,4); })));
      r.body.add(r.crystals);
      r.body.position.y=1.05; g.add(r.body);
      r.aura=new THREE.Sprite(G.pmat(0x7a4ab8)); r.aura.scale.set(1.25,1.25,1); r.aura.position.y=1.05; g.add(r.aura);
      break; }
    case 'voidacolyte': { // 虚空祭司：罩袍侍祭，为同袍附虚空护壁（第 3 层专属）
      r.body = M(partGeo('va_body', b=>{
        b.cone(0,.5,0,.4,.95,0x3a2a52,7);        // 罩袍
        b.sph(0,1.0,0,.19,0x241c34,6);           // 兜帽
        b.box(.17,.98,0,.13,.035,.02,0x0c0814);  // 无面黑缝（朝 +x 前方）
        b.cyl(.32,.62,.1,.035,.035,.95,0x503a70,5); // 法杖杆
        b.cone(.32,1.14,.1,.07,.13,0x503a70,5);  // 杖头
      }),0,0,0); g.add(r.body);
      r.orb = new THREE.Mesh(G.sphGeo(.11,6), G.bmat(0xb06aff)); r.orb.position.set(.32,1.24,.1); g.add(r.orb);
      r.halo = new THREE.Sprite(G.pmat(0x9a6ae0)); r.halo.scale.set(.85,.85,1); r.halo.position.y=1.45; g.add(r.halo);
      break; }
    case 'orbiter': { // 环形放射者：悬浮奥术核心，蓄力放射 360° 环形弹（第 1 层）
      r.body = new THREE.Group();
      const core=new THREE.Mesh(partGeo('or_core', b=>{
        b.sph(0,0,0,.34,0xc07030,7);
        b.box(0,.34,0,.18,.1,.18,0x2a1808);
        b.sph(0,-.3,0,.2,0x8a5020,6);
      }), new THREE.MeshLambertMaterial({color:0xc07030}));
      core.castShadow=true; r.body.add(core);
      r.ring=new THREE.Mesh(partGeo('or_ring', b=>{ b.cyl(0,0,0,.52,.52,.06,0xffb040,16); }), new THREE.MeshLambertMaterial({color:0xffb040}));
      r.body.add(r.ring);
      r.eye=new THREE.Mesh(G.sphGeo(.07,6), G.bmat(0xffe0a0)); r.eye.position.set(0,.05,.26); r.body.add(r.eye);
      r.body.position.y=1.0; g.add(r.body);
      r.halo=new THREE.Sprite(G.pmat(0xffa040)); r.halo.scale.set(1.1,1.1,1); r.halo.position.y=1.0; g.add(r.halo);
      break; }
    case 'minelayer': { // 地雷工兵：低矮掘地工兵，抛掷滚动地雷封路（第 1 层）
      r.body = new THREE.Group();
      const carapace=new THREE.Mesh(partGeo('ml_body', b=>{
        b.sph(0,0,0,.4,0x4a4638,7);
        b.box(.3,0,.15,.2,.16,.16,0x2c2a20);
      }), new THREE.MeshLambertMaterial({color:0x4a4638}));
      carapace.castShadow=true; r.body.add(carapace);
      r.pack=new THREE.Mesh(partGeo('ml_pack', b=>{
        b.box(0,.18,0,.34,.3,.28,0x3a362a);
        b.sph(0,.42,0,.12,0x8a5a30,6);
      }), new THREE.MeshLambertMaterial({color:0x3a362a}));
      r.pack.position.set(0,0,-.18); r.body.add(r.pack);
      r.eye=new THREE.Mesh(G.sphGeo(.06,6), G.bmat(0xffd060)); r.eye.position.set(.22,.02,.28); r.body.add(r.eye);
      r.body.position.y=.55; g.add(r.body);
      break; }
    case 'gravitator': { // 引力眼球：悬浮巨瞳，持续将玩家吸向自己（第 2 层）
      r.body = new THREE.Group();
      const orb=new THREE.Mesh(partGeo('gr_orb', b=>{
        b.sph(0,0,0,.42,0x3a4a68,8);
        b.sph(.1,.06,0,.2,0x2a3854,7);
      }), new THREE.MeshLambertMaterial({color:0x3a4a68}));
      orb.castShadow=true; r.body.add(orb);
      r.pupil=new THREE.Mesh(G.sphGeo(.1,6), G.bmat(0x70c8ff)); r.pupil.position.set(.13,.06,0); r.body.add(r.pupil);
      r.halo=new THREE.Sprite(G.pmat(0x70c8ff)); r.halo.scale.set(1.3,1.3,1); r.halo.position.y=.2; g.add(r.halo);
      r.body.position.y=1.05; g.add(r.body);
      break; }
    case 'commander': { // 战场指挥官：持旗军官，光环加速同袍攻速（第 2 层）
      r.body = M(partGeo('cm_body', b=>{
        b.box(0,.45,0,.5,.7,.34,0x4a3a2a);        // 躯干（旧军大衣）
        b.sph(0,1.0,0,.24,0x3a2c1e,6);            // 头
        b.box(0,1.14,0,.44,.1,.32,0x2c2012);      // 帽
        b.box(.34,.5,0,.16,.5,.16,0x5a4a32);      // 持杖臂
        b.cyl(.42,.95,0,.035,.035,.95,0x8a6a3a,5);// 指挥杖
        b.cone(.42,1.32,0,.09,.16,0xd8a040,5);    // 杖头
      }),0,0,0); g.add(r.body);
      r.flag=new THREE.Sprite(G.pmat(0xffd24a)); r.flag.scale.set(.7,.7,1); r.flag.position.set(.42,1.2,.06); g.add(r.flag);
      break; }
    case 'mirror': { // 镜面反射者：持镜盾人形，正面格挡并折射反击弹（第 2 层）
      r.body = M(partGeo('mi_body', b=>{
        b.box(0,.45,0,.46,.7,.32,0x3a3a44);       // 躯干（暗甲）
        b.sph(0,1.0,0,.22,0x2c2c36,6);            // 头
        b.box(.3,.5,0,.15,.5,.15,0x4a4a56);       // 持盾臂
      }),0,0,0); g.add(r.body);
      r.shield=new THREE.Mesh(partGeo('mi_shield', b=>{
        b.box(.62,.62,0,.16,.85,.85,0x8a5aff);    // 镜面盾（紫镜）
        b.box(.62,.62,.42,.04,.85,.85,0x4a3a66);  // 背面
      }), new THREE.MeshLambertMaterial({color:0x8a5aff}));
      r.shield.position.set(.62,.62,0); g.add(r.shield);
      r.gem=new THREE.Mesh(G.sphGeo(.07,6), G.bmat(0xc8a0ff)); r.gem.position.set(.62,.62,.46); g.add(r.gem);
      break; }
    case 'phaseprowler': { // 相位潜行者：半透明虚空猎影，隐形逼近后显形三连斩（第 3 层）
      r.body = new THREE.Group();
      const cloak = new THREE.Mesh(partGeo('pp_cloak', b=>{
        b.cone(0,.5,0,.36,.95,0x241c34,7);
        b.sph(0,.55,0,.2,0x160f24,6);
        b.cone(0,1.0,0,.16,.3,0x1a1428,7);
      }), new THREE.MeshLambertMaterial({color:0x241c34, transparent:true, opacity:.3}));
      cloak.castShadow=true; r.body.add(cloak); r.bodyMat=cloak.material;   // 透明度按状态驱动
      r.eye = new THREE.Mesh(G.boxGeo(.16,.03,.02), G.bmat(0xc9a0ff)); r.eye.position.set(.24,.72,0); r.body.add(r.eye);
      r.blades=new THREE.Group(); r.blades.visible=false;   // 双刃：显形时亮起
      for(const s of [-1,1]){
        const bd=new THREE.Mesh(G.boxGeo(.5,.05,.06), G.bmat(0x9a6aff));
        bd.position.set(.3,s*.22,.1); r.blades.add(bd);
      }
      r.body.add(r.blades);
      r.body.position.y=.9; g.add(r.body);
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
  voidstalker:{ hp:24, spd:2.9, r:.34, cost:2, floors:[3],   money:[2,5] },
  riftwatcher:{ hp:20, spd:1.35,r:.36, cost:2, floors:[3],   money:[2,5] },
  voidacolyte:{ hp:28, spd:1.5, r:.36, cost:2, floors:[3],   money:[3,6] },
  /* 2026-09-04 敌人批次：环形放射者/地雷工兵/引力眼球/指挥官/镜面反射者/相位潜行者 */
  orbiter:     { hp:20, spd:.9,  r:.36, cost:2, floors:[1,2], money:[2,4] },
  minelayer:   { hp:30, spd:1.8, r:.4,  cost:1, floors:[1,2], money:[2,4] },
  gravitator:  { hp:36, spd:1.2, r:.42, cost:2, floors:[2],   money:[3,6] },
  commander:   { hp:44, spd:1.3, r:.44, cost:2, floors:[2,3], money:[3,7] },
  mirror:      { hp:38, spd:1.6, r:.4,  cost:2, floors:[2],   money:[3,6] },
  phaseprowler:{ hp:26, spd:2.4, r:.36, cost:2, floors:[3],   money:[2,5] },
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
  if(elite){ group.scale.setScalar(1.22); this.assignAffix(e); }   // 精英词缀（随机一种）
  group.position.set(x,0,z);
  group.scale.multiplyScalar(.01);
  G.scene.add(group);
  G.fx.poof(x,.3,z,0x8a8070);
  G.audio.sfx('spawn',{v:.5});
  this.list.push(e);
  return e;
};

  /* ---------- 精英词缀：爆裂/再生/召唤/护盾（行为 tick 在 E.update，吸收在 E.hurt） ---------- */
E.AFFIXES=[
  {id:'volatile', name:'爆裂', color:0xff5030},   // 死亡自爆
  {id:'regen',    name:'再生', color:0x50c878},   // 每 3 秒回 2 血
  {id:'summon',   name:'召唤', color:0xb06aff},   // 每 6 秒召唤怨灵（上限 2）
  {id:'shield',   name:'护盾', color:0x7fd0e8},   // 周期护盾抵挡一次伤害
];
E.assignAffix = function(e, id){
  const a = (id && this.AFFIXES.find(x=>x.id===id)) || this.AFFIXES[Math.floor(Math.random()*this.AFFIXES.length)];
  e.affix=a.id; e.affixName=a.name; e.affixColor=a.color;
  if(a.id==='regen') e.regenT=3;
  if(a.id==='summon'){ e.sumT=4; e.sumCount=0; }
  if(a.id==='shield'){ e.shieldUp=true; e.shieldT=8; }
  if(e.refs && e.refs.aura) e.refs.aura.material=G.pmat(a.color);   // 光环按词缀变色
  return e.affix;
};

E.clear = function(){
  G.photo.reset(); // 照片状态/缓冲/相框/碎片全部复位（材质换装还原）
  for(const e of this.list){ G.scene.remove(e.mesh); if(e.laser){ G.scene.remove(e.laser); } if(e._iceMesh){ G.scene.remove(e._iceMesh); e._iceMesh=null; } }
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
  // 精英词缀「护盾」：抵挡一次伤害（ignoreBlock 可穿透；抵挡后进入 8 秒充能）
  if(e.affix==='shield' && e.shieldUp && !ignoreBlock){
    e.shieldUp=false; e.shieldT=8;
    G.fx.ring(e.x,.8,e.z,0x7fd0e8,.35);
    G.fx.dmgNum(e.x,1.1,e.z,'护盾',false);
    G.audio.sfx('clank',{v:.5});
    return;
  }
  // 虚空护壁（第 3 层虚空祭司施加）：抵挡下一次任意类型伤害后破碎。
  // 刻意放在格挡/词缀盾之前且不看 ignoreBlock——护壁是「一次性全挡」，连爆炸与拍立得 ×2 结算也整挡一次
  if(e.voidWard>0){
    e.voidWard=0;
    G.fx.ring(e.x,.8,e.z,0xb06aff,.4);
    G.fx.dmgNum(e.x,1.15,e.z,'虚空护壁',false);
    G.audio.sfx('shield',{v:.5});
    return;
  }
  // 镜面反射者正面格挡：格挡同时朝玩家折射一颗高速反击弹（普通武器输出窗口=破防）
  if(e.type==='mirror' && !ignoreBlock && e.state!=='stun' && e.state!=='guardbreak'){
    let dM = Math.atan2(Math.sin(e.face-ang-Math.PI), Math.cos(e.face-ang-Math.PI));
    if(Math.abs(dM) < 0.6){
      e.guardHits=(e.guardHits||0)+1;
      G.audio.sfx('clank');
      G.fx.sparks(e.x+Math.cos(e.face)*.5,.6,e.z+Math.sin(e.face)*.5,0x80e0ff);
      const pp=G.player;
      if(pp && !pp.dead){ eshoot(e, G.angTo(e.x,e.z,pp.x,pp.z), {spd:6.5, color:0x80e0ff, size:.19}); }
      if(e.guardHits>=5){
        e.guardHits=0;
        e.state='guardbreak'; e.stateT=2.5;
        G.audio.sfx('doorSlam',{v:.7});
        G.fx.shake(.2);
      }
      return;
    }
  }
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
  if(e._iceMesh){ G.scene.remove(e._iceMesh); e._iceMesh=null; }   // 冻结冰晶随死亡移除
  if(e.photoDeath){ // 照片碎裂死亡：不用普通死亡烟雾，撕成相纸碎片
    G.photo.shatter(e);
    G.audio.sfx('die',{v:.4});
  } else {
    G.fx.poof(e.x,.5,e.z,0xc8c0b0);
    G.fx.blood(e.x,.5,e.z, e.type==='slime'?0x50b860:0xa02820);
    G.audio.sfx('die',{v:.6});
  }
  if(e.affix==='volatile'){ G.weapons.explode(e.x,e.z,1.8,12,'e'); G.audio.sfx('explosion',{v:.6}); }   // 精英词缀「爆裂」：死亡自爆
  G.game.run.kills++;
  if(G.gambler) G.gambler.onKill();   // 赌徒的灾难：击杀触发赌场重新洗牌
  if(G.meta) G.meta.onKill(e.type);   // 局外里程碑：百人斩计数 + 敌人图鉴分类计数
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
    // 悖论骰子 4 面：现实冻结（停止行动/不转向/无动画；冰晶 mesh 钉身，解冻移除）
    if(e.pinT>0){
      e.pinT-=dt;
      if(e.pinT<=0 && e._iceMesh){ G.scene.remove(e._iceMesh); e._iceMesh=null; }
      continue;
    }
    // 精英词级行为 tick（爆裂在死亡时结算、护盾吸收在 E.hurt）
    if(e.elite && e.affix){
      if(e.affix==='regen'){
        e.regenT-=dt;
        if(e.regenT<=0){ e.regenT=3; if(e.hp<e.maxhp){ e.hp=Math.min(e.maxhp,e.hp+2); G.fx.sparks(e.x,.8,e.z,0x50c878); } }
      } else if(e.affix==='summon'){
        e.sumT-=dt;
        if(e.sumT<=0 && (e.sumCount||0)<2 && G.enemies.list.filter(x=>!x.dead).length<10){
          e.sumT=6; e.sumCount++;
          const c=G.enemies.spawn('wisp', e.x+(Math.random()-.5)*1.6, e.z+(Math.random()-.5)*1.6, false);
          if(c){ c.spawnT=.3; c.room=e.room; G.fx.burst(c.x,.7,c.z,6,{color:0xb06aff,spd:2,life:.4,s0:.15}); G.audio.sfx('tele',{v:.35}); }
        }
      } else if(e.affix==='shield' && !e.shieldUp){
        e.shieldT-=dt;
        if(e.shieldT<=0){ e.shieldUp=true; e.shieldT=8; G.fx.sparks(e.x,.8,e.z,0x7fd0e8); }
      }
    }
    // 减速状态（冰霜弹）：速度实时换算，所有 AI 自动生效
    if(e.slowT>0){ e.slowT-=dt; e.spd=e.baseSpd*.45; }
    else e.spd=e.baseSpd;
    // 吹风机状态衰减：风压/过热缓释（停止吹风后自然回落）
    if(e._blowT>0) e._blowT=Math.max(0,e._blowT-dt*.8);
    if(e._pressT>0) e._pressT=Math.max(0,e._pressT-dt*.5);
    if(e._colCd>0) e._colCd-=dt;

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

    // 牌桌大乱（CHAOS）：每帧随机扰动，与击退强摩擦平衡成持续的醉步漂移
    // （一次性速度注入会在 ~0.15s 内被 pow(.0001,dt) 摩擦吞掉，体感为零，故必须逐帧施加）
    if(e.chaosT>0){
      e.chaosT-=dt;
      e.vx+=(Math.random()-.5)*.7; e.vz+=(Math.random()-.5)*.7;
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

    // 虚空护壁存在期间：头顶漂浮紫色微粒（通用视觉提示，任何被附护壁的敌人类型都可见）
    if(e.voidWard>0 && Math.random()<.12)
      G.fx.particle(e.x+(Math.random()-.5)*.5, 1.1+Math.random()*.3, e.z+(Math.random()-.5)*.5,
        {vx:0,vy:.6,vz:0,life:.5,color:0xb06aff,s0:.07,kind:'a'});
    // 接触伤害
    e.contactCd-=dt;
    if(p && !p.dead && dToP < e.r+.42 && e.contactCd<=0 && p.rollT<=0 && !p.invulnT && !p.ghostT){
      p.hurt(1, angToP);
      e.contactCd=.8;
      e.vx-=Math.cos(angToP)*2; e.vz-=Math.sin(angToP)*2;
      if(p.st.thorns){ this.hurt(e, p.st.thorns, angToP+Math.PI, 0); }
    }

    // 指挥官攻速光环：被光环覆盖的敌人额外推进攻击冷却（通用段统一处理）
    if(e._hasteT>0){ e._hasteT-=dt; e.atkCd-=dt*.5; }
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
    case 'voidstalker': {
      // 透明度按状态渐变：潜行 0.38 → 显形/突刺 0.9 → 硬直 1（全显形=可反击信号）
      const tA = e.state==='stalk'? .38 : (e.state==='recover'? 1 : .9);
      e._alpha=(e._alpha==null? .38 : e._alpha)+(tA-e._alpha)*Math.min(1,10*dt);
      if(r.bodyMat) r.bodyMat.opacity=e._alpha;
      r.body.position.y=.5+Math.sin(e.t*3.2)*.12;
      r.shards.children.forEach((c,i)=>{
        const ca=i/3*G.TAU + e.t*2.4;
        c.position.set(Math.cos(ca)*.42, Math.sin(e.t*3+i)*.1, Math.sin(ca)*.42);
        c.rotation.y=ca;
      });
      const hot = e.state==='materialize'||e.state==='strike';
      r.eye.material = G.bmat(hot? 0xff8cff : 0xc9a0ff);
      r.eye.scale.setScalar(hot? 1.5 : 1);
      if(r.aura){ r.aura.material=G.pmat(hot?0xc06aff:0x8a5ac8); const s=(hot?1.4:1)+Math.sin(e.t*6)*.08; r.aura.scale.set(s,s,1); }
      break; }
    case 'riftwatcher': {
      r.body.position.y=1.05+Math.sin(e.t*2.2)*.1;
      const ch=e.state==='charge';
      r.iris.scale.setScalar(ch? 1.6+Math.sin(e.t*26)*.25 : 1);
      r.iris.material = G.bmat(ch? 0xff9aff : 0xd18aff);
      const wantR=ch? .24 : .55;                 // 蓄力时碎晶收拢
      e._cR=(e._cR==null? .55 : e._cR)+(wantR-e._cR)*Math.min(1,8*dt);
      r.crystals.children.forEach((c,i)=>{
        const ca=i/3*G.TAU + e.t*(ch?9:2.2);
        c.position.set(Math.cos(ca)*e._cR, Math.sin(e.t*3+i)*.1, Math.sin(ca)*e._cR);
        c.rotation.y=ca;
      });
      r.tent.forEach((tn,i)=>{ tn.rotation.x=Math.sin(e.t*2.5+i*1.4)*.28; });
      break; }
    case 'voidacolyte': {
      r.body.position.y=Math.sin(e.t*2)*.05;
      const ch=e.state==='chant';
      r.orb.scale.setScalar(ch? 1.5+Math.sin(e.t*18)*.2 : 1);
      r.orb.material = G.bmat(ch? 0xe8b0ff : 0xb06aff);
      if(ch && Math.random()<.5)
        G.fx.particle(e.x+(Math.random()-.5)*.5, .3+Math.random()*.4, e.z+(Math.random()-.5)*.5,
          {vx:0,vy:1.1,vz:0,life:.5,color:0xb06aff,s0:.09,kind:'a'});
      break; }
    case 'orbiter': { r.ring.rotation.z+=dt*6; r.body.rotation.y+=dt*1.2; r.body.position.y=1+Math.sin(e.t*2)*.06; break; }
    case 'minelayer': { r.body.rotation.x=Math.sin(e.walkT*2)*.2; r.body.position.y=.55+Math.abs(Math.sin(e.walkT*3))*.06; break; }
    case 'gravitator': { r.body.position.y=1.05+Math.sin(e.t*2)*.08; r.halo.scale.setScalar(1.3+Math.sin(e.t*3)*.12); break; }
    case 'commander': { r.body.rotation.y=Math.sin(e.t*1.5)*.12; if(r.flag) r.flag.material.rotation+=dt*2; break; }
    case 'mirror': { r.shield.position.y=.62+Math.sin(e.t*2)*.03; break; }
    case 'phaseprowler': { r.body.position.y=.9+Math.sin(e.t*2.5)*.1; if(r.blades&&r.blades.visible) r.blades.rotation.z+=dt*8; break; }
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
  /* 虚空掠影：半透明潜行逼近 → 闪现玩家背后 → 显形预警 → 突刺 → 收尾硬直（输出窗口） */
  voidstalker(e,dt,d,a,p){
    e.moving=false;
    if(e.state!=='materialize' && e.state!=='strike' && e.state!=='recover') e.state='stalk';
    if(e.state==='stalk'){
      // 蛇形逼近（同怨灵的横移但更慢更飘），半透明难以瞄准
      const sway=Math.sin(e.t*4.2)*1.4;
      let mx=Math.cos(a)-Math.sin(a)*sway*.5, mz=Math.sin(a)+Math.cos(a)*sway*.5;
      const l=Math.hypot(mx,mz)||1;
      G.moveEntity(e, mx/l*E.chaseSpd(e,d)*dt*.85, mz/l*E.chaseSpd(e,d)*dt*.85);
      e.moving=true;
      e.blinkCd=(e.blinkCd==null? 2.2+Math.random()*1.6 : e.blinkCd)-dt;
      if(e.blinkCd<=0 && d>2 && p){
        // 闪现：首选落点=玩家背后（朝向反方向）1.7 格；非法则试斜后两侧，全部非法则稍后再试
        const pFace=(p.face!=null)? p.face : a;
        const cands=[pFace+Math.PI, pFace+Math.PI*.6, pFace+Math.PI*1.4, a+Math.PI];
        for(const ca of cands){
          const pos=E.nearbyLegalPos(p.x+Math.cos(ca)*1.7, p.z+Math.sin(ca)*1.7);
          if(pos){
            G.fx.poof(e.x,.6,e.z,0x8a5ac8);
            e.x=pos.x; e.z=pos.z; e.vx=e.vz=0;
            G.fx.burst(e.x,.7,e.z,8,{color:0x9a6ae0,spd:2.2,life:.4,s0:.16});
            G.audio.sfx('voidblink',{v:.5});
            e.state='materialize'; e.stateT=e.elite? .35:.5; e.strikeDone=false;
            break;
          }
        }
        if(e.state!=='materialize') e.blinkCd=1.2;
      }
    } else if(e.state==='materialize'){
      // 显形预警：原地不动、眼缝亮起——玩家的走位/翻滚窗口
      e.stateT-=dt;
      if(e.stateT<=0){ e.state='strike'; e.stateT=.24; e.strikeAng=a; G.audio.sfx('voidslash',{v:.55}); }
    } else if(e.state==='strike'){
      e.stateT-=dt;
      G.moveEntity(e, Math.cos(e.strikeAng)*9.5*dt, Math.sin(e.strikeAng)*9.5*dt);
      e.moving=true;
      const pp=G.player;
      if(!e.strikeDone && pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<e.r+.55){
        e.strikeDone=true;
        e.contactCd=.8;                          // 抑制紧随其后的通用接触伤害（突刺只结算一次）
        if(pp.rollT<=0 && !pp.invulnT) pp.hurt(1, e.strikeAng);
      }
      if(e.stateT<=0 || e.strikeDone){ e.state='recover'; e.stateT=.7; }
    } else if(e.state==='recover'){
      // 突刺后硬直：完全显形喘息——玩家的反击窗口
      e.stateT-=dt;
      if(e.stateT<=0){ e.state='stalk'; e.blinkCd=2.8+Math.random()*1.6; }
    }
  },
  /* 裂隙注视者：悬浮巨眼保持中距 → 收拢碎晶蓄力 → 三枚缓慢追踪的虚空宝珠 */
  riftwatcher(e,dt,d,a){
    e.moving=false;
    if(e.state==='idle'){
      e.strafeT-=dt; if(e.strafeT<=0){ e.strafe*=-1; e.strafeT=1+Math.random(); }
      let mx=0,mz=0;
      if(d>8){ mx=Math.cos(a); mz=Math.sin(a); }
      else if(d<4.5){ mx=-Math.cos(a); mz=-Math.sin(a); }
      mx+=-Math.sin(a)*e.strafe*.45; mz+=Math.cos(a)*e.strafe*.45;
      const l=Math.hypot(mx,mz)||1;
      G.moveEntity(e, mx/l*E.chaseSpd(e,d)*dt, mz/l*E.chaseSpd(e,d)*dt); e.moving=true;
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<10){ e.state='charge'; e.stateT=.9; G.audio.sfx('voidcharge',{v:.5}); }
    } else if(e.state==='charge'){
      e.stateT-=dt;
      if(e.stateT<=0){
        // 虚空宝珠：转向率刻意压低（2.2 rad/s），垂直走位/翻滚可甩开，掩体可挡
        for(let i=0;i<3;i++){
          G.weapons.spawn({ team:'e', x:e.x+Math.cos(a)*(e.r+.2), z:e.z+Math.sin(a)*(e.r+.2),
            ang:a+(i-1)*.14, spd:3.4, dmg:1, size:.21, color:0xb06aff, life:3.2, kind:'voidorb' });
        }
        G.audio.sfx('voidorb',{v:.5});
        e.state='idle'; e.atkCd=3.2+Math.random()*.8;
      }
    }
  },
  /* 虚空祭司：吟唱为 4.2 格内同袍（含自己）附虚空护壁；孤身时改为直射 */
  voidacolyte(e,dt,d,a){
    e.moving=false;
    if(e.state==='idle'){
      e.strafeT-=dt; if(e.strafeT<=0){ e.strafe*=-1; e.strafeT=1.1+Math.random(); }
      let mx=0,mz=0;
      if(d<4){ mx=-Math.cos(a); mz=-Math.sin(a); }
      mx+=-Math.sin(a)*e.strafe*.5; mz+=Math.cos(a)*e.strafe*.5;
      const l=Math.hypot(mx,mz)||1;
      G.moveEntity(e, mx/l*E.chaseSpd(e,d)*dt, mz/l*E.chaseSpd(e,d)*dt); e.moving=true;
      e.atkCd-=dt;
      if(e.atkCd<=0){
        const ally=G.enemies.list.some(x=>x!==e && !x.dead && x.spawnT<=0 && !x.voidWard && G.dist(e.x,e.z,x.x,x.z)<4.2);
        if(ally){ e.state='chant'; e.stateT=1.1; G.audio.sfx('voidchant',{v:.5}); }
        else { eshoot(e, a, {spd:5.5, color:0xb06aff}); G.audio.sfx('voidorb',{v:.35}); e.atkCd=2.2+Math.random()*.5; }
      }
    } else if(e.state==='chant'){
      e.stateT-=dt;
      if(e.stateT<=0){
        let n=0;
        for(const x of G.enemies.list){
          if(x.dead || G.dist(e.x,e.z,x.x,x.z)>4.2 || x.voidWard) continue;
          x.voidWard=1; n++;
          G.fx.ring(x.x,.7,x.z,0xb06aff,.45);
        }
        if(n>0) G.audio.sfx('shield',{v:.6});
        e.state='idle'; e.atkCd=5.5+Math.random()*1.5;
      }
    }
  },
  /* 环形放射者：悬浮核心蓄力 → 连续 8 波 360° 环形弹（交替相位留可穿缝隙） */
  orbiter(e,dt,d,a){
    e.moving=false;
    if(e.state==='idle'){
      let mx=0,mz=0;
      if(d>7){ mx=Math.cos(a); mz=Math.sin(a); }
      else if(d<4.5){ mx=-Math.cos(a); mz=-Math.sin(a); }
      const l=Math.hypot(mx,mz)||1;
      G.moveEntity(e,mx/l*E.chaseSpd(e,d)*dt*.6,mz/l*E.chaseSpd(e,d)*dt*.6); e.moving=true;
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<12){ e.state='ring'; e.stateT=1.15; e.ringBase=Math.random()*G.TAU; e.ringN=0; e.ringT=0; G.audio.sfx('charge',{v:.4}); }
    } else if(e.state==='ring'){
      e.stateT-=dt; e.ringT-=dt;
      if(e.ringT<=0){
        e.ringT=.115; e.ringN++;
        const n=10+(e.ringN%3===0?2:0);
        const off=e.ringBase+(e.ringN%2)*Math.PI/n;   // 奇偶环错位，留可穿缝隙
        for(let k=0;k<n;k++) eshoot(e, off+k*G.TAU/n, {spd:4.1, color:0xffb040, size:.16});
        G.audio.sfx('laser',{v:.3});
      }
      if(e.stateT<=0){ e.state='idle'; e.atkCd=2.6+Math.random()*1.2; }
    }
  },
  /* 地雷工兵：巡逻布设「滚动地雷」——慢速炸弹+红圈预警，碰触引爆 */
  minelayer(e,dt,d,a){
    e.moving=false;
    if(e.state==='idle'){
      e.strafeT-=dt; if(e.strafeT<=0){ e.strafe*=-1; e.strafeT=.9+Math.random(); }
      let mx=0,mz=0;
      if(d>6){ mx=Math.cos(a); mz=Math.sin(a); }
      else if(d<3.5){ mx=-Math.cos(a); mz=-Math.sin(a); }
      mx+=-Math.sin(a)*e.strafe*.35; mz+=Math.cos(a)*e.strafe*.35;
      const l=Math.hypot(mx,mz)||1;
      G.moveEntity(e,mx/l*E.chaseSpd(e,d)*dt,mz/l*E.chaseSpd(e,d)*dt); e.moving=true;
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<10){ e.state='lay'; e.stateT=.4; e.layAng=a; e.targetFace=a; }
    } else if(e.state==='lay'){
      e.stateT-=dt; e.targetFace=e.layAng;
      if(e.stateT<=0){
        const p=G.player;
        if(p){
          G.weapons.spawn({team:'e', x:e.x+Math.cos(e.layAng)*.5, z:e.z+Math.sin(e.layAng)*.5,
            ang:e.layAng, spd:3.1, dmg:0, size:.24, color:0x606050, life:3.6, kind:'bomb'});
          G.audio.sfx('boomer',{v:.4});
        }
        e.state='idle'; e.atkCd=2.2+Math.random()*1.2;
      }
    }
  },
  /* 引力眼球：远距漂浮，周期持续将玩家吸向自己（引力波，玩家可对抗） */
  gravitator(e,dt,d,a){
    e.moving=false;
    if(e.state==='idle'){
      if(d>8){ G.moveEntity(e,Math.cos(a)*E.chaseSpd(e,d)*dt*.5,Math.sin(a)*E.chaseSpd(e,d)*dt*.5); e.moving=true; }
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<13){ e.state='pull'; e.stateT=1.6; e.pullT=0; G.audio.sfx('charge',{v:.4}); }
    } else if(e.state==='pull'){
      e.stateT-=dt; e.pullT+=dt;
      if(e.pullT>.12){
        e.pullT=0;
        const pp=G.player;
        if(pp && !pp.dead){
          const dx=e.x-pp.x, dz=e.z-pp.z, dd=Math.hypot(dx,dz)||1;
          G.moveEntity(pp, dx/dd*.16, dz/dd*.16);
          G.fx.particle(pp.x,.4,pp.z,{vx:0,vy:.3,vz:0,life:.35,color:0x70c8ff,s0:.1,kind:'a'});
        }
      }
      if(e.stateT<=0){ e.state='idle'; e.atkCd=3.2+Math.random(); }
    }
  },
  /* 战场指挥官：指挥光环加速同袍攻速 + 自身扇形齐射 */
  commander(e,dt,d,a){
    e.moving=false;
    for(const o of G.enemies.list){
      if(o===e||o.dead||o.spawnT>0) continue;
      if(G.dist(e.x,e.z,o.x,o.z)<6) o._hasteT=Math.max(o._hasteT||0,.55);
    }
    let mx=0,mz=0;
    if(d>8){ mx=Math.cos(a); mz=Math.sin(a); }
    else if(d<4){ mx=-Math.cos(a); mz=-Math.sin(a); }
    const l=Math.hypot(mx,mz)||1;
    G.moveEntity(e,mx/l*E.chaseSpd(e,d)*dt*.55,mz/l*E.chaseSpd(e,d)*dt*.55); e.moving=true;
    e.atkCd-=dt;
    if(e.state==='idle' && e.atkCd<=0 && d<12){
      e.state='burst'; e.stateT=.6; e.lockAng=a; e.burstT=0; e.burstN=0;
    } else if(e.state==='burst'){
      e.stateT-=dt; e.targetFace=a;
      e.burstT=(e.burstT||0)-dt;
      if(e.burstT<=0){ e.burstT=.16; e.burstN++;
        for(let k=-2;k<=2;k++) eshoot(e, e.lockAng+k*.16, {spd:4.4, color:0xffd24a, size:.15});
        G.audio.sfx('laser',{v:.32});
      }
      if(e.burstN>=3){ e.state='idle'; e.atkCd=2.8+Math.random(); }
    }
  },
  /* 镜面反射者：持镜盾缓慢逼近，正面格挡（E.hurt 判定）并折射反击弹 */
  mirror(e,dt,d,a){
    e.moving=false;
    if(e.state==='guardbreak'){   // 破防踉跄：不攻击不格挡
      e.stateT-=dt; if(e.stateT<=0) e.state='idle';
      return;
    }
    if(e.state==='idle' || e.state==='recover'){
      if(e.state==='recover'){ e.stateT-=dt; if(e.stateT<=0) e.state='idle'; }
      else {
        e.targetFace=a;
        if(d>5.5){ G.moveEntity(e,Math.cos(a)*E.chaseSpd(e,d)*dt*.7,Math.sin(a)*E.chaseSpd(e,d)*dt*.7); e.moving=true; }
        else if(d<3){ G.moveEntity(e,-Math.cos(a)*E.chaseSpd(e,d)*dt*.7,-Math.sin(a)*E.chaseSpd(e,d)*dt*.7); e.moving=true; }
        e.atkCd-=dt;
        if(e.atkCd<=0 && d<10){ e.state='gaze'; e.stateT=.8; e.lockAng=a; }
      }
    } else if(e.state==='gaze'){
      e.stateT-=dt; e.targetFace=a;
      if(e.stateT>.2) e.lockAng=G.angLerp(e.lockAng,a,.09);
      if(e.refs.shield) e.refs.shield.rotation.x=Math.sin(e.t*20)*.12;
      if(e.stateT<=0){
        eshoot(e, e.lockAng, {spd:6.2, color:0x80e0ff, size:.19});
        G.audio.sfx('laser',{v:.35});
        e.state='recover'; e.stateT=1.2; e.atkCd=2.4+Math.random()*.8;
      }
    }
  },
  /* 相位潜行者：隐形蛇形逼近 → 显形三连斩 → 隐身撤退（第 3 层） */
  phaseprowler(e,dt,d,a){
    e.moving=false;
    if(e.refs.bodyMat){
      const op = e.state==='strike'? .95 : (e.state==='windup'? .8 : .28);
      e.refs.bodyMat.opacity += (op - e.refs.bodyMat.opacity)*Math.min(1,dt*8);
    }
    if(e.state==='idle' || e.state==='recover'){
      if(e.state==='recover'){ e.stateT-=dt; if(e.stateT<=0){ e.state='idle'; e.strikeN=0; e.atkCd=1.4+Math.random(); } }
      else {
        const sway=Math.sin(e.t*4)*1.3;
        let mx=Math.cos(a)-Math.sin(a)*sway*.5, mz=Math.sin(a)+Math.cos(a)*sway*.5;
        const l=Math.hypot(mx,mz)||1;
        G.moveEntity(e, mx/l*E.chaseSpd(e,d)*dt*.9, mz/l*E.chaseSpd(e,d)*dt*.9); e.moving=true;
        e.atkCd-=dt;
        if(e.atkCd<=0 && d<3.4){ e.state='windup'; e.stateT=.5; e.targetFace=a; G.audio.sfx('charge',{v:.4}); }
      }
    } else if(e.state==='windup'){
      e.stateT-=dt; e.targetFace=a;
      if(e.refs.blades) e.refs.blades.visible=true;
      if(e.stateT<=0){ e.state='strike'; e.stateT=.32; e.strikeAng=a; }
    } else if(e.state==='strike'){
      e.stateT-=dt; e.targetFace=e.strikeAng;
      G.moveEntity(e, Math.cos(e.strikeAng)*8*dt, Math.sin(e.strikeAng)*8*dt);
      const pp=G.player;
      if(pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<1.1){ pp.hurt(1, e.strikeAng+Math.PI); }
      G.fx.particle(e.x,.6,e.z,{vx:0,vy:.2,vz:0,life:.18,color:0x9a6aff,s0:.2,kind:'a'});
      if(e.stateT<=0){
        e.strikeN=(e.strikeN||0)+1;
        if(e.strikeN<3){ e.state='windup'; e.stateT=.34; G.audio.sfx('swing',{v:.4}); }
        else { e.state='recover'; e.stateT=1.4; if(e.refs.blades) e.refs.blades.visible=false; }
      }
    }
  },
};

G.enemies = E;
G.hurtEnemy = (e,dmg,ang,knock,ignoreBlock)=> E.hurt(e,dmg,ang,knock,ignoreBlock);
})();
