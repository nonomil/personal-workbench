# T20260815-GD — 执行前确认卡

> 作用：在第一次写代码前确认"这次具体怎么走"。2026-08-15 由执行会话填写。

## 当前任务

- 任务ID：`T20260815-GD`
- 当前阶段：`execute`（S1：G1 playMods / G2 结算三行 / G3 星芒陪伴）
- 对应方案：`docs/01-方案/工作台小游戏设计/01-花园保卫战/`（01/03/04 分册）+ 总纲

## 本次执行范围

- 计划修改文件：
  - `prj/games/garden-defense/game.js`（playMods 应用、结算层、星芒 HUD、庆祝卡）
  - `prj/games/garden-defense/game.css`（HUD 徽标、星芒、结算/庆祝弹层样式）
  - `prj/games/garden-defense/index.html`（HUD 容器节点：档位徽标、星芒、结算层、庆祝层）
  - `tests/world-games.test.mjs`（合同断言，先红后绿）
- 明确不碰的文件：`workbench-bridge.js`、`preschool-garden.js`、`data/stages.js`、`prj/app.js`、localStorage key

## 输入 / 数据 / 环境

- 使用的数据 / 输入：现有 12 关 stages 数据；bridge 现有 API（getPlayMods/getMetaSummary/MILESTONES/recordPlaySession/grantProgressPoints）
- 运行环境：Windows Git Bash；`node --test`；浏览器 `http://127.0.0.1:4180/prj/games/garden-defense/index.html`
- 是否存在高成本动作：
  - [ ] 更换数据集
  - [ ] 更换方法路线
  - [ ] 从子集扩大到全量
  - [ ] 大批量运行
  - [x] 改动 > 3 个文件或 > 100 行（S1 合同即允许的 4 个文件；task.md §6 已声明）

## 方案落实追踪

- 已批准方案中的关键点：enemySpeed 只在 game.js 应用层做 moveClock 快慢补偿（不动规则层）；sunMult 后仍走 awardSunlight 40/80 钳制；结算三行全部来自 getMetaSummary；星芒文案池 ≥12 条、失败文案含策略提示
- 本次如何落实到执行步骤：纯函数（applyPlayMods/advanceMoveClocks/buildSettlementLines/companionLine/milestoneCardsFrom）落在 game.js 顶层，供 vm 抽取做合同测试
- 可能遗漏的步骤：无（步骤 0–7 与 steps.md 一一对应）

## 粒度自检（来自 task-decomposition.md）

- [x] 本次改动 ≤3 个文件（例外已记录：4 个文件 = task.md §6 声明的 S1 全集）
- [x] 验证命令跑完 ≤10 分钟（npm test 全量 ~4s）
- [x] 做错了能整块回滚（USE_PLAY_MODS=false 即回统一难度；每切片独立）
- [x] 没有未经授权的"顺手优化"（不重构渲染循环、不动 TICK_MS、不改阳光数值）
- [x] 禁止项已声明且 Agent 已知晓

## 需求分解核对

- 对照 `requirements-checklist.md`：
  - [x] 本次执行范围对应的需求点已明确（R1–R4、R8）
  - [x] 没有"只聊过、没落计划"的需求点
  - [x] 输入 / 数据 / 约束与需求分解表一致
  - [x] 暂不覆盖的需求点已备注原因（R5–R7 延期至 S2）

## 验证与证据

- 自动验证命令：`node --test tests/world-games.test.mjs`（先非 0 后 0）；`npm test`
- 手动检查点：浏览器通关目检三行；devtools 改 literacy mastery 后档位/速度变化；Console 无报错；localStorage 单 key
- 证据落点：本包 `test-report.md`

## Git 确认卡

- 本次纳入 git 的文件 / 目录：上述 4 个文件 + 包内 execution-check/test-report 等控制面文档
- 新建目录是否纳入 git：无新目录
- 数据 / 日志 / 缓存 / 生成产物是否继续排除：是
- 是否需要拆成两个 commit：不 commit（除非用户明确要求）

## Worktree 隔离确认（默认开启）

- 豁免原因：用户指令明确要求在本仓直接串行执行三包、不 commit；在途文件已用 git status 记录归属，且本包只碰 garden-defense 目录 + world-games.test.mjs，与在途文档重组无交集
- [x] 已豁免（记录于 2026-08-15，遵循任务包 README「不并行执行」约定）

## 相关 Spec 文件（借鉴 Trellis 选择性注入）

- 本次需要的 spec：
  - `docs/01-方案/工作台小游戏设计/00-共同框架/00-三游戏优化总纲.md`（§4 陪伴规范、§7 验收总标准）
  - `docs/00-总控/变更与同步规则.md`（奖励/存储同步清单）

## 未决项

- 无。僵尸速度经读码确认可在 game.js 应用层实现（moveClock 存于 growth 状态、规则层原样消费），不触发 task.md §8 升级。

## 任务分解校验结果（自动回写）

<!-- AUTO:DECOMPOSITION-CHECK START -->
- 状态：`pending`
- 说明：等待 `write_gate.py` 自动回写分解校验结果
<!-- AUTO:DECOMPOSITION-CHECK END -->

## 人工确认

- [x] 这次改动范围可接受（= task.md §6 S1 边界）
- [x] 输入 / 数据选对了
- [x] 方案关键点已经落实到执行路径
- [x] `requirements-checklist.md` 中本阶段相关需求点都已覆盖
- [x] 验证方法可接受（退出码为准）
- [x] 高成本动作已知且可接受
- [x] 可以开始执行

## 确认结果

- 状态：`approved`（依据用户提供的执行总控指令，开工即视为批准）
- 确认时间：2026-08-15
- 确认人：执行 Agent（串行总控版会话）
- 备注：测试基线实测 241 项全绿（文档记录的 238 为旧基线）
