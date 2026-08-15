# execution-check：第一次写代码前的门控

> 全部核对完在末尾写"放行结论"，否则不得改文件。

## 1. 基线

- [x] `npm test` 通过，记录用例数与退出码：`260/260`，退出码 `0`（2026-08-15）
- [x] Node 可用、无端口/环境障碍

## 2. 工作区处置

- [x] `git status` 检查未提交文件，列出与本包文件域（`prj/app.js`、`prj/preschool-achievements.js`、`prj/child-growth.js`、`prj/preschool-garden.js`、`docs/data-model.md`、`tests/`）重叠的项：**无**。仅有任务包自身 `docs/plans/T20260815-points-lighting/` 未跟踪，属于本次授权控制面。
- [x] 有重叠 → 停，请示处置（未触发）

## 3. 撞域核对（本包特有，必做）

- [x] `T20260815-B1-docs-truth` 状态 = `.meta.yaml done`，用户验收层面 `review 待验收`；其 task/meta 明确不改 `docs/data-model.md`，当前该文件无未提交改动，因此未触发撞段停机。
- [x] `T20260815-B3-reward-loop` 仍为 `blocked`（等 B2）；claimReward 尚未进入其改造。
- [x] `T20260815-streak-repair` 为 `done`，`repairedDates` 字段存在（仅作为 S2 依赖，本轮不执行 S2）。

## 4. 方案一致性

- [x] 已通读 `docs/01-方案/2026-08-15-积分打卡优化/` 00–04
- [x] 已通读本包 task.md 的"不碰/不做/禁止顺手优化/升级条件"
- [x] 确认理解：本包不做家长确认兑换、不做学习专区余额、不动学习入账逻辑

## 放行结论

**2026-08-15 放行结论：放行 S1。**

`npm test` 基线 260/260、退出码 0；Node/npm 可用；本包产品代码/数据/测试文件域无既有未提交重叠。B1 虽处于 review 待用户验收层级，但其任务明确不碰 `docs/data-model.md`，且当前该文件无未提交改动，故不存在实际撞段。B3 仍 blocked，streak-repair 已 done。侦查确认孩子可见旧“打卡”直接断言仅 2 条，方向 A 有向日葵代码证据支持。允许进入 S1-a；每阶段仍需先红后绿并回写 `test-report.md`，S1 完成后停等用户验收，不能自行启动 S2。

## 放行后的重叠复核

- 2026-08-15 门控后出现的 `prj/app.js` 与三份既有测试改动已向用户报告；用户确认按当前内容作为稳定基线处理，不回滚、不覆盖。
- 复核后的 scoped `git status` 仍列出：`prj/app.js`、`tests/preschool-lesson-mistakes.test.mjs`、`tests/preschool-math-practice.test.mjs`、`tests/preschool-workbench-refresh.test.mjs`；另有本包已创建的 `tests/preschool-rewards-claim.test.mjs`。
- 复核后的 `npm test`：`264/264`，退出码 `0`。门控重新放行，后续只在本包 `.meta.yaml` 文件域内继续。

## 2026-08-15 本会话复核（执行 S1 主提示词）

- [x] 重核 `T20260815-B1-docs-truth`：`.meta.yaml` = `review`（待用户验收）。其 `task.md` §6 明确 **不碰** `docs/data-model.md`（“数值以它和代码为准，本包只改课程侧文档向它看齐”）；`.meta.yaml` files 不含该文件；`acceptance.md` 要求“无 data-model 改动”。因此 **未触发“未验收且撞段落”停机**。当前 `docs/data-model.md` 未提交 diff 仅为本包已写入的「点亮日 vs 完美日」节。
- [x] 本包文件域当前未提交重叠（保留、不回滚、不覆盖并行内容）：
  - 本包已落地：`docs/data-model.md`、`prj/preschool-achievements.js`、`tests/preschool-rewards-claim.test.mjs`、`tests/preschool-garden.test.mjs` 向日葵锁定断言。
  - 并行基线（前轮用户已确认不覆盖）：`prj/app.js`（+430，含课程页/点亮文案混杂）、`tests/preschool-workbench-refresh.test.mjs`（B1 卡片墙 + 点亮断言 + 五科今日页）、`tests/preschool-lesson-mistakes.test.mjs`、`tests/preschool-math-practice.test.mjs`。
  - **禁止改动的并行块**：`prj/preschool-garden.js` 的 `practiceLevels` / `setPracticeLevel`（属 B2 练习级别，不是方向 B 记账）。方向 A 继续零改向日葵记账代码。
- [x] `T20260815-B3-reward-loop` 仍 blocked；`T20260815-streak-repair` 仍 done。

### 放行结论（本会话）

**放行继续 S1 收口，不重开 S1-a/S1-b。** B1 与 data-model 无撞段；并行 diff 当稳定基线。本会话只补：侦查实录刷新、连续奖励卡残留「打卡」文案、阶段 3/4 回写、真机截图、checklist / 当前状态 / plans README。不启动 S2。
