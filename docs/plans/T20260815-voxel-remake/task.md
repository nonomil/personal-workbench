# T20260815-VR - 任务定义卡

> 模式：L2 | 执行策略：CLOSED 串行，S1→S5，不开 fleet。

## 0. 领域画像

- 主画像：软件开发（`templates/profiles/software-dev.md`）
- 次画像：儿童游戏体验 + 共享接口治理（bridge / launcher / 进度键）

## 1. Loop 类型判断

- [x] CLOSED 单 Agent：新文件夹零耦合，接口契约明确，切片可独立验证
- [ ] CLOSED Fleet / OPEN

## 2. 动机自检

- [x] 已读 2d-minecraft C++ 源码（level/chunk/physics/crafting/registers），玩法规格可照抄
- [x] 已核对现有接口面（bridge 函数、progress 键、launcher 五入口、主题参数）
- [x] 不是用重写回避理解：旧游戏的任务桥接逻辑已被 18 个合同测试覆盖，直接复用其数据层

## 3. 目标与接口契约（「只是接口兼容」的精确定义）

新游戏：`prj/games/voxel-craft/`。**以下三张表是必须保持的对外接口，其余全部可重做。**

### 3.1 bridge 接口（`games/shared/workbench-bridge.js`，只调用不修改）

| 接口 | 用法（与旧游戏一致） |
|---|---|
| `bridge.recordPlaySession('voxel-adventure')` | 进页即调 |
| `bridge.awardSunlight({ gameId:'voxel-adventure', eventKey:'quest-'+id, amount })` | 生涯任务一次 |
| `bridge.awardSunlight({ …, eventKey:'daily-'+today+'-'+key })` | 每日挑战 |
| `bridge.getPlayMods()` | 难度/阳光倍率（三游戏唯一已接，必须保留） |
| `bridge.backHref('voxel-adventure')` | 返回工作台链接 |
| `bridge.getProgress()/saveProgress()` | 见 3.2 |

### 3.2 进度键（localStorage，`growth.worldGames.voxel-adventure`）

```
questsDone[]        // 生涯任务 id（优先判定）
clearedLevels[]     // 旧档兼容：只读不写（历史横版关卡）
rank / minerLevel   // 矿工段位 1–5
crystalsTotal       // 晶体累计
blocksBuilt         // 建造累计
unlockedTools[]     // 老档全解锁不回收
biome               // 'meadow'（字段保留）
homeSnapshot        // 家园快照 <8KB
inventory           // 背包（kind→数量）
```

### 3.3 页面/入口接口

| 接口 | 约定 |
|---|---|
| GAME_ID | **保持 `'voxel-adventure'`**（文件夹名与 id 解耦，存档/账本/徽章零迁移） |
| launcher 五入口 | `config.js` 中 voxel 入口 html 路径改指 `games/voxel-craft/index.html`（S5） |
| 工作台嵌入 | `app.js` 中游戏 iframe/embed 的 voxel 路径同步改（S5，先 grep 定位） |
| 主题联动 | URL `?theme=voxel-adventure` 返回链接、皮肤内嵌参数不变 |
| 数据层 | `data/quests.js`（VoxelQuests：18 生涯 + 10 每日 + 5 段位）**原样复制引用**——成长任务是工作台接口，不是游戏内容 |

## 4. 重做范围（用户明确放行）

- **美术**：`assets/mc/` 34 张 zlib 贴图（方块/物品/UI，已从 2d-minecraft 拷贝）+ 原创探险者角色
  （steve.png 属 Mojang IP，不入库）+ 渐变天空/光照装饰自由发挥
- **内容**：世界生成（分块噪声地形、树、分层矿脉）、关卡呈现方式、合成配方集、引导文案
- **布局**：全屏 canvas + MC 风热键栏 + E 键背包/合成面板 + 顶部任务 HUD，不再有旧选关面板

## 5. 子任务切片（详见 steps.md）

| 切片 | 内容 | 验证 |
|---|---|---|
| S1 | 纯函数世界模块 + 合同测试（地形/挖放/门禁，node 可测） | `node --test` 新测试文件 |
| S2 | Canvas 引擎：贴图渲染、玩家物理、相机、挖掘裂纹、热键栏 | 浏览器目检 + 回归 |
| S3 | 任务桥：quest 判定 / awardSunlight / 结算三行 / 升段卡 | 复用 world-games-growth 断言模式 |
| S4 | 合成台 + 熔炉面板 + 家园快照 | 纯函数断言 |
| S5 | 入口切换（config.js/app.js）+ 旧测试改口 + 验收 | `npm test` 全量 |

## 6. 边界

**只新建：** `prj/games/voxel-craft/**`、`tests/voxel-craft.test.mjs`（新）
**只改（S5 时）：** `prj/config.js`（入口路径）、`prj/app.js`（嵌入路径，先 grep）、
`tests/world-games.test.mjs` / `tests/world-games-growth.test.mjs` / `tests/voxel-world.test.mjs`（路径改口，断言语义不变）
**不碰：** `games/shared/workbench-bridge.js`、`games/voxel-adventure/**`（S5 前零改动，验收后由用户决定去留）、其他两游戏、localStorage key。
**明确不做：** 3D、多人、无限世界、红石、上游 78MB 音频、steve.png、任何 Minecraft 商标字样。

## 7. 风险

| 风险 | 缓解 |
|---|---|
| 并行会话同改 config.js / app.js / world-games 测试 | S5 前先 grep 实际值；冲突即停并回写本包 |
| MC 贴图版权（上游 zlib，但画风源自 MC） | README 署名 + 不用角色/商标 + 发布前去留由用户拍板 |
| 重做丢旧游戏能力（蓝图任务/工坊） | S3/S4 验收清单逐项对照旧功能；quests.js 不动保证数据兼容 |
| 全量测试基线本就有并行失败 | 以「本包新增/改动的测试文件退出码 0」为准，全量差异逐条归属 |
