# 测试计划

## 自动

| 期 | 命令 | 覆盖（全部假时钟注入） |
| --- | --- | --- |
| D1 | `node --test tests/blocklegend-word-memory.test.mjs` | 升降盒边界（封顶 5/最低 1）、首见分流、dueAt 恰好值两侧、wordPower 求和、levelStars 平均、memoryVersion 补 1、hardWords 入本/毕业与 E2 断言逐字一致、旧档冷启动补盒不发洪水 |
| D1 | `node --test tests/blocklegend.test.mjs` | buildWaveWords 排序（该关到期 > 他关到期 > reviewWords > 新词）、复习占比 ≤60%、一波内去重 |
| D1 | `node --test tests/blocklegend-review-schedule.test.mjs` | E2 全量 17 项不回归；出题池并入 due 词后去重保序 |
| D2 | `node --test tests/blocklegend-difficulty.test.mjs` | 三档参数表逐项、recommendTier 三分支、apocalypseUnlocked 按 bossMechanic 去重计数（2 假 3 真）、clearedTiers 幂等追加、各档 eventKey 幂等、金币系数 |
| D2 | `node --test tests/world-games.test.mjs` | bridge 发奖口径不破 |
| D3 | `node --test tests/blocklegend-difficulty.test.mjs`（追加） | scrollAvailable 全达标/缺一个返回缺口词、secretUnlocked 集 3 张、scrolls 幂等、隐藏关出词 100% due∪hardWords、bl-secret-1 幂等 |
| D4 | `node --test tests/blocklegend.test.mjs`（追加） | 难词第 3 次强制降级 + 例句字段、第 4 次恢复梯度、sessionDensity 环形 20 局 |
| 收口 | `node --test tests/blocklegend.test.mjs tests/blocklegend-word-memory.test.mjs tests/blocklegend-review-schedule.test.mjs tests/blocklegend-difficulty.test.mjs tests/world-games.test.mjs` | 每期收尾全量绿才算该期完成 |

约定：时间一律由参数 `now` 传入；`recordAnswer` 等纯函数不得 `Date.now()`；测试不依赖真实等待。

## 浏览器

`http://127.0.0.1:4196/prj/games/blocklegend/index.html?v=<当期戳>`

按 [`acceptance.md`](./acceptance.md) A1–A17 逐项走；重点回归线：

1. **首通线**（默认档第 1 关全流程）：金币、阳光、词卡、Boss 蓝罩——每期都走一遍，任何期不许破坏；
2. **时间线**（调试面板快进）：D1 的盒到期、E2 的门到期共用同一快进入口，两者互不干扰；
3. **存储线**：A16 检查 + 旧档升级 A1x；
4. 控制台无 error、触屏键位、多科配菜石碑不受影响（配菜不进英语词账，D1-S2 明确排除）。

## 性能抽查

营地场景（D3-S3）加载后 FPS 不低于现有首屏；`wordMemory` 597 词全量时 `buildWaveWords` 单次 <5ms（测试里用 `performance.now` 断言宽松上限）。
