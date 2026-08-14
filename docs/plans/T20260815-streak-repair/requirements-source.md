# 需求来源 — T20260815-streak-repair

| 来源 | 位置 | 内容 |
|---|---|---|
| 综合改进规划 | `docs/00-总控/2026-08-14-综合改进规划.md` 第 1 节 + S1 第 3 条 | "断连保护(补签卡)+ 回归欢迎;每月 2 张补签卡" |
| 变更与同步规则 | `docs/00-总控/变更与同步规则.md` 第 3 节 | 动 growth 字段必须同步 data-model.md + 测试 |
| 代码事实 | `prj/child-growth.js` | streak/bestStreak/奖励解锁全部从 checkinDates 派生;recordAction 发当日 +10;纯函数可单测 |
| 代码事实 | `prj/app.js` waterGrowthPlant | UI 动作 → 引擎调用 → commit 的提交模式 |
