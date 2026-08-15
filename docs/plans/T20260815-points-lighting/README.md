# T20260815-points-lighting：积分打卡口径统一与可见性

> 按 `docs/plans/templates` 软件开发画像装配，**不生成全部 20 张卡**。
> 源头方案：`docs/01-方案/2026-08-15-积分打卡优化/`（00–04 五份，执行前必读）。
> 决策依据：`docs/00-总控/决策记录.md` D-011。

## 为什么有这个包

积分（阳光）与打卡体系代码已闭环，但存在三处 P0 缺口 + 两处 P1 可见性缺口：

| # | 问题 | 级别 |
|---|---|---|
| 1 | 打卡口径矛盾：文档"全日完成"vs 代码"首次得阳光即写 checkinDates"，且《什么是真正的工作台》反对人为打卡叙事 → 已裁决双层口径（点亮日/完美日），孩子可见文案"打卡"改"点亮" | P0 |
| 2 | 向日葵旁路加阳光不进 `totalSunlightEarned`（`prj/preschool-garden.js:379-386,565-567`），累计统计漂移 | P0 |
| 3 | `claimReward` 扣款/幂等无独立合同测试（B3 S1 改造前需先锁现状） | P0 |
| 4 | 日历只有数字统计，无行动热力呈现 | P1 |
| 5 | 19 枚成就徽章与 11 枚世界勋章两套展示，看不到全貌 | P1 |

## 怎么用

1. 方案文档（只读）：`docs/01-方案/2026-08-15-积分打卡优化/` 按 00→01→02→03→04 顺序读完。
2. 本包是执行控制面：需求点 → 步骤 → 验收 → 测试。
3. 写代码前先过 `execution-check.md`（含与 B1-docs-truth 的文档撞域核对，必读）。
4. **本包只先执行 S1**；S2 是门控项，S1 验收 + 用户确认后再细化 steps。
5. 每阶段测完回写 `test-report.md`。

## 本包文件

| 控制面 | 文件 | 作用 |
|---|---|---|
| 入口 | `task.md` | L2 任务定义与边界 |
| 内部 | `task-decomposition.md` | S1 / S2 粒度 |
| 核心 | `requirements-checklist.md` | R1–R7 跨阶段打勾 |
| 核心 | `steps.md` | **当前只细写 S1** |
| 核心 | `acceptance.md` | 算不算过 |
| Gate | `execution-check.md` | 第一次写代码前 |
| 验证 | `test-plan.md` | 怎么测 |
| 验证 | `test-report.md` | 测出了什么（执行后填） |

**刻意不生成：** `requirements-source.md`（来源单一：方案包 + D-011）、`loop-spec.md`、`stage-gate.md`、`handoff.md` 等（需要时从 templates 复制）。

## 与其他计划包的关系（撞域必读）

- `T20260815-B1-docs-truth`（review 待验收）：双方都会改 `docs/data-model.md`。**执行前必须核对 B1 状态**：B1 已验收 → 本包直接增补"点亮日/完美日"一节；B1 未验收 → 先协调，禁止双改。
- `T20260815-B2-practice-review`（pending）：学习专区余额展示（P1-4）**不在本包**，已放入 `T20260815-points-hints` 等 B2。
- `T20260815-B3-reward-loop`（blocked）：本包 R4（claimReward 合同测试）是 B3 S1 的前置保险；家长确认兑换**不在本包**。
- `T20260815-streak-repair`（done）：S2 热力图必须把补签日（`streakRepair.repairedDates`）渲染为点亮、不给强度加成。

## 当前状态

- 任务 ID：`T20260815-points-lighting`
- 状态：`S1-review`，S1 已执行待用户验收；S2 未启动
- 执行顺序：S1 →（用户确认）S2
