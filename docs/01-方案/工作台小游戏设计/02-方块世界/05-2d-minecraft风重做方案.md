# 方块世界 · 2d-minecraft 风重做方案（表现层）

- 日期：2026-08-15
- 状态：执行中
- 来源：用户拍板——喜欢 [cheyao/2d-minecraft](https://github.com/cheyao/2d-minecraft) 的美术，
  「参考它的 C++，用 JS 完全重做」。已核对：该仓库为 C++23/SDL3/Emscripten，**不适合整体合入**
  本纯静态工作台；采用「贴图直取（zlib）+ 玩法规格移植到现有 Vanilla JS 引擎」路线。
- 数据层（`data/world.js`、`data/quests.js`）有 200+ 行合同测试锁定，**不动**；
  本轮只重做表现层与交互手感。

## 1. 从 C++ 源码抽取并已对齐的规格

| 规格项 | 2d-minecraft（C++） | 本仓 JS 落点 |
|---|---|---|
| 方块贴图 | 16×16 PNG（grass/stone/oak/log/ores…） | `assets/mc/blocks/` 直取，canvas 最近邻放大 |
| 挖掘裂纹 | `destroy_stage_0..9` 覆盖层 | 挖掘进度按 MINE_WINDUP→MINE_END 映射 0..9 帧叠加 |
| 挖掘时间 | BREAK_TIMES（草 30 tick / 石 80 / 矿 120+） | 沿用现有 MINE_HIT/MINE_END 节奏（已为幼儿调短） |
| 工具等级 | MINING_LEVEL（木1/石3/铁5/钻7） | 已有 rank 门禁（USE_TOOL_GATE）等价实现 |
| 热键栏 | `ui/hotbar.png` + `hotbar-selection.png` | DOM 热键栏换贴图底 + 选中框 |
| 玩家 | Steve 贴图（Mojang IP） | **不拷贝**，继续用原创探险者（pixel-tiles.js） |
| 世界生成 | 16 列区块、噪声地形、矿脉 | 已有 generateWorld 等价（区域预设+矿脉） |
| 合成/熔炉 | 36 格背包、合成台、熔炉 UI | 本轮给工坊面板换 MC 风皮肤，机制不变 |

## 2. 改动清单

1. **素材**：`assets/mc/{blocks,items,ui}/`（21+10+3 张，zlib，附 README 署名；不含 steve.png）
2. **`game.js`**：
   - `TEXTURES` 贴图表（kind→文件）+ 启动时 `loadImage('tex_'+kind)` 预载
   - `drawBlock`：贴图 → pixel-tiles → 灰块 三级回退，`imageSmoothingEnabled=false`
   - `drawMineFx`：挖掘中按进度叠 `destroy_stage_*` 裂纹（0/2/4/6/8/9 六帧）
   - `renderHotbar`：工具/方块图标优先用 MC 贴图（`mcIcon()` 取 data URL 或 img 路径）
   - 挖镐挥动贴图（drawPickSwing）换 `items/wooden-pickaxe|stone-pickaxe.png`
3. **`game.css`**：canvas `image-rendering: pixelated`；hotbar 槽位用 `ui/hotbar.png` 底图、
   选中槽用 `hotbar-selection.png`；工坊面板（voxel-craft）MC 风边框底色
4. **测试**：`tests/voxel-world.test.mjs` 追加素材合同（关键贴图存在、game.js 引用
   `assets/mc/blocks/` 与 `destroy_stage`）
5. **戳**：index.html 内 game.js / game.css 戳升 `20260815-mc-art-v1`

## 3. 不做 / 版权边界

- 不拷贝 steve.png、不引入 Minecraft 商标字样、不拷上游 78MB 音频
- 不改 world.js/quests.js/workshop.js 机制、不动 bridge 与存档结构
- 沙和水上游无对应贴图：走 pixel-tiles 回退（保持原创）
- 对外发布前贴图去留由用户拍板（README 已注明来源与许可）
