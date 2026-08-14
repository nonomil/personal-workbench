# T20260813-world-games-growth

> 按 `docs/plans/templates` 的软件开发画像装配。  
> **不把 templates 里 20 张卡全部生成。** 本目录只放本轮真正用的控制面。

## 怎么用

1. 产品方案（只读）：`docs/工作台小游戏设计/`
2. 本包是执行控制面：需求点 → 步骤 → 验收 → 测试
3. 写代码前先看 `execution-check.md`
4. 每阶段测完回写 `test-report.md`，不要空喊通过
5. 方向变了先开 `change-request.md`（本包暂未生成，需要时从 templates 复制）

## 本包文件（已生成）

| 控制面 | 文件 | 作用 |
|---|---|---|
| 入口 | `task.md` | L2 任务定义 |
| 内部 | `requirements-source.md` | 需求从哪来 |
| 内部 | `source-requirements-alignment.md` | 原文有没有漏进表 |
| 核心 | `requirements-checklist.md` | 跨阶段打勾 |
| 内部 | `task-decomposition.md` | S1/S2/S3 粒度 |
| 核心 | `steps.md` | **当前只写细 S1 花园** |
| 核心 | `acceptance.md` | 算不算过 |
| 验证 | `test-plan.md` | 怎么测 |
| 验证 | `test-report.md` | 测出了什么（执行后填） |
| Gate | `execution-check.md` | 第一次写代码前 |

**刻意不生成：** `loop-spec.md`、`direction-check.md`（方向已在方案里冻结）、`stage-gate.md` / `final-check.md`（S1 过后再补）、`handoff.md`、`session-journal.md`、`spec-update.md`。本仓没有 `taskctl.py`，分解冒烟用手跑验证命令，不跑模板里的 python 脚本。

## 当前状态

- 任务 ID：`T20260813`
- 主画像：软件开发
- 入口重量：L2（三世界跨模块；执行仍串行，一次只做 S1）
- 状态：`pending`，待 execution-check 放行后改代码
- 旧单文件切片改为指针：`../2026-08-13-world-games-growth-adapt.md`
