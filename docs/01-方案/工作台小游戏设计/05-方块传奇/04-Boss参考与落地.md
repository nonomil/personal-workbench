# 方块传奇 · Boss 参考与落地

> 核对日期：2026-08-18。参考只读，不进仓库媒体。
> HTML：`G:\UserCode\Mario_Minecraft\mario-minecraft-game_APK_V1.19.8`
> Godot：`G:\UserCode\Mario_Minecraft\mario-minecraft-game_godot_release_v141`
> 落地：`prj/games/blocklegend/data/levels.js` 的 `BOSS_KITS` + `game.js` 技能出手

不整仓搬 2D 横版。只搬 **三阶段、预警、弹幕/冲撞/召唤**，并继续吃本关英语破罩。

## 1. 参考工程怎么做 Boss

两边共用同一套 HTML 口径（`15-entities-boss-*.js`）。Godot 用 `base_boss.gd` 三阶段基类，已落地 Wither / Ghast / Blaze / Warden / Ravager；Dragon 脚本在、战役未收口。

通用规则：

- 血量到阈值换阶段（常见 60%/20% 或 70%/50%）
- 换阶段闪白、短暂无敌
- 阶段越高：更快、更密、多一种技能
- 顶部血条写阶段名；击败只触发一次

触发在马里奥是分数门槛（2000/4000/…）。方块传奇改成 **每关清波后出场**。

## 2. 统计表（HTML 基线，未乘难度）

| Boss | HP | 体型 | 阶段切 | 飞行 | 核心技能 | 奖励口径 |
| --- | --- | --- | --- | --- | --- | --- |
| 凋零 Wither | 30 | 96×96 三头黑 | 60 / 20 | 是 | 黑球 → 扇形+冲刺+护盾 → 中央追踪弹 | 钻石/药水 |
| 恶魂 Ghast | 25 | 64×64 白方体+触手 | 50 / 20 | 是 | 火球可反弹、8 字飘、受击 10 次哭泣 5 秒、后期突进 | 恶魂泪/铁 |
| 烈焰人 Blaze | 28 | 48×64 暗核+旋转棒 | 70 / 50 | 是 | 三连火球 → 火焰旋风/火环 → 召小烈焰 | 烈焰粉 |
| 凋零骷髅 | 40 | 48×96 地面 | 60 / 30 | 否 | 近战连击、格挡、跳跃、召小骷髅 | 煤/铁 |
| 监守者 Warden | 52 | 72×116 胸腔青光 | 65 / 35 | 否 | 潜行 → 砸地 → 音波/暗脉冲 | 回响碎片 |
| 掠夺兽 Ravager | 60 | 92×82 重甲冲锋 | 70 / 34 | 否 | 跟踪 → 冲撞 → 践踏/咆哮 | 盾/牛肉 |
| 末影龙 Dragon | （战役） | 头翼尾 | 三阶段 | 是 | 绕水晶回血 → 俯冲喷火 → 狂暴横扫 | 龙蛋学习 |

Godot 视觉 token（程序化，无外部贴图包）：

- Wither：T 形三头、肋骨、阶段眼色
- Ghast：方体脸切换 + 触手
- Blaze：暗核、旋转 rods、暖光
- Warden：胸腔呼吸光、头角
- Ravager：角、前冲压感
- Dragon：头 / 翼 / 尾可识别

## 3. 方块传奇怎么对上（已挂关卡）

| 关 | 气候 | bossId | 参考形态 | 英语破罩 | 3D 模型 |
| --- | --- | --- | --- | --- | --- |
| 1 | plains | wither | 凋零三阶段弹幕 | speak-break | `boss` |
| 2 | forest | mirror-fox | 狐狸冲刺（掠夺兽轻量） | direction-callout | `fox` |
| 3 | desert | key-guardian | 守卫音波 | spell-key | `guardian` |
| 4 | snow | dragon | 俯冲喷火 | action-potion | `dragon` |
| 5 | deep_dark | warden | 砸地+音波 | listen-pair | `warden` |
| 6 | nether | ghast | 火球+突进 | review-route | `ghast` |
| 7 | quarry | ravager | 冲撞+践踏 | speak-break | `ravager` |
| 8 | astral | storm | 恶魂风暴弹幕 | listen-pair | `storm` |
| 9 | ocean | key-guardian | 守卫音波 | spell-key | `guardian` |
| 10 | crystal | mirror-fox | 冲刺 | direction-callout | `fox` |
| 11 | volcano | blaze | 火球+召小火 | review-route | `blaze` |
| 12 | end | dragon | 狂暴收尾 | action-potion | `dragon` |

蓝罩期间技能变慢；乱砍/选择题仍打不穿（见 03 §8）。破罩后技能按阶段加速。

## 4. 资产（2026-08-18 已补三阶段图）

四视图仍用已有 `four-view/<id>-4view.png`。本轮补的是 **1×3 正面阶段图**：

| id | 剪影 | 阶段1 | 阶段2 | 阶段3 | 图 |
| --- | --- | --- | --- | --- | --- |
| wither | 三头 T、黑肋骨 | 白眼 | 红眼+护盾圈 | 金眼+黑弹 | `boss-phases/keyed/wither-phases.png` |
| ghast | 大方脸+须 | 闭口泪 | 开口蓄火 | 皱脸连射 | `boss-phases/keyed/ghast-phases.png` |
| blaze | 暗核+绕杆 | 慢杆 | 火环 | 分身小核 | `boss-phases/keyed/blaze-phases.png` |
| warden | 厚肢+胸光 | 青光潜行 | 砸地尘 | 音波圈 | `boss-phases/keyed/warden-phases.png` |
| ravager | 低肩巨兽 | 低头跟 | 前冲尘 | 践踏圈 | `boss-phases/keyed/ravager-phases.png` |
| dragon | 头翼尾 | 高空绕 | 俯冲 | 贴地横扫 | `boss-phases/keyed/dragon-phases.png` |
| storm | 乌云核 | 电弧疏 | 电弧密 | 落雷 | `boss-phases/keyed/storm-phases.png` |
| fox | 尖耳蓬尾 | 绕走 | 闪身 | 连扑 | `boss-phases/keyed/fox-phases.png` |
| guardian | 刺球独眼 | 眼闭 | 激光蓄 | 眼开连射 | `boss-phases/keyed/guardian-phases.png` |

过目页：`prj/games/blocklegend/review-boss-phases.html`  
发光/缩放：`L.bossFormOf` → `game.js` `applyBossForm`。未编译进 atlas（等过目）。

## 5. 本轮已接到战斗的技能

纯函数 `L.kitOf` / `L.nextBossAction` / `L.hpPhase`。`game.js` 出手：

| skill | 玩家看见 |
| --- | --- |
| `skull_shot` / `fan_shot` / `track_shot` / `fireball` / `sonic` | 从 Boss 飞来的敌弹，能躲开 |
| `charge` / `rush` / `dive` | Boss 突然加速扑近 |
| `slam` / `stomp` | 近距离额外接触伤 |
| `summon` | 阶段 3 召两只小怪一次 |
| `cry` | 恶魂挨打后短暂停手（输出窗） |

HUD `boss-phase` 写「阶段 N · 技能名」。换阶段 toast，模型略放大。

技能动画（2026-08-18）：`bossSkillFx` 按技能换弹种/圈波/冲撞姿势。凋灵黑头骨、恶魂火球、守卫音波环、劫掠兽践踏圈、龙俯冲低头。阶段越高圈更大、弹更多。

## 6. 明确不搬

- 分数触发、封闭 2D 擂台、火球近战反弹、铁傀儡召唤、DDA 伤害倍率
- Godot 场景文件、马里奥词库/村庄挑战
- 阶段图未编译进 atlas；不打 APK
