/* 第九层事故 - 场景构建：地板/墙体/门/道具/装饰/双主题灯光 */
'use strict';
(function(){
const GB = G.GeoBuilder;
const B = {};
const _cache = {};
let _flameMat=null;
function pgeo(key, fn){
  if(!_cache[key]){ const b=new GB(); fn(b); _cache[key]=b.build(); }
  return _cache[key];
}
function NM(geo, mat){ const m=new THREE.Mesh(geo, mat||G.vcolMat); m.castShadow=true; m.receiveShadow=true; return m; }

/* 主题 */
B.themes = {
  1: {
    name:'石壁地牢',
    floorA:0x6e5a3c, floorB:0x625034, floorSpec:0x52422a,
    wall:0x453524, wallTop:0x544230, wallTrim:0x2e2318,
    fog:0x120b06, fogNear:10, fogFar:22,
    ambient:0x6a5648, ambientI:.42, hemiSky:0x6a5a48, hemiGround:0x241812, hemiI:.34,
    dir:0xffd0a0, dirI:.5,
    torch:0xffa040, torchI:1.3, flame:'flame',
    banner:0x8a2a1e,
  },
  2: {
    name:'腐蚀深渊',
    floorA:0x3c4c48, floorB:0x344440, floorSpec:0x2c3a38,
    wall:0x2e2640, wallTop:0x3a3050, wallTrim:0x201a2e,
    fog:0x080e14, fogNear:10.5, fogFar:22,
    ambient:0x3a4a5a, ambientI:.66, hemiSky:0x3a5a6a, hemiGround:0x141020, hemiI:.55,
    dir:0x8ab8d8, dirI:.62,
    torch:0x50e0ff, torchI:1.05, flame:'soft',
    banner:0x5a2a6a,
  },
  3: {
    name:'虚空王座',
    floorA:0x241a38, floorB:0x1e1530, floorSpec:0x16102a,
    wall:0x2a1840, wallTop:0x362052, wallTrim:0x140b20,
    fog:0x0a0614, fogNear:10, fogFar:21,
    ambient:0x4a3a6a, ambientI:.6, hemiSky:0x5a4a8a, hemiGround:0x120a1e, hemiI:.5,
    dir:0x9a7aff, dirI:.55,
    torch:0xa060ff, torchI:1.0, flame:'void',
    banner:0x4a2a8a,
  },
  /* 第 5 层「异常回廊」：规则失控的世界——故障绿×异常紫，数字噪声感
     （比第 4 层更刺眼的对比：暗绿黑底 + 高饱和故障色能量） */
  5: {
    name:'异常回廊',
    floorA:0x16201c, floorB:0x121a17, floorSpec:0x0d1412,
    wall:0x1e2a24, wallTop:0x2a3a30, wallTrim:0x0c120e,
    fog:0x040a07, fogNear:10, fogFar:20,
    ambient:0x3a5a48, ambientI:.62, hemiSky:0x3a6a50, hemiGround:0x0c1410, hemiI:.52,
    dir:0x50ff90, dirI:.5,
    torch:0x50ff90, torchI:1.15, flame:'soft',
    banner:0x0a8a4a,
  },
  /* 第 4 层「失序维度」：失控异次元实验设施 + 浮空废墟——
     黑色空间 + 高亮能量元素的强对比（深渊青/虚空紫双能量色） */
  4: {
    name:'失序维度',
    floorA:0x1c1830, floorB:0x181426, floorSpec:0x120e20,
    wall:0x221a3c, wallTop:0x2e2450, wallTrim:0x100a1e,
    fog:0x05030e, fogNear:10, fogFar:20,
    ambient:0x3a4a7a, ambientI:.62, hemiSky:0x3a4a8a, hemiGround:0x0c0818, hemiI:.52,
    dir:0x8ab8ff, dirI:.6,
    torch:0x50d8ff, torchI:1.15, flame:'soft',
    banner:0x3a2a7a,
    edge:0x40e0ff, edge2:0x9a5cff,   // 地板边缘能量描边（青/紫交替）
  },
};

/* 文本精灵（UI 独立高分辨率画布 + 黑色描边：世界低分辨率渲染 + 文字高分辨率分层，320p 下仍清晰可读） */
function textSprite(text, color, scale){
  const cv=document.createElement('canvas'); cv.width=256; cv.height=64;
  const ctx=cv.getContext('2d');
  ctx.font='bold 34px Consolas, monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(text).width;
  ctx.fillStyle='rgba(0,0,0,.62)';
  ctx.fillRect(128-w/2-6,4,w+12,56);
  ctx.lineWidth=6; ctx.strokeStyle='rgba(0,0,0,.92)';
  ctx.strokeText(text,128,34);
  ctx.fillStyle=color; ctx.fillText(text,128,34);
  const tx=new THREE.CanvasTexture(cv); tx.magFilter=THREE.NearestFilter;
  tx.disposableTx=true;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx, transparent:true, depthWrite:false, depthTest:false}));
  const s=scale||1;
  sp.scale.set(s, s*64/256, 1);
  sp.renderOrder=900;
  return sp;
}
B.textSprite = textSprite;

/* 图标精灵（商店物品） */
function iconSprite(kind, colorHex){
  const cv=document.createElement('canvas'); cv.width=40; cv.height=40;
  const ctx=cv.getContext('2d');
  ctx.strokeStyle=colorHex; ctx.fillStyle=colorHex; ctx.lineWidth=3;
  switch(kind){
    case 'heart':
      ctx.beginPath(); ctx.arc(13,14,7,0,G.TAU); ctx.arc(27,14,7,0,G.TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6,17); ctx.lineTo(20,34); ctx.lineTo(34,17); ctx.fill(); break;
    case 'key':
      ctx.beginPath(); ctx.arc(13,13,7,0,G.TAU); ctx.stroke();
      ctx.fillRect(17,11,17,4); ctx.fillRect(26,15,4,7); ctx.fillRect(32,15,4,7); break;
    case 'weapon':
      ctx.fillRect(4,16,26,7); ctx.fillRect(8,22,6,10); ctx.fillRect(28,13,8,4); break;
    case 'item':
      ctx.beginPath(); ctx.arc(20,20,12,0,G.TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(20,20,5,0,G.TAU); ctx.fill(); break;
    case 'active':
      ctx.beginPath(); ctx.moveTo(20,5); ctx.lineTo(34,20); ctx.lineTo(20,35); ctx.lineTo(6,20); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(20,20,4,0,G.TAU); ctx.fill(); break;
  }
  const tx=new THREE.CanvasTexture(cv); tx.magFilter=THREE.NearestFilter;
  tx.disposableTx=true;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx, transparent:true, depthWrite:false}));
  sp.scale.set(.78,.78,1);
  return sp;
}

/* ---------- 道具工厂 ---------- */
const PROP = B.props = {
  table(th){ // 木桌（第 2 层金属加固 / 第 3 层黑曜石）
    const g=new THREE.Group();
    g.add(NM(pgeo('table'+(th===2?'2':(th===3?'3':'')), b=>{
      const c=th===2?0x4a5560:(th===3?0x2a2044:0x7a5a34);
      b.box(0,.52,0,1.1,.09,.8,c);
      b.box(-.45,.26,-.3,.1,.5,.1,c); b.box(.45,.26,-.3,.1,.5,.1,c);
      b.box(-.45,.26,.3,.1,.5,.1,c); b.box(.45,.26,.3,.1,.5,.1,c);
      if(th===2){ b.box(0,.58,-.35,1.1,.05,.1,0x6a7480); b.box(0,.58,.35,1.1,.05,.1,0x6a7480); }
      if(th===3){ b.box(0,.58,0,1.12,.03,.1,0x8a5cff); }
    })));
    return g;
  },
  barrel(){ 
    const g=new THREE.Group();
    g.add(NM(pgeo('barrel', b=>{
      b.cyl(0,.34,0,.3,.34,.68,0x9a3226,8);
      b.cyl(0,.16,0,.315,.315,.08,0x40241c,8);
      b.cyl(0,.52,0,.315,.315,.08,0x40241c,8);
      b.cyl(0,.71,0,.18,.24,.1,0x30201a,8);
      b.box(0,.76,0,.1,.06,.1,0x181818);
    })));
    return g;
  },
  pot(){
    const g=new THREE.Group();
    g.add(NM(pgeo('pot', b=>{
      b.cyl(0,.2,0,.2,.26,.4,0xa08058,7);
      b.cyl(0,.42,0,.26,.2,.1,0x8a6c48,7);
      b.box(0,.1,.19,.08,.12,.08,0x8a6c48);
    })));
    return g;
  },
  pillar(th){
    const g=new THREE.Group();
    g.add(NM(pgeo('pillar'+th, b=>{
      if(th===1){
        b.box(0,.12,0,.9,.24,.9,0x6a5238); b.box(0,.9,0,.68,1.3,.68,0x5c4630);
        b.box(0,1.62,0,.9,.24,.9,0x6a5238);
        b.box(0,1.0,.34,.72,.3,.06,0x4a3826); b.box(0,1.0,-.34,.72,.3,.06,0x4a3826);
      } else if(th===3){
        // 虚空王座：黑曜石柱 + 紫晶尖
        b.box(0,.12,0,.9,.24,.9,0x1c1330); b.box(0,.9,0,.66,1.3,.66,0x241a40);
        b.box(0,1.62,0,.9,.24,.9,0x1c1330);
        b.cone(0,1.2,0,.14,.4,0xa060ff,5); b.cone(.3,1.0,.12,.1,.24,0x8a5cff,4); b.cone(-.28,1.02,-.14,.1,.24,0x8a5cff,4);
      } else {
        b.box(0,.12,0,.9,.24,.9,0x3a3050); b.cyl(0,.85,0,.3,.36,1.35,0x342c48,7);
        b.box(0,1.6,0,.9,.24,.9,0x3a3050);
        b.cone(0,1.15,.34,.14,.3,0x60e8ff,5); b.cone(.3,1.0,.1,.1,.22,0x60e8ff,4); b.cone(-.28,1.05,-.12,.1,.2,0x60e8ff,4);
      }
    })));
    return g;
  },
  chest(tier){
    const g=new THREE.Group();
    const col = tier==='green'?0x3a7a4a:(tier==='red'?0x8a2a2a:0x7a5230);
    const body=NM(pgeo('chestBody_'+tier, b=>{
      b.box(0,.3,0,.9,.6,.6,col);
      b.box(0,.06,0,1.0,.12,.7,0x4a3826);
      b.box(0,.3,.31,.2,.5,.05,0xd8a830);
    }));
    const lid=NM(pgeo('chestLid_'+tier, b=>{
      b.box(0,.08,0,.94,.16,.64,col);
      b.box(0,.2,0,.94,.12,.64,0x4a3826);
      b.box(0,.1,.33,.2,.2,.05,0xd8a830);
      if(tier==='red'){ b.sph(0,.2,0,.07,0xff3030,5); }
    }));
    lid.position.set(0,.6,-.3);
    g.add(body); g.add(lid);
    g.userData.lid=lid;
    return g;
  },
  pedestal(kind, colorHex){
    const g=new THREE.Group();
    g.add(NM(pgeo('pedestal', b=>{
      b.box(0,.1,0,.66,.2,.66,0x5c5c68); b.cyl(0,.4,0,.2,.26,.4,0x4c4c58,6);
      b.box(0,.64,0,.56,.14,.56,0x6a6a78);
    })));
    const icon=iconSprite(kind, colorHex);
    icon.position.y=1.0; g.add(icon);
    const beam=new THREE.Mesh(G.cylGeo(.22,.22,.9,8), new THREE.MeshBasicMaterial({color:parseInt(colorHex.slice(1),16), transparent:true, opacity:.14, depthWrite:false}));
    beam.position.y=.95; g.add(beam);
    g.userData.icon=icon;
    return g;
  },
  shopkeeper(){
    const g=new THREE.Group();
    g.add(NM(pgeo('shopkeep', b=>{
      b.box(0,.5,0,.56,.6,.44,0x6a5a3a);
      b.box(0,.42,.24,.5,.56,.08,0xd8d0c0);
      b.box(0,.34,.26,.3,.1,.1,0xd8a830);
      b.box(0,.9,0,.4,.34,.36,0x5a8a44);
      b.box(0,.9,.2,.3,.08,.04,0x38302a);
      b.box(-.08,.95,.19,.06,.05,.03,0x101010); b.box(.08,.95,.19,.06,.05,.03,0x101010);
      b.box(0,.83,.2,.24,.05,.03,0xd8d8d8);
      b.box(0,1.12,0,.44,.1,.38,0x8a6a3a);
      b.box(-.26,.05,.3,.1,.34,.1,0x7a5a3a); b.box(.26,.05,.3,.1,.34,.1,0x7a5a3a);
    })));
    return g;
  },
  counter(){
    const g=new THREE.Group();
    g.add(NM(pgeo('counter', b=>{
      b.box(0,.5,0,2.6,1.0,.7,0x6a4c2e);
      b.box(0,1.02,0,2.8,.1,.85,0x7a5a38);
      b.box(-1.1,.9,.42,.5,.3,.4,0x8a6a44); b.box(1.2,1.2,.3,.24,.5,.24,0x9a3226);
    })));
    return g;
  },
  exitHatch(){
    const g=new THREE.Group();
    g.add(NM(pgeo('hatch', b=>{
      b.box(0,.05,0,1.8,.1,1.8,0x4a4038);
      b.box(0,.1,-.95,2.0,.2,.2,0x5a5048); b.box(0,.1,.95,2.0,.2,.2,0x5a5048);
      b.box(-.95,.1,0,.2,.2,2.0,0x5a5048); b.box(.95,.1,0,.2,.2,2.0,0x5a5048);
      b.box(0,.35,0,.6,.5,.08,0x6a5a48);
      b.box(0,.6,0,1.0,.3,.14,0x8a2a1e);
      b.box(-.2,.35,0,.1,.4,.1,0x8a7a5a); b.box(.2,.35,0,.1,.4,.1,0x8a7a5a);
    })));
    const hole=new THREE.Mesh(G.boxGeo(1.4,.02,1.4), G.bmat(0x080604));
    hole.position.y=.11; g.add(hole);
    const glow=new THREE.Sprite(G.pmat(0xffb050)); glow.scale.set(2.4,2.4,1); glow.position.y=.7; g.add(glow);
    // 体积光柱：出口上方金色光束，远距离可见的下行导引
    const beam=new THREE.Mesh(G.cylGeo(.55,.95,4.2,10,1),
      new THREE.MeshBasicMaterial({color:0xffb050, transparent:true, opacity:.13, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
    beam.position.y=2.2; g.add(beam);
    g.userData.beam=beam;
    return g;
  },
  shrine(){
    const g=new THREE.Group();
    g.add(NM(pgeo('shrine', b=>{
      b.box(0,.2,0,1.2,.4,.9,0x4c4452);
      b.box(0,.5,0,.8,.3,.6,0x5c5262);
      b.cone(0,.75,0,.16,.3,0xc03050,5);
      b.cyl(-.5,.5,.3,.05,.05,.5,0xd8d0c0,5); b.cyl(.5,.5,.3,.05,.05,.5,0xd8d0c0,5);
      b.sph(-.5,.8,.3,.05,0xffb050,4); b.sph(.5,.8,.3,.05,0xffb050,4);
    })));
    const gem=new THREE.Mesh(G.coneGeo(.16,.3,5), G.bmat(0xff5070));
    gem.position.y=.78; g.add(gem); g.userData.gem=gem;
    return g;
  },
  /* 武器展示架：柜台两侧陈列发光枪模（几何按品阶缓存；枪模缓转+辉光呼吸在 B.update） */
  wrack(def, tierColor){
    const g=new THREE.Group();
    g.add(NM(pgeo('wrackBase', b=>{
      b.box(0,.12,0,.72,.24,.5,0x4c4034);
      b.box(0,.3,0,.6,.14,.42,0x5c4c3a);
      b.box(0,.62,0,.68,.08,.46,0x6a5638);
      b.box(-.2,.36,.2,.08,.3,.06,0x3a3028); b.box(.2,.36,.2,.08,.3,.06,0x3a3028);
    })));
    const gun=NM(pgeo('wrackGun_'+def.tier, b=>{
      b.box(0,.86,.02,.5,.1,.08,0x23262c);
      b.box(.16,.86,.02,.22,.06,.06,0x23262c);
      b.box(-.06,.86,.02,.1,.14,.1,tierColor);        // 品阶色能量核心
      b.box(-.18,.86,.02,.05,.06,.06,0xe8c15a);       // 金口
      b.box(.02,.93,.02,.2,.03,.05,0xe8c15a);
    }));
    const glow=new THREE.Sprite(G.pmat(tierColor)); glow.scale.set(.7,.7,1); glow.position.y=.86; g.add(glow);
    const beam=new THREE.Mesh(G.cylGeo(.16,.2,.7,8),
      new THREE.MeshBasicMaterial({color:tierColor, transparent:true, opacity:.10, depthWrite:false}));
    beam.position.y=.55; g.add(beam);
    g.add(gun);
    g.userData.gun=gun; g.userData.glow=glow;
    return g;
  },
  gamble(){
    const g=new THREE.Group();
    g.add(NM(pgeo('gamble', b=>{
      b.box(0,.6,0,1.4,.12,1.0,0x2a4028);
      b.box(-.6,.3,-.4,.12,.6,.12,0x1e3220); b.box(.6,.3,-.4,.12,.6,.12,0x1e3220);
      b.box(-.6,.3,.4,.12,.6,.12,0x1e3220); b.box(.6,.3,.4,.12,.6,.12,0x1e3220);
      b.box(-.2,.75,0,.3,.3,.3,0xf0ead8);
      b.box(-.32,.75,-.06,.06,.3,.3,0xd02020); b.box(-.2,.86,-.06,.3,.06,.3,0xd02020);
      b.box(.35,.7,.1,.26,.02,.36,0xf0ead8); b.box(.35,.72,-.08,.26,.02,.36,0xf0ead8);
    })));
    return g;
  },
  throne(){
    const g=new THREE.Group();
    g.add(NM(pgeo('throne', b=>{
      b.box(0,.5,0,1.1,1.0,.3,0x3a3030);
      b.box(0,1.3,-.1,1.3,1.6,.25,0x4a2020);
      b.box(-.6,1.0,0,.2,1.0,.3,0x5a2828); b.box(.6,1.0,0,.2,1.0,.3,0x5a2828);
      b.box(0,.2,.4,.8,.4,.5,0x302828);
      b.sph(-.45,.25,.5,.14,0xd8d0c0,5); b.sph(.45,.25,.5,.14,0xd8d0c0,5); b.sph(0,.55,.5,.11,0xd8d0c0,5);
      b.cone(0,1.7,-.1,.09,.4,0xd8a830,4);
    })));
    return g;
  },
  campfire(){
    const g=new THREE.Group();
    g.add(NM(pgeo('campfire', b=>{
      b.box(-.15,.08,0,.5,.12,.14,0x5a4028,0.5); b.box(.15,.08,0,.5,.12,.14,0x5a4028,-0.4);
      b.cyl(0,.03,0,.32,.36,.06,0x504540,7);
    })));
    if(!_flameMat) _flameMat=new THREE.SpriteMaterial({map:G.tex('flame'),transparent:true,depthWrite:false});
    const fl=new THREE.Sprite(_flameMat);
    fl.scale.set(.8,.9,1); fl.position.y=.45; g.add(fl); g.userData.flame=fl;
    return g;
  },
  npc(){
    const g=new THREE.Group();
    g.add(NM(pgeo('npc_traveler', b=>{
      b.cone(0,.55,0,.4,1.1,0x5a5060);
      b.cone(0,1.1,0,.26,.44,0x453e50);
      b.box(-.07,1.14,.17,.05,.07,.04,0x60e8c0); b.box(.07,1.14,.17,.05,.07,.04,0x60e8c0);
      b.cyl(.3,.6,.1,.03,.03,.9,0x7a6a50,5); b.sph(.3,.95,.1,.08,0xffc060,5);
    })));
    return g;
  },
  bonus(){
    const g=new THREE.Group();
    g.add(NM(pgeo('bonusChest', b=>{
      b.box(0,.2,0,.55,.4,.45,0x6a7a4a);
      b.box(0,.44,0,.6,.12,.5,0x4a5a30);
      b.box(0,.24,.24,.12,.16,.04,0xd8a830);
    })));
    return g;
  },
  /* ---- 第 4 层「失序维度」专属道具 ---- */
  voidcore(boss){ // 环形场/竞技场中央能量核：悬浮水晶 + 符文环 + 光柱（绕行焦点）
    const g=new THREE.Group();
    g.add(NM(pgeo('voidcore'+(boss?'_b':''), b=>{
      // 基座：三层碎裂圆台
      b.cyl(0,.1,0,1.5,1.7,.2,0x1c1430,10);
      b.cyl(0,.28,0,1.1,1.35,.18,0x241a3e,10);
      b.cyl(0,.44,0,.7,.9,.16,0x2c2248,10);
      // 悬浮主水晶（上大下小双锥）
      b.cone(0,1.5,0,.5,.9,boss?0xc060ff:0x50d8ff,6);
      b.cone(0,.9,0,.5,.6,boss?0x8a3adf:0x30a8d8,6);
      // 环绕小晶（4 颗）
      for(let i=0;i<4;i++){ const a=i/4*G.TAU+.4;
        b.cone(Math.cos(a)*1.15,.75,Math.sin(a)*1.15,.14,.4,boss?0x9a4ae0:0x60c8f0,4); }
      // 基座符文刻线
      b.cyl(0,.5,0,.78,.78,.03,boss?0x6a2ac0:0x2a90c0,10);
    })));
    // 能量光柱（体积光）
    const beam=new THREE.Mesh(G.cylGeo(.5,.9,5.2,10,1),
      new THREE.MeshBasicMaterial({color:boss?0xa050ff:0x40c8ff, transparent:true, opacity:.12, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
    beam.position.y=2.8; g.add(beam);
    const glow=new THREE.Sprite(G.pmat(boss?0x9a4ae0:0x40c8f0)); glow.scale.set(2.6,2.6,1); glow.position.y=1.3; g.add(glow);
    g.userData.beam=beam; g.userData.glow=glow;
    return g;
  },
  highpad(){ // 多层高台：台阶基座 + 高台顶 + 边缘能量描边（视觉高度差，挡路挡弹）
    const g=new THREE.Group();
    g.add(NM(pgeo('highpad', b=>{
      b.box(0,.18,0,2.4,.36,2.0,0x1a142e);              // 底层
      b.box(0,.5,0,2.0,.34,1.6,0x221a3c);               // 中层
      b.box(0,.82,0,1.6,.36,1.2,0x2c2248);              // 高台顶
      // 顶面能量描边
      b.box(0,1.02,.55,1.6,.05,.08,0x50d8ff); b.box(0,1.02,-.55,1.6,.05,.08,0x50d8ff);
      b.box(.75,1.02,0,.08,.05,1.2,0x50d8ff); b.box(-.75,1.02,0,.08,.05,1.2,0x50d8ff);
      // 侧面符文刻线
      b.box(0,.5,.82,1.6,.06,.04,0x9a5cff);
      // 立柱装饰
      b.box(-1.0,.3,.85,.18,.6,.18,0x241a3e); b.box(1.0,.3,.85,.18,.6,.18,0x241a3e);
    })));
    return g;
  },
  brokencol(){ // 断裂柱：下半截直立 + 上半截斜倒 + 散落碎块（空间崩坏叙事）
    const g=new THREE.Group();
    g.add(NM(pgeo('brokencol', b=>{
      b.box(0,.1,0,.9,.2,.9,0x241a3e);                            // 基座
      b.cyl(0,.7,0,.26,.32,1.1,0x2c2248,7);                       // 下半截
      b.box(0,1.22,0,.5,.12,.5,0x1a142e);                         // 断口
      b.cyl(.9,.32,.4,.24,.28,1.0,0x282040,7, 0,0,.9);            // 斜倒上半截
      b.box(.2,.08,.7,.3,.12,.26,0x1c1632); b.box(-.5,.06,.5,.22,.1,.2,0x201a38); // 碎块
      b.box(.1,1.1,.2,.1,.16,.1,0x9a5cff);                        // 断口能量渗出
    })));
    return g;
  },
  coredevice(){ // 中央核心装置（出生房视觉焦点）：大圆台 + 呼吸水晶 + 旋转符文环 + 光柱
    const g=new THREE.Group();
    g.add(NM(pgeo('coredevice', b=>{
      b.cyl(0,.15,0,2.6,3.0,.3,0x181228,12);
      b.cyl(0,.42,0,1.9,2.3,.26,0x201838,12);
      b.cyl(0,.66,0,1.2,1.5,.24,0x282048,12);
      // 四角符文柱
      for(let i=0;i<4;i++){ const a=i/4*G.TAU+G.TAU/8;
        b.box(Math.cos(a)*2.3,.8,Math.sin(a)*2.3,.34,1.3,.34,0x2c2248);
        b.box(Math.cos(a)*2.3,1.5,Math.sin(a)*2.3,.4,.12,.4,0x50d8ff); }
      // 中央悬浮大水晶
      b.cone(0,2.3,0,.7,1.3,0x50d8ff,6);
      b.cone(0,1.4,0,.7,.9,0x30a8d8,6);
      b.cyl(0,.78,0,.9,.9,.04,0x40c8f0,10);
    })));
    // 旋转符文环（B.update 驱动）
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.7,.08,6,40),
      new THREE.MeshBasicMaterial({color:0x60d8ff, transparent:true, opacity:.85}));
    ring.rotation.x=Math.PI/2.3; ring.position.y=1.9;
    ring.geometry.userData.disposable=true;
    g.add(ring); g.userData.ring=ring;
    const beam=new THREE.Mesh(G.cylGeo(.7,1.3,7,12,1),
      new THREE.MeshBasicMaterial({color:0x50d8ff, transparent:true, opacity:.10, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
    beam.position.y=4.2; g.add(beam);
    const glow=new THREE.Sprite(G.pmat(0x50c8f0)); glow.scale.set(4.2,4.2,1); glow.position.y=2.0; g.add(glow);
    g.userData.glow=glow;
    return g;
  },
  foldgate(toName){ // 空间折叠门：双柱门框 + 能量旋涡面 + 地面符文圈 + 去向标牌
    const g=new THREE.Group();
    g.add(NM(pgeo('foldgate', b=>{
      b.box(-.8,.9,0,.24,1.8,.3,0x2c2248); b.box(.8,.9,0,.24,1.8,.3,0x2c2248);   // 双柱
      b.box(0,1.85,0,1.9,.24,.34,0x241a3e);                                       // 顶梁
      b.box(-.8,1.9,0,.3,.1,.36,0x9a5cff); b.box(.8,1.9,0,.3,.1,.36,0x9a5cff);    // 柱头能量
      b.box(0,.06,0,2.0,.12,.5,0x1a142e);                                          // 门槛
    })));
    // 能量旋涡面（半透明发光，B.update 呼吸）
    const veil=new THREE.Mesh(new THREE.PlaneGeometry(1.36,1.66),
      new THREE.MeshBasicMaterial({color:0x8a5cff, transparent:true, opacity:.32, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
    veil.position.y=.95; veil.geometry.userData.disposable=true;
    g.add(veil); g.userData.veil=veil;
    // 地面符文圈
    const circle=new THREE.Mesh(new THREE.RingGeometry(.7,1.0,24),
      new THREE.MeshBasicMaterial({color:0x9a5cff, transparent:true, opacity:.55, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending}));
    circle.rotation.x=-Math.PI/2; circle.position.y=.04; circle.geometry.userData.disposable=true;
    g.add(circle);
    // 去向标牌（可理解的传送：告诉玩家通往哪个方向）
    const tag=textSprite('折跃 → '+toName, '#c8a8ff', 2.2);
    tag.position.set(0,2.5,0); g.add(tag);
    return g;
  },
  riftanchor(){ // 裂缝锚点：悬浮紫晶簇 + 裂缝光环（交互撕开隐藏通路）
    const g=new THREE.Group();
    g.add(NM(pgeo('riftanchor', b=>{
      b.box(0,.08,0,.8,.16,.8,0x1a142e);                       // 基盘
      b.cone(0,.7,0,.3,1.0,0x8a3adf,5);                        // 主晶
      b.cone(.35,.4,.2,.14,.5,0x6a2ac0,4); b.cone(-.3,.35,-.15,.12,.45,0x9a4ae0,4);
      b.cone(.1,.3,-.32,.1,.35,0x5a1ab0,4);
    })));
    const glow=new THREE.Sprite(G.pmat(0x9a4ae0)); glow.scale.set(1.5,1.5,1); glow.position.y=.8; g.add(glow);
    const circle=new THREE.Mesh(new THREE.RingGeometry(.5,.72,20),
      new THREE.MeshBasicMaterial({color:0x9a5cff, transparent:true, opacity:.5, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending}));
    circle.rotation.x=-Math.PI/2; circle.position.y=.03; circle.geometry.userData.disposable=true;
    g.add(circle); g.userData.circle=circle;
    return g;
  },
};

/* ---------- 主构建 ---------- */
B.buildFloor = function(floor){
  // 清理旧世界
  const world=G.world;
  while(world.children.length){
    const c=world.children.pop();
    c.traverse(o=>{
      if(o.geometry && o.geometry.userData && o.geometry.userData.disposable && typeof o.geometry.dispose==='function') o.geometry.dispose();
      if(o.material && o.material.map && o.material.map.disposableTx && typeof o.material.map.dispose==='function') o.material.map.dispose();
    });
  }
  G.props.length=0;
  // 清理基地/标题残留的 HTML 世界标签层（tagLayer 是 DOM，不在 world 里，需单独清；
  // 否则基地文字会穿模叠加到地牢画面上）
  if(G.base && G.base._clearTags) G.base._clearTags();
  // 第 4 层动画引用重置（旧世界 mesh 已随上方清空移除，数组重新开始收集）
  this._f4Ruins=null; this._f4Floats=null;
  const th = this.themes[floor.num];
  this.theme=th;
  const rng = floor.rng || G.rng;

  // 灯光/雾
  const sc=G.scene;
  if(sc.fog) sc.fog.dispose&&sc.fog.dispose();
  sc.fog=new THREE.Fog(th.fog, th.fogNear, th.fogFar);
  sc.background=new THREE.Color(th.fog);
  G.lights.ambient.color.set(th.ambient); G.lights.ambient.intensity=th.ambientI;
  G.lights.hemi.color.set(th.hemiSky); G.lights.hemi.groundColor.set(th.hemiGround); G.lights.hemi.intensity=th.hemiI;
  G.lights.dir.color.set(th.dir); G.lights.dir.intensity=th.dirI;

  /* 地板 */
  const fb=new GB(), wb=new GB();
  const floorCol=(room,x,z)=>{
    let c = ((x+z)%2===0)? th.floorA : th.floorB;
    if(room){
      if(room.type==='shop') c=((x+z)%2===0)?0x7a5a38:0x6a4c2e;
      if(room.type==='treasure') c=((x+z)%2===0)?0x8a7440:0x7a6636;
      if(room.type==='boss') c=((x+z)%2===0)?0x40303a:0x382832;
      if(room.type==='secret') c=((x+z)%2===0)?0x4a3a58:0x403250;
      if(room.type==='exit') c=((x+z)%2===0)?0x6a6058:0x5c544c;
      if(room.type==='npc') c=((x+z)%2===0)?0x7a6a50:0x6e5e46;
    }
    const v=rng.int(-6,6);
    return G.clamp(c+v*0x010101,0,0xffffff);
  };
  const wallTiles=[], floorTiles=[];
  for(const tile of floor.tiles.values()){
    if(tile.t==='floor') floorTiles.push(tile);
    else if(tile.t==='wall'){ if(tile.secret) continue; wallTiles.push(tile); }
  }
  for(const tile of floorTiles){
    fb.planeXZ(tile.x+.5, 0, tile.z+.5, 1,1, floorCol(tile.room, tile.x, tile.z));
  }
  // 房间中央花纹
  for(const room of floor.rooms){
    if(room.type==='boss'){
      const cx=room.cx, cz=room.cz;
      if(floor.num===4){
        // 第 4 层竞技场：同心符文环（贴合椭圆竞技场，不再用矩形花纹）
        fb.cyl(cx,0.012,cz,3.6,3.6,.02,0x1e1636,20);
        fb.cyl(cx,0.024,cz,2.4,2.4,.02,0x2a1e48,16);
        fb.cyl(cx,0.036,cz,1.0,1.0,.02,0x3a2a6a,12);
      } else {
        fb.planeXZ(cx,0.012,cz,4.4,3.2,0x503040);
        fb.planeXZ(cx,0.024,cz,3.0,2.0,0x603a4a);
        fb.planeXZ(cx,0.036,cz,1.2,0.8,0x8a4a5a);
      }
    } else if(room.type==='shop'){
      fb.planeXZ(room.cx,0.012,room.cz, (room.x1-room.x0-1), 2.2, 0x5c3e2a);
    } else if(room.type==='treasure'){
      fb.planeXZ(room.cx,0.012,room.cz, 3.2,3.2, 0x6a5a34);
    } else if(floor.num===4 && room.type==='start'){
      // 第 4 层核心房：地面大符文环（核心装置视觉基座）
      fb.cyl(room.cx,0.012,room.cz,3.4,3.4,.02,0x16203a,20);
      fb.cyl(room.cx,0.02,room.cz,2.9,2.9,.02,0x1a2a4a,18);
    }
  }
  const floorMesh=new THREE.Mesh(fb.build(), G.vcolFloorMat); floorMesh.receiveShadow=true; floorMesh.geometry.userData.disposable=true;
  world.add(floorMesh);

  /* 墙体（第 4 层「失序维度」分支：不渲染高墙——房间是悬浮平台，边界靠地板能量描边
     与深渊表达；wall tile 碰撞不变。前三层：1.35 高墙 + 顶盖 + 踢脚） */
  const isF4 = floor.num===4;
  if(isF4){
    /* 地板边缘能量描边：沿 floor / 非floor（wall 或虚空）边界画发光薄条（青/紫交替） */
    const eb=new GB();
    for(const tile of floorTiles){
      const x=tile.x, z=tile.z;
      const eg=((x+z)%2===0)? th.edge : th.edge2;
      const tAt=(dx,dz)=>floor.tilesGet(x+dx,z+dz);
      if(!tAt(0,-1) || tAt(0,-1).t!=='floor') eb.box(x+.5,.03,z+.06,1.0,.05,.14, eg);   // 北边
      if(!tAt(0, 1) || tAt(0, 1).t!=='floor') eb.box(x+.5,.03,z+.94,1.0,.05,.14, eg);   // 南边
      if(!tAt(-1,0) || tAt(-1,0).t!=='floor') eb.box(x+.06,.03,z+.5,.14,.05,1.0, eg);   // 西边
      if(!tAt(1, 0) || tAt(1, 0).t!=='floor') eb.box(x+.94,.03,z+.5,.14,.05,1.0, eg);   // 东边
    }
    const edgeMesh=new THREE.Mesh(eb.build(), G.vcolBMat);   // 无光照发光（Basic 顶点色）
    edgeMesh.geometry.userData.disposable=true;
    world.add(edgeMesh);
    /* 深渊底部：全图大平面（近黑泛紫，房间悬浮其上） */
    const abyss=new THREE.Mesh(new THREE.PlaneGeometry(340,300),
      new THREE.MeshBasicMaterial({color:0x070412}));
    abyss.rotation.x=-Math.PI/2; abyss.position.set(30,-2.6,25);
    abyss.geometry.userData.disposable=true;
    world.add(abyss);
    /* 远景浮空废墟剪影：暗色大块悬浮在房间外虚空（慢速自转，B.update 驱动） */
    const ruins=new THREE.Group();
    const ruinRng=new G.RNG((floor.rng?floor.rng.next():12345)^0xf4);
    for(let i=0;i<22;i++){
      const b=new GB();
      const w=1.5+ruinRng.f()*3.5, h=1+ruinRng.f()*4, d=1.5+ruinRng.f()*3;
      const shade=0x0e0a1c+((ruinRng.f()*3)|0)*0x020208;
      b.box(0,0,0,w,h,d,shade);
      if(ruinRng.chance(.5)) b.box(w*.3,h*.6,0,w*.5,h*.5,d*.5,shade+0x040410);
      const m=new THREE.Mesh(b.build(), G.vcolMat);
      m.geometry.userData.disposable=true;
      // 撒在地图外圈虚空（避开房间密集中心区）
      const ang=ruinRng.f()*G.TAU, rr=46+ruinRng.f()*36;
      m.position.set(30+Math.cos(ang)*rr, -1+ruinRng.f()*6, 25+Math.sin(ang)*rr*.7);
      m.rotation.y=ruinRng.f()*G.TAU;
      m.userData.spin=(ruinRng.f()-.5)*.14;
      m.userData.baseY=m.position.y; m.userData.bobP=ruinRng.f()*G.TAU;
      ruins.add(m);
    }
    world.add(ruins);
    this._f4Ruins=ruins;
  } else {
    for(const tile of wallTiles){
      const v=rng.int(-5,5);
      const c=G.clamp(th.wall+v*0x010101,0,0xffffff);
      const h = 1.35 + ((tile.x*7+tile.z*13)%3)*0.04;
      wb.box(tile.x+.5, h/2, tile.z+.5, 1.0, h, 1.0, c);
      wb.box(tile.x+.5, h+.03, tile.z+.5, 1.04, .1, 1.04, G.clamp(th.wallTop+v*0x010101,0,0xffffff));
      // 底部踢脚
      wb.box(tile.x+.5, .06, tile.z+.5, 1.0, .12, 1.0, th.wallTrim);
    }
  }
  const wallMesh=wb.buildMesh(); wallMesh.castShadow=true; wallMesh.receiveShadow=true;
  if(wallMesh.geometry) wallMesh.geometry.userData.disposable=true;   // 第 4 层无墙体（空 builder → Group 无 geometry）
  world.add(wallMesh);

  /* 门 */
  for(const d of floor.doors){
    if(d.secret){ this.buildSecretWall(d, th); continue; }
    const isBossDoor = d.rooms.some(r=>r.type==='boss');
    const horizontal = (d.tiles[0][0]!==d.tiles[1][0]); // true=东西向通道，开口沿Z展开
    const cx=(d.tiles[0][0]+d.tiles[3][0])/2+0.5, cz=(d.tiles[0][1]+d.tiles[3][1])/2+0.5;
    const g=new THREE.Group();
    const frameC = isBossDoor?0x6a2020:(floor.num===1?0x6a5238:(floor.num===4?0x2c3a6a:0x3a3050));
    const b=new GB();
    if(horizontal){
      b.box(0,.75,-1.12,.3,1.5,.34,frameC); b.box(0,.75,1.12,.3,1.5,.34,frameC);
      b.box(0,1.55,0,.9,.3,2.5,frameC);
      b.box(0,1.72,0,1.1,.16,2.6,G.clamp(frameC+0x141414,0,0xffffff));
    } else {
      b.box(-1.12,.75,0,.34,1.5,.3,frameC); b.box(1.12,.75,0,.34,1.5,.3,frameC);
      b.box(0,1.55,0,2.5,.3,.9,frameC);
      b.box(0,1.72,0,2.6,.16,1.1,G.clamp(frameC+0x141414,0,0xffffff));
    }
    if(isBossDoor){
      b.sph(0,2.0,0,.22,0xd8d0c0,6);
      b.box(0,1.95,.14,.3,.08,.06,0x302020); b.box(0,2.18,0,.5,.1,.1,0xd8a830);
      // 红色警示光柱（体积光）：未探索区域也能看到 Boss 房方位
      const beam=new THREE.Mesh(G.cylGeo(.5,.8,3.6,10),
        new THREE.MeshBasicMaterial({color:0xff3020, transparent:true, opacity:.10, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
      beam.position.y=2.2; g.add(beam);
    }
    const frame=new THREE.Mesh(b.build(), G.vcolMat); frame.castShadow=true; frame.geometry.userData.disposable=true;
    g.add(frame);
    // 门下地板补片
    const fb2=new GB();
    fb2.planeXZ(0,.002,0, 2.3, 2.3, floorCol(null,0,0));
    const fp=new THREE.Mesh(fb2.build(),G.vcolMat); fp.geometry.userData.disposable=true; g.add(fp);
    // 闸门
    const gate=new THREE.Mesh(G.boxGeo(horizontal?0.7:2.1, 1.35, horizontal?2.1:0.7), G.mat(isBossDoor?0x8a3228:0x585860,{emissive:isBossDoor?0x401008:0x101018, ei:1}));
    gate.position.y=0.68; gate.castShadow=true;
    g.add(gate);
    g.position.set(cx,0,cz);
    d.gate=gate; d.group=g;
    world.add(g);
  }

  /* 道具 */
  for(const room of floor.rooms){
    const theme = floor.num;
    for(const p of room.props){
      switch(p.type){
        case 'table': {
          const pr=this.addProp(room,{type:'table',x:p.x,z:p.z,r:.55,hp:30,blocksMove:true,blocksBullets:false,mesh:PROP.table(theme),flipped:false});
          pr.mesh.rotation.order='YXZ'; // 先对准朝向再前倾翻倒
          pr.interact={label:'翻转桌子 [掩体]', range:1.6, fn:()=>{
            if(pr.flipped) return;
            pr.flipped=true;
            pr.blocksBullets=true;
            pr.r=.62;
            pr.flipT=0;
            // 立起方向 = 玩家当前瞄准方向：桌面对准敌人来弹方向，真正挡住射击
            pr.flipAng = G.player.face||0;
            G.audio.sfx('flip');
            G.fx.burst(pr.x,.3,pr.z,6,{color:0x9a7a4a,spd:2,life:.4,s0:.14,kind:'m',vy:1});
            pr.interact=null;
          }};
          break; }
        case 'barrel': this.addProp(room,{type:'barrel',x:p.x,z:p.z,r:.32,hp:8,blocksMove:true,blocksBullets:true,mesh:PROP.barrel()}); break;
        case 'pot': this.addProp(room,{type:'pot',x:p.x,z:p.z,r:.24,hp:4,blocksMove:true,blocksBullets:true,mesh:PROP.pot()}); break;
        case 'pillar': this.addProp(room,{type:'pillar',x:p.x,z:p.z,r:.42,hp:Infinity,blocksMove:true,blocksBullets:true,mesh:PROP.pillar(theme)}); break;
        case 'chest': this.makeChest(room,p); break;
        case 'bonus': this.makeBonus(room,p); break;
        case 'counter': {
          const pr={type:'counter',x:p.x,z:p.z,r:.4,hp:Infinity,blocksMove:false,blocksBullets:false,mesh:PROP.counter()};
          this.addProp(room,pr); break; }
        case 'shopkeeper': break;
        case 'exitHatch': this.makeExit(room,p); break;
        case 'npc': this.makeNpc(room,p); break;
        case 'shrine': this.makeShrine(room,p); break;
        case 'gamble': this.makeGamble(room,p); break;
        case 'throne': this.addProp(room,{type:'throne',x:p.x,z:p.z,r:0,hp:Infinity,blocksMove:false,blocksBullets:false,mesh:PROP.throne()}); break;
        case 'campfire': this.makeCampfire(room,p); break;
        /* ---- 第 4 层「失序维度」专属道具 ---- */
        case 'voidcore': this.addProp(room,{type:'voidcore',x:p.x,z:p.z,r:1.6,hp:Infinity,blocksMove:true,blocksBullets:true,mesh:PROP.voidcore(p.boss)}); break;
        case 'highpad': this.addProp(room,{type:'highpad',x:p.x,z:p.z,r:1.15,hp:Infinity,blocksMove:true,blocksBullets:true,mesh:PROP.highpad()}); break;
        case 'brokencol': this.addProp(room,{type:'brokencol',x:p.x,z:p.z,r:.5,hp:Infinity,blocksMove:true,blocksBullets:true,mesh:PROP.brokencol()}); break;
        case 'coredevice': this.addProp(room,{type:'coredevice',x:p.x,z:p.z,r:2.6,hp:Infinity,blocksMove:true,blocksBullets:true,mesh:PROP.coredevice()}); break;
        case 'foldgate': {
          // 空间折叠门：成对双向传送（可理解：标牌指明去向；传送后 0.5s 无敌防落地成盒）
          const gate=floor.mech.foldGates[p.gateId];
          const me=p.side==='a'?gate.a:gate.b, other=p.side==='a'?gate.b:gate.a;
          const pr=this.addProp(room,{type:'foldgate',x:me.x,z:me.z,r:.55,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:PROP.foldgate(other.toName)});
          pr.interact={label:'空间折跃 → '+other.toName, range:1.7, fn:()=>{
            const pl=G.player;
            if(pl._foldCd>0) return;
            pl._foldCd=1.0;
            // 传送落点必须用生成器算好的合法地板 out（gen4 foldgate 布置时产出）——
            // 旧版写死 z+1.2 无检查，落点邻 tile 是虚空时玩家被直接传出地图（第四层「弹出」bug 根源）
            const out=other.out||{x:other.x, z:other.z+1.2};
            pl.x=out.x; pl.z=out.z; pl.vx=0; pl.vz=0;
            pl.invulnT=Math.max(pl.invulnT,.5);
            pl.mesh.position.set(pl.x,0,pl.z);
            G.game.camX=pl.x; G.game.camZ=pl.z;   // 相机瞬移（防跨图 lerp 长飞行）
            G.audio.sfx('phase');
            G.fx.burst(me.x,1,me.z,10,{color:0x9a5cff,spd:2,life:.5,s0:.18,kind:'a'});
            G.fx.burst(other.x,1,other.z+1.2,14,{color:0x50d8ff,spd:2.4,life:.6,s0:.2,kind:'a'});
            G.fx.ring(other.x,other.z+1.2,1.4,0x9a5cff,.5);
            G.ui.toast('空间折跃——已抵达「'+other.toName+'」');
          }};
          break; }
        case 'riftanchor': {
          // 裂缝锚点：交互撕开隐藏通路（对应 secret 门显形开启）
          const pr=this.addProp(room,{type:'riftanchor',x:p.x,z:p.z,r:.5,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:PROP.riftanchor()});
          pr.interact={label:'撕裂空间裂缝', range:1.7, fn:()=>{
            const door=floor.doors[p.doorId];
            pr.interact=null;
            pr.mesh.userData.circle.visible=false;
            G.audio.sfx('secret');
            if(door && !door.broken) G.game.breakSecretDoor(door);
            else G.ui.toast('裂缝已经稳定了。');
          }};
          break; }
        case 'moneyPile': {
          for(let i=0;i<16;i++) G.spawnPickup('money', p.x+(Math.random()-.5)*1.6, p.z+(Math.random()-.5)*1.2);
          break; }
        case 'heartPickup': G.spawnPickup('heart', p.x, p.z); break;
      }
    }
    // 商店：售货员 + 货架（售货员站在柜台后、完全位于房间地板范围内，不再被墙体遮挡）
    if(room.type==='shop'){
      const counterZ=room.z0+1.0;           // 柜台位置（贴北墙）
      const keeperZ=counterZ-0.75;           // 售货员在柜台与墙之间（z0+0.25，仍在地板上）
      const sk=this.addProp(room,{type:'shopkeeper',x:room.cx,z:keeperZ,r:.4,hp:Infinity,blocksMove:false,blocksBullets:false,mesh:PROP.shopkeeper()});
      sk.interact={label:'与商人交谈', range:2.2, fn:()=>{
        G.shop.open();   // 打开武器目录（购买事务/反馈全部在 shop.js 内）
      }};
      // 重新摆放柜台到售货员身前
      const counter=this.addProp(room,{type:'counter',x:room.cx,z:counterZ,r:.5,hp:Infinity,blocksMove:false,blocksBullets:false,mesh:PROP.counter()});
      counter.mesh.rotation.y=0;
      room.stock.forEach((it,i)=>{
        const pos=room.stockPos[i];
        this.makeShopPedestal(room,it,pos);
      });
      /* 武器展示架：贴墙陈列（门禁感知布点，不堵门口），碰撞只保留小底座——
         主通道与翻滚不受阻（r=.22 明显小于视觉底座；缝隙 < 玩家直径，无卡死口袋） */
      const rackIds=G.shop.catalogIds().filter(id=>G.meta.unlocked(id));   // 只陈列已解锁武器
      const rackTc={D:0x9aa4ac,C:0x5ad07a,B:0x58a8ff,A:0xc87aff};
      const doorC={w:[],e:[],n:[],s:[]};
      for(const d of (G.floor?G.floor.doors:[])){
        if(!d.rooms.includes(room)) continue;
        for(const [tx,tz] of d.tiles){
          if(tx===room.x0-1 && tz>=room.z0-1 && tz<=room.z1+1) doorC.w.push(tz+0.5);
          else if(tx===room.x1+1 && tz>=room.z0-1 && tz<=room.z1+1) doorC.e.push(tz+0.5);
          else if(tz===room.z0-1 && tx>=room.x0-1 && tx<=room.x1+1) doorC.n.push(tx+0.5);
          else if(tz===room.z1+1 && tx>=room.x0-1 && tx<=room.x1+1) doorC.s.push(tx+0.5);
        }
      }
      const wallSlots=(along,fixed,a0,a1,doors,extra)=>{   // along:'z'=西/东墙 fixed=x；'x'=北/南墙 fixed=z
        const out=[];
        for(let c=a0;c<=a1+0.001;c+=1.1){
          if(!doors.every(dc=>Math.abs(c-dc)>=1.75)) continue;
          if(extra && !extra(c)) continue;
          out.push(along==='z' ? {x:fixed,z:c,rot:fixed<room.cx?Math.PI/2:-Math.PI/2}
                               : {x:c,z:fixed,rot:fixed<room.cz?0:Math.PI});
        }
        return out;
      };
      const cand=[
        ...wallSlots('z',room.x0+0.55,room.z0+0.8,room.z1+0.2,doorC.w),
        ...wallSlots('z',room.x1+0.45,room.z0+0.8,room.z1+0.2,doorC.e),
        ...wallSlots('x',room.z0+0.55,room.x0+0.8,room.x1-0.8,doorC.n,x=>Math.abs(x-room.cx)>=1.7),
        ...wallSlots('x',room.z1+0.45,room.x0+0.8,room.x1-0.8,doorC.s,x=>Math.abs(x-room.cx)>=1.7),
      ];
      room.wrackGroups=[];
      const placed=Math.min(rackIds.length, cand.length);   // 只摆已解锁数量的展示架
      cand.slice(0,placed).forEach((pos,i)=>{
        const def=G.weapons.defs[rackIds[i]];
        const g=PROP.wrack(def, rackTc[def.tier]);
        g.position.set(pos.x,0,pos.z);
        g.rotation.y=pos.rot;                     // 展示面朝向房内
        world.add(g);
        room.wrackGroups.push(g);
        const tag=textSprite(def.name, '#e8d9a8', 1.5);
        tag.position.set(pos.x,1.58,pos.z); world.add(tag);
        this.addProp(room,{type:'wrack',x:pos.x,z:pos.z,r:.22,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:g});
      });
    }
    /* 火把（第 4 层：能量水晶柱替代火把） */
    for(const t of room.torches){
      const g=new THREE.Group();
      const br=NM(pgeo('torch'+theme, b=>{
        if(theme===4){
          // 能量水晶柱：基座 + 青晶柱 + 紫晶尖
          b.box(0,.08,0,.3,.16,.3,0x1a142e);
          b.cyl(0,.5,0,.09,.13,.8,0x2a90c0,5);
          b.cone(0,1.0,0,.11,.3,0x50d8ff,5);
          b.box(0,.3,0,.16,.04,.16,0x9a5cff);
        } else {
          b.box(0,0,0,.12,.12,.12, theme===1?0x5a4028:(theme===3?0x241a44:0x3a3450));
          b.cyl(0,.16,0,.05,.05,.34, theme===1?0x5a4028:(theme===3?0x302058:0x3a3450), 5);
        }
      }));
      g.add(br);
      if(theme===1){
        if(!_flameMat) _flameMat=new THREE.SpriteMaterial({map:G.tex('flame'),transparent:true,depthWrite:false});
      }
      const fl=new THREE.Sprite(theme===1 ? _flameMat : G.pmat(this.themes[theme].torch));
      fl.scale.set(.55,.7,1); fl.position.y= theme===4? 1.05 : .42;
      g.add(fl);
      g.position.set(t.x+t.fx*.32, 1.0, t.z+t.fz*.32);
      if(theme===4) g.position.y=0;   // 能量柱落地（火把才挂墙高 1.0）
      g.userData={torch:true,flame:fl,th:theme};
      world.add(g);
      room.torchMeshes=room.torchMeshes||[]; room.torchMeshes.push(g);
    }
    /* 装饰 */
    (room.decor||[]).forEach(dc=>{
      const g=new THREE.Group();
      const b=new GB();
      switch(dc.kind){
        case 'bones': b.box(0,.02,0,.3,.04,.08,0xd8d0c0); b.box(-.16,.02,.06,.14,.04,.06,0xd8d0c0); b.sph(.18,.05,-.08,.05,0xd8d0c0,4); break;
        case 'skull': b.sph(0,.06,0,.13,0xc8c0b0,5); b.box(-.05,.06,.1,.04,.04,.03,0x1a1a1a); b.box(.05,.06,.1,.04,.04,.03,0x1a1a1a); break;
        case 'moss': b.planeXZ(0,.008,0,.8,.8,0x4a6a34); break;
        case 'crack': b.planeXZ(0,.008,0,.9,.35,0x24201c); b.planeXZ(.2,.012,.1,.5,.2,0x1c1814); break;
        case 'rubble': b.box(-.1,.03,0,.16,.06,.14,0x6a625a); b.box(.12,.03,.08,.12,.05,.1,0x5a524a); b.box(0,.03,-.1,.1,.04,.1,0x6a625a); break;
        case 'crystal': b.cone(0,.14,0,.1,.34,0x60e8ff,5); b.cone(.16,.08,.08,.06,.2,0x40c0e0,4); b.cone(-.14,.07,-.06,.05,.18,0x80f0ff,4); break;
        case 'goo': b.planeXZ(0,.008,0,.9,.9,0x3a7a3a); b.sph(0,.05,0,.12,0x50b050,5); break;
        case 'chain': b.cyl(0,.02,0,.035,.035,.5,0x585c66,5); b.sph(.26,.03,0,.05,0x585c66,4); break;
        case 'rune': b.planeXZ(0,.008,0,.6,.6,0x1a0a30); b.planeXZ(0,.012,0,.3,.08,0x8a5cff); break;
        case 'shard': b.cone(0,.1,0,.08,.3,0x6a3aa8,4); b.cone(.14,.06,.08,.05,.18,0x8a5cff,4); b.cone(-.1,.05,-.1,.05,.15,0x4a1a7a,4); break;
        case 'eye': b.sph(0,.03,0,.16,0x2a1848,6); b.sph(0,.05,0,.07,0xc060ff,5); break;
        /* ---- 第 4 层「失序维度」专属装饰（环境叙事：浮空碎块/断裂/能量/机械残骸） ---- */
        case 'rune2': b.planeXZ(0,.008,0,.8,.8,0x120a28); b.planeXZ(0,.012,0,.5,.1,0x50d8ff); b.planeXZ(0,.014,0,.1,.5,0x50d8ff); b.planeXZ(.2,.016,.2,.14,.14,0x9a5cff); break;
        case 'shard2': b.cone(0,.14,0,.1,.4,0x50c8f0,5); b.cone(.18,.08,.1,.06,.22,0x9a5cff,4); b.cone(-.16,.09,-.08,.06,.24,0x40a8e0,4); break;
        case 'riftskar': b.planeXZ(0,.008,0,1.1,.22,0x08040f); b.planeXZ(.1,.012,0,.7,.12,0x2a1050); b.planeXZ(-.2,.016,.05,.4,.06,0x8a3adf); break;
        case 'conduit': b.box(0,.1,0,1.2,.16,.16,0x241a3e); b.box(-.4,.1,0,.1,.22,.22,0x50d8ff); b.box(.35,.1,0,.1,.2,.2,0x2c2248); break;
        case 'wreck': b.box(0,.16,0,.7,.3,.5,0x2a2438,0,.4); b.box(.3,.38,.1,.1,.4,.1,0x1c1830,0,.9); b.box(-.3,.1,.25,.24,.16,.18,0x201c30); b.box(.1,.3,-.2,.08,.5,.08,0x50d8ff,0,.3); break;
        case 'floatrock': b.box(0,.42,0,.34,.24,.3,0x2c2444); b.box(.3,.62,.14,.18,.14,.16,0x241c3c); b.box(-.24,.55,-.12,.14,.12,.12,0x342a50); break;
      }
      const m=new THREE.Mesh(b.build(), G.vcolMat); m.geometry.userData.disposable=true; g.add(m);
      g.position.set(dc.x+.5,0,dc.z+.5);
      g.rotation.y=Math.random()*G.TAU;
      world.add(g);
      if(dc.kind==='floatrock'){   // 悬浮碎块：B.update 驱动上下浮动（空间失序感）
        g.userData.baseY=0; g.userData.bobP=(dc.x*7+dc.z*13)%6;
        (this._f4Floats=this._f4Floats||[]).push(g);
      }
    });
    /* 陷阱 */
    for(const hz of room.hazards){
      if(hz.kind==='spike'){
        const g=new THREE.Group();
        const b=new GB();
        for(let i=0;i<3;i++) for(let j=0;j<3;j++) b.cone(-.3+i*.3, .1, -.3+j*.3, .07, .26, 0x9a9aa4, 4);
        const m=new THREE.Mesh(b.build(), G.vcolMat); m.geometry.userData.disposable=true;
        g.add(m);
        g.position.set(hz.x+.5,-0.32,hz.z+.5);
        hz.mesh=g; hz.state='hide'; hz.t=Math.random()*2;
        world.add(g);
      } else if(hz.kind==='toxic'){
        const m=new THREE.Mesh(G.cylGeo(.42,.5,.06,10), new THREE.MeshBasicMaterial({color:0x40c040, transparent:true, opacity:.5, depthWrite:false}));
        m.position.set(hz.x+.5,.04,hz.z+.5);
        hz.mesh=m; world.add(m);
      } else if(hz.kind==='voidrift'){
        // 虚空裂隙：紫黑裂缝平面 + 周期开合（state: hide→warn→open），open 时伤人
        const g=new THREE.Group();
        const b=new GB();
        b.planeXZ(0,.01,0,.85,.16,0x0a0414);
        b.planeXZ(0,.014,0,.6,.09,0x1a0a30);
        b.planeXZ(0,.018,0,.4,.05,0x4a1a7a);
        const m=new THREE.Mesh(b.build(), G.vcolMat); m.geometry.userData.disposable=true;
        m.rotation.y=(hz.x*7+hz.z*13)%3;
        g.add(m);
        const glow=new THREE.Sprite(G.pmat(0xa060ff)); glow.scale.set(.9,.35,1); glow.position.y=.08;
        g.add(glow);
        g.position.set(hz.x+.5,.03,hz.z+.5);
        hz.mesh=g; hz.glow=glow; hz.state='hide'; hz.t=Math.random()*2;
        world.add(g);
      }
    }
    /* 旗帜（第 4 层不挂：平台边缘为虚空，旗帜会悬浮在深渊上） */
    if(floor.num!==4 && (room.type==='boss'||room.rw>=2||room.type==='treasure'||room.type==='shop')){
      const bc = room.type==='boss'?0x8a1a14:th.banner;
      const spots=[];
      if(room.rw>=2){ spots.push([room.cx, room.z0+.42],[room.cx, room.z1+.58]); }
      if(room.type==='boss'){ spots.push([room.x0+.42,room.cz],[room.x1+.58,room.cz]); }
      for(const [bx,bz] of spots.slice(0,2)){
        const b=new GB();
        b.box(0,.7,0,.5,1.1,.06,bc);
        b.box(0,1.3,0,.56,.14,.08,G.clamp(bc+0x202020,0,0xffffff));
        if(room.type==='boss'){ b.sph(0,.7,.05,.09,0xd8d0c0,4); }
        const m=new THREE.Mesh(b.build(),G.vcolMat); m.geometry.userData.disposable=true;
        m.position.set(bx,0,bz); world.add(m);
      }
    }
  }
  // 售货员朝向玩家店中央
  G.ui.floor(floor.num);
};

B.addProp = function(room, pr){
  pr.room=room;
  pr.mesh.position.set(pr.x,0,pr.z);
  G.world.add(pr.mesh);
  G.props.push(pr);
  return pr;
};

/* 宝箱 */
B.makeChest = function(room,p){
  const pr=this.addProp(room,{type:'chest',x:p.x,z:p.z,r:.5,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:PROP.chest(p.tier),tier:p.tier,opened:false});
  pr.interact={range:1.6, fn:()=>{
    if(pr.opened) return;
    if(pr.tier==='green'){
      if(G.player.keys<1){ G.ui.toast('需要一把钥匙……'); G.audio.sfx('error'); return; }
      G.player.keys--; G.ui.stats(G.player);
    }
    pr.opened=true;
    G.game.run.chests++;
    const lid=pr.mesh.userData.lid;
    pr.animT=0; pr.animating=true;
    G.audio.sfx('chest');
    if(pr.tier==='green') G.audio.sfx('rewardR',{v:.8,min:300});      // 稀有奖励：上升音
    else if(pr.tier==='red') G.audio.sfx('rewardE',{v:.9,min:300});    // 史诗奖励：和声+低频
    G.fx.light(pr.x,1.2,pr.z,0xffd070,2.5,.6);
    const loot=G.items.chestLoot(pr.tier, G.floor.num);
    setTimeout(()=>{ loot.forEach((l,i)=>{
      const lx=pr.x+(i-(loot.length-1)/2)*.9, lz=pr.z+1.1;
      if(l.kind==='weapon') G.spawnPickup('weapon',lx,lz,{weaponId:l.tier});
      else if(l.kind==='item') G.spawnPickup('item',lx,lz,{itemId:l.id});
      else if(l.kind==='active') G.spawnPickup('active',lx,lz,{itemId:l.id});
      else if(l.kind==='heart') G.spawnPickup('heart',lx,lz);
      else if(l.kind==='key') G.spawnPickup('key',lx,lz);
      else if(l.kind==='money'){ for(let m=0;m<(l.n||10);m++) G.spawnPickup('money',lx+(Math.random()-.5),lz+(Math.random()-.5)); }
    }); },380);
    pr.interact=null;
  }};
  if(pr.tier==='green') pr.interact.label='打开 [需钥匙]';
  else pr.interact.label='打开宝箱';
};

B.makeBonus = function(room,p){
  const pr=this.addProp(room,{type:'bonus',x:p.x,z:p.z,r:.35,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:PROP.bonus(),opened:false});
  pr.interact={label:'打开小宝箱', range:1.6, fn:()=>{
    if(pr.opened) return;
    pr.opened=true;
    G.audio.sfx('coin');
    G.game.run.chests++;
    for(let i=0;i<G.rng.int(5,9);i++) G.spawnPickup('money',pr.x+(Math.random()-.5),pr.z+1+(Math.random()-.5));
    G.spawnPickup('heart',pr.x,pr.z+1.4);
    pr.mesh.children[0].position.y=-0.1;
    pr.interact=null;
  }};
};

B.makeExit = function(room,p){
  const pr=this.addProp(room,{type:'exitHatch',x:p.x,z:p.z,r:0,hp:Infinity,blocksMove:false,blocksBullets:false,mesh:PROP.exitHatch()});
  // 层数动态化：第 1 层舱口「下潜至第二层」，第 2 层 Boss 战后由 game.js 调本函数生成「下潜至第三层」
  const CN=['','一','二','三','四'];
  const fl=(G.game&&G.game.floorNum)||1;
  pr.interact={label:'下潜至第'+(CN[fl+1]||(fl+1))+'层', range:1.5, fn:()=>{ G.game.descend(); }};
};

B.makeNpc = function(room,p){
  const pr=this.addProp(room,{type:'npc',x:p.x,z:p.z,r:.4,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:PROP.npc(),talked:0});
  pr.interact={label:'交谈', range:1.5, fn:()=>{
    pr.talked++;
    G.audio.sfx('blip');
    if(pr.talked===1){ G.ui.toast('「旅行者：又来一个往深处去的……拿着这个吧，也许用得上。」'); }
    else if(pr.talked===2){ G.ui.toast('「旅行者：第二层的『铁颚』……它的冲撞砸晕自己时，就是机会。」'); }
    else if(pr.talked===3 && !pr.gave){
      pr.gave=true;
      const l=G.rng.chance(.5)?{kind:'item',id:G.items.randomPassive('C')}:{kind:'weapon',weaponId:'C'};
      if(l.kind==='item') G.spawnPickup('item',pr.x,pr.z+1.2,{itemId:l.id});
      else G.spawnPickup('weapon',pr.x,pr.z+1.2,{weaponId:l.weaponId});
      G.ui.toast('「旅行者：这个送你了。别死在下面。」');
    } else { G.ui.toast('「旅行者：愿深渊眷顾你。」'); }
  }};
};

B.makeShrine = function(room,p){
  const pr=this.addProp(room,{type:'shrine',x:p.x,z:p.z,r:.6,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:PROP.shrine(),used:false});
  pr.interact={label:'献祭 1 颗红心', range:1.5, fn:()=>{
    if(pr.used){ G.ui.toast('祭坛已沉寂。'); return; }
    if(G.player.hp<=2){ G.ui.toast('生命不足，祭坛拒绝了你的献祭。'); G.audio.sfx('error'); return; }
    pr.used=true;
    G.player.hp-=2; G.ui.hearts(G.player); G.ui.hurtFlash();
    G.audio.sfx('phase');
    G.fx.burst(pr.x,.8,pr.z,12,{color:0xc03050,spd:2,life:.6,s0:.2});
    const roll=G.rng.f();
    if(roll<.6) G.spawnPickup('item',pr.x,pr.z+1.3,{itemId:G.items.randomPassive('B')});
    else G.spawnPickup('weapon',pr.x,pr.z+1.3,{weaponId:'B'});
    pr.interact.label='祭坛已沉寂';
  }};
};

B.makeGamble = function(room,p){
  const pr=this.addProp(room,{type:'gamble',x:p.x,z:p.z,r:.6,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:PROP.gamble(),uses:3});
  pr.interact={label:'赌一把 [12 弹壳]', range:1.5, fn:()=>{
    if(pr.uses<=0){ G.ui.toast('赌桌已经关张了。'); return; }
    if(G.player.money<12){ G.ui.toast('弹壳不够……'); G.audio.sfx('error'); return; }
    G.player.money-=12; G.ui.stats(G.player);
    pr.uses--;
    G.audio.sfx('ui');
    if(G.rng.chance(.55)){
      G.ui.toast('骰子停在了六点！');
      G.audio.sfx('itemGet');
      G.spawnPickup('item',pr.x,pr.z+1.3,{itemId:G.items.randomPassive(G.rng.chance(.5)?'B':'C')});
    } else {
      G.ui.toast('「庄家：哈哈，手气真差！」（什么也没有）');
      G.audio.sfx('error');
    }
  }};
};

B.makeCampfire = function(room,p){
  this.addProp(room,{type:'campfire',x:p.x,z:p.z,r:.3,hp:Infinity,blocksMove:false,blocksBullets:false,mesh:PROP.campfire()});
};

/* 商店货架 */
B.makeShopPedestal = function(room, it, pos){
  const colors={weapon:'#e0a03a',item:'#a0e8c0',heart:'#e04a3a',key:'#e8c15a',active:'#8fd0ff'};
  const icons={weapon:'weapon',item:'item',heart:'heart',key:'key',active:'active'};
  const tierName={C:'普通',B:'精良',A:'传说'};
  // 商品名（购买前武器为随机，只显示品质）
  let goodsName='';
  if(it.kind==='weapon') goodsName='武器·'+(tierName[it.tier]||'普通');
  else if(it.kind==='item') goodsName=G.items.passives[it.id].name;
  else if(it.kind==='active') goodsName=G.items.actives[it.id].name;
  else if(it.kind==='heart') goodsName='红心';
  else if(it.kind==='key') goodsName='钥匙';
  // 红心商品名随玩家状态变化：未满血=治疗，满血=扩充上限（保证购买永远有收益）
  const heartLabel=()=> (G.player.hp>=G.player.maxHp)? '红心·扩容' : '红心';
  const pr=this.addProp(room,{type:'pedestal',x:pos.x,z:pos.z,r:.42,hp:Infinity,blocksMove:true,blocksBullets:false,
    mesh:PROP.pedestal(icons[it.kind], colors[it.kind]), stock:it, sold:false});
  // 商品名 + 价格双牌（高分辨率像素字 + 描边，穿墙深度关闭保证不被货架遮挡）
  const nameTag=textSprite(it.kind==='heart'?heartLabel():goodsName, colors[it.kind], 2.8);
  nameTag.position.set(pos.x, 2.0, pos.z);
  G.world.add(nameTag);
  const price=textSprite('¥'+it.price, '#ffe9a0', 3.6);
  price.position.set(pos.x, 1.12, pos.z);
  G.world.add(price);
  pr.nameTag=nameTag;
  pr.priceSprite=price;
  const dispName=()=> it.kind==='heart'? heartLabel() : goodsName;
  pr.interact={label:()=> '购买 '+dispName()+' ¥'+it.price+'（持有弹壳 '+G.player.money+'）', range:1.6, fn:()=>{
    if(pr.sold){ return; }
    const p=G.player;
    if(p.money<it.price){ G.ui.toast('弹壳不足！'); G.audio.sfx('error'); return; }
    p.money-=it.price;
    G.game.run.moneySpent=(G.game.run.moneySpent||0)+it.price;
    G.audio.sfx('buy');
    pr.sold=true;
    pr.mesh.userData.icon.visible=false;
    price.visible=false;
    nameTag.visible=false;
    pr.interact=null;
    switch(it.kind){
      case 'weapon': G.player.giveWeapon(G.weapons.mktWeapon(G.weapons.randomWeaponId(it.tier))); break;
      case 'item': G.items.giveTo(p,{kind:'item',id:it.id}); break;
      case 'active': G.items.giveTo(p,{kind:'active',id:it.id}); break;
      // 红心：未满血=治疗2点；满血=永久扩充上限1颗心（购买永远有收益，不再白花钱）
      case 'heart':
        if(p.hp>=p.maxHp) p.addHeartContainer(2);
        else G.items.giveTo(p,{kind:'heart'});
        break;
      case 'key': G.items.giveTo(p,{kind:'key'}); break;
    }
  }};
};

/* 隐藏房裂纹墙 */
B.buildSecretWall = function(d, th){
  const g=new THREE.Group();
  const b=new GB();
  const [x0,z0]=d.tiles[0], [x1,z1]=d.tiles[3];
  const cx=(x0+x1)/2+0.5, cz=(z0+z1)/2+0.5;
  const horizontal = d.tiles[0][0]===d.tiles[1][0] ? false : true;
  for(const [tx,tz] of d.tiles){
    b.box(tx+.5, .7, tz+.5, 1.0, 1.4, 1.0, th.wall);
    b.box(tx+.5, 1.42, tz+.5, 1.04, .1, 1.04, th.wallTop);
  }
  // 裂纹（朝两个方向可见）
  const cw=new GB();
  if(horizontal){
    cw.box(0,.7,.52,.5,.9,.03,0x14100c);
    cw.box(-.3,.9,.52,.3,.06,.03,0x14100c); cw.box(.28,.5,.52,.34,.05,.03,0x14100c);
    cw.box(0,.7,-.52,.5,.9,.03,0x14100c);
  } else {
    cw.box(.52,.7,0,.03,.9,.5,0x14100c);
    cw.box(.52,.9,-.3,.03,.06,.3,0x14100c); cw.box(.52,.5,.28,.03,.05,.34,0x14100c);
    cw.box(-.52,.7,0,.03,.9,.5,0x14100c);
  }
  const wallM=new THREE.Mesh(b.build(),G.vcolMat); wallM.geometry.userData.disposable=true;
  wallM.castShadow=true; wallM.receiveShadow=true;
  const crackM=new THREE.Mesh(cw.build(),G.vcolMat); crackM.geometry.userData.disposable=true;
  g.add(wallM); g.add(crackM);
  g.position.set(cx,0,cz);
  d.group=g; d.crackMesh=crackM;
  G.world.add(g);
  // 打破后需要的地板补片（常驻，被墙盖住时不可见）
  const fpb=new GB();
  fpb.planeXZ(cx,.002,cz, 2.3, 2.3, th.floorA);
  const fpm=new THREE.Mesh(fpb.build(),G.vcolMat); fpm.geometry.userData.disposable=true;
  G.world.add(fpm);
};

/* 道具伤害 */
B.damageProp = function(pr, dmg, ang){
  if(!pr || pr.dead || pr.hp===Infinity) return;
  pr.hp-=dmg;
  pr.flashT=.06;
  if(pr.type==='dummy'){   // 训练靶：显示伤害数字 + 命中反馈，打碎后短暂消失自动重置（基地训练场专用，永不真正死亡）
    G.fx.dmgNum(pr.x,2.0,pr.z,Math.round(dmg),false,{color:'#ffe9a0'});
    // 命中反馈：金属火花 + 靶盘微颤（让"打靶"有手感）
    G.fx.burst(pr.x,1.9,pr.z,5,{color:0xffc860,spd:1.8,vy:.7,life:.28,s0:.1,kind:'a'});
    G.fx.particle(pr.x,1.9,pr.z,{vx:Math.cos(ang||0)*1.6,vy:.6,vz:Math.sin(ang||0)*1.6,life:.18,color:0xffe8b0,s0:.14,kind:'a'});
    G.audio.sfx('clank',{v:.5});
    if(pr.mesh){ pr.mesh.position.x=pr.x+(Math.random()-.5)*.04; pr.mesh.position.z=pr.z+(Math.random()-.5)*.04; }
    if(G.base && G.base._hitsTag){
      const h=(G.meta?G.meta.data.stats.trainingHits:0)||0;
      G.base._hitsTag.textContent='命中 '+h+' 次 · 打碎自动重置';
    }
    if(pr.hp<=0){
      pr.hp=pr.maxHp; pr.dead=false; pr.mesh.visible=false; pr.respawnT=1.1;
      G.audio.sfx('break',{v:.5}); G.fx.wood(pr.x,.5,pr.z);
      if(G.meta) G.meta.data.stats.trainingHits=(G.meta.data.stats.trainingHits||0)+1;
      if(G.base && G.base._hitsTag) G.base._hitsTag.textContent='命中 '+(G.meta.data.stats.trainingHits)+' 次 · 打碎自动重置';
    }
    return;
  }
  if(pr.hp<=0){
    pr.dead=true;
    pr.mesh.parent && pr.mesh.parent.remove(pr.mesh);
    const i=G.props.indexOf(pr); if(i>=0) G.props.splice(i,1);
    switch(pr.type){
      case 'barrel':
        G.weapons.explode(pr.x,pr.z,2.4,14,'any');
        pr.dead=true;
        break;
      case 'pot':
        G.audio.sfx('break'); G.fx.wood(pr.x,.3,pr.z);
        if(G.rng.chance(.4)) G.spawnPickup('money',pr.x,pr.z);
        if(G.rng.chance(.08)) G.spawnPickup('heart',pr.x,pr.z);
        break;
      case 'table':
        G.audio.sfx('break'); G.fx.wood(pr.x,.4,pr.z);
        break;
    }
  }
};

/* 每帧：门动画 / 火把 / 宝箱开盖 / 陷阱视觉 */
B.update = function(dt){
  const floor=G.floor;
  if(!floor) return;
  const p=G.player;
  for(const d of floor.doors){
    if(!d.gate) continue;
    const targetY = d.open? -0.75 : 0.68;
    d.gate.position.y = G.lerp(d.gate.position.y, targetY, Math.min(1,10*dt));
  }
  // 火把：只点亮玩家附近的
  if(p){
    let held=0;
    const th=this.theme;
    for(const room of floor.rooms){
      const meshes=room.torchMeshes||[];
      for(const tm of meshes){
        const fl=tm.userData.flame;
        if(!fl) continue;
        fl.scale.y=.6+Math.sin(performance.now()*.012+tm.position.x*3)*.12;
        const dist=G.dist2(p.x,p.z,tm.position.x,tm.position.z);
        if(held<4 && dist<200){
          const wx=tm.position.x, wz=tm.position.z;
          G.fx.holdLight('torch'+held, wx, 1.5, wz, th.torch, th.torchI*(0.9+Math.sin(performance.now()*.01+wx)*.1));
          held++;
        }
      }
    }
  }
  // 武器展示架：枪模缓转悬浮 + 辉光呼吸（玩家靠近时增亮——视觉反馈，不做交互入口）
  for(const room of floor.rooms){
    const gs=room.wrackGroups; if(!gs) continue;
    for(const g of gs){
      const gun=g.userData.gun; if(!gun) continue;
      gun.rotation.y += dt*1.1;
      gun.position.y = Math.sin(performance.now()*.002+g.position.x)*0.035;
      const gl=g.userData.glow;
      if(gl){
        const near = p && G.dist2(p.x,p.z,g.position.x,g.position.z)<4.4;   // ~2.1m
        const s=(near?0.9:0.62)+Math.sin(performance.now()*.003+g.position.z)*(near?0.10:0.07);
        gl.scale.set(s,s,1);
      }
    }
  }
  /* ---- 第 4 层「失序维度」动画驱动：废墟自转浮动 / 悬浮碎块 / 核心装置与能量核呼吸 / 折叠门能量面 ---- */
  if(floor.num===4){
    const now=performance.now();
    if(this._f4Ruins) for(const m of this._f4Ruins.children){
      m.rotation.y+=m.userData.spin*dt;
      m.position.y=m.userData.baseY+Math.sin(now*.0004+m.userData.bobP)*.5;
    }
    if(this._f4Floats) for(const g of this._f4Floats){
      g.position.y=g.userData.baseY+Math.sin(now*.0011+g.userData.bobP)*.16;
    }
    for(const pr of G.props){
      if(pr.type==='coredevice' && pr.mesh.userData.ring){
        pr.mesh.userData.ring.rotation.z+=dt*.5;
        const gl=pr.mesh.userData.glow; if(gl){ const s=4.0+Math.sin(now*.002)*.5; gl.scale.set(s,s,1); }
      } else if(pr.type==='voidcore' && pr.mesh.userData.glow){
        const gl=pr.mesh.userData.glow; const s=2.4+Math.sin(now*.0025+pr.x)*.35; gl.scale.set(s,s,1);
      } else if(pr.type==='foldgate' && pr.mesh.userData.veil){
        pr.mesh.userData.veil.material.opacity=.26+Math.sin(now*.004+pr.z)*.10;
      }
    }
  }
  // 宝箱开盖 / 翻桌 / 爆炸桶引信
  for(let i=G.props.length-1;i>=0;i--){
    const pr=G.props[i];
    if(pr.animating){
      pr.animT+=dt*3;
      const lid=pr.mesh.userData.lid;
      lid.rotation.x=-Math.min(1,pr.animT)*1.9;
      if(pr.animT>=1) pr.animating=false;
    }
    if(pr.type==='table' && pr.flipped && pr.flipT<1){
      pr.flipT=Math.min(1,(pr.flipT||0)+dt*4);
      const k=pr.flipT;
      // YXZ 顺序：先绕 Y 对准玩家瞄准方向（桌面法线朝敌），再绕 X 前倾立起
      pr.mesh.rotation.set(-Math.sin(k*Math.PI*.5)*1.25, -(pr.flipAng||0), 0);
      pr.mesh.position.y = Math.sin(k*Math.PI)*.35;
      if(pr.flipT>=1){ pr.mesh.rotation.set(-1.25, -(pr.flipAng||0), 0); pr.mesh.position.y=0; }
    }
    if(pr.type==='barrel' && pr.fuse!=null){
      pr.fuse-=dt;
      pr.mesh.rotation.z=Math.sin(performance.now()*.05)*.06;
      if(pr.fuse<=0){
        pr.dead=true;
        pr.mesh.parent && pr.mesh.parent.remove(pr.mesh);
        G.props.splice(i,1);
        G.weapons.explode(pr.x,pr.z,2.4,14,'any');
      }
    }
  }
  // 陷阱动画与判定
  for(const room of floor.rooms){
    for(const hz of room.hazards){
      if(hz.kind==='spike'){
        hz.t-=dt;
        if(hz.state==='hide'&&hz.t<=0){ hz.state='warn'; hz.t=.5; G.audio.sfx('spike',{v:.15}); }
        else if(hz.state==='warn'&&hz.t<=0){ hz.state='up'; hz.t=.9; }
        else if(hz.state==='up'&&hz.t<=0){ hz.state='hide'; hz.t=1.8+Math.random(); }
        const targetY = hz.state==='hide'? -0.32 : (hz.state==='warn'? -0.1 : 0.06);
        hz.mesh.position.y=G.lerp(hz.mesh.position.y,targetY,Math.min(1,12*dt));
        if(hz.state==='up' && p && !p.dead){
          if(Math.floor(p.x)===hz.x && Math.floor(p.z)===hz.z && p.rollT<=0 && !p.invulnT) p.hurt(1,null);
        }
      } else if(hz.kind==='toxic'){
        hz.mesh.material.opacity=.4+Math.sin(performance.now()*.003+hz.x)*.12;
        if(p && !p.dead){
          if(Math.floor(p.x)===hz.x && Math.floor(p.z)===hz.z){
            p.slowT=.3;
            hz.tickT=(hz.tickT||0)-dt;
            if(hz.tickT<=0 && p.rollT<=0 && !p.invulnT){ hz.tickT=1.4; p.hurt(1,null); }
          }
        }
      } else if(hz.kind==='voidrift'){
        // 虚空裂隙：hide → warn(辉光预警) → open(伤人+拖拽减速) → hide
        hz.t-=dt;
        if(hz.state==='hide'&&hz.t<=0){ hz.state='warn'; hz.t=.55; G.audio.sfx('spike',{v:.12}); }
        else if(hz.state==='warn'&&hz.t<=0){ hz.state='open'; hz.t=1.1; G.audio.sfx('phase',{v:.25}); }
        else if(hz.state==='open'&&hz.t<=0){ hz.state='hide'; hz.t=2.2+Math.random(); }
        const gs = hz.state==='hide'? .35 : (hz.state==='warn'? .55+Math.sin(performance.now()*.03)*.15 : .8);
        hz.glow.scale.set(gs,gs*.4,1);
        if(hz.state==='open' && p && !p.dead){
          if(Math.floor(p.x)===hz.x && Math.floor(p.z)===hz.z){
            p.slowT=.35;
            hz.tickT=(hz.tickT||0)-dt;
            if(hz.tickT<=0 && p.rollT<=0 && !p.invulnT){ hz.tickT=.9; p.hurt(1,null); }
          }
        }
      }
    }
  }
};

G.build = B;
G.damageProp = (pr,dmg,ang)=>B.damageProp(pr,dmg,ang);
})();
