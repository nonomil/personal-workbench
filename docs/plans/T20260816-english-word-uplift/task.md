# T20260816-EW - 任务定义卡

> 模式：L2（五个独立可交付的功能面，串行为主，S4 素材可并行）
> 执行策略：CLOSED 串行。S1 → S2 → S3 → S4 → S5，每个 S 单独验收可停。不开 fleet。

## 0. 领域画像

- 主画像：软件开发（参考 `docs/plans/templates/profiles/software-dev.md`）
- 次画像：儿童教育产品（学前 3-6 岁认知负荷、无惩罚激励）+ AI 生图素材生产（版权与风格验收）

## 1. Loop 类型判断

- [x] CLOSED 单 Agent：五个面都有明确验收路径（测试 + 浏览器走查 + 素材清单核对）
- [ ] CLOSED Fleet
- [ ] OPEN 转 CLOSED

## 2. 动机自检

- [x] 加速已理解的执行：两份参考已逐条裁决（见 requirements-checklist），本包只做"采纳"项
- [x] 不是用流程回避理解：英语引擎、错题本、bridge、素材管线均已存在，本包是**加环节/加视图/加游戏**，不是造系统

## 3. 目标与背景

- 一句话目标：认单词从"自评会了"升级为"客观答题 + 错词闭环 + 可视化成长"，并新增一个孩子会主动要玩的单词BOSS游戏。
- 背景输入：
  - `docs/01-方案/学习项目设计/DS--认单词--参考方案.md`（测评三题型、错词本分类、词汇档案、成就体系）
  - 外部参考《娃背单词像上刑？打BOSS的单词游戏》OCR 全文（技能师/冒险家、三 BOSS、拼词放技能、金币装备）
  - 用户指示：图片可用 grok 生图
- 现状锚点（探索确认）：
  - 入口：`prj/preschool-workbench/index.html` 侧栏英语专区 → 今日 3 词 lesson 弹层（speak → match → spell 三 phase）
  - 数据：80 词日闭环（`preschool-english-data.js`）+ 597 运行库（`preschool-english-vocab-data.js`）；掌握态在 `courseProgress.english.mastery`
  - 已有：TTS（mp3 优先 + speechSynthesis 回退）、通用错题本、阳光奖励、review-rules 1/3/7/14
  - 缺口：无客观题型、无英语专属错词本、无词汇量曲线、80 词图片不全、无单词向游戏
- 历史约束（红线）：
  - 阳光唯一账本，`awardSunlight` 去重 + 日上限不放松；**BOSS 游戏金币仅局内存在，不进工作台账本，不跨局囤积成第二货币**
  - 星芒唯一伙伴主角；无外部 IP（BOSS 用公版奇幻概念：哥布林/骑士/龙，素材自绘/自生成）
  - 无惩罚性负反馈（答错不扣阳光、不锁功能，只进错词本 + 鼓励重试）
  - Vanilla JS 纯本地、无构建、无外部 CDN；80 词例句自写口径不变
- 兼容要求：`mastery` 既有字段语义不动（state/dates/attempts/correct/nextReview 保持）；新增字段必须过评审门控并写 migrate；老快照打开不炸。

## 4. 为什么是 L2 而不是 L1

五个功能面各自跨 UI + 数据/素材，S1 有 mastery 记录口径变更（自评→客观）的评审点，S3 有最小新增 storage 字段门控，S4 有生图版权/风格验收，S5 有奖励红线（金币 vs 阳光）；但互相独立、可分批交付、可随时停在任一 S，不需要 L3 loop。

## 5. 子任务

见 `task-decomposition.md`。

## 6. 边界

**S1 只改：** `prj/app.js`（今日 3 词 lesson 弹层新增 quiz phase 渲染）、`prj/preschool-english-vocab.js`（出题器：选项与干扰项生成、答题回流）、`prj/css/preschool/41-english-vocab-uplift.css`（新建）、新增 `tests/preschool-english-quiz.test.mjs`

**S2 只改：** `prj/app.js`（英语专区错词本视图 + 专项复习入口）、`prj/storage.js`（mistakes 条目增加 errorType，含 migrate）、`docs/data-model.md`、新增 `tests/preschool-english-wrongbook.test.mjs`

**S3 只改：** `prj/app.js`（词汇档案视图：计数、曲线 canvas、三维小结）、`prj/storage.js`（仅当曲线无法派生时，走评审门控加最小字段）、`docs/data-model.md`

**S4 只改：** `prj/assets/generated/english-vocab/`、`prj/assets/generated/wordboss/`、`prj/assets/img/vocab/`（published 落位）、`prj/preschool-english-data.js` / `vocabulary-bank.json`（media 路径补齐）、素材 manifest

**S5 只改：** `prj/games/wordboss/`（全新目录）、`prj/config.js` / `prj/app.js`（卡片墙冒险档加入口）、`prj/games/shared/workbench-bridge.js`（**只调用不改协议**）、新增 `tests/wordboss-core.test.mjs`

**不碰：** review-rules 复习间隔、阳光数值公式、80 词表内容与例句、卡片墙整体布局、identity/literacy/phonics 引擎、bridge 协议、三世界既有游戏。

**明确不做：** AI 语音评测/跟读打分、OCR 拍课本入库、防沉迷锁/时长管理（工作台已有家长体系）、词汇能力证书生成分享、双人同屏（后置观察项）、雷达图图表库（用纯 CSS/canvas 小条形）、题型C"听音拼写积木"独立重做（复用现有 spell phase 微调）。

**禁止顺手优化：** 英语引擎整体重构、闪卡页改版、把 597 库替换 80 词日闭环、给游戏加存档系统/装备跨局继承、扩展宠物系统。

## 7. 验收（整体）

- [ ] S1：quiz phase 可玩，干扰项生成正确（同主题不重复、不含正确答案），答题写回 mastery attempts/correct，测试绿
- [ ] S2：错词本三分类可见、专项复习可走通、mistakes migrate 测试绿、data-model 同步
- [ ] S3：档案页计数与曲线正确（用构造快照验证）、字段方案过评审
- [ ] S4：80 词图片覆盖 100%，manifest 登记齐全，抽查风格一致（纸感柔光儿童插画）、无外部 IP 元素
- [ ] S5：三关 BOSS 可通关，拼词→技能→伤害链路正确，阳光经 bridge 发放且受日 cap，金币不出局
- [ ] 全程 `npm test` 绿；红线零违反；未 commit（除非用户要求）

## 8. 升级触发

- S1 若客观题正确率口径与 B3 已落地的"会了/不会"自评产生 mastery 状态机冲突 → 停，先写冲突说明问用户
- S3 若曲线必须新增每日快照数组（storage 增长无上界）→ 停，走变更与同步规则评审
- S4 若 grok 生图不可用或产物风格不达标连续 3 批 → 停，切换项目内已有生图管线（gpt-image skill）并记 test-report
- S5 若发现金币机制无法避免"第二货币"观感（孩子囤金币要求兑换）→ 停，金币改为纯局内分数展示
- 任何 S 想给答错加惩罚（扣血扣阳光锁关卡）→ 禁止；BOSS 战失败只允许"再试一次"式重开
