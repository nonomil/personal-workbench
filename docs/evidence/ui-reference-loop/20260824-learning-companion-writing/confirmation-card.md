# Visual Match Loop · 学习伙伴与手写练习

## Target

把学习详情页收敛为“上方当前学习内容、下方练习操作、底部主题伙伴陪伴”的单焦点布局；识字页增加参考图中的田字格手写练习和淡笔顺提示，同时让三个世界主题的角色只做轻微、可关闭的左右晃动/呼吸/漂浮。

## Inputs / evidence

| Evidence | What it tells us |
| --- | --- |
| `C:/Users/<local-user>/AppData/Local/Temp/codex-clipboard-cf769cb5-9e88-449e-9281-5817e3d009a2.png` | 学习内容在上、学习伙伴在下；识字页支持手写和笔顺提示 |
| `G:\UserCode\跨平台采集器\notes\游戏化学习工作台\✨给3岁女儿手搓布鲁伊主题AI学习工作台1.0.md` | 内容分区、伙伴陪伴和游戏化节奏参考 |
| `G:\StudyCode\个人工作台\docs\evidence\ui-reference-loop\20260824-density-companion\iteration-01-garden-home.png` | 上一轮三主题伙伴视觉语言与密度基线 |

## Scope

- Routes: `#courses?course=preschool-literacy`, `preschool-pinyin`, `preschool-phonics`, `preschool-english`, `preschool-poetry`, `preschool-exercise`, `preschool-summer`
- Themes: `garden-defense`, `voxel-adventure`, `platform-quest`
- Viewports: 1280×720 desktop; 800×360 and 915×412 Android landscape contracts; narrow portrait smoke check
- Allowed files: `prj/app.js`, `prj/preschool-workbench/index.html`, `prj/css/preschool/50-learning-companion-writing.css`, focused UI test/evidence files
- Explicit exclusions: business state schema, course banks, API, speech engine, persistence, unrelated workbenches, third-party character tracing or new external dependencies

## Acceptance signal

- Learning pages keep the current content as the visual priority and place a compact companion rail at the bottom of the same page content.
- Three themes use their existing original assets; companion motion is subtle and disabled by reduced-motion preference or the workbench motion setting.
- Literacy cards expose a usable canvas with grid, stroke guide, undo, clear and done controls; pointer/touch drawing updates the visible status.
- Touch targets are at least 44px where practical; no horizontal overflow or new Android pager height regression; no console errors.

## Loop cadence / stop rules

- Capture a baseline and an after screenshot for the bounded learning-page iteration.
- Fix the top three visual/interaction differences per iteration.
- Stop when the acceptance signal is met, two consecutive iterations show no improvement, evidence capture fails, or the scope would expand.
