# T20260815-PQ - 任务定义卡

> 模式：L2 轻量（物理重构有行为等价风险，测试先行）
> 执行策略：CLOSED 串行。S1（P0→P1→P2→P3）→ S2。不开 fleet。

## 0. 领域画像

- 主画像：软件开发（参考 `docs/plans/templates/profiles/software-dev.md`）
- 次画像：游戏手感/物理（幼儿对"按了跳没跳"极度敏感，参数漂移零容忍）

## 1. Loop 类型判断

- [x] CLOSED 单 Agent：四个切片串行，物理断言是硬闸门
- [ ] CLOSED Fleet
- [ ] OPEN 转 CLOSED

## 2. 动机自检

- [x] 加速已理解的执行：碰撞债有当前状态 3.13 的 file 级记录；手感常量在落地方案有明确数值（GRAVITY 0.55 / JUMP_VY -11 / coyote & buffer 100ms）
- [x] 不是用流程回避理解：先读 game.js 确认现状再写断言，不臆测

## 3. 目标与背景

- 一句话目标：清偿碰撞债、用测试锁定跳跃手感、接上学习难度联动、让 bestTime 与长线成长可见。
- 背景：§8 美术改造已落地（Paper-MC 家族），物理与联动是遗留面。
- 历史约束：一份账本、10 关固定不扩、无命数惩罚（掉坑回检查点/重开不扣资源）、Vanilla JS。
- 兼容要求：`growth.worldGames.platform-quest` 的 `unlockedLevel/clearedLevels/stars/coinsTotal/bestTime` 键名不变。

## 4. 为什么是 L2 而不是 L1

物理重构必须行为等价（先测后改），playMods 与结算跨逻辑/DOM/文案，碰撞债涉及删代码。每步独立可验，总量约 1.5 人日。

## 5. 子任务

- **S1（本包 steps.md 细化）**：P0 碰撞债清偿、P1 手感纯函数 + 四断言、P2 playMods 接入、P3 结算三行 + 星芒（节流）
- **S2（收口后展开）**：P4 时间挑战外显（关卡页 bestTime/星/"可挑战"标）、P5 检查点反馈（旗升起 + 台词，一次性）、P6 关卡减肥复查（1–2 关 ≤60s、9–10 关 ≤120s 实测修剪）

## 6. 边界

**只改（S1）：**
- `prj/games/platform-quest/game.js`（碰撞、跳跃纯函数、playMods、结算、星芒）
- `prj/games/platform-quest/game.css`（HUD/弹层样式）
- `tests/platform-physics.test.mjs`（新建或扩展：碰撞 2 条 + 手感 4 条）
- `tests/world-games.test.mjs`（playMods/结算合同）

**不碰：** `workbench-bridge.js`、`data/levels.js`（S2 P6 才动）、其他两游戏、localStorage key、美术资产（§8 已收口）。

**明确不做（另开包/期）：** 蘑菇变大/火球、二段跳、32 关、Boss、命数、`ms-platform-speed` 新里程碑（三期评估，需连动 bridge 与测试）。

**禁止顺手优化：** 改 GRAVITY/JUMP_VY 等常量数值（只允许抽函数不允许调参）、重排关卡几何、动敌人 AI 结构。

## 7. 验收（整体）

- [ ] S1：碰撞 2 断言 + 手感 4 断言 + playMods 三档断言 + 结算三行 + npm test 全绿
- [ ] S2：bestTime 外显 + 检查点一次性反馈 + 三档识字量实测用时表回写分册 04

## 8. 升级触发

- 若删除水平击退分支导致任何关卡行为变化（踩怪/被撞路径）→ 停，说明它不是死代码，记 change-request 重新定性
- 若手感纯函数抽取无法行为等价（现有实现与方案常量不符）→ 先记录现状参数，问用户"按方案数值改"还是"按现状锁定"，不擅自调参
- 若 playMods 简单档 coyote 140ms 与手感断言冲突 → 断言按档位参数化，不硬编码 100
