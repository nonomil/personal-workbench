# test-report（执行时回写）

> 每阶段格式：日期 / 命令 / 退出码 / 关键输出 / 结论（允许推进：是/否）/ 约束自查（零新 key · 今日页零改动 · 大卡零拆改 · ui 无污染）。

## 阶段 0：只读侦查（steps 步骤 1）

- 日期：2026-08-15
- 命令：`npm test`；`node --check prj/app.js`；`git status --short`
- 退出码：0 / 0 / 0
- npm test 基线：269/269 通过
- git status 重叠核对：本包文件域 8 个未提交文件（`prj/app.js` +430、墙/翻卡 CSS、`index.html`、3 个 refresh/mistakes/math 测试）。用户授权在当前树上继续，不回滚。
- B2 在途核对：`pending`，阶段 0 未开始，不在途。
- 缓存戳实录（当前值 + 断言测试清单）：
  - `prj/preschool-workbench/index.html`：`preschool-workbench.css?v=20260815-poem-full-v1`、`app.js?v=20260815-poem-full-v1`
  - 断言此戳：`tests/preschool-workbench-refresh.test.mjs`（约 108/111/597 行；另 1007 行断言 `35-course-flashcards.css?v=20260815-poem-full-v1`，属子戳，本包不改）、`tests/preschool-lesson-mistakes.test.mjs:90`、`tests/preschool-math-practice.test.mjs:129`
  - 3 个文件，未触发「> 5 停」
- 各科今日内容/完成态派生口径实录：
  - 翻卡科：`PRESCHOOL_FLASHCARD_SIZE` = 识字/拼音/拼读/数学 8、英语 5。今日张数来自 `buildPreschoolCourseCardItems`（只读）。完成态现口径是 `getPreschoolCourseCardSession` 的 `session.index >= items.length`（该函数会写 `ui.courseCards`，墙卡禁用）。落盘口径：`markPreschoolFlashcard` 把当日日期写入 `courseProgress.{literacy|english|track}.mastery[key].dates`。空批次走既有「这一级的卡都翻完啦」。
  - 古诗：`getPreschoolPoetryTodaySession` **会写** `ui.courseCards`（诗对象、poemId、level）。今日诗 = `levelPool(notReady)` 后 `preschoolDayIndex(pool.length)`。完成态 = `session.marks[poemId]`，同时 `markPreschoolPoem` → `commitPreschoolSubjectMark('poetry')` 写 mastery.dates。墙卡必须抽 `derivePreschoolPoetryTodayPoem`，原 session 函数改为调用它，行为不变。
  - 专注：`renderPreschoolFocusToday` 用 `preschoolDayIndex(lessons.length)` 取今日课。完成态无独立函数，复用 `courseProgress.completedLessonIds` 是否含今日课 id。
  - 运动：浏览卡 session 的 `motionDone`（`markPreschoolMotionDone` 会把当前 pool 的 key 全部 `markSubjectReady`）。无 session 时读 motion mastery.dates 是否含今日。
  - 暑假：今日页是静态五样小事，**没有**当日完成落盘。预览固定「今天五样小事」，不新造完成判定。
- `renderPreschoolCourseResources` 结构与菜单嵌入可行性：
  - 输出整节 `<section class="preschool-course-resources">` + 英文抬头 + `<article>` 列表，不能安全嵌进孩子层按钮行。
  - 取舍（升级条件允许）：菜单不嵌入该 HTML；「听一听」仅在 `course.resources` 有 TTS 时用既有 `speak-resource`；「看资料」用轻量 `parent-detail-open` 展开家长折叠区。config 里目前只有暑假带 `resources`。
- classic 相关既有测试清单：
  - 无用例直接断言 `preschool-course-library-note` 或「看看资料和其他练习」
  - `keeps preschool course content spacious...`：墙/今日卡/focused
  - `shows progress and current state on the preschool course wall`：三点/状态字
  - `turns flashcard subjects into a flip-card page...`：断言 `data-action="flashcard-classic"`（保留）
  - 文案旧串出现 5 处「看看资料和其他练习」（翻卡框/完成屏/古诗今日/运动完成/专注今日）+ 1 处「浏览完整资料库」。方案快照写「两处」，以当前代码为准：今日页只改这些按钮文案。
- 实现差异预记：`35-course-flashcards.css` 已占用，新样式落 `prj/css/preschool/36-course-menu.css`。
- 结论：允许推进：是
- 约束自查：零新 key · 今日页零改动（仅按钮文案）· 大卡零拆改 · 古诗预览抽纯函数，不调会写 ui 的 session

## 阶段 1：合同测试先红（steps 步骤 2）

- 日期：2026-08-15
- 命令：`node --test --test-concurrency=1 tests/preschool-workbench-refresh.test.mjs tests/preschool-lesson-mistakes.test.mjs tests/preschool-math-practice.test.mjs`
- 退出码：1
- 预期红：墙卡预览、classic 菜单、文案、3 个文件的缓存戳
- 实际红：6/66（pass 60）
  1. `maps preschool courses to mistake subjects...` — 戳 `course-middle-v1`
  2. `settings and math lessons read the selected practice band` — 戳
  3. `bumps preschool runtime assets...` — css 戳
  4. `puts a single real-work workflow card...` — app.js 戳
  5. `shows progress and current state on the preschool course wall` — 缺 `preschool-course-wall-preview`
  6. `adds a today preview on the course wall and splits classic into a child menu` — 缺 `getPreschoolCourseTodayPreview`
- 对账：红因功能缺失/戳未升，不是拼写错误。允许推进：是

## 阶段 2：实现转绿（steps 步骤 3–6）

- 日期：2026-08-15
- 命令：`node --check prj/app.js`；合同三文件 66/66；`npm test`
- 退出码：0 / 0 / 0
- 关键输出：`npm test` **275/275**（基线 269 + 本包 1 条新合同 + 工作树既有未提交测试）
- 结论：步骤 2 的 6 红全部转绿；既有用例零删除。允许推进：是
- 约束自查：零新 localStorage key；今日页只改按钮文案；`renderPreschoolCourseCard` 未拆改；古诗预览走 `derivePreschoolPoetryTodayPoem`，不写 `ui.courseCards`

## 阶段 3：真机走查与收尾（steps 步骤 7）

- 日期：2026-08-15
- 浏览器：`http://127.0.0.1:4192/prj/preschool-workbench/index.html?cb=20260815-course-middle-v1#courses`
- 390px：9 卡预览齐（识字「今天认 8 个字」、英语「今天 5 个单词」、古诗「今日一首 · 悯农」、专注「今日训练 · 第31天 · 找相同」、暑假「今天五样小事」、运动「跟做今天的动作」）；`scrollWidth=390` 无溢出
- 识字翻卡点「更多练习」：菜单「识字 · 更多练习」；孩子层 3 钮（回今日页 / 组词开花 · 山 / 看资料）均 ≥44px；无 library-note、无墙外大卡；家长看详情默认折叠
- 展开家长详情：进度条 + 分级带 + 路线在折叠区内；无横向溢出
- 回墙再进古诗：今日一首仍是《悯农》，与墙卡预览一致（ui 未被污染）
- 暑假按钮文案「更多资料」，落点同菜单且有「听一听」「看资料」
- 320px：9 卡 9 预览，`scrollWidth=320` 无溢出；桌面 1280 无溢出
- 截图归档路径：
  - `docs/plans/T20260815-course-middle-layer/screenshots/01-wall-390.png`
  - `docs/plans/T20260815-course-middle-layer/screenshots/02-menu-390.png`
  - `docs/plans/T20260815-course-middle-layer/screenshots/03-parent-detail-390.png`
  - `docs/plans/T20260815-course-middle-layer/screenshots/04-poetry-after-wall-390.png`
  - `docs/plans/T20260815-course-middle-layer/screenshots/05-wall-desktop.png`
- 结论：浏览器 5 条走查通过。最终验收留给用户。允许推进：是

