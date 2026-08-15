# acceptance：算不算过

## S1 验收

全部满足才算过：

1. `npm test` 全绿（退出码 0），用例数 ≥ 侦查基线（新增 claimReward 组 + 旁路锁定断言）。
2. `tests/preschool-rewards-claim.test.mjs` 存在且覆盖 R1 四条。
3. 向日葵记账裁决记录在 test-report + data-model，且有测试锁定（技能与防守 tick 两处）。
4. 真机走查：日历、首页身份卡、花园基地、连续奖励卡、徽章描述——孩子可见处零"打卡"字样，截图归档。
5. `docs/data-model.md` 有"点亮日 vs 完美日"节。
6. `git diff` 证明：`workbench-bridge.js` 零改动；`recordAction`/`calculateStreak`/`repairStreak` 逻辑零改动；无新 localStorage key；无手动打卡按钮。
7. `requirements-checklist.md` R1–R5 实现/自测列已勾且有证据。

## S2 验收（门控启用后）

1. `dailyIntensity` 纯函数单测覆盖：跨月、补签日至少 1 档无强度加成、不可解析日期事件不计强度。
2. 真机：日历显示四档热力格 + 完美日星标；补签日显示为点亮。
3. 收集箱可见 19 + 11 两组徽章；`tests/preschool-achievements.test.mjs` 既有判定测试零改动仍绿。
4. `npm test` 全绿；无新 localStorage key。

## 不算过的情形（一票否决）

- 出现手动打卡按钮或"快去打卡"类引导文案
- 改动了 bridge 上限/去重、recordAction 入账逻辑
- 新增货币/倍率/惩罚/券/排行
- 文案改动导致既有测试被删除而非更新
