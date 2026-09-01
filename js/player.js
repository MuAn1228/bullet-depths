/* 弹膛深渊 - 玩家：移动/翻滚/射击/装填/交互/拾取/构筑 */
'use strict';
(function(){
const GB = G.GeoBuilder;
const inpPressedOrBuffered = code => G.input.pressed[code] || G.input.buffered(code);

let _torsoGeo=null, _headGeo=null, _legGeo=null, _armRGunGeo=null, _armLGeo=null, _capeGeo=null, _gunGeo=null;

/* ---------- 主角「VEX-07 · 深渊行者」造型 ----------
   ⚠️ 模型 forward = +X（模型正前方）：根节点 rotation.y = -face 即可让面部/枪口
   严格对齐瞄准方向，无任何魔法角度。配色沿用项目主色（深青装甲 + 暗钢 +
   橙色警示件 + 青色能量件），保证与全场景美术统一。 */
const PC = { main:0x27716a, main2:0x3fa89c, dark:0x22303a, dark2:0x1a2530,
             steel:0x8a94a0, steel2:0x4a5560, orange:0xe88030, energy:0x50f0e0,
             scarf:0xc8503a, scarf2:0xa83c28, boot:0x16222b };

function initGeos(){
  if(_torsoGeo) return;
  let b=new GB();
  /* 躯干（轴枢=髋部上沿） */
  b.box(.01,.16,0,.36,.34,.42,PC.main);            // 胸甲主体
  b.box(.13,.28,0,.2,.18,.36,PC.main2);            // 上胸斜甲
  b.box(.15,.36,0,.1,.07,.2,PC.steel2);            // 领口
  b.box(.18,.12,0,.1,.16,.16,PC.dark2);            // 反应堆凹槽
  b.box(.21,.12,0,.05,.1,.1,PC.energy);            // 胸口能量核心
  b.box(-.04,-.06,0,.28,.16,.34,PC.dark);          // 腹甲
  b.box(-.13,-.17,0,.12,.1,.4,PC.steel2);          // 腰带
  b.box(-.18,-.17,0,.03,.1,.1,PC.orange);          // 腰扣（橙色警示）
  b.box(-.16,.16,0,.16,.28,.3,PC.dark);            // 背部背包
  b.box(-.25,.14,.1,.05,.22,.05,PC.energy);        // 背挂能量罐 L
  b.box(-.25,.14,-.1,.05,.22,.05,PC.energy);       // 背挂能量罐 R
  b.box(-.25,.34,.06,.02,.18,.02,PC.steel,0,0,.3); // 背包天线（后倾）
  b.box(.02,.32,-.3,.24,.15,.26,PC.steel);         // 肩甲 R
  b.cone(.06,.42,-.3,.05,.12,PC.orange,4);         // 肩刺 R
  b.box(.02,.32,.3,.24,.15,.26,PC.steel);          // 肩甲 L
  b.cone(.06,.42,.3,.05,.12,PC.orange,4);          // 肩刺 L
  b.box(-.12,-.26,0,.09,.12,.32,PC.dark2);         // 后腰裙甲
  _torsoGeo=b.build();

  b=new GB();
  /* 头部（轴枢=颈部）：全覆式头盔 + 发光目镜 + 顶脊 + 天线 */
  b.box(0,.1,0,.28,.3,.3,PC.main);                 // 盔体
  b.box(-.02,.27,0,.32,.06,.1,PC.steel);           // 顶脊
  b.box(.15,.09,0,.07,.18,.24,PC.dark2);           // 面罩框
  b.box(.19,.09,0,.03,.06,.18,PC.energy);          // 发光目镜条（正面 +X）
  b.box(.13,-.05,0,.09,.09,.2,PC.steel2);          // 下颚护
  b.box(-.02,.1,.17,.05,.12,.05,PC.steel2);        // 耳块 L
  b.box(-.02,.1,-.17,.05,.12,.05,PC.steel2);       // 耳块 R
  b.box(-.04,.28,-.12,.02,.12,.02,PC.orange,0,0,.35); // 天线（橙色）
  b.box(-.15,.1,0,.05,.2,.2,PC.dark);              // 脑后甲
  _headGeo=b.build();

  b=new GB();
  /* 腿（轴枢=髋部，左右共用同一几何，靠 z 镜像摆放） */
  b.box(0,-.09,0,.15,.2,.16,PC.dark);              // 大腿
  b.box(.05,-.16,0,.07,.09,.12,PC.steel);          // 膝甲
  b.box(-.02,-.26,0,.13,.13,.14,PC.dark2);         // 小腿
  b.box(0,-.35,0,.16,.08,.17,PC.boot);             // 靴
  b.box(.1,-.36,0,.08,.05,.14,PC.steel2);          // 靴尖
  _legGeo=b.build();

  b=new GB();
  /* 右臂（持枪臂，轴枢=肩部） */
  b.box(0,-.07,0,.14,.18,.14,PC.main);             // 上臂
  b.box(.07,-.17,0,.09,.09,.1,PC.steel2);          // 肘
  b.box(.17,-.2,0,.2,.09,.1,PC.dark);              // 前臂
  b.box(.29,-.2,0,.07,.09,.1,PC.steel2);           // 手
  _armRGunGeo=b.build();

  b=new GB();
  /* 左臂（扶枪托副手，向内前伸） */
  b.box(0,-.06,-.02,.14,.18,.14,PC.main,.35);      // 上臂（绕 Y 内旋，伸向枪身）
  b.box(.16,-.16,-.08,.2,.09,.1,PC.dark,.4);       // 前臂
  b.box(.27,-.18,-.11,.07,.09,.09,PC.steel2);         // 手
  _armLGeo=b.build();

  b=new GB();
  /* 披风/围巾（轴枢=后颈，向 -X 背后垂落） */
  b.box(-.1,.34,0,.16,.1,.22,PC.scarf);            // 颈巾结
  b.box(-.17,.14,0,.07,.4,.3,PC.scarf);            // 披风上段
  b.box(-.2,-.14,0,.06,.26,.26,PC.scarf2);         // 披风下段
  _capeGeo=b.build();

  b=new GB();
  /* 武器（放在右手中，枪管指向 +X；updateGunVisual 按武器类型拉伸枪身） */
  b.box(0,0,0,.36,.1,.1,PC.dark2);                 // 机匣
  b.box(.27,.005,0,.24,.05,.05,PC.steel);          // 枪管
  b.box(.4,0,0,.06,.08,.08,PC.boot);               // 枪口制退器
  b.box(-.09,-.11,0,.08,.14,.09,PC.steel2);        // 握把
  b.box(-.02,-.12,0,.07,.12,.06,PC.steel);         // 弹匣
  b.box(0,.08,0,.16,.04,.04,PC.orange);            // 瞄具
  b.box(.05,.045,.052,.2,.02,.012,PC.energy);      // 侧面能量条
  b.box(.05,.045,-.052,.2,.02,.012,PC.energy);     // 侧面能量条
  _gunGeo=b.build();
}

function mkPlayerMesh(){
  initGeos();
  const M=G.vcolMat;
  const g=new THREE.Group();        // 根节点：位置=逻辑坐标，rotation.y=-face（forward=+X）
  const rollG=new THREE.Group();    // 翻滚轴枢：抬到角色中心，翻滚绕自身质心翻转
  rollG.position.y=.55; g.add(rollG);
  const bodyG=new THREE.Group();    // 视觉主体：呼吸/移动起伏作用在这层
  bodyG.position.y=-.55; rollG.add(bodyG);
  const torso=new THREE.Mesh(_torsoGeo,M); torso.castShadow=true; torso.position.y=.62;
  const head=new THREE.Mesh(_headGeo,M); head.castShadow=true; head.position.y=1.02;
  const legL=new THREE.Mesh(_legGeo,M); legL.position.set(0,.42,.12); legL.castShadow=true;
  const legR=new THREE.Mesh(_legGeo,M); legR.position.set(0,.42,-.12); legR.castShadow=true;
  const cape=new THREE.Mesh(_capeGeo,M); cape.castShadow=true; cape.position.y=.64;
  // 右臂组（轴枢=肩）：枪作为手臂子节点 → 后坐力/换弹联动整条手臂，"真的端着枪"
  const armR=new THREE.Group(); armR.position.set(.02,.78,-.27);
  const armRMesh=new THREE.Mesh(_armRGunGeo,M); armRMesh.castShadow=true; armR.add(armRMesh);
  const gun=new THREE.Group(); gun.position.set(.24,-.2,.02); gun.rotation.y=.08;
  const gunMesh=new THREE.Mesh(_gunGeo,M); gunMesh.castShadow=true; gun.add(gunMesh);
  armR.add(gun);
  const armL=new THREE.Mesh(_armLGeo,M); armL.position.set(.02,.78,.27); armL.castShadow=true;
  // 目镜辉光（正面 +X，帮助玩家在 320p 下辨认朝向）
  // 注意：辉光/随身光坐标是 body 空间（bodyG 原点即世界脚底），必须挂在 bodyG 上，
  // 挂到 rollG 会整体抬高 0.55（辉光飘到头顶上方）
  const glow=new THREE.Sprite(G.pmat(0x50f0e0)); glow.scale.set(.34,.34,1); glow.position.set(.2,1.11,0);
  // 随身存在光（微弱青白）+ 背后轮廓补光（蓝色 rim，让角色在暗处保持剪影可读）
  const light=new THREE.PointLight(0x7de8d8,.55,6,2); light.position.set(0,1.3,0);
  const rim=new THREE.PointLight(0x4a80ff,.35,4.5,2); rim.position.set(-1,1.3,0);
  bodyG.add(torso,head,legL,legR,cape,armR,armL,rim,glow,light);
  return {group:g, roll:rollG,
          refs:{body:bodyG, torso, head, legL, legR, cape, armR, armL, gun, gunMesh, glow, light}};
}

function createPlayer(x,z){
  const {group, roll, refs} = mkPlayerMesh();
  const p = {
    x,z, r:.34, hp:6, maxHp:6, armor:0, maxArmor:0, armorRegenT:0,
    money:20, keys:0, dead:false,
    weapons:[], curW:0, passives:[], active:null, activeCd:0,
    st:{ dmgMul:1, rateMul:1, reloadMul:1, speedMul:1, bulletSpdMul:1, bounce:0, pierce:0,
         crit:0, luck:0, magnetMul:1, thorns:0, pelletAdd:0, adrenal:false, berserk:false, vamp:0, moneyMul:1 },
    rollT:0, rollCd:0, rollDur:.26, rollAng:0, invulnT:0, ghostT:0, stormT:0, shieldCharge:0, berserkT:0, slowT:0,
    flashT:0, skillT:0, deadT:0, _stepT:0, _flashOn:false,
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
          life:.3+Math.random()*.15, color:Math.random()<.5?0x50f0e0:0xa0fff0, s0:.16, kind:'a'});
      }
      if(Math.random()<.5){
        G.fx.particle(p.x,.12,p.z,{vx:(Math.random()-.5),vy:.2,vz:(Math.random()-.5),life:.35,color:0x30c0b0,s0:.22,kind:'m'});
      }
      // 拖尾点光：高速移动的能量辉光
      G.fx.holdLight('rollTrail', p.x,.5,p.z, 0x40e8d8, 1.3);
      // 残影：翻滚 40%/75% 进度处各留一个渐隐青色残影环
      if(!p._ghostMarks) p._ghostMarks={};
      for(const mk of [0.4,0.75]){
        if(k>=mk && !p._ghostMarks[mk]){
          p._ghostMarks[mk]=true;
          G.fx.ring(p.x,p.z,.55,0x50f0e0,.32);
          G.fx.particle(p.x,.5,p.z,{vy:.8,life:.25,color:0x50f0e0,s0:.3,kind:'a'});
        }
      }
      if(p.rollT<=0){
        p.rollG.rotation.z=0;   // 复位翻滚翻转（新模型 forward=+X，翻滚绕 Z 轴）
        p._ghostMarks=null;
        // 落定冲击：小范围青色冲击环 + 尘埃
        G.fx.ring(p.x,p.z,1.0,0x50f0e0,.3);
        G.fx.burst(p.x,.15,p.z,5,{color:0x30c0b0,spd:2,vy:.6,life:.3,s0:.16,kind:'m'});
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
        G.audio.sfx('roll');
        // 起跳爆发：青色能量闪光 + 冲击环
        G.fx.light(p.x,.6,p.z,0x50f0e0,1.6,.22);
        G.fx.ring(p.x,p.z,.7,0x50f0e0,.28);
        G.fx.burst(p.x,.2,p.z,6,{color:0x50f0e0,spd:2.5,vy:.7,life:.3,s0:.15,kind:'a'});
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
          // 滚轮按方向循环（BUG-003：原先忽略 ±方向，上下滚都是 +1）
          p.curW=(p.curW+(wheel>0?1:n-1))%n;
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
      G.fx.ring(p.x,p.z,.9,0x50f0e0,.32);
      G.fx.light(p.x,1,p.z,0x50f0e0,1.5,.28);
      G.fx.particle(p.x,1.2,p.z,{vy:1.2,life:.35,color:0x50f0e0,s0:.4,kind:'a'});
    }
    this.updateGunVisual(p);
    this.animate(p,dt,aimAng);
    this.pickups(p,dt);
    this.interactScan(p);
  },

  /* 单发弹道与反馈（burst 续发共用） */
  emitShot(p,w,aimAng){
    const def=w.def;
    if(p.stormT<=0) w.ammo--;
    G.weapons.spawnPlayer(p,aimAng,def);
    G.audio.sfx(def.sfx,{v:.8});
    G.fx.light(p.muzzleX,.7,p.muzzleZ, def.color, 1.6,.09);
    // 枪口闪光：大光斑 + 侧向火舌（短命高亮，现代射击观感）
    G.fx.particle(p.muzzleX,.6,p.muzzleZ,{vx:Math.cos(aimAng)*1.2,vy:.3,vz:Math.sin(aimAng)*1.2,life:.08,color:def.color,s0:.5,kind:'a'});
    const side=aimAng+Math.PI/2;
    G.fx.particle(p.muzzleX,.6,p.muzzleZ,{vx:Math.cos(side)*(1.2+Math.random()),vy:.2,vz:Math.sin(side)*(1.2+Math.random()),life:.07,color:def.color,s0:.22,kind:'a'});
    G.fx.particle(p.muzzleX,.6,p.muzzleZ,{vx:-Math.cos(side)*(1.2+Math.random()),vy:.2,vz:-Math.sin(side)*(1.2+Math.random()),life:.07,color:def.color,s0:.22,kind:'a'});
    G.fx.particle(p.muzzleX,.6,p.muzzleZ,{vx:Math.cos(aimAng)*3,vy:.5,vz:Math.sin(aimAng)*3,life:.12,color:def.color,s0:.3});
    // 喷火器：枪口锥形火焰束
    if(def.flame){
      for(let k=0;k<4;k++){
        const a2=aimAng+(Math.random()-.5)*.4;
        G.fx.particle(p.muzzleX,.5+Math.random()*.3,p.muzzleZ,{
          vx:Math.cos(a2)*(3.5+Math.random()*3), vy:.35, vz:Math.sin(a2)*(3.5+Math.random()*3),
          life:.22, color:k%2?0xffa030:0xff5020, s0:.3, kind:'a'});
      }
    }
    G.fx.particle(p.x-Math.sin(aimAng)*.3,.55,p.z+Math.cos(aimAng)*.3,{
      vx:-Math.sin(aimAng)*(1.5+Math.random()), vy:2.5, vz:Math.cos(aimAng)*(1.5+Math.random()),
      life:.5,color:0xd8b040,kind:'s',s0:.08,g:-9});
    if(w.ammo<=0 && p.stormT<=0) this.reload(p);
  },

  fire(p,w,aimAng){
    const def=w.def;
    w.cool=1/(def.rate*p.st.rateMul*(p.stormT>0?2.5:1)*(p.st.adrenal&&p.hp<=p.maxHp/2?1.4:1));
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
    if(!w){ gm.visible=false; return; }
    gm.visible=true;
    const len = w.def.rocket?1.5 : w.def.shotgun?1.2 : w.def.laser?.9 : w.def.plasma?1.1 : 1;
    const th  = (w.def.rocket||w.def.shotgun)?1.35 : 1;   // 重型武器整体加粗
    gm.scale.set(len,th,th);
    if(!gm.userData.tinted||gm.userData.tinted!==w.def.color){
      gm.material=G.vcolMat;
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

    /* ===== 死亡演出：后仰倒地 + 沉降定格 ===== */
    if(p.dead){
      p.deadT+=dt;
      const k=Math.min(1,p.deadT*3);
      p.rollG.rotation.z=k*Math.PI/2;           // 向后倒（+X 被抬向上 → 仰面）
      p.rollG.position.y=.55-(1-Math.min(1,p.deadT*1.5))*.15;
      r.body.position.y=-.55; r.torso.rotation.z=0; r.armR.rotation.z=0;
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

    /* ===== 移动/待机动画 ===== */
    if(p.moving) p.walkT+=dt*10;
    const sw=Math.sin(p.walkT)*.55*(p.moving?1:0);
    r.legL.rotation.z=sw;  r.legR.rotation.z=-sw;                 // 腿部前后摆动（forward=+X → 绕 Z 摆）
    r.armL.rotation.z=-sw*.4;                                     // 副手自然摆
    // 身体起伏（移动弹跳 / 待机呼吸）
    r.body.position.y=-.55+Math.abs(Math.sin(p.walkT))*.045*(p.moving?1:0)
                      +(p.moving?0:Math.sin(p.t*2.4)*.012);
    // 躯干：移动前倾 + 射击后坐仰起
    r.torso.rotation.z=-.07*(p.moving?1:0) + p.recoilT*.14;
    // 头部：随移动轻微点动 + 待机缓慢扫视（始终朝 +X，不偏离瞄准方向）
    r.head.rotation.z=Math.sin(p.walkT*2)*.05*(p.moving?1:0)+Math.sin(p.t*1.7)*.03;
    // 披风：跑动时向后上方飘摆
    r.cape.rotation.z=-.12-(p.moving?.14:0)-Math.sin(p.t*(p.moving?11:3.4))*.1;
    // 持枪臂：射击后坐（整臂连同枪向后上抬）+ 换弹时枪口下垂
    let armKick=p.recoilT*.16;
    if(p.weapons[p.curW]&&p.weapons[p.curW].reloading){
      const total=p.weapons[p.curW].def.reload*p.st.reloadMul;
      const ph=1-Math.max(0,p.weapons[p.curW].reloadT)/total;
      armKick-=Math.sin(ph*Math.PI)*.85;                          // 换弹：手臂下压再收回
    }
    r.armR.rotation.z=armKick;
    r.gun.position.x=.24-p.recoilT*.06;                           // 枪身短促后挫

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

    /* ===== 辉光状态机：翻滚(能量冲刺) > 技能涌动 > 幽灵化 > 默认目镜脉冲 ===== */
    if(p.rollT>0){
      const gs=1.1+Math.sin(p.t*20)*.25;
      r.glow.material=G.pmat(0x50f0e0);
      r.glow.scale.set(gs,gs,1);
    } else if(p.skillT>0){
      const gs=1+Math.sin(p.skillT*22)*.3;
      r.glow.material=G.pmat(0xa0fff0);
      r.glow.scale.set(gs,gs,1);
    } else if(p.ghostT>0){
      r.glow.material=G.pmat(0x8fd0ff);
      r.glow.scale.set(.9,.9,1);
    } else {
      r.glow.material=G.pmat(0x50f0e0);
      r.glow.scale.set(.34+Math.sin(p.t*3)*.05,.34+Math.sin(p.t*3)*.05,1);
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
      p.shieldCharge--;
      G.audio.sfx('shield');
      G.fx.ring(p.x,p.z,1.2,0x8fd0ff,.3);
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
    G.fx.blood(p.x,.6,p.z,0xc03028);
    p.flashT=.12;   // 受击闪白（与敌人同款 flashMat 换装机制）
    p.invulnT=.9;
    if(p.hp<=0){
      p.hp=0; p.dead=true; p.deadT=0;
      G.fx.poof(p.x,.6,p.z,0xc03028);
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
