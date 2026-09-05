# HIGH_RISK_AREAS.md — 高危区与「为什么这样实现」

> **动任何一行代码之前先读这份文件。**
>
> 未来 Agent 最需要的不是"这里有一个 WeaponManager"，而是"为什么 WeaponManager 要这样设计"。
> 下面每一条都按 **问题/背景 → 原因 → 当前解决方式 → 为什么不能随意改** 的结构记录。

---

## 0. 速查：改之前必须三思的地方

| # | 区域 | 一句话警告 |
|---|---|---|
| H1 | 清剿判定 | 绝不能加"整房超时自动清场" |
| H2 | `build.js` 几何缓存 | 绝不能给缓存几何加 `disposable` 标记 |
| H3 | `G.hurtEnemy` 参数 | 第 5 参 `ignoreBlock` 是隐式契约 |
| H4 | `update()` 更新顺序 | 顺序即契约 |
| H5 | 门的 4-tile 结构 | 多处硬依赖 `[A,A,B,B]` |
| H6 | `G.props` / `G.pickups` 数组引用 | 会被整体 length=0，不能缓存引用 |
| H7 | 共享材质/几何单例 | 就地改颜色会污染全场 |
| H8 | 被动效果 apply | 没有 unapply，重复调用永久叠加 |
| H9 | Boss 伤害路径 | 已修复（FIX-019），但 `G.boss` 命名陷阱仍在，见 H11 |
| H10 | 楼层号 | 硬编码 2，多处耦合 |
| H11 | `G.boss` 命名空间 | `G.boss` 是模块对象，实例在 `.active` |
| H12 | 文字精灵 `depthTest:false` | 刻意的穿墙显示 |
| H13 | 输入缓冲与 `endFrame` | 调用时机敏感 |
| H14 | `hitstopT` / `timeScale` | 跨模块耦合的 dt 语义 |
| H15 | `G.onKeyPress` | 单一全局钩子，不是多播 |
| H16 | `G.world` vs `G.scene` | 静态/动态挂错 → 静默销毁或跨层泄漏 |
| H17 | 移动碰撞 | 前缘单列采样，不做扫掠，高速会穿墙 |
| H18 | RNG 体系 | `Math.random()` 混用 + 局部实例，重设种子对地形无效 |
| H19 | 对象池满 | 静默丢弃是刻意降级，勿改抢占式 |
| H20 | 翻桌欧拉角 | `YXZ` 顺序，改 `XYZ` 朝向全错且不报错 |
| H21 | 翻桌不挡玩家子弹 | 刻意的，统一化会让玩家卡死自己输出 |
| H22 | 子弹伤害倍率 | 生成时快照，改实时计算会改已发射子弹的伤害 |
| H23 | 玩家模型朝向 | forward=+X + `rotation.y=-face` 无魔法角度；射线 isFinite 守卫不得删 |
| H24 | 照片态材质换装 | `_pm0`（照片）与 `_om`（闪白）键位独立；拍照前必须先 clearFlash |
| H25 | Boss 分发层 | `G.boss.active` 必须与 voidking 实例同步 |
| H28 | 悖论骰子 | 骰体材质专用不复用（H7）；冻结 pinT 三处清理齐全；PARADOX 全房伤害走 G.boss.active |

---

## H1. 清剿判定：绝不能加"整房超时自动清场"

**问题/背景**
早期存在过「25 秒保底清敌」机制：房间锁定超过 25 秒就自动清空剩余敌人。

**为什么错**
清剿的语义被错误地等同于"时间到"。实际游戏中，玩家绕后打盾卫、躲图腾激光、
等狙击手瞄准间隙，都是**正常且需要时间的慢节奏战斗**。超时清场会让敌人在玩家
眼前凭空消失，摧毁这些玩法的意义。

**当前解决方式**（`game.js:164-191`）
```js
// 残敌提醒：长时间未清剿时周期性提示剩余数量（仅提示，绝不自动清除）。
// 反软锁由敌人系统的"位置非法 0.8 秒自愈"负责（只处理卡墙敌人），
// 不做整房超时清空——避免慢节奏战斗（绕后盾卫/躲避激光）中敌人凭空消失。
```
- 每帧扫描**全部**锁定战斗房（不依赖玩家位置）
- 锁定 30s 后每 15s 提示一次剩余敌人数，**仅提示**
- 反软锁改用四道针对性防线（见 H1.1）

**为什么不能随意改**
- 自测步骤 `25_慢节奏战斗不误清` 专门锁死了这条：
  挂机 35 秒断言哨兵敌人仍存活且房间仍锁定。
  > `assert(sentinel.dead===false,'哨兵敌人被超时机制误清除（慢节奏战斗清场回归）');`
- 加回任何形式的超时清场，这个断言立刻失败

### H1.1 反软锁的四道防线（替代方案，缺一不可）

| 防线 | 位置 | 作用 |
|---|---|---|
| 1. 出生点规避 | `gen.js:449-463` | 运行时跳过 `blocksBullets` 掩体取点 |
| 2. 落点校验 | `enemies.js:446-460` `nearbyLegalPos` | 召唤/分裂时找合法落点 |
| 3. 每帧掩体推出 | `enemies.js:309-320` | 与道具重叠的敌人被径向推出 |
| 4. 0.8 秒自愈 | `enemies.js:276-296` | 持续处于非法位置 0.8s 则消灭 |

> 注释（`enemies.js:308`）：`// 掩体卡模排除：与实体道具重叠的敌人被径向推出
> （避免其被柱子完全遮挡而无法击杀，导致房间清剿软锁）`

⚠️ 第 4 道走的是"直接标记 `dead` + 手动移除 mesh + 手动 splice"路径，
**不走 `E.kill`** —— 因此不掉落、不计击杀、不触发自爆/分裂。这是刻意的。

---

## H2. `build.js` 的几何缓存：绝不能加 `disposable` 标记

**问题/背景**
`build.js:8-11` 的 `pgeo(key, fn)` 是**模块级缓存**，跨楼层复用且**永不清理**。

**为什么这样设计**
道具/火把/装饰的几何在所有楼层都一样，缓存起来避免每层重建，加快换层速度。

**当前解决方式**
- 缓存里的几何**没有** `userData.disposable` 标记
- 换层时 `buildFloor`（`build.js:284-290`）遍历 `G.world` 子节点，
  **只 dispose 带 `userData.disposable` 标记的几何与贴图**
- 一次性 `new GeoBuilder()` 构建的几何（地板/墙/门等）才打这个标记

**为什么不能随意改**
> 一旦给 `pgeo()` 返回的几何加上 `userData.disposable`，
> 进入第二层时 `dispose()` 会销毁仍在 `_cache` 中的几何
> → **第二层所有道具、火把、装饰集体不可见**，且不报任何错。

释放循环只认这一枚标记，**没有任何保护**。

---

## H3. `G.hurtEnemy` 的第 5 参 `ignoreBlock` 是隐式契约

**问题/背景**
盾卫（shield）需要"正面格挡、背后可打、爆炸无视格挡"三种行为。

**当前解决方式**（`enemies.js:195`）
```js
E.hurt = function(e, dmg, ang, knock, ignoreBlock){ ... }
```
| 调用点 | 参数个数 | 效果 |
|---|---|---|
| 普通子弹 `weapons.js:314` | 4 | `ignoreBlock=undefined` → **可格挡** |
| 电弧链 `weapons.js:139` | 5 (`true`) | **无视格挡** |
| 爆炸 `weapons.js:164` | 5 (`true`) | **无视格挡** |

**为什么不能随意改**
- `ignoreBlock` **没有默认值**
- 任何"统一参数个数""重排形参"的清理动作，都会**静默反转盾卫的全部战斗手感**
  （普通子弹变得不可格挡 / 爆炸变得可格挡）
- **不会有任何报错**，只有自测步骤 26 会失败
- 自测覆盖：`main.js:744-784` 的 `26_盾卫格挡与破防`
  验证了 4 连格挡 / 第 5 次破防 / 破防窗口掉血 / 恢复格挡 / 背面 / 爆炸六项

---

## H4. `game.update()` 的更新顺序是契约

**顺序**（`game.js:329-376`）：
```
stepBuffers → player → spawnQueue → strikes → crown
→ enemies → boss → weapons → build → fx → 房间检测/清剿判定 → ui
```

**为什么这个顺序**
| 相邻关系 | 原因 |
|---|---|
| `player` 先于 `enemies` | 敌人 AI 需要读玩家本帧的位置与朝向 |
| `enemies` 先于 `weapons` | 子弹命中判定用敌人**本帧的新位置**，避免"子弹追着上一帧的敌人" |
| `checkRoomClear` 在最后 | 才能看到本帧刚死掉的敌人（`e.dead`），提前调用会清剿延迟一帧 |
| `stepBuffers` 最先 | 否则缓冲会少扣一帧 |

**为什么不能随意改**
- 把 `weapons.update` 提到 `enemies.update` 之前 → 命中错位一帧、视觉脱节
- 把 `checkRoomClear` 提前 → 清剿延迟一帧，且最后一击同帧的增援波判定错乱
- 把 `stepBuffers` 后移 → 输入缓冲少扣一帧

---

## H5. 门的 4-tile 结构

**当前实现**（`gen.js:41, 49`）
```js
tiles: [[x0,zc],[x1,zc],[x0,zc+1],[x1,zc+1]]   // 恒 4 个，顺序 [A,A,B,B]
```

**依赖这个结构的地方**
| 位置 | 用途 |
|---|---|
| `build.js:362, 703` | 用 `tiles[0]` / `tiles[3]` 求门中心 |
| `build.js:361, 705` | 用 `tiles[0][0] !== tiles[1][0]` 判门的朝向 |
| `main.js:399` | 隐藏门测试 |

**为什么不能随意改**
改变 tiles 的数量或顺序 → 门位置、闸门朝向、隐藏墙朝向**同时错乱**。

---

## H6. `G.props` / `G.pickups` 是会被整体清空的全局数组

**当前实现**
- `G.props=[]` 在 `game.js:35` 初始化一次
- `build.js:291` 用 `G.props.length = 0` 清空（**不重新赋值**）
- `G.pickups=[]` 在 `game.js:36` 与 `player.js:898` 初始化，`game.js:93` 用 `.length=0` 清空

**为什么安全**
因为**每一处读写都通过 `G.pickups` / `G.props` 动态取值**。

**为什么不能随意改**
一旦有人写 `const pickups = G.pickups` 缓存引用，或调整 `index.html` 的加载顺序，
就会出现"拾取物凭空消失"或"重复出现"。

---

## H7. `G.mat / G.bmat / G.pmat / G.tex / G.*Geo` 是全局共享单例

**当前实现**（`core.js:30, 41, 56, 132, 166`）
按 key 缓存，返回**同一个对象**给所有调用方。

**为什么不能随意改**
任何"顺手改个颜色"的就地修改（如 `G.mat(0xff0000).color.set(...)`）
会同时改变场景中**所有复用该 key 的物体**。

⚠️ 特别：`fx.js:48` 把 `G.pmat()` 结果赋给 `p.sp.material` 正是**依赖共享**。
切勿改成 `new THREE.SpriteMaterial(...)`——340 个粒子的池每帧会产生新材质，GC 直接崩。

---

## H8. 被动效果没有 `unapply`，不能重复 apply

**当前实现**
`items.js:83`：`p.passives.push(id)` 后**立即调用一次 `apply(p)`**，直接累加到 `p.st.*`。

**为什么不能随意改**
- 没有 `unapply`，没有 `recalcStats`
- 唯一"重置"途径是 `startRun()` **新建玩家对象**（`game.js:77`）
- **任何让 `apply` 被调用两次的逻辑都会永久叠加属性**
- `p.maxHp += 2`（`items.js:16`）、`maxArmor += 1`（`:17`）是直接改玩家字段，**不能重入**

⚠️ 自测步骤 10（`main.js:378`）正是靠重复 apply 来触发测试的。

---

## H9. Boss 伤害路径（2026-09-01 已修复）

**问题**
`weapons.js` 中 5 处 Boss 伤害判定全部把 `G.boss` 当成 Boss **实例**，
但 `G.boss` 是**模块对象**（`boss.js:379` 的 `G.boss = B`，而 `B = { active:null }`）。

**受影响的代码**
| 位置 | 判定 | 实际结果 |
|---|---|---|
| `weapons.js:331` | `G.boss.spawnT<=0` | `undefined<=0` → **false**，整段不执行 |
| `weapons.js:166-168` | `dist(x,z,G.boss.x,G.boss.z)` | `NaN`，比较恒 false |
| `weapons.js:223-226` | `rr = G.boss.r + b.size` | `NaN`，比较恒 false |
| `weapons.js:133-135` | 电弧链选目标 | `NaN`，永不选中 Boss |
| `weapons.js:238` | 追踪弹选目标 | `NaN`，永不选中 Boss |

**已实证**（2026-09-01 无头探针）
```
发射 60 发步枪弹：Boss HP 900 → 900   掉血 0
爆炸 explode(dmg=50)：HP 800 → 800    掉血 0
直接 G.hurtBoss(100)：HP 900 → 800    掉血 100   ← 只有这条有效
```

**为什么自测没发现**
`main.js` 步骤 17 是直接调 `G.hurtBoss(370)` / `G.hurtBoss(320)` 推进阶段的，
**完全绕开了武器系统**。

**修复**（2026-09-01 实施，FIX-019）
5 处已统一改为 `const boss = G.boss && G.boss.active;` 再判定。
并新增回归锁：自测步骤 `35_Boss可被真实子弹与爆炸伤害`（走真实子弹链路，不直接调 `hurtBoss`）。

⚠️ **遗留教训（永远有效）**：
1. `G.boss` 是模块对象、实例在 `.active` —— 新代码一律先取实例（见 H11）
2. 写 Boss 测试的坑：`B.hurt` 对 `intro`（出场演出）状态**直接免伤**，
   测试须把状态置为 `cool`，否则会误判修复无效

详见 `docs/BUG_HISTORY.md` 的 `FIX-019`。

---

## H10. 楼层扩展的耦合点（2026-09-05 第四层已完成，加第 5 层前必读）

**✅ 已完成**：第 1~4 层全部接入。第 4 层「失序维度」使用独立生成器 ``gen4.js``（不复用 ``gen.js``），
主题 4 不渲染高墙（悬浮平台+能量描边+深渊底平面），终点层号 4（Boss 击杀即通关）。
``descend()`` 已通用化、``makeExit`` 文案动态化、四层敌人池/陷阱/BGM 齐备（详见 ``GAME_SYSTEMS.md`` §6）。

**加第 5 层时仍需同步的位置**
| 位置 | 内容 |
|---|---|
| ``game.js`` descend 内 ``FLOORS`` 映射表 | 第 5 层名称/提示 |
| ``game.js`` ``bossDefeated`` 的 ``floorNum<4`` 分流 | 终点层号 4→5 |
| ``game.js`` ``startFloor`` 的 music 数组 ``['','f1','f2','f3','f4']`` | 需加 f5 |
| ``build.js`` ``B.themes`` | 需加 ``5:{...}``（缺主题会在 ``this.themes[floor.num]`` 崩溃） |
| ``ui.js`` ``floor()`` 与大地图的 ``NAMES`` 数组 | 层名 |
| ``audio.js`` ``tracks`` | 需加 f5 曲目 |
| 生成器分流 ``game.js startFloor`` | 第 5 层可复用 gen.js 或新建 gen5.js（第四层走 gen4 分支） |
| ``main.js`` STEP 17/45/72 | 终点层变化时回归断言要适配 |

**第四层生成器特有陷阱（gen4.js）**：
- ``layBridge`` BFS 路径允许途经既有桥房汇接为枢纽，但**终点必须是目标房本身**——旧版曾把终点改接到桥房，
  产生「互相连通但与主图断开的孤立簇」→ conn 校验全失败（2026-09-05 已修复，见 DEVELOPMENT_LOG）。
- ``hookToLinked(target)`` 是 arm 连不上核心时的兜底：挂到「当前与核心连通的任意房间」（含桥房枢纽），
  按距离取前 4 候选。新增连接逻辑时必须先尝试直连再 hook，否则会产生不必要的长桥。
- 新铺自由格 >6 放弃（防细线地图）；路径总步数 >14 放弃；桥房是**房间**不是走廊（复用门/锁/清剿逻辑）。
- **桥面/房间尺寸与边界是联动调参**（2026-09-05 实测教训）：bridge 掩码 5-tile 中带、主区全 ≥2×2、
  边界 23×21、freeCnt≤6 是一组平衡解——单方面收紧任一项会导致 zones<10/armsL 重试链全败
  （曾实测 24%/6.8%/1.3% 生成失败率）。改参数必须跑 300 种子几何探针验证 0 失败。
- **foldgate 传送落点必须是 gen4 产出的 out**（合法地板 tile 中心）——直接按 mech 坐标+偏移 set 玩家坐标
  会把玩家传出悬浮平台到虚空（FIX-030）。任何第四层「set 坐标式传送」都要以合法 tile 为落点。
- 特殊功能房由 ``takeSpecial`` 统一 ``shape='rect'``——特殊房的布点逻辑（商店 bbox 一条线/柜台贴北墙/
  宝箱 3×3 fallback）全部按矩形 bbox 推算，不要给特殊房换回非矩形 shape。
- 锁定房的门兜底（game.js checkRoomClear）：玩家不在房内→门开、回房→门关（站门 tile 上不关防夹）。
  正常游玩不可达此分支（门关着出不去），它只兜「玩家被异常隔在房外」的软锁——勿当作常规开关门逻辑改。

---

## H11. `G.boss` 是模块对象，不是实例

这是 H9 的根因，单独列出以防未来 Agent 再踩：

```js
const B = { active: null };      // boss.js:5
G.boss = B;                      // boss.js:379
G.hurtBoss = dmg => B.hurt(dmg); // boss.js:380
```

| 写法 | 含义 |
|---|---|
| `G.boss` | 模块对象：`{ active, spawn(), update(), hurt(), clear() }` |
| `G.boss.active` | Boss 实例本体（未生成时为 `null`） |
| `G.game.boss` | **不存在** |
| `G.boss.x / .z / .r / .spawnT / .dead` | **全是 `undefined`** |

⚠️ 这是本项目**最容易写错**的地方，因为直觉上 `G.boss` 就该是 Boss。
对比：`G.enemies` 也是模块对象，实例列表在 `G.enemies.list`；
`G.player` 才是真正的玩家实例（命名不一致是历史遗留）。

---

## H12. 文字精灵的 `depthTest:false` 是刻意的

**当前实现**（`build.js:51`）
```js
material = new THREE.SpriteMaterial({ map: tx, transparent:true,
                                      depthWrite:false, depthTest:false });
```

**为什么**
注释（`build.js:663`）：`// 商品名 + 价格双牌（高分辨率像素字 + 描边，
穿墙深度关闭保证不被货架遮挡）`

商店价格牌如果开启深度测试，会被柜台和货架挡住，玩家看不到价格。

**为什么不能"修复"这个"穿墙 bug"**
关掉 `depthTest` 会让商店文字牌被遮挡 → 历史 Bug 复发
（自测步骤 `27_商店价格可见` 会失败）。

⚠️ 注意 `iconSprite`（`build.js:82`）**没有**关 `depthTest`，两者不一致——
这是已知的，不是遗漏要"统一"的地方。

---

## H13. 输入缓冲与 `endFrame` 的调用时机

**当前实现**
- `core.js:191` 按下瞬间写 `buffer[code] = .18`
- `core.js:229` `endFrame()` 清 `pressed`（**wheel 不再在此清**，2026-09-02 修复滚轮丢帧：
  高刷屏渲染帧多于逻辑帧，两次 update 之间到达的滚动会被中途 endFrame 吞掉）
- `game.js:459` 每**渲染帧**末尾调用一次 `endFrame()`
- `game.js:329` `stepBuffers(dt)` 每**逻辑帧**倒计时

**为什么敏感**
固定步长循环里，一个渲染帧可能跑 0~4 次 `update()`（`game.js:451`）。
- 把 `endFrame` 移进 `update()` → 多步帧会丢按键
- 漏调 `endFrame` → 按键重复触发

⚠️ 自测代码 `main.js:125, 212, 270` 也在手动调 `endFrame`，改动需同步。

⚠️ ~~`endFrame` 与 `consumeWheel()` 都把 wheel 归零，语义重叠~~ → **2026-09-02 已修复**：
  wheel 只由 `consumeWheel()` 归零，`shop.js` 开/关时重置（防店内滚动累积爆发切枪）；
  `player.js` 切枪改为按累积幅度多步切换（`((wheel%n)+n)%n`，滚 N 格切 N 把）。

---

## H14. `hitstopT` 与 `timeScale` 的 dt 语义跨模块耦合

**当前实现**
| 项 | 位置 | 用的 dt |
|---|---|---|
| `hitstopT` 递减 | `game.js:446` | **真实 dt** |
| 累加器 | `game.js:448` | **缩放后** dt（`dt * fx.timeScale`） |
| 慢动作衰减 | `fx.js:195-196` | 缩放后 dt |
| `trauma` 衰减 | `fx.js:194` | 缩放后 dt |
| 相机 | `game.js:453` | 真实 dt |

**为什么这样**
顿帧必须按真实时间倒计时，否则在慢动作下顿帧会被拉长。

**为什么不能随意改**
- 把 `hitstopT -= dt` 改成 `-= scaled`：慢动作期间顿帧显著变长
  （`loseRun` 会同时触发 `slowmo(.3,.8)`，二者叠加）
- 顿帧期间**不调用 `G.fx.update`**（因为在 `update()` 内）→ `trauma` 与慢动作计时一并冻结。
  若要"顿帧时特效继续"，不能简单把 `fx.update` 提到 hitstop 判断外（会让粒子继续飞）

---

## H15. `G.onKeyPress` 是单一全局钩子

**当前实现**
`core.js:198`：`if(G.onKeyPress) G.onKeyPress(code, e);`
`game.js:53` 赋值（Escape 暂停 / Tab 大地图）。

**为什么危险**
**不是多播**。任何其他模块若也赋值 `G.onKeyPress`，会**静默覆盖**掉 Esc/Tab 处理，
而表面上看不出任何问题。

---

## H16. 场景层级：`G.world` vs `G.scene`

**当前实现**
- `G.world`：静态几何（地板/墙/门/道具/火把），`build.buildFloor` 每次整棵清空
- `G.scene`：动态实体（玩家、敌人、Boss、瞄准环、皇冠、fx 池），靠 `cleanupDynamic()` 手动清

**为什么不能随意改**
- 把动态实体挂到 `G.world` → 换层时被**静默销毁**
- 把静态几何挂到 `G.scene` → 跨层**泄漏**

⚠️ **还有第三层：HTML 世界标签层 `tagLayer`（DOM，不在 three.js 场景里）**。
基地/标题的 `base.tag()` 把文字标签写进 `tagLayer`，`build.buildFloor()` 清理旧世界时
**必须同步 `G.base._clearTags()`**（2026-09-04 已补），否则基地文字会穿模叠加到地牢画面。
新增任何"写进 tagLayer 的标签"都要记得在换层/回标题时清理。

---

## H17. 移动碰撞：只采样前缘单列 tile，不做扫掠

**当前实现**（`gen.js:413-448`）
分轴推进，每轴只采样**前缘所在的 1 列** tile，命中则吸附。

**为什么危险**
- 单帧位移 ≥ 1 tile 时会**穿墙**
- 目前安全裕度依赖帧率：最高速是 Boss 冲撞 9 u/s，翻滚 14 u/s 但只有 .26 秒
- `.02` 是双向补偿（横向内缩防角落误判、纵向外扩防贴边卡住），**不能改成 0**

**若新增冲刺/传送/高速位移**：必须同步加子步进，否则穿墙。

⚠️ 道具推挤（`gen.js:438-447`）在分轴碰撞**之后**执行，推出后**不回检墙体**，
理论上可被推进墙里。敌人靠 0.8s 自愈兜底，**玩家没有对应兜底**。

---

## H18. RNG 体系的三个陷阱

1. **`Math.random()` 与种子 RNG 混用**：散射角、暴击、拾取物相位、全部特效、
   `gen.js:456` 的运行时出生点都用 `Math.random()`。
   → **同种子不可复现战斗过程**，只可复现地形与掉落。
   改成 `G.rng` 会消耗 RNG 序列，改变后续地图生成。

2. **`gen.js:11` 用局部 RNG 实例**：重设 `G.rng` **对地形无效**。

3. **`core.js:17`**：种子 0 会回落到默认常量 `88675123`。

---

## H19. 对象池满时静默丢弃是刻意降级

**当前行为**
`W.spawn` 池满返回 `null`（`weapons.js:81-82`），调用方**不检查**。
粒子/冲击环池满静默丢弃（`fx.js:41-54, 99-102`）。

**为什么不能"优化"成抢占式替换**
抢占会打断正在播放的关键特效。静默丢弃虽会"偶发哑火"，但不会破坏已有表现。

**如果你真的要改**：至少要加日志，否则无法排查。

---

## H20. 翻桌的欧拉角顺序

**当前实现**
`build.js:405`：`pr.mesh.rotation.order = 'YXZ'`
`build.js:803`：`rotation.set(-sin(k*π/2)*1.25, -(flipAng||0), 0)`

**为什么**
注释（`build.js:802`）：`// YXZ 顺序：先绕 Y 对准玩家瞄准方向（桌面法线朝敌），再绕 X 前倾立起`

**为什么不能改**
改成 `'XYZ'` 会得到完全错误的朝向，**且不报错**。
自测 `main.js:415-416` 有针对此的回归断言。

---

## H21. 翻倒的桌子不挡玩家子弹

**当前实现**（`weapons.js:295`）
```js
if(pr.type==='table' && pr.flipped && b.team==='p') continue;
```

**为什么**
注释（`weapons.js:292`）：`// 道具掩体（翻倒的桌子只挡敌方子弹——玩家的可靠掩体，不挡自己的输出）`

**为什么不能"统一化"**
若把所有 `blocksBullets` 一视同仁，玩家会被自己的掩体卡住输出。
自测 `main.js:423` 有断言：`assert(table.hp===hp0,'玩家子弹击中了自己的掩体（应穿透）')`

---

## H22. 子弹的伤害倍率是生成时快照

**当前实现**
`weapons.js:94` 在生成子弹时就把 `dmgMul`、暴击倍率固化进 `b.dmg`。

**为什么**
避免飞行途中属性变化导致伤害不一致。

**为什么不能"改成实时计算"**
- 会改变已发射子弹的伤害
- （历史注：环绕星刃曾有独立的取倍率路径，2026-09-01 深夜随武器删除，本条只剩常规弹一路）

---

## H23. 玩家模型 forward=+X 与朝向链路（2026-09-01 VEX-07/VOID HUNTER 批次）

**当前实现**
- 模型几何的**正前方是本地 +X**（目镜缝/能量核心在 +X，披风在 -X）。
  VOID HUNTER 二次重做只换了造型与材质（5 层专用 MeshStandardMaterial），
  **层级与 forward 约定未动**；新增 `capeSeg`（披风段）/`orbits`（悬浮碎片）引用、
  `pmats()` 专用材质与 `resetPmats()`（新一局必须复位死亡淡出 opacity）。
- 朝向链路：`updateCamera` 射线求交（含 `isFinite` 守卫）→ `aimX/aimZ` →
  `face` → `mesh.rotation.y = -face`，**链路上没有任何魔法角度补偿**。
- 辉光/随身灯挂在 `bodyG`（body 空间原点=世界脚底），不挂 `rollG`。

**为什么不能改**
- 若有人给模型或根节点"顺手补一个 ±90°/180° 修正"，8 方向瞄准会全错
  （正确性由步骤 39 的 8 方向收敛断言锁定）。
- `isFinite` 守卫看似多余——它防的是开局首帧相机未俯视 + 鼠标正中心像素时
  `0*Infinity=NaN` 永久污染相机与朝向（FIX-024），删掉后低频必现且极难排查。
- 辉光挂错父节点不会报错，只会静默飘到头顶上方 0.55（步骤 39 第 ④ 段锁定）。

---

## H24. 照片状态与受击闪白：两套材质换装的键位契约（2026-09-01 拍立得批次）

**当前实现**
- 敌人/Boss 的受击闪白用 `traverse` 把材质换成 `G.flashMat`，原材质备份在
  `userData._om`；拍立得的灰调相纸换装（`setLook`，`photo.js:79`）用**独立键位
  `userData._pm0`** 备份原材质，另用 `_ps0` 隐藏怨灵光环/精英红光等 sprite。
- 拍摄瞬间若目标正处于闪白，`clearFlash()`（`photo.js:90`）必须**先**还原 `_om`
  再 `setLook(on)`——否则 `_pm0` 会把 `G.flashMat` 当成"原材质"存下来，
  解冻后实体永久停留在闪白材质上（无任何报错）。
- 照片态实体不会再进受击闪白：`hurtEnemy`/`hurtBoss` 在照片态直接改道
  `G.photo.record()`（`enemies.js:200`、`boss.js:128`），闪白路径根本不触发。
- 清场复位：`reset()`（`photo.js:66`）+ `removeFrame` + `setLook(false)`，
  挂在 `E.clear` / `B.clear` / 新一局链路（`enemies.js:183`）。

**为什么不能改**
- 不要把 `_pm0` 合并进 `_om`"省一个字段"——两套机制写入时机不同，合并后
  "先闪白后拍照 / 先拍照后闪白"的还原顺序会互相踩。
- 不要让照片态实体恢复普通受击闪白（绕过 `record` 改道）——闪白会覆盖相纸材质，
  `photoBuf` ×2 结算链路失去视觉载体。
- 自测 STEP 40 锁定全链路（拍摄/冻结/缓冲/×2/弹幕恢复/碎裂）。

---

## H25. Boss 分发层：`G.boss.active` 必须与 voidking 实例同步（2026-09-02 第三层批次）

**背景**：第 3 层起 `boss.js` 的 `spawn/clear/hurt/update` 四入口按 `G.game.floorNum>=3`
分发到 `G.voidking`（`voidking.js`，无面君主）。

**契约**
1. `B.spawn` 分发后必须 `this.active = voidking实例` —— 外部武器/爆炸/环绕刃伤害判定
   **全部走 `G.boss.active`**（见 H9/H11）。不同步则新 Boss 免疫一切玩家伤害，
   且没有任何报错——测试若只断言 `G.voidking.active` 存在也照样漏网。
2. voidking `dying` 结束必须回写 `G.boss.active=null`（与铁颚 `B.update` dying 语义对齐），
   否则死实例残留在 `G.boss.active` 上。
3. `B.clear` 先分发给 voidking 再走通用清理（`this.active=null` + `bossBar(false)`）。

**为什么不能改**
- 自测 STEP 45 的「`G.boss.active===vk`」与「`G.hurtBoss` 路由」断言就是这道契约的回归锁；
  未来加第 5 个 Boss/第 5 层时，分发函数必须保持同样的同步纪律（新 Boss 必须在旧 Boss 之前检查）。

---


## H28. 悖论骰子的三类纪律（2026-09-04 骰子重做批次）

**背景**：重做后的悖论骰子（`dice.js`，G.dice）带来三处容易踩的坑。

**红线**：
1. **骰体材质绝不共享**：`G.dice.mats()` 的 `_m` 单例是专用材质，emissive 随面光
   （落定结果面 / PARADOX 演出）逐帧改写。若被人改成复用 `G.mats` 全局共享材质 → 改写
   emissive 会污染全场其他物体（H7 同类）。`buildDie()` 六面 = 面版 + 点数凸点，
   面组局部 +Z 朝外，改朝向须同步 `FACE_UP` 四元数表。
2. **冻结 `pinT` 是独立的停止行动机制**：掷 4 命中走 `kind:'dice4'` → `e.pinT`（停止
   移动/攻击/动画，冰晶 `_iceMesh` 包裹）。它**不是**照片冻结（photo.js），两者键位独立。
   `pinT` 的解除/清理三处必须齐全：到期解除 + `E.clear` + `E.kill`（漏一处 → 敌人死亡后
   冰晶 mesh 泄漏或冻结残留）。改 `G.hurtEnemy` 参数个数/顺序同样会静默破坏它（H3）。
3. **PARADOX 全房伤害走 `G.boss.active`**：演出 BOOM 阶段对 Boss 用 `G.hurtBoss(26)`
   单次封顶、对精英 ×1.3、`ignoreBlock=true` 破盾卫格挡。改 Boss 判定时必须用
   `G.boss && G.boss.active`（BUG-001 教训，H11/H25 同类）；不得把 `G.boss` 模块对象当
   实例用，否则距离 NaN、Boss 免疫一切伤害且无报错。

**为什么不能随意改**：STEP 62 锁死全链路（3D 骰体/逐点掷 1~6/连续计数/冻结钉住/爆炸/
PARADOX 演出后全房击杀与清场/崩坏充能递减）；改上述任一纪律会破坏「重做硬门槛」的
验收口径（真 3D 骰体 / 六面独立视觉语言 / PARADOX 全屏崩坏演出）。

---

## 相关文档

- 系统详解 → `GAME_SYSTEMS.md`
- 已修复的历史 Bug → `BUG_HISTORY.md`
- 当前未修复缺陷 → `KNOWN_ISSUES.md`
