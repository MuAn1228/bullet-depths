/* 弹膛深渊 - 武器⑥【献给太阳的左轮】：Heat 过热管理 / 随温度变色的黄金左轮 / SUNSHOT / 主动散热
   ---------------------------------------------------------------------------
   重做说明（2026-09-03）：旧实现（git c7e054b）被判定拉跨的三点，本版逐一解决——
     ① 旧版 +14 阶梯下 95~100 临界区间只有 98 一个可达节点，PERFECT 与「赌」都不成立
        → 本版改为「沸腾期」模型：heat ≥ SOLAR_AT 进入 SUNSHOT 待发窗口，枪体持续升温，
          玩家必须在炸膛前打出去，越晚打（越接近 100）越强 → PERFECT 成为真技巧
     ② 旧版 OVERHEAT 正常对局不可达（仅测试注入）→ 本版有两条真实可达路径：
        路径一「贪射」：CRITICAL 区间继续扣扳机，+16 直接越过 100 → 炸膛
        路径二「沸腾放置」：进入 SOLAR LIMIT 后约 0.7 秒不处理 → 太阳核心失控炸膛
     ③ 旧版枪体不随温度变色（设计稿五/二十/验收 7·26 全部落空）
        → 本版太阳左轮有独立枪模与 6 组专用材质，枪管/散热鳍/导热管/太阳核心的
          emissive 颜色与强度随 heat 从暗金 → 暗红 → 橙红 → 白热连续插值
   另补旧版完全缺失的设计稿第九条「主动散热 COOL DOWN」：长按 R 喷气散热。

   职责清单（禁止逻辑散回其他模块）：
   - fire()/release()   开火接管：积热 · SUNSHOT 蓄能与发射 · 贪射炸膛
   - updateWeapon()     Heat 衰减/沸腾/过热判定 + 热浪烟雾粒子 + 沸腾 HUD 高频刷新
   - keyR()             R 键双模：长按 = 主动散热，短按（<0.22s）= 装填
   - applyHeat()        温度驱动的枪体材质（由 player.animate 每帧调用）
   - update()           微型太阳三层视觉 / 灼热轨迹 / 环境照明 / 蒸发敌方子弹
   - sunHit()/sunBurst() SUNSHOT 命中敌人（蒸发演出，非传统爆炸）与撞墙爆发
   - clear()            换房/清场（game.cleanupDynamic 调用）
   数值常量集中在 S.K，调平衡只改这一处。 */
'use strict';
(function(){
const GB = G.GeoBuilder;

/* ===== 数值常量（单一来源，改平衡只动这里） ===== */
const K = {
  HEAT_MAX:100,      // 超过即 OVERHEAT（炸膛）
  HEAT_STEP:16,      // 每次开火积热（固定步进 → 落点可预测，是 PERFECT 技巧的前提）
  HEAT_IDLE:.95,     // 停火散热延迟（略长于射速间隔 0.909s → 连射期间零散热，落点完全可预测；停手才进入散热）
  HEAT_DECAY:8,      // 停火后每秒散热
  HEAT_VENT:34,      // 主动散热（长按 R）每秒散热：足够在沸腾期 0.59s 内退到安全区
  RELOAD_MUL:4,      // 装填期间散热倍率
  SOLAR_AT:92,       // SOLAR LIMIT：核心失控，枪体持续升温且不再自然衰减
  SOLAR_RISE:6,      // 沸腾期每秒升温（≈0.7s 决策窗口）
  PERFECT_AT:97,     // PERFECT SUNSHOT 判定：开火瞬间热量越接近极限越强
  SOLAR_RATE:2,      // 沸腾期射速倍率（枪体过载强行上膛）
  CHARGE_T:.18,      // SUNSHOT 蓄能时长（设计稿十二「非常短但明显的蓄势」）
  // 伤害档位（设计稿六，SOLAR 档被 SUNSHOT 取代）
  MUL:[[24,1],[48,1.25],[72,1.6],[92,2.2]],
  // SUNSHOT
  SUN_DMG:38, SUN_DMG_P:57,          // PERFECT ×1.5
  SUN_SPD:7,  SUN_LIFE:2.2,
  SUN_SIZE:.22, SUN_SIZE_P:.30,
  SUN_EXP_R:2.2, SUN_EXP_DMG:26,     // 撞墙/寿命终结的太阳爆发
  SUN_EXP_R_P:3.2, SUN_EXP_DMG_P:40,
  BOSS_CAP:26,                       // Boss 单次封顶（与切割刀/点唱机同一纪律）
  VENT_HOLD:.10,                     // 长按 R 进入散热的判定阈值（低于此按放开 = 装填）
  TAP_MAX:.22,                       // 按住时长 ≤ 此值算短按 → 执行装填
};

/* ===== 温度色标：暗金 → 暗红 → 橙红 → 橙黄 → 白热（设计稿五） ===== */
const BARREL_STOPS=[[0,0x3a2410,0],[24,0x8a3a10,.35],[48,0xd04010,.9],[72,0xff6018,1.9],[92,0xffa030,3.2],[100,0xfff4d0,4.6]];
const FIN_STOPS   =[[0,0x2a1a08,0],[24,0x6a2a0c,.26],[48,0xa03010,.68],[72,0xe05018,1.4],[92,0xff9030,2.4],[100,0xffe8b0,3.4]];
const PIPE_STOPS  =[[0,0x2a1a08,0],[24,0x5a2a0c,.2],[48,0x903010,.5],[72,0xc05018,1.0],[92,0xff8030,1.8],[100,0xfff0c0,2.6]];
const CORE_STOPS  =[[0,0x8a4a10,.5],[24,0xc06010,.9],[48,0xff8020,1.6],[72,0xffb040,2.6],[92,0xfff0c0,4.0],[100,0xffffff,6.0]];

function mixHex(c1,c2,t){
  const r=Math.round(((c1>>16)&255)+((((c2>>16)&255)-((c1>>16)&255))*t));
  const g=Math.round(((c1>>8)&255)+((((c2>>8)&255)-((c1>>8)&255))*t));
  const b=Math.round((c1&255)+((((c2&255)-(c1&255)))*t));
  return ((r<<16)|(g<<8)|b)&0xffffff;
}
/* 按热量在色标上插值，返回 [颜色, 自发光强度] */
function sample(stops,h){
  let a=stops[0], b=stops[stops.length-1];
  for(let i=0;i<stops.length-1;i++){
    if(h>=stops[i][0] && h<=stops[i+1][0]){ a=stops[i]; b=stops[i+1]; break; }
  }
  const t = b[0]===a[0] ? 0 : (h-a[0])/(b[0]-a[0]);
  return [mixHex(a[1],b[1],t), a[2]+(b[2]-a[2])*t];
}

/* ===== 太阳左轮专用材质（⚠️ 绝不是共享材质：emissive 随温度逐帧改写，见 H7） =====
   body 走顶点色烘焙管线（暗金机匣/黄铜护板/黑金属/深棕握把，"沉稳厚重古老"的静态底色）；
   barrel/fin/pipe/core/drum 五组由 applyHeat 逐帧驱动，是「枪体即 HEAT UI」的载体。 */
let _m=null;
function mats(){
  if(_m) return _m;
  const M=o=>new THREE.MeshStandardMaterial(Object.assign({roughness:.45,metalness:.82},o));
  _m={
    body:  new THREE.MeshStandardMaterial({vertexColors:true, roughness:.52, metalness:.72}),
    drum:  M({color:0x2e2a22, emissive:new THREE.Color(0x000000)}),
    fin:   M({color:0x8a6a2e, emissive:new THREE.Color(0x000000)}),
    pipe:  M({color:0x6b5320, emissive:new THREE.Color(0x000000)}),
    barrel:M({color:0x8a6a2e, emissive:new THREE.Color(0x000000)}),
    core:  M({color:0x8a4a10, emissive:new THREE.Color(0x8a4a10), emissiveIntensity:.5}),
    brass: M({color:0xb08a3e, roughness:.32, metalness:.92}),
  };
  return _m;
}
function resetMats(){   // 新一局复用前复位（死亡淡出会改 transparent/opacity）
  if(!_m) return;
  for(const k in _m){ _m[k].transparent=false; _m[k].opacity=1; _m[k].needsUpdate=false; }
}

/* ===== 枪模几何（模块级缓存，与 player.js 的 initGeos 同款懒加载） ===== */
let _g=null;
function geos(){
  if(_g) return _g;
  const X=r=>{ const g=new THREE.CylinderGeometry(r,r,1,10); g.rotateZ(-Math.PI/2); return g; }; // 轴向 +X 的单位长圆柱（缩放取长度）
  /* 枪身：暗金机匣 + 黄铜护板 + 黑金属配重 + 深棕握把（顶点色烘焙，不随温度变化） */
  let b=new GB();
  b.box(0,0,0,.26,.19,.19,0x6b5320);              // 机匣（暗金）
  b.box(.02,.105,0,.22,.022,.155,0xb08a3e);       // 顶部黄铜导轨
  b.box(.02,-.098,.104,.18,.02,.012,0xb08a3e);    // 侧面黄铜饰条
  b.box(.02,-.098,-.104,.18,.02,.012,0xb08a3e);
  b.box(-.10,-.16,0,.09,.15,.10,0x4a3420);        // 深棕握把
  b.box(-.17,.02,0,.07,.11,.15,0x1e1a16);         // 后端黑金属配重（太阳核心底座）
  b.box(-.06,-.10,0,.07,.11,.05,0x1e1a16);        // 底部机械件
  b.box(.12,.055,0,.05,.03,.05,0xb08a3e);         // 顶部瞄具（黄铜）
  const body=b.build();
  /* 转轮弹巢：巨大弹巢（设计稿二）——以局部 +Y 为轴建模，父节点绕 Z 转 -90° 后轴向变为 +X，
     自转改由内层绕局部 Y 旋转（等价于绕枪管轴转轮）。6 个弹巢孔在半径上均布。 */
  b=new GB();
  b.cyl(0,0,0,.098,.098,.15,0x241e16,10);         // 弹巢本体（黑金属）
  b.cyl(0,.078,0,.03,.03,.03,0xb08a3e,6);         // 轴心（黄铜）
  b.cyl(0,-.078,0,.03,.03,.03,0xb08a3e,6);
  for(let i=0;i<6;i++){                            // 6 个弹巢孔（机械转轮的可视结构）
    const a=i/6*G.TAU;
    b.box(Math.cos(a)*.062, 0, Math.sin(a)*.062, .026, .11, .026, 0x120e0a);
  }
  const drum=b.build();
  /* 太阳核心外的符文环（黑金属，静态） */
  b=new GB();
  for(let i=0;i<8;i++){
    const a=i/8*G.TAU;
    b.box(Math.cos(a)*.072, Math.sin(a)*.072, 0, .016, .016, .022, 0xb08a3e, 0, 0, a);
  }
  const rune=b.build();
  _g={body, drum, rune,
      barrel:X(.036), fins:X(.062), pipe:X(.013), muzzle:X(.05),
      core:new THREE.OctahedronGeometry(.052,0)};
  return _g;
}

/* ===== 太阳弹三层视觉池（核心纯白 + 中层金黄 + 外层橙红日冕，设计稿十三） =====
   逻辑弹道仍走 W.bullets（命中/贯穿/爆发全在武器系统内），本池只做视觉叠加。 */
const MAX_SUNFX=3;

const S = {
  K, mats, resetMats,
  _fx:[], _fxReady:false,

  /* ---------- 档位 ---------- */
  tierOf(h){ return h>=K.SOLAR_AT?'SOLAR LIMIT' : h>=72?'CRITICAL' : h>=48?'HOT' : h>=24?'WARM' : 'COOL'; },
  mulOf(h){ for(const [t,m] of K.MUL) if(h<t) return m; return 1; },
  shotSfx(h){ return h>=72?'sunCrit' : h>=48?'sunHot' : h>=24?'sunWarm' : 'sunCool'; },

  /* ---------- 枪模构建（player.mkPlayerMesh 调用，挂到 refs.sun） ---------- */
  buildGun(){
    const g=geos(), M=mats();
    const grp=new THREE.Group();
    grp.userData.bx=0;                                   // 抖动基准（沸腾期枪体失控）
    const body=new THREE.Mesh(g.body,M.body);
    const rune=new THREE.Mesh(g.rune,M.brass); rune.position.set(-.20,.02,0);
    /* 转轮：外层轴枢把局部 +Y 转到 +X（枪管方向），内层自转 = 弹巢转动 */
    const pivot=new THREE.Group(); pivot.rotation.z=-Math.PI/2; pivot.position.set(-.02,0,0);
    const spin=new THREE.Group(); spin.add(new THREE.Mesh(g.drum,M.drum)); pivot.add(spin);
    /* 加热枪管 / 散热鳍片×3 / 导热管×2 —— 温度三件套 */
    const barrel=new THREE.Mesh(g.barrel,M.barrel); barrel.scale.set(.30,1,1); barrel.position.set(.27,-.015,0);
    const finG=new THREE.Group();
    for(let i=0;i<3;i++){ const f=new THREE.Mesh(g.fins,M.fin); f.scale.set(.016,1,1); f.position.set(.19+i*.075,-.015,0); finG.add(f); }
    const pipeG=new THREE.Group();
    for(const pz of [.086,-.086]){ const p=new THREE.Mesh(g.pipe,M.pipe); p.scale.set(.24,1,1); p.position.set(.06,.078,pz); pipeG.add(p); }
    const muzzle=new THREE.Mesh(g.muzzle,M.brass); muzzle.scale.set(.05,1,1); muzzle.position.set(.435,-.015,0);
    /* 太阳核心（最高亮焦点，位于枪身后端的配重座上） */
    const core=new THREE.Mesh(g.core,M.core); core.position.set(-.20,.02,0);
    grp.add(body,rune,pivot,barrel,finG,pipeG,muzzle,core);
    grp.visible=false;
    grp.userData.refs={spin,core,barrel,finG,pipeG};
    return grp;
  },

  /* ---------- 温度视觉：枪体即 HEAT UI（设计稿五/二十） ---------- */
  applyHeat(grp, heat, t){
    if(!grp) return;
    const M=mats(), h=G.clamp(heat,0,100);
    const bs=sample(BARREL_STOPS,h), fs=sample(FIN_STOPS,h), ps=sample(PIPE_STOPS,h), cs=sample(CORE_STOPS,h);
    M.barrel.emissive.setHex(bs[0]); M.barrel.emissiveIntensity=bs[1];
    M.fin.emissive.setHex(fs[0]);    M.fin.emissiveIntensity=fs[1];
    M.pipe.emissive.setHex(ps[0]);   M.pipe.emissiveIntensity=ps[1];
    M.drum.emissive.setHex(bs[0]);   M.drum.emissiveIntensity=bs[1]*.35;   // 弹巢只透出微热
    // 太阳核心：待机呼吸 → 沸腾期高频失控闪烁
    const boiling = h>=K.SOLAR_AT;
    const breath = 1+Math.sin(t*(boiling?18:3.2))*(boiling?.35:.12);
    M.core.emissive.setHex(cs[0]);   M.core.emissiveIntensity=cs[1]*breath;
    // 沸腾期枪体抖动（设计稿二十五「Overheat：枪体抖动」的前置表现）
    grp.position.x = grp.userData.bx + (boiling ? (Math.random()-.5)*.014 : 0);
    // 转轮：温度越高机械运转越快（设计稿二十五「Heat提升：机械部件逐渐运动」）
    const r=grp.userData.refs;
    if(r && r.spin) r.spin.rotation.y += (boiling?.30:.06) + h*.0022;
    return boiling;
  },

  /* ---------- 开火接管（player.fire 调用；返回 true = 本模块已处理） ---------- */
  fire(p, w, aimAng){
    const heat=w.heat;
    // SOLAR LIMIT：太阳已上膛，本次扣扳机 = 释放 SUNSHOT（先极短蓄能）
    if(heat>=K.SOLAR_AT){
      w.chargeT=K.CHARGE_T;
      w.sunPerfect=(heat>=K.PERFECT_AT);
      w.heatIdle=0;
      w.cool=1/(w.def.rate*p.st.rateMul*K.SOLAR_RATE);
      p.recoilT=.5;
      G.audio.sfx('sunCharge',{v:.6});
      // 蓄能聚光：枪口吸入金光粒子
      for(let i=0;i<6;i++){
        const a=Math.random()*G.TAU, rr=.5+Math.random()*.5;
        G.fx.particle(p.muzzleX+Math.cos(a)*rr,.6,p.muzzleZ+Math.sin(a)*rr,
          {vx:-Math.cos(a)*3.2,vy:.2,vz:-Math.sin(a)*3.2,life:K.CHARGE_T,color:0xffd070,s0:.16,kind:'a'});
      }
      return true;
    }
    // 常规射击：固定步进积热（落点可预测 → PERFECT 是技巧而非运气）
    w.heat=heat+K.HEAT_STEP;
    w.heatIdle=0;
    w.cool=1/(w.def.rate*p.st.rateMul*(p.stormT>0?2.5:1)*(p.st.adrenal&&p.hp<=p.maxHp/2?1.4:1));
    // 贪射惩罚：热量越过极限 → 当场炸膛（OVERHEAT 真实可达路径一，设计稿十）
    if(w.heat>K.HEAT_MAX){ this.overheat(p,w,'OVERHEAT'); return true; }
    // 常规弹：伤害随温度升档（设计稿六）
    G.playerCtl.emitShot(p, w, aimAng, this.mulOf(heat));
    G.audio.sfx(this.shotSfx(heat),{v:.82});
    p.recoilT=1;
    G.fx.shake(.025+heat*.0007);                       // 温度越高后坐力越强（设计稿二十三）
    p.vx=(p.vx||0)-Math.cos(aimAng)*w.def.knock*.12*(1+heat*.004);
    p.vz=(p.vz||0)-Math.sin(aimAng)*w.def.knock*.12*(1+heat*.004);
    // 进入沸腾的提示（只提示一次，不打断操作）
    if(w.heat>=K.SOLAR_AT && !w._solarTold){
      w._solarTold=true;
      G.ui.toast('SOLAR LIMIT——打出太阳，或者炸膛');
      G.audio.sfx('sunHeartbeat',{v:.7});
    }
    if(w.heat<K.SOLAR_AT) w._solarTold=false;
    return true;
  },

  /* ---------- SUNSHOT 发射（蓄能结束，player 的 chargeT 队列分发） ---------- */
  release(p, w, aimAng){
    const perfect=!!w.sunPerfect;
    w.sunPerfect=false;
    const dmg=perfect?K.SUN_DMG_P:K.SUN_DMG;
    // 太阳之弹不消耗弹药（由太阳核心供能）：沸腾期弹匣已被核心卡死，天然只能放一次
    G.weapons.spawn({
      team:'p', x:p.muzzleX, z:p.muzzleZ, ang:aimAng, spd:K.SUN_SPD*(perfect?1.25:1),
      dmg: dmg*p.curDmgMul(), size: perfect?K.SUN_SIZE_P:K.SUN_SIZE,
      pierce:99, bounce:0, knock:7, life:K.SUN_LIFE, crit:false,
      kind:'sun', color:0xffffff, sunP:perfect, wid:w.id,
    });
    w.heat=0; w.heatIdle=0; w.ventT=0; w._solarTold=false;
    if(w.ammo<=0 && p.stormT<=0) G.playerCtl.reload(p);
    /* 演出（设计稿十二/二十二）：极强闪光 → 玩家与枪被太阳照亮 → 强震屏 */
    G.audio.sfx('sunshot',{v:1});
    G.fx.light(p.x,1.3,p.z,0xfff0c0, perfect?6:4.4, .34);
    G.fx.light(p.muzzleX,.9,p.muzzleZ,0xffffff, 5, .18);
    G.fx.ring(p.muzzleX,p.muzzleZ, perfect?1.9:1.4, 0xfff0c0, .3);
    G.fx.ring(p.muzzleX,p.muzzleZ, perfect?3.0:2.2, 0xff8030, .45);
    G.fx.screenFlash('rgba(255,238,200,'+(perfect?.5:.34)+')', perfect?.2:.15);
    G.fx.shake(perfect?.55:.4);
    G.fx.hitstop(perfect?.07:.05);
    p.recoilT=1.8;
    G.fx.dmgNum(p.x,2.0,p.z, perfect?'PERFECT SUNSHOT':'SUNSHOT', true, {scale:perfect?1.7:1.3, color:'#ffd070'});
    for(let i=0;i<(perfect?20:13);i++){
      const a=aimAng+(Math.random()-.5)*1.1, sp=3+Math.random()*5;
      G.fx.particle(p.muzzleX,.6,p.muzzleZ,{vx:Math.cos(a)*sp,vy:(Math.random()-.3)*1.4,vz:Math.sin(a)*sp,
        life:.4+Math.random()*.3,color:Math.random()<.5?0xfff0c0:0xffa030,s0:.2,kind:'a'});
    }
  },

  /* ---------- 炸膛（OVERHEAT）：轻微自伤 + 短暂失效，绝不致死（设计稿十八） ---------- */
  overheat(p, w, tag){
    w.heat=0; w.heatIdle=0; w.ventT=0; w.rHold=0; w.chargeT=null; w.sunPerfect=false; w._solarTold=false;
    w.cool=1.5;                                        // DISABLED：短暂无法攻击
    // 自伤 1（1 血时只演出不掉血——过热是"我赌输了"，不是"这武器不能玩"）
    if(p.hp>1) p.hurt(1);
    else if(G.ui.hurtFlash) G.ui.hurtFlash();
    G.audio.sfx('overheatHiss',{v:.9});
    G.fx.shake(.32); G.fx.hitstop(.04);
    G.fx.light(p.muzzleX,.8,p.muzzleZ,0xff3020,3.4,.3);
    G.fx.burst(p.muzzleX,.6,p.muzzleZ,14,{color:0xff3020,spd:3.4,life:.4,s0:.3,kind:'a'});
    G.fx.burst(p.muzzleX,.6,p.muzzleZ,8,{color:0xfff0a0,spd:4.5,life:.25,s0:.14,kind:'s'});
    G.fx.smoke(p.muzzleX,.7,p.muzzleZ,7,true);         // 大量烟雾
    for(let i=0;i<6;i++) G.fx.particle(p.muzzleX,.6,p.muzzleZ,
      {vx:(Math.random()-.5)*2,vy:1.6+Math.random(),vz:(Math.random()-.5)*2,life:.5,color:0xff5020,s0:.12,kind:'s',g:-9});
    G.fx.dmgNum(p.x,1.7,p.z,'OVERHEAT',true,{scale:1.2,color:'#ff6040'});
    G.ui.toast(tag==='BOIL'?'太阳核心失控——炸膛':('过热炸膛——'+(tag||'')));
  },

  /* ---------- R 键双模：长按散热 / 短按装填（设计稿九「主动散热」） ---------- */
  keyR(p, w, dt){
    const inp=G.input;
    if(inp.key['KeyR']){
      inp.consume('KeyR');                             // 吃掉缓冲，避免同一次按下立刻走装填
      w.rHold=(w.rHold||0)+dt;
      if(w.rHold>K.VENT_HOLD){
        w.ventT=.12;                                   // 续约（updateWeapon 每帧扣减，按住则常驻）
        w._ventFx=(w._ventFx||0)-dt;
        if(w._ventFx<=0){
          w._ventFx=.045;
          // 枪口喷出大量热气 + 蒸汽（设计稿九「左轮高速旋转、枪体散发热气」）
          G.fx.particle(p.muzzleX+(Math.random()-.5)*.2,.62,p.muzzleZ+(Math.random()-.5)*.2,
            {vx:(Math.random()-.5)*1.4,vy:1.5+Math.random(),vz:(Math.random()-.5)*1.4,life:.42,color:0xd8d0c0,s0:.24,kind:'m'});
          G.fx.particle(p.muzzleX,.6,p.muzzleZ,{vx:Math.cos(p.face)*2.2,vy:.5,vz:Math.sin(p.face)*2.2,life:.3,color:0xffa030,s0:.14,kind:'a'});
          if(Math.random()<.4) G.audio.sfx('sunVent',{v:.35});
        }
      }
    } else if(w.rHold){
      if(w.rHold<=K.TAP_MAX) G.playerCtl.reload(p);
      w.rHold=0;
    }
  },

  /* ---------- 每帧：Heat 衰减 / 沸腾升温 / 过热判定（player 武器段调用） ---------- */
  updateWeapon(p, w, dt){
    if(!w.def.sun) return;
    if(w.ventT>0){                                     // 主动散热：立即生效，无散热延迟
      w.ventT=Math.max(0,w.ventT-dt);
      w.heat=Math.max(0,w.heat-K.HEAT_VENT*dt);
      if(w.heat<=0 && !w._ventDone){ w._ventDone=true; G.audio.sfx('sunVent',{v:.5}); G.ui.toast('COOLED——枪管已冷却'); }
      if(w.heat>0) w._ventDone=false;
    } else if(w.heat>=K.SOLAR_AT){                     // SOLAR LIMIT：核心失控，持续升温
      w.heat+=K.SOLAR_RISE*dt;
      w._beatT=(w._beatT||0)-dt;
      if(w._beatT<=0){ w._beatT=.5; G.audio.sfx('sunHeartbeat',{v:.45}); }   // 低频心跳（设计稿二十一）
      if(w.heat>K.HEAT_MAX){ this.overheat(p,w,'BOIL'); return; }            // 路径二：沸腾放置 → 炸膛
      // 沸腾 HUD 高频刷新（0.15s 的常规刷新跟不上这个生死窗口）
      w._hudT=(w._hudT||0)-dt;
      if(w._hudT<=0){ w._hudT=.1; G.ui.weapon(p); }
    } else {
      w.heatIdle=(w.heatIdle||0)+dt;
      if(w.heatIdle>K.HEAT_IDLE || w.reloading)
        w.heat=Math.max(0, w.heat-K.HEAT_DECAY*(w.reloading?K.RELOAD_MUL:1)*dt);
      if(w.heat<K.SOLAR_AT) w._solarTold=false;
    }
    /* 热浪 / 烟雾 / 火花：温度越高越密（设计稿五；普通射击不产生昂贵特效，见设计稿二十八） */
    w._fxT=(w._fxT||0)-dt;
    if(w._fxT<=0){
      const mx=p.muzzleX, mz=p.muzzleZ;
      if(w.heat>=K.SOLAR_AT){
        w._fxT=.03;
        G.fx.particle(mx,.62,mz,{vx:(Math.random()-.5)*.8,vy:1.4,vz:(Math.random()-.5)*.8,life:.3,color:Math.random()<.5?0xffffff:0xfff0c0,s0:.13,kind:'a'});
      } else if(w.heat>=72){
        w._fxT=.10;
        G.fx.particle(mx,.62,mz,{vx:(Math.random()-.5)*.5,vy:1.1,vz:(Math.random()-.5)*.5,life:.55,color:0x6a6058,s0:.22,kind:'m'});
        G.fx.particle(mx,.62,mz,{vx:(Math.random()-.5)*.6,vy:1.5,vz:(Math.random()-.5)*.6,life:.3,color:0xff8030,s0:.11,kind:'a'});
      } else if(w.heat>=48){
        w._fxT=.16;
        G.fx.particle(mx,.62,mz,{vx:(Math.random()-.5)*.4,vy:1.0,vz:(Math.random()-.5)*.4,life:.4,color:0xff7020,s0:.1,kind:'a'});
      }
    }
  },

  /* ---------- SUNSHOT 命中敌人：蒸发（设计稿十五——不是传统爆炸） ---------- */
  sunHit(b, e, x, z){
    const big=!!b.sunP;
    G.fx.light(x,1.1,z,0xffffff, big?4.2:3.0, .26);       // 第一瞬间：完全被强光照亮
    G.fx.ring(x,z, big?1.5:1.0, 0xfff0c0, .3);
    G.fx.dmgNum(x,1.4,z,'VAPORIZED',true,{scale:big?1.4:1.1,color:'#ffd070'});
    G.fx.burst(x,.75,z,big?15:9,{color:0xfff4d0,spd:2.6,vy:2.8,life:.55,s0:.2,kind:'a'});  // 高温裂纹 → 光粒子
    G.fx.burst(x,.65,z,big?10:6,{color:0xff8030,spd:3.4,vy:1.5,life:.35,s0:.16,kind:'a'}); // 轮廓燃烧
    G.fx.smoke(x,.85,z,big?5:3);                                                           // 化为灰烬
    G.fx.hitstop(big?.05:.03);
    G.audio.sfx('sunEvaporate',{v:big?.8:.55});
  },

  /* ---------- 太阳撞墙 / 寿命终结：整房爆发（伤害复用爆炸链路） ---------- */
  sunBurst(x, z, big){
    const r=big?K.SUN_EXP_R_P:K.SUN_EXP_R, d=big?K.SUN_EXP_DMG_P:K.SUN_EXP_DMG;
    G.weapons.explode(x,z,r,d,'p');
    G.fx.light(x,1.4,z,0xffffff,5,.4);
    G.fx.ring(x,z,r*1.7,0xfff0c0,.45);
    G.fx.ring(x,z,r*2.5,0xff8030,.6);
    G.fx.screenFlash('rgba(255,240,205,.42)',.18);        // 极短暖色曝光，不遮挡弹幕（设计稿二十二）
    G.fx.shake(big?.5:.36);
    G.audio.sfx('sunImpact',{v:.9});
  },

  /* ---------- 太阳弹视觉同步 / 灼热轨迹 / 环境照明 / 蒸发敌方子弹（game.update 调用） ---------- */
  _mkFx(){
    const g=new THREE.Group();
    const mid=new THREE.Mesh(G.sphGeo(1,8), new THREE.MeshBasicMaterial({color:0xffc040,transparent:true,opacity:.55,
      blending:THREE.AdditiveBlending,depthWrite:false}));
    const cor=new THREE.Sprite(G.pmat(0xff8030,'a')); cor.scale.set(1.5,1.5,1);
    g.add(mid,cor); g.visible=false; G.scene.add(g);
    return {g,mid,cor,b:null};
  },
  update(dt){
    if(!G.scene) return;
    if(!this._fxReady){ for(let i=0;i<MAX_SUNFX;i++) this._fx.push(this._mkFx()); this._fxReady=true; }
    const B=G.weapons.bullets;
    // 回收已离场的太阳弹视觉
    for(const f of this._fx) if(f.b && (!f.b.on || f.b.kind!=='sun')){ f.b=null; f.g.visible=false; }
    for(let i=0;i<B.length;i++){
      const b=B[i];
      if(!b.on || b.kind!=='sun') continue;
      let f=null;
      for(const x of this._fx) if(x.b===b){ f=x; break; }
      if(!f){ for(const x of this._fx) if(!x.b){ f=x; break; } }
      if(!f) continue;
      if(!f.b){ f.b=b; f.g.visible=true; }
      const big=!!b.sunP;
      f.g.position.set(b.x,.62,b.z);
      f.mid.scale.setScalar(big?.60:.44);
      const cs=big?2.1:1.5; f.cor.scale.set(cs,cs,1);
      f.mid.rotation.y+=dt*7; f.mid.rotation.x+=dt*3;
      // 等离子触须（设计稿十三）：太阳周围不断喷出的火焰
      if(Math.random()<.75){
        const a=Math.random()*G.TAU;
        G.fx.particle(b.x,.6,b.z,{vx:Math.cos(a)*1.6,vy:.8+Math.random(),vz:Math.sin(a)*1.6,
          life:.28,color:Math.random()<.5?0xffd070:0xff8030,s0:.15,kind:'a'});
      }
      // 灼热轨迹：金白热痕 + 地面高温余烬（设计稿十六「短暂留下灼热轨迹」）
      G.fx.particle(b.x,.5,b.z,{vx:0,vy:.2,vz:0,life:.3,color:Math.random()<.5?0xfff0a0:0xffa030,s0:b.size*1.1,kind:'a'});
      if(Math.random()<.5) G.fx.particle(b.x,.08,b.z,{vy:.25,life:.7,color:0xc04010,s0:.18,kind:'m'});
      // 环境照明：太阳真的在这个场景里存在了一瞬间（设计稿二十二）
      G.fx.holdLight('sun'+i, b.x,.9,b.z, 0xfff0c0, big?3.4:2.4);
      this.evaporate(b);
    }
  },
  /* 敌方子弹接触太阳 → 直接被蒸发（设计稿十六：高级用途） */
  evaporate(b){
    const B=G.weapons.bullets;
    for(let i=0;i<B.length;i++){
      const o=B[i];
      if(!o.on || o.team!=='e' || o===b) continue;
      if(G.dist2(b.x,b.z,o.x,o.z) < 1.2*1.2){
        o.on=false; o.mesh.visible=false; if(o.glow) o.glow.visible=false;
        G.fx.sparks(o.x,.55,o.z,0xfff0c0);
        G.fx.particle(o.x,.6,o.z,{vy:1.3,life:.3,color:0xffd070,s0:.16,kind:'a'});
      }
    }
  },

  /* ---------- 清场（game.cleanupDynamic 调用） ---------- */
  clear(){
    for(const f of this._fx){ f.b=null; if(f.g) f.g.visible=false; }
  },
};

G.sunrevolver = S;
})();
