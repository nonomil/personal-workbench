# Visual Match Loop · 密度与伙伴陪伴

## Target

把幼儿三主题工作台从“每个页面都被大方块填满”收敛为更接近参考图的游戏学习画布：侧栏是紧凑入口卡，主区保留一块有呼吸感的场景，任务/学习模块使用中等密度卡片，底部增加主题伙伴陪伴带。布局、层级和节奏对齐参考图；不复制第三方角色的原图。

## Inputs / evidence

| Evidence | What it tells us |
| --- | --- |
| `codex-clipboard-251ddebd-ffec-48d3-9465-eb54faea55ae.png` | 首页：紧凑侧栏、状态条、左侧主任务气泡、右侧伙伴卡、中央留白场景 |
| `codex-clipboard-a896ebf6-9228-4621-8f8e-26da66a4b027.png` | 课程详情：主内容只保留一个焦点面，底部放紧凑的必做/冒险入口 |
| `codex-clipboard-a73ef125-831f-4373-8ca7-4bc311fcf5d6.png` | 学习页：小模块分组，伙伴角色落在内容底部形成陪伴感 |
| `G:\UserCode\跨平台采集器\notes\工具\我用 AI Codex 复刻视觉稿翻车后，imgGen + Loop 循环工程精准复刻了 UI.md` | 先基线截图，再按 Top 3 差异单轮修正 |
| `G:\UserCode\跨平台采集器\notes\游戏化学习工作台\✨给3岁女儿手搓布鲁伊主题AI学习工作台1.0\✨给3岁女儿手搓布鲁伊主题AI学习工作台1.0.md` | 儿童工作台的内容分区、伙伴陪伴和游戏化入口参考 |

## Scope

- Routes: `#overview`, `#courses`, `#courses?course=preschool-poetry`
- Themes: `garden-defense`, `voxel-adventure`, `platform-quest`
- Baseline viewport: 1280×720 desktop; smoke check 1024×768 and Android landscape contracts
- Allowed files: `prj/app.js`, `prj/preschool-workbench/index.html`, `prj/css/preschool/49-reference-density-companion.css`, focused UI test/evidence files
- Explicit exclusions: business state, course data, API, speech, persistence, unrelated adult/child workbenches, new third-party artwork

## Acceptance signal

- Main content no longer consists of oversized full-width blocks at desktop width.
- Home task destinations become a compact secondary band, leaving a visible scene/companion layer.
- A theme-specific companion rail is visible near the lower edge without covering actions.
- All three theme routes retain their own art/palette and continue to navigate.
- No horizontal/vertical overflow in the target viewport; no new console errors.

## Loop cadence / stop rules

- One baseline and one after screenshot per bounded iteration.
- Each iteration fixes at most the Top 3 visual differences.
- Stop when the acceptance signal is met, two consecutive iterations show no improvement, evidence capture fails, or scope expands.

## Iteration 0 · baseline

- Screenshots: `iteration-00-*.png`
- Top 3 differences: (1) 3×3 task wall dominates the scene; (2) current content blocks are visually too tall/opaque; (3) companion appears only as a small upper-right capsule, with no lower companion presence.

## Iteration 1 · compact density + companion rail

- Screenshots: `iteration-01-garden-home.png`, `iteration-01-voxel-adventure-home.png`, `iteration-01-platform-quest-home.png`
- Top 3 changes: (1) desktop task tiles compress to a readable 58px card band; (2) the scene keeps a larger open visual field; (3) each theme gets a three-item companion rail along the lower edge.
- Desktop browser check: all three themes render 3 loaded companion images, rail bounds `y=618..668`, exit buttons bounds `y=677..711`, and document bounds `1280×720` at a `1280×720` viewport after settling.
- Android landscape check: the diagnostic contract reports `.preschool-home-companion-rail { display: none }`; native home frames remain bounded and the companion rail adds no pager row.
- Scope remained within `app.js`, preschool workbench HTML/CSS, focused tests, and evidence files; no course data, API, speech, persistence, or new third-party art was changed.
