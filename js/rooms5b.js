/* 第九层事故 - 第五层特殊房间 08~13（注册进 SR5）
   EnemySwap / Vote / AmmoBank / Fake / MegaChest / DeveloperChaos */
'use strict';
(function(){
const SR5 = G.SR5;

/* ================================================================
   房间 08 · 敌我互换 EnemySwap（tier 2 中段）
   玩家「变成」随机敌人：外观+弹幕攻击替换为该敌人的真实 gameplay；
   同时生成 AI PLAYER（用玩家原武器攻击玩家）。击杀 AI PLAYER 完成。
   ================================================================ */
SR5.register({
  id:'swap', name:'身份互换区', tier:2, w:3, h:3, shape:'rect',
  initialize(room, state, rng){
    state._types=['gunner','orbiter','totem','hexer'];
    state._type=state._types[Math.floor(Math.random()*state._types.length)];
    room.enemyWaves=[[{type:state._type,elite:false},{type:'wisp',elite:false},{type:'gunner',elite:false}]];
  },
  start(room, state){
    const p=G.player;
    const type=state._type;
    /* 弹幕映射：敌人真实攻击 → 玩家可用 def（dmg/rate/弹速/颜色对齐原敌人） */
    const mimics={
      gunner:   {name:'枪手形态',   dmg:2, rate:2.6, spd:7.5, size:.14, color:0xff4030, mag:18},
      orbiter:  {name:'环刃形态',   dmg:2, rate:1.6, spd:5.5, size:.18, color:0xffa040, pellets:8, spread:6.283, mag:6},
      totem:    {name:'图腾形态',   dmg:3, rate:1.1, spd:4.2, size:.34, color:0x8a5aff, mag:5},
      hexer:    {name:'咒术形态',   dmg:2, rate:1.5, spd:6.0, size:.2,  color:0x50ff90, blast:1.6, blastDmg:2, mag:8},
    }[type];
    /* ① 玩家武器 → 敌人弹幕 */
    const baseId=(p.weapons[p.curW||0]&&p.weapons[p.curW||0].def._baseId)||'rusty';
    state.add(SR5.swapWeapon(SR5.makeTempWeapon(baseId, Object.assign({_baseId:baseId, name:mimics.name+'弹幕'}, mimics))));
    /* ② 外观 → 敌人模型（跟随玩家，cleanup 恢复） */
    const {group}=G.enemies.makeMesh(type);
    group.traverse(o=>{ if(o.material&&o.material.opacity!==undefined){} });  // 材质不动，仅换装
    G.scene.add(group);
    state._skin=group;
    p.mesh.visible=false;
    state.add(()=>{ G.scene.remove(group); p.mesh.visible=true; });
    /* ③ AI PLAYER：用玩家原武器参数攻击玩家 */
    const origW=p.weapons[(p.curW||0)];
    const aip={ type:'r5_aip', x:p.x+4, z:p.z, r:.36, hp:70, maxhp:70, dead:false,
      spd:2.4, room, spawnT:0, t:0, walkT:0, face:0, targetFace:0, flashT:0, atkCd:1.2,
      _wparam:{dmg:2, rate:origW?Math.min(3,origW.def.rate||2):2, spd:(origW&&origW.def.spd)||6, size:.16, color:0x70c8ff},
      mesh:(function(){ const gp=new THREE.Group();
        gp.add(new THREE.Mesh(new THREE.BoxGeometry(.5,.7,.4), G.mat(0x8ab0ff)));
        const head=new THREE.Mesh(new THREE.BoxGeometry(.36,.32,.36), G.mat(0xd0e0ff));
        head.position.y=.55; gp.add(head);
        return gp; })(),
    };
    aip.mesh.position.set(aip.x,0,aip.z);
    G.scene.add(aip.mesh);
    G.enemies.list.push(aip);   // 进入伤害管线（hurtEnemy 可打）
    aip.room=room;
    state._aip=aip;
    state.add(()=>{ if(!aip.dead){ const i=G.enemies.list.indexOf(aip); if(i>=0) G.enemies.list.splice(i,1); } G.scene.remove(aip.mesh); });
    G.ui.banner('身份互换', '你变成了 '+mimics.name+'——击杀「另一个你」');
    G.audio.sfx('glitch',{v:.7});
    state.after(45, ()=>{ if(!state.done) SR5.complete(room); });   // 时限兜底
  },
  update(room, state, dt){
    const p=G.player;
    /* 皮肤跟随 */
    if(state._skin){ state._skin.position.set(p.x,0,p.z); state._skin.rotation.y=-p.face; }
    /* AI PLAYER 驱动：追玩家 + 用玩家武器弹幕射击 */
    const a=state._aip;
    if(a && !a.dead){
      const d=G.dist(a.x,a.z,p.x,p.z)||1;
      a.targetFace=Math.atan2(p.z-a.z,p.x-a.x);
      a.face=a.targetFace;
      if(d>3.2){ G.moveEntity(a, Math.cos(a.face)*a.spd*dt, Math.sin(a.face)*a.spd*dt); a.walkT+=dt*9; }
      a.atkCd-=dt;
      if(a.atkCd<=0 && d<11){
        a.atkCd=1/(a._wparam.rate);
        const shots=a._wparam.pellets||1;
        for(let k=0;k<shots;k++){
          const ang=a.targetFace+(shots>1?(k/shots-.5)*.9:0);
          G.weapons.spawn({team:'e', x:a.x+Math.cos(ang)*.4, z:a.z+Math.sin(ang)*.4,
            ang, spd:a._wparam.spd, dmg:a._wparam.dmg, size:a._wparam.size, color:a._wparam.color, life:2.6});
        }
        G.audio.sfx('enemyShot',{v:.25});
      }
      a.mesh.position.set(a.x,0,a.z);
      a.mesh.rotation.y=-a.face;
    }
    /* AI PLAYER 死亡 → 完成 */
    if(a && (a.dead || a.hp<=0) && !state.done){ SR5.complete(room); }
  },
});

/* ================================================================
   房间 09 · 投票房 Vote（tier 2~3）
   三块石碑 SAFE / CHAOS / INSANE(???)：自选难度，奖励随档位
   ================================================================ */
SR5.register({
  id:'vote', name:'异常表决厅', tier:2, w:4, h:3, shape:'rect',
  initialize(room, state, rng){},
  start(room, state){
    const cx=room.cx, cz=room.cz;
    const opts=[
      {id:'safe',  label:'SAFE · 稳妥',  color:0x50c860, tip:'低风险 · 低回报', tier:1},
      {id:'chaos', label:'CHAOS · 混乱', color:0xe09030, tip:'高风险 · 高回报', tier:2},
      {id:'insane',label:'??? · 疯狂',   color:0xe03050, tip:'未知规则 · 未知回报', tier:3},
    ];
    state._steles=[];
    opts.forEach((o,i)=>{
      const x=cx-3+i*3, z=cz-1.5;
      const pr={type:'r5vote', x, z, r:.8, hp:Infinity, blocksMove:true, blocksBullets:false,
        mesh:(function(){ const gp=new THREE.Group();
          const st=new THREE.Mesh(new THREE.BoxGeometry(.9,1.4,.24), G.mat(0x2a2438));
          st.position.y=.7; gp.add(st);
          const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.2), G.bmat(o.color));
          gem.position.y=1.55; gp.add(gem); gp.userData.gem=gem;
          return gp; })()};
      pr.interact={label:'表决：'+o.label+'（'+o.tip+'）', range:1.9, fn:()=>{
        if(state._chosen) return;
        state._chosen=o.tier;
        state._steles.forEach(s=>{ if(s.interact) s.interact=null; if(s.mesh.userData.gem) s.mesh.userData.gem.material=G.bmat(0x444450); });
        G.ui.banner('表决生效：'+o.label, o.id==='insane'?'愿深渊保佑你':'后果自负');
        G.audio.sfx('phase',{v:.6});
        /* 按档位刷波 */
        const wavesDef={
          1:[['gunner','shroom','wisp'],['gunner','beetle','wisp']],
          2:[['gunner','charger','gunner','beetle'],['wisp','shroom','gunner','wisp']],
          3:[['gunner','charger','gunner','beetle','wisp','gunner'],['shield','gunner','charger','gunner'],['totem','gunner','wisp','beetle','gunner','charger']],
        }[o.tier];
        room.enemyWaves=wavesDef.map(w=>w.map(t=>({type:t, elite:o.tier>=2&&Math.random()<.4})));
        room._waveIdx=0;
        G.game.spawnWave(room,0);
      }};
      G.build.addProp(room, pr);
      state._steles.push(pr);
    });
    state.add(()=>{ state._steles.forEach(s=>{ const i=room.props.indexOf(s); if(i>=0) room.props.splice(i,1); if(s.mesh&&s.mesh.parent) G.world.remove(s.mesh); }); });
  },
  update(room, state, dt){
    if(!state._chosen) return;
    /* 多波推进（表决房自定义：waveIdx 推进） */
    if(SR5.roomCleared(room) && state.t>3){
      if(room._waveIdx < room.enemyWaves.length-1){
        room._waveIdx++;
        G.ui.toast('表决余波袭来！');
        G.game.spawnWave(room, room._waveIdx);
      } else { SR5.complete(room); }
    }
  },
});
/* complete 时按选择的档位给奖励（覆盖默认 tier） */
const _origComplete=SR5.complete;
SR5.complete=function(room){
  const A=SR5.active;
  if(A && A.mod.id==='vote' && A.state._chosen){
    A.mod={...A.mod, tier:A.state._chosen};
  }
  _origComplete(room);
};

/* ================================================================
   房间 10 · 子弹银行 AmmoBank（tier 1 前段）
   弹壳=货币：50→随机 Buff / 100→宝箱 / 150→治疗 / 300→稀有道具
   ================================================================ */
SR5.register({
  id:'ammobank', name:'弹壳银行', tier:1, w:3, h:2, shape:'rect',
  initialize(room, state, rng){},
  start(room, state){
    const cx=room.cx, cz=room.cz;
    const goods=[
      {cost:50,  label:'随机增益',  fn(){ G.spawnPickup('item', cx, cz-1, {itemId:G.items.randomPassive(Math.random()<.3?'B':'C')}); }},
      {cost:100, label:'神秘宝箱',  fn(){ G.spawnPickup('money', cx-1.4, cz-1); for(let i=0;i<6;i++) G.spawnPickup('money', cx+(Math.random()-.5)*2, cz-1+(Math.random()-.5)*1.5); G.spawnPickup('heart', cx+1.2, cz-1); }},
      {cost:150, label:'深度治疗',  fn(){ G.player.heal(4); G.fx.burst(G.player.x,.6,G.player.z,10,{color:0xff6080,spd:2,life:.5,s0:.16,kind:'a'}); }},
      {cost:300, label:'稀有道具',  fn(){ G.spawnPickup('item', cx, cz-1, {itemId:G.items.randomPassive('A')}); }},
    ];
    goods.forEach((gd,i)=>{
      const x=cx-3+i*2;
      const pr={type:'r5bank', x, z:cz+1.2, r:.75, hp:Infinity, blocksMove:true, blocksBullets:false,
        mesh:(function(){ const gp=new THREE.Group();
          const desk=new THREE.Mesh(new THREE.BoxGeometry(1.2,.55,.7), G.mat(0x274058));
          desk.position.y=.28; gp.add(desk);
          const orb=new THREE.Mesh(new THREE.OctahedronGeometry(.18), G.bmat(0x50e0ff));
          orb.position.y=.85; gp.add(orb); gp.userData.orb=orb;
          return gp; })()};
      pr.interact={label:'支付 '+gd.cost+' 弹壳 → '+gd.label, range:1.8, fn:()=>{
        const p=G.player;
        if(p.money<gd.cost){ G.ui.toast('弹壳不足（'+p.money+'/'+gd.cost+'）'); G.audio.sfx('deny'); return; }
        p.money-=gd.cost; G.ui.stats(p);
        gd.fn();
        G.audio.sfx('coin');
        if(!state._bought){ state._bought=true; SR5.complete(room); G.ui.toast('银行业务已办理——门开了（柜台仍在）'); }
      }};
      G.build.addProp(room, pr);
    });
    G.ui.banner('弹壳银行', '弹壳就是子弹，也是货币——花还是省？');
  },
  update(room, state, dt){
    if(!state.done && state.t>10){ SR5.complete(room); }   // 不强留：10s 后开门
  },
});

/* ================================================================
   房间 11 · 假房间 Fake（tier 3 后段）
   表面正常：假墙可击碎（藏着奖励）+ 消失地板区（站上去塌陷=空间传送）
   ================================================================ */
SR5.register({
  id:'fake', name:'伪装异常区', tier:3, w:4, h:3, shape:'rect',
  initialize(room, state, rng){
    room.enemyWaves=[['gunner','shroom','wisp','gunner','charger','wisp','gunner'].map(t=>({type:t,elite:false}))];
  },
  start(room, state){
    const room_=room;
    /* ① 3 面假墙（视觉与真墙一致，可击碎；碎后露奖励） */
    state._fakes=[];
    const spots=[];
    const bw=room.x1-room.x0, bh=room.z1-room.z0;
    // 从房间四边内侧各挑候选位置（不与门重叠——简化：取四角内缩）
    spots.push([room.x0+1, room.z0+1],[room.x1-1, room.z0+1],[room.x0+1, room.z1-1],[room.x1-1, room.z1-1]);
    spots.sort(()=>Math.random()-.5);
    spots.slice(0,3).forEach(([x,z])=>{
      const pr={type:'r5fakewall', x:x+.5, z:z+.5, r:.55, hp:10, blocksMove:true, blocksBullets:true,
        mesh:(function(){ const gp=new THREE.Group();
          const w=new THREE.Mesh(new THREE.BoxGeometry(.9,1.1,.9), G.mat(G.build._theme5Wall||0x2a1840));
          w.position.y=.55; gp.add(w);
          return gp; })()};
      pr._fake=true;
      pr.interact=null;
      G.build.addProp(room, pr);
      state._fakes.push(pr);
    });
    /* ② 消失地板区：一块循环闪烁的区域，站上去 0.9s 塌陷=传送到对角（+1 伤） */
    const tx=room.cx+ (room.x1-room.x0)/4, tz=room.cz;
    const pad=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),
      new THREE.MeshBasicMaterial({color:0x9a5cff,transparent:true,opacity:.14,depthWrite:false}));
    pad.rotation.x=-Math.PI/2; pad.position.set(tx,.06,tz);
    G.scene.add(pad);
    state._pad=pad; state._padX=tx; state._padZ=tz; state._padT=0;
    state.add(()=>G.scene.remove(pad));
    G.ui.banner('伪装异常区', '有些东西……看起来不太对劲');
  },
  update(room, state, dt){
    /* 假墙被击碎 → 计数 */
    if(state._fakes){
      const left=state._fakes.filter(f=>!f.dead).length;
      if(state._fakes._n==null) state._fakes._n=state._fakes.length;
      if(left<state._fakes._n){ state._fakes._n=left; G.ui.toast('假墙碎裂——「这里的墙是假的！」'); }
      if(left===0 && !state.done){ SR5.complete(room); }
    }
    /* 消失地板：闪烁 → 玩家进入 0.9s → 塌陷传送 */
    if(state._pad){
      state._padT+=dt;
      state._pad.material.opacity=.1+.12*Math.abs(Math.sin(state._padT*3));
      const p=G.player;
      if(Math.abs(p.x-state._padX)<1.1 && Math.abs(p.z-state._padZ)<1.1){
        state._padT>1e9; // no-op
        state._stand=(state._stand||0)+dt;
        if(state._stand>.9 && !state.done){
          state._stand=-999;
          const dx=room.cx*2-p.x, dz=room.cz*2-p.z;   // 传到中心对称点
          p.x=dx; p.z=dz; p.mesh.position.set(dx,0,dz);
          p.hurt(1,null);
          G.fx.burst(dx,.4,dz,12,{color:0x9a5cff,spd:3,life:.5,s0:.18,kind:'a',vy:1.5});
          G.audio.sfx('phase',{v:.6});
          G.ui.toast('地板塌了——空间把你抛到了另一头');
          state._found=true;
          if(!state.done){ G.ui.toast('伪装区的秘密被你发现了'); SR5.complete(room); }
        }
      } else state._stand=0;
    }
  },
});

/* ================================================================
   房间 12 · 超级宝箱房 MegaChest（tier 3 后段）
   巨型房 20~40 箱：真箱带微光线索；其余 空箱/金币/敌人/Mimic/爆炸/弹幕/传送
   完成：开出 8 箱 或 集齐全部真箱
   ================================================================ */
SR5.register({
  id:'megachest', name:'宝箱风暴', tier:3, w:5, h:4, shape:'rect',
  initialize(room, state, rng){},
  start(room, state){
    const n=20+Math.floor(Math.random()*21);
    const realN=3+Math.floor(Math.random()*2);
    const realIdx=new Set();
    while(realIdx.size<realN) realIdx.add(Math.floor(Math.random()*n));
    state._opened=0; state._realFound=0; state._realN=realN;
    state._chests=[];
    const x0=room.x0+2, x1=room.x1-2, z0=room.z0+2, z1=room.z1-2;
    for(let i=0;i<n;i++){
      const gx=x0+ (x1-x0) * (i%(Math.ceil(n/4))) / Math.max(1,Math.ceil(n/4)-1) + (Math.random()-.5)*.8;
      const gz=z0+ (z1-z0) * Math.floor(i/Math.ceil(n/4)) / 3 + (Math.random()-.5)*.8;
      const isReal=realIdx.has(i);
      const kinds=['empty','coins','enemy','mimic','blast','barrage','teleport'];
      const kind=isReal?'real':kinds[Math.floor(Math.random()*kinds.length)];
      const pr={type:'r5chest', x:gx+.5, z:gz+.5, r:.5, hp:1, blocksMove:true, blocksBullets:false,
        mesh:(function(){ const gp=new THREE.Group();
          const bx=new THREE.Mesh(new THREE.BoxGeometry(.8,.55,.6), G.mat(0x23222c));
          bx.position.y=.28; gp.add(bx);
          const lid=new THREE.Mesh(new THREE.BoxGeometry(.84,.2,.64), G.mat(0x6a5220));
          lid.position.y=.6; gp.add(lid); gp.userData.lid=lid;
          return gp; })(),
        _kind:kind, _real:isReal};
      pr.interact={label:isReal?'打开宝箱':'打开宝箱（？）', range:1.5, fn:()=>{ SR5._openChest(room,state,pr); }};
      G.build.addProp(room, pr);
      state._chests.push(pr);
    }
    G.ui.banner('宝箱风暴', n+' 个宝箱——只有少数是真的（观察微光）');
  },
  update(room, state, dt){
    /* 真箱微光线索：金色粒子缓慢上升 */
    state._pt=(state._pt||0)+dt;
    if(state._pt>1.6){
      state._pt=0;
      for(const c of state._chests){
        if(c._real && !c.dead && Math.random()<.6){
          G.fx.particle(c.x,.7,c.z,{vy:.8,vx:(Math.random()-.5)*.2,vz:(Math.random()-.5)*.2,life:.9,color:0xffd050,s0:.12,kind:'a'});
        }
      }
    }
  },
});
SR5._openChest = function(room, state, c){
  if(c.dead) return;
  c.dead=true;
  if(c.interact) c.interact=null;
  if(c.mesh){ if(c.mesh.parent) G.world.remove(c.mesh); }
  state._opened++;
  const x=c.x, z=c.z;
  G.audio.sfx('coin',{v:.4});
  switch(c._kind){
    case 'real':
      state._realFound++;
      G.fx.burst(x,.6,z,16,{color:0xffd050,spd:3,life:.7,s0:.18,kind:'a',vy:1.6});
      G.spawnPickup('item', x, z, {itemId:G.items.randomPassive('B')});
      for(let i=0;i<8;i++) G.spawnPickup('money', x+(Math.random()-.5)*2, z+(Math.random()-.5)*2);
      G.ui.toast('真宝箱！'+state._realFound+'/'+state._realN);
      break;
    case 'coins':
      for(let i=0;i<6;i++) G.spawnPickup('money', x+(Math.random()-.5)*1.6, z+(Math.random()-.5)*1.4);
      break;
    case 'enemy':
      G.fx.burst(x,.5,z,8,{color:0xff5040,spd:2,life:.4,s0:.14});
      SR5.spawnAt(room, Math.random()<.5?'shroom':'wisp');
      G.ui.toast('箱子里藏了东西！');
      break;
    case 'mimic':
      SR5.spawnAt(room,'mimic');
      G.ui.toast('那是拟态怪！');
      break;
    case 'blast':
      G.ui.toast('箱子里是炸药——快跑！');
      setTimeout(()=>{ if(G.game.state==='play') G.weapons.explode(x,z,2.2,10,'e'); }, 700);
      break;
    case 'barrage':
      G.fx.shake(.2);
      for(let k=0;k<10;k++){
        const ang=k/10*Math.PI*2;
        G.weapons.spawn({team:'e', x, z, ang, spd:4.2, dmg:1, size:.17, color:0xff60c0, life:2.2});
      }
      G.ui.toast('陷阱！弹幕释放！');
      break;
    case 'teleport': {
      G.fx.burst(x,.4,z,10,{color:0x9a5cff,spd:2.5,life:.5,s0:.16,kind:'a',vy:1.2});
      const p=G.player;
      const r2=room;
      p.x=r2.x0+2+Math.random()*(r2.x1-r2.x0-4); p.z=r2.z0+2+Math.random()*(r2.z1-r2.z0-4);
      p.mesh.position.set(p.x,0,p.z);
      G.audio.sfx('phase',{v:.5});
      G.ui.toast('空间折叠把你挪走了');
      break; }
    default:
      G.fx.burst(x,.4,z,6,{color:0x8a8a7a,spd:1.2,life:.4,s0:.12,kind:'m'});
      G.ui.toast('……空的。');
  }
  /* 完成条件：开 8 箱 或 真箱全开 */
  if(!state.done && (state._opened>=8 || state._realFound>=state._realN)) SR5.complete(room);
};

/* ================================================================
   房间 13 · 开发者测试房 DeveloperChaos（tier 4 极后段 · 最稀有 1~3%）
   「开发者忘记关闭测试工具」——每 6s 随机故障；一切像坏掉但全部可恢复
   ================================================================ */
SR5.register({
  id:'devchaos', name:'[DEV_BUILD] 测试房', tier:4, w:4, h:3, shape:'rect', autoCompleteOnClear:true,
  initialize(room, state, rng){
    room.enemyWaves=[['gunner','wisp','shroom','gunner','beetle','charger','wisp'].map(t=>({type:t,elite:false}))];
  },
  start(room, state){
    state._fxT=0; state._fxIdx=-1; state._elapsed=0;
    G.ui.banner('[DEV_BUILD] DEBUG_ROOM_13', 'assertion failed: reality.dll');
    G.audio.sfx('glitch',{v:.8});
  },
  update(room, state, dt){
    state._elapsed+=dt; state._fxT+=dt;
    if(state._fxT>6){
      state._fxT=0;
      /* 撤上一个效果 */
      if(state._undo){ try{state._undo();}catch(e){} state._undo=null; }
      state._fxIdx=(state._fxIdx+1+Math.floor(Math.random()*3))%10;
      const p=G.player;
      const FX=[
        ()=>{ // 玩家巨大化
          const s0=p.mesh.scale.x; p.mesh.scale.setScalar(1.9);
          return ()=>p.mesh.scale.setScalar(s0);
        },
        ()=>{ // 玩家缩小
          const s0=p.mesh.scale.x; p.mesh.scale.setScalar(.45);
          return ()=>p.mesh.scale.setScalar(s0);
        },
        ()=>{ // 敌人巨大化
          const list=G.enemies.list.filter(e=>e.room===room&&!e.dead&&!e._r5_aip).map(e=>({e,s:e.mesh?e.mesh.scale.x:1}));
          list.forEach(({e})=>e.mesh&&e.mesh.scale.multiplyScalar(2));
          return ()=>list.forEach(({e,s})=>e.mesh&&e.mesh.scale.setScalar(s));
        },
        ()=>{ // 子弹超高速
          const temp=SR5.makeTempWeapon((p.weapons[p.curW||0]&&p.weapons[p.curW||0].def._baseId)||'rusty',{spd:26, dmg:1});
          return SR5.swapWeapon(temp);
        },
        ()=>{ // 子弹龟速
          const temp=SR5.makeTempWeapon((p.weapons[p.curW||0]&&p.weapons[p.curW||0].def._baseId)||'rusty',{spd:1.4});
          return SR5.swapWeapon(temp);
        },
        ()=>{ // 射速异常
          const temp=SR5.makeTempWeapon((p.weapons[p.curW||0]&&p.weapons[p.curW||0].def._baseId)||'rusty',{rate:12, dmg:1});
          return SR5.swapWeapon(temp);
        },
        ()=>{ // 敌人暂停
          const list=G.enemies.list.filter(e=>e.room===room&&!e.dead);
          const snap=list.map(e=>({e, spd:e.spd, cd:e.atkCd}));
          list.forEach(e=>{ e.spd=0; e.atkCd=1e9; });
          G.ui.toast('entities.pause_all()');
          return ()=>snap.forEach(({e,spd,cd})=>{ e.spd=spd; e.atkCd=Math.min(cd,3); });
        },
        ()=>{ // 玩家短暂无敌
          p.invulnT=6;
          G.ui.toast('god.mode = true');
          return ()=>{ p.invulnT=Math.min(p.invulnT,1); };
        },
        ()=>{ // 世界变色
          const f=G.build._fog, a=G.build._amb;
          const f0=f&&f.color.getHex(), a0=a&&a.color.getHex();
          if(f) f.color.setHex(0x143318);
          if(a) a.color.setHex(0x2a8a3a);
          G.ui.toast('palette.swap(DEV_GREEN)');
          return ()=>{ if(f) f.color.setHex(f0); if(a) a.color.setHex(a0); };
        },
        ()=>{ // 摄像机异常
          state._camT=3;
          G.ui.toast('camera.recalibrate()');
          return ()=>{ state._camT=0; };
        },
      ];
      state._undo=FX[state._fxIdx]();
      G.fx.shake(.12);
      G.audio.sfx('glitch',{v:.35});
    }
    /* 摄像机异常驱动 */
    if(state._camT>0){ state._camT-=dt; G.game.camX+=Math.sin(performance.now()*.01)*.12; }
    /* 总时长 45s 或清房 → 完成 */
    if(state._elapsed>45) SR5.complete(room);
  },
});

})();
