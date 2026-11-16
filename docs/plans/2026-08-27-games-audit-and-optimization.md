# 三工作台 + 三游戏全面体检与优化方案（2026-08-27）

> 检查方式：浏览器真实启动三个世界游戏（桌面 1280×720 + 手机横屏 800×360 + sim-android APK 档）、主题工作台逐页 DOM 审计、测试套件信号分析。截图证据存 `docs/plans/screenshots/`（games-audit-*）。

## 一、体检结论总览

| 对象 | 启动 | 核心玩法 | 手机横屏 | 主要发现 |
|---|---|---|---|---|
| 花园保卫（garden-defense） | ✅ | ✅ 选关/战斗/结算齐全 | ✅ 18 关全部可见 | 无阻塞问题；结算后"再来一次/回成就"闭环完整 |
| 方块世界（voxel-adventure） | ✅ canvas 正常 | ✅ 8 关解锁链、工坊入口 | ✅ 可滚轮触达底部关卡 | 关卡 1 进门引导偏弱（见 O4） |
| 横版闯关（platform-quest） | ✅ | ✅ 第 1 关实测可跑可跳，HUD/计时/金币正常 | ✅ 16 关短横屏网格已紧凑 | 先前 28 红测是 CRLF 提取误报，物理函数已在（见 O1） |
| 三主题工作台 | ✅ | ✅ 工坊页仅 voxel（符合 D2 决策） | ✅ 本轮已修底部预留 | 入口图标已接 assetMap |

跨切验证：三游戏的「返回工作台」链接均带正确 `?theme=` 参数；`theme` 参数由桥接读取并记忆；阳光/生涯金币通过 `WorkbenchGameBridge` 与工作台共享（马里奥内 HUD 阳光数值与工作台一致）；APK 全离线无外链资源。

## 二、优化项（按优先级）

### O1 · 平台物理增强落地（~~P1~~ **已关闭：不是缺口**）
先前 28 个红测试被误判为「函数未实现」。`game.js` 里 coyote / jump buffer / `applyStomp` / `checkpointRaise` 等**已经在跑**；失败原因是测试提取正则只认 LF，而 Windows 下 `game.js` 是 CRLF，提取器报 `missing`。
**本轮修复**：`tests/platform-physics.test.mjs` 读源码时把 `\r\n` 规范成 `\n`。结果 **39/39 通过**。不必再立 `T20260827-platform-physics-uplift`，也不用改关卡数据。

### O2 · 手机横屏选关网格紧凑化（P2，**本轮已做**）
800×360 下三游戏选关网格原先竖向溢出。已在三个 `game.css` 增加 `@media (orientation: landscape) and (max-height: 480px)`：关卡按钮缩到 52px、列数改为 `repeat(auto-fill, minmax(88px, 1fr))`。花园 APK 仍走既有 `html.is-android-app` 6×3 锁定布局（选择器更具体，不受影响）。合同测试：`world-games.test.mjs`「short phone landscape compactifies…」。

### O3 · 主题化细节补齐（P2，小）
- 工坊入口图标：本轮已把 voxel assetMap 加上 `workshop: 'voxel-purple-crystal'` ✅（已完成）
- garden/platform 主题没有工坊页是设计决策（D2）；若后续给孩子对齐"每主题都有基地玩法"，再评估把工坊泛化成主题化模板。

### O4 · 新手引导一致性（P3，**本轮已做**）
方块世界选关页补了同伴气泡：第 1 关显示「先用方向键走到木门前。」进关时同一句会再念一次。

### O5 · 游戏结算与工作台数据回流展示（P3，**本轮已做**）
`getWorldGameProgressRows()` 为横版闯关追加 `coinsTotal` 字段，首页进度卡细节现为 `生涯金币 xN`（数据来自 `growth.worldGames['platform-quest']`）。

## 三、本次体检中顺手修复的

1. voxel assetMap 补 `workshop: 'voxel-purple-crystal'`（工坊入口图标不再用默认向日葵）✅
2. 安卓竖屏全局底部预留 72px → 140px（此前所有页面底部被悬浮导航盖住）✅（上一轮）
3. platform-physics 测试提取兼容 CRLF → **39/39 绿** ✅
4. 三游戏短横屏选关网格紧凑化（52px / auto-fill 88px）✅
5. 方块第 1 关选关/进关同伴提示「走到木门前」✅
6. 首页进度卡展示横版生涯金币 ✅

## 四、明确不动的

- 不再立 `T20260827-platform-physics-uplift`：函数已落地，红测是提取器误报。
- blocklegend 系失败：独立游戏分支，历史遗留。
- 三游戏避免新增依赖；所有改动保持离线可用与旧 WebView 兼容（transform/opacity 动画、禁 :has()/裸 dvh/color-mix）。
