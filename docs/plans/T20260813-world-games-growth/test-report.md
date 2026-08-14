# T20260813 — 测试报告

> 执行后填写。未跑的阶段保持空。结论只能是：`允许推进` / `调整后重测` / `停止推进`。

## 阶段 1：前提验证

- 时间：2026-08-13 23:50
- 命令：`node --check prj/preschool-garden.js`
- 退出码：0
- 现象：`tickDefense` / `spawnDefenseWave` / `placeDefensePlant` 仍导出；独立页仍加载 `preschool-garden.js` 与 `workbench-bridge.js`
- 裁决：允许推进

## 阶段 2：最小主链路

- 时间：2026-08-13 23:56
- 命令：`node scripts/verify-garden-auto-fire.mjs`
- 退出码：0
- 浏览器：`http://127.0.0.1:4180/prj/games/garden-defense/index.html?cb=20260813-pvz-feel-v1`
- 现象：种下豌豆射手后点「来一波」，2.8s 内 3 只僵尸左移（column 4/4/5）、场上 3 颗豌豆、无「使用技能」按钮
- 裁决：允许推进

## 阶段 3：关键边界

- 时间：2026-08-13 23:54
- 命令：`node --test tests/preschool-defense-game.test.mjs tests/preschool-garden.test.mjs tests/world-games.test.mjs`
- 退出码：0
- 现象：僵尸 `column=0` 再走一步 → `lost`；normalize 不再把 0 当成缺省弹回第 5 列；同路任意种植仍绿
- 裁决：允许推进

## 阶段 4：阶段回归

- 时间：2026-08-13 23:55
- 命令：`npm test`
- 退出码：0
- 通过数 / 失败数：124 / 0
- 裁决：允许推进

## 阶段 6：S1 最终

- 时间：2026-08-13 23:56
- 清单：种 / 自动发射 / lost / 阳光掉落可点 / 全绿
- 裁决：允许推进
