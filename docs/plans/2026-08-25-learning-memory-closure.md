# 游戏化学习记忆闭环实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 依据两份 2026-08-25 优化方案，把三个学习游戏接入同一本本地记忆账本，让答错/到期卡优先回流，同时保持完整游戏画面、冻结答题状态机和 Android 横屏一屏布局。

**架构：** 在现有 `games/shared` 浏览器脚本中增加无 DOM 的 Leitner 记忆核心，并由 `workbench-bridge.js` 以独立 `workbench:memory:v1` 域持久化。学习卡覆盖层只负责交互，选题和答题记录委托给记忆队列；旧游戏进度键继续保留用于玩法恢复。先落地阶段 A/B 的闭环，阶段 C 的复习入口采用只读/最小可复用消费端，不改现有游戏冻结规则。

**技术栈：** Vanilla JavaScript、浏览器 `localStorage`、Node `node:test`、Capacitor Android。

---

### 任务 1：共享记忆核心

**文件：**
- 创建：`prj/games/shared/workbench-memory.js`
- 创建：`tests/workbench-memory.test.mjs`

**步骤 1：编写失败的测试**

覆盖记忆初始化、`again/good/easy` 分级、`dueWords`、`pickCards` 的到期/错题优先和局内去重；验证同一 key 的 `track` 只形成一条记录。

**步骤 2：运行测试以验证它失败**

运行：`node --test tests/workbench-memory.test.mjs`

预期：因共享脚本不存在或导出接口不存在而失败。

**步骤 3：编写最小实施**

从已验证的 `blocklegend/data/word-memory.js` 提取纯函数语义，增加 `track`、`ease`、`needsRelearn` 和 `pickCards`，保持浏览器全局与 Node VM 可加载。

**步骤 4：运行测试以验证它通过**

运行：`node --test tests/workbench-memory.test.mjs`

预期：新增测试全绿。

### 任务 2：统一账本桥接

**文件：**
- 修改：`prj/games/shared/workbench-bridge.js`
- 修改：`tests/learning-defense.test.mjs`

**步骤 1：编写失败的测试**

断言 `recordMemoryAnswer`、`getMemory` 和 `saveMemory` 使用独立域，不改 `dailyPlans`、阳光或世界进度；汉字/单词相同 key 只能共享一条账本记录。

**步骤 2：运行测试以验证它失败**

运行：`node --test tests/learning-defense.test.mjs tests/workbench-memory.test.mjs`

预期：桥接接口不存在。

**步骤 3：编写最小实施**

让桥接层兼容已有 `WorkbenchMemory` 全局，并在无浏览器模块时安全降级；统一记录 `track/key/source/grade/responseMs`。

**步骤 4：运行测试以验证它通过**

运行：`node --test tests/learning-defense.test.mjs tests/workbench-memory.test.mjs`

预期：既有学习防守测试与新账本测试全绿。

### 任务 3：学习卡回流与分级作答

**文件：**
- 修改：`prj/games/shared/learning-card-overlay.js`
- 修改：`prj/games/learning-defense/game.js`
- 修改：`prj/games/voxel-craft/game.js`
- 修改：`prj/games/platform-quest/game.js`
- 修改：三个游戏 `index.html`
- 修改/创建：相关测试文件

**步骤 1：编写失败的测试**

断言首局仍按新卡回退，已有 `again`/到期卡优先，答题耗时分档并写入共享账本；断言横屏 overlay 的选择器、冻结条件和卡片数量合同不变。

**步骤 2：运行测试以验证它失败**

运行：`node --test tests/learning-defense.test.mjs tests/learning-worlds.test.mjs`

预期：当前覆盖层固定使用 `cards[cardsCompleted]`，没有记忆队列/grade。

**步骤 3：编写最小实施**

覆盖层增加 `pickCard`、回答计时和 `onAnswer` 钩子；三个学习入口使用同一个记忆队列，复用完整经典游戏壳，不修改 Canvas、控制区、冻结状态机或每日计划。

**步骤 4：运行测试以验证它通过**

运行：`node --test tests/learning-defense.test.mjs tests/learning-worlds.test.mjs`

预期：回归全绿，且测试能证明错题/到期回流。

### 任务 4：家长可见的最小消费端

**文件：**
- 创建：`prj/review-workbench.html`
- 修改：工作台入口相关 HTML/JS
- 创建/修改：`tests/workbench-memory-report.test.mjs`

**步骤 1：编写失败的测试**

断言页面能从统一记忆域渲染薄弱词 Top 10、24 小时到期清单和本周摘要，并不创建第二套学习存储。

**步骤 2：运行测试以验证它失败**

运行：`node --test tests/workbench-memory-report.test.mjs`

预期：报表页面不存在。

**步骤 3：编写最小实施**

用纯前端页面读取 `WorkbenchMemory`/localStorage，提供返回工作台入口；不引入后端、不改变游戏界面布局。

**步骤 4：运行测试以验证它通过**

运行：`node --test tests/workbench-memory-report.test.mjs`

预期：报表合同全绿。

### 任务 5：交付验证

**文件：**
- 不新增业务代码；检查所有相关测试和 APK 工件。

**步骤 1：运行回归**

运行：`npm test`、`npm run android:sync`、`cd android; .\\gradlew.bat assembleDebug`。

**步骤 2：验证真实消费者**

安装 `android/app/build/outputs/apk/debug/app-debug.apk` 到 `127.0.0.1:16384`，分别打开经典/学习方块与横版入口，确认完整 Canvas、横屏布局、学习覆盖层和冻结行为。

**步骤 3：交付**

报告测试数量、构建产物、MuMu 观察结果和仍未实现的阶段 C 项目，不把文档或计划本身当作完成凭据。
