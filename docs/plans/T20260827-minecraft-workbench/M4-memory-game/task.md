# M4 — 消消乐任务化（独立开局 + 每日打卡）

## 目标

参考图5：工坊"游戏"tab 里直接开一局记忆配对（4×4，步数/配对计数），完成一局 = 打卡当日"趣味游戏" +10 阳光（每日一次）。

## 现状锚点

- `play-memory` 皮肤定义：app.js 2371 行（emoji 池/skin/title/blurb）；棋盘渲染 `renderPlayMatchBody` 2975 行；翻牌动作链 `play-flip`；lesson dialog 是现有宿主（`ui.lessonSession.play`）。
- 现有入口走课程课时（activity.mode `play-memory`）。

## 实施步骤

1. **工坊开局**：game tab 放"开始一局"大按钮（+ 上局成绩展示）→ 构造 `ui.lessonSession = { id: 'workshop-memory', play: { kind: 'memory', board: buildMemoryBoard(8对) } }` 打开 lesson dialog（复用现有打开函数；若 lesson 打开强依赖 course/lesson match，则在 `findPreschoolLesson` 放行 workshop 特例 id，检查现有 `openLesson` 前置校验最小化绕行）。棋盘渲染/翻牌/胜利判定全部复用，不重写引擎。
2. **胜利挂钩**：`play.board.complete` 成立处（现有结算路径）追加：若 `ui.lessonSession.id === 'workshop-memory'` → `awardSunlight(next, 'voxel-memory-game:' + localDate(), 10)` + 日志"消消乐配对完成！用了 N 步"（步数从 board.selected 计数取）+ toast，然后关弹窗回工坊页。
3. **每日一次**：重复开局可玩（纯玩无奖励），第二次完成不加分，按钮副文案区分"今日奖励已领，再玩一局纯开心"。
4. **任务联动（软）**：若当日 dailyPlans 存在标题含"趣味游戏/消消乐"的选做任务（用户自建），胜利时自动置 done（复用 toggle-plan 的 done 写路径，注意不重复发任务奖励——置 done 走同一条路径即可，任务自身奖励照发是合理行为）。
5. **CSS**：游戏 tab 入口卡 + dialog 内棋盘已经是像素风格，补 `workshop-memory` 特例的标题栏文案"消消乐 · 记忆配对"。
6. **测试**：奖励防重（同日两次完成只 +10）、步数日志、非 workshop 会话不受影响、置 done 联动开关。
7. **缓存戳**：`&workshop=v5`。

## 边界

- 不改 play-memory 在课程课时内的既有奖励与结算（区分仅凭 session id）。
- 不做 5×5/难度选择（后续可选）。

## 验收

- [ ] 工坊开局→完成一局：+10 阳光、日志带步数、toast；同日再玩无奖励且文案正确
- [ ] 课程里的记忆翻牌行为与改动前一致（回归）
- [ ] 有"消消乐"选做任务时自动完成打勾
- [ ] 测试绿；截图入口卡 + 胜利态
