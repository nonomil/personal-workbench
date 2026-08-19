# 步骤

> 验证命令以退出码为准。先红后绿；schedule 层时间全部注入。

### 1. S1 · 课表纯函数

- [x] 写测试先红：七轮链式推进（完成第 n 轮 → 下轮 dueAt = 完成时刻 + 表值）；宽限边界（第 1 轮 6h、其余 24h，恰好值两侧）；`reviewPlanVersion` 缺省补 1；七轮全完 → 该关复习毕业
- [x] 新建 `prj/games/blocklegend/data/review-schedule.js`（无 DOM，`node --test` 可跑）
- **验证：** `node --test tests/blocklegend-review-schedule.test.mjs` 4/4

### 2. S2 · 复习之门玩法

- [x] 通关写入 `levelReview[levelId]`（首通即排第 1 轮）
- [x] 出题池 / 题型上移 / 奖励 key 纯函数（门 UI 与缩短副本未接）
- [x] 关卡选择处渲染门状态：到期发光 / 未到期倒计时 / 逾期常亮加"待复习"角标
- [x] 进门 → 缩短副本：2–3 波 + 小 Boss（复用该关 Boss 降配），出题池按 task §4 组装，题型上移一档
- [x] 结算：金币减半 + `awardSunlight('bl-review-<level>-<round>')`；写回 `round+1` 与 `lastCompletedAt`
- [x] 调试面板时间快进
- **验证：** `tests/blocklegend-review-schedule.test.mjs` 13/13。未手玩。

### 3. S3 · 今日冒险首屏

- [x] 进游戏首屏三条队列卡：到期复习之门 > 即将到期（24h 内） > 推进新关；点击直达
- [x] 排序逻辑与 W1 同构：`selectTodayAdventure`（overdue → ready → soon → 无到期则「推进新关」置顶）
- **验证：** 定向测试绿。手玩未做。

### 4. S4 · E3 切片（图鉴/难词/统计）

- [x] 图鉴翻卡：例句中英 + 播音（有 `media.audio` 播文件，否则 `speechSynthesis` 读英文例句）
- [x] `hardWords`：词卡错 ≥2 次入本；复习门连对 2 次移除
- [x] `stats.inputWords / outputWords` 计数；家长报告「听说比」一行
- [x] 收口：帮助文案、总控一行、test-report
- [ ] 独立仓推送（本地 `prj/games/blocklegend/` 无 `.git`，未做）
- **验证：** `tests/blocklegend-review-schedule.test.mjs` 17/17。不标 accepted，等手玩。
