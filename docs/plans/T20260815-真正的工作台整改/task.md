# task：对照《什么是真正的工作台》的差距整改

- 级别：L2（轻）
- 优先级：A1=P1、A2/A3=P2
- 状态：pending（A1 可直接启动；A2 未拍板不得动成人版代码）

## 1. 目标

文章三观点对照项目的三个缺口：

1. **A1 数据孤岛打通**（对应"工作台是综合数据库"）：孩子在方块传奇里答对的词，MC英语专区必须知道。回流目标是既有的 `courseProgress.minecraft.mastery`，专区统计和复习标黄自动生效，app.js 零改动。
2. **A2 成人版定位裁决**（对应"不能反人性"）：成人版 habits `checkedDates` 手动点选、lifeEntries/milestones 全手填，是文章反对的"人为打卡"。先拍板方向，再动代码。
3. **A3 AI 周总结素材导出**（对应"召唤 AI 一键写总结"）：家长一键导出本周结构化数据，粘贴给任意 AI 生成学习报告；本地导出，不联网。

## 2. 只改

- A1：`prj/games/shared/workbench-bridge.js`（新增 `recordWordAnswer`）、`prj/games/blocklegend/game.js`（答题分支两处调用）、`prj/games/blocklegend/index.html`（补两个 script 标签）、`tests/blocklegend.test.mjs`（合同）、`docs/data-model.md`（字段实名订正）。
- A2：拍板后另补文件清单。
- A3：`prj/app.js`（设置页/成长页导出按钮 + 拼装函数）、对应测试。

## 3. 不碰 / 不做

- 不发阳光、不写 mistakes、不动 `learnedIds`；回流只写 mastery。
- 零新 localStorage 主 key、零新激励机制。
- 不动 `preschool-english-vocab.js` / `child-courses.js` 的纯函数本体（只复用）。
- A2 未拍板前成人版一行不改。

## 4. 启动程序

1. A1 侦查已由 2026-08-15 分析会话完成（见 README 侦查结论表），启动时抽查两处即可：`markKnown` 签名未变、blocklegend index.html 仍加载 MC 词库。
2. 按 `steps.md` 先写红合同再实现。
3. A2 先向用户提交方向甲/乙一屏对比，拿到裁决写入 `docs/00-总控/决策记录` 后再补控制面。
4. 执行时把 `.meta.yaml` status 改 `in-progress`，完成后填 `test-report.md`。

## 5. 验收底线

见 `acceptance.md`。核心：合同先红后绿；MC英语专区数字随游戏答题增长且刷新保留；重复答同一词不重复计 dates；全量 `npm test` 不低于启动时基线；`git diff --check` 通过。
