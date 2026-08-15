# T20260815-vocab-unify 词库统一与素材接入

> 源头分析：`docs/03-研究与参考/词库整理/`（现状、外部源、统一方案三份文档，数据均实测）。

## 包内文件

| 文件 | 作用 |
| --- | --- |
| [task.md](task.md) | 目标、词拆分明细、改动范围、硬性约束 |
| [steps.md](steps.md) | S1–S4 分阶段详细步骤 |
| [requirements-checklist.md](requirements-checklist.md) | 需求核对清单 |
| [acceptance.md](acceptance.md) | 验收口径 |
| [test-plan.md](test-plan.md) / [test-report.md](test-report.md) | 测试计划 / 执行报告 |

## 一句话

核心 597 词冻结，按"重叠 108 直接用 WordQuest 本地图（33 词带音频）、389 词维持 emoji-SVG、100 个虚词明确不配图"三组拆分接入素材；五科词库迁到统一 schema v1 + 统一校验构建链路 + 运行时统一媒体接口 `resolvePreschoolCardMedia`；**Minecraft 词作为独立兴趣词库分批接入**（第一批 difficulty 1–2 共 324 词，先修 15% 中英错配例句）。

## 阶段与门控（2026-08-15 重排：按科目串行，英语做完做透再做下一科）

| 阶段 | 内容 | 门控 |
| --- | --- | --- |
| **Phase A 英语** | A1 素材回填（108 图 + 33 音频 + gitignore 原包）→ A2 schema v1 + validate/banks-index 基建 → A3 媒体接口 `resolvePreschoolCardMedia` → A4 Minecraft 第一批 324 词 → A5 可选 Piper 音频（拍板后） | A1 可直接执行，A 内部逐步门控 |
| **Phase B 汉字** | schema 迁移（数组行→对象行，1500 字）+ 外部 800 字库反哺组词/讲解 + 接口接入 | Phase A 验收后 |
| **Phase C 拼音** | schema 迁移（63 条）+ 外部 180 条反哺同音/近音干扰项 + 接口接入 | Phase B 验收后 |
| **Phase D 拼读** | schema 迁移（94+26 条）+ 接口接入 + 全库收尾复核 | Phase C 验收后 |

英语阶段建好"schema + 校验 + 清单 + 媒体接口"四件基础设施，B/C/D 三科只是复用套路迁数据，逐科变快。
