# ART-01 核心 16×16

运行时仍由 `data/atlas-paint.js` 画进图集（同步、无加载）。这里的 PNG 是同一套像素的导出，方便审查。

| 文件 | 图集格 | 用途 |
|---|---|---|
| grass_top.png | 0 | 草顶 |
| grass_side.png | 1 | 草侧（草沿+泥） |
| dirt.png | 2 | 泥 / 草底 |
| stone.png | 3 | 石 |
| oak_side.png | 4 | 橡木侧 |
| oak_top.png | 5 | 橡木顶 / 木板 |
| oak_leaf.png | 6 | 橡叶（镂空） |
| sand.png | 24 | 沙 |
| core-strip.png | — | 8 张 ×16 最近邻拼条 |

重导：`node tools/export-atlas-png.mjs`（在 `prj/games/blocklegend` 下）。
