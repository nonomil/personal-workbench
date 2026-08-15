# T20260815-blocklegend-3d - 任务定义卡

> 默认模式：L1 标准

## 0. 领域画像

- 主画像：软件开发
- 次画像：UI 优化
- 参考画像：`profiles/software-dev.md`

## 1. 任务目标

- 一句话目标：新建 `prj/games/blocklegend/`——3D 第一人称单词战斗游戏，答对单词触发暴击与 Boss 破防，接入现有词库与发奖体系。
- 为什么现在做：用户看到「方块传奇 blocklegend」参考视频后拍板（2026-08-15）；MC 兴趣词库 324 词（T20260815-vocab-unify 产物）已就绪，素材/音频可直接复用。
- 预期收益：孩子在"想打快点"的自发动机下反复认单词；学习数据（已学/答对/答错）实时外显，家长可在周报看到第四个世界。

## 2. 输入基线

- 原始需求来源：
  - 用户口述（2026-08-15）：参考 `G:\UserCode\跨平台采集器\notes\游戏设计\学习游戏机制\敢信！8岁小孩开发的学习英语游戏操作说明\`（含视频转写与关键帧 OCR）
  - 用户选择：新建 3D 版 blocklegend（不改造 voxel-craft，不直接改开源项目）
- 关联文档：
  - `requirements-checklist.md`：参考机制 → 可验收需求
  - `README.md` §4：探索事实基础（词库/bridge/注册点/allowlist/测试模式/离线约束）
- 当前已知约束：
  - 禁 CDN，three.js 本地 vendor；Android WebView（MuMu）性能受限
  - bridge 三界同日语义必须保护（详见 README §4）
  - 发布资产 allowlist 需登记新文件

### 按领域最少补充项（软件开发）

- 受影响模块：新增 `prj/games/blocklegend/`（全部新建）；增量改 `prj/games/shared/workbench-bridge.js`（GAME_IDS/defaultProgress/hasTripleDay/getWeeklyReport labels）、`prj/app.js`（入口卡）、`tests/release-asset-allowlist.test.mjs`（vendor 登记）、新增 `tests/blocklegend.test.mjs`、`tests/world-games.test.mjs`（追加）。
- 接口边界：
  - 进度键 `growth.worldGames.blocklegend`（不新增 localStorage key）
  - 发奖 eventKey 口径：`level-<n>`（关卡首通）、`daily-<日期>`（每日游玩戳走 recordPlaySession 现有口径）
  - 游戏内命名空间 `window.BlockLegend*`（词库/战斗纯函数），调试句柄 `window.__blDebug`
- 最低回归路径：`node --test tests/blocklegend.test.mjs tests/world-games.test.mjs` + `npm test` 全量 + 本地服务浏览器走查 1 关闭环。

## 3. 子任务拆分

| ID | 描述 | 角色 | 文件范围 | 禁止碰 | 验证命令 | 预计耗时 | 回滚单元 |
|---|---|---|---|---|---|---|---|
| S1 | vendor three.js + allowlist + 引擎骨架（世界/第一人称/调试句柄） | maker | `prj/games/blocklegend/`（新建）、allowlist 测试 | bridge、app.js、voxel-craft | `npm test`；浏览器冒烟 | 1 次会话 | 整目录删除即回滚 |
| S2 | 战斗核心：combat 纯函数 + 怪物 AI + 近战/追踪弹 | maker | `prj/games/blocklegend/data/combat.js`、`game.js` | bridge、app.js | `node --test tests/blocklegend.test.mjs` | 1 次会话 | 单文件 git checkout |
| S3 | 词卡系统：words 切分 + 四选一 UI + 暴击接线 + 学习统计 HUD | maker | `data/words.js`、`game.js`、`game.css` | bridge、app.js | 同上 + 走查 | 1 次会话 | 单文件回退 |
| S4 | Boss 破防 + 金币关卡解锁 + 结算发奖 + bridge 增量接入 | maker | `data/levels.js`、`game.js`、`workbench-bridge.js`、`tests/world-games.test.mjs` | awardSunlight 数值、三游戏既有逻辑 | `node --test tests/world-games.test.mjs tests/blocklegend.test.mjs && npm test` | 1 次会话 | bridge 单独 commit，可独立回退 |
| S5 | F 商人 + 问号帮助 + 工作台入口卡 | maker | `prj/games/blocklegend/`、`prj/app.js`（增量） | storage.js、B2/B3 逻辑 | `node --test tests/preschool-workbench-refresh.test.mjs && npm test` + 走查 | 0.5 次会话 | app.js 增量单独 commit |
| S6 | 收口：浏览器 E2E 走查 + test-report + 总控登记 + 遗留项 | checker | `test-report.md`、`docs/00-总控/当前状态.md`、`docs/plans/README.md` | 产品代码（只记录不改） | 走查证据齐 | 0.5 次会话 | 纯文档 |

### 粒度三问

| 问题 | S1 | S2 | S3 | S4 | S5 | S6 |
|---|---|---|---|---|---|---|
| 验证 <= 10 分钟？ | ✅ npm test + 冒烟 | ✅ 定向测试 | ✅ 定向测试 | ✅ 定向+全量 | ✅ 定向+全量 | ✅ 走查脚本 |
| 做错能整块丢？ | ✅ 新目录 | ✅ | ✅ | ✅ bridge 独立 commit | ✅ app.js 独立 commit | ✅ 文档 |
| reviewer 5 分钟能判断？ | ✅ 截图+退出码 | ✅ 测试退出码 | ✅ 截图+退出码 | ✅ 测试退出码 | ✅ 截图 | ✅ 报告 |

## 4. 边界

- 只改：上表"文件范围"列。
- 不碰：`voxel-craft/`、`voxel-adventure/`、`storage.js`、B2/B3 在途逻辑、`awardSunlight` 口径与 `DAILY_GAME_SUN_CAP`。
- 明确不做：触屏操控（deferred）、语音识别、自由建造/合成、多人/联网、新 localStorage key。
- 禁止顺手优化：不重构 bridge、不改三游戏数值、不动 UI 柔光主题体系。

## 5. 验收

- [ ] 浏览器（桌面 + MuMu 可选）完成 1→2 关闭环：打怪 → 词卡答对暴击 → Boss 破防通关 → 结算阳光 → 金币解锁第二关
- [ ] HUD 显示 已学/总词数（本关口径）、答对/答错，刷新后进度保留（`growth.worldGames.blocklegend`）
- [ ] `npm test` 全量绿；`tests/blocklegend.test.mjs` 覆盖词库切分/暴击数值/破防状态机/解锁；`tests/world-games.test.mjs` 三界同日新口径绿
- [ ] 无 CDN 请求；APK 打包路径含 vendor three.js（prepare-mobile 产物抽查）
- [ ] 详见 `acceptance.md`

## 6. 升级触发

- 需求分解后出现明显遗漏（如用户要求语音识别/触屏），回到 `requirements-checklist.md` 增补
- three.js 在 MuMu WebView 帧率不可接受（<30fps）→ 升级讨论降级方案（缩小世界/换 2.5D）
- bridge 改动引发三游戏合同测试连锁红 → 暂停 S4，回到 voxel-optimize 收口后重试
