# 花园保卫战 5×6 种植交互 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将幼儿版当前花园保卫战改成统一的 5×6 可种植草坪，支持点击/拖动选卡落位，并确保每个植物只执行自己的技能。

**Architecture:** 复用 `preschool-garden.js` 已有的 `garden.defense` 作为唯一棋盘状态和规则层；`app.js` 只负责渲染格子、接收点击/拖动事件、调用规则层并刷新。修正临时僵尸视图进入技能结算的边界，不恢复旧自动战斗计时器。

**Tech Stack:** Vanilla JavaScript IIFE、HTML5 Drag and Drop、localStorage 现有 repository、Node `node:test`、现有静态页面回归测试。

---

### Task 1: 为状态和技能边界写失败测试

**Files:**
- Modify: `tests/preschool-garden.test.mjs`
- Modify: `tests/preschool-workbench-refresh.test.mjs`

**Step 1: Write the failing tests**

在规则测试中新增以下行为：

- `placeDefensePlant()` 在未启动旧原型时也能按当前选中植物落位，扣一次对应阳光，记录 lane/column/plantId。
- 同一格第二次落位失败且阳光与植物数组不变。
- 未解锁或阳光不足落位失败且不改变状态。
- 传入昨日漏打卡形成的可见僵尸快照后，植物技能能正常结算，而不是返回“先召唤”。
- 坚果墙技能返回 `block`，豌豆能量和投射物/豌豆发射统计不被当成豌豆射手处理。

页面契约测试增加：

- 主战场渲染 `data-action="place-defense-plant"`、`data-lane`、`data-column` 的 30 个草坪格。
- 种子卡存在 `draggable="true"` 和 `data-plant-id`/拖动事件契约。
- 渲染不再依赖固定 `lanePlantAssets` 作为实际植物来源。
- 动画函数接收技能效果参数。

**Step 2: Run tests to verify they fail**

Run: `npm test -- tests/preschool-garden.test.mjs tests/preschool-workbench-refresh.test.mjs`

Expected: 新增落位/主战场格子断言失败，证明测试覆盖的是当前缺失行为；记录失败数量和首个失败消息。

### Task 2: 修复规则层的可种植状态和临时僵尸结算

**Files:**
- Modify: `preschool-garden.js:307-417`
- Test: `tests/preschool-garden.test.mjs`

**Step 1: Implement the minimal rule change**

- 提取一个只负责把 `getInvaderView(growth, date)` 合并回结算副本的 helper；`usePlantSkill()`/`firePea()` 在读取 active plant 前使用它。
- 保持 `getDefenseView()` 的返回结构不变，确保旧调用者兼容。
- 让 `placeDefensePlant()` 自身负责所有落位校验，不要求 `status === playing`；成功后将 `status` 置为 `playing`，这样当前页面可以直接使用，旧 `startDefenseGame()` 仍然可用。
- 选中的植物仍由 `defense.selectedPlantId || garden.activePlantId` 决定，并校验它在已解锁列表中。

**Step 2: Run focused tests**

Run: `node --test tests/preschool-garden.test.mjs`

Expected: 规则层新增测试和既有测试通过。

### Task 3: 接入 5×6 草坪渲染和点击落位

**Files:**
- Modify: `app.js:613-667, 2059-2071, 2544-2555`
- Modify: `css/preschool/16-workbuddy-finish.css` (or the smallest existing preschool battle stylesheet)
- Test: `tests/preschool-workbench-refresh.test.mjs`

**Step 1: Implement grid rendering**

- 用 `defense.board.lanes/columns` 生成 5×6 cell；每格带 `data-action="place-defense-plant"`、`data-lane`、`data-column` 和空/已占用状态类。
- 已种植物从 `defense.plants` 按 lane/column 查找，使用 `plantId` 映射到 `PLANT_CATALOG` 素材和技能文案；没有植物的格子显示可种植提示。
- 僵尸仍保留当前轻量单只入侵展示，但不能覆盖植物数据。
- seed packet 添加 `draggable="true"`、`data-plant-id`、`aria-pressed`/选中类，展示规则层成本。

**Step 2: Implement click action**

- `placePreschoolDefensePlant(lane, column)` 调用 `preschoolGarden.placeDefensePlant()`，移除仅针对冻结原型的“先点击开始游戏”拦截。
- 错误通过现有 `commit()`/toast 返回，成功给出简短反馈和语音夸奖。
- 只保留当前主页面的统一入口，不重新启动 `ensurePreschoolDefenseLoop()`。

**Step 3: Add minimal CSS**

- 让 5×6 格子在桌面横向展示、窄屏可横向滚动或缩小；不改变已确认的草坪背景和整体配色。
- 空格有清晰落点态、拖入态和已种状态；按钮触控区域不小于 44px。

**Step 4: Run focused tests**

Run: `node --test tests/preschool-workbench-refresh.test.mjs`

Expected: 页面契约和现有幼儿工作台测试通过。

### Task 4: 接入 HTML5 拖动并修正技能动画隔离

**Files:**
- Modify: `app.js:2083-2108, 2498-2555`
- Modify: `css/preschool/16-workbuddy-finish.css`
- Test: `tests/preschool-workbench-refresh.test.mjs`

**Step 1: Implement drag handlers**

- 在种子卡 `dragstart` 写入 `dataTransfer` 的 plant id；草坪格处理 `dragover`/`drop`，只允许空格接受。
- 点击仍是唯一必需入口；拖动不可用时不影响键盘和触摸点击。
- drop 最终只调用同一个 `placePreschoolDefensePlant()`，避免拖动生成第二套结算路径。

**Step 2: Fix animation parameter**

- 将 `animatePreschoolPea(effect)` 的参数接收补齐。
- 仅对 `pea`、`ice-pea`、`blast` 添加投射物/爆炸 class；`block` 和 `sunlight` 不创建豌豆 projectile。

**Step 3: Run focused tests**

Run: `npm test -- tests/preschool-workbench-refresh.test.mjs tests/preschool-garden.test.mjs`

Expected: 全部通过，且无新增浏览器控制台 ReferenceError。

### Task 5: 浏览器验收和回归

**Files:**
- No source changes expected; inspect `app.js`, `preschool-garden.js`, `tests/` and current diff.

**Step 1: Run full test suite**

Run: `npm test`

Expected: 全部测试通过。

**Step 2: Run browser smoke path**

在本地静态服务打开 `preschool-workbench/index.html#battle`，验证：

1. 点选坚果墙，技能文案显示“坚果挡住”；点选豌豆射手，技能文案显示“发射豌豆”。
2. 选择向日葵，点击一个空格，出现向日葵、阳光减少一次；刷新后同一格仍有向日葵。
3. 再点同一格，出现占用提示且阳光不再减少。
4. 选择坚果墙使用技能，不出现 `.pixel-pea-projectile`；选择豌豆射手后才出现豌豆命中动画。
5. 在已有漏打卡状态下，僵尸显示与技能结算一致，不再出现“先召唤一只僵尸”的错误。

**Step 3: Review diff and status**

Run: `git diff --check; git status --short; git diff --stat`

Expected: 只包含本轮计划文件、规则/页面/样式/测试改动以及之前已有未提交改动；不提交 `tmp/`、密钥或浏览器制品。

