# 方块探险 · 10 张卡

## 目标

这是一个独立的儿童横屏 Canvas 学习版：孩子通过采集和放置方块探索小岛，每两次成功动作触发一张汉字/英语混合学习卡。卡片出现后模拟冻结，答错会进入纠错提示，但始终可以回到探险；完成 10 张卡后才能打开最终传送门并结算胜利。

## 状态与反馈

`VoxelLearningCore` 将可模拟阶段限定为 `build` 与 `final-portal`。卡片经历 `card-falling → learning/correction → card-reward`，答错不会增加首次答对数，也不会重复计数卡片。最终门只从 `final-ready` 进入，因而不存在 0/10 提前胜利路径。

## 操作

键盘支持 A/D 或左右方向移动，空格/上方向键跳跃，Z 挖掘，X 放置；触屏提供左右、挖掘、放置、跳跃按钮。听音优先走 PreschoolSpeech，失败时回落浏览器 speechSynthesis。桥接只写学科掌握度与游玩记录，不操作 dailyPlans。
