/* 第九层事故 - 第四层「失序维度」专属生成器：节点图布局 + 空间块 + 特殊连接
   ================================================================
   与前三层生成器（gen.js）的根本差异：
   - 前三层：随机房间拼图（矩形房间 + 门即走廊，线性生长 + 环路）
   - 第四层：中央核心 + 4~6 主方向放射 + 桥房连接（可错位 L 形）+ 大跨度断裂空间
   结构契约与 gen.js 完全一致（floor/room/door/tile 四件套），
   build/game/ui 零改动消费；房间内部地板形状由 room.shape 掩码决定（非矩形）。
   地图边界 17×15 cells（前三层 13×11），面积约 1.8 倍。 */
'use strict';
(function(){
const CW=G.CW, CH=G.CH; // 15×11 tile/格（与 gen.js 一致）
function keyOf(x,z){ return x+','+z; }

/* 第四层地图边界（cell 坐标）：比前三层（-6..7 / -5..6）大一圈 */
const BX0=-10, BX1=11, BZ0=-9, BZ1=10;

const GEN4 = {};

/* ================= 主入口（含结构重试） ================= */
GEN4.genFloor = function(floorNum, seed){
  GEN4._dbg=[];
  // 结构校验不合格时换内部种子重试（节点图布局存在小概率放置失败）
  for(let attempt=0; attempt<10; attempt++){
    const rng = new G.RNG((seed ^ (attempt*0x9e3779b1))>>>0);
    const floor = tryBuild(floorNum, rng, GEN4._dbg);
    if(floor) return floor;
  }
  // 最终兜底：换独立种子再试两次（几乎不会走到；同样记录失败原因便于调参）
  return tryBuild(floorNum, new G.RNG((seed^0x5bd1e995)>>>0), GEN4._dbg) || tryBuild(floorNum, new G.RNG(88675123), GEN4._dbg);
};

/* ================= 布局构建 ================= */
function tryBuild(floorNum, rng, dbg){
  const rooms=[], doors=[], occupied=new Map();
  const floor = { num:floorNum, rooms, doors, tiles:new Map(), props:[], hazards:[], decor:[], rng,
    /* 第四层机制清单（build.js 渲染 + GEN4.update 驱动） */
    mech:{ phaseDoors:[], foldGates:[], riftAnchors:[], wells:[] } };

  function cellsFree(rx,rz,rw,rh){
    if(rx<BX0||rz<BZ0||rx+rw>BX1||rz+rh>BZ1) return false;
    for(let x=rx;x<rx+rw;x++) for(let z=rz;z<rz+rh;z++) if(occupied.has(keyOf(x,z))) return false;
    return true;
  }
  function addRoom(rx,rz,rw,rh,type,shape){
    if(!cellsFree(rx,rz,rw,rh)) return null;
    const room={ id:rooms.length, type, shape:shape||'rect', rx,rz,rw,rh,
      doors:[], neighbors:[], cleared:false, discovered:false, visited:false, mapHint:false,
      enemyWaves:null, waveIdx:0, props:[], spawnPts:[], torches:[], hazards:[], depth:0, used:false };
    for(let x=rx;x<rx+rw;x++) for(let z=rz;z<rz+rh;z++) occupied.set(keyOf(x,z), room);
    room.x0=rx*CW+1; room.x1=(rx+rw)*CW-2; room.z0=rz*CH+1; room.z1=(rz+rh)*CH-2;
    room.cx=(room.x0+room.x1+1)/2; room.cz=(room.z0+room.z1+1)/2;
    rooms.push(room);
    return room;
  }
  /* 门模型与 gen.js 完全一致：仅正交紧贴两房可连，恒 4-tile（2×2 开口） */
  function connect(a,b,secret,phase){
    if(a.neighbors.includes(b)) return null;
    let tiles=[];
    if(b.rx+b.rw===a.rx || a.rx+a.rw===b.rx){
      const left = (b.rx+b.rw===a.rx)? b : a;
      const right = (left===b)? a : b;
      const x0=right.rx*CW-1, x1=right.rx*CW;
      const zs=Math.max(a.z0,b.z0), ze=Math.min(a.z1,b.z1);
      if(ze-zs<1) return null;
      let zc=G.clamp(Math.floor((zs+ze)/2), zs, ze-1);
      tiles=[[x0,zc],[x1,zc],[x0,zc+1],[x1,zc+1]];
    } else if(b.rz+b.rh===a.rz || a.rz+a.rh===b.rz){
      const top = (b.rz+b.rh===a.rz)? b : a;
      const bot = (top===b)? a : b;
      const z0=bot.rz*CH-1, z1=bot.rz*CH;
      const xs=Math.max(a.x0,b.x0), xe=Math.min(a.x1,b.x1);
      if(xe-xs<1) return null;
      let xc=G.clamp(Math.floor((xs+xe)/2), xs, xe-1);
      tiles=[[xc,z0],[xc,z1],[xc+1,z0],[xc+1,z1]];
    } else return null;
    const door={ id:doors.length, rooms:[a,b], tiles, open:!secret, secret:!!secret, broken:false,
      lockT:0, crackHp:3, phase:!!phase };
    doors.push(door); a.doors.push(door); b.doors.push(door);
    a.neighbors.push(b); b.neighbors.push(a);
    if(phase) floor.mech.phaseDoors.push(door);
    return door;
  }

  /* ---- 桥房铺设：a、b 两房之间的中间 cell 铺 bridge 房链（直线或 L 形） ----
     桥本身是房间（狭长地板通道），两端标准 4-tile 门，完全复用现有门/锁/清剿模型。
     原子化：失败时回滚已建桥房与门（杜绝孤儿桥残留占位/挡路）；
     路径允许汇接到既有桥房（形成枢纽式节点图，减少碎片）。 */
  function removeRoom(r){
    for(let x=r.rx;x<r.rx+r.rw;x++) for(let z=r.rz;z<r.rz+r.rh;z++) occupied.delete(keyOf(x,z));
    for(const d of r.doors.slice()){   // 摘门（doors 数组 + 两端引用 + neighbors）
      const di=doors.indexOf(d); if(di>=0) doors.splice(di,1);
      for(const rr of d.rooms){
        const i2=rr.doors.indexOf(d); if(i2>=0) rr.doors.splice(i2,1);
        const other=(rr===d.rooms[0])?d.rooms[1]:d.rooms[0];
        const i3=rr.neighbors.indexOf(other); if(i3>=0) rr.neighbors.splice(i3,1);
      }
      const pi=floor.mech.phaseDoors.indexOf(d); if(pi>=0) floor.mech.phaseDoors.splice(pi,1);
    }
    const ri=rooms.indexOf(r); if(ri>=0) rooms.splice(ri,1);
  }
  function layBridge(a, b, phase){
    if(connect(a,b,null,phase)) return true;   // 已紧贴：直接连，无需桥
    /* BFS 最短路（cell 级）：自由格 / 既有桥房格 / a b 自身格可通行，其余房间阻挡。
       途经既有桥房时汇接为枢纽（进/出各开一门），a/b 自身占格仅通行不铺地板。
       修复史：旧版仅试两种 L 形路径，且「汇接既有桥」会把终点直接改接到桥房——
       目标房永远不被连接却返回成功，产生与主图断开的孤立簇（conn 校验失败的根因）。 */
    const ax=a.rx+(a.rw>>1), az=a.rz+(a.rh>>1);
    const bx=b.rx+(b.rw>>1), bz=b.rz+(b.rh>>1);
    const prevCell=new Map(); const vis=new Set([keyOf(ax,az)]); const q=[[ax,az]];
    while(q.length){
      const [x,z]=q.shift();
      if(x===bx && z===bz) break;
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx, nz=z+dz;
        if(nx<BX0||nx>BX1-1||nz<BZ0||nz>BZ1-1) continue;   // 地图边界外不可通行
        const k=keyOf(nx,nz);
        if(vis.has(k)) continue;
        const occ=occupied.get(k);
        if(occ && occ!==a && occ!==b && occ.type!=='bridge') continue;   // 被非桥房阻挡
        vis.add(k); prevCell.set(k,[x,z]); q.push([nx,nz]);
      }
    }
    if(!vis.has(keyOf(bx,bz))) return false;   // 无路可达
    /* 回溯重建路径（a 中心 → b 中心） */
    const path=[];
    {
      let cx=bx, cz=bz;
      while(true){
        path.push({x:cx, z:cz, occ:occupied.get(keyOf(cx,cz))});
        if(cx===ax && cz===az) break;
        const p=prevCell.get(keyOf(cx,cz));
        if(!p) return false;
        cx=p[0]; cz=p[1];
      }
      path.reverse();
    }
    let freeCnt=0;
    for(const c of path) if(!c.occ) freeCnt++;
    if(freeCnt>8) return false;   // 新铺地板（自由格）过多 → 过长的桥放弃（防细线地图）
    /* 逐段铺设：自由格同向连续段合并为一个长桥房；途经既有桥房汇接。
       原子化回滚本次新建桥房；中途已建成的汇接门连接两个都会存续的房间，不属于孤儿。 */
    const built=[];
    let prev=a, ok=true;
    let i=0;
    while(i<path.length && path[i].occ===a) i++;   // 跳过起点 a 自身占格
    while(i<path.length){
      const c=path[i];
      if(c.occ===b) break;                          // 到达目标房
      if(c.occ){                                    // 途经既有桥房：汇接为枢纽
        const X=c.occ;
        while(i<path.length && path[i].occ===X) i++;
        if(prev!==X && !prev.neighbors.includes(X)){
          if(!connect(prev, X, null, phase && prev===a)){ ok=false; break; }
        }
        prev=X;
        continue;
      }
      // 自由格直段：同向连续合并为一个桥房
      let j=i, dirx=0, dirz=0;
      if(i+1<path.length && !path[i+1].occ){
        dirx=Math.sign(path[i+1].x-path[i].x);
        dirz=Math.sign(path[i+1].z-path[i].z);
        while(j+1<path.length && !path[j+1].occ
              && Math.sign(path[j+1].x-path[j].x)===dirx
              && Math.sign(path[j+1].z-path[j].z)===dirz) j++;
      }
const sx=c.x, sz=c.z, ex=path[j].x, ez=path[j].z;
      let brw=Math.abs(ex-sx)+1, brh=Math.abs(ez-sz)+1;
      let brx=Math.min(sx,ex), brz=Math.min(sz,ez);
      // 桥梁加宽：横向桥加宽 z 方向，纵向桥加宽 x 方向；目标 2 cells
      const _widen = (axis) => {
        const tryWiden = (targetW, side) => {
          if(axis==='z'){
            const addRows = targetW - brh;
            const tz = side==='+'? brz : brz - addRows;
            if(tz<BZ0 || tz+targetW>BZ1) return false;
            const cs = side==='+'? brz+brh : tz, ce = side==='+'? tz+targetW : brz;
            for(let xx=brx; xx<brx+brw; xx++) for(let zz=cs; zz<ce; zz++) if(occupied.has(keyOf(xx,zz))) return false;
            brz=tz; brh=targetW; return true;
          } else {
            const addCols = targetW - brw;
            const tx = side==='+'? brx : brx - addCols;
            if(tx<BX0 || tx+targetW>BX1) return false;
            const cs = side==='+'? brx+brw : tx, ce = side==='+'? tx+targetW : brx;
            for(let zz=brz; zz<brz+brh; zz++) for(let xx=cs; xx<ce; xx++) if(occupied.has(keyOf(xx,zz))) return false;
            brx=tx; brw=targetW; return true;
          }
        };
        for(const sd of ['+','-']) if(tryWiden(2, sd)) return;
      };
      if(brw>brh) _widen('z'); else if(brh>brw) _widen('x');
      const br=addRoom(brx,brz,brw,brh,'bridge','bridge');
      if(!br || !connect(prev,br,null,phase && prev===a)){
        if(br) built.push(br);
        ok=false; break;
      }
      built.push(br);
      prev=br;
      i=j+1;
    }
    if(ok && prev!==b && !prev.neighbors.includes(b)) ok=connect(prev,b,null,phase);
    if(!ok){
      for(let k2=built.length-1;k2>=0;k2--) removeRoom(built[k2]);
      return false;
    }
    return true;
  }

  /* ================= 1. 中央核心 ================= */
  const core = addRoom(-1,-1,2,2,'start','core');
  if(!core) return null;
  core.cleared=true;

  /* ================= 2. 主方向放射（两阶段：先放区域定节点图，再统一架桥） ================= */
  const DIRS=[ [0,-1,'北'],[1,-1,'东北'],[1,0,'东'],[1,1,'东南'],[0,1,'南'],[-1,1,'西南'],[-1,0,'西'],[-1,-1,'西北'] ];
  rng.shuffle(DIRS);
  const nDirs = rng.int(6,7);   // 6~7 个主方向（中央核心放射）
  const arms=[];   // {dir, zones:[room,...], name}

  /* ---- 阶段 1：放置全部区域（不架桥，节点图位置先行确定） ---- */
  for(let i=0;i<nDirs;i++){
    const [dx,dz,name]=DIRS[i];
    const dist = rng.int(3,4);   // 区域距核心 3~4 cell（过大易超边界）
    const jx = rng.int(-1,1), jz = rng.int(-1,1);
    let rw=1, rh=1;
    const sizeRoll=rng.f();
    if(sizeRoll<.15){ rw=2; rh=1; } else if(sizeRoll<.30){ rw=1; rh=2; } else if(sizeRoll<.55){ rw=2; rh=2; } else if(sizeRoll<.78){ rw=3; rh=2; } else if(sizeRoll<.92){ rw=2; rh=3; } else { rw=3; rh=3; }
    let zone=null;
    for(let t=0;t<8 && !zone;t++){
      const arx = dx>0 ? dist+(t>>1) : (dx<0 ? -dist-rw-(t>>1) : -((rw-1)>>1) + jx + ((t&1)?1:-1));
      const arz = dz>0 ? dist+(t>>1) : (dz<0 ? -dist-rh-(t>>1) : -((rh-1)>>1) + jz + ((t&1)?1:-1));
      zone = addRoom(arx, arz, rw, rh, 'combat', pickShape(rng, rw, rh));
    }
    if(!zone) continue;
    const arm={dir:[dx,dz], name, zones:[zone]};
    arms.push(arm);
    // 75% 概率第二圈延伸，第二圈成功后 30% 再三圈（只放置，架桥在阶段 2）
    let parent=zone;
    for(let ring=0; ring<2; ring++){
      if(!rng.chance(ring===0? .80 : .35)) break;
      const rw2 = rng.chance(.4)?(rng.chance(.5)?3:2):(rng.chance(.5)?2:1), rh2 = rng.chance(.4)?(rng.chance(.5)?3:2):(rng.chance(.5)?2:1);
      const gx = rng.int(2,3), gz = rng.int(2,3);   // 与父区域的间隔
      const arx2 = dx>0 ? parent.rx+parent.rw-1+gx : (dx<0 ? parent.rx-gx-rw2+1 : parent.rx + rng.int(-1,1));
      const arz2 = dz>0 ? parent.rz+parent.rh-1+gz : (dz<0 ? parent.rz-gz-rh2+1 : parent.rz + rng.int(-1,1));
      const z2 = addRoom(arx2, arz2, rw2, rh2, 'combat', pickShape(rng, rw2, rh2));
      if(z2){ arm.zones.push(z2); parent=z2; }
    }
  }
  if(arms.length<4){ if(dbg)dbg.push("arms"+arms.length); return null; }   // 主方向不足 → 重试

  /* ---- 阶段 2：统一架桥（core→各 arm 第一区，arm 内串联；失败就挂到当前已连通的任意房间） ---- */
  const linked=new Set([core]);
  /* 目标房就近挂到「当前与核心连通的房间」（候选含桥房枢纽，按距离取前 4） */
  function hookToLinked(target){
    const rs=new Set([core]); const rq=[core];
    while(rq.length){ const r=rq.shift(); for(const n of r.neighbors) if(!rs.has(n)){ rs.add(n); rq.push(n); } }
    const cands=rooms.filter(r=>rs.has(r)&&r!==target&&r!==core)
      .sort((p,q)=>G.dist2(p.cx,p.cz,target.cx,target.cz)-G.dist2(q.cx,q.cz,target.cx,target.cz));
    for(const c of cands.slice(0,4)){ if(layBridge(c, target, false)) return true; }
    return false;
  }
  for(const arm of arms){
    const z0=arm.zones[0];
    if(!layBridge(core, z0, rng.chance(.22)) && !hookToLinked(z0)){   // 22% 相位桥
      // 彻底连不上：回收该 arm 全部区域
      for(const z of arm.zones) removeRoom(z);
      arm.dead=true;
      continue;
    }
    linked.add(z0);
    // arm 内串联（含第二/三圈）；直接串联失败就改挂已连通区域，仍失败才砍后段
    for(let k=1;k<arm.zones.length;k++){
      if(layBridge(arm.zones[k-1], arm.zones[k], rng.chance(.18)) || hookToLinked(arm.zones[k])) linked.add(arm.zones[k]);
      else {   // 串联失败：砍掉该子区域及其后段
        for(let k2=k;k2<arm.zones.length;k2++) removeRoom(arm.zones[k2]);
        arm.zones.length=k;
        break;
      }
    }
  }
  // 回收死 arm
  for(let i=arms.length-1;i>=0;i--) if(arms[i].dead || !arms[i].zones.length) arms.splice(i,1);
  if(arms.length<4){ if(dbg)dbg.push("armsL"+arms.length); return null; }

  /* ---- 回环连接：相邻主方向的区域之间额外架桥（产生可选路线） ---- */
  for(let i=0;i<arms.length;i++){
    for(let j=i+1;j<arms.length;j++){
      if(!rng.chance(.35)) continue;
      const a=arms[i].zones[arms[i].zones.length-1], b=arms[j].zones[arms[j].zones.length-1];
      // 只连距离不太远的（防超细长桥）
      const d=Math.abs(a.rx-b.rx)+Math.abs(a.rz-b.rz);
      if(d<=9) layBridge(a,b,false);
    }
  }

  /* ================= 3. BFS 深度 ================= */
  function computeDepth(){
    rooms.forEach(r=>r.depth=-1);
    core.depth=0;
    const q=[core];
    while(q.length){ const r=q.shift(); for(const n of r.neighbors){ if(n.depth<0){ n.depth=r.depth+1; q.push(n); } } }
  }
  computeDepth();
  const mainZones = rooms.filter(r=>r.type==='combat');
  if(mainZones.length<10){ if(dbg)dbg.push("zones"+mainZones.length); return null; }   // 主要区域不足 → 重试

  /* ================= 4. 特殊房分配 ================= */
  // 末端区域（死胡同）候选，按深度降序
  const deadEnds = ()=> mainZones.filter(r=>!r.used && r.neighbors.filter(n=>n.type!=='secret').length===1);
  function takeSpecial(type, minDepth){
    let pool=deadEnds().filter(r=>r.depth>=(minDepth||0));
    if(!pool.length) pool=mainZones.filter(r=>!r.used && r.depth>=(minDepth||1));
    if(!pool.length) pool=mainZones.filter(r=>!r.used);
    if(!pool.length) return null;
    pool.sort((a,b)=>b.depth-a.depth);
    const r = rng.chance(.7)? pool[0] : rng.pick(pool.slice(0,Math.min(3,pool.length)));
    r.type=type; r.used=true; r.cleared=true;
    return r;
  }

  /* Boss 房：最深方向末端新造 2×2 环形竞技场（原子放置+桥连接） */
  let bossRoom=null;
  {
    const anchors=mainZones.slice().sort((a,b)=>b.depth-a.depth).slice(0,6);
    outer:
    for(const anchor of anchors){
      const dx=Math.sign(anchor.rx+(anchor.rw>>1)), dz=Math.sign(anchor.rz+(anchor.rh>>1));
      for(let t=0;t<8;t++){
        const off=rng.int(0,2);
        const arx = dx>0? anchor.rx+anchor.rw+t : (dx<0? anchor.rx-2-t : anchor.rx-1+off);
        const arz = dz>0? anchor.rz+anchor.rh+t : (dz<0? anchor.rz-2-t : anchor.rz-1+off);
        if(dx!==0 && dz!==0 && t>2) break;
        const r=addRoom(arx, arz, 4, 4, 'boss', 'boss');
        if(!r) continue;
        if(layBridge(anchor, r, false)){ r.used=true; bossRoom=r; break outer; }
        for(let x=r.rx;x<r.rx+4;x++) for(let z=r.rz;z<r.rz+4;z++) occupied.delete(keyOf(x,z));
        rooms.splice(rooms.indexOf(r),1);
      }
    }
    // 兜底：征用最深战斗房改造为 Boss 竞技场
    if(!bossRoom && anchors[0]){ anchors[0].type='boss'; anchors[0].shape='boss'; anchors[0].used=true; bossRoom=anchors[0]; }
    if(!bossRoom){ if(dbg)dbg.push("boss"); return null; }
  }

  takeSpecial('treasure', 2);
  takeSpecial('shop', 2);
  if(rng.chance(.7)) takeSpecial('shrine', 1);
  if(rng.chance(.55)) takeSpecial('gamble', 1);
  /* 档案室升级与深渊共鸣（与 gen.js 同口径：永久升级真实接入生成器） */
  {
    const archLv=G.meta ? G.meta.up('archive') : 0;
    for(let i=0;i<archLv;i++) if(rng.chance(.3)) takeSpecial(rng.chance(.5)?'treasure':'shop', 1);
    const lootLv=G.meta && G.meta.resonanceLv ? G.meta.resonanceLv('affinity_loot') : 0;
    for(let i=0;i<lootLv;i++) if(rng.chance(.04)) takeSpecial(rng.chance(.6)?'treasure':'shop', 1);
  }

  /* ---- 隐藏区：贴邻某个桥/区域的 1×1 secret 房（裂纹墙） ---- */
  {
    let placed=false;
    const cands=rng.shuffle(rooms.filter(r=>r.type==='combat'||r.type==='bridge').slice());
    outer2:
    for(const room of cands){
      for(let dir=0;dir<4;dir++){
        let rx,rz;
        if(dir===0){ rx=room.rx; rz=room.rz-1; }
        else if(dir===1){ rx=room.rx+room.rw; rz=room.rz; }
        else if(dir===2){ rx=room.rx; rz=room.rz+room.rh; }
        else { rx=room.rx-1; rz=room.rz; }
        const r=addRoom(rx,rz,1,1,'secret','rect');
        if(r){ connect(room,r,true); r.cleared=true; placed=true; break outer2; }
      }
    }
  }
  computeDepth();

  /* ================= 5. 机制布置 ================= */
  /* 空间折叠门：选 2 对相距最远的区域（可理解的双向折跃，标牌指路） */
  {
    const zs=mainZones.filter(r=>!r.used && r.type==='combat');
    if(zs.length>=4){
      zs.sort((a,b)=>b.depth-a.depth);
      const pairs=[];
      const usedG=new Set();
      for(let k=0;k<2 && zs.length>=2;k++){
        const a=zs.find(r=>!usedG.has(r)); if(!a) break; usedG.add(a);
        let best=null,bd=-1;
        for(const b of zs){ if(usedG.has(b)) continue;
          const d=G.dist2(a.cx,a.cz,b.cx,b.cz); if(d>bd){bd=d;best=b;} }
        if(!best) break; usedG.add(best);
        pairs.push([a,best]);
      }
      for(const [a,b] of pairs){
        const na=arms.find(ar=>ar.zones.includes(a)), nb=arms.find(ar=>ar.zones.includes(b));
        const ga={x:a.cx, z:a.z1-1.5, pair:1, toName:(nb?nb.name:'深处')+'区'};
        const gb={x:b.cx, z:b.z1-1.5, pair:0, toName:(na?na.name:'深处')+'区'};
        floor.mech.foldGates.push({a:ga, b:gb});
        a.props.push({type:'foldgate', x:ga.x, z:ga.z, gateId:floor.mech.foldGates.length-1, side:'a'});
        b.props.push({type:'foldgate', x:gb.x, z:gb.z, gateId:floor.mech.foldGates.length-1, side:'b'});
      }
    }
  }
  /* 裂缝锚点：交互后撕开隐藏房通路（秘密入口的可读开启方式） */
  {
    const sd=doors.find(d=>d.secret);
    if(sd){
      const host=sd.rooms.find(r=>r.type!=='secret');
      if(host){
        const ax=host.cx, az=host.z0+1.5;
        floor.mech.riftAnchors.push({x:ax, z:az, door:sd});
        host.props.push({type:'riftanchor', x:ax, z:az, doorId:sd.id});
      }
    }
  }
  /* 引力井：Boss 竞技场 + 随机 1 个大战斗区（周期性缓慢拉拽，可走位对抗） */
  {
    if(bossRoom) bossRoom.well={x:bossRoom.cx, z:bossRoom.cz, r:7.5, period:6.5};
    const big=mainZones.filter(r=>r.type==='combat' && r.rw*r.rh>=2 && !r.used);
    if(big.length && rng.chance(.6)){
      const r=rng.pick(big);
      r.well={x:r.cx, z:r.cz, r:6.5, period:7.5};
    }
  }

  /* ================= 6. 地板掩码（按 shape 生成非矩形内部结构） ================= */
  for(const room of rooms) genMask(room, rng);
  /* 门廊保底：每个门的门内立足点强制为地板（任何形状都必须能走进走出） */
  for(const room of rooms) doorGuarantee(room);
  /* 房内 BFS 连通修复：任一门的立足点到不了另一个门 → 铺直通道 */
  for(const room of rooms) ensureConnectivity(room);
  /* 机制 prop 落点修正：折叠门/裂缝锚点在掩码生成前按中心估算落点，
     若落在虚空（断裂缝/环带内环/平台锯齿缺口）则吸附到最近地板 */
  for(const room of rooms){
    for(const pp of room.props){
      if(pp.type!=='foldgate' && pp.type!=='riftanchor') continue;
      const fx0=Math.floor(pp.x), fz0=Math.floor(pp.z);
      if(room.mask.has(keyOf(fx0,fz0))) continue;
      let best=null, bd=1e9;
      for(const k of room.mask){
        const [x,z]=k.split(',').map(Number);
        const d=G.dist2(x+.5,z+.5,pp.x,pp.z);
        if(d<bd){ bd=d; best=[x,z]; }
      }
      if(best){
        pp.x=best[0]+.5; pp.z=best[1]+.5;
        // 同步 mech 门对象：build.js 折叠门的 prop 落点与传送目标读 gate.a/b（而非此 props 条目），
        // 不同步则吸附失效，传送点可能落进虚空裂缝（环形房内环/断裂缝/走廊外侧）
        if(pp.type==='foldgate' && floor.mech.foldGates[pp.gateId]){
          const me=floor.mech.foldGates[pp.gateId][pp.side];
          if(me){ me.x=pp.x; me.z=pp.z; }
        }
      }
    }
  }

  /* ---- 掩码 → tile 地图 ---- */
  for(const room of rooms){
    // bbox 内非掩码 tile = 虚空断壁（wall，渲染分支处理为矮桩/深渊边缘）
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
      const k=keyOf(x,z);
      const tile=floor.tiles.get(k);
      if(!tile) continue;
      if(d.secret){ tile.t='wall'; tile.secret=d; tile.cracked=false; }
      else { tile.t='door'; tile.door=d; tile.room=d.rooms[0]; }
    }
  }
  floor.startRoom=core;
  floor.exitRoom=null;   // 第四层无出口房（Boss 击杀即通关）
  floor.bossRoom=bossRoom;

  /* ================= 7. 房间内容 ================= */
  for(const room of rooms) fillRoom(floor, room, rng);

  /* ================= 8. 全图连通性校验 ================= */
  if(!verifyConnectivity(floor)){ if(dbg)dbg.push("conn"); return null; }

  floor.tilesGet=(x,z)=>floor.tiles.get(keyOf(x,z));
  return floor;
}

/* ================= 形状抽签 ================= */
function pickShape(rng, rw, rh){
  // corridor 需要扁平 bbox（2×1 或 1×2）；ring/boss 需要 ≥2×1
  const pool=[];
  if(rw*rh>=2){
    if((rw===2&&rh===1)||(rw===1&&rh===2)) pool.push(['corridor',3],['ring',2],['fracture',2],['tiered',1]);
    if(rw===2&&rh===2) pool.push(['ring',3],['fracture',2],['tiered',2],['platform',2]);
  } else {
    pool.push(['platform',3],['fracture',2],['tiered',1]);
  }
  if(!pool.length) return 'platform';
  let tw=0; for(const p of pool) tw+=p[1];
  let v=rng.f()*tw;
  for(const p of pool){ v-=p[1]; if(v<=0) return p[0]; }
  return pool[0][0];
}

/* ================= 掩码生成 ================= */
function genMask(room, rng){
  const mask=room.mask=new Set();
  const add=(x,z)=>{ if(x>=room.x0&&x<=room.x1&&z>=room.z0&&z<=room.z1) mask.add(keyOf(x,z)); };
  const cx=room.cx, cz=room.cz;
  switch(room.shape){
    case 'core': case 'boss': {
      // 大椭圆平台（中央核心/Boss 竞技场）
      const rx=(room.x1-room.x0+1)/2-0.4, rz=(room.z1-room.z0+1)/2-0.4;
      for(let x=room.x0;x<=room.x1;x++) for(let z=room.z0;z<=room.z1;z++){
        const dx=(x+0.5-cx)/rx, dz=(z+0.5-cz)/rz;
        if(dx*dx+dz*dz<=1) add(x,z);
      }
      break; }
    case 'ring': {
      // 椭圆环带（中央内环虚空，绕核心作战）
      const rx=(room.x1-room.x0+1)/2-0.4, rz=(room.z1-room.z0+1)/2-0.4;
      const irx=rx*0.40, irz=rz*0.40;
      for(let x=room.x0;x<=room.x1;x++) for(let z=room.z0;z<=room.z1;z++){
        const dx=(x+0.5-cx), dz=(z+0.5-cz);
        const dOut=(dx/rx)*(dx/rx)+(dz/rz)*(dz/rz);
        const dIn=(dx/irx)*(dx/irx)+(dz/irz)*(dz/irz);
        if(dOut<=1 && dIn>=1) add(x,z);
      }
      break; }
    case 'platform': {
      // 悬浮平台：收缩 1 tile + 边缘不规则锯齿缺口（空间崩坏感）
      for(let x=room.x0+1;x<=room.x1-1;x++) for(let z=room.z0+1;z<=room.z1-1;z++) add(x,z);
      for(let x=room.x0+1;x<=room.x1-1;x++){
        if(((x*31+room.id*17)%7)<2){ mask.delete(keyOf(x,room.z0+1)); mask.delete(keyOf(x,room.z1-1)); }
      }
      for(let z=room.z0+1;z<=room.z1-1;z++){
        if(((z*37+room.id*13)%7)<2){ mask.delete(keyOf(room.x0+1,z)); mask.delete(keyOf(room.x1-1,z)); }
      }
      break; }
    case 'fracture': {
      // 断裂房间：中央十字虚空裂缝（房间被劈成 4 块，桥接条通行）
      const cxi=Math.floor(cx), czi=Math.floor(cz);
      const gapW = room.rw>=2?1:0;   // 大房裂缝宽 2 tile（±1），小房 1 tile（±0）
      for(let x=room.x0+1;x<=room.x1-1;x++) for(let z=room.z0+1;z<=room.z1-1;z++){
        if(Math.abs(x-cxi)<=gapW || Math.abs(z-czi)<=gapW) continue;
        add(x,z);
      }
      // 桥接条：随机选横向或纵向，在裂缝上开一条 2 tile 宽通道（偏离中心）
      const horiz = rng.chance(.5);
      if(horiz){
        const bx = room.x0+2+rng.int(0, Math.max(0,((room.x1-room.x0-4)/2)|0));
        for(let x=bx;x<bx+2;x++) for(let z=czi-gapW;z<=czi+gapW;z++) add(x,z);
      } else {
        const bz = room.z0+2+rng.int(0, Math.max(0,((room.z1-room.z0-4)/2)|0));
        for(let z=bz;z<bz+2;z++) for(let x=cxi-gapW;x<=cxi+gapW;x++) add(x,z);
      }
      break; }
    case 'corridor': {
      // 长走廊战斗区：沿长轴的中间 3 tile 宽长条
      const W=room.x1-room.x0, H=room.z1-room.z0;
      if(W>=H){
        const z0=Math.floor(cz)-1;
        for(let x=room.x0+1;x<=room.x1-1;x++) for(let z=z0;z<=z0+2;z++) add(x,z);
      } else {
        const x0=Math.floor(cx)-1;
        for(let z=room.z0+1;z<=room.z1-1;z++) for(let x=x0;x<=x0+2;x++) add(x,z);
      }
      break; }
    case 'bridge': {
      // 桥房：掩码先留空，由门廊保底 + BFS 修复沿门位置铺通道（狭长浮桥）
      break; }
    case 'tiered': case 'rect': default: {
      // 多层平台房（完整矩形地板，高台为 prop 视觉多层）/ 普通矩形
      for(let x=room.x0;x<=room.x1;x++) for(let z=room.z0;z<=room.z1;z++) add(x,z);
      break; }
  }
}

/* ---- 门廊保底：每个门 tile 向内 2 格强制地板（任何形状都能进出） ---- */
function doorGuarantee(room){
  const mask=room.mask;
  for(const d of room.doors){
    for(const [dx,dz] of d.tiles){
      // 门 tile 在房间边界墙上（x0-1/x1+1/z0-1/z1+1），向内推进 2 格
      if(dx===room.x0-1){ for(let i=0;i<2;i++) mask.add(keyOf(room.x0+i,dz)); }
      else if(dx===room.x1+1){ for(let i=0;i<2;i++) mask.add(keyOf(room.x1-i,dz)); }
      else if(dz===room.z0-1){ for(let i=0;i<2;i++) mask.add(keyOf(dx,room.z0+i)); }
      else if(dz===room.z1+1){ for(let i=0;i<2;i++) mask.add(keyOf(dx,room.z1-i)); }
      else { mask.add(keyOf(dx,dz)); }   // 门 tile 在房内（桥房中央）：直接保底
    }
  }
}

/* ---- 房内 BFS 连通修复：任一门立足点不可达另一门 → 铺 L 形通道 ---- */
function ensureConnectivity(room){
  const mask=room.mask;
  // 每个门的「门内立足点」
  const pts=[];
  for(const d of room.doors){
    for(const [dx,dz] of d.tiles){
      let px=dx, pz=dz;
      if(dx===room.x0-1) px=room.x0; else if(dx===room.x1+1) px=room.x1;
      if(dz===room.z0-1) pz=room.z0; else if(dz===room.z1+1) pz=room.z1;
      const k=keyOf(px,pz);
      if(!pts.some(p=>p[0]===px&&p[1]===pz)) pts.push([px,pz]);
    }
  }
  if(pts.length<2) return;
  // BFS
  const reach=new Set([keyOf(pts[0][0],pts[0][1])]);
  const q=[pts[0]];
  while(q.length){
    const [x,z]=q.shift();
    for(const [nx,nz] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]]){
      const k=keyOf(nx,nz);
      if(mask.has(k) && !reach.has(k)){ reach.add(k); q.push([nx,nz]); }
    }
  }
  // 未到达的立足点：铺 L 形通道（宽 2，保证玩家直径可通过）
  for(const [px,pz] of pts){
    if(reach.has(keyOf(px,pz))) continue;
    let x=pts[0][0], z=pts[0][1];
    while(x!==px){ x+=Math.sign(px-x); mask.add(keyOf(x,z)); if(x+1<=room.x1) mask.add(keyOf(x+1,z)); }
    while(z!==pz){ z+=Math.sign(pz-z); mask.add(keyOf(x,z)); if(z+1<=room.z1) mask.add(keyOf(x,z+1)); }
    mask.add(keyOf(px,pz));
    // 重 BFS（简化：把新通道纳入后继续检查下一个）
    const q2=[[x,z]];
    while(q2.length){
      const [ax,az]=q2.shift();
      for(const [nx,nz] of [[ax+1,az],[ax-1,az],[ax,az+1],[ax,az-1]]){
        const k=keyOf(nx,nz);
        if(mask.has(k) && !reach.has(k)){ reach.add(k); q2.push([nx,nz]); }
      }
    }
  }
  /* 全掩码连通扫尾：不只门立足点，房间里任何一块地板都必须能从门内走到
     （单门走廊房门开在短边时，门廊块与中间通道隔着虚空——敌人会刷在
     玩家走不到也打不到的孤岛上，造成清剿软锁）。
     做法：找任一不可达 mask tile → 从首个立足点铺 L 通道 → 重 BFS，直至全部可达。 */
  if(!pts.length) return;
  for(let guard=0; guard<16; guard++){
    let unreach=null;
    const seen=new Set([keyOf(pts[0][0],pts[0][1])]);
    const q3=[pts[0]];
    while(q3.length){
      const [ax,az]=q3.shift();
      for(const [nx,nz] of [[ax+1,az],[ax-1,az],[ax,az+1],[ax,az-1]]){
        const k=keyOf(nx,nz);
        if(mask.has(k) && !seen.has(k)){ seen.add(k); q3.push([nx,nz]); }
      }
    }
    for(const k of mask){ if(!seen.has(k)){ unreach=k; break; } }
    if(!unreach) break;
    const [ux,uz]=unreach.split(',').map(Number);
    let x=pts[0][0], z=pts[0][1];
    while(x!==ux){ x+=Math.sign(ux-x); mask.add(keyOf(x,z)); if(z+1<=room.z1) mask.add(keyOf(x,z+1)); }
    while(z!==uz){ z+=Math.sign(uz-z); mask.add(keyOf(x,z)); if(x+1<=room.x1) mask.add(keyOf(x+1,z)); }
    mask.add(keyOf(ux,uz));
  }
}

/* ================= 房间内容 ================= */
function fillRoom(floor, room, rng){
  const inner=[...room.mask].map(k=>k.split(',').map(Number));
  const nearDoor=(x,z)=>{
    for(const d of room.doors) for(const [dx,dz] of d.tiles){
      if(Math.abs(x-dx)<=2 && Math.abs(z-dz)<=2) return true;
    }
    return false;
  };
  room.spawnPts = inner.filter(([x,z])=>!nearDoor(x,z) && (x!==Math.floor(room.cx)||z!==Math.floor(room.cz)));
  const free=()=>{ const [x,z]=rng.pick(room.spawnPts.length?room.spawnPts:inner); return {x:x+.5,z:z+.5}; };

  if(room.type==='combat'){
    /* 敌人组合：第 4 层池 = 远程弹幕↑ + 地形控制 + 冲锋的空间压力组合；按 shape 调权重 */
    const cells=room.rw*room.rh;
    let budget = 6 + cells*3.0 + rng.range(0,3.5);
    const poolBase=[
      ['sniper',2,2.6],['hexer',2,2.2],['bomber',2,2.4],['gravitator',2,1.8],['commander',2,1.6],
      ['mirror',2,1.6],['phaseprowler',2,1.8],['voidstalker',2,2.0],['riftwatcher',2,2.0],['voidacolyte',2,1.6],
      ['barrier_brute',3,1.4],['footballer',3,1.4],['jester',2,1.3],['podcaster',3,1.2],['magnetron',2,1.3],
      ['balloon_wisp',2,1.5],['orbiter',2,1.4],['totem',2,1.4],['mimic',2,1.2],['miner',2,1.3],['vaultling',2,1.4]
    ];
    // 形状加权：corridor→远程/狙击；ring→环形火力/阵型；fracture→跨缝突袭；platform→空投/跳跃
    const shapeW={ corridor:{sniper:1.6,bomber:1.4,orbiter:1.4,totem:1.4},
      ring:{orbiter:1.6,commander:1.4,podcaster:1.4,totem:1.3},
      fracture:{vaultling:1.6,miner:1.5,phaseprowler:1.4,footballer:1.3},
      platform:{balloon_wisp:1.5,vaultling:1.4,orbiter:1.3},
      tiered:{sniper:1.4,magnetron:1.3,shield:1} }[room.shape]||{};
    const pool=poolBase.map(p=>[p[0],p[1],p[2]*(shapeW[p[0]]||1)]);
    const comp=[];
    let g2=0;
    while(budget>0 && g2++<40){
      let tw=0; for(const p of pool) tw+=p[2];
      let v=rng.f()*tw, pick=pool[0];
      for(const p of pool){ v-=p[2]; if(v<=0){ pick=p; break; } }
      comp.push(pick[0]); budget-=pick[1];
    }
    /* PVZ 乱入：第四层「世界开始出现异常」——5~10% 概率替换 1~2 个敌人为 PVZ 僵尸 */
    const pvzPool=['pvz_basic','pvz_basic','pvz_basic','pvz_conehead','pvz_newspaper','pvz_balloon','pvz_polevaulter','pvz_buckethead','pvz_football','pvz_disco'];
    let pvzInvasion=false;
    if(rng.chance(0.025)){
      // PVZ 入侵事件（2.5% 极低概率）：整个房间替换为 PVZ 僵尸波
      pvzInvasion=true;
      comp.length=0;
      const invasionComp=['pvz_basic','pvz_basic','pvz_conehead','pvz_basic','pvz_newspaper','pvz_buckethead','pvz_polevaulter','pvz_basic'];
      for(const t of invasionComp) comp.push(t);
      room._pvzInvasion=true;  // 标记房间用于音乐/氛围变化
    } else if(comp.length>0 && rng.chance(0.08)){
      // 普通乱入（8% 概率）：替换 1~2 个敌人
      const n = rng.chance(.4)? 2 : 1;
      for(let i=0;i<n && comp.length>0;i++){
        const idx=rng.range(0,comp.length);
        comp[idx]=rng.pick(pvzPool);
      }
    }
    const waves=[comp];
    if(comp.length>=4 && rng.chance(.5)){
      const half=Math.ceil(comp.length/2);
      waves[0]=comp.slice(0,half); waves.push(comp.slice(half));
    }
    room.enemyWaves=waves.map(w=>{
      const arr=w.map(t=>({type:t, elite:false}));
      if(arr.length>2 && rng.chance(.55)) arr[0].elite=true;   // 第 4 层精英率 55%
      return arr;
    });
    /* 道具：按形状摆中央障碍与掩体 */
    if(room.shape==='ring'){
      room.props.push({type:'voidcore', x:room.cx, z:room.cz});   // 环形场中央能量核（绕行焦点）
    } else if(room.shape==='tiered'){
      // 多层平台：大型高台（视觉高度差，挡路挡弹）
      room.props.push({type:'highpad', x:room.cx-2, z:room.cz-1});
      if(rng.chance(.6)) room.props.push({type:'highpad', x:room.cx+2.5, z:room.cz+1.5});
    } else if(room.shape==='fracture'){
      const p=free(); room.props.push({type:'brokencol', x:p.x, z:p.z});
      const p2=free(); room.props.push({type:'brokencol', x:p2.x, z:p2.z});
    } else if(room.shape==='corridor'){
      // 走廊中段双柱（远距离战斗的节奏点）
      room.props.push({type:'pillar', x:room.cx, z:room.cz-1});
      room.props.push({type:'pillar', x:room.cx, z:room.cz+1});
    }
    // 通用掩体（少量：第四层强调开阔空间压力）
    const nT=rng.int(0,1)+(cells>=2?1:0);
    for(let i=0;i<nT;i++){ const p=free(); room.props.push({type:'table',x:p.x,z:p.z}); }
    if(rng.chance(.5)){ const p=free(); room.props.push({type:'barrel',x:p.x,z:p.z}); }
    if(rng.chance(.6)){ const p=free(); room.props.push({type:'pot',x:p.x,z:p.z}); }
    // 陷阱：虚空裂隙（第 4 层继承第 3 层）+ 少量尖刺
    if(rng.chance(.45)){
      const n=rng.int(2,4);
      const base=rng.pick(inner.filter(([x,z])=>!nearDoor(x,z)));
      for(let i=0;i<n;i++){
        const x=base[0]+rng.int(-2,2), z=base[1]+rng.int(-2,2);
        if(room.mask.has(keyOf(x,z)) && x>room.x0&&x<room.x1&&z>room.z0&&z<room.z1 && !room.hazards.some(h=>h.x===x&&h.z===z))
          room.hazards.push({x,z,kind:'voidrift',phase:rng.f()*2});
      }
    }
    if(rng.chance(.3)){
      const n=rng.int(3,5);
      const base=rng.pick(inner.filter(([x,z])=>!nearDoor(x,z)));
      for(let i=0;i<n;i++){
        const x=base[0]+rng.int(-1,1), z=base[1]+rng.int(-1,1);
        if(room.mask.has(keyOf(x,z)) && !room.hazards.some(h=>h.x===x&&h.z===z))
          room.hazards.push({x,z,kind:'spike',phase:rng.f()*2});
      }
    }
    if(rng.chance(.18)) room.props.push({type:'bonus',x:room.cx,z:room.z0+1.5});
  }
  else if(room.type==='treasure'){
{ const cands=inner.filter(([x,z])=>{ if(nearDoor(x,z)) return false; for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++){ if(!room.mask.has(keyOf(x+dx,z+dz))) return false; } return true; }); const pos=cands.length?rng.pick(cands):[Math.floor(room.cx),Math.floor(room.cz)]; room.props.push({type:'chest', tier: rng.chance(.35)?'green':'brown', x:pos[0]+.5, z:pos[1]+.5}); }
  }
  else if(room.type==='shop'){
    room.stock=G.items.shopStock(floor.num);
    room.stockPos=[];
    const n=room.stock.length;
    const span=Math.min(room.x1-room.x0-2, n*2);
    for(let i=0;i<n;i++){
      const x=room.cx-span/2+1+(n>1? i*(span/(n-1)) : 0);
      room.stockPos.push({x, z:room.cz});
    }
    room.props.push({type:'campfire',x:room.cx-2.5,z:room.cz+1.5});
  }
  else if(room.type==='shrine'){ const cands=inner.filter(([x,z])=>{ if(nearDoor(x,z)) return false; for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++){ if(!room.mask.has(keyOf(x+dx,z+dz))) return false; } return true; }); const pos=cands.length?rng.pick(cands):[Math.floor(room.cx),Math.floor(room.cz)]; room.props.push({type:'shrine',x:pos[0]+.5,z:pos[1]+.5}); }
  else if(room.type==='gamble'){ const cands=inner.filter(([x,z])=>{ if(nearDoor(x,z)) return false; for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++){ if(!room.mask.has(keyOf(x+dx,z+dz))) return false; } return true; }); const pos=cands.length?rng.pick(cands):[Math.floor(room.cx),Math.floor(room.cz)]; room.props.push({type:'gamble',x:pos[0]+.5,z:pos[1]+.5}); }
  else if(room.type==='boss'){
    room.props.push({type:'voidcore', x:room.cx, z:room.cz, boss:true});
    room.props.push({type:'pillar', x:room.x0+3, z:room.z0+3});
    room.props.push({type:'pillar', x:room.x1-2, z:room.z0+3});
    room.props.push({type:'pillar', x:room.x0+3, z:room.z1-2});
    room.props.push({type:'pillar', x:room.x1-2, z:room.z1-2});
  }
  else if(room.type==='secret'){
    room.props.push({type:'chest', tier:'red', x:room.cx, z:room.cz-1});
    room.props.push({type:'moneyPile', x:room.cx-2.5, z:room.cz+1.5});
    room.props.push({type:'heartPickup', x:room.cx+2.5, z:room.cz+1.5});
  }
  else if(room.type==='start'){
    room.props.push({type:'coredevice', x:room.cx, z:room.cz});   // 中央核心装置（视觉焦点）
  }

  /* 出生点避开实体掩体（与 gen.js 同口径） */
  {
    const blockingTypes={table:1,barrel:1,pot:1,pillar:1,chest:1,bonus:1,counter:1,pedestal:1,npc:1,shrine:1,gamble:1,throne:1,exitHatch:1,campfire:1,voidcore:1,highpad:1,brokencol:1,coredevice:1,foldgate:1,riftanchor:1};
    room.spawnPts=room.spawnPts.filter(([x,z])=>{
      const cx=x+.5, cz=z+.5;
      return !room.props.some(pp=>blockingTypes[pp.type] && G.dist2(cx,cz,pp.x,pp.z)<0.81);
    });
  }

  /* ---- 能量柱（第四层火把等价物）：沿掩码边缘取点 ---- */
  if(room.type!=='secret'){
    const edge=[];
    for(const k of room.mask){
      const [x,z]=k.split(',').map(Number);
      // 掩码边缘：邻居存在非掩码（虚空/墙）
      if(!room.mask.has(keyOf(x+1,z))||!room.mask.has(keyOf(x-1,z))||!room.mask.has(keyOf(x,z+1))||!room.mask.has(keyOf(x,z-1)))
        edge.push([x,z]);
    }
    rng.shuffle(edge);
    const t=[];
    const step=Math.max(2, Math.floor(edge.length/8));
    for(let i=0;i<edge.length && t.length<8;i+=step){
      const [x,z]=edge[i];
      t.push({x:x+.5, z:z+.5, fx:0, fz:0});
    }
    room.torches=t;
  }
  /* 地表装饰：第四层专属（浮空碎块/断裂柱/能量管道/机械残骸/发光符文/空间裂纹） */
  const nDeco=rng.int(4,8);
  for(let i=0;i<nDeco;i++){
    const [x,z]=rng.pick(inner);
    room.decor=room.decor||[];
    room.decor.push({x,z, kind: rng.pick(['rune2','shard2','riftskar','conduit','wreck','floatrock'])});
  }
}

/* ================= 全图连通性校验 ================= */
function verifyConnectivity(floor){
  const start=floor.startRoom;
  const reach=new Set([start]);
  const q=[start];
  while(q.length){ const r=q.shift(); for(const n of r.neighbors){ if(!reach.has(n)){ reach.add(n); q.push(n); } } }
  // START → 全部主要区域 / 商店 / 宝箱 / 特殊房 / Boss 必须可达（secret 经隐藏门逻辑可达即可，算入）
  for(const r of floor.rooms){ if(!reach.has(r)) return false; }
  return true;
}

/* ================= 机制帧驱动（game.js update 调用） =================
   相位桥门周期开闭 / 引力井拉拽。折叠门/裂缝锚点为交互触发（build.js 挂 interact）。 */
GEN4.update = function(dt){
  const floor=G.floor;
  if(!floor || floor.num!==4 || !floor.mech) return;
  const p=G.player;
  /* 相位桥：门按周期开闭；有实体站在门 tile 上时延迟关门（不夹人） */
  for(const d of floor.mech.phaseDoors){
    // 任一端房间处于锁定战斗时相位暂停（锁定逻辑已把门关上，周期开闭会让玩家脱战）
    if(d.rooms[0].locked || d.rooms[1].locked) continue;
    d._pt=(d._pt||0)+dt;
    const cyc=5.2, openDur=3.0;
    const wantOpen=(d._pt%cyc)<openDur;
    if(!wantOpen && d.open){
      // 关门检测：玩家/敌人在门 tile 上 → 保持开（可读性：不夹死）
      let occupiedEnt=false;
      if(p && !p.dead){ for(const [tx,tz] of d.tiles){ if(Math.abs(p.x-(tx+.5))<1 && Math.abs(p.z-(tz+.5))<1){ occupiedEnt=true; break; } } }
      if(!occupiedEnt){
        for(const e of G.enemies.list){ if(e.dead) continue;
          for(const [tx,tz] of d.tiles){ if(Math.abs(e.x-(tx+.5))<1 && Math.abs(e.z-(tz+.5))<1){ occupiedEnt=true; break; } }
          if(occupiedEnt) break;
        }
      }
      if(!occupiedEnt){ d.open=false; if(p && G.dist2(p.x,p.z,d.tiles[0][0],d.tiles[0][1])<144) G.audio.sfx('doorSlam',{v:.4}); }
    } else if(wantOpen && !d.open){
      d.open=true; if(p && G.dist2(p.x,p.z,d.tiles[0][0],d.tiles[0][1])<144) G.audio.sfx('doorOpen',{v:.4});
    }
  }
  /* 引力井：周期性 4s 拉拽（速度 0.85 u/s，可走位对抗）+ 旋涡粒子提示 */
  for(const room of floor.rooms){
    if(!room.well) continue;
    const w=room.well;
    w._t=(w._t||0)+dt;
    const ph=w._t%w.period;
    w.active=ph<4.0;
    if(w.active && p && !p.dead && G.roomAt(p.x,p.z)===room){
      const dx=w.x-p.x, dz=w.z-p.z, d=Math.hypot(dx,dz);
      if(d>1.2 && d<w.r){
        const s=0.85*dt;
        G.moveEntity(p, dx/d*s, dz/d*s);
      }
      // 旋涡粒子（低频点缀，表达引力场）
      if(Math.random()<dt*6){
        const a=Math.random()*G.TAU, rr=1.5+Math.random()*(w.r-2);
        G.fx.particle(w.x+Math.cos(a)*rr, .3, w.z+Math.sin(a)*rr,
          {vx:-Math.cos(a)*1.4, vy:.5, vz:-Math.sin(a)*1.4, life:.7, color:0x9a6aff, s0:.14, kind:'a'});
      }
    }
  }
};

G.gen4 = GEN4;
})();
