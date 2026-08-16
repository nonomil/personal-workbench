# 执行检查（门控留痕）

## 存储字段评审（S2 前必须填写）

- 字段：`courseProgress.literacy.assessments`
- 形状：`[{ date: 'YYYY-MM-DD', estimate: number, confidence: 0..1, lowConfidence: boolean, level: 'L1'..'L5', stage: string, wrong: string[] }]`
- 上限：24 条，`slice(-24)`
- 迁移：无需迁移；`cloneProgress` / `normalizeLiteracy` 读取处一律 `Array.isArray(x) ? x : []`
- 评审结论：2026-08-16 执行时按方案落地。同 key 扩字段，无新 localStorage key。低置信记录仍写入 history，但不刷新 best。

## 切片门控记录

| 片 | 红测试提交 | 转绿 | 缓存戳 | 手玩 | 备注 |
| --- | --- | --- | --- | --- | --- |
| S1 | 2026-08-16 | 8/8 | 20260816-literacy-uplift-v1 | 25/25 高置信度 | 测评不发阳光 |
| S2 | 2026-08-16 | assess 绿 | 同上 | 历史/摘要已走 | assessments 封顶 24；低置信不刷新 best |
| S3 | 2026-08-16 | mistake-cards 绿 | 同上 | 8 卡/48 练写格 | 连对 3 次 mastered |
| S4 | 2026-08-16 | 0/1/N SVG 绿 | 同上 | 档案/证书已走 | 低置信无证书按钮 |
| S5 | 2026-08-16 | 首页合同绿 | 40-literacy-uplift.css?v=20260816-literacy-ui-v7 | 390/768/桌面证据 | 闪卡仍在三大卡下方 |
| V1 | 2026-08-16 | 9 素材生成 + RGBA/尺寸检查通过 | `generated/ready/manifest.json` | 已视觉复核 | 9 项已复制到 `prj/` |
| V2 | 2026-08-16 | 本地资源挂点/回退/manifest 绿 | `app.js?v=20260816-literacy-ui-v4` + CSS v7 | 已刷新浏览器 | `sourceManifest` 相对路径已修正 |
| V3 | 2026-08-16 | 浏览器链路与打印 CSS 绿 | `screenshots/` + DOM/CSS 证据 | 已完成 | A4 2×4、屏幕隐藏、证书字段齐全 |

## 红线自查（收尾时逐条确认）

- [x] 全仓 grep 无「小书虫」「毛毛虫」字样进入 prj/
- [x] `localStorage` 相关代码无新 key（只扩 `courseProgress.literacy.assessments`）
- [x] package.json 无新依赖
- [x] 测评结束走 `replayNoSun` + 直接关弹窗，不调用 `completeCourseLesson` / `awardSunlight`

## 收尾验证（2026-08-16）

- Codex 浏览器：`http://127.0.0.1:4173/preschool-workbench/index.html?v=20260816-literacy-ui-v7#courses?course=preschool-literacy`
- 高置信度实测：25/25 题均答对，结果为 1500 字、置信度 100%，档案出现折线与证书入口。
- 打印字卡：8 个 `.print-card`、48 个练写格；普通屏幕 `#literacy-print-host` 为 `display:none`；CSS 含 `@page { size: A4 }`、两列网格、虚线边框。
- 证书：普通屏幕隐藏打印容器；证书文本含日期、估算量、阶段，角花引用本地 `literacy-certificate-corner.png`。
- 识字定向：18/18；全量 `npm test`：468/475，7 项失败均为本包范围外既有工作区门禁，详见 `test-report.md`。

## 视觉资产门控

- 生成后先检查真实文件格式，再做 chroma-key 去背；不能把 JPEG 直接改名为 PNG。
- `generated/ready/` 只收录 RGBA、四角透明、目标尺寸正确的素材；`published/` 在 V2 运行时验收前不得视为已接入。
- 图片不承载中文内容；所有中文、拼音、数字和按钮继续由 HTML/CSS 渲染。
- 素材缺失必须回退到 emoji/纯 CSS，不能导致识字测评、错题本、档案或打印流程不可用。
