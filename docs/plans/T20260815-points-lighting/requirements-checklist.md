# requirements-checklist

> 每个 R 三列：实现 → 自测 → 最终验收（最终验收留给用户勾）。
> 证据 = 命令输出 / file:line / 截图归档路径，填在"证据"列。

## S1

| R | 需求 | 实现 | 自测 | 最终验收 | 证据 |
|---|---|---|---|---|---|
| R1 | `tests/preschool-rewards-claim.test.mjs` 覆盖：余额不足拒绝 / 扣款正确 / `claimedRewardIds` 幂等（重复兑换拒绝）/ 兑换不影响 `totalSunlightEarned` | [x] | [x] | [ ] | `tests/preschool-rewards-claim.test.mjs` 4 条；`node --test tests/preschool-rewards-claim.test.mjs` 4/4 退出码 0 |
| R2 | 向日葵旁路记账有书面裁决（方向 A 或 B）+ 锁定测试断言裁决结果（技能与防守 tick 两处都覆盖） | [x] | [x] | [ ] | 方向 A；`tests/preschool-garden.test.mjs` 技能+防守 tick 两测；data-model 总账节已写明 |
| R3 | 孩子可见 UI 文案无"打卡"歧义残留：日历、首页身份卡、花园基地、连续奖励卡、徽章描述统一"点亮"叙事；家长侧说明性文字允许保留"打卡"一词但需加括号解释 | [x] | [x] | [ ] | 真机 4192；截图 `.tmp-analysis/s1-*.png`。files 外残留：`preschool-growth-world.js`「天打卡」 |
| R4 | `docs/data-model.md` 有"点亮日 vs 完美日"节：两个统计的定义、来源函数（`recordAction` 写 `checkinDates` / 地图徽章的全日完成）、用途；若裁决方向 A 同时写明 `totalSunlightEarned` 统计口径 | [x] | [x] | [ ] | `docs/data-model.md`「点亮日 vs 完美日（2026-08-15，D-011）」 |
| R5 | 无新增手动打卡按钮；`recordAction`/`calculateStreak`/`repairStreak`/`workbench-bridge.js` 零改动（git diff 佐证） | [x] | [x] | [ ] | child-growth 仅改 streak-1 描述；本包未改 bridge（工作树另有 voxel 并行 diff） |

## S2（门控：S1 验收 + 用户确认后启用）

| R | 需求 | 实现 | 自测 | 最终验收 | 证据 |
|---|---|---|---|---|---|
| R6 | 日历为四档热力格：`dailyIntensity` 纯函数有单测（跨月、补签日至少 1 档无强度加成、无法解析日期的事件不计强度）；完美日星标 | [ ] | [ ] | [ ] | |
| R7 | 收集箱含"世界勋章"分组，19 枚成就 + 11 枚世界勋章全貌可见；成就判定测试零改动仍绿；家长报告徽章墙同步 | [ ] | [ ] | [ ] | |

## 全程约束（每阶段自查）

- [ ] npm test 全绿
- [ ] 无新 localStorage key
- [ ] 无新货币 / 无惩罚 / 无排行 / 无倍率 / 无券
