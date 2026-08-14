# T20260815-B2 - 任务定义卡

> 模式：L2 轻量（两个功能面，串行，各自可独立验收）
> 执行策略：CLOSED 串行。S1 → S2。不开 fleet。

## 0. 领域画像

- 主画像：软件开发（参考 `docs/plans/templates/profiles/software-dev.md`）
- 次画像：学习产品逻辑（复习节奏、幼儿可用性）

## 1. Loop 类型判断

- [x] CLOSED 单 Agent：需求来自已定 P0，验证有 node 测试 + 浏览器证据
- [ ] CLOSED Fleet
- [ ] OPEN 转 CLOSED

## 2. 动机自检

- [x] 加速已理解的执行：`dailyPlans.practiceLessonId` 机制、`mistakes` 记录与错题页均已存在，本包是补通道不是造系统
- [x] 不是用流程回避理解：唯一未知（六项中具体哪几项未接）由 S1 步骤 1 侦查回答

## 3. 目标与背景

- 一句话目标：孩子从今日任务页出发，六项都能一键进练习；错过的题按 1/3/7 天自动回来复习。
- 背景：综合改进规划 P0；现状见 `2026-08-15-学习内容体系优化/01-现状盘点.md` 三节差距清单第 6 条。
- 历史约束：一份阳光账本；奖励走现有 `awardSunlight`（去重 + 日上限），**本包不新增奖励数值**；Vanilla JS；storage key `petbank_huchuliang_preschool_workbench_state_v1` 不换。
- 兼容要求：已有 `dailyPlans`、`mistakes`、`courseProgress` 字段结构保持可读；老快照升级用现有 migrate 通道。

## 4. 为什么是 L2 而不是 L1

跨 app.js 渲染、config 任务定义、storage 派生逻辑三层，且 S2 涉及"按天回流"的时间逻辑（要用假时钟测试）；但两个子任务串行独立可验，总量 1–2 人日，不需要 L3。

## 5. 子任务

见 `task-decomposition.md`。当前只执行 **S1 六项任务练习入口补全**。

## 6. 边界

**只改（S1 预判，以侦查修订）：**
- `prj/app.js`（今日任务卡渲染：补"去练习"跳转）
- `prj/config.js`（任务 ↔ 练习 lesson/mode 映射补缺）
- `tests/preschool-daily-plan.test.mjs`（映射合同）

**只改（S2 预判）：**
- `prj/storage.js` 或 `prj/child-courses.js`（复习队列派生：`mistakes` + 日期 → 今日应复习清单）
- `prj/app.js`（今日卡"复习"入口 + 练对出队）
- `tests/preschool-lesson-mistakes.test.mjs`（1/3/7 规则，假时钟）
- `docs/data-model.md`（若新增字段）

**不碰：** `workbench-bridge.js`、三世界游戏、奖励数值、伙伴/宠物、卡片墙布局。

**明确不做（属 B3 包）：** 必做/冒险两档、家长确认兑换、英语日定量、连击徽记。

**禁止顺手优化：** 重构 dailyPlans 结构、给练习弹窗换 UI、调整课程种子数据。

## 7. 验收（整体）

- [ ] S1：六项任务在浏览器逐项点"去练习"→ 完成 → 回写打卡，合同测试绿
- [ ] S2：假时钟测试证明第 1/3/7 天回流、练对出队、不重复入队；真机走一轮
- [ ] `npm test` 全绿；storage 变更已同步 data-model

## 8. 升级触发

- 若侦查发现"运动/专注"根本没有可复用的练习 mode（要新造引擎）→ 停，缩围或开 change-request；本包只接通道不造新引擎
- 若 1/3/7 回流需要改 `mistakes` 既有字段含义 → 停，走 `docs/00-总控/变更与同步规则.md` 评审
- 若今日任务实际不是六项（B1 侦查结论不同）→ 以实数为准改本包表述，不硬凑六
