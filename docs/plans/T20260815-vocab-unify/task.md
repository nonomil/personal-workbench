# task：词库统一与素材接入

- 级别：L3（涉及数据格式迁移，按科目串行门控执行）
- 优先级：P1（Phase A 英语）→ P1（B 汉字）→ P2（C 拼音、D 拼读）；A5 音频待拍板
- 执行顺序（2026-08-15 用户确认）：**英语做完做透 → 汉字 → 拼音 → 拼读**，英语阶段建好 schema/校验/清单/接口四件基建，后三科复用
- 源头：`docs/03-研究与参考/词库整理/`（01 现状、02 外部源分析、03 统一方案）

## 1. 目标

1. **素材接入**：把 WordQuest 包（`prj/assets/vocab/wordquest-vocab-2026.08.15/`）中与现有 597 词重叠的 108 张本地 PNG 和 33 条 mp3 提取进 assets，回填词库；84MB 原包不入 git。
2. **格式统一**：五科词库迁到统一 schema v1（公共字段 + `extra` 学科扩展），新增 `banks-index.json` 清单和 `validate-banks.mjs` 校验，挂进 `npm test`。
3. **接口统一**：运行时新增 `resolvePreschoolCardMedia(entry)` 统一媒体解析（位图 > emoji-art > 无图），各课程引擎从"各自查表"改为走这一个接口。
4. **词量口径**：核心英语 597 词、识字 1500 字冻结不动；**Minecraft 兴趣词库是独立新增文件**（2026-08-15 用户确认接入），不混入核心库、不占用 L1–L5 口径。

## 2. 词拆分明细（2026-08-15 实测，脚本 `scripts/inventory-vocab-banks.mjs`）

597 个英语词分三组，素材策略各不同：

| 组 | 数量 | 定义 | 图片策略 | 音频策略 |
| --- | --- | --- | --- | --- |
| A 重叠词 | **108** | 与 WordQuest 词面相同 | **直接用** WordQuest semantic PNG（108/108 齐全，共 3.6MB） | 33 词有 WordQuest mp3（0.3MB）直接用；其余 75 词走 Web Speech |
| B 实义词 | **389** | 非重叠、`preschool-card-art.js` 有专属 emoji | 维持 emoji-SVG（零成本、已上线） | Web Speech；S4 可选 Piper 批量生成 |
| C 虚词/功能词 | **100** | 非重叠、无专属 emoji（about/after/all/an/at/be/because/for/…） | **明确不配图**：标记 `media.art = "none"`，卡面以文字为主（sight word 教学法本就不看图） | Web Speech |

> 注：WordQuest 的 fallback 图（612 张）不提取——108 个重叠词 semantic 图全齐，用不到备图。

## 2b. Minecraft 兴趣词库（S5，独立新增）

字段质检结论见 `docs/03-研究与参考/词库整理/02-外部词库与素材分析.md` §1.4。要点：

- **单独类别，不混级**：新建 `prj/data/preschool/英语/minecraft-bank.json`（schema v1，`source:"wordquest-mc"`），课程入口独立一张"Minecraft 英语"卡；内部分级直接沿用 WordQuest `difficulty`（MC-D1…D5），与核心 L1–L5 互不干扰。核心 597 词、复习/错题池口径不受影响。
- **分批接入**：
  - 第一批：difficulty 1–2 共 **324 词**（词面适龄：swamp/zombie/sword 级别），图片 24.2MB 全本地 PNG，其中带 mp3 的直接用。
  - 第二批（后续按需）：按趣味类别补 mob(154)/biome(146)/tool(72)/food(30)/structure(29)。
  - **不进学习流**：block(538)/item(461)/color(277) 的量产变体词（各色羊毛之类），可留作后续游戏词池。
- **接入前必修的质量问题**（实测）：
  1. `exampleZh` 约 15% 与英文错配（309 张套模板"我把X带在包里"，285 张错）。修法：英文例句只有 **126 个模板**（87 个覆盖 95%），人工把模板翻译一遍 → 脚本按模板重写全部中文例句。
  2. `phrase` 有 403 张 "use the X"（共 17 个模板），同样做模板级重写为学习向词组。
  3. 音标覆盖仅 23%——幼儿卡不展示音标，**不补**。
  4. 音频覆盖仅 11%（214 条）——有则用、缺失回退 Web Speech，S4 统一考虑补齐。
- 图片全本地，**无需外链**（用户虽允许外链，但本地更稳，且有 maxcdn 停服前车之鉴）。

## 3. 统一 schema v1（词库数据库格式）

每库每行统一为对象，公共字段固定，学科差异收进 `extra`：

```json
{
  "id": "en-apple",
  "kind": "english",
  "text": "apple",
  "zh": "苹果",
  "theme": "食物",
  "level": "L1",
  "phrase": "I eat an apple.",
  "phraseZh": "我吃一个苹果。",
  "media": { "image": "assets/img/vocab/apple.png", "art": "emoji:🍎", "audio": "assets/audio/vocab/apple.mp3" },
  "source": "base-597",
  "extra": {}
}
```

- `media.image`：本地相对路径，**禁止 http(s) 外链**（校验脚本硬拦）。
- `media.art`：兜底矢量描述 `emoji:X | color:#xxx | dots:N | none`，由 card-art 渲染；`none` 表示文字卡。
- `media.audio`：本地 mp3，空则回退 Web Speech。
- `extra` per kind：识字 `{pinyin, words[], explain}`；拼音 `{initial, homophones[], nearPhones[]}`；拼读 `{graphemes[], phonemes[], stageId}`。
- 新增 `prj/data/preschool/banks-index.json`：每库 `path/kind/count/schemaVersion/levels 分布`，作为脚本与文档的唯一盘点入口。

## 4. 接口重建（构建期 + 运行时）

```
源 JSON（schema v1）
  → scripts/validate-banks.mjs   新增：必填字段/id 唯一/外链禁止/media 文件存在性校验，挂 npm test
  → scripts/build-preschool-banks.py   改造：读 schema v1，产物保持 JS 全局变量不变
  → prj/preschool-*-data.js
  → 运行时 resolvePreschoolCardMedia(entry)   新增：统一返回 {imageUrl?|artSvg?|audioUrl?}
  → app.js / preschool-literacy.js 等引擎    渲染与"听一听"全部走该接口
```

引擎消费的全局变量名和页面行为不变；卡片渲染顺序：有 `media.image` 显示位图 → 否则 `media.art` 渲染 SVG → `art:none` 纯文字。发音：有 `media.audio` 播文件 → 否则 Web Speech。

## 5. 改动范围

- 新建：`scripts/extract-wordquest-assets.mjs`、`scripts/validate-banks.mjs`、`scripts/migrate-banks-schema-v1.mjs`（一次性）、`prj/data/preschool/banks-index.json`、`prj/assets/img/vocab/`（108 PNG）、`prj/assets/audio/vocab/`（33 mp3）
- 修改：`prj/data/preschool/` 五科源 JSON（schema 迁移）、`scripts/build-preschool-banks.py`、`prj/app.js`、`prj/preschool-card-art.js`（支持 `none`）、`prj/preschool-workbench/index.html`（缓存戳）、`.gitignore`、`tests/`
- 明确不碰：`levels.json` 分级口径、`dailyPlans/courseProgress` 存储结构、三世界游戏、古诗/数学/运动库的内容本身（只动格式外壳）

## 6. 硬性约束

1. 词量口径：`vocabulary-bank.json` 保持 597 条、`character-bank.json` 保持 1500 条，校验脚本断言条数；Minecraft 词只进 `minecraft-bank.json` 新文件（第一批断言 324 条）。
2. 素材本地化：`media.*` 出现 `http` 即校验失败。
3. 生成产物（`preschool-*-data.js`）只能由构建脚本产出，禁止手改。
4. 每阶段独立可验收、可回滚：S2 迁移脚本保留，源 JSON 迁移前先备份到 `.tmp-analysis/`。
5. WordQuest 原包目录加入 `.gitignore`，仓库只进筛出的 ~4MB 素材。
6. S4（Piper TTS 批量音频）必须用户明确同意后才启动，不随 S1–S3 顺带执行。

## 7. 升级条件（停下来问用户）

- S2 迁移中发现某库有字段无法归入公共字段/`extra`（语义冲突）→ 停，带样例请示
- 108 张 PNG 中肉眼抽查发现与词义不符（如游戏截图）→ 剔除该词回退 emoji-art，超过 10 张则停下请示
- 引擎改接口时发现有第二处独立查表逻辑（card-art 之外）→ 停，报清单再定
