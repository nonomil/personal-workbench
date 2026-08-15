# requirements-checklist

> 证据 = 命令输出 / file:line / 截图归档路径。最终验收列留给用户。

| R | 需求 | 实现 | 自测 | 最终验收 | 证据 |
|---|---|---|---|---|---|
| R1 | 墙卡今日预览行：9 科全覆盖（翻卡科张数、古诗今日诗题、专注今日训练、运动/暑假静态）；当日完成显示"今天做完啦 ✓"；渲染只读不污染 ui 状态 | [x] | [x] | [ ] | `getPreschoolCourseTodayPreview` / `derivePreschoolPoetryTodayPoem`（`prj/app.js`）；390px 实录 9 科预览；回墙再进古诗仍《悯农》；合同 `adds a today preview...` |
| R2 | classic 落点 = `renderPreschoolCourseMenu`：回今日页主按钮 + 今日课大按钮 + 听一听/看资料 + 家长看详情折叠；孩子层按钮 ≤ 5 | [x] | [x] | [ ] | 识字菜单 3 钮均 ≥44px；暑假菜单含听一听+看资料；`02-menu-390.png` |
| R3 | `<details class="preschool-course-parent-detail">` 默认折叠，内部原样调用 `renderPreschoolCourseCard(course, true)`；大卡子渲染函数零改动 | [x] | [x] | [ ] | 默认 `open=false`；展开后进度条/分级带/路线在折叠区内；`03-parent-detail-390.png` |
| R4 | 文案：两处"看看资料和其他练习"→"更多练习"；暑假"浏览完整资料库"→"更多资料"；`flashcard-classic`/`flashcard-cards` action 语义不变 | [x] | [x] | [ ] | app.js 旧串已清；今日页/完成屏为「更多练习」，暑假为「更多资料」；action 名未改 |
| R5 | 合同测试同步：墙卡预览断言、菜单/折叠断言、文案断言、全部缓存戳断言 | [x] | [x] | [ ] | refresh 新增合同 + 3 文件戳升 `20260815-course-middle-v1`；定向 66/66 |
| R6 | 全程约束：零新 localStorage key；今日学习页/数据结构/侧边栏零改动；npm test 全绿；node --check prj/app.js 通过 | [x] | [x] | [ ] | `npm test` 275/275；`node --check prj/app.js` 0；`git diff --check` 0 |
