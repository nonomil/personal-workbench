# T20260816-EW — 验收总表

> 代码与浏览器证据已齐；**未标 accepted**（需用户手玩确认）。

## 子任务索引

| 子任务 | 状态 | 测试 | 浏览器走查 |
|--------|------|------|------------|
| S1 客观题型引擎 | 代码绿 | `tests/preschool-english-quiz.test.mjs` | 今日 3 词 speak→quiz：听音选图答错高亮 + 看图选词答对 |
| S2 英语错词本 | 代码绿 | `tests/preschool-english-wrongbook.test.mjs` | 错词本「cake / 听力误判 / 专项复习」 |
| S3 词汇档案 | 代码绿 | `tests/preschool-english-archive.test.mjs` | 已会 5 / 词库 80 / 参考线 80·300 / 三维正确率 |
| S4 生图补素材 | 代码绿 | daily 测试断言 80/80 图片存在 | 课弹层 cake/bread/egg 图 + quiz 四宫格图显示 |
| S5 单词BOSS | 代码绿 | `tests/wordboss-core.test.mjs` | 拼 water → 金币 10、哥布林王 48/60；三关通关未走完 |

## S1 功能验收

- [x] 听音选图/看图选词题干扰项：同 level、不重复、不含正确项、无假词
- [x] 图缺失词自动降级（跳过听音选图），流程不断
- [x] 答对/答错回流 mastery attempts/correct 与分桶；答错写 mistakes 带 errorType
- [x] 客观题 ready 需答对 ≥3 次且 ≥2 类题型；自评/游戏 `markKnown` 仍一次正确即 ready（兼容偏差，见 test-report）
- [x] 答错反馈：高亮正确项 + 慢速 TTS，无惩罚（浏览器：听音选图选苹果，蛋糕绿框 +「看绿色的那一个，再听一遍。」）

## S2 功能验收

- [x] 错词本按 听力误判/认读混淆/拼写错误 分类展示，含图+词+中文
- [x] 到期复习黄标与 review-rules 输出一致（间隔未被改动）
- [x] 专项复习走 S1 引擎，客观答对 3 次移出错词本
- [x] 老 mistakes 数据 migrate 后正常显示（默认 'read'）

## S3 功能验收

- [x] 已会/练习中/复习中/词库总量 四计数与 mastery 实态一致
- [x] 成长曲线随新掌握词单调不减，参考线 80/300 显示正确（SVG，非 canvas）
- [x] 三题型正确率小条与分桶数据一致
- [x] 曲线数据源方案 A：`masteredAt` 首次 ready 盖戳（已登记 test-report）

## S4 素材验收

- [x] 80 词 media.image 覆盖 100%，页内显示正常
- [x] wordboss 素材齐套：3 BOSS + 勇者 + 4 技能 + 6 装备 + 2 底图
- [x] manifest 登记齐全，来源 project-original + 生成工具记录
- [x] 风格抽查：几何 SVG 儿童插画、Q 版不吓人、无文字水印、无外部 IP（未走 grok，见偏差）

## S5 功能验收

- [x] 拼对放技能、伤害结算、三关递进（60/100/150HP）可通关（代码+单测；浏览器只打了第一关一击）
- [x] 中文提示 + 喇叭重听常驻；字母池 = 目标词字母 + 2 干扰
- [x] 金币/装备仅当局有效，storage 无任何金币字段
- [x] 词池含当日 3 词；答题经 recordWordAnswer 回流 mastery
- [x] 通关阳光经 bridge 发放，日 cap 与去重生效；失败仅"再试一次"

## 质量红线（一票否决）

- [x] 阳光唯一账本；无第二货币进 storage
- [x] 无外部 IP 素材/文案；生图产物全 project-original
- [x] 无惩罚性负反馈（不扣阳光、不锁功能、不吓人）
- [x] Vanilla JS 纯本地无构建无 CDN
- [x] review-rules 间隔、阳光数值公式、bridge 协议、80 词内容零改动

## 文档同步

- [x] `docs/data-model.md`：mistakes.errorType/correctStreak、mastery 条目内 quiz 分桶/masteredAt
- [x] `docs/02-课程/英语/01-课程总方案.md`：题型序列与 ready 口径更新
- [x] `docs/00-总控/进度看板.md`：本包状态登记
