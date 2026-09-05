# AGENTS.md — 第九层事故 BULLET DEPTHS · Agent 总入口

> **任何 Agent / 模型 / 会话接手本项目时，第一个要读的文件就是这一个。**
> 读完本文件后，再根据任务类型去 `docs/` 读对应的详细文档。
> 本文件只放「必须立刻知道、记错了就要出事」的内容；细节一律在 `docs/`。

---

## 0. 三十秒速览

| 项 | 值 |
|---|---|
| 项目 | 类 Enter the Gungeon 的房间制弹幕地牢，Three.js 低多边形 3D + 320p 像素风 |
| 路径 | `D:\game\tingjindilao` |
| 技术栈 | 原生 JavaScript（ES5/ES6 混写），**无构建工具、无 npm、无 package.json** |
| 依赖 | 只有一个：本地 `lib/three.min.js`（已 vendored） |
| 运行 | 直接双击 `index.html`，`file://` 协议即可，**不需要起服务器** |
| 代码量 | `js/` 下 22 个文件，约 14500 行 |
| 自测 | `index.html?boottest`，69 步，结果写进 `document.title` 与页面底部 `#errlog` |
| 当前自测状态 | **69 PASS / 0 FAIL**（2026-09-05 实测，含第四层特殊房间内容悬空根治（takeSpecial 统一 shape='rect'，商店/宝箱/献祭/赌博 206 处悬空清零）+粒子残留光点修复+第四层桥梁加宽 bug 根治+第四层「失序维度」专属生成器+主题+流转+layBridge BFS 重写+hookToLinked 兜底+STEP 72/73，含 BUG-001 修复、主角重做回归、拍立得/武器商店/赌徒的灾难/解锁与词缀/第三层与无面君主/第三层新怪/基地系统/武器批次（纸飞机/吹风机/点唱机/悖论骰子重做）/音频系统 2.0/三合一改动（吹风机增强+删除切割刀·太阳左轮+点唱机网络重构）/删除敌人批次（Wallmaker·猎犬下架）/基地视觉重制 2.0/基地扩展批次/基地反馈批次/基地微调批次/基地核心护栏拆除·外墙恢复·标题菜单重做/局外成长轨道A·B·C/被动道具池扩充（9新被动·品质图鉴·战斗掉落）/新敌人批次（6种机制型敌人：环形放射者·地雷工兵·引力眼球·指挥官·镜面反射者·相位潜行者）/基地世界标签防重叠/基地战利品墙删除·菜单重做（删枪加怪·改名第九层事故·标题字体游戏风格化）/改名第九层事故·菜单小怪 8 只环形列队（缩 30% + 新增 4 种）/基地点唱机 Script error 根治（训练靶命中计数 `_hitsTag.el` undefined → build.js damageProp 抛 TypeError，file:// 下呈 Script error；_dropBeam GPU 泄漏同步修复；STEP 69 训练靶命中回归）·新敌人拟态怪 Mimic（伪装宝箱·靠近/互动/受击揭示·扑击·扇形弹）·菜单金色标题·弹幕真实化·全场景走位（弹丸复刻局内·转向平滑·瞄准分离）·新敌人批次（8 种机制型：挖掘者·跳跃者·路障蛮兵·橄榄球狂徒·小丑·阵型指挥者·磁铁怪·气球怨灵；weapons.js b.aj/b.am 标志+Jester 偏转+Magnetron 磁吸；STEP 71 回归）·基地世界标签穿模修复（buildFloor 补清 tagLayer，基地文字不再叠加到地牢）·地牢偶发 Script error 根治（main.js log 未暴露全局致 RENDER-FAIL 兜底失效并反成 Script error；log 暴露 + 主循环 UPDATE-FAIL 兜底 + 子系统 G._trace + onerror 上下文增强）·A+B 美术试点终止（地板贴图两次方案被否，已完全回退棋盘基线）·敌人建模强化试点（gunner 已按用户反馈恢复原版；charger/shroom/beetle 保留强化；点唱机单发 dmg 4→9、射速 1.8→3.6）） |
| 版本控制 | **git 已建立**（2026-09-01 初始提交 `fa68394`；此前历史无提交记录，靠 bt 快照与文档留痕） |

---

## 1. 不可违反的硬约束

这些是项目的结构性前提，违反任何一条都会直接破坏项目：

1. **零外部依赖**。不得引入任何 npm 包、CDN、外链、在线字体、在线音频、远程图片。
   项目必须能在完全断网的机器上双击打开就跑。
2. **无构建步骤**。没有 `npm run`、没有打包、没有 TypeScript、没有模块打包器。
   代码必须是浏览器直接可执行的原始 JS。
3. **`file://` 必须可用**。所有资源路径必须是相对路径，不得使用需要 HTTP 服务器的特性
   （`fetch` 本地文件、`ES Module` 的 CORS、`XHR` 等一律不可用）。
4. **加载顺序即依赖顺序**。`index.html` 里 `<script>` 的先后顺序定义了模块依赖关系，
   **不得调整顺序**，也不得改用 `type="module"`（会破坏 `file://` 可用性）。
   顺序：`core → audio → fx → ui → items → weapons → jukebox → dice → shop → photo → gambler → meta → base → enemies → boss → voidking → voidripper → gen → gen4 → build → player → game → main` |
5. **注释使用简体中文**。
6. **最小改动原则**。只改被明确要求改的东西，不做顺手重构、不删「看起来没用」的代码、
   不加没被要求的功能。本项目有大量的「看起来是 bug 其实是设计」的地方。

---

## 2. 改动前必读

按任务类型选择：

| 你要做的事 | 先读这个 |
|---|---|
| 第一次接手 / 想整体了解 | 本文件 → `docs/ARCHITECTURE.md` |
| 改任何具体玩法系统 | `docs/GAME_SYSTEMS.md` |
| **动任何一行代码之前** | `docs/HIGH_RISK_AREAS.md`（**最重要，必读**） |
| 遇到奇怪行为，怀疑是历史遗留 | `docs/BUG_HISTORY.md` |
| 想知道现在还有什么没修 | `docs/KNOWN_ISSUES.md` |
| 想知道做到了哪一步 | `docs/PROJECT_STATUS.md` |
| 想知道接下来往哪做（商业化路线 / 愿景 / 任务清单） | `docs/PRODUCTION_ROADMAP.md` |
| 要跑测试 / 验证改动 | `docs/PROCEDURES.md` |
| 想了解项目怎么走到今天的 | `docs/DEVELOPMENT_LOG.md` |

---

## 3. 工作规则（必须遵守）

1. **先读文档，再读代码，最后才改**。不要凭文件名和惯常模式猜实现，本项目反直觉的地方很多。
2. **改动前确认系统间的隐式依赖**。全局命名空间 `G` 上的东西被多处共享，
   改一个字段前必须 grep 全部引用点。
3. **每次改动后必须实跑自测**，见 `docs/PROCEDURES.md` 的命令。
4. **不得仅以「没报错」「看起来能跑」作为测试通过**。必须给出 `BOOTTEST_PASS_P<n>_F<n>`
   的实际输出。
5. **重要修改必须追加 `docs/DEVELOPMENT_LOG.md`**。
6. **发现 Bug 且本次不修，必须记进 `docs/KNOWN_ISSUES.md`**；修好了就移到 `docs/BUG_HISTORY.md`。
7. **架构变化必须同步更新 `docs/ARCHITECTURE.md`**，不允许文档与代码长期失同步。
8. **禁止把「计划」写成「已完成」**。`docs/PROJECT_STATUS.md` 里三态必须分清：
   已完成 / 部分完成 / 计划中。
9. **不要删除 `snapshots/bt_*.html`**。它们是历次自测通过的完整页面快照（测试日志内嵌于
   HTML 的 `#errlog`），是本项目**git 建立之前**唯一的历史凭证。（2026-09-01 已从根目录
   归档至 `snapshots/`；快照内 script 引用为根目录相对路径，归档后仅作凭证，不可直接打开重放）
10. **不要清理 `.workbuddy/`**。那是 WorkBuddy 工具自身的记忆目录，不是项目文档，
    但里面有历史上下文，删了不可恢复。

---

## 4. 六条最高危红线（详见 `docs/HIGH_RISK_AREAS.md`）

改到这些地方之前，请务必先读完对应章节：

| # | 红线 | 误改后果 |
|---|---|---|
| 1 | **不得给玩家加任何「整房超时自动清场」** | 会摧毁慢节奏战斗（绕后盾卫、躲激光），历史 Bug 复发 |
| 2 | **不得给 `build.js` 的 `pgeo()` 缓存几何加 `userData.disposable` 标记** | 进入第二层时所有道具/火把集体消失 |
| 3 | **不得改动 `G.hurtEnemy(e,dmg,ang,knock,ignoreBlock)` 的参数个数或顺序** | 盾卫格挡行为静默反转，无任何报错 |
| 4 | **不得调整 `game.js` 中 `update()` 的更新顺序** | 命中判定错位一帧、清剿延迟、增援波错乱 |
| 5 | **不得修改门的 4-tile 结构（`gen.js` 的 `door.tiles`）** | 门位置、闸门朝向、隐藏墙朝向同时错乱 |
| 6 | **boss.js 分发到 voidking 时必须同步 `this.active`**（spawn / dying 结束 / clear 三处都要与 `G.voidking.active` 对齐） | 武器/爆炸伤害判定全走 `G.boss.active`，不同步则新 Boss 免疫一切玩家伤害且无任何报错（BUG-001 同类陷阱） |

---

## 5. 曾经最严重的问题（已于 2026-09-01 修复）

> ### ✅ BUG-001（P0）：玩家无法对 Boss 造成任何伤害 —— 已修复
>
> 原因：`weapons.js` 中 5 处 Boss 伤害判定把 `G.boss`（模块对象
> `B = { active, spawn(), update(), hurt(), clear() }`）当成了 Boss 实例，
> 实际实例在 `G.boss.active` 上，导致 `x/z/r/spawnT` 全是 `undefined`、距离为 `NaN`，
> 子弹/爆炸/环绕刃/电弧链/追踪弹全部打不到 Boss，游戏无法通关。
>
> 修复：5 处统一改为 `const boss = G.boss && G.boss.active;` 再判定。
> 回归锁：自测步骤 `35_Boss可被真实子弹与爆炸伤害`（用真实子弹链路打 Boss，不直接调 `hurtBoss`）。
>
> ⚠️ **历史教训（仍然有效）**：
> 1. `G.boss` 是模块对象、`G.boss.active` 才是实例 —— 这是全项目最容易写错的地方（见 H11）
> 2. 步骤 17 是直接调 `G.hurtBoss()` 推进 Boss 战的，**绕开了武器系统**，
>    这正是该 P0 曾在 39 步全绿下漏网的原因。新增 Boss 相关步骤必须走真实链路
>
> 详见 `docs/BUG_HISTORY.md` 的 `FIX-019`。

---

## 6. 目录说明

```
D:\game\tingjindilao\
├── AGENTS.md                 ← 你正在读的文件：总入口
├── index.html                ← 唯一入口页面，含全部 CSS 与 HUD DOM
├── docs\                     ← 项目文档体系（本次建立）
│   ├── ARCHITECTURE.md       技术栈 / 目录 / 启动 / 主循环 / 依赖 / 数据结构
│   ├── GAME_SYSTEMS.md       玩家 / 武器 / 子弹 / 敌人 / Boss / 地牢 / 道具 / UI / 音频 / VFX
│   ├── HIGH_RISK_AREAS.md    高危区 + 「为什么这样实现」+ 禁止的重构
│   ├── BUG_HISTORY.md        已修复的历史 Bug 与验证过的解法
│   ├── KNOWN_ISSUES.md       当前未修复的缺陷清单
│   ├── DEVELOPMENT_LOG.md    开发日志（倒序）
│   ├── PROCEDURES.md         测试 / 验证 / 变更流程与命令
│   ├── PROJECT_STATUS.md     完成度清单（已完成 / 部分完成 / 计划中）
│   └── PRODUCTION_ROADMAP.md 商业化升级路线图：四层体验 / L1~L7 任务清单 / 里程碑（2026-09-03 建立）
├── js\                       ← 21 个 JS 文件（20 个 IIFE 模块 + main.js 测试套件，见 §1.4 的加载顺序）
├── lib\three.min.js          ← 唯一依赖，已 vendored
├── snapshots\                ← 自测通过快照归档（含测试日志，git 建立前的历史凭证）⚠️ 勿删
│   ├── bt_gb1.html / bt_gf.html / bt_gg2.html / bt_gg3.html   早期快照（内容一致，39 步全绿）
│   ├── bt_bugfix.html        2026-09-01 Bug 修复批次（BUG-001/002/003/005/006）的 43 步全绿快照
│   ├── bt_vex07.html         2026-09-01 主角 VEX-07 重做 + 朝向系统修复的 44 步全绿快照
│   └── bt_voidhunter.html    2026-09-01 主角二次重做「VOID HUNTER」的 44 步全绿快照
├── .gitignore                ← git 忽略清单（.workbuddy/ 等不入库）
└── .workbuddy\memory\        ← WorkBuddy 工具自身记忆（非项目文档，勿删）
```

> 2026-09-01 15:00 清理：`shot_probe.html`（截图探针副本）与 `preview_shop.png`（测试截图）
> 已按用户要求送入回收站删除。探针做法见 `docs/PROCEDURES.md` §5（在项目外临时目录重建即可，无需保留副本）。

### 关于 `.workbuddy/memory/MEMORY.md`

这个文件里也有一份项目上下文，内容不错，**但它是 WorkBuddy 工具私有的记忆目录**：
- 位于隐藏目录，其他 Agent / CLI 工具**不会**自动读取
- 会被工具自动覆盖，**不能作为项目的权威交接文档**

本 `AGENTS.md` + `docs/` 体系已将其有价值的内容吸收并大幅扩充。
今后项目上下文以本体系为准。

### 关于 `D:\game\bullet-abyss`

存在一个**同题材的平行早期分支**（「弹渊 BULLET ABYSS」，模块划分为
`core/data/ent/gfx/gen/ui/boss/main.js`，含 `serve.js` 与 `启动游戏.bat`）。
它是**独立项目**，与本项目无代码引用关系，最后修改于 2026-09-01 11:19。

⚠️ 不要在其中做修改，也不要把两边的实现混为一谈。若用户要求恢复某段历史实现，
那个目录是唯一的参考来源。

---

## 7. 快速验证命令

无头 Chrome 跑 58 步自测（无需安装任何包）：

```bash
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --disable-gpu --enable-unsafe-swiftshader --use-angle=swiftshader \
  --window-size=1280,720 --virtual-time-budget=60000 \
  --user-data-dir="<临时目录>" --dump-dom \
  "file:///D:/game/tingjindilao/index.html?boottest"
```

- 读 `<title>`，形如 `BOOTTEST_PASS_P50_F0` 即 50 通过 0 失败
- 详细日志在 `#errlog`，DOM 里该 div 带 style 属性，正则需写成 `<div id="errlog"[^>]*>(.*?)</div>`
- 完整流程与排错见 `docs/PROCEDURES.md`

---

*本文件由 2026-09-01 的文档审计建立。若代码与本文档冲突，**以代码为准**，并请修正本文档。*
