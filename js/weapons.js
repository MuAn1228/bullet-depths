/* 弹膛深渊 - 武器定义与弹幕系统 */
'use strict';
(function(){
const W = {};

/* ---------- 武器表 ---------- */
W.defs = {
  rusty:   { name:'生锈左轮', tier:'D', dmg:5,   rate:3.8, mag:6,  reload:1.0, spread:.035, pellets:1, speed:17, range:12, size:.13, pierce:0, bounce:0, knock:3, color:0xffe9a0, sfx:'pistol',  price:0 },
  smg:     { name:'蜂群冲锋枪', tier:'C', dmg:2.4, rate:11,  mag:32, reload:1.3, spread:.13,  pellets:1, speed:15, range:10, size:.11, pierce:0, bounce:0, knock:1, color:0xffd070, sfx:'smg',     price:30 },
  shotgun: { name:'双管粉碎者', tier:'C', dmg:2.8, rate:1.7, mag:2,  reload:1.5, spread:.19,  pellets:6, speed:13, range:6.5,size:.12, pierce:0, bounce:0, knock:7, color:0xffa060, sfx:'shotgun', price:32 },
  ricochet:{ name:'弹跳先生', tier:'C', dmg:6,   rate:4,   mag:12, reload:1.2, spread:.05,  pellets:1, speed:15, range:11, size:.14, pierce:0, bounce:3, knock:3, color:0x50ffa0, sfx:'pistol',  price:34 },
  rifle:   { name:'猎兽步枪', tier:'B', dmg:13,  rate:1.7, mag:5,  reload:1.5, spread:.012, pellets:1, speed:25, range:16, size:.16, pierce:2, bounce:0, knock:5, color:0xd0e8ff, sfx:'rifle',   price:40 },
  laser:   { name:'光棱射线', tier:'B', dmg:1.6, rate:22,  mag:44, reload:1.6, spread:.008, pellets:1, speed:27, range:7.5,size:.10, pierce:3, bounce:0, knock:.5, color:0x50f0ff, sfx:'laser',   price:42, laser:true },
  hive:    { name:'追踪蜂巢', tier:'B', dmg:3.4, rate:7,   mag:24, reload:1.7, spread:.3,   pellets:1, speed:8,  range:11, size:.13, pierce:0, bounce:0, knock:1.5, color:0xffd23e, sfx:'bee',     price:40, homing:true },
  boomer:  { name:'回旋刃轮', tier:'B', dmg:7,   rate:2.2, mag:3,  reload:1.2, spread:0,   pellets:1, speed:11, range:0,  size:.2,  pierce:99,bounce:0, knock:4, color:0xc0c0d0, sfx:'boomer',  price:38, boomerang:true },
  plasma:  { name:'等离子爆发', tier:'A', dmg:9,  rate:2.2, mag:8,  reload:1.8, spread:.02,  pellets:1, speed:7,  range:12, size:.26, pierce:0, bounce:2, knock:5,   color:0xc060ff, sfx:'plasma',  price:48, plasma:true, splash:1.4, splashDmg:6 },
  rocket:  { name:'毁灭者火箭筒', tier:'A', dmg:26, rate:0.8, mag:1,  reload:1.9, spread:0,   pellets:1, speed:9.5,range:14, size:.3,  pierce:0, bounce:0, knock:9,   color:0xff7040, sfx:'rocket',  price:50, rocket:true, splash:2.4, splashDmg:16 },
  burst:   { name:'三连发卡宾', tier:'B', dmg:5,  rate:4.2, mag:21, reload:1.4, spread:.03,  pellets:1, speed:19, range:14, size:.13, pierce:1, bounce:0, knock:2,   color:0xd0ff90, sfx:'rifle',   price:38, burst:3, burstGap:.07 },
  flame:   { name:'地狱喷灯', tier:'B', dmg:1.15,rate:13, mag:60, reload:1.9, spread:.3,   pellets:1, speed:8.5,range:3.4,size:.24, pierce:2, bounce:0, knock:.4,  color:0xff7020, sfx:'smg',     price:42, flame:true },
  rail:    { name:'磁轨狙击炮', tier:'A', dmg:22, rate:1.1, mag:3,  reload:1.7, spread:0,   pellets:1, speed:55, range:19, size:.17, pierce:99,bounce:0, knock:6,   color:0x80f0ff, sfx:'rifle',   price:52, rail:true },
  frost:   { name:'冰晶散射者', tier:'A', dmg:2.3,rate:1.8, mag:6,  reload:1.6, spread:.22,  pellets:5, speed:12, range:7,  size:.14, pierce:0, bounce:1, knock:3,   color:0xa0e8ff, sfx:'shotgun', price:50, frost:true },
  arc:     { name:'雷暴发生器', tier:'A', dmg:7,  rate:3,   mag:14, reload:1.5, spread:.04,  pellets:1, speed:20, range:15, size:.15, pierce:0, bounce:0, knock:2,   color:0xc0e8ff, sfx:'laser',   price:52, arc:true, chain:3, chainFade:.72 },
  orbit:   { name:'环星刃环', tier:'A', dmg:4,  rate:0.9, mag:4,  reload:1.6, spread:0,   pellets:3,speed:0,  range:0,  size:.2,  pierce:99,bounce:0, knock:2,   color:0xc070ff, sfx:'plasma',  price:54, orbit:true, orbitDur:6, orbitRad:1.9 },
};
W.tiers = { D:['rusty'], C:['smg','shotgun','ricochet'], B:['rifle','laser','hive','boomer','burst','flame'], A:['plasma','rocket','rail','frost','arc','orbit'] };
W.randomWeaponId = tier => G.rng.pick(W.tiers[tier]||W.tiers.C);
W.mktWeapon = id => { const def=Object.assign({}, W.defs[id]); return { def, ammo:def.mag, cool:0, reloading:false, reloadT:0, burstLeft:0, burstT:0 }; };

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
      team:'p', pierce:0, bounce:0, knock:0, life:0, crit:false, kind:'', hits:null, retPhase:0, color:0xffffff });
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
      b.crit=!!o.crit; b.kind=o.kind||''; b.retPhase=0; b.slow=!!o.slow;
      b.orbitAng=o.orbitAng||0; b.orbitRad=o.orbitRad||1.9; b.hitCd=o.hitCd||{}; // orbit:环绕刃角度/半径/每敌人命中冷却
      b.hits = (b.pierce>0)? new Set() : null;
      b.color=o.color||0xffe9a0;
      const m=b.mesh;
      m.visible=true; m.position.set(b.x,.55,b.z);
      m.material = G.bmat(b.color);
      if(b.team==='e'||b.kind==='plasma'||b.kind==='flame'||b.kind==='bomb'||b.kind==='orbit'){
        m.geometry = G.sphGeo(1,6); m.scale.setScalar(b.size);
      } else {
        m.geometry = G.boxGeo(1,1,1);
        const len = (b.kind==='laser'||b.kind==='rail')? 1.15 : .45;
        m.scale.set(len, b.size, b.size);
        m.rotation.set(0, -b.ang, 0);
      }
      if(b.kind==='rocket'||b.kind==='plasma'||b.kind==='bomb'){
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
W.spawnPlayer = function(p, ang, def){
  // 环星刃环：一次扳机生成 3 枚环绕刃（均分相位，绕玩家公转）
  if(def.orbit){
    for(let i=0;i<def.pellets;i++){
      this.spawn({
        team:'p', x:p.x, z:p.z, ang:0, spd:0,
        dmg: def.dmg*p.curDmgMul(),
        size:def.size, pierce:99, bounce:0, knock:def.knock,
        life:def.orbitDur, crit:false, kind:'orbit', color:def.color,
        orbitAng: i/def.pellets*G.TAU, orbitRad:def.orbitRad||1.9, hitCd:{},
      });
    }
    return;
  }
  const pellets = def.pellets + p.st.pelletAdd;
  const dmgMul = p.curDmgMul();
  for(let i=0;i<pellets;i++){
    let a = ang;
    if(pellets>1 && def.spread>0) a += (i/(pellets-1)-.5)*2*def.spread + (Math.random()-.5)*def.spread*.5;
    else a += (Math.random()-.5)*def.spread;
    const crit = Math.random() < p.st.crit;
    const spd = def.speed * p.st.bulletSpdMul * (crit?1.12:1);
    this.spawn({
      team:'p', x:p.muzzleX, z:p.muzzleZ, ang:a, spd,
      dmg: def.dmg*dmgMul*(crit?2.5:1)*(def.pellets>1?1:1),
      size:def.size, pierce:def.pierce+p.st.pierce, bounce:def.bounce+p.st.bounce,
      knock:def.knock, life: def.range>0 ? def.range/(def.speed*p.st.bulletSpdMul) : 3,
      crit, kind: def.rocket?'rocket':def.plasma?'plasma':def.laser?'laser':def.homing?'homing':def.boomerang?'boomerang':def.flame?'flame':def.rail?'rail':def.frost?'frost':def.arc?'arc':'',
      color: def.color, slow: !!def.frost,
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
  G.fx.shake(.35); G.audio.sfx('explosion');
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
    b.life -= dt;
    if(b.life<=0){
      if(b.kind==='rocket') W.explode(b.x,b.z,2.2,16,'p');
      if(b.kind==='plasma') W.explode(b.x,b.z,1.2,6,'p');
      if(b.kind==='bomb') W.explode(b.x,b.z,1.9,2,'e'); // 敌方投掷炸弹：只伤玩家
      b.on=false; b.mesh.visible=false; continue;
    }
    // 环绕星刃：不直线飞行，绕玩家公转，独立碰撞判定（带每敌人命中冷却）
    if(b.kind==='orbit'){
      b.orbitAng += 4.2*dt;
      b.x = p.x + Math.cos(b.orbitAng)*b.orbitRad;
      b.z = p.z + Math.sin(b.orbitAng)*b.orbitRad;
      b.mesh.position.set(b.x,.55,b.z);
      b.mesh.rotation.y += dt*20;
      // 拖尾
      if(Math.random()<.7) G.fx.particle(b.x,.55,b.z,{vx:0,vy:.2,vz:0,life:.2,color:b.color,s0:b.size*.8,kind:'a'});
      // 碰撞（每敌人 0.4s 冷却，可反复刮伤）
      for(const e of G.enemies.list){
        if(e.dead||e.spawnT>0) continue;
        if((b.hitCd[e.uid]||0) > 0) continue;
        const rr=e.r+b.size;
        if(G.dist2(b.x,b.z,e.x,e.z) < rr*rr){
          G.hurtEnemy(e, b.dmg, Math.atan2(e.z-p.z,e.x-p.x), b.knock);
          b.hitCd[e.uid]=.4;
          G.fx.sparks(b.x,.6,b.z,b.color);
        }
      }
      // 取 Boss 实例（同上，G.boss.active 才是本体）
      const boss=G.boss&&G.boss.active;
      if(boss && !boss.dead){
        const rr=boss.r+b.size;
        if((b.hitCd['boss']||0)<=0 && G.dist2(b.x,b.z,boss.x,boss.z)<rr*rr){
          G.hurtBoss(b.dmg);
          b.hitCd['boss']=.4;
          G.fx.sparks(b.x,.8,b.z,b.color);
        }
      }
      for(const k in b.hitCd) b.hitCd[k]=Math.max(0,b.hitCd[k]-dt);
      continue; // 跳过常规移动/碰撞
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
    // 回旋镖
    if(b.kind==='boomerang'){
      if(b.retPhase===0){
        b.spd *= (1-2.2*dt);
        if(b.spd<2){ b.retPhase=1; b.hits && b.hits.clear(); }
      } else {
        const ta=G.angTo(b.x,b.z,p.x,p.z);
        b.spd = Math.min(16, b.spd+18*dt);
        b.ang = G.angLerp(b.ang,ta,Math.min(1,8*dt));
        if(G.dist(b.x,b.z,p.x,p.z)<1){ b.on=false; b.mesh.visible=false; continue; }
      }
      b.vx=Math.cos(b.ang)*b.spd; b.vz=Math.sin(b.ang)*b.spd;
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
        if(b.bounce>0){
          b.bounce--;
          const hitX = G.solidForBullet(nx,b.z), hitZ = G.solidForBullet(b.x,nz);
          if(hitX&&!hitZ){ b.vx=-b.vx; } else if(hitZ&&!hitX){ b.vz=-b.vz; }
          else { b.vx=-b.vx; b.vz=-b.vz; }
          b.ang=Math.atan2(b.vz,b.vx);
          if(b.kind!=='boomerang'&&b.kind!=='plasma'){ b.mesh.rotation.set(0,-b.ang,0); }
          impactFx(nx,nz,b.color);
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
            if(b.slow) e.slowT=2; // 冰霜弹：命中减速
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
            if(b.hits) b.hits.add(e);
            if(b.kind==='rocket'){ W.explode(b.x,b.z,2.4,26,'p'); dead=true; }
            else if(b.kind==='plasma'){ W.explode(b.x,b.z,1.4,9,'p'); dead=true; }
            else if(b.pierce>0){ b.pierce--; }
            else dead=true;
          }
        }
      } else if(p && !p.dead){
        if(!p.invulnT && p.rollT<=0){
          const dx=p.x-b.x, dz=p.z-b.z, rr=.42+b.size;
          if(dx*dx+dz*dz < rr*rr){
            p.hurt(1, b.ang);
            G.fx.sparks(b.x,.55,b.z,0xff5040);
            dead=true; break;
          }
        }
      }
    }
    if(dead || b.life<=0){ b.on=false; b.mesh.visible=false; continue; }
    b.mesh.position.set(b.x,.55,b.z);
    if(b.kind==='homing'||b.kind==='boomerang'||b.kind==='plasma'||b.kind==='flame'){
      b.mesh.rotation.y += dt*14;
    }
    // 弹道拖尾：高亮武器（rail/laser/flame/frost）与炸弹留下光痕
    if(b.kind==='rail'||b.kind==='laser'||b.kind==='flame'||b.kind==='frost'||b.kind==='bomb'){
      G.fx.particle(b.x,.55,b.z,{vx:0,vy:.15,vz:0,life:.16,color:b.color,s0:b.size*.85,kind:'a'});
    } else if(Math.random()<.3){
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
};

G.weapons = W;
})();
