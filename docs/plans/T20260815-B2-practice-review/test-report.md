# Test Report — T20260815-B2

> 执行时逐阶段回写。未执行的阶段保持"未开始"，不预填结论。

## 阶段 0：侦查

- 状态：已完成（2026-08-15）
- 六项任务实况表：

| 任务项 | 练习目标（lesson/mode） | 现状 | 依据（file:line） |
|---|---|---|---|
| 识字 | `preschool-chinese-1` / literacy-flash | 已接 | `prj/storage.js:12`；首页 `preschoolHomeLanePracticeButton` `prj/app.js:2245` |
| 古诗 | `preschool-poetry-1` / poetry-line | 已接 | `prj/storage.js:13` |
| 数学 | `preschool-math-1` / math-bank | 已接 | `prj/storage.js:14` |
| 英语 | `preschool-english-words-1` | 已接 | `prj/storage.js:15` |
| 运动 | `preschool-exercise-1` / `motion-timer` | 已接（复用现有 mode，不造引擎） | `prj/storage.js:16`；`prj/preschool-lesson-pack.js:39,87` |
| 专注 | `preschool-focus-1` / play-schulte | 已接 | `prj/storage.js:17` |

绘本/动画/熏听三项是 `checkinMode: 'timed'`，故意不接练习。

- 基线测试数：execution-check 记录 S1 放行时 `npm test` 260/260
- 结论：允许推进。六项映射在本切片开工前已在 storage 模板里齐，缺口是首页「去练习」按钮与错题 1/3/7 回流。

## 阶段 1：S1 合同先红后绿

- 状态：已完成（2026-08-15）
- 先红结果：本切片接手时映射合同已绿（六项 `practiceLessonId` 已在 `PRESCHOOL_DAILY_ITEMS`），未再人为先红。
- 转绿结果：`node --test tests/preschool-daily-plan.test.mjs` 退出码 0（含「six core daily plans map to real practice lessons」）
- 结论：S1 合同绿。

## 阶段 2：S1 浏览器证据

- 状态：未开始（代码已接，待真机逐项点「去练习」）
- 六项走查记录：无
- 结论（S1 验收 → 是否放行 S2 展开）：代码与合同已齐；浏览器走查仍待用户/本机验收。用户指示「继续」未完成学习项后，S2 与 S1 同切片落地（队列派生不依赖浏览器证据）。

## 阶段 3：S2 假时钟测试

- 状态：已完成（2026-08-15）
- 结果：`node --test tests/preschool-lesson-mistakes.test.mjs` 退出码 0
  - 到期入队：`2026-08-15` 对 date=08-14/12/08 入队（第 1/3/7 天）；第 2 天（08-16）空队
  - 练对出队：`markMistakeReviewed(..., true)` → `mastered`，当日与第 3 天均不再入队
  - 练错留队：`known=false` 仍 `todo`，当日仍在队
- 结论：1/3/7 派生规则绿；无新 storage 字段。

## 阶段 4：S2 浏览器证据

- 状态：未开始
- 结果：首页战场在队列非空时渲染「今天复习 N 题」(`open-review-practice`)；无错题不渲染。待真机造错题/改日期走一轮。

## 阶段 5：回归

- 状态：已跑，未宣称全绿
- 本包合同：`tests/preschool-daily-plan.test.mjs` + `tests/preschool-lesson-mistakes.test.mjs` + refresh 中练习/复习断言 **绿**
- `npm test`：352 项，**347 pass / 5 fail**。5 个失败均与本包无关，未修：
  1. `preschool-garden.test.mjs` 入侵者生命 9!==3
  2. icon 注册缺 `bomb`（既有）
  3. `release-asset-allowlist`：`vocab-mc/creeper` 商标名
  4. `release-contract`：缺 `platform-hero.png`
  5. `world-games-growth`：首页已拿掉三世界进度条，旧断言过期
- data-model 同步核对：`docs/data-model.md` 已补记 `mistakes` 1/3/7 派生队列，无新字段、主 key 未换。

## 遗留 / 升级记录

- 浏览器六项走查 + 复习入口两种状态截图仍缺，不把本包标 accepted。
- 未启动 B3。
