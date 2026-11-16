# 2026-08-24 幼儿工作台侧栏卡片墙优化方案与验收

## 目标

针对 Android 横屏截图中左侧快捷导航“像一条深色竖条、层级弱、素材风格不统一”的问题，参考工作台截图中的浅色导航栏、独立彩色入口卡、品牌头和奖励闭环，重做幼儿工作台侧栏。

## 视觉决策

- 采用浅蓝—浅绿的工作台底，不再使用整条深绿背景承载五个入口。
- 五个快捷入口保持原有路由：`首页`、`学习`、`花园保卫战`、`奖励`、`更多`。
- 每个入口是独立卡片：左侧原生主题资产、右侧中文标签、主题色边框、浅阴影和清晰激活态。
- 品牌区改为真实 DOM 卡片，避免用伪元素叠加文字；主题切换时品牌图随主题资产映射变化。
- 完整抽屉导航复用同一卡片语言，课程专区使用独立的紫色分组卡。
- 保留 44px 最小触控高度、8px 以上间距、`focus-visible` 和 reduced-motion 规则。

## 素材决策

本轮不再把此前的软萌 WebP 作为主视觉。它们虽然可用，但质感过幼，和参考工作台及项目自带的三套世界资产不一致。

- 花园：现有 PVZ 植物、阳光、宝箱资产。
- 方块：现有 voxel crystal、方块、箱子等资产。
- 闯关：现有 platform coin、flag、explorer 等资产。

本轮没有调用新的在线 GPT 生图：内置 imagegen 不在当前可调用工具中，Cliprox 环境变量也未配置；因此不把新图生成结果写入交付说明。

## 实施文件

- `prj/preschool-workbench/index.html`：接入 `46-sidebar-ux.css`，增加移动导航品牌 DOM 卡片。
- `prj/css/preschool/46-sidebar-ux.css`：新增桌面抽屉与 Android 横屏卡片墙最终视觉层，修复旧 `::before` 品牌残留。
- `tests/preschool-sidebar-ux.test.mjs`：新增侧栏结构、触控、可访问性、路由和原生主题资产契约。

## 验收记录

- 侧栏定向测试、移动布局、花园横屏、游戏世界和工作台刷新回归：`76/76` 通过。
- `npm run android:sync`：通过。
- `android/gradlew.bat assembleDebug`：`BUILD SUCCESSFUL`。
- Debug APK 已安装到 `127.0.0.1:16384`，包名 `com.nonomil.personalworkbench`。
- APK 截图证据：
  - `docs/plans/T20260824-sidebar-ux-final.png`
  - `docs/plans/T20260824-sidebar-ux-learning-v2.png`
  - `docs/plans/T20260824-sidebar-ux-more.png`
- 浏览器已验证花园、方块、闯关三套主题均保留各自原生资产；临时横屏 viewport 已恢复默认。

## 后续边界

本次只改导航视觉层和品牌 DOM，不改课程、语音、积分、任务、路由及主题资产映射。若后续要再生图，应先锁定三套主题的 UI 资产规范和参考图，再生成一整套同风格图标状态，避免零散软萌素材重新混入。
