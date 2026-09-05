/* 第九层事故 - 游戏主控：状态机 / 房间逻辑 / 相机 / 主循环 / 自测 */
'use strict';
(function(){
const GAME = {
  state:'boot', floorNum:1, floor:null, player:null, run:null,
  curRoom:null, curInteract:null, spawnQueue:[], strikes:[], flyingCrown:null,
  inBase:false,
  manual:false, acc:0, lastT:0, camX:0, camZ:0, _mmT:0,

  init(){
    // 场景
    G.scene = new THREE.Scene();
    G.world = new THREE.Group();
    G.scene.add(G.world);
    // 灯光
    const ambient=new THREE.AmbientLight(0xffffff,.6);
    const hemi=new THREE.HemisphereLight(0xffffff,0x222222,.5);
    const dir=new THREE.DirectionalLight(0xffffff,.8);
    dir.position.set(6,14,4);
    dir.castShadow=G.renderer!==null;
    if(G.renderer){
      dir.shadow.mapSize.set(1024,1024);
      const sc=dir.shadow.camera;
      sc.left=-24; sc.right=24; sc.top=24; sc.bottom=-24; sc.near=1; sc.far=45;
      dir.shadow.bias=-0.002;
    }
    const dirTarget=new THREE.Object3D();
    G.scene.add(dirTarget); dir.target=dirTarget;
    G.scene.add(ambient,hemi,dir);
    G.lights={ambient,hemi,dir,dirTarget};
    // 相机
    G.camera=new THREE.PerspectiveCamera(46, 16/9, .1, 60);
    // 子系统
    G.fx.init(G.scene);
    G.weapons.init(G.scene);
    G.props=[];
    G.pickups=[];
    // 地面瞄准指示环（跟随光标落点，辅助俯视角瞄准）
    {
      const retRing=new THREE.Mesh(new THREE.RingGeometry(.18,.27,18),
        new THREE.MeshBasicMaterial({color:0xffd23e,transparent:true,opacity:.65,depthWrite:false}));
      retRing.rotation.x=-Math.PI/2;
      const retDot=new THREE.Mesh(G.sphGeo(.05,6), G.bmat(0xffe9a0));
      retDot.position.y=.02;
      G.reticle=new THREE.Group();
      G.reticle.add(retRing); G.reticle.add(retDot);
      G.reticle.position.y=.06;
      G.reticle.visible=false;
      G.scene.add(G.reticle);
    }
    this.state='title';
    G.audio.music('title');
    this.buildTitleScene();   // 初始加载即构建标题 3D 背景（深渊陈列室）
    // 按键钩子
    G.onKeyPress = (code)=>{
      if(code==='Escape'){
        if(G.shop && G.shop.isOpen()){ G.shop.close(); return; }   // 商店打开时 Esc 只关商店
        if(G.base && G.base.isOpen()){ G.base.closePanel(); return; } // 基地面板同理
        if(G.base && G.base.isDialogOpen()){ G.base.closeDialog(); return; } // NPC 对话框同理
        if(this.state==='play') this.togglePause(true);
        else if(this.state==='pause') this.togglePause(false);
      }
      if(code==='KeyE'){
        if(G.shop && G.shop.isOpen()){ G.shop.close(); return; }
        if(G.base && G.base.isOpen()){ G.base.closePanel(); return; }
        if(G.base && G.base.isDialogOpen()){ G.base.closeDialog(); return; }
      }
      // 死亡/胜利结算：E/回车/空格 返回基地（基地是默认归宿）
      if((code==='KeyE'||code==='Enter'||code==='Space') && (this.state==='dead'||this.state==='win')){
        this.returnToBase(); return;
      }
      if(code==='Tab' && (this.state==='play'||this.state==='pause')){
        if(this.inBase){ G.ui.toast('基地没有地图——深渊升降梯在西侧。'); return; }
        G.ui.bigmap(); // Tab 切换全屏大地图
        G.audio.sfx('ui',{v:.4});
      }
    };
  },

  /* ---------- 基地「废弃军械站」：局外循环中心 ----------
     集成方式：基地=特殊 floor（复用 tile 碰撞/房间/交互/构建管线）+ play 态 + inBase 旗标，
     主循环/暂停/交互零改动；地牢代码全部由 inBase 分支隔离。 */

  newGame(){                                        // 标题「开始」→ 基地（首次进基地带引导）
    if(this.state!=='title') return;
    this.state='transition';
    G.ui.screen(null);
    G.audio.sfx('doorOpen');
    G.ui.fade(true);
    setTimeout(()=>this.enterBase('title'), 480);
  },

  enterBase(from){                                  // from: 'title' | 'dead' | 'win'
    this.state='transition';
    G.shop && G.shop.close();
    G.base.closePanel();
    G.ui.screen(null); G.ui.fade(true); G.ui.prompt(null); G.ui.bigmap(false);
    setTimeout(()=>this._enterBaseNow(from), from==='title'?600:550);
  },
  _enterBaseNow(from){
    this.cleanupDynamic();
    this.run=this.newRun();                         // 基地复用 play 态主循环，run 必须非空（run.time 在基地照常走表）
    if(G.player){ G.scene.remove(G.player.mesh); G.player=null; }
    G.floor=this.floor=G.base.install();            // 每次重建：展示架/战利品随解锁成长
    this.floorNum=0;
    this.curRoom=this.floor.startRoom;
    G.player=G.createPlayer(18,11.5);    // 出生在深渊核心东侧（核心为中央视觉焦点，不压玩家）
    G.player.weapons=[G.weapons.mktWeapon('rusty')];
    const mb=G.meta.up('medbay'); if(mb){ G.player.maxHp+=2*mb; }   // 基地内即见升级效果
    G.player.hp=G.player.maxHp;
    this.state='play'; this.inBase=true;
    G.ui.showHud(false); G.ui.screen(null);
    G.audio.music('base');
    G.ui.fade(false);
    G.base.onEnter(from);
  },

  /* 死亡/胜利结算 → 返回基地（结算碎片一次性入账并 toast） */
  returnToBase(){
    if(this.state!=='dead' && this.state!=='win') return;
    if(performance.now()-(this._resultT||0)<700) return;   // 防死亡瞬间连按误触
    const result=this.state==='win'?'win':'dead';
    const gained=G.meta.awardRun(result, this.floorNum);
    if(result==='dead') G.meta.data.stats.deaths++;
    G.runShardMul=1;   // 结算：清贪婪祝福碎片乘区（runBoons 已在 startRun 消费）
    G.meta.save();
    this._shardToast='深渊碎片 +'+gained+' ◆（当前 '+G.meta.data.shards+'）';
    this.enterBase(result);
  },

  /* 基地 → 地牢：乘深渊升降梯，过场后走既有 startRun 全量重置 */
  launchRun(){
    if(this.state!=='play' || !this.inBase) return;
    G.base.closePanel();
    G.ui.prompt(null);
    this.state='transition';
    G.audio.sfx('doorOpen');
    G.ui.fade(true);
    setTimeout(()=>{
      this.inBase=false;
      G.base.hud(false);
      this.startRun();
      G.ui.fade(false);
    }, 550);
  },

  toTitle(){
    this.state='title'; this.inBase=false;
    G.shop && G.shop.close(); G.base.closePanel();
    this.cleanupDynamic();
    G.base.teardownWorld();
    if(G.player){ G.scene.remove(G.player.mesh); G.player=null; }
    this.floor=null; G.floor=null; this.floorNum=1;
    G.ui.showHud(false); G.base.hud(false); G.ui.screen('title');
    G.audio.music('title');
    this.buildTitleScene();   // 标题 3D 背景：深渊陈列室（game.js 渲染，toTitle 后常驻）
  },

  /* ---------- 标题屏 3D 背景：深渊陈列室 ---------- */
  buildTitleScene(){
    if(G.titleScene){ G.scene.remove(G.titleScene); this.disposeTitleScene(); }
    const g=new THREE.Group(); G.titleScene=g;
    // 地面：深色石板
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(42,24),
      new THREE.MeshStandardMaterial({color:0x241d16,roughness:.9}));
    floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; g.add(floor);
    // 地砖网格线（暗线勾勒）
    const grid=new THREE.GridHelper(42,14,0x4a3a28,0x2e2318);
    grid.position.y=.02; g.add(grid);
    // 中央深渊核心：发光球 + 辉光 + 双环 + 光柱
    const core=new THREE.Mesh(new THREE.SphereGeometry(1.45,24,16),
      new THREE.MeshStandardMaterial({color:0x8a4aff,emissive:0x9a5aff,emissiveIntensity:1.6,roughness:.25}));
    core.position.set(0,2.2,0); g.add(core);
    // 核心辉光（叠加光晕，向四周扩散）
    const glow=new THREE.Mesh(new THREE.CircleGeometry(6,32),
      new THREE.MeshBasicMaterial({color:0x8a5aff,transparent:true,opacity:.20,blending:THREE.AdditiveBlending,depthWrite:false}));
    glow.rotation.x=-Math.PI/2; glow.position.set(0,.5,0); g.add(glow);
    const glowT=new THREE.Mesh(new THREE.CircleGeometry(4,32),
      new THREE.MeshBasicMaterial({color:0xb08aff,transparent:true,opacity:.14,blending:THREE.AdditiveBlending,depthWrite:false}));
    glowT.rotation.x=-Math.PI/2; glowT.position.set(0,4.4,0); g.add(glowT);
    const ringA=new THREE.Mesh(new THREE.TorusGeometry(2.5,.11,8,48),
      new THREE.MeshStandardMaterial({color:0xc8a8ff,emissive:0x8a5aff,emissiveIntensity:.85,roughness:.4}));
    ringA.rotation.x=Math.PI/2.25; ringA.position.y=2.2; g.add(ringA);
    const ringB=new THREE.Mesh(new THREE.TorusGeometry(2.05,.09,8,48),
      new THREE.MeshStandardMaterial({color:0xffe0c0,emissive:0xffb060,emissiveIntensity:.6,roughness:.5}));
    ringB.rotation.x=Math.PI/2.8; ringB.rotation.y=.4; ringB.position.y=2.2; g.add(ringB);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.28,.55,6.5,12,1,true),
      new THREE.MeshBasicMaterial({color:0x9a6aff,transparent:true,opacity:.26,blending:THREE.AdditiveBlending,depthWrite:false}));
    beam.position.y=5.2; g.add(beam);
    // 底座：暗色平台环
    const plinth=new THREE.Mesh(new THREE.CylinderGeometry(3.4,.5,1.1,32),
      new THREE.MeshStandardMaterial({color:0x3a2a1a,roughness:.75,emissive:0x1c1208,emissiveIntensity:.4}));
    plinth.position.y=.55; g.add(plinth);
    // 巡场小怪：复用游戏内真实敌人造型（低模像素形象），面向核心浮动，体型放大更显眼
    // 巡场小怪：分散到四周（避开中央标题/按钮/底部说明区），右侧留给玩家对峙，体型缩小
    const foes=[['gunner',8.8,-4.6,1.8],['charger',-8.8,-4.6,1.65],['shield',6.0,-4.0,1.95],['totem',-6.0,-4.0,1.65],['wisp',10.2,-1.4,1.4],['shroom',-10.4,-0.2,1.55],['orbiter',10.8,3.6,1.3],['gravitator',-10.6,3.0,1.4],['phaseprowler',-3.0,6.0,1.4],['mirror',2.8,6.4,1.5]];
    const foeMats=[];
    for(const [type,fx,fz,s] of foes){
      const {group}=G.enemies.makeMesh(type);
      group.position.set(fx,.1,fz);
      group.scale.setScalar(s);
      group.rotation.y=Math.atan2(-fx,-fz);   // 面向中央核心
      g.add(group);
      // 移动速度沿用游戏内 E.defs[type].spd（走位/速度与局内一致；spd=0 的施法型保持原地）
      const espd=G.enemies.defs[type]?G.enemies.defs[type].spd:1.5;
      // 弹幕色（贴合各小怪局内子弹色）；近战型（冲锋兽/盾卫）不发射
      const bcols={gunner:0xff4030, totem:0x8a5aff, wisp:0xffd040, shroom:0xb06aff, orbiter:0xffa040, gravitator:0x9a6aff, mirror:0x18c8ff, phaseprowler:0xff5030};
      const bcolor=bcols[type]||0;
      foeMats.push({g:group, s, spd:espd, hx:fx, hz:fz, wx:fx, wz:fz, waitt:.4+Math.random()*.8, baseY:.1, bob:.18, hitT:0, photoT:0, frame:null,
        atkT:.6+Math.random()*1.6, bcolor});
    }
    G._tEnemies=foeMats;
    // 主角：复用游戏内真实造型 + 游戏内拍立得双反相机建模（refs.cam），朝左方小怪持机「射击」
    const pm=G.PlayerMesh();
    const playerG=pm.group;
    playerG.position.set(7.4,0,.5);
    playerG.scale.setScalar(1.7);
    playerG.rotation.y=-Math.atan2(-.5,-7.4);  // 模型 forward=+X；朝向左方小怪（面向核心方向）
    g.add(playerG);
    // 与局内装备逻辑一致：隐藏默认枪身，渲染拍立得双反相机（镜头即枪口）
    pm.refs.gunMesh.visible=false; pm.refs.cam.visible=true;
    // 主角脚下蓝紫光圈（登场感，暗角下醒目）
    const pAura=new THREE.Mesh(new THREE.RingGeometry(.9,1.16,28),
      new THREE.MeshBasicMaterial({color:0x8a5aff,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
    pAura.rotation.x=-Math.PI/2; pAura.position.y=.05;
    playerG.add(pAura);
    // 扇形地面曝光（拍立得拍照演出）：朝玩家 facing(+X 本地)铺开的光圈，开火时扩散
    const fanGeo=new THREE.CircleGeometry(2.6,24,-.62,1.24); fanGeo.rotateX(-Math.PI/2);
    const fanMat=new THREE.MeshBasicMaterial({color:0xfff6e0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    const fan=new THREE.Mesh(fanGeo,fanMat); fan.position.set(1.5,.08,0);
    playerG.add(fan);
    G._tPlayer={g:playerG, baseY:0, refs:pm.refs, fan, shotT:0, fightT:1.2, tgt:0};
    // 巡场小怪弹幕（菜单自建轻量弹幕，G.weapons 仅在 play 分支更新故不复用）
    G._tBullets=[];
    // 漂浮杂物：骰子/黑胶/弹壳（近景层次）
    const debris=[]; g.userData.debris=debris;
    const mk=(geo,mat,pos,spin)=>{ const o=new THREE.Mesh(geo,mat); o.position.set(...pos); g.add(o); debris.push({o,spin,base:pos[1]}); return o; };
    mk(new THREE.BoxGeometry(.5,.5,.5),new THREE.MeshStandardMaterial({color:0xb0b8c8,roughness:.5,metalness:.5}),[-7.5,1.6,6.5],[-.9,.7,-.5]);
    mk(new THREE.CylinderGeometry(.55,.55,.14,20),new THREE.MeshStandardMaterial({color:0x1a1a22,roughness:.7,metalness:.3,emissive:0x3a3a50,emissiveIntensity:.4}),[6.8,1.5,-7.6],[0,.9,.3]);
    mk(new THREE.CylinderGeometry(.09,.09,.4,8),new THREE.MeshStandardMaterial({color:0xd8a040,roughness:.4,metalness:.9}),[5.4,1.1,7.2],[0,2.4,.6]);
    mk(new THREE.CylinderGeometry(.09,.09,.4,8),new THREE.MeshStandardMaterial({color:0xc8b050,roughness:.4,metalness:.9}),[4.6,1.2,7.6],[0,2.1,-.5]);
    mk(new THREE.TorusGeometry(.45,.12,8,20),new THREE.MeshStandardMaterial({color:0x50c8e0,roughness:.5,metalness:.4,emissive:0x2080a0,emissiveIntensity:.5}),[-6,1.8,-6.8],[.7,.5,1.1]);
    // 相机：俯视核心
    G.camera.position.set(0,15.5,11.5); G.camera.lookAt(0,0,0);
    G.scene.add(g);
  },
  disposeTitleScene(){
    const g=G.titleScene; if(!g) return;
    // 关键：必须先从场景移除 group，否则 mesh 残留并叠加在基地/地牢场景上（标题屏穿模 Bug）
    if(g.parent) g.parent.remove(g);
    // 不 dispose 场景内 mesh 的几何/材质/贴图：它们绝大多数复用项目级共享缓存
    // （G.boxGeo/G.bmat/G.pmats 均为模块级缓存，同参数返回同一实例；小怪=enemies 模型池、玩家=PlayerMesh），
    // dispose 会误伤共享实例，进基地/地牢复用同一资源时偶发 Script error（GPU 重传竞态）。
    // 共享缓存由 Three.js 自动管理，移除场景树即可；仅清理标题私有资源（_tPhotoMat/_tBullets）。
    G.titleScene=null;
    G._tEnemies=null; G._tPlayer=null;   // 巡场小怪/主角引用清空（不跨场景残留）
    if(this._tPhotoMat){ this._tPhotoMat.dispose(); this._tPhotoMat=null; }   // 菜单拍照灰调材质回收
    if(G._tBullets){ for(const b of G._tBullets){ if(b.m.parent) b.m.parent.remove(b.m); if(b.m.geometry) b.m.geometry.dispose(); if(b.m.material) b.m.material.dispose(); for(const c of (b.m.children||[])){ if(c.material) c.material.dispose(); } } G._tBullets=null; }
  },
  /* ---------- 标题菜单拍立得演出：拍照（灰调相纸+相框）→ 照片冲洗（爆伤害数字） ---------- */
  _tPhotoShoot(t){
    if(!this._tPhotoMat) this._tPhotoMat=new THREE.MeshLambertMaterial({color:0xbdb4a0});  // 旧相纸灰（与局内 P.mat 同色）
    t.g.traverse(o=>{ if(o.isMesh && o.material!==this._tPhotoMat){ o.userData._tp0=o.material; o.material=this._tPhotoMat; } });
    if(!t.frame){   // 脚下圆形相框（白边相纸）
      const fm=new THREE.Mesh(new THREE.RingGeometry(.34,.46,24),
        new THREE.MeshBasicMaterial({color:0xece6d8,transparent:true,opacity:.95,side:THREE.DoubleSide,depthWrite:false}));
      fm.rotation.x=-Math.PI/2; fm.position.y=.06;
      t.g.add(fm); t.frame=fm;
    }
    t.photoT=.55;
  },
  _tPhotoResolve(t){
    t.g.traverse(o=>{ if(o.isMesh && o.userData._tp0){ o.material=o.userData._tp0; o.userData._tp0=null; } });
    if(t.frame){ t.g.remove(t.frame); t.frame.geometry.dispose(); t.frame.material.dispose(); t.frame=null; }
    const tw=t.g.position;
    G.fx.particle(tw.x,1.2,tw.z,{vx:0,vy:0,vz:0,life:.12,color:0xffffff,s0:1.0,kind:'a'});       // 冲洗白闪
    for(let i=0;i<8;i++) G.fx.particle(tw.x+(Math.random()-.5)*.8,.7+Math.random()*.6,tw.z+(Math.random()-.5)*.8,
      {color:0xe8e2d2, life:.4, s0:.16, vy:.6+Math.random()*1.6, vx:(Math.random()-.5)*1.6, vz:(Math.random()-.5)*1.6, g:4});  // 相纸碎片
    G.fx.dmgNum(tw.x, 1.7, tw.z, 9+Math.floor(Math.random()*5)*3, Math.random()<.35);            // 冲洗结算爆伤害数值
  },
  updateTitleScene(dt){
    const g=G.titleScene; if(!g) return;
    // 核心轻微呼吸 + 双环自转
    const t=this.frameCount||0;
    g.children.forEach(o=>{
      if(o.geometry && o.geometry.type==='SphereGeometry'){ o.scale.setScalar(1+Math.sin(performance.now()/900)*.05); }
    });
    const ringA=g.children.find(o=>o.geometry&&o.geometry.type==='TorusGeometry'&&o.position.y>2.1);
    if(ringA) ringA.rotation.z+=dt*.45;
    // 巡场小怪：以局内真实速度(E.defs[type].spd)连续游走 + 上下浮动；施法型(spd=0)保持原地
    // 拍照状态：小怪进入灰调相纸+脚下相框，photoT 结束触发照片冲洗结算
    const _tpl=G._tPlayer;
    (G._tEnemies||[]).forEach(f=>{
      f.g.position.y=f.baseY+Math.sin(performance.now()/720+f.g.position.x)*f.bob;
      if(f.photoT>0){
        f.photoT-=dt;
        if(f.photoT<=0) this._tPhotoResolve(f);   // 照片冲洗：恢复材质+移除相框+爆伤害数字
      }
      // 射击型小怪：周期朝玩家发射发光弹（照片状态期间暂停，呼应局内"拍照冻结弹幕"）
      if(f.bcolor && _tpl && f.photoT<=0){
        f.atkT=(f.atkT||1)-dt;
        if(f.atkT<=0){
          f.atkT=1.4+Math.random()*1.8;
          const ang=Math.atan2(_tpl.g.position.z-f.g.position.z, _tpl.g.position.x-f.g.position.x);
          // 复刻局内 G.weapons 真实弹丸：方块核心 + 光晕 Sprite（非抽象光球）
          const core=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.3), new THREE.MeshBasicMaterial({color:f.bcolor}));
          core.scale.setScalar(.7);
          const glow=new THREE.Sprite(G.pmats['a16777215'].clone());
          glow.material.color.setHex(f.bcolor); glow.material.depthWrite=false;
          glow.scale.set(.85,.85,1);
          core.add(glow);
          core.position.set(f.g.position.x, .55, f.g.position.z);
          G.titleScene.add(core);
          G._tBullets.push({m:core, vx:Math.cos(ang)*5, vz:Math.sin(ang)*5, life:2.4});   // 弹速与局内 eshoot=5 一致
          // 发射口火花
          G.fx.particle(f.g.position.x, .6, f.g.position.z, {vx:Math.cos(ang)*1.6, vy:.4, vz:Math.sin(ang)*1.6, life:.18, color:f.bcolor, s0:.12, kind:'a'});
        }
      }
      if(f.spd>0){
        if(f.waitt>0){
          f.waitt-=dt;
          if(f.waitt<=0){  // 停留结束：选新目标（初始位置附近随机一点）
            const r=1.8+Math.random()*1.5;
            const a=Math.random()*Math.PI*2;
            f.wx=f.hx+Math.cos(a)*r; f.wz=f.hz+Math.sin(a)*r;
          }
        } else {
          const dx=f.wx-f.g.position.x, dz=f.wz-f.g.position.z;
          const d=Math.hypot(dx,dz);
          if(d<.1){ f.waitt=.2+Math.random()*.5; }          // 到达目标短暂衔接，保持连续移动感
          else {
            f.g.position.x+=dx/d*f.spd*dt; f.g.position.z+=dz/d*f.spd*dt;
            f.g.rotation.y=Math.atan2(dx,dz);               // 面朝移动方向
          }
        }
      }
    });
    // 主角对峙演出：全场景游斗走位（平滑转向）+ 面朝最近射击型小怪模拟局内瞄准开火 + 周期性拍照
    const tp=G._tPlayer;
    if(tp){
      tp.g.position.y=Math.sin(performance.now()/860)*.1;
      // 游斗走位：左右大活动区随机目标（避开中央标题投影带），速度与局内玩家一致(4.3)，转向平滑不硬停
      if(tp.waitt===undefined){ tp.waitt=0; tp.wx=tp.g.position.x; tp.wz=tp.g.position.z; tp.face=0; }
      if(tp.waitt>0){
        tp.waitt-=dt;
        if(tp.waitt<=0){
          let tx,tz,tries=0;
          do{   // 活动区覆盖左右两侧，中央标题投影带(|x|<2.6 且 z<2.5)避开
            const side=Math.random()<.5?1:-1;
            tx=side*(1.6+Math.random()*8); tz=-5+Math.random()*9; tries++;
          }while(tries<8 && Math.abs(tx)<2.6 && tz<2.5);
          tp.wx=tx; tp.wz=tz;
        }
      } else {
        const dx=tp.wx-tp.g.position.x, dz=tp.wz-tp.g.position.z;
        const d=Math.hypot(dx,dz);
        if(d<.35){ tp.waitt=.4+Math.random()*.8; }          // 接近目标换新目标，不做硬停
        else {
          tp.g.position.x+=dx/d*4.3*dt; tp.g.position.z+=dz/d*4.3*dt;   // 局内玩家速度
          tp.face=G.angLerp(tp.face, Math.atan2(dz,dx), Math.min(1,6*dt));  // 平滑转向移动方向
        }
      }
      // 瞄准：面朝最近的射击型小怪（局内"瞄准敌人开火"，移动方向与瞄准方向分离）
      let tAng=null, bd=1e9;
      (G._tEnemies||[]).forEach(f=>{ if(!f.bcolor) return;
        const dd=G.dist2(f.g.position.x,f.g.position.z,tp.g.position.x,tp.g.position.z);
        if(dd<bd){ bd=dd; tAng=Math.atan2(f.g.position.z-tp.g.position.z, f.g.position.x-tp.g.position.x); } });
      if(tAng!=null){
        if(tp.face===undefined) tp.face=tAng;
        tp.face=G.angLerp(tp.face, tAng, Math.min(1,10*dt));
        tp.g.rotation.y=-tp.face;   // 模型 forward=+X
      }
      tp.fightT=(tp.fightT||0)-dt;
      if(tp.fightT<=0){
        tp.fightT=1.8+Math.random()*.7;      // 拍照间隔（模拟持续交火）
        tp.shotT=.16;                         // 地面曝光持续
        tp.refs.cam.scale.setScalar(1.28);    // 快门后坐：相机弹一下
        const foes=G._tEnemies||[];
        if(foes.length){
          // 轮流找一只未在照片状态中的小怪「拍照」（灰调相纸 + 脚下相框）
          for(let k=0;k<foes.length;k++){
            const tgt=foes[tp.tgt++ % foes.length];
            if(tgt.photoT<=0){ this._tPhotoShoot(tgt); break; }
          }
        }
      }
      if(tp.shotT>0){                              // 地面曝光扩散淡出
        tp.shotT-=dt;
        const k=Math.max(0,tp.shotT/.16);
        tp.fan.material.opacity=(1-k)*.9;
        tp.fan.scale.setScalar(.4+(1-k)*1.1);
      } else { tp.fan.material.opacity=0; tp.fan.scale.setScalar(1); }
      if(tp.refs.cam.scale.x>1.18) tp.refs.cam.scale.setScalar(Math.max(1.18,tp.refs.cam.scale.x-dt*3));
      if(tp.hitT>0){ tp.hitT-=dt; tp.g.scale.setScalar(1.7*(1+Math.sin(tp.hitT*26)*.05)); }   // 被弹幕命中瞬间体型弹跳（纯演出）
    }
    // 巡场小怪弹幕更新：飞行 + 命中玩家爆粒子 + 出界/超时回收
    const _bl=G._tBullets;
    if(_bl){
      for(let i=_bl.length-1;i>=0;i--){
        const b=_bl[i]; b.life-=dt;
        b.m.position.x+=b.vx*dt; b.m.position.z+=b.vz*dt;
        if(_tpl){
          const dx=_tpl.g.position.x-b.m.position.x, dz=_tpl.g.position.z-b.m.position.z;
          if(dx*dx+dz*dz<.36){   // 命中玩家（菜单演出：无真实伤害）——火花同局内 impactFx
            G.fx.sparks(b.m.position.x,.55,b.m.position.z,b.m.material.color.getHex());
            _tpl.hitT=.12;
            b.life=0;
          }
        }
        if(b.life<=0 || b.m.position.x>13||b.m.position.x<-13||b.m.position.z>9.5||b.m.position.z<-9.5){
          G.titleScene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose();
          _bl.splice(i,1);
        }
      }
    }
    // 小怪受击抖动（被拍立得击中的瞬间体型弹跳）
    (G._tEnemies||[]).forEach(f=>{
      if(f.hitT>0){ f.hitT-=dt; const k=Math.sin(f.hitT*45); f.g.scale.setScalar(f.s*(1+k*.09)); }
    });
    // 漂浮杂物：旋转 + 上下浮动
    (g.userData.debris||[]).forEach(d=>{ d.o.rotation.x+=d.spin[0]*dt; d.o.rotation.y+=d.spin[1]*dt; d.o.rotation.z+=d.spin[2]*dt; d.o.position.y=d.base+Math.sin(performance.now()/1000+d.o.position.x)*.12; });
  },

  restartFromPause(){
    this.togglePause(false);
    if(this.inBase) this.toTitle();                 // 基地不是一局：暂停里的重新开始=回标题
    else this.startRun();
  },

  newRun(){
    return { time:0, kills:0, moneyEarned:0, dmgTaken:0, chests:0, roomsCleared:0, moneySpent:0, best:null };
  },

  startRun(){
    this.inBase=false;
    G.base && G.base.leave();
    G.rng = new G.RNG((Date.now()^(Math.random()*1e9))>>>0);
    this.run=this.newRun();
    this.floorNum=1;
    G.shop && G.shop.close(); // 关闭武器商店面板（局内购买 UI 不跨局）
    G.gambler && G.gambler.reset(); // 赌徒的灾难：Streak/牌组/最近牌全部归零（不跨局）
    G.input.buffer={}; // 清残留输入缓冲
    // 清场
    this.cleanupDynamic();
    G.player && G.scene.remove(G.player.mesh);
    G.player=G.createPlayer(0,0);
    /* 深渊共鸣（轨道B 乘区）：先于武器创建就位，保证弹匣吃到 magMul */
    if(G.meta && G.meta.resonanceLv){
      const rl=id=>G.meta.resonanceLv(id);
      const lvA=rl('affinity_ammo'); if(lvA){ G.player.st.magMul=1+.08*lvA; G.player.st.reloadMul*=Math.pow(.96,lvA); }
      const lvV=rl('affinity_vet');  if(lvV){ G.player.st.rollCdMul=Math.pow(.95,lvV); G.player.st.invulnMul=1+.05*lvV; }
      /* affinity_shard（碎片拾取 +10%/级）在 meta.addShards 内部应用 */
    }
    /* 深渊准备桌（轨道C）：应用本局祝福/血契，随即消费 */
    if(G.meta && G.meta.data.runBoons && G.meta.data.runBoons.length){
      for(const bid of G.meta.data.runBoons){
        switch(bid){
          case 'boon_steel': G.player.maxArmor+=1; G.player.armor=G.player.maxArmor; break;
          case 'boon_rage':  G.player.st.rateMul*=1.12; break;
          case 'boon_wind':  G.player.st.speedMul*=1.10; break;
          case 'boon_greed': G.runShardMul=1.30; break;
          case 'boon_luck':  G.player.st.luck+=1; break;
          case 'boon_regen': G.player.st.regenBoon=true; break;
          case 'pact_blood': G.player.st.dmgMul*=1.40; G.player.maxHp=Math.max(1,G.player.maxHp-2); G.player.hp=G.player.maxHp; break;
          case 'pact_glass': G.player.st.dmgMul*=1.70; G.player.st.dmgTakenMul=1.50; break;
          case 'pact_fast':  G.player.st.rateMul*=1.30; G.player.st.speedMul*=1.15; G.player.st.rollCdMul*=1.30; break;
        }
      }
      G.meta.data.runBoons=[];
      G.meta.save();
    }
    G.player.weapons=[G.weapons.mktWeapon('rusty')];
    /* 深渊祝福（基地核心献祭）：每层下潜伤害 +15%，进本后消耗 */
    if(G.meta && G.meta.data.bless>0){
      const b=G.meta.data.bless;
      G.player.st.dmgMul*=Math.pow(1.15,b);
      G.meta.data.bless=0;
      G.meta.save();
      G.ui.toast('深渊祝福生效：伤害 +'+Math.round((Math.pow(1.15,b)-1)*100)+'%');
    }
    /* 基地永久升级真实接入新局：医疗站开局上限 / 弹药工作台装填速度 / 武器仓库开局第二把 */
    if(G.meta){
      G.meta.onRunStart();
      const mb=G.meta.up('medbay'); if(mb){ G.player.maxHp+=2*mb; G.player.hp=G.player.maxHp; }
      const am=G.meta.up('ammo'); if(am) G.player.st.reloadMul*=Math.pow(.88,am);
      const ar=G.meta.up('armor'); if(ar){ G.player.maxArmor+=ar; G.player.armor=G.player.maxArmor; }   // 装甲舱：开局护甲
      const mg=G.meta.up('magnet'); if(mg) G.player.st.magnetMul*=Math.pow(1.3,mg);                      // 重力靴：拾取磁力
      if(G.meta.up('armory')){
        const wid=G.weapons.randomWeaponId('C');
        if(wid && wid!=='rusty' && !G.player.weapons.some(w=>w.id===wid)) G.player.weapons.push(G.weapons.mktWeapon(wid));
      }
    }
    this.startFloor(1, true);
    G.ui.showHud(true);
    G.ui.screen(null);
    G.ui.hearts(G.player); G.ui.weapon(G.player); G.ui.stats(G.player);
    this.state='play';
    G.audio.music('f1');
    G.ui.banner('第一层 · 石壁地牢','找到通往深处的阶梯');
  },

  cleanupDynamic(){
    this.disposeTitleScene();   // 标题 3D 背景：进入游戏/基地即清理，不污染战斗场景
    G.enemies.clear();
    G.boss.clear();
    G.weapons.clear();
    if(G.jukebox) G.jukebox.clear();      // 过载点唱机：黑胶/节点/共振线/Network Core/Club 灯光不跨房/跨局残留
    G.dice && G.dice.clear();         // 悖论骰子：空间裂隙/崩坏序列不跨房/跨局残留
    for(const pk of G.pickups){ G.scene.remove(pk.mesh); if(pk.label) G.scene.remove(pk.label); }
    G.pickups.length=0;
    this.spawnQueue.length=0;
    this.strikes.length=0;
    this.curRoom=null;
    this.curInteract=null;
    this.flyingCrown=null;
  },

  startFloor(n, isNew){
    this.floorNum=n;
    this._bossHint50=false; this._bossHint100=false;   // Boss 引导提示每层重置
    if(G.SR5) G.SR5.hardReset();                        // 第五层特殊房状态强制隔离（换层回滚一切）
    this.cleanupDynamic();
    // 第 4/5 层走专属生成器（gen4 空间失序 / floor5 规则失序），前三层沿用原生成器
    const seed=(G.rng.next()^0x9e3779b9)>>>0;
    this.floor = (n===5 && G.floor5) ? G.floor5.genFloor(n, seed) : (n===4 && G.gen4) ? G.gen4.genFloor(n, seed) : G.gen.genFloor(n, seed);
    G.floor=this.floor;
    G.build.buildFloor(this.floor);
    const sr=this.floor.startRoom;
    if(!G.player) G.player=G.createPlayer(sr.cx, sr.cz);
    else { G.player.x=sr.cx; G.player.z=sr.cz; G.player.vx=0; G.player.vz=0; }
    G.player.mesh.position.set(sr.cx,0,sr.cz);
    // 标记起始房
    this.markDiscovered(sr);
    this.curRoom=sr;
    G.ui.floor(n);
    G.ui.minimap(this);
    if(!isNew){
      G.player.heal && G.player.heal(2 + (G.player.st.regenBoon?1:0));   // 再生祝福：每层额外回 1 红心
      G.audio.music(['','f1','f2','f3','f4','f5'][n]||'f2');
    }
  },

  markDiscovered(room){
    room.discovered=true;
    for(const nb of room.neighbors){ if(nb.type!=='secret') nb.mapHint=true; }
  },

  /* ---------- 房间逻辑 ---------- */
  onRoomEnter(room){
    if(room===this.curRoom) return;
    this.curRoom=room;
    if(!room.discovered) this.markDiscovered(room);
    room.visited=true;
    if(G.jukebox) G.jukebox.clear();      // 过载点唱机：音波网络绑定当前房间，换房即清场（设计稿三十五）
    G.dice && G.dice.clear();         // 悖论骰子：裂隙/崩坏序列绑定当前房间，换房即中止
    G.ui.minimap(this);
    // 第五层特殊房间：交给 SpecialRoomManager（锁门/机制/完成/回滚全部在其内）
    if(room.type==='special' && !room.cleared && G.SR5){
      G.SR5.onEnter(room);
    }
    if(room.type==='combat' && !room.cleared && !room.locked){
      this.lockRoom(room);
    }
    if(room.type==='boss' && !room.cleared && !room.bossSpawned){
      room.bossSpawned=true;
      this.lockRoom(room);
      this.bossFightT=this.run.time;                // Boss 战计时起点（图鉴最佳击杀时间）
      G.boss.spawn(room.cx, room.z0+2.6);
    }
  },

  lockRoom(room){
    room.locked=true;
    room.dmgAtLock=this.run.dmgTaken;   // 无伤清剿里程碑：记录锁门时的受伤基线
    room.lockTime=0; room.lockWarnT=0;
    for(const d of room.doors) d.open=false;
    G.audio.sfx('doorSlam');
    G.fx.shake(.15);
    this.spawnWave(room,0);
  },

  spawnWave(room, idx){
    room.waveIdx=idx;
    const wave=room.enemyWaves && room.enemyWaves[idx];
    if(!wave) return;
    for(const e of wave){
      const pos=G.roomSpawnPos(room, G.player);
      this.spawnQueue.push({t:.25+Math.random()*.4, type:e.type, elite:e.elite, room});
    }
  },

  /* 清剿判定：每帧扫描全部锁定房间（不依赖玩家所在位置，杜绝遗漏）+ 软锁保底 */
  checkRoomClear(room, dt){
    const floors=this.floor;
    if(!floors) return;
    for(const rm of floors.rooms){
      if(!rm.locked) continue;
      // 防软锁兜底：锁定房（含 Boss 房）的玩家被异常隔在房外时（门夹挤出/未知位移 bug），
      // 门保持打开让玩家能回房续战；玩家回房后自动恢复封锁（站在门 tile 上时不关，防夹）。
      // 正常游玩玩家不可能离开锁定房（门关着走不出去），此分支只在异常时触发。
      if(G.player && !G.player.dead){
        const p=G.player;
        const inRoom = G.roomAt(p.x,p.z)===rm;
        for(const d of rm.doors){
          if(d.secret) continue;
          if(!inRoom && !d.open) d.open=true;
          else if(inRoom && d.open){
            let on=false;
            for(const [tx,tz] of d.tiles){ if(Math.floor(p.x)===tx && Math.floor(p.z)===tz){ on=true; break; } }
            if(!on) d.open=false;
          }
        }
      }
      if(rm.type!=='combat') continue;
      const pending=this.spawnQueue.some(s=>s.room===rm);
      const alive=G.enemies.list.some(e=>e.room===rm && !e.dead);
      if(!pending && !alive){
        if(rm.enemyWaves && rm.waveIdx < rm.enemyWaves.length-1){
          this.spawnWave(rm, rm.waveIdx+1);
          G.ui.toast('敌人增援来袭！');
        } else {
          this.clearRoom(rm);
        }
      } else {
        // 残敌提醒：长时间未清剿时周期性提示剩余数量（仅提示，绝不自动清除）。
        // 反软锁由敌人系统的"位置非法 0.8 秒自愈"负责（只处理卡墙敌人），
        // 不做整房超时清空——避免慢节奏战斗（绕后盾卫/躲避激光）中敌人凭空消失。
        rm.lockTime=(rm.lockTime||0)+dt;
        if(rm.lockTime>30 && (!rm.lockWarnT || rm.lockTime-rm.lockWarnT>15)){
          rm.lockWarnT=rm.lockTime;
          const n=G.enemies.list.filter(e=>e.room===rm&&!e.dead).length + this.spawnQueue.filter(s=>s.room===rm).length;
          G.ui.toast('还有 '+n+' 只敌人 — 搜寻房间每个角落');
        }
      }
    }
  },

  clearRoom(room){
    room.cleared=true; room.locked=false;
    // 局外里程碑「完美清剿」：锁定期间未受伤
    if(room.type==='combat' && G.meta && this.run.dmgTaken===room.dmgAtLock) G.meta.onFlawless();
    room.lockTime=0; room.lockWarnT=0;
    for(const d of room.doors) d.open=true;
    G.audio.sfx('doorOpen');
    G.audio.sfx('roomClear',{v:.55,min:300});   // 清房 fanfare
    this.run.roomsCleared++;
    G.ui.toast('房间肃清！');
    // 被动道具池扩充：战斗房清剿后 12% 掉一个被动（C 或 B，随层数提升）
    if(room.type==='combat' && G.items){
      const tier=this.floorNum>=2 && G.rng.chance(.45) ? 'B' : 'C';
      if(G.rng.chance(.12)) G.spawnPickup('item', room.cx+(Math.random()-.5)*1.4, room.cz+(Math.random()-.5)*1.4, {itemId:G.items.randomPassive(tier)});
    }
    // Boss 引导：第二层起，清房进度过半即在 小地图 ☠ 信标标记 Boss 房 + 一次八方位提示；
    // 全清后再次提示（防玩家在第四层大地图漏找 Boss 房）
    if(this.floorNum>=2 && this.floor && this.floor.bossRoom){
      const boss=this.floor.bossRoom;
      if(!boss.bossSpawned && !boss.cleared && G.player){
        const comb=this.floor.rooms.filter(r=>r.type==='combat');
        const prog=comb.length? comb.filter(r=>r.cleared).length/comb.length : 0;
        if(prog>=.5) boss.mapHint=true;
        const dirName=(dx,dz)=>{
          const names=['东','东南','南','西南','西','西北','北','东北'];
          const a=Math.atan2(dz,dx);
          return names[((Math.round(a/(Math.PI/4))%8)+8)%8];
        };
        const dir=dirName(boss.cx-G.player.x, boss.cz-G.player.z);
        if(prog>=.5 && !this._bossHint50){
          this._bossHint50=true;
          G.ui.toast('侦测到 Boss 气息——在'+dir+'方的 ☠ 信标（小地图/Tab 均可查看）');
        }
        const allCleared=comb.length>0 && comb.every(r=>r.cleared);
        if(allCleared && !boss.bossSpawned && !this._bossHint100){
          this._bossHint100=true;
          G.ui.toast('空间信标已锁定——Boss 在'+dir+'方的 ☠ 房间（Tab 查看大地图）');
        }
      }
    }
    // 奖励
    const n=G.rng.int(3,5)+this.floorNum*2;
    for(let i=0;i<n;i++) G.spawnPickup('money', room.cx+(Math.random()-.5)*1.5, room.cz+(Math.random()-.5)*1.5);
    if(G.rng.chance(.16)) G.spawnPickup('heart', room.cx, room.cz);
  },

  /* ---------- 隐藏房 ---------- */
  breakSecretDoor(door){
    if(door.broken) return;
    door.broken=true; door.open=true;
    for(const [x,z] of door.tiles){
      const tile=this.floor.tilesGet(x,z);
      if(tile){ tile.t='floor'; tile.room=door.rooms.find(r=>r.type==='secret')||door.rooms[1]; delete tile.secret; }
    }
    if(door.group) door.group.visible=false;
    G.audio.sfx('explosion');
    G.fx.shake(.5);
    G.fx.burst(door.tiles[0][0]+.5,.8,door.tiles[0][1]+.5,16,{color:0x9a8a70,spd:3,life:.6,s0:.2,kind:'m',vy:2});
    G.ui.toast('发现隐藏房间！');
    const secret=door.rooms.find(r=>r.type==='secret');
    if(secret) this.markDiscovered(secret);
    G.ui.minimap(this);
  },

  /* ---------- 楼层切换 ---------- */
  descend(){
    if(this.state!=='play') return;
    this.state='transition';
    G.shop && G.shop.close();
    G.meta && G.meta.onDescend();   // 局外里程碑：初次下潜
    G.audio.sfx('doorOpen');
    G.ui.fade(true);
    G.ui.prompt(null);
    const next=this.floorNum+1;
    const FLOORS=[null,
      {name:'第一层 · 石壁地牢', hint:'寻找下行舱口'},
      {name:'第二层 · 腐蚀深渊', hint:'寻找并讨伐「铁颚」'},
      {name:'第三层 · 虚空王座', hint:'虚空在低语——直面「无面君主」'},
      {name:'第四层 · 失序维度', hint:'空间规则已崩坏——讨伐「终焉回响」'},
      {name:'第五层 · 异常回廊', hint:'ANOMALY DETECTED——规则已失控'},
    ];
    const fl=FLOORS[next]||{name:'第'+next+'层', hint:'深入深渊'};
    setTimeout(()=>{
      this.startFloor(next,false);
      this.state='play';
      G.ui.banner(fl.name, fl.hint);
      G.ui.fade(false);
    }, 550);
  },

  /* ---------- 胜负 ---------- */
  bossDefeated(){
    const room=this.floor.bossRoom;
    if(room){ room.cleared=true; room.locked=false; for(const d of room.doors) d.open=true; }
    G.meta && G.meta.onBossKill(this.floorNum>=3?'faceless':'ironjaw', this.run.time-(this.bossFightT||this.run.time));  // Boss 图鉴 + 讨伐碎片
    // 第 2/3/4 层：Boss 死后出现下行舱口（第 5 层 Boss 击杀才是通关）
    if(this.floorNum<5){
      if(room){
        G.build.makeExit(room,{x:room.cx,z:room.cz});
        G.ui.toast('地面裂开了——出现一座下行舱口！');
      }
      G.fx.shake(.4);
      return;
    }
    G.fx.hitstop(.3);
    setTimeout(()=>this.winRun(), 1700);
  },

  winRun(){
    if(this.state==='win') return;
    this.state='win';
    G.meta && G.meta.onWin();   // 局外里程碑：深渊征服者（通关解锁赌徒的灾难/拍立得）
    G.shop && G.shop.close();
    G.audio.stopMusic();
    G.audio.sfx('victory',{crit:1});
    setTimeout(()=>{ if(G.game.state==='win') G.audio.music('victory'); }, 1300);   // 死亡 stinger → 短暂安静 → 胜利主题（仅仍在结算态）
    // 最佳纪录
    let best=null;
    try{
      const prev=localStorage.getItem('bd_best');
      const t=Math.floor(this.run.time);
      if(!prev || t<parseInt(prev)){ localStorage.setItem('bd_best',''+t); }
      best=localStorage.getItem('bd_best');
      const b=parseInt(best); const m=String(Math.floor(b/60)).padStart(2,'0'), s=String(b%60).padStart(2,'0');
      this.run.best=m+':'+s;
    }catch(e){}
    G.ui.endScreenStats('winStats', this.run);
    this._resultT=performance.now();                // 结算输入闸门（防误触直接跳过）
    const bl=G.$('buildList');
    const items=G.player.passives.map(id=>G.items.passives[id].name);
    const wps=G.player.weapons.map(w=>w.def.name);
    bl.innerHTML='构筑：'+(wps.join(' / ')||'—')+'<br>被动：'+(items.join('、')||'无')+(G.player.active?('　主动：'+G.player.active.name):'');
    G.ui.screen('win');
    G.ui.showHud(false);
    // 撒花
    let i=0;
    const conf=setInterval(()=>{
      if(!G.player){ clearInterval(conf); return; }   // 玩家已重建/清场时立即停止撒花
      G.fx.confetti(G.player.x+(Math.random()-.5)*6, 1.5, G.player.z+(Math.random()-.5)*6);
      if(++i>14) clearInterval(conf);
    },160);
  },

  loseRun(){
    if(this.state==='dead') return;
    this.state='dead';
    G.shop && G.shop.close();
    G.player.mesh.visible=false;
    G.fx.poof(G.player.x,.5,G.player.z,0xc03028);
    G.fx.burst(G.player.x,.6,G.player.z,16,{color:0xc03028,spd:3,life:.8,s0:.2});
    G.fx.slowmo(.3,.8);
    G.audio.stopMusic();
    G.audio.sfx('defeat',{crit:1});
    setTimeout(()=>{ if(G.game.state==='dead') G.audio.music('gameover'); }, 1500);  // 死亡 sting → 低沉 gameover 循环（仅仍在结算态）
    const tips=['翻滚的无敌帧能穿过任何弹幕。','被围攻时，先找掩体再反击。','爆炸桶的连锁能清掉一整波敌人。','商店的钥匙也许能打开绿箱子。','隐藏房的墙上有裂缝——开一枪试试。'];
    G.$('deathTip').textContent='「'+G.rng.pick(tips)+'」';
    G.ui.endScreenStats('deadStats', this.run);
    this._resultT=performance.now();                // 结算输入闸门（防误触直接跳过）
    G.ui.screen('dead');
    G.ui.showHud(false);
  },

  togglePause(on){
    if(on && this.state==='play'){ this.state='pause'; G.ui.screen('pause'); G.input.buffer={}; }
    else if(!on && this.state==='pause'){ this.state='play'; G.ui.screen(null); }
  },

  /* ---------- 主动技能：空袭 ---------- */
  scheduleStrikes(x,z,n){
    for(let i=0;i<n;i++){
      this.strikes.push({ t:0, warn:.45+i*.5, boom:.75+i*.5, x:x+(Math.random()-.5)*1.6, z:z+(Math.random()-.5)*1.6 });
    }
  },

  /* ---------- Boss 皇冠击飞 ---------- */
  crownFly(boss){
    const crown=boss.refs.crown;
    const wp=new THREE.Vector3();
    crown.getWorldPosition(wp);
    boss.refs.head.remove(crown);
    crown.position.copy(wp);
    G.scene.add(crown);
    this.flyingCrown={mesh:crown, vy:5, vx:(Math.random()-.5)*3, vz:(Math.random()-.5)*3, spin:8, t:0};
  },

  /* ---------- 主更新 ---------- */
  update(dt){
    if(this.state!=='play' && this.state!=='win' && this.state!=='dead') { G.fx.update(dt); this.updateTitleScene(dt); return; }
    G.input.stepBuffers(dt); // 输入缓冲按逻辑帧倒计时（顿帧/暂停期间缓冲保留，不吞按键）
    const p=G.player;
    this.run.time+=dt;
    // 玩家
    if(this.state==='play') G.playerCtl.update(p,dt);
    // 生成队列
    for(let i=this.spawnQueue.length-1;i>=0;i--){
      const s=this.spawnQueue[i];
      s.t-=dt;
      if(s.t<=0){
        const pos=G.roomSpawnPos(s.room, p);
        const e=G.enemies.spawn(s.type, pos.x, pos.z, s.elite);
        e.room=s.room;
        this.spawnQueue.splice(i,1);
      }
    }
    // 空袭
    for(let i=this.strikes.length-1;i>=0;i--){
      const s=this.strikes[i];
      s.t+=dt;
      if(!s.warned && s.t>=s.warn){ s.warned=true; G.fx.ring(s.x,s.z,1.6,0xff5030,.4); G.fx.light(s.x,1,s.z,0xff5030,1.2,.4); G.audio.sfx('alarm',{v:.4}); }
      if(s.t>=s.boom){
        G.weapons.explode(s.x,s.z,2.2,22,'p');
        this.strikes.splice(i,1);
      }
    }
    // 皇冠
    if(this.flyingCrown){
      const c=this.flyingCrown;
      c.t+=dt;
      c.vy-=14*dt;
      c.mesh.position.x+=c.vx*dt; c.mesh.position.y+=c.vy*dt; c.mesh.position.z+=c.vz*dt;
      c.mesh.rotation.x+=c.spin*dt; c.mesh.rotation.z+=c.spin*.6*dt;
      if(c.mesh.position.y<=.1){ c.mesh.position.y=.1; c.vy*=-.4; c.vx*=.7; c.vz*=.7; c.spin*=.7; if(Math.abs(c.vy)<.5){ this.flyingCrown=null; } }
    }
    // 实体（G._trace 记录最后执行的子系统，供 onerror 上下文定位偶发错误）
    G._trace='enemies'; G.enemies.update(dt);
    G._trace='boss'; G.boss.update(dt);
    G._trace='weapons'; G.weapons.update(dt);
    G._trace='build'; G.build.update(dt);
    G._trace='photo'; G.photo.update(dt);   // 拍立得：照片碎片物理 / 扇光衰减 / 冻结名单清理
    G._trace='gambler'; G.gambler.update(dt); // 赌徒的灾难：Joker 揭牌时间线 / 纸牌飞行 / 卡壳计时 / STREAK HUD
    if(G.gen4 && this.floorNum===4){ G._trace='gen4'; G.gen4.update(dt); }   // 第 4 层机制：相位桥门 / 引力井
    if(G.SR5 && this.floorNum===5){ G._trace='rooms5'; G.SR5.update(dt); }   // 第五层特殊房间驱动
    if(this.inBase && G.base){ G._trace='base'; G.base.update(dt); }   // 基地：NPC 工作动画 / 训练靶重生 / 环境粒子
    if(G.jukebox){ G._trace='jukebox'; G.jukebox.update(dt); }            // 点唱机：黑胶共振/节点/共振线/网络核心/tick 伤害/Club 灯光
    if(G.dice){ G._trace='dice'; G.dice.update(dt); }                  // 悖论骰子：骰体动画 / 不稳定度 / 世界异常 / PARADOX 序列
    G._trace='fx'; G.fx.update(dt);
    // 房间进入/清剿
    if(this.state==='play' && p){
      const room=G.roomAt(p.x,p.z);
      if(room) this.onRoomEnter(room);
      if(this.curRoom) this.checkRoomClear(this.curRoom,dt);
    }
    // UI
    G._trace='ui'; G.ui.update(dt);
    G._trace='audio'; G.audio.update(dt);   // 音频状态机：战斗层/Boss阶段/ducking/心跳/环境音
    this._mmT-=dt;
    if(this._mmT<=0){
      this._mmT=.15;
      if(this.inBase){ G.base.hudRefresh(); }
      else {
        G.ui.minimap(this); G.ui.weapon(p); G.ui.stats(p);
        // 剩余敌人计数（含生成队列中待出场的）
        let n=0;
        for(const e of G.enemies.list){ if(!e.dead && e.room && e.room.locked) n++; }
        n += this.spawnQueue.filter(s=>s.room && s.room.locked).length;
        G.ui.enemyCount(n);
      }
    }
  },

  /* ---------- 相机与瞄准 ---------- */
  updateCamera(dt){
    const p=G.player;
    if(!p) return;
    // 鼠标 → 世界坐标
    const ndc=new THREE.Vector2((G.input.mouse.x/innerWidth)*2-1, -(G.input.mouse.y/innerHeight)*2+1);
    G.raycaster.setFromCamera(ndc, G.camera);
    const ray=G.raycaster.ray;
    const t=(0.55-ray.origin.y)/ray.direction.y;
    // isFinite 守卫：相机未俯视时射线可能平行地面（direction.y=0 → t=Infinity），
    // 0*Infinity=NaN 会永久污染 camX/相机矩阵/角色朝向，必须跳过本帧更新
    if(t>0 && isFinite(t)){
      G.input.aimX=ray.origin.x+ray.direction.x*t;
      G.input.aimZ=ray.origin.z+ray.direction.z*t;
    }
    // 跟随（基地拉远相机：完整收下功能区，俯瞰整备）
    const camH=this.inBase?24:14.2, camB=this.inBase?10.2:6.4;   // 基地相机拉远：俯瞰 32×20 多区域 Hub
    const tx=p.x+(p.aimX-p.x)*.16, tz=p.z+(p.aimZ-p.z)*.16;
    this.camX=G.lerp(this.camX,tx,Math.min(1,6*dt));
    this.camZ=G.lerp(this.camZ,tz,Math.min(1,6*dt));
    // 震动
    const tr=G.fx.trauma*G.fx.trauma;
    const sx=(Math.random()-.5)*tr*.7, sz=(Math.random()-.5)*tr*.7;
    G.camera.position.set(this.camX+sx, camH, this.camZ+camB+sz);
    G.camera.lookAt(this.camX+sx, .4, this.camZ-.2+sz);
    // 平行光跟随
    const d=G.lights;
    d.dir.position.set(p.x+6, 14, p.z+4);
    d.dirTarget.position.set(p.x, 0, p.z);
    d.dirTarget.updateMatrixWorld();
  },

  /* 地面瞄准指示环 */
  updateReticle(dt){
    if(!G.reticle) return;
    const show=(this.state==='play'||this.state==='transition');
    G.reticle.visible=show;
    if(show){
      G.reticle.position.x=G.input.aimX;
      G.reticle.position.z=G.input.aimZ;
      G.reticle.rotation.y+=dt*1.6;
      const s=1+Math.sin(performance.now()*.006)*.1;
      G.reticle.scale.set(s,s,1);
    }
  },

  /* ---------- 主循环 ---------- */
  frame(t){
    requestAnimationFrame((tt)=>this.frame(tt));
    this.frameCount=(this.frameCount||0)+1;
    if(!this.lastT) this.lastT=t;
    let dt=(t-this.lastT)/1000;
    this.lastT=t;
    if(dt>.1) dt=.1;
    const scaled=dt*G.fx.timeScale;
    if(!this.manual && !(G.shop&&G.shop.isOpen()) && !(G.base&&G.base.isOpen())){
      if(G.fx.hitstopT>0){ G.fx.hitstopT-=dt; }
      else{
        this.acc+=scaled;
        const step=1/60;
        let n=0;
        while(this.acc>=step && n<4){
          // 主循环逻辑兜底：同域 try-catch 保留真实 stack（file:// 下 window.onerror 会把页面脚本错误模糊成无来源 Script error）
          try{ this.update(step); }
          catch(e){
            if(!this._updErrLogged){ this._updErrLogged=true; log('UPDATE-FAIL: '+((e&&e.message)||e)+' | trace='+(G._trace||'?')+' | '+String((e&&e.stack)||'').split('\n').slice(0,3).join(' ~ ')); }
          }
          this.acc-=step; n++;
        }
      }
      this.updateCamera(dt);
    }
    // 屏幕准星 + 地面瞄准环（任何状态每帧刷新，保证界面切换即时生效）
    G.ui.updateCrosshair();
    this.updateReticle(dt);
    if(G.renderer){
      // 渲染兜底：真实 GPU 下 WebGL 层偶发错误在 window.onerror 里被浏览器模糊成无文件名的 Script error；
      // 这里同域 try-catch 直接捕获异常对象，保留真实 message 记入 errlog（每会话只记首条防刷屏），并避免冒泡刷屏
      try{ G.renderer.render(G.scene, G.camera); }
      catch(e){
        if(!this._renderErrLogged){ this._renderErrLogged=true; log('RENDER-FAIL: '+((e&&e.message)||e)+' | '+String((e&&e.stack)||'').split('\n').slice(0,3).join(' ~ ')); }
      }
    }
    G.input.endFrame();
  },
};

G.game = GAME;
G.raycaster = new THREE.Raycaster();
})();
