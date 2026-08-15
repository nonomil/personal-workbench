# T20260815-B2-practice-review

> 按 `docs/plans/templates` 软件开发画像装配，**只生成需要的卡**。
> 源头：`docs/00-总控/2026-08-14-综合改进规划.md` P0 既定项 + `docs/01-方案/2026-08-15-学习内容体系优化/05-执行路线图` B2 批次。

## 为什么有这个包

综合改进规划把两件事定为学习侧 P0，至今未完成：

| # | 事项 | 现状缺口 |
|---|---|---|
| 1 | 今日六项任务全部接"去练习" | `dailyPlans` 支持 `practiceLessonId` 跳练习，但六项中运动（计时器）与专注（入口）未接全——**以侦查为准，可能不止这两项** |
| 2 | 错题 1/3/7 天回流 | `mistakes` 已记录（`recordLessonMistake`）、错题页已有，但没有按天回流到今日任务/复习入口的机制 |

这是"任务 → 练习 → 掌握"闭环的最后两块，做完后 B3（奖励闭环）才有意义。

## 怎么用（CC 接手顺序）

1. 读本 README → `task.md` → `task-decomposition.md`（S1/S2）→ `requirements-checklist.md`
2. 过 `execution-check.md` 后开工；**建议先完成 T20260815-B1**（文档回真），非硬阻塞
3. `steps.md` 当前只细写 S1（练习入口补全）；S2（错题回流）在 S1 验收后展开
4. 每阶段回写 `test-report.md`
5. 涉及 storage 字段变化时**必须**同步 `docs/data-model.md` 与 `docs/00-总控/变更与同步规则.md` 要求的清单

## 本包文件

| 控制面 | 文件 | 作用 |
|---|---|---|
| 入口 | `task.md` | L2 任务定义 |
| 内部 | `task-decomposition.md` | S1 / S2 粒度 |
| 核心 | `requirements-checklist.md` | R1–R6 打勾表 |
| 核心 | `steps.md` | **当前只写细 S1** |
| 核心 | `acceptance.md` | 算不算过 |
| Gate | `execution-check.md` | 第一次写代码前 |
| 验证 | `test-plan.md` / `test-report.md` | 怎么测 / 测出了什么 |

**刻意不生成：** requirements-source（来源两份文档已在 README 标明）、loop-spec、Gate 四卡、handoff。

## 与其他包的关系

- 前置（软）：`T20260815-B1-docs-truth`（避免在失真文档上做设计）
- 后继：`T20260815-B3-reward-loop`（两档任务依赖本包"六项全可练"）
- 与 `T20260814-audit-remediation` 无文件域冲突（那边剩真机验收 S3）

## 当前状态

- 任务 ID：`T20260815-B2`
- 状态：`in-progress`（S1+S2 代码与假时钟合同已落地；浏览器走查待验收）
- 执行顺序：S1 → S2（同切片完成；S2 未加新字段）
- 预估：1–2 人日
