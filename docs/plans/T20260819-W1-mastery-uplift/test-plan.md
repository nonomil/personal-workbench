# 测试计划

## 自动

`node --test tests/english-mastery-schedule.test.mjs`

覆盖（全部假时钟注入 now）：events 追加/截尾 20/旧快照兼容；v2 词 6h→1d→2d→4d→7d→14d→28d 全程推进；v1 词 `[1,3,7,14]` 不受影响；v1 词答题不升版本；48h 宽限边界（47h59m 不 overdue、48h01m overdue）；overdue 不降级；`selectTodayTasks` 四类排序 + 配额截断 + 空态。

回归：`node --test tests/preschool-workbench-refresh.test.mjs` 确认快照迁移链路不破；全量 `npm test` 记录数字（既有失败不修不掩盖）。

完整步骤见 [`../T20260819-echoloop-borrow/05-完整测试方案.md`](../T20260819-echoloop-borrow/05-完整测试方案.md) §2–§3。

## 浏览器

`http://127.0.0.1:4196/prj/preschool-workbench/index.html?theme=voxel-adventure&v=w1s3#courses`

今日卡渲染与一键进练习；完成翻转；390px/320px 无横向溢出；控制台无 error。
