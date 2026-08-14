# 游戏化学习 · 参考项目合入方案

> 核验日期：2026-08-14  
> 源文档：`workbuddy游戏化学习.md`、`DS--学习游戏--参考项目.md`  
> 克隆落点：`docs/学习项目设计/refs/`（已 gitignore，不进发布树、不进 `prj/`）  
> 本文是合入裁决，不是“已实现”。

---

## 0. 结论先说

参考文档里“直接 fork / 直接嵌入”的说法**不能照做**。工作台已经有自己的运行时：8 个学习专区、22 节课时、3 个世界游戏、统一阳光账本。该借的是**玩法结构**，不是整仓代码。

| 裁决 | 原因 |
|---|---|
| **不 fork yxj-workbench** | 无 LICENSE；工作台比它更完整（花园/三世界/徽章） |
| **不把 LibreToybox 复制进 `prj/`** | GPL-3.0，嵌入会污染整仓许可 |
| **不搬 kids-learning-cards / kindergarten-apps 源码** | 非商用许可，YAML/HTML 不得进运行时 |
| **不搬 words-game / yxj 课文句 / 译林单元词** | 无 LICENSE，且含教材单元原文 |
| **可合入** | 用现有 240 字 / 342 词 / 63 拼音 / 30 口算，**重写**配对、拼写、听选、排序、BOSS 关 |

WorkBuddy 那份提示词不是仓库，是**关卡结构**：教学页 → 答题 → 满星解锁 BOSS。应做成现有课时的一种 `mode`，不要再生成独立 HTML、不要新 localStorage。

---

## 1. 已下载仓库（10/10）

| 项目 | 本地路径 | 文件数 | LICENSE | 和文档说法的差异 |
|---|---|---|---|---|
| yxj-workbench | `refs/yxj-workbench` | 188 | **无** | 5 个游戏函数都在 `js/games.js`；笔顺 165 个 JSON |
| kids-learning-cards | `refs/kids-learning-cards` | 62 | PolyForm Noncommercial 1.0.0 | 是生成器，不是运行时；示例卡很少 |
| chineseproject | `refs/chineseproject` | 84 | README 写 MIT，**仓库无 LICENSE 文件** | React+Vite+Gemini；字 50 / 词 100 |
| words-game | `refs/words-game` | 5 | **无** | 译林牛津四年级 4A/4B 单元词，不是通用 150 词 |
| LibreToybox | `refs/LibreToybox` | 31 | **GPL-3.0** | 实际 10+ 个目录，不止文档写的 6 个 |
| kindergarten-apps | `refs/kindergarten-apps` | 13 | **CC BY-NC 4.0** | 加减网格 + 排序 + 还有多米诺/数轴未写进文档 |
| AI-GAME-COOL | `refs/AI-GAME-COOL` | 307 | Apache-2.0 | Java 后端 Agent，不是可嵌入小游戏 |
| letter_learning_game | `refs/letter_learning_game` | 7 | MIT + **禁止提供给 OpenAI/Anthropic** | 单文件三模式，只借玩法名 |
| super-catrio | `refs/super-catrio` | 26 | **无** | 横版跳跃；工作台已有 `platform-quest` |
| shici | `refs/shici` | 65 | **无** | 诗词网站 + `work_repo.json`，约 800 首；注释/拼音是站点汇编 |

---

## 2. 工作台现状（合入必须贴这条路径）

| 已有 | 路径 | 合入时怎么用 |
|---|---|---|
| 识字 240 字 + 闪卡/组词/找字 | `character-bank.json`、`preschool-literacy.js` | 新玩法读这个库 |
| 笔顺 140 字 | `preschool-literacy-strokes-data.js`（yxj 子集，已标注来源） | 缺的 100 字用 Hanzi Writer / Make Me a Hanzi，不整包复制 yxj |
| 拼音 63 项 | `pinyin-initial-bank.json` | 配对/听选都用这项 |
| 英语 342 词 | `vocabulary-bank.json` | 卡片/拼写/配对/闯关共用 |
| 拼读 94 词 + 26 字母 | `phonics/word-bank.json`、`letter-bank.json` | 字母课已 playable |
| 口算 30 题 | `数学/problem-bank.json` | 排序/网格重写出题，不抄 NC 源码 |
| 古诗 8 首 | `poem-bank.json` | 先接满 8 首，再补公版篇目 |
| 三世界游戏 | `prj/games/{garden-defense,voxel-adventure,platform-quest}` | 马里奥闯关已经有；`super-catrio` 不必进仓 |
| 阳光账本 | `petbank_huchuliang_preschool_workbench_state_v1` | 学习游戏走课时 +20；世界游戏走 `workbench-bridge` 日上限 80 |
| 徽章 11 枚 | `preschool-achievements.js` | 不另做积分等级 |

禁止：新 `doudou_*` / `yxj_*` key、iframe 外链当正式课、把参考仓拷进 `prj/`。

---

## 3. 逐项：能合什么、合到哪、怎么合

### 3.1 WorkBuddy 闯关结构（提示词，无仓库）

**可借：** 每关 = 教学 2–4 页 + 答题 3–6 题；满星才解锁下一关；最后 BOSS 3 题 3 命；错题本按关分组。

**不合：** 独立单文件 HTML、Press Start 2P 马里奥皮、新 localStorage（金币/解锁数组）、Google Fonts 外链。

**合入点：** `config.js` 课时 `activity.mode` 增加 `lesson-quest`（或复用现有 bank-quiz + 教学页）。题目从现有字/词/拼音/口算库抽，不按 PDF 现编。

**最小切片：** 先给「今日识字」加一页教学（字+词+读）再进现有闪卡，BOSS 用找字 5 关当综合题。

### 3.2 yxj-workbench

**可借（只看结构）：** 每日 5 词轮换（已做）；拼音对对碰 / 单词找朋友 / 数字排队的规则；笔顺 JSON 字段形态。

**已合入：** 240 字里含 yxj 多出的生活字；笔顺 140/165；拼音方案 23+24+16。

**不合：** `js/games.js`、`data-english.js` 80 句、`data-poems.js`、`store.js`、口诀正文。无 LICENSE。

**合入点：** 在 `app.js` 的 bank-quiz 上加 `mode: 'pair-match'`，数据用拼音 63 / 英语 342。不要把 yxj 游戏乐园整页嵌进来。

### 3.3 kids-learning-cards

**可借：** 英语卡字段：`ipa / phonics / family.rime / phrase / sentence / parent_steps`。

**不合：** YAML、Jinja 模板、AI 图、生成脚本、示例 HTML。PolyForm NC。

**合入点：** 给 `vocabulary-bank.json` **自写**少量字段（如 `rime`），只覆盖已有 CVC 词。不跑它的 Python 管线。

### 3.4 chineseproject

**可借：** 课里挂多种游戏名：`flashcard`、`listen_and_select`、`picture_to_word`；先试对再加分的思路（对标阳光，不新建分）。

**不合：** React 应用、Gemini、50 字/100 词库、积分等级表。LICENSE 文件缺失。

**合入点：** 识字第三课已是听音选字。下一步是同一套 `literacy` 掌握度上加“看图选字”，图用工作台已有 icon，不引入 Gemini。

### 3.5 words-game

**可借：** 四种模式名：翻卡 / 拼写 / 四选一 / 配对。

**不合：** `wordsData` 整表（译林 4A/4B 单元）。无 LICENSE。

**合入点：** `english-speak` 旁加 `english-spell`、`english-match`，词从 342 词库取。拼写用大按钮字母，不用键盘输入。

### 3.6 LibreToybox

**可借：** 设计原则（无计时惩罚、大热区、错了弹回）。玩法名：记忆翻牌、找不同、数独入门。

**不合：** 任何 `index.html` 进 `prj/`。GPL-3.0 会逼整仓开源。

**合入点：** 专注力专区用自有题重写「找不同 / 记忆翻牌」。若以后要玩原作，只外链，不当课时。

### 3.7 kindergarten-apps

**可借：** 加法网格、数字排序的交互形状。

**不合：** `app.html` 与 mixbox。CC BY-NC。

**合入点：** 数学 L2/L3 旁加 `math-order`（1–9 排队），题目由 `preschool-math-bank.js` 生成。

### 3.8 AI-GAME-COOL

**可借：** 离线当原型工具，看它的 preset 玩法清单（数数、配对、颜色分类）。

**不合：** Java 后端、saved-games HTML 不当运行时。

**合入点：** 不进 `prj/`。需要新玩法时先在本机生成原型，再按工作台引擎重写。

### 3.9 letter_learning_game

**可借：** Find Letters / Word Builder / Tracing 三模式名。

**不合：** 单文件源码（附加 rider）。描红用现有笔顺/Hanzi Writer。

**合入点：** 拼读课已有字母听选；Word Builder 用 `phonics/word-bank.json` 的 CVC 29 词自写拼词。

### 3.10 super-catrio

**可借：** 二段跳、踩头、收集物——对照现有 `platform-quest` 缺什么。

**不合：** 整游戏。无 LICENSE。工作台已有横版世界 + `workbench-bridge`。

**合入点：** 只改 `prj/games/platform-quest/`，不新开第四世界。

### 3.11 shici

**可借：** 篇目清单（唐诗/宋词/千家诗目录），用来挑幼儿能听的绝句。

**不合：** `work_repo.json`、注释、自动拼音、站点代码。无 LICENSE；自动拼音 README 自己写了多音字不准。

**合入点：** 公版诗句手抄进 `poem-bank.json`（标题+作者+四句）。先把现有 8 首接到三课，再补到 16–20 首幼儿绝句。不要 800 首进运行时。

---

## 4. 按模块的合入顺序（只排能接到现有课的）

### P0 · 用已有库加玩法（不下载、不嵌 HTML）

| 切片 | 工作台入口 | 参考玩法 | 数据 |
|---|---|---|---|
| 英语配对 | `preschool-english` 新一课或今日 5 词加一步 | words-game 配对 | 342 词当日窗口 |
| 英语拼写 | 同上 | letter Word Builder | 当日 5 词，字母按钮 |
| 拼音对对碰 | `preschool-pinyin` 加一课或第 1 课第二轮 | yxj `pinyinGame` | 63 项里抽声母 |

### P1 · 数学 / 专注补关

| 切片 | 入口 | 参考 | 数据 |
|---|---|---|---|
| 数字排队 | `preschool-math-2` 或新 L2 变体 | yxj `numberOrderGame` / kindergarten 排序 | 自生成 1–9 |
| 找不同 | `preschool-focus` 换掉手写 choice | LibreToybox Spot It **规则** | 自写 emoji/图形组 |

### P2 · 闯关壳 + 诗库

| 切片 | 入口 | 参考 | 数据 |
|---|---|---|---|
| 教学页 + BOSS | 识字/英语各一课 | WorkBuddy 结构 | 现有库，错题写入 `courseProgress` |
| 古诗扩到 16 首 | `preschool-poetry` 三课轮库 | shici **目录** | 公版绝句手抄 |

### 明确不做

- 游戏乐园页嵌 6+5 个外站 HTML  
- fork yxj 当主框架  
- 译林四年级词表进库  
- LibreToybox / kindergarten-apps 源码进 `prj/`  
- AI-GAME-COOL 当运行时依赖  
- 第四个世界游戏（猫里奥）

---

## 5. 许可速查（进 `prj/` 前看这一行）

| 许可 | 项目 | 进运行时？ |
|---|---|---|
| 无 LICENSE | yxj、words-game、super-catrio、shici、chineseproject（缺文件） | 否，只看结构 |
| PolyForm NC | kids-learning-cards | 否 |
| CC BY-NC | kindergarten-apps | 否 |
| GPL-3.0 | LibreToybox | 否（外链可以） |
| Apache-2.0 | AI-GAME-COOL | 工具仓，不嵌 |
| MIT+rider | letter_learning_game | 不复制源码 |
| 公版词表/诗句 | Dolch、汉语拼音方案、唐诗绝句原文 | 可以，手抄 + 自写例句 |

---

## 6. 和参考文档原文的修正

`DS--学习游戏--参考项目.md` 里这几句需要改口径：

1. 「LibreToybox 直接嵌入」→ **不能复制进仓**，GPL。  
2. 「yxj 5 个游戏直接嵌入 / 笔顺直接复用」→ 游戏重写；笔顺已抽 140 字，其余走 Hanzi Writer。  
3. 「words-game 150+ 词可迁移」→ 那是教材单元表，**不能迁词，只能迁玩法**。  
4. 「fork yxj 再填内容」→ 工作台已是主框架，方向反了。  
5. `DS--游戏化学习--设计方案.md` 原先是空文件；本文补成合入方案。

---

## 7. 下一件最小交付

先做 **英语配对**：`mode: 'english-match'`，当日 5 词中英翻牌，答完走现有 `preschool-english-words-1` 完成与阳光。不新增存储键，不拷 `words_game.html`。
