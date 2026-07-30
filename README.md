# 个人工作台

一个独立的中文个人学习/成长工作台目录，内含三个可独立打开的 Vanilla JS 项目：成人成长工作台、儿童学习工作台和幼儿学习工作台。设计参考胡楚靓风格工作台案例、用户提供的小红书公开学习工作台案例和公众号教程整理而来。

当前独立项目版本：`v0.1.0`

## GitHub Pages 网站

在线网站：<https://nonomil.github.io/personal-workbench/>

- [成人成长工作台](https://nonomil.github.io/personal-workbench/成人成长工作台/)
- [儿童学习工作台](https://nonomil.github.io/personal-workbench/儿童学习工作台/)
- [幼儿学习工作台](https://nonomil.github.io/personal-workbench/幼儿学习工作台/)

GitHub Pages 使用 `main` 分支根目录作为静态站点来源，不需要构建命令。推送 HTML、CSS、JavaScript 或素材后，等待 GitHub Pages 完成部署即可。仓库设置路径：`Settings` → `Pages` → `Deploy from a branch` → `main` → `/ (root)`。

## 运行

从仓库根目录启动静态服务：

```powershell
python -m http.server 7000
```

然后打开：

- `http://127.0.0.1:7000/成人成长工作台/`
- `http://127.0.0.1:7000/儿童学习工作台/`
- `http://127.0.0.1:7000/幼儿学习工作台/`

根目录 `index.html` 保留为兼容入口。

也可以直接打开 `index.html`，但浏览器对部分本地资源和导入导出行为的限制可能更严格。

## 当前实现

- 成人版：概览、今日计划、成长任务、阅读记录、长期目标、生活分区、归档与年度统计、家庭互动、每周复盘、账号与同步、偏好设置。生活分区覆盖学习、健身、美妆护肤、理财、购物和灵感，支持习惯打卡、DDL/考试节点、备注和附件元数据。
- 儿童版：今天、成长地图、今日打卡、学习任务、错题本、语数英课程、阅读记录、成长目标、奖励中心、家长互动、成长日记、账号与同步。
- 幼儿版：少文字、大图卡、大方框导航；今天、成长、打卡、语数英课程、改错、奖励、家长和设置。成长页加入原创阳光花园、植物伙伴、入侵小怪和贴纸收藏册，完成动作会出现即时庆祝反馈。
- 儿童版完成打卡、完成学习任务、课程和首次记录阅读会获得阳光，可在奖励中心领取约定好的线下奖励；每个事件只奖励一次。
- 儿童版成长地图包含阳光、植物阶段、独角兽 XP/等级、造型解锁、连续奖励、漏打卡僵尸状态和浏览器语音夸奖开关。
- 幼儿版花园使用同一份本地成长快照，按累计阳光解锁植物伙伴，按学习/打卡/照料/奖励事件收集贴纸；未完成行动不会扣分，下一次真实行动即可驱散原创小怪。
- localStorage 本地快照（schema v5）、独立家庭互动 feed、JSON 导入导出、成人完成项自动归档、初始示例数据。
- 三个项目使用不同 localStorage key，互不污染。
- 移动端侧栏抽屉、表单校验、Toast 反馈、CSS 趋势图。
- 账号和多设备同步可接入外部自托管 API：注册、登录、家庭、孩子档案、快照恢复、上传和 revision 冲突提示均由 `api-adapter.js` 负责；凭证不进入工作台快照。
- Vercel 部署边界见 `vercel.json` 和 `docs/deployment.md`：Vercel 只部署静态前端，SQLite 与自托管 API 仍需单独部署；不重新引入 Supabase 运行时。

## 资料目录

- `docs/research.md`：调研结论与设计推断。
- `docs/sources.md`：来源、抓取时间和使用边界。
- `docs/case-study-xhs.md`：小红书案例拆解。
- `docs/data-model.md`：本地快照和实体字段。
- `docs/api-contract.md`：现有自托管账号、家庭、档案和快照 API 契约。
- `docs/deployment.md`：Vercel 静态前端与自托管后端部署说明。
- `docs/database/schema.sql`：SQLite 数据库预留草案。
- `docs/prompts/`：本地生成素材所用提示词。
- `docs/wechat-tutorials.md`：公众号文章与 WorkBuddy 教程整理。
- `docs/image-generation-tests.md`：Agnes、Bee、TokenX24 等接口测试记录。
