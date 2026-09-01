# PROCEDURES.md — 测试 / 验证 / 变更流程

> 每次改动代码后必须按本文档跑验证。**不得仅以"没报错""能打开"作为通过标准。**

---

## 1. 运行方式

### 1.1 正常运行
双击 `index.html` 即可（`file://` 协议）。不需要服务器、不需要 npm install。

### 1.2 特殊 URL 参数

| URL | 用途 |
|---|---|
| `index.html` | 正常游戏 |
| `index.html?boottest` | 跑 44 步自测套件 |
| `index.html?shot=shop` | 截图模式：直接开局并传送到商店房，相机强制收敛 |
| `index.html?shot=map` | 截图模式：探索全图并打开 Tab 大地图 |
| `index.html?shot=2` | 截图模式：直接进第二层 |

> ⚠️ `?shot=` 模式下的「静音」`G.audio.muted=true`（`main.js:69`）**不生效**，
> 见 `KNOWN_ISSUES.md` 的 BUG-006。

---

## 2. 自测套件

### 2.1 跑测试

```bash
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --disable-gpu --enable-unsafe-swiftshader --use-angle=swiftshader \
  --window-size=1280,720 --virtual-time-budget=60000 \
  --user-data-dir="<临时目录>" \
  --dump-dom "file:///D:/game/tingjindilao/index.html?boottest"
```

- **无需安装任何 npm 包**（符合项目零依赖约束）
- 用本机 Chrome 的 SwiftShader 软件渲染
- `--virtual-time-budget=60000` 给虚拟时间，让异步测试跑完

### 2.2 读结果

结果写在两个地方：

**(1) `document.title`** —— 形如 `BOOTTEST_PASS_P44_F0`
```
P44 = 44 步通过
F0  = 0 步失败
```

**(2) 页面底部 `#errlog`** —— 逐步日志 + 汇总
```regex
<div id="errlog"[^>]*>(.*?)</div>
```
> ⚠️ 正则必须带 `[^>]*`：DOM 里该 div 会带 `style` 属性。

提取脚本（Python）：
```python
import re
s = open('dump.html', encoding='utf-8', errors='replace').read()
print(re.search(r'<title>([^<]*)</title>', s).group(1))
m = re.search(r'<div id="errlog"[^>]*>(.*?)</div>', s, re.S)
print(m.group(1).replace('&lt;','<').replace('&gt;','>').replace('&amp;','&'))
```

### 2.3 报告格式

必须给出**实际输出**，例如：
```
自测结果：BOOTTEST_PASS_P44_F0（44 通过 / 0 失败）
```
若失败，必须列出失败的**步骤名与断言原文**：
```
STEP 26_盾卫格挡与破防: FAIL 破防窗口内正面直击未掉血 [stack...]
```

---

## 3. 套件结构（`main.js:100-1255`）

| 机制 | 位置 | 说明 |
|---|---|---|
| `step(name, fn)` | `main.js:103-113` | 单步包裹，**某步抛错不中断后续** |
| `assert(c, msg)` | `main.js:114` | 抛 `Error(msg)` |
| `frames(n)` | `main.js:115-127` | 核心驱动器：每帧先做"测试保护"，再 `G.game.update(1/60)` + `G.input.endFrame()` |
| `aim()` | `main.js:128` | 把瞄准点设为 `p.x+4, p.z` |
| 固定种子 | `main.js:133` | `G.rng = new G.RNG(20260831)` |
| 结果导出 | `main.js:1207-1210` | 写 title、`#errlog`、`window.__testResult` |

### 3.1 测试如何驱动游戏

- **直接调用内部函数，无 DOM 事件模拟、无网络**
- `G.game.manual = true`（`main.js:135`）关掉 RAF 的逻辑推进，避免双跑
- 逻辑靠 `frames(n)` 里手动 `G.game.update(1/60)` 推进
- 玩家位移靠**直接改 `G.player.x/z`**，不是模拟按键
- **不调用 `updateCamera`** → 瞄准必须手动填 `aimX/aimZ`

### 3.2 "测试保护"（`main.js:117`）

`frames()` 每帧强制：`player.dead=false`、`hp<50 → hp=50`、`invulnT=max(.,.5)`、
`state==='dead' → 'play'`。**这是为了让长流程不被玩家死亡打断。**
副作用：测试期间玩家实际上很难死，所以**测试通过不代表难度合理**。

### 3.3 现有的 44 步分组

| 组 | 步骤 |
|---|---|
| 基础冒烟 | 01, 02, 03, 04, 05, 06, **07, 08, 09, 10, 11, 13, 15, 16**, 31 |
| 新机制验收 | 04b, 04c, 06b |
| **历史 Bug 回归** | **12, 19, 21, 22, 23, 24, 25, 25b, 26, 27, 27b, 28, 29, 30, 32, 34** |
| **修复回归锁（09-01 批次）** | **35, 36, 37, 38** |
| **角色朝向回归（09-01 VEX-07 批次）** | **39** |
| 流程/结算 | 14, 17, 18, 19, 20 |
| 生成器压测 | 29, 33 |

> 全部 44 步的唯一编号清单（2026-09-01 实测核对）：
> `01 02 03 04 04b 04c 05 06 06b 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 25b 26 27 27b 28 29 30 31 32 33 34 35 36 37 38 39`
> 步骤 31（金币可见性与翻滚特效）归入基础冒烟组。
> 步骤 35~38 对应 FIX-019~023：35=Boss 可被真实子弹伤害（BUG-001）·
> 36=切枪清 burst 队列（BUG-002）· 37=数字键/滚轮切枪（BUG-003）· 38=静音开关（BUG-006）。
> 步骤 39 对应 FIX-024 + VEX-07 重做回归：8 方向瞄准收敛（face/mesh/枪口三同步）·
> 180° 转身平滑性 · 瞄准射线 NaN 守卫 · 目镜辉光贴头部。

> 带底色的步骤是**历史 Bug 的回归锁**，改到相关系统时必须确认它们仍通过。
> 每个步骤对应的历史 Bug 见 `BUG_HISTORY.md`。

---

## 4. 新增自测步骤

在 `main.js` 的 `runBootTest()` 内加：

```js
await step('35_你的测试名', async () => {
  // 准备
  const p = G.player;
  // 用 frames(n) 推进，n = 秒数 × 60
  frames(120);
  // 断言
  assert(条件, '失败信息（写清楚期望值）');
  return '通过信息（可选）';
});
```

**要求**：
1. 断言信息必须说清"期望什么、实际是什么"
2. 若测的是历史 Bug 的回归，**在注释里写明对应的 Bug**，例如：
   ```js
   // 回归：BUG-001 玩家子弹无法伤害 Boss
   ```
3. 步骤名用 `NN_中文名` 格式
4. 跑完后 `P` 的总数会变，报告时一并说明

---

## 5. 无头探针技术（排查疑难问题用）

自测套件覆盖不到的场景，可以用**一次性探针**做实证。
**这套方法不修改项目内任何文件。**

### 5.1 做法

1. 在**项目外**的临时目录（如 `D:/game/.tmp_probe/`）建一个 `probe.html`
2. 内容是 `index.html` 的副本，但：
   - **删掉** `<script src="js/main.js"></script>`（避免自动启动与自测）
   - 在 `<head>` 里插 `<base href="file:///D:/game/tingjindilao/">`（解决相对路径）
   - 在 `</body>` 前插入探针脚本
3. 探针脚本里：
   ```js
   const out = []; const L = s => out.push(s);
   try {
     G.ui.init();        // ← 必须先调，否则 UI 的 els 未缓存会崩
     G.renderer = null;  // ← 跳过 WebGL，纯逻辑模式
     G.game.init();
     G.game.startRun();
     // ... 你的诊断代码 ...
   } catch(e) { L('EXCEPTION: ' + e.message + ' @ ' + (e.stack||'').split('\n')[1]); }
   document.getElementById('errlog').textContent = out.join('\n');
   ```
4. 用同样的 headless Chrome 命令 `--dump-dom` 跑，读 `#errlog`
5. **跑完删除临时目录**

### 5.2 已验证的坑

| 坑 | 解决 |
|---|---|
| 探针少了 HUD DOM → `ui.js` 崩在 `bossBar` | 用 index.html 副本，别自己拼 DOM |
| 忘调 `G.ui.init()` → `this.els.bossbar` 为 undefined | 探针里显式调 |
| 相对路径 404 | 加 `<base href="file:///.../">` |

> BUG-001（Boss 无敌）就是用这个方法实证的。

---

## 6. 变更流程

### 6.1 动手前

1. 读 `AGENTS.md`
2. 读 `HIGH_RISK_AREAS.md` 中与你改动相关的条目 —— **这一步不能跳**
3. 读 `GAME_SYSTEMS.md` 中对应系统的章节
4. grep 所有引用点，确认隐式依赖

### 6.2 动手时

- 中文注释
- **最小改动**：只改被要求改的
- 不顺手重构、不删"看起来没用"的代码（本项目大量"看起来是 bug 其实是设计"）
- 不改 `index.html` 的 script 顺序
- 不引入任何外部依赖

### 6.3 动手后（必做）

1. **跑自测**，记录实际输出
2. 若与预期不符，**先排查再报告**，不要跳过
3. 更新文档：
   - 修了 Bug → 从 `KNOWN_ISSUES.md` 移到 `BUG_HISTORY.md`，写明根因与解法
   - 新增/修改了架构 → 更新 `ARCHITECTURE.md`
   - 新增了系统或改了系统行为 → 更新 `GAME_SYSTEMS.md`
   - 发现了新的隐式依赖或陷阱 → 更新 `HIGH_RISK_AREAS.md`
   - **任何实质性改动** → 追加 `DEVELOPMENT_LOG.md`
4. 若新增了自测步骤，说明新的总步数

### 6.4 报告模板

```
改动：<改了什么、在哪些文件的哪些位置>
自测：<BOOTTEST_PASS_P<n>_F<n> 的实际输出>
副作用：<影响了哪些系统、为什么认为可控>
文档：<更新了哪些文档>
未决：<还有什么没做 / 发现了但没修的问题>
```

---

## 7. 版本控制注意事项（2026-09-01 16:47 起 git 已建立）

git 已建立（初始提交 `fa68394`）。因此：

- **每次改动后照常实跑自测**，通过后再提交；提交信息用中文说明"为什么"
- `snapshots/bt_*.html` 快照是**git 建立前**唯一的历史凭证，**勿删**（2026-09-01 已从根目录
  归档至 `snapshots/`，快照内容未改动）；git 建立后重大改动仍建议**另存一份新的
  `bt_*.html` 快照**存入 `snapshots/`（用 §2.1 的命令把 dump 存下来）并入库
- `.workbuddy/` 不入库（会被工具自动覆盖，见 `.gitignore`）
- 大手术（跨模块重构/高危区改动）前建议先打 tag 或分支，例如：
  `git tag stable-20260901`

---

## 8. 常见问题

| 现象 | 排查 |
|---|---|
| 无头跑出来是 `BOOTTEST_PASS_P0_F0` 或空 | 虚拟时间不够，调大 `--virtual-time-budget` |
| 无头跑出来报 WebGL 错误 | 必须有 `--enable-unsafe-swiftshader --use-angle=swiftshader` |
| 画面全黑但自测通过 | 无头软渲染帧数少属正常；用 `?shot=` 模式看截图 |
| 改了代码但自测结果没变 | 浏览器缓存，换一个 `--user-data-dir` |
| "没声音" | `audio.js` 全程 try/catch 静默吞异常，检查 `unlocked` 与音量滑块顺序 |
| 某个系统"完全没反应" | 先 grep 确认没有别的模块覆盖了 `G.onKeyPress` 之类的全局钩子 |
