/* 弹膛深渊 - 特效：粒子池 / 动态光池 / 冲击环 / 震屏 / 顿帧 / 伤害数字 */
'use strict';
(function(){
const F = {
  scene:null, particles:[], lights:[], rings:[], dmgNums:[],
  trauma:0, hitstopT:0, timeScale:1, _tgtScale:1,
  MAXP: 340, MAXL: 7, MAXR: 10, MAXD: 26,

  init(scene){
    this.scene = scene;
    this.particles.length=0; this.lights.length=0; this.rings.length=0; this.dmgNums.length=0;
    // 粒子池
    for(let i=0;i<this.MAXP;i++){
      const sp = new THREE.Sprite(G.pmats['a16777215']);
      sp.visible=false; sp.userData={life:0};
      scene.add(sp); this.particles.push({sp, life:0, t:0, vx:0,vy:0,vz:0, g:0, drag:1, s0:1, s1:0, add:true});
    }
    // 动态点光池
    for(let i=0;i<this.MAXL;i++){
      const l = new THREE.PointLight(0xffffff, 0, 9, 2);
      l.visible=false; scene.add(l);
      this.lights.push({l, life:0, t:0, i0:0, flicker:0, holder:null});
    }
    // 冲击环池
    for(let i=0;i<this.MAXR;i++){
      const m = new THREE.Mesh(new THREE.RingGeometry(0.55,0.72,20), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false}));
      m.rotation.x = -Math.PI/2; m.visible=false; scene.add(m);
      this.rings.push({m, life:0, t:0, r0:0.3, r1:3, c:0xffffff});
    }
    // 伤害数字池
    for(let i=0;i<this.MAXD;i++){
      const cv = document.createElement('canvas'); cv.width=96; cv.height=44;
      const tx = new THREE.CanvasTexture(cv); tx.magFilter=THREE.NearestFilter;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tx, transparent:true, depthWrite:false, depthTest:false}));
      sp.scale.set(2.2,1.01,1); sp.renderOrder=901; sp.visible=false; scene.add(sp);
      this.dmgNums.push({sp, cv, tx, life:0, t:0, vy:0});
    }
  },

  particle(x,y,z, opt){
    for(let i=0;i<this.MAXP;i++){
      const p = this.particles[i];
      if(p.life<=0){
        p.life = p.t = opt.life||0.5;
        p.vx=opt.vx||0; p.vy=opt.vy||0; p.vz=opt.vz||0;
        p.g = opt.g||0; p.drag = opt.drag==null?1:opt.drag;
        p.s0 = opt.s0||0.2; p.s1 = opt.s1==null?p.s0*0.3:opt.s1;
        const m = G.pmat(opt.color||0xffffff, opt.kind||'a');
        p.sp.material = m; p.sp.visible = true;
        p.sp.position.set(x,y,z);
        p.sp.scale.set(p.s0,p.s0,1);
        return;
      }
    }
  },
  burst(x,y,z, n, opt){
    for(let i=0;i<n;i++){
      const a = Math.random()*G.TAU, sp = (opt.spd||3)*(0.3+Math.random()*0.9);
      this.particle(x,y,z,{
        vx:Math.cos(a)*sp, vz:Math.sin(a)*sp, vy:(opt.vy==null?1.5:opt.vy)*(0.4+Math.random()),
        life:(opt.life||0.5)*(0.6+Math.random()*0.8), color:opt.color, kind:opt.kind,
        g:opt.g==null?-6:opt.g, s0:(opt.s0||0.16)*(0.7+Math.random()*0.6), drag:opt.drag||0.94
      });
    }
  },
  // 常用爆发
  sparks(x,y,z,color){ this.burst(x,y,z,7,{color:color||0xffe9a0, spd:4.5, life:.35, s0:.12}); },
  blood(x,y,z,color){ this.burst(x,y,z,9,{color:color||0xc03028, spd:3, vy:2.2, life:.5, s0:.15, kind:'a'}); },
  smoke(x,y,z,n,big){ this.burst(x,y,z,n||5,{color:0x605858, spd:1, vy:1.2, life:.9, s0:(big?0.5:0.3), kind:'m', g:0.5}); },
  wood(x,y,z){ this.burst(x,y,z,10,{color:0x9a7040, spd:3.5, vy:2.5, life:.5, s0:.14, kind:'m', g:-9}); },
  poof(x,y,z,color){ this.burst(x,y,z,12,{color:color||0xd8d0c0, spd:2.5, vy:.8, life:.4, s0:.28, kind:'m', g:0}); },
  confetti(x,y,z){
    const cols=[0xff5020,0xffe9a0,0x50c8ff,0x50ffa0,0xc060ff,0xff7ac0];
    this.burst(x,y,z,14,{color:cols[(Math.random()*cols.length)|0], spd:4, vy:5, life:1.4, s0:.18, kind:'s', g:-9});
  },

  light(x,y,z,color,intensity,life){
    let best=null;
    for(const it of this.lights){ if(it.life<=0){best=it;break;} }
    if(!best){ best=this.lights[0]; for(const it of this.lights) if(it.t/it.life < best.t/best.life) best=it; }
    best.life=best.t=life||0.25; best.i0=intensity==null?2.2:intensity; best.flicker=0;
    best.l.color.set(color==null?0xffffff:color);
    best.l.position.set(x,y,z); best.l.intensity=best.i0; best.l.visible=true; best.holder=null;
    return best;
  },
  // 持续光源（火把等），每帧续约
  holdLight(id,x,y,z,color,intensity){
    let it = this._held && this._held[id];
    if(!it){ // 找空闲或到期的
      for(const l of this.lights) if(l.life<=0 && (!l.holder||l.holder===id)){ it=l; break; }
      if(!it) return;
      it.holder=id; (this._held=this._held||{})[id]=it;
    }
    it.life=0.2; it.t=0.01; it.i0=intensity; it.flicker=1;
    it.l.color.set(color); it.l.position.set(x,y,z); it.l.intensity=intensity; it.l.visible=true;
  },

  ring(x,z,r1,color,life){
    for(const r of this.rings){ if(r.life<=0){
      r.life=r.t=life||0.35; r.r1=r1||2.5; r.c=color==null?0xffffff:color;
      r.m.material.color.set(r.c); r.m.position.set(x,0.08,z); r.m.visible=true; return;
    }}
  },

  shake(v){ this.trauma = Math.min(1, this.trauma + v); },
  hitstop(t){ this.hitstopT = Math.max(this.hitstopT, t); },
  slowmo(scale, t){ this._tgtScale=scale; this.timeScale=scale; this._slowT=t; },

  dmgNum(x,y,z,val,crit){
    let d=null;
    for(const it of this.dmgNums){ if(it.life<=0){d=it;break;} }
    if(!d) d=this.dmgNums[0];
    const c=d.cv, ctx=c.getContext('2d');
    ctx.clearRect(0,0,96,44);
    ctx.font = (crit?'bold 34px':'bold 27px')+' Consolas, monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth=4; ctx.strokeStyle='rgba(0,0,0,.9)'; // 描边：任何背景下可读
    ctx.strokeText(val, 48, crit?24:22);
    ctx.fillStyle= crit?'#ffd23e':'#ffffff'; ctx.fillText(val, 48, crit?23:22);
    d.tx.needsUpdate=true;
    d.life=d.t=crit?0.8:0.6; d.vy=1.8;
    d.sp.material.opacity=1; d.sp.visible=true; d.sp.position.set(x+(Math.random()-.5)*.4, y, z+(Math.random()-.5)*.4);
  },

  /* 锯齿闪电：两点间随机折线，短暂显示后消失（电弧链武器特效） */
  lightning(x1,y1,z1,x2,y2,z2,color,segs){
    segs=segs||6;
    const pts=[];
    for(let i=0;i<=segs;i++){
      const t=i/segs;
      const jx=(i>0&&i<segs)?(Math.random()-.5)*.8:0, jy=(i>0&&i<segs)?(Math.random()-.5)*.5:0, jz=(i>0&&i<segs)?(Math.random()-.5)*.8:0;
      pts.push(new THREE.Vector3(G.lerp(x1,x2,t)+jx, G.lerp(y1,y2,t)+jy, G.lerp(z1,z2,t)+jz));
    }
    const geo=new THREE.BufferGeometry().setFromPoints(pts);
    const mat=new THREE.LineBasicMaterial({color:color==null?0xdff0ff:color, transparent:true, opacity:1, depthWrite:false});
    const line=new THREE.Line(geo,mat);
    this.scene.add(line);
    // 短命自管理：直接挂到 particles 之外的小列表
    (this._bolts=this._bolts||[]).push({line,t:.14,life:.14});
    // 电光点光
    this.light((x1+x2)/2,(y1+y2)/2,(z1+z2)/2, color==null?0xbfe0ff:color, 2.2, .12);
  },

  update(dt){
    // 闪电线衰减
    if(this._bolts){
      for(let i=this._bolts.length-1;i>=0;i--){
        const b=this._bolts[i];
        b.t-=dt;
        if(b.t<=0){
          this.scene.remove(b.line);
          b.line.geometry.dispose(); b.line.material.dispose();
          this._bolts.splice(i,1);
        } else {
          b.line.material.opacity=b.t/b.life;
        }
      }
    }
    for(const p of this.particles){
      if(p.life<=0) continue;
      p.t-=dt;
      if(p.t<=0){ p.life=0; p.sp.visible=false; continue; }
      const k=p.t/p.life;
      p.vy+=p.g*dt; p.vx*=p.drag; p.vz*=p.drag;
      p.sp.position.x+=p.vx*dt; p.sp.position.y+=p.vy*dt; p.sp.position.z+=p.vz*dt;
      if(p.sp.position.y<0.03 && p.vy<0){ p.sp.position.y=0.03; p.vy*=-0.4; p.vx*=.6; p.vz*=.6; }
      const s=G.lerp(p.s1,p.s0,k);
      p.sp.scale.set(s,s,1);
    }
    for(const it of this.lights){
      if(it.life<=0){ if(it.l.visible) it.l.visible=false; continue; }
      it.t-=dt;
      if(it.t<=0){ it.life=0; it.l.visible=false; it.holder=null; continue; }
      let f=1;
      if(it.flicker) f=0.82+Math.sin(performance.now()*0.02+it.l.position.x*7)*0.18;
      it.l.intensity = it.i0*(it.t/it.life)*f;
    }
    for(const r of this.rings){
      if(r.life<=0){ if(r.m.visible) r.m.visible=false; continue; }
      r.t-=dt;
      if(r.t<=0){ r.life=0; r.m.visible=false; continue; }
      const k=1-r.t/r.life;
      const rad=G.lerp(0.3,r.r1,k);
      r.m.scale.set(rad,rad,1);
      r.m.material.opacity=(1-k)*0.8;
    }
    for(const d of this.dmgNums){
      if(d.life<=0){ if(d.sp.visible) d.sp.visible=false; continue; }
      d.t-=dt;
      if(d.t<=0){ d.life=0; d.sp.visible=false; continue; }
      d.sp.position.y += d.vy*dt; d.vy*=0.94;
      d.sp.material.opacity = Math.min(1, d.t/0.25);
    }
    this.trauma = Math.max(0, this.trauma - dt*1.6);
    if(this._slowT!=null){ this._slowT-=dt; if(this._slowT<=0){ this._tgtScale=1; this._slowT=null; } }
    if(this.timeScale!==this._tgtScale) this.timeScale=G.lerp(this.timeScale,this._tgtScale,0.2);
  }
};
G.fx = F;
})();
