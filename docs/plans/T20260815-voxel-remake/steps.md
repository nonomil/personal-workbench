# T20260815-VR — 执行切片

> 一期 S1–S5：**✅ 全部完成（2026-08-16，入口已正式切换，36/36 绿）**，过程见 `test-report.md`。
> 二期 S6–S11：**S6–S10 与 S11 清理已完成（2026-08-16）**；S11 拍板三项仍待用户确认。验证以退出码为准：`exit 0` 通过。
> 每片完成即回写 `test-report.md`，再进下一片。

## 文件布局（新建）

```
prj/games/voxel-craft/
├── index.html          # 全屏布局：canvas + 热键栏 + 任务 HUD + 弹层挂载点
├── game.css            # MC 风 UI（像素化、热键栏、背包/合成面板、结算/升段卡）
├── engine.js           # 渲染/物理/输入/相机（DOM 无关，可整体替换）
├── game.js             # 装配：bridge + quests + engine + UI 状态机
├── data/
│   ├── quests.js       # 从旧游戏原样复制（VoxelQuests 接口不动）
│   └── world.js        # 纯函数世界模块（挂 window.VoxelCraftWorld）
└── assets/
    ├── mc/             # 34 张 zlib 贴图 + README（从旧游戏迁移）
    └── hero/           # 原创探险者（复用旧游戏 hero 贴图，非 Mojang）
tests/voxel-craft.test.mjs   # 新合同测试
```

## S1 · 纯函数世界模块（先测试后实现）— ✅

- [ ] `tests/voxel-craft.test.mjs` 先写红：
  - `createWorld(seed)`：分块地形（16 列/块 × 32 行），噪声地表、草-土-石-基岩分层、
    出口附近必有一棵树（抄 C++ 的 rig 技巧：`i+offset==3` 时 roll=0）
  - 矿脉分层：煤浅 / 铁中 / 晶体（钻石矿贴图）深，每块 ≥1 晶体（任务依赖）
  - `breakBlock(world,x,y,toolId,rank)` / `placeBlock` / `canBreak`：门禁表 rank1-2 木镐、
    rank3 石镐、rank5 晶体镐（对齐 01-玩法优化方案 §2）
  - `applyQuestProgress(quest, stats)`：支持 build/collect/collect_total/blocks_alive/
    build_total/build_total_block/build_any/blueprint 全部 8 种类型（quests.js 现口径）
  - 存档 round-trip：`serialize/deserialize` 网格 + 背包 + 玩家坐标
- [ ] `data/world.js` 实现至绿
- **验证：** `node --test tests/voxel-craft.test.mjs` 退出码 0

## S2 · Canvas 引擎与手感 — ✅

- [ ] `engine.js`：
  - 贴图渲染：`images` 预载表（kind→assets/mc 文件），`ctx.imageSmoothingEnabled=false`
  - 挖掘：按住累积进度 → `destroy_stage_0/2/4/6/8/9` 六帧裂纹叠加；松手重置
  - 挖掘时长：抄 C++ BREAK_TIMES 的相对比例（草30/石80/矿120+），绝对值 ÷4 幼儿化
  - 物理：附录 A 数值起步，60fps 固定步长积分，AABB 网格碰撞（水中减速+浮力）
  - 相机：跟随 + 边界钳制；触屏虚拟方向键
- [ ] `game.css` + `index.html`：全屏 canvas、9 格 MC 热键栏（`assets/mc/ui/hotbar.png` 底 + 选中框）、
  顶部任务 HUD（当前任务 + 进度条）
- **验证：** 浏览器目检清单（test-plan §浏览器）+ 资产/常量断言

## S3 · 任务桥与成长反馈 — ✅

- [ ] quest 判定接 S1 纯函数；完成 → `awardSunlight`（`quest-<id>` / `daily-<日期>-<key>`）
- [ ] 结算三行（所得/冒险进度/下一目标）+ 升段仪式卡（新镐图标+称号+能力说明）+ 星芒 HUD
- [ ] `getPlayMods()` 接入（难度/阳光倍率/额外怪）
- **验证：** 仿 world-games-growth 的源码断言 + 浏览器玩通 q1

## S4 · 合成台 / 熔炉 / 家园快照 — ✅

- [ ] E 键面板：背包格 + 2×2 合成（配方可重设计，含镐/斧/铲/火把）+ 熔炉（燃料→产物，burn/lit 进度条贴图）
- [ ] `captureHomeSnapshot()`：<8KB 网格缩写，写 `progress.homeSnapshot`
- **验证：** 纯函数断言（craft/smelt/snapshot）+ 浏览器

## S5 · 入口切换与收口（Gate：execution-check 全过才进）— ✅（含正式切换 + Nick 对齐轮 + 格子合成台 + MC 物品栏，见 test-report）

- [ ] `grep -rn "voxel-adventure" prj/config.js prj/app.js tests/world-games*.test.mjs tests/voxel-world.test.mjs` 记录实际引用
- [ ] `config.js` voxel 入口 html → `games/voxel-craft/index.html`
- [ ] `app.js` 嵌入/跳转路径同步（若并行会话在改，停下协调）
- [ ] 三个测试文件路径改口（断言语义不变）；`voxel-world.test.mjs` 若全部指向旧数据层则随迁 quests 复制件断言
- [ ] 版权护栏：grep 无 `minecraft` 商标字样（代码注释除外）、无 steve.png；allowlist 测试过
- [ ] `npm test`：本包涉及文件退出码 0；全量差异逐条归属
- **验证：** 工作台实点「方块探险」进新游戏、玩通一任务、阳光到账、返回链接带回主题

## 二期切片（S6–S11，2026-08-16 装配）

> 设计依据与对照盘点：`docs/01-方案/工作台小游戏设计/02-方块世界/06-Nick工作台对齐二期方案.md`。
> 顺序：小件先清（S6–S9），大件矿洞压轴（S10），清理收尾（S11）。
> 基线测试：`node --test tests/voxel-craft.test.mjs tests/world-games.test.mjs`（当前 36/36）。

### S6 · 家园展示卡提级（动 app.js，并行热点先 grep）— ✅ 2026-08-16

- [x] 现状：`renderPreschoolVoxelHomeCard()`（app.js ~630 行）已实现马赛克渲染 + 空态引导，
  但只挂在成长页「三世界冒险进度」`<details>` 折叠区内（app.js ~1661 行），曝光不足
- [x] voxel 主题（`data-preschool-theme='voxel-adventure'`）首页任务卡下方直接渲染该卡（不折叠）
- [x] 快照过旧提示（>7 天显示「好久没拍啦」）
- **验证：** `world-games-growth` 首页模板断言 + 成长页仍保留该卡

### S7 · 等级奖励包（升级=开箱）— ✅ 2026-08-16

- [x] 升段仪式卡追加奖励箱：rank2 木板×8 / rank3 石×8+火把×2 / rank4 晶体×1+火把×4 /
  rank5 装饰蓝图解锁；材料入 inventory
- [x] 已领标记写 progress（`rankRewardsClaimed[]`），防重复领取；旧档升过段的补领一次
- **验证：** `tests/voxel-craft.test.mjs` 发放表/防重复/旧档补领退出码 0

### S8 · 音效补全 — ✅ 2026-08-16

- [x] 挖矿命中/破碎、跳跃、合成产出、小卖部购买 → `shared/game-sfx` 合成音
  （place/celebrate/rankUp 已接，沿用同一风格）
- **验证：** 源码断言四处调用存在

### S9 · 移动端收尾 — ✅ 2026-08-16

- [x] 390px 宽度面板溢出修复（MC 面板/小卖部/顶栏）
- [x] 触屏按住挖掘加环形进度反馈（对齐桌面端裂纹的可感知性）
- **验证：** CSS/HTML/game.js 源码断言绿；390px 视口仍待浏览器目检

### S10 · 矿洞 biome（大件）— ✅ 2026-08-16

- [x] rank4 解锁；世界最深处生成「矿洞洞口」方块，rank<4 交互提示门禁
- [x] 独立网格：存档按 biome 分开（`progress.worldSaves` + serialize `biome`），meadow/矿洞互不污染，round-trip 断言
- [x] 氛围：深蓝底 + 晶体光点；矿脉密度×2、晶体 ≥12；无怪物；掉虚空回 `spawnCell`（矿洞口附近）
- **验证：** 世界生成/门禁/双 biome 存档断言绿；浏览器进出矿洞仍待目检

### S11 · 清理与拍板执行 — ✅ 2026-08-16（旧目录冻结不删）

- [x] 删调试残留：`__vcDebug`、`#coord-label` 帧计数器、BOOT/IMG 启动 sentinels
- [x] 拍板已执行：铁镐线砍除；MC 贴图留仓不对外发；旧 `voxel-adventure/` **暂不删**（测试合同 + 横版曾依赖，pixel-tiles 已迁到 `games/shared/`）
- **验证：** 铁镐断言绿 + 相关测试退出码 0

### S12 · 矿洞可被看见 — ✅ 2026-08-16

- [x] 顶栏显示当前区域（草原/矿洞）
- [x] rank4 升段文案指向「往最深处挖，找发光的洞口」；靠近洞口提示
- [x] 矿洞黑暗 + 玩家/火把照明；洞口自身发光
- **验证：** `cave lighting and portal findability` 断言绿；相关测试 47/47 退出码 0

## 附录 A · 引擎数值（从 2d-minecraft C++ 抽取，2026-08-15 核对）

| 项 | C++ 原值 | 本游戏采用 |
|---|---|---|
| 区块 | 16 列 × 32 行（WATER_LEVEL=16×2） | 同；世界 = 4 区块 × 16 列 = 64 列（有限世界） |
| 地表高度 | `16 + 5*noise(i)`，顶草下石 | 同公式，值噪声 seed 化 |
| 结构 | SURFACE_STRUCTURES 概率表，第 3 列必出树 | 同 |
| 矿脉 | 每 2×2 采样点按 (chance, maxY, ore, count) 掷骰，随机游走扩 count 格 | 同；煤 y<20 / 铁 y<14 / 晶体 y<8 |
| 重力 | G=1200 px/s²，跳跃 600 px/s | 起步 G=0.42/帧、跳 -8.8/帧（旧游戏已幼儿化的 60fps 数值），保留调参 |
| 挖掘 | BREAK_TIMES tick 表 + destroy_stage_0..9 | 比例照抄，绝对值 ÷4 |
| 工具等级 | MINING_LEVEL 木1/石3/铁5/钻7 | 映射段位：rank1-2=木、rank3=石、rank5=晶体（铁镐留合成线彩蛋） |
| 背包 | 36 格 + 热键栏 | 27 格背包 + 9 格热键栏（简化） |
| 合成 | 配方 JSON（planks/sticks/tools…） | 自行设计，含火把/熔炉 |
| 熔炉 | 燃料 burn + 产物 lit 双进度 | 同构 |

## 附录 B · 回滚

S5 切换前：新文件夹独立存在，主入口仍指旧游戏，**零风险**。
S5 切换后回滚：`config.js` 路径改回 `games/voxel-adventure/index.html` 一步完成（进度键同 id，数据无损）。
