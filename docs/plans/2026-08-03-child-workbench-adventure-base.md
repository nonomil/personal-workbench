# 儿童学习工作台冒险基地升级实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 参考“游戏化学习工作台”的信息架构，把儿童版首页从通用仪表盘升级为一个轻量、可执行的学习冒险基地。

**架构：** 保留现有 Vanilla JS、localStorage、`toggle-plan` 阳光结算和三版本隔离。首页只消费现有计划、课程、阅读、成长和奖励数据，使用派生视图展示身份伙伴、今日必做/选做、学习证据和成长地图，不新增第二套任务或积分账本。游戏化反馈保留在成长地图、奖励中心和幼儿独立花园中，儿童首页以完成学习为主。

**技术栈：** Vanilla JS、内联模板字符串、CSS 变量与响应式 CSS、现有 Lucide 图标、现有 `PersonalWorkbenchStorage` / `PersonalWorkbenchChildGrowth` API。

---

### 任务 1：固化首页信息架构与静态契约

**文件：**
- 创建：`tests/child-workbench-ui.test.mjs`
- 创建：`docs/plans/2026-08-03-child-workbench-adventure-base.md`
- 修改：无运行时代码

**步骤 1：编写失败的测试**

测试 `儿童学习工作台/index.html` 使用 child 变体、共享 `app.js`，并要求 `app.js` 包含儿童首页的四个稳定结构标记：`child-adventure-home`、`child-identity-card`、`child-plan-board`、`child-growth-map`。

**步骤 2：运行测试以验证它失败**

运行：`node --test tests/child-workbench-ui.test.mjs`

预期：失败，当前儿童首页没有冒险基地结构标记。

**步骤 3：最小实施**

先不改运行代码，只将测试加入现有 Node 原生测试目录，作为本轮 UI 结构的回归门禁。

**步骤 4：运行测试以验证它通过**

在首页结构完成后重新运行，预期通过。

### 任务 2：实现儿童首页冒险基地结构

**文件：**
- 修改：`app.js`，`renderOverview` 及儿童首页辅助渲染函数
- 修改：`config.js`，仅在必要时补充课程颜色/图标映射，不改变课程事实数据
- 测试：`tests/child-workbench-ui.test.mjs`

**步骤 1：提取现有数据**

复用 `derived.todayPlans`、`derived.todayCorePlans`、`derived.todayOptionalPlans`、`state.readingLogs`、`state.tasks`、`state.goals`、`getChildGrowth()` 和 `getChildCourses()`。必做任务按 `required === true`，没有该字段的旧计划按可选任务兼容。

**步骤 2：实现最小结构**

新增儿童专用首页渲染分支：

- 身份伙伴卡：当前头像、等级、连续行动、阳光和 XP 进度；只读取成长派生值。
- 今日计划板：必做任务默认展开，选做挑战可折叠；任务按钮仍是现有 `data-action="toggle-plan"`。
- 学习证据卡：显示今日已完成计划、最近阅读和下一项课程入口；不把“点击完成”伪装成学习内容。
- 成长地图：语文知识森林、数学岛、英语海湾、科学火山四个区域，根据现有课程完成度和目标进度派生“未开始/进行中/已点亮”，点击导航到 `courses` 或 `goals`。
- 家长任务入口：保留 `add-plan`，文案改为“安排下一项”，不新增 AI 运行时依赖。

**步骤 3：保持状态边界**

不新增 localStorage key、不改奖励金额、不改任务完成顺序；空计划、空课程、旧快照都要显示可操作的空态。

### 任务 3：补齐儿童版视觉与响应式表现

**文件：**
- 修改：`css/child.css`
- 修改：`儿童学习工作台/index.html`，仅更新版本标记与无障碍文案（如需要）

**实施：**

- 使用草地绿、温暖橙、天空蓝和纸张白作为儿童版独立调色，保持高对比文本。
- 首页采用两列工作台：左侧身份/地图，右侧今日任务/证据；在 900px 以下单列，移动端任务板先出现。
- 任务行固定高度与清晰完成态，折叠面板有 `aria-expanded` 与视觉状态。
- 加入低幅度卡片入场、进度条和完成反馈动画，并尊重 `prefers-reduced-motion`。
- 不使用大面积装饰图压缩实际任务，不复制参考笔记的视频、人物或品牌资产。

### 任务 4：验证、制品和发布

**文件：**
- 测试：`tests/child-workbench-ui.test.mjs`、现有 `npm test`
- 制品：`tmp/pages-artifacts/_site_child_refresh`

**步骤：**

1. 运行 `node --test tests/child-workbench-ui.test.mjs`。
2. 运行 `npm test`，区分本轮失败与工作树中自然拼读专项改动引起的失败。
3. 运行 `node --check app.js`、`node --check config.js`。
4. 运行 `npm run android:prepare`，确认 Android 使用的 `dist/` 复制了最新儿童入口和资源路径；`dist/` 不提交。
5. 按仓库 Pages 规则检查 `main` 根目录入口和本地静态服务，确认儿童入口桌面与移动布局、任务勾选、选做折叠和页面跳转。
6. 提交本轮文件并推送 `main`；发布 `v0.4.1` 标签后由现有 Android Actions 构建 Release APK，不移动旧标签。

**验收标准：**

- 首屏先看到“今天要做什么”和“为什么做”，而不是成人式趋势图。
- 必做/选做任务可区分，完成一项只通过现有事件结算一次阳光。
- 首页能看到伙伴、连续行动、学习证据和课程地图，但不引入重复任务数据。
- 儿童、幼儿、成人三个入口仍各自使用原有 storage key 与页面边界。
- Pages 制品只包含发布白名单内容，临时资料不进入发布目录。
