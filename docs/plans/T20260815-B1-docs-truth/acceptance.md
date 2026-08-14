# Acceptance — T20260815-B1

## 功能验收

- [ ] 卡片墙方案文档头部状态为"已实施"，含缓存戳、落点文件、守护测试三要素
  - 验证：人工 diff
- [ ] refresh 测试不再引用 `preschool-course-directory`，改断言卡片墙结构且通过
  - 验证：`node --test tests/preschool-workbench-refresh.test.mjs` 退出码 0；`rg "course-directory" tests/preschool-workbench-refresh.test.mjs` 退出码 1
- [ ] `docs/02-课程/` 内无"每天三项核心"类表述，任务数与 `prj/config.js` 实况一致
  - 验证：`rg "三项核心" docs/02-课程/` 退出码 1
- [ ] 数据与奖励合同每个数值有"合同→代码→改定"对数记录，修订后与代码一致
  - 验证：test-report 对数表 + 人工 diff
- [ ] 识字目标两处文档改为实测字数 + 主线 1500 口径
  - 验证：人工 diff

## 质量验收

- [ ] 零产品代码改动（唯一代码文件是 refresh 测试）
- [ ] 无新 localStorage key、无 `docs/data-model.md` 改动
- [ ] 数值一律来自步骤 1 侦查实录，不从规划文档转抄

## 测试验收

- [ ] `npm test` 退出码 0
- [ ] 步骤 1 的现状侦查记录在 test-report 阶段 0（含 refresh 测试改前红/绿状态）

## 文档验收

- [ ] `test-report.md` 每阶段有结论（允许推进 / 否）
- [ ] `docs/00-总控/当前状态.md` 已补记；`docs/plans/README.md` 状态已更新
- [ ] 若触发升级（代码内部矛盾），有记录且未顺手改代码
