# 任务：场景沉浸式工作台（总任务）

## 目标

幼儿版工作台从"满屏卡片的管理感"升级为"上面大卡学习、下面动画人物陪伴"的沉浸结构：人物可点击进栏目、人物回应答题结果、首页有会动的舞台。学习数据、练习逻辑、课程引擎全部不动。

## 输入

- 源头方案：`docs/plans/2026-08-26-scene-immersion-redesign.md`（§3 首页、§4 学习页、§5 奖励页、§6 动画技术、§7 素材清单）
- 现有基础设施：`.child-game-scene`（背景 DOM/CSS）、`renderPreschoolCompanionRail`（伙伴）、`preschoolAsset()`（素材引用）、`theme.assetMap`（主题映射）、`body.preschool-no-motion`（动效开关）
- 已落地基线（Phase 0）：`prj/css/preschool/56-phone-landscape-focus.css` 的沉浸式识字段

## 产出（跨切片汇总）

1. `preschool:answer` 自定义事件与场景条反馈（S1）
2. 可点击角色导航 + 主题角色映射表（S2）
3. 首页"主卡 + 舞台"三层结构 + 背景动画（S3）
4. 角色走动动画零素材版（S4）
5. 奖励页舞台化（S5）
6. 每片：新增/更新测试文件 + `npm test` 基线不退 + 缓存戳 + 视觉验收截图

## 边界

- 不动学习引擎（`preschool-literacy.js` / `preschool-pinyin.js` / `child-courses.js` 等）的内容与记账
- 不新建 storage key；不加 JS 动画库；运行时无网络
- 新素材仅限 §7 清单且 S5 前不生成；S4 必须零新素材
- 三套主题（garden-defense / voxel-adventure / platform-quest）行为一致，不允许只做花园主题
- 桌面网页（无 `is-android-app`）与 Android 竖屏布局不得被本包改变；新舞台规则限 `html.is-android-app` + 横屏媒体查询（参照 56 号文件写法）
- 旧 WebView 兼容红线见 README"核心设计原则"

## 完成定义

`acceptance.md` 逐片项全勾 + 5 个切片全部 landed + MuMu（或 1463×616 浏览器）与 800×360 双档视觉验收记录；本包专测必须全绿。全仓历史基线以 `acceptance.md` 的实测例外记录为准，不在本包范围内修复 blocklegend、platform-physics、play-mods、voxel-craft 或旧缓存断言失败。

## 执行结果（2026-08-27）

- S1→S5 已按序完成；S2 仅在 S1 已产出的角色 DOM 上追加栏目映射、点名和点击延迟，没有重构 S1。
- `node --test tests/preschool-scene-*.test.mjs`：24/24 通过。
- `node --check prj/app.js`：exit 0。
- 800×360 与 1463×616 截图已归档到 `screenshots/`；矮屏识字卡墙重叠已修复，并补充回归测试。
- 全仓 `npm test`：992 项，901 通过、85 失败、6 跳过；失败为既有 WIP/历史断言，已在验收手册中明确隔离。
