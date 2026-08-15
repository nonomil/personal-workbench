# T20260816-EW — 子任务分解

> 串行主线：S1 → S2 → S3 → S5；S4（素材）在 S1 验收后即可并行启动，S5 开工前必须拿到 S4 的 wordboss 素材包。

## S1 客观题型引擎（约 6h）

- **输入**：`preschool-english-vocab.js` 的 `buildSpeakBatch` 与词条结构（text/zh/media/level/theme）；现有 lesson 弹层 phase 机制（speak/match/spell）；R1/R2/R5/R9 裁决
- **产出**：
  - 出题器 `buildQuizQuestions(batch, bank)`：每词生成 1 题听音选图 + 1 题看图选词；干扰项 3 个，同 level 优先同 theme，去重、不含正确项、图缺失词不做听音选图题
  - lesson 流程变为 speak → **quiz** → match → spell；quiz 阶段答对星星反馈，答错高亮正确项 + 慢速 TTS + 写 mistakes（带 errorType）
  - mastery 回流：attempts/correct 按题记；ready 判定改为客观答对累计 ≥3 次（跨听/认/拼任两类）
  - 新 CSS `41-english-vocab-uplift.css`（quiz 卡片四宫格，风格对齐 35-course-flashcards）
- **验收**：`tests/preschool-english-quiz.test.mjs` 绿（干扰项性质、回流写入、ready 判定）；浏览器走通今日 3 词全流程
- **预估**：6h

## S2 英语错词本（约 4h）

- **输入**：S1 产生的带 errorType 的 mistakes；DS 错词本参考图（三分类标签卡片墙）
- **产出**：
  - `storage.js`：mistakes 条目 errorType 字段 + migrate（老条目默认 'read'）
  - 英语专区新增"错词本"视图：单词卡（图+词+中文）+ 错误类型徽标（听力误判/认读混淆/拼写错误）+ 到期复习黄标（复用 review-rules 结果）
  - "专项复习"按钮：把错词组成一个 quiz batch，走 S1 引擎，答对 3 次移出错词本（进 mastery 正常轨道）
  - `docs/data-model.md` 同步字段合同
- **验收**：`tests/preschool-english-wrongbook.test.mjs` 绿（migrate、分类、移出条件）；浏览器走查
- **预估**：4h

## S3 词汇档案（约 4h）

- **输入**：mastery 全量；R11–R13 裁决
- **产出**：
  - 英语专区新增"词汇档案"视图：已会/练习中/复习中计数 + 词库总量
  - 成长曲线：canvas 折线，X 日期 Y 累计已会词数，画 80 词与 300 词两条参考线
  - 曲线数据源门控（二选一，评审后定）：
    - 方案 A（优先）：mastery 条目新增 `masteredAt`（转 ready 当日，单字段），曲线由此派生
    - 方案 B：每日快照数组——仅当 A 无法覆盖回溯需求，且必须设长度上限
  - 三题型正确率小条（听/认/拼），由 attempts/correct 分桶派生
- **验收**：构造 mastery 快照断言计数与曲线点；字段方案登记 test-report；data-model 同步
- **预估**：4h

## S4 生图补素材（约 5h，可与 S2/S3 并行）

- **输入**：80 词表、`assets/img/vocab/` 现有约 101 图；R26–R28 裁决；风格锚点 = DS 参考图 1/2（纸感柔光、奶油底、圆角卡片、绿色系）
- **产出**：
  - 盘点脚本/清单：80 词逐词 media.image 存在性 → 缺失清单
  - 生图（首选 grok）：缺失单词配图（统一 1:1、无文字、白/透明底、儿童插画）→ `assets/generated/english-vocab/` → 验收后落位 `assets/img/vocab/`，更新 `preschool-english-data.js` / `vocabulary-bank.json` media 路径
  - wordboss 素材包 → `assets/generated/wordboss/` → published：哥布林王/暗影骑士/龙之领主立绘（各 1，Q 版不吓人）、勇者 1、火球/雷击/冰冻/治疗图标 4、装备图标 6、战场底图 2（草地/城堡）
  - manifest.json 登记（沿用 preschool-focus-games 格式），来源标 project-original + 生成工具
- **验收**：80 词覆盖 100%；抽 10 词浏览器显示正常；wordboss 素材齐套；无水印无文字无外部 IP
- **预估**：5h

## S5 单词BOSS游戏（约 7h）

- **输入**：S4 素材；S1 出题口径；`workbench-bridge.js` 现有 `awardSunlight`/`recordWordAnswer` 协议；R18–R24 裁决
- **产出**：
  - `prj/games/wordboss/`：index.html + game.js + game.css + data/bosses.js + data/skills.js
  - 核心循环：选技能 → 显示中文+喇叭 → 点字母拼词（字母池=目标词字母+2 干扰字母）→ 拼对放技能扣 BOSS 血 → BOSS 定时反击扣勇者血（数值温和，归零仅"再试一次"重开本关）
  - 三关：哥布林王(60HP) → 暗影骑士(100HP) → 龙之领主(150HP)，关间商店用局内金币买装备（伤害加成，仅当局有效）
  - 词源：当日 3 词必入池 + 80 词已学词 + 同 level 597 库补足；每词答题结果经 `recordWordAnswer` 回流 mastery
  - 通关经 bridge `awardSunlight` 发阳光（受日 cap 与去重）；卡片墙"冒险"档加入口（受"必做未完置灰"既有门槛管）
- **验收**：`tests/wordboss-core.test.mjs` 绿（伤害结算、字母池生成、金币不落 storage、词池组成）；浏览器通三关；阳光日 cap 生效
- **预估**：7h

## 顺序与门控

1. S1 是地基：S2 的 errorType、S3 的正确率分桶、S5 的答题回流都依赖 S1 的出题/回流口径 → **S1 未绿不开 S2/S3/S5**
2. S4 与 S2/S3 无文件冲突，S1 验收后即可并行
3. S5 双门控：S1 绿 + S4 wordboss 素材验收通过
4. 每个 S 完成即更新 `.meta.yaml` phase 与 acceptance 勾选，可随时停
