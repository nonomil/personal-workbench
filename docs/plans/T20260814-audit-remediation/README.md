# T20260814-audit-remediation

> 按 `docs/plans/templates` 软件开发画像装配。**不把 20 张卡全部生成。**
> 源头：2026-08-14 对照四组设计文档（优化方案2 / 学习项目设计 / 工作台小游戏设计 / 徽章系统）的全面审查。

## 审查结论摘要（为什么有这个包）

202 项测试全绿、落地度约 85%。剩余偏离集中在四处：

| # | 偏离 | 级别 |
|---|---|---|
| 1 | 方块世界页面文案仍是「横版过关 · 走到出口 / 空格跳跃 / 关卡」，与已接好的 quests 运行时身份错位（T20260813-R7 的文案尾巴） | P0 |
| 2 | 启动器对外文案「我的世界式 / 马里奥式」，两份落地方案明确禁止 Minecraft / Mario 商标 | P0 |
| 3 | steve / creeper / mario 素材已不被代码引用但仍在仓（版权敞口） | P1 |
| 4 | 徽章系统 DS 六问题的「真机 17 项验收」无执行记录 | P1 |

另有两处文档过时/冲突随 S1 一并修订。

## 怎么用

1. 产品方案（只读）：`docs/工作台小游戏设计/`、`docs/徽章系统/DS--徽章系统设计.md`
2. 本包是执行控制面：需求点 → 步骤 → 验收 → 测试
3. 写代码前先过 `execution-check.md`（**含未提交工作区处置**，必读）
4. 每阶段测完回写 `test-report.md`
5. S2 删除素材前必须获得用户确认（全局规则：删除先告知）

## 本包文件

| 控制面 | 文件 | 作用 |
|---|---|---|
| 入口 | `task.md` | L2（轻量）任务定义 |
| 内部 | `requirements-source.md` | 需求从哪来（审查证据 file:line） |
| 内部 | `source-requirements-alignment.md` | 来源 ↔ 需求点对齐 |
| 核心 | `requirements-checklist.md` | R1–R7 跨阶段打勾 |
| 内部 | `task-decomposition.md` | S1 / S2 / S3 粒度 |
| 核心 | `steps.md` | **当前只写细 S1** |
| 核心 | `acceptance.md` | 算不算过 |
| Gate | `execution-check.md` | 第一次写代码前 |
| 验证 | `test-plan.md` | 怎么测 |
| 验证 | `test-report.md` | 测出了什么（执行后填） |

**刻意不生成：** `loop-spec.md`、`direction-check.md`、`stage-gate.md` / `final-check.md`（S1 过后补）、`handoff.md`、`session-journal.md`、`spec-update.md`、`change-request.md`（需要时从 templates 复制）。

## 与 T20260813 的关系

- 本包 S1 收口 T20260813 遗留的 R7 文案尾巴（游戏逻辑不重开，quests 已接好）
- T20260813 的 S2（方块）/ S3（横版）游戏逻辑改造已在 7929c34 落地，其包内状态由该包自行维护
- 本包不碰花园世界

## 当前状态

- 任务 ID：`T20260814`
- 主画像：软件开发（文案/合同测试/素材治理/人工验收）
- 状态：`pending`，待 execution-check 放行
- 执行顺序：S1 → （用户确认）S2 → S3
