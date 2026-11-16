# 测试报告

> 2026-08-22 浏览器实测 + 自动化。服务：`http://localhost:13469/`（独立仓 `G:\StudyCode\blocklegend`）。

## 自动化

| 检查 | 结果 | 备注 |
| --- | --- | --- |
| `node --test test/ride-policy.test.mjs test/fx.test.mjs test/dragon-skin.test.mjs` | **46/46 绿** | 政策 8 + 商店/堡垒/词灵 + 姿态回归 |
| 两仓同步 | 已同步 | `ride-policy.js` / `shop.js` / `world-gen.js` / `game.js` / `index.html` / 测试 |

## 浏览器实测（网页模式 + `__blDebug`）

| ID | 检查 | 结果 | 证据 |
| --- | --- | --- | --- |
| A1 | 营地无鞍可上龙 | 过 | 龙在出生点旁，`canStartMount` → `demo 20s` |
| A2 | 体验约 20 秒后落地 | 过 | 超时 toast「体验结束 · 去商人摊换龙鞍」，`rideDemoUsed=true` |
| A3 | 体验后再骑被拦 | 过 | `gateBefore.reason=need-saddle` |
| A4 | 商人摊有龙鞍 $40 | 过 | 商店列表 `Dragon Saddle / 龙鞍 · $40` |
| A5 | 买鞍后营地无限骑 | 过 | `mode=free`，toast「骑上龙了 · 空格升高…」，截图 `camp-mounted-lookdown.png` |
| A6 | 刷新不丢鞍 | 政策层 | `gear.saddle` 走现有 `progress.gear` persist，无新 key |
| A7 | 无鞍关卡不能骑 | 过 | D1 已测；本轮有鞍时 L1 另测 |
| A8 | 有鞍 L1 仍不能骑 | 过 | toast「这关地面学词 · 第4/6/8/12关才能骑」 |
| A9 | L4 雪夜短骑 40s | 过 | climate=`snow`，toast「雪夜护送 · 骑龙约 40 秒」，截图 `l4-snow-ride.png` |
| A10 | L6 下界短骑 + 提示 | 过 | climate=`nether`，toast「躲开恶魂火球 · 说中再喷龙息」 |
| A10b | L8 星路可骑 | 过 | climate=`astral`，龙已生成，`segment 60s` |
| A11 | L12 飞着不能通关 | 过 | `tryFinishLevel()` 飞着返回 false，toast「飞着不能通关 · 先落地」 |
| A11b | L12 说词推进后落地才能过 | 过 | 7 次 `fortressOnWord` → step 4；落地 step 5；`tryFinishLevel()` true |
| D4 | 护目镜 / 宝石上架 | 过 | 商店 $25 / $30，已装备显示 `(on)`，截图 `shop-ride-items.png` |

## 截图评估与本轮优化

| 观察 | 判断 | 处理 |
| --- | --- | --- |
| 营地第三人称能看见展翅学园龙 | 通过，Lambert 不是黑柱 | 不重做 GLB |
| L4 / L12 骑乘相机能看见龙背与翅 | 通过 | 不改相机 |
| L12 落地文案被「从龙背下来了」盖住 | 体验缺口 | `endRide` 优先堡垒落地 toast |
| 短骑/体验没有剩余时间提示 | 孩子不知道何时落地 | 剩 8 秒 toast 一次 |
| `startLevel` 后残留 `rideMode` | 调试态脏 | 开关清空 `rideMode` / 计时 |
| 雪原地面仍是绿蓝格、天空偏红 | 既有气候材质，不是本轮引入 | 不改世界贴图 |
| 帧率 7–19 | 既有 GLB + 营地复杂度 | 不在本轮减面 |

## 空战 / 堡垒按关卡往后加

| 关 | 空战 | 堡垒 |
| --- | --- | --- |
| 4 | 无（只护送） | 无 |
| 6 | 上龙刷 1 只恶魂，跟飞高度 | 无 |
| 8 | 上龙刷幻翼 + 恼鬼 | 无 |
| 12 | 第 2 步恶魂、第 3 步凋零（跟飞高度） | 1–5 步提示；飞着不能通关 |

---

## 已知债（不阻塞）

- 雪原/末地地面贴图和关卡名不完全对应（旧气候）。
- 骑乘时 HUD 仍写「F 小卖部/骑龙」，未单独做空战条。
- 恶魂躲避复用现有弹道 + 倾斜，没有新恶魂模型。
