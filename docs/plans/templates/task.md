# Txxx - 任务定义卡

> 默认模式：L1 标准
> 适用：已经不是纯一句话小改，但还没复杂到必须直接进完整 Loop 设计。

## 0. 领域画像

- 主画像：`软件开发 / 算法 / UI 优化 / 深度学习 / 混合`
- 次画像：
- 参考画像：`profiles/software-dev.md / algorithm.md / ui-optimization.md / deep-learning.md`

## 1. 任务目标

- 一句话目标：
- 为什么现在做：
- 预期收益：

## 2. 输入基线

- 原始需求来源：
- 关联文档：
  - `requirements-source.md`：
  - `source-requirements-alignment.md`：
  - `requirements-checklist.md`：
- 当前已知约束：

### 按领域最少补充项

- 软件开发：受影响模块、接口边界、最低回归路径
- 算法：目标指标、阈值口径、样本范围、基线版本
- UI 优化：目标页面、核心用户路径、截图口径、分辨率范围
- 深度学习：数据集来源、切分方式、训练预算、复现要求

## 3. 子任务拆分

| ID | 描述 | 角色 | 文件范围 | 禁止碰 | 验证命令 | 预计耗时 | 回滚单元 |
|---|---|---|---|---|---|---|---|
| S1 | 待补充 | researcher / maker / checker | 待补充 | 待补充 | 待补充 | 待补充 | 待补充 |

### 粒度三问

| 问题 | S1 |
|---|---|
| 验证 <= 10 分钟？ | 待补 |
| 做错能整块丢？ | 待补 |
| reviewer 5 分钟能判断？ | 待补 |

## 4. 边界

- 只改：
- 不碰：
- 明确不做：
- 禁止顺手优化：

## 5. 验收

- [ ] 验收条件 1
- [ ] 验收条件 2
- 关键验证命令：

## 6. 升级触发

出现以下任一情况，考虑升级到更重流程：

- 需求分解后出现明显遗漏，需回到 `requirements-checklist.md`
- 需要 `direction-check.md` / `execution-check.md` / `stage-gate.md`
- 需要小时级持续运行、golden 沉淀或 maker/checker/golden 长循环
- 需要额外写 `loop-spec.md`
- 领域信息补不全，只能继续靠猜时
