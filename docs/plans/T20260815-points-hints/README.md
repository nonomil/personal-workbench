# T20260815-points-hints：还差一点提示 + 学习专区余额（待启动）

> 轻量待启动包（仿 `T20260815-B4-content-deepening` 范式）：只有 README / .meta.yaml / task.md。
> 启动时按 `T20260814-audit-remediation` 范式补齐控制面（checklist / steps / acceptance / execution-check / test-plan / test-report）后再执行。
> 源头方案：`docs/01-方案/2026-08-15-积分打卡优化/03-优化方案.md` 的 P1-2、P1-4；决策 D-011。

## 范围

| 子项 | 内容 | 前置 |
|---|---|---|
| H1 | "还差 X"提示三处：奖励商城卡"还差 N 阳光"、徽章灰占位"再认 12 个字就点亮"（`progressText`）、连续奖励卡"再点亮 2 天领取" | `T20260815-points-lighting` S1 验收（文案口径先落定） |
| H2 | 学习专区 `#courses` 头部复用 `pixel-hud-sun` 展示阳光余额 | `T20260815-B2-practice-review` 验收（同改 `#courses` 区域，必须排后） |

## 为什么 blocked

- H1 的连续奖励提示与 `T20260815-B3-reward-loop` S3（连击徽记文案）重叠：**谁先执行谁做，后者复用**。启动本包前先核对 B3 状态，若 B3 S3 已做则 H1 裁掉该条。
- H2 与 B2 同文件同区域，B2 未验收前动 `#courses` 必然冲突。

## 边界（已冻结，启动时不得放宽）

- 全部只读现有数据，**零新 storage 字段**；只加展示文案。
- 不动发放/兑换逻辑；不动 `workbench-bridge.js`。
- 红线同主包：无新货币/惩罚/排行/倍率/券/手动打卡按钮。

## 当前状态

- 状态：`blocked`（等 points-lighting S1 + B2 验收）
- 启动指令：见 task.md §启动程序
