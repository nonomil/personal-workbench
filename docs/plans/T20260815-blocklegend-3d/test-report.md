# T20260815-blocklegend-3d · 测试报告

> 状态：S1–S6 已执行。自动化绿（本包无新增失败）；浏览器走查覆盖进游戏/词卡暴击/持久化/帮助/入口/三档视口。MuMu 未验。未标 accepted。
> 本文件只记录事实，不把计划当完成。

## 切片进度

| 切片 | 状态 | 自动证据 | 浏览器证据 | 备注 |
|---|---|---|---|---|
| S1 vendor + 引擎骨架 | 已执行 | 见 S1 | 见 S1 | 上一会话 |
| S2 战斗核心 | 已执行 | `tests/blocklegend.test.mjs` combat 8 项绿 | 3 只怪在场，60fps | 先红后绿：模块缺失 → 纯函数绿 |
| S3 词卡系统 | 已执行 | 词池 324 / quiz / 节奏 3 项绿 | 词卡 `flame`/`悦灵`，答对暴击 24，刷新后 已学1/答对1/答错1 保留 | |
| S4 Boss + 关卡 + bridge | 已执行 | 解锁价/Boss 状态机绿；`world-games` 22/22（含三界 ≥3） | 本会话未手打到 Boss 结算 | 合同覆盖盾/破防/恢复/解锁 |
| S5 商人 + 帮助 + 入口 | 已执行 | 入口/帮助/商人接线断言绿 | ？ 浮层全英文；方块主题首页见入口卡（必做未完时置灰） | |
| S6 收口走查 | 已执行 | `npm test` 377/384 | 见下 | 7 失败全为既有，本包未新增 |

## S1 证据（2026-08-15）

（上一会话，保留）语法绿；vendor three.js r147 UMD；浏览器 60fps 无报错。allowlist 无需登记 vendor。

## S2–S5 自动化（2026-08-15）

- `node --test tests/blocklegend.test.mjs` — 退出码 0，14/14
  - 暴击：未答 ×1；答对 ×3；连对≥3 ×4；近战 BASE 8 / 弹 BASE 5
  - 词池：6 关并集 324、D1 合计 60、D2 每关 66
  - 解锁价 `[0,50,150,300,500,800]`；金币不足不扣款
  - Boss：`shielded` 伤害 ×0.2 → 削盾 `broken` 红罩 ×1 → 超时回盾 50%
- `node --test tests/world-games.test.mjs` — 退出码 0，22/22
  - `recordPlaySession('blocklegend')` ok
  - 花园+方块+闯关仍三界同日；仅 2 世界为假；含 blocklegend 的 3 世界为真
  - 周报含「方块传奇 / 关 / total 6」
- `node --check`：`combat.js` / `words.js` / `levels.js` / `game.js` / `app.js` / `workbench-bridge.js` 退出码 0
- `npm test`：384 项中 **377 通过、7 失败、退出码 1**。7 个失败与本包无关（花园波次、config 缓存戳、图标 `bomb`、闪卡 css 戳、creeper 商标、platform-hero 缺素材、首页三世界 total:12 旧口径）。本包开工基线同为 7 既有失败。

## 浏览器走查（http://127.0.0.1:4195）

- URL：`/prj/games/blocklegend/index.html`，标题「方块传奇 · 学英语大冒险」
- `window.__blErr` 空；`#fps-label` **60**；3 只怪在场；无 CDN 资源（`performance` 过滤 cdn/unpkg/jsdelivr/threejs.org 为空）
- 词卡：近战弹出四选一（例 `flame` / `悦灵` + 发音按钮）；答对 `lastDamage=24`、`lastCrit=true`；HUD 答对 1 / 已学 1
- 刷新后：答对 1、答错 1、已学 1、金币 4、`learnedIds=['mc-allay']` 仍在
- ？ 帮助浮层全英文（WASD / Left click / Right click / F / word card）
- 视口：1280 / 390 / 320 均 `scrollWidth===clientWidth`，无横向溢出
- 方块主题首页：`?theme=voxel-adventure#overview` 出现「方块传奇 · 学英语」卡；今日必做未完时按钮「先完成今日必做」
- 未在本会话手打完：清波 → Boss 破防 → 结算阳光 → 金币解锁第 2 关（由合同测试覆盖，待用户手玩补勾 acceptance A4/B2/B3）

## MuMu 冒烟

未验。本机无本次 APK 安装记录。触屏操控仍 deferred。

## 视觉翻新（2026-08-15 晚，用户反馈驱动）

用户反馈：画面与参考游戏差别大，敌人/主角 3D 形象太丑太简单。参照关键帧 frame_9 视觉规格（像素纹理、高饱和明亮、方块怪红眼发光）与 frame_11/12（Boss 蓝罩→红罩）。

新增 `prj/games/blocklegend/mobs.js`（全程序化，无外部素材）：

- **怪物模型**：16×16 像素脸贴图（发光眼/嘴，商人对眉）+ 多部件身体 + 走路动画（腿摆/躯干起伏/头微晃）+ 朝向玩家 + 头顶三色血条（受伤才显示、始终朝向相机）
  - slime=半透明果冻皮+深色内核+移动挤压弹跳；cube=四足方块兽（头/吻/尾/4 摆动腿）；husk=人形石壳怪（双臂前伸僵尸步态）；boss=husk×1.9+肩甲+双金角+旋转护罩（沿用 'boss-shield' 节点名，破防变红逻辑不变）；merchant=长袍+围裙+抱臂+礼帽
- **主角**：第一人称手臂+像素剑 viewmodel（挂相机）：待机呼吸摆、走路摆、挥砍弧线、施法剑刃泛紫
- **特效**：3D 伤害数字（暴击金色 CRIT!）、死亡方块粒子爆裂、Boss 双色爆裂、金色圆柱硬币（旋转悬浮）、魔法弹（旋转核心+呼吸光晕+紫色尾迹粒子）、拾取金屑

game.js 接线：spawnMonster / moveMonsters / tryMelee / tryBolt / hurtMonster / killMonster / killBoss / spawnPickup / spawnMerchant / tick 改用 mobs.js；删除旧黄色挥砍棒、DOM 伤害弹字与旧 3 盒商人；index.html 挂 mobs.js（缓存戳 look3）。删除未使用孤立文件 textures.js。

证据：

- `node --check mobs.js game.js` 退出码 0
- `node --test tests/blocklegend.test.mjs tests/world-games.test.mjs` **38/38、退出码 0**（比并行会话的 14+22 多 2 项：world-games 新增断言）
- 浏览器（127.0.0.1:4195?v=look3）：`window.__blErr` 空无报错；3 只怪存活、首只 mesh children=4（皮肤+脸+内核+血条，新模型确认）；HP 10/10、金币/词卡 HUD 正常；截图 256KB 渲染正常（IAB 后台 fps 节流假低，S1 已证前台 60fps）
- 待用户手玩确认：模型观感是否达到预期（本节只证"接线正确无报错"）

## 视觉翻新二期 + 未解渲染 bug（2026-08-15 深夜，交接 003）

**已完成（语法绿、定向测试 38/38 绿）**：
- 受击红闪（.bl-hurt 边缘晕光）、死亡复活（回出生点/满血/连击清零/绿色粒子）、脱战 4 秒回血 0.25/s；删除废弃 DOM 弹字 #dmg-pop
- CONTACT_RANGE 1.15→1.7（贴身怪低于相机半视场角看不见）；缓存戳升至 **look7**
- 调试设施：`?facemob`（镜头每帧锁最近怪）/ `?facemob=merchant`（锁商人）；`__blDebug.info`（calls/triangles/sceneChildren/sceneGroups）

**未解 bug（阻塞验收）**：怪物与商人模型确认存在于场景（`__blDebug.info` = 32 calls / 12824 tris / sceneChildren 120 / sceneGroups 4，含 3 怪+商人）、mesh.visible=true、position 与逻辑坐标同步、镜头 yaw/pitch 已精确锁定目标，但 7 张截图经视觉模型判读**均看不到任何怪物/商人**；地形、树、花、云、右下手臂剑均正常渲染。根因未定位，详见交接 `docs/handoff/003_blocklegend-视觉调试交接_20260815/`。

## 遗留与决策记录

- 触屏操控：deferred（R1.4），待桌面版验收后另开切片
- 110/324 词外的发音：Web Speech 兜底，离线 APK 内不可用属预期，静音降级
- S1 修正：allowlist 无需登记 vendor
- 本会话未手玩 1→2 关闭环；Boss/结算/解锁以纯函数+接线为准
- 未 commit（用户未要求）
