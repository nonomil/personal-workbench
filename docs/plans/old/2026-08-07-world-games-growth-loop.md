# 三世界成长型游戏 · 与幼儿工作台积分打通

## 积分制度（已打开）

| 货币 | 存储 | 来源 |
|------|------|------|
| 阳光 `growth.sunlight` | 幼儿快照 | 学习任务 + **游戏通关/任务** |
| 累计 `totalSunlightEarned` | 同上 | 只增不减（发奖时） |
| 星芒 XP / 等级 | `growth.unicorn` | 与阳光同步增加 |
| 豌豆能量 | `growth.garden.defenseEnergy` | 任务 + 花园通关可 +1 |
| 游戏进度 | `growth.worldGames.<id>` | 关卡/任务/星星 |

桥接模块：`prj/games/shared/workbench-bridge.js`  
- 每日游戏阳光上限：**80**  
- 事件 id 去重，避免刷分  

## 三游戏成长环

### 花园保卫 `games/garden-defense/`
- **12 关** `data/stages.js`
- 通关解锁下一关 + 植物
- 1–3 星（通关 / 未漏怪 / 速通）
- 奖励阳光写回工作台

### 方块世界 `games/voxel-adventure/`
- **12 个生涯任务** + **每日挑战**（按日期轮换）`data/quests.js`
- 矿工等级 1–5
- 建造/采集进度 → 阳光

### 横版闯关 `games/platform-quest/`
- **10 关** `data/levels.js`
- 星星（全金币 / 时限）
- 动作 idle/run/jump

## 文件夹约定

```text
prj/games/
  shared/           # 积分桥 + 共用 HUD CSS
  garden-defense/   # 独立世界
    data/ assets/ index.html game.js game.css
  voxel-adventure/
  platform-quest/
```

## 与学习闭环

工作台任务 → 阳光/能量 → 游戏里消费种植/推进  
游戏通关 → 额外阳光（有上限）→ 奖励商城/星芒升级  

## 首页进度（2026-08-07）

`renderPreschoolHomeWorldProgress()` 显示：

- 今日游戏阳光 `earned / 80`（读 `awardedIds` 中 `game-sun:日期:` 前缀）
- 三世界进度条：通关关数 / 任务数 / 解锁进度
- 「进入」按钮：`open-world-game` + `data-theme-id` 直达对应独立页

样式：`prj/css/preschool/28-world-progress.css`  
---