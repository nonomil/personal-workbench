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
- `http://127.0.0.1:7000/幼儿学习工作台/`

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
node --test (Get-ChildItem -LiteralPath 'tests' -Filter '*.test.mjs').FullName
node --check 'app.js'
node --check 'api-adapter.js'
```

浏览器检查至少覆盖成人、儿童和幼儿三个入口、移动端侧栏、幼儿大图卡导航、成长、课程完成、错题记录、家庭互动和账号页。不要把真实 API 地址、账号、密码或 token 写进仓库文件。
