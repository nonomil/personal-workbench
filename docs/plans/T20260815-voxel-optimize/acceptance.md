# Acceptance — T20260815-VX

## 子任务索引

| 子任务 | 需求点 | 最小验收标准 | 主要证据 |
|---|---|---|---|
| S1 | R1–R4 R9 | 周报总数动态化 + 结算三行 + 升段卡 + 回归全绿 | test-report 阶段 1/2/4 |
| S2 | R5–R8 | 门禁/蓝图/家园快照/大师任务断言 | test-report 阶段 5 |

## 功能验收（S1）

- [ ] 家长周报方块世界行 total 与 `VoxelQuests.list.length` 一致（当前 12）
  - 验证：mock 注入断言 + 工作台周报页目检
- [ ] 花园/横版页加载 bridge 不炸（无 `VoxelQuests` 全局的兜底路径）
  - 验证：两页浏览器 Console 无报错
- [ ] 任务完成三行结算；"下一目标"取最近未完成生涯任务或里程碑
  - 验证：组装函数断言 + 目检
- [ ] rank 升段弹仪式卡且同段位不重复弹
  - 验证：rank 2→3 断言 + 实测

## 功能验收（S2，展开后启用）

- [ ] rank 1 挖石失败有提示、rank 3 成功；老档全解锁不回收
- [ ] 蓝图覆盖率 ≥80% 判定纯函数断言；完成走 `awardSunlight` 去重
- [ ] 家园快照 localStorage 增量 <8KB；成长页"我的家园"卡渲染
- [ ] q13–q18 rank 5 前不可见；`ms-voxel-12` 判定不受影响

## 质量验收（全程）

- [ ] bridge 除 `getWeeklyReport` labels 一处外零改动（S1）
- [ ] 无新 localStorage key（progress 内部新字段如 `lastCelebratedRank` 允许）
- [ ] `quest-<id>` / `daily-<日期>` 发奖键不变；每日挑战当日重复完成不重复发奖
- [ ] 390px 视口热键栏、任务 HUD 不溢出

## 测试验收

- [ ] 新增合同测试先红后绿（R4）
- [ ] `npm test` 退出码 0；voxel 合同关键词保持存在

## 文档验收

- [ ] 本包 `test-report.md` 每阶段有结论
- [ ] S1 收口后同步 `docs/00-总控/当前状态.md` 与分册 `04-落地路线与验收.md` 切片状态
