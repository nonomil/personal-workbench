# 执行步骤（每步先红测试再实现）

## S1 测评引擎

1. 写 `tests/preschool-literacy-assess.test.mjs` 红测试：
   - `buildAssessment` 出 25 题、字不重复、四选项拼音互不相同且含正确答案
   - 段内 5 连对后下一段级别上升；5 连错后下降；不低于 L1 不高于 L5
   - ready/maintenance 字不出现在题目里
   - `scoreAssessment`：手算样例（L1 全对 + L2 对 3 → estimate = size(L1) + 0.6×size(L2)，取整到 10）；置信度公式样例；乱点（5 题 <1.5s）标 lowConfidence
2. `preschool-literacy.js` 实现 `buildAssessment` / `scoreAssessment` / `stageForCount` 并导出。
3. `config.js` 加课时 `preschool-chinese-assess`（mode `literacy-assess`，meta「25 题 · 测识字量」，不进必修）。
4. `app.js`：`isBankQuizLesson` 不收编，走独立 `literacy-assess` 会话分支（题量固定、无阳光加成、结束进结果页）；错题走 `recordLessonMistake`。
5. 跑绿，缓存戳 bump，手玩一遍完整 25 题。

## S2 历史与阶段

6. 红测试：完成测评后 `courseProgress.literacy.assessments` 长度 +1、超过 24 条截断、低置信不更新 best；旧状态无该字段不炸。
7. `app.js` 测评结束时写入历史；`child-courses.js buildLearningSummary` 输出 `literacyAssess`；家长摘要模板加「识字量：最近 N（阶段）· 最高 M」。
8. execution-check 记录字段评审（名称/形状/上限/迁移策略）。跑绿 + 缓存戳。

## S3 错字本与打印

9. 红测试（`tests/preschool-mistake-cards.test.mjs`）：识字条目渲染含田字格类名与错次徽标；专项复习队列只含识字错字；连对 3 次状态变 mastered；打印页 HTML 含 8 卡结构。
10. `app.js` 错题本识字分支字卡化 + 「专项复习」「打印字卡」按钮；打印视图函数 + `@media print` 样式。
11. 跑绿 + 缓存戳；Chrome 打印预览截图存 test-report。

## S4 档案与证书

12. 红测试：0/1/N 条历史的 SVG 输出分支；参考线 250/500/750 存在；证书 HTML 含日期与估算量。
13. `app.js` 档案视图 + 证书打印页；识字专区导航加「档案」。
14. 跑绿 + 缓存戳。

## S5 首页与样式

15. 红测试：识字今日页含 KPI 行、三大卡 data-action、周连续条；课时列表仍在。
16. `app.js` 首页分支改版；新建 `css/preschool/40-literacy-uplift.css`，`preschool-workbench.css` 挂 `@import`；全链缓存戳。
17. `npm test` 全绿；浏览器全流程走查（测评→错字→打印→档案→证书）记录进 test-report。

## 收尾

18. 更新 `docs/plans/README.md`、`00-总控/当前状态.md`、本包 README 状态；acceptance 全勾。
