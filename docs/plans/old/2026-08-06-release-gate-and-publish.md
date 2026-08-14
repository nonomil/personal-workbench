# 个人工作台 v0.5 发布门禁与自动发布实施计划

> **给 Codex:** 本计划在当前会话执行；先完成本地门禁，再进行远端推送与发布核验。

**目标：** 把当前已完成的五入口工作台源码整理成可重复验证的发布流程：根入口五卡顺序、静态资源路径、网页回归和 Android APK 构建都由同一套门禁确认，避免“网页测试通过”被误报成 APK 或远端发布完成。

**架构：** GitHub Pages 继续使用仓库根目录的静态源码；Capacitor 继续由 `scripts/prepare-mobile.mjs` 从同一份源码生成 `dist/` 后编译 APK。新增一个无网络的发布合同脚本，并让 GitHub Actions 先运行测试和合同校验，再执行 Android 构建；不新增运行时积分、课程或游戏状态。

**技术栈：** Vanilla JS、Node.js 内置 `node:test`、Node `fs/path`、Capacitor、Android Gradle、GitHub Actions。

---

## 发布边界

- 根入口必须先显示三个幼儿游戏世界：`garden-defense`、`voxel-adventure`、`platform-quest`；之后才显示成人和儿童两个通用工作台。
- 三个幼儿入口仍然是同一个 `preschool-workbench/index.html`，只通过 `theme` 查询参数切换视觉主题；不得生成第二套幼儿业务快照。
- 网页发布证据、Android 构建证据、APK 下载证据和 MuMu 安装证据分开记录；任一项缺失都不能写成“全部发布完成”。
- `docs/00-总控/` 是正式状态来源；本计划只记录实施过程，不在 `.worktrees` 创建长期总控。

### 任务 1：补充发布合同测试

**文件：**

- 创建：`G:/StudyCode/个人工作台/tests/release-contract.test.mjs`
- 检查：`G:/StudyCode/个人工作台/index.html`
- 检查：`G:/StudyCode/个人工作台/launcher.js`

**步骤：**

1. 写测试，读取根入口 HTML，断言两个分组存在且幼儿分组出现在通用分组之前。
2. 断言幼儿主题顺序与入口参数完全为 `garden-defense`、`voxel-adventure`、`platform-quest`。
3. 断言成人和儿童链接各出现一次，并且所有五个入口的目标 HTML 和卡片主图在源码树中存在。
4. 运行 `node --test tests/release-contract.test.mjs`，先确认测试能真实捕获入口合同。

### 任务 2：实现无网络发布合同命令

**文件：**

- 创建：`G:/StudyCode/个人工作台/scripts/release-verify.mjs`
- 修改：`G:/StudyCode/个人工作台/package.json`
- 修改：`G:/StudyCode/个人工作台/package-lock.json`

**步骤：**

1. 把任务 1 的检查抽成可复用函数，命令行执行时输出每一项的通过/失败原因。
2. 增加 `npm run release:verify`，只读取当前仓库，不访问网络、不读取密钥、不写入发布目录。
3. 让测试直接复用合同函数，避免“测试规则”和“CI 规则”各写一份后发生漂移。
4. 运行 `npm run release:verify` 与 `npm test`，确认入口合同和全量测试同时通过。

### 任务 3：把门禁接入自动 APK 流程

**文件：**

- 修改：`G:/StudyCode/个人工作台/.github/workflows/android-apk.yml`

**步骤：**

1. 在 Android 工程生成之前增加 `npm test`、`npm run release:verify` 和关键脚本 `node --check`。
2. 在 APK 构建后增加非空文件检查，避免上传一个不存在或 0 字节的 artifact。
3. 保留现有 `push main`、`workflow_dispatch` 和 `v*` 标签触发规则；不改变 Pages 的静态来源。
4. 在本地以 YAML 文本合同检查关键步骤存在，随后运行本地门禁；远端运行结果只以 GitHub Actions 实际页面/API 证据为准。

### 任务 4：本地制品与浏览器回归

**文件：**

- 检查：`G:/StudyCode/个人工作台/scripts/prepare-mobile.mjs`
- 生成并检查：`G:/StudyCode/个人工作台/dist/`（不提交）
- 检查：`G:/StudyCode/个人工作台/index.html`

**步骤：**

1. 运行 `npm test`、`node --check launcher.js`、`node --check app.js`、`node --check storage.js`、`git diff --check`。
2. 运行 `npm run release:verify` 和 `npm run android:prepare`，确认 `dist/` 包含根入口、三个工作台目录、`launcher.js`、幼儿主题图和共享素材。
3. 使用本地 HTTP 服务访问根入口和三个主题 URL，检查 HTTP 200、无资源 404、桌面三列幼儿 + 两列通用分组、移动端单列且无横向溢出。
4. 记录当前 Chrome/CDP 可用性；若 CDP 未授权，只报告本地静态与自动化证据，不把页面打开推断成浏览器验收。

### 任务 5：提交、推送和远端验收

**文件：**

- 更新：`G:/StudyCode/个人工作台/docs/00-总控/进度看板.md`
- 更新：`G:/StudyCode/个人工作台/docs/00-总控/当前状态.md`
- 创建：`G:/StudyCode/个人工作台/docs/发布/v0.5.1.md`（只有远端证据齐全后才填写“已发布”）

**步骤：**

1. 检查 `git diff`、`git status --short`，只提交本计划涉及的测试、脚本、工作流和文档。
2. 提交并推送 `main`，记录提交 SHA；推送本身不等于 Actions、Pages 或 APK 成功。
3. 读取 Actions run、artifact、Pages URL 和五个入口的 HTTP 状态；若需要登录态浏览器，使用 web-access 的 CDP 流程。
4. 下载真实 APK 后，只有在安装并完成根入口→幼儿主题→轻量练习/花园出口的设备验收后，才记录 MuMu 通过；否则保留精确阻塞原因。

## 停止条件

- 本地合同或全量测试失败时，不推送、不创建标签。
- Android SDK、Chrome CDP、GitHub Actions 或 MuMu 任一环境不可用时，继续完成可验证的本地工作，但把对应远端/设备项标为未验收，不伪造证据。
- 不把 60 日资料、首页卡片或已有测试结果表述为完整课程、完整游戏或 APK 已发布。
