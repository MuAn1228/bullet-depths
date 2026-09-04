/* 弹幕深渊 - 过载点唱机：黑胶弹射 + 共振吸附 + 节点网络 + FULL OVERLOAD
   ===== 核心机制（2026-09-04 重构：BLACK VINYL NETWORK SYSTEM）=====
   - stepVinyl()   每帧黑胶系统主入口：RESONANCE ASSIST（<1.3 轻微吸附）
                   → NEAR RESONANCE（<1.6 RGB 提示）→ 精确碰撞（<0.45 真实共振）
   - resonance()   碰撞点 = Resonance Origin；两个 Node 沿碰撞前速度方向分离生成
                   （MIN_NODE_D=3，速度越高分离越大，上限 6；避墙/避障/避已有节点）
   - addNode()     节点入网（上限 MAX_NODE=6）；满网时下一次入网 → FULL OVERLOAD
   - vinylHitNode()唱片撞现存节点：未满网 → 节点升级（Lv1~5）+ 网络扩张新节点；满网 → BURST
   - rebuildBeams()CONNECTIVITY + LONG EDGE PRIORITY：长边优先 + 连通性补边 + 度数≤3
   - _damageTick() 线上敌人 0.18s tick 伤害 × 质量倍率 × 交叉加成（CROSS/PERFECT）
   - _corePulse()  NETWORK CORE：≥3 节点几何中心微弱音波脉冲
   - _triggerOverload() FULL OVERLOAD 三阶段：CHARGE → LOCK → BASS DROP（SONIC BURST）
   - aimAssist()   发射轨迹轻微修正（≤10°），帮助完成共振但绝不代瞄
   - clear()       换房/清场（game.cleanupDynamic / onRoomEnter 调用）+ 还原 Club 灯光
   所有伤害走 G.hurtEnemy / G.hurtBoss；性能红线（设计稿三十三）：vinyl≤16 /
   node≤6 / beam≤8，线几何预分配逐帧覆盖，无每帧建对象。 */
'use strict';
(function(){
const MAX_NODE=6, MAX_BEAM=8, NODE_LIFE=8, TICK=.18, TICK_DMG=2.5,
      BURST_DMG=12, BOSS_BURST=24, NODE_R=.55, CLUB_F=.82, WAVE_N=24,
      VINYL_CAP=16,        // 在飞黑胶上限（玩家可同时布置的唱片数）
      COLLIDE_R=.45,       // 真实碰撞半径（保留：黑胶真实碰撞为主要视觉表现）
      ASSIST_R=1.3,        // RESONANCE ASSIST：吸附半径（比碰撞宽松，让共振更容易触发）
      NEAR_R=1.6,          // NEAR RESONANCE：近共振提示半径（未撞上也"差一点"）
      TRAJ_MAX=.175,       // 轨迹修正最大偏转（10°≈0.175rad，绝不能做成追踪弹）
      MIN_NODE_D=3.0,      // 节点最小间距（不足则沿碰撞速度方向外扩）
      MAX_NODE_D=6.0,      // 节点最大分离（高速交叉碰撞用）
      MIN_BEAM_LEN=2.5;    // 最小波束长度（短于它的边不产生普通 Beam，除非无替代）

/* 点到线段距离（共振线伤害判定） */
function segDist(px,pz, ax,az, bx,bz){
  const dx=bx-ax, dz=bz-az;
  const l2=dx*dx+dz*dz;
  const t=l2>0? G.clamp(((px-ax)*dx+(pz-az)*dz)/l2,0,1) : 0;
  return G.dist(px,pz, ax+dx*t, az+dz*t);
}

const J = {
  nodes:[], beams:[], _tick:0, _dark:false, _darkBase:1,
  _ol:null,              // FULL OVERLOAD 三阶段状态机 {phase,t,nodes,beams,x,z}
  _coreT:0, _nearT:0,

  /* 黑胶真实碰撞半径判定（<0.45），纯函数供自测直接调用 */
  collide(x1,z1,x2,z2){ return G.dist2(x1,z1,x2,z2) < COLLIDE_R*COLLIDE_R; },

  /* 空场清理：节点/共振线移除 + FULL OVERLOAD 中止 + Club 灯光还原（游戏钩子调用） */
  clear(){
    if(this._ol){ for(const n of this._ol.nodes) if(n.mesh) G.scene.remove(n.mesh); for(const b of this._ol.beams){ if(b.line) G.scene.remove(b.line); if(b.lineR) G.scene.remove(b.lineR); } this._ol=null; }
    for(const n of this.nodes) if(n.mesh) G.scene.remove(n.mesh);
    this.nodes.length=0;
    for(const b of this.beams){ if(b.line) G.scene.remove(b.line); if(b.lineR) G.scene.remove(b.lineR); }
    this.beams.length=0;
    this._coreT=0; this._nearT=0;
    if(this._dark){ const L=G.lights&&G.lights.ambient; if(L) L.intensity=this._darkBase; this._dark=false; }
  },

  /* ---------- 每帧黑胶系统主入口（weapons.js 尾部调用） ----------
     1) RESONANCE ASSIST：两张玩家黑胶距离 <1.3 且正在靠近 → 双向轻微音波吸引
        （不是瞬移、不自动生成节点，只是"被声音吸到一起"）
     2) NEAR RESONANCE：距离 <1.6 未碰撞 → 两唱片间 RGB 电弧提示，进入高度易共振态
     3) 精确碰撞 <0.45 → 真实共振：两弹离场，按速度方向生成两个分离节点 */
  stepVinyl(){
    if(this._ol) return;                       // FULL OVERLOAD 演出期间暂停入网
    const bs=G.weapons.bullets;
    const vs=[];
    for(let i=0;i<bs.length;i++){ const b=bs[i]; if(b.on&&b.team==='p'&&b.kind==='vinyl') vs.push(b); }
    if(vs.length<2) return;
    // ① RESONANCE ASSIST：轻微吸附（一帧最多对一对生效，防连锁）
    for(let i=0;i<vs.length;i++){
      for(let j=i+1;j<vs.length;j++){
        const a=vs[i], b=vs[j];
        const d2=G.dist2(a.x,a.z,b.x,b.z);
        if(d2 < ASSIST_R*ASSIST_R){
          // 相对运动方向合理判定：二者正在靠近才吸附（刚弹开的不吸）
          const nx=b.x-a.x, nz=b.z-a.z, nl=Math.sqrt(d2)||1;
          const approach=((b.vx-a.vx)*nx+(b.vz-a.vz)*nz)/nl;
          if(approach>0){
            const da=G.angTo(a.x,a.z,b.x,b.z), db=G.angTo(b.x,b.z,a.x,a.z);
            const k=Math.min(1, 3.4*(1/60));   // 弱修正：只帮助"差一点"的完成共振
            a.ang=G.angLerp(a.ang, da, k); a.vx=Math.cos(a.ang)*a.spd; a.vz=Math.sin(a.ang)*a.spd;
            b.ang=G.angLerp(b.ang, db, k); b.vx=Math.cos(b.ang)*b.spd; b.vz=Math.sin(b.ang)*b.spd;
            if(this._nearT<=0){ G.audio.sfx('vinylAttract',{v:.35}); this._nearT=.35; }
          }
        }
      }
    }
    // ② NEAR RESONANCE：近共振提示（RGB 电弧粒子，节流）
    this._nearT=Math.max(0,this._nearT-1/60);
    if(Math.random()<.8){
      for(let i=0;i<vs.length;i++){
        for(let j=i+1;j<vs.length;j++){
          const a=vs[i], b=vs[j];
          const d2=G.dist2(a.x,a.z,b.x,b.z);
          if(d2<NEAR_R*NEAR_R && d2>=COLLIDE_R*COLLIDE_R){
            const t=Math.random();
            const px=a.x+(b.x-a.x)*t, pz=a.z+(b.z-a.z)*t;
            G.fx.particle(px,.5,pz,{vx:0,vy:.06,vz:0,life:.15,color:Math.random()<.5?0xff5060:0x40c8ff,s0:.06,kind:'a'});
            if(Math.random()<.02) G.audio.sfx('vinylNear',{v:.3});
          }
        }
      }
    }
    // ③ 精确碰撞 → 真实共振（一帧最多结算一对，防连锁瞬爆）
    for(let i=0;i<vs.length;i++){
      for(let j=i+1;j<vs.length;j++){
        const a=vs[i], b=vs[j];
        if(!a.on || !b.on) continue;
        if(this.collide(a.x,a.z,b.x,b.z)){
          a.on=false; a.mesh.visible=false;
          b.on=false; b.mesh.visible=false;
          this.resonance(a,b);
          break;
        }
      }
    }
  },

  /* ---------- 真实共振：按碰撞前速度方向生成两个分离节点（与碰撞点解耦） ---------- */
  resonance(a,b){
    const ox=(a.x+b.x)/2, oz=(a.z+b.z)/2;      // Resonance Origin
    const da=Math.atan2(a.vz,a.vx), db=Math.atan2(b.vz,b.vx);
    const relS=Math.hypot(b.vx-a.vx, b.vz-a.vz);
    // 速度越高分离越大：低速≈3 / 中速≈4 / 高速≈5~6（上限 6）
    let sep=G.clamp(MIN_NODE_D+(relS-6)*.22, MIN_NODE_D, MAX_NODE_D);
    let ax=ox+Math.cos(da)*sep, az=oz+Math.sin(da)*sep;
    let bx=ox+Math.cos(db)*sep, bz=oz+Math.sin(db)*sep;
    // 两节点最小距离：不足则沿碰撞速度方向外扩；同向碰撞时把 B 沿 da 法线推开，
    // 保证首次共振也形成肉眼可见的长 Beam（A ← X → B 或 A ↘ X ↙ B）
    if(G.dist2(ax,az,bx,bz)<MIN_NODE_D*MIN_NODE_D){
      const pxa=-Math.sin(da), pza=Math.cos(da);
      const side=(Math.cos(db)*pxa+Math.sin(db)*pza)>=0?1:-1;
      bx+=pxa*MIN_NODE_D*side; bz+=pza*MIN_NODE_D*side;
      // 若仍不足（极端夹角），再沿分离方向各自外扩
      for(let i=0;i<8 && G.dist2(ax,az,bx,bz)<MIN_NODE_D*MIN_NODE_D;i++){
        ax=ox+Math.cos(da)*(sep+=.5); az=oz+Math.sin(da)*sep;
        bx=ox+Math.cos(db)*sep;       bz=oz+Math.sin(db)*sep;
      }
    }
    // 落点校验：避墙/避不可走/避已有节点（弱排斥防扎堆）
    const A=this._settle(ax,az, ox,oz);
    const B=this._settle(bx,bz, ox,oz);
    G.fx.ring(ox,oz,1.0,0x3ae8ff,.35);         // 共振爆发：碰撞点音波圆环
    G.audio.sfx('resonance',{v:.6});
    G.fx.shake(.06);
    this.addNode(A[0],A[1]);
    this.addNode(B[0],B[1]);
  },

  /* 节点落点校验：沿 origin→落点 方向逐步回缩，直到合法（墙内/已有节点太近则重算） */
  _settle(x,z, ox,oz){
    for(let i=0;i<8;i++){
      let ok=true;
      const t=G.tileAt? G.tileAt(x,z) : null;
      if(t && t.t!=='floor') ok=false;
      if(ok && G.solidForMove && G.solidForMove(x,z)) ok=false;
      if(ok){
        for(const n of this.nodes){
          if(G.dist2(x,z,n.x,n.z)<MIN_NODE_D*MIN_NODE_D){ ok=false; break; }
        }
      }
      if(ok) return [x,z];
      const d=G.dist(x,z,ox,oz)||1;
      x=ox+((x-ox)/d)*(d*.9); z=oz+((z-oz)/d)*(d*.9);
    }
    return [x,z];
  },

  /* ---------- 节点入网（含自测钩子 testNode） ---------- */
  addNode(x,z){
    if(this.nodes.length>=MAX_NODE){ this._triggerOverload(x,z); return; }
    const g=this._mkNodeMesh(x,z);
    G.scene.add(g);
    this.nodes.push({x,z,life:NODE_LIFE,t:0,mesh:g,level:1});
    this.rebuildBeams();
    G.fx.ring(x,z,.8,0x3ae8ff,.3);
    G.fx.light(x,.9,z,0x3ae8ff,1.6,.25);
    G.audio.sfx('resonance',{v:.5});
    if(this.nodes.length>=2) G.fx.shake(.06);   // 网络落点微震
  },

  /* 唱片撞现存节点：<cap → 节点升级（Lv1~5）+ 网络扩张（新节点 C/D）；==cap → FULL OVERLOAD */
  vinylHitNode(x,z){
    const ns=this.nodes;
    let hit=null, bd=NODE_R*NODE_R;
    for(const n of ns){ const d=G.dist2(x,z,n.x,n.z); if(d<bd){ bd=d; hit=n; } }
    if(!hit) return false;
    if(ns.length>=MAX_NODE){ this._triggerOverload(x,z); return true; }
    // NODE GROWTH：被撞节点升级（亮度/转速/Beam 强度逐级增强），唱片撞已有网络同样有价值
    if(hit.level<5) hit.level++;
    hit.life=NODE_LIFE;
    this._applyNodeLevel(hit);
    G.fx.ring(x,z,.5,0xff5060,.25);
    this.addNode(x,z);                     // 网络扩张：第 N 张唱片 → 第 N+1 个节点
    return true;
  },

  /* 按节点等级增强视觉：Lv1 普通 → Lv2 变亮 → Lv3 转速↑ → Lv4 Beam 强度↑ → Lv5 Overload 准备态 */
  _applyNodeLevel(n){
    if(!n.mesh) return;
    const glow=n.mesh.children[3];
    if(glow){
      const s=.7+n.level*.14; glow.scale.set(s,s,1);
      glow.material.opacity=Math.min(.95,.5+n.level*.09);
      glow.material.color.setHSL(0.53,1,.55+.02*n.level);   // 蓝→紫渐变暗示升温
    }
  },

  /* ---------- 共振线网络重建：CONNECTIVITY + LONG EDGE PRIORITY ----------
     长边优先连接（A-C/A-D 而非 A-B-C-D）+ 连通性补边 + 节点度数≤3，
     产生明显的三角/多边形几何网络，而不是"附近节点连成短线" */
  rebuildBeams(){
    for(const b of this.beams){ if(b.line) G.scene.remove(b.line); if(b.lineR) G.scene.remove(b.lineR); }
    this.beams.length=0;
    const ns=this.nodes;
    if(ns.length<2) return;
    const pairs=[];
    for(let i=0;i<ns.length;i++) for(let j=i+1;j<ns.length;j++)
      pairs.push({i,j,len:Math.sqrt(G.dist2(ns[i].x,ns[i].z,ns[j].x,ns[j].z))});
    pairs.sort((a,b)=>b.len-a.len);        // LONG EDGE PRIORITY：距离降序
    const uf=[]; for(let k=0;k<ns.length;k++) uf.push(k);
    const find=k=>{ while(uf[k]!==k){ uf[k]=uf[uf[k]]; k=uf[k]; } return k; };
    const uni=(a,b)=>{ const ra=find(a),rb=find(b); if(ra!==rb) uf[ra]=rb; };
    const deg=new Array(ns.length).fill(0);
    const keep=[];
    for(const p of pairs){                 // 第一遍：长边优先，跳过太短边（除非两端孤立）
      if(keep.length>=MAX_BEAM) break;
      if(p.len<MIN_BEAM_LEN && deg[p.i]>0 && deg[p.j]>0) continue;
      if(deg[p.i]>=3 || deg[p.j]>=3) continue;
      keep.push(p); uni(p.i,p.j); deg[p.i]++; deg[p.j]++;
    }
    for(const p of pairs){                 // 第二遍：补连通（长边优先中未连通的）
      if(keep.length>=MAX_BEAM) break;
      if(find(p.i)===find(p.j)) continue;
      if(deg[p.i]>=3 || deg[p.j]>=3) continue;
      keep.push(p); uni(p.i,p.j); deg[p.i]++; deg[p.j]++;
    }
    for(const p of keep){
      const a=ns[p.i], b=ns[p.j];
      this.beams.push(this._mkBeam(a,b,p.len));
    }
  },

  /* ---------- 每帧：FULL OVERLOAD 状态机优先；否则节点寿命/自转 + 波线动画 + tick 伤害 + 核心脉冲 + Club Mode ---------- */
  update(dt){
    // 唱片撞节点（仅网络存在时扫描，一帧最多结算一张，防连锁瞬爆）
    if(this.nodes.length && G.weapons && G.weapons.bullets){
      const bs=G.weapons.bullets;
      for(let i=0;i<bs.length;i++){
        const b=bs[i];
        if(!b.on || b.team!=='p' || b.kind!=='vinyl') continue;
        if(this.vinylHitNode(b.x,b.z)){ b.on=false; b.mesh.visible=false; break; }
      }
    }
    if(this._ol){ this._updateOverload(dt); return; }
    if(!this.nodes.length) return;
    // 节点寿命与自转（高等级转更快，暗示升温）
    for(let i=this.nodes.length-1;i>=0;i--){
      const n=this.nodes[i];
      n.life-=dt; n.t+=dt;
      if(n.mesh) n.mesh.rotation.y+=dt*(4+n.level*.8);
      if(n.life<=0){
        if(n.mesh) G.scene.remove(n.mesh);
        this.nodes.splice(i,1);
        this.rebuildBeams();
        G.fx.burst(n.x,.5,n.z,6,{color:0x3ae8ff,spd:1.8,life:.4,s0:.12});
      }
    }
    // 共振线波浪动画（逐帧覆盖预分配顶点，不新建对象）
    for(const b of this.beams) this._wave(b,dt);
    // 线上敌人 tick 伤害（含质量倍率 + 交叉加成）
    this._tick-=dt;
    if(this._tick<=0){ this._tick=TICK; this._damageTick(); }
    // NETWORK CORE：≥3 节点 → 几何中心微弱音波脉冲（网络越大越明显）
    if(this.nodes.length>=3){
      this._coreT-=dt;
      if(this._coreT<=0){ this._coreT=TICK; this._corePulse(); }
    }
    // Club Mode：暗场（基准强度在首次进入瞬间采样，清场还原；0.82 不无限压暗）
    const L=G.lights&&G.lights.ambient;
    if(L){
      if(!this._dark){ this._darkBase=L.intensity; this._dark=true; }
      L.intensity=this._darkBase*CLUB_F;
    }
  },

  /* ---------- 线上敌人持续伤害：0.18s 一次；伤害 = 2.5 × 质量倍率 × 交叉加成 ----------
     CROSS RESONANCE（被 2 条 Beam 同时命中）= ×1.15；PERFECT RESONANCE（≥3 条）= ×1.3 */
  _damageTick(){
    // 先统计每个敌人同时被几条 Beam 命中（交叉判定）
    const cross=new Map();
    for(const b of this.beams){
      for(const e of G.enemies.list){
        if(e.dead||e.spawnT>0) continue;
        if(segDist(e.x,e.z, b.ax,b.az, b.bx,b.bz)<.5) cross.set(e,(cross.get(e)||0)+1);
      }
    }
    for(const b of this.beams){
      const cx=(b.ax+b.bx)/2, cz=(b.az+b.bz)/2;
      for(const e of G.enemies.list){
        if(e.dead||e.spawnT>0) continue;
        if(segDist(e.x,e.z, b.ax,b.az, b.bx,b.bz)<.5){
          let dmg=TICK_DMG*b.q;
          const c=cross.get(e)||1;
          if(c>=3) dmg*=1.3;        // PERFECT RESONANCE：三条线交汇小型爆发
          else if(c===2) dmg*=1.15; // CROSS RESONANCE：交叉点额外伤害
          G.hurtEnemy(e, dmg, G.angTo(e.x,e.z,cx,cz), 0, true);
          // X-Ray 脉冲：短促骨骼闪现（节流随机，避免高频全屏闪）
          if(Math.random()<.35) e.flashT=.05;
          G.fx.particle(e.x,e.r+.4,e.z,{vx:(Math.random()-.5)*1.5,vy:.5,vz:(Math.random()-.5)*1.5,life:.2,color:Math.random()<.5?0x40c8ff:0xff5060,s0:.07,kind:'a'});
        }
      }
      const boss=G.boss&&G.boss.active;
      if(boss&&!boss.dead&&segDist(boss.x,boss.z, b.ax,b.az, b.bx,b.bz)<.5) G.hurtBoss(TICK_DMG*b.q);
    }
  },

  /* ---------- NETWORK CORE：几何中心微弱音波脉冲（敌人近核心轻微持续伤害） ---------- */
  _corePulse(){
    let cx=0,cz=0; for(const n of this.nodes){ cx+=n.x; cz+=n.z; }
    cx/=this.nodes.length; cz/=this.nodes.length;
    const grow=1+this.nodes.length*.1;          // 网络越大核心越明显
    G.fx.ring(cx,cz,.7*grow,0x3ae8ff,.12);
    for(const e of G.enemies.list){
      if(e.dead||e.spawnT>0) continue;
      if(G.dist(e.x,e.z,cx,cz)<1.1*grow){
        G.hurtEnemy(e, 1, G.angTo(e.x,e.z,cx,cz), 0, true);
        if(Math.random()<.5) e.flashT=.04;
      }
    }
    const boss=G.boss&&G.boss.active;
    if(boss&&!boss.dead&&G.dist(boss.x,boss.z,cx,cz)<1.1*grow) G.hurtBoss(1);
  },

  /* ---------- FULL OVERLOAD 三阶段：CHARGE → LOCK → BASS DROP ---------- */
  _triggerOverload(x,z){
    if(this._ol) return;                       // 已在过载中
    this._ol={ phase:0, t:.38, nodes:this.nodes.slice(), beams:this.beams.slice(), x,z };
  },
  _updateOverload(dt){
    const ol=this._ol;
    ol.t-=dt;
    if(ol.phase===0){                          // CHARGE：节点闪烁 + Beam 振幅增 + 暗场加深 + 低频渐强
      const k=Math.min(1,(.38-ol.t)*3);
      for(const n of ol.nodes){ if(n.mesh) n.mesh.visible=(Math.sin(n.t*40)>0||k>.8); n.t+=dt; }
      for(const b of ol.beams) this._wave(b,dt);
      if(ol.t<=0){ ol.phase=1; ol.t=.3; G.audio.sfx('resonance',{v:.7}); this._xrayAll(); }
    } else if(ol.phase===1){                   // LOCK：所有 Beam 锁定 + 敌人 RGB X-Ray + 网络停止
      if(ol.t<=0){ ol.phase=2; ol.t=.35; this._bassDrop(ol); }
    } else {                                   // BASS DROP 收尾：灯光还原
      if(ol.t<=0){ this._ol=null; }
    }
  },
  /* LOCK 阶段：敌人身上短暂 SONIC X-RAY（身体白闪 + 骨架闪现，不做持续透视） */
  _xrayAll(){
    for(const e of G.enemies.list){
      if(e.dead) continue;
      e.flashT=.12;
      if(Math.random()<.6) G.fx.particle(e.x,e.r+.5,e.z,{vx:(Math.random()-.5)*2,vy:1,vz:(Math.random()-.5)*2,life:.2,color:Math.random()<.5?0xff5060:0x40c8ff,s0:.1,kind:'a'});
    }
  },
  /* BASS DROP：全网 SONIC BURST（base 12/line，每多一条有效 Beam +10%，上限 +60%）+ 核心爆炸 + 全网崩解 */
  _bassDrop(ol){
    G.audio.sfx('bassDrop',{v:1});
    G.fx.shake(.38);
    G.fx.screenFlash('#bfe8ff',.12);
    const mult=1+Math.min(.6, ol.beams.length*.1);
    const dmg=BURST_DMG*mult;
    let bossHit=false;
    for(const b of ol.beams){
      G.fx.ring((b.ax+b.bx)/2,(b.az+b.bz)/2,1.1,0x40c8ff,.35);
      for(const e of G.enemies.list){
        if(e.dead||e.spawnT>0) continue;
        if(segDist(e.x,e.z, b.ax,b.az, b.bx,b.bz)<.5){
          G.hurtEnemy(e, dmg, G.angTo(e.x,e.z,(b.ax+b.bx)/2,(b.az+b.bz)/2), 2, true);
          e.flashT=.1;
          G.fx.sparks(e.x,.7,e.z,0x40c8ff);
        }
      }
      const boss=G.boss&&G.boss.active;
      if(boss&&!boss.dead&&!bossHit&&segDist(boss.x,boss.z, b.ax,b.az, b.bx,b.bz)<.5){
        bossHit=true; G.hurtBoss(BOSS_BURST);   // Boss 伤害硬上限：单次封顶 24
      }
    }
    // 爆发中心：双层音波 + 红蓝粒子（Network Core 爆炸 + 黑胶碎片飞散）
    G.fx.ring(ol.x,ol.z,2.6,0x40c8ff,.5);
    G.fx.ring(ol.x,ol.z,1.7,0xff5060,.4);
    G.fx.burst(ol.x,.5,ol.z,12,{color:0x40c8ff,spd:4.5,life:.5,s0:.2,kind:'a'});
    G.fx.burst(ol.x,.4,ol.z,6,{color:0xff5060,spd:3,life:.6,s0:.16,kind:'a'});
    // 全网崩解：节点/线/灯光清场
    for(const n of ol.nodes){ if(n.mesh) G.scene.remove(n.mesh); }
    for(const b of ol.beams){ if(b.line) G.scene.remove(b.line); if(b.lineR) G.scene.remove(b.lineR); }
    this.nodes.length=0; this.beams.length=0;
    const L=G.lights&&G.lights.ambient; if(L&&this._dark){ L.intensity=this._darkBase; this._dark=false; }
  },

  /* ---------- 发射轨迹轻微修正：附近有黑胶时向它轻偏（≤10°），帮助完成共振但绝不代瞄 ---------- */
  aimAssist(p, ang){
    let best=null, bd=49;
    const bs=G.weapons.bullets;
    for(let i=0;i<bs.length;i++){
      const b=bs[i];
      if(!b.on||b.team!=='p'||b.kind!=='vinyl') continue;
      const d=G.dist2(p.x,p.z,b.x,b.z);
      if(d<bd){ bd=d; best=b; }
    }
    if(!best) return ang;
    const ta=G.angTo(p.x,p.z,best.x,best.z);
    const diff=Math.atan2(Math.sin(ta-ang),Math.cos(ta-ang));
    if(Math.abs(diff)>TRAJ_MAX) return ang;    // 目标偏离太远：玩家仍需瞄准，不代瞄
    return ang+diff*.6;                        // 轻偏：保留 40% 玩家输入感
  },

  /* ---------- 节点造型：黑胶唱片 + 中心标签 + 霓虹灯带 + 辉光（静态，共享几何只动变换） ---------- */
  _mkNodeMesh(x,z){
    const g=new THREE.Group();
    const disc=new THREE.Mesh(G.boxGeo(1,1,1), G.bmat(0x12121a));
    disc.scale.set(.52,.03,.52); disc.rotation.x=-Math.PI/2;
    const label=new THREE.Mesh(G.boxGeo(1,1,1), G.bmat(0x3ae8ff));
    label.scale.set(.15,.015,.15); label.rotation.x=-Math.PI/2; label.position.y=.02;
    const ring=new THREE.Mesh(G.boxGeo(1,1,1), G.bmat(0xff5060));
    ring.scale.set(.36,.012,.36); ring.rotation.x=-Math.PI/2; ring.position.y=.035;
    const glow=new THREE.Sprite(G.pmat(0x3ae8ff,'a'));
    glow.scale.set(.7,.7,1); glow.position.y=.12; glow.material.opacity=.5;
    g.add(disc); g.add(label); g.add(ring); g.add(glow);
    g.position.set(x,.5,z);
    return g;
  },

  /* ---------- 共振线：蓝主光 + 红残影双 Line，波浪几何预分配逐帧覆盖；长度分级（Normal/Long/Extreme） ---------- */
  _mkBeam(a,b,len){
    const N=WAVE_N;
    const pts=new Float32Array((N+1)*3), ptsR=new Float32Array((N+1)*3);
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts,3));
    const geoR=new THREE.BufferGeometry();
    geoR.setAttribute('position', new THREE.BufferAttribute(ptsR,3));
    const line=new THREE.Line(geo, new THREE.LineBasicMaterial({color:0x40c8ff,transparent:true,opacity:.9,depthWrite:false}));
    const lineR=new THREE.Line(geoR, new THREE.LineBasicMaterial({color:0xff5060,transparent:true,opacity:.45,depthWrite:false}));
    // Edge Quality：长度越长线越粗/越亮/音波振幅越明显/伤害倍率越高
    let q=1.0, amp=.14, off=.08, op=.9, opR=.45;
    if(len>=6){ q=1.3; amp=.2;  off=.13; op=1;   opR=.6;  }
    else if(len>=4){ q=1.15; amp=.17; off=.1; op=.95; opR=.52; }
    line.material.opacity=op; lineR.material.opacity=opR;
    line.renderOrder=8; lineR.renderOrder=8;
    G.scene.add(line); G.scene.add(lineR);
    return {ax:a.x,az:a.z,bx:b.x,bz:b.z, pts,ptsR, geo,geoR, line,lineR, ph:Math.random()*3, len, q, amp, off};
  },

  /* 波浪写入：沿弦向正弦起伏 + 红蓝横向错位（RGB 色差），振幅随 Edge Quality 提升 */
  _wave(b,dt){
    b.ph+=dt*11;
    const ax=b.ax,az=b.az,bx=b.bx,bz=b.bz;
    const dx=bx-ax, dz=bz-az;
    const len=Math.hypot(dx,dz)||1, ux=dx/len, uz=dz/len, px=-uz, pz=ux;
    const N=WAVE_N, arr=b.pts, arrR=b.ptsR, ph=b.ph, amp=b.amp||.14, off=b.off||.08;
    for(let k=0;k<=N;k++){
      const t=k/N;
      const wv=Math.sin(ph*1.4 + t*Math.PI*3.5)*amp;
      const x=ax+dx*t+px*wv, z=az+dz*t+pz*wv;
      arr[k*3]=x; arr[k*3+1]=.5; arr[k*3+2]=z;
      arrR[k*3]=x+px*off; arrR[k*3+1]=.5; arrR[k*3+2]=z+pz*off;
    }
    b.geo.attributes.position.needsUpdate=true;
    b.geoR.attributes.position.needsUpdate=true;
  },
};
J.testNode = J.addNode;   // 自测钩子：直接入网建节点（跳过唱片互撞链路）
G.jukebox = J;
})();
