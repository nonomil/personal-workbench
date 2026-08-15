# mc/ 素材来源与许可

这些 16×16 像素贴图复制自开源项目 [cheyao/2d-minecraft](https://github.com/cheyao/2d-minecraft)
（commit: main @ 2026-08-15 克隆），该项目以 **Zlib 许可证**发布（见其仓库 LICENSE，
Copyright (C) 2024-2025 Cheyao）。Zlib 允许复制、修改与再分发，需保留本来源说明。

- `blocks/` — 方块贴图（草/土/石/圆石/橡木/树叶/木板/工作台/熔炉/火把/煤矿/铁矿/钻石矿等）
  与挖掘裂纹 `destroy_stage_*.png`
- `items/` — 工具与物品（木/石/铁镐、斧、锹、剑、木棍、煤、钻石、苹果）
- `ui/` — 热键栏与选中框（hotbar / hotbar-selection / inventory）

**注意：**
1. 上游项目未含 `steve.png` 之外的官方角色素材；本目录**刻意未拷贝** `steve.png`
   （Mojang 角色形象）。玩家角色继续使用本仓原创的探险者像素画（`pixel-tiles.js`）。
2. 上游方块贴图在风格上源自 Minecraft 像素传统；对外名称保持「方块世界」，
   不使用 Minecraft 商标。若未来正式对外发布，是否替换为完全自制贴图由用户拍板。
