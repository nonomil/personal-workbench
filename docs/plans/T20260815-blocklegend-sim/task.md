# T20260815-blocklegend-sim - 任务定义卡

> 默认模式：L1 标准

## 0. 领域画像

- 主画像：软件开发
- 次画像：UI 优化

## 1. 任务目标

- 一句话：把设计方案 §8 薄商店和 §5 放置手落到 `prj/games/blocklegend/`。
- 为什么现在做：参考图有 Shop，用户要「像我的世界」；砍挖已有，缺买装备和放下。
- 预期收益：金币有去处；挖出的方块能砌一小块，学习循环不被商城页打断。

## 2. 输入基线

- 方案：`docs/01-方案/工作台小游戏设计/05-方块传奇/01-游戏设计方案.md`
- 代码：`prj/games/blocklegend/`（engine 已有 `edits` / `breakVoxel` / `remeshAt`）
- 进度对象：`growth.worldGames.blocklegend`，可加 `gear` 字段

## 3. 子任务

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| S1 | 商店纯函数 + 交易 UI + 攻防/药水生效 | `data/shop.js`、`game.js`、`index.html`、测试 | `node --test tests/blocklegend.test.mjs` |
| S2 | 热键 5 放置三种掉落 | `engine.js` `placeVoxel`、`tools.js`、`game.js` | 同上 |
| S3 | 帮助/总控/走查记录 | 文档 + 帮助文案 | 定向测试绿 |

禁止碰：`voxel-craft/`、`storage.js`、bridge 阳光数值、三游戏逻辑。
