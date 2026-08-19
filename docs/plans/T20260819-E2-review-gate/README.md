# T20260819-E2-review-gate：方块传奇复习之门 + 今日冒险（含 E3 切片）

> 状态：**review**（S1–S4 代码已绿。未手玩。独立仓未推。不标 accepted）。
> 源头：`docs/plans/T20260819-echoloop-borrow/` 02 §2–§3 + 04 §3–§5。优先级 P0（S4 为 P1 切片）。

解决"通关了就再也不复习"：每关通关后按固定课表（6h→28d 七轮）生成"复习之门"副本，游戏首屏给"今日冒险"队列。S4 并入 E3 三件事：图鉴语境化、跨日难词本、听说统计。

| 文件 | 用途 |
| --- | --- |
| [`task.md`](./task.md) | 目标、输入基线、子任务表 |
| [`requirements-checklist.md`](./requirements-checklist.md) | 需求裁决 |
| [`steps.md`](./steps.md) | 执行步骤（先红后绿，假时钟） |
| [`acceptance.md`](./acceptance.md) | 手玩验收清单 |
| [`test-plan.md`](./test-plan.md) | 自动 + 浏览器测试 |
| [`test-report.md`](./test-report.md) | 执行后回填 |

许可纪律同 E1：参数以借鉴包 `04-机制参数速查.md` 为准，不复制 Echo-Loop 代码。
