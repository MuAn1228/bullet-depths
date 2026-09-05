/* 第九层事故 - 敌人：16种类型 + 精英变体 + AI + 低多边形造型 */
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
/* ---- PVZ 原版贴图工具（用户硬性要求：必须原版植物大战僵尸形象） ----
   assets/sprites/pvz/*.png 为原版渲染帧（由原版动画 GIF 正常帧转出）（jiangnangame/New-Plants-vs-Zombies-JavaScript 提取）。
   file:// 下 THREE.TextureLoader 不可用，用 new Image()+new THREE.Texture()（A+B 试点已验证的管线）；
   静态 PNG 在 file:// 下直接 Texture(img) 上传（动画 GIF 的 texImage2D 只取首帧白色淡入帧，故预转为 PNG）。 */
const _pvzTexCache={};
function pvzTex(name){
  let t=_pvzTexCache[name];
  if(t) return t;
  const img=new Image();
  const tex=new THREE.Texture(img);
  tex.minFilter=THREE.LinearFilter; tex.magFilter=THREE.LinearFilter;
  tex.generateMipmaps=false;   // GIF 为非二次幂尺寸（NPOT），老版 three 默认 mipmap 在 WebGL 下采样碎裂
  tex.wrapS=THREE.ClampToEdgeWrapping; tex.wrapT=THREE.ClampToEdgeWrapping;
  img.onload=()=>{ tex.needsUpdate=true; };
  img.src='assets/sprites/pvz/'+name+'.png';
  tex._img=img;
  _pvzTexCache[name]=tex;
  return tex;
}
/* 原版纸片人：walk 图常驻；opt.atk 特殊状态图；opt.noArmor 破甲后替换图（原版行为：
   锥/桶/气球碎→普通僵尸）；opt.fly 悬空单位（阴影留在地面）。 */
function pvzCard(r, g, name, h, opt){
  opt=opt||{};
  const mk=n=>new THREE.MeshBasicMaterial({map:pvzTex(n), transparent:true, alphaTest:.01, side:THREE.DoubleSide});  // Basic：完全不受第四层暗光照，原版色彩 100% 保真
  r.cardMats={walk:mk(name)};
  if(opt.atk) r.cardMats.atk=mk(opt.atk);
  if(opt.noArmor) r.cardMats.noArmor=mk(opt.noArmor);
  const card=new THREE.Mesh(E._pvzPlane||(E._pvzPlane=new THREE.PlaneGeometry(1,1)), r.cardMats.walk);
  card.visible=false; card.position.y=h*.42; card.scale.set(h*.8,h,1); r._cardY=h*.42;  // 基础高度（animate 不得覆盖丢失）
  // 后仰正对俯视镜头（第四层相机俯角 ~65°，竖立平面会被压成横条——实测教训）
  card.rotation.order='YXZ'; card.rotation.x=-0.79;  // 后仰 45°：投影高度 ~94% 且保持站立感（全后仰=平躺观感，竖立被俯角压扁）
  g.add(card); r.card=card;
  const img=pvzTex(name)._img;
  const ready=()=>{ card.visible=true; card.scale.set(h*img.width/img.height, h, 1); };
  if(img.complete&&img.width) ready(); else img.addEventListener('load', ready, {once:true});
  const sh=new THREE.Mesh(E._pvzShGeo||(E._pvzShGeo=new THREE.CircleGeometry(.5,12)),
    E._pvzShMat||(E._pvzShMat=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.3,depthWrite:false})));
  sh.rotation.x=-Math.PI/2; sh.position.y=.02; sh.scale.set(h*.42,h*.2,1);
  g.add(sh);
}
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
        r.body = M(partGeo('ch_body', b=>{
          b.box(0,.4,0,.56,.4,.6,0x9a4030);              // 躯干
          b.box(.3,.44,0,.3,.28,.34,0x7a3020);           // 前胸（头基）
          b.box(-.35,.5,0,.2,.12,.3,0x5a2818);           // 后臀
          b.cone(.06,.66,0,.09,.3,0x7a2020);             // 背部棘刺1
          b.cone(-.14,.62,0,.08,.26,0x7a2020);           // 背部棘刺2
          b.cone(-.3,.58,0,.07,.22,0x7a2020);            // 背部棘刺3
          b.box(.1,.52,.15,.14,.1,.1,0x7a2020);          // 颈鬃毛
          b.box(.1,.52,-.15,.14,.1,.1,0x7a2020);
          b.box(-.15,.28,.3,.16,.16,.2,0x6a2a18);        // 后腿护甲
          b.box(-.15,.28,-.3,.16,.16,.2,0x6a2a18);
        }),0,0,0); g.add(r.body);
        r.head = new THREE.Group();
        r.head.add(M(partGeo('ch_head', b=>{
          b.box(0,0,0,.3,.26,.28,0x9a4030);              // 头
          // 前弯大角（三段台阶模拟弯曲，朝前上）
          b.box(-.1,.2,.16,.05,.1,.05,0xe8d8b0);         // 角根
          b.box(-.05,.28,.16,.05,.08,.05,0xd8c8a8);      // 角中
          b.box(0,.36,.16,.04,.06,.04,0xc8b898);         // 角尖
          b.box(-.1,.2,-.16,.05,.1,.05,0xe8d8b0);
          b.box(-.05,.28,-.16,.05,.08,.05,0xd8c8a8);
          b.box(0,.36,-.16,.04,.06,.04,0xc8b898);
          b.box(0,.02,.16,.1,.06,.04,0xffe050);          // 眼
          b.box(0,.02,-.16,.1,.06,.04,0xffe050);
          b.box(0,-.08,.16,.14,.07,.1,0x8a3828);         // 鼻吻
          b.cone(-.06,-.1,.13,.03,.13,0xe8d8b0);         // 獠牙
          b.cone(.02,-.1,.19,.03,.13,0xe8d8b0);
        }),0,0,0));
        r.head.position.set(.48,.5,0); g.add(r.head);
        r.legL=M(partGeo('ch_leg',b=>b.box(0,-.1,0,.12,.22,.12,0x6a2818)),.2,.24,.24);
        r.legR=M(partGeo('ch_leg'),-.2,.24,-.24); r.legL2=M(partGeo('ch_leg'),.2,.24,-.24); r.legR2=M(partGeo('ch_leg'),-.2,.24,.24);
        const chHoof=partGeo('ch_hoof',b=>b.box(0,-.22,0,.15,.05,.18,0x3a1810));
        r.legL.add(new THREE.Mesh(chHoof,G.vcolMat)); r.legR.add(new THREE.Mesh(chHoof,G.vcolMat));
        r.legL2.add(new THREE.Mesh(chHoof,G.vcolMat)); r.legR2.add(new THREE.Mesh(chHoof,G.vcolMat));
        g.add(r.legL,r.legR,r.legL2,r.legR2);
        break; }
          case 'shroom': {
        r.body = M(partGeo('sh_body', b=>{
          b.cyl(0,.25,0,.2,.3,.5,0xd8cbb0);              // 柄（下粗上细）
          b.box(0,.05,0,.34,.1,.34,0x8a6a4a);            // 菌环
          b.cyl(0,.0,0,.26,.3,.07,0x6a5a3a);             // 根部盘
          b.sph(-.18,.06,0,.06,0x3a7a3a,5);              // 柄侧苔藓
          b.sph(.15,.12,.05,.05,0x3a7a3a,5);
          b.box(-.08,.3,.14,.05,.06,.03,0x201810);       // 眼
          b.box(.08,.3,.14,.05,.06,.03,0x201810);
          b.box(0,.22,.15,.14,.04,.03,0x603020);         // 嘴
        }),0,0,0); g.add(r.body);
        r.cap = M(partGeo('sh_cap', b=>{
          b.sph(0,0,0,.48,0xc03830,7);                   // 伞帽
          b.sph(-.2,.14,.18,.1,0xf0e8d8,5);              // 白斑1
          b.sph(.22,.1,-.14,.09,0xf0e8d8,5);             // 白斑2
          b.sph(.05,.2,.2,.08,0xf0e8d8,5);               // 白斑3
          b.sph(-.06,.32,.1,.1,0xe05040,6);              // 伞顶高光
          // 伞沿菌褶：环列 6 片小条
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2;
            b.box(Math.cos(a)*.4,-.3,Math.sin(a)*.4,.05,.16,.1,0xa03028);
          }
        }),0,.62,0); g.add(r.cap);
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
        r.body = M(partGeo('bt_body', b=>{
          b.sph(0,0,0,.34,0x2a2a30,7);                   // 身体
          b.sph(-.16,0,0,.25,0x202028,7);                // 后腹（略小，拉长身形）
          b.box(.28,.02,0,.2,.16,.24,0x3a3a44);          // 头（朝 +x）
          b.box(0,.18,0,.02,.1,.5,0x181820);             // 背中鞘翅缝
          b.box(-.13,.16,.18,.1,.05,.08,0x3a3a44);       // 左鞘翅斑点
          b.box(-.13,.16,-.18,.1,.05,.08,0x3a3a44);      // 右鞘翅斑点
          b.box(.46,.12,.12,.16,.02,.02,0x1a1a20);       // 左触角
          b.box(.46,.12,-.12,.16,.02,.02,0x1a1a20);      // 右触角
          b.sph(.56,.1,.12,.03,0x1a1a20,4);              // 触角端
          b.sph(.56,.1,-.12,.03,0x1a1a20,4);
          b.box(.4,.04,.07,.07,.04,.04,0x2c2c34);        // 左钳颚
          b.box(.4,.04,-.07,.07,.04,.04,0x2c2c34);       // 右钳颚
        }),0,.22,0); g.add(r.body);
        r.belly = new THREE.Mesh(G.sphGeo(.2,6), G.bmat(0xff3020)); r.belly.position.set(-.05,.16,0); g.add(r.belly);
        r.legs=[];
        for(let i=0;i<3;i++) for(const s of [-1,1]){
          const l=M(partGeo('bt_leg',b=>b.box(0,0,0,.05,.06,.16,0x1a1a20)));
          l.position.set(-.1+i*.14,.12,s*.28); r.legs.push(l); g.add(l);
        }
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
    case 'mimic': { // 拟态怪：伪装成宝箱（第 2~3 层）；伪装静止，靠近/互动/受击解除伪装后扑击+扇形弹
      // ① 伪装宝箱壳（对玩家可见，造型接近普通棕色宝箱）
      r.box = new THREE.Mesh(partGeo('mm_box', b=>{
        b.box(0,.3,0,.9,.6,.6,0x7a5230);            // 箱体
        b.box(0,.06,0,1.0,.12,.7,0x4a3826);         // 底框
        b.box(0,.3,.31,.2,.5,.05,0xd8a830);         // 前锁扣
      }), G.vcolMat); r.box.castShadow=true; g.add(r.box);
      r.lid = new THREE.Mesh(partGeo('mm_lid', b=>{
        b.box(0,.08,0,.94,.16,.64,0x7a5230);        // 盖面
        b.box(0,.2,0,.94,.12,.64,0x4a3826);         // 盖沿
        b.box(0,.1,.33,.2,.2,.05,0xd8a830);         // 盖锁扣
      }), G.vcolMat); r.lid.castShadow=true; r.lid.position.set(0,.56,-.28); g.add(r.lid);
      // ② 拟态本体（伪装时隐藏，reveal 显示）：圆胖暗紫躯干 + 大嘴 + 尖牙
      r.maw = new THREE.Group();
      const body=new THREE.Mesh(partGeo('mm_body', b=>{
        b.sph(0,0,0,.34,0x5a3a58,10);
        b.sph(0,-.18,0,.22,0x3a2438,8);
      }), G.vcolMat); body.castShadow=true; r.maw.add(body);
      const jaw=new THREE.Mesh(partGeo('mm_jaw', b=>{ b.sph(0,0,0,.24,0x7a5068,8); }), G.vcolMat);
      jaw.position.set(.34,0,0); r.maw.add(jaw); r.jaw=jaw;
      r.teeth=new THREE.Group();
      for(let i=-2;i<=2;i++){ const t=new THREE.Mesh(G.boxGeo(.05,.05,.03), G.bmat(0xe8e0d0)); t.position.set(.3,i*.09,-.05); r.teeth.add(t); }
      r.maw.add(r.teeth);
      r.maw.visible=false; r.maw.position.y=.45; g.add(r.maw);
      break; }
    case 'miner': { // 挖掘者：矮壮掘地工，矿工帽头灯+镐（第 2~3 层，钻地绕后突袭）
      r.body = M(partGeo('mn_body', b=>{
        b.box(0,.4,0,.5,.5,.42,0x6a5a42);         // 矮壮躯干（皮衣）
        b.box(0,.2,0,.54,.12,.46,0x4a3a2a);       // 腰带
        b.sph(0,.78,0,.22,0x8a7a62,6);            // 头
        b.box(0,.95,0,.3,.14,.3,0x3a5a8a);        // 矿工帽（蓝盔）
        b.box(0,.84,.28,.07,.06,.05,0xffe060);    // 头灯（朝前）
      }),0,0,0); g.add(r.body);
      r.pick = M(partGeo('mn_pick', b=>{
        b.cyl(.36,.38,.2,.025,.025,.34,0x6a4a2a,5); // 镐柄
        b.box(.36,.56,.2,.26,.05,.05,0x9aa0a8);     // 镐头
      }),0,0,0); g.add(r.pick);
      r.legL=M(partGeo('mn_leg',b=>b.box(0,-.08,0,.14,.22,.14,0x4a3a2a)),-.12,.18,.12);
      r.legR=M(partGeo('mn_leg'),.12,.18,-.12);
      g.add(r.legL,r.legR);
      break; }
    case 'vaultling': { // 跳跃者：圆身+弹簧粗腿的弹跳怪（第 2~3 层，跳过前排）
      r.body = M(partGeo('va2_body', b=>{
        b.sph(0,.3,0,.34,0x3a8a4a,8);            // 圆身体（草绿）
        b.sph(-.12,.42,.24,.1,0xf0f0e0,6);       // 大眼
        b.sph(.12,.42,.24,.1,0xf0f0e0,6);
        b.sph(-.12,.43,.26,.045,0x202020,5);     // 瞳孔
        b.sph(.12,.43,.26,.045,0x202020,5);
      }),0,0,0); g.add(r.body);
      r.legL=M(partGeo('va2_leg',b=>b.box(0,-.14,0,.12,.34,.12,0x2a6a38)),-.14,.14,.18);
      r.legR=M(partGeo('va2_leg'),.14,.14,-.18);
      g.add(r.legL,r.legR);
      break; }
    case 'barrier_brute': { // 路障蛮兵：厚重装甲巨汉，正面独立耐久护甲板（第 2~3 层）
      r.body = M(partGeo('bb_body', b=>{
        b.box(0,.55,0,.62,.62,.5,0x4a4a52);      // 宽壮躯干（暗甲）
        b.sph(0,1.02,0,.24,0x3a3a42,6);          // 头
        b.box(-.1,1.04,.18,.05,.04,.03,0xff5040);// 红眼
        b.box(.1,1.04,.18,.05,.04,.03,0xff5040);
        b.box(0,.28,0,.68,.16,.56,0x3a3a42);     // 裙甲
      }),0,0,0); g.add(r.body);
      r.armor = M(partGeo('bb_armor', b=>{
        b.box(.32,.6,0,.5,.9,.72,0x9aa0a8);      // 正面护甲大板（金属）
        b.box(.3,.15,0,.08,.06,.08,0x6a6a72);    // 铆钉
        b.box(.3,.75,0,.08,.06,.08,0x6a6a72);
        b.box(.3,1.05,0,.08,.06,.08,0x6a6a72);
      }),0,0,0); g.add(r.armor);
      r.club=M(partGeo('bb_club',b=>{ b.cyl(0,0,0,.06,.06,.8,0x584428,5); b.box(0,.5,0,.22,.22,.22,0x8a92a0); }),-.34,.6,.3);
      g.add(r.club);
      r.legL=M(partGeo('bb_leg',b=>b.box(0,-.1,0,.18,.26,.18,0x34343c)),-.17,.24,.18);
      r.legR=M(partGeo('bb_leg'),.17,.24,-.18);
      g.add(r.legL,r.legR);
      break; }
    case 'footballer': { // 橄榄球狂徒：橄榄球盔+护具的重装冲锋手（第 3 层）
      r.body = M(partGeo('fb_body', b=>{
        b.box(0,.5,0,.6,.58,.5,0x8a3028);        // 壮硕躯干（深红）
        b.sph(0,1.0,0,.24,0x2a2a30,6);           // 头
        b.box(0,1.06,0,.36,.2,.3,0x1c1c22);      // 头盔
        b.box(0,1.0,.17,.22,.12,.04,0x8a2020);   // 面罩栅
        b.box(0,.6,.3,.66,.16,.16,0x5a5a64);     // 肩甲
        b.box(0,.3,.26,.52,.2,.2,0x6a4a2a);      // 护腰
      }),0,0,0); g.add(r.body);
      r.legL=M(partGeo('fb_leg',b=>b.box(0,-.1,0,.16,.26,.16,0x5a3028)),-.15,.26,.16);
      r.legR=M(partGeo('fb_leg'),.15,.26,-.16);
      g.add(r.legL,r.legR);
      break; }
    case 'jester': { // 小丑：紫戏服+三尖帽+彩球，弹道干扰者（第 2~3 层）
      r.body = M(partGeo('js_body', b=>{
        b.box(0,.48,0,.4,.62,.34,0x7a3a8a);      // 瘦长戏服（紫）
        b.sph(0,1.0,0,.2,0xe8e0d8,6);            // 白脸
        b.sph(0,.98,.17,.06,0xe04040,5);         // 红鼻子
        b.box(-.07,1.04,.15,.04,.05,.03,0x202020); b.box(.07,1.04,.15,.04,.05,.03,0x202020);
        b.sph(0,.9,0,.14,0xe04040,5);            // 领球
      }),0,0,0); g.add(r.body);
      r.hat = new THREE.Group();
      r.hat.add(M(partGeo('js_hat', b=>{
        b.cone(0,0,0,.16,.4,0x3a8a5a,5);         // 三尖帽（绿）
        b.sph(0,.28,0,.06,0xe0c040,5);           // 帽球
      }),0,0,0));
      r.hat.position.y=1.16; g.add(r.hat);
      r.ball=new THREE.Sprite(G.pmat(0xff8a50)); r.ball.scale.set(.5,.5,1); r.ball.position.set(0,.62,0); g.add(r.ball);
      break; }
    case 'podcaster': { // 阵型指挥者：墨绿军大衣+扩音喇叭的传令官（第 3 层）
      r.body = M(partGeo('pc_body', b=>{
        b.box(0,.5,0,.46,.66,.36,0x3a4a2a);      // 军大衣（墨绿）
        b.sph(0,1.0,0,.21,0x2c3a20,6);           // 头
        b.box(-.17,1.02,.1,.05,.04,.03,0xe0d8c8);// 眼
        b.box(.17,1.02,.1,.05,.04,.03,0xe0d8c8);
        b.box(0,1.1,0,.34,.06,.28,0x22281a);     // 贝雷帽
      }),0,0,0); g.add(r.body);
      r.mic = M(partGeo('pc_mic', b=>{
        b.cyl(.3,.34,.18,.025,.025,.3,0x4a4a52,5); // 手柄
        b.cone(.3,.5,.18,.11,.22,0x6a6a72,5);      // 喇叭口
      }),0,0,0); g.add(r.mic);
      r.legL=M(partGeo('pc_leg',b=>b.box(0,-.09,0,.14,.22,.14,0x2a3820)),-.13,.2,.12);
      r.legR=M(partGeo('pc_leg'),.13,.2,-.12);
      g.add(r.legL,r.legR);
      break; }
    case 'magnetron': { // 磁铁怪：悬浮红蓝马蹄磁铁核心，吸弹储能（第 3 层）
      r.body = new THREE.Group();
      const mag=new THREE.Mesh(partGeo('mg_mag', b=>{
        b.box(0,0,0,.5,.3,.16,0xd03030);         // 红端
        b.box(.62,0,0,.5,.3,.16,0x3060d0);       // 蓝端
        b.box(.31,.28,0,.1,.14,.1,0x606068);     // 中柱
      }), G.vcolMat);
      mag.castShadow=true; r.body.add(mag);
      r.eye=new THREE.Mesh(G.sphGeo(.08,6), G.bmat(0xffe060)); r.eye.position.set(.31,.1,.1); r.body.add(r.eye);
      r.body.position.y=.95; g.add(r.body);
      r.halo=new THREE.Sprite(G.pmat(0x70a0ff)); r.halo.scale.set(1.3,1.3,1); r.halo.position.y=.95; g.add(r.halo);
      r.ring=new THREE.Mesh(partGeo('mg_ring', b=>b.cyl(0,0,0,.9,.9,.05,0x70a0ff,20)), new THREE.MeshLambertMaterial({color:0x70a0ff,transparent:true,opacity:.35}));
      r.ring.visible=false; r.ring.position.y=.95; g.add(r.ring);
      break; }
    case 'balloon_wisp': { // 气球怨灵：半透明大气球+怨灵飘尾（空中单位，第 3 层）
      r.body = new THREE.Group();
      const bl=new THREE.Mesh(partGeo('bw_ball', b=>{
        b.sph(0,0,0,.4,0xa8c8e8,10);
      }), new THREE.MeshLambertMaterial({color:0xa8c8e8, transparent:true, opacity:.7}));
      bl.castShadow=true; r.body.add(bl);
      r.eyeL=new THREE.Mesh(G.sphGeo(.05,5), G.bmat(0x30445c)); r.eyeL.position.set(-.14,.04,.33); r.body.add(r.eyeL);
      r.eyeR=new THREE.Mesh(G.sphGeo(.05,5), G.bmat(0x30445c)); r.eyeR.position.set(.14,.04,.33); r.body.add(r.eyeR);
      r.tail=new THREE.Mesh(partGeo('bw_tail', b=>{ b.cone(0,-.45,0,.3,.5,0x5a7a9a,6); }), new THREE.MeshLambertMaterial({color:0x5a7a9a,transparent:true,opacity:.5}));
      r.body.add(r.tail);
      r.body.position.y=1.35; g.add(r.body);
      r.aura=new THREE.Sprite(G.pmat(0xa8c8e8)); r.aura.scale.set(1.15,1.15,1); r.aura.position.y=1.35; g.add(r.aura);
      break; }
    /* ---- PVZ 乱入僵尸：原版贴图整帧纸片人（形象 100% 来自原版，兼容性让位于原作还原） ---- */
    case 'pvz_basic': pvzCard(r,g,'basic_walk',2.0); break;
    case 'pvz_conehead': pvzCard(r,g,'cone_walk',2.0,{noArmor:'basic_walk'}); break;
    case 'pvz_buckethead': pvzCard(r,g,'bucket_walk',2.05,{noArmor:'basic_walk'}); break;
    case 'pvz_polevaulter': pvzCard(r,g,'pole_walk',1.9,{atk:'pole_atk'}); break;
    case 'pvz_football': pvzCard(r,g,'foot_walk',2.15,{atk:'foot_atk'}); break;
    case 'pvz_newspaper': pvzCard(r,g,'news_walk',1.9,{atk:'news_atk'}); break;
    case 'pvz_disco': pvzCard(r,g,'disco_walk',2.05,{atk:'disco_atk'}); break;
    case 'pvz_balloon': pvzCard(r,g,'balloon_walk',1.9,{noArmor:'basic_walk',fly:true}); break;
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
  /* 2026-09-04 拟态怪 Mimic：伪装成宝箱，靠近 1.2 格/尝试互动/受击 解除伪装 → 扑击+扇形弹 */
  mimic:       { hp:24, spd:2.5, r:.4,  cost:2, floors:[2,3], money:[2,5] },
  /* 2026-09-04 敌人批次2：挖掘者/跳跃者/路障蛮兵/橄榄球狂徒/小丑/阵型指挥者/磁铁怪/气球怨灵 */
  miner:        { hp:24, spd:2.5, r:.3,  cost:2, floors:[2,3], money:[2,4] },
  vaultling:    { hp:21, spd:2.6, r:.3,  cost:2, floors:[2,3], money:[2,4] },
  barrier_brute:{ hp:42, spd:1.75,r:.42, cost:3, floors:[2,3], money:[3,6], armor:22 },   // 正面护甲独立耐久（碎裂→狂暴）
  footballer:   { hp:47, spd:2,   r:.42, cost:3, floors:[3],   money:[3,6] },
  jester:       { hp:23, spd:2.2, r:.32, cost:2, floors:[2,3], money:[2,4] },
  podcaster:    { hp:25, spd:1.6, r:.34, cost:3, floors:[3],   money:[3,5] },
  magnetron:    { hp:30, spd:1.65,r:.36, cost:2, floors:[3],   money:[3,5] },
  balloon_wisp: { hp:16, spd:2.25,r:.3,  cost:2, floors:[3],   money:[2,4] },
  /* 2026-09-05 PVZ 乱入敌人批次：8 种经典植物大战僵尸僵尸（第四层专属乱入池） */
  pvz_basic:     { hp:18, spd:1.3, r:.35, cost:1, floors:[4], money:[1,3] },                    // 普通僵尸：灰绿皮+西装+红领带，缓慢近战
  pvz_conehead:  { hp:18, spd:1.3, r:.35, cost:2, floors:[4], money:[2,4], armor:15 },          // 路障僵尸：橙色交通锥独立耐久→打掉变普通
  pvz_buckethead:{ hp:24, spd:1.1, r:.38, cost:3, floors:[4], money:[3,6], armor:35 },          // 铁桶僵尸：铁桶高耐久→打掉变普通，正面减伤
  pvz_polevaulter:{hp:20, spd:1.8, r:.35, cost:2, floors:[4], money:[2,5] },                    // 撑杆跳僵尸：冲刺→撑杆跳→越过墙/玩家，跳跃中无敌
  pvz_football:  { hp:55, spd:1.6, r:.44, cost:3, floors:[4], money:[4,8] },                    // 橄榄球僵尸：肥壮+头盔+护具，蓄力→高速冲锋，正面减伤
  pvz_newspaper: { hp:22, spd:1.0, r:.35, cost:2, floors:[4], money:[2,5], armor:12 },          // 读报僵尸：报纸阶段缓慢→报纸碎→暴走(速度×2.2)
  pvz_disco:     { hp:35, spd:1.4, r:.38, cost:4, floors:[4], money:[5,8] },                    // 舞王僵尸：爆炸头+亮片西装+墨镜，跳舞→召唤伴舞
  pvz_balloon:   { hp:14, spd:1.5, r:.32, cost:2, floors:[4], money:[2,4], armor:8 },           // 气球僵尸：悬浮+忽略地面墙，气球破→掉落变普通
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
    armor: def.armor||0,        // 路障蛮兵：正面护甲独立耐久（0=已破/无护甲）
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
  if(type==='mimic'){
    // 拟态怪初始：伪装成宝箱（完全静止），可被互动（按 E 视为"打开宝箱"→ 揭示）
    e.state='disguise';
    e.interact={label:'打开宝箱', range:1.6, fn:()=>{ if(e.state==='disguise') e._wantReveal=1; }};
  }
  this.list.push(e);
  return e;
};

/* 拟态怪：解除伪装（靠近/互动/受击触发）→ 宝箱壳隐藏、拟态体显示，立即进入扑击 */
E.revealMimic = function(e){
  if(e.dead || e.state!=='disguise') return;
  e.state='lunge'; e.stateT=.5; e.interact=null;
  e.targetFace=G.angTo(e.x,e.z,G.player.x,G.player.z);
  const r=e.refs;
  if(r.box) r.box.visible=false;
  if(r.lid) r.lid.visible=false;
  if(r.maw){ r.maw.visible=true; }
  if(r.jaw) r.jaw.rotation.z=.9;   // 张嘴
  G.audio.sfx('roar',{v:.6});
  G.fx.burst(e.x,.5,e.z,10,{color:0x7a5068,spd:2.2,life:.4,s0:.14,kind:'m'});
  G.fx.shake(.18);
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
  if(G._twistField) delete G._twistField;   // 小丑干扰场清场复位
  if(G._magField) delete G._magField;       // 磁铁怪磁场清场复位
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
  // 拟态怪伪装中受击 → 立即解除伪装进入战斗（"攻击 Mimic 后立即进入战斗"，伤害照常结算）
  if(e.type==='mimic' && e.state==='disguise') this.revealMimic(e);
  // 挖掘者钻地/出土预警期间完全免疫（埋在地下，土痕可见但打不到——counterplay 是钻地前/出土后）
  if(e.type==='miner' && (e.state==='under'||e.state==='emerge')) return;
  // 橄榄球狂徒冲锋期间受击 ×0.5（高速重装，代价是撞墙眩晕窗口）
  if(e.type==='footballer' && e.state==='charge') dmg *= .5;
  // 路障蛮兵正面护甲：正面普通子弹减 70% 并消耗护甲耐久；背后完整；爆炸/电弧(ignoreBlock)正常不消耗护甲
  if(e.type==='barrier_brute' && e.armor>0 && !ignoreBlock && e.state!=='guardbreak'){
    let dB = Math.atan2(Math.sin(e.face-ang-Math.PI), Math.cos(e.face-ang-Math.PI));
    if(Math.abs(dB) < 0.6){
      e.armor -= dmg;
      const real = Math.max(1, Math.round(dmg*.3));   // 正面实际只承受 30%
      G.fx.sparks(e.x+Math.cos(e.face)*.6,.8,e.z+Math.sin(e.face)*.6,0x9aa0a8);
      G.audio.sfx('clank',{v:.5});
      if(e.armor<=0){   // 护甲碎裂 → 狂暴（移速↑/接触伤+1/攻击提速/红色视觉）
        e.armor=0;
        e.state='guardbreak'; e.stateT=1.2;   // 碎裂瞬间踉跄（给玩家换弹/调整窗口）
        if(e.refs.armor){ e.refs.armor.visible=false; }
        G.fx.burst(e.x+Math.cos(e.face)*.6,1.0,e.z+Math.sin(e.face)*.6,12,{color:0x9aa0a8,spd:3.2,life:.5,s0:.18});
        G.audio.sfx('doorSlam',{v:.7});
        G.fx.shake(.22);
        G.fx.dmgNum(e.x,1.3,e.z,'护甲击碎!',false);
        return;   // 本击已耗完护甲，不重复扣血
      }
      G.fx.dmgNum(e.x,1.1,e.z, Math.round(real), false);
      e.hp -= real;
      e.flashT=.07;
      G.fx.blood(e.x,.6,e.z,0xc03028);
      G.audio.sfx('hit',{v:.5});
      if(e.hp<=0) this.kill(e, ang);
      return;
    }
  }
  // ===== PVZ 乱入僵尸特殊受击逻辑 =====
  // 撑杆跳僵尸跳跃中无敌（无法被近战/子弹命中——跳过玩家/墙体的短暂窗口）
  if(e.type==='pvz_polevaulter' && e._vaultInvuln) return;
  // PVZ 橄榄球僵尸冲锋中正面减伤 50%（高速重装坦克）
  if(e.type==='pvz_football' && e.state==='charge') dmg *= .5;
  // 路障僵尸：橙色交通锥独立耐久（任何方向都先扣锥，锥在头上），锥碎→变普通僵尸
  if(e.type==='pvz_conehead' && e.armor>0 && !ignoreBlock){
    e.armor -= dmg;
    G.fx.sparks(e.x,1.2,e.z,0xff8c20);
    G.audio.sfx('clank',{v:.4});
    if(e.armor<=0){
      e.armor=0;
      if(e.refs.cone){ e.refs.cone.visible=false; }
      G.fx.burst(e.x,1.2,e.z,10,{color:0xff8c20,spd:3,life:.5,s0:.18});
      G.audio.sfx('doorSlam',{v:.5});
      G.fx.dmgNum(e.x,1.4,e.z,'路障碎!',false);
    }
    return;  // 交通锥吸收全部伤害，不扣血
  }
  // 铁桶僵尸：铁桶高耐久（任何方向都先扣桶），桶存在时减伤，桶碎→变普通僵尸
  if(e.type==='pvz_buckethead' && e.armor>0 && !ignoreBlock){
    e.armor -= dmg;
    const real = Math.max(1, Math.round(dmg*.2));  // 铁桶存在时只承受 20% 伤害
    G.fx.sparks(e.x,1.2,e.z,0x8a8a92);
    G.audio.sfx('clank',{v:.5});
    if(e.armor<=0){
      e.armor=0;
      if(e.refs.bucket){ e.refs.bucket.visible=false; }
      G.fx.burst(e.x,1.2,e.z,14,{color:0x8a8a92,spd:3.5,life:.6,s0:.2});
      G.audio.sfx('doorSlam',{v:.7});
      G.fx.shake(.15);
      G.fx.dmgNum(e.x,1.4,e.z,'铁桶碎!',false);
      return;
    }
    G.fx.dmgNum(e.x,1.1,e.z, Math.round(real), false);
    e.hp -= real;
    e.flashT=.07;
    G.fx.blood(e.x,.6,e.z,0x7a8a5a);
    G.audio.sfx('hit',{v:.4});
    if(e.hp<=0) this.kill(e, ang);
    return;
  }
  // 读报僵尸：报纸独立耐久，报纸碎→暴走（速度×2.2/攻速↑/红眼）
  if(e.type==='pvz_newspaper' && e.armor>0 && !ignoreBlock){
    e.armor -= dmg;
    G.fx.sparks(e.x,.8,e.z,0xe8e0d0);
    G.audio.sfx('hit',{v:.3});
    if(e.armor<=0){
      e.armor=0;
      e.state='idle'; e.atkCd=.3;  // 立即进入战斗
      if(e.refs.paper){ e.refs.paper.visible=false; }
      G.fx.burst(e.x,.8,e.z,12,{color:0xe8e0d0,spd:2.5,life:.5,s0:.15});
      G.audio.sfx('flip',{v:.6});
      G.fx.dmgNum(e.x,1.2,e.z,'报纸碎!暴走!',false);
      G.fx.shake(.12);
    }
    return;  // 报纸吸收全部伤害
  }
  // 气球僵尸：气球独立耐久，气球破→掉落地面变普通僵尸
  if(e.type==='pvz_balloon' && e.armor>0 && !ignoreBlock){
    e.armor -= dmg;
    G.fx.sparks(e.x,1.7,e.z,0x40a0c0);
    G.audio.sfx('hit',{v:.3});
    if(e.armor<=0){
      e.armor=0;
      if(e.refs.balloon){ e.refs.balloon.visible=false; }
      if(e.refs.string){ e.refs.string.visible=false; }
      G.fx.burst(e.x,1.7,e.z,10,{color:0x40a0c0,spd:2.5,life:.5,s0:.15});
      G.audio.sfx('flip',{v:.5});
      G.fx.dmgNum(e.x,1.5,e.z,'气球破!',false);
      // 掉落：短暂硬直
      e.state='idle'; e.atkCd=.5;
    }
    return;  // 气球吸收全部伤害
  }
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
  if(e.type==='jester' && G._twistField) delete G._twistField;       // 小丑死亡：清除弹道干扰场
  if(e.type==='magnetron' && G._magField) delete G._magField;        // 磁铁怪死亡：清除磁场
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
    // 路障蛮兵狂暴：移速 ×1.3（护甲击碎后）
    if(e.type==='barrier_brute' && e.state==='berserk') e.spd=e.baseSpd*1.3;
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
    // 接触伤害（拟态怪扑击 / 蛮兵狂暴 / 橄榄球冲锋 均 2 点，其余 1 点）
    e.contactCd-=dt;
    const _ctDmg = (e.type==='mimic'&&e.state==='lunge')||(e.type==='barrier_brute'&&e.state==='berserk')||(e.type==='footballer'&&e.state==='charge') ? 2 : 1;
    if(p && !p.dead && dToP < e.r+.42 && e.contactCd<=0 && p.rollT<=0 && !p.invulnT && !p.ghostT &&
       !(e.type==='miner'&&(e.state==='under'||e.state==='emerge')) && e.type!=='balloon_wisp'){
      p.hurt(_ctDmg, angToP);
      e.contactCd=.8;
      e.vx-=Math.cos(angToP)*2; e.vz-=Math.sin(angToP)*2;
      if(p.st.thorns){ this.hurt(e, p.st.thorns, angToP+Math.PI, 0); }
    }

    // 指挥官攻速光环：被光环覆盖的敌人额外推进攻击冷却（通用段统一处理）
    if(e._hasteT>0){ e._hasteT-=dt; e.atkCd-=dt*.5; }
    // 阵型指挥者 Rally：被重排的敌人朝目标点真实移动（期间跳过各自 AI、不攻击），结束后恢复
    if(e._rallyMove && e._rallyMove.t>0){
      e._rallyMove.t-=dt;
      const rdx=e._rallyMove.tx-e.x, rdz=e._rallyMove.tz-e.z, rdd=Math.hypot(rdx,rdz);
      if(rdd<.2){ e._rallyMove=null; }
      else {
        e.targetFace=Math.atan2(rdz,rdx);
        G.moveEntity(e, rdx/rdd*e.spd*1.15*dt, rdz/rdd*e.spd*1.15*dt); e.moving=true;
      }
    } else {
      e._rallyMove=null;
      const ai = AI[e.type]; if(ai) ai(e, dt, dToP, angToP, p);
    }

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
  if(e.type!=='shroom' && e.type!=='sniper' && e.type!=='hexer' && e.type!=='mimic'){
    // 盾卫转身极慢（2.6/s）：绕背走位可行；其他敌人正常转向
    // 拟态怪除外：伪装时完全静止不转向（AI 内部维护 face），避免宝箱"盯着玩家"暴露
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
    case 'mimic': {
      const r2=e.refs;
      if(e.state==='disguise'){
        // 伪装：宝箱轻微呼吸 + 极低频暗紫粒子（counterplay 线索："这箱子不对劲"）
        const s=1+Math.sin(e.t*2.2)*.012;
        r2.box.scale.set(s,1,s); r2.lid.scale.set(s,1,s);
        if(Math.random()<.05) G.fx.particle(e.x+(Math.random()-.5)*.5,.06,e.z+(Math.random()-.5)*.5,
          {vx:0,vy:.05,vz:0,life:.6,color:0x5a3a58,s0:.03,kind:'a'});
      } else {
        r2.box.scale.set(1,1,1); r2.lid.scale.set(1,1,1);
        if(r2.maw && r2.maw.visible){
          // 拟态体：躯干浮动 + 张嘴（扑击时大张，平时咬合摆动）+ 朝向玩家
          r2.maw.position.y=.5+Math.sin(e.t*6)*.06;
          r2.maw.rotation.y=e.face;
          r2.jaw.rotation.z = e.state==='lunge'? 1.1 : .35+Math.sin(e.t*9)*.15;
        }
      }
      break; }
    case 'miner': {
      // 行走摆腿 + 镐晃；钻地低伏压扁；地下/出土期间埋入地下（土痕表现）
      if(r.legL){ r.legL.rotation.x=Math.sin(e.walkT)*.7; r.legR.rotation.x=-Math.sin(e.walkT)*.7; }
      r.pick.rotation.z = e.state==='dig'? -.6 : Math.sin(e.walkT)*.15;
      if(e.state==='under'||e.state==='emerge'){ m.visible=false; }
      else { m.visible=true; r.body.scale.y = e.state==='dig'? .55 : 1; r.body.position.y = e.state==='dig'? -.1 : 0; }
      break; }
    case 'vaultling': {
      // 蓄力下蹲压扁 / 跳跃抛物线抬升+蹬腿 / 落地恢复
      if(e.state==='prepare'){
        r.body.scale.y=.8+Math.sin(e.t*26)*.06; r.body.position.y=-.06;
        r.legL.scale.y=.7; r.legR.scale.y=.7;
      } else if(e.state==='vault'){
        r.body.scale.y=1; r.body.position.y=0;
        const vp=G.clamp(1-e.stateT/.5,0,1);
        m.position.y = Math.sin(vp*Math.PI)*1.3;    // 空中抛物线
        r.legL.scale.y=1.3; r.legR.scale.y=1.3;     // 蹬腿
        r.body.rotation.z=Math.sin(e.t*20)*.15;
      } else {
        r.body.scale.y=1; r.body.position.y=0; r.body.rotation.z=0;
        r.legL.scale.y=1; r.legR.scale.y=1;
      }
      break; }
    case 'barrier_brute': {
      if(r.legL){ r.legL.rotation.x=Math.sin(e.walkT)*.5; r.legR.rotation.x=-Math.sin(e.walkT)*.5; }
      if(e.state==='guardbreak'){
        r.body.position.x=Math.sin(e.t*20)*.06; m.rotation.z=Math.sin(e.t*16)*.05;
      } else { r.body.position.x=0; m.rotation.z=0; }
      // 狂暴：红色视觉（头顶红光 + 红粒子；护甲已隐藏）
      if(e.state==='berserk'){
        if(!e._rage){ const sp=new THREE.Sprite(G.pmat(0xff3020)); sp.scale.set(1.7,1.7,1); sp.position.y=1.3; m.add(sp); e._rage=sp; }
        if(Math.random()<.12) G.fx.particle(e.x+(Math.random()-.5)*.7,1.2,e.z+(Math.random()-.5)*.7,{vx:0,vy:.4,vz:0,life:.35,color:0xff4030,s0:.1,kind:'a'});
      } else if(e._rage){ m.remove(e._rage); e._rage=null; }
      break; }
    case 'footballer': {
      if(r.legL){ r.legL.rotation.x=Math.sin(e.walkT)*.5; r.legR.rotation.x=-Math.sin(e.walkT)*.5; }
      if(e.state==='prepare'){ r.body.rotation.x=.3+Math.sin(e.t*30)*.05; }
      else if(e.state==='charge'){ r.body.rotation.x=.6; r.body.position.y=.1; }
      else { r.body.rotation.x=0; r.body.position.y=0; }
      break; }
    case 'jester': {
      // 施法/干扰场：彩球绕转 + 彩色粒子；施法时身体快速旋转
      if(e.state==='cast'||e.state==='field'){
        r.ball.visible=true;
        r.ball.material.rotation += dt*6;
        const bs=.6+Math.sin(e.t*14)*.15; r.ball.scale.set(bs,bs,1);
        if(Math.random()<.3) G.fx.particle(e.x+(Math.random()-.5)*1.4,1.0,e.z+(Math.random()-.5)*1.4,{vx:0,vy:.2,vz:0,life:.3,color:[0xff4040,0x40ff40,0x4060ff][Math.random()*3|0],s0:.09,kind:'a'});
      } else r.ball.visible=false;
      r.hat.rotation.y = e.state==='cast'? e.t*20 : Math.sin(e.t*2)*.1;
      break; }
    case 'podcaster': {
      if(r.legL){ r.legL.rotation.x=Math.sin(e.walkT)*.5; r.legR.rotation.x=-Math.sin(e.walkT)*.5; }
      if(e.state==='rally'){
        r.mic.position.x=.3+Math.sin(e.t*26)*.03;
        if(Math.random()<.5) G.fx.particle(e.x+(Math.random()-.5)*.8,1.1,e.z+(Math.random()-.5)*.8,{vx:0,vy:.5,vz:0,life:.4,color:0x7ae050,s0:.09,kind:'a'});
      }
      break; }
    case 'magnetron': {
      r.body.position.y=.95+Math.sin(e.t*2.4)*.08;
      const active=e.state==='field'||e.state==='release';
      if(r.ring) r.ring.visible=active;
      if(active){
        const lv=1+(e.charge||0)*.08; r.halo.scale.setScalar(lv+Math.sin(e.t*8)*.06);
      } else r.halo.scale.setScalar(1.3+Math.sin(e.t*3)*.1);
      break; }
    case 'balloon_wisp': {
      // 空中浮动 + 飘尾摆动；投弹蓄力时眼睛放大（预警感）
      r.body.position.y=1.35+Math.sin(e.t*2.6)*.18;
      r.tail.rotation.z=Math.sin(e.t*4)*.12;
      r.aura.scale.setScalar(1.15+Math.sin(e.t*3)*.12);
      r.eyeL.scale.setScalar(e.state==='bomb'? 1+Math.sin(e.t*20)*.3 : 1);
      break; }
    /* ---- PVZ 纸片人通用动画：朝向 + 状态切图 + 摇摆动效 ----
       原版 GIF 面朝画面左（局部 -X），rotation.y=-face+PI 让僵尸面朝移动方向（H23 链路无魔法角度）。
       闪白（_om）/拍照灰调（_pm0）材质由 traverse 换装接管，此时不覆盖（H24 键位契约）。 */
    case 'pvz_basic': case 'pvz_conehead': case 'pvz_buckethead': case 'pvz_polevaulter':
    case 'pvz_football': case 'pvz_newspaper': case 'pvz_disco': case 'pvz_balloon': {
      const cd=r.card; if(!cd||cd.userData._om||cd.userData._pm0) break;
      // billboard：恒面向固定俯角镜头（原版 PvZ 僵尸单向行走，朝向感让位于贴图完整还原）
      let want=r.cardMats.walk;
      if(e.type==='pvz_newspaper' && e.armor<=0 && r.cardMats.atk) want=r.cardMats.atk;               // 报纸碎→暴走
      else if(e.type==='pvz_football' && e.state==='charge' && r.cardMats.atk) want=r.cardMats.atk;   // 冲锋
      else if(e.type==='pvz_polevaulter' && (e.state==='windup'||e.state==='vault') && r.cardMats.atk) want=r.cardMats.atk;
      else if(e.type==='pvz_disco' && e.state==='dance' && r.cardMats.atk) want=r.cardMats.atk;       // 跳舞
      else if((e.type==='pvz_conehead'||e.type==='pvz_buckethead'||e.type==='pvz_balloon') && e.armor<=0 && r.cardMats.noArmor) want=r.cardMats.noArmor; // 破甲→普通僵尸（原版行为）
      if(cd.material!==want) cd.material=want;
      // 用户要求：移动时纸片人必须端正——无摇摆无浮动，billboard 恒正对镜头；
      // position.y 必须锚定 _cardY（曾因每帧覆盖成近 0 导致后仰平面半截插进地里=贴图显示不完整）
      cd.rotation.z=0;
      cd.position.y=r._cardY + (e.type==='pvz_balloon' ? 0.9 : 0);   // 气球僵尸悬挂在上方，阴影留地面
      if(e.type==='pvz_polevaulter' && e.state==='vault'){
        const vp=G.clamp(1-e.stateT/.6,0,1);
        cd.position.y=r._cardY+Math.sin(vp*Math.PI)*.9; cd.rotation.z=-vp*Math.PI*2;  // 撑杆跳动作保留
      }
      break; }
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
  /* 拟态怪：伪装成宝箱完全静止 → 靠近 1.2 格/互动/受击 揭示 → 扑击（接触 2 伤）→ 短程扇形弹 → 正常追逐 */
  mimic(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='disguise'){
      if(d<1.2 || e._wantReveal){ e._wantReveal=0; E.revealMimic(e); }
      return;
    }
    if(e.state==='lunge'){
      e.stateT-=dt; e.targetFace=a;
      e.face=G.angLerp(e.face, a, Math.min(1,10*dt));
      G.moveEntity(e, Math.cos(e.targetFace)*8*dt, Math.sin(e.targetFace)*8*dt);
      if(e.stateT<=0 || d<1.05){
        e.state='fan'; e.stateT=.12; e.fanN=0;
      }
    } else if(e.state==='fan'){
      e.stateT-=dt; e.face=G.angLerp(e.face, a, Math.min(1,10*dt));
      if(e.stateT<=0 && !e.fanN){
        e.fanN=1;
        const n=5+(Math.random()*3|0);          // 5~7 枚短程扇形弹
        const base=G.angTo(e.x,e.z,p.x,p.z);
        for(let k=0;k<n;k++){
          const off=(k-(n-1)/2)*.16;
          eshoot(e, base+off, {spd:3.6, life:1.1, color:0xff6060, size:.16});
        }
        G.audio.sfx('laser',{v:.35});
      }
      if(e.stateT<=0){ e.state='idle'; e.atkCd=1.8+Math.random(); }
    } else {
      e.face=G.angLerp(e.face, a, Math.min(1,5*dt));
      const mx=Math.cos(a), mz=Math.sin(a);
      G.moveEntity(e, mx*E.chaseSpd(e,d)*dt, mz*E.chaseSpd(e,d)*dt); e.moving=true;
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<10){ e.state='lunge'; e.stateT=.5; e.targetFace=a; G.audio.sfx('roar',{v:.45}); }
    }
  },
  /* 挖掘者：追击 → 钻地（低伏+地面预警）→ 地下移动（免疫+土痕，counterplay=追踪土痕）→ 出土预警 → 短扑 → 后摇 */
  miner(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      if(d>1 && d<99){ G.moveEntity(e, Math.cos(a)*E.chaseSpd(e,d)*dt, Math.sin(a)*E.chaseSpd(e,d)*dt); e.moving=true; }
      e.atkCd-=dt;
      const wantDig=(d>3.5&&d<7)||d<2.2;   // 保持中距游走，贴近就钻地绕开
      if(wantDig && e.atkCd<=0){ e.state='dig'; e.stateT=.7; e._digT=0; G.audio.sfx('charge',{v:.4}); }
    } else if(e.state==='dig'){
      e.stateT-=dt; e._digT-=dt;
      if(e._digT<=0){ e._digT=.12; G.fx.ring(e.x,.05,e.z,1.0,0x8a7a60,.5); G.fx.particle(e.x,.05,e.z,{vx:0,vy:.6,vz:0,life:.3,color:0x8a7a60,s0:.12,kind:'m'}); }
      if(e.stateT<=0){
        e.state='under'; e.stateT=1.8;
        e._tx=e.x; e._tz=e.z;
        // 落点：玩家侧后方 2 格（绕背突袭），须合法且不贴玩家
        const pFace=(p&&p.face!=null)? p.face : a;
        const cands=[pFace+Math.PI, pFace+Math.PI*.7, pFace+Math.PI*1.3, a+Math.PI];
        for(const ca of cands){
          const pos=E.nearbyLegalPos(p.x+Math.cos(ca)*2.0, p.z+Math.sin(ca)*2.0);
          if(pos && G.dist(p.x,p.z,pos.x,pos.z)>1.0){ e._tx=pos.x; e._tz=pos.z; break; }
        }
      }
    } else if(e.state==='under'){
      e.stateT-=dt; e._digT-=dt;
      if(e._digT<=0){ e._digT=.1; G.fx.particle(e.x,.03,e.z,{vx:0,vy:.4,vz:0,life:.4,color:0x8a7a60,s0:.1,kind:'m'}); G.fx.particle(e.x+.1,.03,e.z-.1,{vx:0,vy:.3,vz:0,life:.35,color:0x6a5a42,s0:.08,kind:'m'}); }  // 土痕
      const dx=e._tx-e.x, dz=e._tz-e.z, dd=Math.hypot(dx,dz)||1;
      G.moveEntity(e, dx/dd*E.chaseSpd(e,d)*dt*1.2, dz/dd*E.chaseSpd(e,d)*dt*1.2);
      if(dd<.5 || e.stateT<=0){ e.state='emerge'; e.stateT=.5; e._digT=0; }
    } else if(e.state==='emerge'){
      e.stateT-=dt; e._digT-=dt;
      if(e._digT<=0){ e._digT=.14; G.fx.ring(e.x,.1,e.z,.8,0x9a8a70,.55); }   // 土堆鼓起预警
      if(e.stateT<=0){ e.state='lunge'; e.stateT=.25; e.lungeAng=a; G.audio.sfx('roar',{v:.5}); }
    } else if(e.state==='lunge'){
      e.stateT-=dt; e.targetFace=e.lungeAng;
      G.moveEntity(e, Math.cos(e.lungeAng)*5*dt, Math.sin(e.lungeAng)*5*dt); e.moving=true;
      if(e.stateT<=0){ e.state='recover'; e.stateT=.4; }
    } else if(e.state==='recover'){
      e.stateT-=dt; if(e.stateT<=0){ e.state='idle'; e.atkCd=1.6+Math.random()*.8; }
    }
  },
  /* 跳跃者：追击 → 下蹲蓄力 → 长距离跳跃（抛物线跨前排，空中可被远程伤害）→ 落地冲击 → 后摇 */
  vaultling(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      G.moveEntity(e, Math.cos(a)*E.chaseSpd(e,d)*dt, Math.sin(a)*E.chaseSpd(e,d)*dt); e.moving=true;
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<5 && d>2.2){ e.state='prepare'; e.stateT=.6; e.targetFace=a; G.audio.sfx('charge',{v:.4}); }
    } else if(e.state==='prepare'){
      e.stateT-=dt; e.targetFace=a;
      if(e.stateT<=0){
        e.state='vault'; e.stateT=.5;
        e._vx0=e.x; e._vz0=e.z;
        // 落点：玩家朝向前方 3 格（跳过玩家/前排），非法回退到玩家脚下附近
        const pFace=(p&&p.face!=null)? p.face : a;
        let pos=E.nearbyLegalPos(p.x+Math.cos(pFace)*3, p.z+Math.sin(pFace)*3);
        if(!pos) pos=E.nearbyLegalPos(p.x, p.z);
        e._vtx=pos? pos.x : p.x; e._vtz=pos? pos.z : p.z;
        G.audio.sfx('flip',{v:.5});
      }
    } else if(e.state==='vault'){
      e.stateT-=dt;
      const vp=G.clamp(1-e.stateT/.5,0,1);
      e.x=G.lerp(e._vx0,e._vtx,vp); e.z=G.lerp(e._vz0,e._vtz,vp);
      e.moving=true;
      if(e.stateT<=0){
        G.fx.ring(e.x,.2,e.z,.9,0x8ac8a0,.3);                       // 落地轻微冲击波
        G.fx.burst(e.x,.15,e.z,6,{color:0x8ac8a0,spd:1.8,life:.35,s0:.14,kind:'m'});
        const pp=G.player;
        if(pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<.9 && pp.rollT<=0 && !pp.invulnT) pp.hurt(1, G.angTo(e.x,e.z,pp.x,pp.z));
        e.state='recover'; e.stateT=.5;
      }
    } else if(e.state==='recover'){
      e.stateT-=dt; if(e.stateT<=0){ e.state='idle'; e.atkCd=1.8+Math.random()*.8; }
    }
  },
  /* 路障蛮兵：正面护甲前排推进 → 近身挥击；护甲碎裂 → 狂暴（移速↑/攻速×2/接触2伤/红色） */
  barrier_brute(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='guardbreak'){
      e.stateT-=dt; if(e.stateT<=0){ e.state='berserk'; e.atkCd=Math.max(e.atkCd,.4); }
      return;
    }
    e.targetFace=a;
    if(e.state==='idle'||e.state==='berserk'){
      const spd=e.state==='berserk'? E.chaseSpd(e,d)*1.25 : E.chaseSpd(e,d)*.7;
      G.moveEntity(e, Math.cos(a)*spd*dt, Math.sin(a)*spd*dt); e.moving=true;
      e.atkCd -= dt*(e.state==='berserk'?2:1);
      if(d<e.r+1.0){ e.state='swing'; e.stateT=.4; G.audio.sfx('charge',{v:.35}); }
    } else if(e.state==='swing'){
      e.stateT-=dt;
      if(e.stateT<=0){
        const pp=G.player;
        if(pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<e.r+1.4 && pp.rollT<=0 && !pp.invulnT) pp.hurt(e.armor<=0?2:1, a);
        G.fx.ring(e.x+Math.cos(a)*.9,e.z+Math.sin(a)*.9,1.3,0x9aa0a8,.25);
        G.audio.sfx('flip');
        e.state=e.armor<=0? 'berserk' : 'idle';
      }
    }
  },
  /* 橄榄球狂徒：慢速重装推进 → 远距冲锋（受击×0.5/撞开小型/撞玩家2伤）→ 撞墙眩晕（输出窗口） */
  footballer(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      G.moveEntity(e, Math.cos(a)*E.chaseSpd(e,d)*dt*.55, Math.sin(a)*E.chaseSpd(e,d)*dt*.55); e.moving=true;
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<7 && d>3.5){
        const fx=e.x+Math.cos(a)*4.5, fz=e.z+Math.sin(a)*4.5;
        if(!G.solidForMove(fx,fz)){ e.state='prepare'; e.stateT=.7; e.chargeAng=a; e._pfT=0; G.audio.sfx('charge',{v:.5}); }
      }
    } else if(e.state==='prepare'){
      e.stateT-=dt; e.chargeAng=G.angLerp(e.chargeAng,a,.1); e.targetFace=e.chargeAng; e._pfT-=dt;
      if(e._pfT<=0){ e._pfT=.12; G.fx.ring(e.x,.08,e.z,1.2,0x8a3028,.6); }   // 地面冲锋路线预警
      if(e.stateT<=0){ e.state='charge'; e.stateT=1.0; G.audio.sfx('roll'); }
    } else if(e.state==='charge'){
      e.stateT-=dt; e.targetFace=e.chargeAng;
      const ox=e.x, oz=e.z;
      G.moveEntity(e, Math.cos(e.chargeAng)*6.5*dt, Math.sin(e.chargeAng)*6.5*dt); e.moving=true;
      for(const o of G.enemies.list){   // 撞开小型敌人；不撞开盾卫/蛮兵/同类
        if(o===e||o.dead||o.spawnT>0) continue;
        if(o.type==='shield'||o.type==='barrier_brute'||o.type==='footballer') continue;
        if(G.dist(e.x,e.z,o.x,o.z)<e.r+o.r+.15){
          G.moveEntity(o, Math.cos(e.chargeAng)*1.3, Math.sin(e.chargeAng)*1.3);
          o.vx+=Math.cos(e.chargeAng)*3.5; o.vz+=Math.sin(e.chargeAng)*3.5;
          G.fx.sparks((e.x+o.x)/2,.6,(e.z+o.z)/2,0x8a3028);
          break;
        }
      }
      const moved=G.dist(ox,oz,e.x,e.z);
      if(moved < 6.5*dt*.4){ e.state='stun'; e.stateT=1.25; G.fx.shake(.28); G.audio.sfx('doorSlam',{v:.5}); G.fx.burst(e.x,.4,e.z,8,{color:0xc8b090,spd:2.4,life:.4,s0:.16}); }
      else if(e.stateT<=0){ e.state='idle'; e.atkCd=2.0+Math.random()*.6; }
      if(d<e.r+.5){ e.state='idle'; e.atkCd=1.6; }
    } else if(e.state==='stun'){
      e.stateT-=dt; if(e.stateT<=0){ e.state='idle'; e.atkCd=1.2; }
    }
  },
  /* 小丑：弹道干扰——施法旋转 → 制造半径 4.5 干扰场（玩家普通实体弹偏转 15~35°）→ 冷却 */
  jester(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      e.strafeT-=dt; if(e.strafeT<=0){ e.strafe*=-1; e.strafeT=1+Math.random(); }
      let mx=0,mz=0;
      if(d>6){ mx=Math.cos(a); mz=Math.sin(a); }
      else if(d<3.5){ mx=-Math.cos(a); mz=-Math.sin(a); }
      mx+=-Math.sin(a)*e.strafe*.4; mz+=Math.cos(a)*e.strafe*.4;
      const l=Math.hypot(mx,mz)||1;
      G.moveEntity(e,mx/l*E.chaseSpd(e,d)*dt,mz/l*E.chaseSpd(e,d)*dt); e.moving=true;
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<10){ e.state='cast'; e.stateT=.8; G.audio.sfx('charge',{v:.45}); }
    } else if(e.state==='cast'){
      e.stateT-=dt;
      if(Math.random()<.5) G.fx.particle(e.x+(Math.random()-.5)*1.2,1.0,e.z+(Math.random()-.5)*1.2,{vx:0,vy:.3,vz:0,life:.35,color:0xffc040,s0:.1,kind:'a'});
      if(e.stateT<=0){ e.state='field'; e.stateT=2.0; G._twistField={x:e.x,z:e.z,r:4.5}; G.audio.sfx('phase',{v:.5}); }
    } else if(e.state==='field'){
      e.stateT-=dt;
      G._twistField={x:e.x,z:e.z,r:4.5};
      if(Math.random()<.35) G.fx.particle(e.x+(Math.random()-.5)*3.2,1.0,e.z+(Math.random()-.5)*3.2,{vx:0,vy:.15,vz:0,life:.3,color:[0xff6060,0x60ff60,0x6080ff][Math.random()*3|0],s0:.12,kind:'a'});
      if(e.stateT<=0){ delete G._twistField; e.state='idle'; e.atkCd=5+Math.random()*2; }
    }
  },
  /* 阵型指挥者：Rally 施法（停+发光）→ 把周围敌人重排成前中后阵型（真实移动，不瞬移） */
  podcaster(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      if(d>7){ G.moveEntity(e,Math.cos(a)*E.chaseSpd(e,d)*dt*.5,Math.sin(a)*E.chaseSpd(e,d)*dt*.5); e.moving=true; }
      e.atkCd-=dt;
      const allies=G.enemies.list.filter(x=>x!==e&&!x.dead&&x.spawnT<=0&&G.dist(e.x,e.z,x.x,x.z)<8).length;
      if(e.atkCd<=0 && allies>=3){ e.state='rally'; e.stateT=1.15; G.audio.sfx('charge',{v:.5}); }
    } else if(e.state==='rally'){
      e.stateT-=dt;
      if(e.stateT<=0){
        const dir=G.angTo(e.x,e.z,p.x,p.z);
        const front=[], mid=[], back=[];
        for(const o of G.enemies.list){
          if(o===e||o.dead||o.spawnT>0) continue;
          if(G.dist(e.x,e.z,o.x,o.z)>9) continue;
          if(o.type==='shield'||o.type==='barrier_brute'||o.type==='charger'||o.type==='footballer') front.push(o);
          else if(o.type==='shotgunner'||o.type==='gunner') mid.push(o);
          else back.push(o);
        }
        const place=(arr,dist,spread)=>{ arr.forEach((o,i)=>{
          const off=(i-(arr.length-1)/2)*spread;
          const px=e.x+Math.cos(dir)*dist+Math.cos(dir+Math.PI/2)*off;
          const pz=e.z+Math.sin(dir)*dist+Math.sin(dir+Math.PI/2)*off;
          const pos=E.nearbyLegalPos(px,pz);
          if(pos) o._rallyMove={tx:pos.x,tz:pos.z,t:2.2};
        }); };
        place(front,1.4,1.4); place(mid,.7,1.2); place(back,-1.5,1.6);
        G.fx.ring(e.x,.4,e.z,2.2,0x7ae050,.5);
        G.audio.sfx('spawn',{v:.5});
        e.state='idle'; e.atkCd=9+Math.random()*3;
      }
    }
  },
  /* 磁铁怪：周期磁场（吸玩家普通弹+储能）→ 蓄力释放环形弹（弹数=储能） */
  magnetron(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      if(d>7){ G.moveEntity(e,Math.cos(a)*E.chaseSpd(e,d)*dt*.5,Math.sin(a)*E.chaseSpd(e,d)*dt*.5); e.moving=true; }
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<12){ e.state='field'; e.stateT=2.5; e.charge=e.charge||0; G._magField={x:e.x,z:e.z,r:3.5,rr:e.r+.35,absorb:null}; G.audio.sfx('charge',{v:.4}); }
    } else if(e.state==='field'){
      e.stateT-=dt;
      G._magField.x=e.x; G._magField.z=e.z;
      if(Math.random()<.3) G.fx.particle(e.x+(Math.random()-.5)*2.4,1.0,e.z+(Math.random()-.5)*2.4,{vx:0,vy:.2,vz:0,life:.3,color:0x70a0ff,s0:.09,kind:'a'});
      if(!G._magField.absorb) G._magField.absorb=()=>{
        e.charge=(e.charge||0)+1;
        G.fx.sparks(e.x,.9,e.z,0x70a0ff);
        G.audio.sfx('clank',{v:.35});
      };
      if(e.stateT<=0 || e.charge>=10){ delete G._magField; e.state='release'; e.stateT=.8; G.audio.sfx('charge',{v:.5}); }
    } else if(e.state==='release'){
      e.stateT-=dt;
      if(e.stateT<=0){
        const n=Math.max(1,e.charge||0);
        for(let k=0;k<n;k++) eshoot(e, k/n*G.TAU, {spd:4.5, color:0x70a0ff, size:.16});
        G.audio.sfx('laser',{v:.4});
        G.fx.ring(e.x,.5,e.z,1.6,0x70a0ff,.4);
        e.charge=0;
        e.state='idle'; e.atkCd=4+Math.random()*2;
      }
    }
  },
  /* 气球怨灵：空中悬浮保持 5~8 距离 → 锁定玩家位置投虚空炸弹（地面预警圈→延迟爆炸，可躲） */
  balloon_wisp(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      let mx=0,mz=0;
      if(d>8){ mx=Math.cos(a); mz=Math.sin(a); }
      else if(d<5){ mx=-Math.cos(a); mz=-Math.sin(a); }
      else { const sw=Math.sin(e.t*2.6)*.8; mx=-Math.sin(a)*sw; mz=Math.cos(a)*sw; }
      e.x+=mx*E.chaseSpd(e,d)*dt*.8; e.z+=mz*E.chaseSpd(e,d)*dt*.8;
      const room=G.roomAt(e.x,e.z);
      if(room){ e.x=G.clamp(e.x,room.x0+.6,room.x1-.6); e.z=G.clamp(e.z,room.z0+.6,room.z1-.6); }
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<13){ e.state='bomb'; e.stateT=.8; e.bombX=p.x; e.bombZ=p.z; e._bT=0; G.audio.sfx('charge',{v:.35}); }
    } else if(e.state==='bomb'){
      e.stateT-=dt; e._bT+=dt;
      if(e._bT>.13){ e._bT=0; G.fx.ring(e.bombX,.06,e.bombZ,1.5,0xff6060,.6); }   // 地面预警圈
      if(e.stateT<=0){
        G.weapons.explode(e.bombX,e.bombZ,1.5,2,'e');
        G.fx.burst(e.bombX,.3,e.bombZ,10,{color:0xff8060,spd:3,life:.45,s0:.2});
        G.audio.sfx('explosion',{v:.5});
        e.state='idle'; e.atkCd=3.5+Math.random()*1.5;
      }
    }
  },
  /* PVZ 普通僵尸/路障/铁桶：缓慢追踪 + 接触近战（路障/铁桶护甲在 E.hurt 处理） */
  pvz_basic(e,dt,d,a){ AI._pvzMelee(e,dt,d,a,1.8,1); },
  pvz_conehead(e,dt,d,a){ AI._pvzMelee(e,dt,d,a,1.8,1); },
  pvz_buckethead(e,dt,d,a){ AI._pvzMelee(e,dt,d,a,2.0,1); },
  /* PVZ 撑杆跳僵尸：接近→举杆蓄力→撑杆跳（越过玩家/墙，跳跃中无敌）→落地硬直 */
  pvz_polevaulter(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      if(d>1){ G.moveEntity(e, Math.cos(a)*E.chaseSpd(e,d)*dt, Math.sin(a)*E.chaseSpd(e,d)*dt); e.moving=true; }
      e.atkCd-=dt;
      if(e.atkCd<=0 && d>2.5 && d<6){ e.state='windup'; e.stateT=.4; e.targetFace=a; G.audio.sfx('charge',{v:.3}); }
      if(d<e.r+.6 && e.atkCd<=0){ e.state='swing'; e.stateT=.35; }
    } else if(e.state==='windup'){
      e.stateT-=dt; e.targetFace=G.angLerp(e.targetFace,a,.08);
      if(e.stateT<=0){
        e.state='vault'; e.stateT=.6;
        e._vx0=e.x; e._vz0=e.z;
        // 落点：玩家前方 2.5 格（跳过玩家/前排），非法回退到玩家附近
        let pos=E.nearbyLegalPos(p.x+Math.cos(a)*2.5, p.z+Math.sin(a)*2.5);
        if(!pos) pos=E.nearbyLegalPos(p.x+Math.cos(a)*1.5, p.z+Math.sin(a)*1.5);
        e._vtx=pos? pos.x : p.x; e._vtz=pos? pos.z : p.z;
        e._vaultInvuln=true;  // 跳跃中无敌（无法被近战命中）
        G.audio.sfx('flip',{v:.5});
      }
    } else if(e.state==='vault'){
      e.stateT-=dt;
      const vp=G.clamp(1-e.stateT/.6,0,1);
      e.x=G.lerp(e._vx0,e._vtx,vp); e.z=G.lerp(e._vz0,e._vtz,vp);
      e.moving=true; e.targetFace=a;
      if(e.stateT<=0){
        e._vaultInvuln=false;
        G.fx.ring(e.x,.2,e.z,.9,0xff8c20,.3);
        G.fx.burst(e.x,.15,e.z,6,{color:0xff8c20,spd:1.8,life:.35,s0:.14,kind:'m'});
        const pp=G.player;
        if(pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<.9 && pp.rollT<=0 && !pp.invulnT) pp.hurt(1, a);
        e.state='recover'; e.stateT=.4;
      }
    } else if(e.state==='recover'){
      e.stateT-=dt; if(e.stateT<=0){ e.state='idle'; e.atkCd=2.0+Math.random(); }
    } else if(e.state==='swing'){
      e.stateT-=dt;
      if(e.stateT<=0){
        const pp=G.player;
        if(pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<e.r+1.0 && pp.rollT<=0 && !pp.invulnT) pp.hurt(1, a);
        e.state='idle'; e.atkCd=1.8+Math.random();
      }
    }
  },
  /* PVZ 橄榄球僵尸：肥壮坦克，蓄力→高速冲锋（正面减伤50%/撞墙眩晕/撞玩家3伤） */
  pvz_football(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      if(d>1.5){ G.moveEntity(e, Math.cos(a)*E.chaseSpd(e,d)*dt*.8, Math.sin(a)*E.chaseSpd(e,d)*dt*.8); e.moving=true; }
      e.atkCd-=dt;
      if(e.atkCd<=0 && d>3.5 && d<9){ e.state='windup'; e.stateT=.6; e.chargeAng=a; G.audio.sfx('charge',{v:.4}); }
    } else if(e.state==='windup'){
      e.stateT-=dt; e.chargeAng=G.angLerp(e.chargeAng,a,.06); e.targetFace=e.chargeAng;
      if(e.stateT<=0){ e.state='charge'; e.stateT=1.0; G.audio.sfx('roll'); }
    } else if(e.state==='charge'){
      e.stateT-=dt;
      const ox=e.x, oz=e.z;
      G.moveEntity(e, Math.cos(e.chargeAng)*7.5*dt, Math.sin(e.chargeAng)*7.5*dt);
      e.moving=true; e.targetFace=e.chargeAng;
      const moved=G.dist(ox,oz,e.x,e.z);
      if(moved < 7.5*dt*.4){ // 撞墙
        e.state='stun'; e.stateT=1.2; G.fx.shake(.3); G.audio.sfx('doorSlam',{v:.5});
        G.fx.burst(e.x,.4,e.z,10,{color:0xd03028,spd:3,life:.5,s0:.2});
      } else if(e.stateT<=0){ e.state='idle'; e.atkCd=2.0+Math.random(); }
      const pp=G.player;
      if(pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<e.r+.6 && pp.rollT<=0 && !pp.invulnT){
        pp.hurt(3, e.chargeAng); e.state='stun'; e.stateT=.8; G.fx.shake(.25);
      }
    } else if(e.state==='stun'){
      e.stateT-=dt; if(e.stateT<=0){ e.state='idle'; e.atkCd=1.5+Math.random(); }
    }
  },
  /* PVZ 读报僵尸：报纸阶段缓慢+偶尔停下看报 → 报纸碎→暴走(速度×2.2/攻速×2.5) */
  pvz_newspaper(e,dt,d,a,p){
    e.moving=false;
    if(e.armor>0){
      // 第一阶段：缓慢移动，每 3 秒停下 1 秒看报
      if(e.state==='idle'){
        if(d>1){ G.moveEntity(e, Math.cos(a)*e.spd*dt, Math.sin(a)*e.spd*dt); e.moving=true; }
        e._readT=(e._readT||0)+dt;
        if(e._readT>3){ e.state='reading'; e.stateT=1.0; e._readT=0; }
        e.atkCd-=dt;
        if(d<e.r+.8 && e.atkCd<=0){ e.state='swing'; e.stateT=.4; }
      } else if(e.state==='reading'){
        e.stateT-=dt; if(e.stateT<=0) e.state='idle';
      } else if(e.state==='swing'){
        e.stateT-=dt;
        if(e.stateT<=0){
          const pp=G.player;
          if(pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<e.r+1.0 && pp.rollT<=0 && !pp.invulnT) pp.hurt(1, a);
          e.state='idle'; e.atkCd=2.0+Math.random();
        }
      }
    } else {
      // 第二阶段（暴走）：速度×2.2，快速追击，快速近战
      const spd=e.baseSpd*2.2;
      if(d>0.8){ G.moveEntity(e, Math.cos(a)*spd*dt, Math.sin(a)*spd*dt); e.moving=true; }
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<e.r+1.0){ e.state='berserk_swing'; e.stateT=.25; G.audio.sfx('charge',{v:.25}); }
      if(e.state==='berserk_swing'){
        e.stateT-=dt;
        if(e.stateT<=0){
          const pp=G.player;
          if(pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<e.r+1.2 && pp.rollT<=0 && !pp.invulnT) pp.hurt(2, a);
          e.state='idle'; e.atkCd=.7+Math.random()*.3;
        }
      }
    }
  },
  /* PVZ 舞王僵尸：移动→停下跳舞→召唤2-3只伴舞僵尸(pvz_basic)→继续移动 */
  pvz_disco(e,dt,d,a,p){
    e.moving=false;
    if(e.state==='idle'){
      if(d>1.5){ G.moveEntity(e, Math.cos(a)*e.spd*dt, Math.sin(a)*e.spd*dt); e.moving=true; }
      e._danceT=(e._danceT||0)+dt;
      if(e._danceT>8+Math.random()*4){ e.state='dance'; e.stateT=2.0; e._danceT=0; G.audio.sfx('plasma',{v:.3}); }
      e.atkCd-=dt;
      if(d<e.r+.8 && e.atkCd<=0){ e.state='swing'; e.stateT=.35; }
    } else if(e.state==='dance'){
      e.stateT-=dt; e.targetFace=a;
      if(e.stateT<=0){
        e.state='summon'; e.stateT=.5;
        // 召唤 2-3 只伴舞僵尸（pvz_basic），在周围 2 格内
        const n=2+Math.floor(Math.random()*2);
        for(let i=0;i<n;i++){
          const ang=i/n*G.TAU+Math.random()*.5;
          const pos=E.nearbyLegalPos(e.x+Math.cos(ang)*1.8, e.z+Math.sin(ang)*1.8);
          if(pos){
            const minion=E.spawn('pvz_basic', pos.x, pos.z, false);
            minion.room=e.room;
            G.fx.poof(pos.x,.3,pos.z,0xc0a020);
          }
        }
        G.audio.sfx('spawn',{v:.5});
        G.fx.burst(e.x,.8,e.z,12,{color:0xc0a020,spd:2.5,life:.5,s0:.2});
      }
    } else if(e.state==='summon'){
      e.stateT-=dt; if(e.stateT<=0){ e.state='idle'; e.atkCd=1.5; }
    } else if(e.state==='swing'){
      e.stateT-=dt;
      if(e.stateT<=0){
        const pp=G.player;
        if(pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<e.r+1.0 && pp.rollT<=0 && !pp.invulnT) pp.hurt(1, a);
        e.state='idle'; e.atkCd=1.8+Math.random();
      }
    }
  },
  /* PVZ 气球僵尸：悬浮移动+忽略地面墙，气球破→掉落变普通僵尸 */
  pvz_balloon(e,dt,d,a,p){
    e.moving=false;
    if(e.armor>0){
      // 悬浮：直接设置位置（忽略墙体碰撞），但限制在房间边界内
      const spd=e.spd;
      const nx=e.x+Math.cos(a)*spd*dt, nz=e.z+Math.sin(a)*spd*dt;
      const t=G.tileAt(nx,nz);
      if(t && t.t!=='wall'){ e.x=nx; e.z=nz; }  // 只挡房间外墙，内部墙可飞过
      e.moving=true; e.targetFace=a;
      e.atkCd-=dt;
      if(d<e.r+.8 && e.atkCd<=0){ e.state='swing'; e.stateT=.35; }
    } else {
      // 气球破，落地变普通僵尸
      AI._pvzMelee(e,dt,d,a,1.8,1);
    }
    if(e.state==='swing'){
      e.stateT-=dt;
      if(e.stateT<=0){
        const pp=G.player;
        if(pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<e.r+1.0 && pp.rollT<=0 && !pp.invulnT) pp.hurt(1, a);
        e.state='idle'; e.atkCd=1.8+Math.random();
      }
    }
  },
  /* PVZ 僵尸通用近战 AI（缓慢追踪+接触攻击） */
  _pvzMelee(e,dt,d,a,cd,dmg){
    e.moving=false;
    if(e.state==='idle'){
      if(d>0.8){ G.moveEntity(e, Math.cos(a)*E.chaseSpd(e,d)*dt, Math.sin(a)*E.chaseSpd(e,d)*dt); e.moving=true; }
      e.atkCd-=dt;
      if(e.atkCd<=0 && d<e.r+0.9){ e.state='swing'; e.stateT=.4; }
    } else if(e.state==='swing'){
      e.stateT-=dt;
      if(e.stateT<=0){
        const pp=G.player;
        if(pp && !pp.dead && G.dist(e.x,e.z,pp.x,pp.z)<e.r+1.1 && pp.rollT<=0 && !pp.invulnT) pp.hurt(dmg, a);
        e.state='idle'; e.atkCd=cd+Math.random()*.5;
      }
    }
  },
};

G.enemies = E;
G.hurtEnemy = (e,dmg,ang,knock,ignoreBlock)=> E.hurt(e,dmg,ang,knock,ignoreBlock);
})();
