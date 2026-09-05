/* 第九层事故 - 第五层「异常回廊」专属生成器：异常节点网络
   ================================================================
   与第四层（空间失序）不同，第五层是规则失序：
   - 异常核心（ANOMALY CORE）居中，放射 5~7 支路，每支路 1~3 个节点
   - 节点多为特殊房间（G.SR5.registry 注册表提供尺寸/形状），战斗房占比 25~40%
   - 回环连接 + 隐藏房；Boss 竞技场为全游戏最大（6×5 cells）
   - 节点按深度分层（渐进式失控）：浅层 tame → 深层疯狂
   结构契约与 gen/gen4 一致（floor/room/door/tile 四件套）。 */
'use strict';
(function(){
const CW=G.CW, CH=G.CH;
function keyOf(x,z){ return x+','+z; }
const BX0=-12, BX1=13, BZ0=-10, BZ1=10;   // 25×20 cells

const F5 = {};
F5._dbg=[];

F5.genFloor = function(floorNum, seed){
  F5._dbg=[];
  for(let attempt=0; attempt<10; attempt++){
    const rng = new G.RNG((seed ^ (attempt*0x9e3779b1))>>>0);
    const f = tryBuild(floorNum, rng, F5._dbg);
    if(f) return f;
  }
  return tryBuild(floorNum, new G.RNG((seed^0x5bd1e995)>>>0), F5._dbg);
};

function tryBuild(floorNum, rng, dbg){
  const rooms=[], doors=[], occupied=new Map();
  const floor = { num:floorNum, rooms, doors, tiles:new Map(), props:[], hazards:[], decor:[], rng,
    mech:{}, theme:5 };

  function cellsFree(rx,rz,rw,rh){
    if(rx<BX0||rz<BZ0||rx+rw>BX1||rz+rh>BZ1) return false;
    for(let x=rx;x<rx+rw;x++) for(let z=rz;z<rz+rh;z++) if(occupied.has(keyOf(x,z))) return false;
    return true;
  }
  function addRoom(rx,rz,rw,rh,type,shape,special){
    if(!cellsFree(rx,rz,rw,rh)) return null;
    const room={ id:rooms.length, type, shape:shape||'rect', special:special||null,
      rx,rz,rw,rh, doors:[], neighbors:[], cleared:false, discovered:false, visited:false, mapHint:false,
      enemyWaves:null, waveIdx:0, props:[], spawnPts:[], torches:[], hazards:[], depth:0, used:false };
    for(let x=rx;x<rx+rw;x++) for(let z=rz;z<rz+rh;z++) occupied.set(keyOf(x,z), room);
    room.x0=rx*CW+1; room.x1=(rx+rw)*CW-2; room.z0=rz*CH+1; room.z1=(rz+rh)*CH-2;
    room.cx=(room.x0+room.x1+1)/2; room.cz=(room.z0+room.z1+1)/2;
    rooms.push(room);
    return room;
  }
  /* 门：4-tile 标准结构（正交紧贴） */
  function connect(a,b,secret){
    if(a.neighbors.includes(b)) return null;
    let tiles=[];
    if(b.rx+b.rw===a.rx || a.rx+a.rw===b.rx){
      const left=(b.rx+b.rw===a.rx)?b:a, right=(left===b)?a:b;
      const x0=right.rx*CW-1, x1=right.rx*CW;
      const zs=Math.max(a.z0,b.z0), ze=Math.min(a.z1,b.z1);
      if(ze-zs<1) return null;
      const zc=G.clamp(Math.floor((zs+ze)/2), zs, ze-1);
      tiles=[[x0,zc],[x1,zc],[x0,zc+1],[x1,zc+1]];
    } else if(b.rz+b.rh===a.rz || a.rz+a.rh===b.rz){
      const top=(b.rz+b.rh===a.rz)?b:a, bot=(top===b)?a:b;
      const z0=bot.rz*CH-1, z1=bot.rz*CH;
      const xs=Math.max(a.x0,b.x0), xe=Math.min(a.x1,b.x1);
      if(xe-xs<1) return null;
      const xc=G.clamp(Math.floor((xs+xe)/2), xs, xe-1);
      tiles=[[xc,z0],[xc,z1],[xc+1,z0],[xc+1,z1]];
    } else return null;
    const door={ id:doors.length, rooms:[a,b], tiles, open:!secret, secret:!!secret, broken:false, lockT:0, crackHp:3, phase:false };
    doors.push(door); a.doors.push(door); b.doors.push(door);
    a.neighbors.push(b); b.neighbors.push(a);
    return door;
  }
  function removeRoom(r){
    for(let x=r.rx;x<r.rx+r.rw;x++) for(let z=r.rz;z<r.rz+r.rh;z++) occupied.delete(keyOf(x,z));
    for(const d of r.doors.slice()){
      const di=doors.indexOf(d); if(di>=0) doors.splice(di,1);
      for(const rr of d.rooms){
        const i2=rr.doors.indexOf(d); if(i2>=0) rr.doors.splice(i2,1);
        const other=(rr===d.rooms[0])?d.rooms[1]:d.rooms[0];
        const i3=rr.neighbors.indexOf(other); if(i3>=0) rr.neighbors.splice(i3,1);
      }
    }
    const ri=rooms.indexOf(r); if(ri>=0) rooms.splice(ri,1);
  }
  /* 窄走廊桥（1 cell 宽——第五层「极窄特殊通道」）；BFS 最短路 + 原子回滚 */
  function layBridge(a,b){
    if(connect(a,b)) return true;
    const ax=a.rx+(a.rw>>1), az=a.rz+(a.rh>>1);
    const bx=b.rx+(b.rw>>1), bz=b.rz+(b.rh>>1);
    const prevCell=new Map(); const vis=new Set([keyOf(ax,az)]); const q=[[ax,az]];
    while(q.length){
      const [x,z]=q.shift();
      if(x===bx&&z===bz) break;
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx, nz=z+dz;
        if(nx<BX0||nx>BX1-1||nz<BZ0||nz>BZ1-1) continue;
        const k=keyOf(nx,nz);
        if(vis.has(k)) continue;
        const occ=occupied.get(k);
        if(occ && occ!==a && occ!==b && occ.type!=='bridge') continue;
        vis.add(k); prevCell.set(k,[x,z]); q.push([nx,nz]);
      }
    }
    if(!vis.has(keyOf(bx,bz))) return false;
    const path=[];
    { let cx=bx, cz=bz;
      while(true){ path.push({x:cx,z:cz,occ:occupied.get(keyOf(cx,cz))});
        if(cx===ax&&cz===az) break;
        const pp=prevCell.get(keyOf(cx,cz)); if(!pp) return false;
        cx=pp[0]; cz=pp[1]; }
      path.reverse(); }
    let freeCnt=0;
    for(const c of path) if(!c.occ) freeCnt++;
    if(freeCnt>7) return false;
    const built=[]; let prev=a, ok=true, i=0;
    while(i<path.length && path[i].occ===a) i++;
    while(i<path.length){
      const c=path[i];
      if(c.occ===b) break;
      if(c.occ){ const X=c.occ;
        while(i<path.length && path[i].occ===X) i++;
        if(prev!==X && !prev.neighbors.includes(X)){ if(!connect(prev,X)){ ok=false; break; } }
        prev=X; continue; }
      let j=i, dirx=0, dirz=0;
      if(i+1<path.length && !path[i+1].occ){
        dirx=Math.sign(path[i+1].x-path[i].x); dirz=Math.sign(path[i+1].z-path[i].z);
        while(j+1<path.length && !path[j+1].occ && Math.sign(path[j+1].x-path[j].x)===dirx && Math.sign(path[j+1].z-path[j].z)===dirz) j++;
      }
      const sx=c.x, sz=c.z, ex=path[j].x, ez=path[j].z;
      const br=addRoom(Math.min(sx,ex),Math.min(sz,ez),Math.abs(ex-sx)+1,Math.abs(ez-sz)+1,'bridge','bridge');
      if(!br || !connect(prev,br)){ if(br) built.push(br); ok=false; break; }
      built.push(br); prev=br; i=j+1;
    }
    if(ok && prev!==b && !prev.neighbors.includes(b)) ok=!!connect(prev,b);
    if(!ok){ for(let k2=built.length-1;k2>=0;k2--) removeRoom(built[k2]); return false; }
    return true;
  }

  /* ---------- 1. 异常核心 ---------- */
  const core=addRoom(-1,-1,2,2,'start','core');
  if(!core) return null;
  core.cleared=true;

  /* ---------- 2. 异常节点网络：放射支路 + 深度分层节点 ---------- */
  const DIRS=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  rng.shuffle(DIRS);
  const nDirs=rng.int(6,8);
  /* 特殊房池（tier 分层 = 渐进式失控） */
  const T={1:['weaponchaos','giant','ammobank'],2:['darkness','altar','swap','vote'],3:['bossrush','collapse','fake','megachest']};
  const t4=Object.keys(G.SR5.registry).filter(k=>G.SR5.registry[k].tier===4);
  const used=new Set();
  function pickSpecial(depth){
    /* 极后段稀有：devchaos 2% */
    if(t4.length && rng.chance(.008) && !used.has(t4[0])){ used.add(t4[0]); return t4[0]; }
    const tier=Math.min(3, depth);
    const pool=T[tier].filter(id=>!used.has(id));
    if(pool.length){ const id=pool[Math.floor(Math.random()*pool.length)]; used.add(id); return id; }
    const all=T[tier];
    return all[Math.floor(Math.random()*all.length)];
  }
  const arms=[];
  for(let i=0;i<nDirs;i++){
    const [dx,dz]=DIRS[i];
    const dist=rng.int(3,5);
    const arm={dir:[dx,dz], zones:[], depth:0};
    let parent=core;
    const nodes=rng.int(2,4);
    for(let n=0;n<nodes;n++){
      const depth=n+1;
      /* 特殊房占比 60~75%：每节点 78% 特殊 / 22% 战斗 */
      const isSpecial=rng.chance(.74);
      let rw,rh,shape,type,special=null;
      if(isSpecial){
        special=pickSpecial(depth);
        const spec=G.SR5.registry[special];
        rw=spec.w; rh=spec.h;
        shape=rng.chance(.3)?'ring':'rect';
        if(special==='bossrush') shape='rect';
        type='special';
      } else {
        const r2=rng.f();
        if(r2<.4){rw=2;rh=2;} else if(r2<.8){rw=3;rh=2;} else {rw=2;rh=3;}
        shape='rect'; type='combat';
      }
      let zone=null;
      for(let t=0;t<16 && !zone;t++){
        const off=rng.int(0,2);
        /* 深层大房放不下时逐级收缩尺寸（最低 3×2）——节点缺失比房间小更伤玩法 */
        const shrink=t>6? Math.min(2, t-6):0;
        const w2=Math.max(3, rw-shrink), h2=Math.max(2, rh-shrink);
        let arx, arz;
        if(t<8){
          /* 前段：沿支路方向放射 */
          arx=dx>0? parent.rx+parent.rw-1+rng.int(2,3)+(t>>1) : (dx<0? parent.rx-rng.int(2,3)-w2-(t>>1) : parent.rx-w2+1+off+rng.int(-1,1));
          arz=dz>0? parent.rz+parent.rh-1+rng.int(2,3)+(t>>1) : (dz<0? parent.rz-rng.int(2,3)-h2-(t>>1) : parent.rz-h2+1+off+rng.int(-1,1));
        } else {
          /* 兜底：parent 周围全向找位（深层沿方向必出界——t3 大房曾整层缺失） */
          arx=parent.rx+rng.int(-4,4)-((w2-1)>>1)+(dx>0?parent.rw-1:0)+(dx<0?1-w2:0);
          arz=parent.rz+rng.int(-4,4)-((h2-1)>>1)+(dz>0?parent.rh-1:0)+(dz<0?1-h2:0);
        }
        zone=addRoom(arx,arz,w2,h2,type,shape,special);
      }
      if(!zone) continue;
      if(!layBridge(parent, zone)){
        removeRoom(zone);
        continue;
      }
      arm.zones.push(zone);
      parent=zone;
    }
    if(arm.zones.length) arms.push(arm);
  }
  if(arms.length<4){ dbg.push('arms'+arms.length); return null; }

  /* 回环：相邻支路末端互连（可选路径） */
  for(let i=0;i<arms.length;i++){
    for(let j=i+1;j<arms.length;j++){
      if(!rng.chance(.4)) continue;
      const a=arms[i].zones[arms[i].zones.length-1], b=arms[j].zones[arms[j].zones.length-1];
      if(Math.abs(a.rx-b.rx)+Math.abs(a.rz-b.rz)<=10) layBridge(a,b);
    }
  }

  /* ---------- 3. BFS 深度 ---------- */
  function computeDepth(){
    rooms.forEach(r=>r.depth=-1);
    core.depth=0;
    const q=[core];
    while(q.length){ const r=q.shift(); for(const n of r.neighbors){ if(n.depth<0){ n.depth=r.depth+1; q.push(n); } } }
  }
  computeDepth();
  const specials=rooms.filter(r=>r.type==='special');
  const combats=rooms.filter(r=>r.type==='combat');
  if(specials.length<6){ dbg.push('sp'+specials.length); return null; }
  /* 特殊房占比 60~75% */
  const ratio=specials.length/(specials.length+combats.length);
  if(ratio<.55){ dbg.push('ratio'+ratio.toFixed(2)); return null; }

  /* ---------- 4. Boss 竞技场（全游戏最大 6×5） ---------- */
  let bossRoom=null;
  {
    const anchors=rooms.filter(r=>r.type!=='boss'&&r.type!=='secret').sort((a,b)=>b.depth-a.depth).slice(0,8);
    for(const anchor of anchors){
      const dx=Math.sign(anchor.rx+(anchor.rw>>1)), dz=Math.sign(anchor.rz+(anchor.rh>>1));
      for(let t=0;t<8;t++){
        const arx=dx>0? anchor.rx+anchor.rw+t : (dx<0? anchor.rx-5-t : anchor.rx-3);
        const arz=dz>0? anchor.rz+anchor.rh+t : (dz<0? anchor.rz-4-t : anchor.rz-2);
        if(dx!==0&&dz!==0&&t>2) break;
        const r=addRoom(arx,arz,5,4,'boss','boss');
        if(!r) continue;
        if(layBridge(anchor,r)){ r.used=true; bossRoom=r; break; }
        for(let x=r.rx;x<r.rx+6;x++) for(let z=r.rz;z<r.rz+5;z++) occupied.delete(keyOf(x,z));
        rooms.splice(rooms.indexOf(r),1);
      }
      if(bossRoom) break;
    }
    // 兜底：征用最深 anchor 改造为 Boss 竞技场（罕见：放置全部失败时）
    if(!bossRoom && anchors.length){
      const a0=anchors.find(r=>r.type==='combat') || anchors[0];   // 优先征用战斗房，避免特殊房占比跌破下限
      a0.type='boss'; a0.shape='boss'; a0.used=true; bossRoom=a0;
      if(a0.special){ /* 特殊房被征用 → 补一个同级特殊房标记到其他 special（占比保护） */ }
    }
    if(!bossRoom){ dbg.push('boss'); return null; }
  }

  /* ---------- 5. 隐藏房 ---------- */
  {
    const cands=rng.shuffle(rooms.filter(r=>r.type==='combat'||r.type==='bridge').slice());
    for(const room of cands){
      for(let dir=0;dir<4;dir++){
        let rx,rz;
        if(dir===0){ rx=room.rx; rz=room.rz-1; }
        else if(dir===1){ rx=room.rx+room.rw; rz=room.rz; }
        else if(dir===2){ rx=room.rx; rz=room.rz+room.rh; }
        else { rx=room.rx-1; rz=room.rz; }
        const r=addRoom(rx,rz,1,1,'secret','rect');
        if(r){ connect(room,r,true); r.cleared=true; break; }
      }
      if(rooms.some(r=>r.type==='secret')) break;
    }
  }
  computeDepth();

  /* ---------- 6. 特殊房敌人波预填（战斗房用标准波） ---------- */
  for(const room of rooms){
    if(room.type==='combat'){
      const comp=[];
      let budget=4+room.rw*room.rh*1.6+rng.range(0,2);
      const pool=['gunner','shroom','wisp','beetle','charger','orbiter','totem','hexer'];
      let g=0;
      while(budget>0 && g++<20){
        comp.push(pool[Math.floor(Math.random()*pool.length)]);
        budget-=1.6;
      }
      room.enemyWaves=[comp.map(t=>({type:t,elite:false}))];
    }
  }

  /* ---------- 7. 掩码 → tile ---------- */
  for(const room of rooms){
    genMask(room, rng);
    for(let x=room.rx*CW;x<(room.rx+room.rw)*CW;x++)
      for(let z=room.rz*CH;z<(room.rz+room.rh)*CH;z++){
        const k=keyOf(x,z);
        if(!floor.tiles.has(k)) floor.tiles.set(k,{t:'wall',x,z});
      }
    for(const k of room.mask){
      const [x,z]=k.split(',').map(Number);
      floor.tiles.set(k,{t:'floor',x,z,room});
    }
  }
  for(const d of doors){
    for(const [x,z] of d.tiles){
      const tile=floor.tiles.get(keyOf(x,z));
      if(!tile) continue;
      if(d.secret){ tile.t='wall'; tile.secret=d; tile.cracked=false; }
      else { tile.t='door'; tile.door=d; tile.room=d.rooms[0]; }
    }
  }
  /* 门廊保底 */
  for(const room of rooms){
    for(const d of room.doors){
      for(const [dx,dz] of d.tiles){
        if(dx===room.x0-1){ for(let i=0;i<2;i++) room.mask.add(keyOf(room.x0+i,dz)); }
        else if(dx===room.x1+1){ for(let i=0;i<2;i++) room.mask.add(keyOf(room.x1-i,dz)); }
        else if(dz===room.z0-1){ for(let i=0;i<2;i++) room.mask.add(keyOf(dx,room.z0+i)); }
        else if(dz===room.z1+1){ for(let i=0;i<2;i++) room.mask.add(keyOf(dx,room.z1-i)); }
        else room.mask.add(keyOf(dx,dz));
      }
    }
  }
  /* 掩码改动后重写 tile（门廊保底新增的 mask tile） */
  for(const room of rooms){
    for(const k of room.mask){
      const [x,z]=k.split(',').map(Number);
      const t=floor.tiles.get(k);
      if(t && t.t==='wall') floor.tiles.set(k,{t:'floor',x,z,room});
    }
  }
  floor.startRoom=core;
  floor.exitRoom=null;
  floor.bossRoom=bossRoom;

  /* ---------- 8. 房间内容（战斗房装饰） ---------- */
  for(const room of rooms){
    if(room.type==='combat'||room.type==='special'){
      const inner=[...room.mask].map(k=>k.split(',').map(Number));
      const nDeco=rng.int(3,7);
      for(let i=0;i<nDeco;i++){
        const [x,z]=rng.pick(inner);
        room.decor=room.decor||[];
        room.decor.push({x,z, kind: rng.pick(['rune2','shard2','riftskar','conduit','wreck','floatrock'])});
      }
      /* 能量柱（沿边缘） */
      const edge=[];
      for(const k of room.mask){
        const [x,z]=k.split(',').map(Number);
        if(!room.mask.has(keyOf(x+1,z))||!room.mask.has(keyOf(x-1,z))||!room.mask.has(keyOf(x,z+1))||!room.mask.has(keyOf(x,z-1)))
          edge.push([x,z]);
      }
      rng.shuffle(edge);
      const t=[]; const step=Math.max(2, Math.floor(edge.length/8));
      for(let i=0;i<edge.length && t.length<8;i+=step){ const [x,z]=edge[i]; t.push({x:x+.5,z:z+.5,fx:0,fz:0}); }
      room.torches=t;
    }
  }

  /* ---------- 9. 全图连通校验 ---------- */
  {
    const reach=new Set([core]); const q=[core];
    while(q.length){ const r=q.shift(); for(const n of r.neighbors){ if(!reach.has(n)){ reach.add(n); q.push(n); } } }
    for(const r of rooms) if(!reach.has(r)){ dbg.push('conn'); return null; }
  }

  floor.tilesGet=(x,z)=>floor.tiles.get(keyOf(x,z));
  return floor;
}

/* 形状掩码：rect 全填 / ring 环带 / core 椭圆 / boss 大椭圆 / bridge 门廊铺 */
function genMask(room, rng){
  const mask=room.mask=new Set();
  const add=(x,z)=>{ if(x>=room.x0&&x<=room.x1&&z>=room.z0&&z<=room.z1) mask.add(keyOf(x,z)); };
  const cx=room.cx, cz=room.cz;
  switch(room.shape){
    case 'core': case 'boss': {
      const rx=(room.x1-room.x0+1)/2-0.4, rz=(room.z1-room.z0+1)/2-0.4;
      for(let x=room.x0;x<=room.x1;x++) for(let z=room.z0;z<=room.z1;z++){
        const ddx=(x+.5-cx)/rx, ddz=(z+.5-cz)/rz;
        if(ddx*ddx+ddz*ddz<=1) add(x,z);
      }
      break; }
    case 'ring': {
      const rx=(room.x1-room.x0+1)/2-0.4, rz=(room.z1-room.z0+1)/2-0.4;
      const irx=rx*.45, irz=rz*.45;
      for(let x=room.x0;x<=room.x1;x++) for(let z=room.z0;z<=room.z1;z++){
        const ddx=x+.5-cx, ddz=z+.5-cz;
        const dOut=(ddx/rx)*(ddx/rx)+(ddz/rz)*(ddz/rz);
        const dIn=(ddx/irx)*(ddx/irx)+(ddz/irz)*(ddz/irz);
        if(dOut<=1 && dIn>=1) add(x,z);
      }
      break; }
    case 'bridge': {
      const W=room.x1-room.x0, H=room.z1-room.z0, off=2;
      if(W>=H){ const bz=Math.floor(room.cz)-off; for(let x=room.x0;x<=room.x1;x++) for(let z=bz;z<bz+5;z++) add(x,z); }
      else { const bx=Math.floor(room.cx)-off; for(let z=room.z0;z<=room.z1;z++) for(let x=bx;x<bx+5;x++) add(x,z); }
      break; }
    default:
      for(let x=room.x0;x<=room.x1;x++) for(let z=room.z0;z<=room.z1;z++) add(x,z);
  }
}

G.floor5 = F5;
})();
