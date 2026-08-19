# 测试报告

> 回填日期：2026-08-19。不标 accepted。

## 自动化

| 命令 | 结果 | 日期 |
| --- | --- | --- |
| `tests/blocklegend-pack-switch.test.mjs` | 3/3 | 2026-08-19 |
| `tests/blocklegend-question-port.test.mjs` | 全绿（含 S2/S3 新断言） | 2026-08-19 |
| `tests/blocklegend-villages.test.mjs` | 全绿（含 S4 新断言） | 2026-08-19 |
| `tests/blocklegend.test.mjs` | 207/208 | 2026-08-19 |

`blocklegend.test.mjs` 失败项：`melee fan and bolt homing stay deterministic`（农场动物重叠仍应命中）。本包未改战斗/近战，记为既有失败。

三文件合计定向 **40/40**。

## 手玩（acceptance A1–A9）

| 项 | 结果 | 备注 |
| --- | --- | --- |
| A1–A9 | 未做 | S5 门槛未跑 |

## 遗留

- 手玩切包、欠账 toast、卡片墙「今日游戏里练」、椅子 V/T 不再出卡
- blocklegend 独立仓未推
- 既有近战农场动物断言 1 条红，不在本包范围
