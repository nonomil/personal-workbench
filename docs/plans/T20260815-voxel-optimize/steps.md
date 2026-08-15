# T20260815-VX — S1 接通（V1 周报修正 / V2 结算三行 / V3 升段仪式）

> 优先级：P0 | 状态：pending | 前置：工作区处置（步骤 0）
> 只执行 S1。S2（V4–V7）不写进本页当正在做。
> 验证以退出码为准：`exit 0` 通过。

## 目标

家长周报进度数真实；任务完成可见长线成长；升段有仪式感、星芒出场。

## Steps

### 0. 处置工作区 + 基线

- [ ] `git status` 确认在途文件归属
- [ ] `npm test` 基线记录（上次已知 238 全绿）
- **验证：** 退出码 0
- **回滚成本：** 无写入

### 1. 读码定位（不改代码）

- [ ] `workbench-bridge.js` `getWeeklyReport`：确认 labels 表 `'voxel-adventure': { …, total: 8 }` 位置；确认 bridge 在花园/横版页加载时 **没有** `VoxelQuests` 全局（`data/quests.js` 只在 voxel 页引入）
- [ ] `voxel-adventure/game.js`：确认任务完成结算的 DOM/弹层位置、rank 变化的检测点（`progress.rank` 何时写入）、星芒可挂载的 HUD 容器
- **判定：** bridge 内动态读数方案 = `(global.VoxelQuests && global.VoxelQuests.list.length) || 12`；若认为兜底常量仍是坏味道 → 走 task.md §8
- **验证：** 结论写进 test-report 阶段 1
- **回滚成本：** 无写入

### 2. 合同测试先红（R4）

- [ ] `tests/world-games.test.mjs` 新增断言：
  - bridge 源码不再含 voxel 硬编码 `total: 8`；`getWeeklyReport()` 在注入 mock `VoxelQuests`（12 项）时 voxel 行 `total === 12`，未注入时兜底不抛错
  - game.js 含结算三行组装函数与升段检测（如 `buildQuestSummary` / `onRankUp`），mock 断言三行内容与 rank 2→3 触发
  - 文案池长度 ≥12 且含"搭/放/收集"类动词
- **验证：** `node --test tests/world-games.test.mjs` — **先非 0**（红）
- **回滚成本：** 还原测试文件

### 3. V1 周报总数修正（R1）

- [ ] `getWeeklyReport` labels 的 voxel `total` 改为动态：`(typeof VoxelQuests !== 'undefined' && VoxelQuests.list ? VoxelQuests.list.length : 12)`（按 bridge 内已有的 global 引用风格写）
- [ ] **只改这一处**，函数签名、返回结构、其余 label 不动
- **验证：** 步骤 2 相应断言转绿；单跑 world-games 后**立即跑 `npm test` 全量**（bridge 共享件护栏）
- **回滚成本：** 还原一行

### 4. V2 结算三行 + 星芒 HUD（R2）

- [ ] 任务完成弹层固定三行：① 本任务所得阳光 ② 冒险等级进度条（`getMetaSummary()`）③ 下一目标（最近未完成生涯任务或未解锁里程碑，二者取更近的）
- [ ] 星芒 HUD：热键栏旁小像（占位用 `voxel-companion` 现有图）；文案池 ≥12 条（完成任务庆祝 / 每日挑战完成"今天的活干完啦" / 连续 3 天每日挑战专属夸奖），围绕"搭建/收集"动词
- **验证：** 断言绿 + 浏览器完成一个任务目检
- **回滚成本：** 还原结算层代码

### 5. V3 升段仪式卡（R3）

- [ ] 检测 `progress.rank` 变化（保存前后对比），弹发放卡：段位称号（`VoxelQuests.ranks`）+ 镐图标（S2 前用现有方块图占位）+ 一句能力说明（S1 阶段统一"继续挖，更深的矿层在等你"；S2 门禁落地后改为真实能力描述）
- [ ] 触发一次性：同一 rank 不重复弹（可在 progress 记 `lastCelebratedRank`，**新增字段属 progress 内部，不是新 localStorage key**）
- **验证：** 断言 rank 2→3 触发 + 浏览器实测升段
- **回滚成本：** 还原升段检测代码

### 6. 回归（R9）

- [ ] **更新缓存戳**：`prj/games/voxel-adventure/index.html` 中 `game.js?v=` 与 `workbench-bridge.js?v=`（现为 `20260815-weekly-v1`）都改为新戳；花园/横版页对 bridge 是**无戳引用**（不用改文件，但步骤 7 冒烟前浏览器要强刷 Ctrl+F5）；若测试有戳断言一并更新
- [ ] `node --test tests/world-games.test.mjs`
- [ ] `npm test`
- **验证：** 退出码 0（预期 238+新增）；voxel 合同关键词（quest/inventory/breakBlock/placeBlock）仍在
- **回滚成本：** 整包 S1 文件还原

### 7. 浏览器证据

- [ ] `http://127.0.0.1:4180/prj/games/voxel-adventure/index.html`：完成任务 → 三行结算；升段 → 仪式卡；Console 无报错
- [ ] `http://127.0.0.1:4180/prj/games/garden-defense/index.html` 与 platform 页各开一次：确认 bridge 改动未影响其加载（无 `VoxelQuests` 场景）
- [ ] 工作台成长页/家长页周报：方块世界行进度条按 n/12 显示
- [ ] 结果回写 `test-report.md` 阶段 2
- **回滚成本：** 无

## Acceptance（S1）

- [ ] R1–R4 R9 有测试或浏览器证据
- [ ] R5–R8（S2）未开始——不是遗忘；V6 展开前先确认 app.js 并发改动状态
- [ ] 未 commit（除非用户要求）
