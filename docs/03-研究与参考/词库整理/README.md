# 词库整理专题

> 更新：2026-08-15。数据均由 `scripts/inventory-vocab-banks.mjs` 实测统计，非估算。

## 这套文档回答什么

1. 工作台现在有哪些词库、什么格式、谁在用 —— [01-当前词库现状.md](01-当前词库现状.md)
2. 手头有哪些外部词库/素材包、质量如何、能用什么 —— [02-外部词库与素材分析.md](02-外部词库与素材分析.md)
3. 后续怎么统一格式、统一接口、图片和发音怎么维护 —— [03-统一词库格式与维护方案.md](03-统一词库格式与维护方案.md)

## 2026-08-15 已落地

- 英语改为**一条主题序列**（颜色→…→高频词），每天 5 张，无 L1–L5 / 看图词轨。
- 英语/汉字/拼音/拼读源 JSON 已迁 schema v1；`banks-index.json` + `scripts/validate-banks.mjs` 挂进 `tests/preschool-banks-schema.test.mjs`。
- 运行时统一走 `resolvePreschoolCardMedia`（位图 > emoji-art > none）。
- 汉字 1500 条保持 L1–L5；空讲解已按本组词回填。拼音 63 条合入同音/近音；拼读 94+26 已进 index。
- Minecraft 独立 324 词库已接入（A4）：卡片墙 + 英语「更多练习」入口，入门/进阶分组，不进每日必修。
- **未做**：Piper TTS（A5，等拍板）。

## 一页结论

**词库内容不再扩张**（英语维持 597 词），整理方向是"补素材、统格式、通接口"：

| 事项 | 结论 |
| --- | --- |
| 英语配图 | WordQuest 包（`prj/assets/vocab/wordquest-vocab-2026.08.15`）有 2289 张本地 PNG，与现有 597 词重叠 108 个，先拷这 108 张回填核心词库，其余词继续用 emoji-SVG（`preschool-card-art.js`） |
| Minecraft 词汇 | **单独兴趣词库分批接入**（2026-08-15 用户确认，娃感兴趣）：不混入核心 L1–L5，第一批 difficulty 1–2 共 324 词；接入前须先修 exampleZh（约 15% 中英错配，126 个模板重译即可），详见 02 文档 §1.4 |
| 外部分级词库 | `卡片式单词学习游戏记忆系统/单词库_分级` 的幼儿园库（845 条）已反哺过中文释义和例句；其 358 张图指向已停服的 twemoji.maxcdn.com，**图片不可用**，教训：禁止热链外部 CDN |
| 汉字 | 外部有 800 字库（带拼音/英文/组词例词），可反哺 `character-bank.json` 的组词与释义；笔顺继续用 hanzi-writer 数据（现有 165 字） |
| 拼音 | 外部有 180 条拼音库（带同音字/近音干扰项），可反哺练习题干扰项生成 |
| 格式统一 | 各库统一为"对象行 + 公共字段（id/text/zh/theme/level/media）"，`character-bank.json` 的数组行格式需迁移；由 `build-preschool-banks.py` 统一校验生成 |
| 发音 | 维持 Web Speech API（离线、零维护）；不引入 AGPL 音频包；如需真人级 mp3，用 Piper TTS 本地批量生成高频词 |
| 图片许可 | Twemoji CC-BY 4.0 / OpenMoji CC BY-SA 4.0 / Noto Emoji Apache-2.0，均可离线自托管 |

## 待决策（需要人拍板）

- **WordQuest 包是否入 git**：该目录当前未被 `.gitignore` 忽略，整包提交会给仓库增加 84MB。建议：把包本身加入 ignore，只把筛出的 ~108 张 PNG 拷入 `prj/assets/img/vocab/` 提交。
