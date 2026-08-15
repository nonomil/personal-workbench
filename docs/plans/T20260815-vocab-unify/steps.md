# steps：分阶段执行步骤（按科目串行）

> 执行顺序：**Phase A 英语（做完做透）→ Phase B 汉字 → Phase C 拼音 → Phase D 拼读**。
> 每个 Phase 内部再分小步，每步结束跑 `npm test` + 人工验收后才进下一步。
> 英语阶段会把"schema v1 + validate + banks-index + 媒体接口"这套基础设施建好，后面三科只是复用套路迁数据，越做越快。

---

## Phase A 英语（预计 12h）

### A1 素材提取与回填（3h）

1. 脚本 `scripts/extract-wordquest-assets.mjs`：
   - 读 WordQuest `catalog.json` × `vocabulary-bank.json`，匹配 108 个重叠词（词面小写相等，同词多卡取第一张）。
   - 拷 semantic PNG → `prj/assets/img/vocab/{text}.png`；33 条 mp3 → `prj/assets/audio/vocab/{text}.mp3`。
   - 输出 `.tmp-analysis/wordquest-extract-report.json`（应为 108 图 / 33 音频 / ~3.9MB），幂等可重跑。
2. 回填 `vocabulary-bank.json` 的 `image`/`audio` 字段，条数仍 597。
3. `.gitignore` 追加 wordquest 原包目录；人工抽查 10 张图与词义相符（不符超 10 张停下请示）。
4. 页面最小接入：英语翻卡 `item.image` 有值出 `<img>`、`item.audio` 有值"听一听"播文件失败回退 Web Speech；缓存戳 + 测试。

### A2 英语库 schema v1 + 校验基建（3h）

1. 备份英语库到 `.tmp-analysis/banks-backup-20260815/`。
2. `scripts/migrate-banks-schema-v1.mjs --bank=english`：迁移到统一对象行（`media:{image,art,audio}`；389 实义词生成 `art:"emoji:X"`，100 虚词 `art:"none"`）。
3. 新建 `prj/data/preschool/banks-index.json`（本步只登记英语库）+ `scripts/validate-banks.mjs`（必填字段/id 唯一/禁 http/媒体文件存在/条数 597），挂进 `npm test`。
4. `build-preschool-banks.py` 支持 schema v1（其余科目旧格式兼容期共存），产物全局变量不变。

### A3 运行时媒体接口（2h）

1. `prj/app.js` 新增 `resolvePreschoolCardMedia(entry)`：`media.image` → `media.art`（调 card-art）→ `none` 纯文字；音频同理。
2. `preschool-card-art.js` 支持显式 `emoji:X` / `none` 指令（查表逻辑保留作兜底）。
3. 英语翻卡改走该接口；缓存戳 + 测试。

### A4 Minecraft 兴趣词库第一批（4h）

1. `scripts/extract-mc-templates.mjs` 抽 126 例句模板 + 17 词组模板 → 人工翻译成 `prj/data/preschool/英语/mc-template-zh.json`。
2. `scripts/build-minecraft-bank.mjs`：筛 difficulty 1–2（324 词）生成 `minecraft-bank.json`（schema v1，`id:"mc-{slug}"`，`level:"MC-D1/D2"`，`theme` 取 category 中文）；exampleZh/phrase 按模板重写；12 个 singleton 逐条校对。
3. 拷 324 张 PNG → `assets/img/vocab-mc/`（24.2MB）、mp3 → `assets/audio/vocab-mc/`；banks-index 登记，validate 断言 324 条。
4. 英语专区加独立"Minecraft 英语"入口卡（不进每日必修），复用翻卡框架 + A3 接口，按 MC-D1/D2 分组。
5. 人工抽查 20 张：图词相符、中英例句一致 → **Phase A 整体验收**。

### A5 音频扩展（可选，用户拍板后）

Piper TTS 批量生成核心 389 词 + MC 缺音频词 mp3，抽样 20 条听检，总体积 ≤ 20MB。

---

## Phase B 汉字（预计 4h，Phase A 验收后）

1. **schema 迁移**：`migrate-banks-schema-v1.mjs --bank=literacy`，数组行 `[字,拼音,主题,组词,讲解,level]` → `{id:"zh-{字}", kind:"literacy", text, theme, level, extra:{pinyin,words,explain}, media:{art}}`；emoji 取 card-art CHAR_EMOJI，无则主题兜底。条数断言 1500。
2. **内容反哺**：脚本比对外部 800 字库（`卡片式单词学习游戏记忆系统/单词库_分级/06_汉字/幼儿园汉字.js`），补 `character-bank.json` 中组词/讲解空缺的字（只补空缺，不覆盖已有人工内容），输出反哺报告（补了多少字、样例）。
3. **接口接入**：识字翻卡/识字课改走 `resolvePreschoolCardMedia`；banks-index 登记；构建 + 缓存戳 + 测试。
4. 人工验收：识字课抽 20 字，组词讲解不为空、卡面正常。

## Phase C 拼音（预计 3h，Phase B 验收后）

1. **schema 迁移**：`--bank=pinyin`，`initial/sample/kind/group` 收进 `extra`。条数断言 63。
2. **内容反哺**：合入外部 180 条拼音库的 `homophones`（同音字）/`nearPhones`（近音）到 `extra`；拼音练习的干扰项从写死改为按 `nearPhones` 数据生成（无数据的走现有逻辑）。
3. **接口接入** + banks-index 登记 + 构建 + 测试。
4. 人工验收：拼音课抽 10 题，干扰项合理、无重复正确答案。

## Phase D 拼读（预计 2h，Phase C 验收后）

1. **schema 迁移**：`--bank=phonics`，`graphemes/phonemes/stageId` 收进 `extra`；word-bank 94 + letter-bank 26 条数断言。
2. **接口接入** + banks-index 登记（至此 index 覆盖全部词库）+ 构建 + 测试。
3. 人工验收：拼读课抽 10 词卡面正常。
4. **收尾**：`inventory-vocab-banks.mjs` 复核全库条数；`docs/03-研究与参考/词库整理/` 文档同步"已完成"状态；本包 test-report 写终版。

---

## 回滚方案

- 每 Phase 迁移前备份该科源 JSON 到 `.tmp-analysis/banks-backup-20260815/`，回滚即覆盖回去 + git 还原脚本与 app.js。
- 素材目录（`assets/img/vocab*`、`assets/audio/vocab*`）独立可整删，不影响数据层。
- 各 Phase 互相独立：汉字出问题不影响已验收的英语。
