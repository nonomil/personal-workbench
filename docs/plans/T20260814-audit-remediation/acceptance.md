# Acceptance — T20260814

## 子任务索引

| 子任务 | 需求点 | 最小验收标准 | 主要证据 |
|---|---|---|---|
| S1 | R1–R4 R7 R8 | 商标与身份合同测试绿 + 文档修订 + npm test 全绿 | test-report 阶段 1/2/4 |
| S2 | R5 | 删除清单与实际一致，三世界无 404 | test-report 阶段 3 |
| S3 | R6 | 17 项清单逐项有记录 | test-report 阶段 5 |

## 功能验收（S1）

- [ ] voxel 页不出现「横版过关 / 走到出口 / 空格跳跃」
  - 验证：world-games voxel 断言 + 浏览器
- [ ] 启动器与三个游戏页无「我的世界 / Minecraft / 马里奥 / Mario」
  - 验证：商标合同断言 + grep 退出码 1
- [ ] voxel 任务流程（挖 → 放 → 完成任务 → 阳光）不受文案改动影响
  - 验证：浏览器走一个任务；`growth.worldGames.voxel-adventure.questsDone` 增长
- [ ] 文档两处修订内容与代码事实一致
  - 验证：人工 diff

## 功能验收（S2）

- [ ] 删除文件与 requirements-source B4 清单一致（voxel steve×4 + creeper×2 + platform mario×6，含 keyed）
- [ ] 两份 `assets/manifest.md` 同步更新
- [ ] 三世界页面 Console 无 404 / 无破图
  - 验证：浏览器三页 + `npm test`

## 功能验收（S3）

- [ ] DS 文档 17 项（花园3/地图3/建造3/三域2/UI交互6）逐项 ☑ 或 ☐+原因
- [ ] 发现的 defect 单独记录，不在本包顺手修
- [ ] 结论同步 `docs/00-总控/当前状态.md`

## 质量验收（全程）

- [ ] 无新 localStorage key
- [ ] bridge 协议、徽章判定逻辑零改动
- [ ] game.js 零改动（若步骤 2 判定需改 → 走 change-request，不算失败）

## 测试验收

- [ ] 新增合同测试先红后绿（R4）
- [ ] `npm test` 退出码 0
- [ ] 真机验收记录含设备与浏览器信息

## 文档验收

- [ ] 本包 `test-report.md` 每阶段有结论（允许推进 / 否）
- [ ] `docs/00-总控/当前状态.md` 在 S3 后同步，不提前写完成
- [ ] `spec-update.md` 本轮不生成（无新规范）

## 需求分解对照

- [ ] R1–R8 全部有验证动作或明确门控状态
- [ ] S2 若用户不确认删除 → 标记 `不适用`，不是 `缺失`
