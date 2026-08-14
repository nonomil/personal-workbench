# voxel-adventure 本地资源

> ⚠️ **本地专用形象**:当前 `hero/explorer-*.png` 槽位放的是**史蒂夫两帧**(idle/run,源自 `../../ref/voxel-adventure/assets/hero/`,按内容裁齐),
> `enemies/creeper.png` 为**苦力怕**(草原/矿洞出没)。两者均为 Mojang 商标角色,**只能本地自用,不得进入对外发布包**。
> 发布前切回原创形象:把 `hero/papermc/` 五个文件复制回 `hero/` 覆盖,并把 `data/levels.js` 里 mobs 的 `creeper` 移除即可。

| 路径 | 实际内容 | 用途 |
|------|----------|------|
| hero/explorer-idle.png | 史蒂夫 · 站立 | 主角站立/挖掘(镐为代码叠加) |
| hero/explorer-walk-a.png | 史蒂夫 · 行走 | 行走 A / 跳跃帧 |
| hero/explorer-walk-b.png | 史蒂夫 · 站立 | 行走 B(与 A 交替) |
| hero/explorer-jump.png | 史蒂夫 · 行走 | 跳跃帧 |
| hero/explorer-mine.png | 史蒂夫 · 站立 | 挖掘帧 |
| hero/papermc/ | Paper-MC 探险家五帧备份 | 发布用原创主角 |
| hero/steve-idle.png、steve-run.png | 史蒂夫原始帧(未裁) | 冗余,可删 |
| hero/miner-idle.png、keyed/ | 历史遗留 | 未使用 |
| enemies/creeper.png | 苦力怕 | 草原/矿洞敌人(48×64) |
| enemies/其余 | Paper-MC 家族 11 种 | 各区域敌人 |
| bg/sky-day.png | 等级 1–3 天空 |
| bg/sky-dusk.png | 等级 4–5 黄昏天空 |

- 敌人贴图来源:`voxel-paper-mc` 批次生图 + key 抠图;地砖/工具/UI:`./pixel-tiles.js` 代码绘制。
