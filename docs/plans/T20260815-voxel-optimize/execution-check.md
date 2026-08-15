# T20260815-VX — 执行前确认卡

## 当前任务

- 任务ID：`T20260815-VX`
- 当前阶段：`execute / S1（V1→V2→V3）`
- 对应方案：`docs/01-方案/工作台小游戏设计/00-共同框架/00-三游戏优化总纲.md`、`docs/01-方案/工作台小游戏设计/02-方块世界/00-README.md`、`01-玩法优化方案.md`、`03-成长陪伴与工作台结合.md`、`04-落地路线与验收.md`

## 本次执行范围

- 计划修改文件：
  - `prj/games/shared/workbench-bridge.js`（仅 `getWeeklyReport` 的 voxel labels `total`）
  - `prj/games/voxel-adventure/game.js`
  - `prj/games/voxel-adventure/game.css`
  - `tests/world-games.test.mjs`
  - 必要证据文档：本包 `test-report.md`、`requirements-checklist.md`、总控当前状态、方块分册 `04-落地路线与验收.md`
- 明确不碰的文件：`prj/games/voxel-adventure/data/quests.js`、`workshop.js`、花园/横版实现、`prj/app.js`、localStorage key、`awardSunlight`/`recordPlaySession`/`voxelQuests` 核心逻辑，以及 S2 的 V4–V7。

## 输入 / 数据 / 环境

- 使用的数据 / 输入：现有 `VoxelQuests.list`、`VoxelQuests.ranks`、现有 progress/bridge API、`voxel-companion` 占位素材。
- 运行环境：Windows PowerShell；仓库 `G:\StudyCode\个人工作台`；Node 测试入口 `node --test tests/world-games.test.mjs`、全量 `npm test`；预览 `http://127.0.0.1:4180/`。
- 是否存在高成本动作：
  - [ ] 更换数据集
  - [ ] 更换方法路线
  - [ ] 从子集扩大到全量
  - [ ] 大批量运行
  - [x] 改动 > 3 个文件或 > 100 行：S1 的实现文件、合同测试及任务要求的证据文档共同计入；代码改动仍按 V1/V2/V3 分片。

## 方案落实追踪

- 已批准方案中的关键点：
  - 一份账本；不新增 localStorage key 和货币。
  - V1 动态读取 `VoxelQuests.list.length`，无全局时安全回退 12；bridge 返回结构不变。
  - V2 结算固定展示所得、冒险等级进度、下一目标；星芒 HUD 文案池至少 12 条。
  - V3 只观察既有 rank 变化并展示升段卡，不改 rank 判定；同一段位不重复弹。
  - S2（工具门禁、蓝图、快照、q13–q18）本轮不写代码。
- 本次如何落实到执行步骤：合同测试先红；V1 改动后立即跑 world-games 与 npm test；再按 V2/V3 单切片测试、浏览器核验、最终全量回归。
- 可能遗漏的步骤：浏览器打开 voxel 主页以及花园、横版桥接冒烟；结果写入 test-report 和需求证据列；同步两份状态文档。

## 粒度自检（来自 task-decomposition.md）

- [x] 本次代码改动按 4 个明确文件收敛；超过 3 个文件的例外是任务合同要求同时改共享 bridge、游戏表现层、样式与合同测试，且每个切片单独验证。
- [x] 验证命令跑完 ≤10 分钟（当前全量基线约 6 秒）。
- [x] 做错了能整块回滚（不提交、不暂存，切片边界清晰）。
- [x] 没有未经授权的“顺手优化”。
- [x] 禁止项已声明且 Agent 已知晓。

## 需求分解核对

- 对照 `requirements-checklist.md`：
  - [x] 本次执行范围对应 R1–R4、R9 已明确。
  - [x] 没有“只聊过、没落计划”的 S1 需求点。
  - [x] 输入 / 数据 / 约束与需求分解表一致。
  - [x] R5–R8 标记为 S2 延期，不在本轮实现。

## 验证与证据

- 自动验证命令：
  - `node --test tests/world-games.test.mjs`
  - `npm test`
  - `rg -n "total: 8" prj/games/shared/workbench-bridge.js`（期望无匹配；以命令退出码记录）
- 手动检查点：voxel 完成任务出现结算三行；rank 2→3 出现一次升段卡；花园/横版页加载 bridge 的 Console 无报错；工作台周报方块行显示 n/12；390px 视口无溢出。
- 证据落点：`docs/plans/T20260815-voxel-optimize/test-report.md`、`requirements-checklist.md`；同步 `docs/00-总控/当前状态.md` 与 `docs/01-方案/工作台小游戏设计/02-方块世界/04-落地路线与验收.md`。

## Git 确认卡

- 本次纳入 git 的文件 / 目录：不执行 `git add`；仅保留工作区改动供用户审阅。
- 新建目录是否纳入 git：否；不新建代码目录。
- 数据 / 日志 / 缓存 / 生成产物是否继续排除：是；不生成发布素材或缓存。
- 是否需要拆成两个 commit：不适用；用户明确要求不 commit。

## Worktree 隔离确认

- 本次子任务有文件写入 → 使用当前工作区，不另建 worktree。
- 豁免原因：用户明确授权在当前共享仓库处理 B1 后继续既定包；工作区已有用户/并发在途改动，另建 worktree 会丢失当前已验收的上下文，且本轮只做小范围、可逐切片验证的 S1。

## 相关 Spec 文件

- `docs/plans/T20260815-voxel-optimize/task.md`
- `docs/plans/T20260815-voxel-optimize/steps.md`
- `docs/plans/T20260815-voxel-optimize/acceptance.md`
- `docs/00-总控/变更与同步规则.md`

## 未决项

- `[?]` 若 V1 不能在无 `VoxelQuests` 全局的花园/横版路径安全回退 12，按 task.md §8 停止并提交 change-request，不改造 bridge 依赖。
- `[?]` 若升段卡需要改变 rank 判定逻辑，按 task.md §8 停止，不越界改 `quests.js`。

## 人工确认

- [x] 这次改动范围可接受
- [x] 输入 / 数据选对了
- [x] 方案关键点已经落实到执行路径
- [x] `requirements-checklist.md` 中本阶段相关需求点都已覆盖
- [x] 验证方法可接受
- [x] 高成本动作已知且可接受
- [x] 可以开始执行

## 确认结果

- 状态：`approved`
- 确认时间：`2026-08-15`
- 确认人：用户授权继续处理 B1 冲突并推进既定优化包
- 备注：不 commit、不 add；遇到 task.md §8 升级条款立即停下询问。
