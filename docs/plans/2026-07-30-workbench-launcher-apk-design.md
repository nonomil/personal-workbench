# 个人工作台启动器与 APK 发布设计

> 状态：已确认方向，2026-07-30

## 目标

让三套工作台拥有统一的启动体验：第一次打开先选择成人、儿童或幼儿版，之后记住上次选择；用户可以从右上角或设置页切换。与此同时，用 Capacitor 包装同一套网页资源，并通过 GitHub Actions 在网页端触发 Android APK 构建与 Release 发布。

## 当前事实

- 三套工作台已经是三个独立入口，业务数据分别保存在不同的 localStorage key 中。
- 根目录首页目前只展示三个链接，没有选择记忆和自动进入逻辑。
- 版本页的 `config.js` 已有工作台配置和返回根目录入口，账号页已有切换卡片，但右上角尚未提供完整的三项切换菜单。
- JSON 导入/导出已经进入成人版设置页；SQLite 文件是未来自托管服务草案；`api-adapter.js` 是可连接外部自托管 API 的前端适配器，不等于仓库内已经部署了后端；不引入 Supabase。
- 仓库当前是纯静态 Vanilla JS 项目，没有 Android 工程或 APK 构建流水线。

## 设计方案

### 1. 启动器与选择记忆

新增非业务状态键 `personal_workbench_selected_variant_v1`，只保存 `adult`、`child` 或 `preschool`。它不进入三套工作台的业务 JSON 快照，也不影响 Profile/账号同步。

- 根目录首次访问：展示三套大卡片，点击后写入选择并进入对应版本。
- 根目录再次访问：若存在合法选择，自动进入上次版本。
- 根目录使用 `?choose=1`：跳过自动进入，强制打开选择页。
- 选择页和版本页都在存储不可用时降级为正常链接，不阻塞用户进入。

### 2. 版本内切换

`config.js` 根据当前版本生成右上角“切换工作台”菜单，三个选项均是明确的 HTML 链接；点击前更新启动器记忆。这样不依赖复杂路由，也能兼容 GitHub Pages、Vercel、静态服务器和 Capacitor 本地资源。

设置页增加同一组切换卡片，并保留现有本地数据、JSON 导入/导出和自托管 API 设置。账号页已有的切换卡片继续保留，避免用户在家长管理场景中找不到入口。

### 3. Android 构建与发布

在仓库根目录加入最小 Capacitor 工程配置：

- `package.json` 管理 `@capacitor/core`、`@capacitor/cli` 和 `@capacitor/android`。
- `scripts/prepare-mobile.mjs` 生成只含运行资源的 `dist/`，`capacitor.config.json` 指向它，App ID 使用 `com.nonomil.personalworkbench`。
- Android 原生目录由 `npm run android:init` 或 GitHub Actions 的 `npx cap add android` 生成，不把生成目录强行复制进静态前端代码。
- `.github/workflows/android-apk.yml` 支持 GitHub Actions 网页手动运行，也支持推送 `v*` 标签自动构建并把可安装的 Debug APK 附加到 GitHub Release。
- Release 签名密钥不写入仓库。首版发布 Debug APK；后续如需商店生产包，再通过 GitHub Secrets 注入 keystore。

## 数据与错误边界

- 选择记忆写入失败只记录警告，继续使用普通链接。
- APK 构建失败必须在 Actions 日志中可见，不能生成“假 APK”。
- 网页、Pages 和 APK 都继续本地优先；远端同步只有在用户填写自托管 API 并登录后才发生。
- 不新增 Supabase 运行时，不把 SQLite 草案伪装成已部署数据库。

## 验证

- Node 单测覆盖选择键校验、记忆、路径和 `?choose=1` 行为。
- 工作台契约测试覆盖根入口、右上角切换菜单、设置页切换入口和 Capacitor 配置。
- 运行全部 Node 测试与顶层 JS 语法检查。
- 启动静态服务检查根入口和三个版本入口均返回 200。
- 推送后通过 GitHub Actions 网页触发一次 APK 构建，确认产物上传；Tag 构建再确认 Release 附件。
