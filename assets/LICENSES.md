# 素材许可记录

## assets/fx/ —— 粒子贴图

- **来源**：Kenney Particle Pack（kenney.nl，同包发布于 itch.io）
- **许可**：**Creative Commons Zero (CC0 1.0)**
- **文件**：hard.png（circle_05 柔光球，additive 粒子）、smoke.png（dirt_01 尘雾碎块，可染色烟粒子）
- **接入**：core.js G.tex 外部贴图优先（加载失败自动回退程序化 canvas 贴图）

本项目所有第三方素材的来源与许可。**零外部依赖约束不变**：全部素材已本地化至 assets/，断网可玩。

## assets/sounds/ —— 音效样本

- **来源**：Kenney（kenney.nl，同名素材包亦发布于 itch.io：kenney.itch.io）
- **包**：Digital Audio（kenney_digital-audio.zip）、Impact Sounds（kenney_impact-sounds.zip）
- **许可**：**Creative Commons Zero (CC0 1.0)**——公有领域，可免费商用、无需署名
- **文件**：laser*.ogg / powerUp*.ogg / pepSound2.ogg / phaseJump1.ogg（Digital Audio）；impactGeneric_light_*.ogg / impactMetal_heavy_000.ogg / footstep_concrete_00*.ogg（Impact Sounds）
- **接入**：audio.js 样本音效优先层（_samplePool；命中即播放，未覆盖音效名回退程序化合成）

## assets/sprites/pvz/ —— PVZ 僵尸贴图（当前已下架未使用）

- **来源**：jiangnangame/New-Plants-vs-Zombies-JavaScript（GitHub）提取的原版渲染动画帧转 PNG
- **状态**：PVZ 僵尸系统已下架（见 DEVELOPMENT_LOG 2026-09-05），资产保留待重做
- **注意**：该素材为游戏内提取内容（非原始创作），重做上架前需自行评估使用范围
