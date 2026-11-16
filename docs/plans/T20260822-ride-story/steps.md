# 执行步骤

工作目录：独立仓 `G:\StudyCode\blocklegend`。每步同步到 `G:\StudyCode\个人工作台\prj\games\blocklegend`。

## D1-S1 政策纯函数（先红后绿）

1. 写 `test/ride-policy.test.mjs`：无鞍营地可 demo；demo 用过不可骑；有鞍 free；关卡无鞍拒绝。
2. 跑 `node --test test/ride-policy.test.mjs`，预期失败（模块不存在）。
3. 写 `data/ride-policy.js` 使测试通过。
4. 再跑同一命令，预期绿。

## D1-S2 商店龙鞍

1. `data/shop.js` 的 `ITEMS` 增加 `{ id:'dragon-saddle', en:'Dragon Saddle', zh:'龙鞍', slot:'saddle', def:0, atk:0, heal:0, cost:40 }`。
2. 政策测试或商店断言：`buy` 40 金成功后 `gear.saddle === 'dragon-saddle'`，`statsOf` 攻防仍为 0。
3. 金币 39 买失败不扣款。

## D1-S3 / S4 接线

1. `index.html` 在 `shop.js` 后加 `data/ride-policy.js`。
2. `toggleMount`：上龙前 `canStartMount`；demo 记 `session.rideDemoAt`；失败 toast。
3. `tick`：demo 超时调用 `dismount`，`session.rideDemoUsed = true`。
4. 买龙鞍走现有 `buy` → `progress.gear` → `persist`。
5. 版本号：`shop.js` / `game.js` / 新脚本。
6. 跑 `node --test test/ride-policy.test.mjs test/fx.test.mjs test/dragon-skin.test.mjs`。

## D2 以后

见 `task.md`。未做完 D1 不开始改关卡波次。
