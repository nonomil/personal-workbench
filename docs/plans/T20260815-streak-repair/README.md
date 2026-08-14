# T20260815-streak-repair

> 综合改进规划 S1 第 3 条:**断连保护(每月 2 张补签卡)+ 回归欢迎**。
> 规划判断:连续打卡断档的挫败感是幼儿产品最大流失点。

## 需求一句话

昨天断档时,孩子(在家长陪同下)可以用本月余额内的补签卡把昨天接回连续记录;不送阳光、不重复发奖,只恢复连续性和解锁进度。

## 设计要点

- 字段进 `growth.streakRepair`(不新增 localStorage key):`cardsUsedByMonth{"YYYY-MM":n}` + `repairedDates[]`。
- 规则:只能补"昨天";本月最多 2 张;补的是打卡日期,**不**发放当日 +10 阳光(防双发);补签后连续天数、连续奖励解锁自动恢复(都从 `checkinDates` 派生)。
- 回归欢迎:断档日(zombieActive)成长页连续奖励卡出现"欢迎回来"补签入口,而非惩罚性文案。
- 引擎层纯函数 `PersonalWorkbenchChildGrowth.repairStreak(growth, date)`,可单测;UI 走 app.js `repair-streak` 动作 + commit 提交(同 water-plant 模式)。

## 本包文件

task / requirements-source / source-requirements-alignment / requirements-checklist / task-decomposition / steps / acceptance / execution-check / test-plan / test-report(执行后填)

## 范围外

- 不改 STREAK_REWARDS 数值与领取逻辑(规划 S2 统一定价)
- 不做多天连补(只补昨天,断多天视为新开始——幼儿口径从宽但不开无限补)
- 不做家长口令(补签卡本身即家长陪同动作;家长锁在方块工坊已有,工作台级锁待 S2)

## 当前状态

- 状态:`done`(2026-08-15 验收通过;正路径真机验收待自然断档日补验,见 test-report)
