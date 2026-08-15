# acceptance：验收口径（按科目 Phase）

## Phase A 英语

### A1 素材接入

- [x] `prj/assets/img/vocab/` 101 张 PNG（抽查剔除 7 张错配图后，≈3.8MB），`prj/assets/audio/vocab/` 恰好 33 条 mp3，命名为小写词面
- [x] 英语翻卡：有 `image` 的词渲染 `<img class="preschool-card-photo">`；无图词继续 emoji-SVG
- [x] 33 词"听一听"走 `playVocabAudio` 播本地 mp3，失败回退 Web Speech
- [x] `.gitignore` 已忽略 wordquest 原包；入库体积 4.00MB < 5MB
- [x] `vocabulary-bank.json` 仍 597 条；extract report 101 图 / 33 音频 / 7 张 rejected；A1 合同测试 12/12 绿
- [ ] 用户人工翻卡验收（black/blue/apple 看位图，about 看字，sun 回退 emoji）

### A2 schema 基建

- [x] 英语库全部 schema v1 对象行；495 实义词 `art:"emoji:X"`、102 虚词 `art:"none"`（按 WORD_EMOJI 实测，不是早先估的 389/100）
- [x] `banks-index.json` 存在并登记英语库；`node scripts/validate-banks.mjs` 挂进 `tests/preschool-banks-schema.test.mjs`
- [ ] 构建产物全局变量结构与迁移前一致，页面英语课人工回归无异常

### A3 媒体接口

- [x] `resolvePreschoolCardMedia` 生效：位图 > emoji-art > none
- [x] 虚词 `art:none` 不渲染兜底 SVG；指定合同测试绿（全量 npm test 仍有既有无关失败）

### A4 Minecraft 第一批

- [x] `minecraft-bank.json` 恰好 324 条（difficulty 1–2），`id` 前缀 `mc-`，banks-index 已登记
- [x] 例句/词组按模板重写；合同断言不再出现「带在包里」；`phrase` 存英文例句，`phraseZh` 存中文
- [x] `assets/img/vocab-mc/` 324 张 PNG、`assets/audio/vocab-mc/` 有则用；block/item/color 量产变体未混入
- [x] 英语专区「更多练习」和卡片墙都有独立「Minecraft 英语」入口，**不进每日必修**；掌握进度写 `courseProgress.minecraft`，不进核心 597 复习池
- [ ] 用户人工翻卡验收（入门/进阶切换、图词相符）
- [ ] 全量 `npm test` 仍有既有无关失败（花园波次、icon `bomb`），本包指定合同已绿

### A5 音频扩展（仅用户拍板后验收）

- [ ] 核心实义词 + MC 缺音频词 mp3 覆盖，抽样 20 条听检通过，总体积 ≤ 20MB

## Phase B 汉字

- [x] `character-bank.json` 全部对象行（`extra:{pinyin,words,explain}`），条数仍 1500，banks-index 已登记
- [x] 反哺报告存在：`.tmp-analysis/literacy-backfill-20260815.json`（组词已齐故补词 0；讲解按本组词回填 1500）
- [x] 识字课改走统一媒体接口；`tests/preschool-literacy.test.mjs` 绿。人工抽 20 字待用户看

## Phase C 拼音

- [x] `pinyin-initial-bank.json` schema v1，条数仍 63，banks-index 已登记
- [x] 外部同音/近音合入 `extra`（40/63 命中）；干扰项优先 `nearPhones`
- [x] `tests/preschool-reference-banks.test.mjs` 绿

## Phase D 拼读 + 收尾

- [x] phonics 两库 schema v1（94+26），banks-index 覆盖英语/汉字/拼音/拼读
- [x] `inventory-vocab-banks.mjs` 复核 597/1500/63/94/26 与 index 一致
- [x] 词库整理文档与本包 test-report 已同步；指定合同测试绿。A5 与人工翻卡仍开放
