/* 第九层事故 - 第五层「异常回廊」特殊房间系统
   ================================================================
   SpecialRoomManager（SR5）：13 种特殊房间的生命周期与状态隔离。
   接口契约：每种房间模块 = { id, name, w, h, shape, tier(失控阶段 1~4),
     initialize(room,state,rng) 布置, start(room,state) 激活,
     update(room,state,dt) 驱动 }；完成由模块调 SR5.complete(room)。
   状态隔离：所有临时修改必须经 state.add(undoFn) 注册回滚函数，
   cleanup 时逆序执行——保证不污染下一房间/下一层。 */
'use strict';
(function(){
const SR5 = {};
SR5.active = null;          // 当前激活的房间模块上下文 {room, mod, state, t}
SR5.registry = {};          // id -> module
SR5.debugId = null;         // ?floor5debug=N 强制下一个特殊房类型

SR5.register = function(mod){ SR5.registry[mod.id] = mod; };

/* ---------- 状态容器 ---------- */
function makeState(){
  return {
    undos: [],              // 回滚函数栈（cleanup 逆序执行）
    add(fn){ this.undos.push(fn); },
    timers: [],             // {t, fn} 房间内定时器（cleanup 清空）
    after(t, fn){ this.timers.push({t, fn}); },
    lights: [],             // 房间自建光源（cleanup 移除）
    light(x,y,z,color,intensity,dist){
      const L=new THREE.PointLight(color, intensity, dist||9, 2);
      L.position.set(x,y,z); G.scene.add(L); this.lights.push(L);
      this.add(()=>{ G.scene.remove(L); });
      return L;
    },
    t: 0,                   // 房间已进行秒数（SR5.update 每帧从 A.t 同步）
    done: false,            // complete 已触发
  };
}

/* ---------- 奖励档位（按房间失控阶段） ---------- */
SR5.reward = function(room, tier){
  const p=G.player;
  const cx=room.cx, cz=room.cz;
  if(tier<=1){
    G.spawnPickup('money', cx-1, cz, {amount:0});   // 少量金币
    for(let i=0;i<4;i++) G.spawnPickup('money', cx+(Math.random()-.5)*2.4, cz+(Math.random()-.5)*2.4);
    if(Math.random()<.4) G.spawnPickup('item', cx+1.5, cz, {itemId:G.items.randomPassive('C')});
  } else if(tier===2){
    for(let i=0;i<7;i++) G.spawnPickup('money', cx+(Math.random()-.5)*3, cz+(Math.random()-.5)*2.6);
    G.spawnPickup('item', cx, cz, {itemId:G.items.randomPassive('B')});
    G.spawnPickup('heart', cx-1.5, cz+1.5);
  } else {
    for(let i=0;i<11;i++) G.spawnPickup('money', cx+(Math.random()-.5)*3.4, cz+(Math.random()-.5)*3);
    G.spawnPickup('item', cx, cz, {itemId:G.items.randomPassive(Math.random()<.3?'A':'B')});
    G.spawnPickup('heart', cx-1.5, cz+1.5);
    if(Math.random()<.5) G.spawnPickup('heart', cx+1.5, cz-1.5);
  }
  G.audio.sfx('victory',{v:.4});
};

/* ---------- 进入/驱动/完成 ---------- */
SR5.onEnter = function(room){
  if(SR5.active || room.cleared) return;
  const id = SR5.debugId || room.special;
  const mod = SR5.registry[id] || SR5.registry[room.special];
  if(!mod) return;
  SR5.debugId = null;
  const state = makeState();
  SR5.active = {room, mod, state, t:0};
  room.locked = true;
  for(const d of room.doors) d.open=false;
  room._r5state = state;
  try{
    mod.initialize(room, state, G.floor.rng);
    mod.start(room, state);
    // 特殊房敌人波：与 combat 同款刷波（守房敌人）——旧版只定义不刷，房间全空
    if(room.enemyWaves && room.enemyWaves.length) G.game.spawnWave(room, 0);
    G.ui.toast('『'+mod.name+'』');
    G.audio.sfx('phase',{v:.5});
    /* 入房演出（黑化重制）：异常法阵起爆——紫环扩散 + 光爆 + 震屏 */
    G.fx.ring(room.cx,room.cz,3.4,0x9a4aff,.6);
    G.fx.light(room.cx,1.7,room.cz,0x9a4aff,2.0,.55);
    G.fx.shake(.22);
  }catch(err){ window.log && window.log('R5 ROOM INIT FAIL '+id+': '+err.message); SR5.cleanup(true); }
};

SR5.update = function(dt){
  const A=SR5.active;
  if(!A) return;
  if(A.state.done) return;
  A.t += dt;
  A.state.t = A.t;   /* FIX-033（2026-09-06）：state 上从来没有 t 字段，模块里所有 `state.t>N`
                        判断（弹壳银行 10s 开门兜底/表决厅完成/giant 等）永远为 false——
                        弹壳银行不购买就永久锁门。计时真身在 A.t 上，这里每帧同步进 state。 */
  // 房间定时器
  for(let i=A.state.timers.length-1;i>=0;i--){
    const tm=A.state.timers[i];
    tm.t-=dt;
    if(tm.t<=0){ A.state.timers.splice(i,1); try{ tm.fn(); }catch(err){ window.log && window.log('R5 TIMER FAIL: '+err.message); } }
  }
  /* 统一完成检测：模块声明 autoCompleteOnClear 且清房 3s 后 → 自动完成
     （比各模块自写检测可靠——模块级检查曾出现条件全真却不触发的时序谜题） */
  /* 多波推进：特殊房的多波敌人（清一波刷下一波，最后一波清完才完成） */
  if(!A.state.done && A.room.enemyWaves && A.room.enemyWaves.length>1 && SR5.roomCleared(A.room)){
    A.room._waveIdx=(A.room._waveIdx||0)+1;
    if(A.room._waveIdx < A.room.enemyWaves.length){
      G.game.spawnWave(A.room, A.room._waveIdx);
      G.ui.toast('异常增援来袭！');
      return;
    }
  }
  if(!A.state.done && A.mod.autoCompleteOnClear && A.t>3 && SR5.roomCleared(A.room)){
    SR5.complete(A.room);
    return;
  }
  try{ A.mod.update && A.mod.update(A.room, A.state, dt); }
  catch(err){ window.log && window.log('R5 UPDATE FAIL '+A.mod.id+': '+err.message); }
};

SR5.complete = function(room){
  const A=SR5.active;
  if(!A || A.state.done) return;
  A.state.done = true;
  const tier = A.mod.tier||1;
  SR5.reward(room, tier);
  G.ui.toast('异常稳定——奖励已发放');
  SR5.cleanup(false);
  G.game.clearRoom(room);   // 开门 + cleared
};

/* 清理：逆序回滚全部临时修改 */
SR5.cleanup = function(abort){
  const A=SR5.active;
  if(!A) return;
  const U=A.state.undos;
  for(let i=U.length-1;i>=0;i--){ try{ U[i](); }catch(err){ window.log && window.log('R5 UNDO FAIL: '+err.message); } }
  A.state.timers.length=0;
  SR5.active=null;
  if(abort) G.ui.toast('异常消散了……');
};

/* 换层/回标题时强制清理（game.startFloor 调用） */
SR5.hardReset = function(){
  SR5.cleanup(true);
  SR5.debugId=null;
};

/* 敌人全灭检测（特殊房通用完成条件辅助） */
SR5.roomCleared = function(room){
  return !G.enemies.list.some(e=>e.room===room && !e.dead) && !G.game.spawnQueue.some(s=>s.room===room);
};

/* 刷波辅助（敌人从房间边缘随机点入场） */
SR5.spawnAt = function(room, type, elite){
  const pt = G.roomSpawnPos(room, G.player);
  G.game.spawnQueue.push({t:.2+Math.random()*.3, type, elite:!!elite, room});
};

/* ---------- 临时武器工厂（失控实验室 / 武器祭坛 / 敌我互换共用） ----------
   用自定义 def 副本模拟异常规则，不污染 weapons.defs 全局表 */
SR5.makeTempWeapon = function(baseId, patch){
  const base = G.weapons.defs[baseId] || G.weapons.defs.rusty;
  const def = Object.assign({}, base, patch);
  def._r5temp = true;
  const w = {
    def, ammo: def.mag||12, mag: def.mag||12,
    reloading:false, reloadT:0, lvl:1,
  };
  return w;
};

/* 武器交换：返回 undo 函数。把玩家当前武器槽替换为 tempW（或插入） */
SR5.swapWeapon = function(tempW){
  const p=G.player;
  const idx=p.curW||0;
  const old=p.weapons[idx];
  const oldCurW=p.curW;
  p.weapons[idx]=tempW;
  G.playerCtl && G.playerCtl.equip && G.playerCtl.equip(p, idx);
  return ()=>{ p.weapons[idx]=old; p.curW=oldCurW; G.playerCtl && G.playerCtl.equip && G.playerCtl.equip(p, p.curW); };
};

/* ================================================================
   房间 01 · 武器失控实验室 WeaponChaos（tier 1 前段）
   玩家武器被异常规则污染 25~40s：无限弹药/射速狂暴/巨型弹/多重/追踪/极限反弹/爆炸/穿透/散布狂乱
   ================================================================ */
SR5.register({
  id:'weaponchaos', name:'武器失控实验室', tier:1, w:3, h:2, shape:'rect', autoCompleteOnClear:true,
  initialize(room, state, rng){
    // 守房敌人（普通波）
    room.enemyWaves=[['gunner','gunner','shroom','wisp','charger','hexer','wisp'].map(t=>({type:t,elite:false}))];
  },
  start(room, state){
    const p=G.player;
    const baseId = (p.weapons[p.curW||0] && p.weapons[p.curW||0].def._baseId) || 'rusty';
    const R = G.RNG ? new G.RNG((Math.random()*1e9)>>>0) : null;
    const pools=[
      {name:'无限弹药',   patch:{mag:9999}},
      {name:'射速狂暴',   patch:{rate:9}},
      {name:'巨型弹丸',   patch:{size:.62, dmg:Math.round((G.weapons.defs[baseId].dmg||3)*2.5)}},
      {name:'弹丸分裂',   patch:{pellets:5, spread:.5}},
      {name:'追踪弹幕',   patch:{homing:3.2}},
      {name:'极限反弹',   patch:{bounce:6}},
      {name:'爆炸弹药',   patch:{blast:2.4, blastDmg:4}},
      {name:'贯穿弹幕',   patch:{pierce:5}},
      {name:'散布狂乱',   patch:{pellets:9, spread:.95, rate:2.2}},
    ];
    const pick=pools[Math.floor(Math.random()*pools.length)];
    const temp=SR5.makeTempWeapon(baseId, Object.assign({_baseId:baseId, mag:pick.patch.mag||G.weapons.defs[baseId].mag||12}, pick.patch));
    const undo=SR5.swapWeapon(temp);
    state.add(undo);
    state._undoW=undo;
    G.ui.banner('武器失控：'+pick.name, '你的枪在异常中变异了（稍后恢复）');
    G.audio.sfx('glitch',{v:.6});
    // 时限后完成（期间清敌也可）
    state.after(20+Math.random()*15, ()=>{ SR5.complete(room); });
    // 守敌全灭也提前完成
    state._chk=0;
    const iv=setInterval(()=>{ /* 占位：主循环 update 驱动检测 */ }, 1000);
    state.add(()=>clearInterval(iv));
    state._room=room;
  },
  update(room, state, dt){
    // 完成检测已交由 SR5 管理器统一处理（autoCompleteOnClear）
  },
});

/* ================================================================
   房间 02 · 巨型敌人房 Giant（tier 1 前段）
   敌人少而巨大（2~6 倍，8 倍稀有）：scale/r/弹幕/HP 全方位巨大化
   ================================================================ */
SR5.register({
  id:'giant', name:'巨型异常体', tier:1, w:4, h:3, shape:'rect', autoCompleteOnClear:true,
  initialize(room, state, rng){
    const mults=[2,2,3,3,4,6,8];
    const mult=mults[Math.floor(Math.random()*mults.length)];
    state._mult=mult;
    const types=['charger','shroom','gunner','beetle','wisp'];
    const n=mult>=6?3:4;
    for(let i=0;i<n;i++){
      const t=types[Math.floor(Math.random()*types.length)];
      const pos=G.roomSpawnPos(room, G.player);
      const e=G.enemies.spawn(t, pos.x, pos.z);
      if(e){ e.room=room; e.spawnT=.3; SR5.applyGiant(e, mult); }
    }
  },
  start(room, state){
    G.ui.banner('巨型异常体', '倍率 ×'+state._mult+(state._mult>=8?' —— 极端异常！':''));
    G.fx.shake(.35);
  },
  update(room, state, dt){
    // 巨型化在 spawn 时由 hook 应用（见 SR5.applyGiant）；全灭 → 完成
    if(!state.done && SR5.roomCleared(room) && state.t>2) SR5.complete(room);
  },
});

/* 巨型化应用（game.spawnQueue 消费时调用） */
SR5.applyGiant = function(e, mult){
  e._r5giant=mult;
  e.maxhp=e.hp=Math.round(e.maxhp*(1+mult*1.1));
  e.r=e.def.r*mult*.9;
  e.dmgMul=1+mult*.25;
  if(e.mesh) e.mesh.scale.setScalar(mult);
  e.spdMul=Math.max(.55, 1.15-mult*.09);
};

/* ================================================================
   房间 03 · Boss Rush Roulette（tier 3 后段）
   随机抽取历史 Boss 轮换（各 22~28s），最终阶段巨型 Boss + 精英护卫
   ================================================================ */
SR5.register({
  id:'bossrush', name:'BOSS ROULETTE', tier:3, w:6, h:5, shape:'rect',
  initialize(room, state, rng){
    room._r5noWave=true;
  },
  start(room, state){
    state._order=['ironjaw','voidking','voidripper'].sort(()=>Math.random()-.5);
    state._phase=-1;
    G.ui.banner('BOSS ROULETTE', '转轮已启动——历史 Boss 连续登场');
    G.audio.sfx('glitch',{v:.7});
    state.after(.8, ()=>SR5._nextPhase(room,state));
  },
  update(room, state, dt){
    // 当前 Boss 被击杀 → 下一阶段
    if(!G.boss.active && state._phase>=0 && state._phase<state._order.length-0 && !state._switching){
      state.after(.6, ()=>SR5._nextPhase(room,state));
      state._switching=true;
    }
  },
});
SR5._nextPhase = function(room, state){
  state._switching=false;
  state._phase++;
  const br=room;
  const cx=br.cx, cz=br.z0+4;
  if(state._phase < state._order.length){
    G.boss.clear();
    G.boss.spawn(cx, cz, {type:state._order[state._phase]});
    G.ui.toast('ROULETTE → 第 '+(state._phase+1)+' 位挑战者');
  } else {
    // 最终阶段：巨型 Boss + 精英护卫（双倍压力）
    G.boss.clear();
    G.boss.spawn(cx, cz, {type:state._order[0], giant:1.5, hpMul:.55});
    SR5.spawnAt(br,'commander',true); SR5.spawnAt(br,'shield',true);
    G.ui.toast('FINAL：失序融合体！');
  }
  // 阶段时限：22~28s 后强制切换（防拖沓；未击杀的 Boss 直接轮换离场）
  state.after(22+Math.random()*6, ()=>{
    if(!state.done && state._phase<=state._order.length) SR5._nextPhase(room,state);
  });
  if(state._phase>state._order.length){ SR5.complete(room); }
};

/* ================================================================
   房间 04 · 黑暗房 Darkness（tier 2 中段）
   全房近乎黑暗；击杀敌人 → 永久点亮该处；战斗=获取视野
   ================================================================ */
SR5.register({
  id:'darkness', name:'视觉剥夺区', tier:2, w:3, h:3, shape:'rect', autoCompleteOnClear:true,
  initialize(room, state, rng){
    room.enemyWaves=[['wisp','gunner','shroom','wisp','gunner','beetle','wisp','charger','gunner'].map(t=>({type:t,elite:false}))];
  },
  start(room, state){
    // 压暗全局光照（cleanup 恢复）
    /* 2026-09-06 黑化重制：本层环境光已压到近黑（ambientI .5），再乘 .12 会全黑不可玩——
       压暗系数回调为相对减半档，黑暗感由本层黑色基调本身提供 */
    const a=G.build._amb, h=G.build._hemi, d=G.build._dir;
    if(a){ state.add(()=>a.intensity=a.userData._i0||(a.userData._i0=a.intensity)); a.intensity*= .4; }
    if(h){ state.add(()=>h.intensity=h.userData._i0||(h.userData._i0=h.intensity)); h.intensity*=.45; }
    if(d){ state.add(()=>d.intensity=d.userData._i0||(d.userData._i0=d.intensity)); d.intensity*=.4; }
    // 房间火把熄灭
    room.torches.forEach(t=>{ if(t.mesh) t.mesh.visible=false; });
    state.add(()=>room.torches.forEach(t=>{ if(t.mesh) t.mesh.visible=true; }));
    // 玩家微光
    state._pl=state.light(G.player.x,.9,G.player.z,0xbfd0ff,1.25,7);
    state._follow=true;
    G.ui.banner('视觉剥夺', '击杀敌人 = 夺回视野');
    G.audio.sfx('phase',{v:.6});
  },
  update(room, state, dt){
    // 玩家微光跟随
    if(state._pl && G.player){ state._pl.position.set(G.player.x,.9,G.player.z); }
    // 击杀点亮：扫描本房死亡敌人（dead 标记一次性消费）
    for(const e of G.enemies.list){
      if(e.room===room && e.dead && !e._r5lit){
        e._r5lit=true;
        state.light(e.x,.8,e.z,0xffe0a0,.85,6.5);
        G.fx.burst(e.x,.5,e.z,8,{color:0xffe0a0,spd:2,life:.5,s0:.15,kind:'a'});
      }
    }
    if(!state.done && SR5.roomCleared(room) && state.t>3) SR5.complete(room);
  },
});

/* ================================================================
   房间 05 · 地图崩坏 Collapse（tier 3 后段）
   大房间；战斗中边缘逐圈崩塌：预警闪烁 → 崩塌 → 碰撞同步
   ================================================================ */
SR5.register({
  id:'collapse', name:'空间崩坏区', tier:3, w:6, h:4, shape:'rect', autoCompleteOnClear:true,
  initialize(room, state, rng){
    room.enemyWaves=[['gunner','charger','shroom','gunner','wisp','beetle','gunner','hexer','wisp'].map(t=>({type:t,elite:false}))];
  },
  start(room, state){
    // 收集房间全部地板 tile，按距中心圈层分组
    const cxT=room.cx, czT=room.cz;
    const tiles=[...room.mask].map(k=>k.split(',').map(Number));
    const rings=new Map();
    for(const [x,z] of tiles){
      const d=Math.round(Math.max(Math.abs(x+.5-cxT)/3, Math.abs(z+.5-czT)/2));
      if(!rings.has(d)) rings.set(d,[]);
      rings.get(d).push([x,z]);
    }
    state._rings=[...rings.keys()].sort((a,b)=>b-a);   // 从外圈向内崩
    state._ringIdx=0;
    state._blink=[];
    G.ui.banner('空间崩坏区', '这块地板撑不了多久——尽快解决战斗');
    // 崩塌节拍：每 5s 崩一圈
    state._caveT=0;
  },
  update(room, state, dt){
    state._caveT+=dt;
    if(state._caveT>4 && state._ringIdx<state._rings.length-1){
      state._caveT=0;
      const ring=state._rings[state._ringIdx++];
      // 保留最内 1 圈不崩
      if(state._ringIdx<=state._rings.length-1){
        for(const [x,z] of ring){
          // 预警闪烁板（1.2s 后崩塌）
          const w=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
            new THREE.MeshBasicMaterial({color:0xff3050,transparent:true,opacity:.45,depthWrite:false}));
          w.rotation.x=-Math.PI/2; w.position.set(x+.5,.07,z+.5);
          G.scene.add(w);
          state._blink.push(w);
          state.after(1.2, ()=>{
            G.scene.remove(w);
            const t=G.floor.tilesGet(x,z);
            if(t && t.t==='floor'){
              // 崩塌：碰撞移除（tile 删除=solidForMove 天然实心）+ 深渊遮板
              G.floor.tiles.delete(x+','+z);
              room.mask.delete(x+','+z);
              const cover=new THREE.Mesh(new THREE.PlaneGeometry(1.02,1.02),
                new THREE.MeshBasicMaterial({color:0x04030a,depthWrite:false}));
              cover.rotation.x=-Math.PI/2; cover.position.set(x+.5,.055,z+.5);
              G.scene.add(cover);
              state.add(()=>G.scene.remove(cover));
              G.fx.burst(x+.5,.2,z+.5,5,{color:0x8a5aff,spd:1.5,life:.4,s0:.14,kind:'a',vy:.6});
            }
          });
        }
        G.fx.shake(.25); G.audio.sfx('doorSlam',{v:.4});
      }
      // 闪烁动画
      for(const w of state._blink) if(w.material) w.material.opacity=.2+.35*Math.abs(Math.sin(performance.now()*.02));
    }
    if(!state.done && SR5.roomCleared(room) && state.t>4) SR5.complete(room);
  },
});

/* ================================================================
   房间 06 · 武器祭坛 Altar（tier 2 中段）
   中央祭坛献祭当前武器 → 临时神武器 30s → 销毁恢复
   ================================================================ */
SR5.register({
  id:'altar', name:'武器祭坛', tier:2, w:3, h:2, shape:'rect', autoCompleteOnClear:true,
  initialize(room, state, rng){
    room.enemyWaves=[['gunner','wisp','gunner','beetle','charger','wisp'].map(t=>({type:t,elite:false}))];
  },
  start(room, state){
    const cx=room.cx, cz=room.cz;
    // 祭坛交互点
    const pr={type:'r5altar', x:cx, z:cz, r:.9, hp:Infinity, blocksMove:true, blocksBullets:false,
      mesh:(function(){ const gp=new THREE.Group();
        const base=new THREE.Mesh(new THREE.CylinderGeometry(.8,.95,.5,6), G.mat(0x3a2a5a));
        base.position.y=.25; gp.add(base);
        const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.42), G.bmat(0x9a5cff));
        gem.position.y=1.0; gp.add(gem); gp.userData.gem=gem;
        return gp; })()};
    pr.interact={label:'献祭武器（获得 30 秒神兵）', range:2.0, fn:()=>{
      if(state._used) return;
      state._used=true;
      pr.interact=null;
      if(pr.mesh.userData.gem) pr.mesh.userData.gem.material=G.bmat(0xffd050);
      const p=G.player;
      const baseId=(p.weapons[p.curW||0]&&p.weapons[p.curW||0].def._baseId)||'rusty';
      // 神武器：多重+穿透+爆炸+追踪+高射速+大弹匣
      const temp=SR5.makeTempWeapon(baseId,{
        _baseId:baseId, name:'失序神兵', dmg:7, rate:5.5, mag:9999,
        pellets:3, spread:.28, pierce:3, blast:1.8, blastDmg:4, homing:2.2, size:.3,
      });
      state.add(SR5.swapWeapon(temp));
      G.ui.banner('失序神兵', '30 秒后祭坛将回收它');
      G.audio.sfx('victory',{v:.5});
      state.after(30, ()=>{ if(!state.done) SR5.complete(room); });
    }};
    G.build.addProp(room, pr);
    state.add(()=>{ const i=room.props.indexOf(pr); if(i>=0) room.props.splice(i,1); if(pr.mesh&&pr.mesh.parent) G.world.remove(pr.mesh); });
    G.audio.sfx('phase',{v:.5});
  },
  update(room, state, dt){
    // 献祭后清敌即完成；未献祭清敌也完成（放弃神兵机会）
    if(!state.done && SR5.roomCleared(room) && state.t>3) SR5.complete(room);
  },
});

/* ================================================================
   房间 07 · 敌人抢武器 WeaponTheft（tier 2 中段）
   中央强力武器：敌人会抢；击杀持有者掉落；玩家夺回获得强化
   ================================================================ */
SR5.register({
  id:'theft', name:'武器争夺区', tier:2, w:3, h:3, shape:'rect', autoCompleteOnClear:true,
  initialize(room, state, rng){
    room.enemyWaves=[['gunner','charger','gunner','shroom','beetle','gunner','wisp','hexer'].map(t=>({type:t,elite:false}))];
  },
  start(room, state){
    const cx=room.cx, cz=room.cz;
    state._wx=cx; state._wz=cz; state._holder=null; state._playerBuff=0;
    // 场上武器（发光武器模型）
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(.18,.18,1.1), G.bmat(0x50e0ff));
    body.position.y=.5; g.add(body);
    const glow=new THREE.Sprite(G.pmat(0x50e0ff)); glow.scale.set(1.6,1.6,1); glow.position.y=.6; g.add(glow);
    g.position.set(cx,0,cz); G.scene.add(g);
    state._mesh=g;
    state.add(()=>G.scene.remove(g));
    G.ui.banner('失控火力单元', '谁拿到它，谁就是战场的主宰');
    // 敌人拾取/玩家拾取在 update 驱动
  },
  update(room, state, dt){
    const wx=state._wx, wz=state._wz;
    if(state._mesh) state._mesh.rotation.y+=dt*2.4;
    // 持有者存在：武器跟随持有者
    if(state._holder){
      const h=state._holder;
      if(h.dead){ // 击杀 → 掉落回地面
        state._holder=null; state._wx=h.x; state._wz=h.z;
        if(state._mesh){ state._mesh.position.set(h.x,0,h.z); state._mesh.visible=true; }
        state._hx=null;
      } else {
        state._wx=h.x; state._wz=h.z;
        if(state._mesh) state._mesh.position.set(h.x,1.2,h.z);
      }
    }
    // 敌人靠近 → 拾取（获得强化：体型/弹幕增益标记）
    if(!state._holder){
      for(const e of G.enemies.list){
        if(e.room!==room||e.dead||e.spawnT>0) continue;
        if(G.dist2(e.x,e.z,wx,wz)<1.1){
          state._holder=e;
          e._r5armed=true;
          e.maxhp=e.hp=Math.round(e.hp*2.2);
          if(e.mesh) e.mesh.scale.multiplyScalar(1.35);
          G.ui.toast('敌人夺走了火力单元！');
          G.audio.sfx('glitch',{v:.5});
          break;
        }
      }
      // 玩家靠近 → 拾取（临时强化武器 20s）
      const p=G.player;
      if(!state._holder && !state._playerBuff && G.dist2(p.x,p.z,wx,wz)<1.2){
        state._playerBuff=1;
        if(state._mesh) state._mesh.visible=false;
        const baseId=(p.weapons[p.curW||0]&&p.weapons[p.curW||0].def._baseId)||'rusty';
        const temp=SR5.makeTempWeapon(baseId,{_baseId:baseId, name:'夺回火力', dmg:6, rate:4.5, mag:60, pierce:2, size:.26});
        const undo=SR5.swapWeapon(temp);
        state.add(undo);
        G.ui.toast('火力单元到手（20 秒）');
        G.audio.sfx('victory',{v:.45});
        state.after(20, ()=>{ state._playerBuff=0; });
        // 拿到武器+清敌 → 完成
      }
    }
    // 未拾取时吸引「抢武器者」：给最近 3 只敌人叠加向武器点的位移
    if(!state._holder){
      const near=G.enemies.list.filter(e=>e.room===room&&!e.dead&&e.spawnT<=0)
        .sort((a,b)=>G.dist2(a.x,a.z,wx,wz)-G.dist2(b.x,b.z,wx,wz)).slice(0,3);
      for(const e of near){
        const d=G.dist(e.x,e.z,wx,wz)||1;
        if(d>1.2) G.moveEntity(e,(wx-e.x)/d*1.6*dt,(wz-e.z)/d*1.6*dt);
      }
    }
    if(!state.done && SR5.roomCleared(room) && state.t>4){ SR5.complete(room); }
  },
});

G.SR5 = SR5;
})();
