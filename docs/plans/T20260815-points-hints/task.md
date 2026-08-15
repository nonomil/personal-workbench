# task：还差一点提示 + 学习专区余额

- 级别：L1（超轻）
- 优先级：P1
- 状态：blocked（等 `T20260815-points-lighting` S1 与 `T20260815-B2-practice-review` 验收）

## 1. 目标

1. H1：三处"还差 X"提示（借鉴 Kids-Reward-Chart，MIT；只借机制不搬代码）：
   - 奖励商城每张卡：`还差 N 阳光`（已有进度条，补文字）
   - 徽章收集箱灰占位：进度文案（如 `再认 12 个字就点亮`），为 19 枚成就补 `progressText`
   - 连续奖励卡：`再点亮 2 天领取`
2. H2：学习专区 `#courses` 头部复用 `pixel-hud-sun` 显示阳光余额。

## 2. 只改

`prj/app.js`、`prj/preschool-achievements.js`、对应测试。

## 3. 不碰 / 不做

- 零新 storage 字段；不动发放/兑换/判定逻辑；不动 bridge。
- 不做"还差 X 就升级"之外的任何激励改造。
- H1 连续提示若 B3 S3 已落地则裁掉，复用其实现。

## 4. 启动程序（执行者第一件事，不是写代码）

1. 核对前置：points-lighting S1 验收记录、B2 验收记录、B3 S3 是否已做连击文案。
2. 参照 `docs/plans/T20260814-audit-remediation/` 范式补齐：`requirements-checklist.md`、`steps.md`（步骤 1 必须是只读侦查三处 UI 现状与 19 枚成就条件函数）、`acceptance.md`、`execution-check.md`、`test-plan.md`、`test-report.md`；把 `.meta.yaml` status 改为 `pending`。
3. 控制面给用户过目，确认后进入执行。

## 5. 验收底线

三处提示上线各有 UI 合同测试；学习专区余额可见；`npm test` 全绿；`git diff` 无 storage 字段新增。
