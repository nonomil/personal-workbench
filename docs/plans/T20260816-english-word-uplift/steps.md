# T20260816-EW — S1 客观题型引擎

> 优先级：P1 | 状态：S1–S5 代码已绿，浏览器关键路径已走，未标 accepted
> 验证以退出码为准：`exit 0` 通过。

## 目标

今日 3 词流程在"听读自评"之后加入客观答题（听音选图 + 看图选词），答题结果客观写回 mastery 并按错误类型进错词本；ready 判定从自评升级为客观答对累计。

## Steps

### 1. 侦查现有引擎（只读）

- [x] 读 `prj/preschool-english-vocab.js`：`buildSpeakBatch`、`markKnown`、`toMatchPairs` 的输入输出与 mastery 写入路径
- [x] 读 `prj/app.js` lesson 弹层 phase 切换机制（speak→match→spell 如何推进、完成判定在哪）
- [x] 读 `prj/storage.js` mistakes 写入函数与现有条目形状
- [x] 确认 80 词合并 597 库后 media.image 的实际覆盖率（决定听音选图题的可用词集）
- **验证：** 现状流程图（文字版）+ 图片覆盖率写入 test-report 阶段 0
- **回滚成本：** 无写入

### 2. 出题器实现（纯函数，先测）

- [x] `preschool-english-vocab.js` 新增 `buildQuizQuestions(batch, bank, masteryMap)`：
  - 每词产出：`{ type:'listen-pick-image'|'see-image-pick-word', word, options:[4], answerIndex }`
  - 干扰项规则：同 level 优先同 theme，排除 batch 内其他词、排除正确项、不重复；图缺失 → 该词跳过 listen-pick-image
  - 选项顺序洗牌，正确项位置均匀
- [x] 新建 `tests/preschool-english-quiz.test.mjs` **先红**：干扰项性质 5 断言 + 图缺失降级 + 洗牌分布抽查
- **验证：** `node --test tests/preschool-english-quiz.test.mjs` 先非 0，实现后转绿
- **回滚成本：** 删新函数与测试文件

### 3. 答题回流与 ready 判定

- [x] 答对：mastery.attempts+1、correct+1，按题型记入分桶（listen/read/spell 计数，供 S3 用；**字段挂在 mastery 条目内，不新开顶层键**）
- [x] 答错：attempts+1；mistakes 写入 `{ word, errorType, ts }`（listen-pick-image→'listen'，see-image-pick-word→'read'，spell→'spell'）
- [x] ready 判定：客观题 `recordQuizAnswer` 累计 ≥3 次且 ≥2 类才 ready；自评/游戏 `markKnown` 保持一次正确即 ready（兼容 B3/方块传奇）
- [x] 老 mastery 快照兼容：无分桶字段视为 0，migrate 测试覆盖
- **验证：** 测试断言状态机迁移 + 老快照兼容；`docs/data-model.md` 若字段形状变化需同步（R 门控：只在 mastery 条目内加键，顶层不动）
- **回滚成本：** 还原 vocab.js/storage.js

### 4. UI：quiz phase 接入 lesson 弹层

- [x] `prj/app.js`：phase 序列 speak → quiz → match → spell；quiz 渲染四宫格（听音题：喇叭大按钮+4图；看图题：大图+4词按钮）
- [x] 反馈：答对星星+音效（复用现有）；答错高亮正确项、TTS 慢速（rate≈0.7）重读、允许继续不卡关
- [x] 新建 `prj/css/preschool/41-english-vocab-uplift.css` 并在入口 HTML 引入：圆角 22-28px、奶油底、绿描边，对齐 35-course-flashcards 风格
- **验证：** 浏览器走通今日 3 词全流程（含答错分支）；控制台无错
- **回滚成本：** 还原 app.js、删 css

### 5. 回归与证据

- [x] 定向英语/回流测试绿（全量 npm test 仍有既有失败，见 test-report）
- [x] 浏览器截图（quiz 两题型 + 答错反馈）记入 test-report 阶段 1
- **回滚成本：** 整包 S1 文件还原

## Acceptance（S1）

- [x] R1/R2/R5 落地且有测试；R9 客观路径落地，自评兼容偏差已记录
- [x] 干扰项永不含假词（R2 裁决）；答错无任何惩罚性反馈
- [x] mastery 顶层结构未动；分桶只在条目内；老快照兼容测试绿
- [x] 未 commit（除非用户要求）

---

## S2 英语错词本（已落地）

- [x] storage mistakes 加 errorType + correctStreak；老条目默认 'read'
- [x] 英语专区错词本视图：听力/认读/拼写分类 + 到期黄标（复用 review-rules）
- [x] 专项复习走 S1 quiz；客观答对 3 次移出
- [x] data-model 同步 + 浏览器：cake 听力误判

## S3 词汇档案（已落地）

- [x] 方案 A：`masteredAt` 首次 ready 盖戳（不用每日快照）
- [x] 四计数 + SVG 成长曲线（80/300 参考线，不是 canvas）
- [x] 三题型正确率小条
- [x] `tests/preschool-english-archive.test.mjs` 绿

## S4 生图补素材（已落地）

- [x] 盘点 52 缺 → `scripts/build-english-vocab-svgs.mjs` 补齐 80/80
- [x] 未走 grok（偏差见 test-report）；产物 project-original SVG
- [x] wordboss 16 张 SVG + manifest
- [x] 版权：无外部 IP、无水印文字

## S5 单词BOSS（已落地）

- [x] `prj/games/wordboss/`：engine + bosses 60/100/150 + 技能 + 字母池 + 局内商店
- [x] 词池含当日 3 词；`recordWordAnswer` 回流；通关 `awardSunlight`；**不加入 GAME_IDS**
- [x] 浏览器：拼 water 掉血+金币 10；三关通关未手玩完
- [x] 红线：金币不落 storage、失败无惩罚、定向测试绿
