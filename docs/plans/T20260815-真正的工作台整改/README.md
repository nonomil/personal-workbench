# T20260815-真正的工作台整改（待启动，A1 可直接执行）

> 源头：`docs/01-方案/什么是真正的工作台/什么是真正的工作台.md` + 2026-08-15 全项目对照分析（结论见 `docs/00-总控/当前状态.md` §3.21）。
> 本包替代已删除的 `T20260815-true-workbench-alignment/`（该包把英语掌握字段误写为 `wordStates`，代码实名是 `child-courses.js` 的 `mastery` 表；本包已按代码实读修正）。

## 一句话结论

幼儿版"数据从真实行为自动沉淀"基本达标；成人版是文章批评的手动打卡形态；运行时无 AI 交互；数据孤岛：blocklegend 词卡答题结果只留在 `growth.worldGames.blocklegend`，不进 `courseProgress.minecraft.mastery`，MC英语专区不知道孩子在游戏里学会了什么。

## 侦查结论（2026-08-15 已完成，代码实读）

这些事实让 A1 比预想的小得多：

| 事实 | 证据 |
|---|---|
| `courseProgress.minecraft.mastery` 已存在，`normalizeEnglish` 归一化（state/dates/attempts/correct/nextReview） | `prj/child-courses.js` L54–84、`saveMinecraft` L106–110 |
| MC英语专区"会了 X / 324"、复习标黄全部从这张 mastery 表派生，**回流后 app.js 无需改动** | `prj/app.js` L3724–3773（`courseProgress.minecraft` 读取与统计行） |
| mastery 更新有现成纯函数 `markKnown(progress, word, known, date, rules)`，含 1/3/7 式 `nextReview` 推进，key 为小写词文本 | `prj/preschool-english-vocab.js` L158–179 |
| blocklegend 页面**已加载**同一 324 词库 `preschool-minecraft-vocab-data.js`，词文本 key 天然一致 | `prj/games/blocklegend/index.html` L116 |
| 游戏答对/答错分支位置明确 | `prj/games/blocklegend/game.js` L488–490（对）、对应 wrong 分支 |
| bridge 已有读 `courseProgress` 先例（识字难度联动），写回流是新增 | `prj/games/shared/workbench-bridge.js` L23–42 |

## 范围

| 子项 | 内容 | 优先级 | 状态 |
|---|---|---|---|
| A1 | blocklegend 答词结果回流 `courseProgress.minecraft.mastery`（bridge 新增 `recordWordAnswer`；不发阳光、不写 mistakes，复习由 `nextReview` 自然派生）+ 顺手把 `docs/data-model.md` 的 `wordStates/charStates` 过时字段名改为 `mastery` 实名 | P1 | **review** 待手玩；合同 26/26 |
| A2 | 成人版数据来源二选一（**决策项**）：方向甲=接真实工作痕迹（导入 git log JSON → 年热力图，纯前端导入不做后台监听）；方向乙=承认记录本定位，砍掉打卡外观（checkedDates 连续仪表） | P2 | 等用户拍板，未拍板不动代码 |
| A3 | 家长侧"AI 周总结素材"一键导出：`checkinDates`/`mistakes`/`courseProgress`/`getWeeklyReport` 拼装为 Markdown+JSON 下载，供粘贴给任意 AI；运行时不内置模型调用 | P2 | 建议排在 B2/B3 验收后 |

## 明确不做（红线，执行时不得放宽）

- 激励账本零新增：无新货币/倍率/排行/惩罚/手动打卡按钮；A1 回流**零阳光发放**（阳光仍只走既有 `awardSunlight` 通道）。
- 零新 localStorage 主 key；A1 只写既有 `courseProgress.minecraft` 命名空间。
- 不在运行时内置联网 AI；A3 只做本地导出。
- A1 不动 `preschool-minecraft-vocab-data.js` 词库内容；不动 `growth.worldGames.blocklegend`（`learnedIds` 保留为游戏内展示账本）。
- 不把 docs/ 资料库塞进产品运行时。

## 文件清单

- 怎么改（函数级）：`steps.md`
- 需求核对：`requirements-checklist.md`
- 验收标准：`acceptance.md`
- 测试计划：`test-plan.md`
- 测试报告（执行时填写）：`test-report.md`
