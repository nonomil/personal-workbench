# 测试计划

## 自动

`node --test tests/blocklegend-review-schedule.test.mjs`（17 项）+ `tests/blocklegend.test.mjs`。

覆盖（假时钟）：七轮链式推进；宽限边界恰好值；逾期不改 round；出题池去重；题型上移；hardWords 入本/毕业；奖励 eventKey 幂等；stats 听说分桶；今日冒险排序。

完整步骤见 [`../T20260819-echoloop-borrow/05-完整测试方案.md`](../T20260819-echoloop-borrow/05-完整测试方案.md)。

回归：`node --test tests/world-games.test.mjs` 确认 bridge 口径不破。

## 浏览器

`http://127.0.0.1:4196/prj/games/blocklegend/index.html?v=20260819-e2s3`

调试快进 → 复习门全流程（A1–A4）；今日冒险；图鉴翻卡出声；家长报告听说比；控制台无 error；触屏键位不回归。
