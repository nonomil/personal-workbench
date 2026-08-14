# T20260815-B4 - 任务定义卡（待启动）

> 模式：预计 L2（每子项独立 L1–L2）
> 状态：deferred。**本卡只固化范围与边界，防止将来走样；启动时再写细。**

## 1. 目标与背景

- 一句话目标：把 60 日教案与数据合同的"纸面深度"变成孩子实际玩到的深度。
- 背景：`2026-08-15-学习内容体系优化/01-现状盘点.md` 差距清单 2/3/4 条——教案 activityType 运行时降级为 choice/timer；古诗/拼音/拼读无 60 日挂入；fourSteps/evidence 无消费方。

## 2. 子任务

见 `task-decomposition.md`（C1–C4，可独立启动）。

## 3. 边界（现在就冻结）

**允许改：** `prj/app.js`（弹窗模板/详情步骤条/学情页）、`scripts/build_lesson_pack.py`（放行新 activityType）、`prj/preschool-lesson-pack.js`（挂载扩展）、对应测试与 `docs/02-课程/` 口径。

**不碰：** `workbench-bridge.js`、奖励数值、三世界游戏、storage 主结构（学情页只读派生）。

**明确不做：** 完整家长后台、磨耳朵页、阅读计划页（观察项）、给占位学科（古诗/成长游戏/运动专注）补 60 日全量文案——内容生产另行安排。

**禁止顺手优化：** 重构 lesson-pack 管线、改 60 日数据 schema、练习弹窗整体改版。

## 4. 启动程序（每子项）

1. `.meta.yaml` 改 pending、填 files；从 templates 装配 requirements-checklist / steps / acceptance / execution-check / test-plan / test-report
2. 步骤 1 必须是"侦查现状"；步骤 2 必须是"测试先红"
3. 交付后回写 `docs/00-总控/当前状态.md` 与 `docs/plans/README.md`

## 5. 升级触发

- C1 新 mode 若需要新素材（图配字的图）→ 先走素材生产管线评估，不在本包内生图
- C2 挂入后课程数暴涨导致 UI 拥挤 → 回 `01-方案/2026-08-15-学习专区卡片墙布局方案.md` 评审分页策略
- C4 若发现 fourSteps 数据本身质量不足以展示 → 转内容修订任务，不硬接
