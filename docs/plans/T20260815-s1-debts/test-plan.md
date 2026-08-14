# Test Plan — T20260815

| 阶段 | 手段 | 覆盖 |
|---|---|---|
| 1 | `node --check` + 源级合同断言 | R1 守卫存在 / R2 击退移除 / 缓存戳 |
| 2 | `npm test` 全量(含新增断言) | R3 R4 + 无回归 |
| 3 | 浏览器冒烟:platform-quest level 1 跑跳落、撞水管、碰怪 | R1 R2 行为验收 |
| 4 | data-model.md 人工对照代码字段 | R5 |
