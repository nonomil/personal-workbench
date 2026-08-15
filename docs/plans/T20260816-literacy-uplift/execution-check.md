# 执行检查（门控留痕）

## 存储字段评审（S2 前必须填写）

- 字段：`courseProgress.literacy.assessments`
- 形状：`[{ date: 'YYYY-MM-DD', estimate: number, confidence: 0..1, level: 'L1'..'L5', stage: string, wrong: string[] }]`
- 上限：24 条，`slice(-24)`
- 迁移：无需迁移；`cloneProgress` / `normalizeLiteracy` 读取处一律 `Array.isArray(x) ? x : []`
- 评审结论：2026-08-16 执行时按方案落地。同 key 扩字段，无新 localStorage key。低置信记录仍写入 history，但不刷新 best。

## 切片门控记录

| 片 | 红测试提交 | 转绿 | 缓存戳 | 手玩 | 备注 |
| --- | --- | --- | --- | --- | --- |
| S1 | 2026-08-16 | 8/8 | 20260816-literacy-uplift-v1 | 待手玩 | 测评不发阳光 |
| S2 | 2026-08-16 | 见 assess 文件 | 同上 | 待手玩 | assessments 封顶 24 |
| S3 | 2026-08-16 | mistake-cards 绿 | 同上 | 打印预览待截图 | 连对 3 次 mastered |
| S4 | 2026-08-16 | 0/1/N SVG 绿 | 同上 | 待手玩 | 低置信无证书按钮 |
| S5 | 2026-08-16 | 首页合同绿 | 40-literacy-uplift.css | 390px 待手玩 | 闪卡仍在三大卡下方 |

## 红线自查（收尾时逐条确认）

- [x] 全仓 grep 无「小书虫」「毛毛虫」字样进入 prj/
- [x] `localStorage` 相关代码无新 key（只扩 `courseProgress.literacy.assessments`）
- [x] package.json 无新依赖
- [x] 测评结束走 `replayNoSun` + 直接关弹窗，不调用 `completeCourseLesson` / `awardSunlight`
