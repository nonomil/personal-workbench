# T20260827-scene-immersion — 场景沉浸式工作台（动画背景 + 人物舞台 + 卡片学习层）

> 源头方案：`docs/plans/2026-08-26-scene-immersion-redesign.md`（必读，含三层构图、人物映射表、动画技术约束）
> 参考输入：`G:\UserCode\跨平台采集器\notes\游戏化学习工作台\✨给3岁女儿手搓布鲁伊主题AI学习工作台1.0\`（布鲁伊参考）
> 基线：2026-08-26 已落地的沉浸式识字页（Phase 0：去框、扁平大字卡、底部场景条）

## 为什么有这个包

用户反馈当前工作台"学习负担太重、卡片单调"。布鲁伊参考的核心是**三层构图 + 陪伴感**：上面少量大卡学习、下面动画场景和人物，人物即导航、人物回应学习。本包把"场景 + 人物"从装饰升级为导航层和情绪层，学习卡片区保持安静不动。

## 核心设计原则（红线，所有子任务必须遵守）

1. **卡片不动、角色动**：学习卡片区（字卡/题卡本身）不做循环动画；动画只发生在底部舞台和答题反馈瞬间。
2. **动画只用 `transform` / `opacity`**：禁止动画 `box-shadow / top / left / width / height`。旧安卓 WebView（Chromium 8x~10x）必须流畅。
3. **CSS keyframes 优先，JS 只切 class**：状态（待机/点击/欢呼/安慰）= class 切换，不引入 JS 动画库。
4. **尊重动效开关**：`body.preschool-no-motion`（现有 `motionEnabled` 偏好）与 `prefers-reduced-motion` 下全部降级为静态。
5. **每屏同时运行的动画元素 ≤ 8**；粒子 ≤ 6 且只触发 2s。
6. **旧内核 CSS 兼容**：新 CSS 不得使用 `:has()`、裸 `dvh/svh`（必须前面加 `vh` 回退行）、`color-mix()`。详见 2026-08-26 的兼容修复背景。
7. **不新增 storage key、不新增依赖、运行时无网络请求**。素材优先复用 `prj/assets/generated/` 现有资产。

## 切片一览（按价值排序，按序执行，不并行）

| 片 | 内容 | 预估 | 子文件夹 | 状态 |
| --- | --- | --- | --- | --- |
| S1 | 人物回应学习：`preschool:answer` 事件 + 场景条欢呼/安慰/阳光雨 + 进度语接 bank-levels | 0.5~1 人日 | `S1-answer-feedback/` | `landed` |
| S2 | 人物即导航：角色可点击进栏目 + 气泡 + 点击动画 + 主题映射表 | 0.5 人日 | `S2-character-nav/` | `landed` |
| S3 | 首页三层化：主卡 + 大舞台 + 背景动画（云/太阳）；任务列表移入第二分页 | 1 人日 | `S3-home-stage/` | `landed` |
| S4 | 走动动画（零素材版）：translateX 往返 + scaleX 翻转 + 颠簸 | 0.5 人日 | `S4-walk-motion/` | `landed` |
| S5 | 奖励舞台化：底部舞台养宠物、收集品上架 | 1 人日 | `S5-reward-stage/` | `landed` |

序列帧走动（原方案 P3-b，需新素材）**不在本包**，待 S4 验收后再单独立包。

## 门控

- 每片：实现 → `npm test` 基线不退（当前 886 通过 / 71 历史遗留失败）→ 浏览器视觉验收 → 缓存戳 → 下一片。
- 视觉验收统一流程见 `acceptance.md`。
- 每片完成后在本 README 状态表更新 landed。

## 关键代码锚点（全包通用）

| 锚点 | 位置 | 说明 |
| --- | --- | --- |
| 场景条 CSS | `prj/css/preschool/56-phone-landscape-focus.css` | ≤480 横屏层：识字场景条、扁平字卡、滚动兜底 |
| 伙伴渲染 | `prj/app.js` `renderPreschoolCompanionRail`（约 5839 行） | 三角色 markup（art + name + note） |
| 识字字卡 | `prj/app.js` 约 6050 行 | `preschool-literacy-wall-card` 模板；`flashcard-reveal` / `flashcard-mark` / `literacy-speak` 动作 |
| 答题判定 | `prj/app.js` click 委托内 `flashcard-mark`、`lesson-answer` 分支 | S1 的事件派发点 |
| 背景场景 DOM | `prj/preschool-workbench/index.html` `.child-game-scene` | 已有 sun/cloud/ground 元素 |
| 背景场景 CSS | `prj/css/preschool/44-child-game-world.css` 49 行起 | S3 的升级对象 |
| 主题资产映射 | `prj/app.js` `applyPreschoolTheme`（约 792 行）`theme.assetMap` | S2 的角色映射挂点 |
| 动效开关 | `prj/app.js` render() 内 `preschool-no-motion` class 切换 | 全片降级开关 |
| 素材目录 | `prj/assets/generated/preschool-pvz-2d/published/` 等 | sunflower/peashooter/wallnut/sun-token/garden-walker-v5、voxel/platform companion |
| 本地预览 | `node tmp/serve-prj.mjs` → `http://127.0.0.1:8765` | 加 `?sim-android=1` 模拟 APK |

## 当前状态

- 任务 ID：`T20260827-scene-immersion`
- 状态：`landed`（S1→S5 已按顺序落地；S2 在 S1 的场景条 DOM 产出上追加映射与点击逻辑，未重构 S1）
- 本包专测：`node --test tests/preschool-scene-*.test.mjs` = **24 pass / 0 fail**；`node --check prj/app.js` 退出码为 0。
- 全仓实测：`npm test` = **992 tests / 901 pass / 85 fail / 6 skipped**。失败集中在现有 blocklegend、platform-physics、play-mods、voxel-craft 以及历史缓存断言等 WIP 范围；本包 24 项场景专测全部通过，未把这些无关失败改写成场景回归。

## 执行记录（2026-08-27）

1. 按 `S1 → S2 → S3 → S4 → S5` 顺序完成：答题反馈、人物导航、首页三层舞台、零素材走动、奖励舞台与展示架。
2. 完成双视口浏览器走查：800×360 矮屏与 1463×616 高分横屏；三主题角色映射截图已归档到 `screenshots/`。
3. 完成旧 WebView 兼容扫描：无 `:has()`、`color-mix()`；`dvh` 均有 `vh` 回退；无裸 `svh`。
4. 修复矮屏识字卡墙重叠：在 `56-phone-landscape-focus.css` 追加 `short-card-wall=v1`，恢复 4 行可滚动布局；真实 800×360 复验可命中首张“会了”，横向溢出为 0。
5. 缓存戳均采用追加方式：`app.js` 追加 `scene-fb/nav/home-stage/walk/reward-stage=v1`；44/53/56 号 CSS 保留既有前缀并追加对应场景戳。

截图索引：[`screenshots/`](./screenshots/)。全仓测试的 WIP 失败与本包专测结果分开记录，详见 [`acceptance.md`](./acceptance.md)。
