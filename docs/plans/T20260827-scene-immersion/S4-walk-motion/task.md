# S4 — 走动动画（零素材版）

## 目标

舞台角色在草地范围内缓慢走动（左右往返 + 朝向翻转 + 轻微颠簸），效果接近布鲁伊参考的"人物在场景里活动"，不新增任何美术素材。

## 现状锚点

- 角色 DOM：`.preschool-learning-companion`（S2/S3 产出的舞台内），每个含 `.preschool-learning-companion-art > img.preschool-generated-art`。
- 样式：56 号（≤480 场景条）与 S3 的舞台段。

## 实施步骤

1. **CSS 走动**：给舞台内角色交替加 `is-walker` class（JS：第 1、3 角色走，第 2 角色原地呼吸，避免全员乱走）：
   ```css
   .preschool-learning-companion.is-walker { animation: stage-walk 18s ease-in-out infinite alternate; }
   .preschool-learning-companion.is-walker .preschool-learning-companion-art { animation: stage-bob .6s ease-in-out infinite alternate; }
   @keyframes stage-walk { from { transform: translateX(0); } to { transform: translateX(min(18vw, 140px)); } }
   @keyframes stage-bob { from { transform: translateY(0); } to { transform: translateY(-3px); } }
   ```
   朝向：`alternate` 反向时角色需要镜像 —— 用第二个动画同步 `scaleX(-1)` 不可靠，改为 JS 在 `animationiteration` 事件（或 4s 定时器）切 `is-flipped` class（`transform: scaleX(-1)` 作用于 art 的 img）。**注意**：外层已用 translateX 动画，镜像必须放内层 img，避免 transform 覆盖。
2. **错峰**：两个 walker 的 `animation-delay` 分别 0s / 2.5s，`stage-bob` 时长略不同（0.6s / 0.72s）避免机械感。
3. **点击互斥**：S2 的 `is-clicked` 跳起时暂停走动（`animation-play-state: paused`），落地后恢复。
4. **no-motion**：`body.preschool-no-motion` 下两动画 `none`，镜像 class 不再切换。
5. **预算核对**：舞台同时动画 = 2 walker(位移动画) + 2 bob + 背景云 2 + 太阳 1 = 7 ≤ 8。S1 阳光雨触发时 walker 不停（一次性粒子叠加可接受，仍 ≤ 6 粒子）。
6. **缓存戳**：56 号 + `app.js`（若加 class 逻辑）追加 `&scene-walk=v1`。

## 边界

- 零新素材；序列帧版（`-walk-2f` 贴图）明确不做，留给后续独立任务包。
- 走动不得超出舞台容器（容器 `overflow: hidden`）。
- 学习内容页场景条（48px 矮版）角色**不走动**，只保留呼吸/点头（空间太小），走动仅在首页大舞台生效。

## 验收

- [x] 800×360 首页舞台两个角色缓慢往返、朝向翻转并轻微颠簸，第三个角色原地呼吸；证据见 `S4-walk-motion-garden-800x360.png`。
- [x] 走动范围受舞台 `overflow: hidden` 约束，点击角色会暂停走动并执行 S2 跳起逻辑。
- [x] no-motion 完全静止；`scene-walk=v1` 已追加；场景专测覆盖动效偏好。
- [x] 1463×616 花园、方块、闯关证据已归档；常驻动画预算记录为 7 ≤ 8，且零新增素材。
