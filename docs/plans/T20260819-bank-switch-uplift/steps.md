# 步骤

> 验证命令以退出码为准。先红后绿。每个切片独立可交付，按 S1→S2→S4→S3 顺序（S3 依赖 bridge 核实，放最后）。

### 1. S1 · 英语词包切换（P0）

- [x] 写测试先红：新建 `tests/blocklegend-pack-switch.test.mjs`
  - `words.js` 暴露 `PACK_MC`（或等价常量）指向 `minecraft-english-2026.08.15`，`loadCatalog` 传 `base` 后 bank 词来自 MC 包（用本地 catalog.json 直接喂 `opts.catalog` 断言，不走 fetch）
  - `themesForLevel(7, { chapters: 2 })` 不返回空且不抛错（模数循环取章）
  - `game.js` 源码含 `wordPack` 读取与 `loadCatalog` 传 `base` 的装配（正则断言）
  - `game.js` / 家长页含「词包」开关与两个选项文案
  - 缺省 `wordPack` 时 base 仍是 core 包（老档案不变）
- [x] `words.js`：加 MC 包常量；`themesForLevel` 章节模数容错
- [x] `game.js`：boot 读 `progress.wordPack`（落在 `growth.worldGames.blocklegend` 内），传 `loadCatalog({ base })`；家长页渲染开关，点击写回 + 提示「下局生效」（避免热切换半局换词池）
- [x] `index.html`：家长页开关 DOM + 缓存戳升级
- **验证：** `tests/blocklegend-pack-switch.test.mjs` 3/3。`tests/blocklegend.test.mjs` 207/208，失败项 `melee fan and bolt homing` 是打农场动物的旧断言，本包未动战斗。

### 2. S2 · 配菜入口可见（P1）

- [x] 写测试先红：`game.js` 含「找他按 F」toast 与每局一次的守卫（`sideDebtToast` 之类会话字段，非持久）
- [x] `game.js`：`paintSideDue` 检测欠账 >0 时 toast 一次「村里老师有新字卡 · 找他按 F」
- [x] `index.html`：帮助页补「欠账看左上角 还欠 识字N」一句
- **验证：** `tests/blocklegend-question-port.test.mjs` 含新断言全绿

### 3. S4 · 村庄碎词收敛（P2，纯删减）

- [x] 改测试先红：`tests/blocklegend-villages.test.mjs` 断言 `isVillageLook` **不再**匹配 chair/table/bookshelf/bed/path
- [x] `game.js`：收 `isVillageLook` 正则；look 浮牌逻辑不动
- [x] `data/quests.js`：L1 `look-village` 去掉 `path`
- **验证：** `tests/blocklegend-villages.test.mjs` 全绿

### 4. S3 · 卡片墙联动（P1，含核实步）

- [x] **核实**：`bumpMasteryItem` / 识字 `recordAttempt` 已写 `dates[]`，不另加 `lastPracticed`
- [x] 写测试先红：`app.js` 含「今日游戏里练」与 `countTodayGamePractice`
- [x] `app.js`：墙卡 + 掌握度条，N=0 不渲染
- **验证：** `tests/blocklegend-question-port.test.mjs` 对应项绿。手点卡片墙未做。

### 5. S5 · 手玩验收（门槛）

- [ ] 按 [`06-多科配菜测试方案.md`](../../01-方案/工作台小游戏设计/05-方块传奇/06-多科配菜测试方案.md) 走 F=4/8/12/16 一条线
- [ ] 本包 [`acceptance.md`](./acceptance.md) A1–A8 逐条勾
- [ ] 回填 [`test-report.md`](./test-report.md)；不过不标 accepted
- [ ] blocklegend 独立仓同步推送（历史欠账一并清）
