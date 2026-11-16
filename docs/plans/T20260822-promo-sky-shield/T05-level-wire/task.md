# T05 接到第 6 / 12 关

> 状态：pending · 依赖 T01–T04

## 目标

有鞍上龙进入第 6 关：出红罩 → 龙息打中出 10 泡 → 念 5 破盾 → 之后龙息按既有公式打恶魂。第 12 关开桥/塔顶复用 `hearBubble`。飞着不能 `finishLevel`。超时用已有 `segmentMs` 落地。

## 文件

- 修改：`game.js`（上龙、语音回调、`tryFinishLevel`）
- 修改：`data/ride-policy.js`（仅当需要 `rideEncounterOf(6)` 带 `skyShield: true`；不要改 `RIDE_LEVELS`）
- 测试：`test/ride-policy.test.mjs` + 针对「飞着不能通关」的既有断言

## 词来源

本关词表 / `climateWords`。禁止 fallback 到宣传片 OCR 词。
