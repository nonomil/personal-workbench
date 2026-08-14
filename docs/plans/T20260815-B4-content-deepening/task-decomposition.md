# T20260815-B4 — 子任务分解（启动时逐项细化）

## C1 新练习 mode：图配字 / 听音选调

- 输入：`prj/data/preschool/识字|拼音/lessons.json` 中被降级的 activityType；`openLessonDialog` 现有 mode 分支
- 产出：`build_lesson_pack.py` 放行两类新 activityType；`app.js` 两个新弹窗模板；对应测试
- 验收：新 mode 课时可玩、老 choice 课不受影响、`npm test` 绿
- 门控：B2 完成；图配字素材可用性先评估（升级触发 1）

## C2 古诗/拼音/拼读 60 日挂入

- 输入：`prj/data/preschool/古诗|拼音|自然拼读/`（数据已存在）；`preschool-lesson-pack.js` 137–166 挂载表
- 产出：挂载表扩展三科；`tests/preschool-lesson-pack.test.mjs` 扩展（append 不覆盖种子课合同）
- 验收：三科专区课程数增长可见；种子课顺序不变；测试绿
- 门控：B2 完成

## C3 家长学情摘要页

- 输入：`courseProgress.*.mastery`、连击（B3-S3 派生）、`mistakes`、兑换记录（B3-S1）
- 产出：一页只读汇总（入口放家长侧，不进孩子主流程）
- 验收：数值与 storage 手算一致；零写入
- 门控：B3 S1–S3 交付

## C4 fourSteps / evidence 消费

- 输入：`prj/data/preschool/<学科>/lessons.json` 的 fourSteps、evidence 字段；课程详情"认→练→测→用"静态步骤条
- 产出：步骤条读真实字段；缺字段课时优雅回退到现有静态文案
- 验收：抽查 10 课时步骤条与数据一致；测试绿
- 门控：B2 完成

## 顺序建议

无硬依赖，价值排序：C2（内容立刻变多）→ C1（玩法变深）→ C4（数据变真）→ C3（家长可见）。
