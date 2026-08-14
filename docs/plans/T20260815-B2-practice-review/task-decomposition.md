# T20260815-B2 — 子任务分解

## S1 六项任务练习入口补全（P0）

- 输入：`prj/config.js` 任务定义、`prj/app.js` 今日卡渲染、`dailyPlans.practiceLessonId` 机制
- 产出：六项任务每项有"去练习"，完成回写打卡；映射合同测试
- 验收：浏览器六项逐一走通 + `node --test tests/preschool-daily-plan.test.mjs` 绿
- 预估：0.5–1 人日

## S2 错题 1/3/7 天回流（P0）

- 输入：`mistakes` 记录（`recordLessonMistake`）、错题页、S1 打通的练习通道
- 产出：复习队列派生逻辑（第 1/3/7 天到期入队、练对出队、去重）；今日卡"复习"入口；假时钟测试
- 验收：`node --test tests/preschool-lesson-mistakes.test.mjs` 覆盖到期/出队/去重三规则；真机一轮
- 预估：0.5–1 人日
- 门控：S1 验收通过后展开 steps；若需新增 storage 字段，先过 `变更与同步规则`

## 顺序与依赖

S1 → S2（S2 的"复习入口"复用 S1 的跳转通道）。两个 S 都不动奖励数值。
