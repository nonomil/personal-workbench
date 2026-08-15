# task：积分打卡口径统一与可见性

- 级别：L2（轻量）
- 优先级：P0（S1）/ P1（S2）
- 源头：`docs/01-方案/2026-08-15-积分打卡优化/03-优化方案.md` 的 P0-1/P0-2/P0-3（S1）与 P1-1/P1-3（S2）；决策 D-011

## 1. 目标

1. **S1 口径与账本**：孩子可见文案"打卡"→"点亮"；`docs/data-model.md` 写入"点亮日/完美日"双层口径；向日葵旁路记账裁决并锁定测试；`claimReward` 补独立合同测试。
2. **S2 可见性**（门控）：日历升级为四档行动热力图（完美日星标、补签日点亮无强度）；徽章收集箱统一展示 19 枚成就 + 11 枚世界勋章。

## 2. 只改这些文件

- `prj/app.js`：UI 文案（日历/首页/花园/身份卡）、S2 日历渲染与收集箱分组
- `prj/preschool-achievements.js`：徽章描述文案、S2 分组渲染（若在此）
- `prj/child-growth.js`：仅 S2 新增纯派生函数（如 `dailyIntensity`），**不动 `recordAction`/`calculateStreak`/`repairStreak` 既有逻辑**
- `prj/preschool-garden.js`：仅当旁路记账裁决为方向 B 时
- `docs/data-model.md`：双层口径一节
- `tests/`：新增 `preschool-rewards-claim.test.mjs`；同步更新断言中文文案的既有测试

## 3. 明确不碰

- `prj/games/shared/workbench-bridge.js`（日上限 80 / 单事件 40 / 去重，零改动）
- `recordAction` 入账逻辑、`checkinDates` 等 localStorage 字段名（只改展示层）
- 奖励发放数值、兑换流程逻辑（家长确认属 B3）
- 学习专区 `#courses`（属 B2 与 points-hints 包）

## 4. 明确不做（红线，违反即失败）

1. 不新增手动"打卡"按钮
2. 不加学习路径每日阳光总上限
3. 不加倍率（周末双倍等）、不加断签惩罚、不恢复券、不加新货币
4. 不新增 localStorage key（热力图从 `awardedIds`/`checkinDates` 派生）
5. 不做排行/对比

## 5. 禁止顺手优化

不重构日历以外的渲染函数；不顺手改奖励商城结构（那是 B3）；不整理 `preschool-garden.js` 其他代码。

## 6. 升级条件（停下来问用户）

- 侦查发现 `totalSunlightEarned` 已被其他统计（徽章/成长阶段）依赖到"方向 A 文档化会造成口径谎言"的程度 → 停，带证据请示方向 B
- 发现 B1-docs-truth 未验收且已改 `docs/data-model.md` 相关段落 → 停，请示协调顺序
- 发现"打卡"文案被测试断言的数量 > 20 处 → 停，先给清单请示改动范围
- S1 全部验收后 → 停，等用户确认再细化 S2
