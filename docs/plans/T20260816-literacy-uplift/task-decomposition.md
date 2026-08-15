# T20260816-literacy-uplift — 子任务分解

## S1 识字量测评引擎 + 课时 + 结果页

- 输入：`preschool-literacy.js` 现有 `parseBank`/`levelPoolOrAll`/`summarizeMastery`；方案 §3 算法
- 产出：
  - `buildAssessment(bank, progress, { size: 25, salt })`：返回 `{ rounds: [{ char, pinyin, options[4], answer, level }] }`，段间按连对升降级，排除 ready/maintenance 字
  - `scoreAssessment(rounds, answers, bankSizes)`：返回 `{ estimate, confidence, stage, wrongChars[], perLevel }`
  - `config.js` 识字课时 `preschool-chinese-assess`（`mode: 'literacy-assess'`，不进每日必修）
  - `app.js` 弹窗：进度条 24/25 + 大字卡 + 四个拼音选项 + 结果页（估算量/置信度/阶段/错字进错题本）
- 验收：25 题不重复、错题写入 `state.mistakes`（subject=识字）、连对升级路径有测试
- 陷阱：干扰项去重（同音字拼音相同会出双正确答案——按拼音字符串去重）

## S2 测评历史 + 阶段映射 + 摘要接入

- 输入：S1 的 `scoreAssessment` 输出；`courseProgress.literacy`
- 产出：
  - 完成测评时 push `{ date, estimate, confidence, level, wrong }` 进 `courseProgress.literacy.assessments`，slice(-24)
  - `stageForCount(n)` 纯函数（0/250/500/750 界）
  - `buildLearningSummary` 增加 `literacyAssess: { latest, best, history }`；家长摘要页显示最近/最高识字量
- 验收：旧快照（无 assessments 字段）加载不炸；存储字段评审记录在 execution-check
- 陷阱：置信度 <60% 的测评 estimate 不得刷新 best

## S3 错字本字卡化 + 专项复习 + 打印

- 输入：`state.mistakes`（subject=识字）、`resolvePreschoolCardMedia`、字库组词
- 产出：
  - 错题本页识字条目渲染为田字格字卡（大字/拼音/组词/错 N 次徽标），按错次倒序
  - 「专项复习」：只出错字的四选一，连对 3 次走 `markMistakeReviewed(mastered)`
  - 「打印字卡」：A4 print CSS，2×4 卡（田字格大字 + 拼音 + 组词 + 5 练写格 + 裁切虚线），`window.print()`
- 验收：非识字科目条目不受影响；打印页在 Chrome 打印预览为单页 8 卡
- 陷阱：print CSS 要 `@media print` 隔离，别污染屏幕样式；字库查不到的字回退纯文字卡

## S4 成长档案曲线 + 证书

- 输入：S2 的 assessments 历史
- 产出：
  - 识字专区「档案」视图：SVG 折线（0–1000 纵轴、250/500/750 虚线 + 阶段名）、最近/最高/本月新增三 KPI
  - 证书打印页（日期/估算量/阶段/置信度），复用 S3 打印路线
- 验收：0 条历史显示引导文案；1 条历史不画线只画点
- 陷阱：SVG viewBox 按数据自适应，别写死像素

## S5 识字首页三大卡 + 柔光样式

- 输入：`renderPreschoolSubjectTodayPage`（识字分支）、38-paper-glow 色板
- 产出：
  - 首页顶部：KPI 行（会了 N 字 / 本周新增 / 阶段徽章）+ 三大卡（开始测评/错字本/成长档案）+ 周连续条（复用 streak）
  - `css/preschool/40-literacy-uplift.css` 新层 + manifest `@import` + 缓存戳全链
  - 图标先用 lucide + emoji art 占位，预留 `data-asset` 挂点
- 验收：既有课时列表仍可达（三大卡下方保留今日课时）；合同测试断言新结构
- 陷阱：`preschool-workbench.css` 的 `@import` 顺序影响级联，放在 39 后

## 顺序

S1 → S2 → S3 → S4 → S5。S3 与 S4 无数据依赖但共用打印路线，先 S3 定打印骨架。
