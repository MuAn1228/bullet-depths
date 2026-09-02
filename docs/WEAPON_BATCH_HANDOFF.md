# WEAPON_BATCH_HANDOFF.md — 武器批次交接（4/7 未完成）

> 2026-09-03 建立本批次按用户指令「每把完整交付再做下一把；token 不足时终止并交接」执行。
> **状态（09-03 更新）**：交付后经用户判定，**泡面叉①与悖论骰子⑤品质不达标已下架**，
> 代码/音效/图标/测试步骤整体移除（完整实现存 git 历史 4a4116e/47f20df，重做时参考）。
> 当前在架交付：②纸飞机 paperplane ③吹风机 hairdryer ④视界线切割刀 scalpel。
> **待办**：献给太阳的左轮⑥、过载点唱机⑦（新实现）；泡面叉①、悖论骰子⑤（重做，
> 必须显著超越旧版手感与演出，旧版验收步骤 49/53 已删除）。
> **本文档是剩余 4 把重型特殊武器的实现交接**。设计源文档（需求唯一来源）：
> `D:\obsidian\Obsidian Vault\vibe coding\武器\{视界线切割刀,献给太阳的左轮,悖论骰子,过载点唱机}.md`。
> 完成一把的验收口径 = 设计稿「最终验收标准」逐项 + 新增回归步骤 + 全量自测绿 + 独立提交。

## 已建立的接入模式（后续照抄，勿另起炉灶）

1. **def 表**：`weapons.js` W.defs 加行 + `W.tiers` 对应阶追加 + `kind` 三元链追加分支
   （⚠️ 新弹种必须同步 kind 链，否则命中分支永不匹配——泡面叉踩坑）。
2. **特殊机制**：新建独立 IIFE 模块 `js/<name>.js`（参照 photo.js/gambler.js），插入
   `index.html` 加载序（当前：…meta→base→enemies…；建议 weapons 后/enemies 前按依赖），
   挂 `G.<name>`；`game.cleanupDynamic()` 加清场钩子；`game.update` 挂 update(dt)。
3. **弹体行为**：`W.update` 内按 `b.kind` 分支（参照 paper/voidorb/fork 现成写法）；
   spawn 视觉在 W.spawn 的 team 分支（scale/geometry）。
4. **音效**：audio.js sfx switch 加 case；**商店像素图标**：shop.js `_icon` switch 加 case；
5. **回归锁**：main.js 新增 step（真实链路；弹道类测试用「4 连格空旷位扫描」模式，
   参照 STEP49/50/51；强制结果用 `_force` 钩子，参照 `_jokerPick`）。
6. **版本 bump**：index.html 所有被改文件 ?v+1。步骤计数 56→每把 +1。
7. **每把完成后**：DEVELOPMENT_LOG 追加条目 + 独立 commit + PROJECT_STATUS/GAME_SYSTEMS
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
    26 伤（精英 ×1.3；**Boss 走 `G.hurtBoss(min(26, …))` 设上限**），极短 screenFlash
    白闪（.08s，替代 Invert——项目无反色后处理）+ hitstop .09 + 碎裂粒子，rifts 清空。
  - 清场：`cleanupDynamic` 调 `G.scalpel.clear()`。
- 音效：riftSlash/riftOpen/riftTravel/riftCollapse；商店图标：只有刀柄（紫纹）。
- 回归锁 STEP52：三刀三 rift → rift DOT 掉血 → 玩家置于 rift A 调 tryRollEnter →
  传送+rifts 清空+连线敌人受伤 → 单 rift 不传送。
- 设计稿强调：刀只有柄无刃（3D 枪模可在 updateGunVisual 加 melee 短杆分支）、
  连续翻滚不得无限传送（每次传送消耗全部 rifts，天然防无限）。

## ⑤ 献给太阳的左轮 sunrevolver（过热管理）——**待实现（下一把）**

- def：`{name:'献给太阳的左轮', tier:'A', dmg:14, rate:1.1, mag:6, reload:1.6, sun:true, …}`。
- 实现建议放 weapons.js（HeatSystem ~90 行，不必独立模块）：`w.heat`（0~100），
  开火 +14；>100 → OVERHEAT（自伤 1 + w.cool=1.5s + heat=0 + 红白闪光，勿致死）；
  停火 0.7s 后 9/s 衰减，装填中 ×4（=主动散热）；伤害倍率按区间 1/1.25/1.6/2.2/3.0。
- **SUNSHOT**：heat≥95 时开火 → 改射 `kind:'sun'` 弹（pierce 99、spd 7、dmg 38、
  大 glow 金白、命中 `W.explode(2.2,26,'p')`、弹道留灼热粒子）→ heat=0；
  heat 95~100 区间射出即 PERFECT（dmg ×1.5）。
- HUD：ui.weapon 对 def.sun 在 wname 追加 `[HEAT nn%]`；枪管视觉随 heat 的最简实现：
  枪口 fx.light 颜色/强度按 heat。
- 音效：sunshot（低频冲击+ shimmer）/overheatHiss（金属爆鸣）；图标：金左轮+太阳核心。
- 回归锁 STEP53：7 连射 heat≈98 → 下一发 kind='sun' 生成且 heat 归零 → 对敌高伤；
  w.heat=100 直射 → OVERHEAT（hp-1、cool>1、heat=0）。

## ⑥ 悖论骰子 dice（⏸ 已下架待重做——重做时必须重新设计：更强的掷骰演出（真 3D 骰体）、
## 每个点数独立视觉语言、PARADOX 全屏崩坏演出；参考 git 47f20df 的旧实现）

- 新模块 `js/dice.js`（G.dice）：def `{name:'悖论骰子', tier:'A', dmg:6, rate:1.2, mag:8, dice:true, …}`。
- fire → chargeT .35s（骰子快转）→ `_force || 1+((Math.random()*6)|0)` 出 1~6：
  1=单发弱弹(dmg×.5, instability+8)；2=双弹；3=三向散射；4=敌人 `pinT=1.2`（复用泡面叉
  钉住=「现实禁止行动」+冰蓝 fx）；5=`kind:'homing'` 追踪弹（team p 现成，转向 3）；6=
  `W.explode(2.4,24,'p')`。结果反馈：fx.ring 按数字配色 + fx.dmgNum 大号数字 + 各自 sfx。
- **PARADOX**：lastRoll/consCount，同数字 consCount++（异数归零），consCount≥4 时本次
  攻击改为 REALITY BREAK：hitstop .12 + screenFlash + 全房敌人 34 伤（精英 ×1.3，
  **Boss `G.hurtBoss(26)` 上限**）+ 碎裂粒子 + 重置计数；instability=consCount×25 封顶 100，
  每秒衰减 8；≥50/75 阶段偶发 screenFlash/微震屏（节流）。
- HUD：ui.weapon 对 def.dice 追加 `[§n ×c]`；音效 diceRoll/diceStop/paradox；图标：机械骰子。
- 回归锁 STEP54：`G.dice._force` 强制 1→弱弹+instability 增长；同数 ×4 → PARADOX 全房掉血
  +计数重置；异数归零。⚠️ Boss/精英伤害差异化必须真实实现（设计稿十八）。

## ⑦ 过载点唱机 jukebox（最重，最后做）——**待实现**

- 新模块 `js/jukebox.js`（G.jukebox，最大件）：def `{name:'过载点唱机', tier:'A', dmg:3,
  rate:1.1, mag:6, reload:2.0, kind vinyl…, jukebox:true, …}`。
- **黑胶弹**：kind:'vinyl'——pierce 99（穿人不清弹）+ bounce 99（墙反弹，复用现有反弹）
  + life 6 + 撞敌 dmg 且继续；RGB 拖尾（红/蓝双粒子偏移）；撞墙 fx.ring 音波涟漪。
- **子弹撞子弹**：W.update 末尾对 team-p vinyl 两两距离检测（<0.45，≤12 张成本可忽略）→
  两弹 off → `G.jukebox.addNode(碰撞点)`（节点≤6，寿命 8s，旋转黑胶+辉光 mesh）。
- **共振网**：节点两两连线（≤8 条，THREE.Line 蓝+红双线）；线上敌人 0.18s tick 2.5 点
  （点到线段 <0.5，复用切割刀线段函数思路）；节点被新唱片撞 → 过载刷新寿命。
- **FULL OVERLOAD**：6 节点时下一张唱片入网 → 全线 SONIC BURST（线上敌人 12 伤）+
  低频震屏 + 节点全清。Club Mode：有节点时 `G.lights.ambient.intensity` 乘 0.78，
  清场恢复（cleanupDynamic 钩子里必须还原！）。
- 音效：vinylShot/vinylBounce/resonance/bassDrop；图标：肩扛音响。
- 回归锁 STEP55：testNode×2 → beam 存在且线上敌人掉血；×6 → burst 全清；
  唱片互撞检测函数直接单元测试；清场无残留 mesh。
- ⚠️ 性能红线（设计稿三十二）：vinyl≤12 / node≤6 / beam≤8，全对象池思维。

## 收尾清单（剩余 2 把完成后）

- 武器计数 20→22（GAME_SYSTEMS §2.1 / PROJECT_STATUS §一 / ARCHITECTURE）
- 步骤 58→62（每把 +1 回归步骤 + PROCEDURES/AGENTS/PROJECT_STATUS 同步）
- STEP52/53 的「●」纪要可移除

- GAME_SYSTEMS §2.1 武器表 3 行新怪 + 各武器小节；计数 18→22
- PROJECT_STATUS §一武器条目 / §四 当前工作；PROCEDURES 步骤清单 56→60
- PROJECT_STATUS/AGENTS 自测状态 56→60；ROADMAP 无需改（本批次不在路线图编号内）
- 武器总数 22：STEP41/44 已改动态断言，无需再动
