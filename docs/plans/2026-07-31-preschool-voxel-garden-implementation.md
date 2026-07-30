# 幼儿方块花园工作台实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 在不影响成人版和儿童版的前提下，把幼儿版重做为接近“暑期作业台 2.0”功能结构的原创方块花园学习工作台，并实现任务、阳光、植物成长、入侵者防守与即时反馈闭环。

**架构：** 保持当前静态 Vanilla JS SPA、幼儿版通过 `config.js` 选择的独立状态键和 `storage.js` 本地优先存储。把防守状态扩展到 `preschool-garden.js`，把幼儿首页与幼儿专属页面渲染留在 `app.js`，把主题样式集中放到 `styles.css` 的 `body.variant-preschool` 作用域，避免污染成人版/儿童版。

**技术栈：** HTML、CSS、Vanilla JS、Node.js `node:test`、localStorage、现有原创 PNG 素材、Capacitor 静态包装。

---

### 任务 1：为防守闭环补充失败测试

**文件：**
- 修改：`tests/preschool-garden.test.mjs`
- 参考：`preschool-garden.js`

**步骤 1：编写失败测试**

增加以下行为断言：

- 默认花园包含 `defenseEnergy`、`defenseShots` 和 `invader.health`。
- 完成一次学习事件会增加一枚防守能量，重复使用同一 `eventId` 不会再次增加。
- `firePea` 在没有入侵者、能量不足和正常命中三种情况下返回明确结果。
- 入侵者生命值归零时只增加一次 `defenseShots`，并解锁勇敢收集物。
- 旧快照缺少新增字段时仍能得到合法默认值。

**步骤 2：运行测试确认失败**

运行：`npm test -- --test-name-pattern="防守|能量|旧快照"`  
预期：新增断言失败，提示公开 API 或字段尚未存在。

**步骤 3：提交测试**

运行：`git add tests/preschool-garden.test.mjs && git commit -m "test: specify preschool garden defense loop"`

---

### 任务 2：实现兼容的花园防守状态与纯逻辑

**文件：**
- 修改：`preschool-garden.js`
- 修改：`storage.js`（仅在需要时补充幼儿版归一化边界）
- 测试：`tests/preschool-garden.test.mjs`

**步骤 1：扩展默认值和归一化**

在 `garden` 下追加：

```text
defenseEnergy: 0
defenseShots: 0
invader: { active, health: 3, maxHealth: 3, wave, ... }
lastDefenseDate: ''
```

旧 `zombie`、旧 `invaderActive` 和已有 `garden.invader` 字段继续读取；数值限制在合理范围内，数组去重。

**步骤 2：实现纯函数 API**

增加 `grantDefenseEnergy(input, amount, eventId)`、`spawnInvader(input, date)`、`firePea(input, date)` 和 `getDefenseView(input, date)`。所有函数返回新对象/结果，不修改调用者传入的快照；`recordEvent` 成功记录动作时增加能量，事件去重时不增加。

**步骤 3：运行测试确认通过**

运行：`npm test -- --test-name-pattern="防守|能量|旧快照"`  
预期：新增测试通过，原有花园测试保持通过。

**步骤 4：提交**

运行：`git add preschool-garden.js storage.js tests/preschool-garden.test.mjs && git commit -m "feat: add preschool garden defense state"`

---

### 任务 3：先补幼儿首页交互契约，再接入渲染动作

**文件：**
- 修改：`tests/workbench-contract.test.mjs`
- 修改：`app.js`

**步骤 1：编写失败契约**

检查幼儿首页包含花园 HUD、今日任务、阳光、宝箱、收集栏、入侵者防守入口、`fire-pea` 动作和减少动效媒体查询；检查成人/儿童入口仍不含幼儿专属防守动作。

**步骤 2：实现幼儿交互**

在 `app.js` 中：

- 将幼儿总览重排为“HUD → 花园防守场 → 今日任务 → 宝箱/收集 → 课程/家长”顺序。
- 每张任务卡显示短标题、学科、阳光奖励、完成状态和大触控按钮。
- 任务完成后调用现有学习奖励路径，再调用花园事件 API；不直接写共享积分 key。
- 入侵者状态显示生命条、当前波次、防守能量和 `fire-pea` 按钮；结果通过现有 toast/庆祝层反馈。
- 增加 `prefers-reduced-motion` 下仍可用的纯文本/状态反馈。

**步骤 3：运行契约测试**

运行：`npm test -- --test-name-pattern="幼儿|entry points|防守"`  
预期：契约通过，成人版和儿童版隔离断言通过。

**步骤 4：提交**

运行：`git add app.js tests/workbench-contract.test.mjs && git commit -m "feat: reshape preschool voxel adventure home"`

---

### 任务 4：重做幼儿版方块世界样式与即时反馈

**文件：**
- 修改：`styles.css`
- 可选新增：`assets/generated/preschool-pixel/...` 中仅使用已有素材，不提交缓存或临时图

**步骤 1：建立幼儿版主题变量**

在 `body.variant-preschool` 下定义天空、草地、土壤、阳光、纸张和警报色，使用方块边缘、内阴影和硬朗边框形成原创体素感；不覆盖根变量和其他版本的组件规则。

**步骤 2：重排桌面/移动端布局**

实现固定比例的花园战区、任务卡网格、HUD 胶囊、宝箱和收集槽位。桌面端两列，移动端单列；48px 以上触控目标；长标题可换行；不依赖视口缩放字体。

**步骤 3：实现反馈动画**

加入任务点亮、阳光飞行、植物呼吸、豌豆发射、命中闪光和入侵者退场动画；通过 `.is-celebrating`、`.is-defeated` 等状态类控制，`prefers-reduced-motion: reduce` 关闭位移和无限动画。

**步骤 4：提交**

运行：`git add styles.css && git commit -m "style: rebuild preschool voxel garden theme"`

---

### 任务 5：补浏览器级静态检查和移动端制品验证

**文件：**
- 修改：必要时 `README.md`、`docs/README.md` 或幼儿版文档
- 生成：`dist/`（验证后不提交，按 `.gitignore` 处理）

**步骤 1：运行全量单测**

运行：`npm test`  
预期：全部通过。

**步骤 2：做脚本语法与静态资源检查**

运行：

```powershell
node --check app.js
node --check preschool-garden.js
npm run android:prepare
```

预期：脚本无语法错误，`dist/preschool-workbench/index.html`、共享脚本和 PNG 素材存在。

**步骤 3：启动本地静态服务检查深层入口**

通过仓库现有静态服务打开 `/preschool-workbench/`，检查刷新、哈希导航、图片相对路径和移动端布局；若存在 Playwright/Chrome 环境则保存桌面和移动截图到 `tmp/`，不写入发布目录。

**步骤 4：检查发布与 APK 工作流**

运行 Pages/发布门禁（若仓库提供），确认 `.github/workflows/android-apk.yml` 仍会在 `main` 推送触发，并确认 Android 构建脚本引用新幼儿入口和素材。

**步骤 5：提交验证文档变更并推送**

只提交源码、测试和必要文档；不提交 `dist/`、截图缓存、真实密钥或本地 Android 构建目录。确认工作树干净后推送 `main`，再检查 GitHub Actions 的 APK 构建结果和 Pages 入口。

