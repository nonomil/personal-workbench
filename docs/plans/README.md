# 日期型计划

这里保存按日期产生的设计稿、实施草案和历史决策，便于追溯，不作为当前进度来源。

## 当前执行

- 产品方案：`docs/工作台小游戏设计/`
- 任务包（按 templates 装配）：[`T20260813-world-games-growth/`](./T20260813-world-games-growth/README.md)
- 历史日期稿：`old/`（不叠加）
- 模板本身：`templates/`（只复制需要的卡，不要一次生成全部）

## 新任务怎么建包

1. 看 `templates/README.md` 的 5 类公开控制面，画像用 `templates/profiles/software-dev.md`
2. 新建 `docs/plans/T日期-短名/`，最少：`task.md`、`requirements-checklist.md`、`steps.md`、`acceptance.md`、`test-plan.md`、`test-report.md`
3. 有多来源需求再加 `requirements-source.md` + `source-requirements-alignment.md`
4. 要拆子任务再加 `task-decomposition.md`
5. 写代码前加 `execution-check.md`
6. **不要**为了整齐把 loop-spec / 四张 Gate / handoff 空卡先铺上

## 使用规则

- 当前主目标只看 [项目总控/进度看板](../00-总控/进度看板.md)。
- 计划执行前先检查 [当前状态](../00-总控/当前状态.md)，避免在过期基线上继续实施。
- 计划完成后，把最终结论、证据和未完成项同步到 `docs/00-总控/` 或对应稳定方案目录。
- 同一主题出现多份日期计划时，以最新决策记录和代码事实为准，不自动叠加全部要求。
