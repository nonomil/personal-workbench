# T20260822-ride-story - 任务定义卡

> 默认模式：L1 标准

## 0. 领域画像

- 主画像：软件开发（游戏玩法 + 学习门控）
- 次画像：UI（toast、商店卡片）

## 1. 任务目标

- 一句话：把已有骑龙收成「短体验 → 金币换龙鞍 → 指定关卡短空战」，学习仍走答题，不另开积分。
- 为什么现在做：龙已能飞、能喷、能买装备，但上龙无门控，关卡空战和剧情还没接到学习环上。
- 预期收益：①孩子先玩到飞，再为了再飞去答题攒金；②空战不替代地面学词；③商人摊有明确新商品。

## 2. 输入基线

- 方案：`docs/01-方案/工作台小游戏设计/05-方块传奇/10-骑龙剧情学习与兑换.md`
- 代码（独立仓，工作台镜像）：
  - `data/shop.js`：薄商店，`buy` 按 `slot` 写入 `gear`
  - `game.js`：`toggleMount`、`session.coins`、`progress.gear`、`openTrade`
  - `engine.js`：`updateMountPhysics`、骑乘 tick
  - `data/fx.js`：`rideAttitude` / `rideFloor`
  - `data/world-gen.js`：营地/平原可骑龙
  - `data/levels.js`：12 关，`bossId` 含 ghast / storm / dragon
- 存储：`growth.worldGames.blocklegend.gear`，无新 key
- 测试：独立仓 `test/*.mjs`；工作台另有 `tests/blocklegend.test.mjs`

## 3. 子任务

### D1 门控 + 体验 + 龙鞍（P0）

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| D1-S1 | 纯函数 `ride-policy`：`hasSaddle` / `canStartMount` / `demoExpired` | 新建 `data/ride-policy.js` + `test/ride-policy.test.mjs` | `node --test test/ride-policy.test.mjs` |
| D1-S2 | 商店加 `dragon-saddle`（40 金，`slot: saddle`，不进攻防） | `data/shop.js` + 政策测试里买一次 | 定向 |
| D1-S3 | `toggleMount` 读政策；体验 20s 到点 `dismount`；无鞍 toast | `game.js` | 定向 + 手玩 |
| D1-S4 | 买龙鞍写入 `progress.gear.saddle` 并 persist；脚本版本号 | `game.js`、`index.html` | 手玩刷新仍能骑 |

### D2 指定关短骑（P1）

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| D2-S1 | `levels.js` 增加可选 `rideSegment: { levelIds, maxMs }` 纯函数查询 | `data/levels.js` + 测试 | `node --test` |
| D2-S2 | 第 4 / 6 关有鞍才允许上龙；第 6 关恶魂弹需倾斜躲开、说中才结算龙息击杀 | `game.js`、`mobs.js` | 手玩 |

### D3 星路 + 堡垒（P1）

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| D3-S1 | 第 8 关骑龙段 + 风暴听音配对 | `game.js`、`data/levels.js` | 手玩 |
| D3-S2 | 第 12 关五步堡垒，第 5 步强制落地才能 `finishLevel` | `game.js` | 手玩 + 定向「飞着不能通关」 |

### D4 词灵与可选商品（P2）

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| D4-S1 | 词灵：出题 TTS 跟读；连对 3 缩短本段龙息 CD | `game.js` | 定向 |
| D4-S2 | 护目镜 / 龙息宝石（可选） | `data/shop.js` | 商店测试 |

## 4. 设计参数（D1 以本节为准）

- `DEMO_MS = 20000`
- 龙鞍 `id: dragon-saddle`，`cost: 40`，`slot: saddle`
- `canStartMount({ gear, hub, demoUsed })`：
  - 有鞍 → `{ ok:true, mode:'free' }`
  - 营地且未用完体验 → `{ ok:true, mode:'demo', limitMs:20000 }`
  - 否则 → `{ ok:false, reason:'need-saddle' }`
- 体验「已用完」记在 `session.rideDemoUsed`（会话级）。刷新营地可再体验。龙鞍才持久。
- `statsOf` 忽略 `saddle` 槽，攻防数字不变。

## 5. 边界

- 只改：骑龙门控、商店龙鞍、上龙 toast/计时；后期关卡 `rideSegment`
- 不碰：阳光 eventKey、词力、出词队列、第 13 关、新 localStorage key
- 明确不做：第二货币、新建筑、第二条龙
- 禁止顺手：重做 GLB、改营地房子布局、改解锁金币表

## 6. 验收

- [x] D1–D4 自动化绿（46/46）
- [x] 新档 20 秒体验 → 再骑被拦 → 买鞍后营地无限骑
- [x] 有鞍也只在营地和第 4/6/8/12 关能骑
- [x] 第 12 关飞着 `tryFinishLevel` 失败，落地后通过
- 关键验证：`node --test test/ride-policy.test.mjs test/dragon-skin.test.mjs test/fx.test.mjs`
- 手玩证据：`test-report.md`

## 7. 升级触发

关卡空战若要改怪物 AI 超过「躲弹 + 现有 hurtMonster」，停下来另开 D2 设计，不在 D1 里塞。
