/* 第九层事故 - 核心工具：RNG / 数学 / 材质缓存 / 几何构建器 / 输入 / 贴图 */
'use strict';
window.G = window.G || {};
(function(){
const TAU = Math.PI*2;
G.TAU = TAU;
G.clamp = (v,a,b)=> v<a?a:(v>b?b:v);
G.lerp = (a,b,t)=> a+(b-a)*t;
G.dist = (x1,z1,x2,z2)=> Math.hypot(x2-x1,z2-z1);
G.dist2 = (x1,z1,x2,z2)=>{const dx=x2-x1,dz=z2-z1;return dx*dx+dz*dz;};
G.angTo = (x1,z1,x2,z2)=> Math.atan2(z2-z1,x2-x1);
G.angLerp = (a,b,t)=>{let d=(b-a)%TAU; if(d>Math.PI)d-=TAU; if(d<-Math.PI)d+=TAU; return a+d*t;};
G.sign = v=> v<0?-1:1;

/* ---------- 可复现 RNG ---------- */
class RNG{
  constructor(seed){ this.s = (seed>>>0) || 88675123; }
  next(){ let x=this.s; x^=x<<13; x>>>=0; x^=x>>17; x^=x<<5; x>>>=0; this.s=x; return x; }
  f(){ return this.next()/4294967296; }
  range(a,b){ return a + (b-a)*this.f(); }
  int(a,b){ return a + Math.floor(this.f()*(b-a+1)); }
  pick(arr){ return arr[Math.floor(this.f()*arr.length)]; }
  chance(p){ return this.f() < p; }
  shuffle(arr){ for(let i=arr.length-1;i>0;i--){const j=Math.floor(this.f()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }
}
G.RNG = RNG;
G.rng = new RNG(Date.now()&0x7fffffff);

/* ---------- 材质缓存 ---------- */
const _mats = {};
G.mat = function(color, opt){
  opt = opt||{};
  const key = color+'|'+(opt.emissive||0)+'|'+(opt.ei||0)+'|'+(opt.transparent?1:0)+'|'+(opt.opacity||1)+'|'+(opt.side||0);
  if(_mats[key]) return _mats[key];
  const m = new THREE.MeshLambertMaterial({ color });
  if(opt.emissive){ m.emissive = new THREE.Color(opt.emissive); m.emissiveIntensity = opt.ei||1; }
  if(opt.transparent){ m.transparent=true; m.opacity = opt.opacity==null?1:opt.opacity; }
  if(opt.side) m.side = opt.side;
  _mats[key]=m; return m;
};
const _bmats = {};
G.bmat = function(color, opacity){ // 无光照发光材质
  const key = color+'|'+(opacity==null?1:opacity);
  if(_bmats[key]) return _bmats[key];
  const m = new THREE.MeshBasicMaterial({ color });
  if(opacity!=null && opacity<1){ m.transparent=true; m.opacity=opacity; }
  _bmats[key]=m; return m;
};
G.flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // 受击闪白
G.vcolMat = new THREE.MeshLambertMaterial({ vertexColors: true }); // 合并几何共用
G.vcolBMat = new THREE.MeshBasicMaterial({ vertexColors: true });
// 地板专用：Phong 顶点色 + 微弱镜面高光（现代质感，光源扫过时有湿润反光）
G.vcolFloorMat = new THREE.MeshPhongMaterial({ vertexColors:true, shininess:42, specular:0x404038 });

/* ---------- 共享几何 ---------- */
const _geos = {};
G.boxGeo = function(w,h,d){
  const k = 'b'+w+','+h+','+d;
  if(_geos[k]) return _geos[k];
  return _geos[k] = new THREE.BoxGeometry(w,h,d);
};
G.sphGeo = function(r,seg){
  seg = seg||6;
  const k='s'+r+','+seg;
  if(_geos[k]) return _geos[k];
  return _geos[k]= new THREE.SphereGeometry(r,seg,Math.max(4,seg-2));
};
G.cylGeo = function(rT,rB,h,seg){
  const k='c'+rT+','+rB+','+h+','+seg;
  if(_geos[k]) return _geos[k];
  return _geos[k]= new THREE.CylinderGeometry(rT,rB,h,seg);
};
G.coneGeo = function(r,h,seg){
  const k='k'+r+','+h+','+(seg||6);
  if(_geos[k]) return _geos[k];
  return _geos[k]= new THREE.ConeGeometry(r,h,seg||6);
};

/* ---------- 顶点色几何构建器（合并静态几何，减少draw call） ---------- */
const _tmpM = new THREE.Matrix4(), _tmpQ = new THREE.Quaternion(), _tmpE = new THREE.Euler(),
      _tmpV = new THREE.Vector3(), _tmpS = new THREE.Vector3(1,1,1);
class GeoBuilder{
  constructor(){ this.pos=[]; this.nor=[]; this.col=[]; this.uv=[]; this.idx=[]; this.v=0; }
  _push(g, color){
    const p=g.attributes.position, n=g.attributes.normal, ix=g.index;
    const uv = g.attributes.uv;
    const c = new THREE.Color(color);
    for(let i=0;i<p.count;i++){
      this.pos.push(p.getX(i),p.getY(i),p.getZ(i));
      this.nor.push(n.getX(i),n.getY(i),n.getZ(i));
      this.col.push(c.r,c.g,c.b);
      if(uv){ this.uv.push(uv.getX(i), uv.getY(i)); } else { this.uv.push(0,0); }
    }
    if(ix) for(let i=0;i<ix.count;i++) this.idx.push(ix.getX(i)+this.v);
    else for(let i=0;i<p.count;i++) this.idx.push(i+this.v);
    this.v += p.count;
  }
  box(cx,cy,cz,w,h,d,color,ry,rx,rz){
    const g = new THREE.BoxGeometry(w,h,d);
    if(ry||rx||rz){ _tmpE.set(rx||0,ry||0,rz||0); _tmpQ.setFromEuler(_tmpE); _tmpM.compose(_tmpV.set(0,0,0),_tmpQ,_tmpS); g.applyMatrix4(_tmpM); }
    g.translate(cx,cy,cz);
    this._push(g,color); g.dispose();
    return this;
  }
  cyl(cx,cy,cz,rT,rB,h,color,seg){
    const g = new THREE.CylinderGeometry(rT,rB,h,seg||6); g.translate(cx,cy,cz); this._push(g,color); g.dispose(); return this;
  }
  cone(cx,cy,cz,r,h,color,seg){
    const g = new THREE.ConeGeometry(r,h,seg||6); g.translate(cx,cy,cz); this._push(g,color); g.dispose(); return this;
  }
  sph(cx,cy,cz,r,color,seg){
    const g = new THREE.SphereGeometry(r,seg||6,Math.max(4,(seg||6)-1)); g.translate(cx,cy,cz); this._push(g,color); g.dispose(); return this;
  }
  planeXZ(cx,y,cz,w,d,color){ // 朝上的地板面
    const g = new THREE.PlaneGeometry(w,d); g.rotateX(-Math.PI/2); g.translate(cx,y,cz); this._push(g,color); g.dispose(); return this;
  }
  build(){ // 返回纯 BufferGeometry（带顶点色 + UV）
    if(this.v===0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos,3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor,3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col,3));
    if(this.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv,2));
    g.setIndex(this.idx);
    return g;
  }
  buildMesh(mat){
    const g=this.build();
    return g? new THREE.Mesh(g, mat||G.vcolMat) : new THREE.Group();
  }
}
G.GeoBuilder = GeoBuilder;

/* ---------- 程序化贴图（无外部资源） ---------- */
const _tex = {};
G.tex = function(name){
  if(_tex[name]) return _tex[name];
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  const drawDot = (sz, stops)=>{
    c.width=c.height=sz;
    const g = ctx.createRadialGradient(sz/2,sz/2,0,sz/2,sz/2,sz/2);
    stops.forEach(s=>g.addColorStop(s[0],s[1]));
    ctx.fillStyle=g; ctx.fillRect(0,0,sz,sz);
  };
  switch(name){
    case 'soft': drawDot(32,[[0,'rgba(255,255,255,1)'],[0.35,'rgba(255,255,255,.8)'],[1,'rgba(255,255,255,0)']]); break;
    case 'hard': drawDot(32,[[0,'rgba(255,255,255,1)'],[0.5,'rgba(255,255,255,.95)'],[0.75,'rgba(255,255,255,.3)'],[1,'rgba(255,255,255,0)']]); break;
    case 'smoke': drawDot(32,[[0,'rgba(255,255,255,.55)'],[0.6,'rgba(255,255,255,.28)'],[1,'rgba(255,255,255,0)']]); break;
    case 'ring': {
      c.width=c.height=48; ctx.strokeStyle='rgba(255,255,255,1)'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.arc(24,24,16,0,TAU); ctx.stroke(); break;
    }
    case 'flame': {
      c.width=c.height=24; const g=ctx.createRadialGradient(12,14,1,12,12,11);
      g.addColorStop(0,'#fff6d0'); g.addColorStop(0.4,'#ffc23e'); g.addColorStop(0.8,'#e8501e'); g.addColorStop(1,'rgba(120,30,10,0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,24,24); break;
    }
    case 'hex': {
      c.width=c.height=24; ctx.fillStyle='rgba(255,255,255,1)';
      ctx.beginPath(); for(let i=0;i<6;i++){ const a=i/6*TAU; const x=12+Math.cos(a)*10,y=12+Math.sin(a)*10; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
      ctx.closePath(); ctx.fill(); break;
    }
  }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  _tex[name]=t; return t;
};

/* ---------- 本地图片贴图加载（A+B 美术试点） ----------
   file:// 下 THREE.TextureLoader 依赖的 worker/XHR 加载本地文件不可用，
   改用 img 元素 + THREE.Texture（img 加载 file:// 图片是允许的）。 */
const _imgTex = {};
G.imgTex = function(url, cb){
  const rec = _imgTex[url] || (_imgTex[url]={ tex:null, cbs:[] });
  if(rec.tex){ if(cb) cb(rec.tex); return rec; }
  if(cb) rec.cbs.push(cb);
  if(!rec.im){
    const im = new Image();
    im.onload = ()=>{
      const t = new THREE.Texture(im);
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
      t.needsUpdate = true;
      rec.tex = t;
      rec.cbs.forEach(f=>f(t)); rec.cbs = [];
    };
    im.onerror = ()=>{ rec.cbs = []; };   // 加载失败：放弃等待（buildFloor 回退纯色）
    im.src = url;
    rec.im = im;
  }
  return rec;
};
/* 程序化像素砖纹理：明亮单砖 + 深砖缝 + 明暗噪点（A+B 试点修正版）
   替代暗色 AI 图：AI 生成 JPG 为暗色系，× 暗顶点色 × 暗光照 = 纯黑；改为程序化生成保证亮度可控、无缝、风格统一 */
G.floorPixTex = function(rgb){
  const key='fpx'+rgb.join(',');
  if(_tex[key]) return _tex[key];
  const c=document.createElement('canvas'); c.width=32; c.height=32;
  const cx=c.getContext('2d');
  // 砖面：基色提亮 45，保证在暗光照下清晰可见
  const r=Math.min(255,rgb[0]+45), g=Math.min(255,rgb[1]+45), b=Math.min(255,rgb[2]+45);
  cx.fillStyle='rgb('+r+','+g+','+b+')'; cx.fillRect(0,0,32,32);
  // 砖缝：四周深色边缘
  cx.fillStyle='rgba(16,12,8,0.9)';
  cx.fillRect(0,0,32,2); cx.fillRect(0,30,32,2); cx.fillRect(0,0,2,32); cx.fillRect(30,0,2,32);
  // 明暗噪点：单砖细微颗粒感
  const img=cx.getImageData(0,0,32,32);
  for(let i=0;i<img.data.length;i+=4){ const v=(Math.random()*28-14)|0; img.data[i]=Math.max(0,Math.min(255,img.data[i]+v)); img.data[i+1]=Math.max(0,Math.min(255,img.data[i+1]+v)); img.data[i+2]=Math.max(0,Math.min(255,img.data[i+2]+v)); }
  cx.putImageData(img,0,0);
  const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter;
  t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.RepeatWrapping;
  t.needsUpdate=true;
  _tex[key]=t; return t;
};
/* 地板贴图材质：MeshPhongMaterial + 顶点色 + 像素贴图（顶点色乘纹理，保留棋盘明暗） */
G.floorTexMat = function(tex, repeat){
  const m = new THREE.MeshPhongMaterial({ vertexColors:true, map:tex, shininess:42, specular:0x404038 });
  if(repeat){ tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat, repeat); tex.needsUpdate = true; }
  return m;
};

/* 粒子调色板 Sprite 材质（加法/普通 两类） */
G.pmats = {};
{
  const palette = [0xffffff,0xffe9a0,0xffa030,0xff5020,0xe02020,0xff7ac0,0xa0e8ff,0x50c8ff,0x50ffa0,0x90e050,0xc060ff,0x808890,0x404048];
  for(const col of palette){
    G.pmats['a'+col] = new THREE.SpriteMaterial({ map:G.tex('soft'), color:col, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true });
    G.pmats['s'+col] = new THREE.SpriteMaterial({ map:G.tex('hard'), color:col, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true });
    G.pmats['m'+col] = new THREE.SpriteMaterial({ map:G.tex('smoke'), color:col, depthWrite:false, transparent:true });
  }
}
G.pmat = (col, kind)=>{
  const key=(kind||'a')+col;
  if(G.pmats[key]) return G.pmats[key];
  const map = kind==='m'?'smoke':(kind==='s'?'hard':'soft');
  return G.pmats[key] = new THREE.SpriteMaterial({
    map:G.tex(map), color:col,
    blending: kind==='m'?THREE.NormalBlending:THREE.AdditiveBlending,
    depthWrite:false, transparent:true
  });
};

/* ---------- 输入 ---------- */
const key = {}, mouse = { x:0, y:0, down:false, rdown:false, wheel:0, inWindow:true };
G.input = {
  key, mouse,
  pressed:{}, // 本帧按下
  buffer:{},  // 输入缓冲：按下后 0.18 秒内在逻辑帧中仍可生效（顿帧/尚未进入交互范围时不吞按键）
  aimX:0, aimZ:0, // 世界坐标瞄准点（由相机射线更新）
  init(){
    window.addEventListener('keydown', e=>{
      if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
      if(!key[e.code]){ this.pressed[e.code]=true; this.buffer[e.code]=.18; }
      key[e.code]=true;
      G.onKeyPress && G.onKeyPress(e.code);
    });
    window.addEventListener('keyup', e=>{ key[e.code]=false; });
    window.addEventListener('blur', ()=>{ for(const k in key) key[k]=false; mouse.down=false; });
    const cvs = document.getElementById('game');
    window.addEventListener('mousemove', e=>{
      mouse.x = e.clientX; mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', e=>{
      if(e.button===0) mouse.down=true;
      if(e.button===2) mouse.rdown=true;
      G.audio && G.audio.unlock();
    });
    window.addEventListener('mouseup', e=>{ if(e.button===0) mouse.down=false; if(e.button===2) mouse.rdown=false; });
    window.addEventListener('wheel', e=>{ mouse.wheel += Math.sign(e.deltaY); }, {passive:true});
    window.addEventListener('contextmenu', e=>e.preventDefault());
  },
  axis(){ // WASD/方向键 -> 归一化
    let x=0,z=0;
    if(key['KeyW']||key['ArrowUp']) z-=1;
    if(key['KeyS']||key['ArrowDown']) z+=1;
    if(key['KeyA']||key['ArrowLeft']) x-=1;
    if(key['KeyD']||key['ArrowRight']) x+=1;
    if(x&&z){ x*=0.70711; z*=0.70711; }
    return {x,z};
  },
  consumeWheel(){ const w=mouse.wheel; mouse.wheel=0; return w; },
  /* 输入缓冲 API：buffered 查询是否在缓冲期内；consume 用掉一次；stepBuffers 按逻辑帧倒计时 */
  buffered(code){ return (this.buffer[code]||0)>0; },
  consume(code){ delete this.buffer[code]; },
  stepBuffers(dt){ for(const k in this.buffer){ this.buffer[k]-=dt; if(this.buffer[k]<=0) delete this.buffer[k]; } },
  endFrame(){ this.pressed={}; }   // wheel 不在此清（2026-09-02）：高刷屏下渲染帧多于逻辑帧，事件易被中途清掉丢失；改由 consumeWheel 消费 + shop 开关时重置
};

/* DOM 快捷 */
G.$ = id=>document.getElementById(id);
G.rgb = (r,g,b)=> (r<<16)|(g<<8)|b;
})();
