# Execution Check — T20260815

写代码前逐项确认:

- [x] 工作区有大量未提交改动(另一会话 docs 归档 git mv + 本会话游戏/学习 UI 改造)。本包只动:`prj/games/platform-quest/game.js`、`prj/games/platform-quest/index.html`、`tests/platform-physics.test.mjs`、`tests/world-games-growth.test.mjs`、`docs/data-model.md`、本包文件。**不 commit、不 stash、不碰归档移动。**
- [x] 不新增 localStorage key、不改数据结构(R5 只写文档)。
- [x] 碰撞改动有回归风险 → 步骤 4 的合同断言先于浏览器验收,全量测试先于人工验收。
- [x] 徽章"硬编码 11"现状核查已改为派生 → 本包做回归锁,不改运行时行为。
- [x] 缓存戳改动需同步测试断言(先 grep `game.js?v=` 于 tests/)。
