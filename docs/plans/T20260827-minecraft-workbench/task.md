# 任务：我的世界工坊页

## 目标

voxel 主题下新增"方块工坊"页（五 sub-tab：作业/宠物/战斗/商店/游戏），把参考应用的打卡积分闭环——做作业赚阳光、喂宠物升饱食度、怪物攻城威胁家园耐久、买装备强化驱赶、消消乐即作业——完整落地，且对其他主题与既有学习逻辑零影响。

## 输入

- 方案：`docs/plans/2026-08-27-minecraft-workbench-design.md`（D1/D2/D3 决策 + §4 数值表 + §5 视觉规范）
- 现有引擎：任务清单（dailyPlans/toggle-plan）、growth 快照（hunger/unicorn/zombieActive）、记忆配对（play-memory）、阳光记账（awardSunlight 防重）
- 视觉：26/27/31 号 CSS 的 voxel token 与像素风

## 产出（跨切片汇总）

1. 新 page `workshop`：路由、侧边栏入口（仅 voxel 主题）、五 sub-tab 骨架（M0）
2. 宠物工坊：hunger UI + 投喂三档 + 场景（M1）
3. 家园耐久 + 攻城战斗 + 冒险日志（M2）
4. 装备商店：武器/护甲/修家园（M3）
5. 消消乐独立开局 + 每日打卡（M4）
6. 全清结算仪式（M5）
7. 皮肤打磨与双端验收（M6）
8. 每片：测试文件 + 基线不退 + 缓存戳 + 截图证据（各子 task.md 列明）

## 边界

- 详见 README 红线 1~7；补充：
- 不做参考的"10 券修家园"（本项目无券体系），修家园仅 25 阳光一档
- 不做卖出/退款；装备一旦购买永久拥有，切换装备免费
- 消消乐奖励每日一次（`voxel-memory-game:${date}`）；全清 bonus 每日一次（`voxel-all-done:${date}`）
- 工坊页在网页版（非 is-android-app）同样可用（这是主题功能不是 APK 专属），但布局需双档适配

## 完成定义

`acceptance.md` 全勾 + M0~M6 全部 landed + `npm test` 886/71 基线不退 + 主题隔离走查通过 + 截图证据齐全。
