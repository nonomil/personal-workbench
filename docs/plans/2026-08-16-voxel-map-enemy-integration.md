# 方块世界地图与敌人整合实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 将参考项目的多群系地图与分层敌人池接入当前可玩的 `voxel-craft`，保留现有挖掘、建造、任务与存档兼容。

**架构：** 新增独立的地图目录和敌人目录，地图目录只负责可解锁配置，世界模块负责按配置生成稳定地形，敌人目录只负责属性/刷新池，现有引擎负责碰撞与战斗。`voxel-craft` 继续使用 `GAME_ID = 'voxel-adventure'` 和旧存档字段，并将 `mapId`/多地图快照作为可选扩展。

**技术栈：** 原生 JavaScript IIFE、Canvas 2D、Node `node:test`、现有 `WorkbenchGameBridge`。

---

### 任务 1：地图与敌人纯函数契约

**文件：**
- 创建：`tests/voxel-craft-map-enemy.test.mjs`
- 创建：`prj/games/voxel-craft/data/maps.js`
- 创建：`prj/games/voxel-craft/data/enemies.js`

**步骤：**

1. 先写覆盖地图数量、地图解锁、每张地图稳定生成、敌人池覆盖、敌人追踪/攻击结果的测试。
2. 运行 `node --test --test-concurrency=1 tests/voxel-craft-map-enemy.test.mjs`，确认因新模块不存在而正确失败。
3. 实现 15 张地图（保留 `meadow`，并接入参考项目 14 个群系）与 16+ 个敌人类型的纯数据 API。
4. 在世界模块中按地图配置生成可复现地形，在引擎中加入敌人安全移动、玩家伤害、近战攻击纯函数。
5. 重跑目标测试，确认红转绿。

### 任务 2：接入当前游戏入口

**文件：**
- 修改：`prj/games/voxel-craft/index.html`
- 修改：`prj/games/voxel-craft/game.js`
- 修改：`prj/games/voxel-craft/game.css`
- 修改：`prj/games/voxel-craft/data/world.js`
- 修改：`prj/games/voxel-craft/engine.js`

**步骤：**

1. 在 HTML 加载地图/敌人数据并增加地图册、生命值、敌人数量和攻击控件。
2. 将地图选择接入现有 `worldSaves`，兼容旧的 `worldSave`/`meadow`/`cave` 存档。
3. 按当前地图刷新敌人、渲染已有敌人素材或颜色回退、实现追踪、接触伤害、攻击击退、击败奖励和死亡回出生点。
4. 为地图锁定、战斗和移动补充移动端触控入口，保持原有挖放操作。
5. 运行目标测试与现有 `voxel-craft`/`voxel-world` 测试。

### 任务 3：完整验证

**步骤：**

1. 运行 `node --test --test-concurrency=1 tests/voxel-craft-map-enemy.test.mjs tests/voxel-craft.test.mjs tests/voxel-world.test.mjs tests/world-games.test.mjs tests/platform-physics.test.mjs tests/play-mods.test.mjs`。
2. 运行 `npm test`，确认全量回归无失败。
3. 运行 `node scripts/release-verify.mjs`，确认资源、入口和公共文案契约仍满足当前工程约束。
4. 用本地静态入口检查脚本顺序、地图册按钮、敌人状态 HUD 与移动端布局，记录实际退出码和失败数。

