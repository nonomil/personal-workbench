# T20260816-literacy-uplift — 识字体验升级（小书虫参考）

> 源头方案：`docs/01-方案/学习项目设计/04-识字体验升级方案.md` + `05-识字视觉与交互优化方案.md`
> 参考素材：`docs/01-方案/学习项目设计/DS--认字参考方案.md` + `img/DS--认字参考方案/` 5 张参考图
> 视觉素材：`docs/01-方案/学习项目设计/img/05-识字视觉优化/`（9 个原创 RGBA PNG，已接入 `prj/assets/generated/preschool-literacy-uplift/published/`）
> 裁决基线：`01-落地分析-识字与字卡.md`（复用现有字库/复习/账本，禁新 storage key）

## 为什么有这个包

识字专区玩法在（翻卡/组词/找字/图配字），但缺家长最关心的「孩子认识多少字」和一套好看的呈现。本包把小书虫识字的四件套（测评、错字本、档案、首页）长到现有引擎上。

## 切片一览（按序执行，不并行）

| 片 | 内容 | 预估 | 状态 |
| --- | --- | --- | --- |
| S1 | 识字量测评引擎 + 测评课时 + 结果页 | 1 人日 | landed |
| S2 | 测评历史存储（同 key 扩字段）+ 阶段映射 + 学情摘要接入 | 0.5 人日 | landed |
| S3 | 错字本字卡化 + 专项复习 + A4 打印字卡 | 1 人日 | landed |
| S4 | 成长档案曲线（SVG）+ 打印证书 | 0.5–1 人日 | landed |
| S5 | 识字首页三大卡改版 + 柔光样式（素材占位） | 0.5 人日 | landed |
| V1 | 视觉基线 + 主视觉/入口图标/阶段徽章/证书角花素材 | 0.5 人日 | landed |
| V2 | 本地素材接入 CSS/HTML + manifest + 缓存戳 | 0.5 人日 | landed |
| V3 | 390/768/桌面浏览器与 A4 打印视觉验收 | 0.5 人日 | landed |

## 门控与红线

- 每片：先红测试 → 实现 → 绿 → 缓存戳 → 下一片。
- S2 的存储字段扩展（`courseProgress.literacy.assessments`）需在 execution-check 里留痕评审。
- 红线：无新 storage key、无 SM-2、无新货币、无外部 IP（小书虫/毛毛虫）、无网络依赖、测评无惩罚。
- 正式 UI 图由视觉增量 V1 生成；V2 已接入本地资源，同时保留 emoji/CSS 回退，不阻塞功能。
- 资产生成只发生在离线内容工厂；运行时仍无网络请求，中文文案仍由 HTML/CSS 渲染。

## 当前状态

- 任务 ID：`T20260816-literacy-uplift`
- 状态：`review`（识字定向测试 18/18、V1–V3 与浏览器链路已验收；仓库全量 `npm test` 为 468/475，7 项为本包范围外的既有失败，因此保留 review，不虚报全仓 accepted）

## 视觉增量入口

- 详细方案：`docs/01-方案/学习项目设计/05-识字视觉与交互优化方案.md`
- 执行计划：`visual-asset-plan.md`
- 生成源：`img/05-识字视觉优化/generated/`
- 标准化待审：`img/05-识字视觉优化/generated/ready/`
- 运行时发布目录：`prj/assets/generated/preschool-literacy-uplift/published/`
- 浏览器证据：`screenshots/home-desktop.png`、`home-390-viewport.png`、`home-768-viewport.png`、`mistakes-768.png`、`archive-768.png`
- 最新缓存戳：`app.js?v=20260816-literacy-ui-v4`、`40-literacy-uplift.css?v=20260816-literacy-ui-v7`、`preschool-literacy.js?v=20260816-literacy-ui-v2`
