# 知识花园保卫战 MVP 实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 新建一个独立的 Android 横屏优先塔防学习游戏，让学习卡在战斗里程碑时从天空落下，完成 10 张后才解锁最终波。

**架构：** 新游戏位于 `prj/games/learning-defense/`，不修改原 `garden-defense` 的战斗逻辑。Canvas 负责持续绘制战场，DOM 负责学习卡、HUD 和结算；纯函数状态机统一控制战斗冻结、纠错、10 张计数和最终波解锁。

**技术栈：** 原生 HTML/CSS/JavaScript、Canvas 2D、Node.js 内置测试、现有 `WorkbenchGameBridge`、现有 `PreschoolSpeech`、Capacitor WebView。

---

### 任务 1：建立项目合同和资产边界

**文件：**
- 创建：`prj/games/learning-defense/docs/design.md`
- 创建：`prj/games/learning-defense/docs/asset-plan.md`
- 创建：`prj/games/learning-defense/assets/asset-manifest.json`

**步骤 1：记录产品边界**

明确独立入口、横屏一屏、10 张解锁最终波、错误不惩罚、不得自动完成 `dailyPlans`。

**步骤 2：记录复用资产来源**

为每个复制资源保存原路径、目标路径、用途和 SHA256；新生成资源预留 `assets/generated/<asset-id>/` 结构。

**步骤 3：检查文档**

运行：`rg -n "10 张|横屏|dailyPlans|SHA256|assets/generated" prj/games/learning-defense/docs prj/games/learning-defense/assets/asset-manifest.json`

预期：上述设计约束和资产合同均可检索。

### 任务 2：测试并实现学习闸门状态机

**文件：**
- 创建：`tests/learning-defense.test.mjs`
- 创建：`prj/games/learning-defense/core/learning-gate.js`

**步骤 1：编写失败测试**

覆盖：战斗开始、卡片下落、学习冻结、首次答错进入纠错、纠错后也计数、10/10 解锁最终波、最终波恢复模拟。

**步骤 2：运行测试以验证失败**

运行：`node --test tests/learning-defense.test.mjs`

预期：失败，显示新项目或 `LearningDefenseCore` 尚不存在。

**步骤 3：实现最小状态机**

公开 `createSession()`，仅允许合法状态转换；使用快照返回状态，防止 UI 随意改写内部计数。

**步骤 4：运行测试以验证通过**

运行：`node --test tests/learning-defense.test.mjs`

预期：状态机测试通过。

### 任务 3：建立 10 张双科卡片数据

**文件：**
- 创建：`prj/games/learning-defense/data/cards.js`
- 复制：`prj/assets/vocab/core-english-2026.08.15/media/semantic/*.png` 到 `prj/games/learning-defense/assets/reused/learning/`

**步骤 1：编写失败测试**

断言恰好有 10 张唯一卡片，包含 `hanzi` 与 `word`，每张有 2–3 个图片选项且正确项存在。

**步骤 2：运行测试以验证失败**

运行：`node --test tests/learning-defense.test.mjs`

预期：失败，显示卡片数据缺失。

**步骤 3：实现最小卡片库**

首版使用山、水、花、鱼、猫以及 apple、banana、dog、fish、flower；英语音频引用中央词汇 MP3，汉字走统一发音服务。

**步骤 4：运行测试以验证通过**

运行：`node --test tests/learning-defense.test.mjs`

预期：卡片合同通过。

### 任务 4：实现横屏一屏游戏外壳

**文件：**
- 创建：`prj/games/learning-defense/index.html`
- 创建：`prj/games/learning-defense/game.css`

**步骤 1：编写失败测试**

断言存在固定 HUD、Canvas、学习卡层、暂停层、结算层和竖屏旋转提示；横屏 `html/body` 不滚动，按钮至少 44px。

**步骤 2：运行测试以验证失败**

运行：`node --test tests/learning-defense.test.mjs`

预期：失败，显示游戏外壳缺失。

**步骤 3：实现最小界面**

战场占满安全区，顶部一行显示 10 颗学习种子，底部只放 3 种植物和开始/暂停；矮横屏学习卡使用左图右题布局。

**步骤 4：运行测试以验证通过**

运行：`node --test tests/learning-defense.test.mjs`

预期：静态布局合同通过。

### 任务 5：接入战斗、发音和学习写回

**文件：**
- 创建：`prj/games/learning-defense/game.js`
- 复用：`prj/games/shared/workbench-bridge.js`
- 复用：`prj/preschool-speech.js`

**步骤 1：编写失败测试**

断言主循环只在 `session.canSimulate()` 时推进敌人，学习卡触发 `PreschoolSpeech.speak()`，汉字写 `recordSubjectAnswer()`，英语写 `recordWordAnswer()`，且代码不操作 `dailyPlans`。

**步骤 2：运行测试以验证失败**

运行：`node --test tests/learning-defense.test.mjs`

预期：失败，显示游戏控制器缺失。

**步骤 3：实现最小可玩闭环**

实现种植、自动射击、敌人移动、每次击败触发卡片、纠错、奖励阳光、10/10 最终波和结算。

**步骤 4：运行测试以验证通过**

运行：`node --test tests/learning-defense.test.mjs`

预期：全部定向测试通过。

### 任务 6：布局与回归验证

**文件：**
- 修改：`tests/learning-defense.test.mjs`
- 产出：`prj/games/learning-defense/docs/screenshots/`（本地截图，不入库）

**步骤 1：运行定向测试**

运行：`node --test tests/learning-defense.test.mjs`

预期：全部通过。

**步骤 2：运行相关回归**

运行：`node --test tests/world-games.test.mjs tests/preschool-mobile-layout.test.mjs`

预期：原游戏和移动布局测试不回归。

**步骤 3：浏览器尺寸检查**

检查：`800×360`、`915×412`、`1280×800`。

预期：横屏无纵向滚动，Canvas、HUD、植物栏和学习卡全部处于一屏；竖屏显示旋转提示。

**步骤 4：检查资产完整性**

运行：`Get-FileHash -Algorithm SHA256 prj/games/learning-defense/assets/reused/**/*`

预期：哈希与 `asset-manifest.json` 一致。

