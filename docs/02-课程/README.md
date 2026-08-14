# 02-课程 · 索引

> 整理日期：2026-08-15。本目录是"课程内容"的唯一入口，分两层：**跨学科合同层**（`幼儿课程方案/`）+ **单科执行资料包**（七个学科文件夹）。两层是设计决策（见 `docs/00-总控/决策记录.md` D-002），不要合并。

## 两层结构与优先级

| 层 | 目录 | 管什么 | 冲突时 |
| --- | --- | --- | --- |
| 跨学科合同 | `幼儿课程方案/`（00-总控 ～ 08-实施与验收） | 教什么算会、数据与奖励边界、跨科验收 | 合同问题以它为准 |
| 单科执行 | 七个学科文件夹（下表） | 60 日课程表、教案模板、家长手册、版权规范、research | 单科执行细节以它为准 |
| 事实基准 | `prj/` 代码 + `tests/` + `docs/00-总控/当前状态.md` | 已实现的功能与数值 | **代码与测试永远压过文档** |

## 学科资料包（标准结构：00-README ～ 05-资料生产与版权规范 + research/）

| 学科 | 目录 | 运行时对应 | 充实度（2026-08-15 评估） |
| --- | --- | --- | --- |
| 识字 | `识字/` | `preschool-literacy`（引擎较深） | 薄大纲（四段式 + 60 日分段表） |
| 数学 | `数学/` | `preschool-math`（引擎较深） | 薄大纲（L1–L4 分级表） |
| 古诗 | `古诗/` | `preschool-poetry` | 占位骨架 |
| 英语 | `英语/` | `preschool-english`（引擎较深） | 骨架，细节外挂到自然拼读 |
| 自然拼读 | `自然拼读/` | `preschool-phonics`（英语子路线 `subroute: phonics`） | **最充实**（自研方案 + research 证据链 + PDF） |
| 运动与专注 | `运动与专注/` | `preschool-exercise` / `preschool-focus` | 占位骨架 |
| 成长游戏 | `成长游戏/` | 三世界游戏 + 阳光账本 | 占位骨架 |

**目录名不能改**：`tests/preschool-subject-packs.test.mjs`、`tests/phonics-course-data.test.mjs`、`scripts/generate-preschool-subject-packs.mjs`、`scripts/extract-open-source-phonics-reference.py` 都按 `docs/02-课程/<学科>` 路径断言/读取。

## 自然拼读为什么出现两次

- `幼儿课程方案/04-英语/自然拼读/` = 英语线下的**执行合同摘要**（阶段表、掌握规则）。
- `02-课程/自然拼读/` = **完整专项资料包**（方案长文、research、素材）。
- 两处阶段表接近同文复制，改动时**先改资料包，再同步合同摘要**，避免漂移。

## 已知不一致（待对齐清单，详见 `docs/01-方案/2026-08-15-学习内容体系优化/`）

1. 每日核心任务数：合同写 3 项，代码与综合改进规划是 6 项 → 以代码为准，合同待修订。
2. 奖励数值：`00-总控/数据与奖励合同.md` 与运行时数值不一致 → 以 `prj/` 代码 + `docs/data-model.md` 为准。
3. 识字目标：分方案"60 日 60–80 字" vs 运行时 240 字/目标 1500 → 文档落后于产品。
4. 识字 60 日主题分段：合同层与资料包层不完全对齐。

## 内容生产管线（谁消费这些文档）

```text
docs/02-课程/<学科>/（60 日教案）
  → scripts/generate-preschool-subject-packs.mjs
  → prj/data/preschool/<学科>/{route,lessons,bank,review-rules}.json
  → scripts/build_lesson_pack.py → prj/preschool-lesson-pack-data.js
  → prj/config.js childCourses ← prj/app.js 渲染学习专区
```

写课程文档时保持 `lessons.json` 需要的字段口径（day / activityType / fourSteps / evidence / reviewTags）。
