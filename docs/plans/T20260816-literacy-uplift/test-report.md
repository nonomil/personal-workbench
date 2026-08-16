# 测试报告

> 最新结论（2026-08-16）：识字定向门禁 **18/18 通过**，Codex 浏览器链路与 V1–V3 视觉验收已完成；仓库全量 `npm test` 为 **468/475**，7 项为本包范围外的既有失败，不能写成全仓通过。

## 最新定向回归

命令：`node --test tests/preschool-literacy-assess.test.mjs tests/preschool-mistake-cards.test.mjs tests/preschool-learning-summary.test.mjs`

- 结果：**18/18 通过，exit 0**。
- 覆盖：25 题去重与四选一、L1–L5 阶梯、估算/置信度/乱点降置信、历史封顶 24、低置信不刷新 best、阶段映射、家长摘要、错字本、专项复习、8 张打印卡、0/1/N 档案 SVG、首页三大卡与缓存戳。

## 最新 Codex 浏览器手玩

- 页面：`http://127.0.0.1:4173/preschool-workbench/index.html?v=20260816-literacy-ui-v7#courses?course=preschool-literacy`
- 缓存戳：`app.js?v=20260816-literacy-ui-v4`、`40-literacy-uplift.css?v=20260816-literacy-ui-v7`、`preschool-literacy.js?v=20260816-literacy-ui-v2`。
- 首页 768px：KPI、主视觉、阶段徽章、三张入口卡、本周连续条和课时列表可见，`document.documentElement.scrollWidth === innerWidth`。
- 高置信测评：完整答完 25/25，结果 **1500 字、置信度 100%、阅读进阶期**，结束无额外阳光。
- 错字本/打印：专项复习可进入；打印 DOM 为 8 个 `.print-card`、48 个练写格；普通屏幕 `#literacy-print-host` 为 `display:none`。
- 打印 CSS：已确认 `@page { size: A4 }`、两列网格、4mm 间距、58mm 卡高、1px dashed 裁切边和练写格十字线。
- 档案/证书：折线、250/500/750 参考线、三项 KPI、打印证书按钮均存在；证书 DOM 含日期 `2026-08-16`、估算量 `1500`、阶段“阅读进阶期”，角花引用本地 `literacy-certificate-corner.png`。
- 截图：`screenshots/home-desktop.png`、`home-390-viewport.png`、`home-768-viewport.png`、`mistakes-768.png`、`archive-768.png`。

## 最新全量回归

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
