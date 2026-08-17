# 个人工作台

一个独立的中文个人学习/成长工作台目录，内含三套可独立打开的 Vanilla JS 工作台：成人成长工作台、儿童学习工作台和阳光成长工作台。根入口额外提供五个选择入口：上方三个幼儿游戏世界（植物大战僵尸式花园、我的世界式方块探险、马里奥式横版闯关），下方两个通用工作台（成人、少儿）。设计参考胡楚靓风格工作台案例、用户提供的小红书公开学习工作台案例和公众号教程整理而来。

当前源码发布候选：`v0.7.2`。

- [v0.7.2 发布说明](docs/04-发布/v0.7.2.md)
- [v0.7.1 发布说明](docs/04-发布/v0.7.1.md)
- [v0.7.0 发布说明](docs/04-发布/v0.7.0.md)
- [v0.6.0 发布说明](docs/04-发布/v0.6.0.md)
- [v0.5.2 发布说明](docs/04-发布/v0.5.2.md)

## GitHub Pages 网站

在线网站：<https://nonomil.github.io/personal-workbench/>

- [成人成长工作台](https://nonomil.github.io/personal-workbench/prj/成人成长工作台/)
- [儿童学习工作台](https://nonomil.github.io/personal-workbench/prj/儿童学习工作台/)
- [阳光成长工作台](https://nonomil.github.io/personal-workbench/prj/preschool-workbench/)

产品运行时集中在 `prj/`（入口、工作台、CSS、素材、小游戏、资料包）。仓库根只保留工具链配置（`package.json`、`scripts/`、`tests/`、`docs/` 等）与薄跳转 `index.html` → `prj/`。GitHub Pages 仍用 `main` 根目录；打开站点会跳到 `prj/`。仓库设置：`Settings` → `Pages` → `Deploy from a branch` → `main` → `/ (root)`。

## Android APK

网页和 APK 共用同一套 Vanilla JS 资源，Android 端通过 Capacitor 包装，不维护第二套页面代码。

- [Actions 构建页面](https://github.com/nonomil/personal-workbench/actions/workflows/android-apk.yml)：推送 `main` 会自动编译并上传 APK artifact，也可以点击 `Run workflow` 手动编译。
- 推送 `v*` 标签会自动构建，并把 Debug APK 附加到对应 GitHub Release。
- 构建产物是可安装的 Debug APK；正式商店包需要后续通过 GitHub Secrets 配置 Android 签名密钥。

本地构建需要 Node.js 22、Java 21 和 Android SDK：

```powershell
npm install
npm run android:init
npm run android:build
```

构建流程和部署边界见 `docs/deployment.md` 与 `.github/workflows/android-apk.yml`。

## 运行

从仓库根目录启动静态服务：

```powershell
python -m http.server 7000
```

然后打开：

- `http://127.0.0.1:7000/prj/`
- `http://127.0.0.1:7000/prj/成人成长工作台/`
- `http://127.0.0.1:7000/prj/儿童学习工作台/`
- `http://127.0.0.1:7000/prj/preschool-workbench/`

仓库根 `index.html` 会跳转到 `prj/`。也可以直接打开 `prj/index.html`。

## 当前实现

- 成人版：概览、今日计划、成长任务、阅读记录、长期目标、生活分区、归档与年度统计、家庭互动、每周复盘、账号与同步、偏好设置。生活分区覆盖学习、健身、美妆护肤、理财、购物和灵感，支持习惯打卡、DDL/考试节点、备注和附件元数据。
- 儿童版：今天、成长地图、今日打卡、学习任务、错题本、语数英课程、阅读记录、成长目标、奖励中心、家长互动、成长日记、账号与同步。
- 阳光成长工作台：少文字、大图卡、大方框导航；工作台首页聚焦今日打卡、阳光/豌豆能量和去游戏/领奖励出口。独立的“花园保卫战”小游戏提供植物选择、5 路 6 列棋盘、三类僵尸、自动行动和刷新后可恢复的本地游戏状态；课程、改错、奖励、家长和设置仍保留在各自页面。
- 儿童版完成打卡、完成学习任务、课程和首次记录阅读会获得阳光，可在奖励中心领取约定好的线下奖励；每个事件只奖励一次。
- 儿童版成长地图包含阳光、植物阶段、独角兽 XP/等级、造型解锁、连续奖励、漏打卡僵尸状态和浏览器语音夸奖开关。
- 幼儿版花园使用同一份本地成长快照，按累计阳光解锁植物伙伴，按学习/打卡/照料/奖励事件收集贴纸；防守能量、入侵者生命值、波次和击退次数可导入导出，未完成行动不会扣分。
- localStorage 本地快照（schema v6）、独立家庭互动 feed、JSON 导入导出、成人完成项自动归档、初始示例数据。
- 三个项目使用不同 localStorage key，互不污染。
- 成人/儿童版移动端侧栏抽屉、幼儿版参考帧固定路线栏、表单校验、Toast 反馈、CSS 趋势图。
- 账号和多设备同步可接入外部自托管 API：注册、登录、家庭、孩子档案、快照恢复、上传和 revision 冲突提示均由 `api-adapter.js` 负责；凭证不进入工作台快照。
- Vercel 部署边界见 `vercel.json` 和 `docs/deployment.md`：Vercel 只部署静态前端，SQLite 与自托管 API 仍需单独部署；不重新引入 Supabase 运行时。

## 资料目录

- `docs/03-研究与参考/幼儿学习工作台研究/`：本地资料分析、Tavily/Firecrawl 原始证据、外部来源和许可证清单。
- `docs/02-课程/幼儿课程方案/`：幼儿版总方案、六学科分方案、自然拼读 60 日路线、成长游戏、资料授权和实施验收。
- `docs/research.md`：调研结论与设计推断。
- `docs/sources.md`：来源、抓取时间和使用边界。
- `docs/case-study-xhs.md`：小红书案例拆解。
- `docs/data-model.md`：本地快照和实体字段。
- `docs/api-contract.md`：现有自托管账号、家庭、档案和快照 API 契约。
- `docs/deployment.md`：Vercel 静态前端与自托管后端部署说明。
- `docs/database/schema.sql`：SQLite 数据库预留草案。
- `docs/99-归档/prompts/`：本地生成素材所用提示词。
- `docs/wechat-tutorials.md`：公众号文章与 WorkBuddy 教程整理。
- `docs/image-generation-tests.md`：Agnes、Bee、TokenX24 等接口测试记录。
