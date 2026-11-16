# 方案审查与范围收敛

## 1. 核查得到的现状

这次不是从零做一个剧情游戏。代码核查确认：

- `prj/app.js` 已有 `renderPreschoolLiteracyCardWall()` 和 `renderLiteracyHandwritingPad()`；
- 识字 Canvas、听一听、看提示、会了/还不会和课程状态已经连通；
- `50-learning-companion-writing.css` 已有 `learning-companion-sway`，时长约 4.1 秒，并且三个伙伴错峰；
- `50-learning-companion-writing.css` 已有 `preschool-no-motion` 与 `prefers-reduced-motion`；
- `44-child-game-world.css` 已定义 `--child-scene-image`，花园背景 `pvz-garden-lawn-bg.webp` 已存在并被首页使用；
- 当前工作树有大量用户既有修改，43–50 CSS 层目前还包括未跟踪文件。

因此，之前文档中的“新增剧情控制器、对白系统、素材 manifest、生图管线、新验证脚本和 Android 新布局”都不是本次必要条件。

## 2. 核心决策

| 观察 | 决策 |
| --- | --- |
| 页面显得像大块面板 | 用已有背景做根节点皮肤，降低桌面学习板的视觉重量，并把字卡保持为紧凑队列 |
| 下方伙伴更有陪伴感 | 复用已有 companion rail 和三组已有角色，不改 HTML、不重新生成角色 |
| 动画已经存在 | 51 层只调布局/层级/不透明度，不重新写角色动画 |
| 手写已经完整 | 不接管 Canvas、不复制按钮、不增加事件系统 |
| 现有工作树很脏 | 不做 broad checkout/reset/stash；只检查和修改本次 4 个文件目标 |
| 多主题需要安全 | 开关严格限制花园识字 today；方块、闯关、英语、拼音、古诗不挂载 |

## 3. 体验目标

用户看到的是一张学习舞台，而不是一个新任务列表：背景铺开在后面，目标字与手写区占中间焦点，字卡墙形成右侧小卡片队列，学习伙伴沿底部陪伴。视觉变化不应改变学习节奏：首帧可操作、点击听仍用现有语音、写一笔仍进入既有手写流程。

## 4. 不做的事情

- 不做 `arrive/notice/practice/celebrate` 状态机；
- 不插入对白、路牌、HUD 或额外 DOM；
- 不新增图片、manifest、素材目录和网络请求；
- 不修改题库、掌握度、奖励、storage 或 Android 原生桥；
- 不把植物大战僵尸、我的世界、马里奥的角色或品牌美术直接复制进学习页。

## 5. 停止线

出现以下任一情况就关闭开关并停止扩大范围：

- 无开关页面出现 `learning-scene-v1` 或布局变化；
- Canvas/按钮/语音/字卡状态改变；
- Android 横屏出现溢出；
- 角色或背景出现整体半透明、矩形底或遮挡目标字；
- 机械测试不能证明 CSS 只在开关根节点下生效。

