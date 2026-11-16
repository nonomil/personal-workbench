# 儿童游戏化学习工作台视觉重做实施计划

> **给 Claude:** 必需子技能：使用 @superpowers:executing-plans 来逐任务实施此计划；当前由 Codex 在共享工作区按同样的检查点执行。

**目标：** 将现有入口、幼儿工作台、学习大厅、学科详情和奖励页重做为三套主题共享骨架的儿童游戏化横屏界面。

**架构：** 保留 `app.js` 中的路由、课程数据、语音、练习状态和奖励状态，只重组页面外壳和 CSS 层级。通过主题 token、`data-world-theme` 和统一游戏化 shell 让花园、方块、闯关三套主题共享一套 DOM/交互结构；网页/Android 竖屏保留自然纵向内容流，只有 Android 横屏使用视口绑定的横向分页。

**三模式约束：** 普通网页保留宽侧栏和自然上下滚动；Android 竖屏保留侧栏/快捷导航和纵向阅读，仅优化触控尺寸与主卡；Android 横屏采用宽彩色导航、场景背景、固定视口和左右完整分页，所有专用 CSS 必须同时位于 `html.is-android-app` 与横屏媒体查询内。

**技术栈：** 原生 HTML/CSS/JavaScript、Capacitor Android、现有 `prj/assets/generated` 素材、Node `node:test`、现有布局验证脚本和 MuMu ADB。

---

### 任务 1：建立视觉重做的失败合同

**文件：**
- 修改：`tests/preschool-mobile-layout.test.mjs`
- 创建：`tests/preschool-game-world.test.mjs`
- 参考：`docs/plans/2026-08-23-child-game-world-redesign-design.md`

**步骤 1：写失败测试**

- 检查入口和工作台必须包含 `child-game-shell`、主题 token、游戏化导航和场景层标记。
- 检查首页、学习大厅、学科详情、奖励页必须有单一主任务区域，而不是只渲染旧卡片墙。
- 检查 Android 横屏的页面合同仍包括根节点纵向溢出 `0`、触控目标至少 `44px`、网页竖屏自然滚动。
- 检查横屏专用规则同时出现 `html.is-android-app` 和 `@media (orientation: landscape)`，且没有把 `overflow-y: hidden` 施加到网页/竖屏的全局规则。

**步骤 2：运行测试确认失败**

运行：`node --test tests/preschool-game-world.test.mjs tests/preschool-mobile-layout.test.mjs`

预期：新增游戏化 shell 断言失败，旧移动布局合同仍通过；这证明测试锁定了新目标而不是旧截图。

### 任务 2：添加共享游戏化主题 token 和场景 shell

**文件：**
- 创建：`prj/css/preschool/44-child-game-world.css`
- 修改：`prj/css/preschool-workbench.css`
- 修改：`prj/preschool-workbench/index.html`
- 修改：`prj/app.js`

**步骤 1：实现共享 token**

- 定义 sky/leaf/sun/coral/purple/ink、面板透明度、边框、阴影、导航宽度和触控尺寸。
- 通过 `data-world-theme="garden-defense|voxel-adventure|platform-quest"` 提供三套主题覆盖。
- 添加场景层、遮罩层、导航层、主任务层和辅助面板层的通用类。

**步骤 2：接入页面**

- 在工作台根节点和主题切换时设置 `data-world-theme`。
- 将现有顶栏、侧栏和页面内容放入统一 shell；保留现有事件委托和页面 id。
- 让 Android 横屏 shell 占满 viewport，网页/竖屏不继承 `overflow: hidden`。

**步骤 3：运行基础合同**

运行：`node --test tests/preschool-game-world.test.mjs tests/preschool-mobile-layout.test.mjs`

预期：shell 标记、主题 token 和基础横屏合同通过；视觉内容仍可能未完成。

### 任务 3：重做入口首页为世界选择地图

**文件：**
- 修改：`prj/index.html`
- 修改：`prj/launcher.js`
- 修改：`tests/launcher.test.mjs`

**步骤 1：保留行为合同**

- 保留三幼儿主题、成人工作台、儿童工作台路径和最近使用入口。
- 保留“幼儿世界 / 工作台”横向分页和键盘/触摸点击。

**步骤 2：替换视觉结构**

- 入口使用主题场景海报、彩色世界按钮和明确的进入 CTA。
- 工作台入口使用两张大海报，不再使用旧的纯白卡片网格。
- 在矮屏隐藏非必要说明，把可操作元素保持在一屏内。

**步骤 3：验证**

运行：`node --test tests/launcher.test.mjs tests/preschool-game-world.test.mjs`

预期：路径、最近使用和分页测试全部通过；入口页面具备游戏化 shell 标记。

### 任务 4：重做幼儿工作台首页和常驻导航

**文件：**
- 修改：`prj/app.js: renderPreschoolHomeOverview、renderPreschoolHomeHero、renderPreschoolHomeBattlefield`
- 修改：`prj/css/preschool/44-child-game-world.css`
- 修改：`prj/css/preschool/43-mobile-app-shell.css`
- 修改：`tests/preschool-mobile-layout.test.mjs`

**步骤 1：重组首页内容**

- 将今日任务、奖励预览、宠物/成长物件和主要行动收束为一个场景主卡。
- 将原来的多个小指标压缩为状态胶囊；将任务细节放到第二横屏或任务面板。
- 保留去练习、切换工作台、下一页和返回首页的现有 action。

**步骤 2：重做导航**

- 以 5 项核心入口显示彩色宽导航；学科和设置进入更多抽屉。
- 导航按钮使用现有 SVG/icon 系统和主题素材，不引入 emoji 图标。
- 保证矮屏和 1463×640 下导航不产生纵向溢出。

**步骤 3：运行布局验证**

运行：`node --test tests/preschool-mobile-layout.test.mjs`

预期：入口、首页两页、导航 rail 和所有按钮合同通过。

### 任务 5：重做学习大厅和学科传送门

**文件：**
- 修改：`prj/app.js: renderPreschoolCourses、renderPreschoolCourseWallCard、renderPreschoolCourseWallExtras`
- 修改：`prj/css/preschool/44-child-game-world.css`
- 修改：`tests/preschool-course-wall.test.mjs`（如现有文件已存在则扩展）

**步骤 1：重组页面**

- 第一屏显示今日学习路线三步和唯一主 CTA。
- 第二屏把学科做成场景传送门，保留课程完成度、今日预览和进入行为。
- 第三屏承载动画、资料和游戏入口，避免所有内容挤在同一屏。

**步骤 2：保留课程路由**

- 继续使用现有 `courseId`、`courseTab`、`open-lesson` 和媒体入口。
- 不删除课程数据和等级逻辑；只更换卡片外壳和信息优先级。

**步骤 3：验证**

运行：`node --test tests/preschool-course-wall.test.mjs tests/preschool-mobile-layout.test.mjs`

预期：今日、传送门、资料三页均可切换，Android 横屏每页纵向溢出不超过合同阈值。

### 任务 6：统一学科详情和发音/互动学习页

**文件：**
- 修改：`prj/app.js: renderPreschoolSubjectTodayPage、renderPreschoolCourseFlashcards、renderPreschoolEnglishDashboard、renderPreschoolPoetryToday`
- 修改：`prj/css/preschool/35-course-flashcards.css`
- 修改：`prj/css/preschool/40-literacy-uplift.css`
- 修改：`prj/css/preschool/41-english-vocab-uplift.css`
- 修改：`prj/css/preschool/44-child-game-world.css`
- 测试：`tests/preschool-speech.test.mjs`、`tests/phonics-display.test.mjs`、相关课程测试

**步骤 1：统一详情布局**

- 中央固定一个大主学习卡，右侧只保留解释、进度和下一步。
- 识字/拼音保留大字、拼音、笔画/描红和播放；英语保留单词、释义、跟读和错词；古诗保留逐句/整首朗读；数学保留题面、提示和奖励。
- 继续使用 `preschool-speech.js` 和现有 `data-action`，不把 TTS 逻辑写进 CSS/渲染外壳。

**步骤 2：处理横屏分页**

- 详情内容拆成完整横屏页，使用左右箭头和左右滑动；不以纵向滚动隐藏下一步。
- 竖屏和普通网页保持原有自然滚动和可读的纵向结构。

**步骤 3：验证核心学习路径**

运行：`node --test tests/preschool-speech.test.mjs tests/phonics-display.test.mjs tests/preschool-english-daily.test.mjs tests/preschool-literacy-assess.test.mjs tests/preschool-math-practice.test.mjs`

预期：发音、拼音显示、英语每日学习、识字评估、数学练习全部通过。

### 任务 7：重做奖励页并补齐主题资产

**文件：**
- 修改：`prj/app.js: renderPreschoolRewards、renderPreschoolGrowth`
- 修改：`prj/css/preschool/44-child-game-world.css`
- 资产：`prj/assets/generated/preschool-*` 下新增发布素材和 manifest
- 参考工具：`G:\StudyCode\小游戏项目\docs\游戏资产开发工具\skills\gpt-game-asset-pipeline\SKILL.md`

**步骤 1：先复用现有素材**

- 使用已发布的宠物、阳光、晶体、金币、宝箱和徽章素材完成第一版。
- 仅对缺少的主题场景、宠物动作、导航图标和兑换物品调用本地游戏资产工具。

**步骤 2：重组奖励界面**

- 使用宠物栖息地/商店场景作为主视觉。
- 保留余额、喂养、兑换、徽章和成长状态；每个兑换按钮保持明确的费用和反馈。

**步骤 3：验证状态**

运行：`node --test tests/preschool-rewards-confirm.test.mjs tests/preschool-mobile-layout.test.mjs`

预期：奖励确认、宠物状态和移动布局通过。

### 任务 8：截图合同、APK 构建和 MuMu 实机验收

**文件：**
- 修改：`scripts/verify-workbench-android-landscape.mjs`
- 修改：`tests/preschool-mobile-layout.test.mjs`
- 输出：`_tmp_mobile_preview/`、`_tmp_mumu_verify/`

**步骤 1：浏览器视口验收**

运行：`npm run release:verify`

运行：`node --test tests/preschool-mobile-layout.test.mjs tests/launcher.test.mjs`

检查 `800×360`、`915×412`、`1463×616` 和网页竖屏 `390×844`；预期 Android 页面纵向溢出为 `0`，网页竖屏继续有自然纵向滚动。

**步骤 2：构建 APK**

运行：`npm run android:sync`

运行：`android\gradlew.bat assembleDebug`

预期：`BUILD SUCCESSFUL`，APK 位于 `android\app\build\outputs\apk\debug\app-debug.apk`。

**步骤 3：MuMu 安装和验收**

- 连接 `127.0.0.1:7555`，覆盖安装新 APK。
- 比较本地 APK 与设备已安装 `base.apk` SHA-256。
- 逐页验证入口、首页、学习大厅、识字、拼音、英语、古诗、数学、奖励。
- 截图检查图片占比、导航宽度、文字层级、主 CTA 和无纵向滚动。

**步骤 4：回归**

运行：`npm test`

预期：新增视觉合同、业务回归、发布校验和 Android 构建均通过；若仓库既有矛盾测试失败，记录具体失败并与本次改版区分。
