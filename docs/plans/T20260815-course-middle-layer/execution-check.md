# execution-check：第一次写代码前的门控

> 全部核对完在末尾写"放行结论"，否则不得改文件。

## 1. 基线

- [x] `npm test` 通过，用例数与退出码：269/269，退出码 0
- [x] `node --check prj/app.js` 通过

## 2. 工作区处置

- [x] `git status` 列出与本包文件域（`prj/app.js`、`prj/css/preschool*`、`prj/preschool-workbench/index.html`、`tests/`）重叠的未提交文件：`prj/app.js`、`prj/css/preschool-workbench.css`、`prj/css/preschool/34-course-wall.css`、`prj/css/preschool/35-course-flashcards.css`、`prj/preschool-workbench/index.html`、`tests/preschool-workbench-refresh.test.mjs`、`tests/preschool-lesson-mistakes.test.mjs`、`tests/preschool-math-practice.test.mjs`
- [x] 有重叠 → 已请示；用户裁决「你自己决定，你自己执行」。执行者选择：在当前未提交树上继续，只追加中间层，不回滚/不覆盖并行会话改动。

## 3. 在途工作核对（本包特有）

- [x] `T20260815-B2-practice-review` 状态 = `pending`（README / `.meta.yaml` / test-report 阶段 0 均未开始）；不在途
- [x] 缓存戳当前值 = `20260815-poem-full-v1`（css 第 9 行 / app.js 第 64 行）；断言此戳的测试文件清单 = `tests/preschool-workbench-refresh.test.mjs`、`tests/preschool-lesson-mistakes.test.mjs`、`tests/preschool-math-practice.test.mjs`（3 个，未超 5）

## 4. 方案一致性

- [x] 已通读 `docs/01-方案/2026-08-15-学习专区中间层改版方案.md` 全文
- [x] 已通读本包 task.md 的"不碰/硬性约束/禁止顺手优化/升级条件"
- [x] 确认理解：大卡整体进折叠区不拆改；预览只读派生；action 语义不变

## 放行结论

- 日期：2026-08-15
- 核对结果：基线 269/269 全绿；B2 不在途；缓存戳测试 3 个；工作区与本包文件域重叠，已按用户授权在当前树上追加。
- 是否放行：**放行**。不覆盖并行会话已有翻卡/古诗/学科页改动。
