# 任务分解 — T20260815

## 本轮(单会话)

| 步骤 | 文件 | 内容 |
|---|---|---|
| 1 | `prj/games/platform-quest/game.js` | 水平解算加最小穿透守卫 |
| 2 | 同上 | 删除两处死代码水平击退 |
| 3 | `prj/games/platform-quest/index.html` | game.js 缓存戳升级 |
| 4 | `tests/platform-physics.test.mjs` | 补 R1/R2 断言 |
| 5 | `tests/world-games-growth.test.mjs` | 补 R3 徽章总数断言(或并入现有徽章测试) |
| 6 | `docs/data-model.md` | R5 三组字段 |
| 7 | 全量 `npm test` + 浏览器冒烟 | 回填 test-report |

## 后续(另开包,不在本包)

- S1 剩余:断连保护(补签卡)、学习模块真机验收、T20260814 素材版权收尾
- S2:奖励重定价(需用户拍板)、徽章墙、六任务全接练习
