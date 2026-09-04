/* 第九层事故 - 薛定谔的拍立得：照片状态 / DamageBuffer / 弹幕冻结 / 照片碎裂 / 闪光演出
   职责（勿把逻辑散回其他模块）：
   - fire()          扇形摄影闪光 AOE（敌人 + 敌方弹幕 + Boss，带墙体遮挡）
   - shoot/record    敌人进入 PHOTO_STATE；冻结期伤害全部记入 DamageBuffer，不扣真实 HP
   - beginResolve/applyResolve  2s 后「照片冲洗」演出 → DamageBuffer ×2 一次性结算
   - freezeBullet/unfreezeBullet 敌方弹幕真冻结（暂停积分不重建，恢复原速原向）
   - shatter         致死结算 → 敌人碎裂成照片纸片（对象池）
   - reset           清场复位（材质换装还原 + 相框/碎片/扇光回收） */
'use strict';
(function(){
const P = {
  FREEZE: 2.0,      // 照片状态持续时间（秒）
  MULT: 2,          // DamageBuffer 结算倍率
  RESOLVE: .3,      // 冲洗演出时长（秒）
  list: [], frags: [], rings: [],
  _inited: false,

  /* ---------- 懒初始化（首次开火时场景已就绪） ---------- */
  _init(){
    if(this._inited) return;
    this._inited = true;
    // 灰调「旧照片」共享材质：关闭顶点色 → 敌人整体褪成统一的旧相纸灰（Lambert 光照保留体积感）
    this.mat  = new THREE.MeshLambertMaterial({ color: 0xbdb4a0 });
    this.matB = new THREE.MeshBasicMaterial({ color: 0xcac2b0 });   // 冻结弹幕用（无光照发光体）
    // 照片相纸贴图：白边 + 透明内芯（敌人从相纸中"透"出来）+ 颗粒
    const cv=document.createElement('canvas'); cv.width=cv.height=64;
    const c2=cv.getContext('2d');
    c2.fillStyle='rgba(236,230,216,.95)'; c2.fillRect(0,0,64,64);
    c2.clearRect(7,7,50,50);                               // 挖空内芯
    c2.strokeStyle='rgba(120,110,92,.35)'; c2.lineWidth=1; c2.strokeRect(7.5,7.5,49,49);
    for(let i=0;i<70;i++){ // 胶片颗粒
      c2.fillStyle='rgba(90,82,66,'+(Math.random()*.09)+')';
      c2.fillRect(8+Math.random()*48, 8+Math.random()*48, 1, 1);
    }
    this.frameTex = new THREE.CanvasTexture(cv);
    this.frameGeo = new THREE.PlaneGeometry(1,1);
    this.frameMat = new THREE.MeshBasicMaterial({ map:this.frameTex, transparent:true, depthWrite:false });
    // 照片碎片贴图：相纸白边 + 灰调照片内芯 + 药水渍
    const cv2=document.createElement('canvas'); cv2.width=cv2.height=32;
    const c3=cv2.getContext('2d');
    c3.fillStyle='#e8e2d2'; c3.fillRect(0,0,32,32);
    c3.fillStyle='#8d867a'; c3.fillRect(4,4,24,24);
    c3.fillStyle='rgba(120,30,24,.28)'; c3.fillRect(6,10,18,6); // 残留红色显影
    c3.fillStyle='rgba(255,255,255,.25)'; c3.fillRect(4,4,24,3);
    this.fragTex = new THREE.CanvasTexture(cv2);
    this.fragGeo = new THREE.PlaneGeometry(.15,.19);
    // 碎片对象池（独立材质实例用于淡出；数量固定，不做动态扩容）
    for(let i=0;i<44;i++){
      const m=new THREE.Mesh(this.fragGeo, new THREE.MeshBasicMaterial({
        map:this.fragTex, transparent:true, side:THREE.DoubleSide, depthWrite:false }));
      m.visible=false; G.scene.add(m);
      this.frags.push({ m, life:0, t:0, vx:0,vy:0,vz:0, rx:0,rz:0, ph:0 });
    }
    // 扇形闪光（地面扇面，CircleGeometry 扇区；预烘焙 72° 扇角）
    const half=.72;
    const sgeo=new THREE.CircleGeometry(1,20,-half,half*2); sgeo.rotateX(-Math.PI/2);
    for(let i=0;i<2;i++){
      const m=new THREE.Mesh(sgeo, new THREE.MeshBasicMaterial({
        color:0xfff4da, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false }));
      m.visible=false; G.scene.add(m);
      this.rings.push({ m, life:0, t:0, range:1, delay:0 });
    }
  },

  /* ---------- 清场复位（E.clear / B.clear / 新一局） ---------- */
  reset(){
    for(const e of this.list){
      if(e.photoT>0 || e.photoPhase){
        this.setLook(e,false); this.removeFrame(e);
        e.photoT=0; e.photoBuf=0; e.photoPhase=''; e.photoDeath=false;
      }
    }
    this.list.length=0;
    for(const f of this.frags){ f.life=0; f.m.visible=false; }
    for(const r of this.rings){ r.life=0; r.m.visible=false; }
  },

  /* ---------- 材质换装（与受击闪白同机制，独立 _pm0 键位避免冲突） ---------- */
  setLook(obj,on){
    obj.mesh.traverse(o=>{
      if(o.isMesh){
        if(on){ if(o.material!==this.mat) o.userData._pm0=o.material; o.material=this.mat; }
        else if(o.userData._pm0){ o.material=o.userData._pm0; o.userData._pm0=null; }
      } else if(o.isSprite){ // 怨灵光环/精英红光等 sprite 一并隐去，保持"褪色"语言
        if(on){ if(o.visible){ o.userData._ps0=true; o.visible=false; } }
        else if(o.userData._ps0){ o.visible=true; o.userData._ps0=false; }
      }
    });
  },
  clearFlash(obj){ // 冻结前清掉受击闪白（两套换装键位共用 _om）
    obj.mesh.traverse(o=>{ if(o.isMesh && o.userData._om){ o.material=o.userData._om; o.userData._om=null; } });
    obj._flashOn=false; obj.flashT=0;
  },
  addFrame(e){
    const m=new THREE.Mesh(this.frameGeo, this.frameMat);
    m.rotation.x=-Math.PI/2; m.rotation.z=Math.random()*G.TAU;
    m.position.set(e.x,.035,e.z);
    const s=e.r*3.6; m.scale.set(s,s,1);
    G.scene.add(m); e._photoFrame=m;
  },
  removeFrame(e){ if(e._photoFrame){ G.scene.remove(e._photoFrame); e._photoFrame=null; } },

  /* ---------- 开火：扇形摄影闪光 ---------- */
  fire(p, ang, def){
    this._init();
    const half=(def.cone||1.25)/2, range=def.range;
    const mx=p.muzzleX, mz=p.muzzleZ;
    /* --- 演出：双扇面曝光 + 强光 + 屏幕闪光 + 火花 --- */
    this.flashSector(mx,mz,ang,half,range);
    G.fx.light(mx,.8,mz,0xfff2d0,3.4,.15);
    G.fx.light(mx,.6,mz,0xffe9c0,2.2,.25);
    G.fx.screenFlash('#fff6e2',.12);
    G.fx.shake(.12);
    for(let i=0;i<10;i++){
      const a2=ang+(Math.random()-.5)*half*2;
      G.fx.particle(mx,.55,mz,{vx:Math.cos(a2)*(6+Math.random()*4),vy:.1,vz:Math.sin(a2)*(6+Math.random()*4),
        life:.16,color:0xfff4d8,s0:.24,kind:'a'});
    }
    G.fx.particle(mx,.6,mz,{vx:0,vy:0,vz:0,life:.1,color:0xffffff,s0:1.1,kind:'a'});
    G.audio.sfx('flashPop',{v:.7});   // 快门声由 emitShot 的 def.sfx 播放，避免双重快门音
    /* --- 命中检测：扇形 + 墙体遮挡 --- */
    const visible=(tx,tz)=>{
      const d=G.dist(mx,mz,tx,tz);
      const steps=Math.max(2,Math.ceil(d/.7));
      for(let i=1;i<steps;i++){
        const t=i/steps;
        if(G.solidForBullet(mx+(tx-mx)*t, mz+(tz-mz)*t)) return false;
      }
      return true;
    };
    const crit=Math.random()<p.st.crit;
    const fdmg=def.dmg*p.curDmgMul()*(crit?(2.5*p.st.critMul):1);   // 碎甲晶石：对拍立得同样生效
    let n=0;
    for(const e of G.enemies.list){
      if(e.dead||e.spawnT>0) continue;
      const d=G.dist(p.x,p.z,e.x,e.z);
      if(d>range+e.r) continue;
      let da=G.angTo(p.x,p.z,e.x,e.z)-ang; da=Math.atan2(Math.sin(da),Math.cos(da));
      if(Math.abs(da)>half+Math.atan2(e.r,Math.max(1,d))) continue; // 体积越近越易被扇边扫到
      if(!visible(e.x,e.z)) continue;
      this.shoot(e,fdmg); n++;
    }
    const boss=G.boss&&G.boss.active;
    if(boss && !boss.dead && boss.spawnT<=0 && boss.state!=='intro'){
      const d=G.dist(p.x,p.z,boss.x,boss.z);
      if(d<=range+boss.r){
        let da=G.angTo(p.x,p.z,boss.x,boss.z)-ang; da=Math.atan2(Math.sin(da),Math.cos(da));
        if(Math.abs(da)<=half+Math.atan2(boss.r,Math.max(1,d)) && visible(boss.x,boss.z)){
          this.shootBoss(boss,fdmg); n++;
        }
      }
    }
    for(const b of G.weapons.bullets){ // 敌方弹幕同样被"拍进照片"
      if(!b.on||b.team!=='e'||b.photoT>0) continue;
      const d=G.dist(p.x,p.z,b.x,b.z);
      if(d>range) continue;
      let da=G.angTo(p.x,p.z,b.x,b.z)-ang; da=Math.atan2(Math.sin(da),Math.cos(da));
      if(Math.abs(da)>half+Math.atan2(b.size+.06,Math.max(1,d))) continue;
      if(!visible(b.x,b.z)) continue;
      this.freezeBullet(b);
    }
    if(n>0){ G.fx.hitstop(.05); G.audio.sfx('freeze',{v:.55}); } // 极轻微时间停止感
    return n;
  },

  /* ---------- 敌人进入 PHOTO_STATE ---------- */
  shoot(e, fdmg){
    if(e.photoT>0){ e.photoT=this.FREEZE; this.record(e,fdmg,false); return; } // 重复拍摄：刷新时长、缓冲保留
    if(e._flashOn) this.clearFlash(e);
    e.photoT=this.FREEZE; e.photoBuf=0; e.photoPhase='shot';
    this.setLook(e,true); this.addFrame(e);
    this.record(e,fdmg,false);
    const i=this.list.indexOf(e); if(i<0) this.list.push(e);
  },
  shootBoss(b, fdmg){
    if(b.photoT>0){ b.photoT=this.FREEZE; this.record(b,fdmg,false); return; }
    if(b._flashOn) this.clearFlash(b);
    b.photoT=this.FREEZE; b.photoBuf=0; b.photoPhase='shot';
    this.setLook(b,true); this.addFrame(b);
    this.record(b,fdmg,false);
    const i=this.list.indexOf(b); if(i<0) this.list.push(b);
  },

  /* ---------- DamageBuffer：只记账，不扣血 ---------- */
  record(e, dmg, showNum){
    if(e.dead) return;
    e.photoBuf=(e.photoBuf||0)+dmg;
    G.fx.dmgNum(e.x, 1.15+Math.random()*.2, e.z, '+'+Math.round(dmg), false, {color:'#cfc8ba'});
    G.audio.sfx('photoTick',{v:.28});
    return e.photoBuf;
  },

  /* ---------- 冻结期表现（E.update / B.update 每帧调用） ---------- */
  tickEntity(e,dt){
    e._grainT=(e._grainT||0)-dt;
    if(e._grainT<=0){ // 胶片颗粒
      e._grainT=.13;
      G.fx.particle(e.x+(Math.random()-.5)*e.r*2.4, .15+Math.random()*1.1, e.z+(Math.random()-.5)*e.r*2.4,
        {vx:0,vy:.14,vz:0,life:.3,color:0xd8d2c4,s0:.05,kind:'s'});
    }
  },
  tickResolve(e,dt){ // 冲洗期：红色墨水从裂纹渗出
    e._inkT=(e._inkT||0)-dt;
    if(e._inkT<=0){
      e._inkT=.06;
      const a2=Math.random()*G.TAU;
      G.fx.particle(e.x+Math.cos(a2)*e.r*.5, .3+Math.random()*.7, e.z+Math.sin(a2)*e.r*.5,
        {vx:Math.cos(a2)*.5,vy:.5,vz:Math.sin(a2)*.5,life:.35,color:0xff2030,s0:.09,kind:'a'});
    }
  },

  /* ---------- 冲洗完成 → 结算 ---------- */
  beginResolve(e){
    e.photoPhase='resolve'; e._resolveT=this.RESOLVE;
    G.audio.sfx('develop',{v:.55});
    for(let i=0;i<4;i++){
      const a2=Math.random()*G.TAU;
      G.fx.lightning(e.x,.7,e.z, e.x+Math.cos(a2)*e.r*1.7, .45+Math.random()*.5, e.z+Math.sin(a2)*e.r*1.7, 0xff2030, 3);
    }
    G.fx.light(e.x,.9,e.z,0xff2030,1.2,this.RESOLVE+.1);
  },
  applyResolve(e){
    const final=Math.max(1,Math.round((e.photoBuf||0)*this.MULT));
    this.setLook(e,false); this.removeFrame(e);
    e.photoT=0; e.photoBuf=0; e.photoPhase='';
    e.photoDeath=true; // 致死时 E.kill 改走照片碎裂
    const ang=Math.atan2(e.z-G.player.z, e.x-G.player.x);
    // 红色墨水爆发 + 大红暴击数字 + 中等震屏
    G.fx.burst(e.x,.7,e.z,16,{color:0xff2030,spd:5,life:.5,s0:.2,kind:'a'});
    G.fx.burst(e.x,.4,e.z,8,{color:0xa01820,spd:3.5,life:.6,s0:.26,kind:'m'});
    G.fx.ring(e.x,e.z,1.6,0xff2030,.35);
    G.fx.light(e.x,1,e.z,0xff2030,2.6,.3);
    G.fx.dmgNum(e.x,1.4,e.z, final+' CRITICAL', true, {color:'#ff2038', scale:1.6});
    G.fx.shake(.3);
    G.audio.sfx('photoBoom',{v:.9});
    G.hurtEnemy(e, final, ang, 0, true);
  },
  beginResolveBoss(b){ this.beginResolve(b); },
  applyResolveBoss(b){
    const final=Math.max(1,Math.round((b.photoBuf||0)*this.MULT));
    this.setLook(b,false); this.removeFrame(b);
    b.photoT=0; b.photoBuf=0; b.photoPhase='';
    G.fx.burst(b.x,1,b.z,22,{color:0xff2030,spd:6,life:.55,s0:.26,kind:'a'});
    G.fx.ring(b.x,b.z,2.6,0xff2030,.4);
    G.fx.light(b.x,1.2,b.z,0xff2030,3,.35);
    G.fx.dmgNum(b.x,2.6,b.z, final+' CRITICAL', true, {color:'#ff2038', scale:1.6});
    G.fx.shake(.35);
    G.audio.sfx('photoBoom',{v:.9});
    G.hurtBoss(final);
  },

  /* ---------- 敌方弹幕冻结（真暂停：不移动/不衰减/不碰撞） ---------- */
  freezeBullet(b){
    b.photoT=this.FREEZE;
    b._pm0=b.mesh.material; b.mesh.material=this.matB;   // 灰度相纸质感
    b.glow.material=G.pmat(0xd8d2c4); b.glow.visible=true; b.glow.scale.set(.5,.5,1); // 白边
    b._glowWasOn=true;
  },
  unfreezeBullet(b){
    b.photoT=0;
    if(b._pm0){ b.mesh.material=b._pm0; b._pm0=null; }
    if(b._glowWasOn){ b.glow.visible=false; b._glowWasOn=false; }
    G.fx.particle(b.x,.55,b.z,{vx:0,vy:.5,vz:0,life:.2,color:0xfff2d0,s0:.22,kind:'a'}); // 时间重启微光
  },

  /* ---------- 照片碎裂死亡：敌人撕成相纸碎片 ---------- */
  shatter(e){
    let spawned=0;
    for(const f of this.frags){
      if(f.life>0) continue;
      f.life=f.t=1.4+Math.random()*.6;
      const a=Math.random()*G.TAU, sp=1.6+Math.random()*2.6;
      f.vx=Math.cos(a)*sp; f.vz=Math.sin(a)*sp;
      f.vy=1.8+Math.random()*2.4; f.rx=(Math.random()-.5)*9; f.rz=(Math.random()-.5)*7; f.ph=Math.random()*G.TAU;
      f.m.position.set(e.x+(Math.random()-.5)*.4, .35+Math.random()*.7, e.z+(Math.random()-.5)*.4);
      f.m.rotation.set(Math.random()*G.TAU, Math.random()*G.TAU, Math.random()*G.TAU);
      f.m.material.opacity=1; f.m.visible=true;
      if(++spawned>=13) break;
    }
    G.fx.burst(e.x,.7,e.z,12,{color:0xff2030,spd:4.5,life:.45,s0:.2,kind:'a'});
    G.fx.smoke(e.x,.55,e.z,4,false);
    G.fx.shake(.2);
    G.audio.sfx('shatter',{v:.8});
  },

  /* ---------- 每帧：碎片物理 + 扇面闪光衰减 + 屏幕曝光 ---------- */
  update(dt){
    for(const f of this.frags){
      if(f.life<=0) continue;
      f.t-=dt;
      if(f.t<=0){ f.life=0; f.m.visible=false; continue; }
      f.vy-=7.5*dt;                       // 重力
      f.vx*=Math.pow(.45,dt); f.vz*=Math.pow(.45,dt); // 空气阻力
      const m=f.m;
      m.position.x+=f.vx*dt; m.position.y+=f.vy*dt; m.position.z+=f.vz*dt;
      if(m.position.y<.04 && f.vy<0){ m.position.y=.04; f.vy*=-.32; f.vx*=.55; f.vz*=.55; } // 落地弹跳
      m.rotation.x+=f.rx*dt; m.rotation.z+=f.rz*dt+Math.sin(f.t*7+f.ph)*1.6*dt;             // 自旋+翻飞
      const k=f.t/f.life;
      if(k<.35) f.m.material.opacity=k/.35; // 尾段褪色消失
    }
    for(const r of this.rings){
      if(r.life<=0){ if(r.m.visible) r.m.visible=false; continue; }
      r.t-=dt;
      if(r.t<=0){ r.life=0; r.m.visible=false; continue; }
      const k=1-r.t/r.life;
      const e2=1-Math.pow(1-k,3); // easeOutCubic
      const s=.5+(r.range-.5)*e2;
      r.m.scale.set(s,1,s);
      r.m.material.opacity=(1-k)*.8;
    }
    // 名单清理（死亡/被移除的实体出列）
    for(let i=this.list.length-1;i>=0;i--){
      const e=this.list[i];
      if(e.dead){ this.list.splice(i,1); }
    }
  },

  /* ---------- 扇面闪光池 ---------- */
  flashSector(x,z,ang,half,range){
    let first=true;
    for(const r of this.rings){
      if(r.life>0) continue;
      r.life=r.t=.22+(first?0:.1);
      r.range=range*(first?1:.88);
      r.m.position.set(x,.1,z);
      r.m.rotation.y=-ang;
      r.m.visible=true;
      if(!first) r.t-=.06;
      first=false;
    }
  },
};

/* 冻结弹幕的每帧倒计时由 W.update 内联驱动（暂停 life/移动/碰撞），此处不重复 */
G.photo = P;
})();
