# Evidence Decision Task Card

> 用途：算法验证、参考实现对齐、生产候选判断、多 Agent 审核、plan/task 同步或 solution-loop 合入前，先把任务收窄成一个可裁决问题。
>
> 原则：先给人看短卡，再给 AI 执行包；不因为上下文混乱就扩写总控文档。

## 1. 给人看的短卡

```text
结论：
证据：
不能说明什么：
下一步：
停止条件：
```

## 2. decision card

```text
decision_question:
  <本轮只回答这一句>

current_verdict:
  PASS / FAIL / PARTIAL / BLOCKED / NOT_STARTED

evidence_required:
  - <必须有的证据>

evidence_not_allowed:
  - <不能作为结论依据的东西>

stop_condition:
  - <出现什么就停止，不继续扩散>

next_action:
  - <唯一下一步>

doc_rule:
  只更新必要的 task/test-report/progress；除非发现 P0/P1 方向错误，否则不新建总控文档。
```

## 3. AI 执行包约定

| 文档 | 什么时候需要 | 最小内容 |
|---|---|---|
| 原始需求 | 需求来自多轮对话、历史报告或多模型意见 | 背景、确认事实、推测、术语、边界、未决问题 |
| 需求分解 / 评审表 | 担心遗漏、口径混淆或任务拆错 | 需求点、证据源、风险、验收映射 |
| plan task | 需要进入任务控制面 | `decision_question`、证据要求、禁止证据、停止条件、唯一下一步 |
| acceptance | 需要判断 PASS/FAIL/PARTIAL/BLOCKED | 可判定标准和阻塞条件 |
| test-plan | 需要实验或只读验证 | 最小矩阵、样本、字段、阈值口径 |
| test-report | 已有执行结果或只读证据 | 事实、裁决、不能外推的边界、下一步 |

## 4. 多 Agent / solution-loop 触发

- 只在 P0/P1 风险时拉多 Agent 审核：算法身份、字段口径、生产默认、最终指标代理失败、任务状态矛盾。
- 只读证据包阶段不启动 `solution-loop`。
- 确认需要代码实现、配置变更或高风险合入时，才把本卡转成 `solution-loop` 输入。

## 5. 默认停止条件

- 写不出一句话 `decision_question`：先停下来做对齐卡。
- 证据只覆盖当前链路：不得写成全局结论。
- 已确认主要损失不在当前调参维度：停止调参，转向真正缺口。
- 副作用或默认开关门禁未闭合：不得默认启用，只能 shadow/诊断。
