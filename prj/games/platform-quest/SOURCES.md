# platform-quest 参考来源

| 能力 | 参考 | 本仓实现 |
|------|------|----------|
| 变跳高、奔跑摩擦 | [mahmodnasser/mario](https://github.com/mahmodnasser/mario) | `data/physics.js` |
| 惊喜块 / 顶块出道具 | 同上 | `data/levels.js` blocks + `game.js` bumpBlock |
| coyote / jump buffer | HTML5_Platformer, bros | `data/physics.js` |
| 二段跳 | super-catrio 思路 | `game.js` airJumpsUsed |
| 贴图（主角） | 本仓 `world-rebuild-20260807` 批次 | `assets/hero/hero-{idle,run,jump}.png` 三帧动作图（key 抠底），2026-08-14 用户授权合入 |
| 贴图（回退/小怪） | 本仓 `platform-hero` / `voxel-paper-mc` 批次 | `jumper-*` 跳跳侠 4 帧回退、`explorer-*` 旧帧兜底；果仁怪/史莱姆（world-rebuild 批次）/蝙蝠 |
| 地砖/装饰 | 本仓自绘 | `../voxel-adventure/pixel-tiles.js` + `./pixel-decor.js` 代码绘制 |

- 本地 clone：`docs/工作台小游戏设计/refs/mahmodnasser-mario/`（gitignore，需自行下载）。
- 本地比对参考：`ref/platform-quest/assets/hero/` 存有任天堂原版主角贴图，
  **商标图仅限本地查看自用，不得进入 `assets/hero/` 或任何发布包**。
