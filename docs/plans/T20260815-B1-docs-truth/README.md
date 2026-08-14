# T20260815-B1-docs-truth

> 按 `docs/plans/templates` 软件开发画像装配，**只生成需要的卡**。
> 源头：`docs/01-方案/2026-08-15-学习内容体系优化/`（05-执行路线图 B1 批次）。
> 上游盘点证据：同方案包 `01-现状盘点.md`。

## 为什么有这个包

2026-08-15 学习内容体系盘点发现 5 处"文档说的与代码做的不一致"。本仓规则是**代码与测试为事实基准，文档不得反向宣称**，所以先把文档改回真，再做功能（B2/B3 包）。

| # | 偏离 | 级别 |
|---|---|---|
| 1 | 卡片墙方案文档头部仍写"待实施"，代码已上线（`34-course-wall.css` + `app.js` 3015–3058，缓存戳 `20260815-course-wall-v1`） | P0 |
| 2 | `tests/preschool-workbench-refresh.test.mjs` 仍断言旧 `preschool-course-directory` 结构 | P0 |
| 3 | 课程合同写"每天三项核心"，代码与综合改进规划是 6 项 | P1 |
| 4 | `00-总控/数据与奖励合同.md` 奖励数值与运行时不一致（课完成 +20、游戏日 cap 80） | P1 |
| 5 | 识字目标文档写"60 日 60–80 字"，运行时 240 字/主线目标 1500 | P1 |

## 怎么用（CC 接手顺序）

1. 读本 README → `task.md`（边界）→ `requirements-checklist.md`（R1–R6）
2. 过 `execution-check.md`（基线 + 工作区处置）后才动文件
3. 按 `steps.md` 执行（含"先侦查再改"步骤，禁止跳过侦查直接改文档）
4. 每阶段结论回写 `test-report.md`
5. 完成后同步 `docs/00-总控/当前状态.md`，并在 `docs/plans/README.md` 更新状态

## 本包文件

| 控制面 | 文件 | 作用 |
|---|---|---|
| 入口 | `task.md` | L1 轻量任务定义 |
| 核心 | `requirements-checklist.md` | R1–R6 打勾表 |
| 核心 | `steps.md` | 全部步骤（单阶段包，不拆 S） |
| 核心 | `acceptance.md` | 算不算过 |
| Gate | `execution-check.md` | 动手前检查 |
| 验证 | `test-plan.md` | 怎么测 |
| 验证 | `test-report.md` | 测出了什么（执行后填） |

**刻意不生成：** requirements-source（来源单一：方案包 04 文档 P0-1 表）、task-decomposition（不拆子任务）、loop-spec、Gate 四卡、handoff。

## 与其他包的关系

- 前置：无硬前置（T20260814 的 S3 真机验收未完不阻塞本包）
- 后继：`T20260815-B2-practice-review`（功能）建议在本包完成后开工，避免在失真文档上做设计
- 本包**零产品代码改动**，只改文档 + 1 个测试文件

## 当前状态

- 任务 ID：`T20260815-B1`
- 状态：`review`（已执行，待用户验收；证据见 `test-report.md`）
- 预估：0.5 人日
