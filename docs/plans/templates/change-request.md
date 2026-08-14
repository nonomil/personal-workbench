# Txxx — 变更请求卡

> 作用：当出现新需求、方向纠偏、测试证伪或新的关键启发时，先冻结推进，再决定是小修、重规划还是重开。**不允许先静默改 `task.md` / `steps.md` / `acceptance.md`，再事后补解释。**

## 当前上下文

- 任务ID：`Txxx`
- 任务名称：`{任务名称}`
- 当前阶段：`solution_review / plan_review / execute / code_review / done`
- 触发来源：`用户新增需求 / 测试结果 / review finding / 数据异常 / 新启发`

## 这次变更要说明什么

- 新出现的要求 / 信息：
- 被证伪的原假设：
- 直接证据：
- 如果不修正，会造成什么后果：

## 变更级别判断

> 三选一。先定级，再决定要回退到哪一层。

- [ ] `patch`
  - 目标不变，只补约束、边界、参数或验证项
  - 典型动作：补 `requirements-checklist.md`、`acceptance.md`、`test-plan.md`
- [ ] `replan`
  - 目标大体不变，但方案路线、拆分方式或前提判断错了
  - 典型动作：重写 `task.md`、`steps.md`、`acceptance.md`
- [ ] `reset`
  - 目标本身变了，或当前产出已不可信
  - 典型动作：旧任务标记 `superseded`，重新从需求收敛开始

## 现有产物处置

- `requirements-checklist.md`：`保留 / 部分保留 / 作废`
- `task.md`：`保留 / 部分保留 / 作废`
- `steps.md`：`保留 / 部分保留 / 作废`
- `acceptance.md`：`保留 / 部分保留 / 作废`
- `test-plan.md` / `test-report.md`：`保留 / 部分保留 / 作废`
- 当前代码 / branch / worktree：`保留 / 部分保留 / 废弃`
- 已生成报告 / 交接材料：`保留 / 部分保留 / 作废`

## 必须同步回写的文档

- [ ] `requirements-checklist.md`
- [ ] `task.md`
- [ ] `steps.md`
- [ ] `acceptance.md`
- [ ] `test-plan.md`
- [ ] `test-report.md`
- [ ] `handoff.md`
- [ ] `loop-spec.md`
- [ ] `session-journal.md`
- [ ] 其它：

## 重入点

> 变更完成后，不是“继续聊”，而是回到一个明确 Gate。

- 如果是 `patch`：
  - 推荐重入：`stage-gate.md` 或 `execution-check.md`
- 如果是 `replan`：
  - 推荐重入：`direction-check.md`
- 如果是 `reset`：
  - 推荐重入：回到 `requirements-source.md` / `task.md` 入口层，旧 loop 停止

本次实际重入点：

- 选择的重入 Gate：
- 重入前必须完成的动作：

## 人工确认

确认以下（有问题直接改，没问题回复 `✓`）：

- [ ] 我已经明确旧目标是否仍然成立
- [ ] 我已经明确哪些旧结论还能保留，哪些必须作废
- [ ] 我已经标记要重写的正文档
- [ ] 我已经决定从哪个 Gate 重新进入
- [ ] 在这张卡完成前，不会继续推进高成本执行

## 确认结果

- 状态：`pending / approved / rejected / superseded`
- 确认时间：
- 确认人：
- 备注：
