# 日期型计划

这里保存按日期产生的设计稿、实施草案和历史决策，便于追溯，不作为当前进度来源。

## 当前执行

- 产品方案：`docs/01-方案/工作台小游戏设计/`
- 任务包（按 templates 装配）：[`T20260813-world-games-growth/`](./T20260813-world-games-growth/README.md)
- 审查整改包（2026-08-14 审查结论）：[`T20260814-audit-remediation/`](./T20260814-audit-remediation/README.md)
- 学习内容体系优化批次（源头 `docs/01-方案/2026-08-15-学习内容体系优化/`，建议顺序 B1→B2→B3→B4）：
  - [`T20260815-B1-docs-truth/`](./T20260815-B1-docs-truth/README.md) 文档回真（P0，review 已执行待验收：5 处偏离改齐、npm test 259/259，见其 test-report）
  - [`T20260815-B2-practice-review/`](./T20260815-B2-practice-review/README.md) 六项接练习 + 错题回流（P0，pending）
  - [`T20260815-B3-reward-loop/`](./T20260815-B3-reward-loop/README.md) 奖励闭环四件套（P1，blocked 等 B2）
  - [`T20260815-B4-content-deepening/`](./T20260815-B4-content-deepening/README.md) 内容深化（P2，deferred 按需启动）
- 三游戏优化包（2026-08-15 分册方案落地，推荐按序执行，不并行）：
  1. [`T20260815-garden-optimize/`](./T20260815-garden-optimize/README.md) 花园：playMods + 结算三行 + 星芒陪伴
  2. [`T20260815-voxel-optimize/`](./T20260815-voxel-optimize/README.md) 方块：周报总数 bug + 结算三行 + 升段仪式（唯一动 bridge 的包）
  3. [`T20260815-platform-optimize/`](./T20260815-platform-optimize/README.md) 横版：碰撞债清偿 + 手感锁定 + playMods + 结算三行
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
