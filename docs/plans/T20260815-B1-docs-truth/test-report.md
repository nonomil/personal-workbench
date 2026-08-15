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

### 阶段 0 · 本次执行复核（2026-08-15）

- 复核范围：B1 允许改动文件当前均无未提交状态；以下证据为本次执行取得，未把历史报告当作新鲜证据。
- refresh 测试现状：`node --test tests/preschool-workbench-refresh.test.mjs` → **53/53 通过，退出码 0**；当前测试已守护卡片墙，不再有 `preschool-course-directory` 断言。
- 卡片墙实况（代码实读）：`prj/app.js:3031–3050` 定义 `renderPreschoolCourseWallCard` 与 `renderPreschoolCoursesTodayCard`；卡片使用 `.preschool-course-wall-card`、`.preschool-course-wall-art`、`.preschool-course-wall-dots`、`.preschool-course-wall-state`，今日卡使用 `.preschool-course-today` 与 `.preschool-course-today-cta`；`prj/app.js:3213–3217` 由 `renderPreschoolCourses` 组装今日卡和 `.preschool-course-wall`。`prj/css/preschool-workbench.css:38` 引入 `34-course-wall.css?v=20260815-course-wall-v1`。
- 每日任务实数：**6 项**。`prj/config.js:33–44` 只提供页面文案；实际种子定义在 `prj/storage.js:11–18`：完成今日识字、朗读一首古诗、数学闯关一关、学习今日英语、做一项运动、专注力训练一题；前 3 项 `required: true`，后 3 项为可选。
- 奖励实录（本次代码核对）：课完成 `+20`（`prj/app.js:4430`）；每日计划打卡 `+10`（`prj/app.js:4840、5053`）；成长任务 `+15`（`prj/app.js:4852`）；阅读新记录 `+5`（`prj/app.js:4865`）；当天首次有效行动额外 `+10`，由 `daily-checkin:{date}` 去重（`prj/child-growth.js:189–211`）；连续奖励为 1 日 `+10`、7 日 `+30`，3/14/30 日为造型（`prj/child-growth.js:4–10`）。
- 游戏奖励实录：`prj/games/shared/workbench-bridge.js:19` 的 `DAILY_GAME_SUN_CAP = 80`；`awardSunlight` 以 `game:{gameId}:{eventKey}` 去重，并写入 `game-sun:{date}:{gameId}:{amount}` 统计日 cap（`:243–279`）；日游玩 `+3`、三界同日 `+8`、周游玩达标 `+15`、本周三界日 `+12`（`:348–394`）；11 个里程碑阳光值按 `MILESTONES` 顺序为 `+12/+20/+30/+12/+25/+12/+30/+18/+40/+22/+16`（`:55–66、411–433`）。与工作台行动奖励是两条独立代码路径，本次未发现内部矛盾。
- 识字库实数：只读执行 Node 统计 `prj/preschool-literacy-data.js` 得 `1500` 条、唯一字 `1500`，L1–L5 各 `300`；`prj/preschool-literacy.js:357–360` 的 `getRuntimeBank()` 直接解析完整 `data.bank`，无 240 截断。
- 本次门控/侦查结论：**允许推进**。所有改定数值均已从 `prj/` 代码实读；未触发 task.md §8 的代码内部数值矛盾升级。

## 阶段 1：测试迁移

- 状态：**完成（2026-08-15）**
- 命令与退出码：`node --test tests/preschool-workbench-refresh.test.mjs` → **52/52 通过，退出码 0**；`grep -c "course-directory" tests/preschool-workbench-refresh.test.mjs` → 0（退出码 1，旧断言清除）。
- 说明：断言迁移主体已在基线 commit `ebc5592` 固化（上一会话在途工作，侦查确认 52/52 绿 + 无残留）。本包在其上按 steps.md 步骤 2 补齐三条断言：`renderPreschoolCourseWallCard`、`renderPreschoolCoursesTodayCard`、`34-course-wall.css?v=20260815-course-wall-v1` @import（tests/preschool-workbench-refresh.test.mjs:262 起）。
- 结论：**允许推进（R1/R3/R4/R5 文档修订开始）。**

### 阶段 1 · 本次执行复核（2026-08-15）

- 当前测试文件已包含目标断言：`renderPreschoolCourseWallCard`、`renderPreschoolCoursesTodayCard`、`preschool-course-wall`、`preschool-course-today`、`34-course-wall.css?v=20260815-course-wall-v1`；`preschool-course-directory` 无残留。
- `node --test tests/preschool-workbench-refresh.test.mjs` → **53/53 通过，退出码 0**。
- 结论：**允许推进**。本次没有覆盖已有测试改动，也没有发现卡片墙实现缺陷。

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

### 阶段 2 · 本次执行复核（2026-08-15）

- 卡片墙文档反证：头部包含“已实施”、缓存戳 `20260815-course-wall-v1`、落点 CSS/`app.js` 渲染函数、守护测试和实现差异注记；`rg` 命中并退出码 0。
- 每日任务反证：`rg "三项核心|每天三项" docs/02-课程` 无匹配，退出码 1；代码实数仍为 6 项，前 3 项必做、后 3 项可选。
- 奖励合同反证：`数据与奖励合同.md` 已登记课完成 +20、计划 +10、任务 +15、阅读 +5、首次行动 +10、连续奖励、游戏日 cap 80、日/周/三界奖励及 11 个里程碑完整数值；家长兑换和“三项核心全部完成 +20”均保留“裁决：未实现”。
- 识字目标反证：`rg "60-80|60–80" ...` 无匹配，退出码 1；两处文档均登记运行库 1500 字、L1–L5 各 300，并注明 60 日表不等于字库全量。
- 结论：**允许推进**。本阶段未触发代码内部数值矛盾升级。

## 阶段 3：回归

- 状态：**完成（终局快照 2026-08-15 01:45:38）**
- `npm test` 结果：**259/259 通过，退出码 0**。注：基线时 7 个 world-games 失败已由**并发会话**修复（见遗留区），259 含其新增的 `tests/preschool-streak-repair.test.mjs`；本包调整后的 R6 口径（无新增失败 + refresh 退出码 0）与原始口径（npm test 退出码 0）均满足。
- `node --test tests/preschool-workbench-refresh.test.mjs`：52/52，退出码 0（01:45 快照）；`grep -c "course-directory"` = 0（退出码 1）。
- `git status` 改动面核对：本包改动 = `.meta.yaml` files 所列 **8 个文件**（6 个原域 + 2 个 R3 同批改）+ 本包控制面（test-report / execution-check / requirements-checklist / .meta.yaml / README）。以 `git diff ebc5592 --stat` 逐文件核对，零产品代码改动。工作树中另有**并发会话**的在途改动（`prj/games/garden-defense/*`、`prj/app.js`、`prj/css/*`、`docs/plans/T20260815-asset-allowlist/*` 等），非本包所为，未触碰。
- 结论：**本包完成，待用户验收。**

### 阶段 3 · 本次执行复核（2026-08-15）

- `npm test` → **260/260 通过，退出码 0**。
- `node --test tests/preschool-workbench-refresh.test.mjs` → **53/53 通过，退出码 0**。
- `git status` 核对：当前未提交项仍仅属于其他方案/计划域及未跟踪计划目录；本包目标文件的工作树改动来自本次控制面回写与 R4 合同精确化，不含 `prj/` 产品代码、`workbench-bridge.js` 或 localStorage 变更。
- `.meta.yaml` 已从 `done` 调整为 `review`；`requirements-checklist.md` 的“最终验收”列保持“待确认”。
- 结论：**执行完成，待用户验收；不执行 commit。**

### 并发重叠后的停止记录（2026-08-15）

- B1 复核完成后，另一会话将 HEAD 推进到 `e470e5d`，并继续修改 `prj/app.js`、`prj/css/*`、`prj/preschool-workbench/index.html` 及其他测试；其中 `tests/preschool-workbench-refresh.test.mjs` 已出现新的未提交改动，直接命中 B1 文件域。
- 重叠后的最新回归：`npm test` → **264 项，259 通过 / 5 失败，退出码 1**；`node --test tests/preschool-workbench-refresh.test.mjs` → **53 项，50 通过 / 3 失败，退出码 1**。失败包含并行会话更新课程页面/缓存戳后，原有 flashcard 合同仍按旧 `PRESCHOOL_FLASHCARD_COURSES` 文本断言的情形。
- 该失败不能归因于本次 B1 文档与奖励合同改动；本会话不覆盖并行会话的测试、产品代码或缓存戳，也不继续追改 B1 测试。
- 当前结论：**停止，等待用户裁决并行改动的处置（先提交/混行/待其完成后再复测）。** 最终验收列和 B1 `review` 状态保持不变。

### 并发重叠续行（2026-08-15）

- 用户授权由本会话自行裁决后，采用当前并行代码为事实、保留并行工作树、不回滚、不提交的处理；refresh 合同已随并行课程页缓存戳和数学卡片扩展对齐。
- `npm test` → **264/264 通过，退出码 0**。
- `node --test tests/preschool-workbench-refresh.test.mjs` → **53/53 通过，退出码 0**。
- 当前结论：**阻塞解除，B1 执行证据齐全，状态保持 `review`，最终验收仍留给用户。** 本会话未改并行产品代码，未覆盖并行测试改动。

### 阶段 3 · 终局复核（2026-08-15）

- 数学合同失败复核：`node --test tests/preschool-math-practice.test.mjs` → **8/8 通过，退出码 0**。此前过渡失败的两个戳断言现已与工作台入口实际 `preschool-garden.js?v=20260815-practice-levels-v1` 对齐；本次未再修改数学测试或产品代码。
- `node --test tests/preschool-workbench-refresh.test.mjs` → **53/53 通过，退出码 0**。
- `npm test` → **268/268 通过，退出码 0**。
- 本阶段结论：**允许推进，执行完成，待用户验收。** B1 保持 `review`，不执行 commit；当前并行工作树改动继续按既定归属保留。

### 阶段 3 · 并行 points-lighting 收敛后的终局复核（2026-08-15）

- 并行包 `T20260815-points-lighting` 在 refresh 测试中新增的两条“日历点亮”合同曾短暂造成 **269 项中 267 通过 / 2 失败**；代码实读确认失败来自其实现尚未落地，本会话未覆盖该并行改动。
- 并行实现落地后，`node --test tests/preschool-workbench-refresh.test.mjs` → **54/54 通过，退出码 0**；`node --test tests/preschool-math-practice.test.mjs` → **8/8 通过，退出码 0**。
- 最新 `npm test` → **269/269 通过，退出码 0**；`git diff --check` → **退出码 0**（仅有 Git 的 LF/CRLF 提示，无 whitespace error）。
- 本阶段结论：**允许推进，B1 执行完成，待用户验收。** 并行工作树按现状保留；B1 状态保持 `review`，不执行 commit。

## 遗留 / 升级记录

- **并发会话警告（贯穿本包执行期）**：另一会话正在本仓库实时工作。时间线：① 基线时 7 个 `tests/world-games.test.mjs` 失败（garden 缺 `applyPlayMods` 等）由该会话在 01:35 修复，并新增 `tests/preschool-streak-repair.test.mjs`（全量 253→259）；② 01:42:57 该会话把 `index.html` 缓存戳升至 `20260815-flashcards-v1`，一度打红 refresh 测试两条戳断言；本包（测试文件属本包域）与该会话**先后各自更新了戳断言**（本包改 108/111 行、对方改 590 行），01:45 合流后 52/52 恢复绿。后续会话提交/验收时需注意混行归属；若该会话再升戳，刷新 `tests/preschool-workbench-refresh.test.mjs` 的戳断言即可（行 108/111/590）。
- 门控阶段曾按"基线 246/253 + 无新增失败"口径放行（用户裁决）；终局 npm test 实际 0 失败，无需启用该宽限口径。
- 未触发 task.md §8 升级：代码内部数值无自相矛盾；"三项核心全部完成 +20"与"家长线下奖励"按"裁决：未实现"标注进合同，未改代码。
- 侦查发现盘点口径过时两处（已按实数改文档，非缺陷）：识字库实为 1500 字（非 240）；今日任务定义在 `prj/storage.js` 而非 `prj/config.js`。
