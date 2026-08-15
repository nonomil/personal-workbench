# T20260815-B3-reward-loop

> 按 `docs/plans/templates` 软件开发画像装配，**只生成需要的卡**。
> 源头：`docs/01-方案/2026-08-15-学习内容体系优化/`：`03-外部笔记借鉴清单.md` 采纳项 #1–#5/#7 + `04-学习功能优化方案.md` P1-1～P1-4。

## 为什么有这个包

外部 25 篇"游戏化学习工作台"笔记裁决后确认：本项目缺的不是学科和积分，是**闭环出口**。四件套补齐"学 → 得阳光 → 有意义地花 → 想再学"：

| S | 事项 | 借鉴源 |
|---|---|---|
| S1 | 阳光商城兑换加"家长确认"步（pending → 确认核销） | 借鉴 #2（幼小衔接APP/布鲁伊/Codex 提示词） |
| S2 | 今日卡分"必做 / 冒险"两档：必做全完成点亮游戏入口 | 借鉴 #3（实用‼️三档，简化为两档） |
| S3 | 完成课弹层"去喂星芒"直连 + 连击徽记 + 防刷分提示文案 | 借鉴 #1/#5/#7 |
| S4 | 英语日定量闭环：词库 30→80、今日 3 词、学会进词库、复习标黄 | 借鉴 #4 + `学习项目设计/03-接库建议-英语拼读口算.md` |

**红线（来自 00-总控决策，违反即失败）：** 阳光唯一账本，不加新货币；星芒唯一伙伴；不引外部 IP；无惩罚性负反馈；奖励数值规则（去重、日上限）不放松。

## 怎么用（CC 接手顺序）

1. 读本 README → `task.md` → `task-decomposition.md`（S1–S4）→ `requirements-checklist.md`
2. **硬前置：`T20260815-B2` 完成**（S2 的"必做全完成"依赖六项全可练）
3. 过 `execution-check.md` 后开工；`steps.md` 当前只细写 S1
4. 每个 S 独立可交付：做完一个 S 即可停，回写 test-report 并同步状态
5. S1 是本包唯一允许新增 storage 字段的阶段，改前先过 `docs/00-总控/变更与同步规则.md`

## 本包文件

| 控制面 | 文件 | 作用 |
|---|---|---|
| 入口 | `task.md` | L2 任务定义 |
| 内部 | `task-decomposition.md` | S1–S4 粒度与门控 |
| 核心 | `requirements-checklist.md` | R1–R8 打勾表 |
| 核心 | `steps.md` | **当前只写细 S1** |
| 核心 | `acceptance.md` | 算不算过 |
| Gate | `execution-check.md` | 第一次写代码前 |
| 验证 | `test-plan.md` / `test-report.md` | 怎么测 / 测出了什么 |

**刻意不生成：** loop-spec、Gate 四卡、handoff、requirements-source（借鉴裁决即来源，链接在 README 顶部）。

## 与其他包的关系

- 硬前置：`T20260815-B2-practice-review`
- 软前置：`T20260815-B1-docs-truth`
- 后继：`T20260815-B4-content-deepening`（按需）
- S4 与英语词库在途改动可能撞文件域，execution-check 里强制核对
- **同域协调：** `T20260815-streak-repair`（in-progress）正在给连续打卡加补签卡（`growth.streakRepair.repairedDates`，连续天数从 `checkinDates` 派生并计入补签日）。本包 S3 连击徽记**必须复用该包落地后的派生函数/口径**，不得另写一套连续天数计算

## 当前状态

- 任务 ID：`T20260815-B3`
- 状态：`in-progress`（S1–S4 代码与合同已绿；浏览器走查待做；未标 accepted）
- 执行顺序：S1 → S2 → S3 → S4（每个 S 可独立交付）
- 预估：2–3 人日
