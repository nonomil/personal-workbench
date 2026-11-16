# 幼儿学习卡片墙实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 将幼儿工作台的“学习”入口首屏改成可直接选择的课程卡片墙，不再让一张“今日学习”大卡占满横屏 APK 的第一屏。

**架构：** 保留现有课程目录、卡片渲染、学习进度和点击路由；只调整课程大厅的展示顺序，让课程卡片墙成为首屏，今日任务与动画资料作为后续横向页面。网页和竖屏保留自然纵向流，但也把卡片墙放到今日大卡之前。复用现有主题插画与 2×2 横屏卡片布局，不新增依赖或业务状态。

**技术栈：** Vanilla JavaScript、现有 preschool CSS 层、Node.js 内置测试、Chrome CDP/MuMu WebView 验证。

---

## 视觉确认卡

### 参考与基线

- 参考截图：`C:/Users/<local-user>/AppData/Local/Temp/codex-clipboard-3c726edf-fc45-4987-bde8-70c64a67797e.png`，证据是当前横屏学习页的比例、侧栏、植物大战僵尸场景和顶部状态栏；问题是首屏只有一张大“朗读一首古诗”卡。
- 基线截图：`G:/StudyCode/个人工作台/_tmp_mobile_preview/workbench-android-courses-1-1463x640-mumu-css.png`。
- 目标视口：MuMu WebView `1463×640 CSS px`；回归视口 `1080×608`、`1440×810`；网页竖屏 `390×844`。
- 目标路由：`/preschool-workbench/index.html?theme=garden-defense#courses`。

### 允许修改

- `prj/app.js`：课程大厅 DOM 顺序、Android 横屏分页顺序。
- `prj/css/preschool/53-high-resolution-landscape.css`：仅在现有规则不足以容纳首屏卡片墙时补充视觉规则。
- `tests/preschool-learning-card-wall.test.mjs`、`scripts/verify-workbench-android-landscape.mjs`：新增和更新自动验收。
- 本计划及视觉循环记录。

### 明确不修改

- 课程题库、学习进度、阳光奖励、语音实现、游戏规则、数据模型和其他工作台页面。
- 不新增第三方图片、依赖或版权角色素材。

### 接受信号与停止规则

- MuMu 横屏首屏的第一张 `.preschool-native-page` 必须是 `courses-wall`，可见 3×2 课程卡片墙；点击卡片仍进入原课程。
- `1080×608`、`1440×810`、`1463×640` 无纵向溢出，卡片墙通过横向分页承载剩余课程，触控按钮不小于 44 CSS px。
- 网页/竖屏首屏先看到卡片墙，并保留纵向滚动访问今日任务与资料。
- 若连续两轮视觉调整没有改善“首屏课程密度/可发现性”，停止继续扩大范围并报告证据。

---

### 任务 1：为首屏卡片墙写失败测试

**文件：**
- 创建：`tests/preschool-learning-card-wall.test.mjs`
- 修改：`scripts/verify-workbench-android-landscape.mjs`

**步骤：**

1. 写静态合同，要求课程大厅的卡片墙在今日大卡之前渲染，Android 分页分支先添加 `courses-wall` 再添加 `courses-today`。
2. 更新 CDP 验证，要求横屏 `#courses` 的第一页 `data-native-kind` 为 `courses-wall`。
3. 运行专项测试，确认在尚未改代码时失败。

### 任务 2：调整课程大厅顺序

**文件：**
- 修改：`prj/app.js:1250-1280`、`prj/app.js:6308-6313`

**步骤：**

1. 在普通课程大厅 DOM 中先输出课程卡片墙，再输出今日学习卡和资料卡墙。
2. 在 Android 横屏分页中先把课程墙加入：宽横屏按 6 张一页，窄横屏按 4 张一页；再加入今日学习页和动画资料页。
3. 没有课程墙时保留今日学习的安全回退。
4. 运行新增静态测试和现有课程/布局专项测试。

### 任务 3：按 MuMu 尺寸验证视觉与交互

**文件：**
- 生成：`_tmp_mobile_preview/` 下的更新截图
- 参考：`docs/plans/2026-08-25-preschool-learning-card-wall.md`

**步骤：**

1. 运行 `node scripts/verify-workbench-android-landscape.mjs`，检查三种横屏与网页竖屏。
2. 检查首屏 2×2 卡片墙、左右分页按钮、课程卡点击路由和无纵向滚动。
3. 若布局不满屏或文字过小，只在 `53-high-resolution-landscape.css` 做一次局部调整，再重新截图。
4. 运行专项测试并记录完整测试集中的既有失败，不修改无关模块。

### 任务 4：构建与交付验证

**文件：**
- 产物：`android/app/build/outputs/apk/debug/app-debug.apk`

**步骤：**

1. 执行 `npm run android:sync`。
2. 执行 `gradlew.bat assembleDebug`。
3. 安装到 MuMu，重新打开课程大厅，读取 WebView 视口和页面溢出值。
4. 交付 APK 路径、实际尺寸证据、测试结果和 release 签名缺口。
