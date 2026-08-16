# garden-defense 本地资源

| 路径 | 用途 | 关卡映射 |
|------|------|----------|
| bg/pvz-garden-lawn-bg.webp | 草坪背景（webp，301KB） | 全部关卡 |
| bg/pvz-garden-lawn-bg.png | 同图 png 版（2.1MB，备份不引用） | — |
| plants/plant-sunflower.png | 向日葵 | 第 1 关起 |
| plants/plant-peashooter.png | 豌豆射手 | 第 1 关起 |
| plants/plant-wallnut.png | 坚果墙 | 第 3 关起 |
| plants/plant-potatomine.png | 土豆地雷（正式贴图，490×567 透明底） | 第 8 关起 |
| plants/plant-snowpea.png | 寒冰豌豆 | 第 4 关起 |
| plants/plant-cherrybomb.webp | 樱桃炸弹 | 第 6 关起 |
| plants/plant-bucketshooter.png | 铁桶射手（豌豆被铁桶砸中后） | 转化 |
| plants/plant-ice-bucketshooter.png | 寒冰铁桶射手 | 转化 |
| zombies/zombie-basic.webp | 普通僵尸 | 全部关卡 |
| zombies/zombie-flag.webp | 旗帜僵尸 | 波次首领 |
| zombies/zombie-conehead.webp | 路障僵尸 | 中期关卡 |
| zombies/zombie-buckethead.webp | 铁桶僵尸 | 高关 |
| zombies/zombie-football.webp | 橄榄球僵尸 | 高关 |
| zombies/zombie-javelin.png | 标枪僵尸 | 第 10 关起 |
| zombies/zombie-polevault.png | 跳高僵尸 | 第 8 关起 |
| projectiles/proj-bucket.png | 铁桶弹 | 铁桶僵尸 / 铁桶射手 |
| projectiles/proj-javelin.png | 标枪弹 | 标枪僵尸 |

- 2026-08-15 用户裁决（覆盖总纲 §5 绘本卡通措辞）：角色统一换用
  `prj/games/ref/assets/generated/preschool-pixel/pvz/` 像素套图（植物 5 + 僵尸 5，
  RGBA 透明底），背景统一 `pvz-garden-lawn-bg.webp`（与 ref 目录 md5 一致）。
  花园/黄昏/夜晚三张 lawn-*.png 与 v4/v5 僵尸批次全部下岗，不再被引用，
  留在 git 历史与盘上（部分已由并行会话删除）待用户决定清理。
- 星芒观战小像（S1 G3）：`../../assets/generated/preschool-pixel/published/star-companion.png`，
  加载失败 emoji 🦄 兜底。
- 太阳仍用 `preschool-pvz-2d/published/pvz-sun-token.png`。
- 工作台嵌入版（`prj/app.js` PRESCHOOL_PVZ_ASSETS）加载的 `garden-*-v4.png`
  已随 v4 下岗不再更新，待工作台侧后续统一（不在 T20260815-GD 范围）。
