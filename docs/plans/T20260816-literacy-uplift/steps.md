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

## 视觉增量（V1 → V3，S1–S5 验收后执行）

19. **V1 设计基线**：读取 `05-识字视觉与交互优化方案.md`，确认色彩 token、390px 布局、素材 ID、无文字嵌图和回退规则；不改测评算法。
20. **V1 生成主视觉**：调用 `scripts/generate_literacy_visual_assets.py`，生成向阳小种子阅读主视觉；保存原图、去背图和来源 manifest。
21. **V1 生成入口组**：生成测评/错字本/档案三图标组，拆分后各自命名；检查三个图标未互相重叠、未裁切。
22. **V1 生成阶段组**：生成种子/绘本/阅读/进阶四徽章，拆分后统一到 256×256；生成证书角花并统一到 512×512。
23. **V1 技术验收**：运行 `python -X utf8 scripts/normalize_literacy_visual_assets.py`，确认 `ready/manifest.json` 的 9 项均为 RGBA、四角透明、目标尺寸正确；有绿边/伪文字则返工。
24. **V2 接线**：将 `ready/` 中通过验收的素材复制到 `prj/assets/generated/preschool-literacy-uplift/published/`，在 `40-literacy-uplift.css` 和现有 HTML 挂点接入；缺图回退 emoji/CSS。
25. **V2 回归**：更新静态资源缓存戳，跑两份识字新增测试、既有摘要/错题测试和 `npm test`；确认没有运行时网络请求和新存储 key。
26. **V3 浏览器验收**：在 390px、768px、桌面宽度走查首页；再走测评→结果→错字本→专项复习→打印→档案→证书；截图写入 `test-report.md`。
27. **V3 打印验收**：Chrome 打印预览确认 A4 2×4 八卡、裁切线和练写格；屏幕导航/按钮不出纸面。
28. **收口**：只有 V1 技术、V2 接入、V3 浏览器/打印证据齐全，才把本包状态从 `review` 改为 `accepted`。

## 执行结果（2026-08-16）

- S1–S5、V1–V3 已按本步骤执行；识字定向测试 **18/18**。
- Codex 浏览器已完成首页、25 题高置信度测评、结果、错字本、专项复习、A4 八卡打印结构、成长档案和证书链路。
- V2 缓存戳为 `app.js?v=20260816-literacy-ui-v4`、`40-literacy-uplift.css?v=20260816-literacy-ui-v7`、`preschool-literacy.js?v=20260816-literacy-ui-v2`。
- 仓库全量 `npm test` 当前 **468/475**，7 项失败来自花园/资源包/图标/发布素材等本包范围外的既有门禁；因此包状态保留 `review`，不把全仓门禁写成通过。
