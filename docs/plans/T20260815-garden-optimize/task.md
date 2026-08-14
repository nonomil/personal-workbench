# T20260815-GD - 任务定义卡

> 模式：L2 轻量（单游戏三个独立切片，串行，每步有测试证据）
> 执行策略：CLOSED 串行。S1（G1→G2→G3）→ S2（需 S1 收口 + G5 素材确认）。不开 fleet。

## 0. 领域画像

- 主画像：软件开发（参考 `docs/plans/templates/profiles/software-dev.md`）
- 次画像：儿童游戏体验（文案语气、失败宽容、触控热区）

## 1. Loop 类型判断

- [x] CLOSED 单 Agent：切片边界清晰，全部有验证命令
- [ ] CLOSED Fleet
- [ ] OPEN 转 CLOSED

## 2. 动机自检

- [x] 加速已理解的执行：方案已在分册 01/03/04 写透，含函数级设计
- [x] 不是用流程回避理解：bridge 的 `getPlayMods/getMetaSummary/MILESTONES` 已读码确认可用

## 3. 目标与背景

- 一句话目标：花园保卫战接通学习难度联动，结算页可见长线成长，星芒出场提供陪伴。
- 背景：三游戏中花园的账本联动最完整（阳光/冒险点/里程碑全接），但都是**静默入账**；playMods 只有方块世界在用。
- 历史约束：一份账本（`petbank_huchuliang_preschool_workbench_state_v1`）、Vanilla JS、bridge 协议不动、单局 ≤3 分钟。
- 兼容要求：`growth.worldGames.garden-defense` 的 `unlockedStage/clearedStages/stars` 键名不变；老存档无迁移。

## 4. 为什么是 L2 而不是 L1

三个切片跨 JS 逻辑、DOM 结算层、文案池与素材占位，且 S2 有素材门控与数据结构增量（roster 字段），但每切片独立可验、总量约 1 人日。

## 5. 子任务

- **S1（本包 steps.md 细化）**：G1 playMods 接入、G2 结算三行、G3 星芒 HUD + 里程碑庆祝卡
- **S2（收口后展开）**：G4 stages roster 曲线、G5 土豆地雷（素材门控）、G6 星级重定义——设计见分册 `01-玩法优化方案.md`，切片定义见 `04-落地路线与验收.md`

## 6. 边界

**只改（S1）：**
- `prj/games/garden-defense/game.js`（playMods 应用、结算层、星芒 HUD、庆祝卡）
- `prj/games/garden-defense/game.css`（HUD 徽标、弹层样式）
- `prj/games/garden-defense/index.html`（HUD 容器节点，如需）
- `tests/world-games.test.mjs`（合同断言）

**不碰：** `workbench-bridge.js`、`preschool-garden.js`（tickDefense 规则）、`stages.js`（S2 才动）、工作台 `prj/app.js`、localStorage key。

**明确不做（另开包/期）：** 新植物、新僵尸 roster、星级重定义、泳池夜间、排行榜、BGM。

**禁止顺手优化：** 重构 game.js 渲染循环、改 720ms tick 节奏、调整现有阳光数值。

## 7. 验收（整体）

- [ ] S1：三档难度断言绿 + 结算三行 + 星芒/庆祝卡 + npm test 全绿（基线 238）
- [ ] S2：roster 首现断言（7 关 bucket / 9 关 football）+ 土豆地雷数值 + 新星级三分支

## 8. 升级触发

- 若 playMods 接入需要改 `preschool-garden.js` 规则层 → 停，开 change-request（速度乘数应只在 game.js 应用层）
- 若结算三行需要 bridge 新增 API → 停，`getMetaSummary()` 已含全部所需字段，需求即错
- 若庆祝卡与工作台并发改动冲突（同期有其他会话改 preschool CSS）→ 先 `git status` 协调归属
