# T20260819-bank-switch-uplift：英语词包切换 + 多科配菜四项优化

> 状态：**review**（S1–S4 代码已绿。S5 手玩未做。独立仓未推。不标 accepted）。
> 源头：2026-08-19 各科题库接入分析（对话结论）+ `docs/01-方案/工作台小游戏设计/05-方块传奇/05-多科题库接入设计.md`。
> 北极星不变：看见英文、听见英文、说出或拼出英文，让魔法立刻改变世界。

核心发现：`minecraft-english-2026.08.15` 包（324 卡、324 图、110 音）导出后**零消费者**，游戏英语写死 `PACK_BASE = core-english-2026.08.15`，而 `loadCatalog(done, opts)` 已支持 `opts.base` ——切包口子早留好了。另外三条为配菜可见性、账本联动、村庄碎词收敛。

| 文件 | 用途 |
| --- | --- |
| [`task.md`](./task.md) | 目标、输入基线、子任务表 |
| [`requirements-checklist.md`](./requirements-checklist.md) | 需求裁决（做/不做） |
| [`steps.md`](./steps.md) | 执行步骤（先红后绿） |
| [`acceptance.md`](./acceptance.md) | 手玩验收清单 |
| [`test-plan.md`](./test-plan.md) | 自动 + 浏览器测试 |
| [`test-report.md`](./test-report.md) | 执行后回填 |

纪律：不新开 localStorage key；战斗暴击永远英语；识字/拼音/口算不进 `words.js`；不动 `engine.js` 世界生成；先写失败测试。
