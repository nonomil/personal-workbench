# 五个实施任务

## 任务 0：基线和脏工作树保护

先运行并记录：

```powershell
git status --short
node --test tests/preschool-learning-companion-writing.test.mjs
node --check prj/app.js
npm run release:verify
```

另记录当前全量 `npm test` 的结果，明确区分本次改动与既有失败。禁止 `git reset --hard`、`git clean -fd`、`git checkout --`、`git stash`；不要整体提交当前 50 多个文件，也不要单独处理 43–50 层。

## 任务 1：开关和根 class（先红后绿）

文件：`tests/preschool-learning-scene-v1.test.mjs`、`prj/app.js`。

1. 先写静态失败断言：没有开关不加 class；精确的花园识字 today 地址加 class；错误主题、课程、tab、route 不加 class。
2. 运行定向测试，确认失败原因是新开关不存在。
3. 在 `getRequestedPreschoolTheme()` 下方增加一个纯 URL 判断函数。
4. 在 `renderPreschoolLiteracyCardWall()` 的根 class 中只增加条件 `learning-scene-v1`。
5. 重新运行测试和 `node --check prj/app.js`。

## 任务 2：51 CSS 皮肤

文件：`prj/css/preschool/51-learning-scene-v1.css`、`prj/preschool-workbench/index.html`。

1. 先在测试中加入失败断言：51 CSS 被加载且位于 50 CSS 之后；所有规则包含 `learning-scene-v1` 边界。
2. 新增 51 CSS：复用 `--child-scene-image`、现有字卡墙和伙伴带，优化背景可见度、面板层级、卡片密度和底部陪伴关系。
3. 桌面增强只放在 `html:not(.is-android-app)` 与 `@media (min-width: 1024px)` 内。
4. 不新增动画；不覆盖 50 层的 `learning-companion-sway`、`preschool-no-motion` 和 reduced-motion 合同。
5. index 只新增 51 CSS 引用，并更新 app.js cache query；保留 `learning-companion=writing-v1`。

## 任务 3：机械护栏测试

文件：`tests/preschool-learning-scene-v1.test.mjs`。

覆盖以下可静态证明的合同：

- 精确开关、课程、主题、路由和 tab 边界；
- 根 class 只出现在识字卡墙模板；
- 51 CSS 加载顺序、规则隔离和桌面媒体门禁；
- Android 规则不存在角色放大覆盖，且增强选择器带 `html:not(.is-android-app)`；
- 既有 `learning-companion-sway`、错峰、`preschool-no-motion`、`prefers-reduced-motion` 仍存在；
- app.js cache query 中 `learning-companion=writing-v1` 未被删除；
- 不新增控制器、素材 manifest、storage 或外部 TTS 接入。

## 任务 4：浏览器和回归

使用现有静态服务和 Codex 浏览器打开：

```text
http://127.0.0.1:4174/preschool-workbench/index.html?theme=garden-defense&learning-scene=episode-v1#courses?course=preschool-literacy
```

验证 1280×720：背景可见、学习区不被伙伴遮挡、字卡为多卡墙、Canvas 可落笔、伙伴在下方且轻微动画。再打开同 URL 去掉 `learning-scene=episode-v1`，确认稳定页无场景根类且手写/按钮仍可用。

最后运行定向测试、`node --check prj/app.js`、`npm run release:verify`，再视时间运行全量 `npm test` 并按基线记录失败，不把既有失败归因给 v1。

