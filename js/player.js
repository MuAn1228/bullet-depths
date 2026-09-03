/* 弹膛深渊 - 玩家：移动/翻滚/射击/装填/交互/拾取/构筑 */
'use strict';
(function(){
const GB = G.GeoBuilder;
const inpPressedOrBuffered = code => G.input.pressed[code] || G.input.buffered(code);

let _torsoA=null,_torsoM=null,_torsoE=null,_torsoX=null, _headA=null,_headM=null,_headX=null,_headE=null,
    _legA=null,_legM=null,_legX=null, _armRA=null,_armRM=null,_armRX=null,
    _capeA=null,_cape1=null,_cape2=null,_cape3=null, _gunGeo=null, _orbGeo=null,
    _camLeather=null,_camMetal=null,_camLensA=null,_camLensB=null,_camShutter=null,_camGear=null,_camKnob=null,
    _gmbBody=null,_gmbBarrel=null,_gmbDisc=null,_gmbWheelFace=null,_gmbDrum=null,_gmbCardG=null,_gmbLeverG=null,_gmbDieG=null,
    _camBarrel=null,_camRing=null,_camVBarrel=null,_camAperture=null;

/* 顶点色圆柱（相机专用：CylinderGeometry 烘焙颜色属性，走顶点色材质管线） */
function vcyl(r,len,color,axis){
  const g=new THREE.CylinderGeometry(r,r,len,axis==='z'?10:12);
  if(axis==='x') g.rotateZ(-Math.PI/2);
  else if(axis==='z') g.rotateX(Math.PI/2);
  const c=new THREE.Color(color), n=g.attributes.position.count;
  const arr=new Float32Array(n*3);
  for(let i=0;i<n;i++){ arr[i*3]=c.r; arr[i*3+1]=c.g; arr[i*3+2]=c.b; }
  g.setAttribute('color', new THREE.Float32BufferAttribute(arr,3));
  return g;
}

/* ---------- 主角「VOID HUNTER · 虚空猎手」造型 ----------
   ⚠️ 模型 forward = +X（模型正前方）：根节点 rotation.y = -face 即可让面部/枪口
   严格对齐瞄准方向，无任何魔法角度（H23 红线，勿动）。
   视觉语言：深黑哑光装甲 + 半金属机械件 + 高反射金属边缘 + 蓝紫发光能量 + 深灰布料披风。
   金属/粗糙度由玩家专用 MeshStandardMaterial 分层（pmats），顶点色控制明暗细节。 */
const PC = { armor:0x181b22, armor2:0x21252f, armor3:0x2a2f3b,
             mech:0x3c4556, mech2:0x2c3240, edge:0x8a94a6,
             energy:0x2c3350, energyHi:0x5a7cff, violet:0x8a5cff,
             cloak:0x39435c, cloak2:0x2c3548 };

/* 玩家专用 PBR 材质层（模块级单例；⚠️ 绝不是共享材质，emissive/opacity 动画只影响玩家）
   受击闪白 traverse 换装机制兼容任意材质；死亡消散淡出会在 createPlayer 里复位。 */
let _pm=null;
function pmats(){
  if(_pm) return _pm;
  const std=o=>new THREE.MeshStandardMaterial(Object.assign({vertexColors:true},o));
  _pm={
    armor: std({roughness:.85, metalness:.2}),                                   // 哑光深黑装甲
    mech:  std({roughness:.42, metalness:.72}),                                  // 半金属机械件
    edge:  std({roughness:.26, metalness:.92}),                                  // 高反射金属边缘（少量）
    cloak: std({roughness:.97, metalness:.02, emissive:new THREE.Color(0x141a30)}), // 布料披风（微弱蓝紫自照明：暗处保持"深灰蓝布"色读，不与装甲融为一体）
    energy:std({roughness:.5, metalness:.08, emissive:new THREE.Color(0x2c40e8),
                emissiveIntensity:.85}),                                        // 蓝紫发光能量件（呼吸脉动；强度压低避免 ACES 过曝发白）
    lens:  std({roughness:.28, metalness:.15, emissive:new THREE.Color(0xffe8b8),
                emissiveIntensity:.25}),                                        // 拍立得镜头玻璃（蓄力聚光 → 快门释放时爆亮）
  };
  return _pm;
}
function resetPmats(){ // 新一局复用材质前复位死亡淡出状态
  if(!_pm) return;
  for(const k in _pm){ _pm[k].transparent=false; _pm[k].opacity=1; _pm[k].needsUpdate=false; }
}

function initGeos(){
  if(_torsoA) return;
  let b;
  /* ===== 躯干：armor 层 ===== */
  b=new GB();
  b.box(.01,.16,0,.32,.32,.40,PC.armor);           // 胸甲主体（修长收窄）
  b.box(.13,.27,0,.18,.16,.34,PC.armor2);          // 上胸斜甲
  b.box(.02,.05,0,.24,.1,.30,PC.armor3);           // 锁骨甲片
  b.box(-.04,-.06,0,.22,.15,.28,PC.armor2);        // 腹甲（收窄 → 上宽下窄楔形剪影）
  b.box(-.16,.15,0,.16,.26,.28,PC.armor);          // 背部背包壳
  b.box(-.12,-.26,0,.09,.11,.28,PC.armor2);        // 后腰裙甲
  _torsoA=b.build();
  /* ===== 躯干：mech 层 ===== */
  b=new GB();
  b.box(.15,.36,0,.09,.06,.18,PC.mech);            // 领口
  b.box(.16,.11,0,.08,.14,.14,PC.mech2);           // 反应堆凹槽框
  b.box(-.13,-.17,0,.11,.09,.34,PC.mech);          // 腰带（收窄）
  b.box(-.14,.15,0,.1,.2,.1,PC.mech2);             // 背包挂架
  b.box(-.02,.32,-.29,.22,.12,.2,PC.mech,.28);     // 肩甲 R（绕 Y 外旋 → V 形斜切，俯视外张）
  b.box(-.02,.32,.29,.22,.12,.2,PC.mech,-.28);     // 肩甲 L
  b.box(-.2,.36,.07,.02,.16,.02,PC.mech,0,0,.3);   // 天线（暗金属，后倾）
  _torsoM=b.build();
  /* ===== 躯干：edge 层（少量金属高光，塑造轮廓） ===== */
  b=new GB();
  b.box(.17,.32,-.29,.03,.14,.22,PC.edge,.28);     // 肩甲前缘 R（随肩甲外旋）
  b.box(.17,.32,.29,.03,.14,.22,PC.edge,-.28);     // 肩甲前缘 L
  b.box(.17,.36,0,.01,.05,.2,PC.edge);             // 胸口中线细脊
  _torsoX=b.build();
  /* ===== 躯干：energy 层（蓝紫发光） ===== */
  b=new GB();
  b.box(.2,.11,0,.04,.14,.05,PC.energy);           // 胸口能量核心（竖条，最亮焦点）
  b.box(.2,.11,.07,.02,.09,.03,PC.energy);         // 核心侧缝 R
  b.box(.2,.11,-.07,.02,.09,.03,PC.energy);        // 核心侧缝 L
  b.box(-.25,.13,.1,.05,.2,.05,PC.energy);         // 背挂能量罐 L（发光）
  b.box(-.25,.13,-.1,.05,.2,.05,PC.energy);        // 背挂能量罐 R
  _torsoE=b.build();

  /* ===== 头部：armor 层（箭头形盔体：俯视菱形，前尖指向 +X——顶视角一眼可辨朝向） ===== */
  b=new GB();
  b.box(-.04,.1,0,.24,.26,.26,PC.armor);           // 盔体后段
  b.box(.12,.1,0,.17,.18,.17,PC.armor2,Math.PI/4); // 前段菱形楔（绕 Y 45°，前顶点伸至 +X）
  b.box(.02,.17,0,.24,.05,.2,PC.armor);            // 面檐盖板（压住楔顶形成半覆盖）
  _headA=b.build();
  /* ===== 头部：mech 层 ===== */
  b=new GB();
  b.box(-.06,.26,0,.24,.05,.09,PC.mech);           // 顶脊
  b.box(.02,.02,.14,.09,.11,.05,PC.mech2);         // 颊甲 L
  b.box(.02,.02,-.14,.09,.11,.05,PC.mech2);        // 颊甲 R
  b.box(.09,-.05,0,.07,.06,.12,PC.mech2);          // 下颚护
  b.box(-.02,.1,.145,.04,.1,.04,PC.mech);          // 耳导流片 L
  b.box(-.02,.1,-.145,.04,.1,.04,PC.mech);         // 耳导流片 R
  b.box(-.14,.08,0,.05,.18,.16,PC.armor2);         // 脑后甲
  b.box(-.05,.29,-.1,.02,.1,.02,PC.mech,0,0,.35);  // 短天线
  _headM=b.build();
  /* ===== 头部：edge 层 ===== */
  b=new GB();
  b.box(.21,.1,0,.02,.05,.13,PC.edge);             // 楔尖前缘刃
  _headX=b.build();
  /* ===== 头部：energy 层（目镜缝在前楔上，俯视可见） ===== */
  b=new GB();
  b.box(.14,.05,0,.06,.05,.17,PC.energy);          // 目镜横缝
  b.box(-.07,.1,.13,.02,.04,.02,PC.energy);        // 颞部能量点 L
  b.box(-.07,.1,-.13,.02,.04,.02,PC.energy);       // 颞部能量点 R
  _headE=b.build();

  /* ===== 腿（修长型，轴枢=髋部，左右共用） ===== */
  b=new GB();
  b.box(0,-.09,0,.12,.2,.13,PC.armor);             // 大腿
  b.box(-.02,-.26,0,.1,.13,.11,PC.armor2);         // 小腿
  b.box(0,-.35,0,.13,.08,.14,PC.armor3);           // 靴
  _legA=b.build();
  b=new GB();
  b.box(.05,-.16,0,.06,.08,.1,PC.mech);            // 膝甲
  b.box(.1,-.36,0,.06,.05,.12,PC.mech2);           // 靴尖
  _legM=b.build();
  b=new GB();
  b.box(.065,-.22,0,.015,.2,.06,PC.edge);          // 胫前刃（金属高光）
  _legX=b.build();

  /* ===== 右臂（持枪臂：双手前伸姿态——顶视角下"端枪"剪影是射击游戏角色第一辨识特征） ===== */
  b=new GB();
  b.box(.08,0,0,.15,.13,.13,PC.armor);             // 上臂（沿 +X 前伸）
  b.box(.24,-.01,0,.18,.09,.09,PC.armor2);         // 前臂前伸
  _armRA=b.build();
  b=new GB();
  b.box(.17,0,0,.06,.09,.1,PC.mech);               // 肘
  b.box(.36,-.01,0,.06,.08,.09,PC.mech2);          // 手（握枪位）
  _armRM=b.build();
  b=new GB();
  b.box(.24,.05,0,.17,.02,.02,PC.edge);            // 前臂外缘刃
  b.box(.24,-.06,0,.16,.015,.015,PC.energy);       // 前臂能量缝（发光）
  _armRX=b.build();

  /* ===== 披风（短款动态战斗披风，4 级链式轴枢：整体摆 + 三段递延波动） =====
     ⚠️ 颜色必须与深黑装甲拉开一档（深灰蓝调），否则与躯干融为一体看不见 */
  b=new GB();
  b.box(-.09,.32,0,.16,.09,.22,PC.cloak);          // 颈结
  b.box(-.09,.32,0,.09,.05,.12,PC.mech2);          // 颈扣（机械搭扣）
  _capeA=b.build();
  b=new GB();  // 段几何的轴枢在段顶端（y=0），rotation.z 绕轴枢摆 → 链式无断口
  // ⚠️ 上段 x 必须超过背包(-.24)到 -.265，否则从背面看披风被背包完全遮挡
  b.box(-.2,-.16,0,.13,.36,.36,PC.cloak);          // 披风上段（世界 x [-.135,-.265]，两侧略宽于背包形成包裹感）
  _cape1=b.build();
  b=new GB();
  b.box(-.12,-.11,0,.11,.25,.3,PC.cloak2);         // 中段（递进收窄）
  _cape2=b.build();
  b=new GB();
  b.box(-.06,-.09,0,.09,.19,.26,PC.cloak);         // 下段（短款到腰）
  b.box(-.04,-.17,0,.015,.04,.24,PC.edge);         // 下摆金属缘条（识别度）
  _cape3=b.build();

  /* ===== 武器（右手中，枪管指向 +X；updateGunVisual 按武器类型拉伸枪身） =====
     涂装直接烘焙进顶点色（材质固定 pmats().mech 顶点色管线，updateGunVisual 的
     材质重置不会改变外观）：橙色枪身 + 紫罗兰枪管/弹匣 + 金色枪口/瞄具 + 青色能量条，
     与角色彩虹配色统一，不再是一根黑棍。 */
  b=new GB();
  b.box(0,0,0,.34,.09,.09,0xff8830);               // 机匣（橙）
  b.box(.26,.005,0,.22,.045,.045,0xc050ff);        // 枪管（紫罗兰）
  b.box(.39,0,0,.06,.075,.075,0xffd23e);           // 枪口制退器（金色亮件）
  b.box(-.09,-.11,0,.08,.13,.08,0xb05820);         // 握把（深橙棕）
  b.box(-.02,-.12,0,.07,.11,.05,0xc050ff);         // 弹匣（紫罗兰）
  b.box(0,.075,0,.15,.035,.035,0xffd23e);          // 瞄具（金）
  b.box(.05,.045,.05,.18,.018,.012,0x50e8ff);      // 侧面能量条（青）
  b.box(.05,.045,-.05,.18,.018,.012,0x50e8ff);     // 侧面能量条
  _gunGeo=b.build();

  /* ===== 悬浮能量碎片（八面体，绕身公转） ===== */
  _orbGeo=new THREE.OctahedronGeometry(.05,0);

  /* ===== 武器「薛定谔的拍立得」：复古老式双反相机（枪管指向 +X = 巨大镜头即枪口） =====
     结构语言：深色皮革机身 + 黄铜面板/饰条 + 黑色金属前板 + 双镜头（下大上小） +
     快门叶片盘 + 侧面发条曲柄 + 顶部装饰齿轮 + 侧面相纸仓。武器化相机，不是相机贴枪管。 */
  const leather=0x33261c, leather2=0x241b14, brass=0xb08a3e, brass2=0x8a6a2e, black=0x1c1a18;
  b=new GB(); // 皮革机身（armor 材质：高粗糙度，皮革质感）
  b.box(-.03,0,0,.30,.28,.24,leather);          // 主机身
  b.box(-.03,.13,0,.26,.04,.22,leather2);       // 顶部皮革带
  b.box(-.11,.19,0,.14,.09,.17,leather2);       // 取景器后罩
  b.box(-.05,-.11,.135,.15,.10,.05,leather2);   // 侧面相纸仓
  b.box(-.15,-.17,0,.09,.13,.10,leather2);      // 握持手柄
  _camLeather=b.build();
  b=new GB(); // 黄铜/黑色金属件（mech 材质：半金属黄铜感）
  b.box(.14,0,0,.05,.29,.25,black);             // 前板（黑色金属）
  b.box(-.03,.155,0,.28,.03,.235,brass);        // 顶部黄铜面板
  b.box(-.03,-.145,0,.26,.03,.23,brass2);       // 底部黄铜板
  b.box(.13,0,.125,.18,.29,.015,brass2);        // 侧面黄铜饰条
  b.box(.13,0,-.125,.18,.29,.015,brass2);
  _camMetal=b.build();
  _camLensA=vcyl(.10,.02,0xfff0c8,'x');         // 主镜头玻璃（emissive，聚光时点亮）
  _camLensB=vcyl(.04,.015,0xfff0c8,'x');        // 取景镜头玻璃
  _camShutter=vcyl(.108,.014,0x0e0d10,'x');     // 快门叶片盘（蓄力时合拢）
  _camGear=vcyl(.05,.03,brass,'z');             // 发条曲柄齿轮
  _camKnob=vcyl(.018,.05,brass2,'z');           // 曲柄旋钮
  _camBarrel=vcyl(.125,.17,black,'x');          // 主镜头筒
  _camRing=vcyl(.135,.035,brass,'x');           // 镜头前黄铜环
  _camVBarrel=vcyl(.055,.09,black,'x');         // 取景镜头筒
  _camAperture=vcyl(.055,.026,0x241e16,'x');    // 主镜头内暗圈

  /* ===== 武器「赌徒的灾难」：赌场左轮（forward=+X）
     黑色金属 + 暗金黄铜 + 扑克红 + 象牙白；嵌入轮盘（红黑扇区）/ 扑克牌仓 / 拨杆 / 骰子，
     转轮与牌仓由 animate 驱动（待机缓转、开火快转）。涂装全烘焙顶点色。 */
  const gblack=0x181418, gbrass=0xb08a3e, gbrass2=0x8a6a2e, gred=0x8a1e28, givory=0xf2ead6;
  b=new GB(); // 机身 + 暗金饰框 + 象牙握把
  b.box(.02,0,0,.30,.20,.20,gblack);            // 主机身（黑金属）
  b.box(.30,-.02,0,.06,.11,.11,gbrass);         // 枪口黄铜环座
  b.box(-.10,-.16,0,.09,.14,.09,givory);        // 象牙握把
  b.box(-.02,.12,0,.2,.03,.14,gbrass2);         // 顶部黄铜导轨
  b.box(.02,-.08,.11,.18,.03,.02,gbrass2);      // 侧面饰条
  b.box(.02,-.08,-.11,.18,.03,.02,gbrass2);
  b.box(.10,.145,0,.05,.05,.05,0xc87aff);       // 顶部透明能量件（Joker 紫）
  b.box(.24,-.08,.06,.1,.03,.02,gred);          // 红色牌标饰带
  _gmbBody=b.build();
  _gmbBarrel=vcyl(.045,.14,gbrass,'x');         // 短枪管（暗金）
  _gmbDisc=vcyl(.085,.022,gblack,'x');          // 轮盘本体（朝 +X 的盘面）
  b=new GB(); // 轮盘盘面：8 个红黑扇区口袋 + 金色轴心（贴在盘面 +X，随盘旋转）
  for(let i=0;i<8;i++){ const a=i/8*G.TAU;
    b.box(.016, Math.cos(a)*.052, Math.sin(a)*.052, .012, .034, .034, i%2?gred:0x14161c); }
  b.box(.02,0,0,.022,.032,.032,gbrass);
  _gmbWheelFace=b.build();
  _gmbDrum=vcyl(.052,.07,0x241e16,'z');         // 扑克牌仓（顶置，轴向 Z）
  b=new GB();
  b.box(0,0,0,.02,.06,.015,givory);             // 仓口探出的扑克牌（象牙白）
  b.box(-.008,0,.0,.006,.05,.012,gred);         // 牌背红纹
  _gmbCardG=b.build();
  b=new GB(); b.box(0,0,0,.035,.012,.012,gbrass); _gmbLeverG=b.build();  // 发牌拨杆
  b=new GB(); b.box(0,0,0,.05,.05,.05,givory); b.box(.012,.012,.028,.012,.012,.008,0x14161c); _gmbDieG=b.build(); // 小骰子
}

function mkPlayerMesh(){
  initGeos();
  const M=pmats();
  const g=new THREE.Group();        // 根节点：位置=逻辑坐标，rotation.y=-face（forward=+X）
  const rollG=new THREE.Group();    // 翻滚轴枢：抬到角色中心，翻滚绕自身质心翻转
  rollG.position.y=.55; g.add(rollG);
  const bodyG=new THREE.Group();    // 视觉主体：呼吸/移动起伏作用在这层
  bodyG.position.y=-.55; rollG.add(bodyG);
  const cast=m=>{ m.castShadow=true; return m; };
  /* 躯干（装甲/机械/边缘/能量分层，同轴枢） */
  const torso=new THREE.Group(); torso.position.y=.62;
  torso.add(cast(new THREE.Mesh(_torsoA,M.armor)), cast(new THREE.Mesh(_torsoM,M.mech)),
            cast(new THREE.Mesh(_torsoX,M.edge)), cast(new THREE.Mesh(_torsoE,M.energy)));
  /* 头部（半覆盖盔壳 + 发光目镜） */
  const head=new THREE.Group(); head.position.y=1.02;
  head.add(cast(new THREE.Mesh(_headA,M.armor)), cast(new THREE.Mesh(_headM,M.mech)),
           cast(new THREE.Mesh(_headX,M.edge)), cast(new THREE.Mesh(_headE,M.energy)));
  /* 腿 */
  const mkLeg=()=>{ const grp=new THREE.Group();
    grp.add(cast(new THREE.Mesh(_legA,M.armor)), cast(new THREE.Mesh(_legM,M.mech)),
            cast(new THREE.Mesh(_legX,M.edge)));
    return grp; };
  const legL=mkLeg(); legL.position.set(0,.42,.12);
  const legR=mkLeg(); legR.position.set(0,.42,-.12);
  /* 右臂组（轴枢=肩，几何沿 +X 前伸 = 双手端枪姿态）：枪作为手臂子节点 → 后坐力/换弹联动整条手臂 */
  const armR=new THREE.Group(); armR.position.set(.02,.78,-.27);
  armR.add(cast(new THREE.Mesh(_armRA,M.armor)), cast(new THREE.Mesh(_armRM,M.mech)),
           cast(new THREE.Mesh(_armRX,M.edge)));
  const gun=new THREE.Group(); gun.position.set(.42,-.01,.02); gun.rotation.y=.08;
  const gunMesh=cast(new THREE.Mesh(_gunGeo,M.mech)); gun.add(gunMesh);
  armR.add(gun);
  /* ===== 拍立得双反相机（替换枪身渲染；镜头即枪口，forward=+X 与持枪臂一致） ===== */
  const cam=new THREE.Group(); cam.visible=false; cam.scale.setScalar(1.18);
  cam.add(cast(new THREE.Mesh(_camLeather,M.armor)), cast(new THREE.Mesh(_camMetal,M.mech)));
  const camParts=[
    [_camBarrel,.26,-.03,0],[ _camRing,.33,-.03,0],[_camVBarrel,.19,.155,0],[_camAperture,.35,-.03,0],
  ];
  for(const [geo,px,py,pz] of camParts){ const m=cast(new THREE.Mesh(geo,M.mech)); m.position.set(px,py,pz); cam.add(m); }
  const camLensA=cast(new THREE.Mesh(_camLensA,M.lens)); camLensA.position.set(.345,-.03,0);
  const camLensB=cast(new THREE.Mesh(_camLensB,M.lens)); camLensB.position.set(.238,.155,0);
  const camShutter=new THREE.Mesh(_camShutter,M.mech); camShutter.position.set(.318,-.03,0);
  const camCrank=new THREE.Group(); camCrank.position.set(-.09,.09,-.135);
  const gear=cast(new THREE.Mesh(_camGear,M.mech)); const knob=new THREE.Mesh(_camKnob,M.mech); knob.position.z=-.028;
  camCrank.add(gear,knob);
  cam.add(camLensA,camLensB,camShutter,camCrank);
  gun.add(cam);
  /* ===== 赌徒的灾难：赌场左轮（替换枪身渲染；轮盘/牌仓/拨杆动画见 animate） ===== */
  const gmb=new THREE.Group(); gmb.visible=false; gmb.scale.setScalar(1.18);
  gmb.add(cast(new THREE.Mesh(_gmbBody,M.mech)));
  const gmbBarrel=cast(new THREE.Mesh(_gmbBarrel,M.mech)); gmbBarrel.position.set(.33,-.02,0); gmb.add(gmbBarrel);
  const gmbWheel=new THREE.Group(); gmbWheel.position.set(-.02,.06,0);
  const gmbDisc=cast(new THREE.Mesh(_gmbDisc,M.mech)); gmbWheel.add(gmbDisc);
  const gmbFace=new THREE.Mesh(_gmbWheelFace,M.mech); gmbFace.position.x=.013; gmbWheel.add(gmbFace);
  gmb.add(gmbWheel);
  const gmbDrum=new THREE.Group(); gmbDrum.position.set(-.13,.16,0);
  gmbDrum.add(cast(new THREE.Mesh(_gmbDrum,M.mech)));
  const gmbCard=new THREE.Mesh(_gmbCardG,M.mech); gmbCard.position.x=.045; gmbDrum.add(gmbCard);
  gmb.add(gmbDrum);
  const gmbLever=new THREE.Group(); gmbLever.position.set(.1,-.07,.12);
  gmbLever.add(new THREE.Mesh(_gmbLeverG,M.mech)); gmb.add(gmbLever);
  const gmbDie=new THREE.Mesh(_gmbDieG,M.mech); gmbDie.position.set(.02,.22,.06); gmb.add(gmbDie);
  gun.add(gmb);
  /* 披风：颈结静态 + 三段链式（递延摆动） */
  const cape=new THREE.Group(); cape.position.y=.64;
  cape.add(cast(new THREE.Mesh(_capeA,M.cloak)));
  const seg1=new THREE.Group(); seg1.position.y=.12; seg1.add(cast(new THREE.Mesh(_cape1,M.cloak)));
  const seg2=new THREE.Group(); seg2.position.y=-.22; seg2.add(cast(new THREE.Mesh(_cape2,M.cloak2)));
  const seg3=new THREE.Group(); seg3.position.y=-.21; seg3.add(cast(new THREE.Mesh(_cape3,M.cloak)));
  seg2.add(seg3); seg1.add(seg2); cape.add(seg1);
  /* 悬浮能量碎片：3 片八面体绕身公转（能量材质 → 随核心一同呼吸） */
  const orbits=new THREE.Group();
  for(let i=0;i<3;i++){ const o=cast(new THREE.Mesh(_orbGeo,M.energy)); orbits.add(o); }
  orbits.position.y=1.0;
  // 目镜辉光（正面 +X，帮助玩家在 320p 下辨认朝向）
  // 注意：辉光/随身光坐标是 body 空间（bodyG 原点即世界脚底），必须挂在 bodyG 上，
  // 挂到 rollG 会整体抬高 0.55（辉光飘到头顶上方）
  const glow=new THREE.Sprite(G.pmat(0x4a66ff)); glow.scale.set(.26,.26,1); glow.position.set(.22,1.1,0);
  // 随身存在光（微弱蓝紫）+ 背后轮廓补光（紫 rim，让角色在暗处保持剪影可读）
  const light=new THREE.PointLight(0x8a90ff,.6,6,2); light.position.set(0,1.3,0);
  const rim=new THREE.PointLight(0x5a4aff,.4,4.5,2); rim.position.set(-1,1.3,0);
  bodyG.add(torso,head,legL,legR,cape,armR,orbits,rim,glow,light);
  /* 角色配色：彩虹纯色层（用户选定外观；纯色材质同样兼容受击闪白 traverse 机制） */
  const dbg=c=>new THREE.MeshStandardMaterial({color:c,roughness:.55,metalness:.1});
  torso.children.forEach(m=>{ if(m.isMesh) m.material=dbg(0xff3030); });   // 躯干（含双肩甲）=红
  head.children.forEach(m=>{ if(m.isMesh) m.material=dbg(0x30ff30); });    // 头=绿
  legL.children.forEach(m=>{ if(m.isMesh) m.material=dbg(0xffff30); });    // 左腿=黄
  legR.children.forEach(m=>{ if(m.isMesh) m.material=dbg(0x30ffff); });    // 右腿=青
  armR.children.forEach(m=>{ if(m.isMesh) m.material=dbg(0xff30ff); });    // 右臂（不含武器）=紫
  // 武器涂装已烘焙进 _gunGeo 顶点色（见 initGeos）；材质保持 pmats().mech 以兼容死亡消散淡出
  cape.traverse(m=>{ if(m.isMesh) m.material=dbg(0x3050ff); });            // 披风=蓝
  orbits.children.forEach(m=>{ if(m.isMesh) m.material=dbg(0xffffff); });  // 能量碎片=白
  /* 影子修正：平行光(6,14,4)下，头部/披风/武器臂的影子会投到角色左上方，
     形成一条被误认为"手持黑棍"的黑色长条 → 这些突出部件不再投影，
     仅保留躯干/双腿在正下方的接地影。 */
  head.traverse(o=>{ o.castShadow=false; });
  cape.traverse(o=>{ o.castShadow=false; });
  armR.traverse(o=>{ o.castShadow=false; });
  return {group:g, roll:rollG,
          refs:{body:bodyG, torso, head, legL, legR, cape, capeSeg:[seg1,seg2,seg3],
                armR, gun, gunMesh, glow, light, orbits,
                cam, camShutter, camCrank,
                gmb, gmbWheel, gmbDrum, gmbLever}};
}

function createPlayer(x,z){
  resetPmats(); // 材质是模块级单例：上一局死亡淡出后 opacity=0，新一局必须复位
  const {group, roll, refs} = mkPlayerMesh();
  const p = {
    x,z, r:.34, hp:6, maxHp:6, armor:0, maxArmor:0, armorRegenT:0,
    money:20, keys:0, dead:false,
    weapons:[], curW:0, passives:[], active:null, activeCd:0,
    st:{ dmgMul:1, rateMul:1, reloadMul:1, speedMul:1, bulletSpdMul:1, bounce:0, pierce:0,
         crit:0, luck:0, magnetMul:1, thorns:0, pelletAdd:0, adrenal:false, berserk:false, vamp:0, moneyMul:1 },
    rollT:0, rollCd:0, rollDur:.26, rollAng:0, invulnT:0, ghostT:0, stormT:0, shieldCharge:0, berserkT:0, slowT:0,
    flashT:0, skillT:0, deadT:0, _stepT:0, _flashOn:false,
    _lastX:x, _lastZ:z, _eTrailT:0, _eGlow:.85,   // 能量拖尾计时 / 能量脉动当前值
    aimX:x+1, aimZ:z, face:0, walkT:0, moving:false, recoilT:0, reloadHud:0, t:0,
    mesh:group, rollG:roll, refs,
    muzzleX:x, muzzleZ:z,
    heal(n){ return P.heal(this,n); },
    addHeartContainer(n){ return P.addHeartContainer(this,n); },
    hurt(dmg,ang){ return P.hurt(this,dmg,ang); },
    addKeys(n){ this.keys+=n; G.audio.sfx('key'); G.ui.stats(this); },
    addMoney(n){ this.money+=n; G.ui.stats(this); },
    giveWeapon(w){ P.giveWeapon(this,w); G.ui.weapon(this); },
    curDmgMul(){ return this.st.dmgMul*(this.st.berserk&&this.berserkT>0?1.5:1); },
  };
  group.position.set(x,0,z);
  G.scene.add(group);
  return p;
}

/* ---------- 玩家逻辑 ---------- */
const P = {
  update(p, dt){
    if(p.dead) return;
    p.t+=dt;
    const inp=G.input;
    // 计时器
    p.rollCd=Math.max(0,p.rollCd-dt);
    p.invulnT=Math.max(0,p.invulnT-dt);
    p.ghostT=Math.max(0,p.ghostT-dt);
    p.stormT=Math.max(0,p.stormT-dt);
    p.berserkT=Math.max(0,p.berserkT-dt);
    p.slowT=Math.max(0,p.slowT-dt);
    p.activeCd=Math.max(0,p.activeCd-dt);
    p.recoilT=Math.max(0,p.recoilT-dt*6);
    if(p.armor<p.maxArmor){ p.armorRegenT-=dt; if(p.armorRegenT<=0){ p.armor++; p.armorRegenT=12; G.ui.stats(p); G.audio.sfx('shield',{v:.4}); } }

    // 瞄准（p.face 由 animate() 统一驱动，保证视觉朝向与瞄准一致）
    p.aimX=inp.aimX; p.aimZ=inp.aimZ;
    const aimAng=G.angTo(p.x,p.z,p.aimX,p.aimZ);
    p.muzzleX=p.x+Math.cos(aimAng)*.62;
    p.muzzleZ=p.z+Math.sin(aimAng)*.62;

    // 移动
    const ax=inp.axis();
    if(p.rollT>0){
      p.rollT-=dt;
      const spd=14; // 短促高速翻滚：更快更跟手
      const k=1-p.rollT/p.rollDur;
      G.moveEntity(p, Math.cos(p.rollAng)*spd*dt, Math.sin(p.rollAng)*spd*dt);
      // 翻滚拖尾特效：能量火花 + 青色速度线 + 地面残影环
      const tailA=p.rollAng+Math.PI; // 朝运动反方向喷射
      for(let i=0;i<2;i++){
        const a2=tailA+(Math.random()-.5)*.8;
        G.fx.particle(p.x+Math.cos(tailA)*.3,.25+Math.random()*.5,p.z+Math.sin(tailA)*.3,{
          vx:Math.cos(a2)*(2+Math.random()*2), vy:.4+Math.random()*.8, vz:Math.sin(a2)*(2+Math.random()*2),
          life:.3+Math.random()*.15, color:Math.random()<.5?0x5a7cff:0xa8b8ff, s0:.16, kind:'a'});
      }
      if(Math.random()<.5){
        G.fx.particle(p.x,.12,p.z,{vx:(Math.random()-.5),vy:.2,vz:(Math.random()-.5),life:.35,color:0x3a52c8,s0:.22,kind:'m'});
      }
      // 拖尾点光：高速移动的能量辉光
      G.fx.holdLight('rollTrail', p.x,.5,p.z, 0x4a68f0, 1.3);
      // 残影：翻滚 40%/75% 进度处各留一个渐隐蓝紫残影环
      if(!p._ghostMarks) p._ghostMarks={};
      for(const mk of [0.4,0.75]){
        if(k>=mk && !p._ghostMarks[mk]){
          p._ghostMarks[mk]=true;
          G.fx.ring(p.x,p.z,.55,0x5a7cff,.32);
          G.fx.particle(p.x,.5,p.z,{vy:.8,life:.25,color:0x5a7cff,s0:.3,kind:'a'});
        }
      }
      if(p.rollT<=0){
        p.rollG.rotation.z=0;   // 复位翻滚翻转（新模型 forward=+X，翻滚绕 Z 轴）
        p._ghostMarks=null;
        // 落定冲击：小范围能量冲击环 + 尘埃
        G.fx.ring(p.x,p.z,1.0,0x5a7cff,.3);
        G.fx.burst(p.x,.15,p.z,5,{color:0x3a52c8,spd:2,vy:.6,life:.3,s0:.16,kind:'m'});
      }
    } else {
      let spd=4.3*p.st.speedMul;
      if(p.slowT>0) spd*=.55;
      if(p.st.adrenal && p.hp<=p.maxHp/2) spd*=1.4;
      if(ax.x||ax.z){
        G.moveEntity(p, ax.x*spd*dt, ax.z*spd*dt);
        p.moving=true;
        // 脚步尘埃：移动时脚下轻微扬尘反馈
        p._stepT-=dt;
        if(p._stepT<=0){
          p._stepT=.17;
          G.fx.particle(p.x, .06, p.z, {vx:(Math.random()-.5)*1.2, vy:.7, vz:(Math.random()-.5)*1.2,
            life:.3, color:0x8a8578, s0:.13, kind:'m'});
        }
      } else { p.moving=false; p._stepT=0; }
      // 翻滚触发（支持输入缓冲：顿帧或提前按下不吞按键）
      if((inp.pressed['Space']||inp.buffered('Space')) && p.rollCd<=0){
        inp.consume('Space');
        p.rollT=p.rollDur; p.rollCd=.42; // 后摇仅 0.16s，可快速连续翻滚
        p.rollAng = (ax.x||ax.z)? Math.atan2(ax.z,ax.x) : aimAng;
        p.invulnT=Math.max(p.invulnT,.24);
        p._ghostMarks=null;
        if(G.scalpel) G.scalpel.tryRollEnter(p);   // 视界线切割刀：翻滚进入裂隙 → 传送 → 坍缩
        G.audio.sfx('roll');
        // 起跳爆发：能量闪光 + 冲击环
        G.fx.light(p.x,.6,p.z,0x5a7cff,1.6,.22);
        G.fx.ring(p.x,p.z,.7,0x5a7cff,.28);
        G.fx.burst(p.x,.2,p.z,6,{color:0x5a7cff,spd:2.5,vy:.7,life:.3,s0:.15,kind:'a'});
        G.fx.burst(p.x,.15,p.z,5,{color:0x9a9080,spd:1.5,vy:.5,life:.35,s0:.18,kind:'m'});
      }
    }

    // 武器
    const w=p.weapons[p.curW];
    if(w){
      w.cool=Math.max(0,w.cool-dt);
      if(w.reloading){
        w.reloadT-=dt;
        if(w.reloadT<=0){ w.reloading=false; w.ammo=w.def.mag; G.audio.sfx('reloadEnd'); }
      }
      // 献给太阳的左轮：Heat 系统逻辑
      if(w.def.sun){
        if(w.heat>0){
          w.heatIdle+=dt;
          let decay = 9; if(w.reloading) decay*=4;
          if(w.heatIdle>.7 || w.reloading) w.heat=Math.max(0, w.heat-decay*dt);
        }
        if(w.heat>100){
          w.heat=0; w.heatIdle=0; w.cool=1.5;
          p.hurt(1); G.audio.sfx('overheatHiss'); G.fx.shake(.3); G.ui.hurtFlash();
          G.fx.burst(p.muzzleX,.6,p.muzzleZ,12,{color:0xff3020,spd:2,life:.4,s0:.3,kind:'a'});
        }
      }
      // 所有武器均支持长按连发，射速上限由武器 rate 数据约束
      if(inp.mouse.down && !w.reloading && w.cool<=0){
        if(w.ammo>0 || p.stormT>0){
          this.fire(p,w,aimAng);
        } else {
          G.audio.sfx('empty',{v:.4});
          this.reload(p);
        }
      }
      // 三连发队列：一次扳机在 burstGap 间隔内连射剩余弹（不占冷却位）
      if(w.burstLeft>0){
        w.burstT-=dt;
        if(w.burstT<=0 && !w.reloading){
          w.burstLeft--;
          w.burstT=w.def.burstGap||.07;
          if(w.ammo>0 || p.stormT>0) this.emitShot(p,w,aimAng);
          else w.burstLeft=0;
        }
      }
      // 拍立得蓄力队列：聚光完成后快门落下，正式拍摄
      if(w.chargeT!=null){
        w.chargeT-=dt;
        if(w.chargeT<=0){
          w.chargeT=null;
          if(w.def.gambler){
            if(p.stormT<=0) w.ammo--;
            G.gambler.release(p,aimAng,w.def);   // 抽牌结算（Deck/花色/Joker）
            if(w.ammo<=0 && p.stormT<=0) this.reload(p);
          }
          else if(w.ammo>0 || p.stormT>0) this.emitShot(p,w,aimAng);
        }
      }
      if((inp.pressed['KeyR']||inp.buffered('KeyR'))){ inp.consume('KeyR'); this.reload(p); }
    }
    // 切换武器
    const wheel=inp.consumeWheel();
    // 数字键直接选中指定槽位（BUG-003：原先 1/2 都是 +1，无法直接选槽）
    const dig = inp.pressed['Digit1']?0 : inp.pressed['Digit2']?1 : -1;
    if(inp.pressed['KeyQ']||wheel!==0||dig>=0){
      if(p.weapons.length>1){
        const n=p.weapons.length, ow=p.weapons[p.curW];
        // 切枪清掉旧武器的三连发剩余队列（BUG-002：否则切回该武器会自动续发剩余弹）
        ow.burstLeft=0; ow.burstT=0;
        if(dig>=0){
          if(dig<n && dig!==p.curW) p.curW=dig;
        }else if(inp.pressed['KeyQ']){
          p.curW=(p.curW+1)%n;
        }else{
          // 滚轮按方向+幅度循环（BUG-003 修复方向；2026-09-02 多格连切：快速滚 N 格切 N 把）
          const ws=((wheel%n)+n)%n;
          if(ws) p.curW=(p.curW+ws)%n;
        }
        const nw=p.weapons[p.curW]; nw.reloading=false;
        p.recoilT=.2;
        G.audio.sfx('reload',{v:.4});
      }
    }
    // 主动技能（支持输入缓冲）
    if((inp.pressed['KeyF']||inp.buffered('KeyF')) && p.active && p.activeCd<=0){
      inp.consume('KeyF');
      p.active.use(p);
      p.activeCd=p.active.cd;
      // 技能释放的全身反馈：能量冲击环 + 短暂辉光涌动 + 地面光柱
      p.skillT=.45;
      G.fx.ring(p.x,p.z,.9,0x5a7cff,.32);
      G.fx.light(p.x,1,p.z,0x5a7cff,1.5,.28);
      G.fx.particle(p.x,1.2,p.z,{vy:1.2,life:.35,color:0x5a7cff,s0:.4,kind:'a'});
    }
    this.updateGunVisual(p);
    this.animate(p,dt,aimAng);
    this.pickups(p,dt);
    this.interactScan(p);
  },

  /* 单发弹道与反馈（burst 续发共用） */
  emitShot(p,w,aimAng, isSunShot){
    const def=w.def;
    if(p.stormT<=0) w.ammo--;
    
    // 献给太阳的左轮：计算 Heat 伤害倍率
    let sunMul = 1;
    if(def.sun && !isSunShot){
      const h = w.heat;
      if(h < 25) sunMul = 1;
      else if(h < 50) sunMul = 1.25;
      else if(h < 75) sunMul = 1.6;
      else if(h < 95) sunMul = 2.2;
    }
    
    let useDef = def;
    if(isSunShot){
      // SUNSHOT：改射 kind:'sun' 弹（pierce 99、spd 7、dmg 38，含 PERFECT 1.5x）
      useDef = Object.assign({}, def, { 
        kind:'sun', dmg:38*1.5, speed:7, pierce:99, color:0xfff0a0, sfx:'sunshot' 
      });
    }

    G.weapons.spawnPlayer(p,aimAng,useDef,w.id, sunMul);
    G.audio.sfx(useDef.sfx,{v:.8});
    G.fx.light(p.muzzleX,.7,p.muzzleZ, useDef.color, 1.6,.09);
    // 枪口闪光：大光斑 + 侧向火舌（短命高亮，现代射击观感）
    G.fx.particle(p.muzzleX,.6,p.muzzleZ,{vx:Math.cos(aimAng)*1.2,vy:.3,vz:Math.sin(aimAng)*1.2,life:.08,color:useDef.color,s0:.5,kind:'a'});
    const side=aimAng+Math.PI/2;
    G.fx.particle(p.muzzleX,.6,p.muzzleZ,{vx:Math.cos(side)*(1.2+Math.random()),vy:.2,vz:Math.sin(side)*(1.2+Math.random()),life:.07,color:useDef.color,s0:.22,kind:'a'});
    G.fx.particle(p.muzzleX,.6,p.muzzleZ,{vx:-Math.cos(side)*(1.2+Math.random()),vy:.2,vz:-Math.sin(side)*(1.2+Math.random()),life:.07,color:useDef.color,s0:.22,kind:'a'});
    G.fx.particle(p.muzzleX,.6,p.muzzleZ,{vx:Math.cos(aimAng)*3,vy:.5,vz:Math.sin(aimAng)*3,life:.12,color:useDef.color,s0:.3});
    G.fx.particle(p.x-Math.sin(aimAng)*.3,.55,p.z+Math.cos(aimAng)*.3,{
      vx:-Math.sin(aimAng)*(1.5+Math.random()), vy:2.5, vz:Math.cos(aimAng)*(1.5+Math.random()),
      life:.5,color:0xd8b040,kind:'s',s0:.08,g:-9});
    if(w.ammo<=0 && p.stormT<=0) this.reload(p);
  },

  fire(p,w,aimAng){
    const def=w.def;
    w.cool=1/(def.rate*p.st.rateMul*(p.stormT>0?2.5:1)*(p.st.adrenal&&p.hp<=p.maxHp/2?1.4:1));
    if(G.meta) G.meta.onWeaponUse(w.id);   // 武器图鉴：使用次数统计
    // 过载点唱机：在飞黑胶达到 12 张上限 → 空响（性能红线，设计稿三十二）
    if(def.jukebox && G.weapons.activeVinyl()>=12){ G.audio.sfx('empty',{v:.4}); return; }
    // 献给太阳的左轮：射击积热
    if(def.sun){
      w.heat += 14; w.heatIdle = 0;
      if(w.heat >= 95 && w.heat <= 114){ // SUNSHOT 触发区间（含 Overheat 前的最后一发）
        this.emitShot(p, w, aimAng, true); // 强制 SUNSHOT
        w.heat = 0; p.recoilT = 1.4;
        G.fx.shake(.15);
        return;
      }
    }
    // 拍立得：先蓄力聚光（0.16s）再快门落下完成拍摄，冷却期即上发条
    if(def.polaroid){
      w.chargeT=.16;
      G.audio.sfx('windup',{v:.45});
      p.recoilT=.3;
      return;
    }
    // 赌徒的灾难：卡壳期间扳机空响；否则先转轮蓄力（chargeT 结束后抽牌结算）
    if(def.gambler){
      if(G.gambler.jamT>0){ G.audio.sfx('empty',{v:.4}); return; }
      w.chargeT=.15;
      G.gambler.wheelFast=1;
      G.audio.sfx('gspin',{v:.5});
      return;
    }
    this.emitShot(p,w,aimAng);
    p.recoilT=1;
    G.fx.shake(def.rocket?.14:(def.shotgun||def.rail||def.frost?.08:.025));
    p.vx=(p.vx||0)-Math.cos(aimAng)*def.knock*.12; p.vz=(p.vz||0)-Math.sin(aimAng)*def.knock*.12;
    // 三连发武器：扣下扳机排入剩余弹队列
    if(def.burst>1) { w.burstLeft=def.burst-1; w.burstT=def.burstGap||.07; }
  },

  reload(p){
    const w=p.weapons[p.curW];
    if(!w||w.reloading||w.ammo===w.def.mag) return;
    w.reloading=true;
    w.burstLeft=0;
    w.reloadT=w.def.reload*p.st.reloadMul;
    G.audio.sfx('reload');
  },

  updateGunVisual(p){
    const w=p.weapons[p.curW];
    const gm=p.refs.gunMesh;
    const cam=p.refs.cam;
    const gmb=p.refs.gmb;
    if(!w){ gm.visible=false; cam.visible=false; gmb.visible=false; return; }
    gm.visible=true;
    // 拍立得：隐藏普通枪身，渲染双反相机（巨大镜头即枪口，结构一体化）
    // 赌徒：渲染赌场左轮（轮盘/牌仓动画见 animate）
    if(w.def.polaroid){ cam.visible=true; gm.visible=false; gmb.visible=false; }
    else if(w.def.gambler){ gmb.visible=true; cam.visible=false; gm.visible=false; }
    else { cam.visible=false; gmb.visible=false; gm.visible=true; }
    const len = w.def.rocket?1.5 : w.def.shotgun?1.2 : w.def.laser?.9 : w.def.plasma?1.1 : 1;
    const th  = (w.def.rocket||w.def.shotgun)?1.35 : 1;   // 重型武器整体加粗
    gm.scale.set(len,th,th);
    if(!gm.userData.tinted||gm.userData.tinted!==w.def.color){
      gm.material=pmats().mech;   // 玩家专属金属材质（顶点色仍控制深浅），与角色材质语言统一
      gm.userData.tinted=w.def.color;
    }
  },

  animate(p,dt,aimAng){
    const r=p.refs;
    p.mesh.position.set(p.x,0,p.z);

    /* ===== 朝向系统（强制要求：面部/身体正前方 = 鼠标世界方向） =====
       模型 forward = +X（见 mkPlayerMesh 顶部说明），根节点 rotation.y = -face。
       翻滚期间以翻滚方向为朝向（翻转与位移同向，速度感正确）。
       angLerp 25/s：约 40ms 收敛到 63%、100ms 内基本到位——平滑且无感延迟。 */
    const targetFace = p.rollT>0 ? p.rollAng : aimAng;
    p.face = G.angLerp(p.face, targetFace, Math.min(1,25*dt));
    p.mesh.rotation.y = -p.face;

    // 计时器
    p.skillT=Math.max(0,p.skillT-dt);

    /* ===== 死亡演出：能量失控 → 后仰倒地 → 消散 ===== */
    if(p.dead){
      p.deadT+=dt;
      const k=Math.min(1,p.deadT*3);
      p.rollG.rotation.z=k*Math.PI/2;           // 向后倒（+X 被抬向上 → 仰面）
      p.rollG.position.y=.55-(1-Math.min(1,p.deadT*1.5))*.15;
      r.body.position.y=-.55; r.torso.rotation.z=0; r.armR.rotation.z=0;
      // 能量核心失控：大幅随机闪烁（0~0.55s，"故障"感）
      const E=pmats();
      E.energy.emissiveIntensity = p.deadT<.55 ? 3+Math.sin(p.t*45)*2.5+Math.random()*.8 : 0;
      // 消散：能量碎片向上逸散 + 玩家专用材质整体淡出（createPlayer 复位）
      if(p.deadT>.55){
        const op=Math.max(0,1-(p.deadT-.55)/1.1);
        for(const key in E){ const m=E[key]; m.transparent=true; m.opacity=op; }
        if(Math.random()<dt*14){
          G.fx.particle(p.x+(Math.random()-.5)*.4, .3+Math.random()*.7, p.z+(Math.random()-.5)*.4,
            {vy:1.1+Math.random()*.7, life:.5, color:Math.random()<.5?0x5a7cff:0x8a5cff, s0:.12, kind:'a'});
        }
        if(p.deadT>1.8) p.mesh.visible=false;
      }
      return;
    }

    /* ===== 翻滚：绕 Z 轴前滚翻（位移方向即面朝方向），带挤压拉伸 ===== */
    if(p.rollT>0){
      const k=1-p.rollT/p.rollDur;
      p.rollG.rotation.z=-k*G.TAU;
      p.rollG.scale.y=1+Math.sin(k*Math.PI)*.18;  // 起身/落地微拉伸
    } else {
      p.rollG.rotation.z=0;
      p.rollG.scale.y=1;
    }

    /* ===== 赌徒的灾难：轮盘缓转（开火后快转衰减）+ 牌仓拨动 + 拨杆摇摆 ===== */
    if(r.gmb && r.gmb.visible){
      const boost=G.gambler?G.gambler.wheelFast:0;
      r.gmbWheel.rotation.x += dt*(1.4+boost*18);
      r.gmbDrum.rotation.x -= dt*(0.9+boost*14);
      r.gmbLever.rotation.z = Math.sin(p.t*2)*0.06;
    }

    /* ===== 移动/待机动画 ===== */
    if(p.moving) p.walkT+=dt*10;
    const sw=Math.sin(p.walkT)*.55*(p.moving?1:0);
    r.legL.rotation.z=sw;  r.legR.rotation.z=-sw;                 // 腿部前后摆动（forward=+X → 绕 Z 摆）
    // 身体起伏（移动弹跳 / 待机呼吸）
    r.body.position.y=-.55+Math.abs(Math.sin(p.walkT))*.045*(p.moving?1:0)
                      +(p.moving?0:Math.sin(p.t*2.4)*.012);
    // 躯干：移动前倾 + 射击后坐仰起
    r.torso.rotation.z=-.07*(p.moving?1:0) + p.recoilT*.14;
    // 头部：随移动轻微点动 + 待机缓慢扫视（始终朝 +X，不偏离瞄准方向）
    r.head.rotation.z=Math.sin(p.walkT*2)*.05*(p.moving?1:0)+Math.sin(p.t*1.7)*.03;
    // 披风：跑动时向后上方飘摆（整体）+ 三段链式递延波动（风感）
    const capeAmp=p.moving?1.3:.5;
    r.cape.rotation.z=-.2-(p.moving?.22:0)-Math.sin(p.t*(p.moving?10:3.2))*.1;
    const segs=r.capeSeg;
    segs[0].rotation.z=Math.sin(p.t*(p.moving?10:3.2))*.13*capeAmp;
    segs[1].rotation.z=Math.sin(p.t*(p.moving?10:3.2)-.9)*.18*capeAmp;
    segs[2].rotation.z=Math.sin(p.t*(p.moving?10:3.2)-1.8)*.22*capeAmp;
    // 侧摆：移动方向与瞄准方向的夹差 → 披风绕 Y 偏转（跟随运动惯性）
    const mvx=(p.x-p._lastX)/dt, mvz=(p.z-p._lastZ)/dt;
    if(p.moving){
      const fvx=Math.cos(p.face), fvz=Math.sin(p.face);
      const side=mvx*fvz-mvz*fvx;             // 叉积 → 侧向分量（右正左负）
      r.cape.rotation.y=G.lerp(r.cape.rotation.y, -G.clamp(side*.12,-.5,.5), Math.min(1,8*dt));
    } else r.cape.rotation.y=G.lerp(r.cape.rotation.y, 0, Math.min(1,4*dt));
    // 持枪臂：射击后坐（整臂连同枪向后上抬）+ 换弹时枪口下垂
    let armKick=p.recoilT*.16;
    if(p.weapons[p.curW]&&p.weapons[p.curW].reloading){
      const total=p.weapons[p.curW].def.reload*p.st.reloadMul;
      const ph=1-Math.max(0,p.weapons[p.curW].reloadT)/total;
      armKick-=Math.sin(ph*Math.PI)*.85;                          // 换弹：手臂下压再收回
    }
    r.armR.rotation.z=armKick;
    r.gun.position.x=.42-p.recoilT*.06;                           // 枪身短促后挫

    /* ===== 拍立得相机动画：聚光 → 快门合拢 → 闪光复位 → 冷却期上发条 ===== */
    const cw=p.weapons[p.curW];
    if(cw && cw.def.polaroid){
      if(cw.chargeT!=null){                        // 第一/二阶段：镜头积光 + 快门叶片合拢
        const k=1-Math.max(0,cw.chargeT)/.16;
        p._camGlow=.3+k*2.3;
        p._camShut=k;
      } else {                                     // 第三/四阶段：快门弹开 + 发条上弦
        p._camGlow=Math.max(.25,(p._camGlow||.25)-dt*6);
        p._camShut=Math.max(0,(p._camShut||0)-dt*7);
        if(cw.cool>0) p._camWind=(p._camWind||0)+dt*11;
      }
      pmats().lens.emissiveIntensity=p._camGlow*(1+Math.sin(p.t*3)*.05);
      r.camShutter.position.x=.318+p._camShut*.027; // 叶片盘前移遮住镜头玻璃
      r.camCrank.rotation.z=p._camWind||0;          // 侧面发条曲柄旋转（装填感）
    }

    /* ===== 无敌闪烁（无敌帧同步，受击后短闪） ===== */
    const blink = p.invulnT>0 && p.rollT<=0;
    p.mesh.visible = blink ? (Math.floor(performance.now()/60)%2===0) : true;

    /* ===== 受击闪白（与敌人同款材质换装） ===== */
    if(p.flashT>0){
      p.flashT-=dt;
      if(!p._flashOn){
        p.mesh.traverse(o=>{ if(o.isMesh){ o.userData._om=o.material; o.material=G.flashMat; } });
        p._flashOn=true;
      }
    } else if(p._flashOn){
      p.mesh.traverse(o=>{ if(o.isMesh&&o.userData._om){ o.material=o.userData._om; } });
      p._flashOn=false;
    }

    /* ===== 辉光状态机 + 能量核心脉动 =====
       统一能量语言：待机呼吸 → 移动增强 → 受击爆发；翻滚/技能/幽灵态覆盖优先级。
       目镜辉光 sprite（可读性）与能量材质 emissive（模型发光件）同步驱动。 */
    let glowC=0x4a66ff, glowS=.26+Math.sin(p.t*2.4)*.04, eTarget=.85+Math.sin(p.t*2.4)*.18;
    if(p.moving) eTarget+=.28;                                 // 移动：能量略增
    if(p.rollT>0){
      glowS=1.0+Math.sin(p.t*20)*.25; eTarget=1.7+Math.sin(p.t*20)*.35;
    } else if(p.skillT>0){
      glowC=0xa8b8ff; glowS=.95+Math.sin(p.skillT*22)*.25; eTarget=1.5+Math.sin(p.skillT*22)*.35;
    } else if(p.ghostT>0){
      glowC=0x9a8aff; glowS=.8; eTarget=1.15;
    } else if(p.flashT>0){
      eTarget=1.9;                                             // 受击：核心瞬时增强
    }
    if(r.glow.userData.c!==glowC){ r.glow.material=G.pmat(glowC); r.glow.userData.c=glowC; }
    r.glow.scale.set(glowS,glowS,1);
    p._eGlow=G.lerp(p._eGlow,eTarget,Math.min(1,12*dt));       // 平滑脉动，无跳变
    pmats().energy.emissiveIntensity=p._eGlow;

    /* ===== 悬浮能量碎片：绕身公转 + 浮动 + 自转（移动时略加速） ===== */
    const orb=r.orbits; orb.rotation.y+=dt*(p.moving?2.1:1.25);
    for(let i=0;i<orb.children.length;i++){
      const o=orb.children[i], oa=orb.rotation.y+i*2.094;
      o.position.set(Math.cos(oa)*.42, Math.sin(p.t*1.8+i*2.1)*.09, Math.sin(oa)*.42);
      o.rotation.x+=dt*2.2; o.rotation.z+=dt*1.4;
    }
    /* ===== 移动能量拖尾：身后逸散的微光粒子（克制数量，仅动作反馈） ===== */
    if(p.moving){
      p._eTrailT-=dt;
      if(p._eTrailT<=0){
        p._eTrailT=.11;
        G.fx.particle(p.x-Math.cos(p.face)*.3+(Math.random()-.5)*.2, .5+Math.random()*.5,
          p.z-Math.sin(p.face)*.3+(Math.random()-.5)*.2,
          {vy:.3, life:.22, color:Math.random()<.7?0x5a7cff:0x8a5cff, s0:.09, kind:'a'});
      }
    }

    /* ===== 低血量警告：脚下红色脉冲光 ===== */
    if(p.hp<=p.maxHp/2 && p.maxHp>0){
      G.fx.holdLight('lowhp', p.x,.45,p.z, 0xff2828, .55+.4*Math.sin(p.t*7));
    }

    // 击退速度衰减
    if(p.vx||p.vz){
      G.moveEntity(p,(p.vx||0)*dt,(p.vz||0)*dt);
      p.vx*=Math.pow(.0001,dt); p.vz*=Math.pow(.0001,dt);
      if(Math.abs(p.vx)<.01)p.vx=0; if(Math.abs(p.vz)<.01)p.vz=0;
    }
    // 记录本帧位置（披风惯性侧摆用）
    p._lastX=p.x; p._lastZ=p.z;
  },

  /* ---------- 拾取物 ---------- */
  pickups(p,dt){
    const magR=1.7*p.st.magnetMul;
    for(let i=G.pickups.length-1;i>=0;i--){
      const pk=G.pickups[i];
      pk.t=(pk.t||0)+dt;
      pk.mesh.position.y=.45+Math.sin(pk.t*3)*.12;
      pk.mesh.rotation.y+=dt*(pk.mesh.userData.spin||2.5);
      // 金币偶发星芒闪光（昏暗环境中醒目定位）
      if(pk.kind==='money' && Math.random()<dt*1.6){
        G.fx.particle(pk.x,.55,pk.z,{vy:.4,life:.28,color:0xfff0a0,s0:.28,kind:'a'});
      }
      const d=G.dist(p.x,p.z,pk.x,pk.z);
      // 满血时红心不磁吸不拾取（留在原地，掉血后再回来捡；修复满血红心粘在身上跟随移动的bug）
      if(pk.kind==='heart' && p.hp>=p.maxHp) continue;
      // 磁吸
      if(pk.kind!=='weapon' && d<magR && d>.01){
        const a=G.angTo(pk.x,pk.z,p.x,p.z);
        const pull=G.lerp(9,2,d/magR);
        pk.x+=Math.cos(a)*pull*dt; pk.z+=Math.sin(a)*pull*dt;
        pk.mesh.position.x=pk.x; pk.mesh.position.z=pk.z;
      }
      const rr = pk.kind==='weapon'? .8 : .5;
      if(d<rr && !p.dead){
        let taken=false;
        switch(pk.kind){
          case 'money': p.money++; G.game.run.moneyEarned++; G.audio.sfx('coin',{v:.35}); taken=true; break;
          case 'key': p.addKeys(1); taken=true; break;
          case 'heart':
            if(p.hp<p.maxHp){ p.heal(2); taken=true; } break;
          case 'item': G.items.giveTo(p,{kind:'item',id:pk.itemId}); taken=true; break;
          case 'active': G.items.giveTo(p,{kind:'active',id:pk.itemId}); taken=true; break;
        }
        if(taken){
          G.fx.particle(pk.x,.5,pk.z,{vy:1.5,life:.3,color:pk.kind==='money'?0xffd23e:0x8fe8b0,s0:.2});
          if(pk.kind==='money') G.fx.light(pk.x,.6,pk.z,0xffd23e,.8,.18);
          G.scene.remove(pk.mesh);
          if(pk.label) G.scene.remove(pk.label);
          G.pickups.splice(i,1);
        }
      }
    }
  },

  /* ---------- 交互扫描 ---------- */
  interactScan(p){
    let best=null, bd=1e9, bestLabel=null;
    for(const pr of G.props){
      if(!pr.interact) continue;
      const d=G.dist(p.x,p.z,pr.x,pr.z);
      if(d<(pr.interact.range||1.4) && d<bd){ bd=d; best=pr; }
    }
    for(const pk of G.pickups){
      if(pk.kind!=='weapon'||pk.taken) continue;
      const d=G.dist(p.x,p.z,pk.x,pk.z);
      if(d<1.4 && d<bd){ bd=d; best=pk; }
    }
    G.game.curInteract=best;
    if(best){
      let label = best.interact ? best.interact.label : ('拾取 '+best.weaponName);
      if(typeof label==='function') label=label(); // 支持动态文本（如商店实时余额）
      G.ui.prompt('<b>[E]</b> '+label);
      // 输入缓冲：提前 0.18 秒按下 E 也生效（按下瞬间不在范围内/顿帧期间不吞按键）
      if(inpPressedOrBuffered('KeyE')){
        G.input.consume('KeyE');
        if(best.interact) best.interact.fn();
        else this.takeWeaponPickup(p,best);
      }
    } else G.ui.prompt(null);
  },

  takeWeaponPickup(p,pk){
    if(pk.taken) return;
    pk.taken=true;
    this.giveWeapon(p, pk.wInst);
    G.scene.remove(pk.mesh); if(pk.label) G.scene.remove(pk.label);
    const i=G.pickups.indexOf(pk); if(i>=0) G.pickups.splice(i,1);
  },

  giveWeapon(p, w){
    G.audio.sfx('itemGet');
    G.ui.itemToast('获得武器『<b>'+w.def.name+'</b>』');
    if(p.weapons.length<2){
      p.weapons.push(w); p.curW=p.weapons.length-1;
    } else {
      const old=p.weapons[p.curW];
      // 旧武器掉落原地
      G.spawnPickup('weapon', p.x-Math.cos(p.face)*.8, p.z-Math.sin(p.face)*.8, {weaponInst:old});
      p.weapons[p.curW]=w;
    }
  },

  hurt(p, dmg, ang){
    if(p.dead||p.invulnT>0||p.rollT>0||p.ghostT>0) return;
    if(p.shieldCharge>0){
      G.audio.sfx('shield');
      G.fx.ring(p.x,p.z,1.2,0x9a8aff,.3);
      G.ui.stats(p);
      return;
    }
    if(p.armor>0){
      p.armor--; p.armorRegenT=12;
      G.audio.sfx('clank');
      G.fx.sparks(p.x,.7,p.z,0xc0d0e0);
      G.ui.stats(p);
      p.invulnT=.5;
      p.flashT=.1;   // 护甲受击闪白
      return;
    }
    p.hp-=dmg;
    G.game.run.dmgTaken+=dmg;
    if(p.st.berserk) p.berserkT=5;
    G.ui.hurtFlash();
    G.ui.hearts(p);
    G.audio.sfx('hurt');
    G.fx.shake(.4); G.fx.hitstop(.05);
    if(ang!=null){ p.vx=(p.vx||0)+Math.cos(ang)*5; p.vz=(p.vz||0)+Math.sin(ang)*5; }
    // 受击反馈：能量火花（蓝紫，替代血粒子——虚空猎手无血，统一能量视觉语言）
    G.fx.burst(p.x,.6,p.z,6,{color:0x8a5cff,spd:3,vy:.8,life:.35,s0:.14,kind:'a'});
    p.flashT=.12;   // 受击闪白（与敌人同款 flashMat 换装机制）
    p.invulnT=.9;
    if(p.hp<=0){
      p.hp=0; p.dead=true; p.deadT=0;
      // 死亡瞬间：能量核心失控爆发（蓝紫粒子 + 双冲击环 + 强光），随后由 animate 播放消散
      G.fx.burst(p.x,.7,p.z,14,{color:0x6a80ff,spd:4.5,vy:1.2,life:.5,s0:.2,kind:'a'});
      G.fx.burst(p.x,.5,p.z,8,{color:0x9a8aff,spd:2.5,vy:.8,life:.45,s0:.16,kind:'a'});
      G.fx.ring(p.x,p.z,1.4,0x6a80ff,.4);
      G.fx.ring(p.x,p.z,.8,0xa8b8ff,.3);
      G.fx.light(p.x,.9,p.z,0x7a8cff,2.4,.5);
      G.fx.poof(p.x,.6,p.z,0x8a9aff);
      G.game.loseRun();
    }
  },

  heal(p,n){
    if(p.hp>=p.maxHp) return false;
    p.hp=Math.min(p.maxHp,p.hp+n);
    G.audio.sfx('heart');
    G.ui.hearts(p);
    G.fx.particle(p.x,1,p.z,{vy:1,life:.4,color:0xff5050,s0:.3});
    return true;
  },

  /* 扩充血量上限（+n/2 个心形容器），并回满新增部分 */
  addHeartContainer(p,n){
    n=n||2;
    p.maxHp+=n;
    p.hp=Math.min(p.maxHp,p.hp+n);
    G.audio.sfx('itemGet');
    G.ui.hearts(p);
    G.ui.itemToast('生命上限提升！<b style="color:#e04a3a;">+'+(n/2)+' 心</b>');
    G.fx.burst(p.x,1,p.z,8,{color:0xff5050,spd:2,life:.6,s0:.2});
    return true;
  },
};

/* ---------- 玩家扩展方法 ---------- */
G.createPlayer = createPlayer;

/* ---------- 拾取物生成 ---------- */
G.pickups = [];
G.spawnPickup = function(kind,x,z,opt){
  opt=opt||{};
  const g=new THREE.Group();
  let weaponName=null, wInst=null, label=null;
  switch(kind){
    case 'money': {
      // 自发光金币 + 体积辉光：昏暗地牢中一眼可见
      const b=new GB();
      b.cyl(0,0,0,.055,.055,.13,0xffd23e,8);
      b.box(0,0,0,.05,.11,.11,0xffe98a); // 侧面高光条
      const m=new THREE.Mesh(b.build(), G.bmat(0xffd23e));
      m.rotation.z=1.2; g.add(m);
      const gl=new THREE.Sprite(G.pmat(0xffd23e)); gl.scale.set(.55,.55,1); g.add(gl);
      g.userData.spin=6+Math.random()*3;
      break; }
    case 'key': {
      const b=new GB();
      b.box(0,0,.1,.26,.07,.07,0xe8c15a); b.cyl(0,0,-.08,.09,.09,.05,0xd8a830,6);
      b.box(.1,0,.1,.06,.06,.06,0xd8a830);
      const m=new THREE.Mesh(b.build(),G.vcolMat); g.add(m); break; }
    case 'heart': {
      const b=new GB();
      b.sph(-.07,.05,0,.11,0xe04a3a,6); b.sph(.07,.05,0,.11,0xe04a3a,6); b.cone(0,-.12,0,.16,.2,0xe04a3a,5);
      const m=new THREE.Mesh(b.build(),G.vcolMat); g.add(m);
      const gl=new THREE.Sprite(G.pmat(0xff5050)); gl.scale.set(.6,.6,1); g.add(gl); break; }
    case 'weapon': {
      wInst = opt.weaponInst || G.weapons.mktWeapon(G.weapons.randomWeaponId(opt.weaponId||'C'));
      const def=wInst.def;
      const b=new GB();
      b.box(0,0,0,.5,.1,.1,0x383840); b.box(-.2,-.08,0,.1,.14,.08,0x584428);
      b.box(.22,0,0,.12,.14,.14,0x8a8a94);
      const m=new THREE.Mesh(b.build(),G.vcolMat); g.add(m);
      const gl=new THREE.Sprite(G.pmat(def.color)); gl.scale.set(.9,.9,1); g.add(gl);
      weaponName=def.name;
      label=B_textLabel(def.name);
      g.add(label); // 标签挂载到拾取物组：跟随掉落位置（修复原先标签滞留世界原点的bug）
      label.position.set(0,1.0,0);
      break; }
    case 'item': {
      const it=G.items.passives[opt.itemId]||{color:'#a0e8c0',name:'?'};
      const m=new THREE.Mesh(G.sphGeo(.18,7), G.bmat(0x70e8a0));
      g.add(m);
      const gl=new THREE.Sprite(G.pmat(0x50ffa0)); gl.scale.set(.8,.8,1); g.add(gl);
      break; }
    case 'active': {
      const m=new THREE.Mesh(G.sphGeo(.18,7), G.bmat(0x50b0ff));
      g.add(m);
      const gl=new THREE.Sprite(G.pmat(0x50c8ff)); gl.scale.set(.8,.8,1); g.add(gl);
      break; }
  }
  g.position.set(x,.45,z);
  G.scene.add(g);
  const pk={kind,x,z,mesh:g,t:Math.random()*3,itemId:opt.itemId,weaponName,wInst,label};
  G.pickups.push(pk);
  return pk;
};
function B_textLabel(text){
  const cv=document.createElement('canvas'); cv.width=160; cv.height=48;
  const ctx=cv.getContext('2d');
  ctx.font='bold 24px Consolas, monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(text).width;
  ctx.fillStyle='rgba(0,0,0,.7)';
  ctx.fillRect(80-w/2-4,5,w+8,38);
  ctx.lineWidth=4; ctx.strokeStyle='rgba(0,0,0,.9)';
  ctx.strokeText(text,80,25);
  ctx.fillStyle='#ffe9a0'; ctx.fillText(text,80,25);
  const tx=new THREE.CanvasTexture(cv); tx.magFilter=THREE.NearestFilter;
  tx.disposableTx=true;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthWrite:false,depthTest:false}));
  sp.scale.set(2.4,.72,1);
  sp.renderOrder=900;
  return sp;
}

G.playerCtl = P;
})();
