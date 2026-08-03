# 幼儿版首页草坪战场恢复实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 将幼儿版首页恢复为草坪战场视觉，同时删除重复的行动路径和多层任务卡嵌套。

**架构：** 首页只保留顶部状态栏、一个草坪战场主面板和底部两个出口。主面板直接渲染 3 项核心任务为三条泥土战线，植物和僵尸使用现有透明素材；任务完成仍调用现有 `toggle-plan` 和奖励幂等链路。复杂战斗继续留在独立 `battle` 页面，首页只提供入口。

**技术栈：** Vanilla JS 模板渲染、现有 preschool CSS manifest、现有 PNG/WebP 素材、Node `node:test`。

---

### 任务 1：首页渲染结构减法

**文件：**
- 修改：`G:/StudyCode/个人工作台/app.js` 的 `renderPreschoolHomeOverview()`
- 检查：`G:/StudyCode/个人工作台/app.js` 中首页旧渲染函数引用
- 测试：`G:/StudyCode/个人工作台/tests/preschool-workbench-refresh.test.mjs`

**步骤 1：编写首页结构契约**

断言首页保留 `preschool-home-battlefield`、`preschool-home-lane`、`data-action="toggle-plan"`、`data-page="battle"` 和 `data-page="rewards"`；断言不再从首页输出 `preschool-action-path`、`workbench-home-quest-panel` 和重复课程条。

**步骤 2：运行测试确认契约失败**

运行：`node --test tests/preschool-workbench-refresh.test.mjs`

预期：新增结构断言失败。

**步骤 3：实施最小首页模板**

删除首页的三步行动路径和重复任务面板，新增一个平面战场主面板。每条战线直接对应一项核心任务，沿用 `pixelQuestAsset()` 与现有任务完成事件，不读取 60 日课程 JSON。

**步骤 4：删除无引用的首页旧渲染函数**

确认 `renderPreschoolActionPath()`、`renderPreschoolContinueLearning()` 等函数只服务已删除首页结构后移除；仍被 battle、奖励或其他页面使用的函数保留。

**步骤 5：运行测试确认通过**

运行：`node --test tests/preschool-workbench-refresh.test.mjs tests/preschool-daily-plan.test.mjs`

预期：通过。

### 任务 2：恢复草坪/泥土视觉层

**文件：**
- 创建：`G:/StudyCode/个人工作台/css/preschool/19-home-battlefield.css`
- 修改：`G:/StudyCode/个人工作台/css/preschool-workbench.css`

**步骤 1：实现平面首页视觉**

为首页设置深绿场景背景；主面板使用现有 `pvz-garden-lawn-bg.webp`；三条任务战线使用棕色泥土轨道、绿色边界、黄色阳光状态和大尺寸植物/僵尸素材。所有选择器限制在 `.preschool-home-battlefield` 或首页根节点下，避免影响学习页、奖励页和独立游戏页。

**步骤 2：实现响应式布局**

桌面保持三条战线和右侧状态区；移动端改为单列战线，保证 375px 无横向滚动。按钮保持固定最小高度和清晰焦点样式，尊重 `prefers-reduced-motion`。

**步骤 3：运行语法与样式契约**

运行：`node --check app.js; git diff --check; node --test tests/preschool-workbench-refresh.test.mjs`

预期：通过。

### 任务 3：回归验证

**文件：**
- 检查：`G:/StudyCode/个人工作台/app.js`
- 检查：`G:/StudyCode/个人工作台/storage.js`
- 检查：`G:/StudyCode/个人工作台/data/preschool/english/phonics/lessons.json`

**步骤 1：运行全量测试**

运行：`npm test`

预期：全部通过，且 60 日资料仍是资料库数据，不被首页模板读取。

**步骤 2：运行本地服务并检查页面**

打开：`http://127.0.0.1:4179/preschool-workbench/index.html#overview`

验收：首屏是草坪战场；核心任务可以直接点击完成；进入游戏和奖励的按钮各只有一个；移动端无横向滚动；刷新后任务状态和阳光不丢失。

**步骤 3：记录结果**

只更新主项目 `docs/00-总控/当前状态.md` 或 `进度看板.md` 的证据，不在 worktree 下创建第二套总控。
