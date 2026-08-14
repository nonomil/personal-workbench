# 三世界长期成长（简化合入）

## 调研结论（X + 行业）

| 外部常见做法 | 我们的简化 |
|--------------|------------|
| 习惯绑定日常 routine | 游玩打卡与学习日同一日历，首页可见 |
| 每日微循环 / daily attempts | 每世界每日 1 戳；三戳=三界同日奖 |
| 短中长目标 | 当日戳 → 周游玩天数/三界日 → 里程碑徽章 |
| Meta 反哺核心 | 冒险等级 → 花园开局阳光、横版金币、晶体加成 |
| 避免重度 gacha | 无抽卡；固定里程碑 + 阳光上限 |

## 数据

`growth.worldGames.meta`：

- `adventurePoints` / `adventureLevel` / `playDates` / `playByDay`
- `badges[]` / `weekly{ weekStart, playedDays, ... }`

## API（bridge）

- `recordPlaySession(gameId)` — 打开世界时
- `grantProgressPoints(gameId, n)` — 通关/任务时
- `getMetaSummary()` — 首页与调试
- `getMetaBonuses()` — 游戏内加成

## 冒险等级 1–7

萌芽旅人 → … → 传说冒险家（见 `ADVENTURE_RANKS`）

## 里程碑示例

三关守卫、八关防线、矿工新手、彩虹终点、七日冒险、三界同日…

## 本周冒险报告（家长页）

- API：`WorkbenchGameBridge.getWeeklyReport()`
- 成长页：`renderPreschoolWeeklyAdventureReport({ forParent: false })`
- 家长互动页：`forParent: true`（文案偏家长）
- 内容：本周 7 日游玩点阵、三世界进度、游戏阳光、徽章、下一步建议
---