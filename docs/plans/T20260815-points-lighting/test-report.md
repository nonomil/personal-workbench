# test-report（执行时回写）

> 每阶段格式：日期 / 命令 / 退出码 / 关键输出 / 结论（允许推进：是/否）/ 红线自查（无新货币·无惩罚·无排行·无手动打卡·bridge 零改动）。

## 阶段 0：只读侦查（steps 步骤 1）

- 日期：2026-08-15
- npm test 基线：`npm test`，退出码 `0`，`260/260` 通过。
- Node/环境：Node 与 npm 可用；基线测试无端口或环境障碍。
- git status 重叠核对：
  - `git status --short --untracked-files=all -- prj/app.js prj/preschool-achievements.js prj/child-growth.js prj/preschool-garden.js docs/data-model.md tests` 无输出。
  - 未限定路径的状态检查只看到 `?? docs/plans/T20260815-points-lighting/`，这是本次明确授权的任务包控制面，不是产品代码/数据/测试域重叠；保留并在本包内回写。
- B1-docs-truth 状态核对：
  - `docs/plans/T20260815-B1-docs-truth/.meta.yaml` = `status: done`，但 `docs/plans/README.md` 和其 `test-report.md` 仍标为“review 待验收”；记录这两个层级事实，不把 review 写成用户已验收。
  - B1 的 `task.md` 明确列出 `docs/data-model.md` 为“不碰”文件；其 `.meta.yaml` files 列表也不含该文件；当前 `git status` 对 `docs/data-model.md` 无未提交改动。因此本包没有撞到 B1 正在修改的段落，可以继续按 D-011 增补新口径节。
- 其他撞域状态：`T20260815-B3-reward-loop` README = `blocked`（等 B2）；`T20260815-streak-repair` README = `done`，`growth.streakRepair.repairedDates` 在 `prj/child-growth.js:74-79, 87-101, 223-240` 存在。本阶段不启动 S2。
- “打卡”文案清单（代码实读；产品域共 29 个命中，逐条记录）：
  - `prj/config.js:19` 儿童 overview 描述“先打卡”；`prj/config.js:21` 儿童 plans 标题“今日打卡”；`prj/config.js:35` 儿童 calendar 标题/描述“日历打卡/打卡记录”；`prj/config.js:58` 花园主题切换摘要“今日打卡”；`prj/config.js:140` 儿童动作标签“添加打卡项”；`prj/config.js:150` 幼儿主题摘要“大图打卡”。这些是配置源文本，不直接在本包 files 列表中改；幼儿运行时由允许修改的 `prj/app.js` 展示层覆盖/同步。
  - `prj/preschool-achievements.js:47-49` 地图三枚徽章条件“全日打卡”；`prj/preschool-achievements.js:282` 地图进度“全日打卡”；`prj/preschool-achievements.js:418` 家长徽章墙空态“识字、打卡和英语”。其中地图条件/进度是孩子可见断言素材；空态也会统一为行动/点亮。
  - `prj/preschool-workbench/index.html:19` 静态导航“日历打卡”；不改任务包外壳文件，幼儿 app 初始化时同步成“日历点亮”。
  - `prj/app.js:524` 三界戳 `aria-label`“今日三界打卡”；`1226`/`1338`/`1447` 三处“去打卡”；`1322` “累计打卡”；`1411` 家长说明“学习打卡阳光”；`1480` 日历图例“已打卡/还没打卡”；`3422` 幼儿首页“项打卡完成”；`3611` 儿童证据“项打卡完成”；`3635` 儿童概览“完成打卡会增加/项打卡”；`3758` 成人习惯区“习惯打卡”；`3825` 非幼儿成长图“等待今日第一次打卡/查看打卡”；`5084` 完成语音“今天的打卡完成啦”。本包会改幼儿/儿童展示路径；成人习惯语义不属于幼儿点亮口径。
  - 测试命中共 5 个：`tests/child-workbench-ui.test.mjs:25` 仅测试名；`tests/preschool-workbench-refresh.test.mjs:238,240` 是直接断言旧幼儿日历文案的 2 条；`tests/preschool-workbench-refresh.test.mjs:587,591` 是断言旧文案“不存在”的负向守护，不断言旧 UI 已存在。故 S1-c 预期先红数 = **2**，未超过 20。
- 向日葵记账实录 + `totalSunlightEarned` 消费/写入方：
  - 技能路径：`prj/preschool-garden.js:376-386` 的 `usePlantSkill` 在向日葵当天未收集时只执行 `growth.sunlight += 10`、`growth.garden.growthPoints += 10`、写 `lastSkillDate`；没有 `awardedIds`、`totalSunlightEarned` 或 `unicorn.xp` 写入。
  - 防守 tick：`prj/preschool-garden.js:559-568` 的 `stepDefense` 每 5 tick 只执行 `growth.sunlight += 10`、`growth.garden.growthPoints += 10`；没有总账/经验写入。
  - 学习侧总账：`prj/child-growth.js:189-211` 的 `recordAction` 写行为金额和当日首次 `daily-checkin`；`prj/child-growth.js:297-305` 的 `claimStreakReward` 对已有连续奖励阳光继续写 `totalSunlightEarned` 与经验。两者都属于学习/连续奖励账本路径，文档必须一并登记。
  - 游戏侧总账：`prj/games/shared/workbench-bridge.js:250-278` 的 `awardSunlight` 写游戏事件去重、`sunlight`、`totalSunlightEarned` 和 `unicorn.xp`；bridge 本次零改动。
  - 总账被读取/派生的位置：`prj/child-growth.js:124-168`（归一化、经验回退、植物阶段）、`:263-271`（成长视图）；`prj/app.js:1277-1305`（幼儿花园进度计算）和 `:3825`（非幼儿成长地图展示）；`prj/preschool-garden.js:229` 只在旧快照归一化时把历史总账作为花园增长点下限。`prj/preschool-achievements.js` 不读取该字段，徽章按学习统计/全日计划完成计算。
  - 方向裁决建议：**方向 A**。证据是两条向日葵路径明确属于花园内资源循环，已有独立 `garden.growthPoints` 解锁植物/收集物；它们没有进入 awardedIds 幂等链，也不会触发经验/学习徽章。为避免文档谎言，`totalSunlightEarned` 定义写成“学习 `recordAction` + 已有连续奖励领取 + 游戏 bridge 入账”，明确排除向日葵技能与防守 tick；不改产品记账代码。
- `claimReward` 实录：
  - `prj/app.js:4764-4782` 只对 child 生效；按 `getChildRewards()` 找奖励；在 `commit` 中 `ensureGrowth`，把 cost 规范为非负数；若 `claimedRewardIds` 已含 id 抛“这个奖励已经领取过了”，若余额不足抛“还需要 N 阳光”；成功时 `growth.sunlight -= cost` 并 push `claimedRewardIds`。
  - 幼儿奖励表来自 `prj/config.js:160-166`，成本为 `20/40/60/80/120` 阳光；成功兑换后只记录花园 `reward-claimed` 事件并显示庆祝，不在 `claimReward` 内修改 `totalSunlightEarned`。
  - 函数是 app.js IIFE 内闭包、当前无导出；S1-a 合同测试采用源码合同断言锁住真实函数的拒绝/扣款/幂等/总账不变分支，不新增产品导出或 storage 字段。
- 结论：**允许推进，是**。基线全绿；本包代码域无既有未提交重叠；B1 未验收层面无 `docs/data-model.md` 撞段；被测试的旧“打卡”文案仅 2 条；方向 A 有代码证据支持。红线自查：无新货币、无惩罚、无排行、无手动打卡按钮；未改 bridge、recordAction、calculateStreak、repairStreak、localStorage 字段。

### 阶段 0 复核：并发重叠协调后

- 日期：2026-08-15
- 用户确认：将门控后出现的 `prj/app.js`、`tests/preschool-lesson-mistakes.test.mjs`、`tests/preschool-math-practice.test.mjs`、`tests/preschool-workbench-refresh.test.mjs` 改动作为稳定基线处理；不回滚、不覆盖。
- 复核命令：`git status --short -- prj/app.js prj/preschool-achievements.js prj/child-growth.js prj/preschool-garden.js docs/data-model.md tests`；仍列出上述四个已确认文件及本包新增的 `tests/preschool-rewards-claim.test.mjs`。
- 回归命令：`npm test`，退出码 `0`，`264/264` 通过。
- 结论：**允许恢复推进，是**。本次重叠不再作为阻塞；仍执行本包文件域与红线自查。
- 红线自查：没有回滚或覆盖并发改动；未改 bridge、recordAction、calculateStreak、repairStreak、localStorage 字段。

## 阶段 1：S1-a 兑换合同测试

- 日期：2026-08-15
- 命令：`node --test --test-concurrency=1 tests/preschool-rewards-claim.test.mjs`
- 退出码：`0`
- 关键输出：`4/4` 通过；覆盖余额不足不扣款、成功扣款并记录 `claimedRewardIds`、重复兑换不重复扣款、兑换不改变 `totalSunlightEarned`。
- 结论：**允许推进，是**。这是针对当前 `claimReward` 闭包行为的独立特征/合同测试，未新增产品导出、storage 字段或兑换逻辑。
- 红线自查：无新货币、无惩罚、无排行、无手动打卡；未改 bridge、recordAction、calculateStreak、repairStreak。

## 阶段 2：S1-b 旁路记账裁决

- 裁决：**方向 A**（保持不进 `totalSunlightEarned`，不补写 `unicorn.xp`，只保留花园资源循环）。
- 证据：`prj/preschool-garden.js:379-386` 的向日葵技能只写 `growth.sunlight`、`garden.growthPoints`、`lastSkillDate`；`:565-568` 的防守 tick 只写 `growth.sunlight`、`garden.growthPoints`。两条路径都不调用 `recordAction`、不写 `awardedIds`/`totalSunlightEarned`。
- 锁定测试：`tests/preschool-garden.test.mjs` 新增主动技能与防守 tick 两个测试，均断言阳光与花园成长点各增加 10，`totalSunlightEarned`、`awardedIds`、`unicorn.xp` 保持不变。
- 命令：`node --test --test-concurrency=1 tests/preschool-garden.test.mjs`
- 退出码：`0`；关键输出：`15/15` 通过。
- 结论：**允许推进，是**。侦查证据没有触发方向 B 升级条件；本子项只增加锁定测试，不改 `prj/preschool-garden.js`。
- 红线自查：未加学习日上限、倍率、惩罚、券、新货币或排行；未改 bridge、recordAction、calculateStreak、repairStreak、localStorage 字段。

### 阶段 0 本会话复核（2026-08-15，代码实读，禁止转抄方案行号）

- `recordAction`：`prj/child-growth.js:189-221`。有效 `eventId` 入 `awardedIds` 后同时加 `sunlight` / `totalSunlightEarned` / `unicorn.xp`；若当天不在 `checkinDates` 则写入日期并追加 `daily-checkin:{date}` +10（三处同步累加）。
- `claimStreakReward`：`prj/child-growth.js:294-309`。阳光类连续奖励继续写 `totalSunlightEarned` 与 `unicorn.xp`。
- `totalSunlightEarned` 消费方：`:124` 归一化下限、`:138` 经验回退、`:168` 植物阶段、`:269` 成长视图。`prj/preschool-achievements.js` 不读该字段。
- 向日葵技能：`prj/preschool-garden.js:381-388` 只执行 `growth.sunlight += 10`、`garden.growthPoints += 10`、写 `lastSkillDate`；无总账/经验/`awardedIds`。
- 防守 tick：`prj/preschool-garden.js:601-604`（`stepDefense`，`tick % 5 === 0`）只加 `sunlight` 与 `garden.growthPoints`。
- `claimReward`：`prj/app.js:5077-5095`。`claimedRewardIds` 已含则抛“已经领取过了”；余额不足抛“还需要 N 阳光”；成功只减 `sunlight` 并 push id，不改 `totalSunlightEarned`。幼儿表成本仍来自 `prj/config.js` 20/40/60/80/120。
- 完美日函数：`prj/preschool-achievements.js:150-168` `countFullPlanDays`——有日期计划时只计 `done === total` 的日期；无计划记录才回退合法 `checkinDates`。
- 本会话剩余孩子可见「打卡」：`prj/child-growth.js:5` 连续奖励 `streak-1` 描述“完成第一天打卡”（儿童成长页连续奖励卡会渲染 `reward.description`）。家长周报 `prj/app.js:1453` 为“学习打卡（学习行动）”，按 R3 允许保留并已有括号解释。成人“习惯打卡”、`config.js` 源文本、`index.html` 静态“日历打卡”（运行时 `syncPreschoolCopyLabels` 覆盖为“日历点亮”）、`preschool-growth-world.js`“天打卡”（不在本包 files）不改。
- 方向 A 维持：向日葵两条路径是花园资源循环，已有 `garden.growthPoints`；不进 awardedIds，也不驱动学习徽章。未触发方向 B 升级。
- 被测试断言的旧「打卡」文案：前轮已把 refresh 中 2 条正向断言改为“日历点亮”；负向守护 `再完成 \\d+ 项打卡` / `首页只负责打卡` 仍在。本会话新增 1 条连续奖励描述断言（`tests/child-growth.test.mjs`），预期先红 1。未超过 20。

## 阶段 3：S1-c 点亮文案（先红后绿）

- 前轮已完成的孩子可见改写（本会话核实仍在工作树）：日历/导航“日历点亮”、图例“已点亮/还没点亮”、身份卡/证据“项已点亮”、地图徽章 `conditionLabel`/`badgeProgress`“完美日”、家长空态“识字、行动和英语”。
- 本会话补漏：连续奖励 `streak-1` 描述。先在 `tests/child-growth.test.mjs` 增加“点亮 / 不得含打卡”断言。
- 本会话先红：`node --test --test-concurrency=1 tests/child-growth.test.mjs` 中 `describes the first streak reward as lighting a day, not checking in` 失败，实际文案仍为“完成第一天打卡，给自己一束小阳光。”。红数 = 1，与本会话新增被测断言条数一致。
- 转绿：`prj/child-growth.js:5` 改为“完成第一天点亮，给自己一束小阳光。”；同文件 `recordAction` / `calculateStreak` / `repairStreak` 零逻辑改动。
- 顶栏切换器残留：`config.js` 顶栏用 `switchSummary` 写出“今日打卡”（不在本包 files）。本会话在 `prj/app.js` `syncPreschoolCopyLabels` 用 `PRESCHOOL_COPY.themeSummaries` 覆盖为“今日行动”，未改 `config.js`。
- 真机走查（`http://127.0.0.1:4192/prj/preschool-workbench/index.html`）：
  - 侧栏/页题“日历点亮”；日历图例“已点亮 / 还没点亮 / 还没到”；“本月点亮天数”。
  - 首页“等你来点亮 / 战线点亮 / 项已点亮”；顶栏当前主题“阳光、植物与今日行动”。
  - 花园基地连续奖励标题“连续行动会解锁阳光和新造型”；徽章“完美日 0/3 天”“⬜ 未点亮”。
  - 家长周报说明保留“学习打卡（学习行动）”，符合 R3。
  - **files 外残留（未改）**：`prj/preschool-growth-world.js` 冒险地图“1 天打卡”。
- 截图：`.tmp-analysis/s1-overview-home.png`、`s1-calendar-lighting.png`、`s1-garden-base.png`、`s1-badge-box.png`。
- 命令：`node --test --test-concurrency=1 tests/child-growth.test.mjs tests/preschool-rewards-claim.test.mjs tests/preschool-garden.test.mjs tests/preschool-achievements.test.mjs tests/preschool-workbench-refresh.test.mjs`，退出码 `0`，`96/96`。
- 结论：**允许推进，是**。
- 红线自查：无新货币/惩罚/排行/手动打卡按钮；未改 bridge 上限、recordAction、calculateStreak、repairStreak、localStorage 字段。

## 阶段 4：S1-d data-model 口径节 + S1 收尾

- 日期：2026-08-15
- `docs/data-model.md` 已有「点亮日 vs 完美日（2026-08-15，D-011）」节：点亮日=`recordAction` 写 `checkinDates`；完美日=`countFullPlanDays`；`totalSunlightEarned` 方向 A 口径；学习路径不加日上限。本会话把相邻句“最近一次打卡”改为“最近一次点亮”。
- 本包定向：`96/96`，退出码 `0`。
- 全量 `npm test`：`277/278`，退出码 `1`。唯一失败是 `tests/preschool-defense-game.test.mjs`「keeps different zombie movement and health profiles observable」（`basic.column < 5`），属花园防守并行测试，不在本包 files，未改。
- `git diff` 红线：`recordAction`/`calculateStreak`/`repairStreak` 仅 `STREAK_REWARDS` 一条展示文案；本包未改 `workbench-bridge.js`（工作树里该文件另有 voxel 并行 diff，不是本包写入）。
- 结论：**S1 实现与本包测试已齐，停等用户验收。** 全量 1 条红不是本包引入。不启动 S2。
- 红线自查：无新 localStorage key；无新货币/惩罚/排行/倍率/券；无手动打卡按钮。

## S2 阶段（门控启用后追加）

（待填）
