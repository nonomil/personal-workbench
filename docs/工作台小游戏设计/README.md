# 工作台小游戏 · 落地改造方案

> 对照 `DS设计--工作台小游戏设计方案--DS.md`、开源仓库实查，以及当前 `prj/games/` 代码。  
> **结论先说：改参考项目的玩法循环，接到现有工作台；不要整仓 fork，也不要从零再造一套引擎。**

## 第一性原理裁决

可见结果只有一件：孩子打开独立游戏页，**3–5 分钟能玩完一局**，通关阳光写回 `petbank_huchuliang_preschool_workbench_state_v1`。

真实消费者路径已经存在：

| 世界 | 入口 | 账本 |
|---|---|---|
| 花园 | `prj/games/garden-defense/index.html` | `growth.worldGames.garden-defense` + `growth.sunlight` |
| 方块 | `prj/games/voxel-adventure/index.html` | `growth.worldGames.voxel-adventure` |
| 横版 | `prj/games/platform-quest/index.html` | `growth.worldGames.platform-quest` |

桥：`prj/games/shared/workbench-bridge.js`（每日游戏阳光上限 80，事件去重）。

DS 文「fork 仓库 → 5–8 小时嵌进工作台」在本仓不成立：

1. **轮子已经有一半。** 花园自动塔防在 `prj/preschool-garden.js` 的 `tickDefense` / `spawnDefenseWave`；工作台 `#battle` 仍在跑。独立页却改成「点召唤 → 点技能 → 数击退」，这是倒退，不是缺轮子。
2. **整仓 fork 会造第二套账本。** 第三方 `index.html` 自带阳光、存档、菜单。嵌 iframe 会拆开工作台阳光，违反「一份账本」。
3. **协议不等于可以抄图。** MIT 只管代码。PopCap / Nintendo / Mojang 贴图、关卡、音效不能进本仓。`yangyunhe369`、`Azure12355`、`FullScreenMario`、`evilgaoshu/PvZ`（Phaser + 原作资源）一律跳过。
4. **DS 的游戏券不存在。** 本仓用学习阳光买植物、游戏通关再发有上限的阳光。不要新造券系统。

正确改造公式：

```text
参考项目：只抽循环（种/挖/跳、碰撞、波次、过关判定）
本仓：目录、素材、bridge、localStorage key、测试 一律不动键名
结果：看起来像成长短局，不是商业游戏翻版
```

## 三份落地文档

| 文档 | 世界 | 抽什么 | 不抽什么 |
|---|---|---|---|
| [01-花园保卫-落地改造方案.md](./01-花园保卫-落地改造方案.md) | 花园 | 自动打、僵尸走路、短波次 | 原版精灵、Phaser、点技能 RPG |
| [02-方块世界-落地改造方案.md](./02-方块世界-落地改造方案.md) | 方块 | 点挖、背包、点放 | 完整 MC、三人服务器、史蒂夫横版冒充方块 |
| [03-横版闯关-落地改造方案.md](./03-横版闯关-落地改造方案.md) | 横版 | 重力、土狼跳、tilemap | 马里奥贴图、32 关原版、Vite/ECS 整站 |

历史草稿保留：`DS设计--工作台小游戏设计方案--DS.md`（调研线索有用，工时与 fork 步骤不可执行）。

## 实施顺序

1. **花园**（用户已感到关卡怪；规则层已绿）
2. **方块**（`data/quests.js` 是挖放任务，`game.js` 却是横版，身份错了）
3. **横版**（循环基本对，补物理手感与短局过关）

未改代码前，本目录只产出方案。下一刀代码从花园文档的任务 1 开始。
