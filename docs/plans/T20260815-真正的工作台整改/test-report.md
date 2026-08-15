# test-report

> A1 已执行。未经用户手玩确认不标 accepted、不 commit。

## 启动基线

- 启动日期：2026-08-15
- `npm test` 启动前口径（总控当时记录）：377/384，7 个既有失败
- `markKnown` 签名抽查：`markKnown(progress, word, known, date, rules)`，rules 可省略，默认间隔 `[1, 3, 7, 14]`
- blocklegend index.html 词库加载抽查：已有 `preschool-minecraft-vocab-data.js`；本包补 `preschool-english-vocab.js` + `child-courses.js`

## 自动化结果

| # | 用例 | 结果 | 证据 |
|---|---|---|---|
| T1 | 答对回流 ready / +3 | 通过 | 先红（`recordWordAnswer` 为 undefined）后绿；`tests/blocklegend.test.mjs` 26/26 |
| T2 | 同日重复 dates 去重 | 通过 | 同上 |
| T3 | 答错 practicing / +1 | 通过 | 同上 |
| T4 | 零发放 | 通过 | sunlight / totalSunlightEarned / awardedIds 不变 |
| T5 | 引擎缺失返回 null | 通过 | 不抛、不写 store |
| T6 | 旧快照缺 minecraft 不炸 | 通过 | 保留 `completedLessonIds` |
| T7 | 既有 19 条不回退 | 通过 | 原 19 + 新 7 = 26/26 |
| T8 | 全量回归 | 部分 | `npm test` **395/404**，退出码 1。9 个失败均不在本包文件：defense 棋盘、garden invader、lesson-pack 接线、refresh 课表/图标/闪卡戳、asset-allowlist、release-contract 入口图。本包新增 7 条全绿。`git diff --check` 本包文件无空白错误（仓库另有无关 EOF 警告）。 |

红证据：先跑时 19 绿 / 7 红，失败原因是 `typeof recordWordAnswer === 'undefined'` 与页面未加载词汇引擎。

## 浏览器走查结果

| # | 结果 | 证据（数值/截图路径） |
|---|---|---|
| B1 | 待用户手玩 | 3D 词卡答题未在本会话自动化；合同已覆盖 2 对 1 错的 mastery 形态 |
| B2 | 待用户手玩 | MC英语「会了 X / 324」从同一 `minecraft.mastery` 派生（`app.js` countTrack），合同写 ready=known |
| B3 | 待用户手玩 | 快照写入 `petbank_huchuliang_preschool_workbench_state_v1`，刷新应保留 |
| B4 | 源码层通过 | 其他三游戏页不加载词汇引擎；`recordWordAnswer` 缺引擎时返回 null（T5） |
| B5 | 未做 | 本包不改 UI，未跑 320/390 走查 |

## 遗留与偏离

- 测试里 `deepStrictEqual` 比较 vm 沙箱数组会误报“结构相同但不是同一引用”，改为按 length + 下标取值比较。实现未改。
- A2 / A3 未启动。
- 全量 9 红为既有/并行会话问题，本包未修。

## 结论

- status：`review`（A1 待用户手玩验收）
- 未经用户确认不标 accepted、不 commit。
