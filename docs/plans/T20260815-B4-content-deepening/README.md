# T20260815-B4-content-deepening

> **轻量待启动包**：按 `docs/plans/README.md` 规则"不要为了整齐把空卡先铺上"，本包只放 README + task.md + task-decomposition.md。
> 启动执行时再从 `docs/plans/templates` 装配 requirements-checklist / steps / acceptance / execution-check / test-plan / test-report。
> 源头：`docs/01-方案/2026-08-15-学习内容体系优化/04-学习功能优化方案.md` P2 全节。

## 为什么有这个包

B1–B3 补的是闭环，本包深化内容质量：60 日教案的深度玩法产品化、三个学科的 60 日课挂入、家长学情摘要、数据合同字段真正被消费。**按需逐项启动，不必整包做完。**

## 子任务一览（可独立启动，无内部顺序依赖）

| 项 | 内容 | 预估 |
|---|---|---|
| C1 | 新练习 mode：识字"图配字"、拼音"听音选调"（`build_lesson_pack.py` 放行新类型 + `app.js` 弹窗新模板） | 1–2 人日 |
| C2 | 古诗/拼音/拼读 60 日包挂入专区（`preschool-lesson-pack.js` 扩展挂载三科；数据已在 `prj/data/preschool/`） | 1 人日 |
| C3 | 家长学情摘要页（各科 mastery、连击、错题数、兑换记录一页汇总；不做完整后台） | 1 人日 |
| C4 | `fourSteps`/`evidence` 消费：课程详情步骤条读数据合同真实字段 | 0.5–1 人日 |

## 前置与门控

- 硬前置：`T20260815-B3` 至少 S1–S3 交付（C3 需要连击/兑换数据）；C1/C2 只需 B2 完成
- 每项启动前：先建该项的 steps + 先红测试，再动代码
- 红线同 B3：无新货币、无外部 IP、无惩罚、storage 变更过评审

## 观察项（不启动，记录在案）

- 磨耳朵/熏听记录页、英语阅读计划页（外部笔记借鉴清单 #10/#11）——等真实使用需求出现再评估

## 当前状态

- 任务 ID：`T20260815-B4`
- 状态：`deferred`（按需启动，启动时改 pending 并补装控制面）
