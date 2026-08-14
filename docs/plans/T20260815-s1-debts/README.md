# T20260815-s1-debts

> 按 `T20260814-audit-remediation` 的轻量画像装配。源头:`docs/00-总控/2026-08-14-综合改进规划.md` S1 第 1、5 条 + `docs/00-总控/当前状态.md` 3.13 记录的两笔碰撞债。

## 为什么有这个包

S1「还债」批次里两件半天级技术债 + 一件文档债,全部可独立验收:

| # | 债 | 级别 | 证据 |
|---|---|---|---|
| 1 | platform-quest 水平碰撞对全宽地面缺保护:下落中按住方向键,水平解算把玩家瞬移到 `platform.x ± player.w`(即关卡左缘 x=0 / 右缘),穿地级 bug | P0 | `game.js` update() 水平解算循环对 `solids()` 里 `{x:0,w:level.width}` 的地面无差别推出 |
| 2 | platform-quest 水平击退是死代码:碰撞受伤设置 `player.vx = facing*-180`,下一帧开头就被 `input.left/right` 覆盖,击退永远不可见 | P0 | `game.js` 两处(变大保护 / 掉心)击退赋值 |
| 3 | 徽章总数"硬编码 11"(当前状态 3.13 记录)——现状核查已是派生值,但无回归测试锁住,新增/删除徽章时三处展示可能再次漂移 | P1 | `preschool-achievements.js:14` `BADGE_COUNT = BADGE_ORDER.length`;`workbench-bridge.js` `badgeTotal: badges.length`;缺合同测试 |
| 4 | `docs/data-model.md` 缺 `growth.achievements`、`growth.worldGames.*`、`courseProgress` 学科字段,文档滞后于代码 | P1 | 综合改进规划 S1 第 5 条 |

## 怎么用

1. 本包是执行控制面:需求点 → 步骤 → 验收 → 测试。
2. 写代码前过 `execution-check.md`(含未提交工作区处置,必读)。
3. 测完回写 `test-report.md`。

## 本包文件

| 控制面 | 文件 | 作用 |
|---|---|---|
| 入口 | `task.md` | L2 任务定义 |
| 内部 | `requirements-source.md` | 需求来源(file:line 证据) |
| 内部 | `source-requirements-alignment.md` | 来源 ↔ 需求点对齐 |
| 核心 | `requirements-checklist.md` | R1–R5 打勾 |
| 内部 | `task-decomposition.md` | 本轮 / 后续切分 |
| 核心 | `steps.md` | 只写细本轮 |
| 核心 | `acceptance.md` | 算不算过 |
| Gate | `execution-check.md` | 写代码前检查 |
| 验证 | `test-plan.md` | 怎么测 |
| 验证 | `test-report.md` | 测出了什么(执行后填) |

**刻意不生成:** 其余模板文件(需要时从 templates 复制)。

## 范围外(本包不做)

- 断连保护 / 补签卡(S1 第 3 条,另开包)
- 徽章墙、打卡徽章(S2)
- 奖励经济重定价(S2,需用户拍板)
- 学习模块真机验收(S1 第 4 条,需浏览器逐模块走查,另开包)

## 当前状态

- 任务 ID:`T20260815`
- 主画像:软件开发(碰撞修复 / 合同测试 / 文档同步)
- 状态:`done`(2026-08-15 验收通过,见 test-report.md)
