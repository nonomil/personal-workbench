# 测试报告

> 2026-08-19：S1+S2+S3 已执行。未手玩。不标 accepted。

| 项 | 命令 | 退出码 | 结果 |
|---|---|---|---|
| S1–S3 调度 | `node --test tests/english-mastery-schedule.test.mjs` | 0 | 12/12 |
| 英语回归 | `node --test tests/preschool-english-vocab.test.mjs tests/preschool-english-archive.test.mjs tests/preschool-english-quiz.test.mjs tests/preschool-english-dashboard.test.mjs` | 0 | 与调度合计 33/33 |

S2 先红后绿：`planVersion` 缺失、`isDue` 未导出；补双轨课表与 48h 宽限后转绿。
S3 先红后绿：`selectTodayTasks is not a function`、首页无「今天练这个」；补队列函数与置顶卡后转绿。缓存戳 `preschool-english-vocab.js` / `app.js` / `42-english-dashboard.css` → `20260819-w1s3`。
