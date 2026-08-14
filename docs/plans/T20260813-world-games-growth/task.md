# T20260813 - 任务定义卡

> 模式：L2 完整（跨三个游戏世界）  
> 执行策略：CLOSED 串行。一次只做 S1。不要 fleets 并行改三个 `game.js`。

## 0. 领域画像

- 主画像：软件开发
- 次画像：UI 优化（独立页可玩路径、触控点击）
- 参考画像：`docs/plans/templates/profiles/software-dev.md`

## 1. Loop 类型判断

- [x] CLOSED 单 Agent：目标清晰，步骤可拆，每步有明确 eval
- [ ] CLOSED Fleet
- [ ] OPEN 转 CLOSED

## 2. 动机自检

- [x] 加速已理解的执行（方案已写在 `docs/工作台小游戏设计/`）
- [x] 不是用流程回避理解：轮子是 `tickDefense`，不是再造引擎

## 3. 目标与背景

- 一句话目标：三个独立游戏页变成 3–5 分钟成长短局，阳光写回同一份幼儿账本。
- 背景：花园独立页变成「点召唤 → 点技能 → 数击退」；方块页变成史蒂夫横版，和 `quests.js` 挖放任务错位；横版循环大体对、手感弱。
- 历史约束：一份阳光、Vanilla JS、不改 `petbank_huchuliang_preschool_workbench_state_v1`。
- 兼容要求：`unlockedStage` / `clearedStages` / `questsDone` / `clearedLevels` 键名保持可读。

## 4. 为什么是 L2 而不是 L1

三个世界、两套规则文件、测试合同、浏览器路径。但 **L3 loop-spec 过重**。L2 拆 S1/S2/S3，公开控制面够用。

## 5. 子任务

见 `task-decomposition.md`。当前只执行 **S1 花园**。

## 6. 边界

**只改（S1）：** `prj/preschool-garden.js`、`prj/games/garden-defense/**`、相关测试。

**不碰：** localStorage key、Phaser、iframe、第三方精灵、学习完成账本、`voxel-adventure` / `platform-quest`（S1 期间）。

**明确不做：** 游戏券、排行榜、整仓 fork PVZ/Mario/MC、整理 `docs/plans/old`。

**禁止顺手优化：** 首页再改一版、扩植物图鉴、改 `#battle` DOM 棋盘。

## 7. 验收（整体，S1 先闭合花园项）

- [ ] 花园：种、来一波、自动打、破线失败、通关阳光
- [ ] `npm test` 退出码 0
- [ ] 方块 / 横版：S1 不验收（延期）

## 8. 升级触发

- 若 S1 必须改 bridge 发奖协议 → 停，开 change-request
- 若要并行三个世界 → 升 isolation/worktree，仍不要升 L3
