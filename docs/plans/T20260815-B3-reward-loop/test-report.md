# Test Report — T20260815-B3

> 执行时逐阶段回写。未执行的阶段保持"未开始"，不预填结论。

## 阶段 0：S1 侦查与字段评审

- 状态：已完成（2026-08-15）
- 现有兑换流程记录：
  1. 商城卡点「领取」→ `claimReward` → 立刻扣 `growth.sunlight` → 写入 `claimedRewardIds` → 庆祝。
  2. 阳光不足或已领过则抛错，钱包不变。
  3. `claimedRewardIds` 只表示已核销；无 pending。
- pending 字段方案（A/B + 理由）：**方案 A** `growth.pendingRewardIds: string[]`。`claimedRewardIds` 语义不动；老快照缺字段归一化为 `[]`。方案 B 会改已核销条目结构，不采用。
- 结论：允许推进。

## 阶段 1：S1 合同先红后绿

- 状态：已完成
- 先红：`node --test tests/preschool-rewards-confirm.test.mjs` 7/7 fail
- 转绿：同上命令 7/7 pass；旧 `preschool-rewards-claim.test.mjs` 仍覆盖儿童版立刻领取
- 结论：两步流合同绿。无新货币，未改 `awardSunlight` 数值。

## 阶段 2：S1 浏览器证据

- 状态：未开始
- 三态走查记录：无（待打开奖励页：兑换 → 刷新仍待确认 → 长按 2 秒确认 → 阳光减少）
- 红线自查（无新货币/数值未动）：代码层通过
- 结论（S1 交付 / 否）：代码可交付，未标 accepted

## 阶段 3：S2 两档任务

- 状态：代码已完成（2026-08-15）
- 命令：`node --test tests/preschool-required-adventure.test.mjs` 通过
- 行为：必做未完 → 冒险置灰 +「先完成今日必做」；必做全完成 → 三世界可点；选做未完不挡
- 浏览器两状态走查：未做
- 结论：代码可交付，未标 accepted

## 阶段 4：S3 三件小改

- 状态：代码已完成（2026-08-15）
- 命令：`node --test tests/preschool-reward-loop-s3.test.mjs` 通过
- 行为：完成课弹层「去喂星芒」走现有 `feed-pet`；今日卡「连续学习 n 天」读 `getChildGrowth().streak`；重开已完成课提示「已领过阳光，再练不加分也不扣分」
- `git` 范围：未新增 storage 字段
- 浏览器走查：未做
- 结论：代码可交付，未标 accepted

## 阶段 5：S4 英语日定量

- 状态：代码已完成（2026-08-15）
- 命令：`node --test tests/preschool-english-daily.test.mjs tests/preschool-english-vocab.test.mjs` 通过
- 行为：80 词日定量表 + 英语专区「今日 3 词」+「我的词库」；到期复习标黄；掌握仍写 `courseProgress.english.mastery`
- 溯源：`docs/02-课程/英语/06-80词溯源表.md`（Dolch / 课标一年级生活词 + 本仓库自写句）
- 浏览器走查：未做
- 结论：代码可交付，未标 accepted

## 阶段 6：回归记录

- S1–S4 合同：`preschool-rewards-confirm` + `preschool-required-adventure` + `preschool-reward-loop-s3` + `preschool-english-daily` + english-vocab 绿
- 未宣称 `npm test` 全绿（既有 bomb 图标等失败未修）

## 遗留 / 升级记录

- 未做浏览器长按确认 / 必做门槛 / 喂星芒 / 今日 3 词走查
- 未 commit
