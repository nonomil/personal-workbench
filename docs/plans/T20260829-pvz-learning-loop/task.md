# 任务：僵尸战场与学习闭环（S1~S4）

## 目标

把场景页的装饰性僵尸变成复习进度可视化；首页给出今日努力方向；
错题 due 激活既有入侵状态机；会了连锁加音效。孩子能一句话说出：
"多认字 = 打僵尸 = 攒阳光 = 守花园"。

## 输入

- 卡片会话：`app.js getPreschoolCourseCardSession` / `session.marks` / `item.review`
- 僵尸列渲染：`app.js renderPreschoolSceneZombieRail`（本轮新增，garden 主题）
- 会了连锁：`app.js` `flashcard-mark` 分支（firePreschoolScenePea + awardSunlight 3）
- 阳光奖励：`app.js awardSunlight(next, awardId, amount)`（awardedIds 幂等）
- 识字进度：`preschool-literacy.js` `mastery[char].dates`（含日期数组，可派生今日会了）
- 错题队列：`storage.buildMistakeReviewQueue(mistakes, today)`
- 入侵状态机：`preschool-garden.js` `garden.invader`（active/health/maxHealth，首页 pixel map 已渲染）

## 产出

1. S1：僵尸列按本场复习卡数渲染；会了复习卡按序击退（is-defeated 动画）；
   全退一次性 `scene-clear:课程:日期` +5；测试 + 缓存戳
2. S2：首页 home-top 下方今日目标横幅（今日会了 N/6 + 进度点 + 达标 CTA）
3. S3：due≥3 → `garden.invader` 激活（`mistake-invasion:日期` 幂等）+ 首页警示行；
   due=0 → 解除 + `mistake-clear:日期` +10
4. S4：WebAudio 合成豌豆/受击/阳光三音，挂 firePreschoolScenePea 链路，no-motion 静音
5. `tests/pvz-learning-loop.test.mjs` 红→绿；dist 重建；test-report 记录

## 边界

- 不动 literacy engine / storage / garden 的既有字段形状（只读派生 + 既有字段激活）
- 不加设置页开关（S4 静音策略 = no-motion 类；正式开关留给后续设置页增量）
- S5/S6 本包不实施

## 完成定义

acceptance.md 全勾 + 定向测试全绿 + 800×360 sim-android 浏览器走查留痕 +
dist 重建 + test-report 更新。
