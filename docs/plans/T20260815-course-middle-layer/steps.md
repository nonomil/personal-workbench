# steps（单阶段 S1，7 步）

> 铁律：步骤 1 是只读侦查，结论写进 `test-report.md` 阶段 0 后才能改文件。位置与函数名以你亲自读到的代码为准（方案文档中的行号是 2026-08-15 快照）。

## 步骤 1：只读侦查（不改任何文件）

1. `npm test` 基线；`git status` 核对本包文件域重叠。
2. 核对 `T20260815-B2-practice-review` 是否在途（读其 test-report / plans README）。在途 → 停。
3. 缓存戳实录：`prj/preschool-workbench/index.html` 当前 css 与 app.js 的 `?v=` 值；全仓搜索断言该戳的测试（refresh / lesson-mistakes / math-practice 及其他），列全清单。**> 5 个文件则停。**
4. 各科"今日内容"与"当日完成"派生口径实录：
   - 翻卡科：`PRESCHOOL_FLASHCARD_SIZE`、翻卡 session 今日张数与完成判定
   - 古诗：今日诗推导路径（确认 `getPreschoolPoetryTodaySession` 是否写 ui 状态、可否抽纯函数）
   - 专注：todayIndex 推导；运动/暑假：完成态口径
5. `renderPreschoolCourseResources` 输出结构（能否安全嵌入菜单）。
6. classic 相关测试现状：断言 `preschool-course-library-note`、classic 布局、按钮文案的既有用例清单。
7. 全部写入 test-report 阶段 0。

## 步骤 2：合同测试先红

按侦查清单一次性更新/新增断言（预期红）：

- 墙卡含 `preschool-course-wall-preview`
- classic 分支含 `preschool-course-menu` + `preschool-course-parent-detail`（`<details`/`<summary`），不再含 `preschool-course-library-note`
- `看看资料和其他练习` 不再出现于 app.js，`更多练习` 出现
- 缓存戳断言改为 `20260815-course-middle-v1`

跑 `npm test`，红数与清单对账，写入 test-report 阶段 1。

## 步骤 3：A 墙卡今日预览

实现 `getPreschoolCourseTodayPreview(course)`（纯派生、只读）并插入墙卡模板。古诗如需抽纯函数，在 `prj/app.js` 内抽（不动原函数行为）。

## 步骤 4：B classic 菜单 + 家长折叠

实现 `renderPreschoolCourseMenu(course)`；改 `renderPreschoolCourses` classic 分支；新建 `35-course-menu.css` 并 @import；升缓存戳。

## 步骤 5：C 文案

三处按钮文案替换（翻卡完成屏、运动完成屏、暑假页）。

## 步骤 6：转绿与回归

`npm test` 全绿（步骤 2 的红全部转绿、既有用例零删除）；`node --check prj/app.js`。写入 test-report 阶段 2。

## 步骤 7：真机走查与收尾

1. 浏览器 390px + 桌面：按 `acceptance.md` 浏览器层 5 条逐项走查，截图归档（卡片墙预览、菜单、折叠展开）。
2. 回写 requirements-checklist R1–R6 实现/自测列 + 证据。
3. 同步 `docs/00-总控/当前状态.md` 一行；`docs/plans/README.md` 更新本包状态；方案文档头部状态改"已实施"并记实现差异。
4. 不 commit，汇报等验收。
