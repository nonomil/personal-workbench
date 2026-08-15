# T20260815-PQ — 执行前确认卡

## 当前任务

- 任务ID：`T20260815-PQ`
- 当前阶段：`execute / S1（P0→P1→P2→P3）`
- 对应方案：`docs/01-方案/工作台小游戏设计/00-共同框架/00-三游戏优化总纲.md`、`03-横版闯关/` 分册 00/01/03/04

## 本次执行范围

- 计划修改文件：
  - `prj/games/platform-quest/game.js`
  - `prj/games/platform-quest/game.css`
  - `prj/games/platform-quest/index.html`（HUD 节点 + 缓存戳，steps §7）
  - `tests/platform-physics.test.mjs`
  - `tests/world-games.test.mjs`（只追加本包合同）
  - 本包证据文档、分册 04、`docs/00-总控/当前状态.md`
- 明确不碰的文件：`workbench-bridge.js`、`data/levels.js`、`data/physics.js` 数值、花园/方块实现、`prj/app.js`、localStorage key

## 输入 / 数据 / 环境

- 使用的数据 / 输入：现有 10 关、`PlatformPhysics` 现状常量、bridge `getPlayMods/getMetaSummary`
- 运行环境：Windows PowerShell；`node --test`；预览 `http://127.0.0.1:4192/`（4180 曾绑不上）
- 是否存在高成本动作：
  - [x] 改动 > 3 个文件：合同允许的 S1 文件集

## 方案落实追踪

- 已批准方案中的关键点：一份账本；物理只抽函数不调参；简单档 coyote 140ms 走 opts；结算三行；星芒 5 秒节流
- 本次如何落实：P0 已在仓内（击退删除 + penX>=penY），补手感/playMods/结算合同先红后绿
- 手感裁决：现状 `COYOTE/BUFFER=120`、`GRAVITY=1500`、`JUMP_VY=-620`（秒单位），与方案纸面 `100ms / 0.55 / -11`（帧单位）不是同一套。**按现状锁定，不调参。**

## 粒度自检（来自 task-decomposition.md）

- [x] 文件例外已由 task.md §6 + steps §7 声明
- [x] 验证命令 ≤10 分钟
- [x] 可整块回滚（不 add / 不 commit）
- [x] 没有未经授权的顺手优化
- [x] 禁止项已声明

## 需求分解核对

- [x] R1–R5、R9 本轮；R6–R8 延期 S2

## 验证与证据

- 自动验证：`node --test tests/platform-physics.test.mjs tests/world-games.test.mjs`；`npm test`
- 手动：1/3/6/10 关手玩；触控热区 ≥56px
- 证据：本包 test-report / requirements-checklist；当前状态；分册 04

## Git 确认卡

- 不执行 `git add` / `git commit`

## Worktree 隔离确认

- 使用当前工作区。豁免：用户授权继续推进既定包；只改本包允许文件。

## 确认结果

- 状态：`approved`
- 确认时间：`2026-08-15`
- 确认人：用户说「继续」
- 备注：手感按现状 120ms 锁定；触发 §8 调参条款时不改数值。
