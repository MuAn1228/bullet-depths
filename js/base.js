/* 弹膛深渊 - 基地「废弃军械站」：局外循环中心（休整 / 解锁 / 收藏 / 备战）
   职责清单（禁止逻辑散回其他模块）：
   ① 静态基地场景：tile 地图（复用 G.floor 碰撞体系）/ 独立暖色主题 / 环境动画
   ② NPC×4（枪械师/工程师/档案员/教官）：造型 / idle 工作动画 / 看向玩家 / 数据驱动对话
   ③ 面板：枪械师买枪（meta.buyWeapon）/ 工程师买被动+基地升级 / 档案员图鉴——全部走 MetaProgression 单一数据源
   ④ 训练场：可射击训练靶（打碎自动重置）/ 武器架循环试用已解锁武器
   ⑤ 战利品墙 / 展示架随解锁成长 / 深渊升降梯（唯一进本入口）
   所有解锁/货币/统计只读写 G.meta（meta.js）；本模块不做任何局内玩法判定。 */
'use strict';
(function(){
const GB = G.GeoBuilder;
const _pcache = {};
function pgeo(key, fn){ if(!_pcache[key]){ const b=new GB(); fn(b); _pcache[key]=b.build(); } return _pcache[key]; }
function M(geo, x,y,z){ const m=new THREE.Mesh(geo, G.vcolMat); m.position.set(x,y,z); m.castShadow=true; return m; }

/* 敌人图鉴中文名（E.defs 无名称字段；单一映射处） */
const ENEMY_NAMES = {
  gunner:'持枪步兵', charger:'冲锋兽', shroom:'孢子菇', slime:'分裂史莱姆', shotgunner:'霰弹重手',
  sniper:'狙击独眼', hexer:'虚空术士', beetle:'爆甲虫', shield:'盾卫', wisp:'怨灵', totem:'激光图腾',
  bomber:'掷弹手', voidstalker:'虚空掠影', riftwatcher:'裂隙注视者', voidacolyte:'虚空祭司',
};
const BOSS_INFO = {
  ironjaw:  { name:'铁颚',      desc:'第一关底的锈甲暴君' },
  faceless: { name:'无面君主',  desc:'虚空王座上的最终领主' },
};

/* ---------- 数据驱动对话（每个 NPC：初见 / 常态轮换 / 通关 / 屡死 / 解锁后） ---------- */
const DIA = {
  gunsmith: { name:'枪械师·老铆',
    first:'新面孔。想带更多好枪下去，就攒深渊碎片——我这儿只认碎片，不认眼泪。',
    normal:['碎片的来路？少死几次就是了。','架子上每把枪都盯着你呢，挑一把顺眼的。','从深渊底下捞上来的枪，我擦得比你脸还干净。','翻滚的时候别扣扳机，那是用枪人的基本功。'],
    afterWin:'打通三层还活着？行，从今天起你挑枪，我管擦。',
    manyDeaths:'又躺回来了？先把翻滚练明白，再跟我谈枪。',
    afterUnlock:'新枪到手？去靶子那儿喂几发，别到了底下才发现拉不开栓。' },
  engineer: { name:'工程师·扳手姐',
    first:'想活得久一点？我这儿有二手护符和一手改装——都收碎片。',
    normal:['医疗站和弹药台我随时给你升级，碎片到位就行。','档案室扩一层，底下的宝箱房都会多冒出来。','别小看这些破烂，它们比你先进过深渊。','改装件没有一件是新的——但都比你命硬。'],
    afterWin:'从虚空王座回来的人，配用我最好的改装件。',
    manyDeaths:'老这么死不是办法，先来我这儿花点碎片保命。',
    afterUnlock:'装上了。下回从底下回来，记得告诉我它顶不顶用。' },
  archivist: { name:'档案员·墨记',
    first:'每个下去的人我都会记一笔——你想知道深渊里有什么，就来看档案。',
    normal:['你的每一场战斗我都有记录，包括你输的那些。','图鉴不收门票，看完记得活着回来补全它。','铁颚的档案页都快被翻烂了。','深渊在变，我的档案也得跟着变。'],
    afterWin:'「无面君主，已讨伐。」——这一行我等了很久。',
    manyDeaths:'阵亡记录又添了一页……要不要看看你是怎么死的？',
    afterUnlock:'档案更新完毕。深渊会记住你今天的选择。' },
  instructor: { name:'教官·铁哨',
    first:'靶子在那儿，随便打。进了地牢可没有重来的机会。',
    normal:['翻滚有无敌帧——穿过弹幕，不是躲开它。','打靶别恋战，感受每一把枪的节奏。','武器架上的枪随便试，试到顺手上路。','动作要快，准头要稳，心要冷。'],
    afterWin:'老练成这样还来打靶？好习惯，保持。',
    manyDeaths:'死得多不可怕，怕的是死得不明白。来，打靶，我看着。',
    afterUnlock:'换了新装备？那就重新找找手感，枪变了节奏就变了。' },
};

/* ---------- 基地主题（比地牢更亮、更暖、更安静） ---------- */
const THEME = {
  name:'废弃军械站',
  floorA:0x8a6a42, floorB:0x7c5e3a, floorSpec:0x6a5030,
  wall:0x4a4440, wallTop:0x5c554e, wallTrim:0x2e2a26,
  fog:0x1c140c, fogNear:15, fogFar:34,
  ambient:0xffe2b8, ambientI:.78, hemiSky:0xffdcae, hemiGround:0x40301c, hemiI:.6,
  dir:0xffd8a0, dirI:.55,
  torch:0xffb050, torchI:1.15, flame:'flame',
  banner:0x8a6a2e,
};
const TIER_COLOR = { D:'#9aa4ac', C:'#5ad07a', B:'#58a8ff', A:'#c87aff' };

const B = {
  active:false, _panel:null, _buildDone:false, floor:null,
  _introQ:[], _normalIdx:{}, _met:{}, _lastResult:'', _deathsSince:0, _shardsSpentMark:0, _dustT:0, _emberT:0,

  isOpen(){ return !!this._panel; },

  /* ---------- 静态 tile 地图（32×20，复用 G.floor 碰撞体系） ---------- */
  makeFloor(){
    const W=32, H=20, tiles=new Map(), keyOf=(x,z)=>x+','+z;
    const room={ type:'base', rx:0, rz:0, rw:W, rh:H, x0:0, x1:W-1, z0:0, z1:H-1, cx:16, cz:9.5,
      props:[], torches:[], torchMeshes:[], wrackGroups:[], hazards:[], doors:[], decor:[],
      discovered:true, cleared:true, visited:true, neighbors:[] };
    // 多区域分区（2026-09-04 反馈批次）：南北隔断墙已按用户要求全部拆除——分区靠
    // 中央核心、家具、灯光与地面材质区分，全基地南北彻底打通不再挡道
    const stubs={};   // 中央核心左右护栏（x=11/x=21）已按用户要求拆除
    // 非规则外框（地牢房间感）：四角切掉形成 L 形轮廓 + 中段外墙的齿状凹凸，摆脱正矩形
    const corner=(x,z)=>(
      (x<3 && z<3) || (x>W-4 && z<3) ||            // 西北 / 东北切角
      (x<3 && z>H-4) || (x>W-4 && z>H-4) ||        // 西南 / 东南切角
      (z===0 && (x<2 || x>W-3)) ||                  // 北墙两端内收
      (z===H-1 && (x<2 || x>W-3)) ||                // 南墙两端内收
      (x===0 && (z===6||z===7||z===12||z===13)) ||  // 西墙齿状凹凸
      (x===W-1 && (z===6||z===7||z===12||z===13))   // 东墙齿状凹凸
    );
    for(let x=0;x<W;x++) for(let z=0;z<H;z++){
      // 南北外墙恢复（用户澄清：拆的是核心左右护栏，边界墙需补回）；四边均为墙
      const border = x===0||z===0||x===W-1||z===H-1;
      if(border || corner(x,z) || stubs[x+','+z]) tiles.set(keyOf(x,z), {t:'wall', x, z});
      else tiles.set(keyOf(x,z), {t:'floor', x, z, room});
    }
    const floor={ num:0, isBase:true, rooms:[room], doors:[], tiles, hazards:[], decor:[], props:[],
      tilesGet:(x,z)=>tiles.get(x+','+z), startRoom:room, bossRoom:null, exitRoom:null, rng:G.rng };
    return floor;
  },

  /* ---------- 场景构建（每次进基地重建：展示架/战利品/图鉴随解锁成长） ---------- */
  build(){
    // 清理旧世界（与 buildFloor 同款清理契约）
    const world=G.world;
    while(world.children.length){
      const c=world.children.pop();
      c.traverse(o=>{
        if(o.geometry && o.geometry.userData && o.geometry.userData.disposable && typeof o.geometry.dispose==='function') o.geometry.dispose();
        if(o.material && o.material.map && o.material.map.disposableTx && typeof o.material.map.dispose==='function') o.material.map.dispose();
      });
    }
    G.props.length=0;
    this._clearTags();                     // 清理 HTML 世界标签层
    const sc=G.scene;
    if(sc.fog) sc.fog.dispose&&sc.fog.dispose();
    sc.fog=new THREE.Fog(THEME.fog, THEME.fogNear, THEME.fogFar);
    sc.background=new THREE.Color(THEME.fog);
    G.lights.ambient.color.set(THEME.ambient); G.lights.ambient.intensity=THEME.ambientI;
    G.lights.hemi.color.set(THEME.hemiSky); G.lights.hemi.groundColor.set(THEME.hemiGround); G.lights.hemi.intensity=THEME.hemiI;
    G.lights.dir.color.set(THEME.dir); G.lights.dir.intensity=THEME.dirI;
    G.build.theme=THEME;

    const floor=this.floor=this.makeFloor();
    const room=floor.startRoom;
    const fb=new GB(), wb=new GB();
    for(const tile of floor.tiles.values()){
      if(tile.t!=='floor') continue;
      const c = ((tile.x+tile.z)%2===0)? THEME.floorA : THEME.floorB;
      fb.planeXZ(tile.x+.5, 0, tile.z+.5, 1, 1, c);
    }
    for(const tile of floor.tiles.values()){
      if(tile.t!=='wall') continue;
      wb.box(tile.x+.5,.75,tile.z+.5, 1,1.5,1, THEME.wall);
      wb.box(tile.x+.5,1.62,tile.z+.5, 1.04,.26,1.04, THEME.wallTop);
      wb.box(tile.x+.5,.08,tile.z+.5, 1.06,.16,1.06, THEME.wallTrim);
    }
    world.add(fb.buildMesh(G.vcolFloorMat));
    world.add(wb.buildMesh(G.vcolMat));

    this._props(room);
    this._npcs(room);
    this._trophies(room);
    this._lamps(room);
    this._buildDone=true;
    return floor;
  },

  addProp(room, pr){ return G.build.addProp(room, pr); },
  /* 基地世界标签：HTML 高分辨率悬浮层（屏幕空间投影，CSS px 字号清晰锐利，
     不随 320p 世界渲染缩糊；由 update 逐帧投影到屏幕坐标） */
  tag(text, color, x, y, z, px){
    let layer=G.$('tagLayer');
    if(!layer){
      layer=document.createElement('div'); layer.id='tagLayer';
      layer.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:12;overflow:hidden;';
      document.body.appendChild(layer);
    }
    const el=document.createElement('div');
    el.className='btag';
    el.textContent=text;
    el.style.color=color||'#ffe9a0';
    if(px) el.style.fontSize=px+'px';
    layer.appendChild(el);
    this._tags=this._tags||[];
    this._tags.push({el, x, y, z});
    return el;
  },
  _clearTags(){
    const layer=G.$('tagLayer');
    if(layer){ while(layer.firstChild) layer.removeChild(layer.firstChild); }
    this._tags=[];
  },

  /* ---------- 功能道具与装饰 ---------- */
  _props(room){
    const mk=(key,geoFn,x,z,r,rot)=>{ const g=new THREE.Group(); g.add(M(pgeo(key,geoFn),0,0,0)); if(rot) g.rotation.y=rot;
      this.addProp(room,{type:'decor',x,z,r,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:g}); return g; };
    // ── 中央视觉焦点：深渊核心「破晓引擎」（能量柱 + 旋转符文环 + 地面符文圈 + 献祭交互）──
    {
      const g=new THREE.Group();
      g.add(M(pgeo('core_base', b=>{
        b.cyl(0,.2,0,1.9,2.15,.4,0x3c4048,10);          // 底座圆台
        b.cyl(0,.42,0,1.5,1.7,.5,0x4a5450,10);          // 中层
        b.cyl(0,.82,0,1.15,1.3,.7,0x5c6862,8);          // 上层
        b.box(0,1.16,0,2.0,.16,.5,0x6a5430);            // 操作台横梁
        b.box(-.7,1.26,-.28,.18,.34,.18,0x2a2e34); b.box(.7,1.26,-.28,.18,.34,.18,0x2a2e34);
        b.cyl(.42,2.15,-.55,.14,.1,2.2,0x3a3230,6);     // 吊杆
        b.cyl(-.42,2.15,-.55,.14,.1,2.2,0x3a3230,6);
        b.box(-.2,2.55,-.2,.72,.16,.72,0x8a6a3a);       // 顶横梁
        b.cyl(0,2.95,0,.24,.3,1.0,0x8a5aff,8);          // 中央符文水晶
      }),0,0,0));
      // 能量柱（半透明紫，向上喷涌）——打破"摆件"感
      const pillar=new THREE.Mesh(G.cylGeo(.16,.3,3.6,10), G.bmat(0x8a5aff,.20));
      pillar.position.y=1.95; g.add(pillar);
      const pillarCore=new THREE.Mesh(G.cylGeo(.07,.12,3.0,8), G.bmat(0xc8a0ff,.55));
      pillarCore.position.y=1.8; g.add(pillarCore);
      const ring=new THREE.Mesh(new THREE.RingGeometry(1.15,1.28,28), G.bmat(0x8a5aff,.55));
      ring.rotation.x=-Math.PI/2; ring.position.y=1.7; g.add(ring);
      const ring2=new THREE.Mesh(new THREE.RingGeometry(1.44,1.52,28), G.bmat(0x50e0ff,.35));
      ring2.rotation.x=-Math.PI/2; ring2.position.y=2.0; g.add(ring2);
      const groundRing=new THREE.Mesh(new THREE.RingGeometry(2.3,3.1,40), G.bmat(0x8a5aff,.3));
      groundRing.rotation.x=-Math.PI/2; groundRing.position.y=.04; g.add(groundRing);
      const groundRing2=new THREE.Mesh(new THREE.RingGeometry(3.4,3.55,44), G.bmat(0x50e0ff,.18));
      groundRing2.rotation.x=-Math.PI/2; groundRing2.position.y=.045; g.add(groundRing2);
      const glow=new THREE.Sprite(G.pmat(0x8a5aff,.5)); glow.scale.set(5.4,5.4,1); glow.position.y=3.4; g.add(glow);
      const coreGlow=new THREE.Sprite(G.pmat(0xc8a0ff,.75)); coreGlow.scale.set(1.8,1.8,1); coreGlow.position.y=3.1; g.add(coreGlow);
      this.addProp(room,{type:'core',x:16,z:9.5,r:2.4,hp:Infinity,blocksMove:false,blocksBullets:false,mesh:g,
        interact:{label:()=>'深渊核心 · 准备桌（献祭 / 祝福 / 血契）', range:2.2,
          fn:()=>{ this.openPanel('core'); }}});
      this._core={group:g, ring, ring2, groundRing, groundRing2, pillar, pillarCore};
      // 四角守卫符文柱（发光）
      for(const [dx,dz] of [[-2.1,-1.4],[2.1,-1.4],[-2.1,1.5],[2.1,1.5]]){
        const p=new THREE.Group();
        p.add(M(pgeo('coreRune', b=>{
          b.box(0,.6,0,.3,.7,.3,0x3c4048);
          b.box(0,.96,0,.12,.1,.12,0x8a5aff);
        }),0,0,0));
        const rg=new THREE.Sprite(G.pmat(0x8a5aff,.5)); rg.scale.set(.5,.5,1); rg.position.y=.96; p.add(rg);
        p.position.set(16+dx,0,9.5+dz); G.world.add(p);
      }
      this.tag('深渊核心 · 准备桌 · [E]','#c8a0ff',16,3.9,9.5,22);
    }
    // ── 深渊升降梯（地牢入口 · 第二视觉焦点：大型机械门 + 发光符文）──
    {
      const g=new THREE.Group();
      g.add(M(pgeo('lift', b=>{
        b.box(0,.14,0,2.1,.3,2.1,0x3c4048);
        b.box(0,.36,0,1.7,.12,1.7,0x50565e);
        b.box(-.95,1.3,-.95,.2,2.4,.2,0x2c3036); b.box(.95,1.3,-.95,.2,2.4,.2,0x2c3036);
        b.box(-.95,1.3,.95,.2,2.4,.2,0x2c3036); b.box(.95,1.3,.95,.2,2.4,.2,0x2c3036);
        b.box(0,2.55,0,2.4,.18,.7,0x3a3230);           // 顶部机械门楣
        b.cyl(0,2.85,-.5,.06,.06,2.8,0x584428,5); b.cyl(0,2.85,.5,.06,.06,2.8,0x584428,5);
        b.box(-.42,1.2,.99,.1,.42,.05,0x50e0ff); b.box(.42,1.2,.99,.1,.42,.05,0x50e0ff);  // 门侧符文灯
      }),0,0,0));
      const ring=new THREE.Mesh(new THREE.RingGeometry(.55,.78,18), G.bmat(0xc050ff,.55));
      ring.rotation.x=-Math.PI/2; ring.position.y=.38; g.add(ring);
      const rg=new THREE.Sprite(G.pmat(0xc050ff,.6)); rg.scale.set(2.6,2.6,1); rg.position.y=1.35; g.add(rg); // 深红紫地牢辉光
      this.addProp(room,{type:'gate',x:4.5,z:9.5,r:.9,hp:Infinity,blocksMove:true,blocksBullets:true,mesh:g,
        interact:{label:()=>'乘升降梯 · 下潜至第一层 [深渊碎片 '+G.meta.data.shards+' ◆]', range:1.8,
          fn:()=>{ G.game.launchRun(); }}});
      this.tag('地牢入口 · 深渊升降梯','#c8a9ff',4.5,3.15,9.5,22);
    }
    // ── 武器工坊：枪械师工作台 + 枪械零件 / 弹壳 / 工具箱 ──
    {
      const g=new THREE.Group();
      g.add(M(pgeo('bench', b=>{
        b.box(0,.5,0,1.6,.12,.8,0x6a4c2e);
        b.box(-.7,.25,-.3,.12,.5,.12,0x54402a); b.box(.7,.25,-.3,.12,.5,.12,0x54402a);
        b.box(-.7,.25,.3,.12,.5,.12,0x54402a); b.box(.7,.25,.3,.12,.5,.12,0x54402a);
        b.box(.2,.62,0,.3,.08,.2,0x3a3f4a);           // 钳具
        b.box(-.3,.6,.1,.24,.06,.16,0x8a6a3a);        // 零件
        b.cyl(.42,.6,.12,.05,.05,.1,0xd8d0c0,6);      // 弹壳
        b.box(.1,.56,.32,.32,.05,.07,0x7a5a34);       // 未完成枪托
        b.cyl(-.36,.63,-.22,.04,.04,.15,0x8a8a92,5);  // 螺丝刀
      }),0,0,0));
      this.addProp(room,{type:'decor',x:8.5,z:2.5,r:.55,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:g});
      mk('gsBox', b=>{
        b.box(0,.22,0,.5,.44,.5,0x8a6a3e); b.box(0,.46,0,.54,.08,.54,0x9a7a4a);
        b.box(-.18,.58,.1,.16,.1,.12,0x6a5a3a); b.box(.12,.58,-.08,.14,.1,.1,0x5a6a4a);
      }, 4.5, 2, .34);
    }
    // ── 武器架交互点（核心厅东侧 · 循环试用已解锁武器）──
    {
      const g=new THREE.Group();
      g.add(M(pgeo('rackStand', b=>{
        b.box(0,.55,0,.24,1.15,.24,0x54402a);
        b.box(0,1.02,0,.72,.08,.32,0x6a4c2e);
        b.box(0,.52,0,.2,.16,.12,0x8a5a3a);           // 横置枪托位
        b.box(0,.16,0,.54,.1,.54,0x443424);
      }),0,0,0));
      this.addProp(room,{type:'rackUse',x:20,z:10,r:.45,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:g,
        interact:{label:()=>'武器架 · [E] 挑选试用任意已解锁武器', range:1.7, fn:()=>{ this.openPanel('weapons'); }}});
      this.tag('武器架 · [E] 挑选','#ffe9a0',20,1.9,10,18);
    }
    // ── 医疗舱（免费治疗 + 等级展示）──
    {
      const g=new THREE.Group();
      g.add(M(pgeo('medbay', b=>{
        b.box(0,.4,0,1.1,.8,.7,0x3c4a44);
        b.box(0,.86,0,.9,.12,.6,0x54645c);
        const cross=new THREE.Group();
        cross.add(new THREE.Mesh(G.boxGeo(.5,.14,.06), G.bmat(0x7ae8b0)));
        cross.add(new THREE.Mesh(G.boxGeo(.14,.5,.06), G.bmat(0x7ae8b0)));
        cross.position.set(0,1.02,.36); g.add(cross);
      }),0,0,0));
      const glow=new THREE.Sprite(G.pmat(0x7ae8b0)); glow.scale.set(.9,.9,1); glow.position.y=1.05; g.add(glow);
      this.addProp(room,{type:'medbay',x:12,z:2.5,r:.55,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:g,
        interact:{label:()=>'医疗站 Lv'+G.meta.up('medbay')+' · 恢复生命（'+G.player.hp+'/'+G.player.maxHp+'）', range:1.6,
          fn:()=>{ const p=G.player; if(p.hp>=p.maxHp){ G.ui.toast('生命已满。'); return; }
            p.hp=p.maxHp; G.base.hudRefresh(); G.audio.sfx('heart',{v:.6}); G.fx.burst(p.x,.8,p.z,8,{color:0x7ae8b0,spd:2,life:.5,s0:.15}); G.ui.toast('医疗舱嗡鸣着修补了你的伤口。'); }}});
      this.tag('医疗站 Lv'+G.meta.up('medbay'),'#7ae8b0',12,1.95,2.5,18);
    }
    // ── 工程区：弹药工作台 / 工程机械 ──
    {
      {
        const g=new THREE.Group();
        g.add(M(pgeo('ammoBench', b=>{
          b.box(0,.42,0,1.3,.1,.7,0x54402a); b.box(-.55,.21,-.25,.1,.42,.1,0x443424); b.box(.55,.21,-.25,.1,.42,.1,0x443424);
          b.box(-.55,.21,.25,.1,.42,.1,0x443424); b.box(.55,.21,.25,.1,.42,.1,0x443424);
          b.box(-.3,.55,.1,.34,.24,.24,0x5a6a48); b.box(.15,.53,-.1,.28,.2,.2,0x6a5a38);
          b.box(-.1,.3,-.38,.5,.06,.08,0xe8c15a); b.box(.25,.3,-.36,.12,.12,.1,0x8a8a92);  // 台前弹药盒 + 弹匣
        }),0,0,0));
        this.addProp(room,{type:'ammoBench',x:25.5,z:2.5,r:.75,hp:Infinity,blocksMove:true,blocksBullets:false,mesh:g,
          interact:{label:()=>'弹药补给 · 补满当前武器弹药', range:1.7,
            fn:()=>{ const p=G.player; if(!p) return;
              const w=p.weapons[p.curW];
              if(w && w.ammo < w.def.mag){
                w.ammo=w.def.mag; G.ui.weapon(p); G.audio.sfx('reloadEnd',{v:.6});
                G.fx.burst(p.x,.8,p.z,6,{color:0x50e0a0,spd:1.5,life:.4,s0:.12});
                G.ui.toast('弹药工作台补满了『'+w.def.name+'』的弹匣。');
              } else G.ui.toast('当前武器弹药已满。');
            }}});
        this.tag('弹药工作台 · [E] 补给','#d8cdb4',25.5,1.55,2.5,18);
      }
      const mach=mk('machine', b=>{
        b.box(0,.55,0,.9,1.1,.7,0x4a5450);
        b.cyl(.32,1.35,.2,.1,.1,.5,0x5c6862,6);
        b.box(0,1.18,.2,.5,.14,.1,0x303834);
      }, 21.5, 5, .5);
      // 机械排气管（蒸汽装饰，update 冒汽）
      mk('machinePipe', b=>{
        b.box(0,.75,0,.3,.1,.3,0x5c6862);
        b.cyl(0,1.0,0,.09,.09,.5,0x6a7670,6);
      }, 21, 5.8, .34);
    }
    // ── 档案区：书架 / 测绘桌 / 卷轴架 / 文件堆 ──
    {
      mk('shelf1', b=>{
        b.box(0,.9,0,1.3,1.8,.34,0x54402a);
        b.box(-.28,1.35,.18,.3,.24,.08,0x8a5a3a); b.box(.1,1.35,.18,.26,.2,.08,0x4a6a5a);
        b.box(.42,1.35,.18,.2,.26,.08,0x7a4a4a);
        b.box(-.2,.9,.18,.34,.22,.08,0x5a5a7a); b.box(.24,.9,.18,.3,.26,.08,0x8a7a3a);
        b.box(-.24,.45,.18,.28,.24,.08,0x3a6a4a); b.box(.18,.45,.18,.34,.2,.08,0x6a4a6a);
      }, 26.5, 8.5, .45, 0);
      mk('shelf2', b=>{
        b.box(0,.9,0,1.3,1.8,.34,0x54402a);
        b.box(-.2,1.3,.18,.3,.24,.08,0x6a5a3a); b.box(.2,1.3,.18,.26,.2,.08,0x4a5a6a);
        b.box(0,.85,.18,.5,.24,.08,0x7a5a4a);
        b.box(-.24,.4,.18,.3,.22,.08,0x5a6a4a); b.box(.2,.4,.18,.3,.24,.08,0x6a6a3a);
      }, 26.5, 9.8, .45, 0);
      mk('mapTable', b=>{
        b.box(0,.5,0,1.7,.1,1.1,0x6a4c2e);
        b.box(-.75,.25,-.45,.12,.5,.12,0x54402a); b.box(.75,.25,-.45,.12,.5,.12,0x54402a);
        b.box(-.75,.25,.45,.12,.5,.12,0x54402a); b.box(.75,.25,.45,.12,.5,.12,0x54402a);
        b.box(0,.58,0,1.4,.03,.9,0xd8cba8);
        b.box(-.3,.62,.2,.08,.04,.08,0xc03028); b.box(.25,.62,-.15,.08,.04,.08,0x3a5a8a);
      }, 20.5, 12.8, .6);
      this.tag('深渊测绘桌','#d8cdb4',20.5,1.4,12.8,18);
      mk('scrolls', b=>{
        b.cyl(.1,.5,-.28,.1,.1,.06,0xd8cba8,6); b.cyl(-.08,.5,-.2,.1,.1,.06,0xc8b890,6);
        b.cyl(0,.5,.1,.09,.09,.05,0xd8cba8,6);
      }, 24.8, 7.6, .34);
      mk('fileStack', b=>{
        b.box(0,.14,0,.5,.28,.38,0x8a7a5a); b.box(.06,.3,.02,.44,.04,.32,0x9a8a6a);
        b.box(-.04,.4,-.03,.42,.04,.3,0x7a6a4a);
      }, 25.5, 10, .34);
      if(G.meta.up('archive')>=1){      // 档案室升级→档案角扩建（Meta 可视化）
        mk('shelf3', b=>{
          b.box(0,.9,0,1.1,1.6,.3,0x54402a);
          b.box(-.2,1.25,.16,.26,.2,.07,0x5a6a8a); b.box(.14,1.25,.16,.24,.22,.07,0x8a5a5a);
          b.box(-.1,.85,.16,.3,.24,.07,0x6a6a4a); b.box(.18,.85,.16,.24,.2,.07,0x4a6a5a);
          b.box(0,.45,.16,.34,.22,.07,0x7a5a3a);
        }, 26.5, 11.2, .42, 0);
        mk('fileStack2', b=>{
          b.box(0,.1,0,.4,.2,.28,0x8a7a5a); b.box(.04,.24,0,.32,.06,.22,0x9a8a6a);
        }, 24.2, 11.2, .3);
      }
    }
    // ── 休息区：火炉 + 木箱 + 桌椅 + 食物 ──
    {
      mk('furnace', b=>{
        b.box(0,.5,0,.9,1.0,.7,0x50453c);
        b.box(0,.4,.36,.5,.3,.06,0x241a10);
        b.cyl(0,1.15,0,.14,.2,.5,0x443a32,6);
      }, 15, 14.8, .55);
      for(const [cx,cz] of [[17.2,14.2],[18.0,14.5],[17.6,15.2]])
        mk('crate'+cx, b=>{
          b.box(0,.24,0,.56,.48,.56,0x7a5a34);
          b.box(0,.5,0,.6,.08,.6,0x8a6a3e);
          b.box(0,.24,.29,.4,.06,.02,0x54402a);
        }, cx, cz, .34);
      mk('restTable', b=>{
        b.box(0,.42,0,1.1,.08,.6,0x6a4c2e);
        b.box(-.45,.21,-.24,.08,.4,.08,0x54402a); b.box(.45,.21,-.24,.08,.4,.08,0x54402a);
        b.box(-.45,.21,.24,.08,.4,.08,0x54402a); b.box(.45,.21,.24,.08,.4,.08,0x54402a);
        b.cyl(.2,.45,.12,.05,.05,.1,0x8a6a3a,5);   // 杯子
        b.cyl(-.18,.45,-.1,.06,.06,.08,0x7a7a8a,5); // 碗
      }, 13.5, 14.5, .5);
      mk('restChair', b=>{
        b.box(0,.24,0,.34,.05,.34,0x6a4c2e);
        b.box(0,.42,.13,.32,.3,.06,0x6a4c2e);      // 椅背
        b.box(-.15,.12,-.12,.05,.24,.05,0x54402a); b.box(.15,.12,-.12,.05,.24,.05,0x54402a);
      }, 14.3, 15.2, .34, .3);
    }
    // ── 训练场：训练靶（可射击，打碎自动重置）+ 弹孔木板 ──
    {
      const lv=G.meta.up('training');
      const hp=60+lv*120;
      const targets= lv>=1 ? [[4.5,13.5],[10.5,16.5],[7.5,17.5]] : [[4.5,13.5],[10.5,16.5]]; // 训练靶分散成大三角（Meta 可视化：升级→多一座）
      for(const [dx,dz] of targets){
        const g=new THREE.Group();
        g.add(M(pgeo('dummy', b=>{
          b.box(0,.55,0,.62,.28,.62,0x6a5a3a);           // 座（加大）
          b.cyl(0,1.15,0,.17,.2,1.15,0x7a6440,6);        // 立柱（加粗加高）
          b.cyl(0,1.9,0,.55,.55,.22,0xd8cba8,12);        // 靶盘（加大到 1.1 直径）
          b.cyl(0,1.9,0,.42,.42,.26,0xc03028,12);        // 红环
          b.cyl(0,1.9,0,.2,.2,.28,0xd8cba8,10);          // 靶心
          b.box(0,1.02,.34,.4,.12,.08,0x6a5430);         // 靶臂托架
        }),0,0,0));
        this.addProp(room,{type:'dummy',x:dx,z:dz,r:.6,hp,maxhp:hp,blocksMove:true,blocksBullets:true,mesh:g,respawnT:0});
      }
      // 命中计数标签（HTML 高分辨率层，随 damageProp 更新）
      this._hitsTag=this.tag('命中 0 次 · 打碎自动重置','#ffe9a0',7.5,2.9,14,18);
      mk('targetBoard', b=>{
        b.box(0,.5,0,.3,.05,.9,0x6a5430);
        b.box(.16,.75,0,.05,.5,.06,0x54402a); b.box(-.16,.75,0,.05,.5,.06,0x54402a);
        b.cyl(.16,.6,.1,.03,.03,.06,0x3a3a3a,5); b.cyl(-.1,.55,-.2,.03,.03,.06,0x3a3a3a,5); // 弹孔
      }, 3.5, 14.5, .34);
      this.tag('训 练 场','#ffe9a0',7.5,2.5,14,20);
    }
  },
  /* ---------- NPC×4（造型 / 交互 / 对话入口） ---------- */
  _npcMesh(key){
    const g=new THREE.Group(); const refs={};
    const add=(k,fn)=>{ g.add(M(pgeo(k,fn),0,0,0)); };
    if(key==='gunsmith'){
      add('nGS_body', b=>{
        b.box(0,.55,0,.56,.62,.42,0x6a4c2e);           // 厚重工作服（暖棕）
        b.box(0,.5,.21,.5,.54,.06,0x7a5230);           // 皮围裙
        b.box(0,.6,.14,.46,.1,.08,0x4a3a28);           // 工具腰带
        b.box(0,.66,.16,.3,.05,.05,0x8a8a92);          // 腰带工具扣
        b.box(.16,.82,.2,.08,.08,.05,0x5a6a3a); b.box(-.14,.78,.2,.08,.08,.05,0x5a6a3a); // 肩挂弹匣
        b.box(-.3,.92,.18,.12,.14,.05,0x3a4a2e);       // 肩带弹匣
        b.box(0,.98,0,.4,.36,.36,0x8a7454);            // 头
        b.box(-.1,1.14,.18,.09,.06,.03,0x5ad0d8); b.box(.1,1.14,.18,.09,.06,.03,0x5ad0d8); // 额前护目镜
        b.box(-.26,.78,0,.14,.42,.14,0x6a4c2e);        // 左臂
      });
      const arm=new THREE.Group();
      arm.add(M(pgeo('nGS_arm', b=>{
        b.box(0,-.2,0,.14,.46,.14,0x6a4c2e);
        b.box(0,-.48,.05,.18,.1,.12,0xd8cba8);         // 擦枪布
      }),0,0,0));
      arm.position.set(.27,.86,0); g.add(arm); refs.arm=arm;
      refs.workFace=0;                                  // 面向工作台（西）
    } else if(key==='engineer'){
      add('nEG_body', b=>{
        b.box(0,.52,0,.5,.58,.38,0x4a6a5a);            // 深绿工装
        b.box(-.2,.85,-.2,.3,.46,.2,0x4a4438);         // 工具背箱
        b.box(-.2,1.12,-.2,.34,.08,.24,0x3a342c);
        b.cyl(.3,.98,.1,.03,.03,.5,0x8a8a92,5);        // 背包螺丝刀
        b.cyl(-.28,1.0,-.05,.02,.02,.4,0xd8a040,4);    // 背包电线（橙）
        b.box(0,1.08,0,.38,.32,.34,0x9a8a6a);
        b.cyl(0,1.3,0,.24,.24,.1,0xe0c040,8);          // 安全帽
        b.cyl(0,1.26,0,.3,.3,.03,0xe0c040,8);
        b.box(-.26,.9,.12,.14,.1,.1,0x6a7a8a);         // 肩部电路盒
      });
      const arm=new THREE.Group();
      arm.add(M(pgeo('nEG_arm', b=>{
        b.box(0,-.2,0,.14,.44,.14,0x4a6a5a);
        b.box(0,-.46,0,.2,.16,.2,0x5c646e);            // 大号机械手套
        b.box(0,-.5,0,.16,.12,.34,0xb0b4bc);           // 扳手
      }),0,0,0));
      arm.position.set(.28,.84,0); g.add(arm); refs.arm=arm;
      refs.workFace=Math.PI;                          // 面向西侧的工程机械
    } else if(key==='archivist'){
      add('nAR_body', b=>{
        b.cone(0,.58,0,.4,1.0,0x3a4a3e);              // 长外套（深绿，长及膝）
        b.box(0,.34,.22,.44,.7,.04,0x4a5a48);          // 外套前襟
        b.sph(0,1.14,0,.2,0xc8b494);
        b.box(-.07,1.16,.16,.06,.04,.02,0x2a2a30); b.box(.07,1.16,.16,.06,.04,.02,0x2a2a30); // 眼镜
        b.box(-.3,.72,.18,.16,.14,.08,0x6a5a3a);       // 地图包（侧挎）
        b.box(-.3,.8,.18,.12,.05,.02,0xd8cba8);        // 地图露出
      });
      const arm=new THREE.Group();
      arm.add(M(pgeo('nAR_book', b=>{
        b.box(0,-.3,.1,.36,.44,.1,0x6a3a2e);           // 大书
        b.box(.02,-.3,.16,.32,.4,.02,0xe8dcb8);        // 书页
        b.box(.12,-.1,.14,.08,.06,.04,0x8a6a3a);       // 手中文件夹
      }),0,0,0));
      arm.position.set(.1,.95,.1); g.add(arm); refs.arm=arm;
      refs.workFace=0;                                // 面向东侧书架
    } else { // instructor
      add('nIN_body', b=>{
        b.box(0,.55,0,.5,.64,.36,0x4a5a3a);            // 训练护甲（军绿）
        b.box(0,.52,.19,.42,.52,.05,0x3a4a2e);         // 胸甲板
        b.box(.16,.4,.18,.12,.5,.06,0x8a7a5a);         // 护腕（左）
        b.box(0,.34,.2,.12,.14,.12,0x3a2e24);          // 军靴（左前）
        b.box(-.14,.34,-.18,.12,.14,.12,0x3a2e24);     // 军靴（右后）
        b.box(0,1.0,0,.36,.34,.32,0xc8a882);
        b.cyl(0,1.26,0,.24,.24,.1,0x4a5a3a,8);         // 军帽
        b.cyl(0,1.2,0,.28,.28,.03,0x4a5a3a,8);
        b.box(0,1.12,.19,.05,.05,.05,0xe8c15a);        // 哨子
        b.box(-.26,.8,0,.13,.46,.13,0x4a5a3a);         // 左臂
      });
      const arm=new THREE.Group();
      arm.add(M(pgeo('nIN_arm', b=>{
        b.box(0,-.2,0,.13,.44,.13,0x4a5a3a);
        b.box(0,-.46,0,.11,.1,.26,0x8a7a5a);           // 训练武器（短棍）
        b.box(0,-.42,.16,.09,.09,.06,0xc8a882);        // 手
      }),0,0,0));
      arm.position.set(.27,.87,0); arm.rotation.x=-.5; g.add(arm); refs.arm=arm;
      const hand2=new THREE.Group();
      hand2.add(M(pgeo('nIN_hand2', b=>{
        b.box(0,-.2,0,.13,.42,.13,0x4a5a3a);
        b.box(0,-.44,.1,.1,.1,.08,0xc8a882);
      }),0,0,0));
      hand2.position.set(-.27,.84,0); g.add(hand2); refs.hand2=hand2;
      refs.workFace=Math.PI;                          // 面向西侧训练靶
    }
    return {group:g, refs};
  },
  _npcs(room){
    const defs=[
      {key:'gunsmith',  x:6,   z:3,    panel:'gunsmith',  tag:'武器工坊'},
      {key:'engineer',  x:23,  z:3,    panel:'engineer',  tag:'工程改装铺'},
      {key:'archivist', x:24.5,z:10.5, panel:'archivist', tag:'深渊档案角'},
      {key:'instructor',x:8,   z:14.8, panel:null,        tag:'教官'},
    ];
    this.npcs=[];
    for(const d of defs){
      const {group, refs}=this._npcMesh(d.key);
      const pr=this.addProp(room,{type:'npc_'+d.key, x:d.x, z:d.z, r:.42, hp:Infinity,
        blocksMove:true, blocksBullets:false, mesh:group, refs, key:d.key,
        face:refs.workFace||0, t:Math.random()*9});
      pr.interact={label:()=>(DIA[d.key].name+' · '+(d.panel?'[E] 交谈 / 门店':'[E] 交谈')), range:1.7,
        fn:()=>{ if(d.panel) this.openPanel(d.panel);   // 门店 NPC：直接开看板（引言内嵌面板，不遮挡）
                 else this.speak(d.key); }};
      this.tag(DIA[d.key].name, '#ffe9a0', d.x, 2.0, d.z, 20);
      this.npcs.push(pr);
    }
  },

  /* ---------- 武器展示架（随解锁成长） ---------- */
  /* ---------- 中央战利品墙（Boss 首杀后点亮） ---------- */
  _trophies(room){
    const st=G.meta.data.stats.boss;
    this.tag('战 利 品 墙','#d8cdb4',16,2.6,0.7,18);
    const defs=[
      {key:'ironjaw',  x:14.0, col:'#c05038'},
      {key:'faceless', x:18.0, col:'#9a6aff'},
    ];
    for(const d of defs){
      const got=st[d.key] && st[d.key].count>0;
      const g=new THREE.Group();
      g.add(M(pgeo('trophy_set_'+d.key, b=>{
        b.box(0,1.0,0,1.6,2.0,.12,0x241f1a);            // 壁龛背板（带框）
        b.box(0,.72,0,1.45,.06,.18,0x4a3a28);          // 台板
        b.cyl(0,.5,0,.22,.3,.5,0x3a3230,8);            // 展台柱
        b.cyl(0,.78,0,.44,.48,.12,0x54402a,10);        // 展台盘
        if(d.key==='ironjaw'){
          b.box(0,1.0,0,.62,.34,.08,0x586068);         // 锈甲
          for(let i=0;i<6;i++) b.box(-.25+i*.1,.86,.09,.08,.13,.05,0xd8d0c0); // 铁颚牙（加大）
          b.box(-.18,1.12,.1,.1,.06,.05,0xff6040); b.box(.18,1.12,.1,.1,.06,.05,0xff6040);
        } else {
          b.box(0,1.02,0,.54,.62,.08,0x2a2038);        // 空壳面具（加大）
          b.box(0,1.07,.06,.08,.34,.04,0xc87aff);      // 竖缝紫眼
          b.cone(0,1.42,0,.15,.22,0x1a1226,4);         // 尖角
        }
        b.box(0,.45,0,1.1,.1,.14,0x3a3230);            // 铭牌台
      }),0,0,0));
      if(got){
        const backLight=new THREE.Sprite(G.pmat(d.col,.5));  // 得奖点亮背灯（随龛显隐）
        backLight.scale.set(2.4,2.4,1); backLight.position.set(0,1.5,-.2); g.add(backLight);
      }
      g.position.set(d.x,0,1);
      g.visible=got;
      G.world.add(g);
      this.tag(got?BOSS_INFO[d.key].name+' ✔':'？？？', got?'#ffe9a0':'#c9bda0', d.x, 2.35, 1, 18);
    }
  },

  /* ---------- 挂灯（复用 B.update 的火把光池） ---------- */
  _lamps(room){
    room.torchMeshes.length=0;
    // 区域彩色灯位：[x,z,火焰色] —— 工坊暖橙 / 核心紫蓝 / 工程青绿 / 档案冷蓝 / 训练场亮白 / 休息区暖红 / 仓库中性 / 入口红紫
    const lamps=[[4.5,1.2,0xffb060],[8.0,4.0,0xffa040],[12.5,1.2,0x8a5aff],[17.5,1.2,0x8a5aff],
      [24.5,1.2,0x50e0a0],[21.5,5.0,0x50e0a0],[26.5,6.8,0x50c8ff],[26.5,10.5,0x50c8ff],
      [5.5,11.5,0xffe8b0],[16.0,13.0,0xff6a3a],[23.5,13.0,0xffc860],[3.5,8.0,0xffa040],[27.0,9.0,0x50e0a0],[4.5,11.0,0xd040ff]];
    for(const [x,z,color] of lamps){
      const g=new THREE.Group();
      g.add(M(pgeo('lamp', b=>{
        b.cyl(0,.35,0,.05,.07,.7,0x3a342c,5);          // 吊杆
        b.cyl(0,.62,0,.16,.1,.2,0x50453c,6);           // 灯罩
      }),0,0,0));
      const fl=new THREE.Sprite(new THREE.SpriteMaterial({map:G.tex('flame'),transparent:true,depthWrite:false,color}));
      fl.scale.set(.6,.66,1); fl.position.y=.5; g.add(fl);
      g.userData.flame=fl;
      g.position.set(x,1.8,z);
      G.world.add(g);
      room.torchMeshes.push(g);
    }
    // 区域环境点光源（数量受控：只给视觉焦点/分区加，不做几十个动态灯）
    this._zoneLights=[];
    this._torchList=room.torchMeshes;
    const zl=[ [6,3,2.5,0xff8a30,.55], [16,4.4,9.5,0x9a6aff,.85], [25,2.6,8,0x50c8ff,.4],
      [6,2.6,13,0xffe8b0,.5], [15,2.2,14.8,0xff5a28,.6], [4.5,2.6,9.5,0xd040ff,.6] ];
    for(const [x,y,z,color,int] of zl){
      const l=new THREE.PointLight(color, int, 7, 1.4);
      l.position.set(x,y,z); G.world.add(l); this._zoneLights.push(l);
    }
  },
  _lampMat:null,

  /* ---------- 进出基地 ---------- */
  hud(on){
    const el=G.$('baseHud');
    if(el) el.style.display=on?'block':'none';
    if(on) this.hudRefresh();
  },
  hudRefresh(){
    const p=G.player, el=G.$('bhHp'), es=G.$('bhShards');
    if(el && p) el.textContent='♥ '+p.hp+'/'+p.maxHp;
    if(es) es.textContent=''+G.meta.data.shards;   // ◆ 符号由模板提供，避免出现孤立◆
    // 当前持有武器（品阶色名字 + 弹药，类似局内 HUD；武器架试用/换枪后即时刷新）
    const bw=G.$('bhWeaponName'), ba=G.$('bhAmmo');
    if(p){
      const w=p.weapons[p.curW];
      if(bw){ bw.textContent=w?w.def.name:'—'; if(w) bw.style.color=TIER_COLOR[w.def.tier]||'#e8d9a8'; }
      if(ba) ba.textContent=w?w.ammo+'/'+w.def.mag:'';
    }
  },
  onEnter(from){
    this._boonPool=null;   // 每局重进基地：祝福池重新随机
    if(G.game._shardToast){ G.ui.toast(G.game._shardToast); G.game._shardToast=null; }
    this._lastResult = from==='win'?'win':'';
    if(from==='dead') this._deathsSince++;
    else if(from!=='win') this._deathsSince=0;
    G.meta.save();
    this.hud(true);
    if(from==='title' && !G.meta.data.flags.introBase){
      G.meta.data.flags.introBase=true; G.meta.save();
      G.ui.banner('废弃军械站','流浪枪手的避难所 · 出发前整备一番');
      this._introQ=[
        {t:2.2, msg:'「枪械师老铆：攒深渊碎片找我买枪，碎片来自下潜、讨伐和每一次活着回来。」'},
        {t:5.2, msg:'「教官铁哨：先去西侧靶场试试枪，西边的升降梯直通地牢第一层。」'},
      ];
    } else if(from==='dead'){
      G.ui.banner('回到基地','休整一下，深渊不会跑');
    } else if(from==='win'){
      G.ui.banner('凯 旋','深渊制霸 · 整备之后再来');
    }
  },
  /* 每次进基地重建场景（战利品/展示架/图鉴随解锁成长） */
  install(){ return this.build(); },
  /* 离开基地（进入地牢时由 startRun→buildFloor 清理场景，这里只复位状态） */
  leave(){
    this.active=false;
    this.closePanel();
    this.hud(false);
  },
  /* 显式拆除基地场景（回标题时没有 buildFloor 接手清理，需自行拆） */
  teardownWorld(){
    const world=G.world;
    while(world.children.length){
      const c=world.children.pop();
      c.traverse(o=>{
        if(o.geometry && o.geometry.userData && o.geometry.userData.disposable && typeof o.geometry.dispose==='function') o.geometry.dispose();
        if(o.material && o.material.map && o.material.map.disposableTx && typeof o.material.map.dispose==='function') o.material.map.dispose();
      });
    }
    G.props.length=0;
    this._clearTags();
    this.floor=null;
  },

  /* ---------- 对话（优先级：初见 > 通关 > 屡死 > 解锁后 > 常态轮换） ---------- */
  speak(key){
    const d=DIA[key];
    let line;
    if(!this._met[key]){ line=d.first; this._met[key]=true; }
    else if(this._lastResult==='win'){ line=d.afterWin; this._lastResult=''; }
    else if(this._deathsSince>=3){ line=d.manyDeaths; this._deathsSince=0; }
    else if(this._justSpent){ line=d.afterUnlock; this._justSpent=false; }
    else {
      const arr=d.normal;
      this._normalIdx[key]=((this._normalIdx[key]||0)+1);
      line=arr[this._normalIdx[key]%arr.length];
    }
    this.showDialog(DIA[key].name, line);
    G.audio.sfx('blip',{v:.5});
  },
  /* ---------- NPC 大对话框（名字 + 对白 + [E] 继续，世界低分辨率/UI 高分辨率分层） ---------- */
  showDialog(name,line){
    const el=G.$('npcDialog');
    if(!el){ return; }
    const n=el.querySelector('.dname'), l=el.querySelector('.dline');
    if(n) n.textContent='— '+name+' —';
    if(l) l.textContent='“'+line+'”';
    el.classList.add('on');
    this._dlg=true;
  },
  closeDialog(){
    this._dlg=null;
    const el=G.$('npcDialog');
    if(el) el.classList.remove('on');
  },
  isDialogOpen(){ return !!this._dlg; },

  /* ---------- 面板（枪械师 / 工程师 / 档案员） ---------- */
  openPanel(kind){
    if(this._panel===kind){ this.closePanel(); return; }
    if(G.shop && G.shop.isOpen()) return;
    this.closeDialog();            // 打开数据看板时先收起 NPC 对话框，避免遮挡
    const tl=G.$('tagLayer'); if(tl) tl.style.display='none';   // 世界标签不再透出在面板上
    this.closePanel();
    this._panel=kind;
    G.input.mouse.wheel=0;
    this.renderPanel();
    G.$('baseWrap').classList.add('on');
    G.audio.sfx('ui',{v:.4});
  },
  closePanel(){
    if(!this._panel) return;
    this._panel=null;
    const w=G.$('baseWrap');
    if(w) w.classList.remove('on');
    const tl=G.$('tagLayer'); if(tl) tl.style.display='';
    G.input.mouse.down=false; G.input.mouse.wheel=0; G.input.buffer={};
  },
  fmtT(t){ const s=Math.floor(t||0); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); },
  renderPanel(){
    const kind=this._panel;
    const title=G.$('baseTitle'), body=G.$('baseBody');
    G.$('baseShardsVal').textContent=G.meta.data.shards;
    body.innerHTML='';
    // NPC 引言（替换原遮挡对话框：对话内容内嵌在看板顶部）
    if(DIA[kind]){
      const d=DIA[kind], arr=d.normal||[];
      const q=document.createElement('div');
      q.className='bintro'; q.textContent='“'+(arr[this._normalIdx[kind]?((this._normalIdx[kind]%arr.length)+arr.length)%arr.length:0]||d.first)+'”';
      body.appendChild(q);
    }
    if(kind==='core'){
      title.textContent='🜲 深渊核心 · 准备桌';
      if(!this._coreTab) this._coreTab='sac';
      // 页签行
      const tabs=document.createElement('div'); tabs.className='btabs';
      const mkTab=(key,label)=>{ const tb=document.createElement('button'); tb.className='btab'+(this._coreTab===key?' on':''); tb.textContent=label; tb.onclick=()=>{ this._coreTab=key; this.renderPanel(); }; tabs.appendChild(tb); };
      mkTab('sac','① 基础献祭'); mkTab('boon','② 祝福池'); mkTab('pact','③ 血契');
      body.appendChild(tabs);
      const count=G.meta.runBoonCount();
      const cap=document.createElement('div'); cap.className='bsec';
      cap.textContent='— 本局已携带 '+count+' / 2 · 下潜时生效 · 结算清空 —';
      body.appendChild(cap);
      if(this._coreTab==='sac'){
        const bl=G.meta.data.bless||0;
        const sec=document.createElement('div'); sec.className='bsec'; sec.textContent='— 向核心供奉碎片：下一次下潜伤害 +15%（可叠加）—'; body.appendChild(sec);
        const card=document.createElement('div'); card.className='wcard bcard';
        card.innerHTML='<div class="wname" style="color:#c8a0ff">基础献祭</div>'+
          '<div class="bdesc">当前已累计 '+bl+' 层 · 每层下潜伤害 +15%（进本后生效）</div>'+
          '<div class="wrow"><span class="wtier">消耗 8 ◆</span><span class="wprice">'+G.meta.data.shards+' ◆ 持有</span></div>';
        const btn=document.createElement('button'); btn.className='btn sm bbuy';
        btn.textContent='献 祭 8 ◆';
        btn.onclick=()=>{ if(!G.meta) return;
          if(G.meta.data.shards<8){ G.audio.sfx('error',{v:.5}); G.ui.toast('深渊碎片不足（需 8 ◆）。'); return; }
          G.meta.data.shards-=8; G.meta.data.bless=(G.meta.data.bless||0)+1; G.meta.save();
          this.hudRefresh(); G.audio.sfx('voidcharge',{v:.7});
          G.fx.burst(16,.6,9.5,28,{color:0x8a5aff,spd:3.6,vy:1.5,life:.9,s0:.3,kind:'a'});
          G.ui.toast('深渊之力注入——下一次下潜：伤害 +15%（累计 '+G.meta.data.bless+' 层）。');
          this.renderPanel();
        };
        card.appendChild(btn); body.appendChild(card);
      } else if(this._coreTab==='boon'){
        if(!this._boonPool){ const keys=Object.keys(G.meta.BOONS); const pool=[]; while(pool.length<3 && keys.length){ const i=Math.floor(Math.random()*keys.length); pool.push(keys.splice(i,1)[0]); } this._boonPool=pool; }
        const sec=document.createElement('div'); sec.className='bsec'; sec.textContent='— 本局随机 3 个祝福 · 多选叠加 · 仅限本局 —'; body.appendChild(sec);
        for(const id of this._boonPool){
          const u=G.meta.BOONS[id]; const have=(G.meta.data.runBoons||[]).indexOf(id)>=0;
          const card=document.createElement('div'); card.className='wcard bcard'+(have?' cur':'');
          card.innerHTML='<div class="wname" style="color:'+u.color+'">'+u.name+'</div>'+
            '<div class="bdesc">'+u.desc+'</div>'+
            '<div class="wrow"><span class="wtier">祝福</span><span class="wprice">'+u.price+' ◆</span></div>';
          const btn=document.createElement('button'); btn.className='btn sm bbuy';
          btn.textContent=have?'已携带':(count>=2?'已满':'选 择');
          btn.disabled=have||count>=2;
          if(!have&&count<2){ btn.onclick=()=>{ const r=G.meta.buyRunBoon(id); if(r.ok){ this.hudRefresh(); G.audio.sfx('ui',{v:.4}); G.ui.toast('已携带祝福「'+u.name+'」。'); } else G.audio.sfx('error',{v:.5}); this.renderPanel(); }; }
          card.appendChild(btn); body.appendChild(card);
        }
      } else { // pact
        const sec=document.createElement('div'); sec.className='bsec'; sec.textContent='— 血契：高风险高回报 · 与祝福共享 2 个携带位 —'; body.appendChild(sec);
        for(const id of Object.keys(G.meta.PACT)){
          const u=G.meta.PACT[id]; const have=(G.meta.data.runBoons||[]).indexOf(id)>=0;
          const card=document.createElement('div'); card.className='wcard bcard'+(have?' cur':'');
          card.innerHTML='<div class="wname" style="color:'+u.color+'">'+u.name+'</div>'+
            '<div class="bdesc">'+u.desc+'</div>'+
            '<div class="wrow"><span class="wtier">血契</span><span class="wprice">'+u.price+' ◆</span></div>';
          const btn=document.createElement('button'); btn.className='btn sm bbuy';
          btn.textContent=have?'已携带':(count>=2?'已满':'签 契');
          btn.disabled=have||count>=2;
          if(!have&&count<2){ btn.onclick=()=>{ const r=G.meta.buyRunBoon(id); if(r.ok){ this.hudRefresh(); G.audio.sfx('ui',{v:.4}); G.ui.toast('血契已立：「'+u.name+'」。'); } else G.audio.sfx('error',{v:.5}); this.renderPanel(); }; }
          card.appendChild(btn); body.appendChild(card);
        }
      }
      return;
    }
    if(kind==='gunsmith'){
      title.textContent='⚒ 枪械工坊 · 永久解锁武器';
      const W=G.weapons;
      const ids=Object.keys(W.defs).filter(id=>!G.meta.unlocked(id))
        .sort((a,b)=>('ABCD'.indexOf(W.defs[a].tier)-'ABCD'.indexOf(W.defs[b].tier)) || (G.meta.weaponPrice(a)-G.meta.weaponPrice(b)));
      if(!ids.length){ body.innerHTML='<div class="bempty">军火库已全部解锁——老铆对你竖起了大拇指。</div>'; return; }
      for(const id of ids){
        const def=W.defs[id], price=G.meta.weaponPrice(id), tc=TIER_COLOR[def.tier];
        const card=document.createElement('div');
        card.className='wcard t'+def.tier+' bcard';
        card.innerHTML='<div class="wname">'+def.name+'</div>'+
          '<div class="bdesc">'+def.blurb+'</div>'+
          '<div class="wrow"><span class="wtier" style="color:'+tc+'">'+def.tier+' 阶</span>'+
          '<span class="wprice">'+price+' ◆</span></div>';
        const btn=document.createElement('button');
        btn.className='btn sm bbuy';
        if(G.meta.data.shards>=price){ btn.textContent='解 锁'; btn.classList.add('ok'); }
        else { btn.textContent='碎片不足'; btn.classList.add('no'); }
        btn.onclick=()=>{
          const r=G.meta.buyWeapon(id);
          if(r.ok){ this._justSpent=true; this._shardsSpentMark=G.meta.data.shards;
            G.audio.sfx('chest',{v:.6}); this.hudRefresh(); this.rebuildScene();
            G.ui.toast('「老铆：好枪配好人——『'+def.name+'』已进你的军火库。」');
          } else { G.audio.sfx('error',{v:.5}); G.ui.toast('「老铆：碎片不够，还差 '+(r.price-G.meta.data.shards)+' ◆。」'); }
          this.renderPanel();
        };
        card.appendChild(btn);
        body.appendChild(card);
      }
    } else if(kind==='engineer'){
      title.textContent='🔧 工程改装铺 · 被动解锁 / 基地升级';
      const sec1=document.createElement('div');
      sec1.className='bsec'; sec1.textContent='— 进阶被动永久解锁（解锁后进入所有掉落池）—';
      body.appendChild(sec1);
      const items=G.meta.GATED_ITEMS.filter(id=>!G.meta.itemUnlocked(id));
      if(!items.length){ const d=document.createElement('div'); d.className='bempty'; d.textContent='进阶被动已全部解锁。'; body.appendChild(d); }
      for(const id of items){
        const it=G.items.passives[id];
        const card=document.createElement('div');
        card.className='wcard bcard';
        card.innerHTML='<div class="wname" style="color:'+it.color+'">'+it.name+'</div>'+
          '<div class="bdesc">'+it.desc+'</div>'+
          '<div class="wrow"><span class="wtier">被动</span><span class="wprice">'+G.meta.ITEM_PRICE+' ◆</span></div>';
        const btn=document.createElement('button');
        btn.className='btn sm bbuy';
        if(G.meta.data.shards>=G.meta.ITEM_PRICE){ btn.textContent='解 锁'; btn.classList.add('ok'); }
        else { btn.textContent='碎片不足'; btn.classList.add('no'); }
        btn.onclick=()=>{
          const r=G.meta.buyItem(id);
          if(r.ok){ this._justSpent=true; this._shardsSpentMark=G.meta.data.shards;
            G.audio.sfx('itemGet',{v:.6}); this.hudRefresh();
            G.ui.toast('「扳手姐：『'+it.name+'』装好了——底下见真章。」');
          } else { G.audio.sfx('error',{v:.5}); G.ui.toast('「扳手姐：碎片不够。」'); }
          this.renderPanel();
        };
        card.appendChild(btn);
        body.appendChild(card);
      }
      const sec2=document.createElement('div');
      sec2.className='bsec'; sec2.style.marginTop='10px';
      sec2.textContent='— 基地永久升级（立即生效，下一局起真实生效）—';
      body.appendChild(sec2);
      for(const key of Object.keys(G.meta.UPGRADES)){
        const u=G.meta.UPGRADES[key], lv=G.meta.up(key), price=G.meta.upgradePrice(key);
        const card=document.createElement('div');
        card.className='wcard bcard';
        card.innerHTML='<div class="wname">'+u.name+'　<span class="blv">Lv '+lv+(lv>=u.maxLv?'（满级）':' / '+u.maxLv)+'</span></div>'+
          '<div class="bdesc">'+u.desc+'</div>'+
          '<div class="wrow"><span class="wtier">'+(lv>=u.maxLv?'已完成':'升级')+'</span>'+
          (price!=null?'<span class="wprice">'+price+' ◆</span>':'')+'</div>';
        if(price!=null){
          const btn=document.createElement('button');
          btn.className='btn sm bbuy';
          if(G.meta.data.shards>=price){ btn.textContent='升 级'; btn.classList.add('ok'); }
          else { btn.textContent='碎片不足'; btn.classList.add('no'); }
          btn.onclick=()=>{
            const r=G.meta.buyUpgrade(key);
            if(r.ok){ this._justSpent=true; this._shardsSpentMark=G.meta.data.shards;
              G.audio.sfx('buy',{v:.6}); this.hudRefresh(); this.rebuildScene();
              G.ui.toast('「扳手姐：'+u.name+' 升到 Lv'+G.meta.up(key)+' 了。」');
            } else { G.audio.sfx('error',{v:.5}); G.ui.toast('「扳手姐：碎片不够。」'); }
            this.renderPanel();
          };
          card.appendChild(btn);
        }
        body.appendChild(card);
      }
      const sec3=document.createElement('div');
      sec3.className='bsec'; sec3.style.marginTop='10px';
      sec3.textContent='— 深渊共鸣（永久加成 · 可反复投入，价格递增）—';
      body.appendChild(sec3);
      for(const key of Object.keys(G.meta.RESONANCE)){
        const u=G.meta.RESONANCE[key], lv=G.meta.resonanceLv(key), price=G.meta.resonancePrice(key);
        const card=document.createElement('div');
        card.className='wcard bcard';
        card.innerHTML='<div class="wname">'+u.name+'　<span class="blv">Lv '+lv+(lv>=u.maxLv?'（满级）':' / '+u.maxLv)+'</span></div>'+
          '<div class="bdesc">'+u.desc+'</div>'+
          '<div class="wrow"><span class="wtier">'+(lv>=u.maxLv?'已完成':'共鸣')+'</span>'+
          (price!=null?'<span class="wprice">'+price+' ◆</span>':'')+'</div>';
        if(price!=null){
          const btn=document.createElement('button');
          btn.className='btn sm bbuy';
          if(G.meta.data.shards>=price){ btn.textContent='共 鸣'; btn.classList.add('ok'); }
          else { btn.textContent='碎片不足'; btn.classList.add('no'); }
          btn.onclick=()=>{
            const r=G.meta.buyResonance(key);
            if(r.ok){ this._justSpent=true; this._shardsSpentMark=G.meta.data.shards;
              G.audio.sfx('buy',{v:.6}); this.hudRefresh();
              G.ui.toast('「扳手姐：'+u.name+' 共鸣到 Lv'+G.meta.resonanceLv(key)+'。」');
            } else { G.audio.sfx('error',{v:.5}); G.ui.toast('「扳手姐：碎片不够。」'); }
            this.renderPanel();
          };
          card.appendChild(btn);
        }
        body.appendChild(card);
      }
    } else if(kind==='weapons'){
      title.textContent='🔫 武器架 · 挑选试用（已解锁）';
      const W=G.weapons;
      const ids=Object.keys(W.defs).filter(id=>G.meta.unlocked(id))
        .sort((a,b)=>('ABCD'.indexOf(W.defs[a].tier)-'ABCD'.indexOf(W.defs[b].tier)) || (W.defs[a].name<W.defs[b].name?-1:1));
      const p=G.player;
      const curId=p && p.weapons[p.curW] ? p.weapons[p.curW].id : null;
      if(!ids.length){ body.innerHTML='<div class="bempty">还没有解锁任何武器——去找枪械师老铆买一把。</div>'; return; }
      const sec=document.createElement('div'); sec.className='bsec';
      sec.textContent='— 已解锁 '+ids.length+' 把 · 点「试用」装备到手上（不花碎片，任意换）—';
      body.appendChild(sec);
      for(const id of ids){
        const def=W.defs[id], tc=TIER_COLOR[def.tier];
        const cur=curId===id;
        const card=document.createElement('div');
        card.className='wcard t'+def.tier+' bcard'+(cur?' cur':'');
        card.innerHTML='<div class="wname">'+def.name+(cur?'　<span class="blv">当前装备</span>':'')+'</div>'+
          '<div class="bdesc">'+def.blurb+'</div>'+
          '<div class="wrow"><span class="wtier" style="color:'+tc+'">'+def.tier+' 阶</span>'+
          '<span class="wtier">'+def.dmg+' 伤 · '+def.rate.toFixed(1)+'/s · '+def.mag+' 发</span></div>';
        const btn=document.createElement('button');
        btn.className='btn sm bbuy';
        btn.textContent=cur?'使 用 中':'试 用';
        btn.classList.add(cur?'no':'ok');
        btn.onclick=()=>{ if(cur || !p) return;
          p.weapons[p.curW]=W.mktWeapon(id);   // 直接替换当前武器，不生成掉落（基地试用专用）
          G.ui.weapon(p); G.audio.sfx('reloadEnd',{v:.5});
          this.hudRefresh(); this.renderPanel();
          G.ui.toast('武器架递来『'+def.name+'』——去靶场试试手感。');
        };
        card.appendChild(btn);
        body.appendChild(card);
      }
    } else { // archivist
      title.textContent='📖 深渊档案 · 图鉴';
      const st=G.meta.data.stats;
      const sec=(t)=>{ const d=document.createElement('div'); d.className='bsec'; d.textContent=t; body.appendChild(d); };
      const row=(l,r,unk)=>{ const d=document.createElement('div'); d.className='brow';
        d.innerHTML='<span>'+(unk?'？？？':l)+'</span><b>'+(unk?'尚未遭遇':r)+'</b>'; body.appendChild(d); };
      sec('— Boss 档案 —');
      for(const k of Object.keys(BOSS_INFO)){
        const b=st.boss[k];
        row(BOSS_INFO[k].name+' · '+BOSS_INFO[k].desc,
          '讨伐 ×'+(b?b.count:0)+(b&&b.bestT?('　最佳 '+this.fmtT(b.bestT)):''), !b);
      }
      sec('— 武器档案（使用 / 直击击杀）—');
      for(const id of Object.keys(G.weapons.defs)){
        const def=G.weapons.defs[id], used=st.wuse[id]||0, kill=st.wkill[id]||0;
        const seen=used>0||G.meta.unlocked(id);
        row(def.name+'（'+def.tier+' 阶）', seen?('使用 ×'+used+'　击杀 ×'+kill):'', !seen);
      }
      sec('— 敌人档案（累计击杀）—');
      const EN=G.enemies.defs;
      for(const id of Object.keys(EN)){
        const n=st.ekills[id]||0;
        row((ENEMY_NAMES[id]||id)+'（hp '+EN[id].hp+'）', '击杀 ×'+n, n<=0);
      }
      sec('— 被动道具档案（拾取 / 收录）—');
      const TIER_COL={C:'#c8c8d0',B:'#50c8ff',A:'#ffb03a'};
      const tierOf=(id)=>{ const P=G.items.pools; for(const t of ['C','B','A']) if(P[t] && P[t].includes(id)) return t; return 'C'; };
      const seenN=Object.keys(st.passives||{}).length, totalN=Object.keys(G.items.passives).length;
      row('被动收录', seenN+' / '+totalN);
      for(const id of Object.keys(G.items.passives)){
        const it=G.items.passives[id], got=(st.passives&&st.passives[id])||0;
        const t=tierOf(id);
        const d=document.createElement('div'); d.className='brow';
        d.innerHTML='<span><b style="color:'+TIER_COL[t]+'">['+t+']</b> '+it.name+' — '+it.desc+'</span><b>'+(got?('持有 ×'+got):'未收录')+'</b>';
        body.appendChild(d);
      }
      const foot=document.createElement('div'); foot.className='bempty';
      foot.textContent='累计击杀 '+G.meta.data.kills+' · 阵亡 '+st.deaths+' 次 · 通关 '+st.wins+' 次 · 出击 '+st.runs+' 次';
      body.appendChild(foot);
    }
  },
  /* 解锁后重建场景：展示架/战利品/标签立即成长（任务：不要只存在于菜单里） */
  rebuildScene(){
    const keep=G.player;
    this.build();
    if(keep && !G.scene.children.includes(keep.mesh)) G.scene.add(keep.mesh);
  },

  /* ---------- 武器架试用：循环已解锁武器 ---------- */
  cycleWeapon(){
    const p=G.player; if(!p) return;
    const W=G.weapons;
    const ids=Object.keys(W.defs).filter(id=>G.meta.unlocked(id))
      .sort((a,b)=>('ABCD'.indexOf(W.defs[a].tier)-'ABCD'.indexOf(W.defs[b].tier)));
    if(!ids.length) return;
    const cur=p.weapons[p.curW];
    let i=cur? ids.indexOf(cur.id):-1;
    const next=ids[(i+1)%ids.length];
    p.giveWeapon(W.mktWeapon(next));
    G.audio.sfx('reloadEnd',{v:.5});
    G.ui.toast('武器架递来一把『'+W.defs[next].name+'』——去靶子试试手感。');
    this.hudRefresh();
  },

  /* ---------- 每帧：NPC 工作动画 / 假人重置 / 炉火尘埃 ---------- */
  update(dt){
    const p=G.player;
    // 基地 HUD 武器弹药实时刷新（射击 / 换枪后 0.2s 内更新弹药数）
    this._hudT=(this._hudT||0)-dt;
    if(this._hudT<=0){ this._hudT=.2; this.hudRefresh(); }
    // ── 世界标签投影到屏幕（HTML 高分辨率层：CSS px 字号不随 320p 世界缩糊）──
    for(const t of (this._tags||[])){
      const v=new THREE.Vector3(t.x,t.y,t.z).project(G.camera);
      if(v.z<1){
        t.el.style.display='block';
        t.el.style.left=((v.x*.5+.5)*window.innerWidth)+'px';
        t.el.style.top=((-v.y*.5+.5)*window.innerHeight)+'px';
      } else t.el.style.display='none';
    }
    // ── 中央核心：符文环旋转 + 能量柱呼吸 + 地面圈脉动 + 顶喷粒子（活的核心，非摆件）──
    if(this._core){
      this._core.ring.rotation.z+=dt*.5;
      this._core.ring2.rotation.z-=dt*.32;
      const s=1+Math.sin(performance.now()*.002)*.06;
      this._core.group.children[0].scale.set(s,1,s);
      const pc=this._core.pillarCore;
      if(pc) pc.scale.set(1+Math.sin(performance.now()*.004)*.12, 1+Math.sin(performance.now()*.003)*.18, 1+Math.sin(performance.now()*.004)*.12);
      const gr=this._core.groundRing, gr2=this._core.groundRing2;
      if(gr) gr.scale.set(1+Math.sin(performance.now()*.0022)*.07, 1+Math.sin(performance.now()*.0022)*.07, 1);
      if(gr2) gr2.scale.set(1+Math.sin(performance.now()*.0017+1)*.05, 1+Math.sin(performance.now()*.0017+1)*.05, 1);
      this._coreT=(this._coreT||0)-dt;
      if(this._coreT<=0){ this._coreT=.08;
        G.fx.particle(16+ (Math.random()-.5)*.5, .8, 9.5+(Math.random()-.5)*.5,
          {vx:(Math.random()-.5)*.5, vy:1.3+Math.random()*1.1, vz:(Math.random()-.5)*.5, life:.55, color:(Math.random()<.5?0x8a5aff:0x50e0ff), s0:.12, kind:'a'});
      }
    }
    // ── NPC：看向玩家 + Idle 工作动画 ──
    for(const pr of (this.npcs||[])){
      pr.t+=dt;
      const r=pr.refs, dToP=p?G.dist(pr.x,pr.z,p.x,p.z):99;
      const want = dToP<3.5 ? (p?G.angTo(pr.x,pr.z,p.x,p.z):0) : r.workFace;
      pr.face=G.angLerp(pr.face||0, want, Math.min(1,5*dt));
      pr.mesh.rotation.y=-(pr.face||0);
      pr.mesh.position.y=Math.sin(pr.t*2)*.025;
      if(r.arm){
        if(pr.key==='gunsmith') r.arm.rotation.x=Math.sin(pr.t*6)*.35;               // 擦枪
        else if(pr.key==='engineer') r.arm.rotation.x=.4+Math.sin(pr.t*4)*.5;        // 修理
        else if(pr.key==='archivist') r.arm.rotation.z=Math.sin(pr.t*1.6)*.12;       // 翻书
        else r.arm.rotation.x=-.5+Math.max(0,Math.sin(pr.t*.8))*.9;                  // 教官抬手指靶
      }
      // 枪械师偶尔俯身敲工作台；教官偶尔挥动另一只手臂
      if(pr.key==='gunsmith' && r.body){ r.body.rotation.x=Math.max(0,Math.sin(pr.t*.45))*.14; }
      if(pr.key==='instructor' && r.hand2){ r.hand2.rotation.x=-1.2+Math.max(0,Math.sin(pr.t*1.1+2))*.9; }
    }
    // 训练靶重生
    for(const pr of G.props){
      if(pr.type==='dummy' && pr.respawnT>0){
        pr.respawnT-=dt;
        if(pr.respawnT<=0){ pr.mesh.visible=true; G.fx.poof(pr.x,.5,pr.z,0xd8cba8); }
      }
    }
    // 炉火余烬（休息区）+ 空气尘埃（低频，复用 fx 粒子池）
    this._emberT-=dt;
    if(this._emberT<=0){
      this._emberT=.22;
      G.fx.particle(15,.7,14.8,{vx:(Math.random()-.5)*.4,vy:1.1,vz:(Math.random()-.5)*.4,life:.5,color:0xffb050,s0:.1,kind:'a'});
    }
    this._dustT-=dt;
    if(this._dustT<=0){
      this._dustT=.5;
      G.fx.particle(p?p.x+(Math.random()-.5)*8:11, .3+Math.random()*1.4, p?p.z+(Math.random()-.5)*8:7.5,
        {vx:(Math.random()-.5)*.2,vy:.1,vz:(Math.random()-.5)*.2,life:1.2,color:0xd8c8a8,s0:.05,kind:'s'});
    }
    // 工程机械蒸汽（低频白汽）
    this._steamT-=dt;
    if(this._steamT<=0){
      this._steamT=.9;
      G.fx.particle(21,1.2,5.8,{vx:(Math.random()-.3)*.3,vy:.5,vz:(Math.random()-.3)*.3,life:.9,color:0xe8e8f0,s0:.14,kind:'s'});
    }
    // 灯具低频闪烁（一盏随机灯，短暂、低频、不遮弹幕）
    this._flickT-=dt;
    if(this._flickT<=0){
      this._flickT=2.2+Math.random()*3;
      const t=(this._torchList||[]);
      if(t.length){ const f=t[(Math.random()*t.length)|0].userData.flame; if(f) f.scale.set(.25,.28,1); }
    }
    if(this._flickRestore) this._flickRestore-=dt;
    else if(this._torchList){ for(const t of this._torchList){ const f=t.userData.flame; if(f&&f.scale.x<.5) f.scale.set(.6,.66,1); } this._flickRestore=.5; }
    // 开场引导队列
    for(let i=this._introQ.length-1;i>=0;i--){
      this._introQ[i].t-=dt;
      if(this._introQ[i].t<=0){ G.ui.toast(this._introQ[i].msg); this._introQ.splice(i,1); }
    }
  },
};
let _lampMat=null;
G.base = B;
})();
