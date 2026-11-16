# 验收手册（全切片通用）

## 测试基线

- 入包时记录的历史基线为 `886 pass / 71 fail`；本轮工作区全仓实测为 `992 tests / 901 pass / 85 fail / 6 skipped`。新增场景专测未失败，85 项全仓失败仍集中在既有 blocklegend、platform-physics、play-mods、voxel-craft 与历史缓存断言等 WIP 范围，未在本任务中扩大修改面。
- 新功能必须带测试（参照 `tests/preschool-*.test.mjs` 的源码文本断言或 VM 模式）。

本包门控证据：`node --test tests/preschool-scene-*.test.mjs` = **24/24 通过**；`node --check prj/app.js` = **exit 0**。

## 视觉验收流程（每片必做）

1. 启动本地服务：`node tmp/serve-prj.mjs`（仓库根目录）。
2. 浏览器打开 `http://127.0.0.1:8765/preschool-workbench/index.html?sim-android=1`（`sim-android` 参数模拟 APK 的安卓专属样式）。
3. 两个视口各截屏走查：
   - 手机横屏 800×360（重点）
   - 平板横屏 1463×616（MuMu 档，不得回归）
4. 三套主题各看一遍：URL 加 `?theme=garden-defense` / `voxel-adventure` / `platform-quest`。
5. 动效开关验证：设置页关闭"动效"后，舞台必须静止、功能不受影响。
6. 截图存入本包 `screenshots/`，文件名 `{切片}-{主题}-{视口}.png`。

## 性能验收

- 动画期间不得出现整页重排（DevTools Performance 抽查合成层数量）。
- 每屏同时动画元素 ≤ 8（DOM 数一遍，写进切片报告）。

## 缓存戳

- 改动 `prj/app.js` 或任一 CSS 后，必须更新 `prj/preschool-workbench/index.html` 里对应 `?v=` 版本串（追加增量段，不覆盖已有段，例：`&scene=v1`）。
- 注意：历史测试可能断言旧的版本串前缀；本包只追加场景段，不重写既有前缀。当前实际追加段为 `scene-fb=v1`、`scene-nav=v1`、`home-stage=v1`、`scene-walk=v1`、`reward-stage=v1`，矮屏卡墙回归另追加 `short-card-wall=v1`。

## 本轮执行记录与视觉证据

- 本地服务路径：`node tmp/serve-prj.mjs` → `http://127.0.0.1:8765`。
- 真实 800×360 复验：识字卡“会了”可命中，场景条出现 `is-cheer`、夸奖气泡和 `1/8 · 再认 7 个升级`；卡片行高约 108px、4 行可滚动、横向溢出 0。
- 1463×616 与 800×360 的分片截图均已存入 [`screenshots/`](./screenshots/)，包含 S1 反馈、S2 三主题导航、S3 首页舞台、S4 走动/静止、S5 奖励/喂养/收集架证据。
- 动效开关、三主题映射、主卡分页、奖励反馈、走动角色预算由 `tests/preschool-scene-*.test.mjs` 覆盖；每屏常驻动画预算按设计记录为 7，阳光雨/爱心为短时粒子。

## 逐片验收清单

- [x] S1 人物回应学习（见 `S1-answer-feedback/task.md`）
- [x] S2 人物即导航（见 `S2-character-nav/task.md`）
- [x] S3 首页三层化（见 `S3-home-stage/task.md`）
- [x] S4 走动动画（见 `S4-walk-motion/task.md`）
- [x] S5 奖励舞台化（见 `S5-reward-stage/task.md`）

> 说明：上面的逐片验收项指本包实现、场景专测和视觉证据；全仓 85 项历史/WIP 失败保留为仓库级例外，不能表述为全仓全绿。
