# 自托管 API 契约

工作台前端通过 `api-adapter.js` 连接外部自托管 API。未填写 API 地址或网络不可用时，页面继续使用本地模式。

## 连接与认证

前端保存的 API 地址和登录 session 使用独立 localStorage key：

- `petbank_huchuliang_{variant}_workbench_account_settings_v1`
- `petbank_huchuliang_{variant}_workbench_account_session_v1`

它们不属于工作台业务快照，不能导出到 `petbank_huchuliang_*_workbench_state_v1`。

使用的接口：

- `POST /api/v1/auth/register`：`username`、`password`、`displayName`
- `POST /api/v1/auth/login`：`username`、`password`
- `POST /api/v1/auth/refresh`：`refreshToken`
- `POST /api/v1/auth/logout`：`refreshToken`
- `GET /api/v1/auth/me`

访问需要 `Authorization: Bearer <accessToken>`。access token 失效时适配器会尝试一次 refresh；refresh 失败则清除本地 session，但不删除业务快照。

## 家庭与档案

- `GET /api/v1/households`
- `POST /api/v1/households`：`{ "name": "星芒家庭" }`
- `GET /api/v1/children`
- `POST /api/v1/children`：`{ "householdId": "...", "name": "小星", "localProfileId": "local-default" }`
- `GET /api/v1/households/{id}/members`
- `POST /api/v1/households/{id}/invites`
- `POST /api/v1/household-invites/redeem`：`{ "code": "..." }`

一个工作台档案映射到一个后端 child 记录。成人版也沿用这条档案接口，以便同一自托管家庭服务管理不同类型工作台。

## 快照同步

读取：

`GET /api/v1/children/{childId}/snapshots/latest`

写入：

`POST /api/v1/children/{childId}/snapshots`

```json
{
  "revision": 7,
  "payload": {
    "schemaVersion": 6,
    "profileId": "local-default",
    "preschoolTheme": "garden-defense",
    "tasks": [],
    "mistakes": [],
    "growth": {},
    "courseProgress": { "completedLessonIds": [] },
    "adult": {
      "language": "zh-CN",
      "lifeEntries": [],
      "habits": [],
      "milestones": [],
      "archive": []
    }
  }
}
```

服务端只接受严格递增的 revision。返回 `409` 且错误码为 `SNAPSHOT_REVISION_CONFLICT` 时，前端保留本地数据并提示先拉取云端快照；当前不会自动做字段级合并。

## 部署边界

Vercel 只托管本仓库的静态前端。后端、SQLite、JWT secret 和 CORS allowed origin 在独立自托管服务中部署。生产环境不能把数据库、`.env`、refresh token 或浏览器 profile 放进 Vercel 制品。
