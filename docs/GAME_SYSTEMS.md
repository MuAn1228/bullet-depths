# GAME\_SYSTEMS.md — 各游戏系统详解

> 面向需要改动具体玩法的 Agent。行号基于 2026-09-01 代码状态。
> 本文档描述"是什么"；"为什么不能改"见 `HIGH_RISK_AREAS.md`。

***

## 1. 玩家系统（`player.js`）

### 1.0 角色模型与朝向系统（2026-09-01 VOID HUNTER 重做）

**主角「VOID HUNTER · 虚空猎手」**，全程序化建模（`mkPlayerMesh`，按 5 层专用
PBR 材质分几何构建，几何定义 `player.js` initGeos）：

- 视觉语言：**深黑哑光装甲 + 半金属机械件 + 高反射金属边缘 + 蓝紫发光能量 + 深灰布料披风**
  （Void Hunter 定位；替代早前的 VEX-07 深青+橙配色）。
  ⚠️ **2026-09-01 晚间起配色转正为用户选定的彩虹纯色方案**：躯干红 / 头绿 / 左腿黄 /
  右腿青 / 右臂紫 / 披风蓝 / 能量碎片白（纯色材质，兼容受击闪白 traverse 机制）——
  造型剪影与下方材质分层体系不变，仅颜色值更换。

- 材质分层（`pmats()`，玩家专用 MeshStandardMaterial 单例，**绝不是共享材质**，
  emissive/opacity 动画只影响玩家）：armor(哑光 r.85/m.2) / mech(半金属 r.42/m.72) /
  edge(亮金属 r.26/m.92) / cloak(布料 r.97) / energy(emissive 0x2c40e8，强度呼吸脉动；
  强度压低避免 ACES 过曝发白)。⚠️ 新一局必须 `resetPmats()` 复位死亡淡出的 opacity。

- 结构（剪影优先——320p 俯视角下角色辨识度靠轮廓而非材质细节）：
  **箭头形头盔**（俯视菱形，前尖指向瞄准方向）+ 前檐目镜缝 / 楔形躯干（上宽下窄）+
  竖条能量核心 / **V 形外旋肩甲**+金属前缘 / 背包 + 双能量罐 / 短款三段链式披风
  （递延摆动+惯性侧摆）/ **双手前伸端枪姿态**（顶视角射击游戏角色第一辨识特征）/
  3 片悬浮能量碎片（绕身公转）。

- 节点层级：`group(位置+rotation.y) → rollG(翻滚轴枢,y=.55) → bodyG(呼吸/起伏, y=-.55)
  → [torso, head, legL, legR, cape(→capeSeg×3), armR(→gun), orbits, rim光, glow, light]`。
  （副手手臂 armL 已于 2026-09-01 晚间移除）
  ⚠️ 辉光/灯的坐标是 body 空间，**必须挂** **`bodyG`**——挂 `rollG` 会整体抬高 0.55。

- **forward 约定：模型正前方 = 本地 +X**（目镜缝/能量核心在 +X 侧，披风在 -X 背后）。

- **朝向链路**：鼠标屏幕坐标 → `game.js updateCamera` 射线与 y=0.55 平面求交 →
  `G.input.aimX/aimZ`（⚠️ 有 `isFinite` 守卫，见 FIX-024）→ `P.update` 计算
  `face=G.angTo(...)`（`animate` 统一驱动）→ `mesh.rotation.y = -face`。
  **无任何魔法角度**：面部/身体正前方 = 武器瞄准方向 = 鼠标世界方向。

- 枪口世界位置 `muzzleX/Z = p.x/z + cos/sin(face)*.62`，与视觉枪管位置一致。

- 普通武器枪身 gunMesh 的涂装**烘焙进 \_gunGeo 顶点色**（橙身/紫管弹匣/金口瞄具/青能量条），
  材质保持 `pmats().mech`（vertexColors 管线）以兼容受击闪白与死亡淡出。⚠️ 不要在
  updateGunVisual 里重新赋材质颜色——会覆盖顶点色（「黑棍」Bug 根因，见 DEVELOPMENT\_LOG 2026-09-01 晚间条目）。

- 能量脉动状态机（animate）：待机呼吸 → 移动增强 → 受击爆发；翻滚/技能/幽灵态覆盖；
  辉光 sprite（目镜可读性）与 energy 材质 emissive 同步驱动。

- 死亡演出：能量失控闪烁（\~0.55s）→ 爆发（hurt() 里 burst/ring/light）→
  玩家专用材质整体淡出 + 碎片上升（animate 死亡分支）→ 1.8s 后隐藏。

- 回归锁：自测步骤 39（8 方向收敛 / 平滑转身 / 射线 NaN 守卫 / 辉光贴头部）、
  步骤 31（翻滚中辉光为蓝紫）。

### 1.1 对象字段（`player.js:306-325`）

```js
{
  x, z, r:.34,
  hp:6, maxHp:6, armor:0, maxArmor:0, armorRegenT:0,
  money:20, keys:0, dead:false,
  weapons:[], curW:0, passives:[], active:null, activeCd:0,
  st: {                       // 16 个属性，全部由 items.js 的 apply() 写入
    dmgMul:1, rateMul:1, reloadMul:1, speedMul:1, bulletSpdMul:1,
    bounce:0, pierce:0, crit:0, luck:0, magnetMul:1, thorns:0,
    pelletAdd:0, adrenal:false, berserk:false, vamp:0, moneyMul:1
  },
  rollT:0, rollCd:0, rollDur:.26, rollAng:0,
  invulnT:0, ghostT:0, stormT:0, shieldCharge:0, berserkT:0, slowT:0,
  flashT/skillT/deadT/_stepT/_flashOn/_lastX/_lastZ/_eTrailT/_eGlow（受击闪白、死亡演出、能量拖尾与脉动）,
  aimX, aimZ, face:0, walkT:0, moving:false, recoilT:0, reloadHud:0, t:0,
  mesh, rollG, refs:{body,torso,head,legL,legR,cape,capeSeg,armR,gun,gunMesh,glow,
        light,orbits,cam,camShutter,camCrank},  // cam*=拍立得武器相机模型
  muzzleX, muzzleZ,
  方法: heal / addHeartContainer / hurt / addKeys / addMoney / giveWeapon / curDmgMul
}
```

### 1.2 移动与碰撞

**圆形体 + 分轴推进**，实现在 `G.moveEntity`（`gen.js:413-448`），**不在 player.js**：

- 半径 `r=.34`（敌人默认 `.35`）

- 先解 X 轴、再解 Z 轴，每轴只采样**前缘所在的 1 列 tile**，命中则吸附到墙面（留 `.02` 余量）

- **不做扫掠** → 单帧位移 ≥ 1 tile 会穿墙。目前最高速是 Boss 冲撞 9 u/s，依赖帧率留安全裕度

- 最后对**全量** **`G.props`** 做圆形推出（`gen.js:438-447`），推出后**不回检墙体**

走速：`4.3 * st.speedMul`，减速时 `*.55`，`adrenal` 半血时 `*1.4`。

### 1.3 翻滚闪避（`player.js:144-157`）

| 项    | 值                                                      |
| ---- | ------------------------------------------------------ |
| 触发   | `Space`（支持 0.18s 输入缓冲），`rollCd<=0`                     |
| 位移速度 | 常量 14（注释："短促高速翻滚：更快更跟手"）                               |
| 持续   | `rollT = rollDur = .26` 秒                              |
| 冷却   | `rollCd = .42` 秒（注释："后摇仅 0.16s，可快速连续翻滚"）               |
| 无敌   | `invulnT = max(invulnT, .24)` —— **比翻滚本身短，翻滚结束后无额外无敌** |
| 方向   | 有移动输入用移动方向，否则用瞄准方向                                     |
| 免伤   | `rollT>0` 期间 `P.hurt` 直接 return（`player.js:408`）       |

翻滚中播放拖尾与两个残影环（40% / 75% 进度处）。

### 1.4 受伤流程（`player.js:407-438`）

```
dead || invulnT>0 || rollT>0 || ghostT>0  → return
shieldCharge>0  → 消耗 1 层护盾，return
armor>0         → armor--，armorRegenT=12，invulnT=.5，return
hp -= dmg；run.dmgTaken += dmg
berserk → berserkT=5
hurtFlash / hearts / sfx / shake(.4) / hitstop(.05)
击退 vx,vz += cos/sin(ang)*5
invulnT=.9
hp<=0 → dead=true, G.game.loseRun()
```

护甲每 12 秒自动回 1 点（`player.js:91`）。

### 1.5 状态管理

**没有显式状态机**，全部由并行倒计时标量表达，在 `P.update` 开头统一递减：
`rollT`（翻滚）、`invulnT`（无敌）、`ghostT`（幽灵）、`stormT`（弹药风暴）、
`berserkT`（狂暴）、`slowT`（减速）、`w.reloading`（装填）、`w.burstLeft`（三连发排队）、
`shieldCharge`（护盾层数，非计时）。

互斥关系只有一条：**翻滚 > 常规移动**。其余完全并行（装填中可翻滚，翻滚中可切枪）。

***

## 2. 武器系统（`weapons.js`）

### 2.1 定义表 `W.defs` —— 共 **19 种**

字段全集：
`name / tier / dmg / rate(发每秒) / mag / reload(秒) / spread(弧度) / pellets / speed / range / size / pierce / bounce / knock / color / sfx / price`

- 可选机制标志：
  `laser / plasma / rocket / homing / rail / frost / arc / burst+burstGap / chain+chainFade / splash+splashDmg / polaroid+cone / paper / hairdryer / dice`
  （paper/hairdryer 为 09-03 新增：纸飞机加速回航、吹风机风推；
  `kind:'vinyl' + jukebox:true` 为点唱机的黑胶弹标记——弹射/共振吸附/网络构建详见 §2.10；
  `dice:true` 为悖论骰子的掷骰接管标记——真 3D 骰体/掷骰结算/PARADOX 崩坏详见 §2.11；
  泡面叉曾上线后因品质问题于同日下架待重做；悖论骰子已于 2026-09-04 重做重新上线；
  切割刀与太阳左轮已于 2026-09-04 应需求整体下架删除（代码/音效/图标/测试全链移除），
  下架记录存 `WEAPON_BATCH_HANDOFF.md` 与 git 历史）

品阶（`weapons.js:29`）：

```
D: rusty, paperplane, hairdryer
C: smg, shotgun, ricochet
B: rifle, laser, hive, burst
A: plasma, rocket, rail, frost, arc, polaroid, gambler, jukebox, dice
```

**统一定价（单一来源，`weapons.js:30`）**：售价 = `TIER_PRICE[品阶] × 特修系数`（特修由
`def.price` 确定性映射 ±6%，保证同阶有层次、跨阶绝不倒挂：D 17 / C 39-42 / B 71-78 /
A 122-138 弹壳）。**任何地方标武器价必须走** **`W.priceOf(def)`**，禁止手写价格。
`def.blurb` 是每把武器的一句话特效简介（武器数据的一部分，商店详情直接引用）。

三个代表：

```js
rocket: { name:'毁灭者火箭筒', tier:'A', dmg:26, rate:0.8, mag:1, reload:1.9, spread:0, pellets:1,
          speed:9.5, range:14, size:.3, pierce:0, bounce:0, knock:9, color:0xff7040, sfx:'rocket',
          price:50, rocket:true, splash:2.4, splashDmg:16 },

burst:  { name:'三连发卡宾', tier:'B', dmg:5, rate:4.2, mag:21, reload:1.4, spread:.03, pellets:1,
          speed:19, range:14, size:.13, pierce:1, bounce:0, knock:2, color:0xd0ff90, sfx:'rifle',
          price:38, burst:3, burstGap:.07 },

polaroid:{ name:'薛定谔的拍立得', tier:'A', dmg:6, rate:1.11, mag:4, reload:1.5, spread:0, pellets:1,
          speed:0, range:7.5, size:.2, pierce:99, bounce:0, knock:0, color:0xfff2d0, sfx:'shutter',
          price:56, polaroid:true, cone:1.25 },
```

### 2.2 特殊机制实现位置

| 机制    | 字段                      | 实现                                                             |
| ----- | ----------------------- | -------------------------------------------------------------- |
| 弹跳    | `bounce`                | `weapons.js:241-250`，子步内试探单轴翻转判法线                              |
| 穿透    | `pierce`                | `b.hits:Set` 去重，`weapons.js:276/288/299`                       |
| 追踪    | `homing`                | `weapons.js:211-220`，搜索半径 7 米                                  |
| 冰霜    | `frost`                 | 命中 `e.slowT=2`，减速到基础速度 45%                                     |
| 磁轨    | `rail` + `pierce:99`    | 无专属逻辑，只影响外观与拖尾                                                 |
| 电弧链   | `arc`                   | `W.chainLightning`（`weapons.js:120-142`），**跳数/衰减硬编码 3 / .72**  |
| 三连发   | `burst:3, burstGap:.07` | `player.js:439-447` 排队与续发                                      |
| 拍立得   | `polaroid` + `cone`     | 开火分流 `weapons.js:94` → `G.photo.fire`，**不走子弹池**，全套机制见 2.4      |
| 赌徒的灾难 | `gambler`               | 开火分流 `weapons.js:96` → `G.gambler.release`，**不走子弹池**，全套机制见 2.6 |
| 悖论骰子   | `dice`                 | 开火分流 `weapons.js`（def.dice）→ `G.dice.fire/release`，**不走子弹池**，全套机制见 2.13 |

### 2.3 武器运行时实例

```js
// weapons.js:39
W.mktWeapon = id => ({ def: Object.assign({}, W.defs[id]),
                       ammo: def.mag, cool:0, reloading:false, reloadT:0,
                       burstLeft:0, burstT:0 });
```

`def` 是**浅拷贝**，`ammo/cool/burstLeft` 是每实例状态。

### 2.4 【薛定谔的拍立得】武器系统（`photo.js`，2026-09-01 新增）

原创武器 tier A：`dmg 6 / rate 1.11 / mag 4 / reload 1.5 / price 56`（`weapons.js:21`；
rate 1.11 = 射击间隔 0.9s，2026-09-02 手感调整自 0.55/1.7 放宽）。
**不走子弹池**：开火时 `weapons.js:94` 直接分流 `G.photo.fire()`（`photo.js:104`）。
常量（`photo.js:12-14`）：`FREEZE 2.0`（冻结秒）/ `MULT 2`（缓冲结算倍率）/ `RESOLVE .3`（冲洗演出）。

```
fire()          72° 扇形摄影闪光（cone 1.25 rad / range 7.5，含墙体遮挡判定），
                同时命中敌人 / 敌方弹幕 / Boss；flashSector()（photo.js:319）播扇光
  ↓ shoot()/shootBoss()（photo.js:167/175）
PHOTO_STATE     setLook() 换灰调旧相纸材质（Lambert、关顶点色）+ addFrame() 相纸相框
                （Canvas 贴图：白边挖空内芯+胶片颗粒）；AI/移动/攻击全停，photoT=2.0
  ↓ 冻结期受伤
record()        伤害不扣真实 HP，全部记入 photoBuf（photo.js:185）
  ↓ photoT 到期
beginResolve()  「照片冲洗」演出 .3s（红墨渗出 tickResolve，photo.js:213/202）
  ↓ resolve 结束
applyResolve()  缓冲 ×2 一次性结算（photo.js:222）；致死 → 照片碎裂
```

- **敌方弹幕真冻结**：`freezeBullet()/unfreezeBullet()`（`photo.js:253/259`）——暂停
  位置积分而非销毁重建，解冻后恢复原速原向。

- **致死碎裂**：`shatter()`（`photo.js:267`）敌人撕成相纸碎片（对象池 `frags`，
  纸片物理飘落），死亡分支在 `enemies.js:235`；Boss 致死走 `applyResolveBoss`
  （`photo.js:239`）兼容分支。

- **集成点**：敌人字段 `photoT/photoBuf/photoPhase/photoDeath`（`enemies.js:164`），
  受伤入口重定向 `enemies.js:200`（照片态 → `G.photo.record`），Boss 同构
  （`boss.js:95/128/164`）；每帧驱动 `G.photo.update(dt)` 在 `game.js:369`
  （**build.update 之后、fx.update 之前**）。

- **reset()**（`photo.js:66`）：材质换装还原 + 相框/碎片/扇光回收，清场链路调用
  （`enemies.js:183`）。

- 武器枪模是**复古双反相机**（黄铜/皮革配色，refs 的 `cam/camShutter/camCrank`，
  `player.js:300`），四段开火动画：光积累→快门合拢→闪光释放→发条上弦。

- 回归锁：自测 STEP 40（拍摄/冻结/缓冲累积/×2 结算/弹幕冻结恢复/照片碎裂）。

### 2.5 武器商店（`shop.js`，2026-09-01 深夜新增）

柜台商人（`build.js` 的 `shopkeeper` interact，label「与商人交谈」）按 E 打开**武器目录面板**
（近距离 2.2 内出现 `[E] 与商人交谈` 呼吸辉光提示；远离时不提示、按 E 无效；UI 打开期间
世界冻结，Esc/再按 E 关闭，关闭后需重新靠近）：
网格卡片（按品阶 D→A 分组、阶内价格升序、品阶色边框+稀有度辉光）+ 右侧详情面板
（伤害/射速/弹匣/射程/装填/售价 + `def.blurb` 特效简介 + **与当前武器逐项对比 ▲▼**）+
购买按钮三态（可购买金色 / 弹壳不足暗红 / 已持有绿色）。程序化像素武器图标 15 个
（`shop.js _icon`，按 def.id 绘制）。面板打开时**主循环冻结**（`game.js frame` 判
`G.shop.isOpen()`），Esc/E 关闭，准星隐藏交还系统指针。

- **购买事务**（`S.buy(id)`，UI 与自测共用的唯一入口）：
  已持有（按实例 `id` 判定）→ 拒绝+台词；`money<price` → 拒绝+台词+卡片抖动，**不扣款**；
  通过 → `money-=price` → `run.moneySpent` 记账 → `giveWeapon(W.mktWeapon(id))`（现有
  武器槽规则：<2 把入槽并切换，满 2 把**替换当前武器**、旧枪掉落原地）→ 特效/台词反馈。
  `_busy` 原子旗 + owned 复查防连点重复购买；点击永不空操作（失败也给反馈）。

- **数据单一来源**：目录 = `catalogIds()` 遍历 `W.defs`；售价 = `W.priceOf`；商店模块
  **零复制武器属性**，改武器数值/定价后商店自动同步。

- **房间陈列**（`build.js`）：武器展示架**贴墙布点**（离墙 0.55、间距 1.1），碰撞只保留
  小底座（r=.22，明显小于视觉模型；缝隙小于玩家直径 → 无可嵌入卡死口袋），**门禁感知**
  （门 tile ±1.75 禁放，一侧被门占用时溢出到北/南墙角并避开柜台）——中央主通道与翻滚
  完全不受阻；枪模缓转悬浮、玩家 2.1m 内辉光增亮（纯视觉反馈）。展示架**无交互入口**，
  唯一购买入口=商人 NPC；货架只摆消耗品（`items.shopStock` 已移除武器位）。

- **经济联动**：击杀掉落弹壳 1-7/只（精英×4）、宝箱 20% 掉 8-16、吝啬鬼戒 +60%；
  一层收入约 60-120 弹壳 → C 阶（39-42）第一层可负担、B 阶（71-78）需取舍、
  A 阶（122-138）基本是第二层的一次性大件——配合 2 个武器槽形成构筑取舍。

- **Run 生命周期**：`startRun/descend/loseRun/winRun` 一律 `G.shop.close()`；金钱/武器
  随新局重置（现有 createPlayer 语义），面板状态不跨局泄漏。

- 回归锁：自测 STEP 41（目录 15 把/定价不倒挂/真实购买扣款/电弧链特效/余额不足/
  已持有拒绝/连点一次成交/新局重置/随机店位）。

***

### 2.6 【赌徒的灾难】Gambler's Calamity（`gambler.js`，2026-09-02 新增）

特殊/A 级武器：`dmg 10 / rate 3.33 / mag 10 / reload 0.5 / price 125`（`weapons.js:22`，
rate 3.33 = 射击间隔 0.3s，2026-09-02 自 1.1 提速；mag 10 / reload 0.5 为 2026-09-02 手感调整，
自 6/1.4 放宽——抽牌武器的代价应集中在牌运本身而非弹药管理）。
**不走子弹池直射**：`P.fire` 先进入 0.15s 蓄力（转轮快转+齿轮音），chargeT 结束分流
`weapons.js:96` → `G.gambler.release()` 抽一张牌，按牌面结算。

- **DeckSystem**（真牌组）：13 张迷你牌组 = 四花色 ×3 + Joker ×1；抽牌入弃牌堆，
  耗尽自动重洗；**击杀敌人触发全牌组重洗**（`enemies.js` kill 钩 → `onKill()`，
  伴随纸牌环绕 VFX 与洗牌音）；`G.gambler.reset()` 挂在 `startRun`（新局归零）。
  Streak ≥3/≥5 时重洗的 Joker 张数 1→2→3（风险随收益上升）。

- **花色效果**（全部走现有子弹池，附加字段 `dmgDecay` 支持穿透衰减）：
  ♠ 黑桃=穿透弹（pierce 99，逐敌 ×0.85 衰减，黑银刀锋）；♥ 红桃=吸血弹
  （命中玩家 +1 HP，红色粒子回流）；♦ 方块=必暴击（×2.5 + 金色暴击辉光，
  35% 概率掉落弹壳）；♣ 梅花=五向散射（中心 ×1、两侧 ×0.78/0.62，墨绿弹幕，射程 16——2026-09-02 手感调优自 12 提升）。

- **Gambling Streak**：连续花色牌计数（Joker 清零）；伤害加成 ×1.05/1.15/1.30
  （Streak 1-2/3-4/5+）。

- **JACKPOT**：Streak 每达 5/10/15… 立即触发——弹壳雨（6-10 枚）+ 金色粒子 +
  横幅「JACKPOT！」+ 老虎机上行铃声 + 震屏 0.4；**同花三条**（最近 3 张同花色）
  → 瞄准点小爆炸 + 「THREE OF A KIND」横幅。

- **JokerSystem**（独立加权结果池，总权 10.5，`_jokerPick` 为测试钩子）：
  GOOD JACKPOT(3.75≈35.7%)=×5 大爆炸+10 弹壳；MISFIRE(1.25≈11.9%)=卡壳 0.5s+「BAD BET」
  （2026-09-02 调整：权重 2.5/2.5 → 3.75/1.25，MISFIRE 减半的概率转入大奖，卡壳 1.2→0.7→0.5s）；
  CHAOS(2.0)=全场敌人减速 3s（slowT）+混乱乱舞（enemies.js `e.chaosT`：期间每帧
  ±0.35 随机扰动，与击退强摩擦 `pow(.0001,dt)` 平衡出约 2 格/s 的醉步漂移——
  2026-09-02 重做：一次性速度注入会在 0.15s 内被摩擦吞掉无体感，故改为逐帧施加）+ 紫焰；
  BLOOD DEBT(2.0)=45 巨伤+自损 1 HP；
  CATASTROPHE(1.5)=全体敌人 25+自损 1 HP。揭牌演出：reveal 时**提前掷结果**存
  `reveal.result`，CHAOS 揭牌不播慢动作（玩家保持全速吃满敌人减速窗口），
  其余结果慢动作（2026-09-02 用户指令：GOOD JACKPOT/BLOOD DEBT/CATASTROPHE 减半为
  0.25×0.45s，MISFIRE 0.25×0.5s——0.5s+卡壳 0.5s=1s 总惩罚）；卡牌悬浮翻面（REVEAL\_T 0.3s，背面→花色面，
  中点「唰」声）+ 紫色粒子；负面结果仅短暂/轻微
  （无死亡/无永久惩罚），Streak 清零即重开。

- **HUD**：`#gamblerHud`（仅装备时显示）——`♠ STREAK ×N` + 卡壳指示；面板打开时
  主循环冻结，`G.gambler.update(dt)` 挂在 `game.js:370`（photo 之后）驱动揭牌
  时间线/纸牌对象池/HUD 节流刷新。

- **枪模**：`player.js` 赌场左轮（黑金属+暗金+扑克红+象牙握把，8 扇区红黑轮盘、
  扑克牌仓、发牌拨杆、骰子；顶点色烘焙）；待机缓转、开火快转（`wheelFast` 衰减）。

- **性能**：纸牌 Mesh 对象池（8）+ 5 张 Canvas 花色贴图缓存；粒子全走 fx 对象池；
  `update` 无每帧分配。

- 扩展预留：`JOKER_POOL` 结果数组与 Deck 牌表可直接追加 Ace/K/Q/J/诅咒牌。

- 回归锁：自测 STEP 43（牌组构成/黑桃穿透参数/红桃吸血/方块必暴击 26.25/三条/
  JACKPOT 掉壳/Joker 五结果逐一强制/耗尽重洗/击杀重洗/HUD 注入/新局重置）。

***

### 2.7 局外解锁系统（`meta.js`，2026-09-02 新增）

跨局持久的里程碑解锁（localStorage 键 `bd_unlocks`：`{flags, kills}`）。8 个里程碑
各自解锁一批武器进入商店目录/掉落池：**初次下潜**→弹跳先生+光棱射线 / **军火交易**
（首次商店购武）→三连发卡宾 / **百人斩**（累计 100 杀）→追踪蜂巢 / **完美清剿**
（无伤通过锁定战斗房）→雷暴发生器 / **讨伐铁颚**（通关）→火箭筒+磁轨+冰晶 /
**深渊征服者**（通关完整三层）→赌徒的灾难+拍立得。恒定解锁：生锈左轮/蜂群/双管/
猎兽/等离子。头奖（赌徒 JACKPOT）/赌运亨通（Streak×8）保留为彩蛋成就兜底。
⚠️ **顺序敏感（红线级）**：`milestoneOf()` 按 MILESTONES 数组 find 首个匹配——
win\_run 必须排在 jackpot/streak8 之前，gambler/polaroid 的 unlocked() 判定才走
win\_run（否则死锁回归：两把武器的解锁条件都需要先持有赌徒的灾难，而解锁前三处
过滤使其无从获取，2026-09-02 修复的死锁）。

- **过滤点**：商店目录（未解锁武器以「？？？未解锁」占位卡展示，详情面板显示
  里程碑要求，购买被拒）；`W.randomWeaponId`（宝箱/旅行者/祭坛掉落遵守解锁，
  该阶无解锁武器时向低阶降级）；展示架只陈列已解锁武器。

- **授予即横幅**：`grant()` 幂等；横幅只列本次真正新解锁的武器（fresh 过滤，
  武器已被更早里程碑解锁时静默，防误导）。

- 各系统钩子：`enemies.js` kill→`onKill()`（累计击杀）、`game.js`
  descend→`onDescend()` / clearRoom→`onFlawless()`（对比锁房基线 `room.dmgAtLock`）/
  bossDefeated→`onBossKill()` / winRun→`onWin()`（通关解锁死锁武器）、`shop.js`
  buy→`onBuy()`、`gambler.js` JACKPOT→`onJackpot()` / Streak8→`onStreak8()`。
  `load()` 静默回填：bd\_best 存在（曾通关）即补授 win\_run，老玩家免重打一局。

- 回归锁：自测 STEP 44（默认解锁集/购买触发/武器池过滤/持久化）+ STEP 45 ⑪
  （通关授予 win\_run 并解锁赌徒的灾难/拍立得）。

### 2.8 精英词缀（`enemies.js`，2026-09-02 新增）

精英怪生成时随机附加一种词缀（`E.assignAffix`，光环按词缀变色），共 4 种：
**爆裂**（死亡自爆，'e' 阵营爆炸威胁玩家）/ **再生**（每 3s 回 2 血，绿光）/
**召唤**（每 6s 召唤一只怨灵，上限 2 只，紫光）/ **护盾**（周期获得抵挡一次
伤害的护盾，`ignoreBlock` 可穿透，青光）。行为 tick 在 `E.update` 词缀分支，
吸收拦截在 `E.hurt` 顶部。精英原有数值强化（hp×2.2/钱×4）不变。

- 回归锁：自测 STEP 44（词缀合法性/护盾吸收/再生/召唤峰值/爆裂伤玩家）。

### 2.9 构筑 HUD（`ui.js` stats 渲染，2026-09-02 新增）

`#passiveHud`（左侧，仅持有被动时显示）：彩色被动标签（悬停显示名称与说明）

- 关键数值总览（伤害/射速/暴击/移速/弹速倍率、吸血、反伤、穿透、弹跳——仅显示
  非默认项）。由 0.15s 节流的 `G.ui.stats(p)` 驱动刷新。

### 2.10 【过载点唱机】Overload Jukebox（`jukebox.js`，2026-09-04 网络系统重构交付）

黑胶弹射/音波网络型 tier A：`dmg 4 / rate 1.8 / mag 8 / reload 1.6 / kind:'vinyl' /
jukebox:true`（`weapons.js:27`）。**独立模块** **`js/jukebox.js`（G.jukebox，436 行）**，
插在加载序 weapons 之后；game.update/cleanupDynamic/onRoomEnter 三处挂 `G.jukebox.*`；
weapons 尾部每帧调 `G.jukebox.stepVinyl()`（黑胶互撞/吸附/近共振委托）；player.js fire 调
`G.jukebox.aimAssist(p, ang)` 做轨迹轻修正 + 黑胶上限 16 拦截。

> **2026-09-04 核心机制级重构**（设计需求 41 条，目标「稳定铺网、可主动追求 FULL OVERLOAD
> 的强力 A 阶武器」）：旧版（187 行）黑胶必须 <0.45 精确碰撞才共振、节点扎堆、按最近距离
> 连线导致共振线过短、网络难成。新版升级为 **BLACK VINYL NETWORK SYSTEM**，五层辅助让
> 「搭建网络」成为可重复操作：

```
发射黑胶(16 上限, 墙反弹 bounce 99, 穿人不清弹)
  ├ RESONANCE ASSIST: 距另一黑胶 <1.3 且在靠近 → 双向 0.08~0.15s 音波吸引(angLerp 弱修正, 非瞬移)
  ├ NEAR RESONANCE:  距 <1.6 未碰撞 → 双唱片间 RGB 电弧粒子 + vinylNear 嗡鸣, 进入"高度易共振"态
  └ 精确碰撞(<0.45) → 两弹离场 → resonance(a,b)
resonance: 碰撞点=Resonance Origin; 两 Node 沿碰撞前速度方向分离
  sep = clamp(3+(relS-6)*.22, 3, 6)  ← 速度越高节点分得越开; <3 时法线推开+外扩兜底
  _settle(): 沿 origin→落点 回缩避墙/避不可走/避已有节点(弱排斥防扎堆)
addNode: 节点带 level 1; 满 6 网再入 → FULL OVERLOAD 三阶段
vinylHitNode: 撞已有节点未满网 → 被撞节点 level++(≤5: 辉光/透明度/色相/光束强度递增) + 刷新寿命 + 扩张新节点
rebuildBeams: LONG EDGE PRIORITY —— 距离降序, 长边优先 + 并查集保连通 + 每节点度数≤3
  MIN_BEAM_LEN=2.5 内短边仅当两端孤立才允许; 长边更有视觉/玩法价值
Edge Quality: len≥6 → q1.3 / len≥4 → q1.15 / 否则 q1.0 (长线更粗更亮、伤害略高)
NETWORK CORE: ≥3 节点 → 几何中心低频音波脉冲, 核心附近敌人轻微持续伤害, 规模随节点放大
FULL OVERLOAD 三阶段(满网+1 触发, 快照 nodes/beams):
  phase0 CHARGE 0.38s(全节点闪烁+波浪+暗场)
  phase1 LOCK 0.3s(全部 Beam 锁定, 敌人 RGB X-Ray 骨架白闪)
  phase2 BASS DROP(BURST: dmg=12×(1+min(.6, beams数×.1)); 线上敌人 12×mult; Boss 单次硬上限 24;
         双层音波+红蓝粒子 → 节点/线全清 + 环境光还原)
Club Mode: 有节点时环境光 ×0.82(原 .78 上调, 避免过暗; 基准采样, 清场还原)
```

- **伤害**：共振线 0.18s tick `2.5 × EdgeQuality`；敌人同时被 ≥2 条 Beam 命中 = CROSS
  RESONANCE ×1.15、≥3 条 = PERFECT RESONANCE ×1.3；黑胶基础伤 4（普通射击只作布网前基础
  攻击，非 DPS 主力）；Boss 每线 tick 走 `G.hurtBoss`，单次爆发硬上限 24。

- **辅助必须轻微**（设计稿二十八，防"系统作弊"感）：吸附只在 <1.3 且靠近时短促；aimAssist
  只在目标偏角 ≤10° 时把角度拉回 60%，**绝不代瞄**；禁止自动追踪/自动拉拢/自动在敌人身边
  生成 Node。玩家仍需自己瞄准与布线。

- **性能红线**（设计稿三十三，已落实）：在飞黑胶 ≤16；node≤6 / beam≤8；交叉点不单独建
  实体；粒子有上限；线几何预分配无每帧新建对象。

- **换房即清**：game.cleanupDynamic / onRoomEnter 调 `G.jukebox.clear()`（Vinyl/Node/Beam/
  Overload/Club 灯光/VFX 全清，不污染下一房间）。

- 音效：vinylShot（低音炮 BOOM+唱片咻）/ vinylBounce（THUMP）/ vinylNear（近共振嗡鸣）/
  vinylAttract（共振吸附短促 VRRMMM）/ resonance（电子音建网）/ bassDrop（低频爆发 +
  ducking）；商店像素图标=音箱+喇叭+黑胶。回归锁：步骤 59（碰撞单测/aimAssist/节点分离/
  共振线tick/成长扩张/核心脉冲/三阶段BURST/灯光还原）。

### 2.11 已下架武器记录（2026-09-04 应需求删除）

**【视界线切割刀】Event Horizon Scalpel（`scalpel.js`，2026-09-03 上线 → 2026-09-04 删除）**
近战/空间操控 tier A（dmg 9 / rate 2.2 / mag 10 / melee:true）：扇形挥砍 + Space Rift 裂隙
（≤3 道 DOT）+ SPACE ROLL 翻滚传送 + SPACE COLLAPSE 裂隙连线 VOID SEVER 26 点（Boss 封顶）。
已整体下架删除：`weapons.js` def/近战分支、`player.js` 翻滚接入、`audio.js` rift 音效组、
`shop.js` 图标、`index.html` script、`main.js` STEP 52 回归块、文件 `js/scalpel.js` 已 git rm。
历史实现保留在 git（下架前 commit）与 `WEAPON_BATCH_HANDOFF.md` §④。

**【献给太阳的左轮】Revolver of the Sun（`sunrevolver.js`，2026-09-03 重做 → 2026-09-04 删除）**
Heat 过热管理型 tier A（dmg 13 / rate 1.1 / mag 6 / reload 1.5 / sun:true）：Heat 温度档位 /
SOLAR LIMIT 沸腾 / SUNSHOT 微型太阳（Boss 封顶 26）/ R 键双模散热 / 枪体温度材质。已整体下架
删除：`weapons.js` def/sun 全部分支/`b.sunP` 字段、`player.js` 枪模挂载/Heat 链/R 键接管/
锁膛/材质淡出、`ui.js` HEAT HUD、`audio.js` sun×11 + overheat 音效组、`shop.js` 图标、
`index.html` script、`main.js` STEP 58 回归块、文件 `js/sunrevolver.js` 已 git rm。
历史实现保留在 git 与 `WEAPON_BATCH_HANDOFF.md` §⑤。

### 2.12 【悖论骰子】Paradox Dice（`dice.js`，2026-09-04 重做交付）

掷骰改判现实型 tier A：`dmg 6 / rate 1.2 / mag 8 / reload 1.5 / spread 0 / dice:true /
price 55`（`weapons.js:28`）。**独立模块** **`js/dice.js`（G.dice，446 行）**，插在加载序
jukebox 之后；player.js 挂骰体与开火/蓄力结算接管；game.update/cleanupDynamic/
onRoomEnter 三处挂 `G.dice.*`；enemies.js 主循环接入 `pinT` 冻结。

```
开火 → 蓄力 .35s（骰体高速翻滚）→ 随机 1~6（测试 _force 强制）
  → 落定 .16s 弹性归位 + 结果面点亮（emissive 2.2）+ §N 大号数字 + 结果环
  1 厄运：单发弱弹 + instab+6（最差结果也在推进异常）
  2 双重：两枚略分散    3 三重散射
  4 冻结：kind:'dice4' 命中 → 敌人 pinT 停止行动（冰晶 mesh 包裹，到期/死亡/清场移除）
  5 追踪：kind:'homing' 红色锁定弹
  6 毁灭：瞄准点 4.5 格外 explode（R2.6 / DMG26）
连续同数 cons++（异数归零）→ instab=cons×25（封顶 100，每秒衰减 8）
  → ≥50/75 两级世界异常（节流闪烁/震屏/HUD 抖动/裂缝粒子）
cons≥4 → PARADOX 现实崩坏（四阶段演出）→ cons/instab 清零 + PARADOX CHARGE
```

- **真 3D 骰体**（重做硬门槛一）：0.38 立方体 + 12 条黄铜棱边 + 8 角紫色发光符文角珠
  （待机能量脉动），六面 = 面版 + 暗色凸点数点（真骰面，对和 7）；材质全专用
  （emissive 逐帧改写，绝不共享——H7）。
- **六面独立视觉语言**（重做硬门槛二）：面体暗色按点数着色，落定时点亮；面光色
  1 灰 / 2 黄 / 3 橙 / 4 冰蓝 / 5 红 / 6 白 + 各自专属音效与弹道造型。
- **PARADOX 四阶段演出**（重做硬门槛三）：hitstop .12+duck（静止）→ 空间裂隙 .15
  （黑紫柱+紫色闪电枝）→ 现实错误 .50（过曝+故障闪光+环境光闪烁+数字跳变）→ BOOM .80
  （全房 G.hurtEnemy 34 / 精英×1.3 / ignoreBlock=true 破格挡；Boss `G.hurtBoss(26)`
  单次封顶——与点唱机/悖论骰子同一纪律）+ explode(4.5,0) 纯视觉爆炸 → 1.15 清理。
  裂隙随换房即拆（onRoomEnter 清场）。
- **PARADOX CHARGE**（设计稿九，旧版缺失）：崩坏后接下来 5 次掷骰临时强化（+25% 伤害 /
  爆炸半径 +0.5 / 冻结时长 +0.35s），禁止永久叠加。
- **HUD**：ui.weapon 对 def.dice 追加 `[§N ×连续 · 不稳X%]`，连续 3 次提示「下次崩坏」、
  充能中显示「崩坏充能」；名称颜色随不稳定度分级（≥50 橙 / ≥75 红）。
- 音效：diceRoll/diceStop/dice1~6（各自专属）/diceFreeze/diceCrack/diceCharge/
  paradox/paradoxBoom；商店像素图标=3D 斜视机械骰（暗黑前脸+黄铜框+三面不同点数+紫核）。
- 回归锁 STEP62：3D 骰体挂载/自旋组/六面材、`_force` 逐点验证掷 1~6、连续累加/异数重置、
  掷 4 冻结 pinT+落定 4 面+面材点亮、掷 6 爆炸击杀、PARADOX 四连后计数清零+演出推进后
  全房击杀/充能/裂隙清理、充能随掷骰递减。

- 回归锁：自测 STEP 59（collide 纯函数单测 / 同点两发真实互撞成节点 / 双节点连线 +
  线上敌人 tick 掉血 / 满网第 7 次入网 BURST 全清 / cleanupDynamic 无残留 + 灯光还原）。

## 3. 子弹系统## 3. 子弹系统（`weapons.js:38-51`）

- **对象池 520 发**，启动时一次性创建（Mesh + 辉光 Sprite），`b.on=false` 表示空闲

- **玩家子弹与敌人子弹共用同一个池**，靠 `b.team`（`'p'` / `'e'`）分流

- 子弹字段：`on, mesh, glow, x, z, vx, vz, ang, spd, dmg, size, team, pierce, bounce, knock,
  life, crit, kind, hits, retPhase, color, slow, orbitAng, orbitRad, hitCd`

### 3.1 移动与碰撞

**逐帧位置检测 + 子步进**（不是射线）：

```js
const stepLen = b.spd * dt;
const n = Math.max(1, Math.ceil(stepLen / 0.35));   // 每子步最多 0.35 米
```

每个子步内依次检测三层：

1. 墙体 / 门 / 裂纹墙（`weapons.js:265-290`）
2. 道具掩体（圆-圆，`weapons.js:293-305`）
3. 实体：敌人 → Boss → 玩家（`weapons.js:308-353`）

命中半径用**平方距离比较**，无开方。

⚠️ **特殊规则**：翻倒的桌子 `blocksBullets=true`，但
`weapons.js:295` 显式跳过玩家子弹 —— **玩家的掩体不挡自己的输出**。这是刻意的玩法设计。

### 3.2 伤害计算链路（玩家开火 → 敌人扣血）

```
player.js:169   鼠标按住 && !reloading && cool<=0        （长按连发）
player.js:241   w.cool = 1/(rate * st.rateMul * (stormT?2.5:1) * (adrenal半血?1.4:1))
player.js:242   → P.emitShot(p, w, aimAng)
player.js:214   if(stormT<=0) w.ammo--
weapons.js:99   dmgMul = p.curDmgMul()  = st.dmgMul * (berserk && berserkT>0 ? 1.5 : 1)
weapons.js:104  crit  = Math.random() < st.crit
weapons.js:105  spd   = def.speed * st.bulletSpdMul * (crit?1.12:1)
weapons.js:108  dmg   = def.dmg * dmgMul * (crit?2.5:1)
                                          ↓ 写死进子弹
--- 下一帧 ---
weapons.js:314  G.hurtEnemy(e, b.dmg, b.ang, b.knock)
enemies.js:195  → E.hurt(e, dmg, ang, knock, ignoreBlock)
```

**关键**：**所有伤害倍率在子弹生成时一次性固化进** **`b.dmg`**，飞行途中不再重算。
子弹飞出去之后玩家吃到/失去狂暴、被动、暴击，**都不影响这颗子弹**。

唯一在**命中时**结算的倍率是 Boss 眩晕：`weapons.js:336` 的 `b.dmg * (stunT>0 ? 1.5 : 1)`。

***

## 4. 敌人系统（`enemies.js`）

### 4.1 定义表 `E.defs`（`enemies.js:182-199`）—— 共 **15 种**

> 2026-09-04 删除批次：Wallmaker 掩体制造者（§4.9）与 Hound 猎犬（§4.10）因设计不佳整体下架，
> 计数 17 → 15；后续小节编号 4.9/4.10 不再重排（下架记录见 `DEVELOPMENT_LOG`）。

字段只有 6 个：`hp / spd / r / cost / floors / money`

| 类型          | hp | spd  | r   | cost | floors   | AI 位置   | 行为                                                                                                                                                                        |
| ----------- | -- | ---- | --- | ---- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| gunner      | 16 | 2.1  | .35 | 1    | \[1,2]   | `:469`  | 保持 4~~6.5 距离横向游走，瞄准 .4s 后连发 2~~3 发                                                                                                                                        |
| charger     | 22 | 2.6  | .38 | 1    | \[1,2]   | `:494`  | 逼近 → 蓄力 .5s → 冲刺 1.3s（速度 8.5）→ 撞墙眩晕 1.1s                                                                                                                                  |
| shroom      | 26 | 0    | .36 | 1    | \[1]     | `:517`  | 静止炮台，索敌半径 14，交替放射 8 发 / 三连直射                                                                                                                                              |
| slime       | 13 | 2.2  | .34 | 1    | \[1,2]   | `:535`  | 弹跳推进；**死亡分裂**成 2 只小史莱姆                                                                                                                                                    |
| shotgunner  | 46 | 1.7  | .44 | 2    | \[2]     | `:543`  | 蓄力 .55s → 6 发扇形，自带后坐力                                                                                                                                                     |
| sniper      | 20 | 2.3  | .34 | 2    | \[2]     | `:559`  | 保持 ≥7 距离，瞄准 .95s（后 .35s 显示激光预警线）→ 高速穿刺弹                                                                                                                                   |
| hexer       | 30 | 1.5  | .36 | 2    | \[2]     | `:587`  | 传送；敌人 <5 时 35% 概率召唤 2 只 slime，否则双螺旋弹幕                                                                                                                                     |
| beetle      | 9  | 3.4  | .3  | 1    | \[2]     | `:622`  | 高速冲脸，接近后点燃引信 .75s 自爆                                                                                                                                                      |
| shield      | 52 | 1.25 | .46 | 2    | \[2]     | `:632`  | **盾卫**，格挡/破防见 §4.3                                                                                                                                                        |
| wisp        | 10 | 4.6  | .3  | 1    | \[1,2]   | `:659`  | 蛇形高速逼近，近距离自爆（半径 1.7 / 伤害 2）                                                                                                                                               |
| totem       | 40 | 0    | .42 | 2    | \[1,2]   | `:676`  | 静止，双臂激光以 .85 rad/s 旋转扫射 3.2s                                                                                                                                              |
| bomber      | 34 | 1.9  | .38 | 2    | \[2]     | `:719`  | 保持 4.5\~6.5，抛射炸弹（落地爆炸半径 1.9 / 伤害 2）                                                                                                                                       |
| voidstalker | 24 | 2.9  | .34 | 2    | \[3]     | `:925`  | **虚空掠影**：半透明蛇形潜行 → 闪现玩家背后 1.7 格 → 显形预警 0.5s → 突刺（9.5 速 0.24s，命中后自设 contactCd 防双扣）→ 硬直 0.7s                                                                                |
| riftwatcher | 20 | 1.35 | .36 | 2    | \[3]     | `:975`  | **裂隙注视者**：悬浮巨眼保持 4.5\~8 距离 → 碎晶收拢蓄力 0.9s → 三枚缓慢追踪虚空宝珠（`voidorb` 弹种，转向率 2.2 rad/s，垂直走位可甩）                                                                                  |
| voidacolyte | 28 | 1.5  | .36 | 2    | \[3]     | `:1001` | **虚空祭司**：保持距离，吟唱 1.1s 为 4.2 格内同袍（含自己）附虚空护壁（挡一次任意伤害，见 §4.8）；孤身改直射                                                                                                          |

**精英变体**：`hp × 2.2`、`r × 1.2`、`spd × 1.15`，加红色光环 + 整体放大 1.22。

### 4.2 AI 组织方式

**通用帧循环 + 每类型一个函数**：

- `E.update(dt)`（`enemies.js:257-344`）是唯一入口，倒序遍历，在调用具体 AI **之前**
  统一处理：出生保护 → 减速 → **位置合法性自愈** → **房间归属纠正** → 击退衰减 →
  掩体推出 → 受击闪白 → 接触伤害 → 动画计时

- 具体 AI 在 `enemies.js:337`：`const ai = AI[e.type]; if(ai) ai(e, dt, d, a, p);`

- `AI` 是文件底部的对象字面量（`enemies.js:640-1029`），15 个键与 `defs` 一一对应

- 每类内部用 `e.state` 字符串状态机 + `e.stateT` 倒计时

⚠️ **新增敌人必须同时改 4 处**：`defs` / `makeMesh` / `AI` / `animate`。
漏改 `AI` 会静默变成"完全不动也不攻击的靶子"（`enemies.js:337` 的 `if(ai)` 直接跳过）。

### 4.3 盾卫格挡与破防（`enemies.js:195-218`）

```js
E.hurt = function(e, dmg, ang, knock, ignoreBlock){
  if(e.dead || e.spawnT>0) return;
  if(e.type==='shield' && !ignoreBlock && e.state!=='stun' && e.state!=='guardbreak'){
    let d = wrap(e.face - ang - Math.PI);
    if(Math.abs(d) < 0.55){          // 正面 ±31.5°，总张角约 63°
      e.guardHits = (e.guardHits||0) + 1;
      if(e.guardHits >= 5){
        e.guardHits = 0;
        e.state = 'guardbreak'; e.stateT = 2.5;    // 踉跄 2.5 秒
        ...
      }
      return;                        // 完全免伤
    }
  }
  e.hp -= dmg; ...
}
```

**设计要点**：

- 判定用 `e.face`（**真实朝向，有转向滞后**），不是目标朝向

- 盾卫转向速率被刻意压到 **2.6 rad/s**（其他敌人 5），注释在 `enemies.js:354-355`：

  > `// 盾卫转身极慢（2.6/s）：绕背走位可行；其他敌人正常转向`
  > → 绕背后有约 0.6 秒的输出窗口，**这是设计意图，不是 bug**

- 破防期间（`enemies.js:632-638`）：不移动、不攻击、不更新 `targetFace`（等效不转身）

- `guardHits` **只在满 5 时清零**，没有超时衰减 → 注释里的"连续"实际是"**累计**"

- 爆炸与电弧链传 `ignoreBlock=true`（`weapons.js:139/164`），无视格挡

### 4.4 出生保护 `spawnT = 0.45`

- 免伤：`E.hurt` 首行 `if(e.spawnT>0) return`（`enemies.js:196`）

- 免 AI：`E.update` 中保护期内只做缩放入场动画（`enemies.js:262-267`）

- **清剿判定仍包含它**（只看 `!e.dead`）→ 不会因保护期提前开门

### 4.5 死亡与掉落（`enemies.js:228-254`）

```
去重 if(e.dead) return        ← 不检查 spawnT
特效 poof + blood + sfx
run.kills++
金钱 round(rng.int(money[0],money[1]) * (elite?4:1) * st.moneyMul)
钥匙 概率 .03 + luck*.012
红心 vamp>0 时用 chance(vamp)，否则 .02 + luck*.01
beetle → 自爆 explode(2.2, 10, 'any')
slime 且 gen===0 → 分裂 2 只（hp=7, r=.24），显式继承 e.room
清理 sniper 激光线 / 移除 mesh
G.fx.hitstop(.03)
照片态致死（photoDeath）→ 走 G.photo.shatter() 碎裂，跳过普通烟雾演出
（enemies.js:235，见 2.4）
```

### 4.6 房间归属与清剿

- 正式赋值：`game.js:341`（从 spawnQueue 出队生成时）

- **每帧实时纠正**（`enemies.js:297-301`）：`const r=G.roomAt(e.x,e.z); if(r) e.room=r;`
  注释：`// 房间归属实时纠正：敌人物理上在哪个房间就算哪个房间的（清剿判定永远与实际位置一致）`

- 清剿判定 `checkRoomClear` 每帧扫描**全部**锁定战斗房，
  `alive = enemies.list.some(e => e.room===rm && !e.dead)`

### 4.7 位置自愈（反软锁兜底）

见 `BUG_HISTORY.md` 的 `FIX-003`。

***

## 5. Boss 系统（`boss.js`）

### 5.0 Boss 分发层（`boss.js`，2026-09-02 第三层批次新增）

`B.spawn / B.clear / B.hurt / B.update` 四入口按 `G.game.floorNum>=3` 分发到 `G.voidking`（`voidking.js`）。
⚠️ **分发** **`spawn`** **后必须同步** **`this.active = voidking实例`**：外部武器/爆炸/环绕刃伤害判定全部走
`G.boss.active`（BUG-001 同类陷阱——不同步则新 Boss 免疫一切玩家伤害且无报错）。
无面君主 `dying` 结束与 `clear` 同样回写 `G.boss.active=null`。铁颚管线本身零改动。

### 5.1 实例

```js
// boss.js:90
{ x, z, vx:0, vz:0, r:1.05, hp:900, maxhp:900, dead:false, deadT:0, spawnT:.6,
  flashT:0, phase:1, state:'intro', stateT:1.4, t:0, face:0, walkT:0,
  atkIdx:0, lastAtk:'', contactCd:0, stunT:0, jawOpen:0, gunSpin:0, airY:0,
  dying:false, crownOff:false, mesh, refs:{head,crown,gun,barrels,eyeLight,aura,body} }
```

⚠️ **`B = { active:null }`（`boss.js:5`），`G.boss = B`（`boss.js:379`）。
实例在** **`G.boss.active`** **上，不在** **`G.boss`** **上。** 这曾是 P0 Bug（BUG-001，玩家打不到 Boss）的根因，2026-09-01 已修复（FIX-019），但命名陷阱仍在——新代码一律先取 `G.boss && G.boss.active`。

### 5.5 Boss「无面君主 · 虚空王座」（`voidking.js`，2026-09-02 新增，第 3 层领主）

```js
// voidking.js
{ x, z, vx:0, vz:0, r:1.0, hp:1150, maxhp:1150, dead:false, deadT:0, spawnT:.7,
  flashT:0, phase:1, state:'intro', stateT:1.6, t:0, face:0, hoverT:0,
  atkIdx:0, lastAtk:'', contactCd:0, stunT:0,
  photoT:0, photoBuf:0, photoPhase:'', photoDeath:false,   // 拍立得兼容，与铁颚同构
  dying:false, blinkT:0, mesh, refs:{head,shards,mantle,eyeLight,aura,body,throne} }
```

造型：漂浮紫黑装甲空壳（无腿悬浮+正弦呼吸）、胸口王座空洞+虚空核心、竖缝紫眼、
背后王座背架、4 片公转环绕晶体 + 4 片下摆装甲条；forward=+X（`mesh.rotation.y=-face`）。

| 阶段    | 触发            | 表现                                            |
| ----- | ------------- | --------------------------------------------- |
| P1→P2 | HP ≤ 690（60%） | aura 变紫、晶体公转加速，toast「王座碎裂了」                   |
| P2→P3 | HP ≤ 287（25%） | aura 白紫、移速×1.3、花瓣 4 臂反向，toast「虚空暴走」           |
| 死亡    | HP ≤ 0        | `dying` 2.6s 碎片逐个飞爆 → `G.game.bossDefeated()` |

状态机：`intro`(1.6) / `cool`(悬浮逼近 1.15×spdMul) / `petals` 花瓣螺旋（2~~4 臂反向）/
`lance`~~ ~~3 连发高速狙击（spd 7.2）/~~ ~~`rings`~~ ~~三波同心环（14~~18 发）/ `blink` 瞬移
（淡出→玩家侧后 3.2 格→淡入+8 向弹）/ `summon`（wisp×2，P2 起+hexer，场上敌人>5 退化 rings）/
`wall` 紫弹幕墙留缺口 / `phase` / `dying`。

选招池：P1 `petals×2 lance×2 rings`；P2 `petals lance rings blink×2 wall summon`；
P3 `petals lance×2 rings blink×2 wall summon blink`。避免连续同招。

专属音效 `voidscream`（`audio.js`：锯齿 60→340Hz 上扬 + 正弦 240→90Hz 下滑 + 带通噪声 300→2400Hz 扫频）。
第 3 层 BGM `f3`（bpm 112）。

### 5.2 三阶段（`boss.js:124-149`，在 `B.hurt` 内切换）

| 阶段    | 触发            | 表现                                                        |
| ----- | ------------- | --------------------------------------------------------- |
| P1→P2 | HP ≤ 540（60%） | `state='phase'` 1.0s，皇冠击飞，aura 变 `0xa02020`，toast"铁颚被激怒了" |
| P2→P3 | HP ≤ 225（25%） | `state='phase'` 1.0s，aura 变 `0xe02020` 且放大，toast"进入狂暴状态"  |
| 死亡    | HP ≤ 0        | `dying=true`，`state='dying'` 2.6s，慢动作 0.25×/1.2s          |

⚠️ 用的是 **`if / else if`** **链**：一发巨额伤害从 100% 打到 20%，只会触发 P2，
P3 要等下一发伤害才触发。这正是自测步骤 17 分两次 `G.hurtBoss()` 的原因。

速度倍率：`phase3 ? 1.35 : (phase2 ? 1.15 : 1)`（`boss.js:174`）

### 5.3 状态机（`boss.js:152-351`）

| 状态                      | 行为                              | → 下一状态          |
| ----------------------- | ------------------------------- | --------------- |
| `intro`                 | 头部摆动 1.4s                       | `cool`(.8)      |
| `phase`                 | 整体起伏 1.0s                       | `cool`(.5)      |
| `cool`                  | 缓慢逼近 + 绕行，速度 1.3×spdMul         | `pickAttack(d)` |
| `gatling`               | 3.0s，预热后每 .085s 一发              | `cool`          |
| `fans`                  | 1.8s，3 轮扇形（P3 11 发 / 否则 9 发）    | `cool`(.9)      |
| `chargeWind` → `charge` | 蓄力 .6s → 冲刺 9 u/s 持续 1.6s       | `cool`          |
| `spiral`                | 2.6s，每 .09s 发射，P3 4 臂 / 否则 2 臂  | `cool`          |
| `summon`                | 召唤 3 只 beetle                   | `cool`(1.2)     |
| `slam`                  | 跃起追踪玩家，落地环形弹幕 + 半径 2.4 造成 2 点伤害 | `cool`(1.2)     |
| `wall`                  | 一排 11 发弹幕留 3 格缺口                | `cool`(1.0)     |
| `dying`                 | 纯视觉爆炸 2.6s                      | 死亡结算            |

选招池（`boss.js:357-377`）：

```
P1: gatling, gatling, fans, fans, charge
P2: gatling, fans, charge, spiral, spiral, summon, slam
P3: gatling, spiral, spiral, fans, slam, wall, wall, charge, summon
```

避免连续同一招；`summon` 在场上敌人 >5 时退化为 `fans`。

### 5.4 伤害入口

```js
// boss.js:398
G.hurtBoss = dmg => B.hurt(dmg);      // 只收一个参数，Boss 无法被击退
```

前置拦截（`boss.js:126`）：`if(!b || b.dead || b.spawnT>0 || b.state==='intro') return;`

***

## 6. 地牢生成（`gen.js`）

### 6.1 算法流程

```
1. 建 start 房（gen.js:58）          第1层 40% 概率 2×1
2. 随机生长（62-77）                  随机选已有房间作父节点，随机 4 向放子房，
                                     每个新房立即 connect() → 天然保证连通（树结构）
3. 环路连接（80-83）                  两两组合，40% 概率额外 connect，形成非纯树
4. BFS 计算 depth（86-92）
5. 特殊房分配（97-178）               第1层：exit(最深) + treasure + shop + npc
                                     第2/3层：boss(新建2×2) + treasure + shop
                                     + 75% shrine + 60% gamble；**第2/3层无 exit**
6. 补足战斗房到下限（179-192）        目标数：1层 7 / 2层 9 / 3层 10
7. 隐藏房（195-211）                  **只放 1 个**，贴邻某个 combat 房
8. 生成 tile 地图（213-232）
9. 填充房间内容（238-385）            刷怪表 / 掩体 / 陷阱 / 火把 / 装饰
```

**三层差异化参数**（2026-09-02 第三层批次）：

| 项    | 第 1 层                   | 第 2 层                          | 第 3 层                                                       |
| ---- | ----------------------- | ------------------------------ | ----------------------------------------------------------- |
| 战斗房数 | 7                       | 9                              | 10                                                          |
| 敌人池  | 6 种基础                   | 11 种混合                         | 8 种高阶（sniper/hexer/bomber 加权，无 gunner/charger/slime/shroom） |
| 怪物预算 | `3+1.8f+…`              | 同式（f=2）                        | 同式（f=3），预算天然更高                                              |
| 精英率  | —                       | 35%                            | 50%                                                         |
| 陷阱   | 无                       | 尖刺 40% / 毒沼 30%                | 尖刺 40% / 毒沼 30% / **虚空裂隙 45%**                              |
| 装饰   | bones/moss/crack/rubble | skull/crystal/goo/rubble/chain | rune/shard/eye/crystal/rubble                               |
| 主题   | 石壁地牢（暖棕）                | 腐蚀深渊（冷青紫）                      | 虚空王座（深紫黑+紫火）                                                |
| BGM  | f1                      | f2                             | f3                                                          |

**楼层流转**：第 1 层 exit 房舱口 → `descend()` → 第 2 层；第 2 层 Boss 死后 Boss 房中央
生成下行舱口（`game.js bossDefeated` 按 `floorNum<3` 分流 + `build.js makeExit` 动态文案）→
第 3 层；**第 3 层 Boss 击杀才触发** **`winRun()`** **通关**。`descend()` 已通用化（`floorNum+1` +
层名/提示映射表，`game.js:241-263`），后续加层只需扩映射表。

**虚空裂隙陷阱**（`kind:'voidrift'`，第 3 层专属）：hide(2.2s+)→warn(0.55s 紫光呼吸预警)→
open(1.1s，站在格上 0.9s 一次 1 伤+减速 0.35s)→hide。渲染：三层裂缝平面+辉光 sprite
（`build.js` 渲染于道具段、判定在每帧动画段，与 spike/toxic 同管线）。

### 6.2 门与走廊

**没有独立的走廊 tile——门本身就是走廊。**

- 仅当两房网格上正交紧贴才能连接

- 打通两侧各 1 tile 厚的墙 → **每个门恒为 4 个 tile（2×2 开口）**

- 普通门初始 `open=true`；只有隐藏门初始关闭（`gen.js:51` 的 `open: !secret`）

### 6.3 特殊房选址 `takeSpecial`（`gen.js:98-108`）

候选池三级退化：① 死胡同 → ② `depth>=1` 的战斗房 → ③ 任意战斗房。
池内按 depth 降序，70% 取最深、30% 从前 3 深随机。
命中后 `r.type=type; r.used=true; r.cleared=true` —— **特殊房默认已清剿，不刷怪不锁门**。

### 6.4 Boss 房选址（四级兜底，`gen.js:120-173`）

1. 最深 6 个战斗房作锚点，4 方向 × 3 错位尝试放 2×2（`tryBossAt` 是**原子操作**，
   connect 失败则回滚占位并移除房间）
2. 兜底1：征用最深战斗房改为 boss（1×1）
3. 兜底2：候选为空时征用任意战斗房
4. 兜底3：BFS 可达性校验，不可达则强连；连不上则把孤岛房转回 combat

> 注释（`gen.js:124`）：`/* addRoom+connect 的原子组合：connect 失败时回滚已占用格位，
> 杜绝"孤岛 Boss 房"（无门连接、玩家永远进不去） */`

### 6.5 空间查询 API

| API                              | 位置               | 说明                                          |
| -------------------------------- | ---------------- | ------------------------------------------- |
| `G.tileAt(x,z)`                  | `gen.js:392`     | 无 tile 时返回 `undefined`（**不是 null**）         |
| `G.solidForMove(x,z)`            | `gen.js:393-399` | 无 tile→true；wall→true；door→`!open`；否则 false |
| `G.solidForBullet(x,z)`          | `gen.js:400-406` | **函数体与 solidForMove 逐行相同**（重复代码）            |
| `G.roomAt(x,z)`                  | `gen.js:407-411` | 仅 floor tile 返回 room → **站在门洞里返回 null**     |
| `G.moveEntity(e,dx,dz)`          | `gen.js:413-448` | 圆形分轴碰撞 + 道具推挤                               |
| `G.roomSpawnPos(room, awayFrom)` | `gen.js:449-463` | 抽 6 次候选，跳过 `blocksBullets` 掩体，取离玩家最远        |

***

## 7. 场景构建（`build.js`）

### 7.1 构建内容

主题与灯光（`:15-36, 296-303`）、地板顶点色合并几何（`:305-342`）、
墙体与踢脚（`:344-355`）、门框与闸门（`:357-396`）、隐藏裂纹墙（`:699-733`）、
道具实例（`:398-457`）、火把（`:458-476`）、地表装饰（`:477-495`）、
陷阱（`:496-512`）、旗帜（`:513-527`）、商店货架与文字牌（`:647-697`）、
每帧动画（`:762-843`）。

### 7.2 `G.props`

在 `game.js:35` 初始化，`build.js:537` 的 `addProp` 填充。

公共字段：`type, x, z, r, hp, blocksMove, blocksBullets, mesh, room, interact, dead, flashT`

| type                                                 | r                  | hp | blocksMove | blocksBullets | 备注     |
| ---------------------------------------------------- | ------------------ | -- | ---------- | ------------- | ------ |
| table                                                | .55（翻后 .62）        | 30 | ✔          | ✘ → 翻后 ✔      | 可翻倒    |
| barrel                                               | .32                | 8  | ✔          | ✔             | 爆炸桶    |
| pot                                                  | .24                | 4  | ✔          | ✔             | <br /> |
| pillar                                               | .42                | ∞  | ✔          | ✔             | 不可破坏   |
| chest / bonus                                        | .5 / .35           | ∞  | ✔          | ✘             | <br /> |
| pedestal / shrine / gamble / npc                     | .42 / .6 / .6 / .4 | ∞  | ✔          | ✘             | <br /> |
| shopkeeper / counter / campfire / throne / exitHatch | .4/.5/.3/0/0       | ∞  | ✘          | ✘             | <br /> |

`interact` 形如 `{label, range, fn}`，**`label`** **可以是函数**（`build.js:673`），
用于商店实时余额（`player.js:374-375` 做了 typeof 判断）。

### 7.3 翻桌机制（三处协作）

1. **创建**（`build.js:404-417`）：`r:.55, blocksBullets:false, flipped:false`；
   `mesh.rotation.order='YXZ'`（注释：先对准朝向再前倾翻倒）
2. **触发**：`flipped=true` → `blocksBullets=true` → `r=.62` → `flipAng = 玩家当前 face`
   → **`pr.interact=null`（一次性，不可逆）**
3. **动画**（`build.js:799-806`）：`flipT += dt*4`（0.25s 完成），
   `rotation.set(-sin(k*π/2)*1.25, -(flipAng||0), 0)`，终态 `rotation.x = -1.25`
4. **弹道特例**（`weapons.js:295`）：玩家子弹**无视翻倒的桌子**

> 注释（`build.js:412`）：`// 立起方向 = 玩家当前瞄准方向：桌面对准敌人来弹方向，真正挡住射击`

### 7.4 文字与图标精灵

#### `textSprite(text, color, scale)`（`build.js:39-56`）

| 项   | 值                                                                    |
| --- | -------------------------------------------------------------------- |
| 画布  | **128 × 32**（4:1）                                                    |
| 字体  | `bold 20px Consolas`，居中                                              |
| 底衬  | `rgba(0,0,0,.75)` 矩形                                                 |
| 描边  | `lineWidth 4`，先 `strokeText` 再 `fillText`                            |
| 采样  | `magFilter = NearestFilter`（保持像素硬边）                                  |
| 材质  | `transparent:true, depthWrite:false, **depthTest:false**` → **穿墙可见** |
| 渲染序 | `renderOrder = 900`                                                  |

> `depthTest:false` 是**刻意**的（注释 `build.js:663`：穿墙深度关闭保证不被货架遮挡）。
> 商店价格牌正是靠这个才不会被柜台挡住。

#### `iconSprite(kind, colorHex)`（`build.js:60-85`）

画布 40×40，5 种 kind（heart/key/weapon/item/active），固定 scale .78。
⚠️ **未关闭** **`depthTest`**（与 textSprite 不同）。

***

## 8. 房间流程（`game.js:122-247`）

| 环节                | 位置        | 行为                                                                 |
| ----------------- | --------- | ------------------------------------------------------------------ |
| 进入检测              | `371-373` | 每帧 `G.roomAt(p.x,p.z)`，`!==curRoom` 时触发 `onRoomEnter`              |
| `onRoomEnter`     | `128-142` | 发现标记 → `visited=true` → 小地图 → 战斗房未清剿则 `lockRoom` → Boss 房生成 Boss   |
| `markDiscovered`  | `122-125` | 自己 `discovered=true`；所有**非 secret** 邻居 `mapHint=true`              |
| `lockRoom`        | `144-151` | `locked=true`，**所有门** **`open=false`**，音效 + 震屏，`spawnWave(room,0)` |
| `spawnWave`       | `153-161` | 敌人入 `spawnQueue`，延迟 .25\~.65s 逐个出场                                 |
| `checkRoomClear`  | `164-191` | 每帧扫全部锁定房；无存活且无待生成 → 下一波或 `clearRoom`                               |
| `clearRoom`       | `193-214` | 开门、`roomsCleared++`、掉钱（3\~5 + 层数×2）、16% 掉心                         |
| `breakSecretDoor` | `217-232` | 4 个 tile 改成 floor，显示隐藏房                                            |
| `descend`         | `235-247` | 550ms 后 `startFloor(2,false)`（**楼层号硬编码**）                          |

### 8.1 清剿判定的红线

```js
// game.js:180-182
// 残敌提醒：长时间未清剿时周期性提示剩余数量（仅提示，绝不自动清除）。
// 反软锁由敌人系统的"位置非法 0.8 秒自愈"负责（只处理卡墙敌人），
// 不做整房超时清空——避免慢节奏战斗（绕后盾卫/躲避激光）中敌人凭空消失。
```

**任何形式的整房超时清场都会让自测步骤 25 失败。** 30s/15s 两个提示阈值可调，
但不能改成 `clearRoom`。

***

## 9. 道具 / 构筑系统（`items.js`）

### 9.1 被动道具（18 项，`items.js:7-24`）

```js
dmgUp: { name:'强化弹头', desc:'伤害 +30%', color:'#e05a3a',
         apply: p => { p.st.dmgMul += .3; } }
```

### 9.2 主动技能（4 项，`items.js:29-32`）

```js
cloak: { name:'残影斗篷', cd:25, desc:'3秒无敌并可通过敌人',
         use: p => { ... } }
```

`cd` 字段仅作数据，实际冷却写 `p.activeCd`，由 `player.js` 管理。

### 9.3 生效方式 = **一次性 mutate**

`giveTo`（`items.js:78-96`）中 `p.passives.push(id)` 后**立即调用一次** **`apply(p)`**，
直接累加到 `p.st.*`。派生逻辑在**消费侧每帧读取** `p.st`。

⚠️ **没有** **`unapply`，没有** **`recalcStats`。** 唯一的"重置"途径是 `startRun()` 新建玩家对象。
**任何让** **`apply`** **被调用两次的逻辑都会永久叠加属性。**

重复拾取同一被动不叠加，转成 15 弹壳（`items.js:81`）。

***

## 10. 交互与拾取（`player.js:360-405`）

### 10.1 目标选取：**纯最近距离，无权重**

1. 遍历 `G.props`，取有 `interact` 且 `d < (range||1.4)` 的最小者
2. 再遍历 `G.pickups`，武器类固定 `d < 1.4`，与 props **共用同一个最近距离竞争**
3. 结果写入 `G.game.curInteract`，显示 `[E] label`
4. `inpPressedOrBuffered('KeyE')` 判定并消费

⚠️ 扫描的是**全局** `G.props`，**不按房间过滤**。

### 10.2 拾取物

`G.spawnPickup(kind, x, z, opt)`（`player.js:467-522`），kind ∈
`money/key/heart/weapon/item/active`。

**磁吸**：半径 `1.7 * st.magnetMul`（`player.js:317`），拉力 `lerp(9, 2, d/magR)`。
⚠️ **武器不磁吸**（`player.js:331`）。

> **满血红心不磁吸不拾取**（`player.js:328` 注释：
> 修复满血红心粘在身上跟随移动的 bug）——留在原地，掉血后再回来捡。

### 10.3 武器拾取替换（`player.js:394-405`）

- 手上 < 2 把：直接 push 并切到新武器

- 已有 2 把：把**当前手持**的掉在玩家背后 `.8` 处，然后原地替换

***

## 11. UI（`ui.js`）

- **HUD 刷新节奏**：小地图/武器/属性/剩余敌人数 0.15s 节流（`game.js:379-388`）；
  心数只在受伤/治疗处按需调用

- **`enemyCount(n)`** **基于** **`_floorText`** **拼接**（`ui.js:83`）→ **必须先调** **`floor(n)`** **再调它**，
  否则敌人计数会覆盖层名

- **小地图与大地图共用** **`drawMap(cv, g, big)`**（`ui.js:113-197`），动态缩放铺满画布

- `screen(name)` 用显式映射表切 4 个界面（`ui.js:24`）

- `hurtFlash` 用 90ms `setTimeout` 复位，**不走游戏时钟**（暂停时照样复位）

## 12. 音频系统 2.0（`audio.js`，2026-09-03 全面重制）

**总线混音**：Master(Gain→Compressor) ← music(0.6)→musLP(商店低通)→duckG / sfx(.85) /
player(.9) / enemy(.8，经 StereoPanner 定位) / boss(.85) / ui(.75) / ambient(.32)；
混响=生成式 IR Convolver（0.9s 指数衰减），爆炸/Boss/奖励/裂隙类湿声 send .14。

**分层动态音乐**（16 步 ×A/B 双小节步进音序器，量化到小节切换防断拍，层增益每帧
lerp ≈0.8s 交叉淡化）：`f1/f2/f3` = base+combat 双层（combat 层由 curRoom.locked 实时
驱动——探索 base ↔ 战斗 base+combat）；`boss` = p1+phase2+enrage 三层（**按 Boss 血量
60%/25% 自动推导阶段**，update 轮询）；`base`(hub)/`victory`/`gameover`/`title` 独立主题；
三张地图音乐主题完全不同（f1 神秘 D 小调 / f2 低沉工业 / f3 虚空 / boss 140BPM 三阶段）。
商店房音乐低通闷化 950Hz。

**音效**：74 个名字全保留、配方全部重制（分层 transient+低频 punch+尾音+湿声）；
爆炸按半径三级（W\.explode 传 sz）；武器按类型声音语言区分；音效随机化（音高 ±4% /
音量 ±8%）+ 同名限流（默认 40ms，可 min 覆盖）+ 全局 voice cap 56（onended 回收计数）；
`heartbeat` 低血心跳（≤50% 血，0.75s 间隔）；稀有奖励三层 rewardR/E/L（宝箱按 tier 触发）；
`roomClear` 清房 fanfare；`bossStinger`+`bossIntro(howl)` 出场演出（环境让位→咆哮→
stinger→900ms 后 Boss 音乐）；ducking：爆炸/Boss/坍缩/风爆自动压音乐 28%。

**空间感**：`sfxAt(name,x,z)` 按玩家相对方位写入 enemy 总线 StereoPanner + 距离衰减
（敌人死亡/命中等高频事件）；环境音=循环底噪（滤波随楼层）+ 每层随机点缀（f1 drip /
f2 rumble / f3 energy / base 机械）。

**音频状态机**：`G.audio.update(dt)`（game.update 每帧调用）统一驱动战斗层/Boss 阶段/
ducking/心跳/环境音；`music(track)` 量化切轨；`_curTrack` 供测试。无头环境 unlock 成功
（AudioContext 可建），全部节点 onended 回收，无泄漏。

## 13. VFX（`fx.js`）

- 纯对象池，启动时一次性预分配（见 `ARCHITECTURE.md` §12）

- `hitstopT`（顿帧）在 `game.js:446` 用**真实 dt** 递减；`timeScale`（慢动作）在
  `game.js:448` 缩放累加器 —— 两者分属两个模块，改一处要同步另一处

- `trauma`（震屏）由 fx 衰减（`fx.js:218`），但消费方在 `game.updateCamera`（`game.js:411`）

- 唯一非池化：`lightning()` 每次新建几何，0.14s 后 dispose

## 14. 基地系统（`base.js`，2026-09-03 新增）

「废弃军械站」：局外循环中心（休整 / 解锁 / 收藏 / 备战）。**集成方式：基地=特殊 floor
（`num:0, isBase:true`）+ play 态 +** **`G.game.inBase`** **旗标**——tile 碰撞/房间/交互/构建
管线全部复用，主循环与暂停零改动；地牢逻辑由 inBase 分支隔离。

### 14.1 流程与状态

- 进入：标题「开始突袭」→ `newGame()` → `enterBase('title')`；死亡/胜利结算按 \[E] →
  `returnToBase()`（700ms 误触闸门 + 结算碎片入账）→ `enterBase('dead'|'win')`；
  fade 过场后 `_enterBaseNow` 安装场景

- 出本：西侧「深渊升降梯」\[E] → `launchRun()` → 既有 `startRun()` 全量重置
  （buildFloor 清场，基地零残留）

- ⚠️ `_enterBaseNow` 必须 `this.run=this.newRun()`——基地复用 play 态主循环，
  `update()` 无条件读 `run.time`，run 为空会渲染循环崩溃（黑屏，已踩坑）

- 相机：基地拉远（`updateCamera` inBase 分支 camH 21 / camB 9.6，地牢 14.2/6.4）

- 面板冻结：`G.base.isOpen()` 与 `G.shop.isOpen()` 同等资格冻结 frame()；Esc/E 关闭；
  基地内暂停菜单「重新开始」= 回标题；Tab 大地图在基地禁用

- 音频：专属 BGM 曲目 `base`（安静温暖的步进音序器曲）

### 14.2 场景（22×15 静态 tile 地图）

暖色 THEME（木纹棋盘地板 / 金属墙 / 暖黄灯），**每次进基地重建**（展示随解锁成长）。
功能区：中央（战利品墙+熔炉+医疗站+地图桌）、西北枪械工坊、东北工程改装铺、
东档案角、中南训练场、西侧深渊升降梯。挂灯复用 `B.update` 火把光池（torchMeshes）。

### 14.3 NPC×4 与对话

枪械师·老铆（gunsmith 面板）/ 工程师·扳手姐（engineer 面板）/ 档案员·墨记（archivist
面板）/ 教官·铁哨（无面板）。NPC=普通 prop（interact+blocksMove），idle 工作动画
（擦枪/修理/翻书/指靶）+ 3.5m 内看向玩家。对话数据驱动（`DIA` 表），优先级：
初见 > 通关归来 > 连死 ≥3 > 刚消费 > 常态轮换。

### 14.4 面板与经济（全部走 MetaProgression 单一数据源，禁止各自维护解锁状态）

- 枪械师：未解锁武器 → `meta.buyWeapon(id)`（D15/C25/B40/A60 ◆）→ `bought` 旗标 →
  `unlocked()` 即真 → **自动进入** **`W.randomWeaponId`** **掉落池与商店目录**

- 工程师：进阶被动解锁（`GATED_ITEMS` 8 个，30 ◆）→ `itemUnlocked()` →
  `items.randomPassive` 池过滤；另有 5 项基地升级（见 14.5）

- 档案员：敌人（分类击杀）/ 武器（使用/击杀）/ Boss（讨伐次数+最佳时间）三类图鉴 +
  生涯统计；未遭遇显示 ？？？

- 深渊碎片（永久货币，与局内弹壳完全独立）：下潜 +8 / 铁颚 +15 / 无面君主 +40 /
  无伤清剿 +3 / 死亡结算 +6+5×(到达层-1) / 胜利结算 +25

### 14.5 基地升级（全部真实接入下一局）

`medbay` 开局 maxHp +2/级（startRun 与基地内双应用）· `armory` 开局第二把随机已解锁
武器 · `ammo` 装填 ×0.88/级 · `archive` gen.js 每级 +30% 追加特殊房 · `training`
训练靶耐久 +120

### 14.6 训练场 / 展示 / HUD

训练靶=dummy prop（blocksBullets+hp）：`B.damageProp` 专用分支——伤害数字、打碎后
1.1s 自动重置、永不死亡不掉落不计击杀；武器架 \[E] 循环试用全部已解锁武器；
战利品墙 Boss 首杀点亮；展示架/战利品/图签随 meta 实时成长（进基地重建 + 面板内
购买即 `rebuildScene()`）。HUD：`#baseHud`（♥ / ◆ / 操作提示）替换战斗 HUD。
