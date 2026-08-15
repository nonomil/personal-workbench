# test-plan

## 自动化（Node，先红后绿）

| # | 用例 | 文件 | 期望 |
|---|---|---|---|
| T1 | 答对回流：mastery 项 attempts/correct/state/nextReview 正确 | `tests/blocklegend.test.mjs` | ready、今天+3 |
| T2 | 同日重复答对：dates 去重、attempts 累加 | 同上 | dates.length=1 |
| T3 | 答错回流：state=practicing、nextReview 今天+1 | 同上 | 通过 |
| T4 | 零发放：回流前后 sunlight/totalSunlightEarned 不变 | 同上 | 逐值相等 |
| T5 | 引擎缺失：返回 null、不写快照、不抛异常 | 同上 | 通过 |
| T6 | 旧快照缺 minecraft 字段：normalize 兜底不炸 | 同上 | 通过 |
| T7 | 既有 blocklegend 合同 14 条不回退 | 同上 | 全绿 |
| T8 | 全量回归 | `npm test` | 不低于启动基线（启动时记录具体数字） |

## 浏览器走查（写截图/数值进 test-report）

| # | 步骤 | 期望 |
|---|---|---|
| B1 | blocklegend 答对 2 / 答错 1，读 localStorage | mastery 3 键，状态 ready/ready/practicing |
| B2 | 回工作台 MC英语专区 | 「会了 X / 324」+2 |
| B3 | 刷新 | 数字保留 |
| B4 | 打开 garden-defense / voxel-craft / platform-quest 首页 | 无 console error（bridge 兜底验证） |
| B5 | 320/390px 视口过一遍 MC 专区 | 无横向溢出（不改 UI，防御性检查） |

## 不测

- 不做 MuMu/APK 验收（发布口径仍 PARTIAL，另开发布任务）。
- 不测 597 词英语专区（本包不动它）。
