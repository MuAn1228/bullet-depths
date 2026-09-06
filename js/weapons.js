/* 第九层事故 - 武器定义与弹幕系统 */
'use strict';
(function(){
const W = {};

/* ---------- 武器表 ---------- */
W.defs = {
  rusty:   { name:'生锈左轮', tier:'D', dmg:5,   rate:3.8, mag:6,  reload:1.0, spread:.035, pellets:1, speed:17, range:12, size:.13, pierce:0, bounce:0, knock:3, color:0xffe9a0, sfx:'pistol',  price:0, blurb:'可靠的老伙计，均衡无短板' },
  paperplane:{ name:'纸飞机', tier:'D', dmg:2.2, rate:1.4, mag:5, reload:1.3, spread:.04, pellets:1, speed:4, range:10, size:.15, pierce:2, bounce:3, knock:.5, color:0xf2eedd, sfx:'paperThrow', price:10, paper:true, blurb:'越飞越快 · 会自己回航' },
  hairdryer:{ name:'重型吹风机', tier:'D', dmg:.55, rate:6, mag:24, reload:1.4, spread:0, pellets:1, speed:0, range:5.5, size:0, pierce:0, bounce:0, knock:0, color:0x9fd8e8, sfx:'dryerTick', price:14, hairdryer:true, blurb:'按住吹风 · 把敌人推去撞墙' },
  smg:     { name:'蜂群冲锋枪', tier:'C', dmg:2.4, rate:11,  mag:32, reload:1.3, spread:.13,  pellets:1, speed:15, range:10, size:.11, pierce:0, bounce:0, knock:1, color:0xffd070, sfx:'smg',     price:30, blurb:'高射速压制，弹匣超深' },
  shotgun: { name:'双管粉碎者', tier:'C', dmg:2.8, rate:1.7, mag:2,  reload:1.5, spread:.19,  pellets:6, speed:13, range:6.5,size:.12, pierce:0, bounce:0, knock:7, color:0xffa060, sfx:'shotgun', price:32, blurb:'六弹丸齐喷，贴脸毁灭' },
  ricochet:{ name:'弹跳先生', tier:'C', dmg:6,   rate:4,   mag:12, reload:1.2, spread:.05,  pellets:1, speed:15, range:11, size:.14, pierce:0, bounce:3, knock:3, color:0x50ffa0, sfx:'pistol',  price:34, blurb:'子弹弹墙三次，拐角也能打' },
  rifle:   { name:'猎兽步枪', tier:'B', dmg:13,  rate:1.7, mag:5,  reload:1.5, spread:.012, pellets:1, speed:25, range:16, size:.16, pierce:2, bounce:0, knock:5, color:0xd0e8ff, sfx:'rifle',   price:40, blurb:'重弹高伤，贯穿两人' },
  laser:   { name:'光棱射线', tier:'B', dmg:1.6, rate:22,  mag:44, reload:1.6, spread:.008, pellets:1, speed:27, range:7.5,size:.10, pierce:3, bounce:0, knock:.5, color:0x50f0ff, sfx:'laser',   price:42, laser:true, blurb:'极速光束，穿透三人' },
  hive:    { name:'追踪蜂巢', tier:'B', dmg:3.4, rate:7,   mag:24, reload:1.7, spread:.3,   pellets:1, speed:8,  range:11, size:.13, pierce:0, bounce:0, knock:1.5, color:0xffd23e, sfx:'bee',     price:40, homing:true, blurb:'蜂弹自动追踪七米内目标' },
  plasma:  { name:'等离子爆发', tier:'A', dmg:9,  rate:2.2, mag:8,  reload:1.8, spread:.02,  pellets:1, speed:7,  range:12, size:.26, pierce:0, bounce:2, knock:5,   color:0xc060ff, sfx:'plasma',  price:48, plasma:true, splash:1.4, splashDmg:6, blurb:'命中爆炸，溅射周围' },
  rocket:  { name:'毁灭者火箭筒', tier:'A', dmg:26, rate:0.8, mag:1,  reload:1.9, spread:0,   pellets:1, speed:9.5,range:14, size:.3,  pierce:0, bounce:0, knock:9,   color:0xff7040, sfx:'rocket',  price:50, rocket:true, splash:2.4, splashDmg:16, blurb:'单发巨伤与大范围爆炸' },
  burst:   { name:'三连发卡宾', tier:'B', dmg:5,  rate:4.2, mag:21, reload:1.4, spread:.03,  pellets:1, speed:19, range:14, size:.13, pierce:1, bounce:0, knock:2,   color:0xd0ff90, sfx:'rifle',   price:38, burst:3, burstGap:.07, blurb:'单发扳机三连射' },
  rail:    { name:'磁轨狙击炮', tier:'A', dmg:22, rate:1.1, mag:3,  reload:1.7, spread:0,   pellets:1, speed:55, range:19, size:.17, pierce:99,bounce:0, knock:6,   color:0x80f0ff, sfx:'rifle',   price:52, rail:true, blurb:'磁轨加速的贯穿狙击' },
  /* 2026-09-06 冰晶散射者重做（用户反馈：A 价 50 却打不过 C 价霰弹枪）：5×2.3=11.5 爆发
     低于双管粉碎者 6×2.8=16.8。对齐 A 档：6 弹丸 ×3.2（爆发 19.2）、贯穿 1 敌、弹匣 8、
     射速 2.0、射程 8、冻结时长 2→3s——身份仍是「散射+冰冻」，减速幅度 45% 被 STEP 断言锁死不动 */
  frost:   { name:'冰晶散射者', tier:'A', dmg:3.2,rate:2.0, mag:8,  reload:1.5, spread:.2,   pellets:6, speed:13, range:8,  size:.15, pierce:1, bounce:1, knock:4,   color:0xa0e8ff, sfx:'shotgun', price:50, frost:true, blurb:'六冰晶散射贯穿，冻结三秒' },
  arc:     { name:'雷暴发生器', tier:'A', dmg:7,  rate:3,   mag:14, reload:1.5, spread:.04,  pellets:1, speed:20, range:15, size:.15, pierce:0, bounce:0, knock:2,   color:0xc0e8ff, sfx:'laser',   price:52, arc:true, chain:3, chainFade:.72, blurb:'闪电链跳三个目标' },
  polaroid:{ name:'薛定谔的拍立得', tier:'A', dmg:6, rate:1.11, mag:4, reload:1.5, spread:0, pellets:1, speed:0, range:7.5, size:.2, pierce:99, bounce:0, knock:0, color:0xfff2d0, sfx:'shutter', price:56, polaroid:true, cone:1.25, blurb:'闪光冻结，伤害二倍结算' },
  gambler: { name:'赌徒的灾难', tier:'A', dmg:10, rate:3.33, mag:10, reload:0.5, spread:.015, pellets:1, speed:16, range:13, size:.18, pierce:0, bounce:0, knock:2, color:0xe8c15a, sfx:'gambler', price:57, gambler:true, blurb:'每次攻击抽一张牌，命运由牌决定' },
  jukebox:{ name:'过载点唱机', tier:'A', dmg:9, rate:3.6, mag:8, reload:1.6, spread:.02, pellets:1, speed:16, range:0, size:.18, pierce:99, bounce:99, knock:2, color:0x2a2438, sfx:'vinylShot', price:59, kind:'vinyl', jukebox:true, blurb:'黑胶弹射反弹 · 互撞搭建音波网' },
  dice:{ name:'悖论骰子', tier:'A', dmg:8, rate:3.6, mag:15, reload:1.5, spread:0, pellets:1, speed:30, range:35, size:.17, pierce:0, bounce:0, knock:2, color:0xd8cfe0, sfx:'diceStop', price:55, dice:true, blurb:'掷骰改判现实 · 连续同数扭曲时空' },
};
W.tiers = { D:['rusty','paperplane','hairdryer'], C:['smg','shotgun','ricochet'], B:['rifle','laser','hive','burst'], A:['plasma','rocket','rail','frost','arc','polaroid','gambler','jukebox','dice'] };
W.randomWeaponId = tier => {          // 宝箱/掉落用：遵守局外解锁（该阶无解锁武器时向低阶降级）
  const ok=id=>!G.meta || G.meta.unlocked(id);
  const order=['A','B','C','D'];
  let start=order.indexOf(tier); if(start<0) start=1;
  for(let i=start;i<order.length;i++){
    const list=(W.tiers[order[i]]||[]).filter(ok);
    if(list.length) return G.rng.pick(list);
  }
  return 'rusty';
};
/* heat/heatIdle/ventT/rHold：献给太阳的左轮专用（Heat 系统与 R 键双模状态） */
W.mktWeapon = id => { const def=Object.assign({}, W.defs[id]);
  const mm=(G.player&&G.player.st&&G.player.st.magMul)||1;   // 深渊共鸣·弹药亲和：弹匣乘区
  if(mm>1) def.mag=Math.ceil(def.mag*mm);
  return { def, id, ammo:def.mag, cool:0, reloading:false, reloadT:0, burstLeft:0, burstT:0, heat:0, heatIdle:0, ventT:0, rHold:0 }; };
W.activeVinyl = function(){ // 过载点唱机：在飞黑胶计数（性能红线 ≤16）
  let c=0; for(let i=0;i<MAXB;i++){ const b=this.bullets[i]; if(b.on&&b.team==='p'&&b.kind==='vinyl') c++; } return c;
};

/* ---------- 统一定价（单一来源：商店/掉落展示共用，禁止另写一套商店标价） ----------
   售价 = 品阶基准价 × 特修系数。特修由 def.price（历史标价字段）做确定性映射（±6%），
   同阶有价格层次、跨阶绝不倒挂：D≈17 < C≈39-42 < B≈70-78 < A≈122-138。 */
W.TIER_PRICE = { D:18, C:40, B:75, A:130 };
W.priceOf = function(def){
  const base = this.TIER_PRICE[def.tier] || 99;
  const mod = 1 + (((def.price || 0) % 7) - 3) * .02;
  return Math.max(1, Math.round(base * mod));
};

/* ---------- 弹幕池 ---------- */
const MAXB = 520;
W.bullets = [];
W.init = function(scene){
  this.bullets.length=0;
  for(let i=0;i<MAXB;i++){
    const mesh = new THREE.Mesh(G.boxGeo(.3,.3,.3), G.bmat(0xffffff));
    mesh.visible=false;
    const glow = new THREE.Sprite(G.pmats['a16777215']);
    glow.scale.set(.7,.7,1); glow.visible=false; mesh.add(glow);
    scene.add(mesh);
    this.bullets.push({ on:false, mesh, glow, x:0,z:0, vx:0,vz:0, ang:0, spd:0, dmg:0, size:.1,
      team:'p', pierce:0, bounce:0, knock:0, life:0, crit:false, kind:'', hits:null, dmgDecay:1, color:0xffffff, wid:'', hdmg:0 });
  }
};
W.clear = function(){ for(const b of this.bullets){ b.on=false; b.mesh.visible=false; } };

W.spawn = function(o){
  for(let i=0;i<MAXB;i++){
    const b=this.bullets[i];
    if(!b.on){
      b.on=true; b.team=o.team||'p';
      b.x=o.x; b.z=o.z; b.ang=o.ang; b.spd=o.spd;
      b.vx=Math.cos(b.ang)*b.spd; b.vz=Math.sin(b.ang)*b.spd;
      b.dmg=o.dmg; b.size=o.size||.12; b.pierce=o.pierce||0; b.bounce=o.bounce||0;
      b.knock=o.knock==null?2:o.knock; b.life=o.life||1;
      b.crit=!!o.crit; b.kind=o.kind||''; b.slow=!!o.slow;
      b.pin=o.pin||0;           // 悖论骰子 4 面：冻结时长（命中钉住 enemy.pinT）
      b.hdmg=o.hdmg||0;         // Boss 重击弹（2026-09-06）：命中玩家按 hp 结算——普通弹一律固定 1，
                                // b.dmg 在玩家判定处从来只是摆设；只有显式携带 hdmg 的 Boss 弹才按 2 hp（一整心）结算
      b.wid=o.wid||'';            // 武器图鉴统计：命中击杀归属（玩家子弹专用）
      b.dmgDecay=o.dmgDecay||1;   // 赌徒♠：穿透逐个衰减系数
      b.aj=o.aj===false?false:true;   // 小丑 Bullet Twist 受影响（特殊武器可经 def.affectedByJester 豁免）
      b.am=o.am===false?false:true;   // 磁铁怪 Magnetic Field 受影响
      b.hits = (b.pierce>0)? new Set() : null;
      b.color=o.color||0xffe9a0;
      const m=b.mesh;
      m.visible=true; m.position.set(b.x,.55,b.z);
      m.material = G.bmat(b.color);
      if(b.team==='e'||b.kind==='plasma'||b.kind==='bomb'){
        m.geometry = G.sphGeo(1,6); m.scale.setScalar(b.size);
      } else {
        m.geometry = G.boxGeo(1,1,1);
        const len = (b.kind==='laser'||b.kind==='rail')? 1.15 : (b.kind==='fork'? 1.15 : .45);
        m.scale.set(len, b.size, b.size);
        if(b.kind==='paper') m.scale.set(.5,.055,.3);  // 纸飞机：扁平纸片
        if(b.kind==='vinyl') m.scale.set(.5,.03,.5); // 黑胶唱片：扁平圆碟（俯视旋转成盘）
        m.rotation.set(0, -b.ang, 0);
      }
      if(b.kind==='rocket'||b.kind==='plasma'||b.kind==='bomb'||b.kind==='voidorb'){
        b.glow.material = G.pmat(b.color,'a'); b.glow.visible=true;
        const gs = b.kind==='rocket'?1.1:(b.kind==='bomb'?1.0:.8); b.glow.scale.set(gs,gs,1);
      } else b.glow.visible=false;
      // 暴击弹丸：金色辉光 + 更大拖尾（高价值目标可视化）
      if(b.crit && b.team==='p'){
        b.glow.material = G.pmat(0xffd23e,'a'); b.glow.visible=true;
        b.glow.scale.set(.9,.9,1);
      }
      return b;
    }
  }
  return null;
};
W.spawnPlayer = function(p, ang, def, wid, mul){
  // 薛定谔的拍立得：不走弹道，改由 PhotoSystem 释放一次扇形摄影闪光
  if(def.polaroid){ G.photo.fire(p, ang, def); return; }
  // 吹风机：按住持续吹风——锥形扇区推力+风压积累（WIND BURST）+撞墙冲击，不发射弹体
  if(def.hairdryer){
    const a=ang, reach=def.range;
    W._dryN=(W._dryN||0)+1;
    for(const e of G.enemies.list){
      if(e.dead||e.spawnT>0) continue;
      const d=G.dist(p.x,p.z,e.x,e.z);
      if(d>reach+e.r) continue;
      let da=G.angTo(p.x,p.z,e.x,e.z)-a; da=Math.atan2(Math.sin(da),Math.cos(da));
      if(Math.abs(da)>.55) continue;
      const w8=G.clamp(2.6/(e.r*2.4), .5, 1.6);          // 重量：体积越大越难吹
      const fall=d<1.8?1:(d<3.4?.7:.42);                 // 距离衰减
      const drift=1-Math.min(.35,(e._blowT||0)*.14);     // OVERDRIVE：持续吹风效率缓降
      const f=12*w8*fall*drift;                           // 重型吹风机：大幅加强锥形推力（吹飞距离 +~85%）
      e._blowT=(e._blowT||0)+1/6;
      e._pressT=(e._pressT||0)+1/5;
      if(e._pressT>=1.2){                                // WIND BURST：风压满格强力吹飞（约1.2s持续命中）
        e._pressT=0;
        e.vx+=Math.cos(a)*18*w8; e.vz+=Math.sin(a)*18*w8;   // WIND BURST：风压满格强力吹飞（推力 11→18，吹更远）
        G.fx.ring(e.x,.6,e.z,0x9fd8e8,1.3); G.audio.sfx('windBurst',{v:.6}); G.fx.shake(.12);
      } else {
        e.vx+=Math.cos(a)*f; e.vz+=Math.sin(a)*f;
      }
      // 撞墙冲击：紧贴推向方向的墙壁且速度够高 → IMPACT 额外伤害
      if((e._wallCd||0)<=0 && e.vx*e.vx+e.vz*e.vz>9 &&
         G.solidForMove(e.x+Math.cos(a)*(e.r+.18), e.z+Math.sin(a)*(e.r+.18))){
        e._wallCd=.6;
        G.hurtEnemy(e, 1, a+Math.PI, 0, true);
        G.fx.sparks(e.x,.5,e.z,0xc8d8e0); G.fx.shake(.07); G.audio.sfx('clank',{v:.5});
      }
      // 敌人互撞：被吹的敌人撞上另一只 → 双方小额冲击
      if((e._colCd||0)<=0){
        for(const o of G.enemies.list){
          if(o===e||o.dead) continue;
          if(G.dist(e.x,e.z,o.x,o.z)<e.r+o.r+.2){
            e._colCd=.9;
            o.vx+=Math.cos(a)*3.2; o.vz+=Math.sin(a)*3.2;
            G.hurtEnemy(o,.6, a, 1, true); G.hurtEnemy(e,.3, a+Math.PI, 0, true);
            G.fx.sparks((e.x+o.x)/2,.6,(e.z+o.z)/2,0x9fd8e8);
            break;
          }
        }
      }
    }
    // 气流视觉：沿扇区中线散布空气粒子
    const t=.6+Math.random()*reach*.75, pa=a+(Math.random()-.5)*.5;
    G.fx.particle(p.x+Math.cos(pa)*t,.5,p.z+Math.sin(pa)*t,
      {vx:Math.cos(a)*3,vy:.06,vz:Math.sin(a)*3,life:.24,color:0x9fd8e8,s0:.1,kind:'a'});
    if(W._dryN%4===0) G.fx.particle(p.x+Math.cos(a)*.5,.55,p.z+Math.sin(a)*.5,
      {vx:Math.cos(a)*5,vy:.1,vz:Math.sin(a)*5,life:.3,color:0xc8ecf4,s0:.14,kind:'a'});
    return;
  }
  // 赌徒的灾难：抽牌结算（Deck/花色效果/Joker/Streak 全在 gambler.js）
  if(def.gambler){ G.gambler.release(p, ang, def); return; }
  const pellets = def.pellets + p.st.pelletAdd;
  const dmgMul = p.curDmgMul() * (mul||1);   // 伤害倍率（道具/被动加成 × 武器专属倍率）
  // 特殊武器（激光/爆炸/电弧/追踪/弹射/摄影/骰子等）不受 Jester 弹道干扰与 Magnetron 磁吸；
  // 允许武器通过 def.affectedByJester/affectedByMagnetron=false 显式豁免
  const isSpecial = def.rocket||def.plasma||def.laser||def.rail||def.arc||def.paper||def.homing||def.polaroid||def.jukebox||def.dice||def.hairdryer||def.gambler;
  for(let i=0;i<pellets;i++){
    let a = ang;
    if(pellets>1 && def.spread>0) a += (i/(pellets-1)-.5)*2*def.spread + (Math.random()-.5)*def.spread*.5;
    else a += (Math.random()-.5)*def.spread;
    const crit = Math.random() < p.st.crit;
    const spd = def.speed * p.st.bulletSpdMul * (crit?1.12:1);
    this.spawn({
      team:'p', x:p.muzzleX, z:p.muzzleZ, ang:a, spd,
      dmg: def.dmg*dmgMul*(crit?(2.5*p.st.critMul):1)*(def.pellets>1?1:1),   // 碎甲晶石：暴击伤害乘区
      size:def.size, pierce:def.pierce+p.st.pierce, bounce:def.bounce+p.st.bounce,
      knock:def.knock, life: def.jukebox? 6 : (def.paper? 7.5 : (def.range>0 ? def.range/(def.speed*p.st.bulletSpdMul) : 3)),   // 点唱机：长航时黑胶（弹射循环）；纸飞机：长航时（加速+回航）
      crit, kind: def.kind || (def.rocket?'rocket':def.plasma?'plasma':def.laser?'laser':def.homing?'homing':def.rail?'rail':def.frost?'frost':def.arc?'arc':def.paper?'paper':''),
      color: def.color, slow: !!def.frost, wid: wid||'',
      dmgDecay: def.paper? .85 : undefined,       // 纸飞机：每穿透一个敌人伤害衰减
      aj: def.affectedByJester!==false && !isSpecial,    // Jester 干扰豁免（特殊弹种默认不受影响）
      am: def.affectedByMagnetron!==false && !isSpecial, // Magnetron 磁吸豁免
    });
  }
};

function impactFx(x,z,color){
  G.fx.sparks(x,.55,z,color);
  G.audio.sfx('clank',{v:.4});
}

/* 电弧链：从命中敌人跳向附近未链过的敌人，伤害逐跳衰减，特效为锯齿闪电线 */
W.chainLightning = function(src, dmg, hops, fade, fromX, fromZ){
  let cur=src, cx=fromX==null?src.x:fromX, cz=fromZ==null?src.z:fromZ;
  const chained=new Set([src]);
  for(let i=0;i<hops;i++){
    let best=null, bd=5.5*5.5;
    for(const e of G.enemies.list){
      if(e.dead||e.spawnT>0||chained.has(e)) continue;
      const d=G.dist2(cur.x,cur.z,e.x,e.z);
      if(d<bd){ bd=d; best=e; }
    }
    // 取 Boss 实例（G.boss 是模块对象 {active,spawn,update,hurt,clear}，实例在 .active 上）
    const boss=G.boss&&G.boss.active;
    if(boss && !boss.dead && !chained.has(boss)){
      const d=G.dist2(cur.x,cur.z,boss.x,boss.z);
      if(d<bd){ bd=d; best=boss; }
    }
    if(!best) break;
    G.fx.lightning(cx,.9,cz, best.x,.9,best.z, 0xcfe8ff, 5+((Math.random()*3)|0));
    G.hurtEnemy(best, dmg, Math.atan2(best.z-cz,best.x-cx), 2, true);
    G.audio.sfx('laser',{v:.35});
    chained.add(best);
    dmg*=fade; cx=best.x; cz=best.z; cur=best;
  }
};

/* 爆炸（玩家/敌人/桶共用）。dmg<=0 时为纯视觉演出 */
W.explode = function(x,z,r,dmg,src){
  G.fx.light(x,1,z,0xffa030,3.2,.3);
  // 双层冲击环（外环慢速扩散 + 内环快速消散）现代爆炸观感
  G.fx.ring(x,z,r*.8,0xffc060,.3);
  G.fx.ring(x,z,r*1.25,0xff7030,.5);
  G.fx.burst(x,.5,z,14,{color:0xffa030,spd:r*1.6,life:.4,s0:.22});
  G.fx.burst(x,.4,z,8,{color:0xff5020,spd:r,life:.55,s0:.3,kind:'m'});
  // 火花飞溅 + 地面余烬
  G.fx.burst(x,.6,z,6,{color:0xfff0a0,spd:r*2,life:.25,s0:.12,kind:'s'});
  for(let i=0;i<3;i++) G.fx.particle(x+(Math.random()-.5)*r, .08, z+(Math.random()-.5)*r, {vx:0,vy:.5,vz:0,life:.9,color:0x703820,kind:'m',s0:.16});
  G.fx.smoke(x,.6,z,6,true);
  G.fx.shake(.35); G.audio.sfx('explosion',{sz:r,crit:1});
  if(dmg<=0) return;
  // 伤害敌人（爆炸无视盾卫格挡）
  if(src!=='e'){
    for(const e of G.enemies.list){ if(e.dead) continue;
      const d=G.dist(x,z,e.x,e.z);
      if(d < r+e.r){ G.hurtEnemy(e, dmg*(1-d/(r+e.r)*.5), Math.atan2(e.z-z,e.x-x), 8, true); }
    }
    // 取 Boss 实例（同上，G.boss.active 才是本体）
    const boss=G.boss&&G.boss.active;
    if(boss && !boss.dead){
      const d=G.dist(x,z,boss.x,boss.z);
      if(d < r+boss.r) G.hurtBoss(dmg*(1-d/(r+boss.r)*.5));
    }
  }
  // 伤害玩家
  const p=G.player;
  if(p && !p.invulnT && p.rollT<=0){
    const d=G.dist(x,z,p.x,p.z);
    if(d < r+.4) p.hurt(dmg>10?2:1, Math.atan2(p.z-z,p.x-x));
  }
  // 引爆其他爆炸桶 / 破坏道具（倒序遍历，允许边遍历边删除）
  for(let i=G.props.length-1;i>=0;i--){
    const pr=G.props[i];
    if(pr.dead||pr.type!=='barrel') continue;
    if(G.dist(x,z,pr.x,pr.z) < r+.5) pr.fuse = pr.fuse==null? .12+Math.random()*.1 : pr.fuse;
  }
  for(let i=G.props.length-1;i>=0;i--){
    const pr=G.props[i];
    if(pr.dead||!pr.hp||pr.hp===Infinity) continue;
    if(G.dist(x,z,pr.x,pr.z) < r*.9) G.damageProp(pr, dmg, 0);
  }
};

/* ---------- 弹幕更新 ---------- */
W.update = function(dt){
  const p = G.player;
  for(let i=0;i<MAXB;i++){
    const b=this.bullets[i];
    if(!b.on) continue;
    // 被拍立得冻结的敌方弹幕：真暂停——移动/速度/生命周期/碰撞全部停住，恢复时原速原向
    if(b.photoT>0){
      b.photoT-=dt;
      if(b.photoT<=0) G.photo.unfreezeBullet(b);
      continue;
    }
    b.life -= dt;
    if(b.life<=0){
      if(b.kind==='rocket') W.explode(b.x,b.z,2.2,16,'p');
      if(b.kind==='plasma') W.explode(b.x,b.z,1.2,6,'p');
      if(b.kind==='bomb') W.explode(b.x,b.z,1.9,2,'e'); // 敌方投掷炸弹：只伤玩家
      b.on=false; b.mesh.visible=false; continue;
    }
    // 小丑 Bullet Twist：玩家普通实体弹进入干扰场 → 一次性偏转 15~35°（平滑、不改伤害与寿命）
    if(b.team==='p' && b.aj && !b._twisted && G._twistField){
      const _dx=b.x-G._twistField.x, _dz=b.z-G._twistField.z;
      if(_dx*_dx+_dz*_dz < G._twistField.r*G._twistField.r){
        b._twisted=true;
        b.ang += (Math.random()<.5?-1:1)*(0.26+Math.random()*.35);
        b.vx=Math.cos(b.ang)*b.spd; b.vz=Math.sin(b.ang)*b.spd;
        b.mesh.rotation.set(0,-b.ang,0);
        G.fx.sparks(b.x,.55,b.z,0xffc040);
      }
    }
    // 磁铁怪 Magnetic Field：玩家普通实体弹逐渐被吸向磁铁（转向率受限），接近则被吸收储能
    if(b.team==='p' && b.am && G._magField){
      const _dx2=G._magField.x-b.x, _dz2=G._magField.z-b.z;
      const _dd2=Math.hypot(_dx2,_dz2);
      if(_dd2 < G._magField.r && _dd2>1e-4){
        b.ang=G.angLerp(b.ang, Math.atan2(_dz2,_dx2), Math.min(1,3*dt));
        b.vx=Math.cos(b.ang)*b.spd; b.vz=Math.sin(b.ang)*b.spd;
        b.mesh.rotation.set(0,-b.ang,0);
        if(_dd2 < G._magField.rr){
          b.on=false; b.mesh.visible=false;
          if(G._magField.absorb) G._magField.absorb();
          continue;   // 已被磁铁吸收，跳过本发后续处理
        }
      }
    }
    // 追踪
    if(b.kind==='homing' && b.team==='p'){
      let best=null,bd=49;
      for(const e of G.enemies.list){ if(e.dead)continue; const d=G.dist2(b.x,b.z,e.x,e.z); if(d<bd){bd=d;best=e;} }
      // 取 Boss 实例（同上，G.boss.active 才是本体）
      const boss=G.boss&&G.boss.active;
      if(boss && !boss.dead){ const d=G.dist2(b.x,b.z,boss.x,boss.z); if(d<bd){bd=d;best=boss;} }
      if(best){
        const ta=G.angTo(b.x,b.z,best.x,best.z);
        b.ang = G.angLerp(b.ang, ta, Math.min(1,6*dt));
        b.vx=Math.cos(b.ang)*b.spd; b.vz=Math.sin(b.ang)*b.spd;
      }
    }
    // 虚空宝珠（第 3 层注视者）：敌方追踪弹——转向率刻意压低，垂直走位/翻滚可甩开
    else if(b.kind==='voidorb' && p && !p.dead){
      const ta=G.angTo(b.x,b.z,p.x,p.z);
      b.ang = G.angLerp(b.ang, ta, Math.min(1,2.2*dt));
      b.vx=Math.cos(b.ang)*b.spd; b.vz=Math.sin(b.ang)*b.spd;
    }
    // 纸飞机：飞行时间越长速度越快；末期自动回航（滑翔减速），回到玩家附近被"接住"返还一发弹药
    if(b.kind==='paper'){
      if(b.life>2.6){
        b.spd=Math.min(13, b.spd+3.2*dt);
        if(b.spd>8 && Math.random()<.35)
          G.fx.particle(b.x,.55,b.z,{vx:0,vy:.15,vz:0,life:.2,color:0xffffff,s0:.12,kind:'a'});   // 高速气流
      } else if(p && !p.dead){
        b.spd=Math.max(7, b.spd-8*dt);             // 回航滑翔减速
        b.ang=G.angLerp(b.ang, G.angTo(b.x,b.z,p.x,p.z), Math.min(1,4*dt));
        if(G.dist(b.x,b.z,p.x,p.z)<.9){
          b.on=false; b.mesh.visible=false;
          const w=p.weapons[p.curW];
          if(w && w.def.paper && !w.reloading) w.ammo=Math.min(w.def.mag,w.ammo+1);   // 「啪」接住
          G.audio.sfx('paperCatch',{v:.5});
          G.fx.burst(b.x,.6,b.z,5,{color:0xf2eedd,spd:1.6,life:.3,s0:.12});
          continue;
        }
      }
      b.vx=Math.cos(b.ang)*b.spd; b.vz=Math.sin(b.ang)*b.spd;
      b.mesh.rotation.z=Math.sin(b.life*14)*.22;   // 纸张轻摆
    }
    // 移动（子步进防穿透）
    const stepLen = b.spd*dt;
    const n = Math.max(1, Math.ceil(stepLen/0.35));
    let dead=false;
    for(let s=0;s<n && !dead;s++){
      const nx = b.x + b.vx*dt/n, nz = b.z + b.vz*dt/n;
      // 墙体/门/隐藏裂纹墙
      const solid = G.solidForBullet(nx,nz);
      if(solid){
        const tile = G.tileAt(nx,nz);
        if(tile && tile.secret && !tile.secret.broken){
          // 射击裂纹墙
          tile.secret.crackHp -= 1;
          G.fx.sparks(nx,.8,nz,0x9a8a70);
          G.audio.sfx('clank',{v:.5});
          if(tile.secret.crackHp<=0) G.game.breakSecretDoor(tile.secret);
          dead=true; break;
        }
        if(b.bounce>0 || b.kind==='paper'){
          if(b.bounce>0) b.bounce--;               // 纸飞机回航阶段不消耗反弹（软墙反射，直到被接住/寿命耗尽）
          const hitX = G.solidForBullet(nx,b.z), hitZ = G.solidForBullet(b.x,nz);
          if(hitX&&!hitZ){ b.vx=-b.vx; } else if(hitZ&&!hitX){ b.vz=-b.vz; }
          else { b.vx=-b.vx; b.vz=-b.vz; }
          b.ang=Math.atan2(b.vz,b.vx);
          if(b.kind!=='plasma'){ b.mesh.rotation.set(0,-b.ang,0); }
          if(b.kind==='vinyl'){ G.fx.ring(nx,nz,.55,0x3ae8ff,.3); G.audio.sfx('vinylBounce',{v:.38}); }  // 黑胶撞墙：音波涟漪
          else impactFx(nx,nz,b.color);
          continue;
        }
        if(b.kind==='rocket'){ W.explode(b.x,b.z,2.4,26,'p'); }
        else if(b.kind==='plasma'){ W.explode(b.x,b.z,1.4,9,'p'); }
        else impactFx(nx,nz,b.color);
        dead=true; break;
      }
      b.x=nx; b.z=nz;
      // 道具掩体（翻倒的桌子只挡敌方子弹——玩家的可靠掩体，不挡自己的输出）
      for(const pr of G.props){
        if(pr.dead || !pr.blocksBullets) continue;
        if(pr.type==='table' && pr.flipped && b.team==='p') continue;
        const dx=pr.x-b.x, dz=pr.z-b.z;
        if(dx*dx+dz*dz < (pr.r+b.size)*(pr.r+b.size)){
          G.damageProp(pr, b.dmg, b.ang);
          if(b.kind==='rocket'){ W.explode(b.x,b.z,2.4,26,'p'); dead=true; }
          else if(b.kind==='plasma'){ W.explode(b.x,b.z,1.4,9,'p'); dead=true; }
          else if(b.pierce>0 && pr.hp<=0){ /* 穿过已破坏物 */ }
          else { impactFx(b.x,b.z,b.color); dead=true; }
          break;
        }
      }
      if(dead) break;
      // 实体碰撞
      if(b.team==='p'){
        for(const e of G.enemies.list){
          if(e.dead || e.spawnT>0) continue;
          if(b.hits && b.hits.has(e)) continue;
          const dx=e.x-b.x, dz=e.z-b.z, rr=e.r+b.size;
          if(dx*dx+dz*dz < rr*rr){
            G.hurtEnemy(e, b.dmg, b.ang, b.knock);
            if(e.dead && b.wid && G.meta) G.meta.onWeaponKill(b.wid);   // 武器图鉴：直击击杀归属
            if(b.slow) e.slowT=3; // 冰霜弹：命中减速（2026-09-06 冰晶重做：2→3s）
            // 赌徒的灾难：花色牌命中附加（♥吸血 / ♦金币）与穿透衰减
            if(b.kind==='heart' && G.player && !G.player.dead) G.player.heal(1);
            if(b.kind==='diamond' && Math.random()<.35) G.spawnPickup('money', b.x, b.z);
            if(b.kind==='vinyl'){ G.fx.ring(b.x,b.z,.5,0x3ae8ff,.25); G.fx.shake(.03); }  // 黑胶切人：低频冲击（不打断弹道，pierce 99 继续飞行）
            // 悖论骰子 4 面：命中敌人 → 现实冻结（停止行动 + 冰晶钉身，设计稿四「禁止行动」）
            if(b.kind==='dice4'){
              e.pinT = b.pin || 1.2;
              e.pinX=e.x; e.pinZ=e.z;
              const fm=new THREE.Mesh(G.boxGeo(.08,1.0,.08), G.bmat(0x8fd0ff));
              fm.rotation.x=.4; fm.position.set(e.x,1.0,e.z);
              G.scene.add(fm); e._iceMesh=fm;
              G.audio.sfx('diceFreeze',{v:.6});
              G.fx.sparks(e.x,.9,e.z,0x8fd0ff);
              G.fx.ring(e.x,e.z,.7,0x8fd0ff,.35);
              b.on=false; b.mesh.visible=false; dead=true;
              break;
            }
            if(b.dmgDecay!==1) b.dmg*=b.dmgDecay;
            // 电弧链：命中后闪电跳向附近敌人
            if(b.kind==='arc'){
              G.fx.lightning(b.x,.9,b.z, e.x,.9,e.z, 0xdff0ff, 5+((Math.random()*3)|0));
              G.fx.light(e.x,1,e.z,0xbfe0ff,2,.12);
              W.chainLightning(e, b.dmg*.72, 3, .72, e.x, e.z);
              dead=true;
            }
            else if(b.hits) b.hits.add(e);
            if(b.kind==='rocket'){ W.explode(b.x,b.z,2.4,26+b.dmg*.3,'p'); dead=true; }
            else if(b.kind==='plasma'){ W.explode(b.x,b.z,1.4,9,'p'); dead=true; }
            else if(b.pierce>0){ b.pierce--; }
            else dead=true;
            break;
          }
        }
        // 取 Boss 实例（G.boss 是模块对象，实例在 .active —— 修复 BUG-001 玩家打不到 Boss）
        const e=G.boss&&G.boss.active;
        if(!dead && e && !e.dead && e.spawnT<=0){
          if(b.hits && b.hits.has(e)) continue;
          const dx=e.x-b.x, dz=e.z-b.z, rr=e.r+b.size;
          if(dx*dx+dz*dz < rr*rr){
            G.hurtBoss(b.dmg * (e.stunT>0?1.5:1));
            // 赌徒的灾难：花色命中附加与穿透衰减（对 Boss 同样生效）
            if(b.kind==='heart' && G.player && !G.player.dead) G.player.heal(1);
            if(b.kind==='diamond' && Math.random()<.35) G.spawnPickup('money', b.x, b.z);
            if(b.dmgDecay!==1) b.dmg*=b.dmgDecay;
            if(b.hits) b.hits.add(e);
            if(b.kind==='rocket'){ W.explode(b.x,b.z,2.4,26,'p'); dead=true; }
            else if(b.kind==='plasma'){ W.explode(b.x,b.z,1.4,9,'p'); dead=true; }
            else if(b.pierce>0){ b.pierce--; }
            else dead=true;
          }
        }
      } else if(p && !p.dead){
        const bypass=b.kind==='orbring';   // 环形放射者：所有弹幕独立结算伤害，无视受击无敌帧
        if((bypass || !p.invulnT) && p.rollT<=0){
          const dx=p.x-b.x, dz=p.z-b.z, rr=.42+b.size;
          if(dx*dx+dz*dz < rr*rr){
            p.hurt(b.hdmg||1, b.ang, null, bypass);
            G.fx.sparks(b.x,.55,b.z,0xff5040);
            dead=true; break;
          }
        }
      }
    }
    if(dead || b.life<=0){ b.on=false; b.mesh.visible=false; continue; }
    b.mesh.position.set(b.x,.55,b.z);
    if(b.kind==='homing'||b.kind==='plasma'){
      b.mesh.rotation.y += dt*14;
    }
    // 黑胶：飞行自转 + RGB 拖尾（红/蓝双粒子垂直错位，3D 色差观感）
    if(b.kind==='vinyl'){
      b.mesh.rotation.z=Math.sin(b.life*26)*.28;   // 唱片翻转暗示高速旋转
      if(Math.random()<.8){
        const cxx=Math.cos(b.ang), czz=Math.sin(b.ang), pxx=-czz, pzz=cxx;
        G.fx.particle(b.x-cxx*.16-pxx*.1,.5,b.z-czz*.16-pzz*.1,{vx:0,vy:.05,vz:0,life:.22,color:0xff5060,s0:.08,kind:'a'});
        G.fx.particle(b.x-cxx*.16+pxx*.1,.5,b.z-czz*.16+pzz*.1,{vx:0,vy:.05,vz:0,life:.22,color:0x40c8ff,s0:.08,kind:'a'});
      }
    }
    // 弹道拖尾：高亮武器（rail/laser/frost）与炸弹留下光痕
    else if(b.kind==='rail'||b.kind==='laser'||b.kind==='frost'||b.kind==='bomb'||b.kind==='voidorb'){
      G.fx.particle(b.x,.55,b.z,{vx:0,vy:.15,vz:0,life:.16,color:b.color,s0:b.size*.85,kind:'a'});
    } else if(b.team==='p' && Math.random()<.3){
      /* 敌方子弹不发射拖尾粒子（2026-09-06 第五层黑化重制）：纯黑底上全屏弹幕拖尾
         叠成噪声汤淹没敌人；敌方子弹本就有 glow 光斑精灵，可读性不受影响。
         玩家子弹拖尾保留（低弹量高辨识）。 */
      G.fx.particle(b.x,.55,b.z,{vx:0,vy:.1,vz:0,life:.09,color:b.color,s0:b.size*.5,kind:'a'});
    }
    if(b.kind==='bomb'){
      // 落点预警：炸弹飞行期间地面红圈闪烁
      G.fx.holdLight('bomb'+i, b.x,.8,b.z, 0xff3020, 1.2);
    }
    if(b.kind==='rocket'){
      G.fx.holdLight('bl'+i, b.x,.7,b.z, 0xff8040, 1.8);
      if(Math.random()<.5) G.fx.particle(b.x,.5,b.z,{vx:(Math.random()-.5),vy:.5,vz:(Math.random()-.5),life:.35,color:0x908880,kind:'m',s0:.2});
    }
  }
  // 过载点唱机：黑胶共振系统主入口（共振吸附/近共振提示/精确碰撞入网，核心逻辑全部在 js/jukebox.js）
  if(G.jukebox) G.jukebox.stepVinyl();
};

G.weapons = W;
})();
