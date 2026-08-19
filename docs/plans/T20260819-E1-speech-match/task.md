# T20260819-E1-speech-match - 任务定义卡

> 默认模式：L1 标准

## 0. 领域画像

- 主画像：软件开发
- 次画像：算法/纯函数模块

## 1. 任务目标

- 一句话：新建共享评测模块 `speech-match.js`，把 blocklegend 所有"说"的判定从内联字符串比较换成"lemma + LCS 覆盖率 + 分场景阈值"。
- 为什么现在做：Boss speak 通道和练一句的判定不可信（Web Speech 拿到的文本和目标句稍有出入就判负），孩子说对了却过不了，"说"的闭环名存实亡。
- 预期收益：说对 3/4 词能过、说无关话不能过；逐词命中高亮给出可解释反馈；评测逻辑一份、单测一份，工作台后续复用。

## 2. 输入基线

- 参数蓝本：`docs/plans/T20260819-echoloop-borrow/04-机制参数速查.md` §1–§2（tokenize 正则、LCS、覆盖率、阈值表）
- 词表：`prj/assets/vocab/core-english-2026.08.15/catalog.json`（597 词，用于生成不规则动词/名词表）
- 现有判定：`prj/games/blocklegend/data/speech-input.js`（ASR 三档降级保留，判定层替换）
- 接入点：blocklegend `game.js`（Boss speak 通道、enpick/跟读题型）、`data/scenes.js`（练一句）

## 3. 子任务

| ID | 描述 | 文件 | 验证 |
|---|---|---|---|
| S1 | 纯函数模块：tokenize / lemma / lcsCoverage / evaluate(ref, hyp, scene) | 新建 `prj/games/shared/speech-match.js`、`tests/speech-match.test.mjs` | `node --test tests/speech-match.test.mjs` |
| S2 | blocklegend 判定接入：speech-input 只管拿文本，判定走 speech-match；三接入点换判据 | `data/speech-input.js`、`game.js`、`data/scenes.js` | 定向测试 + 手玩 |
| S3 | 逐词命中高亮 UI + 收口（帮助文案、总控一行、test-report） | `game.js`、`game.css`、文档 | 定向测试绿 |

## 4. 设计要点（照 04 速查实现，不翻原仓）

- tokenize：`[A-Za-z]+(?:'[A-Za-z]+)?`，小写，保留 `[start,end)` 区间；
- lemma：自建——不规则表（从 597 词表实际形态生成，预计 ≤100 条）+ 后缀剥离（`-ies→y / -es / -s / -ed / -ing`，处理辅音双写）；接口 `lemma(form) → base`；
- LCS：token 级保序 DP + 回溯，输出两侧命中下标；
- evaluate 场景阈值：`word`（单词：lemma 相等即 pass）；`sentence`（跟读：Perfect 0.95 / Excellent 0.80 / Good 0.60 / Fair 0.40，pass ≥0.5）；`retell`（复述：0.90 / 0.75 / 0.50 / 0.20，pass ≥0.4）；
- 无英文词 → `noEnglishDetected`，score 0；**评分低不阻断游戏推进**（有识别结果就给反馈，让玩家决定重试）。

## 5. 边界

禁止碰：`prj/preschool-english-vocab.js`、mastery 数据、`workbench-bridge.js`、其他游戏。
不做：声学发音打分、云端评测、录音波形对比。
不复制 Echo-Loop 任何代码/资源（借鉴包 01 §4）。
blocklegend 改动完成后**当轮同步推送独立仓**（本地无 .git 保护，见借鉴包 02 §5）。
