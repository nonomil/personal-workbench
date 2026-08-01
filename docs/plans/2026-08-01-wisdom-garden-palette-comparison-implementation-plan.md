# 智慧花园配色对比测试页实施计划

> **给 Claude:** 必需子技能：使用 `superpowers:executing-plans` 来逐任务实施此计划。

**目标：** 创建一个可直接打开的“当前版 vs 液态玻璃版”智慧花园工作台配色对比测试页。

**架构：** 页面是独立的单 HTML 文件，内联 CSS 和 JavaScript，不接入主站路由和数据层。左右两侧使用同一组学习内容，通过 `data-theme` 区分视觉令牌；交互只维护页面内存状态，避免写入主站 localStorage。

**技术栈：** 原生 HTML/CSS/JavaScript、现有 PNG/WebP 植物素材、CSS 动画、Node.js `node:test` 静态契约测试。

---

### 任务 1：建立独立测试页契约

**文件：**
- 创建：`tests/palette-comparison.test.mjs`
- 测试：`visual-tests/智慧花园配色对比测试.html`

**步骤 1：编写失败的测试**

添加静态契约，检查测试页包含双栏预览、两套主题标记、提示词核心色板、桌面/手机切换、任务交互、减少动效规则，并确保没有写入 `localStorage`。

**步骤 2：运行它以确保失败**

运行：`node --test tests/palette-comparison.test.mjs`

预期：失败，显示测试页文件不存在。

**步骤 3：提交**

在实现测试页前保留红色测试结果，不单独提交测试文件，和页面实现一起提交。

### 任务 2：实现双栏视觉对比页面

**文件：**
- 创建：`visual-tests/智慧花园配色对比测试.html`

**步骤 1：编写最小页面结构**

包含页面标题、色板说明、视口控制、当前版预览、新方案预览；两侧展示相同的导航、状态条、任务卡、植物伙伴、奖励入口和学习专区。

**步骤 2：实现视觉令牌与响应式样式**

使用 `#FF8C42`、`#4ECDC4`、`#FFD93D`、`#6BCB77`、`#FFF8F0`、`#FFF0E0` 和 `#2D2D3A`。新方案使用玻璃层、高光边缘、暖灰阴影和明确的圆角层级；1440px 双栏、900px 上下排列、560px 单列。

**步骤 3：实现页面内交互**

实现桌面/手机画布切换、任务点亮与进度/阳光更新、奖励反馈 toast 和减少动效降级。状态仅保存在 JavaScript 内存中。

### 任务 3：运行测试与静态检查

**文件：**
- 修改：无
- 测试：`tests/palette-comparison.test.mjs`

**步骤 1：运行针对性测试**

运行：`node --test tests/palette-comparison.test.mjs`

预期：通过全部测试。

**步骤 2：检查页面引用和脚本**

运行：`node --check scripts/check-palette-test-page.mjs`（如果实现过程中需要脚本则执行；否则跳过）以及 `git diff --check`。

预期：无语法错误、无差异空白错误，所有本地素材引用路径存在。

**步骤 3：运行全量回归**

运行：`npm test`

预期：现有项目测试与新增配色测试全部通过。

### 任务 4：预览与提交

**文件：**
- 创建：`tmp/palette-test-preview/`（仅测试制品，不提交）

**步骤 1：启动静态服务**

运行：`python -m http.server 7000`

打开：`http://127.0.0.1:7000/visual-tests/智慧花园配色对比测试.html`

**步骤 2：检查视口**

检查 1440px 双栏、900px 上下布局、375px 单栏和无横向滚动；点击任务、奖励、桌面/手机切换确认反馈可见。

**步骤 3：提交**

```powershell
git add visual-tests/智慧花园配色对比测试.html tests/palette-comparison.test.mjs
git commit -m "feat: add wisdom garden palette comparison page"
```
