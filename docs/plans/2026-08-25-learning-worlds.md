# 方块世界与横版闯关学习版实施计划

> **给 Claude:** 必需子技能：使用子代理驱动开发逐任务实施此计划。

**目标：** 在保留现有方块世界与横版闯关经典玩法的前提下，各新增一个独立的儿童横屏学习版：游戏过程中完成 10 张汉字/英语学习卡后才能进入最终目标，并接入工作台、Android 打包和本地掌握度回写。

**架构：** 两个学习版各自拥有独立目录、HTML/CSS/JS、状态机、卡片数据、资产清单和 docs；复用现有世界资产时只复制运行所需文件，避免引用原游戏目录。两个游戏复用 `prj/games/learning-defense/core/` 的时钟与学习闸门，但通过各自的玩法适配层定义“采集/建造触发卡片”和“检查点/敌人触发卡片”。经典方块世界和横版闯关入口继续保留，工作台增加学习版选择入口。

**技术栈：** 原生 HTML/CSS/JavaScript、Canvas、共享 `WorkbenchGameBridge`、Android WebView、Node `node:test`。

---

### 任务 1：定义两个学习版的红灯测试与方案文档

**文件：**
- 创建：`tests/learning-worlds.test.mjs`
- 创建：`docs/plans/2026-08-25-learning-worlds.md`
- 创建：`prj/games/voxel-learning/docs/design.md`
- 创建：`prj/games/platform-learning/docs/design.md`

**步骤：**

1. 为两个独立项目、10 张卡闸门、最终目标锁定、答错纠正、桥接写回、横屏无滚动和工作台入口写断言。
2. 运行 `node --test tests/learning-worlds.test.mjs`，确认由于两个项目尚不存在而失败。
3. 记录两个玩法的单屏布局：顶部进度/退出，中央 Canvas，底部触控区和卡片覆盖层；学习卡出现时冻结玩法模拟。

### 任务 2：实现方块世界学习版

**文件：**
- 创建：`prj/games/voxel-learning/index.html`
- 创建：`prj/games/voxel-learning/game.css`
- 创建：`prj/games/voxel-learning/game.js`
- 创建：`prj/games/voxel-learning/data/cards.js`
- 创建：`prj/games/voxel-learning/core/learning-adapter.js`
- 创建：`prj/games/voxel-learning/assets/asset-manifest.json`
- 创建：`prj/games/voxel-learning/assets/reused/**`
- 创建：`prj/games/voxel-learning/docs/asset-plan.md`
- 创建：`prj/games/voxel-learning/docs/visual-review.md`

**步骤：**

1. 先让红灯测试覆盖：挖掘/放置达成阶段目标后触发掉卡，卡片阶段冻结计时，10/10 才能打开传送门。
2. 实现最小 Canvas 采集/建造循环、触屏按钮、学习卡覆盖层和汉字/英语本地掌握度写回。
3. 复制必要方块、人物、天空、工具图标到独立 `assets/reused/`，记录来源与 SHA256；预留 `assets/generated/<asset-id>/` 原创替换合同。
4. 运行 `node --test tests/learning-worlds.test.mjs`，修复到方块部分全绿。

### 任务 3：方块学习版规格审查与代码质量审查

**检查：**
- 卡片前不能达成最终目标；答错后仍可纠正并继续。
- 只有 `recordSubjectAnswer` / `recordWordAnswer` 成功后才计入学习数。
- Android 横屏 `html/body` 无滚动，触控目标不小于 44px。
- 不修改原 `voxel-craft` 的存档和玩法代码。

### 任务 4：实现横版闯关学习版

**文件：**
- 创建：`prj/games/platform-learning/index.html`
- 创建：`prj/games/platform-learning/game.css`
- 创建：`prj/games/platform-learning/game.js`
- 创建：`prj/games/platform-learning/data/cards.js`
- 创建：`prj/games/platform-learning/core/learning-adapter.js`
- 创建：`prj/games/platform-learning/assets/asset-manifest.json`
- 创建：`prj/games/platform-learning/assets/reused/**`
- 创建：`prj/games/platform-learning/docs/asset-plan.md`
- 创建：`prj/games/platform-learning/docs/visual-review.md`

**步骤：**

1. 先让红灯测试覆盖：经过检查点/击退敌人触发掉卡，10/10 才能解锁旗帜终点，卡片期间冻结玩家和敌人。
2. 实现最小横版跑跳、检查点、敌人、终点和触屏按钮；保留键盘支持用于网页调试。
3. 复制必要人物、敌人、天空和平台资产到独立目录，记录来源与 SHA256；预留原创资产目录。
4. 运行 `node --test tests/learning-worlds.test.mjs`，修复到横版部分全绿。

### 任务 5：横版学习版规格审查与代码质量审查

**检查：**
- 未完成 10 张卡不能结算胜利；终点触碰不会绕过闸门。
- 触屏操作、卡片按钮、退出按钮满足横屏单屏可用性。
- 答题写回不依赖课程页全局对象，不污染 `dailyPlans`。
- 不修改原 `platform-quest` 的关卡物理代码。

### 任务 6：统一接入工作台、移动打包与测试

**文件：**
- 修改：`prj/app.js`
- 修改：`scripts/prepare-mobile.mjs`
- 修改：`tests/learning-worlds.test.mjs`

**步骤：**

1. 为方块世界和横版闯关增加独立学习入口，经典入口保持可选；进度行显示学习卡数量。
2. 把两个目录加入 Android 同步清单，排除 docs 截图和验收文件。
3. 运行定向测试、核心脚本 `node --check`、APK 构建和包内清单检查。
4. 用 `adb install -r` 覆盖安装到 MuMu，确认两个学习版 Activity/WebView 启动并保存截图。

### 任务 7：最终验证与交付

**验收命令：**

```powershell
node --test --test-concurrency=1 tests/learning-worlds.test.mjs tests/prepare-mobile.test.mjs
node --check prj/games/voxel-learning/game.js
node --check prj/games/platform-learning/game.js
git diff --check
```

交付时报告定向测试结果、APK SHA256、包内文件与 MuMu 安装结果；全仓已有失败必须单独列出，不把它们混入本次新功能结论。
