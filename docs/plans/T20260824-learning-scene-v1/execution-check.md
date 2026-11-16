# 执行检查与决策记录

## 2026-08-24 · 初始方案

- 状态：`planned`
- 只建立计划，未实施皮肤。

## 2026-08-25 · 范围收敛

- 状态：`plan-refined`
- 依据代码核查把任务从剧情/素材系统收敛为皮肤级 5 任务。
- 已确认复用 `learning-companion-sway`、手写 Canvas、`pvz-garden-lawn-bg.webp` 和现有 reduced-motion。
- 运行时新增图片：`0 KiB`；不新增 manifest、controller、storage 或网络接口。
- 保护约束：当前工作树有 50 多个用户既有改动，43–50 CSS 层包含未跟踪文件；不执行整体回退、清理、stash 或整文件提交。

## 2026-08-25 · 皮肤级 v1 落地

- 状态：`implemented-and-validated`
- 按 5 个任务实施；未新增剧情状态机、对白、控制器、素材生成管线、manifest、storage、TTS 或 APK 专用逻辑。
- 修正 `prj/preschool-workbench/index.html` 的 app.js 查询串：保留既有 `home-alpha-v2` 与 `learning-companion=writing-v1` 锚点，并追加 `scene-skin=20260825-learning-scene-v1`。
- 定向回归：识字场景、伙伴手写、移动布局、横屏布局共 `22/22` 通过；`node --check prj/app.js` 通过；`npm run release:verify` 通过。
- 全量回归：`901 tests / 814 passed / 81 failed / 6 skipped`。相对 895 项基线新增的 6 项全部为本次定向测试；范围外失败仍集中在已有 BlockLegend、平台游戏和旧版本查询串契约，不归因于 v1。

## 2026-08-25 · 场景合成 v2

- 状态：`composition-validated`
- 新增 `52-learning-scene-composition-v2.css`，继续复用 `learning-scene-v1` 开关和已有素材；51 层保留为直接回退层。
- 视觉结构从“三个大容器”调整为“一幅花园舞台 + 上层学习浮层 + 下方角色”：手写外层和卡墙外层无边框/无阴影，伙伴外壳透明，三个角色横跨底部并放大到约 `88×100`。
- 未修改 `app.js`、学习数据、Canvas 事件、语音、storage、API、Android 四行布局或其他主题。
- 视觉循环记录：[visual-loop-v2.md](./visual-loop-v2.md)；确认卡：[visual-loop-v2-confirmation.md](./visual-loop-v2-confirmation.md)。
- 全量回归：`902 tests / 815 passed / 81 failed / 6 skipped`；相对 v1 只增加 1 个通过的 v2 机械断言，失败数未增加。

## 基线记录

此前全量基线：

```text
895 tests
808 passed
81 failed
6 skipped
exit code 1
```

这不是本次 v1 的成功/失败结论。实施前还需刷新以下定向命令并记录完整输出：

```powershell
node --test tests/preschool-learning-companion-writing.test.mjs
node --check prj/app.js
npm run release:verify
```

## 阶段状态

| 阶段 | 目标 | 状态 | 证据 |
| --- | --- | --- | --- |
| P0 | 基线与脏工作树保护 | completed | 保留用户脏工作树；未执行 reset / clean / checkout / stash |
| P1 | URL 开关与识字根 class | completed | `tests/preschool-learning-scene-v1.test.mjs` 通过 |
| P2 | 51/52 CSS 皮肤与 index 引用 | completed | 52 层位于 51 层之后，透明场景合成规则通过 |
| P3 | 定向机械测试 | completed | v2 定向套件 `23/23`，语法、发布校验和 diff check 通过 |
| P4 | Codex 浏览器与稳定回归 | completed | v2 已检查 1280×720、915×412、无开关回退 |

## 浏览器证据

### Run 01 · 2026-08-25

- 页面 URL：`http://127.0.0.1:4174/preschool-workbench/index.html?theme=garden-defense&learning-scene=episode-v1#courses?course=preschool-literacy`
- 1280×720：根节点存在 `learning-scene-v1`，约 `958×566`；手写区约 `590×338`，Canvas `186×186`；右侧卡墙约 `302×267`；底部伙伴带约 `850×78`，伙伴在学习内容下方。
- 背景：根节点实际使用 `pvz-garden-lawn-bg.webp`，花园背景可见，手写面板、字卡墙和伙伴带层级清晰。
- 伙伴：图像节点读取到 `learning-companion-sway`、`4.1s`、错峰延迟 `0s / -1.35s / -2.7s`；继续继承 50 层动效与 reduced-motion 规则。
- 手写：通过真实指针拖拽后状态为“已经写了 1 笔，继续完成它。”；点击“退一笔”恢复初始提示；点击“写好了”显示“写好了！再写一遍也可以。”。
- 稳定回退：去掉 `learning-scene=episode-v1` 后根节点无 `learning-scene-v1`，但 Canvas、3 个伙伴和退一笔/重写按钮仍存在。
- 915×412：根节点约 `609×940`，手写区约 `288×720`，伙伴带约 `585×78`；`scrollWidth === clientWidth === 900`，无横向溢出，未套用桌面增强规则。
- overflow X/Y：桌面与窄屏横向均为 `0`；桌面纵向滚动来自工作台侧栏内容，不是场景横向溢出。
- Console error：`0`（浏览器日志为空）。
- 本轮结论：先修正 app.js 查询串兼容性，随后继续通过；保留为 pilot-only。

### Run 02 · 2026-08-25 · 场景合成 v2

- 1280×720：根节点仍为 `958×566`；手写外层约 `553×349`、卡墙外层约 `332×349`，两者均为透明/无边框/无阴影；伙伴带约 `893×108`。
- 角色：三个角色约 `88×100`，位置横跨场景底部，外层不再是白色 footer 卡。
- 背景与层级：花园图贯穿根节点；标题、等级、手写说明融入背景；手写面和内部字卡保留必要的可读底色。
- 915×412：伙伴图像回到既有 `46×52` 规则，横向 `scrollWidth === clientWidth === 900`；52 桌面层未介入。
- 手写交互：真实指针拖拽后显示“已经写了 1 笔”，退一笔恢复提示，写好了显示完成提示；浏览器日志为空。
- 无开关回退：无 `learning-scene-v1`，Canvas 与 3 个伙伴仍存在。
- 本轮结论：Top 3 视觉差异均改善，停止继续叠加 CSS，保留为 pilot-only。

### Run 03 · 2026-08-25 · 默认视口边界修正

- 发现：Codex 浏览器默认视口为 `1012×864`，旧的 `min-width:1024px` 桌面门槛使 52 层未介入；刷新后实际仍看到 v1 的大面板。
- 修正：52 层改为 `@media (min-width:900px) and (min-height:600px)`，并给场景根节点增加 `height:min(720px, calc(100dvh - 158px))`；仅在 `html:not(.is-android-app)` 下生效。
- 缓存：`prj/preschool-workbench/index.html` 将 52 层资源串更新为 `scene-composition-v2c`，确保本地工作台与 WebView 读取新 CSS。
- 默认窗口实测：根节点约 `740×706`；手写区约 `422×489`；卡墙外层约 `253×489`；伙伴带约 `684×108`；伙伴图像约 `88×100`，已在学习内容下方可见。
- 场景样式：手写外层、卡墙外层、伙伴外层均为透明/无边框/无阴影；花园背景连续贯穿根节点。
- 横向溢出：`documentScrollWidth === bodyScrollWidth === 997`，视口宽 `1012`，横向溢出 `0`；纵向滚动仍来自工作台侧栏内容，不是场景横向溢出。
- 定向回归：场景、伙伴手写、移动、横屏共 `23/23 passed`；`node --check prj/app.js`、`npm run release:verify`、`git diff --check` 均通过。
- 本轮结论：默认 Codex 浏览器也满足“连续花园背景 + 上层学习内容 + 下方学习伙伴”，继续保留为 pilot-only。

## 最终字段（实施后填写）

- 决策：`pilot-only`
- 开关隔离：`pass`
- 稳定学习功能：`pass`
- 视觉浏览器检查：`pass`
- Android 护栏：`pass`（静态 Android 横屏护栏与移动/横屏测试通过；桌面视觉规则明确排除 `.is-android-app`）
- 新增运行时图片：`0 KiB`
- storage 改变：`否`
- 外部网络依赖：`否`
- 定向测试：v2 场景测试 `7/7 passed`；连同伙伴、移动和横屏测试共 `23/23 passed`
- 发布校验：`npm run release:verify` passed；`node --check prj/app.js` passed
- 全量测试：`902 / 815 passed / 81 failed / 6 skipped`；81 项为工作区已有范围外失败，主要是 BlockLegend、平台游戏和旧版本缓存串契约
- 证据索引：`tests/preschool-learning-scene-v1.test.mjs`、`tests/preschool-learning-companion-writing.test.mjs`、`tests/preschool-mobile-layout.test.mjs`、`tests/preschool-landscape-layout.test.mjs`、`prj/css/preschool/52-learning-scene-composition-v2.css`、`docs/plans/T20260824-learning-scene-v1/visual-loop-v2.md`
