# T20260819-W1-mastery-uplift - 任务定义卡

> 默认模式：L1 标准

## 0. 领域画像

- 主画像：软件开发
- 次画像：数据模型 / 调度算法

## 1. 任务目标

- 一句话：给幼儿英语 mastery 加"事件日志 + 含 6h 当日轮的课表 v2（方案 A 双轨）+ 今日任务队列"，英语专区首页变成"今天练这个"一键卡。
- 为什么现在做：现有 `[1,3,7,14]` 天间隔漏掉遗忘最陡的头几小时；到期词只是"标黄"没有行动出口；家长和孩子仍要自己决策练什么。
- 预期收益：新词当天再见一次；到期词自动排进今日卡一键开练；答题历史可追溯，将来换调度算法可重放迁移。

## 2. 输入基线

- 参数蓝本：`docs/plans/T20260819-echoloop-borrow/04-机制参数速查.md` §3（宽限窗/手动解锁）、§5（版本快照）
- 现有引擎：`prj/preschool-english-vocab.js`（mastery 状态机 `introduced→practicing→ready→maintenance`、`DEFAULT_INTERVALS=[1,3,7,14]`、`markKnown`/`recordQuizAnswer`）
- 存储：`courseProgress` 内 mastery 结构（**不新增 localStorage key**）
- UI：英语专区 dashboard（`prj/app.js` 英语分区 + `css/preschool/42-english-dashboard.css`）
- 回流入口：`prj/games/shared/workbench-bridge.js` `recordWordAnswer`（blocklegend/wordboss 共用）

## 3. 子任务

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| S1 | 复习事件日志：每次答题追加 `{ts, mode, correct, source}`，每词截尾保留最近 20 条 | `preschool-english-vocab.js`、bridge 透传 source、测试 | `node --test tests/english-mastery-schedule.test.mjs` |
| S2 | 课表 v2 + 方案 A 双轨：新词 stamp `planVersion:2` 用 `[0.25,1,2,4,7,14,28]` 天；无版本字段的存量词按 v1 `[1,3,7,14]`；到期后 48h 宽限，超时只标 `overdue` 不降级 | `preschool-english-vocab.js`、`docs/data-model.md`、测试 | 同上（假时钟） |
| S3 | 今日任务队列：纯函数 `selectTodayTasks(mastery, now, quota)`，排序 overdue > due > 24h 内到期 > 新词配额；英语专区首页置顶"今天练这个"卡（N 词 + 预估分钟 + 一键进练习），完成后翻转为"已完成 + streak" | `prj/app.js`、CSS、测试 | 定向测试 + 浏览器 |

## 4. 设计要点

- **方案 A 语义**（借鉴 Echo Loop plan 快照，04 §5）：读取时 `词.planVersion ?? 1` 查表；日常答题不改版本；只有新引入的词盖 `planVersion: 2`。任何时候不批量改写存量 `nextReview`；
- 事件日志放每词条目内 `events` 数组（只追加、截尾 20），mastery 当前字段视为快照，不因日志改变现有读取路径；
- 6h 轮的天级兼容：`nextReview` 现为日期粒度则改存时间戳（ISO），读取处兼容旧日期字符串（当旧格式解析时按当日 00:00 处理，属 v1 词，行为不变）；
- overdue 只影响 `selectTodayTasks` 排序权重，不改词状态、不惩罚；
- `selectTodayTasks` 为纯函数并挂到可被游戏侧复用的位置（导出方式与现有纯函数一致），E2 今日冒险复用同一排序逻辑。

## 5. 边界

禁止碰：主 localStorage key、597 词库文件、blocklegend 代码、自然拼读专区。
不做：FSRS、Anki 四键评分、批量迁移存量 `nextReview`（方案 B 已否决）、云同步。
`docs/data-model.md` 同步新增字段说明（`events`、`planVersion`、时间戳格式），不改既有字段语义。
