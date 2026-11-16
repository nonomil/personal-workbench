# 测试报告

## 短横屏布局修复回归（2026-08-28）

本轮目标：修复识字学习页与首页在 800×360 短横屏下的元素堆叠/挤压（纯 Web 与 `?sim-android` 两模式均复现）。

### 根因与修复

- Web 模式：`40-literacy-uplift.css` 旧横屏规则把 `is-card-wall` 锁死 `calc(100dvh - 67px)` + `44px 44px minmax(0,1fr)`，新版四段学习布局（焦点字/写一写/今日队列/卡片墙）被压成 93px，写一写行塌成 0。修复：改为 `min-height` + 自然文档流滚动。
- Android 模式：`56-phone-landscape-focus.css` 主题作用域"场景聚焦"规则 `auto minmax(110px,1fr)` 让 `auto` 舞台行与 50 层四段 areas 互相挤压，焦点卡按钮被裁、玻璃底在花圃背景上不可读。修复：舞台行固定 `minmax(0,1fr) 72px`，学习卡限定 `min(360px, 68%)` 宽、纸底不透明、字号档位收紧。
- 首页：`home-top` 被旧 `!important` `height:100%` 与 `justify-self:center` 叠加收缩成 196×76，三段内容全部溢出到场景。修复：`width:min(400px,64vw)` + `height:auto !important` 收口。
- 缓存戳：`40-literacy-uplift.css?v=20260828-literacy-layout-v2`、`56-phone-landscape-focus.css?v=20260828-phone-focus-v2`。

### 浏览器回归证据（127.0.0.1:8642，本机 Chrome 内核）

- 800×360 Web：识字页焦点卡完整、写一写/卡片墙自然滚动无叠压；首页 hero 三段全可读。
- 800×360 `sim-android`：识字舞台卡完整（听一听/会了按钮可用），首页目标横幅+贴纸行+任务卡+CTA 全部正常；卡片墙 2×2 分页、英语课程三页 pager（任务/概览/数据面板）、植物大战页、garden-defense 游戏页均无溢出。
- 1280×800 `sim-android`：识字页大舞台卡与底部伙伴正常；首页目标卡居中、按钮水平排布。
- dist 已用 `npm run android:prepare` 重建，确认新缓存戳与两处 CSS 修复已拷入（下轮 `gradlew assembleRelease` 打包即带修复）。

### 第三轮：走道伙伴完整露出 + 僵尸式巡逻（2026-08-29）

用户反馈走道角色下半身被裁掉，希望他们像僵尸一样左右走动。

- 裁切根因：50 层给所有 companion rail 设了 `max-height: 44px`，而 56 层的列表保持 `min-height: 110px`——伙伴图（28vh≈100px 高）锚底后脚部掉到屏幕外；且 art 包装器是 auto 行网格，img 百分比高度解析失败按自然宽缩放（828px 原图 × max-width → 187px）。
- 修复（`56-phone-landscape-focus.css`）：rail 解除 `max-height`、list/cell/art 三层改 flex 定高链，img `height:100% + max-width:21vw` 完整缩进 64/72px 走道行。
- 走动复用首页 `is-walker` 系统：课程走道伙伴标记 `is-walker`（中间一位 `is-stage-idle` 待机），`preschool-stage-walk` 9.5s/趟、步幅 clamp(24px,5.5vw,56px)；JS 折返翻面监听从首页舞台放宽到所有 `.is-walker`（`app.js`，戳 `stage-walk=v1`）。
- 无障碍：`preschool-no-motion` 与 `prefers-reduced-motion` 下全部静止。
- 实测：三位伙伴 67px 完整可见（底边 348/视口 360）；两 Walker 3 秒内位移 ±19px 且相位相反；~11s 后 `is-flipped` 生效（回头）。
- 缓存戳：`56-phone-landscape-focus.css?v=20260829-phone-focus-v4`、`app.js…&stage-walk=v1`；dist 已重建。

### 第六轮：跳转游戏保持全屏（2026-08-29 续）

用户反馈：做完几张卡进入花园游戏后画面变小（小窗口），希望保持原来的全屏背景。

- 根因：工作台 `openPreschoolWorldGame()` 拼 URL 时只带 `theme` 与 `from`，丢掉了安卓环境标记。游戏端 `game.js` 靠 `?sim-android` 参数或 Capacitor 探测加 `is-android-app`；标记缺失时走桌面布局，`#world-canvas { max-height: min(62vh, 640px) }` 在 360px 矮窗里把画布压成 ~223px 小窗。
- 修复：跳转时若工作台 `<html>` 带 `is-android-app`（真机 Capacitor 或模拟参数都会加），URL 追加 `&sim-android=1`。真机本身能探测到，此改动主要让浏览器模拟与真机行为一致，也兜底个别 WebView 探测失败的场景。
- 实测：从 #battle 点「去花园游戏」→ 游戏 URL 带 `sim-android=1`，`<html class="is-android-app">`，body 锁 100dvh/overflow hidden，选卡页全屏（顶栏+植物卡+开始战斗），不再出现小窗口。
- 缓存戳：`app.js…&stage-walk=v5`；dist 已重建。

### 第五轮：三列战场（伙伴纵队 / 学习卡 / 僵尸纵队）+ 会了射击（2026-08-29 续）

用户方案：豌豆射手挡住选项卡 → 左列上中下站伙伴，右列三只僵尸，会了卡片时豌豆射手发射、掉阳光，游戏与学习结合。

- 布局（`56-phone-landscape-focus.css`，安卓横屏场景页）：页面网格改三列 `auto 1fr auto` 单行——左列向日葵/豌豆射手/坚果纵队（图高 clamp(56px,19vh,74px)），右列 zombie-basic/conehead/buckethead 纵队（clamp(70px,24vh,92px)，蹒跚 lurch 动画），中列学习卡占满高度；走道行取消。
- 卡片左右分栏（`is-duo`）：左格 = 大字母 + 2×2 例字格，右格 = 竖排 听拼音 / 还不会 / 会了 全宽按钮，旧底部裁切问题消除。
- 会了连锁（`app.js`）：`flashcard-mark` known=1 → `firePreschoolScenePea()`（豌豆射手后坐 → 豌豆 fixed 定位横飞到最近僵尸行 → 僵尸 is-hit 闪白摇晃）+ 向日葵上方 +3 阳光飘字 + `awardSunlight('flash:课程:字', 3)`（awardedIds 幂等，重复会了不重复发）。关键坑：commit 会重渲染抹掉特效节点，fire 必须 setTimeout(80) 挂在渲染后的新 DOM 上。
- 僵尸列仅 garden-defense 主题渲染，非安卓/网页保持隐藏（文件尾 `.preschool-scene-zombie-rail{display:none}` 基线）；no-motion/reduced-motion 全静止。
- 实测：豌豆飞行 `--pea-fly: 621px`、is-firing/is-hit/sunpop 各 1、900ms 后自清理；+3 阳光 toast 与既有每日点亮(+10)叠加正常；拼音/识字两页三列布局回归通过。
- 缓存戳：`phone-focus-v7`、`app.js…&stage-walk=v4`；dist 已重建；识字卡墙测试 6/6（flashcard-mark 断言同步更新为多行实现）。

### 第四轮：拼音例字卡 2×2 排版（2026-08-29 续）

用户反馈拼音卡点开「点开看例字」后，例字/拼音/同音/近音四块单列竖堆把卡片撑到 304px，底部"近音"块被舞台裁掉。

- 修复（`56-phone-landscape-focus.css`，作用域 `:not(.is-card-wall)` 场景页）：`.preschool-flashcard-rows` 改 2×2 网格、卡簇定宽 `min(360px, 62%)`；标签 10px、值行 13px 最多两行（同音字串是学习内容不做整串省略），每格 `min-width:0` 防溢出。
- 实测：卡 360×175、底边 247 ≤ 舞台底 278；同音"八·不·部·步·布·比"完整可见；识字卡墙页不受影响（选择器排除）。
- 缓存戳 `phone-focus-v5`；dist 已重建；识字卡墙测试 6/6。

### 第二轮：场景课程页（拼音/数学/古诗）修复（2026-08-28 续）

同一病灶在其余场景聚焦课程页的三个变体，全部收口在 `56-phone-landscape-focus.css`：

- 古诗（tone-pink）：诗卡被 cluster 的 `1fr/auto` 行挤成 27px 滚动细条、自评块反占 125px。修复：走道收窄 64px、自评压成一行（隐藏副标题）、诗头插画 44px，诗卡获得 ~120px 滚动区。
- 数学/拼音/英语/专注力（非识字卡墙）：学习卡被 56px 定行裁切，题面/选项溢出压到按钮上。修复：走道统一 64px、卡簇 `grid-template-rows: none` 按内容自增、cover 单行化（原 `min-height:80px` 双行堆叠）。
- 场景玻璃底统一提高不透明度（garden `.38→.68`，platform `.48→.78`），短横屏下文字不再被花圃背景吃掉。
- 逐页截图回归：拼音（b 卡+听拼音+还不会/会了完整）、数学（4+1=? 选项 7/5/4 在卡内）、古诗（诗卡滚动+会背了吗+双按钮）、花园基地/奖励商城/错题本/日历/任务清单全部正常。
- 缓存戳最终为 `56-phone-landscape-focus.css?v=20260828-phone-focus-v3`，`40-literacy-uplift.css?v=20260828-literacy-layout-v2`；dist 已重建同步。

### 说明：APK"分辨率"口径

- APK 的 WebView 本就按设备物理分辨率渲染；CSS 视口 ~800×360 是密度归一化结果，非可调"低分辨率"。问题根因是 CSS 布局合同冲突，本次已修，不需要也不建议通过改 WebView density 缩放来"提高分辨率"。

## C1 卡片墙验收（2026-08-24）

本轮目标：确认“今日识字”由单张大卡改为多卡片墙后，在浏览器短屏和 Android APK 中仍能同屏浏览、独立操作，并保持触控尺寸与无横向溢出。

### Codex 浏览器新鲜证据

- 页面：`http://127.0.0.1:4174/preschool-workbench/index.html?v=20260824-literacy-wall-v2#courses?course=preschool-literacy`
- 1280×720：8 张卡全部可见，4 列×2 行；卡墙 `217.203px × 4`、`204px × 2`，卡墙自身无额外滚动，横向溢出为 `false`，按钮尺寸检查 `undersized=[]`。
- 800×360：自动切换为 2 列；卡片 `250×170`，卡墙可滚动（`clientHeight=177`、`scrollHeight=714`），页面锁定 `293px` 且 `overflow:hidden`，横向溢出为 `false`，按钮尺寸检查 `undersized=[]`。
- 两种视口均为 8 张卡、每卡独立听读/提示/会了操作；页面文本不含 Android 不兼容的 `1️⃣`、`🧑` 字形。
- 截图：`screenshots/card-wall-1280x720.png`、`screenshots/card-wall-800x360.png`。

### 真实 Android APK 证据

- 设备：MuMu，ADB `127.0.0.1:16384`；覆盖安装成功。
- APK：`android/app/build/outputs/apk/debug/app-debug.apk`。
- 产物：97,668,205 bytes；SHA-256 `DD18200BE652EC0FD984A6CC57F14FBAF285B065B76F42C9B1E3182571C1BC15`；设备包 `com.nonomil.personalworkbench`，versionName `0.7.4`、versionCode `704`。
- WebView 实测：viewport `1463×640`，页面 `1201×462`，8/8 卡可见，4 列×2 行，页面与卡墙均无溢出，`undersized=[]`。
- 当前调试 WebView 只读采样（CDP `9223`）：document `1463×640`，`scrollWidth=1463`、`scrollHeight=640`，`bodyOverflow=hidden`，`undersized=[]`；已加载 `literacy-wall=v1` 的工作台、卡片墙 CSS 和 `app.js`。
- 逐卡交互：第一次点“看提示”后为 `0/8` 且仅展开当前卡；第二次点“还不会”后为 `1/8`，当前卡变为“再复习”并锁定重复自评。
- 截图：`screenshots/card-wall-android-mumu.png`。

> 历史结论（2026-08-16，已由本轮结果更新）：识字定向门禁 **18/18 通过**；当时仓库全量 `npm test` 为 **468/475**，详见下方历史记录。

## 本轮代码门禁（2026-08-24）

### 卡片墙及识字相关套件

命令：`node --test tests/preschool-literacy-card-wall.test.mjs tests/preschool-literacy-assess.test.mjs tests/preschool-mistake-cards.test.mjs tests/preschool-learning-summary.test.mjs`

- 结果：**24/24 通过，exit 0**。
- 覆盖：8 卡墙渲染、逐卡提示/自评、4×2 与 2 列响应式、Android 触控尺寸、SVG 字形回退、缓存戳，以及识字测评、错字本、学习摘要回归。

### 发布校验

- 命令：`npm run release:verify`
- 结果：**通过，exit 0**；3 个 preschool 主题、2 个通用工作台、5 个资产检查通过，allowlist clean。

### 本轮全量回归

- 命令：`npm test`
- 结果：**801/871 通过，64 项失败，6 项跳过，exit 1**。
- 失败归类：`blocklegend*` 36 项、`platform-physics.test.mjs` 28 项，均为工作区并行分支的既有失败；本轮卡片墙定向套件 24/24 通过，未发现识字改动引入的失败。

## 早期定向回归（2026-08-16）

命令：`node --test tests/preschool-literacy-assess.test.mjs tests/preschool-mistake-cards.test.mjs tests/preschool-learning-summary.test.mjs`

- 结果：**18/18 通过，exit 0**。
- 覆盖：25 题去重与四选一、L1–L5 阶梯、估算/置信度/乱点降置信、历史封顶 24、低置信不刷新 best、阶段映射、家长摘要、错字本、专项复习、8 张打印卡、0/1/N 档案 SVG、首页三大卡与缓存戳。

## 早期 Codex 浏览器手玩（2026-08-16）

- 页面：`http://127.0.0.1:4173/preschool-workbench/index.html?v=20260816-literacy-ui-v7#courses?course=preschool-literacy`
- 缓存戳：`app.js?v=20260816-literacy-ui-v4`、`40-literacy-uplift.css?v=20260816-literacy-ui-v7`、`preschool-literacy.js?v=20260816-literacy-ui-v2`。
- 首页 768px：KPI、主视觉、阶段徽章、三张入口卡、本周连续条和课时列表可见，`document.documentElement.scrollWidth === innerWidth`。
- 高置信测评：完整答完 25/25，结果 **1500 字、置信度 100%、阅读进阶期**，结束无额外阳光。
- 错字本/打印：专项复习可进入；打印 DOM 为 8 个 `.print-card`、48 个练写格；普通屏幕 `#literacy-print-host` 为 `display:none`。
- 打印 CSS：已确认 `@page { size: A4 }`、两列网格、4mm 间距、58mm 卡高、1px dashed 裁切边和练写格十字线。
- 档案/证书：折线、250/500/750 参考线、三项 KPI、打印证书按钮均存在；证书 DOM 含日期 `2026-08-16`、估算量 `1500`、阶段“阅读进阶期”，角花引用本地 `literacy-certificate-corner.png`。
- 截图：`screenshots/home-desktop.png`、`home-390-viewport.png`、`home-768-viewport.png`、`mistakes-768.png`、`archive-768.png`。

## 早期全量回归（2026-08-16）

- 命令：`npm test`
- 结果：**468/475 通过，exit 1**。
- 7 项失败：花园防守板旧断言、花园波次旧断言、课时包数量旧断言、发布树临时下载目录、`bomb` 图标注册、4 个未被 gitignore 的 `creeper` 素材、launcher 缺少既有 `platform-hero.png`。
- 这些失败不在本次识字包改动范围内；包状态保留 `review`，不把全仓门禁写成通过。

---

以下为本包早期执行记录，以上最新结果为准。

> 早期状态记录（已被上方最新结果取代）：S1–S5 代码合同已绿；当时 V2/V3 尚未收口。

## 早期 S1–S5 分片记录（历史）
- 定向：`tests/preschool-literacy-assess.test.mjs` 12/12；`tests/preschool-mistake-cards.test.mjs` 5/5；`tests/preschool-learning-summary.test.mjs` 2/2
- 新增用例：测评出题/阶梯/估算/置信度/历史封顶/错字本排序/专项连对 3 次/打印 8 卡/档案 0-1-N/首页三大卡
- 手工走查：当时未做；最新浏览器结果见上方“最新 Codex 浏览器手玩”。
- 遗留：早期记录中的 V2/V3 待接入已完成；`bomb` 图标注册仍是本包范围外的合同缺口。

## V1 视觉素材记录（2026-08-16）

- 方案：`docs/01-方案/学习项目设计/05-识字视觉与交互优化方案.md`
- 生成器：`scripts/generate_literacy_visual_assets.py`
- 标准化器：`scripts/normalize_literacy_visual_assets.py`
- 生成目录：`docs/01-方案/学习项目设计/img/05-识字视觉优化/generated/`
- 待接入目录：`generated/ready/`
- 产物：主视觉 1、入口图标 3、阶段徽章 4、证书角花 1，共 **9 个 RGBA PNG**
- 技术结果：`generated/ready/manifest.json` 已记录 9 项；四角 alpha 全为 `0`；目标尺寸分别为 512×512、384×384、256×256；非透明像素未发现强去背绿残留
- 内容检查：素材不含中文、字母、数字、logo、水印；中文文案仍由 HTML/CSS 叠加
- 状态：早期记录为 ready-for-visual-review；现已复制到 `prj/` 并完成 CSS/HTML 接线。

## 早期回归记录（历史，最新结果见文首）

- 资产与文档验证：通过。`ready/manifest.json` 9 项、RGBA、四角透明、目标尺寸和去背绿检查通过；两份新增 Python 脚本 `py_compile` 通过；目标设计文档 UTF-8 无替换字符。
- 识字/摘要定向：**15/17**。通过错字本 5 项及大部分识字合同；2 项失败均为当前工作区已有缓存戳漂移——测试仍要求 `app.js?v=20260816-literacy-ui-v1`，实际 HTML/脚本已是 `v3`。
- 全量 `npm test`：**444/464**，20 项失败。13 项同属上述 `literacy-ui-v1` 与当前 `v3` 缓存戳不一致；其余 7 项来自当前工作区已有的花园/资源包/图标注册/发布素材状态（含 `creeper` 未忽略素材和 launcher 缺少 `platform-hero.png`），不是本轮 docs、脚本或方案素材变更引入。
- 本轮没有修改 `prj/app.js`、`prj/preschool-workbench/index.html` 或 CSS，因此没有擅自修复这些并行工作区的运行时合同；V2 接线前需由后续执行者统一缓存戳后再回归。

## 记录模板

```
## Sx 记录（YYYY-MM-DD）
- npm test：N 文件 / M 用例，全绿|失败列表
- 新增用例：…
- 手工走查：…（截图路径）
- 遗留：…
```
