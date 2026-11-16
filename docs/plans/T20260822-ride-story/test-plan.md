# 测试计划

## 自动化

| 命令 | 覆盖 |
| --- | --- |
| `node --test test/ride-policy.test.mjs` | 门控四分支、demo 超时、买鞍后 free |
| `node --test test/fx.test.mjs test/dragon-skin.test.mjs` | 骑乘姿态回归 |
| 工作台 `node --test tests/blocklegend.test.mjs`（若本包改了共享口径） | 商店/金币回归 |

## 浏览器

1. `npx serve G:\StudyCode\blocklegend -p 7450`
2. 新档网页模式进营地。
3. 按 acceptance A1–A8。
4. 控制台无 `window.__blErr`。

## 不同步就失败

- 工作台 `prj/games/blocklegend/data/ride-policy.js` 与独立仓字节级应一致。
- `index.html` 必须加载 `ride-policy.js`，且版本号高于缓存。
