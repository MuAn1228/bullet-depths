# ARCHITECTURE.md — 技术栈 / 启动流程 / 主循环 / 模块依赖 / 数据结构

> 面向需要理解项目骨架的 Agent。所有行号基于 2026-09-01 的代码状态。
> 若代码已变动，请以代码为准并修正本文档。

---

## 1. 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 语言 | 原生 JavaScript（IIFE + 严格模式） | 无 TypeScript、无转译 |
| 3D | Three.js（本地 `lib/three.min.js`，603 KB） | **唯一**外部依赖，已 vendored |
| 渲染 | WebGLRenderer，内部固定高度 **320px** | 由 CSS `image-rendering:pixelated` 放大到全屏 |
| 构建 | **无** | 无 npm、无 webpack、无 package.json |
| 音频 | WebAudio 程序化合成 | **没有任何音频文件**，全部振荡器 + 噪声缓冲实时生成 |
| 贴图 | 程序化 CanvasTexture + 本地图片贴图 | `G.tex()` 生成 soft/hard/smoke/ring/flame/hex；A+B 试点新增 `G.imgTex()`（img+THREE.Texture，file:// 下 TextureLoader 不可用）加载 `assets/textures/` 本地像素纹理 |
| 存储 | `localStorage` | 仅一个键 `bd_best`（最佳通关时间） |
| 运行方式 | 双击 `index.html`，`file://` | 也可起本地服务器，但非必需 |

**为什么全部零依赖**：项目要求断网可跑、双击即玩。因此音频必须程序化合成、
贴图必须用 Canvas 画、不能有任何 `fetch`/XHR/ES Module。

---

## 2. 目录结构

```
D:\game\tingjindilao\
├── index.html          唯一入口。含全部 CSS（~190 行样式）+ HUD/商店/基地/界面 DOM + three.min.js 与 20 个模块的 script 标签
├── js\core.js     (232 行)  数学工具 / RNG / 材质几何缓存 / 程序化贴图 / 输入系统
├── js\audio.js    (410 行)  WebAudio 程序化音效与 6 首 BGM（title/f1/f2/boss/base，含拍立得/赌场/虚空/点唱机/骰子音效组，及近共振 vinylNear / 共振吸附 vinylAttract）
├── js\fx.js       (218 行)  对象池粒子 / 动态光 / 冲击环 / 伤害数字 / 震屏 / 顿帧 / 慢动作（含扇形闪光/照片冲洗演出）
├── js\ui.js       (254 行)  HUD 刷新 / 小地图 / 大地图 / 界面切换 / 准星 / 基地按钮绑定（含悖论骰子 PARADOX 计量条）
├── js\items.js     (99 行)  被动道具表 / 主动技能表 / 掉落池（工程师解锁门控）/ 商店货架库存
├── js\weapons.js  (448 行)  19 种武器定义 / 品阶统一定价 / 子弹对象池 / 弹道 / 命中 / 爆炸 / 电弧链 / 吹风机吹飞 / 黑胶委托 jukebox.stepVinyl / 墙弹穿透特判（wid 击杀归属 + 纸飞机/吹风机/点唱机/骰子弹种接线，dice4 冻结命中链）
├── js\jukebox.js  (436 行)  【过载点唱机】BLACK VINYL NETWORK SYSTEM：共振吸附/轨迹修正/近共振/节点与碰撞点解耦/长边优先网络/节点成长/网络核心/FULL OVERLOAD 三阶段（CHARGE→LOCK→BASS DROP）/ Club Mode 灯光
├── js\dice.js     (446 行)  【悖论骰子】真 3D 机械骰体（六面独立视觉语言）/ 掷骰结算 / 现实不稳定度 / 冻结钉住 / PARADOX 四阶段崩坏演出（全房伤害，Boss 封顶）/ PARADOX CHARGE 临时强化
├── js\shop.js     (290 行)  武器商店：目录 UI / 与当前武器对比 / 购买事务（验金→扣款→给予，防重复）
├── js\photo.js    (336 行)  【薛定谔的拍立得】扇形闪光 AOE / 照片冻结状态 / 伤害缓冲 ×2 结算 / 敌方弹幕冻结 / 致死照片碎裂
├── js\gambler.js  (305 行)  【赌徒的灾难】Deck 抽牌 / 四花色效果 / Joker 结果池 / Streak / JACKPOT / 纸牌 VFX
├── js\meta.js     (172 行)  局外系统 MetaProgression：里程碑 / 深渊碎片经济 / 图鉴统计 / 购买事务 / 基地升级（单一解锁源）
├── js\base.js     (990 行)  基地「废弃军械站」：32×20 非矩形 Hub（四角切角/墙端内收/齿状凹凸，南北隔断墙与核心左右护栏已拆、四边外墙保留，武器工坊/核心大厅/工程区/训练场/休息区/仓库展厅/档案角）；标题菜单为 index.html 内 CSS 像素风深渊背景+ 中央深渊核心「破晓引擎」（能量柱/地面符文圈/献祭交互 8 碎片→下潜伤害+15%/层）+ NPC×4（独立造型/Idle 动画/看向玩家）+ 数据驱动对话（门店看板内嵌引言不遮挡）+ 门店面板 + 商店式武器架全武器任选面板 + 弹药工作台补给 + 分散训练靶命中反馈 + 分区彩色灯光 + 环境事件（核心环转/蒸汽/灯闪/炉火）+ Meta 成长可视化（靶场/战利品龛）+ HTML 高分辨率世界标签层（CSS px 悬浮文字，面板打开自动隐藏）+ 基地 HUD 显示当前武器（品阶色名+弹药）
├── js\enemies.js  (1045 行)  15 种敌人定义 / 造型 / AI / 生成 / 受伤 / 死亡 / 自愈 / 照片状态进出 / 虚空护壁 / 骰子冻结 pinT 钉住
├── js\boss.js     (397 行)  Boss「铁颚」三阶段状态机（兼容照片状态）+ 第 3 层 Boss 分发层
├── js\voidking.js (355 行)  Boss「无面君主 · 虚空王座」三阶段状态机（第 3 层领主，兼容照片状态）
├── js\gen.js      (485 行)  地牢生成 / tile 地图 / 碰撞查询 API（三层差异化参数 + 档案室特殊房）
├── js\build.js    (969 行)  场景构建 / 三主题灯光与道具变体 / 陷阱（尖刺/毒沼/虚空裂隙）/ 武器展示架 / 文字与图标精灵 / 每帧动画（含训练靶） / 第一层地板 AI 生成石板贴图（A+B 试点）
├── js\player.js  (961 行)  玩家对象 / VOID HUNTER 建模 / 武器外观顶点色涂装（含赌场左轮、悖论骰子挂载）/ 移动 / 翻滚 / 开火（悖论骰子整链路接管 + R 键装填）/ 交互 / 拾取物 / 点唱机黑胶上限拦截与 aimAssist 轨迹修正
├── js\game.js     (592 行)  状态管理 / 主循环 / 相机 / 房间流程 / 楼层切换 / 基地进出（newGame/enterBase/returnToBase/launchRun）+ 点唱机/骰子钩子（cleanupDynamic 与 onRoomEnter 调 jukebox.clear 换房即清网）
├── js\main.js    (2224 行)  启动引导 + 58 步自测套件（自测占约 2050 行）+ 截图模式（shop/map/2/base）
├── assets\textures\   A+B 美术试点本地贴图（file:// 用 img 加载，可断网运行；当前含第一层石板 floor_d1.jpg）
└── lib\three.min.js
```

> `js/main.js` 绝大部分是自测代码。**生产运行时只用到前 96 行**。

---

## 3. 命名空间与模块通信

所有模块都是 IIFE，通过唯一的全局对象 `window.G` 通信（`core.js:3` 创建）。

**没有事件总线，没有依赖注入，没有模块加载器。**
模块 A 想用模块 B 的能力，就是直接读写 `G.xxx`。这意味着：

- 加载顺序 = 依赖顺序，**`index.html` 里的 script 顺序不可调整**
- 任何 `G.*` 上的东西都可能被任何模块读写 → 改之前必须 grep 全部引用点
- 不存在"私有"概念，下划线前缀只是约定

### 3.1 加载顺序与依赖

```
lib/three.min.js
  ↓
core.js     创建 G；数学工具、RNG、材质/几何/贴图缓存、G.input
  ↓
audio.js    G.audio        （core: 无依赖）
fx.js       G.fx           （core: 数学、材质、贴图）
ui.js       G.ui           （core: G.$；audio 音量绑定）
items.js    G.items        （core: RNG）
weapons.js  G.weapons      （core: RNG/材质/几何；fx: 特效）
jukebox.js  G.jukebox      （core: 几何/材质；fx/audio/ui：演出；weapons: 子弹池/黑胶弹——weapons 尾部每帧调 jukebox.stepVinyl()；供 player.js 黑胶上限拦截与 aimAssist 轨迹修正——加载须先于 player.js）
dice.js     G.dice         （core: 几何；fx/audio/ui：演出；weapons: 子弹池/爆炸；供 player.js 骰体挂载与开火接管——加载须先于 player.js）
shop.js     G.shop         （weapons: W.defs/W.priceOf 单一数据源；ui: DOM 面板）
photo.js    G.photo        （core: 材质/几何；fx: 扇光/冲洗/碎裂演出；audio: 快门音效；
                              与 enemies/boss/weapons 为运行时互调，加载顺序软依赖）
gambler.js  G.gambler      （weapons: W.defs/子弹池/explode；fx: 粒子；ui: 横幅；meta: 里程碑）
meta.js     G.meta         （localStorage bd_unlocks 持久化；weapons: 解锁过滤查询）
enemies.js  G.enemies, G.hurtEnemy  （core；fx；weapons 敌方炸弹）
boss.js     G.boss, G.hurtBoss      （core；fx；weapons；enemies 召唤）
            ⚠️ 第 3 层起 spawn/clear/hurt/update 分发到 voidking，且必须同步 G.boss.active
voidking.js G.voidking              （core；fx；weapons 敌方弹幕与 explode；enemies 召唤；photo 兼容）
gen.js      G.gen, G.CW/G.CH, G.tileAt/roomAt/moveEntity/solidFor*  （core: RNG）
build.js    G.build, G.damageProp   （core: GeoBuilder/材质/贴图；gen: CW/CH）
player.js   G.createPlayer, G.playerCtl, G.pickups, G.spawnPickup
            （core；fx；weapons；items；build 交互）
game.js     G.game         （以上全部）
main.js     启动 + 自测    （以上全部）
```

> ⚠️ `gen.js` 必须在 `build.js` 之前：`build.js:292` 读 `G.CW/G.CH`。
> ⚠️ `build.js` 必须在 `player.js` 之前：`player.js` 的交互目标来自 `G.props`（build 填充）。

---

## 4. 启动流程

`index.html` 的脚本全部同步执行完后，`main.js` 的 IIFE 依次做：

| 序 | 行号 | 动作 |
|---|---|---|
| 1 | `main.js:5-15` | 建日志缓冲、注册 `window.onerror`、导出 `window.__log` |
| 2 | `main.js:19-31` | 创建 `WebGLRenderer`（`antialias:false`、`setPixelRatio(1)`、阴影开、ACES 色调映射曝光 1.35）。**失败则 `renderer=null`，逻辑模式继续跑**（无头测试靠这个） |
| 3 | `main.js:34-46` | Three.js 猴补丁：修复缺失 `boundingSphere` 的几何在视锥剔除时的问题 |
| 4 | `main.js:48-54` | 定义并绑定 `resize()` |
| 5 | `main.js:57` | `G.input.init()` |
| 6 | `main.js:59` | `G.ui.init()` —— 绑按钮与音量条 |
| 7 | `main.js:60` | `G.game.init()` —— 建场景 / 灯光 / 相机 / 子系统，`state='title'`，播标题 BGM |
| 8 | `main.js:61` | 首次 `resize()` |
| 9 | `main.js:63-95` | 按 URL 参数三分支：`?boottest` / `?shot` / 正常启动 |

### 4.1 `G.game.init()`（`game.js:9-63`）

```
G.scene = new THREE.Scene()
G.world = new THREE.Group()  → scene.add(G.world)     ← 静态几何挂这里
灯光：AmbientLight(.6) + HemisphereLight(.5) + DirectionalLight(.8)
      平行光 castShadow 仅在 renderer 存在时开启（game.js:19）
G.camera = PerspectiveCamera(46, 16/9, .1, 60)
G.fx.init(scene) / G.weapons.init(scene)       ← 一次性预分配所有对象池
G.props = [] / G.pickups = []
G.reticle = 地面瞄准环（加到 G.scene，不是 G.world）
G.onKeyPress = 钩子（Escape 暂停 / Tab 大地图）
this.state = 'title'
```

### 4.2 渲染分辨率（320p）

```js
// main.js:48-53
const aspect = innerWidth / Math.max(1, innerHeight);
const h = 320, w = Math.max(100, Math.round(h * aspect));
if (renderer) renderer.setSize(w, h, false);   // ← 第三参 false 是关键
```

`setSize(..., false)` 表示**不修改 canvas 的 CSS 尺寸**，canvas 靠
`index.html:13-14` 的 `width:100%;height:100%;image-rendering:pixelated` 拉伸到全屏，
形成像素放大效果。**改成 `true` 会破坏整个像素风外观。**

> 320p 是为了让 3D 文字精灵在低分辨率下仍可读（历史：原为 240p，文字糊到看不清）。
> 有回归断言 `main.js:1086` 锁定 `cv.height===320`。

---

## 5. 主循环

### 5.1 `G.game.frame(t)`（`game.js:437-460`）

```js
requestAnimationFrame(tt => this.frame(tt));        // 438 先注册下一帧
let dt = (t - this.lastT) / 1000;
if (dt > .1) dt = .1;                               // 443 dt 截断 100ms
const scaled = dt * G.fx.timeScale;                 // 444 慢动作缩放
if (!this.manual) {                                 // 445 自测时跳过整个逻辑推进
  if (G.fx.hitstopT > 0) G.fx.hitstopT -= dt;       // 446 顿帧用【真实 dt】
  else {
    this.acc += scaled;                             // 448 累加器吃【缩放后】dt
    const step = 1/60;
    let n = 0;
    while (this.acc >= step && n < 4) {             // 451 固定步长，最多补 4 帧
      this.update(step); this.acc -= step; n++;
    }
  }
  this.updateCamera(dt);                            // 453 相机用【真实 dt】
}
G.ui.updateCrosshair();
this.updateReticle(dt);
if (G.renderer) G.renderer.render(G.scene, G.camera);
G.input.endFrame();                                 // 459 清空 pressed（wheel 不在此清，2026-09-02 改由 consumeWheel 消费）
```

**关键语义**：
- 固定步长 `1/60`，`n<4` 是防死亡螺旋上限
- **顿帧期间完全不跑 `update()`**，连 `G.fx.update` 都不跑（因为它在 `update()` 内）
  → 顿帧时 `trauma` 与慢动作计时也一并冻结
- 相机、准星、瞄准环、渲染**不受 timeScale 和 hitstop 影响**
- `manual=true`（自测模式）时只渲染不推进逻辑，逻辑由测试手动 `G.game.update(1/60)` 驱动

### 5.2 `G.game.update(dt)` 的更新顺序（`game.js:327-389`）

**这个顺序是契约，不可重排。**

```
328  状态闸门：非 play/win/dead 时只跑 G.fx.update(dt) 就 return
329  G.input.stepBuffers(dt)        ← 必须最先，否则缓冲少扣一帧
331  run.time += dt
333  G.playerCtl.update(p, dt)      ← 玩家先动，决定本帧意图与朝向
335  spawnQueue 倒计时 → G.enemies.spawn()
346  空袭 strikes（预警环 → 爆炸）
356  皇冠飞行动力学
365  G.enemies.update(dt)
366  G.boss.update(dt)
367  G.weapons.update(dt)           ← 子弹在敌人之后推进
368  G.build.update(dt)
369  G.photo.update(dt)             ← 拍立得：照片碎片物理 / 扇光衰减 / 冻结名单清理
370  G.fx.update(dt)                ← 特效最后，读本帧定稿的实体状态
372  房间进入检测 + checkRoomClear  ← 在所有实体之后
378  G.ui.update(dt)
379  0.15s 节流刷新小地图 / 武器 / 属性 / 剩余敌人数
```

**为什么重要**：
- 玩家 → 敌人 → 子弹：子弹命中判定用的是敌人**本帧的新位置**，无隧道穿模。
  把 `weapons.update` 提到 `enemies.update` 之前，命中会错位一帧。
- `checkRoomClear` 必须在全部实体之后，才能看到本帧刚死掉的敌人（`e.dead`）。
  提前调用会导致清剿延迟一帧、且最后一击同帧的增援波判定错乱。

---

## 6. 状态管理

`G.game.state` 取值：`'boot'`（初始化前）→ `'title'` → `'play'` ⇄ `'pause'`；
`'play'` → `'transition'`（下潜中）→ `'play'`；`'play'` → `'dead'` / `'win'`。

| 转换 | 位置 | 触发 |
|---|---|---|
| → title | `game.js:50` | `init()` 末尾 |
| → play | `game.js:83` | `startRun()` |
| play ⇄ pause | `game.js:304-305` | `Escape` 钩子或按钮 |
| → transition | `game.js:237` | `descend()` |
| → dead | `game.js:289` | `loseRun()`（无 state 前置检查，只防重入） |
| → win | `game.js:259` | `winRun()`，由 `bossDefeated()` 延迟 1700ms 触发 |

**`state !== 'play'` 时 `update()` 直接 return**（`game.js:328`）——暂停时世界完全冻结，
但 `G.fx.update` 仍在跑（特效继续衰减）。

### 6.1 每局数据 `run`

```js
// game.js:65-67
{ time:0, kills:0, moneyEarned:0, dmgTaken:0, chests:0, roomsCleared:0, moneySpent:0, best:null }
```

`startRun()` 每次新建（`game.js:71`）；**`startFloor()` 不重置 run**（这就是"保留统计"的语义）。

### 6.2 楼层切换 `startFloor(n, isNew)`

> ⚠️ 第二个参数叫 **`isNew`**，不是"keepStats"。`!isNew` 时才会 `heal(2)` + 切 BGM。

```
1. floorNum = n                                  (game.js:102)
2. cleanupDynamic()                              (103)  ← 必须在 genFloor 之前
3. floor = G.gen.genFloor(n, 派生种子); G.floor = floor   (104-105)
4. G.build.buildFloor(floor)                     (106)  ← 内部先清空 G.world 并 dispose
5. 玩家定位到 startRoom 中心                      (108-110) ← 必须在 buildFloor 之后
6. markDiscovered(startRoom); curRoom = startRoom (112-113)
7. G.ui.floor(n); G.ui.minimap(this)             (114-115)
8. if(!isNew) heal(2) + 切 BGM                   (116-119)
```

`cleanupDynamic()`（`game.js:88-99`）清：敌人、Boss、子弹、拾取物、spawnQueue、strikes、
curRoom、curInteract、flyingCrown。**不清 `G.props`**（由 `build.buildFloor` 内 `G.props.length=0` 负责）。

**楼层号 2 在 `game.js:242` 硬编码**，主题表 `build.js:15-36` 也只有 1/2 两份。
加第三层必须同时改多处，见 `HIGH_RISK_AREAS.md` 的 H10。

---

## 7. 场景层级

```
G.scene                        ← 不清空，跨楼层常驻
├── G.world (Group)            ← build.buildFloor 每次整棵清空（build.js:284）
│   └── 地板 / 墙 / 门 / 道具 / 火把 / 装饰 / 文字牌
├── G.player.mesh                        (player.js:72)
├── 敌人 mesh                             (enemies.js:174)
├── Boss mesh                             (boss.js:99)
├── G.reticle 地面瞄准环                   (game.js:48)
├── 飞行中的皇冠                           (game.js:322)
└── fx 粒子池 / 光源池 / 冲击环池 / 伤害数字  (fx.js:13-37)
```

**规则**：静态几何挂 `G.world`（换层自动清理）；动态实体挂 `G.scene`
（必须靠 `cleanupDynamic()` 手动清理）。挂反了会导致
「换层后被静默销毁」或「跨层泄漏」。

---

## 8. 相机

`updateCamera(dt)`（`game.js:392-418`）：

- **瞄准射线**：鼠标屏幕坐标 → NDC → Raycaster → 与 **固定高度 `y=0.55` 的假想水平面**求交
  （`game.js:399`）。不是与地面网格求交。`t>0 && isFinite(t)` 才写 `aimX/aimZ`，否则保留
  上一帧值（isFinite 守卫防射线 NaN 污染，见 BUG_HISTORY.md FIX-024）。
- **跟随**：目标 = 玩家位置朝瞄准点外推 16%，指数 lerp `6*dt`（未做帧率归一化）
- **震屏**：`trauma²` 提供非线性衰减，`±0.7` 随机偏移
- **固定参数**：高度 14.2、后退 6.4、`lookAt(camX, .4, camZ-.2)`
- **无边界钳制**（代码中未发现任何 clamp 到房间/楼层范围的逻辑）
- 平行光跟随玩家：`dir.position = (p.x+6, 14, p.z+4)`

---

## 9. 核心数据结构

### 9.1 `floor`

```js
{ num, rooms[], doors[], tiles: Map<"x,z", tile>, rng,
  startRoom, exitRoom, bossRoom, tilesGet(x,z) }
```
（`gen.js:13, 233-235, 387`）
> `floor.props / floor.hazards / floor.decor` 初始化后**从未写入**，实际数据挂在 `room` 上——三个死字段。

### 9.2 `room`

```js
{ id, type, rx, rz, rw, rh,        // 网格坐标与尺寸（单位=房间，非 tile）
  doors[], neighbors[],
  cleared, discovered, visited, mapHint,
  enemyWaves, waveIdx, props[], spawnPts[], torches[], hazards[], decor[],
  depth, used, x0, x1, z0, z1, cx, cz,
  locked, lockTime, lockWarnT,     // 运行时创建，gen 不初始化
  bossSpawned, torchMeshes[], stock, stockPos[] }
```

`type` 取值：`start` / `combat` / `shop` / `treasure` / `exit` / `secret` / `npc` / `boss` / `shrine` / `gamble`

### 9.3 `tile`

```js
{ t, x, z }        // t 只有三种取值
```
| `t` | 附加字段 |
|---|---|
| `'floor'` | `.room` |
| `'wall'` | 隐藏门额外挂 `.secret`（门对象） |
| `'door'` | `.door`（门对象）、`.room = door.rooms[0]` |

**没有独立的走廊类型**——门本身就是走廊。

### 9.4 门

```js
{ id, rooms:[a,b], tiles:[[x,z],[x,z],[x,z],[x,z]], open:!secret, secret, broken:false, lockT:0, crackHp:3 }
```
（`gen.js:51`）

⚠️ `tiles` **恒为 4 个元素且顺序为 `[A,A,B,B]`**（2×2 开口）。
`build.js:362/703/705`、`main.js:399` 都硬依赖这个结构。

### 9.5 关键常量

| 常量 | 值 | 位置 |
|---|---|---|
| `CW` / `CH` | 15 / 11（tile） | `gen.js:4` |
| 房间网格范围 | 13 × 11 单元 | `gen.js:16` |
| 1×1 房内净空 | 13 × 9 tile | `gen.js:26` |
| 战斗房目标数 | 第1层 7 / 其它 9（含 start 房） | `gen.js:60` |
| 隐藏房数量 | **恒为 1** | `gen.js:208` |
| 最大子弹数 | 520 | `weapons.js:29` |
| 粒子池上限 | 340 / 光 7 / 环 10 / 伤害数字 26 | `fx.js:7` |
| Boss | HP 900，半径 1.05 | `boss.js:90` |
| 玩家 | HP 6，半径 0.34，移速 4.3 | `player.js:307,391` |
| 拍立得扇形闪光 | 72°（cone 1.25 rad）/ range 7.5 / 冻结 2.0s / 缓冲伤害 ×2 结算 | `weapons.js:21`、`photo.js` |
| 武器统一定价 | 品阶基准 ×±6% 特修：D 17 / C 39-42 / B 71-78 / A 122-138 弹壳 | `weapons.js:31`（TIER_PRICE/priceOf） |
| RNG 默认种子 | `88675123`（种子 0 时回落） | `core.js:17` |

---

## 10. 随机数系统

**xorshift32**（`core.js:16-25`）。支持种子，且存在**多个独立实例**：

| 实例 | 位置 | 用途 |
|---|---|---|
| `G.rng` | `core.js:27` | 全局默认，`Date.now()` 播种 |
| 每局重置 | `game.js:70` | `startRun()` 时 `new G.RNG(Date.now() ^ random)` |
| 楼层种子 | `game.js:104` | `(G.rng.next() ^ 0x9e3779b9) >>> 0` 派生 |
| `genFloor` 内部 | `gen.js:11` | **局部** `new G.RNG(seed)`，与 `G.rng` 解耦 |
| 自测固定种子 | `main.js:133` | `20260831` |
| 压测 | `main.js:1067` | `new G.RNG(90000 + i*7919)` |

⚠️ **重要**：`Math.random()` 与种子 RNG **混用**。散射角、暴击判定、拾取物浮动相位、
全部特效随机数、以及 `gen.js:456` 的运行时出生点选取，都用 `Math.random()`。
因此**"同种子完全复现"目前只对地形生成与掉落/商店库存成立，战斗过程不可复现**。

⚠️ 若"重设 `G.rng` 即换种子"，**对地形无效**（地形用的是 `gen.js:11` 的局部实例）。

---

## 11. 输入系统

在 `core.js:188-231`，**没有独立的 input.js**。

- **键位**：`WASD`/方向键 → 轴向，对角乘 `0.70711` 归一化
- **鼠标**：`mousemove` 只记 `clientX/clientY`；左键 `mouse.down`、右键 `mouse.rdown`；
  滚轮累加 `Math.sign(deltaY)`
- **世界瞄准点** `aimX/aimZ` 不在 core 里算，由 `game.updateCamera` 用射线写入
- **输入缓冲**（`core.js:191, 225-228`）：
  按下瞬间写 `pressed[code]=true` 且 `buffer[code]=.18`（0.18 秒内仍可生效）。
  消费方统一写 `inp.pressed[X] || inp.buffered[X]`（`player.js:5` 的 `inpPressedOrBuffered`）。
  用于 `Space` 翻滚、`KeyR` 装填、`KeyF` 主动技、`KeyE` 交互。
  > **设计目的**：顿帧期间、或玩家提前按下时，不吞按键。
- `G.onKeyPress` 是**单一全局钩子**（`core.js:198` 触发），由 `game.js:53` 赋值。
  **不是多播**——其他模块若也赋值会静默覆盖掉 Esc/Tab 处理。
- `endFrame()`（`core.js:229`）每渲染帧末尾清 `pressed`；**`wheel` 不在此清**（2026-09-02）——
  高刷屏下渲染帧多于逻辑帧，事件会在两次 `update` 之间被 `endFrame` 清掉丢失；wheel 由
  `consumeWheel()` 消费，shop 开/关时重置（`shop.js`）

---

## 12. 对象池（性能敏感）

项目在启动时一次性预分配所有高频对象，**运行时零 GC 分配**：

| 池 | 容量 | 位置 | 满时行为 |
|---|---|---|---|
| 子弹 | 520 | `weapons.js:27-40` | **静默返回 null，不替换** |
| 粒子 Sprite | 340 | `fx.js:13-17` | **静默丢弃** |
| PointLight | 7 | `fx.js:19-23` | 抢占"剩余寿命比例最小"的 |
| 冲击环 | 10 | `fx.js:25-29` | **静默丢弃** |
| 伤害数字 | 26 | `fx.js:31-37` | — |

⚠️ **池满静默丢弃是有意的降级设计**，不要"优化"成抢占式替换。
⚠️ `W.spawn` 返回 `null` 时调用方**不检查**（`weapons.js:88/106`），
表现为高负载下"偶发哑火"，无任何日志。

**持续光源**用"续约模型"：`fx.holdLight(id, ...)` 每次调用续 0.2s（`fx.js:94`），
火把等光源靠每帧调用维持，停止调用即熄灭。

---

## 13. 相关文档

- 各玩法系统详解 → `GAME_SYSTEMS.md`
- 高危区与"为什么这样实现" → `HIGH_RISK_AREAS.md`
- 测试与验证 → `PROCEDURES.md`
