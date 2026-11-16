# S3 — 首页三层化（主卡 + 大舞台 + 动画背景）

## 目标

安卓横屏首页从"任务泳道 + 伙伴条 + 出口"多段结构，改为布鲁伊式三层：上半一张"现在做什么"主卡，下半 110~130px 大舞台（角色 + 草地），背景太阳脉动 + 双速云。其余内容进第二横屏分页。

## 现状锚点

- 首页渲染：`prj/app.js` `renderPreschoolHomeOverview`（约 6958 行）产出：`workbench-overview-header`、`preschool-home-top`（hero + identity）、`preschool-home-battlefield`（任务泳道 + 错题回流 + foot）、`preschool-home-companion-rail`、`preschool-home-exits`（世界游戏）。
- 安卓横屏分页器：`setupAndroidLandscapePages`（约 1200 行）首页分支：`home-primary`（header+top）、`home-tasks`（battlefield 分块）、`home-world`（voxel-home）。
- 背景场景：`prj/preschool-workbench/index.html` `.child-game-scene`（sun/cloud/ground 元素，静态）；样式 `44-child-game-world.css` 49 行起。
- 现有 ≤480 首页压缩规则：43 号文件 `max-height: 480px` 段（home-primary/home-tasks）。

## 实施步骤

1. **渲染拆分**：`renderPreschoolHomeOverview` 增加参数化输出或新增 `renderPreschoolHomeStage()`：
   - 主卡：取第一条未完成任务（现有 `nextOpen` 逻辑），一张大卡（标题 + 课程图标 + 大按钮"去学习"，复用 `preschoolHomeLanePracticeButton` 的 action 输出）。已完成时显示"今天完成啦"+ 去奖励按钮。
   - 舞台：复用 `renderPreschoolCompanionRail` 的角色 markup 包进 `section.preschool-home-stage`（草地渐变底 + 角色右侧 + 气泡左侧，样式沿用 56 号场景条放大版）。
2. **分页器接线**：`setupAndroidLandscapePages` 首页分支改为：第 1 页 = header + 主卡 + 舞台（kind `home-primary`）；第 2 页 = 完整任务泳道（现有 battlefield）；第 3 页 = world/exits（维持）。竖屏与网页版渲染路径不变（stage 仅横屏分页器路径输出）。
3. **背景动画**（44 号文件，全尺寸生效但遵守 no-motion）：
   - 太阳：`scale(1→1.06)` 4s 循环。
   - 双云：`translateX(-20%→120vw)` 60s / 90s 两速，`opacity .8`。
   - 草地前景条：整条 `translateX(0→4px→0)` 6s 呼吸（不加 will-change）。
   - `body.preschool-no-motion` 下 `animation: none`。
4. **56 号文件**：≤480 时舞台高度 96~110px、主卡占剩余；高分横屏（53 号或新段）舞台 120~130px。
5. **测试**：`tests/preschool-home-visual-loop.test.mjs` 或新增断言：stage markup、分页器三页 kind、no-motion 降级、主卡按钮 action。
6. **缓存戳**：`app.js`、44 号、56 号追加 `&home-stage=v1`。

## 边界

- 不删任何现有首页功能：任务泳道、错题回流、世界入口全部保留（进第 2/3 页）。
- 竖屏与桌面网页首页不动（现有布局）。
- 主卡"去学习"直接复用现有 plan→course 打开逻辑（`open-plan-course`），不新写路由。
- 背景动画不得影响 `.child-game-scene` 之外层级；卡片层 z-index 高于舞台。

## 验收

- [x] 800×360 首页第 1 页为问候行 + 一张主卡 + 舞台，第 2 页保留完整任务列表；证据见 `S3-home-stage-garden-800x360.png`。
- [x] 1463×616 三主题舞台截图已归档：花园、方块、闯关均有高分横屏证据。
- [x] 云/太阳背景动画与 no-motion 静止降级由场景测试覆盖。
- [x] 主卡 action、三页分页和全部任务完成态由场景测试覆盖。
- [x] `home-stage=v1` 已追加；场景专测 24/24 通过，全仓例外见总验收手册。
