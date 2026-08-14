# 任务分解

| 步骤 | 文件 | 内容 |
|---|---|---|
| 1 | prj/child-growth.js | streakRepair 归一化 + repairStreak + getView 暴露 canRepair/available |
| 2 | prj/app.js | 连续奖励卡补签按钮 + repair-streak 动作(commit 模式) + 缓存戳 |
| 3 | tests/preschool-streak-repair.test.mjs | 引擎单测 5 组 + app 合同断言;同步 3 处旧缓存戳断言 |
| 4 | docs/data-model.md | streakRepair 字段与规则 |
| 5 | npm test + 浏览器验收 | 回填 test-report |
