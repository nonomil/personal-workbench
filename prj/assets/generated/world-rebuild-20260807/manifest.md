# world-rebuild-20260807 · manifest

Grok Imagine 生成，用于幼儿三独立全屏小游戏。

- **raw**：各主题文件夹内原始出图（可能仍带洋红底）
- **keyed/**：`scripts/chroma-key-magenta.py` 洪水填充抠底后的透明 PNG（运行时优先）

## keyed/garden/

| 文件 | 用途 |
|------|------|
| plant-sunflower.png | 向日葵 |
| plant-peashooter.png | 豌豆射手 |
| plant-wallnut.png | 坚果墙 |
| plant-snowpea.png | 寒冰射手 |
| plant-cherrybomb.png | 樱桃炸弹 |
| zombie-basic.png | 普通僵尸 |
| zombie-conehead.png | 路障僵尸 |
| zombie-buckethead.png | 铁桶僵尸 |
| sun-token.png | 阳光代币 |
| lawn-bg.png | 草坪战场背景 |

## keyed/voxel/

| 文件 | 用途 |
|------|------|
| hero.png | 方块探险主角 |
| grass-block.png | 草方块 |
| stone-block.png | 石头 |
| crystal-block.png | 晶体矿 |
| sky-bg.png | 天空背景 |

## keyed/platform/

| 文件 | 用途 |
|------|------|
| hero.png | 横版主角 |
| coin.png | 金币 |
| grass-platform.png | 平台 |
| flag.png | 终点旗 |
| enemy.png | 巡逻敌人（巧克力团） |
| sky-bg.png | 天空背景 |

## 已知缺陷 FLAG

- 抠底后边缘可能有轻微色晕（洪水填充阈值 62）。
- sun-token 含装饰字 “SUN”。
- zombie 服装含 “ZOMBIE” 字样。
- 横版敌人首次审核拦截后改为 brownie blob。
- 背景图 `*-bg.png` 不做抠底，整景保留。
- 未做逐帧 walk/attack 动画；当前为 idle bob（Canvas sin）+ 种子卡 CSS bob。
