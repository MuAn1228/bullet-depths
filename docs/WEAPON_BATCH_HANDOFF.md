# WEAPON\_BATCH\_HANDOFF.md — 武器批次交接（6.5/7 已完成）

> 2026-09-03 建立本批次按用户指令「每把完整交付再做下一把；token 不足时终止并交接」执行。
> **状态（09-04 晚更新）**：**献给太阳的左轮⑥与视界线切割刀④已于 2026-09-04 应需求整体
> 下架删除**（代码/音效/图标/测试/文档全链移除，文件已 git rm，历史实现保留在 git 与本文档
> §④⑤）。**悖论骰子⑤已重做交付在架**（新模块 `js/dice.js`，见 §⑥；旧实现 git `47f20df`
> 保留为历史）。**过载点唱机⑦已核心机制级重构交付在架**（`js/jukebox.js` 436 行
> BLACK VINYL NETWORK SYSTEM，见 §⑦）。**吹风机③已增强**（吹飞距离 +~85%，见 §③）。
> 泡面叉①品质不达标仍下架待重做（完整实现存 git 历史 4a4116e，重做时参考）。
> 当前在架交付（共 5 把）：②纸飞机 paperplane ③吹风机 hairdryer（已增强）⑦过载点唱机
> jukebox（已重构）⑤悖论骰子 dice（重做版）。武器总在架 **19 种**。
> **待办**：仅剩 泡面叉①（重做，必须显著超越旧版手感与演出，旧版验收步骤 49 已删除，
> 编号空洞保留）。
> **本文档是剩余重型特殊武器的实现交接**。设计源文档（需求唯一来源）：
> `D:\obsidian\Obsidian Vault\vibe coding\武器\{视界线切割刀,献给太阳的左轮,悖论骰子,过载点唱机,泡面叉}.md`。
> 完成一把的验收口径 = 设计稿「最终验收标准」逐项 + 新增回归步骤 + 全量自测绿 + 独立提交。

## 已建立的接入模式（后续照抄，勿另起炉灶）

1. **def 表**：`weapons.js` W\.defs 加行 + `W.tiers` 对应阶追加 + `kind` 三元链追加分支
   （⚠️ 新弹种必须同步 kind 链，否则命中分支永不匹配——泡面叉踩坑）。
2. **特殊机制**：新建独立 IIFE 模块 `js/<name>.js`（参照 photo.js/gambler.js），插入
   `index.html` 加载序（当前：…meta→base→enemies…；建议 weapons 后/enemies 前按依赖），
   挂 `G.<name>`；`game.cleanupDynamic()` 加清场钩子；`game.update` 挂 update(dt)。
3. **弹体行为**：`W.update` 内按 `b.kind` 分支（参照 paper/voidorb/fork 现成写法）；
   spawn 视觉在 W\.spawn 的 team 分支（scale/geometry）。
4. **音效**：audio.js sfx switch 加 case；**商店像素图标**：shop.js `_icon` switch 加 case；
5. **回归锁**：main.js 新增 step（真实链路；弹道类测试用「4 连格空旷位扫描」模式，
   参照 STEP49/50/51；强制结果用 `_force` 钩子，参照 `_jokerPick`）。
6. **版本 bump**：index.html 所有被改文件 ?v+1。步骤计数 56→每把 +1。
7. **每把完成后**：DEVELOPMENT\_LOG 追加条目 + 独立 commit + PROJECT\_STATUS/GAME\_SYSTEMS
   武器计数 15→当前值（已完成批次后为 **19 种**，泡面叉重做完成后 20 种）。

## ④ 视界线切割刀 scalpel（❌ 已于 2026-09-04 应需求整体下架删除）

> 以下为实现记录（历史参考）。当前代码已全链删除：`weapons.js` def/近战分支、
> `player.js` 翻滚接入、`audio.js` rift 音效组、`shop.js` 图标、`index.html` script、
> `main.js` STEP 52 回归块、文件 `js/scalpel.js` 已 git rm（旧 commit 保留实现）。

- 旧 def：`{name:'视界线切割刀', tier:'A', dmg:9, rate:2.2, mag:10, reload:1.0, melee:true, …}`。

- 旧模块 `js/scalpel.js`（G.scalpel）：

  - **普攻**：player fire 拦截（def.melee）→ 扇形近战（1.3 格 ±0.7 rad，dmg 9+knock 4，
    hitstop .04）→ 在玩家前方 1.1 格生成 **Space Rift**（黑核+紫边平面 mesh，位于
    G.world，用完/超时移除）；rifts 最多 3（FIFO 淘汰最旧），寿命 3s；rift DOT：
    0.2s tick 对 0.55 内敌人 3 点。

  - **翻滚传送**：player.js 翻滚启动处调 `G.scalpel.tryRollEnter(p)`（唯一 player 侵入点）：
    玩家 0.9 内有 rift 且 rifts≥2 → 传送到「下一个」rift（按创建序 A→B→C→A），
    落点用 `E.nearbyLegalPos` 防入墙，invulnT+=0.35（I-frame）；随后 **SPACE COLLAPSE**：
    所有 rift 两两连线（Line，黑+紫双线），线上敌人（点到线段 <0.5）一次结算
    26 伤（精英 ×1.3；**Boss 走** **`G.hurtBoss(min(26, …))`** **设上限**），极短 screenFlash
    白闪（.08s，替代 Invert——项目无反色后处理）+ hitstop .09 + 碎裂粒子，rifts 清空。

  - 清场：`cleanupDynamic` 调 `G.scalpel.clear()`。

- 旧音效：riftSlash/riftOpen/riftTravel/riftCollapse；旧商店图标：只有刀柄（紫纹）。

- 旧回归锁 STEP52：三刀三 rift → rift DOT 掉血 → 玩家置于 rift A 调 tryRollEnter →
  传送+rifts 清空+连线敌人受伤 → 单 rift 不传送。

- 旧设计稿强调：刀只有柄无刃（3D 枪模可在 updateGunVisual 加 melee 短杆分支）、
  连续翻滚不得无限传送（每次传送消耗全部 rifts，天然防无限）。

## ⑤ 献给太阳的左轮 sunrevolver（❌ 已于 2026-09-04 应需求整体下架删除）

> 以下为实现记录（历史参考）。当前代码已全链删除：`weapons.js` def/sun 全部分支/
> `b.sunP` 字段、`player.js` 枪模挂载/Heat 链/R 键接管/锁膛/材质淡出、`ui.js` HEAT HUD、
> `audio.js` sun×11 + overheat 音效组、`shop.js` 图标、`index.html` script、
> `main.js` STEP 58 回归块、文件 `js/sunrevolver.js` 已 git rm（旧 commit 保留实现）。

> 首版（git `c7e054b`）被判定拉跨：+14 阶梯临界不可触 / OVERHEAT 不可达 /
> 枪体不随温度变色。**重做版**改「沸腾期 SOLAR LIMIT」模型并全部收进独立模块：

- **Heat**：开火 +16 固定步进（连射零散热——HEAT\_IDLE .95s 略长于射速间隔 0.909s），
  伤害档位 1/1.25/1.6/2.2（<24/48/72/92）；92 起进入 **SOLAR LIMIT 沸腾**：核心失控
  +6/s 持续升温且不再自然衰减、射速 ×2、**弹匣锁膛不自动装填**——必须在约 1.3s 内
  打出 SUNSHOT、长按 R 紧急散热（34/s，0.59s 退到安全区）或炸膛，三选一。

- **SUNSHOT**：沸腾期开火 → 蓄能 0.18s → `kind:'sun'` 微型太阳（pierce 99 / dmg 38，
  **≥97 = PERFECT**：dmg 57 / 弹体更大 / 爆发 3.2 格 40 伤）→ heat 归零、不耗弹药。
  命中敌人=蒸发演出（非传统爆炸）；撞墙/到期=太阳爆发（复用 W\.explode）；
  Boss 单次封顶 26；接触 1.2 内敌方子弹直接蒸发。

- **OVERHEAT 双真实路径**：贪射（CRITICAL 区间 +16 越过 100）/ 沸腾放置（1.3s）。
  炸膛=自伤 1（1 血不掉血）+ cool 1.5s + heat 归零。

- **温度变色枪模**：独立 3D 黄金左轮（转轮弹巢/枪管/鳍片×3/导热管×2/太阳核心/符文环），
  六组专用材质 emissive 沿暗金→暗红→橙红→白热色标插值，核心呼吸脉动、沸腾抖动、
  转轮转速随热量上升；热浪/烟雾/白热火花三档加密。

- **主动散热**：R 键双模——长按(>0.10s)散热 34/s，短按(≤0.22s)装填。

- 旧音效 sunCool/Warm/Hot/Crit 分档 + sunHeartbeat/sunCharge/sunshot/sunImpact/
  sunEvaporate/sunVent/overheatHiss；旧 HUD `[HEAT nn% · 档位]`。

- 旧模块化：`js/sunrevolver.js`（G.sunrevolver，443 行）数值全部集中在 S.K；
  加载序插在 scalpel 后；game.cleanupDynamic/update 挂钩。

## ⑥ 悖论骰子 dice（✅ 重做交付在架，2026-09-04）

> 旧版（git `47f20df`）被判定拉跨的三点，重做版逐一解决：① 无骰子模型（只有数字环）→
> **真 3D 机械骰体**；② 每点只有颜色 → **六面独立视觉语言**；③ PARADOX 只有 ring+flash →
> **四阶段全屏崩坏演出**。另补设计稿第九条 **PARADOX CHARGE**（旧版缺失）。
> 新模块 `js/dice.js`（G.dice，446 行），插在加载序 jukebox 后（须先于 player.js 供
> 骰体挂载）；player.js 挂骰体与开火/蓄力结算接管；game.update/cleanupDynamic/onRoomEnter
> 三处挂 `G.dice.*`；enemies.js 主循环接入 `pinT` 冻结（三处：主循环/E.clear/E.kill）。

- def `{name:'悖论骰子', tier:'A', dmg:6, rate:1.2, mag:8, reload:1.5, spread:0, price:55,
  color:0xd8cfe0, dice:true, sfx:'diceStop'}`；武器 20→21 种（A 阶 11 把）；tiers.A 加
  `'dice'`；W.spawn 对象池加 `b.pin` 字段；命中 kind 链加 `dice4` 冻结块（`e.pinT` +
  冰晶 `_iceMesh` + diceFreeze 音效 + sparks+ring + 子弹销毁 break）。

- **真 3D 骰体**：0.38 立方 + 12 条黄铜棱边 + 8 角紫色发光符文角珠（待机能量脉动），
  六面 = 面版（面组局部 +Z 朝外）+ 暗色凸点数点（真骰面，对和 7）；**材质全专用**
  （emissive 随面光逐帧改写，绝不共享——H7）；结果面翻顶四元数 `FACE_UP[6]` 预计算；
  悬浮于武器上方，玩家死亡随 fade 同步淡出。

- **掷骰结算 release()**：蓄力 .35s 高速翻滚 → 随机 1~6（测试 `_force` 强制）→ 落定 .16s
  弹性归位 + 结果面点亮 + §N 大号 dmgNum + 结果环 + diceStop/diceN 音效。
  1=厄运弱弹+instab+6（最差也推进异常）；2=双重；3=三重散射；4=冻结
  （kind:'dice4' → `e.pinT` 停止行动，K.FREEZE_T 1.2s）；5=追踪红弹（kind:'homing'）；
  6=毁灭（瞄准点 4.5 格外 explode，R2.6/DMG26）。

- **现实不稳定度**：`instab=cons×25` 封顶 100，每秒衰减 8；≥50/75 两级世界异常
  （节流闪烁/震屏/HUD 抖动/裂缝粒子）。

- **PARADOX**（cons≥4）：四阶段演出——hitstop .12+duck（静止）→ 空间裂隙 .15（黑紫柱+
  紫色闪电枝）→ 现实错误 .50（过曝+故障闪光+环境光闪烁+数字跳变）→ BOOM .80（全房
  G.hurtEnemy 34 / 精英×1.3 / ignoreBlock=true 破格挡；Boss `G.hurtBoss(26)` 单次封顶——
  与切割刀/点唱机/太阳左轮同一纪律）+ explode(4.5,0) 纯视觉爆炸 → 1.15 清理。
  演出后 cons/instab 清零 + **PARADOX CHARGE**（接下来 5 次掷骰 +25% 伤害/爆炸半径
  +0.5/冻结时长 +0.35s，禁止永久叠加）。

- **HUD**：ui.weapon 对 def.dice 追加 `[§N ×连续 · 不稳X%]`，连续 3 次提示「下次崩坏」、
  充能中显示「崩坏充能」；名称颜色随不稳定度分级（≥50 橙 / ≥75 红）。

- 音效：diceRoll/diceStop/dice1~6（各自专属，dice6 带 punch+duck）/diceFreeze/diceCrack/
  diceCharge/paradox/paradoxBoom；商店像素图标=3D 斜视机械骰（暗黑前脸+黄铜框+顶 1 冰蓝/
  左 3 红/前 2 黄点+中心紫色能量核）。

- 回归锁 STEP62：3D 骰体挂载/自旋组/六面材、`_force` 逐点验证掷 1~6、连续累加/异数重置、
  掷 4 冻结 pinT+落定 4 面+面材点亮、掷 6 爆炸击杀、PARADOX 四连后计数清零+演出推进后
  全房击杀/充能/裂隙清理、充能随掷骰递减。⚠️ Boss/精英伤害差异化已真实实现（全房走
  真实伤害链路，不直接调 hurtBoss 推进）。

## ⑦ 过载点唱机 jukebox（✅ 核心机制级重构交付在架，2026-09-04）

> **2026-09-04 重构**（设计需求 41 条）：旧版（187 行）黑胶必须 <0.45 精确碰撞才共振、
> 节点扎堆、按最近距离连线导致共振线过短、网络难成——升级为 **BLACK VINYL NETWORK
> SYSTEM**（436 行）。验收口径改为实战体验：5~8 次攻击大概率 ≥1 条有效 Beam、
> 10~15 次攻击 4~6 Node、熟练后可主动追求 FULL OVERLOAD。重构后 def 数值：
> `{name:'过载点唱机', tier:'A', dmg:4, rate:1.8, mag:8, reload:1.6, kind:'vinyl',
> jukebox:true, speed:16}`。

- **黑胶弹**：kind:'vinyl'——pierce 99（穿人不清弹）+ bounce 99（墙反弹）+ life 6；
  RGB 拖尾；撞墙 fx.ring 音波涟漪 + vinylBounce；在飞上限 **16**（超限空响不耗弹）。

- **五层共振辅助**（weapons 尾部每帧调 `G.jukebox.stepVinyl()`）：
  - **RESONANCE ASSIST**：两黑胶距 <1.3 且在靠近 → 双向 angLerp 弱修正（k=min(1,3.4/60)）
    + vinylAttract 短促 VRRMMM——0.08~0.15s「被声音吸到一起」，非瞬移、非自动追踪。
  - **NEAR RESONANCE**：距 <1.6 未碰撞 → 双唱片间 RGB 电弧粒子 + vinylNear 嗡鸣（节流），
    进入「高度易再次共振」态。
  - **精确碰撞** <0.45 → 两弹离场 → `resonance(a,b)`。
  - **aimAssist**（player.js fire 调）：目标偏角 ≤10° 时才拉回 60%（保留 40% 输入感），
    绝不代瞄。

- **resonance（节点与碰撞点解耦）**：碰撞点=Resonance Origin；两 Node 沿各自碰撞前速度
  方向分离，`sep=clamp(3+(relS-6)*.22, 3, 6)`（速度越高分得越开，上限 6）；距离不足 3 时
  法线推开 + 外扩兜底；`_settle()` 沿 origin→落点回缩避墙/避不可走/避已有节点（弱排斥
  防扎堆）→ 首次共振即出现一条 ≥3 单位肉眼明显的长 Beam。

- **节点**（≤6，寿命 8s）：`addNode` level 1；**vinylHitNode** 撞已有节点未满网 → 被撞
  节点 level++（≤5，辉光尺寸/透明度/色相递增，Beam 强度随之）＋刷新寿命＋入网扩张
  （网络逐步搭建，不随机删除旧网）。

- **rebuildBeams（LONG EDGE PRIORITY）**：距离降序，长边优先 + 并查集保连通 + 每节点
  度数≤3；MIN_BEAM_LEN=2.5 内短边仅当两端孤立才允许 → 3 节点优先成三角形、4 节点成
  四边形/对角线；Edge Quality：len≥6→q1.3 / len≥4→q1.15 / 否则 q1.0（长线更粗更亮、
  伤害略高）。

- **伤害**：共振线 0.18s tick `2.5 × EdgeQuality`；同时被 ≥2 条 Beam 命中 = CROSS
  RESONANCE ×1.15、≥3 条 = PERFECT RESONANCE ×1.3；黑胶基础伤 4；Boss 每线 tick 走
  `G.hurtBoss`。

- **NETWORK CORE**：≥3 节点 → 几何中心低频音波脉冲，核心附近敌人轻微持续伤害，规模随
  节点放大。

- **FULL OVERLOAD 三阶段**（6 节点满网再入网触发，快照 nodes/beams）：phase0 CHARGE
  0.38s（全节点闪烁+波浪+暗场）→ phase1 LOCK 0.3s（Beam 锁定+敌人 RGB X-Ray 骨架白闪）
  → phase2 **BASS DROP**（BURST：`dmg=12×(1+min(.6, beams数×.1))`；线上敌人 12×mult；
  **Boss 单次硬上限 24**；双层音波+红蓝粒子 → 节点/线全清 + 环境光还原）。回归锁 STEP59
  （碰撞单测/aimAssist/节点分离/共振线tick/成长扩张/核心脉冲/三阶段BURST/灯光还原）。

- **Club Mode**：有节点时环境光 ×0.82（原 .78 上调防过暗；基准采样，清场还原）。
  换房即清：game.cleanupDynamic / onRoomEnter 调 `G.jukebox.clear()`。

- 音效：vinylShot/vinylBounce/**vinylNear**/**vinylAttract**/resonance/bassDrop；
  图标：音箱+喇叭+黑胶。⚠️ 性能红线（已落实）：activeVinyl 16 / node≤6 / beam≤8；
  线几何预分配，无每帧建对象。

- 设计简化注记：枪模沿用通用枪身未做肩扛点唱机 3D 模型（仅在 shop 图标呈现造型）；
  交叉点不建独立实体（伤害用「每敌人被几条 Beam 命中」统计实现，不无限生成交点）。

## 收尾清单（仅剩 泡面叉① 重做完成后）

- 武器计数 **19→20**（GAME\_SYSTEMS §2.1 / PROJECT\_STATUS §一 / ARCHITECTURE）
  ——切割刀与太阳左轮已删除（19 在架）；点唱机已重构、骰子已重做；泡面叉重做交付后 20

- 步骤 60→61（每把 +1 回归步骤 + PROCEDURES/AGENTS/PROJECT\_STATUS 同步）
  ——当前 **60 步**（编号空洞 49/52/53/55-57/58）：STEP59 点唱机（重构版）/ STEP60
  Wallmaker / STEP61 猎犬 / STEP62 骰子（重做版）；泡面叉重做 +1 后 61

- GAME\_SYSTEMS §2.1 武器表更新（点唱机重构已入 §2.10；骰子重做版已入 §2.12；
  泡面叉完成后补新 §）+ 计数 19→20

- PROJECT\_STATUS §一武器条目 / §四 当前工作；PROCEDURES 步骤清单 60→61

- PROJECT\_STATUS/AGENTS 自测状态 60→61；ROADMAP 无需改（本批次不在路线图编号内）

- 武器总数 20：STEP41/44 已改动态断言，无需再动

