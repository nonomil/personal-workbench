# 个人工作台启动器与 APK 发布实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 为三套工作台增加首次选择与记忆、版本内切换，并用 Capacitor + GitHub Actions 生成和发布 APK。

**架构：** 新增独立的 `launcher.js` 管理启动器偏好，不混入成人/儿童/幼儿业务快照。根入口根据偏好自动进入，版本页由 `config.js` 生成右上角切换菜单，设置页复用相同的纯链接。Android 使用 Capacitor 包装根目录静态资源，GitHub Actions 在 `main` 推送、`workflow_dispatch` 或 `v*` 标签时生成 Debug APK。

**技术栈：** Vanilla JS、浏览器 localStorage、Node `node:test`、Capacitor、Android Gradle、GitHub Actions。

---

### 任务 1：为启动器行为写失败测试

**文件：**
- 创建：`tests/launcher.test.mjs`
- 修改：无

**步骤 1：编写失败测试**

覆盖合法版本、非法值回退、记忆读取、版本路径和 `?choose=1` 强制选择。

**步骤 2：运行测试确认失败**

运行：`node --test tests/launcher.test.mjs`

预期：因 `launcher.js` 尚未存在或 API 尚未实现而失败。

### 任务 2：实现启动器状态模块

**文件：**
- 创建：`launcher.js`
- 修改：无

**步骤 1：最小实现**

提供 `KEY`、`VALID_VARIANTS`、`getSelected()`、`remember(variant)`、`getPath(variant)`、`shouldAutoRedirect(search)` 和 `redirectIfRemembered(locationLike)`；localStorage 异常时返回安全默认值。

**步骤 2：运行测试确认通过**

运行：`node --test tests/launcher.test.mjs`

预期：所有启动器测试通过。

### 任务 3：接入根目录首次选择和自动进入

**文件：**
- 修改：`index.html`
- 修改：`tests/workbench-contract.test.mjs`

**步骤 1：添加根入口脚本和选择行为**

加载 `launcher.js`。页面加载时无选择显示三张卡片；有选择且没有 `choose=1` 时跳转到上次版本；三张卡片点击时写入记忆。增加“重新选择”提示链接，指向 `?choose=1`。

**步骤 2：运行契约测试**

运行：`node --test tests/workbench-contract.test.mjs`

预期：根入口含 `launcher.js`、`?choose=1` 和三套入口契约。

### 任务 4：接入右上角和设置页切换

**文件：**
- 修改：`config.js`
- 修改：`app.js`
- 修改：`styles.css`
- 修改：`成人成长工作台/index.html`
- 修改：`儿童学习工作台/index.html`
- 修改：`preschool-workbench/index.html`
- 修改：`tests/workbench-contract.test.mjs`

**步骤 1：添加失败契约**

要求每个版本加载 `launcher.js`；`config.js` 生成三个工作台链接；设置页包含切换入口。

**步骤 2：实现最小 UI**

右上角使用原生可访问的 `details/summary` 菜单，避免额外路由状态；链接在跳转前记忆目标版本。成人设置页增加工作台选择卡，儿童/幼儿设置入口沿用各自账号/设置页语义。

**步骤 3：运行契约与完整测试**

运行：`node --test tests/workbench-contract.test.mjs` 和全部 `node --test tests/*.test.mjs`。

预期：切换菜单、设置入口和原有业务测试全部通过。

### 任务 5：加入 Capacitor 配置

**文件：**
- 创建：`package.json`
- 创建：`capacitor.config.json`
- 修改：`.gitignore`
- 修改：`README.md`
- 修改：`docs/deployment.md`

**步骤 1：配置依赖和脚本**

添加 Capacitor CLI/Core/Android 依赖、`scripts/prepare-mobile.mjs`、`android:init`、`android:sync` 和 `android:build` 脚本；将 `webDir` 设为 `dist/`，只把三套入口和运行素材包装进 APK。

**步骤 2：安装依赖并验证配置**

运行：`npm install`、`npx cap doctor` 或 `npx cap sync`。

预期：Capacitor 能读取配置；生成的 `android/`、`node_modules/` 不进入静态仓库提交。

### 任务 6：添加 GitHub Actions APK 构建

**文件：**
- 创建：`.github/workflows/android-apk.yml`

**步骤 1：编写 workflow**

使用 Node 20、Java 17，在干净 runner 中 `npm ci`、`npx cap add android`、`npx cap sync android`、Gradle `assembleDebug`；上传 artifact。推送 `v*` 标签时再把 APK 附加到 GitHub Release。

**步骤 2：静态检查 workflow**

运行：`git diff --check`，并用 `gh workflow list` 确认 workflow 被 GitHub 识别。

### 任务 7：发布前验证

**文件：**
- 修改：`CHANGELOG.md`
- 修改：`README.md`
- 修改：`docs/deployment.md`

**步骤 1：运行本地回归**

运行全部 Node 测试、JS 语法检查和静态服务 HTTP 检查。

**步骤 2：推送并触发 APK 构建**

推送 workflow 到 `main`，等待自动构建并确认 artifact；也可以使用 `gh workflow run android-apk.yml` 触发手动构建，再创建后续版本标签验证 Release 附件。

**步骤 3：提交**

```powershell
git add launcher.js index.html config.js app.js styles.css package.json capacitor.config.json .github tests docs README.md CHANGELOG.md
git commit -m "feat: add remembered workbench launcher and android build"
git push origin main
```
