# GAME_SYSTEMS.md — 各游戏系统详解

> 面向需要改动具体玩法的 Agent。行号基于 2026-09-01 代码状态。
> 本文档描述"是什么"；"为什么不能改"见 `HIGH_RISK_AREAS.md`。

---

## 1. 玩家系统（`player.js`）

### 1.0 角色模型与朝向系统（2026-09-01 VEX-07 重做）

**主角「VEX-07 · 深渊行者」**，全程序化建模（`mkPlayerMesh`，`player.js:97-127`，
几何定义 `player.js:17-95`）：

- 结构：全覆式头盔 + 发光目镜条 / 胸甲 + 能量核心 / 肩甲肩刺 / 背包 + 天线 + 能量罐 /
  橙红披风 / 持枪右臂 + 扶枪左手 / 双腿靴。配色沿用项目主色（深青装甲 `0x27716a` +
  暗钢 + 橙色警示件 + 青色能量件）。
- 节点层级：`group(位置+rotation.y) → rollG(翻滚轴枢,y=.55) → bodyG(呼吸/起伏, y=-.55)
  → [torso, head, legL, legR, cape, armR(→gun), armL, rim光, glow, light]`。
  ⚠️ 辉光/灯的坐标是 body 空间，**必须挂 `bodyG`**——挂 `rollG` 会整体抬高 0.55。
- **forward 约定：模型正前方 = 本地 +X**（目镜条/能量核心在 +X 侧，披风在 -X 背后）。
- **朝向链路**：鼠标屏幕坐标 → `game.js updateCamera` 射线与 y=0.55 平面求交 →
  `G.input.aimX/aimZ`（⚠️ 有 `isFinite` 守卫，见 FIX-024）→ `P.update` 计算
  `face=G.angTo(...)`（`animate` 统一驱动）→ `mesh.rotation.y = -face`。
  **无任何魔法角度**：面部/身体正前方 = 武器瞄准方向 = 鼠标世界方向。
- 枪口世界位置 `muzzleX/Z = p.x/z + cos/sin(face)*.62`，与视觉枪管位置一致。
- 回归锁：自测步骤 39（8 方向收敛 / 平滑转身 / 射线 NaN 守卫 / 辉光贴头部）。

### 1.1 对象字段（`player.js:53-70`）

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
  aimX, aimZ, face:0, walkT:0, moving:false, recoilT:0, reloadHud:0, t:0,
  mesh, rollG, refs:{body,torso,head,legL,legR,cape,armR,armL,gun,gunMesh,glow,light},
  muzzleX, muzzleZ,
  方法: heal / addHeartContainer / hurt / addKeys / addMoney / giveWeapon / curDmgMul
}
```

### 1.2 移动与碰撞

**圆形体 + 分轴推进**，实现在 `G.moveEntity`（`gen.js:413-448`），**不在 player.js**：

- 半径 `r=.34`（敌人默认 `.35`）
- 先解 X 轴、再解 Z 轴，每轴只采样**前缘所在的 1 列 tile**，命中则吸附到墙面（留 `.02` 余量）
- **不做扫掠** → 单帧位移 ≥ 1 tile 会穿墙。目前最高速是 Boss 冲撞 9 u/s，依赖帧率留安全裕度
- 最后对**全量 `G.props`** 做圆形推出（`gen.js:438-447`），推出后**不回检墙体**

走速：`4.3 * st.speedMul`，减速时 `*.55`，`adrenal` 半血时 `*1.4`。

### 1.3 翻滚闪避（`player.js:144-157`）

| 项 | 值 |
|---|---|
| 触发 | `Space`（支持 0.18s 输入缓冲），`rollCd<=0` |
| 位移速度 | 常量 14（注释："短促高速翻滚：更快更跟手"） |
| 持续 | `rollT = rollDur = .26` 秒 |
| 冷却 | `rollCd = .42` 秒（注释："后摇仅 0.16s，可快速连续翻滚"） |
| 无敌 | `invulnT = max(invulnT, .24)` —— **比翻滚本身短，翻滚结束后无额外无敌** |
| 方向 | 有移动输入用移动方向，否则用瞄准方向 |
| 免伤 | `rollT>0` 期间 `P.hurt` 直接 return（`player.js:408`） |

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

---

## 2. 武器系统（`weapons.js`）

### 2.1 定义表 `W.defs`（`weapons.js:7-24`）—— 共 **16 种**

字段全集：
`name / tier / dmg / rate(发每秒) / mag / reload(秒) / spread(弧度) / pellets / speed / range / size / pierce / bounce / knock / color / sfx / price`
+ 可选机制标志：
`laser / plasma / rocket / homing / boomerang / flame / rail / frost / arc / orbit / burst+burstGap / chain+chainFade / splash+splashDmg / orbitDur+orbitRad`

品阶（`weapons.js:25`）：
```
D: rusty
C: smg, shotgun, ricochet
B: rifle, laser, hive, boomer, burst, flame
A: plasma, rocket, rail, frost, arc, orbit
```

三个代表：
```js
rocket: { name:'毁灭者火箭筒', tier:'A', dmg:26, rate:0.8, mag:1, reload:1.9, spread:0, pellets:1,
          speed:9.5, range:14, size:.3, pierce:0, bounce:0, knock:9, color:0xff7040, sfx:'rocket',
          price:50, rocket:true, splash:2.4, splashDmg:16 },

burst:  { name:'三连发卡宾', tier:'B', dmg:5, rate:4.2, mag:21, reload:1.4, spread:.03, pellets:1,
          speed:19, range:14, size:.13, pierce:1, bounce:0, knock:2, color:0xd0ff90, sfx:'rifle',
          price:38, burst:3, burstGap:.07 },

orbit:  { name:'环星刃环', tier:'A', dmg:4, rate:0.9, mag:4, reload:1.6, spread:0, pellets:3,
          speed:0, range:0, size:.2, pierce:99, bounce:0, knock:2, color:0xc070ff, sfx:'plasma',
          price:54, orbit:true, orbitDur:6, orbitRad:1.9 },
```

### 2.2 特殊机制实现位置

| 机制 | 字段 | 实现 |
|---|---|---|
| 弹跳 | `bounce` | `weapons.js:276-285`，子步内试探单轴翻转判法线 |
| 穿透 | `pierce` | `b.hits:Set` 去重，`weapons.js:311/326` |
| 追踪 | `homing` | `weapons.js:235-244`，搜索半径 7 米 |
| 回旋 | `boomerang` | `weapons.js:246-257`，去程减速到 <2 转回程 |
| 冰霜 | `frost` | 命中 `e.slowT=2`，减速到基础速度 45% |
| 磁轨 | `rail` + `pierce:99` | 无专属逻辑，只影响外观与拖尾 |
| 电弧链 | `arc` | `W.chainLightning`（`weapons.js:123-144`），**跳数/衰减硬编码 3 / .72** |
| 环绕星刃 | `orbit` | `weapons.js:86-97` 生成、`204-233` 独立更新分支 |
| 三连发 | `burst:3, burstGap:.07` | `player.js:246` 排队、`178-186` 续发 |

### 2.3 武器运行时实例

```js
// weapons.js:27
W.mktWeapon = id => ({ def: Object.assign({}, W.defs[id]),
                       ammo: def.mag, cool:0, reloading:false, reloadT:0,
                       burstLeft:0, burstT:0 });
```
`def` 是**浅拷贝**，`ammo/cool/burstLeft` 是每实例状态。

---

## 3. 子弹系统（`weapons.js:30-43`）

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

**关键**：**所有伤害倍率在子弹生成时一次性固化进 `b.dmg`**，飞行途中不再重算。
子弹飞出去之后玩家吃到/失去狂暴、被动、暴击，**都不影响这颗子弹**。

唯一在**命中时**结算的倍率是 Boss 眩晕：`weapons.js:336` 的 `b.dmg * (stunT>0 ? 1.5 : 1)`。

---

## 4. 敌人系统（`enemies.js`）

### 4.1 定义表 `E.defs`（`enemies.js:139-152`）—— 共 **12 种**

> ⚠️ `enemies.js:1` 的文件头注释写「9种类型」，**已过期**，实际 12 种。

字段只有 6 个：`hp / spd / r / cost / floors / money`

| 类型 | hp | spd | r | cost | floors | AI 位置 | 行为 |
|---|---|---|---|---|---|---|---|
| gunner | 16 | 2.1 | .35 | 1 | [1,2] | `:469` | 保持 4~6.5 距离横向游走，瞄准 .4s 后连发 2~3 发 |
| charger | 22 | 2.6 | .38 | 1 | [1,2] | `:494` | 逼近 → 蓄力 .5s → 冲刺 1.3s（速度 8.5）→ 撞墙眩晕 1.1s |
| shroom | 26 | 0 | .36 | 1 | [1] | `:517` | 静止炮台，索敌半径 14，交替放射 8 发 / 三连直射 |
| slime | 13 | 2.2 | .34 | 1 | [1,2] | `:535` | 弹跳推进；**死亡分裂**成 2 只小史莱姆 |
| shotgunner | 46 | 1.7 | .44 | 2 | [2] | `:543` | 蓄力 .55s → 6 发扇形，自带后坐力 |
| sniper | 20 | 2.3 | .34 | 2 | [2] | `:559` | 保持 ≥7 距离，瞄准 .95s（后 .35s 显示激光预警线）→ 高速穿刺弹 |
| hexer | 30 | 1.5 | .36 | 2 | [2] | `:587` | 传送；敌人 <5 时 35% 概率召唤 2 只 slime，否则双螺旋弹幕 |
| beetle | 9 | 3.4 | .3 | 1 | [2] | `:622` | 高速冲脸，接近后点燃引信 .75s 自爆 |
| shield | 52 | 1.25 | .46 | 2 | [2] | `:632` | **盾卫**，格挡/破防见 §4.3 |
| wisp | 10 | 4.6 | .3 | 1 | [1,2] | `:659` | 蛇形高速逼近，近距离自爆（半径 1.7 / 伤害 2） |
| totem | 40 | 0 | .42 | 2 | [1,2] | `:676` | 静止，双臂激光以 .85 rad/s 旋转扫射 3.2s |
| bomber | 34 | 1.9 | .38 | 2 | [2] | `:719` | 保持 4.5~6.5，抛射炸弹（落地爆炸半径 1.9 / 伤害 2） |

**精英变体**：`hp × 2.2`、`r × 1.2`、`spd × 1.15`，加红色光环 + 整体放大 1.22。

### 4.2 AI 组织方式

**通用帧循环 + 每类型一个函数**：

- `E.update(dt)`（`enemies.js:257-344`）是唯一入口，倒序遍历，在调用具体 AI **之前**
  统一处理：出生保护 → 减速 → **位置合法性自愈** → **房间归属纠正** → 击退衰减 →
  掩体推出 → 受击闪白 → 接触伤害 → 动画计时
- 具体 AI 在 `enemies.js:337`：`const ai = AI[e.type]; if(ai) ai(e, dt, d, a, p);`
- `AI` 是文件底部的对象字面量（`enemies.js:468-752`），12 个键与 `defs` 一一对应
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
  → 绕背后有约 0.6 秒的输出窗口，**这是设计意图，不是 bug**
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
```

### 4.6 房间归属与清剿

- 正式赋值：`game.js:341`（从 spawnQueue 出队生成时）
- **每帧实时纠正**（`enemies.js:297-301`）：`const r=G.roomAt(e.x,e.z); if(r) e.room=r;`
  注释：`// 房间归属实时纠正：敌人物理上在哪个房间就算哪个房间的（清剿判定永远与实际位置一致）`
- 清剿判定 `checkRoomClear` 每帧扫描**全部**锁定战斗房，
  `alive = enemies.list.some(e => e.room===rm && !e.dead)`

### 4.7 位置自愈（反软锁兜底）

见 `BUG_HISTORY.md` 的 `FIX-003`。

---

## 5. Boss 系统（`boss.js`）

### 5.1 实例

```js
// boss.js:90
{ x, z, vx:0, vz:0, r:1.05, hp:900, maxhp:900, dead:false, deadT:0, spawnT:.6,
  flashT:0, phase:1, state:'intro', stateT:1.4, t:0, face:0, walkT:0,
  atkIdx:0, lastAtk:'', contactCd:0, stunT:0, jawOpen:0, gunSpin:0, airY:0,
  dying:false, crownOff:false, mesh, refs:{head,crown,gun,barrels,eyeLight,aura,body} }
```

⚠️ **`B = { active:null }`（`boss.js:5`），`G.boss = B`（`boss.js:379`）。
实例在 `G.boss.active` 上，不在 `G.boss` 上。** 这曾是 P0 Bug（BUG-001，玩家打不到 Boss）的根因，2026-09-01 已修复（FIX-019），但命名陷阱仍在——新代码一律先取 `G.boss && G.boss.active`。

### 5.2 三阶段（`boss.js:123-148`，在 `B.hurt` 内切换）

| 阶段 | 触发 | 表现 |
|---|---|---|
| P1→P2 | HP ≤ 540（60%） | `state='phase'` 1.0s，皇冠击飞，aura 变 `0xa02020`，toast"铁颚被激怒了" |
| P2→P3 | HP ≤ 225（25%） | `state='phase'` 1.0s，aura 变 `0xe02020` 且放大，toast"进入狂暴状态" |
| 死亡 | HP ≤ 0 | `dying=true`，`state='dying'` 2.6s，慢动作 0.25×/1.2s |

⚠️ 用的是 **`if / else if` 链**：一发巨额伤害从 100% 打到 20%，只会触发 P2，
P3 要等下一发伤害才触发。这正是自测步骤 17 分两次 `G.hurtBoss()` 的原因。

速度倍率：`phase3 ? 1.35 : (phase2 ? 1.15 : 1)`（`boss.js:174`）

### 5.3 状态机（`boss.js:152-351`）

| 状态 | 行为 | → 下一状态 |
|---|---|---|
| `intro` | 头部摆动 1.4s | `cool`(.8) |
| `phase` | 整体起伏 1.0s | `cool`(.5) |
| `cool` | 缓慢逼近 + 绕行，速度 1.3×spdMul | `pickAttack(d)` |
| `gatling` | 3.0s，预热后每 .085s 一发 | `cool` |
| `fans` | 1.8s，3 轮扇形（P3 11 发 / 否则 9 发） | `cool`(.9) |
| `chargeWind` → `charge` | 蓄力 .6s → 冲刺 9 u/s 持续 1.6s | `cool` |
| `spiral` | 2.6s，每 .09s 发射，P3 4 臂 / 否则 2 臂 | `cool` |
| `summon` | 召唤 3 只 beetle | `cool`(1.2) |
| `slam` | 跃起追踪玩家，落地环形弹幕 + 半径 2.4 造成 2 点伤害 | `cool`(1.2) |
| `wall` | 一排 11 发弹幕留 3 格缺口 | `cool`(1.0) |
| `dying` | 纯视觉爆炸 2.6s | 死亡结算 |

选招池（`boss.js:357-377`）：
```
P1: gatling, gatling, fans, fans, charge
P2: gatling, fans, charge, spiral, spiral, summon, slam
P3: gatling, spiral, spiral, fans, slam, wall, wall, charge, summon
```
避免连续同一招；`summon` 在场上敌人 >5 时退化为 `fans`。

### 5.4 伤害入口

```js
// boss.js:380
G.hurtBoss = dmg => B.hurt(dmg);      // 只收一个参数，Boss 无法被击退
```
前置拦截（`boss.js:125`）：`if(!b || b.dead || b.spawnT>0 || b.state==='intro') return;`

---

## 6. 地牢生成（`gen.js`）

### 6.1 算法流程

```
1. 建 start 房（gen.js:58）          第1层 40% 概率 2×1
2. 随机生长（62-77）                  随机选已有房间作父节点，随机 4 向放子房，
                                     每个新房立即 connect() → 天然保证连通（树结构）
3. 环路连接（80-83）                  两两组合，40% 概率额外 connect，形成非纯树
4. BFS 计算 depth（86-92）
5. 特殊房分配（97-178）               第1层：exit(最深) + treasure + shop + npc
                                     第2层：boss(新建2×2) + treasure + shop
                                     + 75% shrine + 60% gamble；**第2层无 exit**
6. 补足战斗房到下限（179-192）
7. 隐藏房（195-211）                  **只放 1 个**，贴邻某个 combat 房
8. 生成 tile 地图（213-232）
9. 填充房间内容（238-385）            刷怪表 / 掩体 / 陷阱 / 火把 / 装饰
```

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

| API | 位置 | 说明 |
|---|---|---|
| `G.tileAt(x,z)` | `gen.js:392` | 无 tile 时返回 `undefined`（**不是 null**） |
| `G.solidForMove(x,z)` | `gen.js:393-399` | 无 tile→true；wall→true；door→`!open`；否则 false |
| `G.solidForBullet(x,z)` | `gen.js:400-406` | **函数体与 solidForMove 逐行相同**（重复代码） |
| `G.roomAt(x,z)` | `gen.js:407-411` | 仅 floor tile 返回 room → **站在门洞里返回 null** |
| `G.moveEntity(e,dx,dz)` | `gen.js:413-448` | 圆形分轴碰撞 + 道具推挤 |
| `G.roomSpawnPos(room, awayFrom)` | `gen.js:449-463` | 抽 6 次候选，跳过 `blocksBullets` 掩体，取离玩家最远 |

---

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

| type | r | hp | blocksMove | blocksBullets | 备注 |
|---|---|---|---|---|---|
| table | .55（翻后 .62） | 30 | ✔ | ✘ → 翻后 ✔ | 可翻倒 |
| barrel | .32 | 8 | ✔ | ✔ | 爆炸桶 |
| pot | .24 | 4 | ✔ | ✔ | |
| pillar | .42 | ∞ | ✔ | ✔ | 不可破坏 |
| chest / bonus | .5 / .35 | ∞ | ✔ | ✘ | |
| pedestal / shrine / gamble / npc | .42 / .6 / .6 / .4 | ∞ | ✔ | ✘ | |
| shopkeeper / counter / campfire / throne / exitHatch | .4/.5/.3/0/0 | ∞ | ✘ | ✘ | |

`interact` 形如 `{label, range, fn}`，**`label` 可以是函数**（`build.js:673`），
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

| 项 | 值 |
|---|---|
| 画布 | **128 × 32**（4:1） |
| 字体 | `bold 20px Consolas`，居中 |
| 底衬 | `rgba(0,0,0,.75)` 矩形 |
| 描边 | `lineWidth 4`，先 `strokeText` 再 `fillText` |
| 采样 | `magFilter = NearestFilter`（保持像素硬边） |
| 材质 | `transparent:true, depthWrite:false, **depthTest:false**` → **穿墙可见** |
| 渲染序 | `renderOrder = 900` |

> `depthTest:false` 是**刻意**的（注释 `build.js:663`：穿墙深度关闭保证不被货架遮挡）。
> 商店价格牌正是靠这个才不会被柜台挡住。

#### `iconSprite(kind, colorHex)`（`build.js:60-85`）

画布 40×40，5 种 kind（heart/key/weapon/item/active），固定 scale .78。
⚠️ **未关闭 `depthTest`**（与 textSprite 不同）。

---

## 8. 房间流程（`game.js:122-247`）

| 环节 | 位置 | 行为 |
|---|---|---|
| 进入检测 | `371-373` | 每帧 `G.roomAt(p.x,p.z)`，`!==curRoom` 时触发 `onRoomEnter` |
| `onRoomEnter` | `128-142` | 发现标记 → `visited=true` → 小地图 → 战斗房未清剿则 `lockRoom` → Boss 房生成 Boss |
| `markDiscovered` | `122-125` | 自己 `discovered=true`；所有**非 secret** 邻居 `mapHint=true` |
| `lockRoom` | `144-151` | `locked=true`，**所有门 `open=false`**，音效 + 震屏，`spawnWave(room,0)` |
| `spawnWave` | `153-161` | 敌人入 `spawnQueue`，延迟 .25~.65s 逐个出场 |
| `checkRoomClear` | `164-191` | 每帧扫全部锁定房；无存活且无待生成 → 下一波或 `clearRoom` |
| `clearRoom` | `193-214` | 开门、`roomsCleared++`、掉钱（3~5 + 层数×2）、16% 掉心 |
| `breakSecretDoor` | `217-232` | 4 个 tile 改成 floor，显示隐藏房 |
| `descend` | `235-247` | 550ms 后 `startFloor(2,false)`（**楼层号硬编码**） |

### 8.1 清剿判定的红线

```js
// game.js:180-182
// 残敌提醒：长时间未清剿时周期性提示剩余数量（仅提示，绝不自动清除）。
// 反软锁由敌人系统的"位置非法 0.8 秒自愈"负责（只处理卡墙敌人），
// 不做整房超时清空——避免慢节奏战斗（绕后盾卫/躲避激光）中敌人凭空消失。
```

**任何形式的整房超时清场都会让自测步骤 25 失败。** 30s/15s 两个提示阈值可调，
但不能改成 `clearRoom`。

---

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

`giveTo`（`items.js:78-96`）中 `p.passives.push(id)` 后**立即调用一次 `apply(p)`**，
直接累加到 `p.st.*`。派生逻辑在**消费侧每帧读取** `p.st`。

⚠️ **没有 `unapply`，没有 `recalcStats`。** 唯一的"重置"途径是 `startRun()` 新建玩家对象。
**任何让 `apply` 被调用两次的逻辑都会永久叠加属性。**

重复拾取同一被动不叠加，转成 15 弹壳（`items.js:81`）。

---

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

---

## 11. UI（`ui.js`）

- **HUD 刷新节奏**：小地图/武器/属性/剩余敌人数 0.15s 节流（`game.js:378-387`）；
  心数只在受伤/治疗处按需调用
- **`enemyCount(n)` 基于 `_floorText` 拼接**（`ui.js:83`）→ **必须先调 `floor(n)` 再调它**，
  否则敌人计数会覆盖层名
- **小地图与大地图共用 `drawMap(cv, g, big)`**（`ui.js:113-197`），动态缩放铺满画布
- `screen(name)` 用显式映射表切 4 个界面（`ui.js:24`）
- `hurtFlash` 用 90ms `setTimeout` 复位，**不走游戏时钟**（暂停时照样复位）

## 12. 音频（`audio.js`）

**100% 程序化合成，无任何音频文件。**
- 链路：`sfxGain/musGain → master → DynamicsCompressor → destination`
- 噪声源：1.2s 单声道缓冲，逐样本 `Math.random()*2-1`，`loop=true` 复用
- 约 40 个具名音效 + 4 首 BGM（title/f1/f2/boss），16 步数组 + `setInterval` 前瞻调度
- ⚠️ `unlock()` 与 `sfx()` 全程 try/catch **静默吞异常**（注释：`// 无音频环境（无头测试）`）
  → 排查"没声音"时不会有任何报错

## 13. VFX（`fx.js`）

- 纯对象池，启动时一次性预分配（见 `ARCHITECTURE.md` §12）
- `hitstopT`（顿帧）在 `game.js:443` 用**真实 dt** 递减；`timeScale`（慢动作）在
  `game.js:441` 缩放累加器 —— 两者分属两个模块，改一处要同步另一处
- `trauma`（震屏）由 fx 衰减（`fx.js:194`），但消费方在 `game.updateCamera`（`game.js:408`）
- 唯一非池化：`lightning()` 每次新建几何，0.14s 后 dispose
