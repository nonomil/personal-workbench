# T20260819-E1-speech-match：共享跟读评测引擎

> 状态：**review**（S1–S3 代码已绿，手玩与独立仓推送未做）。源头：`docs/plans/T20260819-echoloop-borrow/` 02 §1 + 04 §1–§2。
> 优先级 P0，无依赖，三包中建议**第一个执行**。

给"说"一个可信判据：ASR 文本 + 词形还原 + LCS 覆盖率 + 分场景阈值，做成可 `node --test` 的纯函数共享模块，接入方块传奇的 Boss speak 通道、练一句、跟读题型。工作台跟读题后续复用（W1 之外，不在本包）。

| 文件 | 用途 |
| --- | --- |
| [`task.md`](./task.md) | 目标、输入基线、子任务表 |
| [`requirements-checklist.md`](./requirements-checklist.md) | 需求裁决 |
| [`steps.md`](./steps.md) | 执行步骤（先红后绿） |
| [`acceptance.md`](./acceptance.md) | 手玩验收清单 |
| [`test-plan.md`](./test-plan.md) | 自动 + 浏览器测试 |
| [`test-report.md`](./test-report.md) | 执行后回填 |

许可纪律：可对照 Echo-Loop-main 源码核对参数（口径见借鉴包 01 §4），但**不复制任何代码**；参数以借鉴包 `04-机制参数速查.md` 为准。
