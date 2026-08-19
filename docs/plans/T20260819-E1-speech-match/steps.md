# 步骤

> 验证命令以退出码为准。先红后绿。

### 1. S1 · 纯函数模块

- [x] 写测试 `tests/speech-match.test.mjs` 先红：tokenize（缩写/中英混/纯中文）、lemma（不规则 + 规则后缀 + 双写）、LCS（保序反例 `the cat sat on the mat` vs `mat the cat sat` → 3/6）、evaluate 三场景阈值边界（0.95/0.80/0.60/0.40 恰好值）、noEnglishDetected
- [x] 新建 `prj/games/shared/speech-match.js`：无 DOM、无 fetch，浏览器 `<script>` 与 `node --test` 双可用（跟 `workbench-bridge.js` 同款 UMD 写法）
- [x] 从 catalog.json 生成不规则表（脚本一次性产出，硬编码进模块并注明来源）
- **验证：** `node --test tests/speech-match.test.mjs` → 10/10，退出码 0

### 2. S2 · blocklegend 接入

- [x] `data/speech-input.js`：`matchHeard`/`matchPhrase` 主路径走 `SpeechMatch.evaluate`；保留中文义、STT 别名、短词编辑距离作为识别噪声适配，避免旧合同回退
- [x] Boss speak / 词卡跟读：`heardHits` 读 evaluate 结果，pass 才破罩/记正确
- [x] 练一句（`scenes.js`）：`scene='sentence'`，返回 `stars`（Perfect/Excellent=3、Good=2、Fair=1）
- [x] 纯录音降级：无 ASR 文本时 toast「记下了，没有听清词」，不判负
- **验证：** `node --test tests/blocklegend.test.mjs` 187/187。手玩见 acceptance

### 3. S3 · 高亮与收口

- [x] 评测结果面板：听写条与练一句未过关时，命中词 `<em class="bl-hit">` 亮色
- [x] 帮助文案补"说对大意即过，变形也算"；test-report 记退出码
- [ ] blocklegend 改动同步推送独立仓（本地目录无 `.git`，待手动同步）
- **验证：** 定向测试绿。不标 accepted，等手玩。
