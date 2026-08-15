# 测试计划

## 新增测试文件

### tests/preschool-literacy-assess.test.mjs（S1/S2/S4）

| 用例 | 断言 |
| --- | --- |
| 出题规模与去重 | 25 题、char 不重复、每题 4 个拼音选项互不相同且含正确项 |
| 阶梯上行 | 构造全对答案序列 → 后段 level 高于前段，封顶 L5 |
| 阶梯下行 | 构造全错序列 → 降到 L1 后不再降 |
| 排除已会 | progress 里 ready/maintenance 的字不出现 |
| 估算手算样例 | L1 全对 + L2 命中 3/5 → estimate = size(L1)+0.6×size(L2)，取整到 10 |
| 置信度 | 覆盖 5 级 + 稳定作答 → ≥0.6；只触达 1 级 → <0.6 |
| 乱点降置信 | 5 题 elapsed<1500ms → lowConfidence=true |
| 历史写入 | 完成后 assessments +1、上限 24、低置信不改 best |
| 兼容 | 无 assessments 字段的旧 progress 可正常出题与写入 |
| 阶段映射 | 0/249→字芽初萌，250/499→绘本启蒙期，500/749→自主阅读期，750+→阅读进阶期 |
| 摘要接入 | buildLearningSummary 含 literacyAssess.latest/best |
| 档案渲染 | 0 条→引导文案；1 条→无 polyline 有 circle；3 条→polyline + 3 条参考线 |

### tests/preschool-mistake-cards.test.mjs（S3/S5）

| 用例 | 断言 |
| --- | --- |
| 字卡渲染 | 识字错题 HTML 含田字格类名、拼音、错次徽标；数学错题保持原类名 |
| 排序 | 错 3 次的字排在错 1 次之前 |
| 专项复习队列 | 只含 subject=识字 且未 mastered 的条目 |
| 连对晋级 | 同字连对 3 次 → status=mastered |
| 打印结构 | 打印视图 HTML 含 8 个 `.print-card` 与练写格结构 |
| 首页合同 | 识字今日页含 KPI 行、3 张 data-action 大卡、周连续条、课时列表 |
| 缓存戳 | index.html 引用的 app.js/css/config.js 戳为本包新值 |

## 既有测试回归

`npm test` 全量；重点盯 `preschool-lesson-mistakes`、`preschool-learning-summary`、`preschool-workbench-refresh`（活动计数、图标注册、CSS import 合同）。

## 手工走查（记录进 test-report）

1. 完整 25 题测评（故意错 5 题）→ 结果页数字合理、错字进错题本
2. 再测一次全对 → 档案出现两点折线、best 更新
3. 错字本打印预览截图（A4、8 卡）
4. 证书打印预览截图
5. 390px 宽度首页无溢出
6. 旧档案兼容：localStorage 里手工删掉 assessments 字段 → 刷新无报错
