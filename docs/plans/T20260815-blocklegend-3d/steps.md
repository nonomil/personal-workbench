# T20260815-blocklegend-3d — 3D 单词战斗游戏 blocklegend

> 优先级：P1 | 状态：review | 前置任务：无硬前置（MC 词库已就绪）
> 完成日期：2026-08-15（代码已执行，待用户手玩验收）
> 新建 3D 第一人称学英语游戏，参考「方块传奇 blocklegend」机制，接入现有词库与发奖体系。

## 目标

`prj/games/blocklegend/` 可玩：打怪 → 词卡四选一 → 答对暴击 → Boss 破防 → 金币解锁关卡，学习数据外显并持久化，工作台可进入。

> **验证约定**：所有验证命令以退出码判定结果。exit 0 = 通过；非零 = 失败。
> **基线检查（每步开工前）**：`node --test tests/world-games.test.mjs` 退出码 0。

## Steps

### 1. S1 · vendor three.js + 引擎骨架

- [x] 下载 three.js 压缩版（固定版本，如 r160+ 的 `three.min.js`/`three.module.min.js`）到 `prj/games/blocklegend/vendor/three.min.js`，同目录放 `LICENSE` 与 `VERSION.txt`（版本号+来源 URL）
- [x] `tests/release-asset-allowlist.test.mjs` 登记 vendor 文件（先读该测试确认登记格式）——实际无需登记，见 test-report
- [x] 新建 `index.html`（顶栏返回工作台 + canvas + HUD 骨架，script 引 `../../games/shared/workbench-bridge.js`、`game-sfx.js`、`../../preschool-minecraft-vocab-data.js`、本地 js）
- [x] 新建 `engine.js`：three.js 场景 + 48×48 高度图小世界（草/土/石分层 + 若干树）+ 区块合并 BufferGeometry（一次 draw call/区块）
- [x] 第一人称控制：WASD + 空格跳 + 鼠标视角（PointerLock，Esc 释放）；`pixelRatio ≤ 1.5`、无阴影
- [x] `window.__blDebug` 只读调试句柄（player 位置/世界参数/帧率），沿用 voxel-craft 模式
- [x] 性能约束落码：世界常量集中在文件头（WORLD_SIZE、PIXEL_RATIO_CAP 等）
- **验证：** `node --check prj/games/blocklegend/engine.js && npm test` — 退出码 0，≈3 分钟；浏览器开 `http://127.0.0.1:<port>/prj/games/blocklegend/index.html` 能走动能跳、console 无 error
- **回滚成本：** 整目录新建，`git clean -f prj/games/blocklegend/` 即归零

### 2. S2 · 战斗核心（纯函数 + 怪物 + 双攻击）

- [x] 新建 `data/combat.js`（IIFE 全局 `window.BlockLegendCombat`，node 可 import）：伤害公式、暴击乘数、怪物血量/金币掉落表、攻击冷却——全部纯函数 + 配置常量
- [x] `game.js`：怪物实体（低模方块怪，2~3 种配色）按关卡波次生成、朝玩家缓慢移动、接触伤害；玩家 HP + 受击无敌帧（借 voxel-adventure INVINCIBLE_MS 模式）
- [x] 左键近战：扇形判定 + 挥击反馈；右键魔法弹：发射后自动转向锁定最近怪（追踪弹参数入 combat.js 常量）
- [x] 怪物死亡：金币掉落物 + 拾取（先入包计数，为 S5 商人备料）
- **验证：** 新建 `tests/blocklegend.test.mjs` 覆盖 combat 纯函数（先红后绿）：`node --test tests/blocklegend.test.mjs` — 退出码 0，≈1 分钟；浏览器走查能打死一只怪
- **回滚成本：** `data/combat.js` + `game.js` 战斗段独立，git checkout 单文件

### 3. S3 · 词卡系统（学习循环核心）

- [x] 新建 `data/words.js`（全局 `window.BlockLegendWords`）：
  - 词池切分：第 1~2 关 MC-D1 60 词、第 3~6 关 MC-D2 264 词均分（纯函数 `poolForLevel(bank, level)`）
  - 四选一出题：正确释义 + 3 个干扰项（**同 theme 抽取**，保证迷惑性与教学价值）；`quizFor(word, bank)` 纯函数
  - 出题节奏配置（每怪首次受击必出、连对 N 次免题窗口）
- [x] `game.js` + `game.css`：词卡 UI（英文大字 + 发音按钮 + 四个中文选项 + 倒计时）；答题结果接线到 combat 暴击乘数
- [x] 发音：词条 `media.audio` 有则 `<audio>` 播放；无则 `speechSynthesis.speak(en-US)` 兜底；再失败静音不阻塞
- [x] 学习统计 HUD（左下角）：已学 X/总词 Y、答对 N、答错 M；持久化到 `growth.worldGames.blocklegend.learnedIds/rightCount/wrongCount`（借 bridge getProgress/saveProgress）
- **验证：** `node --test tests/blocklegend.test.mjs`（追加 words 断言：切分总数=324、每关池非空、干扰项不与正确项重复）— 退出码 0；浏览器走查：答对明显更痛、HUD 计数跳动、刷新后计数保留
- **回滚成本：** 单文件回退；HUD 计数 schema 若返工只影响本游戏进度对象

### 4. S4 · Boss 破防 + 关卡经济 + bridge 增量（唯一动 bridge 的切片）

- [x] **前置**：`node --test tests/world-games.test.mjs` 确认基线绿（voxel-optimize S1 产物不被破坏）
- [x] `data/levels.js`（全局 `window.BlockLegendLevels`）：6 关配置（词池区间、波次、Boss 血量/盾值、解锁金币价格——儿童可达，首版建议 50/150/300/500/800）、Boss 盾状态机纯函数（shielded→broken 窗口→恢复）
- [x] `game.js`：Boss 实体（蓝罩→破防红罩视觉切换）、血条 HUD、关卡结算三行 + `awardSunlight({gameId:'blocklegend', eventKey:'level-<n>', amount: 8})`（数值入 levels.js；日上限由 bridge 兜底）
- [x] `workbench-bridge.js` 增量（**单独 commit**，便于独立回退）：
  - `GAME_IDS` 追加 `'blocklegend'`
  - `defaultProgress('blocklegend')` 新条目（unlockedLevel/coined/learnedIds/rightCount/wrongCount/clearedLevels）
  - `hasTripleDay` 从 `GAME_IDS.every` 改为"当日玩过 ≥3 个世界"（`worldsPlayedToday(dayMap) >= 3`），**语义向后兼容**
  - `getWeeklyReport` labels/worldBreakdown 补 blocklegend 行（label 方块传奇，unit 关，total=6）
- [x] `tests/world-games.test.mjs` 追加：blocklegend 打卡成功、三界同日仍按 ≥3 判定（3 世界即真、2 世界即假）、周报含第四世界行
- **验证：** `node --test tests/world-games.test.mjs tests/blocklegend.test.mjs && npm test` — 退出码 0，≈3 分钟；浏览器：通关第 1 关结算阳光、金币解锁第 2 关、刷新后关卡与金币保留
- **回滚成本：** bridge 单独 commit 可整体 revert；游戏侧文件独立回退

### 5. S5 · 商人 + 帮助浮层 + 工作台入口

- [x] 商人 NPC：场景固定点站立，靠近提示"Press F to trade"，F 打开交易面板卖战利品换金币（R6）
- [x] 问号帮助浮层：HUD 右上 ？ 按钮，展开**全英文**操作说明（R7）
- [x] `prj/app.js` 增量（**单独 commit**）：方块探险主题首页加「方块传奇 · 学英语」入口卡（href `../games/blocklegend/index.html`），不动既有三世界卡结构
- [x] 缓存戳升级（index.html 引用 app.js 的 v= 参数），避免 MuMu 旧缓存
- **验证：** `node --check prj/app.js && node --test tests/preschool-workbench-refresh.test.mjs && npm test` — 退出码 0；浏览器：主题页见入口卡 → 进游戏 → F 交易 → ？ 浮层展开收起
- **回滚成本：** app.js 增量单独 commit 可 revert；游戏侧文件独立

### 6. S6 · 收口

- [x] 浏览器 E2E 走查（借 browser-use 技能）：进入 → 打怪 → 词卡暴击 → Boss 破防通关 → 结算 → 解锁第二关 → 回工作台看阳光/成长；320/390/桌面三档无横向溢出、console 无 error —— 进/打/词卡暴击/刷新保留/帮助/入口/三档视口已验；Boss 结算手玩未走完
- [x] MuMu WebView 冒烟（如环境可用）：能进能打、帧率可玩；不可用则如实登记未验
- [x] 填写 `test-report.md`（退出码证据 + 截图口径 + 遗留清单：触屏操控 deferred、110 词外发音兜底情况）
- [x] `docs/00-总控/当前状态.md` 新增小节登记；`docs/plans/README.md` 状态更新；进度看板如需同步
- **验证：** `npm test` 退出码 0 + test-report 六步证据齐
- **回滚成本：** 纯文档，无回滚风险

## Acceptance

（执行后回填，总清单见 `acceptance.md`）

## 实际耗时

（完成后填写）
