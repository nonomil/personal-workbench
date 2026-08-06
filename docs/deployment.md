# 部署说明

## 部署边界

个人工作台是 Vanilla JS 静态前端，适合部署到 Vercel。账号、家庭、孩子档案、JWT 和 SQLite 快照通过外部自托管 API 服务提供；本仓库不包含后端数据库。

Vercel 不承载：

- SQLite 数据库和备份；
- JWT secret、refresh token 或 `.env`；
- 浏览器 profile、测试制品和 `tmp/`。

## Vercel 静态前端

在 Vercel 项目设置中把 Root Directory 保持为仓库根目录，Framework Preset 选择 Other，不配置构建命令和输出目录。仓库内的 `vercel.json` 只设置静态安全响应头和目录入口行为。

本地验证：

```powershell
python -m http.server 7000
```

打开：

- `http://127.0.0.1:7000/成人成长工作台/`
- `http://127.0.0.1:7000/儿童学习工作台/`
- `http://127.0.0.1:7000/preschool-workbench/`

## GitHub Pages

仓库已配置为使用 `main` 分支根目录发布静态网站，在线地址为：

- `https://nonomil.github.io/personal-workbench/`
- `https://nonomil.github.io/personal-workbench/成人成长工作台/`
- `https://nonomil.github.io/personal-workbench/儿童学习工作台/`
- `https://nonomil.github.io/personal-workbench/preschool-workbench/`

不需要构建命令或输出目录。修改后推送到 `main`，等待 Pages 部署完成即可。GitHub 仓库设置为 `Settings` → `Pages` → `Deploy from a branch` → `main` → `/ (root)`。

## Android APK

Android 版本使用 Capacitor 包装由 `scripts/prepare-mobile.mjs` 生成的 `dist/` 静态资源，网页和 APK 共用同一套 HTML、CSS、JavaScript 和素材。`dist/` 只包含运行需要的网页、三个入口和素材，不把 `docs/`、测试或依赖目录打进 APK。仓库不提交生成的 `dist/` 和 `android/` 目录，CI 每次重新生成。

GitHub Actions workflow 位于 `.github/workflows/android-apk.yml`：

- 推送到 `main` 自动运行 `Build Android APK`，构建结果会上传为 artifact；也可以在 Actions 页面手动运行；
- Android 工程生成前会先运行 `npm test`、`npm run release:verify` 和关键 JavaScript 语法检查；构建后还会拒绝 0 字节或缺失的 APK；
- 推送 `v*` 标签时自动构建，并把 Debug APK 附加到 GitHub Release；
- 首版产物是可安装的 Debug APK，不包含生产签名；生产签名必须使用 GitHub Secrets 注入 keystore，不能提交到仓库。

本地构建环境要求 Node.js 22、Java 21 和 Android SDK：

```powershell
npm install
npm run android:init
npm run android:build
```

`android:init` 会先生成被 `.gitignore` 忽略的 `dist/`，再生成被忽略的 `android/` 目录。网页端仍然可以在没有 Android 环境时正常运行，APK 构建失败也不会影响 GitHub Pages 网站。

## 自托管 API

在独立部署的自托管 API 服务中配置数据目录、JWT secret、注册策略和允许的前端 origin。生产 CORS 配置必须填写实际 Vercel 前端 origin，例如 `https://your-workbench.vercel.app`，不能写 `*`。

后端完成健康检查后，在工作台“账号与同步”页面填写完整 API 地址，例如 `https://sync.example.com`，再注册或登录。首次使用需要：

1. 创建家庭；
2. 创建一个工作台档案，并绑定当前本地 profile；
3. 点击“上传当前快照”；
4. 在另一台设备登录同一账号，选择同名档案后点击“从云端恢复”。

同步是手动的本地优先流程。上传遇到 `SNAPSHOT_REVISION_CONFLICT` 时，不自动覆盖任何一侧数据；先恢复远端快照，再继续本地操作。

## 发布前检查

```powershell
npm test
npm run release:verify
node --check launcher.js
node --check app.js
node --check storage.js
npm run android:prepare
```

`release:verify` 是无网络的五入口合同检查：确认幼儿三主题在前、成人/儿童在后，并确认五张入口卡的目标页面与主图都存在。上述本地检查通过，只能证明源码和待包装制品满足门禁；GitHub Pages、Actions artifact、APK 安装和 MuMu 仍必须用远端/设备证据单独核对。

浏览器检查至少覆盖成人、儿童和幼儿三个入口、移动端侧栏、幼儿大图卡导航、成长、课程完成、错题记录、家庭互动和账号页。不要把真实 API 地址、账号、密码或 token 写进仓库文件。
