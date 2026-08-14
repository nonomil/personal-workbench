# WorkBuddy 幼儿工作台视觉重构实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 将幼儿版首页改造成清晰、图像优先、任务优先的 WorkBuddy 式个人工作台，同时保留现有 PVZ 防守与本地优先业务逻辑。

**架构：** 保留 `app.js` 的状态派生和路由，只调整幼儿概览的 HTML 结构，并新增最后加载的幼儿 CSS 层覆盖历史级联。战斗页和状态模块不重写；兼容类名保留或在测试中明确迁移。

**技术栈：** Vanilla JS、HTML、CSS、Node.js `node:test`、现有移动端制品脚本。

---

### 任务 1：先固化新的首页合同

**文件：**
- 修改：`tests/preschool-workbench-refresh.test.mjs`
- 修改：`css/preschool-workbench.css`

**步骤 1：编写失败的测试**

在现有幼儿回归测试中加入首页视觉合同：要求 `app.js` 出现 `workbench-overview`、`workbench-today`、`workbench-garden-preview`、`workbench-reward-strip`，并要求 CSS 图中出现 `15-workbuddy-overview.css` 和关键响应式规则。

**步骤 2：运行测试以验证它失败**

运行：`npm test -- --test-name-pattern="WorkBuddy|workbench overview"`

预期：失败，因为新类名和 CSS 导入尚未存在。

**步骤 3：编写最小实施**

只添加测试断言和 CSS manifest 导入位置，不修改状态逻辑。

**步骤 4：运行测试以验证它通过**

在任务 2-3 完成后运行同一命令，确认新首页合同通过。

**步骤 5：提交**

```bash
git add tests/preschool-workbench-refresh.test.mjs css/preschool-workbench.css
git commit -m "test: define workbuddy preschool overview contract"
```

### 任务 2：重排幼儿概览的呈现层

**文件：**
- 修改：`app.js: renderPreschoolOverview 及其首页局部渲染函数`

**步骤 1：编写失败的测试**

沿用任务 1 的合同，增加对今日任务、花园预览、奖励条和现有 `pixel-world-grid` 兼容类的检查。

**步骤 2：运行测试以验证它失败**

运行：`npm test -- --test-name-pattern="WorkBuddy|workbench overview"`

预期：失败，因为当前首页仍以旧 pixel 面板结构为主。

**步骤 3：编写最小实施**

把首页的外层 section 改为新的 `workbench-*` 结构，复用现有 `renderPixelStats`、`renderPixelMap`、任务卡、宝箱和收集函数。保留旧 `pixel-*` 兼容类，保证战斗合同、资源引用和事件处理不变。

**步骤 4：运行测试以验证它通过**

运行：`npm test -- --test-name-pattern="WorkBuddy|workbench overview"`

预期：通过。

**步骤 5：提交**

```bash
git add app.js tests/preschool-workbench-refresh.test.mjs
git commit -m "feat: reshape preschool overview as workbench"
```

### 任务 3：添加 WorkBuddy 风格的幼儿首页视觉层

**文件：**
- 创建：`css/preschool/15-workbuddy-overview.css`
- 修改：`css/preschool-workbench.css`

**步骤 1：编写失败的测试**

测试新 CSS 的颜色变量、首页网格、任务卡触控尺寸、花园预览和移动端断点。

**步骤 2：运行测试以验证它失败**

运行：`npm test -- --test-name-pattern="WorkBuddy|workbench overview"`

预期：失败，因为 CSS 文件不存在。

**步骤 3：编写最小实施**

新增独立 CSS 层，使用低对比度奶油/薄荷色背景、白色大卡片、清晰的绿色完成态和大图像区域。桌面采用任务主列 + 花园侧栏，移动端改为单列并保留大按钮。只在 `body[data-workbench-variant="preschool"]` 下生效。

**步骤 4：运行测试以验证它通过**

运行：`npm test -- --test-name-pattern="WorkBuddy|workbench overview"`

预期：通过。

**步骤 5：提交**

```bash
git add css/preschool/15-workbuddy-overview.css css/preschool-workbench.css
git commit -m "style: apply workbuddy preschool overview system"
```

### 任务 4：生成移动端制品并回归

**文件：**
- 检查：`scripts/prepare-mobile.mjs`
- 生成：`dist/`（只作为制品，不提交临时缓存）

**步骤 1：运行完整测试**

运行：`npm test`

预期：全部通过。

**步骤 2：准备移动端制品**

运行：`npm run android:prepare`

预期：成功复制新的 CSS 清单和幼儿首页资源到 `dist/`。

**步骤 3：检查发布路径**

运行：`rg -n "15-workbuddy-overview|preschool-workbench" dist`

预期：制品中存在新的 CSS 层，资源使用相对路径。

**步骤 4：提交**

```bash
git add app.js css tests/preschool-workbench-refresh.test.mjs
git commit -m "feat: refresh preschool workbench presentation"
```
