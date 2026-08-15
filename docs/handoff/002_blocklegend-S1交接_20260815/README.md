# 002 · blocklegend S1 交接 · 2026-08-15

> 上下文：额度将尽，S1（vendor + 引擎骨架）刚完成并验证，S2–S6 未开始。本文档供下一会话续接。

## 一、任务全貌

- 任务包：`docs/plans/T20260815-blocklegend-3d/`（README/task/requirements-checklist/steps/acceptance/test-plan/test-report 七件齐全）
- 目标：新建 `prj/games/blocklegend/`——3D 第一人称单词战斗游戏（参考小红书「方块传奇」），答对单词暴击、Boss 破防、金币解锁关卡，词库用 MC 324 词，奖励走 workbench-bridge
- 用户已拍板的三个默认决策（写在任务包 README §3，可推翻）：四选一中文释义 / 方块探险主题页加入口 / 只用 MC 词库
- 下一步：**从 S2 开始**，严格按 `steps.md` 执行（先红后绿、退出码判定、每片独立回滚）

## 二、S1 已完成内容（全部未 commit）

新增文件（`prj/games/blocklegend/`）：

| 文件 | 说明 |
|---|---|
| `vendor/three.min.js` | three.js r147 UMD（607KB，MIT 头内嵌）；SHA-256 `f34446bf…dbc95` 见 `vendor/VERSION.txt`。禁 CDN，必须本地 |
| `vendor/LICENSE` + `vendor/VERSION.txt` | 许可与版本/哈希记录 |
| `index.html` | 顶栏（back-link/关卡/金币/全屏）+ canvas + HUD 骨架（统计/HP/十字准星/提示/toast） |
| `game.css` | bl- 前缀纸感柔光样式 |
| `engine.js` | 核心引擎：种子化 48×48 高度图世界 + 14 棵树 + 3×3 区块合批 BufferGeometry（每区块 1 draw call）+ 第一人称（PointerLock + 拖动兜底）+ 高度场碰撞（STEP_UP 1.05、树干是墙）+ rAF 挂起降级循环。命名空间 `window.BlockLegendEngine`，常量集中文件头 |
| `game.js` | 装配层：boot + backHref + `window.__blDebug`（player/look/world()/fps()）。S2 起在此扩展战斗 |

S1 验证证据：见 `docs/plans/T20260815-blocklegend-3d/test-report.md` §S1——语法绿、npm test 7 个失败全为既有失败（与本包无关，含 vocab-mc creeper 素材商标问题）、浏览器冒烟 60fps 无报错。

**重要修正**（计划假设错了，已记 test-report）：`tests/release-asset-allowlist.test.mjs` 是商标名扫描不是通用白名单，vendor three.js **无需登记**。

## 三、S2 起要做的事（摘要，详版在 steps.md）

1. **S2 战斗**：新建 `data/combat.js`（全局 `window.BlockLegendCombat`，纯函数：伤害/暴击乘数/怪物血量金币表/冷却）+ 新建 `tests/blocklegend.test.mjs` 先红后绿；game.js 加怪物实体（低模方块怪、追逐、接触伤害+无敌帧）、左键近战扇形判定、右键追踪弹（自动转向锁最近怪）、怪物死亡掉金币
2. **S3 词卡**：`data/words.js`（`poolForLevel(bank, level)`：1~2 关 MC-D1 60 词、3~6 关 MC-D2 264 均分；`quizFor(word, bank)` 四选一同 theme 干扰项）+ 词卡 UI + 暴击接线 + 左下角已学/答对/答错 HUD + 音频（词条 media.audio → Web Speech → 静音）+ 计数持久化到 `growth.worldGames.blocklegend`
3. **S4 bridge 增量（唯一动 bridge 的片，单独 commit）**：前置先跑 `node --test tests/world-games.test.mjs` 确认基线绿。GAME_IDS 加 `'blocklegend'`；defaultProgress 新条目；**`hasTripleDay` 从 `GAME_IDS.every` 改为"当日 ≥3 世界"**（否则三界变四界破坏既有徽章语义，需补合同测试）；getWeeklyReport labels 补 blocklegend 行（label 方块传奇/total 6）。`data/levels.js`：6 关配置 + Boss 盾状态机（shielded→broken→恢复50%）+ 解锁价 `[0,50,150,300,500,800]` + 通关 `awardSunlight({gameId:'blocklegend', eventKey:'level-<n>', amount:8})`
4. **S5**：F 商人 + 问号全英文帮助浮层 + `prj/app.js` 方块探险主题页入口卡（增量、单独 commit、缓存戳升级）
5. **S6**：浏览器 E2E 闭环 + 320/390/桌面视口 + test-report 收口 + `docs/00-总控/当前状态.md` 登记 + 触屏 deferred 记录

## 四、关键事实（避免重探索）

- 词库：`prj/preschool-minecraft-vocab-data.js` → 全局 `PersonalWorkbenchMinecraftVocabData.bank`，324 词（`level` 字段 MC-D1×60 / MC-D2×264），字段 `text/zh/theme/phrase/phraseZh/media{image,audio}`（110 词有音频）。index.html 已引入该 script
- bridge：`prj/games/shared/workbench-bridge.js`；`recordPlaySession` 拒绝 GAME_IDS 外的 id（约 :335）；`hasTripleDay` 在约 :217
- 进度键：`growth.worldGames.blocklegend`（localStorage `petbank_huchuliang_preschool_workbench_state_v1`，不新增 key）
- 测试基线：本包开工时全量 362/369（7 既有失败：vocab-mc creeper 商标×1 测试、platform-hero 缺素材×1、花园波次/闪卡/图标/首页进度等×5）——**不要把这些算到 blocklegend 头上，也不要顺手修**
- 本地服务：`npx http-server -p 4195 -s`（仓库根起服）；页面 `prj/games/blocklegend/index.html`
- 浏览器验证注意：IAB 面板后台会节流 rAF（fps 假低、toast 不消失），前台后恢复；`playwright.evaluate` 读 `__blDebug` 会被只读保护拒绝，用 `#fps-label` 文本和 domSnapshot 代替
- 在途冲突：`T20260815-voxel-optimize` 也动过 bridge（S1 已落地）；B2/B3 有未提交改动在 `prj/app.js`/`storage.js`——S5 动 app.js 只做增量，别重排代码
- 全部工作未 commit（用户惯例：未要求则不 commit）

## 五、续接口令建议

> 继续执行 docs/plans/T20260815-blocklegend-3d/steps.md 的 S2，从"新建 data/combat.js + tests/blocklegend.test.mjs 先红后绿"开始，完成后按 S3→S6 顺序推进，每片验证命令以退出码为准。
