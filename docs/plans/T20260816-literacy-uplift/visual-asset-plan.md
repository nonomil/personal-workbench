# 识字视觉升级实施计划

> **给执行者：** 先完成素材技术验收，再接入 `40-literacy-uplift.css`；不修改测评算法、存储字段或奖励口径。

**目标：** 将识字首页、测评结果、错字本和成长档案从 emoji 占位升级为一组原创、可替换、可回退的透明 PNG 素材。

**架构：** 生图只发生在离线内容生产阶段。运行时读取本地静态 PNG，由 HTML/CSS 叠加中文文案；素材缺失时回退到现有 emoji/纯 CSS，不让视觉资源成为功能依赖。

**技术栈：** `gpt-image-2 via CliproxAPI`、Python 标准库、Pillow、原生 CSS、现有 Node 测试链路。

---

### 任务 V1：设计基线与素材生产

**文件：**
- 创建：`docs/01-方案/学习项目设计/05-识字视觉与交互优化方案.md`
- 创建：`docs/01-方案/学习项目设计/img/05-识字视觉优化/prompts/*.txt`
- 创建：`scripts/generate_literacy_visual_assets.py`
- 创建：`scripts/normalize_literacy_visual_assets.py`

**步骤 1：** 对照参考图确认页面层级：KPI → 主视觉 → 三大卡 → 周连续 → 课时列表；文字不进入图片。

**步骤 2：** 使用当前进程环境中的 `CLIPROX_API_BASE` / `CLIPROX_API_KEY` 调用 `/images/generations`，模型固定为 `gpt-image-2`，保存真实文件签名对应的原图。

**步骤 3：** 对 `#00FF00` chroma-key 背景去背，输出 RGBA PNG；再标准化到主视觉 512、入口图标 384、阶段徽章 256、证书角花 512。

**步骤 4：** 运行：

```powershell
python -X utf8 .\scripts\normalize_literacy_visual_assets.py
```

预期：`generated/ready/manifest.json` 记录 9 个素材、尺寸、模式和透明角点。

**步骤 5：** 人工查看主视觉、3 个入口图标、4 个徽章和证书角花；若出现伪文字、品牌元素、明显绿边或主体裁切，退回生成，不进入 `published`。

### 任务 V2：接入运行时视觉层

**文件：**
- 修改：`prj/css/preschool/40-literacy-uplift.css`
- 修改：`prj/preschool-workbench/index.html`（必要时挂缓存戳/静态资源路径）
- 创建或修改：`prj/assets/generated/preschool-literacy-uplift/manifest.json`
- 复制：`docs/01-方案/学习项目设计/img/05-识字视觉优化/generated/ready/*.png` → `prj/assets/generated/preschool-literacy-uplift/published/`

**步骤 1：** 给首页三大卡、主视觉、阶段徽章增加 `data-asset` / `data-stage` 挂点；不把中文文案写进图片。

**步骤 2：** 让 CSS 以本地资源为首选，emoji/纯 CSS 为失败回退；不添加远程 URL、不改 `character-bank.json`。

**步骤 3：** 运行既有识字定向测试和 `npm test`；更新 `index.html`、CSS、JS 的缓存戳，确认没有旧缓存读不到资源。

### 任务 V3：浏览器与打印视觉验收

**文件：**
- 修改：`docs/plans/T20260816-literacy-uplift/test-report.md`
- 修改：`docs/plans/T20260816-literacy-uplift/acceptance.md`
- 证据：`docs/plans/T20260816-literacy-uplift/screenshots/`

**步骤 1：** 在 390px、768px 和桌面宽度打开识字首页，确认 KPI、主视觉、三大卡和原课时列表均可见且不横向溢出。

**步骤 2：** 走通测评→结果→错字本→专项复习→打印→档案→证书；确认错误反馈无惩罚、低置信无证书、打印页为 A4 2×4 八卡。

**步骤 3：** 保存首页、测评、错字本、档案、打印预览截图，并在 `test-report.md` 记录视口、URL、缓存戳和结果。

**步骤 4：** 只有 V1 技术检查、V2 运行时接入和 V3 浏览器证据全部具备后，才把执行包从 `review` 标为 `accepted`。

### 执行留痕（2026-08-16）

- V1：9 个 RGBA PNG 已通过尺寸、四角透明和内容检查。
- V2：9 个素材已发布到 `prj/assets/generated/preschool-literacy-uplift/published/`；manifest 的 `sourceManifest` 使用从发布目录回到仓库根的 `../../../../docs/...` 路径。
- V3：Codex 浏览器完成 768px 当前页验收及既有 390px/桌面截图复核；打印 DOM/CSS 确认 8 卡、两列、A4、裁切虚线和练写格；低置信度证书门禁与高置信度证书入口均已验证。
- 结论：视觉增量已落地，但仓库全量 `npm test` 仍有 7 项范围外既有失败，执行包保持 `review`，待总仓门禁另行收口。
