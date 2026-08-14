# Test Report — T20260815-streak-repair

## 阶段 1:引擎单测(tests/preschool-streak-repair.test.mjs,6 项)

- 归一化:缺省补 `{cardsUsedByMonth:{}, repairedDates:[]}`;非法月键/非法日期被过滤。
- 补昨天:断档 2 天记录 → repair 后 yesterday 进 checkinDates;**阳光/totalSunlightEarned/xp/awardedIds 全部不变**;当日行动后连续 4 天恢复。
- 拒绝路径:昨天无断档 → "不需要补签";月度第 3 张 → "用完了";跨月按月键重置(用量记在当月键)。
- getView:canRepair/welcomeBack/available 三个字段驱动 UI;修复后 canRepair=false(按钮消失);无历史记录不显示。

## 阶段 2:合同断言

- app.js 含 `repair-streak` 动作、`repairGrowthStreak` 处理器、"欢迎回来"文案;child-growth.js 含 `STREAK_REPAIR_MONTHLY_CARDS = 2`;data-model.md 含 streakRepair。
- 缓存戳 `app.js?v=20260815-streak-v1`,三处测试断言同步(workbench-refresh / lesson-mistakes / math-practice)。

## 阶段 3:全量测试

- `npm test` **247/247 全绿**(241 基线 + 6 新增)。修复过程中归一化对 `cardsUsedByMonth` 缺省 null 的守卫缺陷(第 3 张卡的 Object.keys 崩溃)被首跑测试抓住并修复。

## 阶段 4:浏览器验收

- 幼儿版成长页(#growth):补签行挂入幼儿版"连续奖励"卡(初版只挂了儿童版,已补幼儿版——两版共用同一 growth 与动作)。
- 现场状态为"累计打卡 1 天/连续 0 天",按规则(无历史或无断档)补签行**正确隐藏**——负路径真机验证通过。
- 正路径(断档→出现→点击→恢复)受浏览器会话 localStorage 只读限制无法造态预演,由 6 项引擎单测 + 合同断言覆盖;下次真实断档日真机补验。

## 结论

R1–R5 满足;正路径真机验收留待自然断档,已在验收清单如实标注。
