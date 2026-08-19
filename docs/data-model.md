# 数据模型

## 本地快照

存储键：

- 兼容根入口：`petbank_huchuliang_workbench_state_v1`
- 成人版：`petbank_huchuliang_adult_workbench_state_v1`
- 儿童版：`petbank_huchuliang_child_workbench_state_v1`
- 幼儿版：`petbank_huchuliang_preschool_workbench_state_v1`

当前快照 `schemaVersion` 为 `6`。v1/v2/v3/v4/v5 快照会在读取时补齐新字段，登录 session 和 API 地址永远不进入快照。幼儿版的 `preschoolTheme` 只允许 `garden-defense`、`voxel-adventure`、`platform-quest`，旧快照默认使用 `garden-defense`，不会影响任务完成状态。

```json
{
  "schemaVersion": 6,
  "profileId": "local-default",
  "revision": 1,
  "updatedAt": "2026-07-29T00:00:00.000Z",
  "preschoolTheme": "garden-defense",
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
    "pendingRewardIds": [],
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
      "defenseEnergy": 0,
      "defenseShots": 0,
      "lastDefenseDate": "",
      "feedbackPreferences": { "musicEnabled": false, "motionEnabled": true },
      "invader": { "active": false, "kind": "cloudy-bug", "defeated": 0, "health": 3, "maxHealth": 3, "wave": 0, "lastSpawnDate": "" }
    },
    "collection": { "unlockedIds": [], "claimedIds": [], "seenEventIds": [], "total": 6 },
    "achievements": { "unlocked": [], "history": [], "lastShown": "", "seen": [] },
    "streakRepair": { "cardsUsedByMonth": { "2026-08": 0 }, "repairedDates": [] },
    "worldGames": {
      "garden-defense": { "unlockedStage": 1, "clearedStages": [], "stars": {}, "bestWave": 0, "totalWins": 0, "totalDefeated": 0 },
      "voxel-adventure": { "rank": 1, "crystalsTotal": 0, "blocksBuilt": 0, "questsDone": [], "unlockedLevel": 1, "clearedLevels": [], "inventory": {} },
      "platform-quest": { "unlockedLevel": 1, "clearedLevels": [], "stars": {}, "coinsTotal": 0, "bestTime": {} },
      "meta": { "playDays": [], "weekly": {}, "milestones": [] }
    }
  },
  "courseProgress": {
    "completedLessonIds": [],
    "literacy": { "mastery": {} },
    "english": { "mastery": {} },
    "minecraft": { "mastery": {} }
  },
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
- 断连保护:`growth.streakRepair` 记录补签卡用量(`cardsUsedByMonth`,按 `YYYY-MM` 每月最多 2 张,跨月自动按月键重置)与已补日期(`repairedDates`)。`repairStreak` 只能把"昨天"补进 `checkinDates` 以恢复连续性,**不**发放当日 +10 阳光、不进 `awardedIds` 结算路径;昨天无断档或月度用尽时拒绝。
- 植物阶段由累计阳光决定；浇水每天一次，消耗 5 阳光。
- 独角兽 XP 与阳光同步增长，100 XP 升一级；等级和连续天数可解锁造型。
- 最近一次点亮不是今天时，成长地图显示僵尸入侵提示；完成今天第一项行动后驱散。
- 浏览器支持 `speechSynthesis` 且用户打开语音开关时，完成动作播放中文夸奖；语音不是业务结算依据。

## 点亮日 vs 完美日（2026-08-15，D-011）

- **点亮日**是“当天第一次有效行动已经自动沉淀”的日期口径，不是额外的手动按钮。`prj/child-growth.js` 的 `recordAction` 在有效事件首次发生且当天不在 `growth.checkinDates` 时写入本地 `YYYY-MM-DD` 日期，并追加 `daily-checkin:{date}` 的 +10 阳光事件；`checkinDates` 字段名保持不变。连续行动 `calculateStreak`、幼儿日历的点亮天数和断连提示都使用这层事实。
- **完美日**是“当天所有有日期的计划项都完成”的严格口径。`prj/preschool-achievements.js` 的 `countFullPlanDays` 先按 `dailyPlans[].date` 聚合，只有 `total > 0` 且 `done === total` 的日期计 1 天；没有计划记录时才回退到合法的 `checkinDates`，以兼容旧快照和测试夹具。地图徽章的 `stats.adventure.days`、徽章描述中的“完美日”使用此口径，不把一次点亮日冒充完美日。
- 补签只用于连续性：`streakRepair.repairedDates` 可以让缺口在展示上恢复为点亮，但 `repairStreak` 不发放当日 +10，也不进入 `awardedIds` 结算路径。
- **`totalSunlightEarned` 总账**只统计学习 `recordAction`（包括其当日首次行动 +10）、已有连续奖励 `claimStreakReward` 和游戏 `workbench-bridge.js` 的 `awardSunlight` 入账；兑换奖励只消耗 `sunlight`，不减少总账。方向 A 裁决保持向日葵旁路为花园内资源循环：`prj/preschool-garden.js` 的向日葵主动技能与防守 tick 各自只增加 `growth.sunlight` 和 `garden.growthPoints`，不写 `totalSunlightEarned`、`unicorn.xp` 或 `awardedIds`。学习路径不增加每日阳光总上限。

## 幼儿版花园与收藏

- 幼儿版继续使用同一个工作台快照，不新增 localStorage key；`garden` 和 `collection` 随 `growth` 一起导入、导出和云端快照传输。
- 幼儿版 2.0 每天默认生成六项小任务：听故事、数一数、说 Hello、画一画、动一动、整理玩具；旧的三项快照只补缺，不覆盖已有完成状态。
- 幼儿版奖励中心按“小奖励、开心奖励、亲子奖励、特别奖励”分层，奖励配置中的 `tier` 只负责展示分组，领取仍由 `claimedRewardIds` 和阳光余额幂等控制。
- 植物伙伴是原创目录：太阳芽、月光薄荷、星星花和彩虹树，按累计阳光解锁；当前伙伴只影响视觉，不另建积分账本。
- `collection.seenEventIds` 用于收藏事件去重；课程完成、打卡行动、浇水、领取奖励和连续行动可以解锁贴纸，重复点击不会重复获得。
- 漏掉一天时，花园视图显示原创“小怪入侵”；下一次真实行动会驱散小怪并记录 `garden.invader.defeated`，不扣除阳光，也不使用惩罚性积分。
- 幼儿版的庆祝浮层只展示短反馈；动画遵守 `prefers-reduced-motion`，浏览器不支持动画或语音时，核心状态仍以文字和快照为准。
- 幼儿版每个唯一学习/打卡事件最多增加 1 点 `garden.defenseEnergy`；花园防守每发射一颗豌豆消耗 1 点能量，命中会减少 `invader.health`，生命值归零后记录一次 `defenseShots` 和击退次数。
- 首页防守场是三路六列的 HTML/CSS 棋盘：每路包含植物列、四个路径格和入侵者列；发射成功后只增加短暂的豌豆飞行与命中闪光，不把动画当作业务结算依据。
- 幼儿版设置页的花园音乐使用浏览器原生 Web Audio，默认关闭且必须在用户手势后启动；`feedbackPreferences.musicEnabled` 和 `motionEnabled` 随幼儿快照保存，音频不可用不影响学习结算。

## 家庭互动

家庭 feed 单独存储在 `petbank_huchuliang_family_updates_v1`，字段为 `id`、`author`、`kind`、`body`、`date`、`createdAt`。它不会跟随成人/儿童工作台快照上传，后续如需云端家庭动态必须增加明确的后端资源和权限模型。

## 幼儿版徽章与世界游戏(2026-08-15 补记)

- `growth.achievements` 由 `preschool-achievements.js` 归一化:`unlocked`(徽章 id 列表,19 枚目录派生,总数 `BADGE_COUNT = BADGE_ORDER.length`,不硬编码)、`history`(解锁时间记录)、`seen`(已看过弹层的徽章,用于"NEW"角标)、`lastShown`。三处展示(徽章收集箱 / 成长卡 / 周报)总数口径一致。
- `growth.worldGames` 由 `games/shared/workbench-bridge.js` 管理,与三世界游戏页共用同一账本:
  - `garden-defense`:`unlockedStage / clearedStages / stars{stageId→1-3} / bestWave / totalWins / totalDefeated`;
  - `voxel-adventure`:`rank / crystalsTotal / blocksBuilt / questsDone[] / unlockedLevel / clearedLevels[] / inventory{方块kind→数量} / lastCelebratedRank`(升段仪式去重) / `homeSnapshot{date,blocks,grid[]}`(最新家园快照,`grid` 为单字符行如 `g/d/s/.` ,progress 内部字段,不是新 localStorage key),方块工坊库存也写在这里;
  - `platform-quest`:`unlockedLevel / clearedLevels / stars{levelId→1-3} / coinsTotal / bestTime{levelId→秒}`;
  - `meta`:游玩日期戳、周目标、里程碑;游戏阳光每日上限 80、单事件上限 40,由 bridge 幂等去重。
- `courseProgress` 除 `completedLessonIds` 外，各科掌握状态表实名为 `courseProgress.<subject>.mastery`（`child-courses.js` 的 `normalize`：literacy / english / pinyin / poetry / math / motion / phonics / minecraft）。每项含 `state`（introduced/practicing/ready/maintenance）、`dates`、`attempts`、`correct`、`nextReview`。英语/MC 条目另含可选 `quiz: { listen, read, spell }` 分桶（各 `attempts`/`correct`）与可选 `masteredAt`（首次 ready 的本地日期，供词汇档案曲线；老快照缺省为空）。英语/MC 条目另含可选 `events`：只追加的复习事件 `{ ts, mode, correct, source }`，每词截尾保留最近 20 条；`source` 为 `workbench` / `blocklegend` / `wordboss`。另含可选 `planVersion`（缺省按存量 v1）与 `reviewRound`。v1 间隔 `[1,3,7,14]` 天；v2（2026-08-19 起新词）`[0.25,1,2,4,7,14,28]` 天。`nextReview` 新写入为 ISO 时间戳，旧日期字符串按当日 00:00Z 解析。到期后 48 小时内不算 overdue，超时只标记不降级。答题不把存量词升级到 v2。`normalize` 与 `cloneProgress` 必须保留这些条目内键，不新开顶层 key。自评「会了」与游戏 `recordWordAnswer` 仍走 `markKnown`，一次正确即 `ready`（兼容 B3 我的词库与方块传奇回流）；`recordWordAnswer` 第三参可带 `{ source }`。客观题走 `recordQuizAnswer`：累计答对 ≥3 且覆盖 ≥2 类题型才升 `ready`。复习队列(1/3/7/14 天)从 `nextReview` 派生。blocklegend 答词经 bridge `recordWordAnswer` 回流 `minecraft.mastery`，不发阳光、不改 `growth.worldGames`。
- `mistakes` 错题本沿用现有字段（`date` / `status` / `sourceKey` / `lessonId`），并增量 `errorType`（`listen|read|spell`，老条目默认 `read`）与 `correctStreak`（专项复习连对计数，默认 0）。今日卡“复习”队列由 `date` 与当天日期派生：未 `mastered` 且恰好第 1/3/7 天入队；练对标 `mastered` 出队。不换主 key，不新增顶层 storage 字段。
- `growth.pendingRewardIds` 是幼儿版阳光商城的待家长确认列表（字符串 id）。孩子点「兑换」只写入这里，不扣阳光、不进 `claimedRewardIds`；家长长按确认后才扣阳光并核销。老快照缺该字段时归一化为 `[]`。`claimedRewardIds` 语义不变，仍表示已核销。
- `growth.pet` 由 `preschool-pet.js` 归一化，字段为 `speciesId` / `type` / `name` / `stage` / `exp` / `maxExp` / `hunger` / `lastUpdate` / `feedCount`。`speciesId` 是 PVZ/MC/闯关图鉴 id（如 `pvz-sunflower`、`mc-slime`、`mc-spider`）；老快照只有 `type` 时映射到主题默认蛋。我的世界工作台蛋巢只列出 `series=mc`。喂食仍扣既有阳光，不新开 localStorage key，不引入第二套积分。

## 约束

- 日期身份使用 `YYYY-MM-DD` 本地日历日期；审计时间使用 ISO 时间戳。
- 所有记录使用稳定 ID，不能用标题作为跨表主键。
- 进度范围为 0-100；分钟和页数必须为非负数。
- 导入数据必须通过 schema 校验后才能替换当前快照。
- 成人版与儿童版是两个独立入口，共享代码引擎但使用不同业务 key；两者均不加入主站 Profile 快照。
- 成人版 `adult` 命名空间用于 Life OS 生活分区、习惯、DDL/考试节点、归档和语言偏好；附件只保存名称、类型和大小元数据，原文件不进入 localStorage。
- 幼儿版是第三个独立入口，使用 `petbank_huchuliang_preschool_workbench_state_v1`，共享成长/课程/奖励引擎但采用更短文案和图卡式页面；同样不加入主站 Profile 快照。
- 幼儿版花园和收藏字段由 `preschool-garden.js` 归一化，旧快照缺少这些字段时自动补默认值；旧 `zombie` 字段仍可读，不做破坏性迁移。
