# Test Report — T20260815-B1

> 执行时逐阶段回写。未执行的阶段保持"未开始"，不预填结论。

## 阶段 0：现状侦查

- 状态：**完成（2026-08-15，基线 commit `ebc5592` 之后侦查）**
- refresh 测试改前状态（红/绿 + 失败清单）：**52/52 通过（退出码 0），无 `course-directory` 残留**。R2 断言迁移已在基线提交中（上一会话在途工作）；本包仅按 steps.md 补齐三条示例断言（见阶段 1）。
- 卡片墙实况（`prj/app.js:3026–3056`）：`renderPreschoolCourses` = 今日卡 `.preschool-course-today`（CTA `.preschool-course-today-cta`）+ `.preschool-course-wall` 墙（卡 `.preschool-course-wall-card tone-*`、`.preschool-course-wall-art`、`.preschool-course-wall-dots[role=progressbar]`、`.preschool-course-wall-state is-*`）。`preschool-workbench/index.html:9` 缓存戳 `preschool-workbench.css?v=20260815-course-wall-v1`；`css/preschool-workbench.css:38` `@import` `34-course-wall.css?v=20260815-course-wall-v1`。
- 每日任务实数：**6 项**，定义在 `prj/storage.js:11-18` `PRESCHOOL_DAILY_ITEMS`（不在 config.js——config.js 是页面文案与课程种子）。项名与分类：完成今日识字(识字)/朗读一首古诗(古诗)/数学闯关一关(数学)/学习今日英语(英语)/做一项运动(运动)/专注力训练一题(专注)。required=true 仅前 3 项（识字/古诗/数学），英语/运动/专注为可选。测试合同 `seeds six preschool workbench quests` 同步断言 6 项。
- 奖励数值实录（全部 file:line 实读）：
  - 课完成（lesson-finish）：**+20 阳光**（`prj/app.js:4263`）
  - 今日计划打卡完成：**+10**（`prj/app.js:4673、4886`）；成长任务完成：**+15**（`prj/app.js:4685、5115`）；阅读记录：**+5**（`prj/app.js:4698`）
  - 当天首次有效行动：**+10**，eventId `daily-checkin:{date}`，一天一次（`prj/child-growth.js:204–211`）
  - 连续奖励：streak-1 +10 阳光 / streak-3 造型 / streak-7 +30 阳光 / streak-14、streak-30 造型（`prj/child-growth.js:4–10`）
  - 豌豆能量：有效行动 **+1，上限 9**（`prj/preschool-garden.js:281–286`）；发射消耗 energyCost（豌豆射手/寒冰射手 1、樱桃炸弹 2、坚果 0）（`preschool-garden.js:5–8、345–348`）
  - 浇水：**消耗 5 阳光，每天一次**（`prj/child-growth.js` `waterPlant`）；向日葵技能：每天收集一次 **+10 阳光**（`preschool-garden.js:5`）
  - 游戏（`prj/games/shared/workbench-bridge.js`）：**游戏阳光日上限 `DAILY_GAME_SUN_CAP = 80`**（line 19）；今日游玩 +3、三界同日 +8、本周游玩达标 +15、本周三界日 +12（lines 348–396）；里程碑 +20/+40/+22 等（lines 57–65）；eventId 去重 `game:{gameId}:{eventKey}` 与 `game-sun:{date}:{gameId}:{amount}`（lines 255–268）；超上限拒绝（line 264）
  - 种子展示值（非奖励口径）：preschool 初始阳光 40（`prj/storage.js:262`）、child 80（`storage.js:310`）
  - **合同"三项核心全部完成 +20/豌豆1"：代码中不存在任何"日闭环"结算事件**（app.js 无全部完成奖励路径）；代码里的 +20 是"单课完成"
  - **合同"家长线下奖励 pending→approved→claimed"：未实现**——`claimReward` 直接扣阳光核销（`prj/app.js:4597–4609`）；家长确认为 B3 包范围
  - 代码内部无数值自相矛盾（工作台奖励无日 cap、游戏奖励有 cap 80 属两套独立机制，与 data-model 口径一致），未触发 §8 升级
- 识字库实数：`prj/preschool-literacy-data.js` bank = **1500 字**（L1–L5 各 300，去重后仍 1500）；运行时 `getRuntimeBank()` 全量消费、无 240 截断（`prj/preschool-literacy.js:357–360`）。→ 盘点口径"运行时 240 字"已过时，R5 按实数 1500 改口。
- `npm test` 全量基线：**253 项，246 过 / 7 失败（退出码 1）**，失败全部在 `tests/world-games.test.mjs`（garden `game.js` 缺 `USE_PLAY_MODS`/`applyPlayMods`/`advanceMoveClocks`/`buildSettlementLines` 等），与本包文件域无交集；用户裁决按"无新增失败"口径放行（见 execution-check）。
- 结论（允许推进 / 否）：**允许推进**（侦查完成，R2 补断言 + R1/R3/R4/R5 文档修订开始）。

## 阶段 1：测试迁移

- 状态：**完成（2026-08-15）**
- 命令与退出码：`node --test tests/preschool-workbench-refresh.test.mjs` → **52/52 通过，退出码 0**；`grep -c "course-directory" tests/preschool-workbench-refresh.test.mjs` → 0（退出码 1，旧断言清除）。
- 说明：断言迁移主体已在基线 commit `ebc5592` 固化（上一会话在途工作，侦查确认 52/52 绿 + 无残留）。本包在其上按 steps.md 步骤 2 补齐三条断言：`renderPreschoolCourseWallCard`、`renderPreschoolCoursesTodayCard`、`34-course-wall.css?v=20260815-course-wall-v1` @import（tests/preschool-workbench-refresh.test.mjs:262 起）。
- 结论：**允许推进（R1/R3/R4/R5 文档修订开始）。**

## 阶段 2：文档修订

- 状态：**完成（2026-08-15）**
- 奖励对数表（合同值 → 代码值 → 改定值；代码值全部为阶段 0 实读 file:line）：

| 条目 | 合同值 | 代码值（file:line） | 改定值 |
|---|---|---|---|
| 核心活动完成 | +10 阳光 / 1 豌豆能量 | 计划打卡 +10（app.js:4673/4886）、任务 +15（4685/5115）、课完成 +20（4263）、阅读 +5（4698）；豌豆能量 +1/次、上限 9（preschool-garden.js:281–286） | 拆为四行按行为列示；豌豆能量口径单列 |
| 可选复习完成 | +5 / 0 | 阅读记录 +5（app.js:4698）；错题/复习无阳光奖励 | 并入"阅读记录 +5"，删"可选复习"行 |
| 当天首次有效行动 | +10 / 0 | +10，`daily-checkin:{date}` 一天一次（child-growth.js:204–211） | 不变（合同与代码一致） |
| 三项核心全部完成 | +20 / 1 | **代码无此机制**（无日闭环结算事件） | 标注"裁决：未实现"，不写数值 |
| 浇水 | 消耗 5 / 0 | 消耗 5、每天一次、失败不改状态（child-growth.js waterPlant） | 不变（一致） |
| 发射豌豆 | 0 / 消耗 1 | energyCost：豌豆/寒冰 1（伤害 1）、樱桃炸弹 2（伤害 3）、坚果 0（preschool-garden.js:5–8、345–348） | 改"消耗按植物 energyCost"并列数值 |
| 家长线下奖励 | 消耗约定阳光（pending→approved→claimed） | **未实现**；`claimReward` 直接扣阳光核销（app.js:4597–4609） | 标注"裁决：未实现（B3 范围）" |
| （合同缺失）游戏阳光 | 无 | 游戏日上限 80、eventId 去重、游玩+3/三界+8/周达标+15/周三界+12（workbench-bridge.js:19、348–396、255–268） | 新增"游戏侧"一节登记 |
| （合同缺失）连续/收集 | 无 | streak-1 +10、streak-7 +30、3/14/30 天造型（child-growth.js:4–10）；向日葵每天 +10（preschool-garden.js:5） | 新增两行登记 |

- grep 复查输出：
  - `grep -rn "三项核心|每天三项" docs/02-课程/` → 0 处（退出码 1）；含数据与奖励合同.md 表行在内共改 6 处（README.md:34、总计划.md:7、总计划.md:20、成长游戏/02-60日课程表.md:5、数据与奖励合同.md:33、以及合同表整体）。
  - `rg "60-80|60–80" docs/02-课程/识字/ docs/02-课程/幼儿课程方案/01-识字/` → 见 R5 记录。
- 结论：**允许推进（R5 识字目标改口）。**

## 阶段 3：回归

- 状态：**完成（终局快照 2026-08-15 01:45:38）**
- `npm test` 结果：**259/259 通过，退出码 0**。注：基线时 7 个 world-games 失败已由**并发会话**修复（见遗留区），259 含其新增的 `tests/preschool-streak-repair.test.mjs`；本包调整后的 R6 口径（无新增失败 + refresh 退出码 0）与原始口径（npm test 退出码 0）均满足。
- `node --test tests/preschool-workbench-refresh.test.mjs`：52/52，退出码 0（01:45 快照）；`grep -c "course-directory"` = 0（退出码 1）。
- `git status` 改动面核对：本包改动 = `.meta.yaml` files 所列 **8 个文件**（6 个原域 + 2 个 R3 同批改）+ 本包控制面（test-report / execution-check / requirements-checklist / .meta.yaml / README）。以 `git diff ebc5592 --stat` 逐文件核对，零产品代码改动。工作树中另有**并发会话**的在途改动（`prj/games/garden-defense/*`、`prj/app.js`、`prj/css/*`、`docs/plans/T20260815-asset-allowlist/*` 等），非本包所为，未触碰。
- 结论：**本包完成，待用户验收。**

## 遗留 / 升级记录

- **并发会话警告（贯穿本包执行期）**：另一会话正在本仓库实时工作。时间线：① 基线时 7 个 `tests/world-games.test.mjs` 失败（garden 缺 `applyPlayMods` 等）由该会话在 01:35 修复，并新增 `tests/preschool-streak-repair.test.mjs`（全量 253→259）；② 01:42:57 该会话把 `index.html` 缓存戳升至 `20260815-flashcards-v1`，一度打红 refresh 测试两条戳断言；本包（测试文件属本包域）与该会话**先后各自更新了戳断言**（本包改 108/111 行、对方改 590 行），01:45 合流后 52/52 恢复绿。后续会话提交/验收时需注意混行归属；若该会话再升戳，刷新 `tests/preschool-workbench-refresh.test.mjs` 的戳断言即可（行 108/111/590）。
- 门控阶段曾按"基线 246/253 + 无新增失败"口径放行（用户裁决）；终局 npm test 实际 0 失败，无需启用该宽限口径。
- 未触发 task.md §8 升级：代码内部数值无自相矛盾；"三项核心全部完成 +20"与"家长线下奖励"按"裁决：未实现"标注进合同，未改代码。
- 侦查发现盘点口径过时两处（已按实数改文档，非缺陷）：识字库实为 1500 字（非 240）；今日任务定义在 `prj/storage.js` 而非 `prj/config.js`。
