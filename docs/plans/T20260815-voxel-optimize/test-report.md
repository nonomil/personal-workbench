# T20260815-VX — 测试报告

> 执行会话：2026-08-15 单包推进（花园 S1 已落地，本包为方块 S1）。

## 阶段 0 — 基线（已执行）

- 工作区处置：`git status --porcelain=v1 -uall` 退出码 0。
- 在途归属（非本包，禁止改）：
  - B1 文档回真：`docs/plans/T20260815-B1-docs-truth/`、`docs/data-model.md`、`docs/README.md`
  - 课程中间层 / 积分点亮：`docs/plans/T20260815-course-middle-layer/`、`T20260815-points-*`、`prj/app.js`、幼儿 CSS/课程 JS、若干 preschool 测试
  - 花园包证据回写：`docs/plans/T20260815-garden-optimize/`、分册 04、`docs/00-总控/当前状态.md`
  - 本包当时仅有未跟踪的 `execution-check.md`（已批准，不覆盖）
- `npm test` 基线：**269 项全绿，退出码 0**（文档 238 为旧数）。
- 结论：基线健康，开工。花园实现文件不在本包写入范围。

## 阶段 1 — 读码结论（已执行）

- `workbench-bridge.js` `getWeeklyReport` labels 表原第 553 行：`'voxel-adventure': { …, total: 8 }`。`data/quests.js` 的 `VoxelQuests.list` 实为 12 项。bridge 在花园/横版页也会加载，这两页**没有** `quests.js`，因此动态读数必须兜底：`(global.VoxelQuests && global.VoxelQuests.list ? global.VoxelQuests.list.length : 12)`。兜底常量 12 可干净落地，不触发 §8。
- `voxel-adventure/game.js`：
  - 任务完成点是 `completeQuest`：写 `questsDone`、立刻 `progress.rank = rank()`（`worldApi.minerRank`，按完成数对照 `VoxelQuests.ranks`），只 toast + `awardSunlight`，**丢弃长线展示**。
  - rank 写入点：完成任务当下；升段检测可在写 rank 前后对比，仪式卡只展示、不改判定。
  - 星芒挂载：热键栏 `#hotbar` 旁；结算/升段层原先不存在，已加 `#settle-layer` / `#celebrate-layer`。
- 判定：V1 可在 labels 显示层一行完成；V2/V3 全部可在 game.js 应用层落地。不改 `quests.js`、不改 rank 公式。
- 结论：可以写合同测试。

## 阶段 2 — S1 主链路（已执行）

- 合同测试先红：`node --test tests/world-games.test.mjs` → **13 项中 4 红，退出码 1**。失败原因：硬编码 `total: 8` 仍在；`buildQuestSummary` / `COMPANION_LINES` / `nearestVoxelGoal` 缺失。
- V1 周报修正转绿：`getWeeklyReport().worlds` 在注入 12/15 项 `VoxelQuests` 时 total 跟随；无全局时兜底 12 且不抛错。`rg "total: 8" prj/games/shared/workbench-bridge.js` 无匹配。
- V1 后立即全量：`npm test` 退出码 **1**；**275 项中 273 通过、2 失败**。失败均在 `tests/preschool-workbench-refresh.test.mjs`（闪卡 CSS 戳、课程中间层 CSS 戳），属于并发 B1/课程包，不在本包允许文件。本包定向仍绿。按合同不修越界文件。
- V2 结算三行 + 星芒转绿：`buildQuestSummary` 所得/进度/更近目标断言绿；文案池 12 条含搭/放/收集；`今天的活干完啦` 与连续 3 日夸奖池存在。
- V3 升段卡转绿：`onRankUp(2,3,2)` 返回石匠学徒 +「继续挖，更深的矿层在等你」；同段位 `onRankUp(3,3,3)` / 已庆祝 `onRankUp(2,3,3)` 为 null。
- 浏览器证据（预览端口 4192，本机 4180 未成功绑定）：
  - `.../voxel-adventure/index.html`：`companion-hud` / `settle-layer` / `celebrate-layer` 均在；`getWeeklyReport` 方块行 **total=12**；`VoxelQuests.list.length=12`；localStorage 无新游戏账本 key。
  - `.../garden-defense/index.html`：页面标题「花园保卫」正常；`typeof VoxelQuests === 'undefined'`；周报方块行仍 **total=12**（兜底）。
  - `.../platform-quest/index.html`：页面标题「横版闯关」正常；无 `VoxelQuests`；周报方块行仍 **total=12**。
  - 工作台 `#growth`：`getWeeklyReport` 在该页同样返回 total=12；当前成长页 DOM 未渲染 `.preschool-weekly-world`（并发 `app.js` 改版，本包不碰）。`prj/app.js` 另有一处世界卡硬编码 `total: 8`，属 S2/工作台范围，本包未改。
  - 本局未手玩到任务完成弹层 / 升段卡弹出（函数已接线 `completeQuest`，合同覆盖 2→3）。留人工手玩复核。
- 结论：R1–R4 有自动证据；R1 浏览器兜底三页已证；R2/R3 页面层已接线，手玩弹层待补；R9 全量被外部 2 项挡住。

## 阶段 4 — 回归（已执行，外部阻塞）

- `node --test tests/world-games.test.mjs`：**13/13，退出码 0**。
- `npm test`：275 项中 273 通过，退出码 **1**。失败归属：
  - `turns flashcard subjects into a flip-card page with known/unknown marking`（`preschool-workbench-refresh.test.mjs:958`，旧 CSS 戳）
  - `adds a today preview on the course wall and splits classic into a child menu`（同文件 `:1023`，课程中间层 CSS 戳）
- voxel 合同关键词：`quest|inventory|breakBlock|placeBlock` 仍在 `game.js`（既有 isolation 测试未红）。
- 结论：本包回归通过；全量未绿是包外在途失败，不进入 S2，不改 `app.js`。

## 阶段 5 — S2（未展开）

- 待 S1 收口后按分册 04 展开 V4–V7；V6 展开前先确认 `prj/app.js` 并发改动（学习专区卡片墙）状态。
- 已知后续：工作台世界卡 `app.js` 仍写死 voxel `total: 8`，与 bridge 周报 12 不一致——属 app.js，本包 S1 禁止改。

## 音效与缓存戳补丁（2026-08-15 后续）

- 接入 `game-sfx.js`：任务结算 `clear`、升段卡 `rankUp`。
- 缓存戳：`workbench-bridge.js` 从 `20260815-weekly-v1` 改为 `20260815-sfx-v1`；`game.js?v=20260815-sfx-v1`。
