/* 弹膛深渊 - 过载点唱机：黑胶弹射 + 子弹互撞共振网 + FULL OVERLOAD
   职责清单（禁止逻辑散回其他模块）：
   - collide()     黑胶互撞半径判定（纯函数，可单元测试）
   - addNode()     节点入网（上限 MAX_NODE=6）；满网时下一次入网 → FULL OVERLOAD SONIC BURST
   - vinylHitNode() 唱片撞现存节点：未满网 → 生成新节点入网并刷新被撞节点寿命；满网 → BURST
   - update()      节点寿命+自转、共振线波浪动画、线上敌人 0.18s tick 伤害、Club Mode 暗场
   - fullOverload() 全线 BURST（线上敌人 12 伤 / Boss 封顶 24）+ 节点与线清空 + 灯光还原
   - clear()       换房/清场（game.cleanupDynamic / onRoomEnter 调用）+ 还原 Club 灯光
   所有伤害走 G.hurtEnemy / G.hurtBoss；性能红线（设计稿三十二）：vinyl≤12 /
   node≤6 / beam≤8，线几何预分配逐帧覆盖，无每帧建对象。 */
'use strict';
(function(){
const MAX_NODE=6, MAX_BEAM=8, NODE_LIFE=8, TICK=.18, TICK_DMG=2.5,
      BURST_DMG=12, BOSS_BURST=24, NODE_R=.55, CLUB_F=.78, WAVE_N=24;

/* 点到线段距离（共振线伤害判定） */
function segDist(px,pz, ax,az, bx,bz){
  const dx=bx-ax, dz=bz-az;
  const l2=dx*dx+dz*dz;
  const t=l2>0? G.clamp(((px-ax)*dx+(pz-az)*dz)/l2,0,1) : 0;
  return G.dist(px,pz, ax+dx*t, az+dz*t);
}

const J = {
  nodes:[], beams:[], _tick:0, _dark:false, _darkBase:1,

  /* 黑胶互撞半径判定（<0.45），纯函数供自测直接调用 */
  collide(x1,z1,x2,z2){ return G.dist2(x1,z1,x2,z2) < .45*.45; },

  /* 空场清理：节点/共振线移除 + Club 灯光还原（游戏钩子调用） */
  clear(){
    for(const n of this.nodes) if(n.mesh) G.scene.remove(n.mesh);
    this.nodes.length=0;
    for(const b of this.beams){ if(b.line) G.scene.remove(b.line); if(b.lineR) G.scene.remove(b.lineR); }
    this.beams.length=0;
    if(this._dark){ const L=G.lights&&G.lights.ambient; if(L) L.intensity=this._darkBase; this._dark=false; }
  },

  /* ---------- 节点入网（含自测钩子 testNode） ---------- */
  addNode(x,z){
    if(this.nodes.length>=MAX_NODE){ this.fullOverload(x,z); return; }
    const g=this._mkNodeMesh(x,z);
    G.scene.add(g);
    this.nodes.push({x,z,life:NODE_LIFE,t:0,mesh:g});
    this.rebuildBeams();
    G.fx.ring(x,z,.8,0x3ae8ff,.3);
    G.fx.light(x,.9,z,0x3ae8ff,1.6,.25);
    G.audio.sfx('resonance',{v:.5});
    if(this.nodes.length>=2) G.fx.shake(.06);   // 网络落点微震
  },

  /* 唱片撞现存节点：<cap → 网络扩张（新节点）+ 刷新被撞节点；==cap → FULL OVERLOAD */
  vinylHitNode(x,z){
    const ns=this.nodes;
    let hit=null, bd=NODE_R*NODE_R;
    for(const n of ns){ const d=G.dist2(x,z,n.x,n.z); if(d<bd){ bd=d; hit=n; } }
    if(!hit) return false;
    if(ns.length>=MAX_NODE){ this.fullOverload(x,z); return true; }
    hit.life=NODE_LIFE;                    // NODE OVERLOAD：被撞节点寿命刷新
    G.fx.ring(x,z,.5,0xff5060,.25);
    this.addNode(x,z);                     // 入网扩张（第 N 张唱片 → 第 N 个节点）
    return true;
  },

  /* ---------- FULL OVERLOAD：全线 SONIC BURST ---------- */
  fullOverload(x,z){
    const ns=this.nodes.slice(), bs=this.beams.slice();
    this.clear();                          // 先清节点/线/灯光，burst 用快照结算
    G.audio.sfx('bassDrop',{v:1});
    G.fx.shake(.38);
    G.fx.screenFlash('#bfe8ff',.12);
    let bossHit=false;
    for(const b of bs){
      G.fx.ring((b.ax+b.bx)/2,(b.az+b.bz)/2,1.1,0x40c8ff,.35);
      for(const e of G.enemies.list){
        if(e.dead||e.spawnT>0) continue;
        if(segDist(e.x,e.z, b.ax,b.az, b.bx,b.bz)<.5){
          G.hurtEnemy(e, BURST_DMG, G.angTo(e.x,e.z,(b.ax+b.bx)/2,(b.az+b.bz)/2), 2, true);
          e.flashT=.1;
          G.fx.sparks(e.x,.7,e.z,0x40c8ff);
        }
      }
      const boss=G.boss&&G.boss.active;
      if(boss&&!boss.dead&&!bossHit&&segDist(boss.x,boss.z, b.ax,b.az, b.bx,b.bz)<.5){
        bossHit=true; G.hurtBoss(BOSS_BURST);   // Boss 伤害上限：单次封顶 24
      }
    }
    // 爆发中心：双层音波 + 红蓝粒子（「全夜店低音炮同时爆了一下」）
    G.fx.ring(x,z,2.6,0x40c8ff,.5);
    G.fx.ring(x,z,1.7,0xff5060,.4);
    G.fx.burst(x,.5,z,12,{color:0x40c8ff,spd:4.5,life:.5,s0:.2,kind:'a'});
    G.fx.burst(x,.4,z,6,{color:0xff5060,spd:3,life:.6,s0:.16,kind:'a'});
  },

  /* ---------- 共振线网络重建：并查集保连通 + 距离就近补满容量 ---------- */
  rebuildBeams(){
    for(const b of this.beams){ if(b.line) G.scene.remove(b.line); if(b.lineR) G.scene.remove(b.lineR); }
    this.beams.length=0;
    const ns=this.nodes;
    if(ns.length<2) return;
    const pairs=[];
    for(let i=0;i<ns.length;i++) for(let j=i+1;j<ns.length;j++)
      pairs.push({i,j,d:G.dist2(ns[i].x,ns[i].z,ns[j].x,ns[j].z)});
    pairs.sort((a,b)=>a.d-b.d);
    const uf=[]; for(let k=0;k<ns.length;k++) uf.push(k);
    const find=k=>{ while(uf[k]!==k){ uf[k]=uf[uf[k]]; k=uf[k]; } return k; };
    const uni=(a,b)=>{ const ra=find(a),rb=find(b); if(ra!==rb) uf[ra]=rb; };
    const keep=[];
    for(const p of pairs){ if(keep.length>=MAX_BEAM) break; if(find(p.i)===find(p.j)) continue; uni(p.i,p.j); keep.push(p); }
    for(const p of pairs){ if(keep.length>=MAX_BEAM) break; if(keep.some(k=>k.i===p.i&&k.j===p.j)) continue; keep.push(p); }
    for(const p of keep){
      const a=ns[p.i], b=ns[p.j];
      this.beams.push(this._mkBeam(a,b));
    }
  },

  /* ---------- 每帧：节点寿命/自转 + 波线动画 + tick 伤害 + Club Mode ---------- */
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
    if(!this.nodes.length) return;
    // 节点寿命与自转
    for(let i=this.nodes.length-1;i>=0;i--){
      const n=this.nodes[i];
      n.life-=dt; n.t+=dt;
      if(n.mesh) n.mesh.rotation.y+=dt*4;
      if(n.life<=0){
        if(n.mesh) G.scene.remove(n.mesh);
        this.nodes.splice(i,1);
        this.rebuildBeams();
        G.fx.burst(n.x,.5,n.z,6,{color:0x3ae8ff,spd:1.8,life:.4,s0:.12});
      }
    }
    // 共振线波浪动画（逐帧覆盖预分配顶点，不新建对象）
    for(const b of this.beams) this._wave(b,dt);
    // 线上敌人 tick 伤害
    this._tick-=dt;
    if(this._tick<=0){ this._tick=TICK; this._damageTick(); }
    // Club Mode：暗场（基准强度在首次进入瞬间采样，清场还原）
    const L=G.lights&&G.lights.ambient;
    if(L){
      if(!this._dark){ this._darkBase=L.intensity; this._dark=true; }
      L.intensity=this._darkBase*CLUB_F;
    }
  },

  /* ---------- 线上敌人持续伤害（0.18s 一次，不每帧结算） ---------- */
  _damageTick(){
    for(const b of this.beams){
      const cx=(b.ax+b.bx)/2, cz=(b.az+b.bz)/2;
      for(const e of G.enemies.list){
        if(e.dead||e.spawnT>0) continue;
        if(segDist(e.x,e.z, b.ax,b.az, b.bx,b.bz)<.5){
          G.hurtEnemy(e, TICK_DMG, G.angTo(e.x,e.z,cx,cz), 0, true);
          // X-Ray 脉冲：短促骨骼闪现（节流随机，避免高频全屏闪）
          if(Math.random()<.35) e.flashT=.05;
          G.fx.particle(e.x,e.r+.4,e.z,{vx:(Math.random()-.5)*1.5,vy:.5,vz:(Math.random()-.5)*1.5,life:.2,color:Math.random()<.5?0x40c8ff:0xff5060,s0:.07,kind:'a'});
        }
      }
      const boss=G.boss&&G.boss.active;
      if(boss&&!boss.dead&&segDist(boss.x,boss.z, b.ax,b.az, b.bx,b.bz)<.5) G.hurtBoss(TICK_DMG);
    }
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

  /* ---------- 共振线：蓝主光 + 红残影双 Line，波浪几何预分配逐帧覆盖 ---------- */
  _mkBeam(a,b){
    const N=WAVE_N;
    const pts=new Float32Array((N+1)*3), ptsR=new Float32Array((N+1)*3);
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts,3));
    const geoR=new THREE.BufferGeometry();
    geoR.setAttribute('position', new THREE.BufferAttribute(ptsR,3));
    const line=new THREE.Line(geo, new THREE.LineBasicMaterial({color:0x40c8ff,transparent:true,opacity:.9,depthWrite:false}));
    const lineR=new THREE.Line(geoR, new THREE.LineBasicMaterial({color:0xff5060,transparent:true,opacity:.45,depthWrite:false}));
    line.renderOrder=8; lineR.renderOrder=8;
    G.scene.add(line); G.scene.add(lineR);
    return {ax:a.x,az:a.z,bx:b.x,bz:b.z, pts,ptsR, geo,geoR, line,lineR, ph:Math.random()*3 };
  },

  /* 波浪写入：沿弦向正弦起伏 + 红蓝横向错位（RGB 色差） */
  _wave(b,dt){
    b.ph+=dt*11;
    const ax=b.ax,az=b.az,bx=b.bx,bz=b.bz;
    const dx=bx-ax, dz=bz-az;
    const len=Math.hypot(dx,dz)||1, ux=dx/len, uz=dz/len, px=-uz, pz=ux;
    const N=WAVE_N, arr=b.pts, arrR=b.ptsR, ph=b.ph;
    for(let k=0;k<=N;k++){
      const t=k/N;
      const wv=Math.sin(ph*1.4 + t*Math.PI*3.5)*.14;
      const x=ax+dx*t+px*wv, z=az+dz*t+pz*wv;
      arr[k*3]=x; arr[k*3+1]=.5; arr[k*3+2]=z;
      arrR[k*3]=x+px*.08; arrR[k*3+1]=.5; arrR[k*3+2]=z+pz*.08;
    }
    b.geo.attributes.position.needsUpdate=true;
    b.geoR.attributes.position.needsUpdate=true;
  },
};
J.testNode = J.addNode;   // 自测钩子：直接入网建节点（跳过唱片互撞链路）
G.jukebox = J;
})();