# 任务：识字体验升级（测评 / 错字本 / 档案 / 首页）

## 目标

家长打开识字专区能得到一个可信的「识字量」数字和它的变化曲线；孩子端错字变成好看的字卡并可打印；识字首页升级为测评/错字本/档案三大卡布局。

## 输入

- 字库与引擎：`prj/data/preschool/识字/character-bank.json`、`prj/preschool-literacy.js`
- 级别工具：`prj/preschool-bank-levels.js`（`levelPoolOrAll`）
- 错题链路：`prj/storage.js`（`recordLessonMistake` / `buildMistakeReviewQueue` / `markMistakeReviewed`）、`state.mistakes`
- 学情摘要：`prj/child-courses.js buildLearningSummary`、`app.js renderPreschoolLearningSummary`
- 设计稿：`docs/01-方案/学习项目设计/04-识字体验升级方案.md`（含测评算法 §3）

## 产出

1. `preschool-literacy.js`：`buildAssessment(bank, progress, options)` / `scoreAssessment(session)` 纯函数 + 导出
2. `config.js`：识字专区新增「识字量测一测」课时（`mode: 'literacy-assess'`）
3. `app.js`：测评弹窗流程、结果页、档案视图、错字本字卡渲染、打印页、首页三大卡
4. `courseProgress.literacy.assessments` 字段（封顶 24 条）+ 阶段映射函数
5. print CSS（A4 2×4 字卡 + 证书）
6. 新 CSS 层 `css/preschool/40-literacy-uplift.css` + 缓存戳
7. 测试：`tests/preschool-literacy-assess.test.mjs`、`tests/preschool-mistake-cards.test.mjs`（新增），既有识字/错题/摘要测试保持绿

## 边界

- 不动 `character-bank.json` 内容，不动 `review-rules.json`
- 不新建 localStorage key；不加图表库、打印库等新依赖
- 不做分享/云同步/家长密码锁（工作台已有家长侧约定）
- UI 正式插画不在本包内生成

## 完成定义

`docs/plans/T20260816-literacy-uplift/acceptance.md` 全勾 + `npm test` 全绿 + 浏览器手玩走查记录进 test-report。
