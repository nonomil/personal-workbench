# acceptance：验收标准

## A1 词学回流（本包核心）

必须全部满足才算过：

1. **合同先红后绿**：`tests/blocklegend.test.mjs` 新增 6 条合同（见 steps §S1）先以红状态提交证据，再转绿。
2. **专区联动**：浏览器实测 blocklegend 答对 2 词后，MC英语专区「会了 X / 324」+2，刷新保留。
3. **幂等**：同日重复答同一词，`dates` 不重复、阳光不变。
4. **零发放**：回流前后 `growth.sunlight`、`totalSunlightEarned` 逐字节一致（无通关结算干扰的对照）。
5. **无害兜底**：旧快照缺 `minecraft` 字段不炸；其他三个游戏页（不加载词汇引擎）打开无 console error。
6. **文档回真**：`docs/data-model.md` 无 `wordStates`/`charStates` 残留，`mastery` 实名 + 回流说明就位。
7. **基线**：全量 `npm test` 不低于启动时基线（启动时记录基线数）；`git diff --check` 通过；改动文件不超出 task.md §2 清单。

## A2 成人版裁决

- `docs/00-总控/决策记录` 有方向甲/乙裁决条目（含日期与理由）才算 A2 启动条件达成；实现验收标准随裁决方向在补充控制面时定义。

## A3 周总结导出

- 导出的 Markdown 含：本周点亮日数、完成课程列表、错题列表（题干+日期）、游戏里程碑、周报三行；抽 3 项与快照实读人工核对一致。
- 导出为纯前端 Blob 下载，断网可用；无任何 fetch 调用新增。

## 验收人

- 自动部分：执行者跑测试并填 `test-report.md`。
- 最终 accepted：用户手玩确认（blocklegend 答题 → 专区数字增长），未确认前 status 停在 `review`。
