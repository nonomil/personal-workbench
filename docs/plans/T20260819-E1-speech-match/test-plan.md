# 测试计划

## 自动

`node --test tests/speech-match.test.mjs`

覆盖：tokenize 缩写/混排/空输入；lemma 不规则表全量 + 规则后缀 + 双写还原；LCS 保序反例与命中下标；evaluate 三场景阈值边界值（恰好等于各档下限）；noEnglishDetected；segments 与原文字符区间一致。

回归：`node --test tests/blocklegend.test.mjs`（若本地存在）确认既有纯函数不破。

完整步骤见 [`../T20260819-echoloop-borrow/05-完整测试方案.md`](../T20260819-echoloop-borrow/05-完整测试方案.md) §2 / §4。

## 浏览器

`http://127.0.0.1:4196/prj/games/blocklegend/index.html?v=20260819-e2s3`

Boss speak 破罩正/反例各一次；练一句 3 星与 1 星各一次；高亮渲染检查；控制台无 error。
