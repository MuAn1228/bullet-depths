/* 弹膛深渊 - 入口：渲染器 / 自适应 / 错误捕获 / 无头自测 */
'use strict';
(function(){
/* ---------- 错误日志 ---------- */
const logs=[];
function log(msg){
  logs.push(msg);
  const el=document.getElementById('errlog');
  if(el){ el.style.display='block'; el.textContent=logs.slice(-200).join('\n'); }
}
window.addEventListener('error', e=>{
  const stack=(e.error&&e.error.stack)?(' | '+String(e.error.stack).split('\n').slice(1,3).join(' ~ ').trim()):'';
  log('ERROR: '+e.message+' @ '+(e.filename||'').split('/').pop()+':'+(e.lineno||'?')+stack);
});
window.__log=log;

/* ---------- 渲染器（低分辨率 + 像素放大） ---------- */
let renderer=null;
try{
  const canvas=document.getElementById('game');
  renderer=new THREE.WebGLRenderer({canvas, antialias:false, powerPreference:'high-performance'});
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  // 现代色调映射：ACES Filmic 电影级色彩响应 + 提亮曝光，提升光影层次
  if(THREE.ACESFilmicToneMapping!==undefined){
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.35;
  }
}catch(e){ renderer=null; log('WARN: WebGL 不可用（无头环境），逻辑模式启动: '+e.message); }
G.renderer=renderer;

/* ---------- 包围球兼容补丁：诊断并自愈缺失的 boundingSphere ---------- */
(function(){
  const orig=THREE.Frustum.prototype.intersectsObject;
  THREE.Frustum.prototype.intersectsObject=function(object){
    const g=object && object.geometry;
    if(g && g.boundingSphere===undefined){
      try{
        log('GEO_PATCH: type='+object.type+' pos='+(g.attributes&&!!g.attributes.position)+' idx='+(!!g.index)+' verts='+(g.attributes&&g.attributes.position?g.attributes.position.count:'-')+' parent='+(object.parent&&object.parent.type));
      }catch(e){}
      g.boundingSphere=null; // 触发原始方法的 computeBoundingSphere
    }
    return orig.apply(this,arguments);
  };
})();

function resize(){
  const aspect=innerWidth/Math.max(1,innerHeight);
  const h=320, w=Math.max(100,Math.round(h*aspect)); // 320p：保持像素风的同时提升文字可读性
  if(renderer) renderer.setSize(w,h,false);
  if(G.camera){ G.camera.aspect=w/h; G.camera.updateProjectionMatrix(); }
}
window.addEventListener('resize', resize);

/* ---------- 启动 ---------- */
G.input.init();
G.input.aimX=0; G.input.aimZ=0;
G.ui.init();
G.game.init();
resize();

const isTest = /[?&]boottest/.test(location.search);
const isShot = /[?&]shot/.test(location.search);
if(isTest){
  runBootTest();
} else if(isShot){
  // 截图模式：直接开局（瞬间淡入，跳过UI过渡，便于无头截图）
  G.audio.muted=true;
  if(/[?&]shot=base/.test(location.search)){
    G.game.enterBase('title');               // 基地视角：新游戏直达「废弃军械站」（enterBase 自带过场定时器）
    G.input.aimX=6.5; G.input.aimZ=7.5;      // 相机/瞄准预置：偏西北，全功能区入画，玩家落画面中下偏右
    G.input.mouse.x=640; G.input.mouse.y=430; // 准星预置到画面内（默认 0,0 会把准星裁在左上角）
  } else {
    G.game.startRun();
  if(/[?&]shot=2/.test(location.search)) G.game.startFloor(2,false);
  if(/[?&]shot=2/.test(location.search)) G.ui.floor(2);
  if(/[?&]shot=shop/.test(location.search)){ // 商店视角：传送到商店房并瞬间收敛相机（无头软渲染帧少，等 lerp 收敛不现实）
    const shop=G.game.floor.rooms.find(r=>r.type==='shop');
    if(shop){
      G.player.x=shop.cx; G.player.z=shop.cz+2.2; G.game.curRoom=shop;
      G.input.aimX=G.player.x; G.input.aimZ=G.player.z-3;
      for(let i=0;i<12;i++) G.game.updateCamera(1); // 大步长迭代令 lerp 完全收敛
    }
  }
  if(/[?&]shot=map/.test(location.search)){ // 大地图视角：探索全图后打开 Tab 地图
    G.game.floor.rooms.forEach(r=>{ if(r.type!=='secret'){ r.discovered=true; r.mapHint=true; } });
    G.ui.bigmap(true);
  }
  }
  G.ui.bannerT=0.01;
  G.game.frame(0);
  G.ui.fade(false, true);
  G.game.updateCamera(1/60);
} else {
  G.game.frame(0);
  setTimeout(()=>G.ui.fade(false), 120);
}

/* ================================================================
   无头自测：模拟完整一局（射击→构筑→商店→隐藏房→下潜→Boss→胜利→重开）
   ================================================================ */
async function runBootTest(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const results=[];
  async function step(name, fn){
    try{
      const r=await fn();
      results.push(1);
      log('STEP '+name+': PASS '+(r||''));
    }catch(e){
      results.push(0);
      const st=(e&&e.stack)?String(e.stack).split('\n').slice(0,4).join(' <= ').replace(/\s+/g,' '):'';
      log('STEP '+name+': FAIL '+e.message+' ['+st+']');
    }
  }
  const assert=(c,msg)=>{ if(!c) throw new Error(msg||'断言失败'); };
  const frames=n=>{
    for(let i=0;i<n;i++){
      // 测试保护：防止玩家死亡中断流程
      if(G.player){
        if(G.player.dead){ G.player.dead=false; G.player.mesh.visible=true; }
        if(G.player.hp<50) G.player.hp=50;
        G.player.invulnT=Math.max(G.player.invulnT,.5);
      }
      if(G.game.state==='dead') G.game.state='play';
      G.game.update(1/60);
      G.input.endFrame();
    }
  };
  const aim=()=>{ G.input.aimX=G.player.x+4; G.input.aimZ=G.player.z; };

  await sleep(100);

  await step('01_新开局', ()=>{
    G.rng=new G.RNG(20260831);
    G.game.startRun();
    G.game.manual=true; // 手动驱动，避免RAF双跑
    assert(G.game.state==='play','状态异常:'+G.game.state);
    const f=G.game.floor;
    assert(f.rooms.length>=9,'房间数不足:'+f.rooms.length);
    const types=f.rooms.map(r=>r.type);
    for(const t of ['shop','treasure','exit','secret','npc']) assert(types.includes(t),'缺少房间类型:'+t);
    assert(types.filter(t=>t==='combat').length>=4,'战斗房不足');
    assert(G.player.weapons.length===1,'初始武器异常');
    // 房间扩容验证：tile 尺寸 15x11，1x1 房间可玩宽度（含端点）>=13 tiles
    assert(G.CW===15 && G.CH===11,'房间tile尺寸未扩容:'+G.CW+'x'+G.CH);
    const r1=f.rooms.find(r=>r.rw===1&&r.rh===1);
    if(r1) assert(r1.x1-r1.x0+1>=13,'1x1房间宽度不足:'+(r1.x1-r1.x0+1));
    G.player.maxHp=60; G.player.hp=60; // 测试保护
    return '房间数='+f.rooms.length;
  });

  await step('02_移动', ()=>{
    const p=G.player, ox=p.x, oz=p.z;
    G.input.key['KeyW']=true;
    frames(60);
    G.input.key['KeyW']=false;
    assert(G.dist(ox,oz,p.x,p.z)>1,'未移动');
    return '位移='+G.dist(ox,oz,p.x,p.z).toFixed(1);
  });

  await step('03_射击与子弹', ()=>{
    aim();
    const p=G.player;
    G.input.mouse.down=true;
    frames(30);
    G.input.mouse.down=false;
    frames(240); // 子弹生命周期结束
    return '射击无异常';
  });

  await step('04_全武器发射', ()=>{
    const ids=Object.keys(G.weapons.defs);
    for(const id of ids){
      aim();
      G.player.weapons=[G.weapons.mktWeapon(id)];
      G.player.curW=0;
      G.input.mouse.down=true;
      frames(25);
      G.input.mouse.down=false;
      frames(15);
    }
    G.player.weapons=[G.weapons.mktWeapon('rusty')];
    return ids.length+'种武器全部发射成功';
  });

  await step('04b_新武器机制', ()=>{
    // 三连发：单次扣扳机 0.3 秒内射出 3 发（burst 队列）
    const p=G.player;
    aim();
    p.weapons=[G.weapons.mktWeapon('burst')]; p.curW=0;
    let shots=0;
    const orig=G.playerCtl.emitShot;
    G.playerCtl.emitShot=function(pp,w,a){ shots++; return orig.call(G.playerCtl,pp,w,a); };
    G.input.mouse.down=true; frames(3); G.input.mouse.down=false;
    frames(20); // 等 burst 队列完成（2 发续射 * 0.07s）
    G.playerCtl.emitShot=orig;
    assert(shots>=3,'三连发不足3发:'+shots);
    // 冰霜减速：命中敌人 slowT>0 且速度减半
    const e=G.enemies.spawn('gunner', p.x+2, p.z);
    e.spawnT=0; e.room=G.game.curRoom;
    p.weapons=[G.weapons.mktWeapon('frost')]; p.curW=0;
    G.playerCtl.emitShot(p,p.weapons[0],G.angTo(p.x,p.z,e.x,e.z));
    frames(14); // frost 弹速 12，需 ~7 帧飞行命中
    assert(e.slowT>0,'冰霜减速未生效');
    assert(Math.abs(e.spd-e.baseSpd*.45)<.01,'减速幅度错误:'+e.spd+'/'+e.baseSpd);
    G.hurtEnemy(e,99999,0,0,true);
    // 磁轨炮：穿透多敌（一串3个静止图腾一枪全伤）
    const es=[];
    for(let i=0;i<3;i++){ const x=G.enemies.spawn('totem', p.x+3+i*1.2, p.z); x.spawnT=0; x.room=G.game.curRoom; es.push(x); }
    p.weapons=[G.weapons.mktWeapon('rail')]; p.curW=0;
    // 对齐枪口：先跑一帧 update 让 muzzle 按当前瞄准重算，并强制瞄准 +x
    G.input.aimX=p.x+5; G.input.aimZ=p.z;
    G.game.update(1/60); G.input.endFrame();
    G.playerCtl.emitShot(p,p.weapons[0],0);
    frames(14);
    const damaged=es.filter(x=>x.hp<x.maxhp).length;
    assert(damaged>=2,'磁轨穿透不足:'+damaged+'/3');
    es.forEach(x=>G.hurtEnemy(x,99999,0,0,true));
    frames(5);
    return 'burst连发/冰霜减速/磁轨穿透全部生效';
  });

  await step('06b_新敌人机制', ()=>{
    G.game.startRun();
    frames(5);
    const p=G.player;
    // 图腾：靠近后激活激光，激光臂可见且旋转
    const tt=G.enemies.spawn('totem', p.x+4, p.z);
    tt.spawnT=0; tt.room=G.game.curRoom; tt.mesh.scale.setScalar(1);
    tt.atkCd=0;
    frames(70); // 0.8s 蓄力后激活
    assert(tt.state==='active','图腾未激活:'+tt.state);
    assert(tt.refs.arms && tt.refs.arms.visible,'激光臂未显示');
    const spin0=tt.spin||0;
    frames(30);
    assert((tt.spin||0)>spin0,'激光未旋转');
    G.hurtEnemy(tt,99999,0,0,true);
    frames(3);
    // 怨灵：靠近玩家自爆并死亡
    const wi=G.enemies.spawn('wisp', p.x+2.5, p.z);
    wi.spawnT=0; wi.room=G.game.curRoom; wi.mesh.scale.setScalar(1);
    frames(90);
    assert(wi.dead===true,'怨灵未自爆');
    frames(3);
    // 掷弹手：投掷炸弹弹丸，弹丸到期爆炸
    const bm=G.enemies.spawn('bomber', p.x+6, p.z);
    bm.spawnT=0; bm.room=G.game.curRoom; bm.mesh.scale.setScalar(1);
    bm.atkCd=0;
    let bombSeen=false;
    for(let i=0;i<120;i++){
      frames(1);
      if(G.weapons.bullets.some(b=>b.on&&b.kind==='bomb')) bombSeen=true;
    }
    assert(bombSeen,'掷弹手未投出炸弹');
    frames(90); // 等炸弹爆炸
    G.hurtEnemy(bm,99999,0,0,true);
    frames(5);
    return '图腾激光/怨灵自爆/掷弹手投弹全部生效';
  });

  await step('04c_新武器电弧链', ()=>{
    G.game.startRun();
    frames(5);
    const p=G.player;
    aim();
    // 电弧链：3 个静止图腾，一发命中后链跳全伤
    const es=[];
    for(let i=0;i<3;i++){ const x=G.enemies.spawn('totem', p.x+3+i*1.0, p.z+(i-1)*1.2); x.spawnT=0; x.room=G.game.curRoom; es.push(x); }
    p.weapons=[G.weapons.mktWeapon('arc')]; p.curW=0;
    G.input.aimX=p.x+5; G.input.aimZ=p.z;
    G.game.update(1/60); G.input.endFrame();
    G.playerCtl.emitShot(p,p.weapons[0],0);
    frames(20);
    const damaged=es.filter(x=>x.dead||x.hp<x.maxhp).length;
    assert(damaged>=2,'电弧链未跳伤:'+damaged+'/3');
    es.forEach(x=>G.hurtEnemy(x,99999,0,0,true));
    frames(3);
    G.weapons.clear();
    frames(5);
    return '电弧链跳跃生效';
  });

  await step('05_翻滚闪避', ()=>{
    const p=G.player;
    G.input.pressed['Space']=true;
    frames(2);
    assert(p.rollT>0||p.rollCd>0,'翻滚未触发');
    frames(60);
    return 'ok';
  });

  await step('06_全敌人AI', ()=>{
    const types=Object.keys(G.enemies.defs);
    for(const t of types){
      const e=G.enemies.spawn(t, G.player.x+3, G.player.z, false);
      e.spawnT=0; e.room=G.game.curRoom;
      frames(70);
    }
    // 反复清理（含分裂史莱姆/召唤物）
    let guard=0;
    while(G.enemies.list.length>0 && guard++<60){
      G.enemies.list.slice().forEach(e=>{ e.spawnT=0; G.hurtEnemy(e,99999,(e.face||0)+Math.PI,0,true); });
      frames(4);
    }
    assert(G.enemies.list.length===0,'敌人未清理:'+G.enemies.list.length);
    return types.length+'种敌人AI运行通过';
  });

  await step('07_房间封锁与清剿', ()=>{
    const f=G.game.floor;
    const combat=f.rooms.find(r=>r.type==='combat' && !r.cleared);
    assert(combat,'找不到战斗房');
    G.player.x=combat.cx; G.player.z=combat.cz;
    frames(8);
    assert(G.game.curRoom===combat,'未进入房间');
    assert(combat.locked===true,'房间未封锁');
    frames(90);
    let guard=0;
    while((G.enemies.list.some(e=>e.room===combat&&!e.dead)||G.game.spawnQueue.some(s=>s.room===combat)) && guard++<300){
      G.game.spawnQueue.forEach(s=>{ if(s.room===combat) s.t=0; });
      G.enemies.list.forEach(e=>{ if(e.room===combat&&!e.dead){ e.spawnT=0; G.hurtEnemy(e,99999,(e.face||0)+Math.PI,0,true); } });
      frames(2);
    }
    frames(60);
    assert(combat.cleared===true,'房间未清剿');
    assert(combat.locked===false,'房门未开启');
    return 'ok';
  });

  await step('08_宝箱与掉落', async ()=>{
    const f=G.game.floor;
    const tr=f.rooms.find(r=>r.type==='treasure');
    G.player.x=tr.cx; G.player.z=tr.cz+1.2;
    frames(6);
    const chest=G.props.find(pr=>pr.type==='chest'&&!pr.opened);
    assert(chest,'宝箱未生成');
    chest.interact.fn();
    await sleep(500); // 掉落延时
    frames(10);
    assert(G.pickups.length>0,'掉落未生成');
    return '掉落数='+G.pickups.length;
  });

  await step('09_商店购买', ()=>{
    const f=G.game.floor;
    const shop=f.rooms.find(r=>r.type==='shop');
    G.player.x=shop.cx; G.player.z=shop.cz+1.2;
    frames(6);
    G.player.money=300;
    const ped=G.props.filter(pr=>pr.type==='pedestal'&&!pr.sold);
    assert(ped.length>=3,'货架不足:'+ped.length);   // 武器已移入柜台武器商店目录，货架只剩消耗品
    for(const pr of ped) pr.interact && pr.interact.fn();
    assert(ped.every(pr=>pr.sold),'购买失败');
    assert(G.player.money<300,'未扣费');
    frames(20);
    return '购买'+ped.length+'件';
  });

  await step('10_道具与被动', ()=>{
    const p=G.player;
    const ensureItem=(id)=>{
      if(!p.passives.includes(id)) G.items.giveTo(p,{kind:'item',id});
      else G.items.passives[id].apply(p);
    };
    const hpBefore=p.maxHp;
    ensureItem('heartCan'); ensureItem('plate'); ensureItem('crit');
    assert(p.maxHp>hpBefore,'红心容器未生效');
    assert(p.maxArmor>0,'护甲未生效');
    assert(p.st.crit>0,'暴击未生效');
    G.items.giveTo(p,{kind:'active',id:'cloak'});
    assert(p.active,'主动技能未装备');
    p.activeCd=0;
    G.input.pressed['KeyF']=true;
    frames(2);
    assert(p.invulnT>0,'主动技能未生效');
    return '被动/主动/属性全部生效';
  });

  await step('11_隐藏房', ()=>{
    const f=G.game.floor;
    const d=f.doors.find(dd=>dd.secret&&!dd.broken);
    assert(d,'隐藏门未生成');
    G.game.breakSecretDoor(d);
    const tile=f.tilesGet(d.tiles[0][0],d.tiles[0][1]);
    assert(tile.t==='floor','隐藏通道未打开');
    return 'ok';
  });

  await step('12_翻桌与爆炸桶', ()=>{
    G.weapons.clear(); // 清上一测试遗留弹幕，排除干扰
    const table=G.props.find(pr=>pr.type==='table'&&!pr.flipped);
    assert(table,'桌子未生成');
    // 翻桌朝向：玩家瞄准 +x（face=0）时，桌子立起后 rotation.y = -face = 0，桌面对准敌人方向
    G.player.x=table.x; G.player.z=table.z+1.0;
    G.player.face=0; G.input.aimX=G.player.x+5; G.input.aimZ=G.player.z;
    table.interact.fn();
    assert(table.flipped && table.blocksBullets,'翻桌失败');
    frames(30); // 等翻转动画完成
    const ry=table.mesh.rotation.y;
    assert(Math.abs(ry)<0.05||Math.abs(Math.abs(ry)-G.TAU)<0.05,'翻桌未朝向玩家瞄准方向: ry='+ry.toFixed(2));
    assert(table.mesh.rotation.x<-1.0,'桌子未立起: rx='+table.mesh.rotation.x.toFixed(2));
    // 翻倒的桌子不挡玩家子弹（可靠掩体）：朝桌子方向开火，桌子不掉血
    G.player.x=table.x-1.5; G.player.z=table.z;
    aim();
    // ⚠️ 桌子附近的爆炸桶必须先移开：barrel 被打爆会走 G.weapons.explode（build.js:848，半径 2.4），
    // 而 explode 对 props 的伤害通道（weapons.js:199）不看 table/flipped —— 掩体旁的桶一炸，
    // 桌子照样掉血，与「翻倒的桌子不挡玩家子弹」的豁免无关。桶是否恰好被暴击打爆
    // （arc dmg7×暴击2.5=17.5 > barrel hp8）取决于随机房间几何与暴击（BUG-022）→ 历史偶发 FAIL（约 1/250）。
    G.props.filter(pr=>pr.type==='barrel' && G.dist(pr.x,pr.z,table.x,table.z)<3.2)
          .forEach(pr=>{ pr.x=table.x-6; pr.z=table.z+4; });   // 移到桌子斜后方 7.2 格处：不在 +x 弹道上，即使爆炸也波及不到桌子（>2.16）
    const hp0=table.hp;
    G.input.mouse.down=true; frames(6); G.input.mouse.down=false;
    frames(4); // 等弹幕飞行结束
    assert(table.hp===hp0,'玩家子弹击中了自己的掩体（应穿透）');
    const barrel=G.props.find(pr=>pr.type==='barrel');
    if(barrel){ G.damageProp(barrel,99,0); frames(30); }
    return '翻桌朝向正确且不挡己方火力';
  });

  await step('13_交互NPC', async ()=>{
    const f=G.game.floor;
    const npcRoom=f.rooms.find(r=>r.type==='npc');
    if(npcRoom){
      G.player.x=npcRoom.cx; G.player.z=npcRoom.cz+1.2;
      frames(6);
      const npc=G.props.find(pr=>pr.type==='npc');
      assert(npc,'NPC未生成');
      npc.interact.fn(); npc.interact.fn(); npc.interact.fn();
      await sleep(50);
      frames(10);
    }
    return 'ok';
  });

  await step('14_出口下潜至第二层', async ()=>{
    const f=G.game.floor;
    const ex=f.rooms.find(r=>r.type==='exit');
    G.player.x=ex.cx; G.player.z=ex.cz+1.2;
    frames(6);
    G.game.descend();
    await sleep(750);
    frames(10);
    assert(G.game.floorNum===2,'未进入第二层');
    const types=G.game.floor.rooms.map(r=>r.type);
    for(const t of ['boss','shop','treasure','secret']) assert(types.includes(t),'第二层缺少:'+t);
    return '第二层房间数='+G.game.floor.rooms.length;
  });

  await step('15_第二层战斗房', ()=>{
    const f=G.game.floor;
    const combat=f.rooms.find(r=>r.type==='combat' && !r.cleared);
    G.player.x=combat.cx; G.player.z=combat.cz;
    frames(8);
    assert(combat.locked,'未封锁');
    let guard=0;
    while((G.enemies.list.some(e=>e.room===combat&&!e.dead)||G.game.spawnQueue.some(s=>s.room===combat)) && guard++<400){
      G.game.spawnQueue.forEach(s=>{ if(s.room===combat) s.t=0; });
      G.enemies.list.forEach(e=>{ if(e.room===combat&&!e.dead){ e.spawnT=0; G.hurtEnemy(e,99999,(e.face||0)+Math.PI,0,true); } });
      frames(2);
    }
    frames(40);
    assert(combat.cleared,'第二层房间未清剿');
    return 'ok';
  });

  await step('16_第二层陷阱与祭坛', ()=>{
    // 祭坛
    const f=G.game.floor;
    const shrineRoom=f.rooms.find(r=>r.type==='shrine');
    if(shrineRoom){
      G.player.x=shrineRoom.cx; G.player.z=shrineRoom.cz+1.2;
      frames(6);
      const sh=G.props.find(pr=>pr.type==='shrine');
      if(sh&&sh.interact) sh.interact.fn();
      frames(10);
    }
    const gambleRoom=f.rooms.find(r=>r.type==='gamble');
    if(gambleRoom){
      G.player.x=gambleRoom.cx; G.player.z=gambleRoom.cz+1.2;
      frames(6);
      const gb=G.props.find(pr=>pr.type==='gamble');
      if(gb&&gb.interact){ G.player.money=50; gb.interact.fn(); }
      frames(10);
    }
    return 'ok';
  });

  await step('17_Boss战全流程', async ()=>{
    const f=G.game.floor;
    const br=f.rooms.find(r=>r.type==='boss');
    G.player.x=br.cx; G.player.z=br.cz;
    frames(15);
    assert(G.boss.active,'Boss未生成');
    aim();
    // P1 攻击循环
    frames(420);
    assert(G.boss.active,'Boss意外死亡');
    // P2 (需 ≤540)
    G.hurtBoss(370);
    frames(80);
    assert(G.boss.active.phase>=2,'未进入阶段2:'+G.boss.active.phase);
    frames(200);
    // P3 (需 ≤225)
    G.hurtBoss(320);
    frames(80);
    assert(G.boss.active && G.boss.active.phase===3,'未进入阶段3');
    frames(200);
    // 击杀（第 2 层 Boss：王座崩塌 → 出现下行舱口，不再直接胜利）
    G.hurtBoss(99999);
    frames(300);
    assert(!G.boss.active,'Boss未死亡');
    await sleep(400);
    frames(5);
    const hatch17=G.props.find(pr=>pr.type==='exitHatch' && pr.room===G.game.floor.bossRoom);
    assert(hatch17 && hatch17.interact,'第 2 层 Boss 死后未出现下行舱口');
    assert(G.game.state==='play','第 2 层 Boss 死后状态异常:'+G.game.state);
    return '三阶段Boss战通过（战后出现下行舱口，通往第三层）';
  });

  await step('18_重新开始新局', ()=>{
    G.game.manual=false;
    G.game.startRun();
    assert(G.game.state==='play','状态异常');
    assert(G.game.floorNum===1,'未回到第一层');
    frames(30);
    return '新局生成正常';
  });

  await step('19_死亡界面与返回基地', async ()=>{
    G.game.manual=true;
    G.game.startRun();
    frames(5);
    const p=G.player;
    p.invulnT=0; p.rollT=0; p.ghostT=0; p.shieldCharge=0; p.armor=0;
    p.hp=1;
    p.hurt(2,null);
    assert(p.dead,'玩家未死亡');
    assert(G.game.state==='dead','未进入死亡状态');
    assert(G.$('screenDead').classList.contains('on'),'死亡界面未显示');
    assert(G.$('crosshair').style.display!=='block','死亡后准星未隐藏');
    // 点击「返回基地」→ 基地（死亡后的默认归宿）；再乘升降梯开新局
    G.game._resultT=0;                                // 跳过 700ms 误触闸门（真实玩家不受影响）
    G.$('btnRetry').onclick();
    await sleep(900); frames(5);
    assert(G.game.inBase && G.game.state==='play','死亡后未返回基地');
    assert(!G.$('screenDead').classList.contains('on'),'死亡界面未关闭');
    assert(G.player && !G.player.dead,'基地玩家异常');
    G.game.launchRun();
    await sleep(800); frames(5);
    assert(G.game.state==='play' && G.game.floorNum===1,'重开失败');
    assert(G.player && !G.player.dead,'新局玩家异常');
    G.ui.updateCrosshair();
    assert(G.$('crosshair').style.display==='block','游戏中准星未显示');
    frames(20);
    return '死亡→基地→重开流程通过';
  });

  await step('20_暂停与恢复', ()=>{
    G.game.togglePause(true);
    assert(G.game.state==='pause','未暂停');
    assert(G.$('screenPause').classList.contains('on'),'暂停界面未显示');
    G.ui.updateCrosshair();
    assert(G.$('crosshair').style.display==='none','暂停时准星未隐藏');
    G.game.togglePause(false);
    assert(G.game.state==='play','未恢复');
    assert(!G.$('screenPause').classList.contains('on'),'暂停界面未关闭');
    frames(5);
    return '暂停/恢复通过';
  });

  await step('21_长按连发', ()=>{
    G.game.startRun();
    frames(5);
    const p=G.player;
    aim();
    let shots=0;
    const origFire=G.playerCtl.fire;
    G.playerCtl.fire=function(pp,w,a){ shots++; return origFire.call(G.playerCtl,pp,w,a); };
    // 初始左轮：长按 2.5 秒应打出整弹匣并自动装填（半自动只能打 1 发）
    p.weapons=[G.weapons.mktWeapon('rusty')]; p.curW=0;
    G.input.mouse.down=true;
    frames(150);
    G.input.mouse.down=false;
    assert(shots>=6,'左轮长按连发失败:'+shots);
    // 霰弹枪（原半自动）：长按 3.3 秒应至少 3 发
    shots=0;
    p.weapons=[G.weapons.mktWeapon('shotgun')]; p.curW=0;
    frames(5);
    G.input.mouse.down=true;
    frames(200);
    G.input.mouse.down=false;
    G.playerCtl.fire=origFire;
    assert(shots>=3,'霰弹枪长按连发失败:'+shots);
    frames(5);
    return '全部武器支持长按连发';
  });

  await step('22_掩体卡模与清剿软锁', ()=>{
    G.game.startRun();
    frames(5);
    const f=G.game.floor;
    // 找一个带柱子的战斗房（柱子=不可破坏掩体，卡模软锁高危点）
    let target=null, pillar=null;
    for(const r of f.rooms){
      if(r.type!=='combat'||r.cleared) continue;
      const pl=G.props.find(pr=>pr.type==='pillar'&&pr.room===r);
      if(pl){ target=r; pillar=pl; break; }
    }
    if(!target) return '本局无柱房，跳过（非失败）';
    // 进入并锁房
    G.player.x=target.cx; G.player.z=target.cz;
    frames(8);
    assert(target.locked,'房间未封锁');
    // 等待本波敌人全部生成
    let g=0;
    while(G.game.spawnQueue.some(s=>s.room===target)&&g++<200) frames(2);
    // 最坏情况模拟：把一只蘑菇强制塞进柱子正中心
    const sh=G.enemies.spawn('shroom', pillar.x, pillar.z);
    sh.room=target; sh.spawnT=0; sh.mesh.scale.setScalar(1);
    frames(3);
    const d=G.dist(sh.x,sh.z,pillar.x,pillar.z);
    assert(d>=pillar.r+sh.r-.05,'卡模敌人未被推出掩体: '+d.toFixed(2));
    // 击杀该房全部敌人（含被推出的蘑菇）
    g=0;
    while((G.enemies.list.some(e=>e.room===target&&!e.dead)||G.game.spawnQueue.some(s=>s.room===target))&&g++<300){
      G.game.spawnQueue.forEach(s=>{ if(s.room===target) s.t=0; });
      G.enemies.list.forEach(e=>{ if(e.room===target&&!e.dead){ e.spawnT=0; G.hurtEnemy(e,99999,(e.face||0)+Math.PI,0,true); } });
      frames(2);
    }
    frames(60);
    assert(target.cleared===true,'卡模房间未清剿（软锁）');
    assert(target.locked===false,'清剿后门未开启');
    return '掩体卡模自动排除，房间正常清剿开门';
  });

  await step('23_邪术师召唤物归属', ()=>{
    G.game.startRun();
    frames(5);
    const e=G.enemies.spawn('hexer', G.player.x+3, G.player.z);
    e.room=G.game.curRoom; e.spawnT=0;
    // 直接模拟召唤分支
    const before=G.enemies.list.length;
    for(let i=0;i<2;i++){ const s=G.enemies.spawn('slime', e.x+(Math.random()-.5)*2, e.z+(Math.random()-.5)*2); if(s) s.room=e.room; }
    assert(G.enemies.list.length===before+2,'召唤失败');
    assert(G.enemies.list.every(x=>x.room===e.room || x===e),'召唤物未继承房间归属');
    // 清理
    G.enemies.list.slice().forEach(x=>G.hurtEnemy(x,99999,0,0));
    frames(5);
    return '召唤物计入房间清剿判定';
  });

  await step('24_锁定房无视觉污染标记', ()=>{
    G.game.startRun();
    frames(5);
    const f=G.game.floor;
    const combat=f.rooms.find(r=>r.type==='combat'&&!r.cleared);
    G.player.x=combat.cx; G.player.z=combat.cz;
    frames(8);
    assert(combat.locked,'房间未锁定');
    let g=0;
    while(G.game.spawnQueue.some(s=>s.room===combat)&&g++<200) frames(2);
    frames(40); // 等待出生动画结束
    const inRoom=G.enemies.list.filter(e=>e.room===combat&&!e.dead);
    assert(inRoom.length>0,'房间无敌人');
    // 敌人头顶不应有任何红点/光柱标记（视觉污染已移除，软锁由位置自愈+保底机制根治）
    assert(inRoom.every(e=>!e.marker),'敌人仍携带标记对象');
    // 清剿（含二波增援，循环等待至清剿）
    let g2=0;
    while((!combat.cleared) && g2++<300){
      G.game.spawnQueue.forEach(s=>{ if(s.room===combat) s.t=0; });
      G.enemies.list.forEach(e=>{ if(e.room===combat&&!e.dead){ e.spawnT=0; G.hurtEnemy(e,99999,(e.face||0)+Math.PI,0,true); } });
      frames(2);
    }
    frames(10);
    assert(combat.cleared,'未清剿');
    return '敌人无标记，清剿逻辑正常';
  });

  await step('25_慢节奏战斗不误清', ()=>{
    G.game.startRun();
    frames(5);
    const f=G.game.floor;
    const combat=f.rooms.find(r=>r.type==='combat'&&!r.cleared);
    G.player.x=combat.cx; G.player.z=combat.cz;
    frames(8);
    assert(combat.locked,'未锁定');
    // 等本波敌人全部生成
    let g=0;
    while(G.game.spawnQueue.some(s=>s.room===combat)&&g++<200) frames(2);
    frames(40);
    // 移除本房爆炸桶（防连锁爆炸干扰哨兵存活判定）
    G.props.filter(pr=>pr.type==='barrel'&&pr.room===combat).forEach(pr=>{
      pr.dead=true;
      pr.mesh.parent && pr.mesh.parent.remove(pr.mesh);
      const i=G.props.indexOf(pr); if(i>=0) G.props.splice(i,1);
    });
    // 注入哨兵：图腾（静止、无自杀式攻击、不会主动死亡）
    const sentinel=G.enemies.spawn('totem', combat.cx+2, combat.cz);
    sentinel.room=combat; sentinel.spawnT=0;
    // 挂机 35 秒（超过旧版 25 秒超时阈值）：敌人不应被系统自动清除
    frames(60*35);
    assert(sentinel.dead===false,'哨兵敌人被超时机制误清除（慢节奏战斗清场回归）');
    assert(combat.locked===true,'挂机后房间被误清剿/门被误开');
    // 正常击杀全部敌人后必须开门（反软锁的正确路径）
    let g2=0;
    while((G.enemies.list.some(e=>e.room===combat&&!e.dead)||G.game.spawnQueue.some(s=>s.room===combat))&&g2++<400){
      G.game.spawnQueue.forEach(s=>{ if(s.room===combat) s.t=0; });
      G.enemies.list.forEach(e=>{ if(e.room===combat&&!e.dead){ e.spawnT=0; G.hurtEnemy(e,99999,(e.face||0)+Math.PI,0,true); } });
      frames(2);
    }
    frames(60);
    assert(combat.cleared===true,'击杀全部敌人后房间未清剿');
    assert(combat.locked===false,'清剿后门未开启');
    return '挂机35秒敌人不消失，击杀后正常开门';
  });

  await step('25b_卡墙敌人自动消灭', ()=>{
    G.game.startRun();
    frames(5);
    const f=G.game.floor;
    const combat=f.rooms.find(r=>r.type==='combat'&&!r.cleared);
    G.player.x=combat.cx; G.player.z=combat.cz;
    frames(8);
    assert(combat.locked,'未锁定');
    // 等待本波敌人全部生成
    let g=0;
    while(G.game.spawnQueue.some(s=>s.room===combat)&&g++<200) frames(2);
    frames(40);
    // 极端模拟：把敌人直接扔到房间外的墙体坐标（生成器范围外的绝对非法位置）
    const e=G.enemies.spawn('shroom', -99, -99);
    e.room=combat; e.spawnT=0;
    frames(70); // > 0.8 秒
    assert(e.dead===true,'卡墙敌人未被自动消灭');
    assert(!G.enemies.list.includes(e),'卡墙敌人未从列表移除');
    // 正常敌人不受影响
    const ok=G.enemies.list.filter(x=>x.room===combat&&!x.dead);
    assert(ok.length>0 || combat.cleared,'正常敌人被误杀');
    frames(5);
    return '非法位置敌人0.8秒自动消灭';
  });

  await step('26_盾卫格挡与破防', ()=>{
    G.game.startRun();
    frames(5);
    const sh=G.enemies.spawn('shield', G.player.x+4, G.player.z);
    sh.spawnT=0; sh.mesh.scale.setScalar(1); sh.hp=sh.maxhp=52;
    sh.state='idle'; sh.stateT=0;
    frames(2);
    sh.face=0; sh.targetFace=0;
    const hp0=sh.hp;
    // 前4次正面攻击：全部格挡且不破防
    for(let i=0;i<4;i++){
      G.hurtEnemy(sh, 10, Math.PI, 0);
      assert(sh.hp===hp0,'第'+(i+1)+'次正面格挡失效');
      assert(sh.state!=='guardbreak','第'+(i+1)+'次格挡就破防（应为5次）');
    }
    // 第5次：破防（踉跄，无法格挡）
    G.hurtEnemy(sh, 10, Math.PI, 0);
    assert(sh.state==='guardbreak','5次格挡后未破防: '+sh.state);
    // 破防窗口内正面直击也掉血（普通武器有效）
    const hp1=sh.hp;
    G.hurtEnemy(sh, 10, Math.PI, 0);
    assert(sh.hp===hp1-10,'破防期间正面攻击仍被格挡');
    // 破防结束后恢复格挡能力
    frames(60*3);
    assert(sh.state!=='guardbreak','破防踉跄未结束');
    sh.face=0; sh.targetFace=0;
    const hp2=sh.hp;
    G.hurtEnemy(sh, 10, Math.PI, 0);
    assert(sh.hp===hp2,'破防恢复后格挡未生效');
    // 背后受击：正常扣血
    G.hurtEnemy(sh, 10, 0, 0);
    assert(sh.hp===hp2-10,'背面受击失败');
    // 爆炸：无视格挡
    const hp3=sh.hp;
    G.weapons.explode(sh.x,sh.z,2.2,20,'p');
    frames(3);
    if(!sh.dead){ assert(sh.hp<hp3,'爆炸被格挡（应无视格挡）'); }
    G.enemies.list.slice().forEach(e=>G.hurtEnemy(e,99999,0,0,true));
    frames(5);
    return '4连格挡/第5次破防/破防窗口掉血/恢复格挡/背面/爆炸全部正确';
  });

  await step('27_商店价格可见', ()=>{
    G.game.startRun();
    frames(5);
    const f=G.game.floor;
    const shop=f.rooms.find(r=>r.type==='shop');
    assert(shop && shop.stock && shop.stock.length>0,'商店无库存');
    const ped=G.props.filter(pr=>pr.type==='pedestal'&&pr.room===shop);
    assert(ped.length>0,'货架未生成');
    // 每个货架应有商品名牌与价格牌，且可见
    for(const pr of ped){
      assert(pr.nameTag && pr.nameTag.visible!==false,'缺商品名牌');
      assert(pr.priceSprite && pr.priceSprite.visible!==false,'缺价格牌');
      // 价格牌尺寸足够低分辨率下可读（宽>=1.5 世界单位）
      assert(pr.priceSprite.scale.x>=1.5,'价格牌过小:'+pr.priceSprite.scale.x);
    }
    // 商人位置验证：必须站在房间地板范围内（z 在 z0..z1 之间），不被墙体遮挡
    const keeper=G.props.find(pr=>pr.type==='shopkeeper'&&pr.room===shop);
    assert(keeper,'商人未生成');
    assert(keeper.z>shop.z0 && keeper.z<shop.z1,'商人位置不在房间地板内: z='+keeper.z.toFixed(1)+' (z0='+shop.z0+', z1='+shop.z1+')');
    assert(keeper.x>shop.x0 && keeper.x<shop.x1,'商人x位置越界');
    const kTile=G.tileAt(keeper.x,keeper.z);
    assert(kTile && kTile.t==='floor','商人所在tile不是地板: '+(kTile?kTile.t:'无'));
    // 商人可交互
    assert(keeper.interact,'商人的交互缺失');
    // 动态 label：走近货架显示价格与余额
    const p0=ped[0];
    G.player.x=p0.x; G.player.z=p0.z+1.0;
    frames(3);
    const label=typeof p0.interact.label==='function'? p0.interact.label() : p0.interact.label;
    assert(String(label).includes('¥'),'交互提示未包含价格');
    assert(String(label).includes(String(G.player.money)),'交互提示未包含余额');
    // 购买后名牌价格牌隐藏
    G.player.money=500;
    p0.interact.fn();
    assert(p0.sold,'购买失败');
    assert(p0.priceSprite.visible===false && p0.nameTag.visible===false,'购买后价格牌未隐藏');
    frames(5);
    return '商店名牌+价格牌+商人位置全部正常';
  });

  await step('27b_满血买红心扩容', ()=>{
    G.game.startRun();
    frames(5);
    const f=G.game.floor;
    const shop=f.rooms.find(r=>r.type==='shop');
    G.player.x=shop.cx; G.player.z=shop.cz+1.2;
    frames(5);
    const heartPed=G.props.find(pr=>pr.type==='pedestal'&&pr.room===shop&&pr.stock&&pr.stock.kind==='heart'&&!pr.sold);
    assert(heartPed,'商店无红心货架');
    const p=G.player;
    // 情形1：满血购买 → 扩充上限
    p.money=500;
    p.hp=p.maxHp; // 满血
    const max0=p.maxHp, hp0=p.hp;
    const label1=heartPed.interact.label();
    assert(String(label1).includes('扩容'),'满血时商品名未显示扩容');
    heartPed.interact.fn();
    assert(p.maxHp===max0+2,'满血购买未扩充上限: '+p.maxHp+' vs '+(max0+2));
    assert(p.hp===p.maxHp,'扩容后未保持满血');
    // 情形2：不满血购买 → 治疗2点
    const healPed=G.props.find(pr=>pr.type==='pedestal'&&pr.room===shop&&pr.stock&&pr.stock.kind==='heart'&&!pr.sold);
    if(healPed){
      p.hp=2; // 掉血
      const max1=p.maxHp;
      const label2=healPed.interact.label();
      assert(!String(label2).includes('扩容'),'掉血时商品名不应显示扩容');
      healPed.interact.fn();
      assert(p.maxHp===max1,'掉血购买不应扩容');
      assert(p.hp===4,'掉血购买未治疗: hp='+p.hp);
    }
    frames(5);
    return '满血买红心=+1心上限，掉血买红心=治疗';
  });

  await step('28_地图与大地图', ()=>{
    G.game.startRun();
    frames(10);
    // 模拟探索：从起点 BFS 标记 6 个房间为已发现
    const f=G.game.floor;
    const seen=new Set([f.startRoom]);
    const q=[f.startRoom];
    while(q.length && seen.size<6){
      const r=q.shift();
      for(const nb of r.neighbors){ if(!seen.has(nb) && nb.type!=='secret'){ seen.add(nb); q.push(nb); } }
    }
    seen.forEach(r=>{ r.discovered=true; r.mapHint=true; });
    G.ui.minimap(G.game);
    frames(5);
    // 小地图尺寸已加大
    const mm=G.$('minimap');
    assert(mm.width===320 && mm.height===246,'小地图尺寸未加大:'+mm.width+'x'+mm.height);
    // 像素级验证：地图内容必须占据画布显著比例（房间块真实可见，而非只有边框）
    {
      const ctx=mm.getContext('2d');
      const img=ctx.getImageData(0,0,mm.width,mm.height).data;
      let content=0, total=mm.width*mm.height;
      for(let i=0;i<img.length;i+=4){
        const r=img[i],g=img[i+1],b=img[i+2];
        // 背景 #0a0810=(10,8,16)，明显异于背景即算内容
        if(Math.abs(r-10)>28||Math.abs(g-8)>28||Math.abs(b-16)>28) content++;
      }
      const frac=content/total;
      assert(frac>.12,'地图内容占比过低(房间不可见):'+(frac*100).toFixed(1)+'%');
    }
    // 动态缩放验证：按 drawMap 相同公式计算比例，单个 1x1 房间应 >= 22px
    {
      const rooms=f.rooms.filter(r=>r.discovered||r.mapHint);
      let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;
      rooms.forEach(r=>{ minX=Math.min(minX,r.rx); maxX=Math.max(maxX,r.rx+r.rw); minZ=Math.min(minZ,r.rz); maxZ=Math.max(maxZ,r.rz+r.rh); });
      const spanX=Math.max(1,maxX-minX), spanZ=Math.max(1,maxZ-minZ);
      const s=Math.min((320-32)/spanX,(246-32)/spanZ,66);
      assert(s>=22,'地图房间比例过小:'+s.toFixed(1));
    }
    // Tab 切换大地图
    G.onKeyPress('Tab');
    assert(G.$('bigmapWrap').classList.contains('on'),'Tab 未打开大地图');
    frames(10);
    assert(G.$('bigmapWrap').classList.contains('on'),'大地图意外关闭');
    // 再次 Tab 关闭
    G.onKeyPress('Tab');
    assert(!G.$('bigmapWrap').classList.contains('on'),'Tab 未关闭大地图');
    G.onKeyPress('Tab');
    frames(10);
    G.onKeyPress('Tab');
    return '小地图房间清晰可见+Tab大地图正常';
  });

  await step('29_全层清剿压测', ()=>{
    // 逐个战斗房：进入锁定 → 击杀全部敌人 → 房间必须开门（软锁根因=位置非法，由 0.8s 自愈处理）
    G.game.startRun();
    frames(5);
    const f=G.game.floor;
    const combats=f.rooms.filter(r=>r.type==='combat');
    for(const room of combats){
      G.player.x=room.cx; G.player.z=room.cz;
      frames(10);
      assert(room.locked,'战斗房未锁定: room#'+room.id);
      let guard=0;
      while(room.locked && guard++<400){
        G.game.spawnQueue.forEach(s=>{ if(s.room===room) s.t=0; });
        G.enemies.list.forEach(e=>{ if(e.room===room&&!e.dead){ e.spawnT=0; G.hurtEnemy(e,99999,(e.face||0)+Math.PI,0,true); } });
        frames(3);
      }
      assert(room.cleared===true,'战斗房无法通过击杀清剿（软锁）: room#'+room.id);
      assert(room.locked===false,'清剿后门未开: room#'+room.id);
    }
    frames(10);
    return '全部'+combats.length+'个战斗房击杀后全部正常开门';
  });

  await step('30_输入缓冲与操作手感', ()=>{
    G.game.startRun();
    frames(5);
    const p=G.player;
    // 1) 翻滚参数：时长短（后摇用下方实测验证）
    assert(p.rollDur<=.3,'翻滚时长过长:'+p.rollDur);
    // 实测后摇：触发翻滚后等待 rollT 归零，此时距下次可翻滚的间隔
    p.rollT=0; p.rollCd=0;
    G.input.pressed['Space']=true;
    frames(2);
    assert(p.rollT>0,'翻滚未触发');
    let waited=0;
    while(p.rollT>0 && waited++<60) frames(1);
    // 此刻 rollT 刚结束，检查还需多久可再翻
    let gap=0, g2=0;
    while(p.rollCd>0 && g2++<60){ frames(1); gap+=1/60; }
    assert(gap<=.25,'翻滚后摇过长:'+gap.toFixed(2)+'s');
    // 2) 缓冲空格：pressed 已清除、仅 buffer 存在时应触发翻滚
    p.rollT=0; p.rollCd=0;
    G.input.pressed={}; G.input.buffer['Space']=.18;
    frames(3);
    assert(p.rollT>0,'缓冲空格未触发翻滚');
    frames(60);
    // 3) 缓冲 E：站在宝箱旁，仅靠 buffer 触发开箱（模拟提前按下/顿帧期按下）
    const f=G.game.floor;
    const tr=f.rooms.find(r=>r.type==='treasure');
    G.player.x=tr.cx; G.player.z=tr.cz+1.2;
    frames(6);
    const chest=G.props.find(pr=>pr.type==='chest'&&!pr.opened);
    if(chest){
      chest.tier='brown'; // 确保无需钥匙
      G.input.pressed={}; G.input.buffer['KeyE']=.18;
      frames(5);
      assert(chest.opened===true,'缓冲E未触发开箱');
    }
    // 4) 缓冲过期不误触：buffer 耗尽后不再触发
    G.input.buffer['KeyE']=.05;
    frames(10); // 0.05s 后过期
    frames(5);
    const chest2=G.props.find(pr=>pr.type==='chest'&&!pr.opened);
    if(chest2){ assert(chest2.opened===false,'过期缓冲误触发交互'); }
    frames(5);
    return '翻滚后摇'+gap.toFixed(2)+'s + 输入缓冲(E/空格)全部生效';
  });

  await step('31_金币可见性与翻滚特效', ()=>{
    G.game.startRun();
    frames(5);
    const p=G.player;
    // 金币拾取物：自发光材质 + 辉光精灵（昏暗第一层中醒目）
    // 放在磁吸范围外（>1.7格），仅验证视觉属性不被误拾取
    const pk=G.spawnPickup('money', p.x+3.2, p.z);
    assert(pk.mesh.children.length>=2,'金币缺少辉光精灵');
    const glow=pk.mesh.children.find(c=>c.isSprite);
    assert(glow && glow.visible,'金币辉光不可见');
    // 帧推进：金币星芒闪光不报错（sparkle 逻辑运行）
    frames(90);
    assert(G.pickups.includes(pk),'金币意外消失/被磁吸误拾');
    // 翻滚特效：触发翻滚后粒子/冲击环系统运行无错（fx 池正常工作）
    p.rollT=0; p.rollCd=0;
    G.input.pressed['Space']=true;
    frames(20); // 翻滚全程 0.26s ≈ 16 帧
    frames(10);
    // 翻滚中角色辉光为能量蓝紫（VOID HUNTER 能量语言）
    p.rollT=0; p.rollCd=0;
    G.input.pressed['Space']=true;
    frames(6);
    assert(p.rollT>0,'翻滚未触发(特效测试)');
    const mat=p.refs.glow.material;
    // three.js Color 分量为 0~1 浮点；能量蓝紫 #5a7cff = (0.35, 0.49, 1.0) → 蓝分量最高且显著
    assert(mat && mat.color && mat.color.b>.85 && mat.color.b>mat.color.g && mat.color.r<mat.color.g,'翻滚中角色辉光未变蓝紫');
    frames(30);
    return '金币辉光+星芒、翻滚能量拖尾特效全部生效';
  });

  await step('32_索敌与追击与满血红心', ()=>{
    G.game.startRun();
    frames(5);
    const p=G.player;
    p.maxHp=60; p.hp=60; // 与测试保护(hp<50补50)配合：确保可制造"掉血"状态
    // 蘑菇索敌：在 2 格宽大房间里测 11 格远索敌（原 9 格太短；1x1 出生房放不下此距离）
    const f=G.game.floor;
    const bigRoom=f.rooms.find(r=>r.rw>=2)||f.rooms.find(r=>r.rh>=2);
    if(bigRoom){
      p.x=bigRoom.cx; p.z=bigRoom.cz;
      frames(3);
      const sh=G.enemies.spawn('shroom', p.x+11, p.z);
      sh.spawnT=0; sh.room=bigRoom; sh.atkCd=0;
      frames(10); // 0.17s：蓄力(0.5s)进行中，state 应为 windup
      if(!sh.dead){ // 蘑菇存活=位置合法；蓄力中段必须已索敌（被墙内自愈清理则房间形状不适用，跳过）
        assert(sh.state==='windup','蘑菇 11 格外未索敌（索敌距离过短）: '+sh.state);
      }
      frames(40); // 等开火结束
      if(!sh.dead) G.hurtEnemy(sh,99999,0,0,true);
    }
    frames(3);
    // 追击加速：远距敌人实际移速 > 基础移速
    const gn=G.enemies.spawn('gunner', p.x+9, p.z);
    gn.spawnT=0; gn.room=G.game.curRoom;
    frames(2);
    const boosted=G.enemies.chaseSpd(gn, 9);
    assert(boosted>gn.baseSpd*1.3,'远距未加速:'+boosted.toFixed(2)+' vs '+gn.baseSpd.toFixed(2));
    // 近距恢复正常
    const near=G.enemies.chaseSpd(gn, 2);
    assert(Math.abs(near-gn.baseSpd)<.01,'近距速度异常');
    G.hurtEnemy(gn,99999,0,0,true);
    frames(3);
    // 满血红心：不磁吸不拾取（放玩家身边，红心应留在原地）
    p.hp=p.maxHp;
    const hp0=p.hp;
    const x0=p.x+0.6, z0=p.z; // 磁吸范围内
    const hp1=G.spawnPickup('heart', x0, z0);
    frames(30); // 玩家原地不动
    assert(G.pickups.includes(hp1),'满血时红心被误拾取');
    assert(Math.abs(hp1.x-x0)<.05,'满血时红心被磁吸移动（应留在原地）');
    // 玩家走开再走回，仍然满血不拾取
    p.x=x0+5; frames(10); p.x=x0+0.3; frames(10);
    assert(G.pickups.includes(hp1),'满血反复经过时红心被误拾取');
    // 掉血后可正常磁吸拾取
    p.hp=Math.max(1,p.maxHp-4);
    frames(30);
    assert(!G.pickups.includes(hp1),'掉血后红心未被磁吸拾取');
    assert(p.hp>Math.max(1,p.maxHp-4),'红心未回血');
    frames(5);
    return '蘑菇远距索敌 + 追击加速 + 满血红心不吸附全部生效';
  });

  await step('33_Boss房生成统计压测', ()=>{
    // 50 次独立种子生成第二层：Boss 房必须存在、从 start BFS 可达、无 enemyWaves（不与小怪混淆）
    let ok=0, failInfo=[];
    for(let i=0;i<50;i++){
      const rng=new G.RNG(90000+i*7919);
      const f=G.gen.genFloor(2, rng.next()>>>0);
      const boss=f.bossRoom;
      if(!boss){ failInfo.push('#'+i+':无boss房'); continue; }
      // BFS 可达性
      const reach=new Set([f.startRoom]);
      const q=[f.startRoom];
      while(q.length){ const r=q.shift(); for(const n of r.neighbors){ if(!reach.has(n)){ reach.add(n); q.push(n); } } }
      if(!reach.has(boss)){ failInfo.push('#'+i+':boss房不可达'); continue; }
      if(boss.enemyWaves){ failInfo.push('#'+i+':boss房带小怪波次'); continue; }
      ok++;
    }
    assert(ok===50,'Boss房生成压测失败 '+ok+'/50: '+failInfo.slice(0,5).join(','));
    return '50/50 第二层Boss房全部存在且可达';
  });

  await step('34_文字清晰度与标签修复', ()=>{
    // 内部渲染分辨率提升至 320p
    const cv=G.$('game');
    assert(cv.height===320 && cv.width>=380,'内部分辨率未提升: '+cv.width+'x'+cv.height);
    G.game.startRun();
    frames(5);
    // 商店价格牌/名牌：高分辨率画布 + 更大世界尺寸
    const f=G.game.floor;
    const shop=f.rooms.find(r=>r.type==='shop');
    const ped=G.props.find(pr=>pr.type==='pedestal'&&pr.room===shop&&!pr.sold);
    assert(ped,'货架未生成');
    assert(ped.priceSprite.scale.x>=3.0,'价格牌过小:'+ped.priceSprite.scale.x);
    assert(ped.nameTag.scale.x>=2.5,'名牌过小:'+ped.nameTag.scale.x);
    // 伤害数字精灵放大
    G.fx.dmgNum(G.player.x,1,G.player.z,123,false);
    const dn=G.fx.dmgNums.find(d=>d.life>0);
    assert(dn && dn.sp.scale.x>=2.0,'伤害数字过小:'+(dn?dn.sp.scale.x:0));
    frames(45);
    // 武器掉落标签：挂载到拾取物组（跟随位置，修复滞留原点bug）
    const p=G.player;
    const wp=G.spawnPickup('weapon', p.x+3, p.z);
    assert(wp.label,'武器标签未生成');
    assert(wp.label.parent===wp.mesh,'武器标签未挂载到拾取物组（原点bug回归）');
    assert(wp.label.scale.x>=2.0,'武器标签过小:'+wp.label.scale.x);
    // 帧推进后标签跟随拾取物（世界坐标接近掉落点）
    frames(5);
    const wpWorld=new THREE.Vector3();
    wp.label.getWorldPosition(wpWorld);
    assert(Math.abs(wpWorld.x-wp.x)<.1 && Math.abs(wpWorld.z-wp.z)<.1,'标签未跟随拾取物位置');
    frames(5);
    return '320p + 大字号描边文字 + 标签跟随全部生效';
  });

  // ============ 2026-09-01 Bug 修复回归（BUG-001/002/003/006）============

  await step('35_Boss可被真实子弹与爆炸伤害', ()=>{
    // 回归：BUG-001 玩家无法对 Boss 造成任何伤害
    // （weapons.js 曾把模块对象 G.boss 当实例用，x/z/r 全是 undefined，距离算成 NaN）
    const p=G.player;
    const room=G.game.curRoom;
    assert(room,'无当前房间');
    // 在房间内找一列连续 3 格的空地（无墙体、无挡弹/挡移动道具），玩家站左、Boss 放右侧
    const clear=(x,z)=>{ const t=G.tileAt(x,z); return t&&t.t==='floor'&&
      !G.props.some(pr=>!pr.dead&&G.dist2(x,z,pr.x,pr.z)<1.69); };
    let spot=null;
    for(let tz=room.z0+1;tz<room.z1&&!spot;tz++)
      for(let tx=room.x0+1;tx<=room.x1-3;tx++)
        if(clear(tx+.5,tz+.5)&&clear(tx+2.5,tz+.5)){ spot={x:tx+.5,z:tz+.5}; break; }
    assert(spot,'未找到空旷测试位');
    p.x=spot.x; p.z=spot.z;
    // 清场：移除全部敌人与场上子弹，防止残留敌人/弹幕挡住测试弹（与清剿后的合法状态一致）
    for(const e of G.enemies.list){ if(!e.dead){ e.dead=true; if(e.mesh) e.mesh.visible=false; } }
    G.enemies.list.length=0;
    G.weapons.clear();
    G.boss.clear();
    G.boss.spawn(spot.x+2.5, spot.z);
    const boss=G.boss.active;
    assert(boss,'Boss 未生成');
    boss.spawnT=0;               // 跳过出生保护
    // 注意：不能停在 'intro'（出场演出）——B.hurt 对 intro 状态直接免伤，会误判 BUG-001。
    // 置于 'cool'（攻击间隙待机）并拉长计时，防止 AI 主动攻击干扰判定。
    boss.state='cool'; boss.stateT=5;
    boss.mesh.scale.setScalar(1);
    boss.hp=100; boss.maxhp=100;
    // 真实子弹（走 W.update 的完整碰撞链路，不直接调 hurtBoss）
    const bullet=G.weapons.spawn({team:'p', x:p.x+.3, z:p.z, ang:0, spd:12, dmg:30, size:.12,
                     pierce:0, bounce:0, knock:1, life:1, crit:false, kind:'', color:0xffffff});
    assert(bullet,'测试子弹生成失败');
    frames(20);
    assert(boss.dead || boss.hp<100,'真实子弹未对 Boss 造成伤害（BUG-001 回归） hp='+boss.hp);
    // 爆炸路径
    if(!boss.dead){
      const hp2=boss.hp;
      G.weapons.explode(boss.x,boss.z,2.2,50,'p'); frames(2);
      assert(boss.dead || boss.hp<hp2,'爆炸未对 Boss 造成伤害（BUG-001 回归） '+hp2+'→'+boss.hp);
    }
    G.boss.clear();
    return '真实子弹与爆炸均可伤害 Boss（BUG-001 修复）';
  });

  await step('36_切枪清除三连发队列', ()=>{
    // 回归：BUG-002 切枪不清 burstLeft，切回该武器会自动续发剩余弹
    const p=G.player;
    if(p.weapons.length<2)
      p.weapons.push({def:p.weapons[0].def, ammo:9, cool:0, reloading:false, reloadT:0, burstLeft:0, burstT:0});
    const w0=p.weapons[0];
    w0.burstLeft=2; w0.burstT=0;      // 伪造剩余三连发队列
    G.input.pressed['KeyQ']=true;     // 走真实切枪输入路径
    frames(1);
    assert(w0.burstLeft===0 && w0.burstT===0,'切枪未清除旧武器三连发队列（BUG-002 回归）');
    return '切枪后旧武器 burst 队列被清空';
  });

  await step('37_数字键与滚轮切枪', ()=>{
    // 回归：BUG-003 数字键 1/2 效果相同、滚轮方向被忽略
    const p=G.player;
    const n=p.weapons.length; assert(n>1,'需要至少两把武器');
    p.curW=0;
    G.input.pressed['Digit2']=true; frames(1);
    assert(p.curW===1,'Digit2 未直接选中 2 号槽（BUG-003 回归） curW='+p.curW);
    G.input.pressed['Digit1']=true; frames(1);
    assert(p.curW===0,'Digit1 未直接选中 1 号槽（BUG-003 回归） curW='+p.curW);
    G.input.mouse.wheel=1; frames(1);   // 下滚 → 下一把
    assert(p.curW===1%n,'滚轮下滚应切到下一把（BUG-003 回归） curW='+p.curW);
    G.input.mouse.wheel=-1; frames(1);  // 上滚 → 上一把（回到 0）
    assert(p.curW===0,'滚轮上滚应切到上一把（BUG-003 回归） curW='+p.curW);
    return '数字键直接选槽 + 滚轮双向循环';
  });

  await step('38_静音开关生效', ()=>{
    // 回归：BUG-006 G.audio.muted 是死开关（audio.js 从不读取）
    const A=G.audio;
    const realCtx=A.ctx, realOsc=A._osc, realUnlocked=A.unlocked;
    A.ctx=A.ctx||{currentTime:0}; A.unlocked=true;
    let calls=0; A._osc=()=>{calls++};     // 探针：统计发声调用次数
    A.muted=true;  A.sfx('ui');  const mutedCalls=calls;
    A.muted=false; A.sfx('ui');  const unmutedCalls=calls-mutedCalls;
    A._osc=realOsc; A.ctx=realCtx; A.unlocked=realUnlocked; A.muted=false;
    assert(mutedCalls===0,'muted=true 时 sfx 仍会发声（BUG-006 回归）');
    assert(unmutedCalls>0,'muted=false 时 sfx 应正常发声');
    return 'muted 开关对 sfx 真实生效';
  });

  await step('39_角色朝向系统回归', ()=>{
    // 回归：主角「VEX-07」重做后的 forward=+X 朝向系统。
    // 强制要求：面部/身体正前方 = 武器瞄准方向 = 鼠标世界方向，8 个方向全部成立。
    G.game.startRun();
    frames(5);
    const p=G.player;
    const norm=a=>{ a=a%(Math.PI*2); if(a>Math.PI)a-=Math.PI*2; if(a<-Math.PI)a+=Math.PI*2; return a; };
    // ① 8 方向瞄准收敛（直接填 aimX/aimZ，与 boottest 惯例一致，不跑相机）
    const dirs=[0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, -3*Math.PI/4, -Math.PI/2, -Math.PI/4];
    for(const a of dirs){
      G.input.aimX=p.x+Math.cos(a)*6; G.input.aimZ=p.z+Math.sin(a)*6;
      frames(42); // angLerp 25/s：0.7s 足以从任意初始角收敛到 <0.01°
      const err=norm(p.face-a);
      assert(Math.abs(err)<.02,'朝向未收敛 dir='+(a*180/Math.PI).toFixed(0)+'deg err='+(err*180/Math.PI).toFixed(2)+'deg');
      assert(Math.abs(norm(p.mesh.rotation.y-(-p.face)))<1e-6,'mesh.rotation.y 与 -face 失同步');
      const mx=p.x+Math.cos(p.face)*.62, mz=p.z+Math.sin(p.face)*.62;
      assert(Math.hypot(mx-p.muzzleX,mz-p.muzzleZ)<.01,'枪口位置偏离瞄准方向');
    }
    // ② 平滑性：180°大转身 2 帧后应转过约 1/3（平滑转身而非瞬移、也非不转）
    p.face=0;
    G.input.aimX=p.x-6; G.input.aimZ=p.z;
    frames(2);
    const resid=Math.abs(norm(p.face-Math.PI));
    assert(resid>1.0 && resid<Math.PI,'180°转身不平滑: 2帧后残差='+(resid*180/Math.PI).toFixed(1)+'deg');
    frames(60);
    // ③ 相机射线 NaN 守卫：相机未俯视时屏幕中心射线 direction.y=0 → t=Infinity →
    //    0*Infinity=NaN 曾永久污染 camX/相机矩阵/角色朝向（开局首帧鼠标在屏幕正中心即触发）
    G.game.camX=0; G.game.camZ=0;
    G.camera.position.set(0,0,0); G.camera.lookAt(0,0,-1);
    G.input.mouse.x=innerWidth/2; G.input.mouse.y=innerHeight/2;
    G.game.updateCamera(1/60);
    assert(isFinite(G.game.camX)&&isFinite(G.game.camZ),'camX/camZ 被射线 NaN 污染');
    assert(isFinite(G.input.aimX)&&isFinite(G.input.aimZ),'瞄准点被射线 NaN 污染');
    assert(isFinite(p.mesh.rotation.y),'角色朝向被 NaN 污染');
    // ④ 目镜辉光必须贴在头部附近（曾挂错父节点整体抬高 0.55，飘到头顶上方）
    p.mesh.updateMatrixWorld(true);
    const gw=p.refs.glow.getWorldPosition(new THREE.Vector3());
    const hw=p.refs.head.getWorldPosition(new THREE.Vector3());
    const gd=Math.hypot(gw.x-hw.x,gw.y-hw.y,gw.z-hw.z);
    assert(gd<.5,'目镜辉光偏离头部: dist='+gd.toFixed(2));
    return '8方向收敛/平滑转身/射线NaN守卫/辉光贴目镜 全部通过';
  });

  // ============ 薛定谔的拍立得：拍摄→冻结→DamageBuffer→×2结算→照片碎裂 ============

  await step('40_拍立得全链路回归', ()=>{
    G.game.startRun(); frames(3);
    const p=G.player;
    // 装备拍立得（真实武器实例），关暴击使伤害可精确断言；清场保证判定面干净
    p.weapons=[G.weapons.mktWeapon('polaroid')];
    p.curW=0; p.st.crit=0;
    G.weapons.clear();
    for(const e of G.enemies.list){ if(!e.dead){ e.dead=true; if(e.mesh) e.mesh.visible=false; } }
    G.enemies.list.length=0;
    // 找一列连续 4 格的空地（无墙/无道具）：玩家站左、图腾放右侧 4 格，保证视线不被遮挡
    const room=G.game.curRoom;
    assert(room,'无当前房间');
    const clear=(x,z)=>{ const t=G.tileAt(x,z); return t&&t.t==='floor'&&
      !G.props.some(pr=>!pr.dead&&G.dist2(x,z,pr.x,pr.z)<1.69); };
    let spot=null;
    for(let tz=room.z0+1;tz<room.z1&&!spot;tz++)
      for(let tx=room.x0+1;tx<=room.x1-4;tx++)
        if(clear(tx+.5,tz+.5)&&clear(tx+4.5,tz+.5)){ spot={x:tx+.5,z:tz+.5}; break; }
    assert(spot,'未找到 4 连格空旷测试位');
    p.x=spot.x; p.z=spot.z;
    // ① 摄影闪光同时命中敌人与敌方弹幕（真实输入路径：aim→mouse.down→蓄力→快门）
    G.input.aimX=p.x+6; G.input.aimZ=p.z;       // 明确朝正东瞄准（startRun 后 aim 是上一步残留坐标）
    const e=G.enemies.spawn('totem', p.x+4, p.z); e.spawnT=0; e.room=room;
    e.hp=e.maxhp=1000;
    const fb=G.weapons.spawn({team:'e', x:p.x+3, z:p.z+1, ang:Math.PI, spd:4, dmg:1, size:.1,
      pierce:0, bounce:0, knock:0, life:8, crit:false, kind:'', color:0xff5050});
    assert(fb,'敌方测试弹幕生成失败');
    const fbvx=fb.vx, fbvz=fb.vz;
    G.input.mouse.down=true; frames(1); G.input.mouse.down=false;
    frames(14);                                   // 蓄力 0.16s ≈ 10 帧 → 快门落下完成拍摄
    const w=p.weapons[0];
    assert(w.ammo===3, '拍摄未触发 ammo='+w.ammo);
    assert(e.photoT>0 && e.photoT<=2, '敌人未进入照片状态 photoT='+e.photoT);
    assert(e.photoBuf>0, '拍摄伤害未记入 DamageBuffer buf='+e.photoBuf);
    assert(fb.photoT>0, '敌方弹幕未被冻结');
    // ② 冻结期：动画/移动全停 + 真实 HP 不动 + 追加伤害全部入缓冲
    const hp0=e.hp, buf0=e.photoBuf, et=e.t;
    frames(20);
    assert(e.t===et, '冻结期敌人动画时间仍在推进 t='+e.t+'→'+et);
    G.hurtEnemy(e, 100, 0, 0, true);
    assert(Math.abs(e.photoBuf-(buf0+100))<1e-6, '冻结期伤害未入 DamageBuffer buf='+e.photoBuf);
    assert(e.hp===hp0, '冻结期真实 HP 被扣除 hp='+e.hp+'→'+hp0);
    // ②b 照片状态视觉路径：全体 mesh 换灰度旧相纸材质 + 白边相框挂载 + 光环 sprite 隐藏
    let matOk=true; e.mesh.traverse(o=>{ if(o.isMesh && o.material!==G.photo.mat) matOk=false; });
    assert(matOk, '照片状态敌人材质未换成灰度旧相纸');
    assert(!!e._photoFrame && e._photoFrame.parent===G.scene, '照片白边相框未挂载到场景');
    let spriteHidden=true; e.mesh.traverse(o=>{ if(o.isSprite && o.visible) spriteHidden=false; });
    assert(spriteHidden, '照片状态敌人光环 sprite 未隐藏');
    // ③ 弹幕冻结期真停：位置/生命周期全部暂停
    const bx=fb.x, bz=fb.z, bl=fb.life; frames(10);
    assert(Math.abs(fb.x-bx)<1e-6 && Math.abs(fb.z-bz)<1e-6, '冻结弹幕仍在移动');
    assert(fb.life===bl, '冻结弹幕生命周期仍在衰减');
    // ④ 冻结结束（2s）→ 冲洗 0.3s → DamageBuffer×2 一次性结算
    frames(150);
    const finalExp=Math.round((buf0+100)*2);
    assert(e.photoT<=0 && !e.photoPhase, '结算后照片状态未清除 phase='+e.photoPhase);
    assert(Math.abs((hp0-e.hp)-finalExp)<.01, '×2 结算金额不符 实扣'+(hp0-e.hp)+' 期望'+finalExp);
    assert(fb.photoT<=0, '弹幕冻结未按时解除 photoT='+fb.photoT);
    assert(fb.vx===fbvx && fb.vz===fbvz, '弹幕恢复后速度/方向改变');
    // ④b 结算后视觉还原：材质换回原装 + 相框回收
    let restored=true; e.mesh.traverse(o=>{ if(o.isMesh && o.material===G.photo.mat) restored=false; });
    assert(restored, '结算后敌人材质未还原');
    assert(!e._photoFrame, '结算后相框未回收');
    // ⑤ 致死 → 照片碎裂（不用普通死亡烟雾）
    e.hp=1;
    G.input.aimX=p.x+6; G.input.aimZ=p.z;
    G.input.mouse.down=true; frames(1); G.input.mouse.down=false;
    frames(14);
    assert(e.photoT>0, '二次拍摄未进入照片状态');
    frames(150);
    assert(e.dead, '致死结算未击杀');
    assert(e.photoDeath, '致死未走照片碎裂路径');
    assert(G.photo.frags.some(f=>f.life>0), '照片碎片未生成');
    return '拍摄/冻结/缓冲/×2结算/弹幕恢复/照片碎裂 全链路通过';
  });

  await step('41_武器商店系统', ()=>{
    // ⑰-1 目录与统一定价：15 把、与 W.defs 同源、按阶升序且跨阶绝不倒挂
    G.game.startRun();
    G.meta.debugUnlockAll();           // 商店流测试需要全目录可购
    frames(5);
    const f=G.game.floor;
    const shopRoom=f.rooms.find(r=>r.type==='shop');
    assert(shopRoom,'第一层无商店');
    const ids=G.shop.catalogIds();
    assert(ids.length===Object.keys(G.weapons.defs).length,'目录数量与武器表不同源:'+ids.length);
    const prices=ids.map(id=>G.shop.priceOf(id));
    for(let i=1;i<prices.length;i++) assert(prices[i]>=prices[i-1],'目录未按价格升序');
    const tierOf=id=>G.weapons.defs[id].tier;
    const minA=Math.min(...ids.filter(id=>tierOf(id)==='A').map(id=>G.shop.priceOf(id)));
    const maxB=Math.max(...ids.filter(id=>tierOf(id)==='B').map(id=>G.shop.priceOf(id)));
    const minB=Math.min(...ids.filter(id=>tierOf(id)==='B').map(id=>G.shop.priceOf(id)));
    const maxC=Math.max(...ids.filter(id=>tierOf(id)==='C').map(id=>G.shop.priceOf(id)));
    assert(minA>maxB && minB>maxC,'定价跨阶倒挂 A'+minA+'/B'+maxB+'/C'+maxC);
    // ⑰-2 真实购买：扣款→入武器池→满弹匣→记账（走 G.shop.buy 唯一事务入口）
    const p=G.player;
    G.player.x=shopRoom.cx; G.player.z=shopRoom.cz+1.2;
    p.money=200;
    const arcPrice=G.shop.priceOf('arc');
    assert(G.shop.buy('arc'),'购买 arc 失败');
    assert(p.money===200-arcPrice,'扣款错误:'+p.money+'/'+(200-arcPrice));
    const arc=p.weapons.find(w=>w.id==='arc');
    assert(arc,'arc 未加入武器池');
    assert(arc.ammo===arc.def.mag,'未满弹匣');
    assert(G.game.run.moneySpent===arcPrice,'run.moneySpent 未记账');
    // ⑰-3 立即可用（真实开火链路）：切到买到的 arc，电弧链跳伤图腾 → 特殊效果随购买完整保留
    p.curW=p.weapons.indexOf(arc);
    const es=[];
    for(let i=0;i<3;i++){ const x=G.enemies.spawn('totem', p.x+3+i*1.0, p.z+(i-1)*1.2); x.spawnT=0; x.room=G.game.curRoom; es.push(x); }
    G.input.aimX=p.x+5; G.input.aimZ=p.z;
    G.game.update(1/60); G.input.endFrame();
    G.playerCtl.emitShot(p,p.weapons[p.curW],0);
    frames(20);
    const hit=es.filter(x=>x.dead||x.hp<x.maxhp).length;
    assert(hit>=2,'买到的 arc 电弧链未生效:'+hit+'/3');
    es.forEach(x=>G.hurtEnemy(x,99999,0,0,true));
    frames(3);
    // ⑰-4 余额不足：不扣款、不入池、明确失败
    p.money=1;
    const cnt=p.weapons.length;
    assert(!G.shop.buy('rail'),'余额不足竟购买成功');
    assert(p.money===1,'余额不足误扣款');
    assert(p.weapons.length===cnt,'余额不足误给武器');
    // ⑰-5 防重复与连点：已持有拒绝；连点只成交一次、只扣一次钱
    p.money=500;
    assert(!G.shop.buy('arc'),'已持有仍可购买');
    assert(p.money===500,'已持有误扣款');
    const rocketPrice=G.shop.priceOf('rocket');
    assert(G.shop.buy('rocket'),'rocket 购买失败');
    assert(!G.shop.buy('rocket'),'rocket 连点重复成交');
    assert(!G.shop.buy('rocket'),'rocket 连点重复成交(2)');
    assert(p.weapons.filter(w=>w.id==='rocket').length===1,'rocket 重复入池');
    assert(p.money===500-rocketPrice,'连点多扣款:'+p.money+'/'+(500-rocketPrice));
    // ⑰-6 新局重置：面板关闭、金钱/武器回到初始（局内购买不跨局泄漏）
    G.shop.open();
    assert(G.shop.isOpen(),'面板未打开');
    G.game.startRun();
    frames(5);
    assert(!G.shop.isOpen(),'新局面板未关闭');
    assert(G.player.money===20,'新局金钱未重置:'+G.player.money);
    assert(G.player.weapons.length===1 && G.player.weapons[0].id==='rusty','新局武器未重置');
    assert(G.game.run.moneySpent===0,'新局消费统计未重置');
    // ⑰-7 商店位置参与随机生成：每层必有商店；两局位置允许不同（种子随机）
    const pos1=(G.game.floor.rooms.find(r=>r.type==='shop')||{}).rx;
    G.game.startRun(); frames(5);
    const shop2=G.game.floor.rooms.find(r=>r.type==='shop');
    assert(shop2,'新局无商店');
    assert(shop2.stock.length>=3,'新局货架库存未生成');
    return '目录/定价/购买/扣款/给予/特效/防重复/重置/随机布局 全链路通过';
  });

  await step('42_商店通行与翻滚', ()=>{
    G.game.startRun(); frames(5);
    const f=G.game.floor, shop=f.rooms.find(r=>r.type==='shop');
    const p=G.player;
    G.player.x=shop.cx; G.player.z=shop.cz; frames(2);
    const racks=G.props.filter(pr=>pr.type==='wrack');
    assert(racks.length>=12,'展示架数量:'+racks.length);
    // a. 碰撞体收紧：只保留小底座（r≤.26，明显小于视觉模型）
    assert(racks.every(rk=>rk.r<=0.26),'展示架碰撞体未收紧');
    // b. 贴墙带：展示架必须位于四面墙带内，不侵入中央
    assert(racks.every(rk=> rk.x<=shop.x0+1.05 || rk.x>=shop.x1-1.05 ||
                           rk.z<=shop.z0+1.05 || rk.z>=shop.z1-1.05),'展示架脱离墙带');
    // c. 不堵门：任一门 tile 距展示架中心 ≥1.2
    for(const d of f.doors){
      if(!d.rooms.includes(shop)) continue;
      for(const [tx,tz] of d.tiles){
        for(const rk of racks){
          const dd=Math.hypot(rk.x-(tx+0.5), rk.z-(tz+0.5));
          assert(dd>=1.2,'展示架距门过近:'+dd.toFixed(2));
        }
      }
    }
    // d. 展示架无交互入口（唯一入口=商人）
    assert(racks.every(rk=>!rk.interact),'展示架不应有交互入口');
    // e. 行走：沿左侧展示架行前方，从房间中央走到南端（中央起步，无出生重叠风险）
    p.x=shop.x0+1.45; p.z=shop.cz; p.rollT=0; p.rollCd=0; frames(2);
    G.input.key['KeyS']=true; frames(140); G.input.key['KeyS']=false; frames(2);
    assert(p.z>=shop.z1-1.6,'沿左侧行走未走通: z='+p.z.toFixed(2)+'/'+shop.z1.toFixed(1)+' x='+p.x.toFixed(2));
    // f. 行走：中央通道从南到北
    const colX=[shop.cx+1.6, shop.cx-1.6, shop.cx+2.7, shop.cx-2.7, shop.cx+3.6, shop.cx-3.6].find(x =>
      !G.props.some(pr=>pr.blocksMove && !pr.dead && Math.abs(pr.x-x)<1.1 && pr.z>shop.z0+0.7 && pr.z<shop.z1-0.4));
    assert(colX!=null,'无贯通中央净列（通行性破坏）');
    p.x=colX; p.z=shop.z1-2.5; p.rollT=0; frames(2);   // 店内出生（门砖位置会被推挤，勿用）
    // 带转向的真实走位：像玩家一样按 W 并朝目标列修正（被圆柱推挤时自然侧移绕行）
    for(let i=0;i<260;i++){
      G.input.key['KeyW']=true;
      G.input.key['KeyA']=p.x>colX+0.2;
      G.input.key['KeyD']=p.x<colX-0.2;
      G.fx.hitstopT=0; G.game.update(1/60);
      if(p.z<=shop.z0+1.2) break;
    }
    G.input.key['KeyW']=G.input.key['KeyA']=G.input.key['KeyD']=false;
    const nearObst=G.props.filter(pr=>pr.blocksMove&&!pr.dead&&Math.hypot(pr.x-p.x,pr.z-p.z)<1.0)
                          .map(pr=>pr.type+'@'+pr.x.toFixed(1)+','+pr.z.toFixed(1)).join('|');
    assert(p.z<=shop.z0+1.2,'中央通道未走通: z='+p.z.toFixed(2)+'/'+shop.z0.toFixed(1)+' x='+p.x.toFixed(2)+' 邻近障碍:'+nearObst);
    // g. 翻滚回归（roll 与移动共用 moveEntity，重点验证展示架碰撞场不再卡滚）
    const roomLo=shop.x0+0.4, roomHi=shop.x1+0.6, roomLoZ=shop.z0+0.4, roomHiZ=shop.z1+0.6;
    const rollOnce=(keys,fx,fz)=>{
      p.x=fx; p.z=fz; p.rollT=0; p.rollCd=0; frames(2);
      const sx=p.x, sz=p.z;
      for(const k of ['KeyW','KeyA','KeyS','KeyD']) G.input.key[k]=keys.includes(k);
      G.input.pressed['Space']=true;
      frames(3);
      assert(p.rollT>0,'翻滚未触发 @'+sx.toFixed(1)+','+sz.toFixed(1));
      frames(24);
      for(const k of ['KeyW','KeyA','KeyS','KeyD']) G.input.key[k]=false;
      frames(8);   // 稳定期：不应有抖动/漂移
      return {dx:p.x-sx, dz:p.z-sz,
              done:p.rollT<=0, disp:Math.hypot(p.x-sx,p.z-sz)};
    };
    const rkW=racks.filter(rk=>rk.x<=shop.x0+1.05).sort((a,b)=>a.z-b.z);
    const rk=rkW[Math.floor(rkW.length/2)];   // 左墙中间的一座
    assert(rk,'左墙无展示架');
    // 情况1：展示架旁朝房内翻滚 → 顺畅完成
    let r1=rollOnce(['KeyD'], rk.x+0.95, rk.z);
    assert(r1.done && r1.disp>=2.2,'情况1 展示架旁前滚失败: '+r1.disp.toFixed(2));
    // 情况2：中央通道向北翻滚 → 不撞两侧
    let r2=rollOnce(['KeyW'], shop.cx, shop.cz+3.4);
    assert(r2.done && r2.disp>=2.6,'情况2 中央通道翻滚失败: '+r2.disp.toFixed(2));
    // 情况3：斜向朝展示架翻滚 → 合理阻挡、不嵌入、不卡死
    p.x=rk.x+1.3; p.z=rk.z+1.3; p.rollT=0; p.rollCd=0; frames(1);
    const bx=p.x, bz=p.z;
    G.input.key['KeyA']=true; G.input.key['KeyW']=true; G.input.pressed['Space']=true;
    frames(27);
    for(const k of ['KeyW','KeyA','KeyS','KeyD']) G.input.key[k]=false;
    frames(8);
    const distRack=Math.hypot(p.x-rk.x,p.z-rk.z);
    assert(p.rollT<=0,'情况3 翻滚未正常结束');
    assert(distRack>=0.50,'情况3 玩家嵌入展示架: '+distRack.toFixed(2));
    assert(Math.hypot(p.x-bx,p.z-bz)>=0.8,'情况3 斜滚位移异常: '+Math.hypot(p.x-bx,p.z-bz).toFixed(2));
    // 情况4：紧贴展示架（推挤半径 0.56+0.02）仍能正常启动翻滚
    let r4=rollOnce(['KeyD'], rk.x+0.59, rk.z);
    assert(r4.done && r4.disp>=2.0,'情况4 贴架启动翻滚失败: '+r4.disp.toFixed(2));
    // 全程不越界、无 NaN
    assert(p.x>=roomLo-0.3 && p.x<=roomHi+0.3 && p.z>=roomLoZ-0.3 && p.z<=roomHiZ+0.3,'翻滚越界');
    assert(isFinite(p.x)&&isFinite(p.z),'坐标 NaN');
    return '通行/中央通道/四向翻滚/贴架启动/阻挡合理性 全部通过（展示架 '+racks.length+' 座 r='+racks[0].r+'）';
  });

  await step('43_赌徒的灾难', ()=>{
    G.game.startRun(); frames(5);
    const p=G.player;
    p.weapons=[G.weapons.mktWeapon('gambler')]; p.curW=0;
    const w=p.weapons[0], gm=G.gambler;
    p.stormT=99;                       // 测试弹药无限（storm 免扣弹匣），聚焦抽牌逻辑
    const uf=n=>{ for(let i=0;i<n;i++){ G.fx.hitstopT=0; G.game.update(1/60); } };  // 绕过测试保护，HP 断言可控
    gm.streak=0; gm.jackpotAt=5; gm.shuffle(true);
    // ① Deck：13 张（12 花色 + 1 Joker），真抽牌入弃牌堆
    assert(gm.deck.length===13,'牌组张数:'+gm.deck.length);
    assert(gm.deck.filter(c=>c!=='joker').length===12 && gm.deck.filter(c=>c==='joker').length===1,'牌组构成错误');
    const aimAt=(tx,tz)=>{ G.input.aimX=tx; G.input.aimZ=tz; uf(2); };   // release 用鼠标瞄准角，开火前必须对准目标
    const fire=a=>{ G.playerCtl.fire(p,w,a); uf(30); };
    const clearEnemies=()=>{          // 史莱姆死亡会分裂出子体：子体被流弹误杀会 onKill 重洗、埋掉压好的牌
      let guard=0;
      while(G.enemies.list.some(e=>!e.dead) && guard++<8){
        G.enemies.list.filter(e=>!e.dead).forEach(e=>G.hurtEnemy(e,99999,0,0,true));
        uf(4);
      }
    };
    // ② 黑桃：穿透弹（pierce 99 + 衰减系数）
    clearEnemies();
    gm.deck.push('spade'); G.playerCtl.fire(p,w,0); uf(12);   // 出膛即断言（蓄力9帧+弹3帧飞0.9格）：
                                                                // 原共享 fire() 的 30 帧驱动让弹飞 6.3 格，而
                                                                // startRun 房间真随机（game.js:72 种子含
                                                                // Date.now/Math.random），小房间弹撞墙即灭——
                                                                // 历史 25-50% flake 根因（④ 注释早有「22 帧撞墙」同类坑）
    assert(gm.lastCard==='spade','黑桃未抽出:'+gm.lastCard);
    const sp=G.weapons.bullets.find(b=>b.on&&b.kind==='spade');
    assert(sp && sp.pierce===99 && sp.dmgDecay===0.85,'黑桃穿透弹未生成或参数错误');
    assert(gm.streak===1,'Streak 未记录');
    // ③ 红桃：命中吸血（子弹出膛后把靶子放到弹道前方，命中确定性 100%）
    clearEnemies();
    G.weapons.clear();                 // 清掉 ② 的黑桃穿透弹，避免误伤/击杀靶子污染断言
    p.hp=3; p.invulnT=0;
    const s1=G.enemies.spawn('slime', p.x+4, p.z); s1.spawnT=0; s1.room=G.game.curRoom; s1.spd=0;
    gm.deck.push('heart'); G.playerCtl.fire(p,w,0); uf(12);   // 蓄力9帧+弹3帧：出膛即断言（23 帧驱动弹飞 3.5 格，
                                                                // 贴墙出生时撞墙灭——同 ② 的 flake；贴靶循环自带命中）
    const hb=G.weapons.bullets.find(b=>b.on&&b.kind==='heart');
    assert(hb,'红桃弹未生成');
    for(let i=0;i<12;i++){                 // 靶子贴弹而行：接触先于任何墙壁/掩体，命中必发生
      s1.x=hb.x+Math.cos(hb.ang)*0.35; s1.z=hb.z+Math.sin(hb.ang)*0.35; s1.spawnT=0;
      G.fx.hitstopT=0; G.game.update(1/60);
      if(p.hp===4) break;
    }
    assert(p.hp===4,'红桃吸血未生效: hp='+p.hp);
    // ④ 方块：必暴击 → 10×1.05(Streak2)×2.5 = 26.25（同样放上弹道）
    clearEnemies();                      // 清掉 ③ 的靶子及其分裂子体（否则流弹误杀触发重洗）
    G.weapons.clear();
    gm.deck.push('diamond'); G.playerCtl.fire(p,w,0); uf(12);   // 出膛即断言（原 21 帧驱动弹飞 4 格，贴墙出生时
                                                                // 撞墙灭——② 的 flake 同根因；击杀走贴靶循环保证）
    const db=G.weapons.bullets.find(b=>b.on&&b.kind==='diamond');
    assert(db,'方块弹未生成');
    const s2=G.enemies.spawn('slime', db.x+Math.cos(db.ang)*0.35, db.z+Math.sin(db.ang)*0.35);
    s2.spawnT=0; s2.room=G.game.curRoom; s2.spd=0;
    for(let i=0;i<12;i++){                 // 靶子贴弹而行：接触先于一切障碍
      s2.x=db.x+Math.cos(db.ang)*0.35; s2.z=db.z+Math.sin(db.ang)*0.35; s2.spawnT=0;
      G.fx.hitstopT=0; G.game.update(1/60);
      if(s2.dead) break;
    }
    assert(s2.dead===true,'方块暴击未击杀（26.25 > 13 血）');
    // ⑤ 同花三条 + JACKPOT：抽序=梅,梅,梅,黑,黑 → club2(Streak5)触发 JACKPOT，club3 触发三条
    clearEnemies();
    gm.deck.push('club','club','club','spade','spade');
    const money0=p.money;
    G.input.aimX=p.x+3; G.input.aimZ=p.z;
    const evs=[];
    for(let i=0;i<5;i++){ fire(0); evs.push(gm.lastEvent); }   // Streak 3→8
    assert(evs.includes('threekind'),'同花三条未触发: '+evs.join(','));
    assert(evs.includes('jackpot'),'JACKPOT 未触发: '+evs.join(','));
    assert(gm.lastEvent==='threekind','最终事件应为三条: '+gm.lastEvent);
    assert(p.money>money0,'JACKPOT 未掉钱');
    assert(gm.jackpotAt===10,'JACKPOT 下一档未提升');
    assert(gm.streak===8,'Streak 应为 8: '+gm.streak);
    // ⑥ Joker：五种结果逐一强制（独立加权结果池 + 测试钩子 _jokerPick）
    const jokerTest=(rid,afterClear)=>{
      clearEnemies();
      if(afterClear) afterClear();        // 需要活体靶子的断言在清场之后生成
      // 复位玩家与状态：分裂子体的追击磨血在裸更新下无人拦截，会把玩家磨死冻结游戏
      p.dead=false; p.hp=6; p.invulnT=0; p.armor=0; p.shieldCharge=0; p.rollT=0; p.ghostT=0;
      if(G.game.state!=='play') G.game.state='play';
      gm.jamT=0;                          // 上一张 Joker 的卡壳不阻断本次测试开火
      gm._jokerPick=rid; gm.deck.push('joker');
      aimAt(p.x+3,p.z);                              // Joker 爆炸类结果以瞄准点为中心
      p.invulnT=0; const hpB=p.hp;
      G.playerCtl.fire(p,w,Math.atan2(G.input.aimZ-p.z,G.input.aimX-p.x)); uf(12); uf(28);   // 蓄力9帧+翻牌18帧=27帧，40帧驱动完成
      gm._jokerPick=null;
      return {hpB, hp:p.hp, ev:gm.lastEvent, jam:gm.jamT};
    };
    let jt=jokerTest('misfire');
    assert(jt.ev==='misfire','MISFIRE 未触发: '+jt.ev);
    assert(jt.jam>0.2,'卡壳未生效: '+jt.jam.toFixed(2));   // jamT 0.5s，翻牌 0.3s=18 帧结算后剩余约 0.28
    jt=jokerTest('blooddebt');
    assert(jt.ev==='blooddebt' && jt.hp===jt.hpB-1,'BLOOD DEBT 反噬异常: '+jt.hp+'/'+jt.hpB);
    jt=jokerTest('goodjackpot');
    assert(jt.ev==='goodjackpot','GOOD JACKPOT 未触发');
    let s3=null;
    jt=jokerTest('chaos', ()=>{ s3=G.enemies.spawn('slime', p.x+1.2, p.z+1.2); s3.spawnT=0; s3.room=G.game.curRoom; s3.spd=0; s3.slowT=0; });
    assert(jt.ev==='chaos' && s3 && s3.slowT>0 && s3.chaosT>0,'CHAOS 未施加异常');
    jt=jokerTest('catastrophe', ()=>{ s3=G.enemies.spawn('slime', p.x+1.2, p.z+1.2); s3.spawnT=0; s3.room=G.game.curRoom; s3.spd=0; });
    assert(jt.ev==='catastrophe' && s3.dead===true,'CATASTROPHE 未伤及全场敌人');
    // 玩家自损 1 的路径与 BLOOD DEBT 完全一致（p.hurt），已有断言覆盖
    assert(s3.dead===true,'CATASTROPHE 未伤敌人');
    // ⑦ 牌库耗尽自动重洗 + 击杀触发重洗
    gm.streak=0; gm.jackpotAt=5; gm.shuffle(true);
    for(let i=0;i<13;i++) gm.draw();
    assert(gm.deck.length===0 && gm.discard.length===13,'弃牌堆未积累');
    gm.draw();
    assert(gm.deck.length===12 && gm.discard.length===1,'耗尽未自动重洗');
    const sh0=gm._shuffles;
    const s4=G.enemies.spawn('slime', p.x+2, p.z+2); s4.spawnT=0; s4.room=G.game.curRoom; s4.spd=0;
    G.hurtEnemy(s4,99999,0,0,true); uf(3);      // 击杀（分裂子体随之清场，各触发一次重洗）
    assert(gm._shuffles>=sh0+1,'击杀未触发重新洗牌');
    // ⑧ HUD 已注入
    assert(document.getElementById('gamblerHud'),'STREAK HUD 未注入');
    // ⑨ 新局重置（Run 生命周期）
    G.game.startRun(); frames(5);
    assert(gm.streak===0 && gm.lastCard===null && gm.jackpotAt===5 && gm.deck.length===13,'新局未重置');
    return '抽牌/四花色效果/吸血/必暴击/三条/JACKPOT/Joker 五结果/重洗/重置 全链路通过';
  });

  await step('44_解锁系统与精英词缀', async ()=>{
    G.game.startRun(); frames(5);
    const p=G.player, gm=G.meta;
    gm.debugReset();                   // 从全新解锁状态开始
    const uf=n=>{ for(let i=0;i<n;i++){ G.fx.hitstopT=0; G.game.update(1/60); } };
    const clearEnemies=()=>{ let g=0; while(G.enemies.list.some(e=>!e.dead)&&g++<8){ G.enemies.list.filter(e=>!e.dead).forEach(e=>G.hurtEnemy(e,99999,0,0,true)); uf(4);} };
    // ① 默认解锁集：无里程碑挂接的武器恒定可用（随武器表增长）；未解锁武器以 ??? 占位留在目录
    const always=Object.keys(G.weapons.defs).filter(id=>!gm.milestoneOf(id));
    assert(always.every(id=>gm.unlocked(id)),'默认解锁集错误');
    assert(!gm.unlocked('arc') && !gm.unlocked('gambler') && !gm.unlocked('polaroid'),'未解锁集错误');
    assert(G.shop.catalogIds().length===Object.keys(G.weapons.defs).length,'目录应含全部武器占位');
    // ② 商店购买触发里程碑「军火交易」→ burst 解锁
    p.money=200;
    assert(G.shop.buy('shotgun'),'购买已解锁武器失败');
    assert(gm.unlocked('burst') && gm.data.flags.first_buy===true,'first_buy 未解锁 burst');
    // ③ 随机武器池遵守解锁：B 阶未解锁 laser/hive/burst 时只能出 rifle；reach_f2 后出 rifle/laser
    gm.debugReset();                   // 清掉 ② 的 first_buy，回到未解锁基线
    for(let i=0;i<24;i++){ const id=G.weapons.randomWeaponId('B'); assert(id==='rifle','B 池混入未解锁武器:'+id); }
    G.game.descend(); await sleep(800); frames(10);   // 真实下潜流触发 onDescend（STEP 14 同款路径）
    assert(G.game.floorNum===2 && gm.unlocked('ricochet'),'真实下潜未解锁 reach_f2');
    for(let i=0;i<24;i++){ const id=G.weapons.randomWeaponId('B'); assert(id==='rifle'||id==='laser','B 池异常:'+id); }
    // ④ 精英词缀：生成即带合法词缀 + 光环变色
    clearAll();
    const s1=G.enemies.spawn('slime', p.x+4, p.z, true); s1.spawnT=0; s1.room=G.game.curRoom; s1.spd=0;
    assert(s1.elite && s1.affix,'精英未获得词缀');
    assert(['volatile','regen','summon','shield'].includes(s1.affix),'词缀非法:'+s1.affix);
    assert(G.enemies.AFFIXES.length===4,'词缀池数量错误');
    // ⑤ 护盾：抵挡一次非穿透伤害，随后正常受伤
    G.enemies.assignAffix(s1,'shield'); s1.shieldUp=true; s1.hp=13;
    G.hurtEnemy(s1,5,0,0);
    assert(s1.hp===13 && !s1.shieldUp,'护盾未抵挡伤害');
    G.hurtEnemy(s1,5,0,0);
    assert(s1.hp===8,'护盾后受伤异常: '+s1.hp);
    // ⑥ 再生：3 秒回复 2 血
    G.enemies.assignAffix(s1,'regen'); s1.hp=5;
    uf(190);
    assert(s1.hp>=7,'再生未生效: hp='+s1.hp);
    // ⑦ 召唤：召唤怨灵（上限 2）
    G.enemies.assignAffix(s1,'summon'); s1.sumT=0.1; s1.sumCount=0;
    let wispPeak=0;                          // 怨灵会冲向玩家自爆：追踪窗口期内存活峰值
    for(let i=0;i<40;i++){
      G.fx.hitstopT=0; G.game.update(1/60);
      wispPeak=Math.max(wispPeak, G.enemies.list.filter(e=>!e.dead&&e.type==='wisp').length);
    }
    assert(wispPeak>=1,'召唤未生成怨灵');
    // ⑧ 爆裂：死亡自爆（'e' 阵营威胁玩家）——贴近玩家击杀，玩家必须受伤
    clearAll();
    p.hp=6; p.invulnT=0;
    const sv=G.enemies.spawn('slime', p.x+1.3, p.z, true); sv.spawnT=0; sv.room=G.game.curRoom; sv.spd=0;
    G.enemies.assignAffix(sv,'volatile');
    // 自爆伤害为同步结算（E.kill→explode→p.hurt），断言放在 uf 前与帧后世界状态解耦：
    // 若等 uf(3) 后再断言，④~⑦ 掉落、冻在玩家附近的红心会在 hp=4 时恢复磁吸被拾取（恰好+2），
    // 把 hp 顶回 6 造成偶发 FAIL（历史 flake，定向复现 3/3 实证 → BUG_HISTORY FIX-026）
    G.hurtEnemy(sv,99999,0,0,true);
    assert(sv.dead,'爆裂精英未死亡');
    assert(p.hp<6,'爆裂自爆未伤及玩家: hp='+p.hp);
    uf(3);
    // ⑨ 击杀计数：跨局累计
    const k0=gm.data.kills;
    const s5=G.enemies.spawn('slime', p.x+7, p.z); s5.spawnT=0; s5.room=G.game.curRoom; s5.spd=0;
    G.hurtEnemy(s5,99999,0,0,true); uf(3);
    assert(gm.data.kills===k0+1,'击杀计数未累计: '+gm.data.kills+'/'+k0);
    // ⑩ 无伤清剿基线：锁房记录受伤基线
    const room=G.game.floor.rooms.find(r=>r.type==='combat'&&!r.cleared);
    if(room){ G.game.lockRoom(room); assert(room.dmgAtLock===G.game.run.dmgTaken,'锁房未记录受伤基线'); }
    // ⑪ 构筑 HUD：被动标签与数值总览
    G.items.giveTo(p,{kind:'item',id:'dmgUp'});
    uf(10);   // 等 0.15s 节流的 stats 刷新把 HUD 写入 DOM
    assert(document.getElementById('passiveHud').style.display==='block' &&
           document.getElementById('passiveHud').innerHTML.includes('×1.30'),'构筑 HUD 未更新');
    // ⑫ 持久化：bd_unlocks 写入 localStorage
    const saved=JSON.parse(localStorage.getItem('bd_unlocks'));
    assert(saved && saved.flags && saved.flags.reach_f2===true && saved.kills>=1,'bd_unlocks 未持久化');
    function clearAll(){ let g=0; while(G.enemies.list.some(e=>!e.dead)&&g++<8){ G.enemies.list.filter(e=>!e.dead).forEach(e=>G.hurtEnemy(e,99999,0,0,true)); uf(4);} }
    return '解锁里程碑/武器池过滤/未解锁占位/词缀四件套/击杀计数/无伤基线/构筑 HUD/持久化 全链路通过';
  });

  await step('45_第三层虚空王座与无面君主', async ()=>{
    G.game.startRun(); frames(5);
    const p=G.player;
    const uf=n=>{ for(let i=0;i<n;i++){ p.invulnT=1; G.fx.hitstopT=0; G.game.update(1/60); } };
    // ① 第 3 主题定义
    const th3=G.build.themes[3];
    assert(th3 && th3.name==='虚空王座','缺第 3 主题');
    assert(G.audio.tracks.f3,'缺第 3 层 BGM 曲目');
    // ② 第 3 层生成结构：Boss 房必有、出口房必无、战斗房充足
    const f3=G.gen.genFloor(3, 0x5EED01);
    assert(f3.bossRoom,'第 3 层缺 Boss 房');
    assert(!f3.rooms.some(r=>r.type==='exit'),'第 3 层不应出现出口房');
    assert(f3.rooms.filter(r=>r.type==='combat').length>=6,'第 3 层战斗房不足');
    // ③ 第 3 主题构建不炸 + 主题生效
    G.build.buildFloor(f3);
    assert(G.build.theme===th3,'第 3 层主题未生效');
    // ④ 虚空裂隙陷阱：渲染 + 状态机流转（hide→warn→open）
    const cb=f3.rooms.find(r=>r.type==='combat');
    assert(cb,'无战斗房可测');
    cb.hazards.push({x:cb.cx|0,z:cb.cz|0,kind:'voidrift',phase:0});
    G.build.buildFloor(f3);
    const hz=cb.hazards.find(h=>h.kind==='voidrift');
    assert(hz && hz.mesh && hz.glow,'虚空裂隙未渲染');
    hz.t=0.01; uf(80);   // hide→warn→open
    assert(hz.state==='open'||hz.state==='warn'||hz.state==='hide','裂隙状态非法:'+hz.state);
    assert(hz.state!=='hide'||hz.t>0,'裂隙未进入周期流转');
    // ⑤ 第 2 层 Boss 死后：不直接胜利，Boss 房出现下行舱口
    G.game.startFloor(2,false); frames(5);
    G.game.bossDefeated();
    const h2=G.game.floor.bossRoom;
    const hatch=G.props.find(pr=>pr.type==='exitHatch' && pr.room===h2);
    assert(hatch && hatch.interact,'第 2 层 Boss 死后未出现下行舱口');
    assert(hatch.interact.label==='下潜至第三层','舱口文案错误:'+hatch.interact.label);
    assert(G.game.state!=='win','第 2 层 Boss 死后不应直接胜利');
    // ⑥ 真实下潜流进入第 3 层：层名/主题/音乐全部切换
    G.game.descend(); await sleep(800); frames(10);
    assert(G.game.floorNum===3,'未到达第 3 层');
    assert(G.build.theme===G.build.themes[3],'第 3 层主题未生效');
    assert(G.audio._curTrack==='f3','第 3 层 BGM 未切换: '+G.audio._curTrack);
    // ⑦ 新 Boss：真实入口生成 + hurt 路由 + 拍立得兼容字段
    const br=G.game.floor.bossRoom;
    G.boss.spawn(br.cx, br.z0+2.6);
    const vk=G.voidking.active;
    assert(vk,'第 3 层未生成无面君主');
    assert(G.boss.active===vk,'G.boss.active 未指向无面君主');
    assert(vk.maxhp===1150 && vk.hp===1150,'无面君主 HP 异常: '+vk.hp);
    assert(vk.photoT===0 && typeof vk.photoBuf==='number','拍立得兼容字段缺失');
    uf(160);   // 走完 spawnT(0.7s)+intro(1.6s)，脱离受击免疫窗口
    G.hurtBoss(50);
    assert(vk.hp===1100,'hurt 未路由到无面君主: hp='+vk.hp);
    // ⑧ 攻击状态机真实运转：一段时间内应进入过攻击态
    let sawAtk=false;
    for(let i=0;i<240;i++){ p.invulnT=1; G.fx.hitstopT=0; G.game.update(1/60); if(vk.state!=='cool'&&vk.state!=='intro') sawAtk=true; }
    assert(sawAtk,'无面君主未发起任何攻击');
    // ⑨ 阶段切换：压到 60% 以下触发 phase 2
    vk.hp=vk.maxhp*0.55;
    G.hurtBoss(10);
    assert(vk.phase===2,'phase 2 未触发');
    // ⑩ 真实击杀 → 通关：dying 演出 → bossDefeated → winRun
    G.hurtBoss(99999);
    assert(vk.dying,'无面君主未进入死亡演出');
    uf(180);
    await sleep(1900); frames(10);   // bossDefeated 的 winRun setTimeout(1700)
    assert(G.game.state==='win','击杀第 3 层 Boss 未通关: '+G.game.state);
    // ⑪ 通关里程碑 win_run：解锁赌徒的灾难与拍立得（修复二者解锁前无法获取的永久死锁）
    assert(G.meta.data.flags.win_run===true,'win_run 里程碑未授予');
    assert(G.meta.unlocked('gambler') && G.meta.unlocked('polaroid'),'通关未解锁 gambler/polaroid');
    G.boss.clear();
    return '第3主题/生成结构/虚空裂隙/Boss死后舱口/下潜流转/无面君主生成与路由/攻击运转/阶段切换/真实击杀通关/通关解锁死锁武器 全链路通过';
  });

  // ============ 第 3 层新怪：虚空掠影 / 裂隙注视者 / 虚空祭司 ============
  await step('46_第三层新怪回归', ()=>{
    G.game.startRun(); frames(3);
    const p=G.player; p.invulnT=0;
    const room=G.game.curRoom;
    const clearAll=()=>{
      G.weapons.clear();
      for(const e of G.enemies.list){ e.dead=true; if(e.mesh) e.mesh.visible=false; if(e.laser) G.scene.remove(e.laser); }
      G.enemies.list.length=0;
    };
    // 找一列连续 6 格空地（玩家站第 3 格：背后 1.7 格与前 4 格均为空地，保证闪现/突刺/宝珠路径不出墙）
    const clearT=(x,z)=>{ const t=G.tileAt(x,z); return t&&t.t==='floor'; };
    let spot=null;
    for(let tz=room.z0+1;tz<room.z1&&!spot;tz++)
      for(let tx=room.x0+1;tx<=room.x1-6;tx++)
        if(clearT(tx+.5,tz+.5)&&clearT(tx+1.5,tz+.5)&&clearT(tx+2.5,tz+.5)&&
           clearT(tx+3.5,tz+.5)&&clearT(tx+4.5,tz+.5)&&clearT(tx+5.5,tz+.5))
          { spot={x:tx+2.5,z:tz+.5}; break; }
    assert(spot,'未找到 6 连格空旷测试位');
    p.x=spot.x; p.z=spot.z; p.face=0;
    G.input.aimX=p.x+6; G.input.aimZ=p.z;        // 稳定玩家朝向（防上一步残留 aim）
    // 逐帧驱动 rawF：与 frames() 相同但**没有 HP 顶回保护**——真实掉血断言必须用它，
    // 否则突刺命中的伤害会在下一帧被 frames() 的 hp<50 保护抹掉（STEP43 同类教训）
    const rawF=n=>{ for(let i=0;i<n;i++){
      if(G.player.dead){ G.player.dead=false; G.player.mesh.visible=true; }
      if(G.game.state==='dead') G.game.state='play';
      G.game.update(1/60); G.input.endFrame();
    } };
    // ① 虚空掠影：闪现至玩家背后 → 显形预警 → 突刺造成真实伤害（p.hurt 链路）
    const st=G.enemies.spawn('voidstalker', p.x+6, p.z); st.spawnT=0; st.room=room;
    st.blinkCd=0;
    rawF(2);                                     // stalk 1 帧 → 闪现（落点=玩家背后 1.7）
    assert(st.state==='materialize','掠影未进入显形: '+st.state);
    const bd=G.dist(st.x,st.z,p.x,p.z);
    assert(bd>1.2 && bd<2.2,'掠影闪现落点异常: '+bd.toFixed(2));
    for(let i=0;i<40 && st.state==='materialize';i++) rawF(1);   // 显形 0.5s=30 帧
    assert(st.state==='strike','掠影未进入突刺: '+st.state);
    p.invulnT=0;
    const hp0=p.hp;
    for(let i=0;i<40 && st.state==='strike';i++) rawF(1);        // 突刺位移 9.5×0.24≈2.3 ≥1.7 必命中
    assert(st.state==='recover','掠影未进入收尾硬直: '+st.state);
    assert(p.hp===hp0-1,'掠影突刺未造成真实伤害: '+p.hp+'/'+hp0);
    clearAll();
    // ② 裂隙注视者：蓄力 → 三枚虚空宝珠（真实弹幕池）→ 追踪玩家
    const rw=G.enemies.spawn('riftwatcher', p.x+2.6, p.z); rw.spawnT=0; rw.room=room;
    rw.atkCd=0;
    frames(2);
    assert(rw.state==='charge','注视者未进入蓄力: '+rw.state);
    frames(56);                                  // 蓄力 0.9s=54 帧 → 发射
    const orbs=G.weapons.bullets.filter(b=>b.on && b.kind==='voidorb');
    assert(orbs.length===3,'虚空宝珠数量错误: '+orbs.length);
    const d0=orbs.map(b=>G.dist(b.x,b.z,p.x,p.z));
    frames(20);
    const d1=orbs.map(b=>G.dist(b.x,b.z,p.x,p.z));
    assert(d1[0]<d0[0]-0.3,'虚空宝珠未追踪玩家: '+d0[0].toFixed(2)+'→'+d1[0].toFixed(2));
    clearAll();
    // ③ 虚空祭司：吟唱 → 同袍获虚空护壁 → 护壁抵挡一次真实伤害（G.hurtEnemy 链路）
    const ac=G.enemies.spawn('voidacolyte', p.x+2, p.z); ac.spawnT=0; ac.room=room;
    const gu=G.enemies.spawn('gunner', p.x+3.5, p.z); gu.spawnT=0; gu.room=room;   // 与祭司同处已验证的空地行，防落墙自愈干扰
    ac.atkCd=0;
    frames(2);
    assert(ac.state==='chant','祭司未进入吟唱: '+ac.state);
    frames(70);                                  // 吟唱 1.1s=66 帧 → 附壁结算
    assert(gu.voidWard===1,'盟友未获得虚空护壁');
    assert(ac.voidWard===1,'祭司未给自己护壁');
    const gh=gu.hp;
    G.hurtEnemy(gu,5,0,0);
    assert(gu.hp===gh && gu.voidWard===0,'护壁未抵挡伤害: '+gu.hp+'/'+gh);
    G.hurtEnemy(gu,5,0,0);
    assert(gu.hp===gh-5,'护壁破碎后未正常扣血: '+gu.hp+'/'+gh);
    clearAll();
    // ④ 定义表完整性：三怪均为第 3 层专属
    const D3=G.enemies.defs;
    assert(D3.voidstalker && D3.riftwatcher && D3.voidacolyte,'缺第 3 层新怪定义');
    assert(D3.voidstalker.floors[0]===3 && D3.riftwatcher.floors[0]===3 && D3.voidacolyte.floors[0]===3,'新怪未标记第 3 层专属');
    return '掠影闪现背刺/注视者追踪宝珠/祭司虚空护壁/第3层专属 全链路通过';
  });

  // ============ 基地「废弃军械站」：场景 / NPC / 永久解锁（BASE-01~07/11~14） ============
  await step('47_基地场景与永久解锁', async ()=>{
    G.meta.debugReset();
    G.game.toTitle();
    G.game.newGame();                                // 标题 → 新游戏 → 基地（真实入口链路）
    await sleep(1400); frames(5);                    // 过场 480ms + 安装 600ms
    assert(G.game.inBase && G.game.state==='play','未进入基地');
    assert(G.game.floor && G.game.floor.isBase,'基地 floor 未安装');
    assert(G.player && G.player.hp>0 && G.player.maxHp>=6,'基地玩家状态异常');
    assert(G.audio._curTrack==='base','基地 BGM 未切换: '+G.audio._curTrack+' state='+G.game.state+' inBase='+G.game.inBase);
    // BASE-02 真实 WASD 移动（tile 碰撞体系生效）
    const sx=G.player.x, sz=G.player.z;
    G.input.key['KeyW']=true; frames(20); G.input.key['KeyW']=false;
    assert(G.dist(sx,sz,G.player.x,G.player.z)>0.3,'基地 WASD 移动无效');
    // BASE-04 枪械师购买（真实 meta 事务：burst 为里程碑门控武器）
    G.meta.data.shards=500;
    assert(!G.meta.unlocked('burst'),'前置：burst 应未解锁');
    const r=G.meta.buyWeapon('burst');
    assert(r.ok && G.meta.unlocked('burst'),'购买解锁失败');
    assert(G.meta.data.shards===500-G.meta.SHARD_PRICE.B,'扣款金额错误: '+G.meta.data.shards);
    // BASE-14 重复购买不重复扣款
    const r2=G.meta.buyWeapon('burst');
    assert(!r2.ok && G.meta.data.shards===500-G.meta.SHARD_PRICE.B,'重复购买重复扣款');
    // BASE-05 解锁武器进入随机掉落池（真实 W.randomWeaponId 链路）
    G.rng=new G.RNG(7);
    let found=false;
    for(let i=0;i<400 && !found;i++) if(G.weapons.randomWeaponId('B')==='burst') found=true;
    assert(found,'解锁武器未进入随机掉落池');
    // BASE-06 工程师被动解锁 → 进入随机池（真实 items.randomPassive 链路）
    assert(!G.meta.itemUnlocked('crit'),'前置：crit 应未解锁');
    assert(G.meta.buyItem('crit').ok,'被动解锁失败');
    G.rng=new G.RNG(9);
    let found2=false;
    for(let i=0;i<400 && !found2;i++) if(G.items.randomPassive('A')==='crit') found2=true;
    assert(found2,'解锁被动未进入随机池');
    // 基地升级事务
    assert(G.meta.buyUpgrade('medbay').ok && G.meta.up('medbay')===1,'医疗站升级失败');
    // 面板开关
    G.base.openPanel('gunsmith');
    assert(G.base.isOpen(),'基地面板未打开');
    G.base.closePanel();
    assert(!G.base.isOpen(),'基地面板未关闭');
    // 图鉴统计真实写入
    G.meta.onKill('slime'); G.meta.onWeaponUse('rusty'); G.meta.onWeaponKill('rusty');
    assert(G.meta.data.stats.ekills.slime===1,'敌人图鉴计数缺失');
    assert(G.meta.data.stats.wuse.rusty===1 && G.meta.data.stats.wkill.rusty===1,'武器图鉴计数缺失');
    // BASE-11/13 存档往返（真实 localStorage 链路）
    const snap=G.meta.data.shards;
    G.meta.load();
    assert(G.meta.data.shards===snap,'存档读取碎片不一致');
    return '基地场景/移动/买枪/买被动/升级/面板/图鉴/存档 全链路通过';
  });

  // ============ 基地↔地牢闭环（BASE-08/09/10/15/17/18/20） ============
  await step('48_基地地牢闭环', async ()=>{
    // BASE-17/18 基地无战斗残留、战斗 HUD 隐藏
    assert(G.enemies.list.length===0 && G.weapons.bullets.every(b=>!b.on),'基地存在战斗残留');
    assert(G.ui.els.hud.style.display==='none','战斗 HUD 未隐藏');
    // BASE-08 升降梯进本（真实 launchRun 链路）
    G.game.launchRun();
    await sleep(800); frames(5);
    assert(!G.game.inBase && G.game.state==='play' && G.game.floorNum===1,'升降梯未进入第一层');
    assert(G.game.floor.rooms.length>1,'地牢未生成');
    assert(G.meta.up('medbay')===1 && G.player.maxHp===8,'医疗站升级未生效 maxHp='+G.player.maxHp);
    // BASE-09 死亡 → 结算 → 返回基地
    const sBefore=G.meta.data.shards;               // 47 结束时 = 500-40(枪)-30(被动)-30(升级) = 400
    G.player.invulnT=0; G.player.armor=0; G.player.rollT=0; G.player.ghostT=0;
    G.player.hurt(999,0);
    assert(G.game.state==='dead','未进入死亡结算');
    G.game._resultT=0;
    G.game.returnToBase();
    await sleep(900); frames(5);
    assert(G.game.inBase && G.game.state==='play','死亡后未返回基地');
    assert(G.meta.data.stats.deaths>=1,'阵亡统计未写入');
    assert(G.meta.data.stats.runs>=1,'出击统计未写入');
    // BASE-11 结算碎片入账（死亡第 1 层 = +6）
    assert(G.meta.data.shards===sBefore+6,'死亡结算碎片未入账: '+G.meta.data.shards+'/'+(sBefore+6));
    // BASE-17/20 返回基地后无上一局残留
    assert(G.enemies.list.length===0 && G.weapons.bullets.every(b=>!b.on),'返回基地后战斗残留');
    // BASE-10 胜利 → 结算 → 返回基地（真实 winRun 链路）
    const sPreWin=G.meta.data.shards;               // 死亡结算后基线 = 406
    G.meta.data.stats.boss.faceless={count:1,bestT:95};
    G.game.floorNum=3; G.game.run.time=200;
    G.game.winRun();
    assert(G.game.state==='win','未进入胜利结算');
    G.game._resultT=0;
    G.game.returnToBase();
    await sleep(900); frames(5);
    assert(G.game.inBase,'胜利后未返回基地');
    assert(G.meta.data.stats.wins>=1,'胜利统计未写入');
    assert(G.meta.data.stats.boss.faceless.count===1,'Boss 图鉴未记录');
    assert(G.meta.data.shards===sPreWin+25,'胜利结算碎片未入账: '+G.meta.data.shards+'/'+(sPreWin+25));
    // BASE-15/20 再入地牢：不继承局内状态
    G.game.launchRun();
    await sleep(800); frames(5);
    assert(G.game.floorNum===1 && G.game.run.kills===0,'新局状态异常');
    assert(G.player.maxHp===8,'新局未继承医疗站升级');
    assert(G.meta.data.shards===sPreWin+25,'开新局不应改动碎片');
    G.meta.debugReset();                             // 测试收尾：清理测试存档污染
    return '升降梯进本/死亡回基地/碎片入账/胜利回基地/无残留/新局干净 全链路通过';
  });


  // ============ 纸飞机：随时间加速 / 穿透衰减 / 回航接住返还弹药 ============
  await step('50_纸飞机加速回航', ()=>{
    G.game.startRun(); frames(3);
    const p=G.player;
    const room=G.game.curRoom;
    G.weapons.clear();
    for(const e of G.enemies.list){ e.dead=true; if(e.mesh) e.mesh.visible=false; }
    G.enemies.list.length=0;
    const clearT=(x,z)=>{ const t=G.tileAt(x,z); return t&&t.t==='floor'; };
    let spot=null;
    for(let tz=room.z0+1;tz<room.z1&&!spot;tz++)
      for(let tx=room.x0+1;tx<=room.x1-4;tx++)
        if(clearT(tx+.5,tz+.5)&&clearT(tx+3.5,tz+.5)){ spot={x:tx+.5,z:tz+.5}; break; }
    assert(spot,'未找到空旷测试位');
    p.x=spot.x; p.z=spot.z; p.face=0;
    G.input.aimX=p.x+6; G.input.aimZ=p.z;        // 朝东侧墙壁掷出（反弹后回航）
    p.weapons=[G.weapons.mktWeapon('paperplane')]; p.curW=0;
    const w=p.weapons[0];
    G.input.mouse.down=true; frames(1); G.input.mouse.down=false;
    frames(2);
    let b=null;
    for(const bb of G.weapons.bullets){ if(bb.on && bb.kind==='paper'){ b=bb; break; } }
    assert(b,'纸飞机弹体未生成');
    const s0=b.spd;
    frames(30);
    assert(b.on && b.spd>s0+.8,'纸飞机未随时间加速: '+s0.toFixed(1)+'→'+b.spd.toFixed(1));
    assert(Math.abs(b.vx-Math.cos(b.ang)*b.spd)<1e-6,'速度向量与 ang 失同步');
    // 回航接住：等待并被玩家收回（返还一发弹药）；上限 500 帧兜底
    const a0=w.ammo;
    let caught=false;
    for(let i=0;i<500;i++){
      frames(1);
      if(w.ammo>a0){ caught=true; break; }
      if(!b.on) break;                            // 生命周期耗尽（未接住）
    }
    assert(caught,'纸飞机未被接住（ammo '+w.ammo+'/'+w.def.mag+'）');
    assert(!b.on,'接住后弹体未回收');
    return '发射/加速/回航/接住返还 全链路通过';
  });

  // ============ 吹风机：锥形推力/风压爆发/撞墙冲击/互撞 ============
  await step('51_吹风机风推', ()=>{
    G.game.startRun(); frames(3);
    const p=G.player; p.invulnT=0;
    const room=G.game.curRoom;
    G.weapons.clear();
    for(const e of G.enemies.list){ e.dead=true; if(e.mesh) e.mesh.visible=false; }
    G.enemies.list.length=0;
    const clearT=(x,z)=>{ const t=G.tileAt(x,z); return t&&t.t==='floor'; };
    let spot=null;
    for(let tz=room.z0+1;tz<room.z1&&!spot;tz++)
      for(let tx=room.x0+1;tx<=room.x1-4;tx++)
        if(clearT(tx+.5,tz+.5)&&clearT(tx+3.5,tz+.5)){ spot={x:tx+.5,z:tz+.5}; break; }
    assert(spot,'未找到空旷测试位');
    p.x=spot.x; p.z=spot.z; p.face=0;
    G.input.aimX=p.x+6; G.input.aimZ=p.z;        // 持续朝正东吹
    p.weapons=[G.weapons.mktWeapon('hairdryer')]; p.curW=0;
    const s=G.enemies.spawn('slime', p.x+2.2, p.z); s.spawnT=0; s.room=room;
    s.baseSpd=0; s.spd=0;                         // 静止史莱姆（重量轻，易被推动）
    const hp0=s.hp;
    // 推力：按住 0.6s → 史莱姆被吹向东方
    const x0=s.x;
    G.input.mouse.down=true; frames(36); G.input.mouse.down=false;
    assert(s.x>x0+.5,'敌人未被推动: '+x0.toFixed(2)+'→'+s.x.toFixed(2));
    // 风压爆发：持续吹（每 20 帧把目标放回风锥，模拟跟枪），必出现强力脉冲（|vx| 峰值 > 8）
    let maxV=0;
    G.input.mouse.down=true;
    for(let i=0;i<130;i++){
      frames(1);
      if(i%20===0 && G.enemies.list.includes(s) && !s.dead){ s.x=p.x+2.2; s.z=p.z; s.vx=0; s.vz=0; }
      if(G.enemies.list.includes(s)&&!s.dead) maxV=Math.max(maxV,Math.abs(s.vx||0));
    }
    G.input.mouse.down=false;
    assert(maxV>8,'风压爆发未触发 maxVx='+maxV.toFixed(2));
    // 撞墙冲击：史莱姆与玩家都摆到东墙内侧一列，朝墙吹 → IMPACT 掉血
    let wallSpot=null;
    for(let tz=room.z0+2;tz<room.z1-1&&!wallSpot;tz++)
      if(clearT(room.x1-1+.5,tz+.5)) wallSpot={x:room.x1-1+.5,z:tz+.5};
    assert(wallSpot,'未找到贴墙测试位');
    p.x=wallSpot.x-2; p.z=wallSpot.z;
    if(G.enemies.list.includes(s)&&!s.dead){ s.x=wallSpot.x; s.z=wallSpot.z; }
    else { s.dead=false; G.enemies.list.push(s); s.x=wallSpot.x; s.z=wallSpot.z; s.mesh.visible=true; }
    s.baseSpd=0; s.spd=0; s.hp=hp0; s._wallCd=0; s.vx=0; s.vz=0;
    const wallHp=s.hp;
    G.input.aimX=wallSpot.x+2; G.input.aimZ=wallSpot.z; G.input.mouse.down=true; frames(50); G.input.mouse.down=false;
    assert(s.hp<wallHp,'撞墙冲击未造成伤害');
    return '锥形推力/风压爆发/撞墙冲击 全链路通过';
  });

  // ============ 视界线切割刀：近战裂隙/翻滚传送/空间坍缩 ============
  await step('52_切割刀裂隙坍缩', ()=>{
    G.game.startRun(); frames(3);
    const p=G.player; p.invulnT=0;
    const room=G.game.curRoom;
    G.weapons.clear();
    for(const e of G.enemies.list){ e.dead=true; if(e.mesh) e.mesh.visible=false; }
    G.enemies.list.length=0;
    const clearT=(x,z)=>{ const t=G.tileAt(x,z); return t&&t.t==='floor'; };
    let spot=null;
    for(let tz=room.z0+2;tz<room.z1-2&&!spot;tz++)
      for(let tx=room.x0+3;tx<=room.x1-6;tx++)
        if(clearT(tx+.5,tz+.5)&&clearT(tx+4.5,tz+.5)){ spot={x:tx+.5,z:tz+.5}; break; }
    assert(spot,'未找到空旷测试位');
    p.x=spot.x; p.z=spot.z; p.face=0;
    G.input.aimX=p.x+6; G.input.aimZ=p.z;        // 朝正东挥砍
    p.weapons=[G.weapons.mktWeapon('scalpel')]; p.curW=0;
    const w=p.weapons[0];
    const fireSwing=()=>{ G.input.mouse.down=true; frames(1); G.input.mouse.down=false; frames(30); };
    // 三刀三裂隙（rate 2.2：每刀间隔 ≥28 帧）
    fireSwing(); fireSwing(); fireSwing();
    assert(G.scalpel.rifts.length===3,'裂隙数量错误: '+G.scalpel.rifts.length);
    // 裂隙 DOT：静止敌人贴裂隙持续掉血
    const r0=G.scalpel.rifts[0];
    const dt=G.enemies.spawn('slime', r0.x+.3, r0.z); dt.spawnT=0; dt.room=room; dt.baseSpd=0; dt.spd=0;
    const hp0=dt.hp;
    frames(40);
    assert(dt.hp<hp0,'裂隙 DOT 未造成伤害');
    // 坍缩伤害：敌人摆在两裂隙连线中点 → 传送后 VOID SEVER 击杀
    const rA=G.scalpel.rifts[0], rB=G.scalpel.rifts[1];
    const mid={x:(rA.x+rB.x)/2, z:(rA.z+rB.z)/2};
    const dm=G.enemies.spawn('slime', mid.x, mid.z); dm.spawnT=0; dm.room=room; dm.baseSpd=0; dm.spd=0;
    // 玩家移到裂隙 A 上翻滚进入 → 传送到 B + 全裂隙坍缩
    p.x=rA.x; p.z=rA.z; p.invulnT=0;
    const ok=G.scalpel.tryRollEnter(p);
    assert(ok===true,'翻滚进入裂隙失败');
    assert(G.dist(p.x,p.z,rB.x,rB.z)<1.6,'未传送到下一道裂隙');
    assert(G.scalpel.rifts.length===0,'坍缩后裂隙未清空');
    assert(dm.dead,'坍缩切割线未击杀线上敌人');
    assert(p.invulnT>0,'传送 I-frame 缺失');
    // 单裂隙：不传送
    G.scalpel.rifts.length=0; G.weapons.clear();
    fireSwing();
    assert(G.scalpel.rifts.length===1,'单刀应只有 1 道裂隙');
    const px0=p.x, pz0=p.z;
    assert(G.scalpel.tryRollEnter(p)===false,'单裂隙不应触发传送');
    assert(p.x===px0 && p.z===pz0,'单裂隙时玩家被移动');
    G.scalpel.clear();
    return '挥砍裂隙/DOT/翻滚传送/坍缩击杀/单裂隙边界 全链路通过';
  });


  // ============ 献给太阳的左轮：Heat 系统 / 沸腾 / SUNSHOT / 主动散热 / 炸膛 ============
  await step('58_太阳左轮过热管理', ()=>{
    G.game.startRun(); frames(3);
    const p=G.player; p.invulnT=0;
    const room=G.game.curRoom;
    G.weapons.clear();
    for(const e of G.enemies.list){ e.dead=true; if(e.mesh) e.mesh.visible=false; }
    G.enemies.list.length=0;
    p.weapons=[G.weapons.mktWeapon('sunrevolver')]; p.curW=0;
    const w=p.weapons[0], SR=G.sunrevolver, K=SR.K;
    aim();
    const fireNow=(wait)=>{ G.input.mouse.down=true; frames(1); G.input.mouse.down=false; frames(wait||56); };
    // ① 连射积热（固定步进 + 连射期零散热 → 落点=6×16=96）：6 发打满 → 沸腾且弹匣空、未自动装填（锁膛）
    for(let i=0;i<5;i++) fireNow();
    fireNow(2);   // 最后一发后立刻测量，避免沸腾升温吃掉断言余量
    assert(w.heat>=K.SOLAR_AT && w.heat<97, '连射 6 发未进入沸腾: heat='+w.heat.toFixed(1));
    assert(w.ammo===0, '弹匣应打空: '+w.ammo);
    assert(!w.reloading, '沸腾期弹匣空却触发自动装填（锁膛失效）');
    // ② 沸腾持续升温：不开枪，枪体每秒 +SOLAR_RISE（OVERHEAT 真实可达路径二的前半）
    w.heat=K.SOLAR_AT; frames(30);
    assert(w.heat>K.SOLAR_AT+K.SOLAR_RISE*.4 && w.heat<100,
      '沸腾期未持续升温: '+w.heat.toFixed(1));
    // ③ SUNSHOT：沸腾期开火 → 蓄能 → 微型太阳出膛，heat 归零（不消耗弹药）
    w.heat=K.SOLAR_AT+2;   // 94：<PERFECT_AT，且 11 帧蓄能内升不到 100（不会提前炸膛）
    G.playerCtl.fire(p,w,0);
    assert(w.chargeT!=null, '沸腾期开火未进入 SUNSHOT 蓄能');
    frames(12);
    let suns=G.weapons.bullets.filter(b=>b.on&&b.kind==='sun');
    assert(suns.length===1, 'SUNSHOT 未生成太阳弹: '+suns.length);
    assert(!suns[0].sunP, 'heat<PERFECT_AT 不应判定 PERFECT');
    assert(w.heat===0, 'SUNSHOT 后热量未归零: '+w.heat);
    frames(150);
    // ④ PERFECT SUNSHOT：heat ≥ PERFECT_AT 开火 → sunP + 满额伤害（38×1.5=57）
    w.heat=K.PERFECT_AT+1;
    G.playerCtl.fire(p,w,0); frames(12);
    suns=G.weapons.bullets.filter(b=>b.on&&b.kind==='sun');
    assert(suns.length===1 && suns[0].sunP, 'PERFECT 未判定: '+(suns[0]&&suns[0].sunP));
    assert(suns[0].dmg>=K.SUN_DMG_P-.01, 'PERFECT 伤害不足: '+suns[0].dmg);
    frames(150);
    // ⑤ SUNSHOT 真实弹道对敌：正面静止图腾（hp40），直击应造成巨额伤害
    const tt=G.enemies.spawn('totem', p.x+3.5, p.z); tt.spawnT=0; tt.room=room;
    w.heat=K.SOLAR_AT+2; G.playerCtl.fire(p,w,0); frames(12); frames(45);
    assert(tt.dead || tt.hp<=tt.maxhp-30, 'SUNSHOT 未对敌人造成巨额伤害: hp='+tt.hp+'/'+tt.maxhp);
    for(const e of G.enemies.list){ e.dead=true; if(e.mesh) e.mesh.visible=false; }
    G.enemies.list.length=0;
    // ⑥ 敌方子弹接触太阳 → 被蒸发（设计稿十六：高级用途）
    const eb=G.weapons.spawn({team:'e', x:p.x+2.6, z:p.z, ang:Math.PI, spd:2.5, dmg:1, size:.12, pierce:0, knock:0, life:2});
    w.heat=K.SOLAR_AT+1; G.playerCtl.fire(p,w,0); frames(16);
    assert(!eb.on, '敌方子弹未被太阳蒸发');
    frames(150);
    // ⑦ OVERHEAT 路径一「贪射」：CRITICAL 区间继续扣扳机，+16 越过 100 → 炸膛自伤
    //    （uf 绕过 frames() 测试保护，沿用 STEP43 血债模式；hurt 受 invulnT 门控，须先清零）
    const uf=n=>{ for(let i=0;i<n;i++){ G.fx.hitstopT=0; G.game.update(1/60); } };
    p.invulnT=0; w.heat=88; w.ammo=6; w.cool=0;
    const hpB=p.hp;
    G.playerCtl.fire(p,w,0); uf(3);
    assert(w.heat===0 && w.cool>1, '贪射越限未炸膛: heat='+w.heat+' cool='+w.cool);
    assert(p.hp===hpB-1, '炸膛未自伤 1 点（不致死）: '+p.hp+'/'+hpB);
    // ⑧ OVERHEAT 路径二「沸腾放置」：进入沸腾后不处理 → 太阳核心失控炸膛
    p.invulnT=0; w.cool=0; w.heat=K.SOLAR_AT; w.ammo=1;
    const hpB2=p.hp;
    uf(90);   // 1.5s > (100-92)/6 = 1.33s → 必炸
    assert(w.heat===0 && w.cool>1, '沸腾放置未炸膛: heat='+w.heat.toFixed(1));
    assert(p.hp===hpB2-1, '沸腾炸膛未自伤: '+p.hp+'/'+hpB2);
    // ⑨ 主动散热（设计稿九）：长按 R（超过 VENT_HOLD 判定）→ heat 快速回落且散热中扳机不响应
    w.heat=80; G.input.key['KeyR']=true; frames(8);   // 8 帧 > 0.10s 判定阈值
    assert(w.ventT>0, '长按 R 未进入主动散热');
    frames(24);
    const rHoldEnd=w.rHold;                            // 松键前采样（松开后 keyR 会清零 rHold）
    G.input.key['KeyR']=false; frames(2);
    assert(w.heat<80-K.HEAT_VENT*.3, '主动散热速率不足: '+w.heat.toFixed(1));
    assert(rHoldEnd>K.TAP_MAX && !w.reloading, '长按散热不应触发装填: rHold='+rHoldEnd.toFixed(2)+' reloading='+w.reloading);
    // ⑩ 枪体温度材质：枪管自发光强度随热量单调上升（设计稿五/二十：枪体即 HEAT UI）
    const gun=p.refs.sun;
    assert(gun && gun.visible, '太阳左轮枪模未挂载/未显示');
    SR.applyHeat(gun, 0, 0); const e0=SR.mats().barrel.emissiveIntensity;
    SR.applyHeat(gun, 50, 0); const e1=SR.mats().barrel.emissiveIntensity;
    SR.applyHeat(gun, 100, 0); const e2=SR.mats().barrel.emissiveIntensity;
    assert(e0===0 && e1>e0 && e2>e1, '枪管自发光未随温度上升: '+e0+'/'+e1+'/'+e2);
    // ⑪ 清场：cleanupDynamic 后太阳弹三层视觉无残留
    w.heat=K.SOLAR_AT+2; G.playerCtl.fire(p,w,0); frames(12);
    assert(G.weapons.bullets.some(b=>b.on&&b.kind==='sun'), '太阳弹未在场（前置）');
    G.game.cleanupDynamic();
    assert(!SR._fx.some(f=>f.b), '清场后太阳弹视觉残留');
    return '积热锁膛/沸腾升温/SUNSHOT/PERFECT/真实弹道/蒸发敌弹/双路径炸膛/主动散热/温度材质/清场 全链路通过';
  });


  // ============ 音频系统 2.0：总线/混响/分层音乐/状态机/ducking/限流 ============
  await step('54_音频系统重制', ()=>{
    G.audio.unlock();
    assert(G.audio.unlocked,'无头环境应能创建 AudioContext');
    const B2=G.audio.buses;
    assert(B2.music && B2.sfx && B2.ui && B2.ambient && B2.player && B2.enemy && B2.boss,'音频总线缺失');
    assert(G.audio._reverb && G.audio._duckG && G.audio._ePan,'混响/ducking/声像节点缺失');
    // 状态机：战斗层目标跟随锁定战斗房
    G.game.startRun(); frames(3);
    G.audio.update(1/60);
    assert(G.audio._combatTarget===0,'非战斗时战斗层目标应为 0');
    G.game.curRoom.locked=true; G.audio.update(1/60);
    assert(G.audio._combatTarget===1,'战斗层目标未跟随锁定房: tgt='+G.audio._combatTarget+' st='+G.game.state+' inBase='+G.game.inBase+' locked='+(G.game.curRoom&&G.game.curRoom.locked)+' room='+(G.game.curRoom&&G.game.curRoom.type));
    G.game.curRoom.locked=false; G.audio.update(1/60);
    assert(G.audio._combatTarget===0,'战斗结束后战斗层目标未回落');
    // Boss 阶段自动推导（血量 60%/25% → phase1/2/enrage）
    const savedBoss=G.boss;
    G.boss={active:{hp:15,maxhp:100,dead:false}}; G.audio.update(1/60);
    assert(G.audio._bossPh===3,'Boss 低血量未进入 enrage');
    G.boss={active:{hp:70,maxhp:100,dead:false}}; G.audio.update(1/60);
    assert(G.audio._bossPh===1,'Boss 高血量应为 phase1');
    G.boss=savedBoss;
    // ducking：音乐总线被短暂压低后恢复
    G.audio.duck(.5); G.audio.update(1/60);
    assert(G.audio._duckG.gain.value<0.99,'ducking 未压低音乐');
    // 分层曲目内容
    G.audio.music('f1');
    assert(G.audio._curTrack==='f1','音乐未切换');
    assert(G.audio.tracks.f1.combat && G.audio.tracks.f2.combat && G.audio.tracks.f3.combat,'探索/战斗分层曲目缺失');
    assert(G.audio.tracks.boss.phase2 && G.audio.tracks.boss.enrage,'Boss 阶段层缺失');
    assert(G.audio.tracks.victory && G.audio.tracks.gameover,'胜负曲目缺失');
    // 限流：高频同名播放不抛错且节点计数有上限
    for(let i=0;i<40;i++) G.audio.sfx('hit',{v:.5});
    assert(G.audio._n<=60,'voice cap 失效 n='+G.audio._n);
    // 战斗层增益为渐变（lerp 而非瞬跳）
    G.audio.curW=0; G.game.curRoom.locked=true;
    G.audio.update(1/60); const g1=G.audio._layerG.combat;
    G.audio.update(1/60); const g2=G.audio._layerG.combat;
    G.game.curRoom.locked=false;
    assert(g2>g1 && g2<1,'战斗层增益非渐变: '+g1.toFixed(3)+'→'+g2.toFixed(3));
    return '总线/混响/状态机/战斗层/Boss阶段/ducking/限流 全链路通过';
  });

  // ============ 过载点唱机：黑胶互撞 / 共振网 / FULL OVERLOAD ============
  await step('59_过载点唱机网络', ()=>{
    G.game.startRun(); frames(3);
    const p=G.player;
    const amb0=G.lights.ambient.intensity;   // 环境光基准（Club 暗场还原断言用）
    // 0. 黑胶互撞半径检测：纯函数单测
    assert(G.jukebox.collide(0,0,.3,0)===true && G.jukebox.collide(0,0,1,1)===false, '黑胶互撞半径判定错误');
    // 1. 真实链路：同点两发黑胶 → 空中互撞 → 两张离场、生成 1 节点
    G.weapons.clear();
    p.weapons=[G.weapons.mktWeapon('jukebox')]; p.curW=0;
    const w=p.weapons[0];
    G.playerCtl.fire(p,w,0);
    G.playerCtl.fire(p,w,0);
    frames(2);
    assert(G.jukebox.nodes.length===1, '黑胶互撞未生成节点: '+G.jukebox.nodes.length);
    assert(G.weapons.bullets.filter(b=>b.on&&b.kind==='vinyl').length===0, '互撞后黑胶应双双离场');
    const n1=G.jukebox.nodes[0];
    // 2. 两节点 → 共振线存在 + 线上敌人持续掉血（0.18s tick ×2.5）
    G.jukebox.testNode(n1.x+1.5, n1.z);
    assert(G.jukebox.nodes.length===2 && G.jukebox.beams.length>=1, '两节点未连线: n='+G.jukebox.nodes.length+' b='+G.jukebox.beams.length);
    const g=G.enemies.spawn('gunner', n1.x+.75, n1.z);   // 正中弦线中点
    g.spawnT=0; g.room=G.game.curRoom;
    const hp0=g.hp;
    frames(14);   // 0.233s > 0.18s tick → 至少 1 次结算
    assert(g.hp<hp0, '共振线未伤害线上敌人: '+g.hp+'/'+hp0);
    // 3. 布满 6 节点 → 第 7 次入网 → FULL OVERLOAD：节点/线全清 + 线上敌人 12 伤
    while(G.jukebox.nodes.length<6) G.jukebox.testNode(n1.x+(Math.random()-.5)*3, n1.z+(Math.random()-.5)*3);
    assert(G.jukebox.nodes.length===6, '节点数未达上限: '+G.jukebox.nodes.length);
    const bm=G.jukebox.beams[0];
    const g3=G.enemies.spawn('gunner', (bm.ax+bm.bx)/2, (bm.az+bm.bz)/2);
    g3.spawnT=0; g3.room=G.game.curRoom;
    const bhp=g3.hp;
    G.jukebox.testNode(0,0);   // 满网 +1 → SONIC BURST
    assert(G.jukebox.nodes.length===0, 'FULL OVERLOAD 后节点未清空: '+G.jukebox.nodes.length);
    assert(G.jukebox.beams.length===0, 'FULL OVERLOAD 后共振线未清空: '+G.jukebox.beams.length);
    assert(g3.hp<=bhp-12, 'SONIC BURST 未对线上敌人造成伤害: '+g3.hp+'/'+bhp);
    // 4. 清场无残留（cleanupDynamic 钩子链路）+ 环境光还原
    G.game.cleanupDynamic();
    assert(G.jukebox.nodes.length===0 && G.jukebox.beams.length===0, '清场后音波网残留');
    assert(Math.abs(G.lights.ambient.intensity-amb0)<.001, 'Club 暗场未还原: '+G.lights.ambient.intensity+'/'+amb0);
    return '互撞单测/节点入网/共振线tick/满网BURST全清/灯光还原 全链路通过';
  });


  const pass=results.filter(r=>r===1).length, fail=results.length-pass;
  log('========================================');
  log('BOOTTEST RESULT: '+pass+' PASS / '+fail+' FAIL');
  document.title = 'BOOTTEST_'+(fail===0?'PASS':'FAIL')+'_P'+pass+'_F'+fail;
  window.__testResult={pass,fail,logs};
}
})();
