# Loop Spec - [Loop 名称]

> 模式：L3 自动化 Loop
> 适用：持续运行、无人值守、audit -> fix -> review -> golden 一类任务。

## 0. 领域适用判断

- 主画像：`软件开发 / 算法 / UI 优化 / 深度学习 / 混合`
- 次画像：

### 什么时候这个领域值得上 Loop

- 软件开发：适合批量 audit / fix / review / regression，不适合一次性小改
- 算法：适合多轮评估、批量样本回归、阈值扫描、报告回写
- UI 优化：适合截图审查、批量页面回归、可视证据收集
- 深度学习：适合实验循环、训练评估、数据闭环和 golden 沉淀

## 1. 目标

- 一句话目标：
- 为什么值得做成 Loop：

## 2. 停止条件

> 必须机器可判定，不允许 maker 自评通过。

- `/goal "待补充"`
- 量化停止标准：

## 3. 动机自检

- [ ] 我是在深度理解的工作上提速
- [ ] 我没有用 Loop 回避理解工作本身

## 4. OPEN / CLOSED 声明

- [ ] CLOSED：目标清晰，每步有 eval，可以运行
- [ ] OPEN：目标模糊，先做 DISCOVERY only

## 5. Subagent 设计

| Agent | 角色 | 允许动作 | 禁止动作 | 模型建议 |
|---|---|---|---|---|
| researcher | DISCOVERY | 只读、输出问题清单 | 写业务文件 | fast |
| maker | EXECUTION | 写实现、补测试 | 审查自己、直接裁决 | standard |
| checker | VERIFICATION | 跑验证、输出 PASS/FAIL | 修改被审代码 | standard |
| golden | MEMORY UPDATE | 回写 spec / 样板候选 | 改业务代码 | standard |

规则：

- maker 和 checker 必须是不同 session
- checker 失败时，Loop 暂停并等待人工或主代理裁决

## 6. External Memory

- 状态文件：
- `session-journal.md` 路径：
- `spec-update.md` 回写目标：
- `docs/spec/golden-candidates.md` 是否作为候选池：
- 领域证据主路径：

## 7. Worktree 与并行限制

- 并行 worktree 上限：
- 哪些任务必须隔离：
- 哪些数据允许共享：

## 8. 风险确认

- [ ] Verification 仍是人的责任
- [ ] 会定期抽样读代码和证据，而不只看指标
- [ ] checker 的标准足够严，不会放过低质量结果
- [ ] 出现方向异常时会回退到需求 / 方案 / 计划层，而不是继续硬推

## 9. 变更与重入规则

> Loop 不是无脑向前跑。需求新增、方向证伪、测试打脸时，必须先停，再重入。

### 触发条件

- 用户新增需求，且会影响范围 / 验收 / 步骤
- checker / review / 数据验证推翻了原前提
- 当前 loop 只能靠放松标准才能“看起来通过”

### 必做动作

- 先暂停 loop 推进
- 先填写 `change-request.md`
- 先决定这次属于 `patch / replan / reset`
- 再回写 `requirements-checklist.md`、`steps.md`、`acceptance.md`、`test-plan.md`

### 重入点

- `patch`：回到 `stage-gate.md` 或 `execution-check.md`
- `replan`：回到 `direction-check.md`
- `reset`：停止当前 loop，回到入口层重新建任务

### 明确禁止

- 不允许先静默改正文档，再继续 loop
- 不允许 maker 自己宣布“这只是小改，不用回退”
- 不允许 checker 发现方向异常后仍继续放行
