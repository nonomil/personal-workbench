# T20260815-GD — 测试报告

> 执行会话：2026-08-15 串行总控版（三包顺序执行，本包为第 1 包）。

## 阶段 0 — 基线（已执行）

- 工作区处置：`git status --porcelain=v1 -uall` 退出码 0。在途文件为文档目录重组（`docs/优化方案2` → `docs/01-方案/`）与总控文档更新，与游戏代码无交集；`prj/games/garden-defense/` 当时有并行会话改动（见阶段 1 并发记录）。
- `npm test` 基线：**241 项全绿，退出码 0**（文档记录的 238 为旧基线，期间新增 3 项）。
- 结论：基线健康，开工。

## 阶段 1 — 读码结论（已执行）

- 僵尸速度应用位置：规则层 `prj/preschool-garden.js` 的 `stepDefense`（`moveClock`/`moveEvery` 驱动，`DEFENSE_ZOMBIE_RULES` 冻结）。**不改规则层**：`moveClock` 存于 growth 状态，game.js 应用层按倍率做小数累加补偿（`advanceMoveClocks`，累加器 `speedAcc` 留在 game.js 侧，因 `normalize()` 会丢弃未知字段）。渲染层 `zombieDisplayColumn` 读同一 `moveClock`，自动一致。
- 结算弹层 DOM 结构：原版无弹层——通关只 toast + 1.5s 后回地图；新增 `#settle-layer`（三行 + 两按钮）与 `#celebrate-layer`（庆祝卡）。
- `awards` 接收现状：原版 `grantProgressPoints`/`recordPlaySession` 返回值被丢弃（静默入账）；现统一收集进 `queueCelebrations`。
- 判定（task.md §8）：**触发第 3 条（并发改动冲突）一次**——执行中发现另一会话在 01:26–01:32 持续写入 garden-defense（v5 僵尸接线 → 后按用户裁决改为像素 pvz 套图）。已按合同询问用户，用户裁定"停掉并行会话，本会话接管"。确认停止写入后接管，资产切换成果保留（与用户指示一致）。
- 结论：不需要改 `preschool-garden.js`，playMods 全部可在应用层落地。

### 并发冲突记录（§8 第 3 条）

- 时间线：01:26 对方写入 v5 接线；01:24 bg 目录出现 webp；用户 01:27 左右指示"角色用 ref/preschool-pixel/pvz、背景用 pvz-garden-lawn-bg.webp"；01:31 对方完成资产切换（`?v=20260815-ref-v1`）；01:33 用户裁定接管。
- 资产事实：`ref/.../pvz` 植物 5（RGBA 透明底）+ 僵尸 5（webp）已拷入 `assets/plants/`、`assets/zombies/`；背景 webp 与 ref 目录 md5 一致（`b47e678...`）。本裁决覆盖总纲 §5 "花园=绘本卡通"措辞（已同步）。
- 旧资产：lawn-day/night/sunset.png、v4/v5 僵尸批次下岗（部分已被并行会话删除，其余留在盘上待用户清理）；`world-games-growth.test.mjs` 的资产合同已同步为新真值。

## 阶段 2 — S1 主链路（已执行）

- 合同测试先红：`node --test tests/world-games.test.mjs` → **9 项中 7 红，退出码 1**（新增 5 项 garden 合同全红 + 首项资产断言红）。证据：本文件记录，命令退出码非 0。
- G1 playMods 转绿：`applyPlayMods`（速度/sunMult/extraMob 三档断言）+ `advanceMoveClocks`（60 tick 仿真：easy 2 步 < normal 3 步 < hard 4 步；被挡/被冻不补偿）全绿。
- G2 结算三行转绿：`buildSettlementLines` mock `getMetaSummary` 返回值——所得行（+24（×2）·★×2）、进度行（Lv.3 阳光骑士 50/80，percent 63）、下一目标行（八关防线·还差 3 关）；全解锁时不再出现"下一个目标"。
- G3 星芒/庆祝卡转绿：文案池 18 条（3×3 欢迎 + 4 夸奖 + 5 打气）；打气全部含策略提示、无否定语；`petLevel≥3` → "小园长"；`milestoneCardsFrom` 只筛 `kind==='milestone'`。
- 浏览器证据（`http://127.0.0.1:4180/prj/games/garden-defense/index.html`）：
  - 新档进入第 1 关：HUD 徽标 **"难度 · 简单"**（识字 0 → easy）；星芒开场白"今天的僵尸慢悠悠，小朋友随便种都能守住。"（easy 池 + petLevel 1 称呼）。
  - 第 1 关胜利结算层：`本局所得：阳光 +12 · ★×2` / `冒险等级 Lv.1 萌芽旅人 · 6/15` / `下一个目标：三关守卫 · 还差 2 关`；星芒夸奖语在场。
  - 第 2 关胜利：三行数据推进正确（12/15、还差 1 关）。
  - 第 3 关胜利：**ms-garden-3 庆祝卡弹出**（"三关守卫 · 奖励阳光 +12 · 星芒为你欢呼！"，点"收下"关闭后结算层在底下，排队顺序正确）；结算显示等级升至 **Lv.2 草坪学徒 21/40**、下一目标推进为"八关防线 · 还差 5 关"。
  - 地图：第 1 关 ★★☆、第 2/3/4 关依次解锁。
- 结论：G1–G3 主链路证据齐全。

### 浏览器证据的限制（如实记录）

- **困难/普通档切换实测未做**：自动化策略禁止通过页面 JS 写 localStorage（改 `literacy.mastery`），档位分档逻辑由 `play-mods.test.mjs` + 新增三档合同测试覆盖，easy 档浏览器实测通过。留人工复核：devtools 改 mastery 后刷新看徽标与僵尸速度。
- **失败结算层未等到**：第 4 关挂机 6 分钟未复现僵尸进家（IAB 面板 rAF 疑似被节流）。失败路径由单元合同覆盖（`won:false` → 所得行为空 + 打气文案层）。留人工手玩复核。
- **Console 报错与 390px 视口**：IAB API 无 console 读取；`setViewportSize` 超时。窄屏仅有 CSS `max-width:560px` 媒体查询兜底，未实测。

## 阶段 4 — 回归（已执行）

- `npm test`：**259 项全绿，退出码 0**（基线 241 + 新增 18：本包 6 项 garden 合同 + 并行会话/资产合同更新）。该数字是前一轮记录；当前会话已重新验证为 260 项，见下方独立复核。
- localStorage key 检查：浏览器 devtools 侧 `Object.keys(localStorage)` → 仅 `["petbank_huchuliang_preschool_workbench_state_v1"]`。
- 日限 80：通关阳光经 `awardSunlight` 原路发放（`applyPlayMods` 只改 amount 入参），单次 40/日 80 钳制不被绕过；easy 档 sunMult=1 时无放大显示。
- 边界复核：`workbench-bridge.js`、`preschool-garden.js`、`data/stages.js`、`prj/app.js` 零改动（git diff 确认）。
- 结论：S1 收口，R1–R4、R8 有证据。

## 阶段 5 — S2（未展开）

- 待用户确认 S1 后按分册 04 展开 G4（roster）→ G5（土豆地雷，素材门控）→ G6（星级重定义）。

## 手玩记录

- 无（本包验收以合同测试 + 浏览器自动验证为主；真机手感验收属横版包要求）。

## 当前会话独立复核（2026-08-15）

- `node --test tests/world-games.test.mjs`：9/9 通过，退出码 0。
- `npm test`：260/260 通过，退出码 0。当前工作区实测数量已不是提示词中的 238，也不是本报告阶段 4 的旧记录 259。
- 浏览器：`http://127.0.0.1:4180/prj/games/garden-defense/index.html`；进入第 1 关可见「难度 · 简单」和星芒 HUD；第 1/2/3 关结算均显示「本局所得 / 冒险等级 / 下一个目标」三行；第 3 关实际弹出「三关守卫」里程碑庆祝卡。
- 页面日志：当前花园页 error/warning 读取结果为空；浏览器运行期间出现的 Statsig 网络超时来自浏览器运行环境，不属于花园页日志。
- 代码状态：`git diff --name-status -- prj/games/garden-defense/game.js prj/games/garden-defense/game.css prj/games/garden-defense/index.html tests/world-games.test.mjs` 无输出，说明本轮没有重新改写已在 HEAD 中的 S1 实现。
- 结论：当前 HEAD 的 G1–G3 实现与合同测试、easy 档浏览器主路径均可复核；普通/困难档切换、失败路径和 390px 视口仍按原报告留人工确认，S2 未开始。

## 并发回归复核（最终状态）

- 最终复跑：`npm test`，退出码 **1**；共 264 项，263 通过、1 失败。
- 失败项：`tests/preschool-workbench-refresh.test.mjs` 的 `turns flashcard subjects into a flip-card page with known/unknown marking`，失败位置第 959 行，旧合同断言要求 `markSubjectReady(current, [item.key])`。
- 归属：失败涉及工作台 B1 在途文件 `prj/app.js` 与 `tests/preschool-workbench-refresh.test.mjs`，不属于本包允许范围；本包 `node --test tests/world-games.test.mjs` 仍为 9/9、退出码 0。
- 处理：不修改 B1 文件、不绕过失败、不进入方块或横版包；等待并发会话收口后再复跑 `npm test`，因此花园 S1 当前状态为“实现与定向证据齐全，全量回归被外部并发改动阻塞”。

## 音效与缓存戳补丁（2026-08-15 后续）

- 接入 `prj/games/shared/game-sfx.js`：通关 `clear`、里程碑卡 `celebrate`。
- 缓存戳：`workbench-bridge.js?v=20260815-sfx-v1`、`game-sfx.js?v=20260815-sfx-v1`、`game.js?v=20260815-sfx-v1`。
- 未新增 progress 字段。
