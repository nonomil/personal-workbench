# T05 步骤

## 1. 失败测试

- `rideEncounterOf(6)` 带 `skyShield: true`（或等价字段）
- 第 12 关 `tryFinishLevel` 在 `mounted === true` 时失败（回归）

## 2. 接线

`toggleMount` 成功且 level===6 → `startShield(levelWords)`。
语音命中走 `hearBubble`。龙息打中罩才 `revealBubbles`。
`segmentMs` 到点 `dismount`。

## 3. 绿后双仓同步，碾 cache
