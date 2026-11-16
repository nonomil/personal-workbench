# 跃跃闯关 · 10 张卡

## 产品目标

这是一个独立儿童横版横屏 Canvas 学习版。孩子跑、跳、躲开或踩过敌人，经过新的彩色检查点后触发一张汉字/英语混合学习卡。每个检查点只记录一次；卡片出现、落地和答题期间玩家、敌人、计时全部冻结。

## 状态与学习闭环

`PlatformLearningCore` 的状态是 `ready → run → card-falling → learning/correction → card-reward → resume-countdown → run`。答错进入纠错，不会增加完成卡数，也不会锁死；纠错完成后仍能回到跑酷。只有 10 张卡完成后才进入 `flag-ready`，触碰最终旗进入 `final-flag`，随后才允许 `settle(true)`，因此不存在 0/10 提前胜利。

## 操作与记录

键盘支持 A/D 或左右方向键、空格/上方向键跳跃、Shift 奔跑；触屏提供左右、跳跃、奔跑按钮。听音优先调用 PreschoolSpeech，失败回退到浏览器语音。游戏只通过 WorkbenchGameBridge 记录 literacy/word 掌握度、游玩记录和本游戏进度，不读取或修改 dailyPlans。
