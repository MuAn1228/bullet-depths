/* 弹幕深渊 - 地牢生成：随机房间布局 / 特殊房 / 隐藏房 / 门连接 */
'use strict';
(function(){
const CW=15, CH=11; // 每格单元 tile 尺寸（加大房间改善战斗空间）
G.CW=CW; G.CH=CH;
const GEN = {};

function keyOf(x,z){ return x+','+z; }

GEN.genFloor = function(floorNum, seed){
  const rng = new G.RNG(seed);
  const rooms=[], doors=[], occupied=new Map();
  const floor = { num:floorNum, rooms, doors, tiles:new Map(), props:[], hazards:[], decor:[], rng };

  function cellsFree(rx,rz,rw,rh){
    if(rx<-6||rz<-5||rx+rw>7||rz+rh>6) return false;
    for(let x=rx;x<rx+rw;x++) for(let z=rz;z<rz+rh;z++) if(occupied.has(keyOf(x,z))) return false;
    return true;
  }
  function addRoom(rx,rz,rw,rh,type){
    if(!cellsFree(rx,rz,rw,rh)) return null;
    const room={ id:rooms.length, type, rx,rz,rw,rh,
      doors:[], neighbors:[], cleared:false, discovered:false, visited:false, mapHint:false,
      enemyWaves:null, waveIdx:0, props:[], spawnPts:[], torches:[], hazards:[], depth:0, used:false };
    for(let x=rx;x<rx+rw;x++) for(let z=rz;z<rz+rh;z++) occupied.set(keyOf(x,z), room);
    room.x0=rx*CW+1; room.x1=(rx+rw)*CW-2; room.z0=rz*CH+1; room.z1=(rz+rh)*CH-2;
    room.cx=(room.x0+room.x1+1)/2; room.cz=(room.z0+room.z1+1)/2;
    rooms.push(room);
    return room;
  }
  function connect(a,b,secret){
    if(a.neighbors.includes(b)) return false;
    let tiles=[];
    if(b.rx+b.rw===a.rx || a.rx+a.rw===b.rx){
      const left = (b.rx+b.rw===a.rx)? b : a;
      const right = (left===b)? a : b;
      const x0=right.rx*CW-1, x1=right.rx*CW;
      const zs=Math.max(a.z0,b.z0), ze=Math.min(a.z1,b.z1);
      if(ze-zs<1) return false;
      let zc=G.clamp(Math.floor((zs+ze)/2), zs, ze-1);
      tiles=[[x0,zc],[x1,zc],[x0,zc+1],[x1,zc+1]];
    } else if(b.rz+b.rh===a.rz || a.rz+a.rh===b.rz){
      const top = (b.rz+b.rh===a.rz)? b : a;
      const bot = (top===b)? a : b;
      const z0=bot.rz*CH-1, z1=bot.rz*CH;
      const xs=Math.max(a.x0,b.x0), xe=Math.min(a.x1,b.x1);
      if(xe-xs<1) return false;
      let xc=G.clamp(Math.floor((xs+xe)/2), xs, xe-1);
      tiles=[[xc,z0],[xc,z1],[xc+1,z0],[xc+1,z1]];
    } else return false;
    const door={ id:doors.length, rooms:[a,b], tiles, open:!secret, secret:!!secret, broken:false, lockT:0, crackHp:3 };
    doors.push(door); a.doors.push(door); b.doors.push(door);
    a.neighbors.push(b); b.neighbors.push(a);
    return true;
  }

  /* --- 主生长 --- */
  const start = addRoom(0,0, (floorNum===1&&rng.chance(.4))?2:1, 1, 'start') || addRoom(0,0,1,1,'start');
  start.cleared=true;
  const targetCombat = floorNum===1? 7 : (floorNum===2? 9 : 10);
  let guard=0;
  while(rooms.length < targetCombat && guard++<500){
    const parent = rng.pick(rooms);
    if(parent.type==='secret') continue;
    const dir = rng.int(0,3);
    let rw=1, rh=1;
    if(dir%2===0 && rng.chance(.45)) rw=2;
    if(dir%2===1 && rng.chance(.45)) rh=2;
    if(rng.chance(.18)){ rw=2; rh=2; }
    let rx,rz;
    if(dir===0){ rx=parent.rx; rz=parent.rz-rh; }
    else if(dir===1){ rx=parent.rx+parent.rw; rz=parent.rz; }
    else if(dir===2){ rx=parent.rx; rz=parent.rz+parent.rh; }
    else { rx=parent.rx-rw; rz=parent.rz; }
    const r = addRoom(rx,rz,rw,rh,'combat');
    if(r) connect(parent,r);
  }

  /* --- 环路连接 --- */
  for(let i=0;i<rooms.length;i++) for(let j=i+1;j<rooms.length;j++){
    const a=rooms[i], b=rooms[j];
    if(!a.neighbors.includes(b) && rng.chance(.4)) connect(a,b);
  }

  /* --- BFS 深度 --- */
  function computeDepth(){
    rooms.forEach(r=>r.depth=-1);
    start.depth=0;
    const q=[start];
    while(q.length){ const r=q.shift(); for(const n of r.neighbors){ if(n.depth<0){ n.depth=r.depth+1; q.push(n); } } }
  }
  computeDepth();

  const combatRooms = ()=> rooms.filter(r=>r.type==='combat');
  const deadEnds = ()=> combatRooms().filter(r=>r.neighbors.length===1 && r.neighbors[0].type!=='secret');

  /* --- 特殊房分配 --- */
  function takeSpecial(type){
    let pool = deadEnds().filter(r=>!r.used);
    if(!pool.length) pool = combatRooms().filter(r=>!r.used && r.depth>=1);
    if(!pool.length) pool = combatRooms().filter(r=>!r.used);
    if(!pool.length) return null;
    // 宝箱/商店偏好远端，避免贴着出生点
    pool.sort((a,b)=>b.depth-a.depth);
    const r = rng.chance(.7)? pool[0] : rng.pick(pool.slice(0,Math.min(3,pool.length)));
    r.type=type; r.used=true; r.cleared=true;
    return r;
  }

  if(floorNum===1){
    // 出口：最深房间
    const cs=combatRooms().filter(r=>!r.used);
    cs.sort((a,b)=>b.depth-a.depth);
    const exitR = cs[0];
    if(exitR){ exitR.type='exit'; exitR.used=true; exitR.cleared=true; }
    takeSpecial('treasure');
    takeSpecial('shop');
    takeSpecial('npc');
  } else {
    // Boss：优先在最深房间旁新造 2x2 竞技场
    let bossRoom=null;
    const cs=combatRooms().filter(r=>!r.used);
    cs.sort((a,b)=>b.depth-a.depth);
    /* addRoom+connect 的原子组合：connect 失败时回滚已占用格位，杜绝"孤岛 Boss 房"（无门连接、玩家永远进不去） */
    const tryBossAt=(rx,rz,anchor)=>{
      const r=addRoom(rx,rz,2,2,'boss');
      if(!r) return null;
      if(connect(anchor,r)){ r.used=true; return r; }
      // 连接失败 → 回滚孤岛
      for(let x=r.rx;x<r.rx+2;x++) for(let z=r.rz;z<r.rz+2;z++) occupied.delete(keyOf(x,z));
      rooms.splice(rooms.indexOf(r),1);
      return null;
    };
    outer:
    for(const room of cs.slice(0,6)){
      for(let dir=0;dir<4;dir++){
        for(let off=0;off<3;off++){ // 2x2 需覆盖锚房全宽的错位偏移
          let r=null;
          if(dir===0) r=tryBossAt(room.rx-1+off, room.rz-2, room);
          else if(dir===1) r=tryBossAt(room.rx+room.rw, room.rz-1+off, room);
          else if(dir===2) r=tryBossAt(room.rx-1+off, room.rz+room.rh, room);
          else r=tryBossAt(room.rx-2, room.rz-1+off, room);
          if(r){ bossRoom=r; break outer; }
        }
      }
    }
    // 兜底1：退化征用最深战斗房（1x1 改 boss，内容生成按 type 走 boss 分支，安全）
    if(!bossRoom && cs[0]){ cs[0].type='boss'; cs[0].used=true; bossRoom=cs[0]; }
    // 兜底2：cs 为空时征用任意战斗房
    if(!bossRoom){
      const any=combatRooms()[0];
      if(any){ any.type='boss'; any.used=true; bossRoom=any; }
    }
    // 兜底3：BFS 连通性校验——boss 房必须从 start 可达，不可达则强连到任一可达房间
    if(bossRoom){
      const reach=new Set([start]);
      const q=[start];
      while(q.length){ const r=q.shift(); for(const n of r.neighbors){ if(!reach.has(n)){ reach.add(n); q.push(n); } } }
      if(!reach.has(bossRoom)){
        let linked=false;
        for(const a of rooms){
          if(a===bossRoom||!reach.has(a)) continue;
          if(connect(a,bossRoom)){ linked=true; break; }
        }
        // 极端情况：地图全满无法强连 → 征用可达的最深战斗房为 Boss 房，孤岛房转回战斗房
        if(!linked){
          bossRoom.type='combat'; bossRoom.used=false; bossRoom=null;
          let far=null;
          for(const r of reach){ if(r.type==='combat'){ if(!far||r.depth>far.depth) far=r; } }
          if(far){ far.type='boss'; far.used=true; bossRoom=far; }
        }
      }
    }
    takeSpecial('treasure');
    takeSpecial('shop');
    if(rng.chance(.75)) takeSpecial('shrine');
    if(rng.chance(.6)) takeSpecial('gamble');
  }
  /* 档案室升级（基地永久升级真实接入生成器）：每级 +30% 概率追加一间宝箱/商店特殊房 */
  {
    const archLv=G.meta ? G.meta.up('archive') : 0;
    for(let i=0;i<archLv;i++) if(rng.chance(.3)) takeSpecial(rng.chance(.5)?'treasure':'shop');
  }
  /* 深渊共鸣·寻宝本能（轨道B）：每级 +4% 概率追加一间特殊房 */
  {
    const lootLv=G.meta && G.meta.resonanceLv ? G.meta.resonanceLv('affinity_loot') : 0;
    for(let i=0;i<lootLv;i++) if(rng.chance(.04)) takeSpecial(rng.chance(.6)?'treasure':'shop');
  }
  // 补足战斗房数量
  const minCombat = floorNum===1? 4 : 6;
  guard=0;
  while(combatRooms().length<minCombat && guard++<300){
    const parent = rng.pick(rooms.filter(r=>r.type==='combat'||r.type==='start'));
    const dir = rng.int(0,3);
    let rx,rz;
    if(dir===0){ rx=parent.rx; rz=parent.rz-1; }
    else if(dir===1){ rx=parent.rx+parent.rw; rz=parent.rz; }
    else if(dir===2){ rx=parent.rx; rz=parent.rz+parent.rh; }
    else { rx=parent.rx-1; rz=parent.rz; }
    const r=addRoom(rx,rz,1,1,'combat');
    if(r) connect(parent,r);
  }
  computeDepth();

  /* --- 隐藏房 --- */
  {
    let placed=false;
    const cands = rng.shuffle(combatRooms().slice());
    outer2:
    for(const room of cands){
      for(let dir=0;dir<4;dir++){
        let rx,rz;
        if(dir===0){ rx=room.rx; rz=room.rz-1; }
        else if(dir===1){ rx=room.rx+room.rw; rz=room.rz; }
        else if(dir===2){ rx=room.rx; rz=room.rz+room.rh; }
        else { rx=room.rx-1; rz=room.rz; }
        const r=addRoom(rx,rz,1,1,'secret');
        if(r){ connect(room,r,true); r.cleared=true; r.discovered=false; placed=true; break outer2; }
      }
    }
  }

  /* --- Tile 地图 --- */
  for(const room of rooms){
    for(let x=room.rx*CW;x<(room.rx+room.rw)*CW;x++)
      for(let z=room.rz*CH;z<(room.rz+room.rh)*CH;z++){
        const k=keyOf(x,z);
        if(!floor.tiles.has(k)) floor.tiles.set(k,{t:'wall',x,z});
      }
    for(let x=room.x0;x<=room.x1;x++)
      for(let z=room.z0;z<=room.z1;z++)
        floor.tiles.set(keyOf(x,z),{t:'floor',x,z,room});
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
  floor.startRoom=start;
  floor.exitRoom = rooms.find(r=>r.type==='exit');
  floor.bossRoom = rooms.find(r=>r.type==='boss');

  /* --- 房间内容 --- */
  for(const room of rooms){
    const inner=[];
    for(let x=room.x0;x<=room.x1;x++) for(let z=room.z0;z<=room.z1;z++) inner.push([x,z]);
    const nearDoor = (x,z)=>{
      for(const d of room.doors) for(const [dx,dz] of d.tiles){
        if(Math.abs(x-dx)<=2 && Math.abs(z-dz)<=2) return true;
      }
      return false;
    };
    room.spawnPts = inner.filter(([x,z])=>!nearDoor(x,z) && (x!==Math.floor(room.cx)||z!==Math.floor(room.cz)));
    const free = ()=> {
      const [x,z] = rng.pick(room.spawnPts.length?room.spawnPts:inner);
      return {x:x+.5, z:z+.5};
    };

    if(room.type==='combat'){
      // 敌人组合
      const cells = room.rw*room.rh;
      let budget = 3 + floorNum*1.8 + (cells-1)*2.6 + rng.range(0,2.5);
      const pool = floorNum===1
        ? [['gunner',1,3],['charger',1,2],['shroom',1,2],['slime',1,2],['wisp',1,1.6],['totem',2,1.2],['orbiter',2,1.4],['minelayer',1,1.6]]
        : (floorNum===2
          ? [['gunner',1,2],['shotgunner',2,2],['sniper',2,2],['hexer',2,1.5],['beetle',1,2],['shield',2,1.5],['charger',1,1.5],['slime',1,1.5],['wisp',1,2],['totem',2,1.6],['bomber',2,2],['orbiter',2,1.4],['minelayer',1,1.6],['gravitator',2,1.5],['commander',2,1.2],['mirror',2,1.4]]
          : [['shotgunner',2,2],['sniper',2,2.4],['hexer',2,2.2],['shield',2,1.8],['bomber',2,2.4],['wisp',1,2],['totem',2,1.8],['beetle',1,1.4],['voidstalker',2,2.2],['riftwatcher',2,2],['voidacolyte',2,1.8],['commander',2,1.3],['phaseprowler',2,1.6]]);
      const comp=[];
      let g2=0;
      while(budget>0 && g2++<40){
        let tw=0; for(const p of pool) tw+=p[2];
        let v=rng.f()*tw, pick=pool[0];
        for(const p of pool){ v-=p[2]; if(v<=0){ pick=p; break; } }
        comp.push(pick[0]); budget-=pick[1];
      }
      const waves=[comp];
      if(cells>=2 && comp.length>=4 && rng.chance(.55)){
        const half=Math.ceil(comp.length/2);
        waves[0]=comp.slice(0,half); waves.push(comp.slice(half));
      }
      room.enemyWaves = waves.map(w=>{
        const arr = w.map(t=>({type:t, elite:false}));
        if(floorNum>=2 && arr.length>2 && rng.chance(floorNum>=3? .5 : .35)) arr[0].elite=true;
        return arr;
      });
      // 掩体与道具
      const nTables = rng.int(1,2)+(cells>1?1:0);
      for(let i=0;i<nTables;i++){ const p=free(); room.props.push({type:'table',x:p.x,z:p.z}); }
      const nBarrel = rng.int(0,2);
      for(let i=0;i<nBarrel;i++){ const p=free(); room.props.push({type:'barrel',x:p.x,z:p.z}); }
      const nPot = rng.int(2,4);
      for(let i=0;i<nPot;i++){ const p=free(); room.props.push({type:'pot',x:p.x,z:p.z}); }
      if(cells>=2){
        const px=[room.x0+2, room.x1-2], pz=[room.z0+2, room.z1-2];
        room.props.push({type:'pillar',x:px[0]+.5,z:pz[0]+.5});
        room.props.push({type:'pillar',x:px[1]+.5,z:pz[1]+.5});
        if(cells>=4){
          room.props.push({type:'pillar',x:px[0]+.5,z:pz[1]+.5});
          room.props.push({type:'pillar',x:px[1]+.5,z:pz[0]+.5});
        }
      }
      // 宽敞房间（>10 tile 宽）增加中段双柱，掩体分布更均匀
      if(room.x1-room.x0>10){
        room.props.push({type:'pillar',x:room.cx,z:room.z0+2.5});
        room.props.push({type:'pillar',x:room.cx,z:room.z1-1.5});
      }
      // 陷阱：第 2 层尖刺/毒沼；第 3 层在此之上追加虚空裂隙
      if(floorNum>=2){
        if(rng.chance(.4)){
          const n=rng.int(3,6);
          const base=rng.pick(inner.filter(([x,z])=>!nearDoor(x,z)));
          for(let i=0;i<n;i++){
            const x=base[0]+rng.int(-1,1), z=base[1]+rng.int(-1,1);
            if(x>room.x0&&x<room.x1&&z>room.z0&&z<room.z1&&!room.hazards.some(h=>h.x===x&&h.z===z))
              room.hazards.push({x,z,kind:'spike',phase:rng.f()*2});
          }
        }
        if(rng.chance(.3)){
          const n=rng.int(3,6);
          const base=rng.pick(inner.filter(([x,z])=>!nearDoor(x,z)));
          for(let i=0;i<n;i++){
            const x=base[0]+rng.int(-1,1), z=base[1]+rng.int(-1,1);
            if(x>=room.x0&&x<=room.x1&&z>=room.z0&&z<=room.z1&&!room.hazards.some(h=>h.x===x&&h.z===z))
              room.hazards.push({x,z,kind:'toxic',phase:0});
          }
        }
        if(floorNum>=3 && rng.chance(.45)){
          const n=rng.int(2,4);
          const base=rng.pick(inner.filter(([x,z])=>!nearDoor(x,z)));
          for(let i=0;i<n;i++){
            const x=base[0]+rng.int(-2,2), z=base[1]+rng.int(-2,2);
            if(x>room.x0&&x<room.x1&&z>room.z0&&z<room.z1&&!room.hazards.some(h=>h.x===x&&h.z===z))
              room.hazards.push({x,z,kind:'voidrift',phase:rng.f()*2});
          }
        }
      }
      // 加分宝箱（小）
      if(rng.chance(.18)) room.props.push({type:'bonus',x:room.cx,z:room.z0+1.5});
    }
    else if(room.type==='treasure'){
      room.props.push({type:'chest', tier: rng.chance(.3)?'green':'brown', x:room.cx, z:room.cz});
    }
    else if(room.type==='shop'){
      room.stock = G.items.shopStock(floorNum);
      room.stockPos=[];
      const n=room.stock.length;
      const span=Math.min(room.x1-room.x0-2, n*2);
      for(let i=0;i<n;i++){
        const x=room.cx-span/2+1+ (n>1? i*(span/(n-1)) : 0);
        room.stockPos.push({x, z:room.cz});
      }
      room.props.push({type:'campfire',x:room.cx-2.5,z:room.cz+1.5}); // 商店角落的营火（氛围），柜台与售货员由 build.js 摆放
    }
    else if(room.type==='exit'){
      room.props.push({type:'exitHatch',x:room.cx,z:room.cz});
    }
    else if(room.type==='npc'){
      room.props.push({type:'npc',x:room.cx,z:room.cz, npc:'traveler'});
      room.props.push({type:'campfire',x:room.cx-2.5,z:room.cz+1.5});
    }
    else if(room.type==='shrine'){
      room.props.push({type:'shrine',x:room.cx,z:room.cz});
    }
    else if(room.type==='gamble'){
      room.props.push({type:'gamble',x:room.cx,z:room.cz});
    }
    else if(room.type==='boss'){
      room.props.push({type:'throne',x:room.cx,z:room.z0+2.2});
      room.props.push({type:'pillar',x:room.x0+2.5,z:room.z1-2.5});
      room.props.push({type:'pillar',x:room.x1-1.5,z:room.z1-2.5});
    }
    else if(room.type==='secret'){
      room.props.push({type:'chest', tier:'red', x:room.cx, z:room.cz-1});
      room.props.push({type:'moneyPile', x:room.cx-2.5, z:room.cz+1.5});
      room.props.push({type:'heartPickup', x:room.cx+2.5, z:room.cz+1.5});
    }

    /* 出生点避开实体掩体（柱子/箱子等），防止敌人生成在掩体内导致无法击杀、房间无法清剿 */
    {
      const blockingTypes={table:1,barrel:1,pot:1,pillar:1,chest:1,bonus:1,counter:1,pedestal:1,npc:1,shrine:1,gamble:1,throne:1,exitHatch:1,campfire:1};
      room.spawnPts = room.spawnPts.filter(([x,z])=>{
        const cx=x+.5, cz=z+.5;
        return !room.props.some(pp=>blockingTypes[pp.type] && G.dist2(cx,cz,pp.x,pp.z)<0.81);
      });
    }

    /* --- 火把与装饰 --- */
    if(room.type!=='secret'){
      const t=[];
      const step = room.rw>=2? 6 : 12;
      for(let x=room.x0+2; x<=room.x1-1; x+=step){ t.push({x:x+.5, z:room.z0+.35, fx:0, fz:1}); t.push({x:x+.5, z:room.z1+.65, fx:0, fz:-1}); }
      for(let z=room.z0+2; z<=room.z1-1; z+=6){ t.push({x:room.x0+.35, z:z+.5, fx:1, fz:0}); t.push({x:room.x1+.65, z:z+.5, fx:-1, fz:0}); }
      room.torches=t.slice(0, 8);
    }
    // 地表装饰（依据主题）
    const nDeco = rng.int(3,7);
    for(let i=0;i<nDeco;i++){
      const [x,z]=rng.pick(inner);
      room.decor=room.decor||[];
      room.decor.push({x,z, kind: floorNum===1? rng.pick(['bones','moss','crack','rubble']) : (floorNum===2? rng.pick(['skull','crystal','goo','rubble','chain']) : rng.pick(['rune','shard','eye','crystal','rubble']))});
    }
  }

  floor.tilesGet = (x,z)=> floor.tiles.get(keyOf(x,z));
  return floor;
};

/* ---------- 碰撞查询（挂到 G） ---------- */
G.tileAt = function(x,z){ return G.floor && G.floor.tilesGet(Math.floor(x), Math.floor(z)); };
G.solidForMove = function(x,z){
  const t=G.tileAt(x,z);
  if(!t) return true;
  if(t.t==='wall') return true;
  if(t.t==='door') return !t.door.open;
  return false;
};
G.solidForBullet = function(x,z){
  const t=G.tileAt(x,z);
  if(!t) return true;
  if(t.t==='wall') return true;
  if(t.t==='door') return !t.door.open;
  return false;
};
G.roomAt = function(x,z){
  const t=G.tileAt(x,z);
  if(t && t.t==='floor') return t.room;
  return null;
};
/* 圆形实体与 tile 道具的碰撞移动 */
G.moveEntity = function(e, dx, dz){
  const r = e.r||.35;
  if(dx!==0){
    let nx=e.x+dx;
    const dirX=dx>0?1:-1;
    const edge=nx+dirX*r;
    const tx=Math.floor(edge);
    const z0=Math.floor(e.z-r+.02), z1=Math.floor(e.z+r-.02);
    for(let tz=z0;tz<=z1;tz++){
      if(G.solidForMove(tx+.5,tz+.5)){ nx = dirX>0? tx-r-.02 : tx+1+r+.02; break; }
    }
    e.x=nx;
  }
  if(dz!==0){
    let nz=e.z+dz;
    const dirZ=dz>0?1:-1;
    const edge=nz+dirZ*r;
    const tz=Math.floor(edge);
    const x0=Math.floor(e.x-r+.02), x1=Math.floor(e.x+r-.02);
    for(let tx=x0;tx<=x1;tx++){
      if(G.solidForMove(tx+.5,tz+.5)){ nz = dirZ>0? tz-r-.02 : tz+1+r+.02; break; }
    }
    e.z=nz;
  }
  // 道具圆形推挤
  if(G.props){
    const preX=e.x, preZ=e.z;   // 推出前坐标（已通过分轴碰撞，保证不在墙内）
    for(const pr of G.props){
      if(pr.dead||!pr.blocksMove) continue;
      const ddx=e.x-pr.x, ddz=e.z-pr.z;
      const rr=pr.r+r;
      const d2=ddx*ddx+ddz*ddz;
      if(d2>0.0001 && d2<rr*rr){
        const d=Math.sqrt(d2);
        e.x=pr.x+ddx/d*rr; e.z=pr.z+ddz/d*rr;
      }
    }
    // 推出后回检墙体（BUG-005：推出不再无条件生效，防止实体被挤进墙里——
    // 敌人有 0.8s 位置自愈兜底，玩家没有任何兜底）
    if(e.x!==preX || e.z!==preZ){
      const m=r-.02;
      const bad = G.solidForMove(e.x,e.z)
        || G.solidForMove(e.x+m,e.z) || G.solidForMove(e.x-m,e.z)
        || G.solidForMove(e.x,e.z+m) || G.solidForMove(e.x,e.z-m);
      if(bad){ e.x=preX; e.z=preZ; }
    }
  }
};
G.roomSpawnPos = function(room, awayFrom){
  const center={x:room?room.cx:0,z:room?room.cz:0};
  if(!room||!room.spawnPts||!room.spawnPts.length) return center;
  // 运行时规避挡弹掩体（柱子/翻倒的桌子等），防止敌人出生或传送进掩体形成软锁
  const blocked=(x,z)=> G.props.some(pr=>!pr.dead && pr.blocksBullets && G.dist2(x,z,pr.x,pr.z)<0.81);
  let best=null, bd=-1;
  for(let i=0;i<6;i++){
    const [x,z]=room.spawnPts[(Math.random()*room.spawnPts.length)|0];
    if(blocked(x+.5,z+.5)) continue;
    const d=awayFrom? G.dist2(x,z,awayFrom.x,awayFrom.z) : 1;
    if(d>bd){ bd=d; best={x:x+.5,z:z+.5}; }
  }
  if(!best) best=center;
  return best;
};

G.gen = GEN;
})();
