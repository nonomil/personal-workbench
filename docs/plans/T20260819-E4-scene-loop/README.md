# T20260819-E4-scene-loop：句子跟读关

> 状态：**review**（S1–S2 代码已绿。未手玩。独立仓未推。不标 accepted）。
> 源头：`docs/plans/T20260819-echoloop-borrow/` 02 §4 + 04 §7。

把现有「练一句」4 情景 × 3 句升级为：播原句 → 录音 → 覆盖率评分 → 遍间停顿 → 下一遍/下一句。每句 3 遍；评分低不阻断。

| 文件 | 用途 |
| --- | --- |
| [`task.md`](./task.md) | 目标与切片 |
| [`steps.md`](./steps.md) | 先红后绿 |
| [`acceptance.md`](./acceptance.md) | 手玩清单 |
| [`test-plan.md`](./test-plan.md) | 自动 + 浏览器 |
| [`test-report.md`](./test-report.md) | 执行记录 |
