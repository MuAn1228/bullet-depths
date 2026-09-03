# WEAPON\_BATCH\_HANDOFF.md — 武器批次交接（6.5/7 已完成）

> 2026-09-03 建立本批次按用户指令「每把完整交付再做下一把；token 不足时终止并交接」执行。
> **状态（09-04 晚更新）**：**献给太阳的左轮⑥已重做交付在架**（新模块 `js/sunrevolver.js`，
> 见 §⑤；首版 git `c7e054b` 保留为历史）。**悖论骰子⑤已重做交付在架**（新模块
> `js/dice.js`，见 §⑥；旧实现 git `47f20df` 保留为历史，重做已显著超越旧版——真 3D 骰体 +
> 六面独立视觉语言 + PARADOX 四阶段崩坏演出，STEP 62 回归）。
> 泡面叉①品质不达标仍下架待重做（完整实现存 git 历史 4a4116e，重做时参考）。
> 当前在架交付（共 7 把）：②纸飞机 paperplane ③吹风机 hairdryer ④视界线切割刀 scalpel
> ⑥献给太阳的左轮 sunrevolver（重做版）⑦过载点唱机 jukebox ⑤悖论骰子 dice（重做版）。
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
   武器计数 15→当前值（已完成 3 把后为 **18 种**，全部完成后 22 种）。

## ④ 视界线切割刀 scalpel（✅ 已完成在架）

- def：`{name:'视界线切割刀', tier:'A', dmg:9, rate:2.2, mag:10, reload:1.0, melee:true, …}`。

- 新模块 `js/scalpel.js`（G.scalpel）：

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

- 音效：riftSlash/riftOpen/riftTravel/riftCollapse；商店图标：只有刀柄（紫纹）。

- 回归锁 STEP52：三刀三 rift → rift DOT 掉血 → 玩家置于 rift A 调 tryRollEnter →
  传送+rifts 清空+连线敌人受伤 → 单 rift 不传送。

- 设计稿强调：刀只有柄无刃（3D 枪模可在 updateGunVisual 加 melee 短杆分支）、
  连续翻滚不得无限传送（每次传送消耗全部 rifts，天然防无限）。

## ⑤ 献给太阳的左轮 sunrevolver（✅ 重做交付在架，2026-09-03）

> 首版（本节旧文，git `c7e054b`）被判定拉跨：+14 阶梯临界不可触 / OVERHEAT 不可达 /
> 枪体不随温度变色。**重做版**改「沸腾期 SOLAR LIMIT」模型并全部收进独立模块：
>
> - **Heat**：开火 +16 固定步进（连射零散热——HEAT\_IDLE .95s 略长于射速间隔 0.909s），
>   伤害档位 1/1.25/1.6/2.2（<24/48/72/92）；92 起进入 **SOLAR LIMIT 沸腾**：核心失控
>   +6/s 持续升温且不再自然衰减、射速 ×2、**弹匣锁膛不自动装填**——必须在约 1.3s 内
>   打出 SUNSHOT、长按 R 紧急散热（34/s，0.59s 退到安全区）或炸膛，三选一。
>
> - **SUNSHOT**：沸腾期开火 → 蓄能 0.18s → `kind:'sun'` 微型太阳（pierce 99 / dmg 38，
>   **≥97 = PERFECT**：dmg 57 / 弹体更大 / 爆发 3.2 格 40 伤）→ heat 归零、不耗弹药。
>   命中敌人=蒸发演出（非传统爆炸）；撞墙/到期=太阳爆发（复用 W\.explode）；
>   Boss 单次封顶 26；接触 1.2 内敌方子弹直接蒸发。
>
> - **OVERHEAT 双真实路径**：贪射（CRITICAL 区间 +16 越过 100）/ 沸腾放置（1.3s）。
>   炸膛=自伤 1（1 血不掉血）+ cool 1.5s + heat 归零。
>
> - **温度变色枪模**（旧版完全缺失）：独立 3D 黄金左轮（转轮弹巢/枪管/鳍片×3/导热管×2/
>   太阳核心/符文环），六组专用材质 emissive 沿暗金→暗红→橙红→白热色标插值，
>   核心呼吸脉动、沸腾抖动、转轮转速随热量上升；热浪/烟雾/白热火花三档加密。
>
> - **主动散热**（设计稿九，旧版缺失）：R 键双模——长按(>0.10s)散热 34/s，短按(≤0.22s)装填。
>
> - 音效 sunCool/Warm/Hot/Crit 分档 + sunHeartbeat/sunCharge/sunshot/sunImpact/
>   sunEvaporate/sunVent/overheatHiss；HUD `[HEAT nn% · 档位]`（CRITICAL 橙/SOLAR 红高频刷）。
>
> - 模块化：`js/sunrevolver.js`（G.sunrevolver，443 行）数值全部集中在 S.K；加载序插在
>   scalpel 后（须先于 player.js 供枪模挂载）；game.cleanupDynamic/update 挂钩。
>
> - 回归锁 STEP58：积热锁膛/沸腾升温/SUNSHOT/PERFECT/真实弹道/蒸发敌弹/双路径炸膛/
>   主动散热/枪管自发光单调上升/清场无残留。

- 实现全部在 weapons.js（def/tiers/弹种）+ player.js（Heat 系统）：

  - **Heat**：`w.heat`（0\~100，`W.mktWeapon` 预置字段），开火 +14；`>100 → OVERHEAT`
    （自伤 1 + w\.cool=1.5s + heat=0 + 红白爆鸣粒子，勿致死——`p.hurt(1)`）；停火 0.7s 后
    9/s 衰减，装填中 ×4（=主动散热）；热量乘区 1/1.25/1.6/2.2（档位 <25/50/75/95，
    ≥95 被 SUNSHOT 取代，等效第 5 档 3.0 无处可及）。

  - **SUNSHOT**：heat≥95 开火 → 改射 `kind:'sun'` 弹（pierce 99、spd 7、dmg 38、
    PERFECT×1.5=57、大 glow、命中 `W.explode(2.2,26,'p')`、灼热金白拖尾粒子）→ heat=0、
    recoil 重后座。95\~100 区间（含 98/104 两个可达节点）射出即 PERFECT。

  - **HUD**：`ui.weapon` 对 `def.sun` 在 wname 追加 `[HEAT nn%]`（封顶 100 显示）；
    枪管/枪口视觉靠 emitShot 的 `fx.light` 随 useDef.color 变化的最简实现。

  - 音效：sunshot（低频冲击+shimmer）/overheatHiss（金属爆鸣）；商店图标：金左轮+太阳核心。

  - 回归锁 STEP58：6 连射 heat=84 精确 → 第 7 发 kind='sun' 生成且 heat 归零、dmg=57 →
    对敌高伤（真实弹道命中秒杀正面枪手）→ w\.heat=101 直检 OVERHEAT（hp-1、cool>1、heat=0）。

  - ⚠️ 设计注记：+14 阶梯下 95\~100 仅 98/104 两个节点全部改判 SUNSHOT，`heat>100` 的
    OVERHEAT 在正常连射中不可达（仅测试注入），作为安全阀保留——与既有交接方案一致，
    非 bug。若后续要让过热成为真实风险点，需调整开火步进或 SUNSHOT 窗口，动前先 grep。

## ⑥ 悖论骰子 dice（✅ 重做交付在架，2026-09-04）

> 旧版（git `47f20df`）被判定拉跨的三点，重做版逐一解决：① 无骰子模型（只有数字环）→
> **真 3D 机械骰体**；② 每点只有颜色 → **六面独立视觉语言**；③ PARADOX 只有 ring+flash →
> **四阶段全屏崩坏演出**。另补设计稿第九条 **PARADOX CHARGE**（旧版缺失）。
> 新模块 `js/dice.js`（G.dice，446 行），插在加载序 sunrevolver 后（须先于 player.js 供
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

## ⑦ 过载点唱机 jukebox（✅ 已完成在架，2026-09-03）

- 新模块 `js/jukebox.js`（G.jukebox）：def `{name:'过载点唱机', tier:'A', dmg:3,
  rate:1.1, mag:6, reload:2.0, kind:'vinyl', jukebox:true, dmg:3, speed:16}`。

- **黑胶弹**：kind:'vinyl'——pierce 99（穿人不清弹）+ bounce 99（墙反弹，复用现有反弹）

  - life 6 + 撞敌 dmg 且继续；RGB 拖尾（红/蓝双粒子沿垂直方向错位）；撞墙
    fx.ring 音波涟漪 + vinylBounce。

- **子弹撞子弹**：W\.update 末尾对 team-p vinyl 两两距离检测（<0.45，在飞 ≤12 张）
  → 两弹 off → `G.jukebox.addNode(碰撞点)`（节点 ≤6，寿命 8s，黑胶+标签+霓虹环+辉光 mesh）。

- **唱片撞节点**：`vinylHitNode`（jukebox.update，一帧一张）未满网 → 被撞节点刷新寿命

  - 入网新节点（网络扩张）；满网 → FULL OVERLOAD。

- **共振网**：节点两两连线（≤8 条，并查集保连通 + 距离就近补满；THREE.Line 蓝主光

  - 红残影双线，正弦波浪几何预分配逐帧覆盖）；线上敌人 0.18s tick 2.5 点（点到线段
    <0.5，ignoreBlock 破盾卫格挡；Boss 同样走 tick 2.5）。

- **FULL OVERLOAD**：6 节点满网后再入网 → 全线 SONIC BURST（线上敌人 12 伤 /
  **Boss** **`G.hurtBoss(24)`** **单次封顶**）+ bassDrop + 低频震屏 + 节点全清。
  Club Mode：有节点时 `G.lights.ambient.intensity` 乘 0.78（暗场采样基准，清场还原）。

- 音效：vinylShot/vinylBounce/resonance/bassDrop；图标：音箱+喇叭+黑胶。

- 回归锁 STEP59：collide 纯函数单测 / 同点两发真实互撞成节点 / 两节点连线 + 线上敌人
  tick 掉血 / 满网 7 次入网 BURST 全清 + 线上 12 伤 / cleanupDynamic 无残留 mesh + 灯光还原。

- ⚠️ 性能红线（已落实）：activeVinyl 上限 12（超限空响不耗弹）；node≤6 / beam≤8；
  线几何预分配（Float32Array + BufferAttribute.needsUpdate），无每帧建对象。

- 设计简化注记：DISC-vs-DISC 一撞只成 1 节点（交接方案的 addNode(碰撞点)）；「第 N 张
  唱片撞网络 → 第 N 个节点」由 唱片撞现成节点→入网扩张 达成（vinylHitNode）；枪模沿用
  通用枪身未做肩扛点唱机 3D 模型（仅在 shop 图标呈现造型）。

## 收尾清单（仅剩 泡面叉① 重做完成后）

- 武器计数 **21→22**（GAME\_SYSTEMS §2.1 / PROJECT\_STATUS §一 / ARCHITECTURE）
  ——太阳左轮（重做）+点唱机+骰子（重做）已在架，当前 **21 种在架**；泡面叉重做交付后 22

- 步骤 62→63（每把 +1 回归步骤 + PROCEDURES/AGENTS/PROJECT\_STATUS 同步）
  ——当前 **62 步**（编号空洞 49/53）：STEP58 太阳左轮（重做版）/ STEP59 点唱机 /
  STEP60 Wallmaker / STEP61 猎犬 / STEP62 骰子（重做版）；泡面叉重做 +1 后 63

- STEP52 的「●」纪要可移除（53 已随骰子旧版下架删除；新版骰子用 STEP62 承接）

- GAME\_SYSTEMS §2.1 武器表更新（骰子重做版已入 §2.13；泡面叉完成后补 §2.14）+ 计数 21→22

- PROJECT\_STATUS §一武器条目 / §四 当前工作；PROCEDURES 步骤清单 62→63

- PROJECT\_STATUS/AGENTS 自测状态 62→63；ROADMAP 无需改（本批次不在路线图编号内）

- 武器总数 22：STEP41/44 已改动态断言，无需再动

