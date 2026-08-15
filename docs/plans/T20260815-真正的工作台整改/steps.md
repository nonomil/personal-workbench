# steps：怎么改（函数级）

> 执行顺序：S1 红合同 → S2 bridge → S3 游戏接线 → S4 文档订正 → S5 浏览器走查。
> A2/A3 的步骤在拍板/启动时再补，本文只写 A1。

## S1 合同先红（`tests/blocklegend.test.mjs`）

参照本文件现有的 bridge 测试装法（fake `localStorage` + 加载 `workbench-bridge.js`），额外加载两个纯函数脚本：

- `prj/preschool-english-vocab.js`（提供 `PersonalWorkbenchPreschoolEnglishVocab.markKnown`）
- `prj/child-courses.js`（提供 `PersonalWorkbenchChildCourses.saveMinecraft`）

新增合同（先跑红）：

1. `recordWordAnswer('Creeper', true)` 后，快照 `courseProgress.minecraft.mastery['creeper']` 存在，`attempts=1`、`correct=1`、`state='ready'`、`nextReview` 为今天+3 天。
2. 同日再答对同一词：`attempts=2`、`dates.length=1`（日期去重）。
3. `recordWordAnswer('zombie', false)`：`state='practicing'`、`nextReview` 为今天+1 天。
4. 回流前后 `growth.sunlight`、`growth.totalSunlightEarned` 完全不变（零发放红线）。
5. 引擎脚本未加载时（删掉 global 再调）：函数返回 `null` 且不抛异常、不写快照。
6. 旧快照 `courseProgress` 缺 `minecraft` 字段时回流不炸（`saveMinecraft` 内部 normalize 兜底）。

## S2 bridge 新增回流函数（`prj/games/shared/workbench-bridge.js`）

在现有 `readState`（L92）/ `writeState`（L119）旁新增，并挂到对外导出对象：

```js
/** 词卡答题回流：只写 courseProgress.minecraft.mastery，零阳光、零 worldGames 改动 */
function recordWordAnswer(word, correct) {
    const engine = global.PersonalWorkbenchPreschoolEnglishVocab;
    const courses = global.PersonalWorkbenchChildCourses;
    if (!word || !engine || typeof engine.markKnown !== 'function'
        || !courses || typeof courses.saveMinecraft !== 'function') return null;
    const state = readState();
    const current = (state.courseProgress && state.courseProgress.minecraft) || engine.createDefaultProgress();
    const next = engine.markKnown(current, word, !!correct, today());
    state.courseProgress = courses.saveMinecraft(state.courseProgress || {}, next);
    if (!writeState(state)) return null;
    return next.mastery[String(word).toLowerCase()] || null;
}
```

要点：

- `markKnown` 第 5 参 `rules` 故意不传：`intervalDays`（`preschool-english-vocab.js` L68–73）会回退默认 1/3/7 间隔，避免 blocklegend 页面额外加载 597 词数据文件。
- key 是小写词文本（`markKnown` 内部 `toLowerCase`），与 app.js MC 专区、错题 `sourceKey: 'minecraft:<text>'` 口径天然一致。
- 引擎缺失时静默返回 `null`：三个旧游戏页不加载词汇引擎，bridge 在它们那里必须无害。
- **不要**在此函数里调 `awardSunlight`、不动 `growth.worldGames`。

## S3 游戏接线（`prj/games/blocklegend/` 两个文件）

1. `index.html`：在 L116（MC 词库）之后、`game.js` 之前补两行（带缓存戳，如 `?v=20260815-word-backflow-v1`）：

```html
<script src="../../preschool-english-vocab.js?v=20260815-word-backflow-v1"></script>
<script src="../../child-courses.js?v=20260815-word-backflow-v1"></script>
```

2. `game.js`：找到答题结算分支（答对分支现为 L488–490，`progress.rightCount += 1` 和 `learnedIds.push` 处；同函数内有对应答错分支 `wrongCount`），在两个分支各加一行：

```js
if (global.WorkbenchGameBridge && global.WorkbenchGameBridge.recordWordAnswer) {
    global.WorkbenchGameBridge.recordWordAnswer(word.text, correct);
}
```

注意用 `word.text`（英文词文本），不是 `word.id`；`learnedIds` 原逻辑一行不动（它仍是游戏内"新词"轮换的依据）。

3. `index.html` 里 `game.js` 的缓存戳同步升级。

## S4 文档订正

- `docs/data-model.md`：把"识字/英语各有按字/词的掌握状态表(`charStates` / `wordStates`)"订正为实名——`courseProgress.<subject>.mastery`（`child-courses.js` `normalize`，科目含 literacy/english/pinyin/poetry/math/motion/phonics/minecraft），并补一句"blocklegend 答词经 bridge `recordWordAnswer` 回流 `minecraft.mastery`，不发阳光"。
- 同文件示例 JSON 中 `courseProgress` 的 `charStates/wordStates` 示例字段一并改为 `mastery` 结构。

## S5 浏览器走查（写进 test-report）

1. 开本地服务，进 `prj/games/blocklegend/index.html`，答对 2 词、答错 1 词。
2. DevTools 读 `localStorage` 快照：`courseProgress.minecraft.mastery` 有 3 个 key，state 分别 ready/ready/practicing；`growth.sunlight` 与进游戏前一致（本轮无通关结算时）。
3. 回工作台 MC英语专区（卡片墙 → MC英语）：「会了 X / 324」较答题前 +2。
4. 刷新后数字保留；次日（可改系统日期或改 nextReview 验证）答错词出现在"今天再认"。

## 完成定义

S1–S5 全绿 + `npm test` 不低于启动时基线 + `git diff --check` 通过，填 `test-report.md` 后把 `.meta.yaml` status 改 `review`，等用户验收，不 commit。
