# DEVELOPMENT_LOG.md — 开发日志

> 倒序（最新在最上）。

---

## 2026-09-06（第五层「异常回廊」黑化重制：纯黑深渊/怪物密度翻倍/光影美术大幅升级 + 2 个实机 Bug 根治）

- **用户反馈**：房间设计不达预期、战斗手感差、怪物数量不够、**色调绿色不如黑色**；要求玩法/手感/美术/光影大幅上升，允许外部素材。
- **素材决策**：不引入外部贴图（地板贴图方案历史上两度被否——A+B 试点终止；320p 低模下「黑底+发光几何+动态光」路线风格更统一、零加载成本），全部用代码内美术实现。
- **build.js（v16→17）主题黑化 + 悬浮深渊**：
  - 主题 5 调色板：暗绿底 → **纯黑虚空**（地板 0x101015/0x0b0b10、雾 0x020204、冷白主光 0xb8b8e0），能量色改异常紫 0x9a4aff × 品红 0xff3ac8；
  - **悬浮平台管线从第 4 层推广到第 5 层**（`isF4`→`isFloat = floor.num>=4`，与 H10 文档描述对齐）：不渲染高墙，wall tile 碰撞不变；地板边缘发光描边（紫/品红交替）；深渊大平面按**本层实际包围盒动态取心**（第五层 25×20 cells 比第四层宽，写死第四层中心会露边）；远景浮空废墟剪影同步动态取心；
  - 火把 → 「异常晶柱」（紫晶柱+品红尖，theme>=4 分支内第 5 层专属配色）；旗帜 4/5 层都不挂（悬空穿帮）；门框/Boss 花纹/核心房符文环同步 num>=4；
  - **第五层光影**：`B.update` 每帧 `holdLight('pglow5')` 玩家随身微光 + `holdLight('f5room5')` 所在房间中央异常光池（灯池 7 盏：2+火把 4=6，余 1 给特效）；环形房（30% 特殊房）几何中心是虚空洞——中心 tile 非地板时光源自动改挂第一根晶柱；
  - 第五层房间中央**异常法阵**（黑底+发光紫环+品红中心，g5b 无光照顶点色专用层）；核心房法阵补发光环（暗蓝环在黑底不可见）。
- **floor5.js（v3→4）怪物密度重制**：
  - 战斗房预算 `4+面积*1.6` → `5+面积*2.4`（单体扣减 1.5、上限 16），**拆两波（60%/40%）**——第一波清完立即刷「异常增援」（checkRoomClear 自动推进）；实测 2×3 房 waves=[9,5]（原约 9 只单波）；
  - **敌人池按 BFS 深度三档渐进**：浅层杂兵（gunner/wisp/charger/slime/beetle）→ 中层（+shotgunner/hexer/orbiter/minelayer）→ 深层机制怪（shotgunner/hexer/orbiter/gravitator/mirror/commander/magnetron/bomber/shield）；精英率随深度 8%→32%；
  - 装饰：弃用第 4 层紫青套件，换**第五层专属套件** `arune/acrys/aobel/adebris/aglitch/floatrock`（发光符文/黑水晶/方尖碑/黑碎块/故障屏/悬浮碎块），数量 3~7→6~10；核心起始房也吃装饰+晶柱（原战斗/特殊房专属）。
- **rooms5.js（v4→5）/ rooms5b.js（v2→3）特殊房强化**：
  - SR5.onEnter 统一**入房演出**：紫环扩散 + 光爆 + 震屏；
  - 敌波全面加密：weaponchaos 4→7（**保持单波**——STEP 74 两轮清杀后 220 帧内必须完成，多波会刷无人击杀的增援导致 assert(!A) 必败）、darkness 7→9、collapse 6→9（崩塌节拍 5s→4s）、altar 4→6、theft 5→8、fake 4→7、devchaos 5→7、giant 2~3→3~4 只、swap +2 杂兵、vote SAFE 档 1→2 波；
  - 黑暗房配光重调：本层环境光已压到近黑（ambientI .5），压暗系数 .12/.3/.25 → **.4/.45/.4**（否则全黑不可玩）；玩家微光 0x8ab0ff/.9/5.5 → 0xbfd0ff/1.25/7；megachest 箱体黑金化。
- **anomaly.js（v1→2）**：失序之主出场补紫环+光爆演出。
- **weapons.js（v36→37）弹幕拖尾噪声根治**：敌方子弹不再发射拖尾粒子（原每颗子弹每帧 30% 概率发射——弹幕房 200+ 弹在场时每秒数千颗拖尾，黑底上全部可见成噪声汤；敌方子弹本就有 glow 光斑精灵）。玩家子弹拖尾保留。全楼层弹幕可读性同步受益。
- **enemies.js（v34→35）FIX-031**：magnetron 双磁场全局单例崩溃根治（详见 BUG_HISTORY FIX-031）——第五层高密度波次下同房双磁铁怪必现 `G._magField.x` TypeError（UPDATE-FAIL 兜底续命但该怪冻结），磁场改实例持有。
- **验证**：
  - boottest ×3 `BOOTTEST_PASS_P70_F0`（拖尾修复后 ×3、magnetron 修复后 ×3、环形房光源修复后 ×3，共 9 轮全绿）；
  - browser-use 实机：核心房（法阵+8 晶柱）/战斗房（14 只 7 种混编双波、活粒子 200+→12、UPDATE-FAIL 0）/宝箱风暴（环形房+黑金箱）/Boss 竞技场（椭圆符文环+出场演出）截图全数确认；
  - 生成结构零改动（房间/门/掩码/占比校验不动），无需种子探针。
- **版本**：build 17 / floor5 4 / rooms5 5 / rooms5b 3 / anomaly 2 / weapons 37 / enemies 35，index.html 已 bump。

---

## 2026-09-06（文档同步补遗：enemies 注释漂移修正 + PROCEDURES 63~74 说明段）

- **`js/enemies.js` 文件头注释修正（本次唯一的代码改动）**：注释写「16种类型」，实测
  `E.defs` 共 **38 条**——**30 种在架** + 8 条 `pvz_*` 下架待重做。已 grep 确认
  `gen.js` / `gen4.js` / `floor5.js` / `main.js` **均无 pvz 引用**（确属下架未入池），
  与 `GAME_SYSTEMS.md` §4.1「共 30 种」一致，是注释单方面的漂移。
  改为「30 种在架类型（`E.defs` 共 38 条，另 8 条 `pvz_*` 为下架待重做，不入任何生成池）」。
  注：这是 2026-09-02 那次「9种→15种」修正之后，随 68/71 等新敌人批次累积的二次漂移。
- **`docs/PROCEDURES.md`**：§3.3 给 STEP **63~74** 补上与 35~62 同规格的**说明段**
  （上一批次只标了归属分组）。内容由脚本从 `main.js` 抽取各步骤的真实断言消息整理，
  非手写臆测；三处关键回归锁已点明：69（`_hitsTag` 命中标签·file:// Script error 根治）、
  72（第四层 8 种子 tile 级全连通 + 无不可达地板/门 tile）、
  74（SR5 特殊房完成后清理与武器回滚 + H25 `G.boss.active` 同步失序之主）。
- **版本**：`js/enemies.js` `?v=33→34`（纯注释改动也按纪律 bump，防用户浏览器跑旧代码）。
- **验证**：boottest ×3 全 `BOOTTEST_PASS_P70_F0`；`node --check js/enemies.js` 通过。

---
## 2026-09-06（文档同步批次：文档与代码对齐，纯文档改动不动任何 js）

- **动因**：新会话交接核对时发现文档与代码实际状态存在系统性漂移（不影响运行，但违反
  「文档不许与代码长期失同步」的项目纪律）。本批次**零代码改动**，boottest 步数与结果不变。
- **实测基线**：git `f517703` = `origin/master`，工作区干净；`js/` **27 个文件 / 18217 行**；
  boottest 连跑 3 轮全 `BOOTTEST_PASS_P70_F0`；`main.js` 实际 **70 个 step**，最大编号 **74**，
  空洞 `49/52/53/55/56/57/58/60/61`，**下一个新步骤 = 75**。
- **AGENTS.md**：30 秒速览表 22 文件/14500 行/69 步 → **27 文件/18200 行/70 步**；
  §1.4 加载顺序补 `anomaly → rooms5 → rooms5b → floor5`（原表漏了这 4 个模块）；
  目录说明 21 → 27 个 JS 文件；§7 自测命令 `--virtual-time-budget` 60000 → 180000、58 步 → 70 步；
  补一条「改 js 必须 bump `?v=`」的缓存红线。
- **PROCEDURES.md**：58 步 → 70 步（正文与命令预算同步）；§3.3 分组表补 63~74 九组的归属；
  编号清单更新为实测的 01~74 并写明空洞与下一个新编号；URL 参数表补 `?shot=1~5` 与
  `?shot=5&floor5debug=N`。
- **ARCHITECTURE.md**：§2 目录树补 `anomaly.js` / `rooms5.js` / `rooms5b.js` / `floor5.js` 四个模块
  （含行数与职责），并把全部 23 个模块的行数刷新到实测值；§3.1 加载图补三个第五层模块及其
  依赖说明，修正 `genv4.js` → `gen4.js` 拼写，Boss 分发注释补 anomaly 分支。
- **GAME_SYSTEMS.md**：新增 **§5.6 失序之主**（实例字段 / 阶段阈值 66%-33% / `RULES` 五条规则表 /
  `state.add(undo)` 回滚契约 / H25 同步红线）；§6 新增**第五层「异常回廊」**整节（生成器参数表、
  特殊房占比校验、13 种特殊房 id-tier-尺寸表、SR5 状态隔离契约、调试入口）。
  注：第四层 `gen4.js` 此前已有一节，本批次未改动。
- **HIGH_RISK_AREAS.md**：H10 标题与正文改为「第 1~5 层全部上线，加第 6 层前必读」，并新增
  「第五层特有陷阱」表（特殊房占比重试 / registry 加载顺序 / 规则篡改漏注册残留 / `bossrush`
  `opts.type` 旁路 / 传送落点必须合法 tile）；H25 纳入 anomaly 并写明三条分发的检查顺序；
  速查表新增 **H29 第五层状态隔离**。
- **PROJECT_STATUS.md**：头部快照日期 2026-09-05 → 2026-09-06，吸收 09-06 的敌人强度与特殊房
  收缩两个批次以及本文档同步批次；自测行编号空洞更新为实测值。
- **验证**：boottest 连跑 **6 轮，5 轮 `BOOTTEST_PASS_P70_F0`**；第 2 轮 `BOOTTEST_FAIL_P69_F1` 为**历史已知 STEP 11 隐藏房 flake**（断言「隐藏门未生成」，约 1/10，见 `KNOWN_ISSUES.md` BUG-028 家族残留），dump 存 `snapshots/flake_bt_20260906_doc.html`。纯文档改动不进运行时，与本次改动无因果关系。

---

## 2026-09-06（特殊房间大小优化：宝箱/商店/旅行者/祭坛/赌徒房收缩到 1×1 格）

- **用户反馈**：部分特殊房间太大——「有的房间里面其实只有一个宝箱或者一个旅行者，没必要做的太大」。
  涉及普通层（1-3 层 gen.js 与第四层 gen4.js）的 treasure/shop/npc/shrine/gamble 房：
  它们继承战斗房 2~3 格大尺寸（2×2 格 = 30×22 tiles），内容却只有 1 个宝箱 / 1 个商人 / 1 个 NPC。
- **gen.js（1-3 层）**：takeSpecial 分配后，treasure/shop/npc/shrine/gamble 向无门侧收缩到 1×1 格
  （15×11 tiles）。**保守收缩**：门在东/南侧时不缩对应边（门 tile 贴格交界，缩东/南会把门切到新房
  地板之外）；同步重算 x0/x1/z0/z1/cx/cz。
- **gen4.js（第四层）**：同四类房收缩到 1×1 格，优先无门侧（有 doorGuarantee/ensureConnectivity
  兜底门连通，可放心缩任意侧）。
- **门悬空孤岛根治（探针抓出）**：第一版缩房后 1-3 层出现 13 万不可达 tile —— 缩房把旧门 tile 切到
  新房地板之外（如门 z=38，新房 z1=31），门 tile 四邻全墙 → 房间（含 Boss 房）变孤岛。两处修复：
  ① `hasE/hasS` 边界漏检——东/南侧门 tile 在 `(rx+rw)*CW-1`（比边界小 1），原式永远检测不到，
     导致门在东/南的房被误缩；② 缩房后生成 `extraFloor`（门 tile clamp 进新房地板 + 贪心直线通道，
     最多 40 步）并在地板铺设时一并铺出，等价于 gen4 的 doorGuarantee。
- **验证**：
  - 1-3 层 300×3 种子探针：failSeeds=0、failTiles=0、failDoors=0/9541；缩房率 85%（2465/2910），
    未缩的 15% 为门在东/南侧的房（保守保留，安全）；内容物（stockPos/chest/npc/campfire）越界 0。
  - 第四层 300 种子探针：failSeeds=0、failRooms=0、failDoors=0/16384、deadBridges=0/4099。
  - boottest ×3 `BOOTTEST_PASS_P70_F0`（含 STEP 72 第四层 8 种子 tile 级全连通、STEP 73/74 回归）。
- **版本**：gen.js v15→16、gen4.js v34→35、index.html bump。

---

## 2026-09-06（敌人强度批次：7 只怪机动/伤害/射程增强 + 图腾激光判定对齐 + 环形放射者弹幕全结算）

- **史莱姆 slime**：移速 2.2→3.2、半径 .34→.51（体积 +50%，视觉 scale 同步，分裂子体 .24→.36）；
  跳跃更频繁（hopDur .35+.25）且横向甩动更野（±.9 rad）。
- **图腾 totem（修复激光视觉与判定错位）**：激光臂几何中心已偏 2.6，position 又平移 2.6 →
  视觉激光实际覆盖 [2.6,7.8]，而伤害判定在 [0,5.2]——玩家看到激光扫过 3~7 格、伤害却判在 0~5 格。
  修复：臂 position 归零，视觉与判定统一 [0,5.2]。攻击性提升：蓄力 .8→.55、旋转 .85→1.05 rad/s、
  冷却 2.6+.8→1.7+.5。
- **霰弹枪手 shotgunner**：开火距离 7→9.5、弹速 5→6.5±.5、冷却 2.0+.6→1.8+.5。
- **炸弹客 bomber**：移速 1.9→2.4、横移 .4→.5、保持距离 4.5~6.5→4~7、抛弹 2.4+.6→2.0+.5；
  炸弹爆炸半径 1.9→2.1、伤害 2→3（weapons.js）。
- **引力眼球 gravitator**：牵引力 .16→.30/0.12s（近 2 倍）、牵引时长 1.6→2.0s、冷却 3.2+→2.6+.8。
- **虚空猎手 voidstalker**：移速 2.9→3.6、蛇形潜行系数 .85→1.0（全速）、闪现 CD 2.2+1.6→1.5+1.0
  （收尾 2.8→2.0）、突刺速度 9.5→11、**突刺伤害 1→2**（STEP46 断言同步 hp0-2）。
- **环形放射者 orbiter（黄色木星怪）**：修复「打中一次后一段时间免疫其子弹」——根源是玩家受击
  无敌帧 invulnT 让后续弹幕穿身。改：orbiter 弹种 `orbring`，命中判定 bypass 无敌帧（p.hurt 新增
  第 4 参 bypassInvuln，护甲/护盾仍生效），**每颗弹幕独立结算伤害**。eshoot 增加 kind 透传。
- **验证**：boottest ×3 `BOOTTEST_PASS_P70_F0`；node --check 4 文件全过。
- **版本**：enemies v32→33、weapons v35→36、player v26→27、main v85→86。

## 2026-09-06（第四层死路根治：bridge 房「门-中带」贯通，5% 死桥清零）

- **用户反馈**：第四层存在 4~5 格宽、不通往任何地方的死路走廊。
- **定位（探针 probe_gen4_*）**：第四层 424 个 bridge 房（5-tile 中带走廊）中 22 个（5.2%）
  两门之间在房内不连通——门开在 5-tile 中带之外（如 seed#1 中带 z63..67、门在 z60/z71），
  doorGuarantee 只向内铺 2 格，够不到中带 → 门后 2 格地板+墙 = 玩家看到的宽死路。
- **修复（gen4.js bridge case）**：铺完 5-tile 中带后，对每个门 tile 取其房内立足格
  （`G.clamp` 到房间边界，覆盖门 tile 落在 x0-2/x1+2 的情况），若立足格在中带外则铺
  1-tile 宽连接带直达中带（横向桥沿 z 竖带、纵向桥沿 x 横带）。
- **验证**：30 种子死桥 22→0；**300 种子综合探针 0 失败**（failSeeds=0/failRooms=0/
  failDoors=0/16384/deadBridges=0/4099）；boottest ×3 `BOOTTEST_PASS_P70_F0`。
- **版本**：gen4 v33→34。

## 2026-09-06（悖论骰子雷击落点修复：BOOM 目标在伤害结算前锁定 + 缓存版验证）

- **用户反馈**：① 雷击仍落在地图正中间而非受击敌人；② 光柱还是「柱子」而非紫色粗闪电。
- **根因**：① `_boom()` 先执行 `hurtEnemy` 全房结算（敌人可能全死），**之后**才 `_pickBoltTarget`
  → 目标必为 null → 回退房间中心。② 用户浏览器仍在 `v=thunder6` 缓存会话（fx v11 的 beam 光柱还在；
  本会话 readPixels 验证 v12/v13 紫色粗闪电已生效、thunder 源码已无 beam）。
- **修复**：`_boom()` 在伤害结算前先 `const bt=_pickBoltTarget(seq.cx,seq.cz)` 锁定雷击目标，
  雷击劈向该敌人位置（即使清场后已死，仍落在受击敌人身上）；无敌人回退房间中心。
- **实机验证**：注入假敌人 → `_pickBoltTarget` 正确选中最近敌人 (17,6.5)≠房间中心 (14.5,5)；
  清场后返回 null（证明必须先锁）；thunder 源码无 beam 引用。
- **测试**：boottest 3 轮 2 PASS + 1 轮历史 flake（dump 存 snapshots/flake_bt_20260906b.html，诊断轮全绿）。
- **版本**：fx v12→13 / dice v5→6。用户需 Ctrl+F5 强制刷新（旧会话缓存 v=thunder6）。

## 2026-09-06（悖论骰子雷击美化：紫色光柱 → 紫色粗闪电三层叠柱）

- **用户需求**：PARADOX 雷击的紫色柱子不够好看，做成紫色粗闪电。
- **fx.js thunder()**：删除 `beam` 光柱层，替换为 **三道 bolt 闪电叠层**（深紫 0x6a2ab8 边缘 →
  亮紫 0xa05aff → 白紫 0xe4c8ff 核心），宽 4.2/3.4/2.5 × 高 6.0/5.7/5.4，错位叠加形成粗壮
  紫色闪电柱；`add()` 增加 `color` 染色参数（默认白，旧调用不受影响）。白色核心闪电保留。
- **实机验证**：readPixels 紫色像素 165→534（3.2×）、白色核心 1124→1610，粗闪电渲染生效。
- **测试**：boottest 5 轮 4 PASS（run1/2/4/5）+ 1 轮 flake（历史已知 STEP 11 隐藏房偶发，
  dump 存 snapshots/flake_bt_20260906.html，诊断轮全绿）。
- **版本**：fx v11→12。

## 2026-09-06（悖论骰子数值与雷击落点调整：弹速 30 / 弹匣 15 / 散射不稀释 / 雷击劈向受击敌人）

- **用户需求**：弹速改 30、弹匣改 15；触发紫色光柱和闪电时落在受击的敌人身上；子弹散射时单发伤害不低于 8。
- **weapons.js**：dice def `speed 20→30`（射程 35 不变，life=range/speed 自动缩短飞行时间）、`mag 10→15`。
- **dice.js 散射不稀释**：掷 2 双重每枚 `def.dmg*.85`→`def.dmg`（8）、掷 3 三重每枚 `def.dmg*.7`→`def.dmg`（8）——
  散射只换数量与散布，单发伤害保底 8；掷 1 厄运弱弹 / 掷 4 冻结控制弹不在「散射」范围，保持原设计。
- **dice.js 雷击落点**：新增 `_pickBoltTarget(cx,cz)`（取裂隙/崩坏中心最近存活敌人）；`_crackTick` 裂隙期
  随机落雷优先劈向受击敌人（无目标回退原周圈随机）；`_boom` BOOM 雷击从房间中心改为劈向受击敌人。
- **测试**：boottest ×3 `BOOTTEST_PASS_P70_F0`。
- **版本**：weapons v34→35 / dice v4→5。

## 2026-09-06（悖论骰子雷击演出增强：Kenney CC0 贴图 + 5 层雷击演出 + file:// 跨域根治）

- **用户需求**：悖论骰子的雷击效果更好看，允许去外部素材站找素材（硬约束零外部依赖 ⇒ 素材本地化）。
- **素材采购**：Kenney Particle Pack（CC0，kenney.nl 直链 zip，curl.exe + `curl -C -` 续传 5 轮至 EOCD 完整）。
  选中 4 张 512² 透明 PNG → 复制到 `assets/fx/`：`bolt.png`（白色枝状闪电主干）、`beam.png`（竖直发光光柱）、
  `flare.png`（落地爆闪）、`scorch.png`（地面放射光辉）。
- **fx.js 新增**：`_loadTx(name,key)` 贴图加载 + `thunder(x,z,opt)` 五层雷击演出——
  ① 白色闪电主干 + 紫色光晕叠层（宽度随机抖动）② 贴地到天光柱 ③ 落地 flare+scorch 爆闪（随机旋转）
  ④ 两条 3D 折线叠层（高空→地面）⑤ 火花粒子 + 电光点 + 震屏；分层寿命（bolt .3s / beam .28s / 落地光 .5s 渐隐），
  Sprite 走 `_fxSprites` 池（update 衰减 + 移除时 dispose 材质）。
- **dice.js 接入**：PARADOX `_crackTick` 裂隙期 7% 概率周圈随机落雷（节流）；`_boom` 中心雷击（紫白色）。
- **🔑 关键技术发现（file:// 跨域根治）**：`new Image(); img.src='相对路径'` 在 file:// 下加载的本地图片
  **会被跨域污染（tainted）**——Canvas 中转 getImageData 抛 SecurityError，CanvasTexture/Texture 上传 WebGL 失败
  （纹理不渲染，**A+B 试点「地面纯黑无纹理」即此根因**，此前误记管线已验证）。修复：4 张贴图 **base64 data URL
  内嵌**（fx.js `_TX_DATA`，文档内资源同源必成功）。验证：readPixels 读 GPU 帧缓冲——注入 5 道雷后
  bright=2961（白 1124 + 紫 165）像素，渲染确凿。
- **测试**：boottest ×3 `BOOTTEST_PASS_P70_F0`（STEP 62 含雷击 Sprite 清理断言）。
- **版本**：fx v7→11 / dice v3→4 / main v84→85。

## 2026-09-05（悖论骰子「只旋转不出弹」根治：攻速 buff 下长按连发卡死）

- **用户报告**：悖论骰子有时左键点击只旋转不出子弹。
- **根因**：`player.js` fire() 的 dice 分支每帧（cool 归零时）无条件重置 `w.chargeT=CHARGE_T(.25s)`。
  平时 rate 3.6 → cool .278s > chargeT .25s，chargeT 会先归零结算；但吃到攻速加成
  （`p.st.rateMul>1.11`：攻速被动 / 肾上腺素 1.4× / 风暴 2.5×）后 cool < chargeT，
  每次 fire 都在 chargeT 归零前重置蓄力 → 永不 release → 骰体一直转、永不出弹。
- **修复**（`player.js` fire dice 分支）：`if(w.chargeT==null) w.chargeT=K.CHARGE_T;`——
  已在蓄力（长按连发/攻速 buff）不重置，chargeT 正常递减归零触发 release。
- **回归**（`main.js` STEP 62 追加 ⑧）：`rateMul=2` 下长按 120 帧，断言弹匣消耗
  （修复前 chargeT 永被重置、ammo 不变 → 测试必失败）。boottest ×3 `BOOTTEST_PASS_P70_F0`。
- **版本**：player v25→26 / main v83→84。

## 2026-09-05（悖论骰子数值强化：dmg 8 / 射程 35 / 弹速 20 / PARADOX 2 连触发）

- **用户需求**：单发伤害改 8、射程改 35、弹速改 20；PARADOX 触发改为连续掷出 2 次相同数字，大幅增加演出概率。
- **weapons.js**：`dice` def `dmg 6→8 / speed 10→20 / range 20→35`（rate 3.6 / mag 10 / reload 1.5 保持）。
- **dice.js**：`K.PARADOX_CONS 4→2`（触发概率从 0.46%/掷 → 16.7%/掷，约 36 倍）；弹丸 `spd:10→def.speed`、各点数 `life` 改为 `def.range/def.speed`（射程统一 35 格，掷 1 厄运 0.8×=28 稍短，掷 4 冻结/5 追踪同 35）——以后调 def 自动生效；掷 6 爆炸固定 4.5 格不变。
- **HUD 适配**：ui.js「下次崩坏」提示用 `D.K.PARADOX_CONS-1` 动态引用，cons≥1 即提示，无需改。
- **测试**：STEP 62 同步调整——③ 段删除"连续 2 次 roll(1)"（现阈值下第 2 次即触发 PARADOX），改由②验证 cons 0→1、③验证异数重置；⑥ 段改为 2 连触发断言。boottest ×3 `BOOTTEST_PASS_P70_F0`。
- **版本**：weapons v33→34 / dice v2→3 / main v82→83。

## 2026-09-05（第四层 Boss 受击特效修复 + 舱口被核心装置遮挡无法下潜修复）

- **Boss 无受击特效/一直黑色/血条不掉**（用户实机反馈）：`voidripper.js` VR.hurt 两处存量 bug：
  ① `emissive=0xffffff` 直接把 THREE.Color 属性赋成 number——材质损坏 → Boss 核心永久黑色（且污染全场共享的 G.vcolMat）；② 从未调用 `G.ui.bossBar`——血条永远满格。修复：core 改用独立克隆材质 + 闪白走 Color.setHex 正确 API + hurt 内同步血条比例。
- **打完 Boss 无法传送到第 5 层**：舱口生成在 Boss 房正中心，被巨型 voidcore（阻挡半径 2.6）压住——玩家被挡在交互半径（1.5）之外永远按不到 E。修复：舱口改放中心南侧空位（cz+3，钳制房内）+ 交互半径 1.5→2.2。
- **重要教训**：第五层接入批次漏 bump game/build/ui/audio/boss/main 的 ?v= 版本号——用户浏览器缓存旧 JS（无第五层分流），实机表现与最新代码不符。此后每次改动必须逐文件核对版本号（已全部补 bump）。
- **验证**：实机全链——Boss 受击掉血+血条 95%+材质 Color 完好+舱口位于 voidcore 南 1.5 格+玩家交互距离 1.2<2.2+descend 触发 transition；boottest `PASS_P70_F0`。
- **版本**：voidripper v=6 / build v=16 / game v=25 / ui v=18 / boss v=18 / main v=81

---

## 2026-09-05（第五层「异常回廊」完整重构：13 种特殊房间 + 规则异常世界 + 新 Boss）

- **核心概念**：第五层=「规则异常世界」——房间本身就是玩法。特殊房占总房间 ~72%，按深度分层渐进失控（前段 tame → 中段改规则 → 后段破坏世界 → 极后段彻底疯狂）。
- **新增 5 个模块**（加载顺序 anomaly → rooms5 → rooms5b → floor5）：
  - `rooms5.js`：SpecialRoomManager（SR5）——房间生命周期（onEnter/update/complete/cleanup）、RoomState 状态隔离（undo 栈模式：一切临时修改注册回滚函数，cleanup 逆序执行）、统一完成检测（autoCompleteOnClear+3s 保底）、奖励档位、临时武器工厂、房间 1~7。
  - `rooms5b.js`：房间 8~13。
  - `floor5.js`：异常节点网络生成器——异常核心放射 6~8 支路×2~4 节点、特殊房 spec 由 SR5 注册表驱动、窄走廊桥（1 cell）、回环、隐藏房、Boss 竞技场 5×4（全游戏最大）、连通校验+10 次重试。实测 30 种子 0 失败、特殊房占比 75%、12 类型全分布（devchaos 0.8% 稀有）。
  - `anomaly.js`：第五层 Boss「失序之主 THE ANOMALY」HP1600——三阶段（P1 弹幕+瞬移 / P2 起规则篡改 / P3 高频篡改+召唤）。规则篡改池（射速减半/弹药冻结/重力漂移/敌人巨大化/空间封锁）全部横幅预警+限时恢复+可反制；死亡演出→bossDefeated→winRun。
  - `build.js` theme5（故障绿×异常紫）+ `game.js` 分流/舱口(floorNum<5)/descend/music f5 + `ui.js` 层名 + `audio.js` f5 曲目（不和谐半音阶）+ `boss.js` 分发（floorNum>=5→anomaly，H25 顺序纪律）+ spawn opts 参数（type/hpMul 指定历史 Boss，供 Boss Rush）。
- **13 种特殊房间**（统一接口 initialize/start/update + SR5.complete）：①武器失控实验室（9 种异常规则随机污染武器）②巨型敌人房（2~8 倍全方位巨大化）③Boss Rush Roulette（历史 Boss 轮换+最终融合体）④黑暗房（光压暗+击杀点亮）⑤地图崩坏房（预警→崩塌→tile 删除碰撞同步）⑥武器祭坛（献祭换 30s 神兵）⑦敌人抢武器（火力单元争夺）⑧敌我互换（外观+弹幕真实替换+AI PLAYER）⑨投票房（SAFE/CHAOS/INSANE）⑩子弹银行（弹壳=货币 4 档）⑪假房间（假墙+消失地板）⑫超级宝箱房（20~40 箱 8 种结果+真箱微光）⑬开发者测试房（10 种故障轮换全可恢复）。
- **FLOOR 5 DEBUG SELECTOR**：`?shot=5&floor5debug=N`（1~13 直选特殊房；正式版无入口）。
- **STEP 72 适配**：第 4 层 Boss 击杀改为出舱口+真实下潜第 5 层断言；**STEP 74 新增**第五层全链路（8 种子结构+特殊房触发/武器失控/状态回滚+失序之主真实子弹伤害+击杀通关 win_run）。boottest 69→70 步。
- **调试血泪**：①特殊房完成分支失效谜题（模块级检查三条件全真不触发）——改由 SR5 管理器统一检测（autoCompleteOnClear）根治；②STEP 74 真实子弹测试被 RAF 的 onRoomEnter 二次 Boss spawn 破坏（bossSync=false）——测试需标记 bossSpawned 防重入；③Boss 竞技场 6×5 在 25×20 边界放不下——缩 5×4+征用兜底+全向放置。
- **验证**：boottest ×3 `BOOTTEST_PASS_P70_F0`；browser-use 实测 **13/13 特殊房间**（激活/机制运行零错误/完成路径）+第五层入场截图（故障绿主题与第四层强区隔）。

---

## 2026-09-05（PVZ 僵尸下架：贴图正放方向仍不达要求，以后重做）

- **用户决定**：多轮修正（45° 后仰立牌 → 平贴地贴）后贴图正放方向仍不符合预期（用户反馈「还是倒的」），指示「先把僵尸删了吧，以后重做」。
- **执行**：删除 gen4.js 的 PVZ 乱入入口（35% 替换 + 8% 入侵事件，战斗房恢复纯原敌人池）；**enemies.js 的全部僵尸代码原样保留**（defs 8 种 / makeMesh / AI / animate / 贴图管线 pvzTex/pvzCard / assets/sprites/pvz 12 张原版 PNG），不再被任何路径触发。重做时在 gen4.js fillRoom 的 combat 分支恢复乱入入口即可（历史实现存档于 git 2746360）。
- **待重做时的关键遗留问题**：原版贴图的「正放」方向——用户要求与画面文字同向（平贴地面、头朝画面上方），实现为 rotation.x=-PI/2 平贴后用户仍判「倒的」，**相机朝向与贴图 UV 方向的对应关系需重新实证**（建议重做时先在空场景单放一张僵尸贴图，用截图确认四个朝向，再定旋转值）。
- **验证**：node --check 通过；几何探针 300 种子 0 失败（乱入删除不影响生成结构）。
- **版本**：gen4 v=33（enemies v=32 保留未动）

---

## 2026-09-05（PVZ 纸片人修补：贴图完整显示 + 移动端正）

用户反馈：①贴图没完整显示；②移动时歪七扭八。三处根源一次修掉：

- **贴图显示不完整根源 1**：animate 每帧把纸片人中心 y 覆盖成行走浮动值（≈0），后仰的平面大半插进地里只露上半截 → 基础高度记入 `r._cardY` 锚定，浮动不再覆盖。
- **贴图显示不完整根源 2**：原版 GIF 画布含大量透明边距（pole 348×218 画布僵尸只占一小块）→ 转换 PNG 时自动扫描 alpha bbox 裁掉边距（12 张全部重导，basic 166×144→80×122 等），僵尸贴满纸片人；alphaTest .12→.01 保留抗锯齿边缘。
- **移动歪斜根源**：行走摇摆（rotation.z ±0.06）+ 上下浮动叠加在 billboard 上 → 全部去掉，纸片人恒端正正对镜头；后仰角 1.13rad（65°，平躺观感）→ **0.79rad（45°）**——几何推导：竖立被 65.7° 俯角压成 41% 高度、全后仰投影 100% 但观感平躺，45° 投影 94% 且站立感保留。撑杆跳空翻动作保留。
- **验证**：实机截图 8 种僵尸站立端正、贴图完整（原版形象 100% 可辨），解冻走动中姿态端正。
- **版本**：enemies v=31

---

## 2026-09-05（第四层体验修复批次：桥宽/房尺寸/桥长/弹出虚空/封门软锁/Boss 引导/PVZ 原版化）

用户实测反馈 7 个第四层问题，本批全部处理：

- **① 桥太窄仅容一人**：genMask 的 bridge 掩码原为「留空靠门廊保底拼通道」——探针实测 17% 的桥实际地板通道只有 2 tiles 宽。改为**沿长轴铺恒定 5-tile 宽中带**（BAND=5，≈玩家碰撞体 6 倍）。
- **② 房间大小两极分化**：探针实测 38.6% 战斗房为 1×1/1×2/2×1/1×3/3×1 极小房（配 corridor/platform 形状有效面积更小）、6.5% 为 3×3 巨房。sizeRoll 重分配为主流 2×2（60%）+3×2（28%）+2×3（8%）+3×3（4%）；第二/三圈尺寸公式 1 的概率减半。**调参血泪**：主区全 ≥2×2 后 21×19 边界放不下足够战斗区（zones<10），freeCnt 收紧叠加曾致 24%/6.8%/1.3% 生成失败——最终**边界扩至 23×21（BX0=-11,BX1=12,BZ0=-10,BZ1=11）**+freeCnt 上限 8→6，300 种子 0 失败。
- **③ 玩家被弹出地图到虚空**：根源之一 = `build.js` 折叠门传送写死 `z+1.2` 偏移且无合法性检查（落点邻 tile 是虚空时直接把玩家传出地图）。gen4 布置 foldgate 时产出**出口落点 out**（吸附合法地板 tile），build.js 传送消费 `other.out`。
- **③' 兜底：玩家位置自愈**（H17 明言玩家一直没有对应兜底）：玩家中心 tile 非法（墙/虚空/关着的门）持续 0.6s → 自动吸附最近合法地板 + 0.8s 无敌 + 特效音效提示（player.js）。
- **④ 打怪被封门外无法回房**：踩门 tile 瞬间 onRoomEnter 触发锁门，玩家半身在门外可走出（从 solid tile 向外移动前缘采样合法放行），回头进不去。兜底：checkRoomClear 锁定房扫描中，**玩家不在房内 → 门开**；玩家回房 → 门恢复封锁（站门 tile 上时不关，防夹）。
- **⑤ Boss 引导**：原实现仅「全部清完」toast 一次四方位。改为：清房进度 ≥50% → Boss 房 `mapHint=true` + 小地图/大地图 ☠ 脉动信标（ui.js drawMap）+ 一次八方位 toast；全清后再提示一次（startFloor 重置标记）。
- **⑥ PVZ 僵尸原版化**（用户硬性要求：必须是原版形象，可牺牲风格协调）：
  - 素材：从 jiangnangame/New-Plants-vs-Zombies-JavaScript（GitHub）提取 8 种原版渲染动画 GIF，**Read 多模态逐一确认原版形象**；因 WebGL 规范 texImage2D 对动画 GIF 只取首帧（白色淡入帧），用 2D canvas 在浏览器内抽取正常帧转成 12 张 PNG 入库 `assets/sprites/pvz/`（≈130KB，本地资源 file:// 可用）。
  - 渲染：enemies.js 新增 pvzTex/pvzCard——**billboard 纸片人**（PlaneGeometry + MeshBasicMaterial 保真原版色彩 + alphaTest + 底部椭圆阴影）。**踩坑三连**：① 竖立纸片人在第四层 ~65° 俯角下被投影压成横条 → rotation.order='YXZ' 后仰 1.13rad 正对镜头；② NPOT 纹理必须 generateMipmaps=false + CLAMP（否则采样碎裂）；③ billboard 固定面向镜头（原版 PvZ 僵尸本就单向行走）。锥/桶/气球破甲后自动换普通僵尸贴图（原版行为）；读报碎→暴走贴图；橄榄球冲锋/撑杆跳跃/舞王跳舞有专属贴图。
  - **出现率大幅上升**：普通乱入 8%→**35%**（替换 2~3 个），入侵事件 2.5%→**8%**（整房 PVZ 波）。
- **⑦ 桥太长**：layBridge 新铺自由格上限 8→6 + 路径总步数 ≤14——长轴 ≥5 cells 的桥从 8.8% 降到 4.9%，上限 6 cells。
- **验证**：几何探针 300 种子 0 失败（桥宽 ≥5 tiles / 桥长 ≤6 cells / 小房 38.6%→15%）；特殊房可达性探针 200 种子 0 问题；boottest 3 轮 PASS_P69_F0；browser-use 实机（本地 http 临时服）召唤 8 种僵尸截图，原版形象清晰可辨。
- **版本**：gen4 v=8 / enemies v=29 / build v=15 / game v=24 / ui v=17 / player v=24 / main v=80
- **commit**：本批次（见 git log）

---

## 2026-09-05（第四层特殊房间内容悬空根治：商店/宝箱/献祭/赌博统一矩形平台）

- **背景**：接手交接遗留问题「第四层特殊房间进不去」。node 探针实证 200 独立种子：
  - **门连接与可达性已无问题**（上一批 layBridge BFS 重写已顺带解决）——从出生核心出发，全图 tile 级 BFS（可走=floor 或开着的门）到达每个特殊房间全部地板交互点，`UNWALKABLE_FROM_START=0`。
  - **真实残留 bug：200 种子共 206 处商店内容悬空**——商店商品（stockPos）按 bbox 中心一条线摆放、完全不看房间掩码，在 corridor/ring/fracture 形状的房间里商品直接落在虚空断壁 tile 上（`t='wall'`），玩家进得了商店房却买不了任何东西；同根源地，build.js 商店的售货员/柜台硬编码贴北墙（`z0+1.0`）、campfire 按 bbox 中心偏移，同样会悬空。
- **根因**：第四层特殊房由 combat 房改 type 而来（`takeSpecial`），继承了 ring/fracture/corridor/platform 等非矩形 shape 掩码；而商店/宝箱/献祭/赌博的全部布点逻辑都按矩形 bbox 推算（前三层房间恒近矩形所以从不出错，第四层非矩形掩码下必然悬空）。
- **修复**（`js/gen4.js` `takeSpecial` +4 行）：特殊功能房统一 `r.shape='rect'`（规整矩形悬浮平台）→ 掩码=全 bbox → 商品/售货员/柜台/火堆/宝箱/祭坛/赌博点/武器展示架（build.js 沿四墙布点）按 bbox 布点必然落在地板上。对前三层零影响（gen4 只在第 4 层运行）；combat 房保持千奇百怪的形状不变。
- **验证**：
  - 探针 200 种子（含 shopkeeper/counter/campfire/stock 落点 + 全图可达性）：**修复前 206 处 TILE_NOT_FLOOR → 修复后 0 问题**
  - boottest 连跑 3 轮：**BOOTTEST_PASS_P69_F0**（69 PASS / 0 FAIL），无 flake
  - 实机截图 `?shot=4&shot=shop`：第四层商店货架/商品/价格牌正常陈列在地板上；`?shot=4` 全景正常（中央核心/虚空背景/能量描边无异常）
- **版本号**：gen4.js v=6 → **v=7**
- **commit**：见 git log（本批次）

---

## 2026-09-05（粒子残留光点修复 + 第四层桥梁加宽 bug 根治）

- **背景**：用户反馈三个问题：①武器/敌人弹幕打完后屏幕留下细微光点久久不散；②第四层桥依然太窄只能通过玩家一人；③战斗房间大小不合理。本次先修复前两个核心问题。
- **问题 1：粒子残留光点**
  - 根因：fx.js 粒子系统从 340 Sprite 改为 3 Points 批量渲染后，粒子死亡时只设置 `size.array[i]=0`，但在某些 GPU 上 size=0 的点仍会渲染为 1 像素光点，且 position 仍在原地 → 屏幕上残留久久不散的细微光点。
  - 修复：粒子死亡时同时把 `position.array[i*3+1]=-100`（移到屏幕外极远处），并标记 _dirty 确保 position attribute 更新。
- **问题 2：第四层桥梁加宽 bug 根治**
  - 根因：之前的 layBridge 加宽逻辑有严重 bug——`side='+'` 时把桥房起始位置 `brz` 设为 `brz+brh`，导致桥房整体移动到新位置，**原来的桥房格子不再被包含在桥房中**。这使得加宽实际上失效，桥仍然只有 1 cell 宽，玩家只能一人通过。
  - 修复：重写 layBridge 加宽逻辑为 `_widen(axis)` 函数：
    - `side='+'`：保持 brz/brx 不变，只在下方/右方扩展（检查新增 cell 自由）
    - `side='-'`：向上方/左方扩展，brz/brx 相应移动
    - 只检查新增行/列的 occupied 状态（原有桥房格子已是自由格）
    - 只在 brw>brh（横向桥）或 brh>brw（纵向桥）时加宽，1×1 桥不加宽（避免相邻桥房重叠）
    - 目标宽度 2 cells（约玩家碰撞体的 3-4 倍）
- **房间大小**：尝试调大（移除 2×1/1×2 极小房间、增加 3×3/4×2 概率）后导致第四层生成失败（房间太大放不下、freeCnt 超限），已回退到原分布。房间大小优化需后续更保守的渐进式调整。
- **验证**：
  - node --check 语法通过（fx.js / gen4.js）
  - boottest 5 次运行：**4 次 BOOTTEST_PASS_P69_F0**，1 次 P68_F1（唯一失败是已知 flaky 测试 STEP 11 隐藏房间未生成，与本次修改无关）
  - STEP 72（第四层生成器）全部通过，桥梁加宽修复有效
- **版本号**：fx.js v=6 → **v=7**，gen4.js v=5 → **v=6**
- **commit**：`2fb5ded`，已推送 origin/master

---


## 2026-09-05（粒子系统批量渲染优化：340 Sprite → 3 Points，不改动过载点唱机）

- **背景**：用户要求不要改动过载点唱机的任何行为，寻求其他优化方案解决第三层卡顿。
- **根因**：fx.js 粒子系统每个粒子是独立 THREE.Sprite，MAXP=340。过载点唱机 vinyl 拖尾粒子满负荷时同时存在 ~338 个粒子 → **338 个 draw call**，触发固定时间步长死亡螺旋导致帧率骤降。
- **优化方案**：把粒子系统从逐个 Sprite 改为 **THREE.Points 批量渲染**：
  ① 3 个 Points 对象（每 kind 一个：'a' additive soft / 's' additive hard / 'm' normal smoke），最多 **3 个 draw call**（而非 340）
  ② 每个 Points 用 BufferGeometry，包含 position / color / size 三个 attribute（各 340 槽位）
  ③ 自定义 ShaderMaterial：顶点着色器实现 billboard + per-point size，片段着色器实现 texture * vertex color
  ④ 粒子逻辑数据结构保持不变（life/velocity/gravity/drag/s0/s1），新增 kind/r/g/b 字段
  ⑤ 粒子更新时直接写 BufferGeometry attribute，用 _dirty 标记减少 needsUpdate 调用
  ⑥ **所有外部接口完全兼容**：G.fx.particle() / G.fx.burst() / sparks/blood/smoke 等调用方无感知
  ⑦ **不改动过载点唱机的任何行为**：vinyl 子弹的 pierce/bounce/life/拖尾概率/粒子数量全部保持原样
- **性能提升**：满负荷 draw call 从 **340 → 3**（减少 99%），粒子系统不再是渲染瓶颈
- **验证**：
  - node --check 语法通过（fx.js）
  - boottest 连跑 3 轮：**BOOTTEST_PASS_P69_F0**（69 PASS / 0 FAIL），无 flake
  - 无运行时错误（errlog 为空）
- **版本号**：fx.js v=5 → **v=6**

---

## 2026-09-05（第四层地图全面修复与重构 + 全新专属 Boss「空间裂解者」）

- **背景**：第四层基础地图与玩法完成后，实际游玩发现严重空间可玩性问题——桥太窄（只够一人通过）、桥边护栏挡子弹（射击打击感差）、战斗区域像前三层小房间、宝箱/献祭被边界挡住无法交互、Boss 房过小、Boss 仍用第三层无面君主（换皮不可接受）。
- **gen4.js Part 1 重构**（地图边界/区域/桥梁/Boss房/敌人密度/宝箱安全）：
  ① 地图边界从 17×15（BX0=-8,BX1=9,BZ0=-7,BZ1=8）扩大到 **21×19 cells**（BX0=-10,BX1=11,BZ0=-9,BZ1=10）
  ② 战斗区域 sizeRoll 概率重分配，最大从 2×2 扩大到 **3×3**（新增 3×2/2×3/3×3），第二/三圈区域也支持 3
  ③ 桥梁加宽：layBridge 创建桥房时尝试加宽到 **2 cells**（横向桥加宽 z 方向，纵向桥加宽 x 方向，检查加宽 cell 自由才加宽，失败保持 1 宽）
  ④ Boss 房从 2×2 扩大到 **4×4 cells**（addRoom 参数和回滚循环都改了）
  ⑤ 敌人预算从 `4 + cells*2.2 + rng.range(0,2.5)` 增加到 **`6 + cells*3.0 + rng.range(0,3.5)`**
  ⑥ 宝箱/献祭/赌博点安全生成：从中心改为选择**远离门且周围 3×3 全是地板**的位置（Reachability Check）
  ⑦ Boss 房内容：从 2 根柱子改为 **4 角柱子**
- **gen.js 修改**：`solidForBullet` 函数中，第四层的 wall（虚空边缘）返回 **false（不挡子弹）**，`solidForMove` 保持不变（角色仍不能走出桥）。视觉边界与战斗碰撞分离。
- **全新第四层专属 Boss「空间裂解者 · 失序核心」**（新增 `js/voidripper.js`，第 23 个模块）：
  - **造型**：悬浮几何核心（上下双锥体八面体+内层球+青色能量核心）+ 6 片环绕空间碎片（青品渐变双锥体）+ 底部能量环（12 个小盒子围成圈，青品交替）+ 青色点光源 + 双层能量光环 sprite。**与第三层无面君主（人形装甲+王座+竖缝眼+暗紫）完全不同的 silhouette/颜色语言。**
  - **三阶段机制**：
    - 阶段 1（HP > 66%）：空间弹 3 连发追踪，缓慢悬浮追踪
    - 阶段 2（HP 33%~66%）：扇形弹幕 8 发 + 短距离传送（5.5s CD）+ 空间裂缝减速区域（6s CD，最多 3 个）+ 召唤虚空小怪（10s CD，最多 4 只）
    - 阶段 3（HP < 33%）：螺旋弹幕 12 发 + 高频传送（3.5s CD）+ 战场临时裂解（7s CD，最多 2 个虚空区域）
  - **HP 1200**，死亡演出 1.5s（缩放消失+核心光衰减），死亡后触发 `G.game.bossDefeated()` → 第四层通关
- **boss.js 修改**：`B.spawn` 添加第四层分发（floorNum>=4 → G.voidripper），`B.clear` 添加 voidripper 清理，`B.update`/`B.hurt` 添加 voidripper 路由（必须在 voidking 之前检查）
- **main.js STEP 72 适配**：测试从 `G.voidking.active` 改为 `G.voidripper.active`，HP 断言从 1600 改为 1200，"终焉回响"改为"空间裂解者"
- **验证**：
  - boottest 连跑 3 轮：**BOOTTEST_PASS_P69_F0**（69 PASS / 0 FAIL），无 flake
  - node --check 语法通过（gen4.js / gen.js / boss.js / voidripper.js / main.js）
- **附带**：index.html 版本号 bump（gen4?v=5 / gen?v=15 / boss?v=17 / voidripper?v=5 / main?v=79）
- **设计决策**：第四层设计优先级最终确定为 **战斗可玩性 > 空间可读性 > 交互可达性 > 地图复杂度 > 装饰密度**；宁可减少装饰和地图复杂度，也不牺牲战斗空间；虚空=不写 tile（碰撞天然 solid、子弹被吞是刻意取舍，但第四层 wall 不挡子弹是例外——因为桥边视觉边界不应成为子弹墙）。

---## 2026-09-05（PVZ 僵尸原作还原：推翻首版视觉，严格按原作 silhouette/比例/配色重做）

- **背景**：首版 PVZ 僵尸存在"模型不像原作"问题——普通僵尸用深灰西装（原作是棕色外套）、撑杆跳用蓝色运动服（原作是黄色）、橄榄球用绿色球衣（原作是红色球衣+白色裤子）、读报用紫色浴袍（原作是秃头+棕色外套）、舞王裤子是深紫（原作是白色裤子），且头身比例不够夸张。
- **重做原则**：不是"制作具有 PVZ 风格的僵尸"，而是"把 PVZ 经典角色作为外部游戏世界的角色，最大限度保持原作视觉身份，直接放进当前游戏"。乱入感比画风统一更重要，允许与 NDS 像素风存在明显反差。
- **视觉还原优先级**：Silhouette（剪影）> Body Proportion（身体比例）> 颜色 > 标志性服装 > 标志性道具 > 动作。
- **具体改动**（enemies.js makeMesh 全部 8 个 case 重写）：
  ① 普通僵尸：大头小身体比例（头占身高1/3）、灰绿皮肤(0x9bbf7a)、棕色外套(0x6b4423)、白衬衫、红领带(0xc8302a)、大眼睛（眼白多瞳孔小）、微张嘴露牙、手臂前伸手指张开
  ② 路障僵尸：巨大橙色交通锥(0xff6600)、白色宽反光条、黑色底座，锥子几乎和头一样宽
  ③ 铁桶僵尸：巨大铁桶覆盖整个头顶、金属高光条、桶口卷边、桶标
  ④ 撑杆跳僵尸：黄色运动服(0xd4a017)（不是蓝色！）、白T恤、黑短裤、白袜、白色运动鞋、长杆移至身侧可见
  ⑤ 橄榄球僵尸：红色球衣(0xc8302a)+白色裤子（不是绿色！）、红色头盔、白色护肩、白色号码"8"、黑色面罩、大体型
  ⑥ 读报僵尸：秃头（秃顶高光+两侧灰发）、棕色外套+白衬衫+红领带（和普通僵尸一样，不是紫色浴袍！）、小圆眼镜、大报纸挡脸（米白底+粗报头+多行文字）
  ⑦ 舞王僵尸：大爆炸头（深棕黑，多方向膨出）、紫色亮片西装(0x6a0dad)、白衬衫、黑领带、白色裤子（不是深紫！）、黑墨镜、金项链+吊坠、黑舞鞋
  ⑧ 气球僵尸：小僵尸身体、蓝色大气球(0x4da6ff)（有明显高光）、气球结、绳子连接
- **验证**：
  - boottest：**BOOTTEST_PASS_P69_F0**（69 PASS / 0 FAIL）
  - 3 秒识别测试：8 种僵尸排列截图，全部 1-2 秒内可认出对应 PVZ 角色
  - node --check 语法通过
- **附带**：index.html 版本号 bump（enemies?v=21→22）
- **设计决策**：PVZ 僵尸保留自己的卡通化比例、颜色和经典轮廓，不强行融入当前游戏的 NDS 像素风；统一的只有低分辨率渲染、光照、阴影、像素颗粒和屏幕后处理。最终效果是"明显来自 PVZ 的角色被强行放进地牢"。

---
## 2026-09-05（PVZ 乱入敌人批次：8 种经典植物大战僵尸僵尸）

- **背景**：第四层「失序维度」定位为"世界开始出现异常乱入"的楼层，加入《植物大战僵尸》经典僵尸作为乱入敌人，
  目标是"看起来就像 PVZ 的原角色突然被扔进了我的游戏"，而非"参考 PVZ 的原创僵尸"。
- **实现**（enemies.js +488 行，五处齐全：defs/makeMesh/AI/animate/hurt）：
  ① 普通僵尸：灰绿皮肤+深灰西装+白衬衫+红领带，手臂前伸经典僵尸姿势，缓慢追踪+接触近战
  ② 路障僵尸：头顶橙色交通锥（独立耐久15），任何方向攻击先扣锥，锥碎→变普通僵尸（碎裂特效）
  ③ 铁桶僵尸：头顶铁桶（独立耐久35），桶存在时只承受20%伤害，桶碎→变普通僵尸
  ④ 撑杆跳僵尸：蓝色运动服+手持长杆，接近→举杆蓄力0.4s→撑杆跳0.6s（越过玩家/墙体，跳跃中无敌）→落地硬直
  ⑤ 橄榄球僵尸：肥壮体型+红色头盔+绿色球衣+白色号码，蓄力0.6s→高速冲锋（速度7.5，正面减伤50%），撞墙眩晕
  ⑥ 读报僵尸：紫色浴袍+秃头+眼镜+手持报纸（挡脸），报纸阶段缓慢移动+偶尔停下看报，报纸碎→暴走（速度×2.2/攻速×2.5/红眼）
  ⑦ 舞王僵尸：爆炸头+紫色亮片西装+墨镜+金项链，每8-12秒停下跳舞2s→召唤2-3只伴舞僵尸（pvz_basic）
  ⑧ 气球僵尸：头顶蓝色气球+绳子，悬浮移动（y=1.0），忽略地面墙体碰撞，气球破→掉落地面变普通僵尸
- **乱入机制**（gen4.js +16 行）：
  - 普通战斗房：8% 概率替换 1-2 个敌人为 PVZ 僵尸（40%概率替换2个）
  - PVZ 入侵事件：2.5% 极低概率，整个房间敌人替换为 PVZ 僵尸波（普通×4 + 路障 + 读报 + 铁桶 + 撑杆跳）
  - 标记 room._pvzInvasion=true 供音乐/氛围变化（后续可扩展）
- **验证**：
  - boottest 连跑 2 轮：**BOOTTEST_PASS_P69_F0**（69 PASS / 0 FAIL），无 flake
  - 3 秒识别测试：8 种僵尸排列截图，每种都有明显 PVZ 特征（交通锥/铁桶/长杆/橄榄球盔/报纸/爆炸头/气球）
  - node --check 语法通过
- **附带**：index.html 版本号 bump（enemies?v=21 / gen4?v=4）
- **设计决策**：PVZ 僵尸主要放入第四层（乱入楼层），前三层保持正常地牢世界；
  外观优先级 silhouette > 颜色 > 服装 > 装备 > 细节；保留卡通滑稽风格，不改成黑暗恐怖/写实/科幻；
  统一当前游戏的低分辨率渲染/光照/阴影/像素颗粒，最终效果是"明显来自 PVZ 的角色被强行放进地牢"。

---
## 2026-09-05（第四层 layBridge 汇接缺陷根治 + 生成器鲁棒性达标）

- **背景**：第四层主体（7829e0d / adcc527）合入后，boottest STEP 72 的 seed#3 genFloor 返回空。
  探针实证 120 独立种子：单次 tryBuild 失败率约 82%，40 个种子有 3 个整条重试链（12 次）全失败 →
  真实玩法 bug：玩家进第 4 层约 7.5% 概率地图生成失败。
- **根因**：旧版 `layBridge` 的「汇接既有桥」逻辑——BFS 路径撞上既有桥房时把连接终点改接到桥房、
  目标房间永远不被连接却返回 true → 产生「互相连通但与主图断开的孤立簇」→ conn 校验失败 → 全部重试。
  失败原因分布：zones<10（293）/ armdead arm 连不上核心（283）/ sercut 串联断尾（129）/ conn 全图连通失败（66）。
- **修复**（`js/gen4.js`，+116/-51 行）：
  ① `layBridge` 重写为 BFS 最短路：自由格/既有桥房格/a b 自身格可通行，其余房间阻挡；
    途经既有桥房时两侧开门汇接为枢纽；a/b 自身占格仅通行不铺地板；新铺自由格 >8 放弃（防细线地图）；保持原子化回滚。
  ② 新增 `hookToLinked(target)`：arm 连不上核心时挂到「当前与核心连通的任意房间」（含桥房，按距离前 4 候选）；
    arm 内串联失败也先尝试 hookToLinked 再砍段。
  ③ 最终兜底 tryBuild 也传 `GEN4._dbg` 记录失败原因。
- **验证**：
  - 8 测试种子（0x51DE00+s*7919, s=0..7）全部 PASS：rooms 28~43 / shapes 8~9 / 桥房 15~26 / 无 exit 房 / 机制齐备
  - 300 种子大样本：**0 失败，0.00% 失败率**（rooms min=25 max=45 avg=32.2）——目标整链失败 0 达成
  - boottest 连跑 3 轮：**BOOTTEST_PASS_P69_F0**（69 PASS / 0 FAIL），无 flake
  - 实机截图 1/2/3/4 层对比：第四层一眼可辨（无高墙/悬浮平台/中央核心同心环/能量水晶柱/虚空背景+浮空废墟/放射状小地图）
- **附带改动**：
  - `js/main.js`：新增 `?shot=3` 第三层直开截图入口（原仅有 shot=2/4）；STEP 72/73 测试已在上一会话写完
  - `js/player.js`：已加 `p._foldCd` 折跃冷却计时器（上一会话遗留）
  - `index.html`：版本号 bump（gen4?v=3 / player?v=23 / main?v=76）
- **文档同步**：GAME_SYSTEMS.md §6 第四层段落 / ARCHITECTURE.md 21→22 文件 / PROJECT_STATUS.md /
  AGENTS.md 速览表 / HIGH_RISK_AREAS.md H10（改写为「第 4 层已完成，加第 5 层前必读」）/
  PRODUCTION_ROADMAP.md 负空间条目改口 / 本日志追加。

---
## 2026-09-04（第四层「失序维度」：专属生成器 + 主题 + 流转接入）

- **背景**：用户要求第四层在空间结构 / 生成逻辑 / 视觉主题 / 战斗空间 / 探索节奏五个维度与前三层完全不同，并明确「优先修改第四层专属生成器，而不是强行复用前三层系统」。
- **新增 `js/gen4.js`**（第 22 个模块，插在 `gen` 与 `build` 之间，约 700 行）——独立 Floor Generator：
  ① **节点图布局**：中央核心 core（2×2 椭圆平台，出生点）+ 6~7 主方向放射 + 二/三圈延伸 + 回环连接（非规则网格，带错位/大跨度/窄连接），地图边界 17×15 cells（前三层 13×11，约 1.8 倍）；
  ② **桥房模型**：两区域间铺 bridge 房链（同向段合并为长桥房、可汇接既有桥形成枢纽），两端仍是标准 4-tile 门 → **锁门/清剿/小地图/碰撞全部零改动复用**；
  ③ **房间 shape 掩码**：core/ring/platform/fracture/corridor/tiered/bridge/rect 八种内部地板形状（房间 bbox 仍矩形，掩码决定非矩形地板，虚空=无 tile=天然 solid）；
  ④ **门廊保底 + 房内 BFS 连通修复**：任何形状房间必能进出、必连通；
  ⑤ **原子化回滚**：layBridge 失败回滚已建桥房与门（首版踩坑——孤儿桥残留占位导致布局大面积失败，arms/zones 双双不达标），主方向改为「先放全部区域、再统一架桥」两阶段后根治；
  ⑥ **全图 BFS 连通校验 + 12 次种子重试**；
  ⑦ **地图机制**：相位桥（周期开闭，锁定战斗/实体站门上时不关）、空间折叠门（成对双向传送 + 去向标牌，可理解）、裂缝锚点（交互撕开隐藏通路）、引力井（周期拉拽 + 旋涡粒子）；
  ⑧ 第 4 层敌人池：远程弹幕↑ + 地形控制 + 冲锋的空间压力组合，按 shape 加权，精英率 55%。
- **`build.js` 主题 4「失序维度」**：**不渲染高墙**（房间即悬浮平台，边界靠地板能量描边 + 深渊底平面 + 22 块远景浮空废墟剪影——这是与前三层最直观的视觉差异）；新增 voidcore/highpad/brokencol/coredevice/foldgate/riftanchor 六种道具与 rune2/shard2/riftskar/conduit/wreck/floatrock 六种装饰；能量水晶柱替代火把；同心符文环替代 Boss 房矩形花纹；B.update 驱动废墟自转/碎块浮动/核心呼吸/折叠门能量面。
- **流转接入**：game.js `startFloor` 按层分流生成器 + `descend` FLOORS 加第 4 层 + **通关终点 3→4**（`bossDefeated` `floorNum<4` 出舱口）+ music 加 f4 + update 调 `G.gen4.update`；ui.js 层名/大地图 NAMES；audio.js `tracks.f4` 与环境音分支；voidking 第 4 层强化为「终焉回响」（HP 1600、体型 1.12、专属血条与横幅）。
- **STEP 45 适配**（H10 已预告）：第 3 层 Boss 击杀不再通关（改为出现「下潜至第四层」舱口），新增 ⑪ 段验证真实下潜到第 4 层的层号/主题/BGM 切换。
- **验证**：生成器 12 种子探针全成功（房间 25~37 / 全连通 / shape 7~9 种 / 桥 12~22）；boottest **67 PASS / 0 FAIL**。
- **⚠️ 未完成（下一批）**：STEP 72/73 第四层专项回归锁（生成器结构·非矩形断言·机制链路·终焉回响通关链路）、实机截图验证、文档同步（GAME_SYSTEMS §6 / ARCHITECTURE / PROJECT_STATUS / AGENTS / HIGH_RISK_AREAS H10 / PRODUCTION_ROADMAP 负空间「不做第 4 层」改口）。

## 2026-09-04（敌人建模微调 + 点唱机数值：gunner 恢复原版 · 点唱机强化）

- **gunner 恢复原版建模**：用户反馈"枪手还是原来的建模好"→ 将 enemies.js 中 gunner 的 makeMesh case 完整恢复为 8140f82 原版（红盔带+简单目镜+短枪管+无板甲/弹带/靴子）。恢复后 gunner mesh 数=5（原版结构），`gun_body/gun_head/gun_pistol` 无跨敌人引用，安全。charger/shroom/beetle 强化保留。
- **过载点唱机数值强化**：weapons.js defs 中 `jukebox` 单发伤害 `dmg:4→9`，射速 `rate:1.8→3.6`（2 倍）。弹匣/装填/网络机制不动。
- **验证**：实机 jukebox defs=`{dmg:9,rate:3.6}`，gunner mesh=5 无报错；boottest ×3 `BOOTTEST_PASS_P67_F0`。
- **版本**：enemies.js?v=19→20，weapons.js?v=31→32。

## 2026-09-04（敌人建模强化试点：gunner/charger/shroom/beetle 首批 4 种）

- **背景**：用户要求"先给几个敌人强化建模，看看能做多好"；选定早期造型较简单、有辨识度的 4 种（不动最新批次）。
- **强化内容**（保持 forward=+X、保持动画 refs 名称、共享 G.vcolMat 只改几何顶点色，身体尺寸与碰撞半径一致）：
  - **gunner 枪手** → 战术绿兵：头盔主壳+顶棱+护目罩+发光目镜、胸前板甲、背部弹药包、斜挎弹带、双肩甲、枪管延长+准星+扳机护圈、靴子
  - **charger 冲锋兽** → 凶悍狂牛：前弯大角（三段台阶）、背部棘刺×3、颈鬃毛、后腿护甲、獠牙+鼻吻、蹄子（挂在腿子节点随摆动）
  - **shroom 蘑菇** → 细节菌菇：伞沿菌褶环列 6 片、伞顶高光、根部盘、柄侧苔藓
  - **beetle 甲虫** → 鞘翅甲虫：背中鞘翅缝+翅斑、触角+触角端、钳颚、后腹拉长身形
- **踩坑**：charger 蹄子误用 `M(partGeo())`（M 返回 Mesh）再包 `new THREE.Mesh(chHoof,...)` → 把 Mesh 当 geometry，产生无 position 空几何，渲染 culling 报 `computeBoundingSphere is not a function`（GEO_PATCH/RENDER-FAIL 兜底捕获）。修复为 `partGeo()` 直接取几何。**教训：几何辅助函数 M() 返回 Mesh，不能当几何再包 Mesh**。
- **验证**：30 种敌人全量 spawn 逐一实测 0 报错；实机 4 敌人标准视角 errlog 空；boottest ×3 `BOOTTEST_PASS_P67_F0`。
- **enemies.js?v=18→19**。后续可再挑其他敌人（狙击手/掷弹手/激光图腾等）继续强化。

## 2026-09-04（A+B 美术试点终止：地板贴图两次被否 → 完全回退棋盘）

- **用户反馈**：程序化明亮像素砖效果仍不如最早的纯色棋盘，明确要求改回来。
- **执行**：`git checkout 28abeca -- js/core.js js/build.js index.html docs/ARCHITECTURE.md` 完全恢复到试点前基线。
  - core.js 恢复 v6（移除 GeoBuilder UV / imgTex / floorPixTex / floorTexMat）
  - build.js 恢复 v13（地板回到 `G.vcolFloorMat` 纯色棋盘）
  - index.html 版本号恢复 core?v=6 / build?v=13
- **验证**：实机地板 `MeshLambertMaterial hasMap=false vertexColors=true`（纯棋盘，与试点前一致）；boottest ×3 `BOOTTEST_PASS_P67_F0`。
- **结论**：本项目 320p 像素风 + 暗光照下，地板贴图（无论 AI 暗色图还是程序化亮砖）视觉均不及现有纯色棋盘方案。A+B 美术路线暂停，暂不铺开；资产目录已清理。
- **后续（待用户方向）**：若仍想提升美术，需重新评估目标——可能方向：改灯光/环境氛围、强化模型轮廓、重新设计棋盘配色梯度，而非地板贴图。

## 2026-09-04（A+B 试点修正：AI 暗色 JPG 地板贴图被否 → 程序化明亮像素砖）

- **用户反馈**：首版地板贴图（AI 生成暗色石板 JPG）在游戏内呈纯黑，比原棋盘还差，判定为倒退；质疑是否真的调用外部素材。
- **事实澄清**：确实调用了 image_gen 工具生成了纹理（本地 `assets/textures/floor_d1.jpg`，JPEG 416KB），非虚构；但方案失败属实。
- **根因（实机诊断确认）**：贴图管线正常（程序化亮色纹理应用后正常显示，有砖块/亮度 121）；失败在**纹理本身**——AI 生成的暗棕 JPG × 暗顶点色（floorA 0x6e5a3c）× 暗光照 = 乘积趋近黑色。JPG 有损 + 暗色系不适合本项目暗光照低模风格。
- **修正**：改为**程序化 CanvasTexture 生成明亮像素砖**（`G.floorPixTex(rgb)`：单砖 32x32、基色提亮 45、深砖缝、明暗噪点、NearestFilter、同步生成无异步问题）；buildFloor 第一层用 `floorTexMat(floorPixTex([146,104,64]),1)`（每 tile 一块砖）。保留 GeoBuilder UV 与 imgTex 管线（未来其他贴图仍可复用）。
- **验证**：实机地板亮度 121、方格砖块清晰可见（非纯黑）；boottest ×3 `BOOTTEST_PASS_P67_F0`。
- **教训**：本项目暗光照 + 320p 像素风下，外部/AI 暗色系图片贴图会相乘变黑；贴图必须保证**亮基色**或由程序化生成控制亮度。外部素材路线（A）若要继续，需先提亮/风格化处理再接入。
- **清理**：废弃 `assets/textures/floor_d1.jpg`（方案废弃，已删除）。

## 2026-09-04（A+B 美术试点：第一层地牢地板 AI 生成纹理贴图）

- **背景**：用户同意"外部素材本地化 + AI 生成素材"（A+B）路线提升美术。经探查：玩家（VOID HUNTER）与基地 NPC 已是定制低模，敌人 20+ 全为代码生成几何；瓶颈在**无贴图**——全场景靠纯色/顶点色。
- **试点选择**：第一层地板（画面最大表面、一眼可见提升、风险最低、管线可复用）。
- **实现**：
  a. `image_gen` 生成 1024 像素风暖棕石板无缝纹理 → 下载本地 `assets/textures/floor_d1.jpg`
  b. **关键技术发现**：file:// 下 `THREE.TextureLoader` 不可用（依赖 worker/XHR），但 `new Image()` + `new THREE.Texture()` 可加载本地图片 → 新增 `G.imgTex(url,cb)` 加载器（NearestFilter + RepeatWrapping，缓存复用）
  c. **GeoBuilder 加 UV**：`_push()` 复制源几何 uv，`build()` 输出 uv attribute（所有合并几何自动带 UV，无 map 材质忽略，无回归）
  d. `G.floorTexMat(tex,repeat)`：MeshPhongMaterial + vertexColors + map（顶点色乘纹理，保留棋盘明暗 + 房间类型色）
  e. `build.js` 第一层地板：纹理就绪用贴图材质（repeat=4 每 tile 一块砖），未就绪先纯色、异步就绪后切换（mesh 仍挂世界才换，防换层改已清理对象）
- **验证**：
  a. 实机：地板 mesh 带 map（1024x1024）+ UV + repeat 4；截图可见石板砖纹理（深色地砖质感）
  b. boottest ×3：`BOOTTEST_PASS_P67_F0`
  c. 无回归：GeoBuilder 改动只加 UV attribute，现有材质无 map 忽略 UV
- **下一步（待用户确认方向后）**：第二/三层、基地地板、墙体贴图、敌人/NPC 贴图。
- **注意**：`assets/textures/` 为本地贴图资源（file:// 用 img 加载，可断网运行）；`G.floorTexMat` 的 repeat 是纹理全局属性，多楼层不同 repeat 时需按需处理。

## 2026-09-04（地牢偶发 Script error 根治：main.js log 未暴露全局 + 主循环/渲染兜底保留真实 stack）

- **现象**：用户在地牢战斗（`wep=rusty`→`plasma`，base=N）持续看到 `ERROR: Script error. @:?`（file:// 下无来源无 stack），跨多轮反馈。
- **根因（决定性定位）**：main.js 整体为 IIFE，`function log()` 只在 IIFE 局部作用域；而 game.js `frame()` 的 RENDER-FAIL 兜底（9f62e8d 引入）直接调用 `log('RENDER-FAIL...')` → 在 game.js 作用域解析不到 log → `ReferenceError: log is not defined` → 冒泡到 window.onerror 被模糊成无来源 Script error。即：真实 GPU 渲染偶发错误本应由 RENDER-FAIL 兜底记录，却因 log 不可用反而变成新的 Script error（且 RENDER-FAIL 本身失效）。
- **修复**：
  a. main.js 把 `log` 暴露到全局 `window.log = log`（RENDER-FAIL / UPDATE-FAIL 兜底依赖）
  b. game.js `frame()` 主循环 update 加同域 try-catch（UPDATE-FAIL 兜底，每会话首条，含真实 stack + `G._trace` 子系统标记）
  c. game.js `update()` 各子系统前设 `G._trace` 标记（enemies/boss/weapons/build/photo/gambler/base/jukebox/dice/fx/ui/audio）
  d. main.js onerror 上下文快照增强：加 `trace=` + 玩家坐标 + 房间类型
- **验证**：
  a. 人为制造 ui.update 抛错 → errlog 显示 `UPDATE-FAIL: TEST_FAKE_UI_ERROR | trace=ui | Error ... at game.js?v=22:838`（修复前为无来源 Script error）
  b. 人为制造 render 抛错 → errlog 显示 `RENDER-FAIL: FAKE_RENDER_ERROR | ... at frame ...`（修复前 catch 内 log ReferenceError → Script error）
  c. onerror 上下文快照含 `trace=ui p=(15,6) room=start`
  d. boottest ×3：`BOOTTEST_PASS_P67_F0`
- **历史教训**：file:// 下所有"兜底 try-catch + log 记录"的代码都必须确保 log 可从该模块作用域访问；main.js 的 IIFE 封装使 log 默认不挂 window，是 RENDER-FAIL 兜底失效并反成 Script error 的根因。此后新增跨模块兜底一律走 `window.log`。

## 2026-09-04（基地世界标签穿模修复：基地文字叠加到地牢）

用户反馈：基地文字会穿模叠加到地牢画面。

**根因**：基地的世界标签（`base.tag()` 写入的 HTML `tagLayer` 层）在进入地牢时未被清理。
`base.leave()` 只复位 active/panel/hud，`build.buildFloor()` 清理旧世界时只清 `G.world` 子节点与
`G.props`——而 tagLayer 是独立 DOM 层（不在 three.js 场景里），两处都没清它，导致基地标签残留
并叠加到地牢画面。

**修复**：`build.js` 的 `buildFloor()` 清理段（`G.props.length=0` 后）补调
`G.base._clearTags()`（带防御判断），每次建地牢层时清空 tagLayer。build.js?v=12→13。

**验证**：
- boottest `BOOTTEST_PASS_P67_F0` 连跑 3 轮全绿
- 实机：基地 tagLayer=12 → launchRun 进地牢后 =0（不再叠加）→ 返回基地后 =12（标签正常恢复），
  死亡/胜利返回基地流程标签正常重建

## 2026-09-04（新敌人批次【8 种机制型敌人】：挖掘者·跳跃者·路障蛮兵·橄榄球狂徒·小丑·阵型指挥者·磁铁怪·气球怨灵）

按用户设计文档（7 条原则：一怪一核心机制/预警与 Counterplay/不削武器价值/敌人协同/NDS 像素风/严格兼容现有系统/实机验证）一次性新增 8 种敌人，形成前排·后排·突袭·区域控制·弹道干扰·空中单位的完整战斗生态：

- **miner 挖掘者**（L2~3，hp24）：CHASE→DIG→UNDERGROUND→EMERGE→ATTACK 五态。钻地预警 0.6s+地面土痕移动轨迹（可观察、可预判），地下/出土瞬间免疫普通弹（E.hurt 特判），出土预警土堆 0.5s，扑击 4.5~5.5 速不锁定。
- **vaultling 跳跃者**（L2~3，hp21）：PREPARE 下蹲 0.5s+跳跃轨迹预警→VAULT 长跳 3.5~5 格（空中可受远程伤害、不穿外墙）→LAND 轻微冲击波 1 伤→RECOVER 0.4s。可跳 Wallmaker 掩体与小型敌人。
- **barrier_brute 路障蛮兵**（L2~3，hp42/护甲22）：正面实体护甲独立耐久，正面普弹减 70% 消耗护甲（角差<0.6rad 判定），背后/爆炸/ignoreBlock 全额；护甲归零碎裂动画→BERSERK 狂暴（移速×1.3、接触伤+1、红 sprite+粒子）。与 Shield 的"累计格挡破防"形成不同处理优先级。
- **footballer 橄榄球狂徒**（L3，hp47）：低速重装推进→CHARGE_PREPARE 0.7s 地面冲锋路线预警→冲锋 6~7 速 0.8~1.2s（受击×0.5、撞开小型敌人、撞玩家 2 伤）→撞墙眩晕 1.1~1.4s 输出窗口。
- **jester 小丑**（L2~3，hp23）：Bullet Twist 弹道干扰场（r4.5，CD5~7s，施法旋转+彩色预警）：普通实体弹进场一次性偏转 15~35°，不伤不改寿命；激光/爆炸/近战/电弧/特殊 IgnoreBlock 免疫。weapons.js 新增 `b.aj` 标志 + `def.affectedByJester` 声明豁免（非写死 ID）。
- **podcaster 阵型指挥者**（L3，hp25）：Rally 施法 1.0~1.3s 发光集结→以自身为中心真实移动重排周围敌人（前排盾卫/蛮兵/冲锋，中排散弹/机枪，后排狙击/治疗等），空间不足放弃部分排序；CD 8~12s，不瞬移不改属性。
- **magnetron 磁铁怪**（L3，hp30）：Magnetic Field（r3.5，2~3s/CD4~6s）：普通金属弹渐进转向吸附（转向率受限，非瞬间 90°），吸弹储能（≤10，身体亮度随储能），0.8s 蓄力释放储能×1 枚环形弹。weapons.js 新增 `b.am` 标志 + `def.affectedByMagnetron` 豁免；与 Jester 的"偏转"明确区分。
- **balloon_wisp 气球怨灵**（L3，hp16）：悬浮空中慢飘+上下浮动（保持距玩家 5~8 格），每 3.5~5s 锁定玩家地面位置 0.8s 蓄力+地面预警圈→投 Void Bomb（爆炸 r1.5、2 伤），可被 Shotgun/爆炸/穿透武器空击，不可穿房间边界。

基础设施：defs 8 行（barrier_brute 含自定义 armor 字段）、makeMesh 8 case（partGeo 缓存+M() 建 mesh，refs 供 AI/animate）、E.spawn 加 armor 初始化、E.hurt 3 特判（miner 地下/出土免疫、footballer 冲锋×0.5、barrier_brute 正面护甲消耗→狂暴）、E.update 接触伤害统一 `_ctDmg`（mimic lunge/brute berserk/footballer charge=2 伤）+接触排除（miner 地下、wisp 空中）+podcaster 阵型移动机制（`_rallyMove` 期间跳过各 AI 真实移动）、animate 8 case、E.kill/E.clear 清理全局 `G._twistField`/`G._magField`（小丑/磁铁怪死亡或清场防残留）。weapons.js：W.spawn 加 aj/am 标志、W.update 注入 Jester 偏转段+Magnetron 磁吸段（在 b.life 后、追踪段前）；isSpecial 豁免清单=rocket/plasma/laser/rail/arc/paper/homing/polaroid/jukebox/dice/hairdryer/gambler。gen.js 敌人池：第 2 层 +miner/vaultling/barrier_brute/jester、第 3 层 +全部 8 种（footballer/podcaster/magnetron/balloon_wisp 仅第 3 层）。base.js ENEMY_NAMES +8 中文名。

回归：main.js 新增 STEP 71（编号 71，8 组断言，挖钻免疫/护甲狂暴/冲锋减伤/弹道偏转/吸弹储能/环形弹/阵型重排/空袭预警全链路）。排错史：miner 出土扑击时序不足→emerge 后 frames(45)；jester/magnetron 子弹出生点撞中央障碍（solidForBullet 秒灭）→改用 `W.spawn` 直接在干扰场/磁场内生成子弹（磁吸/偏转段先于移动执行，绕过墙体）；balloon_wisp 出界被卡墙自动消灭→spawn 移到房间内侧；STEP 70 Mimic 扇形弹 flake（玩家贴身 1.1 格导致弹命中即消失）→揭示后玩家先移开再断言。最终 **67 PASS / 0 FAIL**（P67_F0），连跑多轮防 flake 通过。

## 2026-09-04（新敌人【拟态怪 Mimic】：伪装成宝箱的伏击型敌人）

- **定位**：伪装型伏击敌人（第 2~3 层）。随机以宝箱形态出现，完全静止、不攻击；玩家**靠近 1.2 格 / 按 E 尝试互动 / 攻击它** 任一触发解除伪装 → 张嘴扑击（接触 2 伤）→ 释放 5~7 枚短程扇形弹 → 转入正常追逐战斗。Counterplay 线索：宝箱轻微呼吸 + 极低频暗紫粒子。
- **改动**（enemies.js）：`defs.mimic`（hp24/spd2.5/r.4/cost2/floors[2,3]）；makeMesh case（伪装宝箱壳 box+lid+锁扣 + 隐藏拟态体 maw+jaw+teeth）；`E.revealMimic`（宝箱壳隐藏/拟态体显示/立即扑击）；AI `mimic`（disguise→lunge→fan→idle 状态机）；E.hurt 伪装受击即 reveal；接触伤害段 lunge 状态 2 点；animate case（伪装呼吸+粒子线索/reveal 后拟态体张嘴浮动）。
- **交互接入**（player.js `interactScan`）：伪装中的 mimic 以「打开宝箱」可互动，按 E 触发揭示——"卧槽这箱子是假的"体验。
- **生成池**（gen.js）：第 2、3 层敌人池加入 mimic（cost2）。
- **限制**：mimic 是普通敌人参与清剿（靠近即触发，不会卡关）；不伪装成商店/Boss 奖励/任务物品。
- **回归**：STEP 70「拟态怪 Mimic：伪装·揭示·扑击·扇形弹」（伪装静止/靠近揭示/外观切换/扇形弹/互动揭示/受击揭示/扑击持续 全链路）；boottest ×3 `BOOTTEST_PASS_P66_F0`。
- **实机验证**：browser-use 真实浏览器 spawn 验证 disguise 态（box 可见/maw 隐藏/interact 存在）→ 靠近后 state=idle（reveal→扑击→扇形弹→战斗走完）、外观切换正确。

## 2026-09-04（悖论骰子平衡调整：射速三倍 + 弹匣 10 + 射程 20，蓄力同步缩短）

- **改动**（weapons.js `dice` def）：`rate 1.2→3.6`（三倍）、`mag 8→10`、`range 9→20`；dice.js `K.CHARGE_T 0.35→0.25`。
- **原因**：悖论骰子实际射击节奏 = max(冷却 1/rate, 掷骰蓄力 CHARGE_T)。原蓄力 0.35s 会把射速硬卡在约 2.86 发/秒，不改蓄力则三倍射速无法体现；同步降至 0.25s 后冷却（0.278s）主导节奏，三倍射速真实生效，同时保留掷骰翻滚动画手感。
- **验证**：boottest ×3 `BOOTTEST_PASS_P65_F0`；index.html `weapons.js?v=29→30`、`dice.js?v=1→2`。

## 2026-09-04（基地点唱机 Script error 根治：训练靶命中计数 `_hitsTag.el` 为 undefined → TypeError）

- **现象**：用户在基地拿过载点唱机试射时，左下角循环出现 `ERROR: Script error. @ :?`（带 `[上下文]` 快照，jukeN/B 随网络变化、jukeN=0 也报），连续 5 轮修复未根治（disposeTitleScene 保护、_dropBeam GPU 泄漏、RENDER-FAIL 兜底均未命中根因）。
- **根因（决定性定位）**：用 browser-use 本地真实浏览器打开游戏，`bu.js` 同步驱动 2500 帧基地试射探针，捕获到真实 TypeError（同步 try-catch 保留真实 stack，绕开 file:// 下浏览器错误模糊化）：
  `TypeError: Cannot set properties of undefined (setting 'textContent') @ js/build.js:853`
  - `build.js` `damageProp` 训练靶分支更新命中计数标签：`G.base._hitsTag.el.textContent=...`
  - 而 `base.js` 的 `tag()` 返回 **DOM 元素本身**，`_hitsTag=this.tag(...)` 直接是元素 → `_hitsTag.el` 为 **undefined** → 每次黑胶/子弹命中基地训练靶即抛 TypeError。
  - **为何呈 Script error**：`file://` 协议下 Chrome 对页面脚本错误不报来源（无 filename/lineno），冒泡到 window.onerror 被模糊化为 `Script error. @ :?`——与用户截图完全一致。
  - **为何 headless 漏网**：boottest STEP 63 只断言 `_hitsTag` 存在，从不真实命中训练靶，未覆盖该路径。
- **修复**（js/build.js）：两处 `G.base._hitsTag.el.textContent` → `G.base._hitsTag.textContent`（853/859 行）；index.html `build.js?v=11`→`?v=12` 强制刷新（file:// 缓存不自动失效，这正是"改了还报"的原因）。
- **回归锁**（js/main.js STEP 69「训练靶命中计数标签回归」）：进基地 → 真实 `G.damageProp(dummy,3,0)` 命中训练靶 → 断言 hp-3、`_hitsTag.textContent` 含"命中"、errlog 无新增错误。
- **验证**：browser-use 真实浏览器 2500 帧试射探针：修复前 err=None/errlog 空/4 节点 3 光束正常构建；boottest ×3 `BOOTTEST_PASS_P65_F0`。
- **历史教训**：① file:// 下 Chrome 把页面脚本错误模糊为 `Script error. @ :?`，定位必须用**同域同步 try-catch** 拿真实 stack；② 每个 JS 改动必须 bump `index.html` 里对应 `?v=` 版本号，否则浏览器（含用户实机）加载缓存旧代码；③ 测试要覆盖真实命中链路，不能只断言对象存在。

## 2026-09-04（去除标题残留紫光：titleGlow 动画辉光金色化）

- **改动**（index.html）：`@keyframes titleGlow` 动画仍沿用赛博朋克品红/紫/电光蓝辉光（rgba(255,61,240)/rgba(180,77,255)/rgba(42,212,255)），且动画 filter 覆盖静态金色辉光，导致标题每秒脉动一次紫光。已将该动画两帧辉光全部改为金色（弱帧 rgba(255,230,0)/rgba(255,160,0)/rgba(255,90,0)，强帧 rgba(255,240,80)/rgba(255,180,40)/rgba(255,120,30)），并补齐 4 方向黑色描边。grep 确认 index.html 标题区已无任何紫色系残留。
- **验证**：boottest `BOOTTEST_PASS_P64_F0`；headless 截图确认标题纯金色无紫光。

## 2026-09-04（基地点唱机 Script error 仍循环出现：新增 RENDER-FAIL 兜底捕获真实错误）

- **现象**：用户回传第二张截图——`_dropBeam` 修复后错误**仍循环出现**：`ERROR: Script error. @::[上下文] state=play base=Y wep=jukebox jukeN=2 jukeB=1 → 0/0 → 3/2 → 4/4 audio=running/Y`。**注意 jukeN=0/jukeB=0 也反复报错**（网络为空时），说明错误不止在网络逻辑，黑胶发射/飞行/撞墙同样触发。
- **已排除再确认**：音频（sfx 全 try-catch，audio=running 正常）；beam GPU 泄漏（_dropBeam 已修且 monkey-patch 验证 12/12 全部 dispose，但错误依旧）→ **泄漏不是（唯一）根因**；fx.light 预分配池不新建；黑胶用共享资源无私有泄漏。
- **关键认知**：`Script error.` 是浏览器对**冒泡到 window.onerror 的跨域/内部错误**的模糊化上报（丢弃真实 message/来源）。而**同域 try-catch 捕获的异常对象保留真实 message**——这是拿到真实错误信息的唯一途径。
- **本轮改动**（js/game.js）：`frame()` 中 `renderer.render` 外包 try-catch——若错误来自 WebGL 渲染层，捕获真实 error 记入 errlog（`RENDER-FAIL: <真实message> | <stack>`，每会话只记首条防刷屏），并阻止冒泡成模糊 Script error 刷屏。
- **待办**：需用户实机复现一次，若错误来自渲染层，errlog 将显示 `RENDER-FAIL:` 真实 message，据此精准定位；若仍只显示 Script error（无 RENDER-FAIL），则错误在 update 逻辑层/浏览器扩展，需进一步区分。
- **验证**：boottest ×3 `BOOTTEST_PASS_P64_F0`。

## 2026-09-04（根治基地点唱机偶发 Script error：共振线 GPU buffer 泄漏）

- **现象**：用户回传截图——错误**循环出现**，上下文 `state=play base=Y wep=jukebox audio=running/Y`，jukeN/jukeB 随网络状态变化（2/1 → 4/4 → 6/8 → 0/0）。**这推翻了"偶发 GPU 内部错误"的判断**：错误与点唱机网络每一次状态变化（节点增长、FULL OVERLOAD 崩解、清空）同步触发，是确定性资源问题。
- **根因**：`_mkBeam` 每条共振线创建**私有** `BufferGeometry`×2 + `LineBasicMaterial`×2（每次 new、不共享）；而 `rebuildBeams`/`_bassDrop`/`clear` 删除旧光束时**只 `G.scene.remove` 不 dispose**。每次网络重建（共振/撞节点/节点到期）都泄漏 2×beam 数的 GPU buffer，连续试射几十次后 GPU 状态异常 → 真实浏览器 WebGL 层 draw call 偶发失败 → 浏览器以**无文件名的 Script error** 上报（headless 软渲染复现不了）。
- **修复**（js/jukebox.js）：新增 `_dropBeam(b)`（remove + dispose 私有 geometry/material），替换全部 4 处 beam 清理点（rebuildBeams 开头 / _bassDrop 崩解 / clear 的 _ol.beams 与 this.beams）。节点 mesh 用共享资源（G.boxGeo/G.bmat/G.pmat）**保持 remove-only 不 dispose**，避免重蹈 dispose 共享资源误伤。
- **验证**：探针 monkey-patch 确认 `rebuildBeams` 后旧 beam 的 12 个私有几何 + 12 个材质**全部被 dispose**（`dGeo=12 dMat=12`），网络重建正常（beams=6）；boottest ×3 `BOOTTEST_PASS_P64_F0`。⚠️ 仍需用户实机确认不再冒绿字。

## 2026-09-04（基地点唱机偶发 Script error 排查续：增加错误时游戏上下文快照）

- **现象**：用户连续反馈——基地点唱机试射仍偶发 `ERROR: Script error. @ :?`；headless 全路径（含 shot=base+点唱机试射探针）仍无法复现。
- **已排除**（本轮复核）：① JS 逻辑层（boottest 64 全绿、无 eval/Function/Promise）；② 音频层（audio.sfx 整体 try-catch，基地无 setTimeout/setInterval/音乐循环，全部音效走 sfx）；③ 共享资源 dispose 误伤（前两轮已修，PROBE7 断言共享几何/材质/纹理完好）。
- **结论**：该无文件名错误为**真实浏览器独有路径**（WebGL/GPU 内部或浏览器扩展注入），headless 软渲染无法复现，无法远程定位具体抛出点。
- **本轮改动**（js/main.js）：onerror 对"无来源 Script error"**附加游戏上下文快照**——出错瞬间记录 state / 是否基地 / 当前武器 / jukebox 节点与光束数 / AudioContext 状态与解锁状态。下次实机复现时，绿字会直接显示"出错时游戏在做什么"，据此可精准定位（例如 `jukeN=6 audio=running` 即 FULL OVERLOAD 路径；`audio=suspended` 即音频挂起路径；扩展注入则上下文正常但无 stack）。
- **验证**：boottest ×3 `BOOTTEST_PASS_P64_F0`。待用户实机复现并回传绿字完整内容（含 `[上下文]` 段）。

## 2026-09-04（深化修复基地点唱机偶发 Script error：disposeTitleScene 彻底不 dispose 共享资源）

- **现象**：用户实测上一轮修复后，基地点唱机试射仍偶发 `ERROR: Script error. @ :?`。
- **根因确认扩大**：`G.boxGeo`/`G.bmat`/`G.pmats` 全是**模块级缓存**（`_geos`/`_bmats` 闭包，同参数返回**同一实例**，被子弹/小怪/地板/黑胶全局共享）；`disposeTitleScene` 的 `g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); ... o.material.map.dispose() ... })` 会把场景内所有 mesh 的几何/材质/贴图全部 dispose → 误伤共享实例。上一轮只保护了 `G.pmats`（纹理），漏了 `_geos`/`_bmats` 缓存 → 进基地后点唱机黑胶（`G.boxGeo(.3)+G.bmat` 渲染）复用被 dispose 的资源，偶发触发 GPU 重传竞态，被浏览器以 Script error 上报。
- **修复**（js/game.js）：`disposeTitleScene` **完全移除场景内共享资源的 dispose**——仅保留 `g.parent.remove(g)`（防穿模）与标题私有资源清理（`_tPhotoMat`/`_tBullets`）；共享缓存（几何/材质/纹理）由 Three.js 自动管理，不再主动释放。
- **验证**：探针 PROBE7 直接断言 dispose 后 `G.boxGeo(.3)/G.bmat(0xffffff)/G.pmats['a16777215'].map` 实例完好未 disposed（`geoOk=true matOk=true texOk=true`）；boottest ×3 `BOOTTEST_PASS_P64_F0`。⚠️ 仍需用户实机确认；若仍冒绿字，增强后的 errlog 会给出真实 stack / PROMISE 明细，发我即可定位。

## 2026-09-04（修复基地试射点唱机偶发 Script error：disposeTitleScene 误伤共享纹理）

- **现象**：用户报告——在基地拿着过载点唱机试射时，左下角偶发出现 `ERROR: Script error. @ :?`。
- **定位**：
  1. `#errlog` 是内置运行时错误日志（左下角黑底绿字），`Script error.` + 无文件名 = 浏览器对跨域/内部错误（WebGL/音频/纹理等）的统一模糊上报。
  2. 全路径 headless 复现（标题/地牢/基地/完整游玩）均无 JS 错误，boottest 64 步全绿——排除逻辑层。
  3. 排除 eval/Function（全项目无）、Promise（仅 boottest 用）、音频（audio.sfx 已整体 try-catch）。
  4. **根因**：`disposeTitleScene` 的 `g.traverse(o=>{...o.material.map.dispose()...})` 会遍历 dispose 标题场景所有材质及其贴图；而菜单弹幕 glow 用的是 `G.pmats['a16777215'].clone()`，其 `.map` 与全局共享的 `G.tex('soft'/'hard'/'smoke')` 缓存纹理是**同一对象**——dispose 后，进基地/地牢时点唱机黑胶、粒子、金币等再次渲染该共享纹理，偶发触发 GPU 重传竞态，被浏览器以 Script error 上报。
- **修复**（js/game.js + js/main.js）：
  1. `disposeTitleScene` 遍历时**跳过全局共享材质/纹理**（枚举 G.pmats 收集共享集，仅 dispose 标题场景独有资源），杜绝误伤共享纹理。
  2. 增强错误诊断（js/main.js）：onerror 从 error 对象提取完整 stack；新增 `unhandledrejection` 监听，偶发错误下次出现时日志可定位到真实来源。
- **验证**：探针模拟标题弹幕 150 帧 → dispose → 切换，errlog 全程为空；boottest ×3 `BOOTTEST_PASS_P64_F0`。⚠️ 该错误为偶发且 headless 无法复现真实 GPU 路径，需用户实机确认不再出现；若仍有，errlog 现在会给出真实 stack。

## 2026-09-04（菜单标题恢复最早字体与金色）

- **改动**（index.html，#gtitle/#gsub）：
  1. 标题字体恢复最早的 Impact/Arial Black/Microsoft YaHei 系（移除上一轮加入的黑体 SimHei）。
  2. 标题颜色从赛博朋克品红/电光蓝霓虹恢复为**最早的金色渐变**（#fff8a0→#ffe600→#ff9d00→#ff5e00）+ 金色辉光；副标辉光恢复早期米白+金微光。
  3. 保留上一轮用户要求的**黑色描边**（标题 4 方向 drop-shadow、副标 8 方向 text-shadow）。
- **验证**：boottest `BOOTTEST_PASS_P64_F0`；headless 截图 OCR 确认「醒目的黄色标题」；tagline/按钮/操作说明可读性不受影响。

## 2026-09-04（菜单弹幕真实化 + 玩家游斗走位 + 菜单字体重设）

- **改动**：
  1. **菜单弹幕真实化**（js/game.js）：弹丸造型从抽象光球改为**复刻局内 `G.weapons` 真实弹丸**——方块核心（BoxGeometry .3 染色）+ 光晕 Sprite（克隆共享光晕材质染子弹色）；弹速对齐局内 `eshoot`=5；命中玩家改用局内 impactFx 同款 `G.fx.sparks` 火花。dispose 同步清理核心几何/材质与光晕子材质。
  2. **玩家游斗走位**（js/game.js）：活动区从「右侧固定小矩形」扩大为**左右两侧全场景**（x ±1.6~±9.6，z -5~4，避开中央标题投影带）；转向平滑（`G.angLerp` 渐进转向不硬停）；**瞄准方向与移动方向分离**——玩家面朝最近射击型小怪模拟局内「瞄准开火」，边游走边转火。实测 150 帧覆盖 x∈[-7.4,8.6]。
  3. **菜单字体重设**（index.html）：全部菜单文字明确指定**黑体系**（'SimHei','STHeiti','Microsoft YaHei'，中文不再回退楷体/宋体）；标题（#gtitle 渐变霓虹）用 filter 多方向 drop-shadow 强化**黑色描边**，副标/按钮/tagline/操作说明加 8 方向 text-shadow 黑描边；tagline 改金色、操作说明提亮。中英文黑体粗黑 + 斜切 + 强描边 = 街机游戏字体感。
- **验证**：临时探针推进 150 帧：玩家走位 x∈[-7.4,8.6]、弹幕 max 9 发、真实 BoxGeometry 弹丸、命中 20 帧，无报错；探针已移除（git diff main.js 为空）；boottest ×3 全部 `BOOTTEST_PASS_P64_F0`；headless 截图 OCR 全部菜单文字清晰可读。

## 2026-09-04（菜单小怪弹幕效果：射击型小怪周期朝玩家发射发光弹·命中爆粒子）

- **改动**（js/game.js）：
  1. 射击型小怪（枪手/图腾/幽魂/孢子菇/环绕者/引力眼球/镜面/相位潜行者，8 只）周期性朝玩家发射**发光弹**：每发独立 MeshBasicMaterial 彩色光球（颜色贴合局内子弹色：枪手红/图腾紫/幽魂黄/孢子紫/环绕橙/引力紫/镜面青/相位红），速度 4.2，发射口带火花；近战型（冲锋兽/盾卫）保持不发射。照片状态期间暂停射击（呼应局内"拍照冻结弹幕"）。
  2. 弹幕在菜单自建轻量系统（`G._tBullets` + 共享小球几何 `_tBgeo`；G.weapons 仅在 play 分支更新故不复用）：飞行更新、命中玩家爆彩色粒子 + 玩家体型轻弹（纯演出无真实伤害）、出界/超时回收并 dispose；disposeTitleScene 统一清理。
  3. 弹幕节奏 1.4~3.2s/发错峰，配合玩家游走形成真实战斗追逐感。
- **验证**：临时探针推进 120 帧：弹幕最多同时 9 发、12s 命中玩家 30 帧（发射/命中/回收链路完整无报错），探针已移除（git diff main.js 为空）；boottest ×3 全部 `BOOTTEST_PASS_P64_F0`。

## 2026-09-04（菜单走位/攻击对齐局内：真实速度游走 + 拍立得拍照→照片冲洗演出）

- **改动**（js/game.js）：
  1. **走位对齐局内**：小怪移动速度改为直接沿用游戏内 `E.defs[type].spd`（幽魂4.6/冲锋兽2.6/枪手2.1/镜面1.6/引力1.2/盾卫1.25/环绕0.9；孢子菇与图腾 spd=0 保持原地施法），并改为连续移动（到达目标仅短停顿 0.2~0.7s 即换目标）；玩家改以局内移动速度 **4.3** 连续移动。探针实测 10s 累计路径：玩家36.1、幽魂37.3、盾卫8.4——速度层级与局内一致。
  2. **拍立得攻击对齐局内**（读 photo.js 还原真实语言）：开火改为「拍照」演出——快门后坐 + 玩家脚下**地面扇形曝光**（CircleGeometry 扇形铺地，扩散淡出，替代原竖直扇形光）；被拍小怪进入照片状态 **0.55s**：全身换装**旧相纸灰调材质**（与局内 P.mat 同色 0xbdb4a0）+ 脚下白边**圆形相框**；photoT 结束触发**照片冲洗**：恢复材质、移除相框、白色曝光闪 + 相纸碎片粒子 + 爆伤害数字（对应局内 DamageBuffer×2 结算）。
  3. 新增 `_tPhotoShoot/_tPhotoResolve` 标题拍照方法；dispose 时回收灰调材质。
- **验证**：临时探针推进 100 帧：拍照4次/冲洗4次（链路完整无报错）、速度层级正确；探针已移除（注意：曾误删 isTest 声明已恢复，git diff main.js 为空）；boottest ×3 全部 `BOOTTEST_PASS_P64_F0`。

## 2026-09-04（菜单小怪/玩家随机游走：去原地自转·像真实战斗场景一样踱步）

- **改动**（js/game.js buildTitleScene + updateTitleScene）：
  1. 小怪去掉原地自转（spin），改为在**初始位置附近随机游走**：每只小怪记录原地(hx,hz)，随机选点(半径 1.8~3.3)后缓慢踱步(速度 1.0~1.5)，抵达后停顿 0.6~2.0s 再换目标；面朝移动方向；保留上下浮动与受击抖动。
  2. 玩家不再站桩，改为在**右侧活动区(x 6.0~9.8, z -1.9~2.3)随机游走**：抵达目标停顿后再换点，面朝移动方向（模型 forward=+X，rotation.y=-atan2(dz,dx)）；保留周期性开火（快门后坐/扇形闪光/目标受击爆伤害数字）与脚下光圈。
- **验证**：临时探针推进 80 帧 ×0.1s：小怪位移 2.45、玩家位移 2.00（游走确实发生、无报错），探针已移除；boottest ×3 全部 `BOOTTEST_PASS_P64_F0`；截图确认场景正常渲染。

## 2026-09-04（标题霓虹化：去黄线取景框·金色改赛博朋克品红/电光蓝双色霓虹）

- **改动**（仅 index.html CSS）：
  1. 删除 `#screenTitle::after` 上下两道斜切黄线取景框（user 觉得多余）。
  2. `#gtitle` 从金色渐变改为**赛博朋克霓虹渐变**（白粉→品红 #ff3df0→紫 #b44dff→电光蓝 #2ad4ff 流动），`drop-shadow` 改为品红主光 + 电光蓝副光双色霓虹（chromatic 感），`titleGlow` 脉动同步改为品红/青双色呼吸。
  3. `#gsub`（THE NINTH FLOOR）去掉黄色辉光，改为青色霓虹 + 品红微光，与 glitch 故障层（红/青）统一赛博调性。
- **验证**：boottest ×3 全部 `BOOTTEST_PASS_P64_F0`；截图确认黄线消失、标题呈紫色调霓虹渐变。

## 2026-09-04（菜单 5 项精修：去小怪光圈·真实拍立得建模·射击爆数演出·小怪再缩小·字体艺术化）

- **改动**：
  1. 小怪脚下蓝紫「识别光圈」全部删除（user 认为白圈干扰），小怪体型整体再缩小（gunner 2.3→1.8、charger 2.1→1.65、shield 2.5→1.95、totem 2.1→1.65、wisp 1.8→1.4、shroom 2.0→1.55、orbiter 1.7→1.3、gravitator 1.8→1.4、phaseprowler 1.8→1.4、mirror 1.9→1.5）。
  2. 玩家改持**游戏内真实拍立得建模**：删除临时 BoxGeometry 拼的相机，复用 `G.PlayerMesh()` 返回的 `refs.cam`（双反相机），并遵循局内切武器逻辑 `refs.gunMesh.visible=false; refs.cam.visible=true;`；玩家 scale 1.85→1.7。
  3. 新增「射击演出」：`updateTitleScene` 中玩家约每 1.8~2.5s 周期开火——相机后坐（scale 弹 1.28→1.18）、扇形摄影闪光（additive CircleGeometry 扇形 0.16s 亮起淡出）、轮流命中一只小怪（`G._tEnemies` 轮换）触发受击体型抖动（sin 弹跳）+ 白色粒子喷溅 + `G.fx.dmgNum` 爆伤害数值（偶发暴击）。辅助机制仅用于标题演出，不影响局内战斗。
  4. 标题字体进一步艺术化：`#gtitle` 从纯色+text-shadow 改为**金色渐变文字（background-clip:text）+ 渐变流动动画（titleFlow）+ filter:drop-shadow 霓虹脉动**（透明文字兼容 drop-shadow），保留 skewX(-8deg) 斜切与 glitch 故障层；`#screenTitle::after` 新增**赛博斜切取景框线**（上下两道半透明黄线夹住标题区，inset 33%/71%，不遮挡按钮与操作说明）。
- **验证**：boottest ×3 全部 `BOOTTEST_PASS_P64_F0`（90000 虚拟时间）；截图确认小怪缩小无光圈、黄线取景框渲染、玩家真实模型；开火逻辑用临时探针推进 50 帧验证（dmgNum 被调用 2 次、无报错），探针已完全移除。
- **回归**：标题菜单正常，游戏名「第九层事故」/THE NINTH FLOOR 双语、BULLET DEPTHS V2.0 角标保留；进基地/地牢 dispose 流程不受影响。

## 2026-09-04（菜单 2077 风格重做：小怪分散·玩家对峙·拍立得·双语）

- **小怪分散**：10 只环列四周两侧（gunner/charger/shield 盾卫/totem 图腾/wisp/shroom/orbiter/
  gravitator/phaseprowler/mirror），每只脚下加蓝紫发光识别光圈（暗角下可见站位）。
- **暗角减轻**：#screenTitle 暗角强度下调（radial 边缘 .78→.52，linear 顶 .72→.42/底 .80→.50），
  边缘小怪不再被压暗（此前"冲锋兽没渲染"实为暗角遮挡，已确认渲染正常）。
- **玩家登场**：导出 `G.PlayerMesh`（player.js 复用真实主角造型），菜单里置于右侧、面朝左侧小怪群
  持机对峙；手持**薛定谔的拍立得**相机造型（机身+镜头+闪光灯+出片口，独立材质），脚下蓝紫光圈，
  闪光灯周期性呼吸（updateTitleScene）；disposeTitleScene 同步清空 `_tEnemies/_tPlayer`。
- **2077 赛博朋克标题**：#gtitle 改霓虹黄 + 多层黑描边 + 斜切 skewX(-8deg) + 红/青故障分层 + 辉光脉动；
  英文副标改为 **THE NINTH FLOOR**（中英双语，36px 大号 + 斜切 + 故障），BULLET DEPTHS 保留于版本角标。
- 验证：自测 64 PASS ×2；截图确认玩家/拍立得/光圈/盾卫/冲锋兽均可见，标题双语 2077 风生效。

## 2026-09-04（改名「第九层事故」· 菜单小怪调整）

- **游戏改名**：「弹幕深渊」→「第九层事故」（BULLET DEPTHS 英文副标题保留；Boss「铁颚·弹膛之王」保留；
  snapshots 历史快照不动；25 文件头注释/文档同步）。
- **菜单小怪调整**：wisp/shroom 两只最大的缩小 30%（3.0/3.4 → 2.1/2.4）；新增 4 只巡场怪
  （orbiter 环形放射者 / gravitator 引力眼球 / phaseprowler 相位潜行者 / mirror 镜面反射者），
  环绕深渊核心成 8 只环形列队，scale 1.7~2.6。
- 验证：自测 64 PASS ×3；探针确认 foes=8、4 种新怪 makeMesh 全部成功（meshfail=0）；菜单截图新标题清晰。

## 2026-09-04（基地战利品墙删除 · 菜单重做：删枪加怪·改名·字体）

### 基地战利品墙删除（base.js）

- 用户反馈：战利品墙没什么用，删掉。
- 删除 `_trophies` 方法（战利品墙标签 + 铁颚王/无面者奖杯壁龛）及 buildBase 调用，清理过时注释。
- Boss 首杀记录仍写入 `G.meta.data.stats.boss`（数据源不删，仅不再展示墙）。

### 标题菜单重做（game.js / index.html）

- **删四把枪**：移除 buildTitleScene 的枪械剪影陈列（gunMat/makeGun/`_tGuns`），及 updateTitleScene 枪摆动动画。
- **加巡场小怪**：复用游戏内真实敌人造型 `G.enemies.makeMesh`，4 只（gunner/charger/wisp/shroom）
  围绕中央深渊核心浮动自转（`G._tEnemies`），体型放大 2.4~3.4 更显眼。
- **游戏改名**：「弹膛深渊」→「第九层事故」（BULLET DEPTHS 保留；boss 名「铁颚·弹膛之王」保留；
  snapshots 历史快照不改；22 文件头注释/文档同步）。
- **标题字体游戏风格化**：86px Impact 粗体金属雕刻（多层 drop-shadow）+ 金色渐变 +
  `data-text` 伪元素 RGB 故障错位（红/蓝 glitch 分层）+ 入场弹跳动画（titleBoot）+ 辉光呼吸。

### 验证
- 自测 **64 PASS ×3**（boottest 90000 虚拟时间）。
- 菜单截图：新标题清晰、四角小怪可见（红/绿低模）、无枪；基地截图：战利品墙消失其余正常。

## 2026-09-04（基地世界标签防重叠）

### 基地世界标签防重叠（base.js tag 投影）

- 用户反馈：基地里一些字会叠在一起。
- 根因：基地世界标签是单点屏幕投影（CSS `translate(-50%,-135%)`），无宽度碰撞处理；
  相机俯视角度下训练场（命中 0 次/训练场/教官）、战利品墙（战利品墙/铁颚王/无面者奖杯）、
  右上区（工程师/弹药台/档案员/测绘桌）等相邻标签会互相压叠。
- 修复（base.js）：
  1. `tag()` 创建时 `visibility:hidden` 强制 reflow 测量真实宽高，存入 `_tags`（供精确碰撞）。
  2. update 投影循环改为「防重叠放置」：按创建顺序逐个投影，与已放置标签的屏幕矩形
     （含 transform 视觉范围 + 2px 余量）碰撞时垂直上移一个标签高度+间距错开。
- 验证：自测 64 PASS（5 连跑全绿；期间 1 次偶发 FAIL 为 BUG-028 家族 STEP11 既有 flake）；
  `?shot=base` 截图 + `data-pos` dump 检测 15 个标签仅剩 1px 边界接触 → 加余量后全部分离。
- 说明：防重叠对任意相机视角均生效（每帧重算，同一视角下偏移量确定不跳变）。

## 2026-09-04（标题菜单穿模修复 FIX-027）

### 标题屏 3D 场景残留穿模（game.js）

- 用户反馈：最新做好的开始菜单有严重穿模，进入基地和地牢后依旧不消失并叠加。
- 定位：`disposeTitleScene()` 只 dispose 材质/几何并置空 `G.titleScene`，未把 group 从
  `G.scene` 移除；`cleanupDynamic()`（基地/地牢/新局/返回标题统一清场）调用后标题场景
  mesh 仍挂在场景树上持续渲染。
- 修复：`disposeTitleScene()` 首行加 `if(g.parent) g.parent.remove(g)`。
- 验证：自测 **64 PASS ×3**；`?shot=base` / `?shot=1` 无头截图确认基地与地牢画面干净。
- 记录：`BUG_HISTORY.md` FIX-027。

## 2026-09-04（新敌人批次：6 种机制型敌人 / 图鉴与生成池扩充）

### 新敌人（enemies.js / gen.js / base.js / main.js STEP 68）

新增 6 种机制型敌人（延续用户已批准的第一批方案，第二批待后续按需实施）：

| 类型 | 层 | 机制 |
| --- | --- | --- |
| orbiter 环形放射者 | 1/2 | 悬浮核心，蓄力 1.15s 连续 8 波 360° 环形弹；奇偶环相位错位留可穿缝隙 |
| minelayer 地雷工兵 | 1/2 | 巡逻布设「滚动地雷」（慢速 bomb + 红圈预警，碰触爆炸伤玩家） |
| gravitator 引力眼球 | 2 | 周期性 1.6s 引力波持续把玩家吸向自己（玩家可对抗） |
| commander 战场指挥官 | 2/3 | 光环加速 6 格内同袍攻速（通用段 `_hasteT` 额外推进 atkCd .5×）+ 自身 5 发扇形齐射 ×3 |
| mirror 镜面反射者 | 2 | 持镜盾正面格挡 + 折射高速反击弹；5 次命中破防踉跄 2.5s |
| phaseprowler 相位潜行者 | 3 | 隐形蛇形逼近 → 显形三连斩（每刀 1 伤）→ 隐身撤退 |

- 四挂点齐全：defs（hp/spd/r/cost/floors/money）×6、makeMesh case ×6（低模造型 + 独立颜色语言）、
  AI 表函数 ×6（插在 voidacolyte 后）、animate case ×6（悬浮/摆动/透明度驱动）。
- `E.hurt` 新增 mirror 格挡分支（复用 shield 的格挡角度判定模式，格挡同时折射反击弹，5 次破防）。
- `E.update` 通用段新增指挥官攻速光环（`_hasteT` 处理，被覆盖敌人 atkCd 额外推进）。
- `gen.js` 三层敌人池按层插入：1 层加 orbiter/minelayer；2 层加 orbiter/minelayer/gravitator/commander/mirror；3 层加 commander/phaseprowler。
- `base.js` ENEMY_NAMES 增加 6 个中文名，并暴露 `B.ENEMY_NAMES`（图鉴/测试统一入口）。
- `main.js` 新增 STEP 68 回归：defs/造型/AI 跑帧/环形弹/地雷/光环/格挡（真实伤害入口+反击弹）/斩击/图鉴。

**测试防 flake 修复**（STEP 06 / 68，BUG-028 家族）：
- STEP 06 全敌人 AI：21 种敌人累积在场，环形弹/地雷/斩击会把 6 血玩家打死 → 加玩家保护（maxHp 60 + invulnT 999）。
- STEP 68 ⑥：起始房间 rx 随机导致「玩家坐标 + 固定偏移」放敌可能出房间墙；改用房间中心 room.cx/cz 为基准 + 清弹幕池 520 上限。
- STEP 68 ⑦：相位潜行者位置改为房间中心附近（room.cz+1.5），确保斩击触发距离。
- 自测 **64 PASS / 0 FAIL × 14 连跑**（含 STEP 68 相关 flake 修复后 6+8 轮全绿）。

## 2026-09-04（被动道具池扩充：9 新被动 / 品质图鉴 / 战斗掉落）

### 被动道具池（items.js / player.js / weapons.js / photo.js / meta.js / game.js / base.js / main.js STEP 67）

- 新增 9 个被动，分品质池 C/B/A：C 池蛮牛弹壳（伤害+20% 移速-10%）/ 稳定器（装填+20% 射速-5%）/
  拾荒者（磁力+100% 幸运+1）；B 池碎甲晶石（暴击 2.5→4 倍）/ 弹链马甲（弹匣+50%）/ 过热弹夹（射速+35% 伤害-15%）/
  壁垒核心（护甲+1 无敌时间+20%）；A 池先声夺人（满血伤害+40%）/ 背水一战（≤2 血伤害+60%）。
- 机制挂点：暴击倍率 `weapons.js`/`photo.js` 改 `crit?(2.5*p.st.critMul):1`；`player.js curDmgMul` 新增满血/低血
  条件乘区（互斥不叠加）；`st` 加 `critMul/fullHpMul/lowHpMul` 默认 1。
- 获取途径：`game.js clearRoom` 战斗房清剿后 12% 掉落被动（2 层起 45% 概率 B 池）；`giveTo` 写
  `stats.passives` 遭遇记录（meta freshData/load 兜底）。
- 图鉴：`base.js` 档案员新增「被动道具档案」段（品质色 C 灰/B 蓝/A 金 + 名称描述 + 持有次数/未收录）。
- 自测：新增 STEP 67（定义/入池/机制应用/遭遇记录/图鉴），**63 PASS / 0 FAIL ×3** 稳定。

---

## 2026-09-04（局外成长树·轨道C：深渊准备桌 BOONS/PACT）

### 准备桌三页签（meta.js BOONS/PACT / game.js startRun / player.js / base.js 核心面板 / main.js STEP 66）

- 祝福池 BOONS 6 种：钢骨/狂热/疾风/贪婪/好运/再生（12~16 ◆）；血契 PACT 3 种：
  血之契约/玻璃大炮/赌命狂奔（16~20 ◆）。每局限带 2 个（祝福+血契合计），
  startRun 应用即消费、结算清空（G.runShardMul 清贪婪乘区）。
- 事务：`runBoonCount/buyRunBoon`（扣款、重复拒绝、限 2、碎片不足）；`freshData/load` 加 `runBoons` 兜底。
- 核心改「准备桌」三页签：基础献祭（8◆→+15%×N，原逻辑搬入面板）/ 祝福池（每局随机 3 个）/
  血契；世界标签改「深渊核心 · 准备桌」；index.html 加 .btabs/.btab CSS。
- startRun 应用：boon_steel→护甲、rage→rateMul、wind→speedMul、greed→G.runShardMul(碎片+30%)、
  luck→st.luck、regen→st.regenBoon(每层回1)；pact_blood→dmgMul×1.4+maxHp-2、glass→dmgMul×1.7+dmgTakenMul×1.5、
  fast→rate/speed/rollCd。
- player.js st 加 dmgTakenMul（玻璃大炮受伤+50% 在 hurt 内乘）；game.js startFloor 再生祝福层间回血+1。
- STEP 66 新增（准备桌事务/三页签UI/startRun应用/结算消费）；STEP 63 献祭测试适配面板按钮。

**回归**：`BOOTTEST_PASS_P62_F0` ×3 稳定（61→62 步）。

**文档同步**：AGENTS（§0 基线）、GAME_SYSTEMS（准备桌）、PROJECT_STATUS。

---
## 2026-09-04（局外成长树·轨道B：深渊共鸣 RESONANCE）

### 共鸣等级（meta.js RESONANCE 表 + buyResonance / game.js startRun / player.js / weapons.js / gen.js / main.js STEP 65）

- RESONANCE 新增 4 项×5 级（价格递增）：`affinity_ammo` 弹药亲和（弹匣 +8%/级且装填 -4%/级，
  15/25/40/60/85）、`affinity_loot` 寻宝本能（特殊房 +4%/级，15/25/40/60/85）、
  `affinity_vet` 老兵直觉（翻滚 CD -5%、受击无敌 +5%/级，12/20/32/50/70）、
  `affinity_shard` 深渊亲和（碎片拾取 +10%/级，18/30/48/72/100）。
- 事务：`resonanceLv/resonancePrice/buyResonance`（与 buyUpgrade 同构，满级拒绝）；
  `freshData/load` 加 `resonance` 字段兜底。
- 应用点：
  - 弹药亲和：startRun 设 `st.magMul/reloadMul`；weapons.js mktWeapon 弹匣 ×magMul（def 浅拷贝，不污染全局定义）。
  - 老兵直觉：startRun 设 `st.rollCdMul/invulnMul`；player.js 翻滚 `rollCd=.42*rollCdMul`、受击 `invulnT=.9*invulnMul`。
  - 深渊亲和：meta.addShards 内部 ×(1+0.10×lv)。
  - 寻宝本能：gen.js 生成器与 archive 并列追加特殊房。
- STEP 65 新增：共鸣事务扣款/满级封顶/碎片乘区/开局乘区/弹匣乘区断言；
  工程师面板追加「深渊共鸣」购买区（遍历 RESONANCE 卡片，buyResonance 事务）——轨道 B 购买 UI 补全。

**回归**：`BOOTTEST_PASS_P61_F0` ×3 稳定（60→61 步）。

**文档同步**：AGENTS（§0 基线）、GAME_SYSTEMS（共鸣等级）、PROJECT_STATUS。

---
## 2026-09-04（局外成长树·轨道A：装甲舱 / 重力靴）

### 基建升级扩展（meta.js UPGRADES / game.js startRun / main.js STEP 64）

- UPGRADES 新增 2 项：`armor` 装甲舱（1 级 45 ◆，开局护甲 +1）、
  `magnet` 重力靴（2 级 35/60 ◆，每级拾取磁力半径 +30%）。
- startRun 应用：`armor` → `p.maxArmor/p.armor` +lv；`magnet` → `p.st.magnetMul *=
  1.3^lv`（复用既有磁力乘区，拾取逻辑零改动）。
- 基地「工程改装铺」面板自动渲染新升级（buyUpgrade 通用事务，无新 UI）。
- STEP 64 新增：装甲舱/重力靴购买扣款、满级拒绝、startRun 开局应用断言。

**回归**：`BOOTTEST_PASS_P60_F0` ×3 稳定（59→60 步）。

**文档同步**：AGENTS（§0 基线）、GAME_SYSTEMS（基地升级表）、PROJECT_STATUS。

---
## 2026-09-04（基地核心护栏拆除 + 外墙恢复 + 标题菜单重做）

### 一、深渊核心左右护栏拆除 / 边界墙恢复（base.js `makeFloor` / main.js STEP 63）

- 用户澄清：要拆的是**深渊核心左右两侧的护栏**（x=11 / x=21 两列短墙，z=8..11），
  而非基地南北外墙。已拆除护栏，核心四周完全开放。
- **南北外墙（z=0 / z=19）恢复为墙**（上批次误拆，本次补回）。
- STEP 63 断言更新：①d 南北外墙为墙 + 东西墙保留；①e 核心左右护栏为地板；
  ①f 玩家向北推到底被外墙挡住不越界。

### 二、标题菜单页面重做（index.html）

- **根因修复**：`#screenTitle` 背景此前一直被 `#fade`（全屏黑场，z-index:40）压暗成
  纯黑——`.screen` 默认 z-index:30 低于 #fade。给 `#screenTitle` 单独提升 z-index:41。
- **像素风深渊地牢背景**（与局内 NDS 像素风一致，零外部依赖）：
  - 背景多层渐变：中央紫红深渊核心光晕 + 底部暖光 + 像素砖纹理（repeating-conic）+ 深色底
  - `::before` 深渊光晕呼吸动画（真机增强）+ `::after` 底部暖光
  - `.tlogo` 旋转深渊符文 logo（紫光水晶 + 虚线符文环）
  - `.tdust` 金色/蓝色浮尘粒子上升动画（5 粒，模拟局内 fx）
  - `#gtitle` 渐变金色艺术字 + 呼吸光晕；`#btnStart` 金色描边 + 辉光；`#ctrl` 半透明面板化

**回归**：`BOOTTEST_PASS_P59_F0` ×3 连跑稳定；`?screenshot` 截图 + 像素采样验证
（中央紫光 R106/B97、标题金色 R255、底部暖光、四角砖纹），标题文字/按钮/操作说明全部可读。

**文档同步**：AGENTS（§0 基线）、GAME_SYSTEMS（14.2）、ARCHITECTURE（base.js）、
PROJECT_STATUS（本批次）。

---
## 2026-09-04（基地南北外墙拆除）

### 南北外墙拆除（base.js `makeFloor` / main.js STEP 63）

- `makeFloor` tile 生成中 `border` 从「四边全墙」改为「仅东西墙」：**北墙 z=0 与南墙
  z=19 两行外墙拆除**，基地南北通透；四角切角（非矩形轮廓）保留。
- 越界安全：`G.solidForMove` 对「无 tile」返回固体，玩家向北/南推到底会被边界兜住，
  不会走出地图（STEP 63 新增 ①d 南北墙已拆断言 + ①e 玩家向北推 60 帧不越界断言）。
- 东西外墙（x=0 / x=31）保留。

**回归**：`BOOTTEST_PASS_P59_F0` ×3 连跑稳定；`?shot=base` 截图确认南北墙拆除后基地
更开阔、功能标签（战利品墙/核心献祭/武器架/档案员/教官/命中计数）全部正常。

**文档同步**：AGENTS（§0 基线）、GAME_SYSTEMS（14.2）、ARCHITECTURE（base.js）、
PROJECT_STATUS（本批次）。

---

## 2026-09-04（基地微调批次：拆隔断墙 / 删展示亭 / HUD 武器显示 / 训练靶分散）

### 四项基地体验微调（base.js / index.html / main.js）

**① 拆除南北隔断墙**（base.js `makeFloor`）：
- 去掉 z=6 / z=13 两行多区域分隔墙（原门洞过道设计），基地南北彻底打通不再挡道；
  分区改由中央核心、家具、灯光与地面材质区分；中央核心两侧低护栏保留。

**② 删除武器展示亭**（base.js `_armory`）：
- 移除南墙一排独立展示亭（基座+立柱+顶灯+浮空旋转）及其 update 旋转段；武器架
  「挑选试用」面板保留（那是真正的功能入口）。

**③ 基地 HUD 显示当前持有武器**（index.html baseHud + base.js hudRefresh）：
- `#baseHud` 新增武器显示块：品阶色武器名 + 弹药（如「生锈左轮 6/6」），与局内 HUD
  观感一致；`hudRefresh()` 更新，`update()` 每 0.2s 定时刷新弹药数（射击/换枪实时）。

**④ 训练靶分散**（base.js 训练场 `targets`）：
- 靶位由挤在一起的 3×3 小区域改为**分散大三角**：lv0 两座 [4.5,13.5]/[10.5,16.5]，
  lv1 加第三座 [7.5,17.5]，三座间距 4~7 单位，打靶更有层次。

**回归**：STEP 63 更新——新增隔断墙 z=6/z=13 为地板断言、HUD 武器显示断言、展示亭
移除断言；`BOOTTEST_PASS_P59_F0` ×3 连跑稳定；`?shot=base` 截图确认 HUD「生锈左轮
6/6」、全开放空间、无展示亭、命中计数正常。

**文档同步**：AGENTS（§0 基线）、GAME_SYSTEMS（14.2/14.6）、ARCHITECTURE（base.js）、
PROJECT_STATUS（本批次）。

---

## 2026-09-04（基地反馈 8 连修批次：武器架任选 / 深渊祝福 / 弹药补给 / 训练靶反馈 / 标签遮挡 / 展示亭 / 战利品墙 / 非矩形外框）

### 基地八项反馈一次性整改（base.js / build.js / game.js / index.html / main.js）

**① NPC 对话/看板打开时世界标签不再透出**（base.js `openPanel`/`closePanel`）：
- `openPanel()` 打开任何数据面板时隐藏 `#tagLayer`，`closePanel()` 恢复，外部标签不再叠在数据板上。

**② 武器架改为商店式"全武器任选"面板**（base.js renderPanel `weapons` 分支）：
- 原 `cycleWeapon()` 循环切枪体验差，现武器架按 E 打开 `weapons` 面板，列出**所有已解锁武器**
  （品阶排序），每张卡片显示名字/品阶/简介/伤害·射速·弹匣，点「试用」直接装备到手
  （`p.weapons[p.curW]=W.mktWeapon(id)`，不生成掉落、不收费、任意换），当前武器金色高亮 `.wcard.cur`。

**③ 训练靶加大 + 命中反馈**（base.js `dummy` 模型 / build.js `damageProp`）：
- 靶盘直径 0.6→**1.1**、立柱加粗加高、碰撞半径 0.3→0.6；命中产生金属火花+靶盘微颤+`clank`
  音效+伤害数字上移；训练场新增 HTML「命中 N 次 · 打碎自动重置」实时计数标签。

**④ 深渊核心「破晓引擎」从摆件升级为可交互装置**（base.js core + game.js startRun）：
- 视觉：半透明紫色**能量柱**（向上喷涌）+ 双地面符文圈脉动 + 能量柱呼吸 + 顶喷粒子 + 更大辉光。
- 玩法：按 E「深渊祝福」消耗 8 碎片 → 演出爆炸 + `G.meta.data.bless` 累计；
  `startRun()` 进本时每层祝福伤害 +15%（`p.st.dmgMul*=1.15^b`）并清空，base HUD 可看。

**⑤ 武器展示亭重做**（base.js `_armory`）：
- 从"墙上一排支架"升级为**独立展示亭**：基座圆台+立柱+顶灯座+品阶顶灯，武器浮空旋转
  （update 驱动 `wrackGroups`），顶部品阶辉光，最多 6 座。

**⑥ 战利品墙重做**（base.js `_trophies`）：
- 从"墙上小背板"升级为**壁龛陈列柜**：大背板带框+展台柱+展台盘+铭牌台，战利品放大
  （铁颚牙 6 颗/无面尖角+紫眼），首杀后点亮背光，未首杀显示「？？？」。

**⑦ 弹药工作台可交互**（base.js ammoBench）：
- 由纯装饰改为 `interact` 道具：按 E「弹药补给」免费补满当前武器弹匣（`w.ammo=w.def.mag`）
  + 音效 + 绿色粒子 + toast。

**⑧ 基地外框非规则化**（base.js `makeFloor`）：
- 四角切角（西北/东北/西南/东南 3×3）+ 南北墙两端内收 + 东西墙中段齿状凹凸，摆脱正矩形，
  接近地牢房间的不规则轮廓；32×20 内功能坐标全部不动。

**新增回归步骤**：`main.js` STEP 63（基地反馈批次）——非矩形四角/武器架列出并试用/面板
开关隐藏恢复标签/核心献祭扣 8 碎片→祝福累加→进本伤害+15%→弹药台补满/靶加大+命中标签/
展示亭生成。

**验证**：`BOOTTEST_PASS_P59_F0` ×3 连跑稳定；`?shot=base` 截图确认核心能量柱发光、
标签清晰、[E] 献祭/挑选/补给提示全部可读，无 console 错误。

**文档同步**：AGENTS（§0 基线 59 步）、GAME_SYSTEMS（基地交互）、ARCHITECTURE（base.js
行数）、PROJECT_STATUS（反馈批次完成）、WEAPON_BATCH_HANDOFF（计数不变）。

---

## 2026-09-04（基地扩展批次：基地变大 / 过道加宽 / 世界标签清晰化 / 对话不挡看板）

### 基地四连修（用户反馈：基地太小、过道太窄、字看不清、NPC 对话挡住数据看板）

**① 基地扩大 + 过道加宽**（base.js `makeFloor`）：
- 地图 22×15 → **32×20**（可探索面积近翻倍）。
- 南北隔断门洞统一改 **2 tile 宽**：北区 z=6 门洞 x=6,7(工坊)/14,15(核心大厅)/22,23(工程)；
  南区 z=13 门洞 x=6,7(训练场)/16,17(休息区)/25,26(仓库展厅)。
- 中区走廊从 4 行加宽至 **6 行**（z=7..12），过道不再局促。
- 全部功能区坐标按新布局重排（核心 16,9.5 / 升降梯 4.5,9.5 / 玩家出生 18,11.5 /
  枪械师 6,3 / 工程师 23,3 / 档案员 24.5,10.5 / 教官 8,14.8 / 训练靶/火炉/书架/展示墙等
  均迁移），彩灯与受控点光源同步重排。
- 相机 camH 21→24、camB 9.6→10.2（拉远俯瞰大基地）。

**② 世界标签清晰化**（base.js `tag()` 重构为 HTML 高分辨率悬浮层）：
- 基地 `tag()` 不再用世界 textSprite（320p 下缩糊），改为在 `#tagLayer` 上创建 CSS px
  字号 div，`update()` 每帧用 `Vector3.project(G.camera)` 投影到屏幕坐标。
- 字号：核心 24px、入口 22px、NPC 名字 20px、区域名牌 18px、展示武器 16px，全部
  描边清晰。截图 OCR 可完整读出所有标签（枪械师·老铆/医疗站/工程师/工作台/地牢入口/
  破晓引擎/武器架/档案员/测绘桌/训练场/教官/武器展示等）。
- `build()`/`teardownWorld()` 调 `_clearTags()` 清理；`rebuildScene` 自动重建。
- 地牢/商店的世界 textSprite 不受影响（仅基地改 HTML 层）。

**③ 对话不再遮挡看板**：
- 门店 NPC（枪械师/工程师/档案员）按 E 直接开面板，不再先弹对话框——NPC 引言
  改为内嵌在面板顶部（`.bintro` 引言行，轮换 normal 台词）；仅无门店的教官使用
  `#npcDialog` 对话框。
- `openPanel()` 开头 `closeDialog()`（双保险）；`#npcDialog` bottom 118→150 避开 toast。
- 顺带修复教官 hand2 挥动动画 key 笔误（`pr.key==='trainer'` → `'instructor'`，此前
  该动画从未触发）。

**验证**：`BOOTTEST_PASS_P58_F0` ×3 连跑稳定；`?shot=base` 截图确认大基地布局 +
HTML 标签清晰可读（OCR 全读出）、无 console 错误。

**文档同步**：AGENTS（§0 行数 11630→11674 + 回归注记）、ARCHITECTURE（base.js 891→935
行描述）、PROJECT_STATUS（基地扩展条目 + 顶部批次记录）、DEVELOPMENT_LOG（本条目）。

---

## 2026-09-04（基地视觉重制 2.0：多区域 Hub + 中央核心 + NPC 造型/动画 + UI 可读性分层）

### 基地 Visual Rework 2.0（用户 30 条需求，直接实施不预审）

**目标**：把基地从「矩形大厅 + NPC 站桩」升级为「有空间层次、角色辨识度、UI 清晰、
独立美术气质的正式 Hub 区域」。

**① 地图结构重做**（base.js `makeFloor` stubs 重写）：
- 南北两排隔断墙——z=5 行北区隔断（门洞 x=4 工坊/8,9 大厅/15 工程），z=10 行南区隔断
  （门洞 x=3 训练场/10,11 休息区/17 仓库）；中央核心两侧低护栏 x=6/16 z=7~8（不封路）。
- 形成：北区三室（武器工坊/核心大厅/工程区）+ 南区三区（训练场/休息区/仓库展厅）+
  中区走廊（连接档案角与地牢入口）的空间层次，不再是单一矩形。

**② 中央视觉焦点「破晓引擎 · 深渊核心」**（(11,0,7.5)）：三层圆台 + 操作台横梁 + 吊杆 +
顶横梁 + 中央符文水晶 + 两道旋转符文环（RingGeometry）+ 双 Sprite 辉光 + 四角守卫符文柱；
update 中环反向旋转 + 水晶呼吸缩放；tag「深渊核心 · 破晓引擎」。

**③ 地牢入口第二焦点**：(2.5,7.5) 深渊升降梯——加大平台 + 四立柱 + 顶部机械门楣 + 门侧
符文灯 + 深红紫辉光 Sprite + 地面符文环；tag「地牢入口 · 深渊升降梯」。

**④ 环境叙事道具**（_props 整段重写）：工坊工作台+弹壳/未完成枪托/螺丝刀、工具箱；
工程区弹药工作台/工程机械/排气管；档案区书架×2/测绘桌/卷轴架/文件堆；休息区火炉/木箱×3/
餐桌+杯子碗/椅子；训练场靶位×3（lv 成长加靶）/弹孔木板；训练靶逻辑保留。

**⑤ NPC 四名独立造型**（_npcMesh 重写，弃用默认几何体站桩）：
- 枪械师：暖棕工作服+皮围裙+工具腰带+肩挂弹匣×2+额前护目镜；
- 工程师：深绿工装+工具背箱+背包螺丝刀/电线+安全帽+肩部电路盒+机械手套+扳手；
- 档案员：深绿长外套+前襟+眼镜+侧挎地图包+大书+文件夹；
- 教官：军绿护甲+胸甲板+护腕+军靴×2+军帽+哨子+训练短棍（新增 refs.hand2 第二手臂）。
- Idle 动画：枪械师俯身敲台、教官挥动 hand2；update 统一推进 `refs.t`；靠近看向玩家
  （face lerp 至玩家角差，保留 workFace 回位）。

**⑥ UI 可读性分层**（世界低分辨率渲染 + UI 独立高分辨率层）：
- index.html：`#prompt` 22px 高对比面板、`#toast` 23px/`#itemToast` 20px 加粗、`#baseHud`
  22px、`#basePanel` 宽 min(860px,94vw) 标题 30px、卡片/按钮/价格/描述全部 15~20px，
  卡片加背景+边框；**新增 `#npcDialog`** 大对话框（名字 22px + 对白 20px + `[E] 继续`
  16px，底部居中，z-index 23）。
- base.js：`showDialog(name,line)`/`closeDialog()`/`isDialogOpen()`；player.js `interactScan`
  E 键先关对话框再交互、离开范围自动关；game.js ESC/E 关对话框。
- build.js `textSprite`：画布 128x32→256x64、字号 20→34px、描边 4→6、背景半透明 0.62、
  NearestFilter（提升世界内 tag/商店牌可读性，保留像素风）。

**⑦ 光照/氛围**：_lamps 重写为 14 盏分区彩灯（工坊暖橙/核心紫/工程青绿/档案冷蓝/训练亮白/
休息暖红/仓库金黄/入口红紫），火焰 Sprite 独立材质；6 个受控 PointLight（distance 7）；
环境事件——核心符文环旋转、蒸汽粒子（工程区）、灯具低频闪烁（随机一盏 flame 缩小后
恢复）、炉火余烬。

**⑧ 音频**：audio.js 基地 ambient 增强——机械运转 bandpass + 随机火炉噼啪 highpass
（低音量，远低于战斗）；基地 BGM（track `base`）不变。

**⑨ Meta 成长可视化**：武器架随解锁武器数增展示位、训练场升级加靶、档案室升级后书架
增多（真实接入 meta 升级状态）。

**⑩ 出生点**：玩家出生从 (11,9.5) 移到 (12.8,9.6)——避免压在中央核心底座上。

**踩坑**：整段替换 `_npcMesh` 时 end 锚点定位过宽，把 `_npcs` 方法一并覆盖丢失 → 恢复
`_npcs`（四 NPC 配置/交互/名牌），`node --check` + 自测暴露后修复。

**验证**：`BOOTTEST_PASS_P58_F0` ×3 连跑稳定；`?shot=base` 截图确认中央核心/分区/装饰/
HUD 清晰可见；无 console 错误。

**文档同步**：AGENTS（§0 行数 11355→11630 + 回归注记）、ARCHITECTURE（base.js 688→891
行描述）、PROJECT_STATUS（基地条目 + 顶部批次记录）、DEVELOPMENT_LOG（本条目）。

---

## 2026-09-04（删除敌人批次：Wallmaker 掩体制造者 + Hound 猎犬整体下架）

### 删除敌人 Wallmaker 与 Hound（用户判定「设计的太差，先删掉」）

**删除范围（全链）**：
- `enemies.js`：defs 表 `wallmaker`/`hound` 两行；makeMesh 造型两 case；animate 两 case；
  AI 表 `wallmaker()`/`hound()` 两函数；**整套魔法墙系统**——WALL\_\* 常量、`E.walls` 字段、
  `E.clear` 墙清理、`E.update` 的 `updateWalls` 调用、`wallLegal`/`_reachOK`/`spawnWall`/
  `removeWall`/`updateWalls`/`pickWallSpot`/`rollPredict` 全部函数；通用更新残留的
  `_wallCd` 衰减行。
- `gen.js`：三层敌人池删 `['hound',...]`（第 1 层）与 `['wallmaker',...]`/`['hound',...]`
  （第 2/3 层）条目。
- `build.js`：`damageProp` 的 `case 'wall'`（魔法墙破坏特效）删除。
- `weapons.js`：子弹碰撞中 `pr.type==='wall' && b.team==='p'` 穿透特判删除。
- `audio.js`：`houndGrowl` 音效 case 删除。
- `main.js`：STEP 60（掩体制造者墙体系统回归）与 STEP 61（猎犬翻滚预测扑击回归）整块
  删除。

**影响与计数**：敌人 17 → 15；自测步骤 60 → 58（编号空洞变为 49/52/53/55-57/58/60/61）。

**验证**：`BOOTTEST_PASS_P58_F0` ×3 连跑稳定（删除后 syntax-check 全绿）。

**文档同步**：GAME\_SYSTEMS（§4.1 计数 15 + 删表两行 + 删 §4.9/§4.10）、HIGH\_RISK\_AREAS
（删 H26/H27 章节与总表条目）、PROCEDURES（58 步分组与编号清单）、PROJECT\_STATUS
（敌人 15 + 删除批次记录 + 历史条目下架注记）、ARCHITECTURE（enemies.js 1045 行 15 种 /
main.js 2224 行 58 步 / 总行数 11355）、AGENTS（§0 基线）、WEAPON\_BATCH\_HANDOFF（步骤
58 与空洞说明）。

**下架记录**：Wallmaker 与 Hound 的完整历史实现仍保留在 git 历史（commit `d7dde14`/
`65e9d14`）与本文档下方「Wallmaker 批次」/「Hound 批次」条目；如需恢复以 git 为准。

---

## 2026-09-04（三合一改动批次：吹风机增强 + 删除切割刀/太阳左轮 + 过载点唱机网络重构）

### ① 重型吹风机增强 + ② 删除切割刀/太阳左轮 + ③ 过载点唱机核心机制级重构

**① 吹风机增强**（weapons.js v29）：锥形推力系数 `f=6.5→12`（吹飞距离 +~85%，注释注明）、
WIND BURST 风压爆发 `11→18`。STEP 51 旧断言（推力>0.5 / maxVx>8 / 撞墙掉血）仍兼容。

**② 删除两武器**（全链）：
- `weapons.js`：删 def 表 scalpel/sunrevolver 行、tiers.A 两 id、spawn 中 sun 相关全部分支
  （弹体几何/glow 材质/尺寸、b.sunP 字段）、spawnPlayer 的 def.melee 近战分支、子弹生命
  周期/撞墙/道具碰撞/命中敌人/命中 Boss 五处 sun 分支、update 中 sun 视觉分支；文件尾部
  黑胶互撞段整体替换为一行 `if(G.jukebox) G.jukebox.stepVinyl();`（互撞/吸附/近共振委托
  新 jukebox）。
- `player.js`（v21）：resetPmats 删 sun 材质复位；mkPlayerMesh 删 sun 枪模挂载与 refs.sun；
  翻滚段删 `G.scalpel.tryRollEnter`；update 删 Heat 两行；扳机条件删 `def.sun&&ventT>0`；
  chargeT 释放删 sun 分支；R 键删 sun 接管注释块；emitShot 删太阳锁膛条件；fire 删 sun
  整链接管分支 + 黑胶上限 12→16 + 新增 `aimAng = G.jukebox.aimAssist(p, aimAng)`；
  updateGunVisual 删 sun 全部；死亡演出删 sun 材质淡出；animate 删 applyHeat 动画块。
- `game.js`（v21）：cleanupDynamic/onRoomEnter 删 scalpel/sunrevolver clear，**新增
  `if(G.jukebox) G.jukebox.clear()`**（换房/跨局即清网）；update 删两模块 update。
- `audio.js`（v26）：删 sunCool/sunWarm/sunHot/sunCrit/sunHeartbeat/sunCharge/sunshot/
  sunEvaporate/sunImpact/sunVent/overheatHiss 11 个 case + riftSlash/riftOpen/riftTravel/
  riftCollapse 4 个 case；**新增 vinylNear（近共振嗡鸣）与 vinylAttract（共振吸附 VRRMMM）**。
- `shop.js`（v16）：删 scalpel/sunrevolver 两图标 case；`ui.js`（v16）：删 HEAT HUD 段。
- `index.html`（v 同步）：删两个 script 标签；bump：audio 26 / weapons 29 / jukebox 2 /
  shop 16 / player 21 / game 21 / main 68。
- `git rm js/scalpel.js js/sunrevolver.js`（164+400 行移除）。
- `main.js`（v68）：精确删除 STEP 52（切割刀裂隙坍缩）与 STEP 58（太阳左轮过热管理）整块，
  2441→2301 行；编号空洞新增 52/58。

**③ 过载点唱机网络重构**（jukebox.js 187→436 行，BLACK VINYL NETWORK SYSTEM）：
- 数值：dmg 3→4 / rate 1.1→1.8 / mag 6→8 / reload 2.0→1.6 / 黑胶上限 12→16 / Club ×0.78→0.82。
- 五层共振辅助（stepVinyl 每帧调）：RESONANCE ASSIST（<1.3 靠近时双向 angLerp 弱修正 +
  vinylAttract）、NEAR RESONANCE（<1.6 RGB 电弧粒子 + vinylNear）、精确碰撞（<0.45）、
  aimAssist（≤10° 轻修正 60%，绝不代瞄）、_settle 弱排斥防扎堆。
- resonance()：节点与碰撞点解耦，`sep=clamp(3+(relS-6)*.22,3,6)` 速度越高分离越大；
  同向碰撞法线推开 + 外扩兜底（修复"同向碰撞节点重合"边界 bug）。
- 网络：rebuildBeams LONG EDGE PRIORITY（距离降序长边优先 + 并查集保连通 + 度数≤3 +
  MIN_BEAM_LEN 2.5）；Edge Quality 三档 q1.0/1.15/1.3；节点成长 Lv1~5（_applyNodeLevel）；
  NETWORK CORE（≥3 节点几何中心脉冲伤害）。
- 伤害：tick 2.5×q；≥2 条 Beam 命中 ×1.15 CROSS、≥3 条 ×1.3 PERFECT；Boss 单次硬上限 24。
- FULL OVERLOAD 三阶段：CHARGE 0.38s → LOCK 0.3s（_xrayAll RGB X-Ray）→ BASS DROP
  （dmg=12×(1+min(.6,beams×.1))，线上 12×mult，Boss 封顶 24，清空网络 + 灯光还原）。

**验证**：初测 STEP 59 因三阶段时序与旧断言不兼容 FAIL（满网+1 后立即断言 nodes/beams===0），
修正为分两段等待（46 帧断言结算、再 22 帧断言状态机结束）后 PASS；随后 8 轮中出现 3 轮
flake——STEP 59「SONIC BURST 未对线上敌人造成伤害」根因是测试用 gunner 布点（AI 用
moveEntity 无视 spd，68 帧内移出 beam 判定宽度），改用静止 slime（baseSpd=0/spd=0，
chaseSpd=e.spd 归零）后 **8/8 全绿**。最终 `BOOTTEST_PASS_P60_F0 ×8`；编号空洞
49/52/53/55-57/58；STEP 04 动态断言自动变「19 种武器全部发射成功」；STEP 59 覆盖
碰撞单测/aimAssist/节点分离/共振线tick/成长扩张/核心脉冲/三阶段BURST/灯光还原。
另用临时脚本复核：全局 grep 无 sun/scalpel/sunP/solar 残留（含 ui.js HEAT HUD 清理）。

**文档同步**：AGENTS（§0 21 文件 11614 行 / 60 步 / 加载序去两模块）、ARCHITECTURE
（目录+加载序+行数）、GAME_SYSTEMS（§2.1 19 种 + §2.10 点唱机重构 + §2.11 下架记录）、
PROCEDURES（60 步清单）、PROJECT_STATUS（§一/§四）、WEAPON_BATCH_HANDOFF（§④⑤ 下架、
§⑦ 重构、收尾清单）、HIGH_RISK（无 sun 直接引用，不改）、本日志。

---

## 2026-09-04（悖论骰子重做批次）

### 重做武器⑤【悖论骰子】：真 3D 机械骰体 + 六面独立视觉语言 + PARADOX 四阶段崩坏演出

- **实现**（新模块 js/dice.js v1 446 行 / weapons.js v28 / enemies.js v16 / player.js v20 /
  game.js v20 / audio.js v25 / ui.js v15 / shop.js v15 / main.js v67）：武器 **20→21 种**，
  A 阶 11 把；def `{name:'悖论骰子', tier:'A', dmg:6, rate:1.2, mag:8, reload:1.5, spread:0,
  price:55, color:0xd8cfe0, dice:true, sfx:'diceStop'}`；tiers.A 加 `'dice'`；
  W.spawn 对象池加 `b.pin` 字段；命中 kind 链加 `dice4` 冻结块（`e.pinT` 钉住 + 冰晶 mesh +
  diceFreeze 音效 + sparks+ring + 子弹销毁）。
- **真 3D 骰体**（旧版无骰子模型，只有数字环）：0.38 立方体 + 12 条黄铜棱边 + 8 角紫色
  发光符文角珠（待机能量脉动），六面 = 面版（面组局部 +Z 朝外）+ 暗色凸点数点（真骰面，
  对和 7）；**材质全部专用**（`_m` 单例，emissive 随面光逐帧改写，绝不共享，符合 H7）；
  结果面翻顶目标四元数 `FACE_UP[6]` 预计算；悬浮于武器上方，玩家死亡随 `fade()` 同步淡出。
- **掷骰结算 release()**：蓄力 .35s 骰体高速翻滚 → 随机 1~6（测试 `_force` 强制）→
  落定 .16s 弹性归位 + 结果面点亮（emissive 2.2）+ diceStop/diceN 音效 + §N 大号 dmgNum
  + 结果环。1~6 各自真实攻击：1 厄运弱弹+instab+6（最差也推进异常）/ 2 双重 / 3 三重散射 /
  4 冻结（kind:'dice4' → 命中 `e.pinT` 停止行动，enemies 主循环三处接入）/ 5 追踪红弹
  （kind:'homing'）/ 6 毁灭（瞄准点 4.5 格外 explode，R2.6/DMG26）。
- **现实不稳定度**：`instab=cons×25` 封顶 100，每秒衰减 8；≥50/75 两级世界异常
  （节流闪烁/震屏/HUD 抖动/裂缝粒子）。
- **PARADOX**（连续同数 4 次）：四阶段演出——静止 hitstop .12+duck → 空间裂隙 .15
  （黑紫柱+紫色闪电枝）→ 现实错误 .50（过曝+故障闪光+环境光闪烁+数字跳变）→ BOOM .80
  （全房 G.hurtEnemy 34 / 精英×1.3 / ignoreBlock=true 破格挡；Boss `G.hurtBoss(26)` 单次
  封顶——与切割刀/点唱机/太阳左轮同一纪律）+ explode(4.5,0) 纯视觉爆炸 → 1.15 清理。
  演出后 cons/instab 清零 + **PARADOX CHARGE**（设计稿九：接下来 5 次掷骰 +25% 伤害/
  爆炸半径/冻结时长，禁止永久叠加）。
- **HUD**：ui.weapon 对 def.dice 追加 `[§N ×连续 · 不稳X%]`，连续 3 次提示「下次崩坏」、
  充能中显示「崩坏充能」；名称颜色随不稳定度分级（≥50 橙 / ≥75 红）。
- **踩坑/纪律**：pinT 冻结沿用泡面叉旧机制，但当前代码库该机制已随泡面叉下架删除
  （enemies.js 无 pinT 残留），全部重写；Boss 伤害走 `G.boss.active` 实例（BUG-001 教训）；
  骰体材质绝不复用共享材质（H7）。
- **验证**：BOOTTEST_PASS_P62_F0 ×3（61→62 步三连全绿；空洞 49/53，55-57 未使用；
  STEP 62 覆盖：3D 骰体挂载/自旋组/六面材、`_force` 逐点验证掷 1~6、连续累加/异数重置、
  掷 4 冻结 pinT+落定 4 面+面材点亮、掷 6 爆炸击杀、PARADOX 四连后计数清零+演出推进后
  全房击杀/充能/裂隙清理、充能随掷骰递减；STEP 04 断言改「21 种武器全部发射」）。
  另用临时探针（PROCEDURES §5，跑完已删）实测骰体渲染：27 子网格（6 面+12 棱+8 角+核）、
  面光点亮、黄铜棱边与紫色角珠可见。
  文档同步：GAME_SYSTEMS（§2.1 21 种 + §2.13 新增 + §4.1 敌人 17 种修正——Hound 批次
  遗留漂移）/HIGH_RISK（H28 + 速查表）/PROCEDURES（62 步清单）/PROJECT_STATUS/AGENTS
  （62 步、23 文件 12147 行）/ARCHITECTURE（加 dice.js、23 文件 22 模块）/
  WEAPON_BATCH_HANDOFF（§⑥ 改为已交付，收尾清单仅剩泡面叉①）/本日志。

---

## 2026-09-04（Hound 批次）

### 新增敌人【Hound 猎犬】：翻滚落点有限预测 + 预警扑击

- **实现**（enemies.js v15 / gen.js v10 / audio.js v24 / main.js v66）：
  - def `{hp:19, spd:3.2, r:.3, cost:1, floors:[1,2,3], money:[1-3]}`；敌人 16→17 种；
    第 1/2/3 层敌人池各接入 `['hound',1,1.8/1.8/2.0]`。
  - **AI 状态机**：`chase`（1.5~2.5 扑击窗口，>2.5 逼近/<1.5 稍退，不贴脸）→
    `windup`（0.45s 预警：停步低伏 + 地面红色方向线（临扑转亮）+ `houndGrowl` 吼叫，
    玩家可反应）→ `leap`（6.5 u/s 定向前扑 0.45s≈2.9 格，扑中不转向、moveEntity 不穿墙，
    命中走通用接触伤害且翻滚中免疫）→ `recover`（扑空/撞墙后摇 0.5~0.7s=输出窗口，
    结束回 chase + 冷却 0.8~1.6s，杜绝连续扑）。
  - **翻滚落点有限预测 `E.rollPredict(h,p)`**（红线级）：只用玩家当前运动状态推算终点
    `剩余距离 = p.rollT×14`（翻滚固定 14 u/s 匀速）、方向 rollAng 恒定——**绝不读未来
    坐标**。反翻滚博弈：连续同向翻滚（|ΔrollAng|<0.35）→ streak 递增（封顶 3）→
    streak≥2 用精确落点；方向骤变 → streak 归 1 + 侧向随机偏移 ±0.8~1.7（扑空率高）。
  - 造型：棕毛四足猎犬（尖吻立耳长尾，forward=+X）+ 四腿跑动动画/预警低伏/扑击前倾/
    后摇喘息/眼红预警。
- **踩坑记录**：`G.wrap` 在本项目不存在（盾卫用的是
  `Math.atan2(Math.sin,Math.cos)` 角差），初稿引用了不存在的 wrap，已改用 atan2 模式。
- **验证**：BOOTTEST_PASS_P61_F0 ×3（60→61 步三连全绿；空洞 49/53 延续）。
  文档同步：GAME_SYSTEMS（§4.1 17 种 + §4.10 新增）/HIGH_RISK（H27 + 速查表）/
  PROCEDURES（61 步清单）/PROJECT_STATUS/AGENTS（61 步）/ARCHITECTURE（enemies
  1368 行 17 种、main 2292 行 61 步）/本日志。

---

## 2026-09-04（Wallmaker 批次）

### 新增敌人【Wallmaker 掩体制造者】+ 临时魔法墙系统

- **实现**（enemies.js v14 1230 行 / gen.js v9 / weapons.js v27 / build.js v11 / main.js v65）：
  - def `{hp:26, spd:1.5, r:.36, cost:2, floors:[2,3], money:[2-4]}`；敌人 15→16 种；
    第 2/3 层敌人池各接入 `['wallmaker',2,1.6/1.8]`。
  - **AI 状态机**：`idle`（保持 4~7 距巡逻 + 横向游走，技能 CD 5~8s）→ `position`（找墙位：
    优先玩家↔最近 2 敌连线中点偏玩家侧，兜底玩家四周环形采样；无合法位回巡逻短重试）
    → `cast`（0.9s 蓄力：停止移动 + 每帧地面蓝环预警 + 举锤发粒子，可被击杀打断）→
    落地前**再跑 wallLegal 兜底** → 回 idle。
  - **魔法墙**（运行时 prop）：type 'wall'，r .55 / hp 80 / life 6s / 上限 **3**（拆最老）；
    挡**敌方**子弹（blocksBullets）+ 挡移动（blocksMove）；**玩家子弹穿透**（weapons.js
    特判，同翻桌精神——不卡自己输出）；可被爆炸/范围伤破坏（damageProp case 'wall'）；
    `updateWalls` 每帧自愈清理被破坏引用、寿命衰减、**换房即拆**；`E.clear` 摘 mesh。
  - **五道软锁防线**（`E.wallLegal`）：① 地板 tile ② 不与实体掩体/已有墙重叠 ③ 离玩家
    ≥1.05 ④ 距门 tile ≤1 cell ⑤ **BFS 可达性**（玩家 cell 到至少一个 open 门）。
- **踩坑记录（必读）**：BFS 首版把遍历范围限在房间 bbox 内，但 **door.tiles 位于两房
  交界、bbox 之外一格** → 门永远不可达 → 所有合法点全被拒（STEP 60"找不到合法墙点"
  双 FAIL）；修复=遍历范围扩出 bbox ±1。已写入 HIGH_RISK H26。
- **验证**：BOOTTEST_PASS_P60_F0 ×3（59→60 步三连全绿；空洞 49/53，55-57 未使用）。
  文档同步：GAME_SYSTEMS（§4.1 16 种 + §4.9 新增）/HIGH_RISK（H26 + 速查表）/
  PROCEDURES（60 步清单）/PROJECT_STATUS/AGENTS（60 步、22 文件 11600 行）/
  ARCHITECTURE（enemies 1230 行 16 种、main 2258 行 60 步）/本日志。
- ⚠️ 协作注记：本批次工作区基于外部会话已提交的太阳左轮重做（24d64be）叠加；未触碰
  sunrevolver 相关代码/文档，文档计数以实测 60 步统一（外部文档写 59 步已修正）。

---

## 2026-09-03（太阳左轮重做批次）

### 重做交付【献给太阳的左轮】Revolver of the Sun（沸腾/SUNSHOT/温度变色枪模，交付在架）

- **背景**：首版（git `c7e054b`）交付当日被判定「设计太拉跨」下架，三点疑点：+14 阶梯
  临界区间不可触、OVERHEAT 正常对局不可达、枪体未随温度发光变色。本次重做逐一解决，
  并按点唱机/切割刀同款纪律把全部逻辑收进独立模块。
- **实现**（新模块 `js/sunrevolver.js` 443 行 G.sunrevolver + weapons v27 / player v19 /
  audio v23 / ui v14 / shop v14 / game v19 / main v65 / index 挂载 sunrevolver v1，
  加载序插在 scalpel 后、须先于 player.js 供枪模挂载）：
  - def `{tier:'A', dmg:13, rate:1.1, mag:6, reload:1.5, sun:true}`；A 阶 A10、
    武器总数 19→20。
  - **Heat 沸腾模型**（取代旧 +14 阶梯）：开火 +16 固定步进；停火散热延迟 0.95s
    （略长于射速间隔 → 连射零散热、落点完全可预测）；92 起 **SOLAR LIMIT**：核心失控
    +6/s 持续升温、不再自然衰减、射速 ×2、**弹匣锁膛不自动装填**（emitShot 守卫）——
    必须打出 SUNSHOT / 长按 R 紧急散热（34/s）/ 炸膛，三选一；≥97 开火 = **PERFECT**。
  - **SUNSHOT**：沸腾开火 → 蓄能 0.18s（复用 chargeT 队列）→ `kind:'sun'` 微型太阳
    （pierce 99 / dmg 38，PERFECT 57 / 弹体 .22/.30 / 不耗弹药）；命中敌人 = 蒸发演出
    （sunHit：白光→轮廓燃烧→光粒子→灰烬，非传统爆炸）；撞墙/到期 = 太阳爆发
    （sunBurst：复用 W.explode + 双色冲击环 + 极短暖色 screenFlash）；Boss 封顶 26；
    飞行期三层视觉（白热核心 + 金黄中层 + 橙红日冕，fx 池 ≤3）+ 等离子触须 +
    灼热轨迹 + holdLight 环境照明 + **接触 1.2 内敌方子弹直接蒸发**。
  - **OVERHEAT 双真实路径**（旧版不可达根因已除）：贪射（CRITICAL +16 越过 100）/
    沸腾放置（约 1.3s）→ 炸膛：自伤 1（1 血不掉血）+ cool 1.5s + heat 归零 +
    红白爆鸣/烟雾/震屏。
  - **温度变色枪模**（旧版完全缺失）：独立 3D 黄金左轮（暗金机匣/黄铜护板/黑金属配重/
    深棕握把 + 转轮弹巢（六巢孔自转）/ 枪管 / 鳍片×3 / 导热管×2 / 太阳核心八面体 /
    符文环）挂 `refs.sun`；六组专用材质 emissive 沿暗金→暗红→橙红→橙黄→白热色标插值，
    核心呼吸脉动（沸腾期高频闪烁）、沸腾抖动、转轮转速随热量上升；热浪/烟雾/白热火花
    按 48/72/92 三档加密；死亡淡出与 resetMats 已接入玩家材质复位链路。
  - **主动散热 COOL DOWN**（设计稿九，旧版缺失）：R 键双模 keyR——长按(>0.10s)散热
    34/s + 蒸汽 + 转轮快转 + 扳机不响应；短按(≤0.22s)装填。
  - 音效 sunCool/Warm/Hot/Crit 分档机械音 + sunHeartbeat/sunCharge/sunshot/sunImpact/
    sunEvaporate/sunVent/overheatHiss 共 11 条；HUD `[HEAT nn% · 档位]`
    （CRITICAL 橙色 / SOLAR LIMIT 红色 + 沸腾期 0.1s 高频刷新）。
  - weapons 接线：def/tiers/mktWeapon（heat 字段组）/spawn（`b.sunP` PERFECT 标记 +
    sun 球体与光晕）/spawnPlayer 第 5 参 mul（Heat 伤害倍率）/update 六处 sun 弹分支。
- **回归锁 STEP58**（编号复用）：连射积热锁膛（96 落点可预测）/ 沸腾持续升温 /
  SUNSHOT 蓄能出膛 heat 归零 / PERFECT 判定与满额伤害 / 真实弹道对图腾巨额伤害 /
  敌方子弹被太阳蒸发 / 贪射与沸腾放置双路径炸膛自伤（血债式 uf 绕过测试保护）/
  长按 R 主动散热（rHold 松键前采样）/ 枪管自发光随温度单调上升 / 清场无残留。
- **验证**：BOOTTEST_PASS_P59_F0 ×3 + 加跑 5 轮 4 绿（步骤 58→59，编号 49/53 空洞
  保留；武器 19→20 种）。8 轮中出现 1 次 **BUG-028**（STEP43 血债断言 6/6）——已按
  规矩保存 dump 至 `snapshots/flake_bug028_20260903.html` 并补记 KNOWN_ISSUES；
  已排除本次重做引入（太阳左轮全部钩子由 `def.sun` 门控，STEP43 内不执行任何 sun
  代码，且该 flake 早于重做存在，签名一致）。
- **文档同步**：HANDOFF（头部 6/7 + §⑤ 重写为重做版）/GAME_SYSTEMS（§2.1 计数 20、
  §2.3 实例字段、§2.11 重写）/PROCEDURES（59 步清单 + STEP58 说明）/PROJECT_STATUS
  （快照、武器 20、§四 当前工作）/AGENTS（22 文件/59 步/加载序）/ARCHITECTURE
  （sunrevolver 行 + 加载序 + player/game/main 行）/KNOWN_ISSUES（BUG-028）/本日志。

---

## 2026-09-03（下架批次②）

### 下架【献给太阳的左轮】（用户实测判定「设计太拉跨」，待重做）

- **移除范围**：weapons.js（def/tiers/heat 字段/sun 弹种 7 分支/灼热拖尾/sunMul 参数）、
  player.js（update Heat 系统/emitShot sun 逻辑与签名/useDef 引用/fire SUNSHOT 分支）、
  ui.js（[HEAT] HUD）、audio.js（sunshot/overheatHiss 两音效）、shop.js（图标 case）、
  main.js（STEP58 整段 44 行）；index.html 六个文件版本 +1（22/13/26/13/18/64）。
- **保留**：完整实现存 git 历史 `c7e054b`；`WEAPON_BATCH_HANDOFF.md` §⑤ 已标注下架
  状态、疑点分析（+14 阶梯临界区间仅 98/104 两节点、OVERHEAT 正常对局不可达、枪体
  未随温度发光变色——只有 HUD 数字）与重做门槛。
- **验证**：BOOTTEST_PASS_P58_F0 ×3（步骤 59→58，编号 58 留空洞，与 49/53 并列）；
  武器 20→19 种回归。文档同步：HANDOFF/GAME_SYSTEMS（§2.1 计数与品阶、§2.11 改下架
  记录）/PROCEDURES（58 步清单）/PROJECT_STATUS/AGENTS（58 步）/ARCHITECTURE/本日志。
- 踩坑记录（连犯第三次）：**同文件并行编辑互相覆盖**——本轮 index.html 两个版本号
  Edit 并行导致 weapons/audio/ui 版本号互相覆盖丢失，改为逐条串行后才稳定；
  另两次误把下架说明写成裸文本夹进代码（语法错误）已即时修正。已在日志与交接文档
  反复强调：同文件编辑必须串行、改完 grep 验证。

---

## 2026-09-03（点唱机批次）

### 新增武器 ⑦【过载点唱机】Overload Jukebox（黑胶弹射/音波网络，交付在架）

- **实现**（新模块 `js/jukebox.js` 210 行 + weapons v25 / player v17 / audio v21 /
  shop v12 / game v18 / main v63 / index 挂载）：
  - def `{tier:'A', dmg:3, rate:1.1, mag:6, reload:2.0, kind:'vinyl', jukebox:true}`；
    A 阶 A10、武器总数 20（19→20）。
  - **黑胶弹** kind:'vinyl'：pierce 99 穿人不清弹 / bounce 99 真实反弹 / life 6s /
    RGB 红蓝拖尾（垂直方向错位粒子）/ 撞墙音波涟漪 + vinylBounce / 撞敌低频冲击环。
  - **黑胶互撞**（weapons.update 末尾两两检测 <0.45，在飞 ≤12 张）→ 双弹离场 →
    `G.jukebox.addNode(碰撞点)`（节点 ≤6 寿命 8s：黑胶+中心标签+霓虹环+辉光）。
  - **共振网**：并查集保连通 + 距离就近补满 ≤8 条；蓝主光+红残影双 THREE.Line，
    正弦波浪几何预分配（Float32Array+needsUpdate）逐帧覆盖；线上敌人 0.18s tick 2.5
    （ignoreBlock 破盾卫格挡，Boss 同步 2.5/tick）；X-Ray 脉冲=现有闪白节流。
  - **唱片撞节点**（jukebox.update 一帧一张）：未满网→被撞节点寿命刷新+入网扩张；
    满网→FULL OVERLOAD。满网后再入网→全线 SONIC BURST（线上敌人 12 伤 /
    **Boss `G.hurtBoss(24)` 单次封顶**）+ bassDrop + 震屏 + 节点/线全清。
  - **Club Mode**：有节点时 `G.lights.ambient.intensity` ×0.78（暗场基准在进入瞬间
    采样，cleanupDynamic/onRoomEnter 钩子还原——已确认不跨房/跨局残留）。
  - 音效：vinylShot（低音炮 BOOM+唱片咻）/vinylBounce（THUMP）/resonance（电子建网）/
    bassDrop（低频爆发+ducking）；商店像素图标=音箱+喇叭+黑胶。
  - **性能红线**（设计稿三十二已落实）：黑胶 ≤12（超限空响不耗弹）/node≤6/beam≤8，
    线几何无每帧新建对象；SCENE 挂载按 换房即清。
- **接线**：index.html 加载序 weapons 之后插入 jukebox.js；game.update/cleanupDynamic/
  onRoomEnter 三处挂钩（与 scalpel 同款纪律）。
- **验证**：BOOTTEST_PASS_P59_F0 ×3（58→59 步三连全绿；编号 49/53 留空洞延续）。
  文档同步：HANDOFF（⑦标记完成）/GAME_SYSTEMS（§2.1 计数与品阶、新增 §2.12）/
  PROCEDURES（59 步分组与编号清单）/PROJECT_STATUS/AGENTS（59 步、21 文件）/
  ARCHITECTURE（新增模块行）/本日志。
- 踩坑记录：同批次内两次「同一文件并行编辑互相覆盖」（activeVinyl helper 丢失导致
  STEP04/59 双 FAIL 复现）——教训：**同文件编辑必须串行**，改完 grep 验证再继续。

---

## 2026-09-03（太阳左轮批次）

### 新增武器 ⑥【献给太阳的左轮】Revolution of the Sun（过热管理型，交付在架）

- **实现**（weapons.js v24 / player.js v16 / ui.js v12 / shop.js v11 / audio.js v20 /
  main.js v62，全部就地实现，不建独立模块）：
  - def `{tier:'A', dmg:14, rate:1.1, mag:6, reload:1.6, sun:true}`；`W.mktWeapon` 预置
    `heat/heatIdle`；A 阶表与 `W.defs` 各 +1（A8→A9，武器总数 18→19）。
  - **Heat 系统**（player.js `update`/`fire`/`emitShot`）：开火 heat+14；伤害乘区
    1/1.25/1.6/2.2（<25/50/75/95）；停火 0.7s 后 9/s 衰减、装填中 ×4（主动散热）；
    heat>100 → OVERHEAT（自伤 1、cool=1.5s、heat 归零、爆鸣粒子——安全阀，不致死）。
  - **SUNSHOT**：heat ≥95 开火改射 `kind:'sun'` 弹（pierce 99/spd 7/dmg 38×1.5=
    57/大金白 glow/灼热金白拖尾粒子/命中 `W.explode(2.2,26,'p')` 两段伤害）→ heat 归零。
  - 弹种接线：weapons.js 的 kind 链 `def.kind ||` 短路优先；spawn 球体/辉光/爆炸分支
    全部加 `'sun'`；HUD `[HEAT nn%]`（ui.js）；音效 sunshot/overheatHiss（audio.js）；
    商店像素图标「金左轮+太阳核心」（shop.js）。
  - ⚠️ 设计注记：+14 阶梯下临界区间仅 98/104 两个节点均改判 SUNSHOT，`heat>100` 的
    OVERHEAT 正常对局不可达（安全阀），风险决策落在「84 时是否博一发 PERFECT」。
- **修复上一会话遗留**（本会话接手时 STEP58 测试与 OVERHEAT 分支不可用）：
  - STEP58 用 `G.playerCtl.fire`（原 `G.player.fire` 实例无该方法）→ 补全 7 连射
    SUNSHOT 断言 + **对敌高伤真实链路**（先对准 +x 跑一帧让 muzzle 与弹道共线、敌人
    1.6 格正面布放、真实弹道命中秒杀）+ OVERHEAT 改走 STEP43 血债式 `uf` 模式
    （绕过 frames 测试保护，invulnT=0 后 p.hurt(1) 才落血）。
  - OVERHEAT 分支 `G.fx.burst(p.muzzleX,.6,p.muzzleZ,{...})` 第 4 参数量误传对象
    （静默无粒子）→ 补 12。
  - 首轮实测踩坑记录：装填中 ×4 散热使第 6 发后热量衰减 0.6（84→83.4），连射计数
    改为不插帧，断言精确 84。
- **验证**：BOOTTEST_PASS_P58_F0 ×3（58 步全绿三连稳定；步骤 57→58，编号 49/53
  留空洞延续）。文档同步：WEAPON_BATCH_HANDOFF（⑥标记完成）/GAME_SYSTEMS（§2.1
  计数与品阶、新增 §2.11）/PROCEDURES（58 步分组与编号清单）/PROJECT_STATUS/
  AGENTS（自测 58、文件数 20 修正）。

---

## 2026-09-03（下架批次）

### 下架【战地泡面叉】【悖论骰子】（用户判定品质不达标，待重做）

- **移除范围**：weapons.js（def/tiers/fork 拉拽分支/kind 链/弹体视觉/命中钉住分支）、
  player.js（骰子蓄力与结算分支）、enemies.js（钉住系统 E.update 分支与三处叉杆清理）、
  game.js（dice reset/update 钩子）、ui.js（骰子 HUD）、audio.js（7 个专属音效）、
  shop.js（2 个像素图标）、main.js（STEP49/53）、index.html（dice.js 引用与版本）；
  **js/dice.js 整文件删除**。钉住（pinT）系统随之整体下线。
- **保留**：完整实现存 git 历史（4a4116e 泡面叉 / 47f20df 骰子）；
  `WEAPON_BATCH_HANDOFF.md` 已标注下架状态与重做要求（骰子重做需真 3D 骰体+每点数
  独立视觉语言+PARADOX 全屏演出，必须显著超越旧版）。
- **验证**：BOOTTEST_PASS_P57_F0（步骤 59→57，编号 49/53 留空洞）；累计 11 轮 10 绿
  1 挂——单次失败未存日志无法定位步骤，已按规矩记入 KNOWN_ISSUES（BUG-028）。

## 2026-09-03（音频批次）

### 音频系统 2.0 全面重制（用户指令：从「程序生成提示音」升级为独立游戏音频风格）

- **审计结论**：旧系统=单 oscillator 直出（beep 感）+ 单层 16 步音序器循环（无状态层次）
  + 无总线/混响/声像/限流/随机化/ducking + Boss 音乐无阶段。**audio.js 整体重写**
  （187→413 行），公共 API（74 个音效名/music/setVol/unlock/muted/_curTrack）全兼容。
- **总线**：Master(→Compressor) ← music/sfx/player/enemy/boss/ui/ambient 七路独立 Gain；
  混响=生成式 IR Convolver（爆炸/Boss/奖励/裂隙湿声）；音乐链 notes→musLP→musGain→
  duckG→master（商店房低通 950Hz 闷化）。
- **分层动态音乐**：f1/f2/f3 各为 base+combat 双层（战斗层由 curRoom.locked 驱动，
  每帧 lerp ≈0.8s 交叉淡化——探索↔战斗不再切歌）；f2 完全独立主题（低沉工业 vs f1
  神秘）；**boss 三层按血量 60%/25% 自动叠层（p1/phase2/enrage）**；base(hub)/victory/
  gameover 独立主题；切轨量化到小节防断拍；每层 A/B 双小节防单调。
- **音效**：74 名全保留、配方重制（枪械 CLICK→CRACK/爆炸三级/能量 zap/敌人 telegraph/
  玩家受击低频/稀有奖励 rewardR·E·L 三层/清房 fanfare/bossStinger 出场演出/低血心跳）；
  全局音效随机化（音高±4%/音量±8%）+ 同名限流 + voice cap 56（onended 回收）；
  `sfxAt` 定位声（enemy 总线 StereoPanner+距离衰减）；ducking（爆炸/Boss/坍缩/风爆压
  音乐 28%）；winRun/loseRun 增加胜利/失败主题（定时器带状态守卫防迟到覆盖）。
- **踩坑**：① _sched 读 `T.vol`（未定义）而非层内 `P.vol` → NaN 音符风暴（693 次未捕获
  异常刷爆 errlog，console 实测抓出）；② winRun 的胜利音乐定时器在虚拟时间下迟到，
  覆盖基地 BGM → 回调加状态守卫；③ `_combatTarget` 只由 30ms 轮询写入 → update 增加
  统一写入；④ 诊断期间的一次 python 字符串手术把 audio.js 改出语法错误（模块加载失败），
  已重建。防御措施：_mnote/_osc/_noise 保留非有限值守卫 + _sched try/catch（永久健壮性）。
- **验证**：STEP54（总线/混响/状态机/战斗层/Boss 阶段/ducking/限流/渐变）+ 全量
  BOOTTEST_PASS_P59_F0 三连稳定。真实听感测试（探索↔战斗↔Boss↔胜负全流程人工核听）
  由用户在浏览器进行。

## 2026-09-03（武器批次）

### ⑤ 新增武器【悖论骰子 dice】（6/7，新模块 dice.js 91 行）

- 定位 A 阶：`dmg 6 / rate 1.2 / mag 8 / dice:true`。开火进 0.35s 掷骰蓄力（player.js
  fire 分支 + chargeT 结束分支，与赌徒同款管线），chargeT 结束 `G.dice.release` 结算。
- 掷 1~6 真实攻击：1 厄运短程弱弹(3) / 2 双重(5×2) / 3 三向散射(4.5×3) / 4 冻结钉
  （kind:'dice4' 复用钉住系统，冰蓝晶杆留体） / 5 追踪弹（kind:'homing' 现成追踪，9） /
  6 毁灭（瞄准点 explode 2.6/26+震屏 .3）。结果反馈：品色 ring+大号「§n」数字+diceStop。
- **连续机制**：lastRoll/cons 同数累加、异数归 1；**cons≥4 → PARADOX 现实崩坏**：跳过
  普通攻击，全房敌人 34（精英 ×1.3，**Boss hurtBoss(26) 封顶**）+hitstop .12+白闪+双
  ring+碎裂，计数全重置。**现实不稳定度** instab=cons×25 封顶 100、每秒衰减 8；≥50
  阶段节流微震屏+微闪（不干扰输入）。HUD：武器名追加 [§n×c]。开新局 reset（startRun）。
- 音效 diceRoll/diceStop/paradox；商店图标机械骰子。回归锁：STEP53（强制点数钩子
  `_force`：计数/重置/冻结钉/毁灭/PARADOX 全房伤害）。⚠️ 踩坑：掷骰冷却 0.83s=50 帧，
  测试掷骰间隔必须 ≥54 帧；PARADOX 序列前必须补满弹药（前序测试打空弹匣触发自动装填
  吞掉第 4 掷）；instab 断言用容差（衰减每帧生效）。
- **验证**：BOOTTEST_PASS_P58_F0 三连稳定。

### ④ 新增武器【视界线切割刀 scalpel】（5/7，新模块 scalpel.js 172 行）

- 定位 A 阶近战：`dmg 9 / rate 2.2 / mag 10 / melee:true`（spawnPlayer 拦截 → swing）。
- **普攻**：扇形挥砍（1.4+e.r 格 ±0.75，knock 4，命中 hitstop .045）+ 前方 1.15 格留下
  **Space Rift**（黑核+紫边平面，垂直挥砍方向；最多 3 道 FIFO 淘汰；寿命 3s；DOT 0.2s
  tick 3 点，带紫粒）。**SPACE ROLL**：翻滚触发处（player.js:455 一行钩子）调
  `tryRollEnter`——0.9 内有裂隙且 ≥2 道 → 沿创建序传送下一道（nearbyLegalPos 防入墙，
  invulnT+.35）→ 立即 **SPACE COLLAPSE**：裂隙两两连线（紫电 fx.lightning），线上
  （点到线段 <0.5）敌人 VOID SEVER 26（精英 ×1.3、多线 ×hits 交叠奖励、**Boss
  hurtBoss(26) 封顶**）+白闪 .08+hitstop .09+碎裂；裂隙清空。单裂隙不传送（无目的地）。
- 裂隙绑定房间：onRoomEnter 与 cleanupDynamic 双清场（防跨房传送/残留）。
- 音效 riftSlash/riftOpen/riftTravel/riftCollapse；商店图标：只有刀柄（黑身紫边）。
- 回归锁：STEP52（三刀三裂隙/DOT/传送落点/坍缩击杀线上敌人/I-frame/单裂隙边界）。
- **验证**：BOOTTEST_PASS_P58_F0 三连稳定。

### ⏸ 批次状态：3/7 完成交付，4/7 重型武器移交后续批次

已完成：泡面叉(①) / 纸飞机(②) / 吹风机(③)，均为 D 阶、无里程碑挂接（恒可用），
每把独立提交、独立回归步骤（49/50/51），56 步全绿三连稳定。
未完成：视界线切割刀 / 献给太阳的左轮 / 悖论骰子 / 过载点唱机（4 把重型特殊武器，
各需独立模块与新机制）——**实现方案与集成点已写入 `docs/WEAPON_BATCH_HANDOFF.md`**，
设计源文档在 `D:\obsidian\Obsidian Vault\vibe coding\武器\`，后续按该文档继续逐把交付。
（顺序说明：为最大化「完整交付」数量并降低中途报废风险，按轻→重实现，与用户列出的
顺序不同，用户列表仅是清单不是优先级。）

### ③ 新增武器【重型吹风机 hairdryer】（3/7）

- 定位 D 阶控制型：`dmg .55 / rate 6（持续风推）/ mag 24 / range 5.5`，无里程碑挂接。
- 机制：**不发射弹体**——按住开火每 tick（6/s）做锥形扇区检测（±0.55 rad / 5.5 格）：
  推力脉冲（重量=2.6/(r×2.4) 截断 .5~1.6，体积越大越难吹；距离衰减 100/70/42%）；
  **风压系统** `_pressT` 持续命中 1.2s → WIND BURST（11×重量 强脉冲+音波环+震屏）；
  **撞墙冲击** `_wallCd .6s`：推向方向紧贴墙且速度>3 → 1 点 IMPACT 伤害；**敌人互撞**
  `_colCd .9s`：双方小额冲击+击退；OVERDRIVE：持续吹风 `_blowT` 效率缓降 ≤35%
  （E.update 通用段衰减，停止吹风自然回落）；Boss 不在 enemies.list 天然免疫。
  气流粒子沿扇区散布。
- 音效 dryerTick（电机细响）/windBurst（WHOOSH）；商店像素图标。
- 回归锁：STEP51（锥形推力位移/风压爆发峰值/贴墙 IMPACT 掉血；测试周期性把目标放回
  风锥模拟跟枪）。**验证**：BOOTTEST_PASS_P56_F0 三连稳定。

### ② 新增武器【纸飞机 paperplane】（2/7，用户指令：逐把完整交付）

- 定位 D 阶远程：`dmg 2.2 / rate 1.4 / mag 5 / speed 4→13`，无里程碑挂接（恒可用）。
- 机制：`kind:'paper'` 弹体每帧从 ang 重算速度——**飞行时间越长越快**（+3.2/s，上限 13，
  高速出现白色气流粒子）；穿透 2 个（dmgDecay .85 逐个衰减）；反弹 3 次；**末期回航**
  （life≤1.4s：滑翔减速至 ≥7、3.2/s 转向追踪玩家、距离 <0.7「啪」接住→返还 1 发弹药）；
  回航阶段**软墙反射不消耗反弹次数**（否则会先于回航撞死——首版踩坑）；扁平纸片弹体
  + 纸张轻摆动画。⚠️ 踩坑：spawn 对象 `life` 键重复定义（后者 undefined 覆盖原值→寿命
  1s），已合并进原表达式——新增 def 特殊寿命必须改原键而非追加。
- 音效 paperThrow/paperCatch；商店像素图标（纸飞机折角）。回归锁：STEP50（生成/加速/
  向量同步/回航接住返还）。**验证**：BOOTTEST_PASS_P55_F0。

### ① 新增武器【战地泡面叉 ramenfork】（1/7，用户指令：按 Obsidian 设计稿逐把完整交付）

- 定位 D 阶控制型：`dmg 2 / rate 1.6 / mag 6 / reload 1.2`，无里程碑挂接（恒可用）。
- 机制：命中敌人 → 叉杆（细长 box 弹体 kind:'fork'）**留在敌人身上**（`e._forkMesh`）+
  `e.pinT=1.3s` 钉住（E.update 专用分支：位置锁定/跳过 AI/叉杆颤抖/到期拔出+轻微击退；
  受击与清剿判定照常；E.kill/E.clear/位置自愈三处清理叉杆防泄漏）。钉住期间再开火 =
  **机械拉拽**（spawnPlayer fork 分支：朝玩家拉 ≤2.2 格，moveEntity 受墙壁约束不越界）。
- 音效 forkShot/forkPin/forkPull/forkOut；商店像素图标；STEP41/44 目录与默认解锁断言
  改为按 defs 动态计数（此后新增武器不再破坏断言）。
- 回归锁：STEP49（命中钉住/定身/拉拽/到期解除）。**验证**：BOOTTEST_PASS_P54_F0。
- ⚠️ 踩坑：spawnPlayer 的 kind 三元链漏加 fork 分支导致命中分支永不匹配——新增特判
  弹种必须同步该链。

---

## 2026-09-03

### 基地系统「废弃军械站」完整实现（用户指令：局外循环中心）

**架构决策（最小侵入）**：基地=特殊 floor（`num:0, isBase:true` 静态 22×15 tile 地图）+
play 态 + `G.game.inBase` 旗标——tile 碰撞/房间/交互/prop/构建/清理管线全部复用，主循环
更新顺序零改动（H4 红线未触碰）；地牢逻辑由 inBase 分支隔离。

**新增/改动**：
- **js/base.js（新模块，711 行，加载序 meta→base→enemies）**：静态场景构建（暖色
  THEME/木纹地板/金属墙/挂灯/熔炉/地图桌等，每次进基地重建使展示随解锁成长）；
  NPC×4（枪械师老铆/工程师扳手姐/档案员墨记/教官铁哨：GeoBuilder 造型+idle 工作动画
  +3.5m 看向玩家）；数据驱动对话表 DIA（初见>通关>连死≥3>刚消费>常态轮换）；
  三类门店面板（DOM 复用 .wcard 风格）；训练场（3 个可射击训练靶+武器架循环试用）；
  战利品墙（Boss 首杀点亮）；深渊升降梯（唯一出本入口）；`#baseHud`
- **meta.js → MetaProgression 单一解锁源（v3，73→176 行）**：深渊碎片 `shards`
  （发放/消费/awardRun 结算公式）/`bought`（枪械师购枪）/`items`（工程师解锁进阶被动，
  GATED_ITEMS 8 个，老玩家 bd_best 回填全解锁）/`upgrades`（5 项基地升级）/
  `stats`（敌人分类击杀/武器使用与击杀/Boss 讨伐与最佳时间/死亡/胜利/出击）；
  `unlocked()`=里程碑∨购买；购买事务 buyWeapon/buyItem/buyUpgrade 供面板与自测共用
- **game.js（495→608 行）**：newGame/enterBase/_enterBaseNow/returnToBase/launchRun/
  toTitle/restartFromPause；`_enterBaseNow` 重建玩家并应用基地升级；bossDefeated 传
  bossKey+用时（图鉴）；onKeyPress 死亡/胜利 [E] 回基地、面板关闭、Tab 基地禁用；
  frame() 冻结条件加 base 面板；update 挂 base.update 与 HUD 分支
- **联动接入**：items.randomPassive 按 itemUnlocked 过滤（空池回退全池）；gen.js 档案室
  每级 +30% 追加特殊房；weapons spawnPlayer 加 wid 参数（击杀归属统计）+ 池字段；
  player.fire 统计使用次数；enemies onKill 传类型；build.damageProp 训练靶专用分支
  （伤害数字+自动重置+不计时击杀）；audio 新增 base 曲目；ui.js 按钮绑定改新流程
  （死亡/胜利→返回基地）+ btnTitleP；index.html baseHud/baseWrap DOM+CSS、暂停加
  「返回标题」、版本 bump（meta v3/base v1/audio v9/items v7/weapons v15/enemies v10/
  gen v8/build v10/player v13/game v13/main v47）
- **启动流程变更**：标题「开始突袭」→ 进入基地（不再直开地牢）；自测与快捷路径仍可
  `startRun()` 直进第一层（51+2 步全兼容）
- **存档**：进基地/购买/升级/结算全部 `meta.save()`；localStorage 单键 bd_unlocks 扩展
  （未新增第二套存档系统）

**踩坑记录**：① `spawnPlayer` 签名无 `w`，wid 须显式传参（STEP03 起蔓延 40 失败的根因）；
② `_enterBaseNow` 漏建 run → `update()` 读 `run.time` 崩溃、渲染循环中断黑屏（视觉验收
抓出）；③ boottest `frames()` 每帧 HP 顶回 50 的保护会吞真实掉血断言（基地血量断言改
maxHp 口径）；④ 死亡结算有 700ms 误触闸门，测试需置 `_resultT=0` 绕过。

**视觉验收**：`?shot=base` 新截图模式，4 轮 judge 迭代（黑屏崩溃→布局压缩 22×15→
相机拉远 21/9.6→PROBE 清除→孤立◆根治）最终 PASS（3 条非阻断打磨建议已记）。

**验证**：BOOTTEST_PASS_P53_F0，5 轮（含 4 轮复跑）全绿无 flake。BASE-01~20 对照
覆盖见 PROCEDURES 步骤 47/48。

---

## 2026-09-03

### 建立 `docs/PRODUCTION_ROADMAP.md`（商业化升级路线图，纯文档批次）

- **背景**：用户提供外部评审建议（ChatGPT：四体验层 / Combat-Feel 优先 / Build Engine /
  Decision System / 七级阶段模型），要求与本项目实况研判综合收口为正式规划文档。
- **文档内容**：四层体验现状自评（Combat Feel / Build Identity / Decision Density /
  Replayability，逐层标注已有基础与缺口）→ L1~L7 共 40 项编号任务（R1.1~R7.10，
  每项含现状/目标/验收标准/规模）→ 负空间清单 → 创意池 → 里程碑 M0~M4 → 工作方法约定。
- **对外部建议的修正**（关键差异，均有代码实况依据）：
  ① 战斗反馈系统**已存在**（hitstop/trauma² 震屏分档/慢动作/弹壳/伤害数字），
  L1 定位为「补差与系统分级」而非从零实现；② **第 3 层已完成**（虚空王座+无面君主），
  「不要做第三层」修正为「不再扩层的负空间约束」；③ 磁轨狙击炮已存在，
  蓄力玩法转为既有武器的变体；④ meta.js/种子生成/步进音序器/构筑 HUD 均标注为
  图鉴、每日挑战、动态音乐、构筑命名的现成容器。
- **交叉链接**：AGENTS.md 必读表与目录清单新增本文件；PROJECT_STATUS §五标注
  「历史推断，统一收口到路线图，不再更新」。

>
> ⚠️ **本项目 2026-09-01 16:47 才建立 git（初始提交 `fa68394`）。** 在此之前的时间线是
> 根据**文件修改时间**、**代码注释**、以及**自测套件中的回归用例**反推的，不是从提交记录读出来的。
> 凡无法确定的，标注「**时间未知**」或「**原因未知**」，不做推测。
> 文中提到「无 git」的段落均为当时的历史记录，保留原貌。

---

## 2026-09-02（本日）

### 第三层专属新怪 ×3：虚空掠影 / 裂隙注视者 / 虚空祭司（用户指令：第 3 层怪物延续 1/2 层，无新类型）

**设计定位**（虚空王座主题，深紫黑+紫火语言，与 wisp/无面君主同族配色）：
- **虚空掠影 voidstalker**（cost 2 / hp 24 / spd 2.9）：近身威胁——半透明（opacity .38）蛇形
  潜行逼近，`blinkCd` 到点闪现至**玩家背后 1.7 格**（首选朝向反方向，落点经
  `nearbyLegalPos` 合法性校验，非法依次退让斜后两侧/正后方）→ 显形预警 0.5s（眼缝亮起
  全程不动，玩家走位/翻滚窗口）→ 突刺 0.24s（9.5 速）→ 收尾硬直 0.7s（全显形=反击窗口）。
  突刺命中后自设 `contactCd=.8` 抑制通用接触伤双扣。
- **裂隙注视者 riftwatcher**（cost 2 / hp 20 / spd 1.35）：中距压制——悬浮巨眼保持 4.5~8
  距离，碎晶收拢蓄力 0.9s → 三枚缓慢**追踪虚空宝珠**（新敌方弹种 `voidorb`，spd 3.4 /
  life 3.2 / 转向率 2.2 rad/s 刻意压低——垂直走位/翻滚可甩、掩体可挡）。weapons.js
  W.update 新增 team-'e' 追踪分支（与玩家 hive 的 kind:'homing' 并列，互不影响）。
- **虚空祭司 voidacolyte**（cost 2 / hp 28 / spd 1.5）：支援威胁——保持距离，4.2 格内存在
  无护壁同袍时吟唱 1.1s → 为其附**虚空护壁**（`e.voidWard`，抵挡下一次**任意类型**伤害：
  刻意放在 E.hurt 格挡/词缀盾之前且不看 ignoreBlock，连爆炸与拍立得 ×2 结算也整挡一次）；
  孤身时改直射。改变玩家的集火优先级。护壁存在期间头顶漂浮紫色微粒（E.update 通用段，
  任何被附护壁的类型都可见）。

**接入**：gen.js 第 3 层敌人池追加三怪（权重 2.2/2/1.8，老怪仍为主体，新怪约占 26% 出场）；
audio.js 新增 5 个虚空音效（voidblink 空间撕开 / voidslash 突刺 / voidcharge 蓄力低鸣 /
voidorb 宝珠 / voidchant 圣咏）。版本 bump：enemies v9 / weapons v14 / audio v8 / gen v7 /
main v46。敌人总数 12→15 种，`enemies.js:1` 文件头「9种」过期注释一并修正（KNOWN_ISSUES
P3 该项结案）。

**回归锁**：STEP 46 新增——① 掠影闪现落点=玩家背后 1.7±0.5、显形→突刺→真实掉血
（`p.hurt` 链路）→硬直全状态机；② 注视者蓄力→3 枚 voidorb 入池→20 帧内与玩家距离
显著缩短（追踪性）；③ 祭司吟唱→同袍与自身 `voidWard=1`→`G.hurtEnemy` 首次伤害被护壁
挡下、第二次正常扣血；④ 三怪 `floors:[3]` 专属定义。
⚠️ 本步骤踩坑：`frames()` 助手每帧把 hp<50 顶回 50（测试保护），**真实掉血断言必须用
无保护的 rawF 逐帧驱动**，否则突刺伤害被下一帧保护抹掉（断言恒挂 50/50）。

**验证**：BOOTTEST_PASS_P51_F0，4 轮（含 3 轮复跑）全绿无 flake。

---

### 拍立得手感调整：射击间隔 1.82s→0.9s、装填 1.7→1.5s（用户指令）

- `weapons.js:21`：`rate 0.55 → 1.11`（发/秒；`player.js:571` 按 `1/rate` 换算冷却，
  1/1.11≈0.9s，与赌徒 rate:3.33=0.3s 同一换算约定）、`reload 1.7 → 1.5`。
  蓄力 0.16s 是拍立得分支的独立硬编码（player.js fire()），不受影响。
- STEP40 断言面核对：两处拍摄断言只依赖蓄力 0.16s（frames 14 覆盖）与冻结 2.0s+冲洗
  0.3s 时间线（frames 150=2.5s 覆盖），均与射速/装填无关，无需同步。
- 版本 bump：weapons v13。
- **验证**：BOOTTEST_PASS_P50_F0。

---

### MISFIRE 慢动作+卡壳总惩罚缩至 1s（用户指令）

- MISFIRE 慢动作 0.9s → **0.5s**（真实秒；0.25× 倍速不变），卡壳 0.5s 维持——
  直加口径 0.5+0.5=**1s** 总惩罚。卡壳不动是为了锁 STEP43 断言（`jam>0.2` 按 0.5s
  时间线推算，动卡壳就得再调阈值）。版本 bump：gambler v8。
  注：slowmo 时长按真实 dt 计（fx.js `_slowT-=dt`），翻牌走缩放 dt，慢动作结束时
  翻牌尚未走完、恢复常速后瞬间完成再进卡壳——体感总时长略大于直加值。
- **验证**：BOOTTEST_PASS_P50_F0。

---

### Joker 演出提速：三结果慢动作减半 + MISFIRE 卡壳再缩短（用户指令）

**两处调整**（gambler.js v7）：
- 慢动作时长按结果区分：GOOD JACKPOT / BLOOD DEBT / CATASTROPHE 0.9s → **0.45s**
  （减半，0.25× 倍速不变）；MISFIRE 维持 0.9s（用户未要求改动）；CHAOS 免慢动作不变
  （上一条目）。
- MISFIRE 卡壳 0.7s → **0.5s**（当日二次缩短：1.2→0.7→0.5，横幅文案同步）。

**回归锁同步**：STEP43 卡壳断言 `jt.jam>0.4` 在 0.5s 下必挂（40 帧驱动 − 蓄力 9 帧 −
翻牌 18 帧结算 ≈ 剩 13 帧 ≈ 0.22s 衰减，剩余 ≈0.28），改 `>0.2`。版本 bump：
gambler v7 / main v45。
**验证**：BOOTTEST_PASS_P50_F0。

---

### CHAOS 重做：揭牌免慢动作 + 乱舞改为持续醉步漂移（用户反馈：没让敌人乱飞，且自己也被翻牌减速）

**用户反馈两点**：① CHAOS 没有让敌人乱飞的实际效果；② 敌人减速期间玩家自己也因为
揭牌慢动作被减速，实战等于白给。结论：CHAOS 的体验是「双方互相抵消的空效果」。

**重做方案（gambler.js v6 + enemies.js v8）**：
- **提前掷结果**：Joker reveal 时预 roll 存入 `reveal.result`，结算阶段直接取用——
  因此 CHAOS 可以在揭牌前决定跳过慢动作：`if(result!=='chaos') G.fx.slowmo(.25,.9)`。
  玩家保持全速，独占吃满敌人 3s 减速窗口；其余 Joker 演出不变。
- **乱舞机制重建**：旧实现是一次性速度注入（±3.5），实测被敌人积分段的击退强摩擦
  `e.vx*=Math.pow(.0001,dt)` 在 ~0.15s 内吞掉（位移 <0.2 格，零体感）——这正是「感觉
  没有乱飞效果」的根因。新实现：enemies.js 移动积分段前新增 `e.chaosT` 段，期间每帧
  `vx/vz += (rand-.5)*0.7` 随机扰动，与强摩擦平衡出**持续的**约 2 格/s 醉步漂移；
  chaosT 结束自然回归原 AI。0.8s 非法 tile 自愈消灭（GEN 兜底）不变，防推入墙软锁。

**配套**：STEP43 chaos 断言加 `s3.chaosT>0`（验证新字段真实生效）。
版本 bump：gambler v6 / enemies v8 / main v44。
**验证**：BOOTTEST_PASS_P50_F0。

---

### 赌徒的灾难手感调整：弹匣 10 发 + 快速装填 + MISFIRE 减概率减时长（用户指令）

**三处调整**（weapons.js:22 + gambler.js）：
- 弹匣 6 → **10**，装填 1.4s → **0.5s**——抽牌武器的惩罚应集中在牌运本身，弹药管理不再额外拖累手感。
- Joker 权重池调整：MISFIRE 2.5 → **1.25**（概率 23.8% → 11.9%），减掉的一半概率转入
  GOOD JACKPOT 2.5 → **3.75**（23.8% → 35.7%）；总权 10.5 不变，其余三结果概率不变。
- MISFIRE 卡壳 1.2s → **0.7s**（横幅文案同步）。

**回归锁同步**：STEP43 的卡壳断言 `jt.jam>1.0` 在新时长下必挂（翻牌时间线 24 帧后剩余
≈0.63），改为 `>0.5`（含 0.13s 余量）。版本 bump：weapons v12 / gambler v4 / main v42。

**验证**：BOOTTEST_PASS_P50_F0（STEP43 赌徒全链路含 Joker 五结果强制通过）。

**追加指令（同日稍后）：翻牌提速**——`REVEAL_T` 0.4s → **0.3s**（gambler.js:32），Joker
揭牌演出整体缩短 0.1s，慢动作时长（0.9s）不变。STEP43 注释（翻牌 24 帧 → 18 帧）与卡壳
断言阈值 `>0.5` → `>0.4`（18 帧结算后卡壳剩余 ≈0.48）同步。gambler v5 / main v43。
验证：BOOTTEST_PASS_P50_F0。

---

### 修复滚轮切枪不灵敏：跨帧事件丢失 + 多格只切一把（用户反馈：鼠标滚轮切换武器不灵敏）

**根因 1（跨帧丢失，高刷屏严重）**：`frame()` 里 `update` 不是每渲染帧都跑（高刷屏 acc 累积、
hitstop、商店），但 `endFrame()` 每渲染帧都清 wheel——两次 update 之间到达的滚动事件被中间帧
吞掉。144Hz 下每 2-3 渲染帧才跑一次 update，滚动几乎随机丢。**修复**：`core.js endFrame` 不再
清 wheel（只清 pressed）；wheel 只由 `consumeWheel()` 消费；`shop.js` 开/关商店时重置（防店内
滚动累积到关店后爆发切枪）。hitstop/慢动作期间滚动累积到下一逻辑帧统一消费——连续切多把，
行为合理。

**根因 2（多格只切一把）**：滚轮快速滚 3 格 `wheel=3`，但 `wheel>0?1:n-1` 每次只切 1 把。
**修复**：`player.js` 按 `((wheel%n)+n)%n` 累积幅度切换，滚 N 格切 N 把（转整圈回原位符合
数学语义）。

**红线级注意**：H13 早有预警「endFrame 与 consumeWheel 双清零语义重叠」——本次正是把该重叠
拆掉；测试 `main.js:1170-1172`（wheel=±1 单格切换）与新逻辑兼容（frames() 先 update 消费再
endFrame）。版本 bump：core v6 / player v12 / shop v5。

**验证**：BOOTTEST_PASS_P50_F0。

**附带根治 STEP43 历史 flake（2026-09-02；初版方案当日证伪，此处为最终方案）**

> ⚠️ 本条初版写的是「钉死种子」方案，**已被证伪并撤销**，下方保留证伪记录。以本版为准。

**真根因（已确诊）**：`startRun()` 内部 `new G.RNG(Date.now()^Math.random())`（game.js:72）每次
运行重随机，出生点（gen.js:479）也直接取 `Math.random()` → **房间几何与出生位置是真随机的**。
而 STEP43 ②③④ 的断言要求「赌徒弹驱动 N 帧后**仍存活**」，赌徒弹 `bounce:0` **撞墙即灭**——贴墙
出生时 30 帧驱动（弹飞约 6.3 格）必然撞墙，断言时弹已死。（④ 的旧注释「方块弹 22 帧撞墙」说明
原作者早知道这类坑，②③ 当时没配平。）这才是历史 25-50% 随机 FAIL 的真身，**与无头 Chrome
环境抖动无关**——本文件下方 ⚠️ 段中「判定为 headless 抖动」的判断是错的（已加更正标注）。

**证伪记录**：曾尝试在 STEP43 开头 `G.rng=new G.RNG(20260831)` 钉死种子做测试隔离 —— 无效，
`startRun()` 内部会重新随机化种子，把钉的值覆盖掉。**结论：STEP43 想要确定性，不能靠外置钉种子。**

**最终方案（出膛即断言）**：不追求房间确定性，改为让断言与房间几何**解耦** —— 开火后驱动帧数
从 30 / 23 / 21 统一降为 **12 帧**（蓄力 9 帧 + 弹飞 3 帧 ≈ 0.9 格），弹刚出膛，任何房间尺寸下
都不可能已撞墙。② 直接断言弹参数；③④ 的命中/击杀改由「**靶子贴弹而行**」循环
（`s.x = b.x + cos(b.ang)*0.35`）保证 —— 接触先于任何墙壁/掩体，命中率与房间无关。
**main v39**（③④ 补丁落地时版本号未同步，本会话补 bump —— 不 bump 会因浏览器缓存
表现为「改了没变化」）。

**验证**：`node --check js/main.js` 通过；独立 user-data-dir 串行跑（每轮换新目录）**累计 250 轮**，
STEP43 相关断言（②③④⑥）**零失败**。同一批跑测还暴露了两处残留 flake（与 STEP43 不同步），见下条。

---

### 大样本复核 220 轮：STEP43 确认根治，另发现两处残留 flake（2026-09-02）

**复核规模**：20 + 30 + 60 + 60 + 25 + 25 + 30（收尾验证）= **250 轮**，
每轮独立 user-data-dir、串行执行。

| 结果 | 说明 |
|---|---|
| **STEP43 相关断言 0 次失败** | 「出膛即断言」方案确认根治；此前 25-50% 的随机 FAIL 彻底消失 |
| 残留 flake ×2，各约 **1/250** | `44_解锁系统与精英词缀` ⑧、`12_翻桌与爆炸桶` |

两处残留 flake **本次均未修**（复现率过低、拿不到失败现场，盲改风险大于收益），
已按项目纪律记入 `KNOWN_ISSUES.md` 的 **BUG-027**，含已证伪的假设清单以免重复排查。
它们的根因家族与 STEP43 相同（`startRun()` 真随机 → 断言依赖的周边状态不可控），
但 STEP43 的解耦思路无法直接套用（那里依赖的是「弹存活」，这里依赖的周边状态尚未定位）。

**方法沉淀**：低概率 flake 不要靠「多跑几轮等它复现」——本次累计 250 轮只撞上 2 次。
改用**状态探针**：把关键状态写进 `#errlog` 的 data 属性，每轮 dump-dom 都能读到，
即使该轮 PASS 也能看到状态分布，从而**逐条证伪**假设（本次据此推翻了 4 个看似合理的猜测）。

---

### STEP12「翻桌与爆炸桶」残留 flake 定向根治（2026-09-02，BUG-027 第一处）

**根因（定向复现实证，非推断）**：STEP12 断言前，若桌子的 +x 弹道上恰好有爆炸桶
（`barrel`，hp=8），而那发 `arc` 子弹恰好暴击 —— `arc` dmg 7 × 暴击 2.5（weapons.js:117）
= 17.5 > 8，一发打爆桶 → `build.js:848` 走 `G.weapons.explode(x,z,2.4,14,'any')` →
explode 对 props 的伤害通道（weapons.js:199，`dist < r*.9`）**不看 `table/flipped`** ——
翻倒的桌子在 1.0 格内被炸掉血 → `assert(table.hp===hp0)` FAIL。
桶在不在弹道、子弹暴不暴击都由 `Math.random()` 决定（BUG-022），实测复现率约 1/250。
此前探针阶段证伪过「桶在弹道」单条件（有桶的轮次照样 PASS）—— 单条件确实不充分，
**必须与暴击组合才充分**，这正是复现率如此之低的原因。

**定向复现（不靠等随机）**：临时补丁把 barrel 强制放到 `table.x+1.0` 弹道上、清空弹道
其它 blocksBullets 的 prop、`p.st.crit=1` —— **6/6 全 FAIL**，机制确认；随后在同一最坏
场景下加修复 → **6/6 全 PASS**，修复有效性同步确认。

**修复**：断言前把桌子 3.2 格内的 barrel 全部移到桌子斜后方 7.2 格处
（`pr.x=table.x-6; pr.z=table.z+4`）—— 不在 +x 弹道上，即使爆炸也波及不到桌子
（7.2 > 2.16 = 2.4×0.9）。STEP12 后半段的爆炸桶测试不受影响（仍能 `G.props.find` 到并引爆）。
**main v40**（main.js 再改，版本号同步 bump）。

**回归锁**：定向复现补丁是一次性验证工具（验证后已移除），未进自测套件；
根治判据 = 修复后大样本零失败。若未来给 STEP12 之前的流程加入可能产生爆炸的改动，须重新审视。

---

### STEP44⑧「爆裂自爆」残留 flake 定向根治（2026-09-02，BUG-027 第二处，全部清零）

**根因（定向复现实证，非推断）**：自爆伤害本身**同步且必然生效**——`G.hurtEnemy(sv,99999) →
E.kill → explode(1.8,12,'e')`（enemies.js:268）→ 玩家伤害门（weapons.js:190）
`!p.invulnT && p.rollT<=0`（两值刚被测试清零）→ `p.hurt(2)`，hp 6→4。真凶在**断言等了
`uf(3)` 三帧**：④~⑦/clearAll 期间每次击杀有 2% 掉落红心（enemies.js `E.kill`），当时玩家
满血，红心冻结原地（player.js:811 `p.hp>=p.maxHp → continue`）；⑧ 里 hp 掉到 4（<maxHp）
→ 冻结的红心恢复磁吸追踪（magR=1.7），位于**击退方向** 0.8 格内的心 1~2 帧内被拾取
`heal(2)` → hp 恰好被顶回 6 → 断言看到净伤害 0，误报「自爆未伤及玩家」。
爆炸 -2 与红心 +2 数值恰好相等，这正是 FAIL 信息恒为 `hp=6` 的原因。
心的掉落与落点均由 `Math.random()` 决定（BUG-022），实测复现率约 1/250。

**定向复现（不靠等随机）**：`clearAll()` 后在玩家 `p.x-0.55`（爆炸对侧=击退方向）强制放
一颗红心 → **3/3 全 FAIL，FAIL 信息与历史 flake 一字不差**。复现位置有讲究：放
`p.x+0.55`（爆炸同侧）则 3/3 PASS —— `p.hurt` 的击退（vx/vz=±5）把玩家踹离红心，
3 帧磁吸追不上；真实 flake 需要红心恰好冻在击退方向，这解释了复现率为何如此之低。
随后在同一最坏场景下加修复 → **3/3 全 PASS**。

**修复**：断言与帧后世界状态**解耦**（同 STEP43 思路）——`sv.dead` 与 `p.hp` 均在
`G.hurtEnemy` 同步返回后立刻断言，`uf(3)` 移到断言之后（仅保留清理职责）。
**main v41**（main.js 再改，版本号同步 bump）。

**验证**：干净代码全量 BOOTTEST_PASS_P50_F0；30 轮大样本 **30/30 全 PASS**。
至此 BUG-027 两处 flake 全部根治，自测残留 flake 清零。

---

### 赌徒的灾难射速提速：interval 1.1s → 0.3s（用户指令）

**用户指令**：射速从 1.1 秒改成 0.3 秒。**语义**：射速字段 `rate` 是每秒射击次数——
旧 rate 1.1 ≈ 1.1s 间隔；目标 0.3s 间隔 = rate 1/0.3 = 3.33。`weapons.js:22` gambler
def rate 1.1→3.33。**连带验证**：STEP 43 显式逐发 fire（不读 rate），且弹药走 storm 无限，
提速不影响任何断言；顺带与上批 0.15s 蓄力搭配（蓄力短暂不影响连发节奏）。index.html bump
weapons v11。

**验证（诚实口径）**：语法 CHECK 通过；SYNC_CHECK 多次、含部分批次 14-18 连跑全绿（BOOTTEST_PASS_P50_F0）。**速率与自测解耦的推断依据**：boottest 各步骤对 `G.input.mouse.down` 均是「置真再置假」，STEP43 前后为假 → player.js:477 autofire 分支（唯一读取 `w.cool`/rate 的路径）不触发 → rate 参数在 STEP43 属死路径，改动不影响其断言（fire/release/draw 均不读 rate）。

⚠️ **已知环境抖动（非本次改动引入，任务前交接记录已有）**：无头 Chrome 冷启动/连续多实例下自测偶发 FAIL，集中在 STEP 43（捕获过一次：`黑桃穿透弹未生成或参数错误` 位于 main.js:1501，而前一断言 1499 lastCard 通过）——STEP43 回调纯同步帧推进，理论上应位级确定，故判定为 headless 虚拟时钟/调度抖动，非逻辑缺陷；该 flake 与 rate 改动无耦合（见上）。若需彻底消抖，宜从测试环境侧入手（独占 user-data-dir、串行限速），不作为游戏逻辑改动。

> ⚠️ **2026-09-02 更正**：上段「判定为 headless 虚拟时钟/调度抖动、非逻辑缺陷」的结论
> **是错的**，据此做出的「从测试环境侧入手」的建议也随之作废。真根因是 `startRun()`
> 真随机房间几何 + 断言依赖「弹存活」这一随机状态，与无头 Chrome 无关；最终用
> 「出膛即断言」方案根治，详见本日「附带根治 STEP43 历史 flake」条目。
> 保留原文仅作历史记录，**勿再据此判断**。

### 赌徒的手感调优：蓄力/翻牌提速 + 梅花射程（用户指令：三处数值调整）

**用户指令**：① 蓄力 0.34s→0.15s；② Joker 慢动作翻牌 0.8s→0.4s；③ 梅花五向散射射程增大。

**改动**（player/gambler/main/index 四文件）：`player.js` chargeT .34→.15；`gambler.js`
REVEAL_T .8→.4、梅花 spd 14→16 + life 12/14→16/16（射程 12→16，+33%）；`index.html` bump
gambler v3 / player v11 / main v37。

**⚠️ 测试时序适配（红线级）**：STEP 43 jokerTest 原驱动 `uf(25);uf(55)`=80 帧按旧时序配平——
揭牌提速后完成点大幅提前，MISFIRE 的 jamT 会多扣 ~36 帧，`jam>1.0` 断言必挂。改为
`uf(12);uf(28)`=40 帧（蓄力 9 帧+翻牌 24 帧+7 帧余量，jam≈1.08 仍过线）。③ 红桃 uf(23)
对 0.15s 蓄力覆盖更宽裕，仅同步注释。

**验证**：`BOOTTEST_PASS_P50_F0`，累计 27 跑 2 次偶发 FAIL（均发生在连续起多个无头 Chrome
实例的系统冷启动阶段，未抓到现场；其后 21 连跑全绿）。STEP 43 时序为固定步长（1/60），
逻辑上确定——抖动源判定为无头 Chrome 虚拟时钟调度，非代码问题；若后续复现，抓取输出中
的 `STEP xx: FAIL` 行再定位。

### 修复军火库解锁死锁：赌徒的灾难/拍立得永久无法解锁（BUG 修复）

**用户反馈**：通关全部三层后军火库仍有武器未解锁。**诊断**：赌徒的灾难（gambler）与
薛定谔的拍立得（polaroid）构成死锁——两把武器的解锁条件（头奖=用赌徒的灾难触发 JACKPOT、
赌运亨通=赌徒的灾难 Streak×8）都必须先持有赌徒的灾难，而解锁前商店/掉落池/展示架三处
过滤（`meta.unlocked`）导致该武器无从获取 → 里程碑永不可达，两把武器永久锁定。

**修复**（meta/game/main/index 四文件）：
- `meta.js`：新增第 8 个里程碑**深渊征服者**（win_run，通关完整三层）解锁赌徒的灾难+
  拍立得；`onWin()` 钩子由 `game.js winRun()` 调用；`grant()` 横幅改为只列本次真正新解锁
  的武器（fresh 过滤，防彩蛋成就晚达成时发误导横幅）；`load()` 静默回填——bd_best 存在
  （曾通关）即补授 win_run，老玩家免重打一局
- ⚠️ **顺序敏感（红线级）**：`milestoneOf()` 按 MILESTONES find 首个匹配，win_run 必须排在
  jackpot/streak8 之前，gambler/polaroid 的 unlocked() 判定才走 win_run
- `main.js` STEP 45 追加 ⑪ 断言（通关→win_run 授予→两把武器 unlocked），步数保持 50
- 版本号 bump：meta v2 / game v12 / main v36

**验证**：`BOOTTEST_PASS_P50_F0` 两连跑稳定（第二轮隐式覆盖 load 回填路径：上轮
bd_best 存在 → 回填 → STEP 44 debugReset → STEP 45 重新授予）。雷暴发生器（arc）
的完美清剿路径为正常设计保留（可自行达成，非死锁）。

### 新增第三层「虚空王座」+ 全新原创 Boss「无面君主」（用户指令：第三层+第三主题）

**用户决策**：Boss 方案选「全新原创 Boss」（否决强化版铁颚）；主题选「虚空王座」（深紫黑+虚空蓝紫，否决熔火深渊）。

**第三层内容**：
- 楼层流转：第 2 层 Boss 死后不再直接胜利——Boss 房中央出现下行舱口（`game.js bossDefeated`
  按 `floorNum<3` 分流 + `build.js makeExit` 层数动态化「下潜至第三层」），走入触发 `descend()`
  通用化（`floorNum+1` + 层名/提示映射表）；第 3 层 Boss 击杀才是通关
- `gen.js`：战斗房 7/9/10；第 3 层独立敌人池（sniper/hexer/bomber 加权，剔除 gunner/charger/
  slime/shroom）；精英率 2 层 35% → 3 层 50%；陷阱 2 层尖刺/毒沼，**3 层追加「虚空裂隙」**
  （hide→warn→open 周期，open 时伤害+减速，紫光呼吸预警）；第 3 层专属 decor（rune/shard/eye）
- `build.js`：`B.themes[3]` 虚空王座（紫黑棋盘地板/深紫墙/紫雾/紫火把）；火把渲染改为按主题色取值
  （2 层行为不变）；table/pillar 第 3 变体（黑曜石+紫晶尖）；voidrift 陷阱渲染与判定；decor 三 case
- `ui.js`：HUD 层名与大地图标题改为三层数组映射；`audio.js`：新增 f3 曲目（bpm 112）
- `items.js` 商店/宝箱 3 层自动落入 `else` 分支（B/A 阶商品），无需改动

**新增 `js/voidking.js`（第 18 个模块，约 350 行，加载于 boss 之后 gen 之前）——无面君主 · 虚空王座**：
- 造型：漂浮紫黑装甲空壳（无腿悬浮+正弦呼吸）、胸口王座空洞+虚空核心、无面头壳+竖缝紫眼、
  背后王座背架（尖塔+顶珠）、4 片公转环绕晶体（菱形双锥）、4 片下摆碎裂装甲条（摆动）、
  紫色 PointLight+aura；forward=+X，`mesh.rotation.y=-face` 与主角同约定
- HP 1150（铁颚 900）、三阶段（60%/25%）：P2「王座碎裂」aura 变紫晶体加速、P3「虚空暴走」
  aura 白紫移速×1.3 弹幕加密（花瓣 4 臂反向）
- 7 种攻击：petals 花瓣螺旋 / lance 3 连发高速狙击（spd 7.2）/ rings 三波同心环 / blink
  瞬移（淡出→玩家侧后 3.2 格→淡入+8 向弹）/ summon（wisp×2，P2 起+hexer）/ wall 紫弹幕墙留缺口 /
  phase 转场；pickAttack 分阶段权重池+防连招
- 音效：新增 `voidscream`（锯齿上扬+正弦下滑+带通噪声扫频）
- **拍立得兼容**：photoT/photoBuf/photoPhase 字段与 G.photo 四函数调用与铁颚完全同构

**Boss 分发层（boss.js 4 入口）**：spawn/clear/hurt/update 按 `G.game.floorNum>=3` 分发到 voidking，
铁颚管线零改动。⚠️ **关键陷阱（BUG-001 同类）**：分发 spawn 后必须同步 `this.active=G.voidking.active`——
外部武器/爆炸/环绕刃伤害判定全部走 `G.boss.active`，不同步会导致新 Boss 免疫一切玩家伤害且无报错；
VK dying 结束同样回写 `G.boss.active=null`。已在 boss.js 分发处加注释锁定。

**自测**：新增 **STEP 45「第三层虚空王座与无面君主」**（10 组断言：主题定义/生成结构 Boss 房必有
exit 房必无/第 3 主题构建/虚空裂隙渲染与状态流转/Boss 死后舱口与文案/真实下潜流三切换（层名+主题+f3）/\
新 Boss 真实入口生成+G.boss.active 同步+拍立得字段/hurt 路由/攻击状态机真实运转/phase 2 触发/
真实击杀→winRun 通关）。STEP 17「三阶段Boss战」适配新流程（第 2 层 Boss 死后断言舱口出现而非
胜利界面）。自测 **49→50 步，`BOOTTEST_PASS_P50_F0` 三连跑稳定**。
测试踩坑：① addProp 进全局 `G.props` 不进 `room.props`，断言道具要查 `G.props`（pr.room 比对）；
② VK spawnT 0.7s+intro 1.6s=138 帧受击免疫窗，测试驱动帧数必须覆盖。

**浏览器实测**（本地 8123 端口）：6/6 PASS——第 3 层紫黑棋盘地板/紫火把光/层名横幅正确；
无面君主外观（王座+晶体+竖缝眼）与血条「无面君主 · 虚空王座」正常；hurt 路由 1150→1050；
无任何 THREE.js 报错。

**改动文件**（10）：新增 `js/voidking.js`；`js/gen.js / build.js / game.js / boss.js / ui.js /
audio.js / main.js`、`index.html`（新增 voidking 加载位+版本号 bump：audio v7 / ui v8 / boss v6 /
voidking v1 / gen v6 / build v9 / game v11 / main v35）。

### 新增局外解锁系统 + 精英词缀 + 构筑 HUD（用户指令：可玩性三件套）

**用户指令**：按可玩性建议实施 1+2+3——局外解锁系统、精英词缀、构筑可见化。

**新增 `js/meta.js`（67 行，第 17 个模块，加载于 gambler 之后 enemies 之前）**：
- 7 个里程碑解锁 10 把武器：初次下潜→弹跳+光棱 / 军火交易(首次购武)→三连发 /
  百人斩(累计 100 杀)→蜂巢 / 完美清剿(无伤清房)→雷暴 / 讨伐铁颚(通关)→火箭+磁轨+冰晶 /
  头奖(赌徒 JACKPOT)→拍立得 / 赌运亨通(Streak×8)→赌徒的灾难；恒定解锁 5 把
- `localStorage['bd_unlocks']` 持久化 `{flags,kills}`；授予幂等 + 横幅列出新增武器
- 过滤点：商店目录（未解锁=？？？占位卡，详情显示里程碑要求，购买拒绝）、
  `W.randomWeaponId`（重写为遵守解锁+向低阶降级）、展示架（只陈列已解锁）

**精英词缀**（`enemies.js`）：精英生成即随机附加一种——**爆裂**（死亡 'e' 阵营
自爆威胁玩家）/ **再生**（3s 回 2 血）/ **召唤**（6s 召怨灵上限 2）/ **护盾**
（周期护盾挡一次伤害，ignoreBlock 可穿透）；光环按词缀变色；行为 tick 在
E.update 词缀分支、吸收拦截在 E.hurt 顶部；`E.assignAffix(e,id)` 供测试强制。

**构筑 HUD**（`ui.js` stats 渲染 + `#passiveHud`）：彩色被动标签（悬停看全名说明）
+ 非默认数值总览（伤/速/暴/移/弹/吸/棘/穿/跳）；0.15s 节流刷新，无被动时隐藏。

**里程碑钩子**：`enemies.js` kill→onKill、`game.js` descend→onDescend /
lockRoom 记录 `room.dmgAtLock` 受伤基线 + clearRoom 对比→onFlawless /
bossDefeated→onBossKill、`shop.js` buy→onBuy、`gambler.js` JACKPOT→onJackpot /
Streak8→onStreak8。

**踩坑记录**：① 展示架按 14 槽切片但解锁后 rackIds 变短 → `defs[undefined]` 崩溃——
改为 `min(rackIds.length, 槽位数)`；② 测试顺序漏洞：② 的购买先解锁了 burst，
③ 的池过滤断言必须先 `debugReset`；③ 灾难自爆用 'e' 阵营只伤玩家是正确语义，
测试断言改为验证玩家受伤；④ 史莱姆死亡分裂出会追击的子体，在裸更新（无测试保护）
下磨死玩家冻结游戏——jokerTest 前复位玩家状态。

**验证**：`BOOTTEST_PASS_P49_F0` ×3 连跑稳定（新增 STEP 44：默认解锁集/购买触发/
武器池过滤/词缀合法性/护盾吸收/再生/召唤峰值/爆裂伤玩家/击杀计数/无伤基线/
构筑 HUD/bd_unlocks 持久化）；浏览器实测：商店 15 卡含 10 张「？？？未解锁」
占位（详情显示里程碑要求）、构筑 HUD「强化/鹰眼 + 伤×1.30 暴 15%」实时显示。

### 新增原创特殊武器【赌徒的灾难】Gambler's Calamity（用户指令）

**用户指令**：新增完整原创特殊武器——赌场左轮+扑克牌+骰子+机械赌场装置；每次攻击
抽牌，四种花色完全不同的战斗逻辑，Joker 不可预测命运事件，Gambling Streak 风险收益
递增，JACKPOT 系统，击杀重洗，真牌组（弃牌堆），可扩展 Ace/K/Q/J；必须真实实现全链路。

**新增 `js/gambler.js`（318 行，第 16 个模块，加载于 photo 之后 enemies 之前）**：
- **DeckSystem**：13 张迷你牌组（四花色×3 + Joker×1），`draw/shuffle/Discard/Reset`
  齐备；抽牌入弃牌堆、耗尽自动重洗；**击杀 → `onKill()` 全牌组重洗**（牌旋 VFX +
  洗牌音，钩在 `enemies.js` kill）；Streak ≥3/≥5 重洗时 Joker 张数 1→2→3
- **CardEffectSystem**（全部复用现有子弹池，新增通用字段 `dmgDecay`）：
  ♠ 穿透弹 pierce 99 逐敌 ×0.85 衰减；♥ 吸血（命中 +1 HP，红粒子回流）；
  ♦ 必暴击 ×2.5 + 35% 掉壳；♣ 五向散射（中心 ×1 → 两侧 ×0.62）
- **GamblingStreak**：连续花色牌计数，伤害 ×1.05/1.15/1.30；**JACKPOT**：Streak 每 +5
  触发（弹壳雨+横幅+铃声+震屏），下一档 +5 递增；**同花三条**：最近 3 张同花色 →
  瞄准点爆炸 + 专属横幅
- **JokerSystem**：独立加权结果池 GOOD JACKPOT/MISFIRE/CHAOS/BLOOD DEBT/
  CATASTROPHE（权重 2.5/2.5/2/2/1.5，`_jokerPick` 测试钩子）；揭牌演出：慢动作
  0.25×0.9s + 卡牌悬浮翻面（背面→花色面中点换贴图+「唰」声）+ 紫粒子；负面结果
  仅卡壳 1.2s/自损 1 HP/Streak 清零（无死亡/无永久惩罚）
- **CardVFX**：纸牌 Mesh 对象池（8）+ 5 张 Canvas 花色贴图缓存（象牙面/红背/Joker 紫）；
  粒子全走 fx 对象池；`update` 零每帧分配
- **HUD**：`#gamblerHud`（仅装备时显示）♠ LAST CARD + STREAK ×N + 卡壳指示

**联动改动**：`weapons.js`（新 def tier A dmg 10/rate 1.1/mag 6 + 分流 + `dmgDecay`
字段 + 花色命中附加效果）；`player.js`（赌场左轮枪模：黑金属/暗金/扑克红/象牙握把 +
8 扇区红黑轮盘 + 扑克牌仓 + 拨杆 + 骰子，顶点色烘焙；待机缓转/开火快转；fire 分支 +
chargeT 结束分流 + **弹药消耗与自动装填对齐 emitShot 语义**）；`audio.js`（12 个赌场
音效：弹牌/转轮/四花色/沉寂/揭牌/JACKPOT 铃声/BAD BET）；`enemies.js`（kill 钩一行）；
`game.js`（`G.gambler.update(dt)` 挂 photo 之后 + startRun 调 `G.gambler.reset()`）；
`index.html`（script + HUD CSS + 版本 bump）。

**踩坑记录**（调试战况，防复发）：
1. `_gmb*` 几何变量未在模块级 `let` 声明——严格模式赋值即抛 ReferenceError，级联炸
   5 个自测步骤
2. **`G.gambler.update(dt)` 忘记挂进主循环**——Joker 揭牌时间线/卡壳/HUD 全部静止，
   MISFIRE 永远不触发（`updateCallsIn10Frames:0` 插桩定位）
3. 赌徒走 release 分支绕过 emitShot → **弹药永不消耗**；补 `w.ammo--` + 自动装填
4. 测试用史莱姆死亡**分裂出会追击的子体**，裸更新（无测试保护）下被流弹误杀 →
   `onKill` 重洗把压好的牌埋掉 + 子体磨血致死冻结游戏——加 `clearEnemies()` 清场 +
   jokerTest 前复位玩家状态
5. 无头环境鼠标位置不定 → 瞄准不可依赖：命中类断言改为「靶子贴弹而行」（每帧置于
   弹头前 0.35，接触先于一切障碍）；方块弹 22 帧撞墙，出膛断言须在死亡前
6. 商店展示架：15 把武器 → 展示架候选位充足（`cand.slice(0,14)` 上限移除逻辑沿用
   min(15, 槽位)），STEP 41 目录断言 14→15

**验证**：`BOOTTEST_PASS_P48_F0` ×3 连跑稳定（新增 STEP 43 全链路：牌组构成/黑桃
穿透参数/红桃吸血/方块必暴击 26.25 精确伤害/同花三条/JACKPOT 掉壳与档位递增/Joker
五结果逐一强制/耗尽自动重洗/击杀重洗/HUD 注入/新局重置）；浏览器实测：装备后赌场
左轮枪模与「♠ STREAK ×1」HUD 实时显示、开火弹药 5/6、Joker 慢动作翻牌
（timeScale 0.25）与「BAD BET · MISFIRE · 卡壳 1.2 秒」横幅反馈全部 captured。

### 商店展示架阻挡通行修复 + 交互入口收敛（用户指令）

**用户反馈**：① 商店两侧展示架挡路，翻滚被卡；② 交互入口必须收敛到商人 NPC
（`[E] 与商人交谈` 是唯一入口，展示架纯展示）。

**根因分析**（用户要求先查根因，不是只挪坐标）：
- **翻滚无独立碰撞**：`player.js` 翻滚位移直接调 `G.moveEntity`（与走路同一函数、
  同一圆形推挤），翻滚系统本身无罪，无需修改
- **真凶是碰撞场几何，摆放+碰撞体密度同时有问题**：旧布点离墙 1.15、碰撞 r=.34、
  间距 0.8 → 墙与架之间玩家中心可行带仅 0.11（不可通行）；相邻架间隙 0.12 <
  玩家直径 0.68 也穿不过；整条侧带成为一堵带 0.11 死缝的「碰撞墙」，
  翻滚速度 14 u/s 撞进双圆夹缝被来回推挤卡死

**修复**（build.js）：
- **贴墙重摆**：离墙 1.15→0.55（视觉底座几乎贴墙），间距 0.8→1.1
- **碰撞体与视觉分离**：r .34→.22（明显小于视觉底座半宽 .36；悬浮枪模/名牌/辉光
  本就不参与碰撞——碰撞只是 addProp 的圆形推挤体）
- **门禁感知布点**：收集房间四面墙的门 tile 中心（±1.75 禁放带），展示架永不堵门；
  一侧墙被门占去中段时自动减员，溢出名额顺延到北/南墙（避开柜台 ±1.7 与各自门带）
  ——实测一局西墙有门：西 3 + 东 7 + 北 4 = 14 全部放下
- **缝隙设计成「不可嵌入」**：间距 1.1 - 2×(.22+.36) < 0 → 玩家中心进不了相邻架
  之间的缝，从物理上杜绝卡死口袋（线性行两端全开放，无死角）
- **靠近增亮**（视觉反馈，非交互）：B.update 里玩家 2.1m 内辉光呼吸幅度增大

**交互收敛**：商人 interact label 改「与商人交谈」（提示渲染为 `[E] 与商人交谈`）；
展示架本就无 interact，保持唯一入口；#prompt 加轻微呼吸辉光动画（CSS）。

**验证**：
- 自测新增 **STEP 42_商店通行与翻滚**：架数 ≥12 / r≤.26 / 全部在墙带 / 距门 ≥1.2 /
  无交互入口 / 沿左墙行前方南北穿行 / 中央通道南北穿行 / 四向翻滚（贴架旁前滚 ≥2.2、
  中央滚 ≥2.6、斜向朝架被合理阻挡且不嵌入、贴架 0.59 处可正常启动）+ 稳定期无抖动，
  `BOOTTEST_PASS_P47_F0`
- 浏览器实测（真实 keydown/keyup 事件驱动）：中央通道 1.2s 走 6.1 格；朝架翻滚在
  距架 0.56 处合理停止；贴架 0.60 翻滚正常启动飞 5.45 格；贴架后行走顺畅；
  远离商人按 E 不开店、靠近出现 `[E] 与商人交谈`、按 E 开店且按住 W 玩家不动
  （世界冻结）、Esc 关闭后世界恢复

### 深夜 · 新增【武器商店系统】（用户指令）

**用户指令**：新增并完善完整武器商店系统——不是加个购买按钮，而是把商店真正接入
局内经济与构筑：可浏览全部武器、按等级定价、真实扣款给予、失败反馈、与随机地牢/Run
生命周期兼容。

**架构决策**：
- **新建 `js/shop.js`（248 行，第 15 个模块，加载顺序插在 weapons 之后 photo 之前）**：
  目录 UI（按品阶 D→A 分组网格 + 详情面板 + 与当前武器 ▲▼ 对比 + 程序化像素武器图标
  ×14）+ 购买事务 `S.buy(id)`（验金→扣款→`run.moneySpent` 记账→`giveWeapon`，
  `_busy` 原子旗 + 已持有复查防连点；失败一律给台词反馈，点击永不空操作）
- **统一定价单一来源放 `weapons.js`**：`W.TIER_PRICE`（D18/C40/B75/A130）× 特修系数
  （`def.price` 确定性映射 ±6%）= `W.priceOf(def)`，实测 D17/C39-42/B71-78/A122-138，
  跨阶零倒挂；商店模块**零复制武器属性**，目录直接遍历 `W.defs`
- **货架让位**：`items.shopStock` 移除武器位（原随机 1 把 ¥28-42 与目录两套标价冲突），
  货架只摆消耗品；柜台商人 interact 改为打开武器目录
- **房间陈列**（build.js）：两侧墙各 7 座武器展示架（品阶色发光枪模缓转悬浮+名牌，
  纯展示不可交互，几何按品阶 pgeo 缓存，B.update 呼吸动画）
- **主循环冻结**：`game.js frame` 在 `G.shop.isOpen()` 时跳过 update（渲染/相机照常）；
  Esc/E 关闭钩子；`startRun/descend/loseRun/winRun` 全链 `G.shop.close()`，局内购买
  状态不跨局泄漏；商店打开时准星隐藏（ui.js）

**踩坑记录**（防复发）：
1. shop.js 对象字面量里 `open:false` 与 `open(){}` 方法**重名**——close() 首次执行把
   方法覆盖成布尔，面板从此打不开且无报错；内部旗标改名 `_open` 解决
2. close() 在面板未构建时（STEP 01 startRun 即调）访问 `els.wrap` 抛 TypeError，
   级联炸掉 5 个自测步骤；补 `if(this.els.wrap)` 守卫
3. 购买按钮最初在「弹壳不足」态是空操作（无点击反馈）——浏览器实测发现；改为点击
   一律进 buy() 事务，由事务给出失败台词+卡片抖动
4. STEP 41 首版把 def 对象当 id 传给 `G.shop.priceOf` 返回 0——商店 API 的 priceOf
   只收 id，测试改传 id

**爆率/经济影响**：宝箱/祭坛/旅行者掉武器的概率逻辑零改动；一层收入约 60-120 弹壳 →
C 阶第一层可负担、B 阶需取舍、A 阶≈第二层一次性大件，配合 2 武器槽形成构筑取舍。

**验证**：`BOOTTEST_PASS_P46_F0`（新增 STEP 41：目录 14 把/定价不倒挂/真实购买扣款/
电弧链特效随购买生效/余额不足不扣款/已持有拒绝/连点一次成交/新局重置/随机店位）；
浏览器实测（HTTP 127.0.0.1:8123 + 截图）：商店房陈列渲染 ✓、目录面板 14 卡片+对比
▲▼ ✓、点击购买扣款 160→30 且 rail 入池满弹匣 ✓、余额不足反馈 ✓、Esc 关闭 ✓、
新局随机店位/随机库存 ✓。

### 深夜 · 删除三把低价值武器（用户指令）

**用户指令**：「回旋刃枪，地狱喷灯，环星刃环这几个武器太鸡肋了，删掉吧」——
即 **回旋刃轮（boomer）/ 地狱喷灯（flame）/ 环星刃环（orbit）**，武器 17→14 种。

**改动**：
| 文件 | 内容 |
|---|---|
| `js/weapons.js`（396→333 行） | 删 3 条定义与品阶项；删 orbit 生成分支（原 88-100）、公转更新分支（原 216-248）、回旋镖分支（原 262-274）；kind 映射 / 球形弹判定 / 弹墙旋转 / 自转 / 拖尾条件同步清理；弹丸池移除 `retPhase / orbitAng / orbitRad / hitCd` 字段 |
| `js/player.js`（974→965 行） | 删喷火器枪口锥形火焰束分支（原 510-518）。⚠️ player.js 的 `orbits` 是 VOID HUNTER 悬浮能量碎片，与环星刃环无关，**未动** |
| `js/main.js`（1333→1317 行） | STEP 04c 删星刃段，改名「04c_新武器电弧链」（保留电弧链断言，**步骤总数不变**） |
| `index.html` | weapons.js / main.js → `?v=7`，player.js → `?v=8`（防缓存） |

**保留辨析**（防误删）：`audio.js` 的 `boomer` 音效被敌人复用（`enemies.js:769`）；
`core.js` / `build.js` 的 `flame` 全部是火把贴图/粒子；STEP 21 长按连发不涉及这三把；
STEP 04 全武器发射为动态遍历 `W.defs`，自动适配。

**爆率影响**：B 阶池 6→4（阶内均匀 1/4），A 阶池 7→6（1/6）；宝箱/商店/祭坛概率逻辑零改动。

**验证**：`BOOTTEST_PASS_P45_F0`（STEP 04 显示「14种武器全部发射成功」）。
**文档同步**：计数 17→14、武器相关行号重定位、BUG-010 随武器删除失效
（移入 BUG_HISTORY 作关闭记录）。

### 深夜 · 文档欠账集中补同步（接手会话自检发现）

**背景**：拍立得批次（提交 `878266e`）当时只补写了本日志，未按 AGENTS.md 规则 7/8
同步 `ARCHITECTURE` / `GAME_SYSTEMS` / `PROJECT_STATUS`；自测步数 44→45 也未更新。
本会话接手时按「先读文档再动代码」流程实跑自测发现欠账，集中补齐（纯文档改动，代码零修改）。

**做的事**：
- 「当前状态」自测计数 44→45 全量修正（AGENTS.md §0/§7、PROJECT_STATUS、PROCEDURES、
  ARCHITECTURE）。口径说明：`P45` 是 title 的**断言条数**（40 个命名步骤，
  其中步骤 04/06/25/27 各含 1-2 条无前缀子断言，共 45 条）；历史条目与旧快照
  描述中的 P44 保留原貌不改
- `AGENTS.md`：§0 代码量 13→14 个文件、约 6000→7000 行；§1 硬约束 4 加载顺序补 `photo`
- `ARCHITECTURE.md`：模块树补 `photo.js`（336 行）并刷新全部模块行数（player 974 /
  main 1333 / enemies 779 等）；§3.1 加载链补 photo（与 enemies/boss 为运行时互调）；
  §5.1/5.2 主循环与 update 顺序按当前代码重校（frame 实为 437-460，
  `G.photo.update` 在 game.js:369、build 之后 fx 之前）；§8/§9.5 行号与常量表同步
- `GAME_SYSTEMS.md`：**新增 §2.4 拍立得武器系统**（fire→冻结→缓冲→×2 结算→碎裂
  全链路 + 集成点行号）；§1.0 补彩虹配色转正说明、节点层级去 armL、枪身顶点色涂装
  警告；§1.1 字段区间修正为 player.js:306-325、refs 补 cam*；§2.1/2.2 更新为
  17 种武器并把 weapons.js 机制行号全部重新定位（+9 行导致旧表全漂移）；
  §4.5 补照片碎裂分支；§5.2/5.4、主循环相关行号校正
- `HIGH_RISK_AREAS.md`：新增 **H24 照片状态与受击闪白的双键位契约**
  （`_pm0`/`_om` 独立备份、clearFlash 必须先行、照片态不再进闪白）+ 索引行
- `PROJECT_STATUS.md`：拍立得武器/照片碎裂/Boss 兼容/外观转正入「已完成」；
  模块数 13→14；「当前工作」段更新至拍立得批次

**验证**：`BOOTTEST_PASS_P45_F0`（1280×720 与 1280×860 两种窗口尺寸实测均通过，
确认 PROCEDURES 现有命令无需修改——860 是 STEP 34 的历史个案，非通用要求）。

### 20:08–22:15 · 新增原创武器【薛定谔的拍立得】+ 角色外观修正（用户指令序列）

> ⚠️ 本条目为 2026-09-01 次日补记（当时漏写日志），时间线依据提交 `878266e`（22:15:40）
> 与会话记录反推。

**用户指令**：① 新增完整原创武器【薛定谔的拍立得】——中距离爆发控制武器：复古双反
相机外形（黄铜/皮革/黑金属/双镜头/快门/发条），按下开火经四段动画（光积累→快门合拢→
闪光释放→发条上弦）释放 72° 扇形摄影闪光，被拍中的敌人和敌方弹幕进入"照片状态"，
冻结期伤害记入缓冲、2 秒后放大结算，致死碎裂成照片碎片；② 移除角色左手的枪建模
（实为副手手臂 armL）；③ 「左手还是一根长棍」多轮排查后改为改涂装。

**新增 `js/photo.js`（336 行，独立模块，头部职责清单禁止逻辑散回其他模块）**：
- `fire()`：72°（cone 1.25 rad）扇形摄影闪光 AOE，range 7.5，含墙体遮挡判定，
  命中敌人 + 敌方弹幕 + Boss
- `shoot()/record()`：目标进入 PHOTO_STATE——换灰调旧相纸材质（Lambert，关顶点色）+
  相纸相框（Canvas 贴图：白边挖空内芯 + 胶片颗粒）+ 被拍中的"透出"效果；冻结 2.0s
  （AI/移动/攻击全停）
- DamageBuffer：冻结期受到的伤害全部记入缓冲、不扣真实 HP；2s 后「照片冲洗」演出
  （RESOLVE .3s）→ 缓冲 ×2 一次性结算（`beginResolve/applyResolve`）
- `freezeBullet()/unfreezeBullet()`：敌方弹幕真冻结——暂停位置积分而不销毁重建，
  解冻后恢复原速原向
- `shatter()`：致死结算 → 敌人碎裂成照片纸片（对象池，纸片物理飘落）
- `reset()`：清场复位（材质换装还原 + 相框/碎片/扇光回收）

**武器属性**（weapons.js）：tier A，dmg 6 / rate 0.55 / mag 4 / reload 1.7 /
price 56，`polaroid:true` 走独立开火分流 `G.photo.fire()`。

**集成改动**：`enemies.js`（照片状态进入/退出、伤害改记缓冲、致死走碎裂）、
`boss.js`（同上，Boss 兼容）、`fx.js`（扇光/冲洗演出/伤害数字）、`audio.js`
（快门等音效）、`game.js`（reset 链路）、`index.html`（挂 photo.js，全部 script
加 `?v=N` 版本参数防浏览器缓存假死）。

**角色外观修正（同提交）**：
- 移除副手手臂 armL：模块级几何变量、几何构建、组创建挂载、refs、摆动动画共 6 处清理
- 「黑棍」排查（重要教训，防复发）：先后误判为披风（误删已恢复）、平行光影子
  （castShadow=false 修正保留）——均被用户否定；最终定位＝**普通武器枪身建模
  gunMesh**：`updateGunVisual` 每次装备武器把 `gunMesh.material` 重置为
  `pmats().mech`（vertexColors:true 管线），覆盖创建时的赋色，而 `_gunGeo` 顶点色
  近黑 0x14161c。**修复＝涂装直接烘焙进顶点色**（橙身 0xff8830/紫管弹匣 0xc050ff/
  金口瞄具 0xffd23e/青能量条 0x50e8ff），材质保持 pmats().mech 兼容死亡消散淡出
- 角色彩虹纯色配色转正（用户选定外观）：躯干红/头绿/左腿黄/右腿青/右臂紫/披风蓝/
  能量碎片白；纯色材质兼容受击闪白 traverse 机制

**验证**：自测新增 STEP 40（拍立得机制：冻结/缓冲累积/弹幕冻结恢复/碎裂/演出）全绿；
STEP 34 曾因无头窗口过小断言失败，1280×860 下通过。全程踩坑：浏览器缓存旧 JS 造成
「改了没变化」假象 → 版本参数方案。

**文档同步**：当时漏写本日志（已按本条补记）；`AGENTS.md` 目录树 js 模块数
在次日仓库整理时顺带修正 13→14。

**提交**：`878266e`（10 files，+651/−51，新增 js/photo.js）。

### 晚间 · 仓库整理：自测快照归档至 snapshots/（用户指令）

**用户指令**：「7个bt_*.html统一整理好，有点乱」。

**做的事**：
- 7 个自测快照 `bt_gb1/gf/gg2/gg3/bugfix/vex07/voidhunter.html` 经 `git mv` 从根目录
  归档至 `snapshots/`（git 识别为 rename，历史保留；快照内容零改动）
- 同步更新：`AGENTS.md`（规则 9、目录树）、`docs/PROCEDURES.md` §7；目录树顺带修正
  js 模块数 13→14（`js/photo.js` 已入库但文档漏更）
- 说明：快照内 `<script src>` 为根目录相对路径，归档后仅作历史凭证、不可直接打开重放；
  测试日志内嵌于 HTML 的 `#errlog`，凭证价值不变

### 17:10–17:40 · 主角二次重做：「VOID HUNTER · 虚空猎手」（用户指令）

**用户指令**：将玩家角色替换为高质量视觉表现的原创 Roguelike 顶视角角色——
"虚空猎手"风格：深黑/深灰装甲、冷蓝/紫能量、半覆盖面罩、短款动态披风、悬浮能量碎片。

**改动**：
| 文件 | 内容 |
|---|---|
| `js/player.js`（710→826 行） | ① 造型全面重做：半覆盖盔壳+前伸面檐+发光目镜缝 / 修长胸甲+竖条能量核心 / 悬置肩甲+金属前缘刃 / 背包双能量罐 / **短款三段链式披风**（轴枢在段顶端，递延摆动+移动惯性侧摆）/ 3 片悬浮能量碎片（绕身公转，移动加速）② **玩家专用 5 层 MeshStandardMaterial**（`pmats()`：哑光装甲/半金属/亮边缘/布料/发光能量；模块级单例，绝不碰共享材质 H7）③ 能量脉动状态机：待机呼吸→移动增强→受击爆发→翻滚/技能/幽灵态覆盖；辉光 sprite 与 emissive 同步 ④ 移动能量拖尾（克制数量）⑤ **死亡演出**：能量失控闪烁→爆发（burst/ring/light）→专用材质整体淡出+碎片上升→1.8s 隐藏；`resetPmats()` 在 createPlayer 复位 opacity ⑥ 受击反馈改为蓝紫能量火花（替代血粒子）⑦ 全部玩家特效色青→蓝紫 |
| `js/main.js`（步骤 31） | 翻滚辉光颜色断言随配色同步：青色判定 → 蓝紫判定（b>.85 && b>g && r<g） |

**保持不变（红线）**：forward=+X 朝向链路（H23）、`mesh.rotation.y=-face`、
muzzle 计算、翻滚/移动/射击/换弹/交互逻辑、受击闪白 traverse 机制、refs 关键字段
（glow/head/body/gunMesh 等；新增 capeSeg/orbits）。

**验证**：`BOOTTEST_PASS_P44_F0`（44 通过 / 0 失败）；
特写探针 4 视角（正/侧/背/真实俯视角）截图确认造型、材质层次、能量色相与顶视角可读性；
`?shot=2` 第二层渲染冒烟正常（角色在冷色环境中依旧醒目）。
快照存为 `bt_voidhunter.html`。

**踩坑记录**：能量件 emissive 初版强度 1.55 在 ACES 色调映射下过曝发白，两轮调参
（emissive 0x2c40e8 + 强度 0.85）后保留蓝紫色相——"能量区域负责视觉焦点"而非"整团白"。

**文档同步**：`GAME_SYSTEMS.md`（1.0 节全面改写）、`PROJECT_STATUS.md`（玩家章节/当前工作）、
`AGENTS.md`（快照列表+自测状态行）、`ARCHITECTURE.md`（player.js 826 行）、
`HIGH_RISK_AREAS.md` H23（标题补 VOID HUNTER，约定正文不变）。

### 16:45–16:55 · 建立 git 版本控制（用户指令）

**用户指令**：「进行git管理」。

**做的事**：
1. `git init`（仓库建于项目根目录 `D:\game\tingjindilao`）
2. 新增 `.gitignore`：排除 `.workbuddy/`（WorkBuddy 工具私有记忆，会被工具自动覆盖）、
   `.tmp_probe/`（临时探针）、系统垃圾与编辑器目录；`bt_*.html` 快照**入库**
3. 初始提交 `fa68394`：31 个文件 / 10832 行（游戏本体 + docs/ 全套 + 6 个 bt 快照 + AGENTS.md）

**验证**：`git status` 工作区干净；`git log` 确认提交作者为 Mu An。

**文档同步**：`AGENTS.md`（§0 版本控制行、§3 规则 9、§6 目录树）、`PROCEDURES.md`
（§7 改写为「版本控制注意事项」）、`PROJECT_STATUS.md`（后续方向第 3 条标记完成）、
`BUG_HISTORY.md` / `DEVELOPMENT_LOG.md`（顶部「无 git」说明改为「git 建立前的历史系反推」；
正文历史记录保留原貌）。

**约定**：此后每次改动 → 自测通过 → 再提交；大手术前打 tag。

### 16:20–16:30 · 主角 VEX-07 视觉重做 + 朝向系统修复（FIX-024）

**用户指令**：优化游戏主角的视觉表现和朝向系统——角色建模不够精致、
面部/身体正前方未正确朝向鼠标世界方向。

**改动**：
| 文件 | 内容 |
|---|---|
| `js/player.js` | 主角重做为「VEX-07 · 深渊行者」：全覆式头盔+发光目镜条（正面 +X）/ 胸甲能量核心 / 肩甲肩刺 / 背包天线能量罐 / 橙红披风 / 持枪臂+扶枪副手 / 枪械挂在手臂上（后坐力联动整条手臂）；随身青白光 + 蓝色 rim 轮廓光 + 目镜辉光 sprite；**模型 forward=+X，根节点 `rotation.y=-face`，无魔法角度**。修复辉光挂载父节点（挂 `rollG` 会整体抬高 0.55 → 挂 `bodyG`） |
| `js/game.js` | **FIX-024**：瞄准射线与 y=0.55 平面求交加 `isFinite` 守卫——相机未俯视时（开局首帧）`direction.y=0` → `t=Infinity` → `0*Infinity=NaN` 永久污染 camX/相机矩阵/角色朝向 |
| `js/main.js`（约 1212→1255 行） | 新增自测步骤 39_角色朝向系统回归（43→44 步） |

**验证**：`BOOTTEST_PASS_P44_F0`（44 通过 / 0 失败）。
步骤 39 四段断言：① 8 方向瞄准收敛（face/mesh 同步/枪口位置）② 180° 大转身平滑性
③ 射线 NaN 守卫（相机水平+鼠标正中心）④ 目镜辉光贴头部（<0.5）。
另做角色特写探针（4 视角 + +X/-X 对比 + 红杆标记）确认 forward=+X 与建模渲染正确；
游戏内截图冒烟正常。快照存为 `bt_vex07.html`。

**踩坑记录（重要）**：
1. 辉光/随身光坐标是 body 空间（`bodyG` 原点即世界脚底），挂到 `rollG` 会整体抬高 0.55。
2. 无头验证相机关：相机 `position.set(0,0,0)` 水平朝向 + 鼠标在屏幕正中心像素，
   是瞄准射线 NaN 的唯一天然触发点（真实开局第 1 帧可复现）。

**副作用评估**：改了 `mkPlayerMesh` 的节点结构（bodyG 子节点清单），但 `refs`
对外暴露的字段名未变（`body/torso/head/legL/legR/cape/armR/armL/gun/gunMesh/glow/light`），
武器/动画/特效消费方无感知；`updateCamera` 仅加守卫跳过非法帧，正常路径未动。

**文档同步**：`AGENTS.md`（44 步、bt_vex07.html）、`PROJECT_STATUS.md`（玩家章节
+当前工作）、`BUG_HISTORY.md`（FIX-024）、本日志。

### 14:10–14:35 · Bug 修复批次：BUG-001（P0）/ 002 / 003 / 005 / 006（FIX-019~023）

**用户指令**：把已知的重要 Bug 修好。

**改动**：
| 文件 | 内容 |
|---|---|
| `js/weapons.js`（378→387 行） | **FIX-019（P0）**：5 处 Boss 伤害判定统一改为 `const boss=G.boss&&G.boss.active;`（原把模块对象当实例，距离 NaN，玩家打不到 Boss） |
| `js/player.js`（542→554 行） | **FIX-020**：切枪时清旧武器 `burstLeft/burstT`；**FIX-021**：Digit1/2 直选槽位、滚轮按方向循环 |
| `js/gen.js`（466→478 行） | **FIX-022**：`moveEntity` 道具推出后回检墙体，非法则回退推出前坐标 |
| `js/audio.js`（145→146 行） | **FIX-023**：补 `muted` 字段并在 `sfx()`/`music()` 入口读取 |
| `js/main.js`（1122→1212 行） | 新增自测步骤 35~38（修复回归锁） |

**不修的**：BUG-004（碰撞扫掠，潜在风险，改动主移动路径风险大）、
BUG-007（子弹池满静默失败，修法需设计决策）——均已在 `KNOWN_ISSUES.md` 写明暂不修的原因。

**验证**：`BOOTTEST_PASS_P43_F0`（43 通过 / 0 失败，43 步 = 原 39 步 + 4 个新回归锁）；
另做 `?shot=2` 截图冒烟，第二层渲染正常。
快照存为 `bt_bugfix.html`。

**踩坑记录（重要）**：步骤 35 首两版失败——Boss 处于 `intro`（出场演出）状态时
`B.hurt` **直接免伤**（`boss.js` 的 `if(...|| b.state==='intro') return;`），
测试必须把 Boss 状态置为 `cool`。已写入 `BUG_HISTORY.md` FIX-019 与 `HIGH_RISK_AREAS.md` H9。

**副作用评估**：FIX-022 改了全实体共用的 `moveEntity`（高危区 H17 邻接），
但仅新增"推出后回检、非法回退"，分轴碰撞主路径未动；既有步骤 22/25b（掩体卡模、
卡墙自愈）全部通过，行为兼容。

**文档同步**：`AGENTS.md`（P0 章节改为已修复、43 步、bt_bugfix.html）、
`KNOWN_ISSUES.md`（P0 清零）、`BUG_HISTORY.md`（FIX-019~023）、
`PROJECT_STATUS.md`、`PROCEDURES.md`（43 步分组）、`ARCHITECTURE.md`（行数）、
`GAME_SYSTEMS.md` / `HIGH_RISK_AREAS.md`（H9 已修复）。

### 14:00–14:10 · 第二次文档复审（独立复核，未改任何游戏代码）

**背景**：用户要求对文档体系做完整审计。本次是继 12:56–13:58 建档之后
由新会话独立复核，逐项对照实际代码验证文档内容。

**验证方式与结果**：
- 逐行核对了 `boss.js` / `weapons.js` / `player.js` / `enemies.js` / `core.js` / `gen.js` /
  `game.js` / `build.js` / `main.js` 的关键声明（常量、行号、注释原文、加载顺序、对象池容量）
- 实跑 39 步自测（无头 Chrome）：**BOOTTEST_PASS_P39_F0**（39 通过 / 0 失败），与文档记载一致
- P0（BUG-001）复核确认：`B` 仅暴露 `active/spawn/clear/hurt/update/pickAttack`，
  `G.boss.x/.z/.r/.spawnT` 确为 `undefined`，文档描述与代码完全相符
- `D:\game\bullet-abyss` 平行分支复核确认存在，模块划分与记载一致，最后修改 11:19 属实

**发现的文档问题（已全部修正）**：
1. `PROCEDURES.md` §3.3 步骤分组表漏列 07 / 15 / 31 三步 → 已补齐并附完整编号清单
2. `HIGH_RISK_AREAS.md` 顶部速查表只列到 H15，正文实际有 H22 → 已补齐 H16–H22
3. 本日志上一条写「审计 12:56–13:30」，但实际文件 mtime 为 13:46–13:58 → 修正为「12:56–13:58」

**游戏代码改动**：**无**（遵守"不为文档而改游戏"原则）。

### 12:56–13:58 · 文档审计与项目上下文体系建立（首次建档）

**背景**：用户准备让项目进入长期、多 Agent、跨对话持续开发状态，
需要一套可靠的 Agent 交接文档。

**审计结论**：
- 项目中**不存在**任何 `AGENTS.md` / `CLAUDE.md` / `README.md` / `docs/` / 开发日志 / Bug 记录
- 唯一接近"项目总上下文"的文件是 `.workbuddy/memory/MEMORY.md`，
  但它位于 WorkBuddy 工具的隐藏记忆目录，**其他 Agent 不会读取**，且会被工具自动覆盖
- 无 git、无版本控制
- `bt_*.html` 四个快照内容**完全一致**（都是 39 PASS），不携带演化信息

**做的事**：
1. 13 个模块**全部逐行通读**（约 5900 行），跨模块引用用 grep 核实
2. 建立文档体系：`AGENTS.md` + `docs/` 下 7 篇
3. 建立无头验证链路（不需要装任何 npm 包）
4. **实证发现 P0 级 Bug**：玩家无法对 Boss 造成任何伤害（详见 `KNOWN_ISSUES.md` BUG-001）

**代码改动**：**无**。本次只新增文档。

---

### 12:22 · 39 步自测全部通过（快照留存）

四个快照 `bt_gb1.html` / `bt_gf.html` / `bt_gg2.html` / `bt_gg3.html`，
均为 `BOOTTEST_PASS_P39_F0`，内容完全一致。
文件名疑似对应不同的修复尝试（gb=guardbreak 相关），但最终都收敛到全绿。

### 12:17–12:23 · 当日最后一批修复（顺序按文件 mtime 推断）

| 时间 | 文件 | 内容 |
|---|---|---|
| 12:17 | `enemies.js` | 盾卫破防机制收尾 |
| 12:18 | `fx.js` | |
| 12:19 | `build.js` / `player.js` | 320p 文字精灵 + 标签挂载修复 |
| 12:20 | `index.html` | HUD 字号增大 |
| 12:23 | `main.js` | 新增步骤 34（文字清晰度与标签修复） |
| 12:25 | `shot_probe.html` | 截图探针 |

#### 修复 1：盾卫破防（`enemies.js`）
正面连续（实为累计）格挡 5 次后进入 2.5 秒 `guardbreak` 踉跄状态：
不格挡 / 不移动 / 不转身；普通武器可正面击杀；转身速率降至 2.6 可绕背；
爆炸伤害无视格挡。

#### 修复 2：文字清晰度（240p → 320p）
三处同时改：渲染分辨率 320p（`main.js:50`）、`textSprite` 改 128×32 高分辨率画布 +
黑描边 + 底衬（`build.js:38`）、HUD 字号增大 10 处。

#### 修复 3：武器拾取物标签跟随（`player.js:502`）
标签改挂载到拾取物组，修复滞留世界原点的问题。

#### 修复 4：彻底移除「25 秒保底清敌」
改为房间锁定 30 秒后**仅文字提示**剩余敌人数；
卡墙敌人的 0.8 秒自愈机制保留。

### 11:42–11:50 · 地牢与流程层

`gen.js`（11:42）→ `weapons.js`（11:49）→ `game.js`（11:50）。
从自测用例反推，这批工作包含：掩体卡模软锁（步骤 22）、
邪术师召唤物归属（步骤 23）、慢节奏战斗误清（步骤 25）。

### 01:11 · `ui.js` / 更早批次

`ui.js`（Sep 1 01:11）、`boss.js`（Aug 31 22:27）、`core.js`/`audio.js`/`items.js`（Aug 31 21:34–21:36）。
项目主体在 8/31 晚 ~ 9/1 凌晨完成第一版。

---

## 时间未知（从代码注释与回归用例反推）

以下改动**能确定发生过**（有代码注释或回归用例为证），
但**无法确定具体时间**：

| 改动 | 证据 |
|---|---|
| 全武器改长按连发（原左轮/霰弹为半自动） | `player.js:168` 注释 + 步骤 21 |
| 索敌距离 9 → 11 格（蘑菇） | 步骤 32 注释「原 9 格太短」 |
| 房间 tile 尺寸扩容到 15×11 | `gen.js:4` 注释「加大房间改善战斗空间」+ 步骤 01 断言 |
| 翻桌朝向修正 | `build.js:412` 注释 + 步骤 12 |
| 售货员重新摆位（原被墙遮挡） | `build.js:440` 注释 + 步骤 27 |
| 满血买红心改扩容上限 | `build.js:689` 注释 + 步骤 27b |
| 小地图动态缩放（原只有边框） | `ui.js:121` 注释 + 步骤 28 |
| 敌人头顶标记移除（视觉污染） | 步骤 24 |
| 输入缓冲 0.18s（顿帧不吞按键） | `core.js:191` 注释 + 步骤 30 |
| 盾卫转向速率降至 2.6 | `enemies.js:354-355` 注释 |
| 孤岛 Boss 房回滚机制 | `gen.js:124` 注释 + 步骤 33 |
| 卡墙敌人 0.8 秒自愈 | `enemies.js:276` 注释 + 步骤 25b |

---

## 平行分支：`D:\game\bullet-abyss`

| 项 | 内容 |
|---|---|
| 名称 | 「弹渊 BULLET ABYSS」 |
| 最后修改 | 2026-09-01 11:19 |
| 模块划分 | `core / data / ent / gfx / gen / ui / boss / main`，**与本项目完全不同** |
| 附带 | `serve.js`（本地静态服务器）、`启动游戏.bat` |
| 关系 | 同题材的**独立平行分支**，与本项目无代码引用关系 |

**注意**：
- 不要在其中做修改（除非用户明确要求）
- 不要混用两边的实现
- 若需要恢复某段被删掉的历史实现，那个目录是唯一的参考来源

**为什么会有两个分支**：原因未知（未见任何记录或注释说明）。

---

## 记录规范（后续 Agent 请遵守）

每次实质性改动后，在**本文件顶部**追加：

```
## YYYY-MM-DD HH:MM · 一句话标题

**改动**：改了什么、在哪些文件哪些位置
**原因**：为什么改
**验证**：BOOTTEST_PASS_P<n>_F<n> 的实际输出
**副作用**：影响了哪些系统
**未决**：还有什么没做
```

要求：
- 修复 Bug → 同步写入 `BUG_HISTORY.md`
- 发现新 Bug 未修 → 同步写入 `KNOWN_ISSUES.md`
- 架构变化 → 同步更新 `ARCHITECTURE.md`
- **禁止把"计划"写成"已完成"**
