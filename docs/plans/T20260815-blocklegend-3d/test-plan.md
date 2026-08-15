# T20260815-blocklegend-3d · 测试计划

> 口径：合同测试（node --test，退出码判定）+ 浏览器走查（本地静态服务 + `window.__blDebug`）+ MuMu 冒烟（如可用）。
> 新测试文件：`tests/blocklegend.test.mjs`；追加：`tests/world-games.test.mjs`。

## 1. 合同测试（自动化）

### 1.1 `tests/blocklegend.test.mjs`（新建，S2 起建、S3/S4 扩充）

加载方式参照 `tests/voxel-craft.test.mjs`：`await import('../prj/games/blocklegend/data/words.js')` 等，断言全局命名空间 `BlockLegendCombat` / `BlockLegendWords` / `BlockLegendLevels`。

**词库切分（S3）**

| 断言 | 期望 |
|---|---|
| `poolForLevel(bank, 1..6)` 池并集总数 | = 324（全库不重不漏） |
| 第 1、2 关池 | ⊆ MC-D1，合计 60 |
| 第 3~6 关池 | ⊆ MC-D2，均分 264（66±1） |
| `quizFor(word, bank)` 干扰项 | 3 个、互不重复、与正确释义不同、来自同 theme（同 theme 词不足时允许跨 theme 兜底并在结果上标记） |

**暴击数值（S2/S3）**

| 场景 | 期望（首版数值，落 combat.js 常量后以常量断言） |
|---|---|
| 未答题攻击 | 基础伤害 ×1（低） |
| 答对 | ×CRIT_MULT（默认 3） |
| 连对 ≥3 | ×(CRIT_MULT + 1) 封顶 |
| 答错/超时 | ×1 且本次不累计连对 |
| 魔法弹 vs 近战 | 同乘数规则，基础值不同（弹 BASE_BOLT / 近战 BASE_MELEE） |

**Boss 状态机（S4）**

| 断言 | 期望 |
|---|---|
| 初始 | `shielded`，输出伤害 ×SHIELD_REDUCE（默认 0.2） |
| 答对削盾至 0 | `broken`，罩色红（状态字段），输出 ×1 |
| broken 窗口超时 | 回 `shielded`，盾值按比例恢复（默认 50%） |
| broken 期内击杀 | 正常死亡，不掉入恢复分支 |

**经济与解锁（S4）**

| 断言 | 期望 |
|---|---|
| 解锁价格表 | `[0, 50, 150, 300, 500, 800]`（第 1 关免费） |
| 金币不足解锁 | 返回 `{ok:false}` 不扣款 |
| 结算 eventKey | `level-<n>`，重复调用幂等（借 bridge awardedIds） |

### 1.2 `tests/world-games.test.mjs`（追加，S4）

- `recordPlaySession('blocklegend')` 返回 `{ok:true}` 且 `playByDay` 写入
- 三界同日新口径：当日花园+方块+闯关（无 blocklegend）`hasTripleDay` 仍为真；只有 2 个世界为假；含 blocklegend 的 3 世界组合为真
- `getWeeklyReport().worlds` 含 `blocklegend` 行（label 方块传奇 / total 6）
- 既有 13 项断言全绿（voxel-optimize S1 产物不被破坏）

### 1.3 既有回归

- `npm test` 全量（当前基线 347/352，5 个既有失败以执行时实测为准，不新增失败）
- `tests/preschool-workbench-refresh.test.mjs`（S5 动 app.js 后）
- `tests/release-asset-allowlist.test.mjs`（S1 登记 vendor 后）

## 2. 浏览器走查（半自动，S1/S2/S3/S5/S6）

本地服务：`npx http-server` 或 python 等价物，从仓库根起服；页面 `prj/games/blocklegend/index.html`。

| 检查 | 通过口径 |
|---|---|
| console | 无 error/warning（音编解码 404 类需修复或移除引用） |
| Network | 无外网请求（three.js 从本地 vendor 加载） |
| 视口 | 1280 / 390 / 320 三档无横向溢出 |
| `__blDebug` | 存在且字段可读（player/world/fps） |
| 帧率 | 桌面 ≥60 目测流畅；MuMu ≥30 目测可玩 |
| 闭环（S6） | 打怪→词卡暴击→Boss 破防→结算→解锁→刷新保留 |

## 3. MuMu 冒烟（E2，环境可用时）

- 前置：`npm run android:prepare` 后检查 `dist/games/blocklegend/vendor/three.min.js` 非空
- `adb install` → 冷启动 → 进游戏走到词卡（PointerLock 在 WebView 不可用时走无锁模式降级——S1 需实现 fallback：无 PointerLock 时点击画布拖动转视角）
- 结论如实记录到 test-report，不把"桌面可玩"写成"MuMu 可玩"

## 4. 先红后绿纪律

- S2/S4 新断言：先写测试确认失败（模块/函数不存在），再实现到绿；voxel 系列同款流程
- 每切片结束跑一次 `npm test`，新增失败立即修，不带入下一片

## 5. 不测什么（明确边界）

- 不做 three.js 内部行为单测（由走查覆盖）
- 不测 Web Speech 发音兜底的可听性（环境不可控，只测不抛错）
- 不做性能压测（目测口径足够，帧率数字化仅记录不设门禁）
