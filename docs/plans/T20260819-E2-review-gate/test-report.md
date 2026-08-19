# 测试报告

> 2026-08-19：S1–S4 代码已绿。未手玩。独立仓未推。不标 accepted。

| 项 | 命令 | 退出码 | 结果 |
|---|---|---|---|
| S1–S4 定向 | `node --test tests/blocklegend-review-schedule.test.mjs` | 0 | 17/17 |
| 语法 | `node --check prj/games/blocklegend/game.js` | 0 | 通过 |
| 方块回归 | `node --test tests/blocklegend.test.mjs` | 0 | 188/188 |

S3 先红后绿：`selectTodayAdventure is not a function`、首页无 `#today-layer`。已接顶栏「今日」、首屏弹出、推进新关回退。
S4 先红后绿：`noteHardWord` / `noteHearSpeak` 缺失、图鉴无翻卡、家长无听说比。已接线到 `resolveQuiz` / `paintDex` / `paintParentReport`。
顺手：`overlayOpen` 纳入 today/dex/parent 层；`__blDebug.skipHours` 同时刷新今日列表；`game.js` 缓存戳 `20260819-e2s3`。
回归合同随 W1 课表更新：新词回流 `nextReview` 为 +6h ISO，`recordWordAnswer` 带 `source`。
