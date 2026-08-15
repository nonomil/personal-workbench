# T20260815-blocklegend-3d · 3D 单词战斗游戏「方块传奇」

> 优先级：P1 | 状态：review（S1–S6 已执行，待用户手玩验收） | 创建：2026-08-15
> 一句话：新建 `prj/games/blocklegend/`，3D 第一人称方块世界里打怪学英语——答对单词触发暴击、破 Boss 防御罩，金币解锁关卡，学习数据实时外显。

## 1. 背景与参考

参考游戏：小红书「方块传奇 blocklegend」（8 岁小学生 TuTu 用大模型开发的英语学习游戏）。

资料来源（本机已归档）：

```
G:\UserCode\跨平台采集器\notes\游戏设计\学习游戏机制\敢信！8岁小孩开发的学习英语游戏操作说明\
├── 敢信！8岁小孩开发的学习英语游戏操作说明.md   （视频转写 + 关键帧 OCR）
├── video.mp4 / img/ / transcript/
```

参考机制摘要（转写提炼）：

1. 3D 第一人称：W 向前 / S 向后 / A 向左 / D 向右 / 空格跳 / 鼠标控视角 / 左键刀砍 / 右键发自动追踪魔法
2. **念单词 = 暴击**：不念单词打怪很慢，念出单词触发暴击伤害（"这样子就使孩子会想念单词"）
3. **Boss 破防**：Boss 有蓝色防护罩，答对单词（视频示例 Pardon）破防、罩变红，之后"非常好打"
4. **学习数据外显**：左下角实时统计 已学/总词数（视频示例 已学 225 / 总词数 4,326）、答对/答对错次数
5. **经济驱动**：怪物掉金币；进第二关花了一万块；可去第二~六关，难度递增（三四年级单词）
6. **F 键商人交易**：把战利品（名片等）卖掉
7. **问号帮助浮层**：点击展开，全英文操作说明（"都是英文的，要认识才才行"）

## 2. 我们的目标

在 `prj/games/blocklegend/` 落地同款学习循环，接入本仓现有体系：

| 参考机制 | 我们的落地 | 归属切片 |
|---|---|---|
| 3D 第一人称世界 | 本地 vendor three.js，48×48 小世界 + 第一人称控制 | S1 |
| 刀砍 / 追踪魔法 | 左键近战 / 右键自动锁定最近怪的魔法弹 | S2 |
| 念单词暴击 | **词卡四选一中文释义**：答对=暴击 ×N，不答/答错=普通低伤；发音用词条音频（110 词有），缺音频走 Web Speech 兜底再兜静音 | S3 |
| Boss 破防 | Boss 蓝盾状态机：答对削盾 → 破防变红 → 高伤窗口 | S4 |
| 学习统计外显 | HUD 常驻 已学/总词、答对/答错 | S3 |
| 金币解锁关卡 | 怪物掉金币 → 解锁 2~6 关；通关走 `awardSunlight`（eventKey `level-<n>`，日上限 80 由 bridge 自动兜底） | S4 |
| F 商人 / 问号帮助 | F 键卖战利品；问号浮层全英文帮助 | S5 |
| 词库分关 | MC 词库 324 词：MC-D1 60 词 → 第 1~2 关，MC-D2 264 词 → 第 3~6 关 | S3 |

## 3. 默认决策（创建时未获用户答复，按推荐执行，均可推翻）

| 决策点 | 选定 | 理由 | 备选 |
|---|---|---|---|
| 答题形式 | 四选一中文释义 | 离线可用、MuMu/WebView 稳定、判定可靠 | 语音跟读识别（需在线+兜底）；英文拼写（低龄太难） |
| 游戏入口 | 「方块探险」主题页加入口卡 | 改动最小，不注册第四工作台主题 | 注册第四世界（改 launcher/主题皮肤，改动大） |
| 词库范围 | 只用 MC 词库 324 词 | 与方块世界主题呼应（cave/dirt/axe 直接对应场景） | 高关混入通用英语词库 340 词 |

## 4. 事实基础（探索结论，2026-08-15）

- **词库**：`prj/preschool-minecraft-vocab-data.js` 全局 `PersonalWorkbenchMinecraftVocabData.bank` 共 324 词（MC-D1 60 / MC-D2 264），字段 `id/kind/text/zh/theme/level/phrase/phraseZh/media{image,audio}/extra`，110 词带音频（`assets/audio/vocab-mc/*.mp3`）。游戏页 `<script src="../../preschool-minecraft-vocab-data.js">` 直接引入（voxel 系列同款模式）。
- **bridge**：`prj/games/shared/workbench-bridge.js`
  - `GAME_IDS = ['garden-defense', 'voxel-adventure', 'platform-quest']`，`recordPlaySession` 对未知 id 返回 `{ok:false, reason:'未知世界'}`（约 :335）
  - `defaultProgress(gameId)` 无 blocklegend 条目（约 :147）
  - **`hasTripleDay` 用 `GAME_IDS.every`（约 :217）判定"三界同日"——若简单把 blocklegend 追加进 GAME_IDS，三界会变四界，破坏既有徽章语义。必须同步改为"当日玩过 ≥3 个世界"口径，并用合同测试锁死。**
- **注册点**：`prj/app.js:435`（世界卡 href map `WORLD_GAME`）、`:492`（GAME_IDS 映射渲染世界进度）。
- **发布资产 allowlist**：`tests/release-asset-allowlist.test.mjs` 存在，vendor 的 `three.min.js` 需要登记，否则发布门禁红。
- **测试模式**：`npm test` = `node --test --test-concurrency=1 tests/*.test.mjs`；游戏合同测试参照 `tests/voxel-craft.test.mjs`（直接 `await import` 游戏纯逻辑模块 + 全局命名空间断言）；浏览器走查用本地静态服务 + `window.__blDebug` 只读调试句柄。
- **离线/打包约束**：面向 GitHub Pages + Capacitor APK（MuMu WebView 实测路径见 当前状态 §3.6）。**禁止 CDN**，three.js 必须 vendor 到 `prj/games/blocklegend/vendor/`；`scripts/prepare-mobile.mjs` 已整目录复制 `games/`，vendor 自动进 APK。
- **性能约束（Android WebView）**：低多边形、每区块合并 BufferGeometry（一次 draw call）、`pixelRatio ≤ 1.5`、无阴影、世界规模 48×48 起。

## 5. 与在途任务包的协调

- `T20260815-voxel-optimize` 是"唯一动 bridge 的包"（其 S1 已落地）。本包 S4 也要动 bridge：**动之前先跑 `node --test tests/world-games.test.mjs` 确认基线绿**，只做增量（新增 id + 三界口径修正 + 新测试），不动其已落地的 `getWeeklyReport` 逻辑；`getWeeklyReport.worldBreakdown` 与 labels 需补 blocklegend 行（或明确跳过，见 steps S4）。
- B2 / B3 在途文件（`prj/app.js`、`storage.js` 等有未提交改动）：S5 动 `prj/app.js` 只加一张入口卡，增量提交，不重排既有代码。
- voxel-craft（T20260815-voxel-remake，review 待验收）**完全不动**。

## 6. 边界

- 不碰：`voxel-craft/`、`voxel-adventure/`、B2/B3 业务逻辑、`awardSunlight` 口径与日上限 80、localStorage 主 key。
- 新增存储只写 `growth.worldGames.blocklegend`（沿用现有 state v1，不开新 key）。
- 明确不做（首版）：触屏操控（deferred 遗留项，S6 记录）、多人/联网、语音识别、背包/合成/自由建造（那是 voxel-craft 的职责）、第二套积分体系。
- 禁止顺手优化：不重构 workbench-bridge、不改三游戏既有数值。

## 7. 产物索引

- `task.md` 任务定义卡（子任务拆分/边界/验收）
- `requirements-checklist.md` 参考视频机制 → 可验收需求映射
- `steps.md` S1–S6 执行步骤（验证命令 + 回滚成本）
- `acceptance.md` 用户手玩验收清单
- `test-plan.md` 合同测试 + 浏览器走查口径
- `test-report.md` 执行证据（初始 pending）
