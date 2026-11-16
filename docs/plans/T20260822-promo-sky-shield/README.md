# T20260822-promo-sky-shield：宣传片天空破盾课

> 状态：**in-progress**（T01–T06 代码已落地，自动化 28/28 绿。手玩 B1–B10 未勾。不标 accepted）。
> 2026-08-23 核查：T01–T06 代码在独立仓 `G:\StudyCode\blocklegend` 全部接线（`data/sky-shield.js`、第 6/12 关 `skyShield` 开关、破盾 HUD、火球 toast、语音三路 `noteSkyShieldWord`），随 0.9.5 提交，独立仓 `node --test` 167/167、工作台镜像 163/163。手玩 B1–B10 仍待勾。
> 源头：`docs/01-方案/工作台小游戏设计/05-方块传奇/11-宣传片天空破盾对照与落地.md`
> 核心一句话：**借宣传片的红罩 + 10 词泡 + 念对 5 破盾，接到第 6/12 关；不搬 RPG HUD，不新开货币/词库/龙。**

## 给执行者

必需按序：做完 T0n 的自动化 + 该夹 `acceptance.md` 再开 T0n+1。每期同步独立仓 `G:\StudyCode\blocklegend` 与工作台 `prj/games/blocklegend`。工作台 `index.html` 只碾 `?v=`，**不要**改 `../shared/` 和 `../../preschool-*.js`。

TDD：先红后绿。技能：`测试驱动开发`、`完成前验证`。

## 文档导航

| 文件 | 用途 |
| --- | --- |
| [`requirements-checklist.md`](./requirements-checklist.md) | 借 / 不借裁决 |
| [`acceptance.md`](./acceptance.md) | 整包手玩清单 |
| [T01](./T01-bubble-rules/) … [T06](./T06-handplay-sync/) | 一期一个文件夹 |

## 分期

| 期 | 文件夹 | 内容 | 门控 |
| --- | --- | --- | --- |
| T01 | [`T01-bubble-rules`](./T01-bubble-rules/) | 10 泡、任意念、5 破盾纯函数 | 无 |
| T02 | [`T02-fireball-toast`](./T02-fireball-toast/) | 火球走现伤害 + toast | T01 |
| T03 | [`T03-boss-hud`](./T03-boss-hud/) | 破盾条 0/5 + 关卡倒计时 | T01 |
| T04 | [`T04-red-shield-vfx`](./T04-red-shield-vfx/) | 红球 + 白词泡，不新 GLB | T01 |
| T05 | [`T05-level-wire`](./T05-level-wire/) | 接到第 6 关；第 12 关复用 | T01–T04 |
| T06 | [`T06-handplay-sync`](./T06-handplay-sync/) | 手玩 + 双仓 + cache | T05 |

## 刻意不做

第二货币、Lv.26 / 成长 / 饱食 / 完全体、技能栏、急速常驻钮、下马改 G、宣传片 4326 词、3:52 计时、火球固定 −10、第 13 关、第二条龙、新堡垒 GLB。依据见 11 文档 §5。
