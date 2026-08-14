# 步骤(本轮)

1. child-growth.js:createDefaultGrowth/normalize/normalizeShallow 补 `streakRepair: { cardsUsedByMonth: {}, repairedDates: [] }`(normalizeRepair);新增 `repairStreak(input, date)`;getView 增 `streakRepair: { available, usedThisMonth, canRepair, yesterday }`。
2. app.js:renderPreschoolGrowth 连续奖励卡头加断档补签按钮(`growth.streakRepair.canRepair` 时);action `repair-streak` → commit 调 repairStreak;成功 toast "连续记录接上啦"。
3. 缓存戳 app.js?v=20260815-streak-v1,**同步三处测试断言**(workbench-refresh 108/111/585、lesson-mistakes 90、math-practice 129)。
4. 新测试文件:engine 行为 + app 合同。
5. data-model.md 增补。
