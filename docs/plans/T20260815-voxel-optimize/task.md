# T20260815-VX - 任务定义卡

> 模式：L2 轻量
> 执行策略：CLOSED 串行。S1（V1→V2→V3）→ S2（V4–V7，V6 有跨文件协调门控）。不开 fleet。

## 0. 领域画像

- 主画像：软件开发（参考 `docs/plans/templates/profiles/software-dev.md`）
- 次画像：儿童游戏体验 + 共享模块治理（bridge 是三游戏公共件）

## 1. Loop 类型判断

- [x] CLOSED 单 Agent：切片边界清晰，V1 是一行级修正，V2/V3 有明确 DOM 与数据源
- [ ] CLOSED Fleet
- [ ] OPEN 转 CLOSED

## 2. 动机自检

- [x] 加速已理解的执行：V1 bug 已读码定位（`workbench-bridge.js` `getWeeklyReport` labels `total: 8`）；playMods 已接无需重做
- [x] 不是用流程回避理解：quests/ranks/daily 机制已从 `data/quests.js` 确认

## 3. 目标与背景

- 一句话目标：修周报进度 bug，任务完成可见长线成长，升段有仪式感。
- 背景：方块世界 12 生涯任务 + 5 段位 + 7 每日挑战全部接账本，但周报总数写 8；rank 变化静默；星芒缺席。
- 历史约束：一份账本、Vanilla JS、`quest-<id>`/`daily-<日期>` 发奖键不变、voxel 测试合同关键词（quest/inventory/breakBlock/placeBlock）保持存在。
- 兼容要求：`growth.worldGames.voxel-adventure` 的 `rank/questsDone/clearedLevels/unlockedTools/biome` 键名不变；`voxelQuests()` 优先读 `clearedLevels` 的旧兼容逻辑不动。

## 4. 为什么是 L2 而不是 L1

V1 触碰三游戏共享的 bridge（哪怕只一行也要全量回归护栏）；V2/V3 跨 JS、DOM、文案池；S2 的 V6 跨 `prj/app.js`。每步独立可验，总量约 1 人日。

## 5. 子任务

- **S1（本包 steps.md 细化）**：V1 周报总数修正、V2 结算三行 + 星芒 HUD、V3 升段仪式卡
- **S2（收口后展开）**：V4 工具等级挖矿门禁（`USE_TOOL_GATE` 开关 + 老档不回收）、V5 蓝图任务 ×3（代码画）、V6 家园快照 + 工作台成长页卡（**跨 app.js，展开前协调**）、V7 大师任务 q13–q18 + 每日池扩到 10 条

## 6. 边界

**只改（S1）：**
- `prj/games/shared/workbench-bridge.js`（**仅** `getWeeklyReport` 内 labels 的 voxel `total`，改为动态读任务总数；函数签名与返回结构不变）
- `prj/games/voxel-adventure/game.js`（结算层、星芒 HUD、升段卡）
- `prj/games/voxel-adventure/game.css`
- `tests/world-games.test.mjs`（合同断言）

**不碰：** `data/quests.js`（S2 才动）、`workshop.js`、其他两游戏文件、localStorage key、`awardSunlight`/`recordPlaySession` 等 bridge 核心函数。

**明确不做（另开包/期）：** 3D、熔炉/3×3 合成、敌人扩表、第二 biome、程序化世界。

**禁止顺手优化：** 重构 game.js 渲染、改每日挑战轮换算法、动 `voxelQuests()` 的 clearedLevels 兼容分支。

## 7. 验收（整体）

- [ ] S1：周报总数=12 断言 + 结算三行 + 升段卡 + npm test 全绿
- [ ] S2：门禁三级镐断言（rank1 挖石失败/rank3 成功）+ 蓝图覆盖率纯函数 + 家园快照 <8KB + q13–q18 可见性断言

## 8. 升级触发

- 若 V1 需要 bridge 引入对 `VoxelQuests` 的依赖（bridge 在花园/横版页也加载，voxel 全局可能不存在）→ 必须带兜底（无全局时回退 12 常量），若做不到干净兜底 → 停，改为在 voxel 侧展示层修正并记 change-request
- 若升段卡需要改 rank 判定逻辑 → 停，rank 计算在 `quests.js`/game.js 已有，仪式卡只是展示层
- 若 S2 V6 与学习专区卡片墙改版撞 `app.js` 同区域 → 先问用户排序
