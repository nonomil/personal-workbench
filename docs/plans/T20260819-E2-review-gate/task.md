# T20260819-E2-review-gate - 任务定义卡

> 默认模式：L1 标准

## 0. 领域画像

- 主画像：软件开发（游戏玩法 + 调度）
- 次画像：UI

## 1. 任务目标

- 一句话：给每个已通关卡按七轮课表生成"复习之门"副本，首屏出"今日冒险"队列；图鉴翻卡播例句、难词本跨日回流、听说统计进家长报告。
- 为什么现在做：12 关通完学习环就断了——`reviewWords` 写了没人消费，mastery 到期词只是混进 `focusPool` 无感；597 条例句资产闲置。
- 预期收益：通关不是终点，复习有玩法载体；孩子进游戏第一眼知道"今天打哪"；家长看得到听说比。

## 2. 输入基线

- 参数蓝本：借鉴包 04 §3（课表/宽限/手动解锁）、§4（排序公式）、§5（版本快照）
- 现有进度：`growth.worldGames.blocklegend`（`clearedLevels`、`reviewWords`、`learnedIds`、`missByWord` 会话态）
- 跨日到期：`courseProgress.minecraft.mastery`（**W1 S2 落地后才有 v2 课表与 overdue 语义**）
- 词池切关：`data/levels.js` 的 `wordThemes`/`climateWords`；波次与出题：`game.js`、`data/words.js`、`data/combat.js`
- 例句与音频：`prj/assets/vocab/core-english-2026.08.15/catalog.json`（中英例句全量、约 33 条包装音频）
- 发奖口径：`workbench-bridge.js` `awardSunlight`（eventKey 幂等）

## 3. 子任务

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| S1 | 复习课表纯函数：`nextReviewFor(levelId, round, completedAt)`、宽限窗、`reviewPlanVersion:1` | 新建 `data/review-schedule.js`、测试 | `node --test`（假时钟） |
| S2 | 复习之门玩法：关卡选择处到期发光传送门 → 缩短副本（2–3 波 + 小 Boss），出题池 = 该关 `reviewWords` ∪ mastery due 该关词 ∪ 难词本，题型上移一档，奖励低于首通 | `game.js`、`data/levels.js`、UI/CSS | 定向 + 手玩 |
| S3 | 今日冒险首屏：三条队列（到期复习之门 > 即将到期 > 推进新关），排序复用 W1 的 selectTodayTasks 逻辑 | `game.js`、UI | 同上 |
| S4 | E3 切片：图鉴翻卡播例句（有包装音频用音频、否则 TTS）；`hardWords` 持久化（错≥2 次进本、复习连对 2 轮毕业）；`inputWords`/`outputWords` 计数进家长报告"听说比" | `game.js`、`data/words.js`、家长页 | 同上 |

## 4. 设计要点

- 课表：`[6,18,24,48,72,168,336]` 小时链式（相对上一轮完成时间）；宽限窗第 1 轮 6h、其余 24h；逾期只标记不惩罚、门常亮可进（04 §3）；
- 存储：`progress.levelReview[levelId] = { round, lastCompletedAt, reviewPlanVersion }`，`progress.hardWords`、`progress.stats.{inputWords,outputWords}` 全部进现有 `growth.worldGames.blocklegend`，**无新 localStorage key**；
- 题型上移：上次 choice → 本次 spell/enpick；上次 spell → speak（E1 已落地则用覆盖率判定，未落地则退 enpick，**不硬依赖 E1**）；
- 复习门奖励：金币 ≈ 首通一半 + 阳光走 `awardSunlight` eventKey `bl-review-<level>-<round>`（每轮一次幂等），口径低于首通防刷；
- 调试面板加时间快进（假时钟注入 schedule 层），否则无法手玩验收。

## 5. 边界

禁止碰：`voxel-craft/`、其他游戏、阳光总口径、`storage.js` 主结构。
不做：第 13 关、新词库、复习门排行榜、多人。
门控：S2/S3 的"mastery due 该关词"接入需 W1 S2 已落地；若 W1 未动，S2 可先用 `reviewWords`+`hardWords` 出池并在 test-report 记门控债。
blocklegend 改动完成后当轮同步推送独立仓。
