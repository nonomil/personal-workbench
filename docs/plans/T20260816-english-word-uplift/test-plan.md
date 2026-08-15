# T20260816-EW — 测试计划

> 所有 node 测试以退出码为准；浏览器走查记截图/文字证据进 test-report。

## 阶段 0：开工侦查（S1 前）

- 现状流程图（speak/match/spell 推进机制、mastery 写入路径）
- 80 词合并库后 media.image 覆盖率实测数字

## 阶段 1：S1 出题与回流

- `tests/preschool-english-quiz.test.mjs`
  - 干扰项：数量 3、同 level、无重复、不含正确项、无 batch 内词
  - 图缺失词降级：不产听音选图题，流程不空转
  - 洗牌：正确项位置分布抽查（100 次生成无固定位）
  - 回流：答对/答错后 attempts/correct/分桶/mistakes(errorType) 断言
  - ready 判定：2 类题型 ×3 次答对才 ready；自评止步 practicing；老快照（无分桶）兼容
- 浏览器：今日 3 词全流程 + 答错分支（高亮+慢读）+ 控制台无错
- 回归：既有英语测试 + `npm test` 全绿

## 阶段 2：S2 错词本

- `tests/preschool-english-wrongbook.test.mjs`
  - migrate：老 mistakes 无 errorType → 默认 'read' 且不炸
  - 分类归桶正确；到期黄标与 review-rules 输出一致
  - 专项复习答对 3 次移出错词本、mastery 正常推进
- 浏览器：错词本三分类显示、专项复习走通

## 阶段 3：S3 档案

- 构造 mastery 快照断言：四计数、曲线点序列单调不减、三维正确率
- 浏览器：曲线 canvas 渲染、参考线 80/300、空数据（新用户）不炸

## 阶段 4：S4 素材

- 盘点清单：80 词逐词 image 存在性，生成前后对比（前 N 缺 → 后 0 缺）
- 抽查：10 词页内显示 + wordboss 素材尺寸/透明底/无文字核对
- manifest 完整性：每个产物有条目、来源、工具记录

## 阶段 5：S5 游戏

- `tests/wordboss-core.test.mjs`
  - 伤害结算：技能基础值 + 装备加成 → BOSS 血量正确递减；冰冻跳过反击一次
  - 字母池：含目标词全部字母 + 恰 2 干扰；乱序
  - 词池：当日 3 词必在；不足由 80 词已学 + 同 level 597 补足
  - 金币：仅内存态，storage 快照前后 diff 无金币键
  - 阳光：通关调用 bridge 且重复通关当日不超 cap
- 浏览器：三关通关、失败重开、移动端触控可点
- 终态回归：`npm test` 全绿；通用错题本/识字/拼读页无回归
