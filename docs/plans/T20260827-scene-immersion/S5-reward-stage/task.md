# S5 — 奖励舞台化（收集品上架子 + 宠物喂养主场）

## 目标

奖励页从"兑换列表"升级为"舞台主场"：底部舞台放大为主视觉，宠物/植物喂养发生在这里，收集品像工坊参考的出生点广场一样"摆在架子上"，收集进度空间化可见。

## 现状锚点

- 奖励渲染：`prj/app.js` `renderPreschoolRewards`（约 6629 行）：`preschool-reward-progress`（下一站卡）+ `preschool-reward-tier-list`（分层兑换）+ `renderPreschoolCollection`（收集墙）。
- 喂养/宠物：`getChildGrowth()`（`growth.plant / unicorn / plantWaterCount` 等）、`data-action="water-plant"`。
- 安卓横屏紧凑规则：56 号文件"奖励页紧凑化"段（下一站小卡、单列滚动分层）。
- 分页器：奖励页在 `setupAndroidLandscapePages` 走通用 else 分支（每段一页：progress / tier-list / collection）。

## 实施步骤

1. **页面重排**（仅安卓横屏分页路径）：
   - 第 1 页：`preschool-reward-progress`（保持）+ **新舞台** `section.preschool-reward-stage`（120~140px）：草地 + 当前宠物/植物大图（`growth.unicorn` 造型 / `growth.plant` 阶段资产）+ "喂食/浇水"大按钮（复用 `water-plant` action）+ 气泡（宠物名 + 等级）。
   - 第 2 页：分层兑换（现状不动）。
   - 第 3 页：收集墙改"展示架"：`.preschool-collection-card.is-unlocked` 以实物小图 + 名字摆成两层架子（架子 = 两条木色横条背景）；`is-locked` 显示灰色剪影 + "？"。
2. **喂养反馈**：浇水/喂食成功（现有 commit 成功路径）后舞台宠物跳一下 + 爱心粒子 ×3（transform/opacity，一次性 800ms）。
3. **新收集解锁**：`claim-reward` 成功后，第 3 页对应卡位播放"点亮"动画（`scale(0.6→1)` + 亮度闪 400ms）。
4. **CSS**：舞台样式沿用 56 号场景条语言（草地渐变 + 圆角 + 主题边框）；≤480 时舞台 96px、按钮 44px。收集架木色横条用静态背景，不动画。
5. **测试**：新增/扩展测试断言 stage markup、浇水按钮 action、收集卡 is-unlocked/is-locked 输出。
6. **缓存戳**：`app.js`、56 号追加 `&reward-stage=v1`。

## 边界

- 兑换/收集数据与确认流程（`requestPendingReward` 家长确认）完全不动。
- 竖屏与网页版奖励页维持现状（stage 仅安卓横屏输出）。
- 收集架不做拖拽/摆放交互（只展示），位置由解锁顺序决定。
- 粒子 ≤ 3（喂养爱心）；舞台常驻动画只有宠物待机呼吸 1 个。

## 验收

- [x] 800×360 奖励页第 1 页含下一站卡 + 可浇水舞台，第 3 页展示两层收集架；已解锁为实物、未解锁为剪影，证据见 `S5-reward-stage-garden-800x360.png` / `S5-reward-collection-garden-800x360.png`。
- [x] 兑换成功后新收集品按解锁状态在架上点亮；bounded pulse 与刷新路径由场景测试覆盖。
- [x] 1463×616 奖励、喂养、浇水及三主题证据已归档；no-motion 下舞台静止但浇水 action 仍生效。
- [x] `reward-stage=v1` 已追加；场景专测 24/24 通过，全仓 WIP 例外见总验收手册。
