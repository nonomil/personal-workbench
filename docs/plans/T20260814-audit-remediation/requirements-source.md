# T20260814 — 需求来源

## 来源 A：设计文档裁决（必须遵守）

| 来源 | 条款 | 关键句 |
|---|---|---|
| `docs/工作台小游戏设计/02-方块世界-落地改造方案.md` §6 任务1 | voxel 页文案改口 | 「把 voxel 脚本合同从 `jump\|crystal\|enemy\|steve` 改为必须出现 `quest\|inventory\|breakBlock\|placeBlock`，且 `index.html` 不再以『冲旗』为主提示」 |
| 同上 §7 版权 | 对外名称 | 「对外名称『方块世界』，不使用 Minecraft 商标」 |
| `docs/工作台小游戏设计/03-横版闯关-落地改造方案.md` §7 版权 | 对外名称 | 「对外『横版闯关 / 彩虹闯关』，不出现 Mario、Luigi、问号砖作为可玩商标」 |
| `docs/工作台小游戏设计/README.md` 第一性原理 §3 | 版权边界 | 「MIT 只管代码。PopCap / Nintendo / Mojang 贴图、关卡、音效不能进本仓」 |
| `docs/徽章系统/DS--徽章系统设计.md` 问题6 | 真机验收 | 17 项验收清单（花园 3 / 地图 3 / 建造 3 / 三域 2 / UI 交互 6） |
| `docs/优化方案2/幼小衔接工作台-方案文档/06-计划与验收/01-落地对照与缺口.md` | P0 原则 | 「主题切换无叠层」「做完一定有阳光且不重复刷」——本包不改这两条，仅作回归护栏 |

## 来源 B：2026-08-14 审查发现（代码现状证据）

| # | 发现 | 证据 |
|---|---|---|
| B1 | voxel 静态文案仍横版 | `prj/games/voxel-adventure/index.html:16`「横版过关 · 走到出口」、`:40`「点击挖矿 \| 右键/长按放置 \| 走到出口」、`:48` footer「WASD 移动 \| 空格跳跃 \| … \| 走到出口」、`:51`「关卡」 |
| B2 | voxel 运行时已是 quest 驱动 | `game.js` 49 处 quest 引用、`game.js:271` `worldApi.minerRank(progress.questsDone, questsApi.ranks)`、`data/world.js` 与 `data/quests.js` 存在、0 处 steve 引用 |
| B3 | 启动器商标词 | `prj/index.html:158-159`「我的世界式」（alt + h2）、`:162-163`「马里奥式」（alt + h2）、`:192-193` 主题标题映射 |
| B4 | 未引用第三方特征素材 | `voxel-adventure/assets/hero/steve-idle.png`、`steve-run.png`（含 keyed 各 1）；`voxel-adventure/assets/enemies/creeper.png`（含 keyed）；`platform-quest/assets/hero/mario-idle/jump/run.png`（含 keyed 各 3）。全仓 grep 仅 `physics.js:4` 一行公式出处注释（正常署名，保留） |
| B5 | 文档过时：笔顺 | `docs/学习项目设计/2026-08-14-学习项目设计-落地分析.md` §1 写「165 字笔顺按未实现处理」，实际 `prj/preschool-literacy-strokes-data.js` 已有 165 字（yxj-workbench / Make Me a Hanzi 兼容子集，247KB） |
| B6 | 文档冲突：券 | `02-徽章与券.md` 建议券系统；`工作台小游戏设计/README.md` 裁决「DS 的游戏券不存在，本仓用学习阳光」。代码跟随后者（`workbench-bridge.js:19` 日上限 80，无券） |

## 来源 C：全局规则

- 用户全局 CLAUDE.md：涉及删除操作必须先告知，由用户决定 → S2 门控。
