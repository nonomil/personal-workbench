# 游戏化学习工作台轻量学习证据闭环实施计划

> **给 Codex:** 本计划在当前会话执行；保持首页轻量，不把 60 日资料全量接入首页或课程引擎。

**目标：** 让幼儿版首页的学习任务除了“直接打卡”外，还能进入一张已有的轻量选择题；答对后留下练习完成证据，并把对应今日计划一并标记完成。

**架构：** 每个内置学习计划可选地携带 `practiceLessonId`，它只指向现有 `childCourses` 中的一张练习卡。运动、生活和用户新建计划没有映射时，仍走原来的直接打卡路径。练习完成使用现有 `completeCourseLesson()` 和 `lesson:<id>` 幂等奖励事件，并在同一次状态提交中更新计划，避免再发一份 `plan:<id>:<date>` 阳光。

**技术栈：** Vanilla JS、localStorage、现有 `PersonalWorkbenchStorage`、`PersonalWorkbenchChildCourses`、HTML/CSS、Node 内置测试。

---

## 需求边界

- 保留 60 日自然拼读和各学科资料库；首页只展示今日计划和一张轻量练习。
- 不在首页渲染课程列表、60 日 JSON 或独立战斗棋盘。
- 任务仍可编辑、删除、直接打卡；新增练习入口不能嵌套在另一个 `<button>` 内。
- 已完成计划不显示“去练习”，防止孩子误以为还需要重复领取。
- 旧快照没有 `practiceLessonId` 时，只给内置模板补默认映射；用户自定义字段和完成状态不覆盖。
- 练习完成奖励仍只走课程事件；刷新、返回、重复点击不得重复发阳光。

### 任务 1：先写红测

**文件：**

- 修改：`tests/preschool-workbench-refresh.test.mjs`
- 修改：`tests/preschool-daily-plan.test.mjs`

步骤：

1. 增加断言：内置识字、古诗、数学、英语计划拥有 `practiceLessonId`；运动计划没有映射。
2. 增加断言：旧快照迁移会保留已完成状态、用户改名，并只为内置模板补练习映射。
3. 增加页面契约断言：幼儿首页存在 `open-plan-practice`，练习入口与计划完成按钮是同级动作。
4. 运行定向测试，预期因当前存储和首页没有该字段/动作而失败。

### 任务 2：补数据合同与兼容迁移

**文件：**

- 修改：`storage.js`

步骤：

1. 为 `PRESCHOOL_DAILY_ITEMS` 添加 6 个内置计划与已有轻量课程卡的映射。
2. `createPreschoolPlans()`、补种新日期计划和 `normalizeState()` 保留 `practiceLessonId`。
3. `synchronizePreschoolTemplates()` 只在字段缺失时补模板映射，不覆盖已编辑的标题、完成状态和自定义计划。
4. 运行两个定向数据测试，预期通过。

### 任务 3：接入首页练习入口与同一提交闭环

**文件：**

- 修改：`app.js`
- 修改：`css/preschool/19-home-battlefield.css`
- 修改：`preschool-workbench/index.html`

步骤：

1. 添加安全查找函数，根据计划的 `practiceLessonId` 找到已有课程卡；找不到时不渲染入口。
2. 把首页每条战线改为“主打卡按钮 + 同级去练习按钮”，避免非法嵌套按钮；未完成且有映射时显示“去练习”。
3. 打开已有 `lesson-dialog`，在 `ui.lessonSession` 保存来源计划的 id/date。
4. 练习答对后调用现有课程完成逻辑，并在同一 `commit()` 中将来源计划写成 `done`、`completionSource: 'practice'`；不再额外调用计划奖励。
5. 直接打卡写入 `completionSource: 'check-in'`，首页证据摘要显示练习完成数量。
6. 提升幼儿入口缓存参数，确保发布后不会继续命中旧脚本。

### 任务 4：真实页面验收

**路径：** `http://127.0.0.1:4178/preschool-workbench/index.html#overview`

步骤：

1. 首页点击“去练习”进入选择题弹窗，错误选项显示提示，正确选项解锁“收集阳光”。
2. 完成练习后确认：计划变为完成、首页完成数增加、证据摘要出现练习计数、只出现一次课程阳光反馈。
3. 刷新页面确认练习和计划状态保留；已完成卡片不再显示“去练习”。
4. 点击运动任务确认仍可直接打卡；点击自定义计划确认没有错误入口。
5. 在 1280px 与 390px 视口检查无横向滚动、侧栏规则和按钮可触达。

### 任务 5：回归、发布与验收

运行：

```powershell
node --test tests/preschool-workbench-refresh.test.mjs tests/preschool-daily-plan.test.mjs
npm test
node --check app.js
node --check storage.js
git diff --check
npm run android:prepare
```

确认通过后：提交 `v0.5.0` 版本、推送 `main` 和标签，等待 Pages/APK Actions；核对 GitHub Release、APK 下载和 MuMu 核心路径。临时 APK、截图放在项目目录外，不进入发布树。

## 本轮执行结果（2026-08-06）

- 任务 1–4 已落地：内置计划练习映射、旧快照兼容、同级练习入口、练习完成同步来源计划和证据摘要均已接入。
- 定向验证：`node --test tests/preschool-workbench-refresh.test.mjs tests/preschool-daily-plan.test.mjs`，44/44 通过。
- 全量验证：`npm test`，96/96 通过；`node --check app.js`、`node --check storage.js`、`git diff --check` 通过。
- 浏览器验证：明确加载 `http://127.0.0.1:4178/preschool-workbench/index.html?cb=20260806-light-evidence-loop-v1#overview`；390×844 无横向溢出；英语练习使今日任务 3/6→4/6、阳光 100→120、豌豆能量 4→5，刷新后状态保持，运行日志为空。
- 任务 5（提交、推送、Pages/APK/MuMu 发布验收）本轮未执行，按主控边界保持冻结；不能把本轮网页测试表述为已发布或 APK 已验收。
