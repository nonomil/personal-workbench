# 测试报告

> 状态：S1–S5 代码已绿，待手玩。不标 accepted。

| 日期 | 切片 | 命令 | 退出码 | 备注 |
|---|---|---|---|---|
| 2026-08-16 | S1–S3 | `node --check prj/games/blocklegend/engine.js` + `game.js` | 0 | 语法过 |
| 2026-08-16 | S1–S3 | `node --test tests/blocklegend.test.mjs tests/world-games.test.mjs` | 0 | 54/54 绿（原 50 + 图集/树缓存/AO/裂纹 4 项） |
| 2026-08-16 | S4 | 同上定向命令（先红：`WORLD_SIZE` 80≠128、`chunksAround` 未导出） | 1→0 | 后绿：世界 128 + `chunksAround` 夹边 |
| 2026-08-16 | S4–S5 | `node --check prj/games/blocklegend/engine.js` + `game.js` | 0 | 语法过 |
| 2026-08-16 | S4–S5 | `node --test tests/blocklegend.test.mjs tests/world-games.test.mjs` | 0 | **55/55** 绿（+ chunksAround） |

未跑全量 `npm test`（既有约 7 个无关失败不修）。浏览器/MuMu 手玩见 acceptance.md，未勾。
