# 步骤

> 验证命令以退出码为准。先红后绿，时间相关全部假时钟（now 注入）。

### 1. S1 · 事件日志

- [x] 写测试先红：`markKnown`/`recordQuizAnswer` 后 events 追加一条含 `{ts, mode, correct, source}`；第 21 条挤掉最旧；旧快照无 events 字段读取不炸
- [x] `preschool-english-vocab.js`：答题路径统一走 `appendEvent`；bridge `recordWordAnswer` 透传 `source`（blocklegend/wordboss/workbench）；`child-courses.normalizeEnglish` 保留 events
- [x] `docs/data-model.md` 增 events 字段说明
- **验证：** `node --test tests/english-mastery-schedule.test.mjs` → 5/5，退出码 0

### 2. S2 · 课表 v2 + 方案 A 双轨

- [x] 写测试先红：新词引入 → `planVersion=2` 且 `nextReview = now + 6h`；存量词（无 planVersion）继续 `[1,3,7,14]` 天推进；v1 词答题**不会**被改成 v2；`nextReview + 48h` 内 `isDue` 不带 overdue，之后 `isOverdue=true` 且状态机不降级；旧日期字符串格式可解析
- [x] `preschool-english-vocab.js`：`INTERVALS_BY_VERSION = {1:[1,3,7,14], 2:[0.25,1,2,4,7,14,28]}`（单位天）；`nextReview` 改存 ISO 时间戳，读取兼容旧格式
- [x] `docs/data-model.md` 增 planVersion / 时间戳格式说明
- **验证：** `node --test tests/english-mastery-schedule.test.mjs` 9/9；英语回归合计 30/30

### 3. S3 · 今日任务队列 + 首页卡

- [x] 写测试先红：`selectTodayTasks` 排序（构造 overdue/due/快到期/新词四类混合词集，断言顺序与配额截断）；空词库给新词引导；全部完成给空态
- [x] 纯函数落位（与现有纯函数同款导出，供 E2 复用）
- [x] `prj/app.js` 英语专区首屏置顶"今天练这个"卡：文案"复习 N 个词（约 M 分钟）"（M = ceil(N × 25s / 60)），点击直进对应练习序列；完成后翻转"今日已完成 · 连续 X 天"（streak 复用现有打卡天数口径，不另开账本）
- [x] CSS + 缓存戳；总控一行；test-report 回填
- **验证：** 调度 12/12，英语回归合计 33/33。浏览器走查未做。不标 accepted。
