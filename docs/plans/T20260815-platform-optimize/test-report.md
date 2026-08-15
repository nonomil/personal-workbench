# T20260815-PQ — 测试报告

> 执行会话：2026-08-15 横版 S1。手感按现状锁定，不改方案纸面 100ms/0.55。

## 阶段 0 — 基线（已执行）

- 工作区处置：`git status` 退出码 0。本包当时干净；在途文件属 B1/课程/积分/方块证据，不碰。
- `tests/platform-physics.test.mjs` **已存在**（含击退删除与 penX>=penY 两条旧合同）。
- 结论：P0 代码债在开工前已部分清偿；本包补手感纯函数、playMods、结算。

## 阶段 1 — 读码结论（已执行）

- 水平击退：`player.vx = player.facing * -N` 已不存在；受伤只留 `player.vy = -220`。判定为死代码已删，**不触发 §8「删除后行为变化」**。
- 全宽地面：`penX >= penY` 时跳过水平推出，已在 `update` 里。
- 现状手感（`data/physics.js`，秒单位）：`GRAVITY=1500`、`HOLD_GRAVITY=780`、`JUMP_VY=-620`、`COYOTE_MS=120`、`JUMP_BUFFER_MS=120`。方案纸面是 `0.55 / -11 / 100ms`（帧单位）。**按现状锁定，不调参。** 80ms/150ms 四边界在 120ms 窗口下仍成立。
- 结算：`onClear` 只 toast，无三行层；`bestTime` 已写 progress。敌人速度在 `enemySpeed()`。
- 结论：可以写合同测试。不改 `physics.js` 数值。

## 阶段 2 — S1 主链路（已执行）

- 合同先红：`node --test tests/platform-physics.test.mjs tests/world-games.test.mjs` → **29 项中 8 红，退出码 1**（canJump/jumpHeight/applyPlayMods/buildRunSummary/COMPANION_LINES 缺失）。
- P0 转绿：旧 2 条 + `resolveGroundContact` 任意 x 不穿地。
- P1 转绿：coyote 80ms 成功 / 150ms 失败；buffer 80ms 成功；长按跳高 ≥30%。
- P2 转绿：三档 enemySpeed/sunMult；困难巡逻跨度 100→120；简单 coyote 140。
- P3 转绿：结算含用时/金币/星/新纪录；星芒 pit/hit 各 ≥4 条且无否定；5 秒节流。
- 绿：同上两条命令 **29/29，退出码 0**。
- 浏览器（`http://127.0.0.1:4192/prj/games/platform-quest/index.html?cb=pq-s1`）：
  - 选关页徽标 **「难度 · 简单」**；companion/settle 节点在。
  - 进入第 1 关「青青草地」；星芒开场白「先跑稳再跳，旗就在前面。」
  - 跳跃键计算尺寸 **68×68px**（≥56）。
  - localStorage 无新游戏账本 key。
- 手玩记录：本会话只进了第 1 关选关/开场，**未手玩通关 1/3/6/10**，断言绿不算手感验收过。留你手玩。
- 结论：R1–R5 有自动证据；R9 全量见阶段 4；1/3/6/10 手感待你确认。

## 阶段 4 — 回归（已执行）

- `node --test tests/platform-physics.test.mjs tests/world-games.test.mjs`：29/29，退出码 0。
- `npm test`：**286/286，退出码 0**。
- 缓存戳：`game.js?v=20260815-pq-s1`、`game.css?v=20260815-pq-s1`。
- 结论：S1 自动回归通过。未 commit。

## 阶段 5 — S2

- P4 / P5 已在后续会话落地（选关最佳时间 + 可挑战；检查点升旗一次性）。
- P6（2026-08-15）：`node .tmp-analysis/platform-p6-times.mjs` 退出码 0。直线跑第 1/2/9/10 = 25.6 / 18.5 / 19.1 / 20.1s，低于 60/120。简单档幼儿估时第 1 关 70.5s 略超，不砍关（参考关 6400 已授权）。用时表回写分册 04。

## 手玩补证（2026-08-15 续）

- 预览：`http://127.0.0.1:8765/prj/games/platform-quest/index.html?cb=pq-polish-v2&level=1`（4192/4180 当时无响应）。
- 第 1 关已见：徽标「难度 · 简单」、5 心、金币 `0 / 11`、星芒开场白、问号/水管/蘑菇。自动右跑收到 6 枚金币并跑到旗台。
- 缺陷：站在旗顶平台时脚贴旗顶，`rectsOverlap` 不相交，冲旗失败。已加 `touchingFlag` 扩大判定；合同先红后绿。重开现在会重置计时。
- 未完成：通关结算三行、掉坑打气、第 3/6/10 关完整手跑。

## 音效与缓存戳补丁（2026-08-15 后续）

- 接入 `game-sfx.js`：检查点 `checkpoint`、破纪录 `record`（通关仍用本页既有 `sfx.clear`）。
- 三页 bridge 均带 `?v=20260815-sfx-v1`；本页 `game.js?v=20260815-sfx-v1`。
