# 步骤

> 验证命令以退出码为准。先红后绿；时间相关逻辑全部注入假时钟（`now` 参数，不直接 `Date.now()`）。
> 每个 D 期收尾：全量 `node --test tests/blocklegend.test.mjs tests/blocklegend-review-schedule.test.mjs` 绿 + 推独立仓。

## D1 词级记忆状态 + 词力

### 1. D1-S1 · 记忆状态纯函数

- [x] 新建 `tests/blocklegend-word-memory.test.mjs`，写测试先红：
  - 首见答对入盒 2、答错入盒 1；`dueAt` = now + 间隔表值
  - 答对升盒封顶 5；答错降一盒最低 1；`streak` 归零/累加
  - `dueWords(mem, now)`：恰好到期边界两侧（dueAt-1ms 不出、dueAt 出）
  - `wordPower`：空表=0、混合盒号求和正确
  - `memoryVersion` 缺省补 1；未知字段透传不丢
  - `hardWords` 规则：错 2 次入本、复习场景（`context:'review'`）连对 2 轮出本——与 E2 现测试断言逐字对齐
- [x] 新建 `prj/games/blocklegend/data/word-memory.js`（无 DOM，`node --test` 可跑）：
  - `createMemory()` / `recordAnswer(mem, wordId, {correct, context}, now)` / `dueWords(mem, now, filterIds?)` / `wordPower(mem)` / `levelStars(mem, focusWords)`（平均盒号）
- **验证：** `node --test tests/blocklegend-word-memory.test.mjs` 全绿

### 2. D1-S2 · 接答题回路

- [x] 盘点 `game.js` 所有答题落点（波次词卡、金块、词门、Boss 蓝罩、复习门、多科配菜**除外**——配菜不进英语词账），统一在判分处调 `recordAnswer`
- [x] `hardWords` 读写并入 `word-memory.js`；E2 的 `noteHardWord` 仍写同一 progress（17/17 断言未改）
- [x] 存档接线：`growth.worldGames.blocklegend.wordMemory` 读入/写回；旧档无此字段时空表冷启动（`learnedIds` 有的词补盒 1，`dueAt = now + 1d`）
- **验证：** `node --test tests/blocklegend-word-memory.test.mjs tests/blocklegend-review-schedule.test.mjs` 全绿（E2 不回归）

### 3. D1-S3 · 出词队列改造

- [x] 测试先红：`buildWaveWords` 输出顺序 = 该关到期词 > 其他关到期词 > `reviewWords` > 新 `focusWords`；复习占比 ≤60%；同词一波内不重复
- [x] `game.js` 波次出词改走该函数；`reviewRatio` 字段语义改为"复习占比上限"，`data/levels.js` 加注释不改值
- **验证：** 定向测试绿 + `tests/blocklegend.test.mjs` 全量绿

### 4. D1-S4 · 词力可见 + E2 接入

- [x] HUD 角落显示词力整数；选关图每关显示 0–5 星（`levelStars` 四舍五入）
- [x] E2 出题池并入 due 词，去重保序
- [x] 调试面板 `__blDebug.skipDays(n)`（复用 E2 `skipHours`）
- **验证：** 定向绿。手玩 A1–A3 未做。
- [x] **D1 收口**：全量测试绿、总控一行。独立仓未推。

## D2 重玩三档难度

### 5. D2-S1 · 难度档纯函数

- [x] 测试先红：
  - `DIFFICULTY_TIERS` 三档参数与 task §4.2 表逐项一致（怪血/金币/题型档/新词比例）
  - `recommendTier`：平均盒号 <3 → default；≥3 → adventure；≥4 且已解锁 → apocalypse
  - `apocalypseUnlocked`：冒险档通过的 Boss 关按 `bossMechanic` 去重计数，≥3 true；2 false
  - `clearedTiers` 写回结构 `{ [levelId]: ['default','adventure'] }`
- [x] 新建 `prj/games/blocklegend/data/difficulty.js`（纯函数）
- **验证：** `node --test tests/blocklegend-difficulty.test.mjs` 全绿

### 6. D2-S2 · 选关与进关

- [x] 选关图：已通关卡出三档按钮；天启未解锁灰显 + 提示"冒险档通过 3 个不同 Boss 关（已 x/3）"；推荐档描边高亮
- [x] 进关参数套用：怪血乘系数（不改基表）；冒险/天启出词复习占比 100%；题型起始档、天启限时词门 20s、Boss 蓝罩 3 连答
- [x] 限时词门超时 = 门不开重新出题，无扣血（幼儿口径）
- **验证：** 定向绿；手玩 A4–A7

### 7. D2-S3 · 结算与防刷

- [x] 测试先红：同关同档二刷阳光不重发（eventKey 幂等）；金币按档位系数；`clearedTiers` 追加不重复
- [x] 结算页显示档位徽标 + 首次该档通关的阳光提示
- **验证：** 定向绿 + `tests/world-games.test.mjs`（bridge 口径不破）
- [x] **D2 收口**：全量绿、总控一行。独立仓未推。

## D3 词卷轴隐藏关 + 营地

### 8. D3-S1 · 卷轴纯函数

- [x] 测试先红：`scrollAvailable`（`climateWords` 全部盒号≥3 true；任一 <3 false + 返回缺口词表）；`secretUnlocked(scrolls)` 集 3 张 true；`scrolls` 追加幂等
- [x] 实现进 `data/difficulty.js`
- **验证：** `node --test` 定向绿

### 9. D3-S2 · 卷轴与隐藏关玩法

- [x] 气候词未全到 3 星时记下缺口提示；达标则进关捡卷轴（未另做 3D 卷轴模型）
- [x] 拾取写 `scrolls`，集 3 张选关图出现"词灵回廊"入口
- [x] 隐藏关：worldSeed=999、3 波混怪、无 Boss、出词 100% due ∪ hardWords、掉 1 钻石 + 金币×2、阳光 `bl-secret-1` 一次性
- [x] `data/quests.js` 加隐藏关任务文案
- **验证：** 定向绿；手玩 A8–A10

### 10. D3-S3 · 营地 Hub

- [x] 营地复用今日冒险层：选关/假人/直接进关；假人出词=难词本优先→due，答对 +1 金币（未另开 32×32 体素营地）
- [x] 营地可跳过：`camp-skip` 直达进关（R20）
- **验证：** 自动绿。手玩 A11–A12 未做。
- [x] **D3 收口**：全量绿、总控一行。独立仓未推。

## D4 补救通道

### 11. D4-S1 · 难词降级支架

- [x] 测试先红：难词本内词第 3 次见面题型强制四选一 + 携带例句字段；答对后第 4 次恢复正常梯度
- [x] `game.js` 出题处判断 + 词卡渲染例句（phraseZh + `phoneticOf` 读音）
- **验证：** 定向绿。手玩 A13 未做。

### 12. D4-S2 · 学习密度结算行

- [x] 结算页加一行"本局答题 N 题 · M 分钟"；`stats.sessionDensity` 环形保留 20 局
- **验证：** 定向绿。手玩 A14 未做。
- [x] **D4 收口**：全量绿、总控一行、test-report 回填（含 W1 跨轨门控债）。独立仓未推。
