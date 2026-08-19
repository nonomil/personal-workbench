# T20260819-bank-switch-uplift - 任务定义卡

> 默认模式：L1 标准

## 0. 领域画像

- 主画像：软件开发（数据接入 + 游戏装配）
- 次画像：UI（家长页开关、卡片墙一行）

## 1. 任务目标

- 一句话：让「我的世界英语 324 词包」被真的消费（家长页可切换），配菜欠账有可见入口，工作台卡片墙看得到游戏练习量，村庄碎词收敛到词包内词。
- 为什么现在做：324 卡带全图全音的导出包躺着没人读，是全仓最大的闲置资产；配菜欠账只有 HUD 一行小字，孩子不知道去找谁；卡片墙看不到游戏侧练习，家长闭环断一半；chair/bookshelf 等村庄词不在 597 词包里，学了不进 mastery，纯噪音。
- 预期收益：MC 风格游戏用 MC 词包更合场景且媒体更全；欠账→老师入口一句话打通；家长一眼看到两边同一本账；V/T 出词卡全部落进 mastery。

## 2. 输入基线（已核实，2026-08-19）

- 词包硬编码：`prj/games/blocklegend/data/words.js` 第 11 行 `PACK_BASE = '../../assets/vocab/core-english-2026.08.15'`；`loadCatalog(done, opts)` 第 101–120 行已支持 `opts.base` / `opts.catalog`。
- 装配点：`game.js` boot 里 `W.loadCatalog(function (err, list) {...})`（约 240 行），失败退 `FALLBACK_BANK`。
- MC 包：`prj/assets/vocab/minecraft-english-2026.08.15/`，324 卡 / 324 图 / 110 音 / **2 章**（`packages.json`）。生活包 13 章。`words.js` 的 `CAT_ORDER` 13 类、`chapterCount()` 默认 12——**MC 包只有 2 章，`themesForLevel` 需要容错**，这是唯一风险点。
- 存储：`growth.worldGames.blocklegend` 已有 `wordMemory` / `clearedTiers` / `scrolls` / `stats` 等；在此对象内加字段**不算**新 localStorage key。
- 配菜欠账：`game.js` `sideDueNow()` / `paintSideDue()` 写 HUD `#side-due`；老师入口 `startTeacherLesson`（2026-08-19 已落地，走 `QuestionPort.nextDue`）。
- 写回桥：`workbench-bridge.js` `recordSubjectAnswer(track, key, correct)` 写各科 `mastery` + `nextReview`。**是否记「今天练过」的日期字段需实施时核实**，无则在 mastery 条目内补（不新开 key）。
- 卡片墙：`prj/app.js` `renderPreschoolCourseCard` 一带；已有先例 `parentSideLine`（游戏家长页欠账行）与 MC 课 `set-minecraft-band` 切换按钮。
- 村庄碎词：`game.js` `isVillageLook` 正则含 `chair|table|bookshelf|bed|path` 等；这些词不在 597 词包，`villageLookWord` 走 `labelFor` 兜底，答对不进 `minecraft.mastery` 的复习课表主线。

## 3. 子任务

| ID | 优先级 | 描述 | 文件 | 验证 |
|---|---|---|---|---|
| S1 | P0 | 英语词包切换：家长页「词包」开关（生活 597 / 我的世界 324），选择存 `growth.worldGames.blocklegend.wordPack`，boot 时按值传 `loadCatalog({ base })`；`themesForLevel` 章节不足时容错退化 | `data/words.js`、`game.js`、`index.html`（家长页） | 新建 `tests/blocklegend-pack-switch.test.mjs` |
| S2 | P1 | 配菜入口可见：欠账从 0 变正时 toast 一次「村里老师有新字卡 · 找他按 F」（每局一次）；帮助页 F 行已提老师，补一行「欠账看左上角」 | `game.js`、`index.html` | 同上 + 现有 question-port 测试不红 |
| S3 | P1 | 卡片墙联动：识字/拼音/拼读/口算课程卡显示「今日游戏里练 N 道」；N 从该科 mastery 当日更新条数推出，无当日字段则由 `recordSubjectAnswer` 补写 `lastPracticed`（ISO 日期，条目内字段） | `prj/app.js`、`workbench-bridge.js` | 定向测试 + 手点卡片墙 |
| S4 | P2 | 村庄碎词收敛：`isVillageLook` 收到词包内词（villager/farmer/teacher/trader/well/house/farmhouse/pen + 动物词）；chair/table/bookshelf/bed/path 保留看向标签，但不再进 V/T 出卡 | `game.js`、`tests/blocklegend-villages.test.mjs` | 村庄测试改断言后全绿 |
| S5 | 门槛 | 手玩验收：`06-多科配菜测试方案.md` F=4/8/12/16 一条线 + 本包 acceptance；不过不标 accepted | — | 手玩记录回填 test-report |

## 4. 设计要点

- **S1 切包语义**：`minecraft.mastery`、熟悉词数 F、`wordMemory`、复习之门 due 全按词文本记；两包词文本不同，切包不串账、随时可切回，已学词照常到期复习。切包只影响**新绑词来源**。
- **S1 章节容错**：`themesForLevel(level, opts)` 里章节数 < 关卡数时按模数循环取章，不空词、不报错；写失败测试锁住（MC 包 2 章 × 12 关）。
- **S1 默认值**：缺省 `wordPack` 视为 `core`（现状不变），老档案零迁移。
- **S3 口径**：只数「当日 `lastPracticed` == 今天」的条目数，不区分对错来源（石碑/老师/商人同账）；不加新页面，不动课程卡布局，只加一行小字。
- **S4 删减不加**：只收 `isVillageLook` 正则与 `villages` 测试断言；看向浮牌（look card）保留全部词，孩子看着念不受影响，只是 V/T 不再对碎词出卡。
- 缓存戳：动到的 `words.js` / `game.js` / `quests.js` / `app.js` 按仓库惯例升 `?v=`。

## 5. 边界

- 禁止碰：`engine.js` 世界生成、战斗暴击英语口径、`storage.js` 主结构、其他游戏。
- 不做：配菜科目切库（每科只有一个库，无可切对象）；识字 band 手动切换（已按已会字数自动升档）；识字干扰项形近字化（无手玩证据前属过度设计）；配菜额度提额（6 道/局是闸）；新科目、新 UI 页。
- 门控：S3 依赖 `recordSubjectAnswer` 数据形状核实，若补 `lastPracticed` 需同步 bridge 测试；S5 手玩不过则全包停在 review。
- blocklegend 改动完成后当轮同步推送独立仓（历史欠账，见总控）。
