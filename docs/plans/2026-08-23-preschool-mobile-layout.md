# 幼儿工作台移动端布局实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 让幼儿工作台 APK 在手机和平板上采用真正的移动端布局，消除平板左侧空白、横向滚动和底部导航遮挡内容的问题。

**架构：** 保留现有页面、课程和主题数据，只在现有 CSS manifest 最后增加一层移动端壳层覆盖。1024px 以下使用抽屉式侧栏；手机和平板竖屏使用固定底部快捷导航；内容区使用安全区、`dvh` 和单列/双列响应式网格，桌面布局不变。

**技术栈：** 原生 HTML/CSS、Node 内置测试运行器、Capacitor 静态资源同步。

---

### 任务 1：建立移动端布局契约测试

**文件：**
- 创建：`tests/preschool-mobile-layout.test.mjs`

**步骤 1：编写失败测试**

断言入口声明 `viewport-fit=cover`，CSS manifest 加载最终移动端层，并覆盖 1024px 平板断点、`100dvh`、横向溢出和底部安全区。

**步骤 2：运行测试验证失败**

运行：`node --test tests/preschool-mobile-layout.test.mjs`

预期：失败，因为最终移动端 CSS 层和 viewport 安全区声明尚不存在。

### 任务 2：实现手机/平板应用壳层

**文件：**
- 创建：`prj/css/preschool/43-mobile-app-shell.css`
- 修改：`prj/css/preschool-workbench.css`
- 修改：`prj/preschool-workbench/index.html`

**步骤 1：实现 1024px 以下的抽屉导航**

- 取消 `.main-content` 的桌面 `margin-left` 和固定宽度。
- 侧栏变为可滑出的抽屉，保留遮罩与菜单按钮。
- `page-content` 设置最大宽度、最小宽度和安全区内边距。

**步骤 2：实现竖向滚动和底部导航**

- 使用 `min-height: 100dvh`，避免移动浏览器/Android WebView 的 `100vh` 高度误差。
- 底部导航占位使用 `calc(... + env(safe-area-inset-bottom))`，不遮住卡片按钮。
- 页面和弹窗禁止横向溢出，保留自然纵向滚动。

**步骤 3：按手机/平板调整内容密度**

- 手机：页面单列、课程/任务卡片单列或两列、触控目标至少 44px。
- 平板竖屏：内容单列或双列，宽度居中，不再留下桌面侧栏空白。
- 平板横屏：保留更宽的双列内容，但仍使用抽屉导航，不强行挤占内容区。

### 任务 3：验证移动端产物

**步骤 1：运行契约与相关回归**

运行：`node --test tests/preschool-mobile-layout.test.mjs tests/preschool-workbench-refresh.test.mjs`

运行：`npm run release:verify`

**步骤 2：生成 390px 和 768px 截图检查**

确认手机和平板没有横向滚动条、内容不被底部导航遮挡、平板没有左侧空白。

**步骤 3：同步并构建 Debug APK**

运行：`npm run android:sync`

运行：`android/gradlew.bat assembleDebug`

