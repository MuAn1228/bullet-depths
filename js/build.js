/* 弹膛深渊 - 场景构建：地板/墙体/门/道具/装饰/双主题灯光 */
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
};

/* 文本精灵（高分辨率画布 + 黑色描边，320p 渲染下清晰可读） */
function textSprite(text, color, scale){
  const cv=document.createElement('canvas'); cv.width=128; cv.height=32;
  const ctx=cv.getContext('2d');
  ctx.font='bold 20px Consolas, monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(text).width;
  ctx.fillStyle='rgba(0,0,0,.75)';
  ctx.fillRect(64-w/2-3,2,w+6,28);
  ctx.lineWidth=4; ctx.strokeStyle='rgba(0,0,0,.9)';
  ctx.strokeText(text,64,17);
  ctx.fillStyle=color; ctx.fillText(text,64,17);
  const tx=new THREE.CanvasTexture(cv); tx.magFilter=THREE.NearestFilter;
  tx.disposableTx=true;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx, transparent:true, depthWrite:false, depthTest:false}));
  const s=scale||1;
  sp.scale.set(s, s*32/128, 1);
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
  table(th){ // 木桌
    const g=new THREE.Group();
    g.add(NM(pgeo('table'+(th===2?'2':''), b=>{
      const c=th===2?0x4a5560:0x7a5a34;
      b.box(0,.52,0,1.1,.09,.8,c);
      b.box(-.45,.26,-.3,.1,.5,.1,c); b.box(.45,.26,-.3,.1,.5,.1,c);
      b.box(-.45,.26,.3,.1,.5,.1,c); b.box(.45,.26,.3,.1,.5,.1,c);
      if(th===2){ b.box(0,.58,-.35,1.1,.05,.1,0x6a7480); b.box(0,.58,.35,1.1,.05,.1,0x6a7480); }
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
      fb.planeXZ(cx,0.012,cz,4.4,3.2,0x503040);
      fb.planeXZ(cx,0.024,cz,3.0,2.0,0x603a4a);
      fb.planeXZ(cx,0.036,cz,1.2,0.8,0x8a4a5a);
    } else if(room.type==='shop'){
      fb.planeXZ(room.cx,0.012,room.cz, (room.x1-room.x0-1), 2.2, 0x5c3e2a);
    } else if(room.type==='treasure'){
      fb.planeXZ(room.cx,0.012,room.cz, 3.2,3.2, 0x6a5a34);
    }
  }
  const floorMesh=new THREE.Mesh(fb.build(), G.vcolFloorMat); floorMesh.receiveShadow=true; floorMesh.geometry.userData.disposable=true;
  world.add(floorMesh);

  /* 墙体 */
  for(const tile of wallTiles){
    const v=rng.int(-5,5);
    const c=G.clamp(th.wall+v*0x010101,0,0xffffff);
    const h = 1.35 + ((tile.x*7+tile.z*13)%3)*0.04;
    wb.box(tile.x+.5, h/2, tile.z+.5, 1.0, h, 1.0, c);
    wb.box(tile.x+.5, h+.03, tile.z+.5, 1.04, .1, 1.04, G.clamp(th.wallTop+v*0x010101,0,0xffffff));
    // 底部踢脚
    wb.box(tile.x+.5, .06, tile.z+.5, 1.0, .12, 1.0, th.wallTrim);
  }
  const wallMesh=wb.buildMesh(); wallMesh.castShadow=true; wallMesh.receiveShadow=true; wallMesh.geometry.userData.disposable=true;
  world.add(wallMesh);

  /* 门 */
  for(const d of floor.doors){
    if(d.secret){ this.buildSecretWall(d, th); continue; }
    const isBossDoor = d.rooms.some(r=>r.type==='boss');
    const horizontal = (d.tiles[0][0]!==d.tiles[1][0]); // true=东西向通道，开口沿Z展开
    const cx=(d.tiles[0][0]+d.tiles[3][0])/2+0.5, cz=(d.tiles[0][1]+d.tiles[3][1])/2+0.5;
    const g=new THREE.Group();
    const frameC = isBossDoor?0x6a2020:(floor.num===1?0x6a5238:0x3a3050);
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
      sk.interact={label:'交谈', range:2.2, fn:()=>{
        const lines=['欢迎！弹壳就是金钱，朋友。','传闻下面那层的铁颚囤了一屋子好货……','有钱别攒着，死了可带不走。','按 E 购买。童叟无欺，概不退换。'];
        G.ui.toast('「'+G.rng.pick(lines)+'」');
        G.audio.sfx('blip');
      }};
      // 重新摆放柜台到售货员身前
      const counter=this.addProp(room,{type:'counter',x:room.cx,z:counterZ,r:.5,hp:Infinity,blocksMove:false,blocksBullets:false,mesh:PROP.counter()});
      counter.mesh.rotation.y=0;
      room.stock.forEach((it,i)=>{
        const pos=room.stockPos[i];
        this.makeShopPedestal(room,it,pos);
      });
    }
    /* 火把 */
    for(const t of room.torches){
      const g=new THREE.Group();
      const br=NM(pgeo('torch'+theme, b=>{
        b.box(0,0,0,.12,.12,.12,theme===1?0x5a4028:0x3a3450);
        b.cyl(0,.16,0,.05,.05,.34,0x5a4028,5);
      }));
      g.add(br);
      if(theme===1){
        if(!_flameMat) _flameMat=new THREE.SpriteMaterial({map:G.tex('flame'),transparent:true,depthWrite:false});
      }
      const fl=new THREE.Sprite(theme===1 ? _flameMat : G.pmat(0x50e0ff));
      fl.scale.set(.55,.7,1); fl.position.y=.42;
      g.add(fl);
      g.position.set(t.x+t.fx*.32, 1.0, t.z+t.fz*.32);
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
      }
      const m=new THREE.Mesh(b.build(), G.vcolMat); m.geometry.userData.disposable=true; g.add(m);
      g.position.set(dc.x+.5,0,dc.z+.5);
      g.rotation.y=Math.random()*G.TAU;
      world.add(g);
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
      }
    }
    /* 旗帜 */
    if(room.type==='boss'||room.rw>=2||room.type==='treasure'||room.type==='shop'){
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
  pr.interact={label:'下潜至第二层', range:1.5, fn:()=>{ G.game.descend(); }};
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
      }
    }
  }
};

G.build = B;
G.damageProp = (pr,dmg,ang)=>B.damageProp(pr,dmg,ang);
})();
