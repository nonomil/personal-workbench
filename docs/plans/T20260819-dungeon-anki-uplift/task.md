# T20260819-dungeon-anki-uplift - 任务定义卡

> 默认模式：L1 标准

## 0. 领域画像

- 主画像：软件开发（游戏玩法 + 学习调度）
- 次画像：UI（HUD、选关图、营地）

## 1. 任务目标

- 一句话：给每个单词一个 Leitner 记忆状态并汇总成「词力」，用词力驱动地下城式重玩循环（三档难度、Boss 关解锁门槛、卷轴隐藏关、营地），让"复习需求"和"重玩理由"变成同一件事。
- 为什么现在做：12 关是一次性内容，通完即弃；`reviewRatio` 盲抽不知道哪个词快忘了；E2 复习之门解决了"什么时候复习"，还差"复习哪些词"和"复习的玩法厚度"。
- 预期收益：①每个词有账（到期可查、词力可见）；②老关卡有 3 倍重玩价值；③学扎实成为探索钥匙（卷轴）；④连错的词有专门通道，不再 Prodigy 式放羊。

## 2. 输入基线

- 调研与参数依据：`docs/01-方案/工作台小游戏设计/05-方块传奇/07-地下城式关卡与ANKI复习优化.md`（地下城威胁等级/Boss 门槛/卷轴/营地；Noun Town SRS 内建；Prodigy 反面教训；FSRS 最小可借核心）
- 已落地的复习设施（E2）：`data/review-schedule.js` 七轮课表、`progress.levelReview`、`hardWords`（错≥2 入本、复习连对 2 轮毕业）、`stats.inputWords/outputWords`、今日冒险 `selectTodayAdventure`
- 进度存储：`growth.worldGames.blocklegend`（`clearedLevels`、`reviewWords`、`learnedIds`、`hardWords`、`levelReview`、`stats`）——本包新增字段全部挂这里，**无新 localStorage key**
- 出词与题型：`game.js`（波次出词、金块、结算）、`data/words.js`（`KIND_ALIASES`、`phoneticOf`、题型）、`data/levels.js`（12 关 `focusWords`/`climateWords`/`waveKinds`/`bossMechanic`）
- 词库：`prj/assets/vocab/core-english-2026.08.15/catalog.json`（597 词，中英例句全量）
- 发奖口径：`workbench-bridge.js` `awardSunlight`（eventKey 幂等）
- 现有测试：`tests/blocklegend.test.mjs`（156 项）、`tests/blocklegend-review-schedule.test.mjs`（17 项）

## 3. 子任务

### D1 词级记忆状态 + 词力（P0）

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| D1-S1 | 记忆状态纯函数：`recordAnswer` 升降盒、`dueWords` 到期筛选、`wordPower` 词力汇总、`memoryVersion:1` | 新建 `data/word-memory.js` + 新建 `tests/blocklegend-word-memory.test.mjs` | `node --test`（假时钟） |
| D1-S2 | 接答题回路：所有词卡/词门/Boss 答题结果统一走 `recordAnswer`；`hardWords` 入本/毕业规则迁入同一函数（外部行为不变） | `game.js`、`data/words.js` | 定向 + E2 回归 |
| D1-S3 | 出词队列改造：波次/金块出词 = 到期词（该关词优先）> `reviewWords` > 新 `focusWords`，替换盲抽 `reviewRatio`；每波复习词占比上限 60% 防"全是旧词" | `game.js`、`data/levels.js` | 定向测试 |
| D1-S4 | 词力可见 + E2 接入：HUD 与选关图显示词力；E2 复习门出题池组装函数并入 due 词 | `game.js`、UI/CSS | 定向 + 手玩 |

### D2 重玩三档难度（P0，依赖 D1）

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| D2-S1 | 难度档纯函数：`DIFFICULTY_TIERS` 三档参数表、`recommendTier(levelId, wordMemory)` 推荐、`apocalypseUnlocked(clearedTiers)` 门槛判定 | `data/levels.js`（或新建 `data/difficulty.js`）+ 测试 | `node --test` |
| D2-S2 | 选关与进关：已通关卡出三档选择（未解锁灰显+条件提示）；推荐档高亮；进关按档位套怪血/出词/题型/掉落参数 | `game.js`、UI | 定向 + 手玩 |
| D2-S3 | 结算与防刷：每关每档首通发阳光一次（eventKey `bl-tier-<tier>-<level>` 幂等）；重复通关只给金币（×档位系数）；`clearedTiers` 写回 | `game.js`、`workbench-bridge.js` 口径复用 | 定向测试 |

### D3 词卷轴隐藏关 + 营地（P1，D2 后）

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| D3-S1 | 卷轴纯函数：`scrollAvailable(levelId, wordMemory)`（该关 `climateWords` 全部盒号≥3）、`secretUnlocked(scrolls)`（集 3 张开隐藏关） | `data/levels.js` + 测试 | `node --test` |
| D3-S2 | 卷轴与隐藏关玩法：石碑旁固定位摆卷轴（条件未满足显示灰卷轴+缺口提示词）；隐藏关 = 纯复习乱斗（3 波混怪 + 无 Boss，出词全部 due/hardWords，掉稀有装备 1 件） | `game.js`、`data/levels.js`、`data/quests.js` | 定向 + 手玩 |
| D3-S3 | 营地 Hub：开场落在小营地（选关地图牌、商人常驻摊位、训练假人、通关奖励箱）；训练假人=无伤打靶，默认出难词本词 | `game.js`、UI | 手玩为主 |

### D4 补救通道（P1，依赖 D1，可与 D2 并行）

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| D4-S1 | 难词降级支架：`hardWords` 中的词第 3 次见面强制降为四选一 + 读音支架 + 中文例句；答对后下次再按正常梯度上移 | `game.js`、`data/words.js` | 定向测试 |
| D4-S2 | 学习密度结算行：结算页显示"本局答题 N 题 / M 分钟"；写入 `stats.sessionDensity`（仅保留最近 20 局） | `game.js` | 定向 + 手玩 |

## 4. 设计参数（实施时以本节为准）

### 4.1 Leitner 盒（D1）

- 盒号 0–5：0=未学；1–5 到期间隔 `[1, 3, 7, 14, 30]` 天（毫秒计算，假时钟可注入）。
- 答对：`box = min(5, box+1)`，`streak+1`；答错：`box = max(1, box-1)`，`streak=0`（幼儿口径：不打回盒 1）。
- 首次见面答对直接入盒 2（当场学会跳过 1 天间隔）；答错入盒 1。
- 存储：`wordMemory[wordId] = { box, streak, lastSeen, dueAt }` + 顶层 `memoryVersion: 1`。
- **词力** `wordPower = Σ box`（每词 0–5 分）；HUD 显示整数值，选关图按关显示该关 `focusWords` 平均盒号（0–5 星）。
- `hardWords` 规则并入：`recordAnswer` 内部维护"错≥2 入本、复习场景连对 2 轮毕业"，与 E2 现行为逐字一致。

### 4.2 三档难度（D2）

| 参数 | 默认 | 冒险 | 天启 |
| --- | --- | --- | --- |
| 解锁 | 首通即有 | 该关默认档通过 | 冒险档通过 ≥3 个**不同** Boss 关 |
| 新词比例 | 现状（到期优先混新词） | 0%（全部到期/复习词） | 0% |
| 怪血 | ×1.0 | ×1.3 | ×1.6 |
| 起始题型档 | 第一档（四选一） | 第二档（拼写/选英文） | 第二档起，speak 优先（E1 判定；未接则 enpick） |
| 词门 | 现状 | 现状 | 限时 20 秒倒计时 |
| Boss 蓝罩 | 1 题/层 | 1 题/层 | 连答 3 题破 1 层 |
| 金币 | ×1.0 | ×1.5 | ×2.0 |
| 阳光 | 首通口径（已有） | 每关一次 `bl-tier-adv-<level>` | 每关一次 `bl-tier-apo-<level>` |

- `recommendTier`：该关 `focusWords` 平均盒号 ≥3 推荐冒险；≥4 且天启已解锁推荐天启；否则默认档。选关图高亮推荐档（动态难度定位，抄地下城）。
- Boss 关定义：`bossId` 非空的关（当前 12 关全有 Boss，则取 `bossMechanic` 不同的关计数，防刷同机制）。

### 4.3 卷轴与隐藏关（D3）

- 每关 1 张卷轴，固定放石碑旁（复用现有石碑坐标偏移，不新做地标）；条件：该关 `climateWords` **全部**盒号≥3。
- 集齐 3 张解锁隐藏关"词灵回廊"：迷宫 seed（worldSeed=999），3 波混怪（从已见 `waveKinds` 池抽），无 Boss，出词 100% due ∪ hardWords；通关掉 1 件稀有装备 + 金币 ×2；阳光 `bl-secret-1` 一次性。
- 营地：进游戏先落营地（约 32×32 小场景），四要素：选关牌（点开=现有选关图+今日冒险）、商人摊（现有 F 商人常驻化）、训练假人（打一下出一题，答对掉 1 金币，无伤害无波次）、奖励箱（每新通一关/一档刷 1 箱金币）。

### 4.4 补救（D4）

- 降级支架只对 `hardWords` 生效，第 3 次见面触发，形式 = 四选一 + `phoneticOf` 读音 + 中文例句展示（例句来自 catalog.json，已有资产零成本）。
- 学习密度 = 本局答题数 ÷ 本局分钟数，只做展示与留档，不做惩罚（Prodigy 教训是"发现问题"，不是"惩罚孩子"）。

## 5. 边界

- 禁止碰：`voxel-craft/`、其他游戏、阳光总口径、`storage.js` 主结构、workbench mastery（W1 轨）。
- 不做：完整 FSRS、25 级天启、程序生成房间池（隐藏关只用固定迷宫 seed）、装饰系统、第 13 关、新词库、新录音频、复习排行榜、多人。
- 存储纪律：全部进 `growth.worldGames.blocklegend`，无新 localStorage key；新增字段 `wordMemory`、`memoryVersion`、`clearedTiers`、`scrolls`、`stats.sessionDensity`。
- 门控债：workbench mastery（W1）与 `wordMemory` 的跨轨对齐本包不做，在 test-report 记债。
- 每期完成当轮同步推送独立仓 `nonomil/blocklegend`。
