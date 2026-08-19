# T20260819-W1-mastery-uplift：工作台英语调度升级（方案 A 双轨）

> 状态：**review**（S1–S3 代码已绿，未手玩）。源头：`docs/plans/T20260819-echoloop-borrow/` 03 §1–§3 + 04 §3/§5。
> 优先级 P0，无依赖，可与 E1 并行；**E2 复习之门依赖本包 S2 落地**。
> 用户拍板（2026-08-19）：间隔升级走**方案 A**——新词用新课表、存量词沿用旧表自然过渡，零迁移。

三个切片按序执行：S1 复习事件日志（先铺事实来源）→ S2 间隔课表 v2 + 每词版本快照（方案 A）→ S3 今日任务队列 +「今天练这个」卡。

| 文件 | 用途 |
| --- | --- |
| [`task.md`](./task.md) | 目标、输入基线、子任务表 |
| [`requirements-checklist.md`](./requirements-checklist.md) | 需求裁决（含方案 A 记录） |
| [`steps.md`](./steps.md) | 执行步骤（先红后绿，假时钟） |
| [`acceptance.md`](./acceptance.md) | 手点验收清单 |
| [`test-plan.md`](./test-plan.md) | 自动 + 浏览器测试 |
| [`test-report.md`](./test-report.md) | 执行后回填 |
