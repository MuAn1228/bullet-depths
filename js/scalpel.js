/* 弹膛深渊 - 视界线切割刀：近战 + 空间裂隙 + 翻滚传送 + 空间坍缩
   职责清单（禁止逻辑散回其他模块）：
   - swing()      近战扇形挥砍（弧内伤害）+ 在挥砍轨迹前方留下 Space Rift
   - update()     裂隙寿命 / 对触裂敌人的 DOT tick（0.2s 一次，避免每帧伤害）
   - tryRollEnter() 翻滚进入裂隙 → 沿创建序传送到下一道裂隙（A→B→C→A）→ 触发 SPACE COLLAPSE
   - collapse()   全部现存裂隙两两连线（虚空切割线），线上敌人一次结算 VOID SEVER；
                  Boss 走 G.hurtBoss 且单次上限封顶；结算后裂隙清空
   - clear()      换房/清场（game.cleanupDynamic 调用），防止跨房残留
   所有伤害走 G.hurtEnemy / G.hurtBoss； rift 上限 3、坍缩线 ≤3，无每帧建对象。 */
'use strict';
(function(){
const MAX_RIFTS=3, RIFT_LIFE=3, DOT_TICK=.2, DOT_DMG=3, SEVER_DMG=26, BOSS_CAP=26;

/* 点到线段距离（坍缩切割线判定用） */
function segDist(px,pz, ax,az, bx,bz){
  const dx=bx-ax, dz=bz-az;
  const l2=dx*dx+dz*dz;
  const t=l2>0? G.clamp(((px-ax)*dx+(pz-az)*dz)/l2,0,1) : 0;
  return G.dist(px,pz, ax+dx*t, az+dz*t);
}

const S = {
  rifts:[],

  clear(){
    for(const r of this.rifts){ if(r.mesh){ G.scene.remove(r.mesh); } }
    this.rifts.length=0;
  },

  /* ---------- 近战挥砍：弧内伤害 + 留下空间裂隙 ---------- */
  swing(p, ang, def){
    let n=0;
    for(const e of G.enemies.list){
      if(e.dead||e.spawnT>0) continue;
      const d=G.dist(p.x,p.z,e.x,e.z);
      if(d>1.4+e.r) continue;
      let da=G.angTo(p.x,p.z,e.x,e.z)-ang; da=Math.atan2(Math.sin(da),Math.cos(da));
      if(Math.abs(da)>.75) continue;
      G.hurtEnemy(e, def.dmg*p.curDmgMul(), ang, 4, false);
      n++;
    }
    const boss=G.boss&&G.boss.active;
    if(boss && !boss.dead && boss.spawnT<=0 && G.dist(p.x,p.z,boss.x,boss.z)<1.4+boss.r){
      let da=G.angTo(p.x,p.z,boss.x,boss.z)-ang; da=Math.atan2(Math.sin(da),Math.cos(da));
      if(Math.abs(da)<=.75){ G.hurtBoss(def.dmg*p.curDmgMul()); n++; }
    }
    if(n>0){ G.fx.hitstop(.045); G.fx.shake(.08); }
    G.fx.particle(p.x+Math.cos(ang)*.9,.7,p.z+Math.sin(ang)*.9,
      {vx:Math.cos(ang)*2.4,vy:.3,vz:Math.sin(ang)*2.4,life:.2,color:0xb06aff,s0:.2,kind:'a'});
    this.spawnRift(p.x+Math.cos(ang)*1.15, p.z+Math.sin(ang)*1.15, ang);
    G.audio.sfx('riftOpen',{v:.45});
  },

  /* ---------- 空间裂隙：黑核 + 紫边，固定世界坐标，限时存在 ---------- */
  spawnRift(x,z,ang){
    if(this.rifts.length>=MAX_RIFTS){
      const old=this.rifts.shift();
      if(old.mesh) G.scene.remove(old.mesh);
      G.fx.burst(old.x,.5,old.z,5,{color:0x6a3ab8,spd:1.8,life:.35,s0:.12});
    }
    const g=new THREE.Group();
    const rim=new THREE.Mesh(new THREE.PlaneGeometry(1.0,.34),
      new THREE.MeshBasicMaterial({color:0xb06aff,transparent:true,opacity:.75,depthWrite:false}));
    const core=new THREE.Mesh(new THREE.PlaneGeometry(.82,.2),
      new THREE.MeshBasicMaterial({color:0x050208}));
    rim.rotation.x=core.rotation.x=-Math.PI/2;
    g.add(rim); g.add(core);
    g.rotation.y=-ang;                       // 裂隙长轴垂直于挥砍方向（像被切开的口）
    g.position.set(x,.5,z);
    G.scene.add(g);
    this.rifts.push({x,z,ang,life:RIFT_LIFE,tick:0,mesh:g});
  },

  /* ---------- 每帧：寿命 / DOT tick / 到期闭合 ---------- */
  update(dt){
    for(let i=this.rifts.length-1;i>=0;i--){
      const r=this.rifts[i];
      r.life-=dt; r.tick-=dt;
      if(r.mesh) r.mesh.children[0].material.opacity=.55+Math.sin(r.life*18)*.2;   // 紫边脉动
      if(r.tick<=0){
        r.tick=DOT_TICK;
        for(const e of G.enemies.list){
          if(e.dead||e.spawnT>0) continue;
          if(G.dist(r.x,r.z,e.x,e.z)<.55+e.r){
            G.hurtEnemy(e, DOT_DMG, r.ang, 0, true);
            G.fx.particle(e.x,.8,e.z,{vx:0,vy:.5,vz:0,life:.25,color:0xb06aff,s0:.1,kind:'a'});
          }
        }
      }
      if(r.life<=0){
        G.fx.burst(r.x,.5,r.z,7,{color:0x8a4ad8,spd:2.2,life:.4,s0:.13});   // 空间重新闭合
        if(r.mesh) G.scene.remove(r.mesh);
        this.rifts.splice(i,1);
      }
    }
  },

  /* ---------- 翻滚进入裂隙（player.js 翻滚触发处调用） ----------
     ≥2 道裂隙且玩家贴近某道 → 沿创建序传送到下一道；随后立刻 SPACE COLLAPSE。
     只有 1 道时不传送（无目的地），仅特效。返回是否完成传送。 */
  tryRollEnter(p){
    if(this.rifts.length<2 || p.dead) return false;
    let idx=-1;
    for(let i=0;i<this.rifts.length;i++){
      if(G.dist(p.x,p.z,this.rifts[i].x,this.rifts[i].z)<.9){ idx=i; break; }
    }
    if(idx<0) return false;
    const from=this.rifts[idx];
    const target=this.rifts[(idx+1)%this.rifts.length];
    const pos=G.enemies.nearbyLegalPos(target.x,target.z) || {x:target.x,z:target.z};
    // 吸入 + 弹出演出
    G.fx.burst(from.x,.6,from.z,8,{color:0xb06aff,spd:2.6,life:.35,s0:.15});
    p.x=pos.x; p.z=pos.z; p.vx=0; p.vz=0;
    p.invulnT=Math.max(p.invulnT,.35);                 // RIFT TRAVEL I-frame
    G.fx.burst(pos.x,.6,pos.z,10,{color:0xc87aff,spd:3.2,life:.4,s0:.17});
    G.fx.ring(pos.x,.5,pos.z,0xb06aff,.9);
    G.audio.sfx('riftTravel',{v:.6});
    this.collapse();
    return true;
  },

  /* ---------- SPACE COLLAPSE：裂隙两两连线，线上敌人 VOID SEVER 一次结算 ---------- */
  collapse(){
    const rs=this.rifts.slice();
    this.clear();
    if(rs.length<2) return;
    // 切割线视觉：紫电锯齿线（"宇宙被拉成极细的伤口"）
    for(let i=0;i<rs.length;i++){
      const a=rs[i], b=rs[(i+1)%rs.length];
      G.fx.lightning(a.x,.7,a.z, b.x,.7,b.z, 0xb06aff, 7);
      if(rs.length===3) G.fx.lightning(a.x,.5,a.z, b.x,.5,b.z, 0x6a3ab8, 5);
    }
    // VOID SEVER 结算：普通敌人全伤；精英 ×1.3；Boss 单次上限 BOSS_CAP
    let bossHit=false;
    for(const e of G.enemies.list){
      if(e.dead||e.spawnT>0) continue;
      let hits=0;
      for(let i=0;i<rs.length;i++){
        const a=rs[i], b=rs[(i+1)%rs.length];
        if(rs.length===2 && i===1) break;              // 两道裂隙只有一条连线
        if(segDist(e.x,e.z, a.x,a.z, b.x,b.z)<.5){ hits++; }
      }
      if(hits>0){
        const dmg=SEVER_DMG*(e.elite?1.3:1)*hits;
        const ang=G.angTo(e.x,e.z, rs[0].x, rs[0].z)+Math.PI;
        e.photoDeath=false;
        G.hurtEnemy(e, dmg, ang, 2, true);
        G.fx.dmgNum(e.x,1.4,e.z,'VOID',true,{color:'#c87aff'});
      }
    }
    const boss=G.boss&&G.boss.active;
    if(boss && !boss.dead){
      for(let i=0;i<rs.length&&!bossHit;i++){
        const a=rs[i], b=rs[(i+1)%rs.length];
        if(rs.length===2 && i===1) break;
        if(segDist(boss.x,boss.z, a.x,a.z, b.x,b.z)<.5) bossHit=true;
      }
      if(bossHit) G.hurtBoss(BOSS_CAP);                // Boss 削弱倍率：单次封顶
    }
    // 空间碎裂 SHATTER + 极短白闪（替代 Invert：项目无反色后处理）
    G.fx.screenFlash('#e0ccff',.08);
    G.fx.hitstop(.09);
    G.fx.shake(.25);
    G.audio.sfx('riftCollapse',{v:.85});
    for(const r of rs){
      G.fx.burst(r.x,.55,r.z,10,{color:0x9a5aff,spd:4,life:.5,s0:.16});
      G.fx.burst(r.x,.4,r.z,5,{color:0x140a20,spd:3,life:.6,s0:.2,kind:'m'});
    }
  },
};
G.scalpel = S;
})();
