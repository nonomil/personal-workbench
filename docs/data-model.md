# 数据模型

## 本地快照

存储键：

- 兼容根入口：`petbank_huchuliang_workbench_state_v1`
- 成人版：`petbank_huchuliang_adult_workbench_state_v1`
- 儿童版：`petbank_huchuliang_child_workbench_state_v1`
- 幼儿版：`petbank_huchuliang_preschool_workbench_state_v1`

当前快照 `schemaVersion` 为 `5`。v1/v2/v3/v4 快照会在读取时补齐新字段，登录 session 和 API 地址永远不进入快照。

```json
{
  "schemaVersion": 5,
  "profileId": "local-default",
  "revision": 1,
  "updatedAt": "2026-07-29T00:00:00.000Z",
  "tasks": [],
  "dailyPlans": [],
  "readingLogs": [],
  "focusSessions": [],
  "goals": [],
  "reviews": [],
  "mistakes": [],
  "growth": {
    "sunlight": 0,
    "totalSunlightEarned": 0,
    "awardedIds": [],
    "claimedRewardIds": [],
    "checkinDates": [],
    "claimedStreakRewardIds": [],
    "voiceEnabled": false,
    "plant": { "stage": 0, "waterCount": 0, "lastWateredDate": "" },
    "unicorn": { "name": "星芒", "xp": 0, "level": 1, "activeStyleId": "style-classic", "unlockedStyleIds": ["style-classic"] },
    "zombie": { "active": false, "defeated": 0, "lastSpawnDate": "" },
    "garden": {
      "activePlantId": "plant-sun-sprout",
      "unlockedPlantIds": ["plant-sun-sprout"],
      "growthPoints": 0,
      "invader": { "active": false, "kind": "cloudy-bug", "defeated": 0, "lastSpawnDate": "" }
    },
    "collection": { "unlockedIds": [], "claimedIds": [], "seenEventIds": [], "total": 6 }
  },
  "courseProgress": { "completedLessonIds": [] },
  "adult": {
    "language": "zh-CN",
    "lifeEntries": [
      { "id": "life-1", "area": "学习", "title": "整理学习材料", "note": "", "status": "active", "date": "2026-07-30", "attachments": [] }
    ],
    "habits": [
      { "id": "habit-1", "title": "晨间阅读 20 分钟", "area": "学习", "cadence": "daily", "checkedDates": [] }
    ],
    "milestones": [
      { "id": "milestone-1", "title": "项目阶段稿提交", "kind": "ddl", "area": "学习", "date": "2026-08-01", "note": "" }
    ],
    "archive": [
      { "id": "archive-1", "sourceType": "task", "sourceId": "task-1", "title": "已完成事项", "category": "学习", "completedAt": "2026-07-30", "archivedAt": "2026-07-30T00:00:00.000Z" }
    ]
  }
}
```

## 儿童成长规则

- 计划、学习任务、课程和首次阅读记录分别使用稳定事件 ID发放阳光；重复事件不会重复奖励。
- 当天第一次有效行动额外增加 10 阳光并记录 `checkinDates`，连续天数按本地 `YYYY-MM-DD` 计算。
- 植物阶段由累计阳光决定；浇水每天一次，消耗 5 阳光。
- 独角兽 XP 与阳光同步增长，100 XP 升一级；等级和连续天数可解锁造型。
- 最近一次打卡不是今天时，成长地图显示僵尸入侵提示；完成今天第一项行动后驱散。
- 浏览器支持 `speechSynthesis` 且用户打开语音开关时，完成动作播放中文夸奖；语音不是业务结算依据。

## 幼儿版花园与收藏

- 幼儿版继续使用同一个工作台快照，不新增 localStorage key；`garden` 和 `collection` 随 `growth` 一起导入、导出和云端快照传输。
- 植物伙伴是原创目录：太阳芽、月光薄荷、星星花和彩虹树，按累计阳光解锁；当前伙伴只影响视觉，不另建积分账本。
- `collection.seenEventIds` 用于收藏事件去重；课程完成、打卡行动、浇水、领取奖励和连续行动可以解锁贴纸，重复点击不会重复获得。
- 漏掉一天时，花园视图显示原创“小怪入侵”；下一次真实行动会驱散小怪并记录 `garden.invader.defeated`，不扣除阳光，也不使用惩罚性积分。
- 幼儿版的庆祝浮层只展示短反馈；动画遵守 `prefers-reduced-motion`，浏览器不支持动画或语音时，核心状态仍以文字和快照为准。

## 家庭互动

家庭 feed 单独存储在 `petbank_huchuliang_family_updates_v1`，字段为 `id`、`author`、`kind`、`body`、`date`、`createdAt`。它不会跟随成人/儿童工作台快照上传，后续如需云端家庭动态必须增加明确的后端资源和权限模型。

## 约束

- 日期身份使用 `YYYY-MM-DD` 本地日历日期；审计时间使用 ISO 时间戳。
- 所有记录使用稳定 ID，不能用标题作为跨表主键。
- 进度范围为 0-100；分钟和页数必须为非负数。
- 导入数据必须通过 schema 校验后才能替换当前快照。
- 成人版与儿童版是两个独立入口，共享代码引擎但使用不同业务 key；两者均不加入主站 Profile 快照。
- 成人版 `adult` 命名空间用于 Life OS 生活分区、习惯、DDL/考试节点、归档和语言偏好；附件只保存名称、类型和大小元数据，原文件不进入 localStorage。
- 幼儿版是第三个独立入口，使用 `petbank_huchuliang_preschool_workbench_state_v1`，共享成长/课程/奖励引擎但采用更短文案和图卡式页面；同样不加入主站 Profile 快照。
- 幼儿版花园和收藏字段由 `preschool-garden.js` 归一化，旧快照缺少这些字段时自动补默认值；旧 `zombie` 字段仍可读，不做破坏性迁移。
