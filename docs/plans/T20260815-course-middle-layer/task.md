# task：学习专区中间层改版

- 级别：L2（轻量）
- 优先级：P1
- 源头：`docs/01-方案/2026-08-15-学习专区中间层改版方案.md`（第 3 节实施设计可直接照做）

## 1. 目标

1. **A 墙卡今日预览**：`renderPreschoolCourseWallCard` 加一行 `getPreschoolCourseTodayPreview(course)`——翻卡科显示今日张数、古诗显示今日诗题、专注显示今日训练、运动/暑假静态文案；当日完成显示"今天做完啦 ✓"。
2. **B classic 拆层**：`renderPreschoolCourses` classic 分支删 library-note，改为 `renderPreschoolCourseMenu(course)`（回今日页主按钮 + 今日课 + 听一听/看资料 + `<details>` 家长看详情内原样包 `renderPreschoolCourseCard(course, true)`）。
3. **C 文案**："看看资料和其他练习"→"更多练习"（两处）；暑假"浏览完整资料库"→"更多资料"。

## 2. 只改这些文件

- `prj/app.js`：新增 `getPreschoolCourseTodayPreview` / `renderPreschoolCourseMenu`；改 `renderPreschoolCourseWallCard`、`renderPreschoolCourses` classic 分支、三处按钮文案
- `prj/css/preschool/35-course-menu.css`（新建）+ `prj/css/preschool-workbench.css`（追加 @import）
- `prj/preschool-workbench/index.html`：缓存戳
- `tests/`：refresh 合同测试 + 侦查发现的全部断言缓存戳的测试

## 3. 明确不碰

- 第二层今日学习页全家（`renderPreschoolSubjectTodayPage` 及翻卡/古诗/运动/专注/暑假各渲染函数的内容与交互，仅 3.3 文案按钮例外）
- `renderPreschoolCourseCard` 及其 8 层子渲染函数内部（整卡进折叠区，不拆不删）
- `dailyPlans` / `courseProgress` 数据结构、localStorage、侧边栏 course-lanes、首页工作流卡、三世界游戏
- `open-plan-practice` 等练习打开逻辑（B2 的域）

## 4. 硬性约束

1. 零新 localStorage key。
2. 预览与菜单全部从既有确定性数据派生，**禁止新造第二套"今天该学什么"逻辑**（复用 `PRESCHOOL_FLASHCARD_SIZE`、day-index 推导、`course.lessons`）。
3. 墙卡渲染是只读操作，**不得污染 `ui.courseCards`**（古诗今日诗题需抽纯派生，不能直接调 `getPreschoolPoetryTodaySession`——它会写 ui 状态）。
4. 孩子层菜单按钮 ≤ 5 个；触控区域 ≥ 44px。
5. `flashcard-classic` / `flashcard-cards` action 名与 `ui.courseClassic` 语义不变（只换渲染落点）。

## 5. 禁止顺手优化

不重构今日学习页；不顺手改墙卡的点/状态字逻辑；不顺手把大卡子渲染函数搬去家长报告区（后续单独评估）；不顺手清理其他 CSS。

## 6. 升级条件（停下来问用户）

- 侦查发现 B2 已开工且在改 `prj/app.js` → 停，请示先后顺序
- 各科"当日完成"判定口径无现成函数、需要新造判定逻辑 → 停，带侦查证据请示口径
- 断言缓存戳的测试文件超过 5 个 → 停，给清单请示
- 发现 `renderPreschoolCourseResources` 输出无法安全嵌入菜单（如内部有布局容器冲突）→ 允许菜单内只放"看资料"跳转按钮（落到家长详情展开），在 test-report 记录取舍
