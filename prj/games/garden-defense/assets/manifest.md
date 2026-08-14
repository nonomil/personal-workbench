# garden-defense 本地资源

| 路径 | 用途 | 关卡映射 |
|------|------|----------|
| bg/lawn-day.png | 白天草坪 | 1–4 |
| bg/lawn-sunset.png | 黄昏草坪 | 5–8 |
| bg/lawn-night.png | 夜晚草坪 | 9–12 |
| zombies/garden-walker-v4.png | 普通僵尸（v4 重绘） | 全部关卡 |
| zombies/garden-flag-v4.png | 旗帜僵尸（v4 新增） | 波次首领 |
| zombies/garden-cone-walker-v4.png | 路障僵尸（v4 重绘） | 中期关卡 |
| zombies/garden-pail-walker-v4.png | 铁桶僵尸（v4 重绘） | 高关 |
| zombies/garden-football-v4.png | 橄榄球僵尸（v4 新增） | 高关 |
| enemies/zombie-flag.png | 旗帜怪备选 | 波次装饰 / 高关 |
| enemies/zombie-bucket-alt.png | 铁桶变体 | 高关铁桶替换 |

- 僵尸 v4 批次（2026-08-15）：按 `docs/01-方案/工作台小游戏设计/01-花园保卫战/DS--植物大战僵尸--生图提示词.md`
  措辞生成（Agnes，`#ff00ff` 幕布），`scripts/key-garden-zombie.py` 品红抠底 + 512×640 底部对齐；
  僵尸精灵同时发布到 `prj/assets/generated/preschool-pvz-2d/published/garden-*-v4.png`
  供工作台嵌入版（`prj/app.js` PRESCHOOL_PVZ_ASSETS）加载。
- 旗帜/橄榄球此前复用普通/路障贴图，v4 起为独立形象。
- 下岗留存：`zombies/garden-{walker,cone-walker,pail-walker}{,-v3}.png`（旧版）
  不再被引用，留在盘上待用户决定删除。
- 植物与太阳仍优先 `preschool-pvz-2d/published`（观感更接近验收版）。
