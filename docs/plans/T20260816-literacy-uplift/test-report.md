# 测试报告

> 状态：S1–S5 代码合同已绿；全量 npm test 里 `bomb` 图标是既有失败，本包未引入。浏览器手玩/打印预览待补。

## S1–S5 记录（2026-08-16）
- 定向：`tests/preschool-literacy-assess.test.mjs` 12/12；`tests/preschool-mistake-cards.test.mjs` 5/5；`tests/preschool-learning-summary.test.mjs` 2/2
- 新增用例：测评出题/阶梯/估算/置信度/历史封顶/错字本排序/专项连对 3 次/打印 8 卡/档案 0-1-N/首页三大卡
- 手工走查：未做（等用户在 `prj/preschool-workbench/index.html` 走测评→错字本→打印→档案→证书）
- 遗留：正式插画仍占位；`bomb` 图标注册是既有合同缺口，不在本包范围

## 记录模板

```
## Sx 记录（YYYY-MM-DD）
- npm test：N 文件 / M 用例，全绿|失败列表
- 新增用例：…
- 手工走查：…（截图路径）
- 遗留：…
```
