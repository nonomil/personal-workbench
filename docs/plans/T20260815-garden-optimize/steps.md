# T20260815-GD — S1 接通（G1 playMods / G2 结算三行 / G3 星芒陪伴）

> 优先级：P0 | 状态：pending | 前置：工作区处置（步骤 0）
> 只执行 S1。S2（G4–G6）不写进本页当正在做。
> 验证以退出码为准：`exit 0` 通过。

## 目标

识字量改变花园难度与奖励；结算页让孩子看见长线成长；星芒出场、里程碑有仪式感。

## Steps

### 0. 处置工作区 + 基线

- [ ] `git status` 确认在途文件归属（并发会话可能在改 preschool CSS / 素材）
- [ ] `npm test` 基线记录（上次已知 238 全绿）
- **验证：** 退出码 0
- **回滚成本：** 无写入

### 1. 读码定位（不改代码）

- [ ] `prj/games/garden-defense/game.js`：确认僵尸速度的应用位置（`tickDefense` 输入还是渲染层插值）、结算弹层 DOM 结构、`recordPlaySession`/`grantProgressPoints` 返回值 `awards` 是否已被接收
- [ ] 确认 `bridge.getPlayMods()` 返回结构（`enemySpeed/sunMult/extraMob/label`，见 `workbench-bridge.js` 28–41 行）
- **判定：** 若速度只能在 `preschool-garden.js` 规则层改 → 停，走 task.md §8 升级
- **验证：** 结论写进 test-report 阶段 1
- **回滚成本：** 无写入

### 2. 合同测试先红（R4）

- [ ] `tests/world-games.test.mjs` garden 段新增断言（纯函数级，不起浏览器）：
  - game.js 源码含 `getPlayMods` 调用与 `USE_PLAY_MODS` 常量
  - 难度应用函数（如 `applyPlayMods(wave, mods)`）：mock 三档 mods，断言僵尸速度、阳光倍率、困难档 +1 僵尸
  - 结算数据组装函数：mock `getMetaSummary` 返回值，断言三行内容（所得/进度/下一目标）与"最近未解锁里程碑"计算
- **验证：** `node --test tests/world-games.test.mjs` — **先非 0**（红）
- **回滚成本：** 还原测试文件

### 3. G1 playMods 接入（R1）

- [ ] `game.js` 顶部：`const USE_PLAY_MODS = true;` + 开局读 `bridge.getPlayMods()`（bridge 无此方法时兜底 `null` → 行为同现状）
- [ ] 僵尸速度 ×`enemySpeed`；通关阳光 `Math.round(rewardSun * sunMult)`（仍经 `awardSunlight` 的 40/80 上限）；`extraMob` 为真时每波 +1 普通僵尸
- [ ] HUD 徽标：显示 `mods.label`（简单/普通/困难），点击弹一句"多认字可以解锁更强的僵尸和更多阳光"
- **验证：** 步骤 2 相应断言转绿
- **回滚成本：** `USE_PLAY_MODS = false`

### 4. G2 结算三行（R2）

- [ ] 结算弹层固定三行：① 本局所得（阳光×倍率、星数）② 冒险等级进度条（`getMetaSummary().adventurePoints / nextRank.need`，含称号）③ 下一目标（遍历 `bridge.MILESTONES` 找最近未解锁项，展示 desc 与差值）
- [ ] 失败结算也走同层：无所得行，改星芒打气文案（见步骤 5）
- **验证：** 断言绿 + 浏览器通关一局目检三行
- **回滚成本：** 还原结算层 DOM 代码

### 5. G3 星芒 HUD + 庆祝卡（R3）

- [ ] HUD 右上角星芒小像：素材优先 `prj/assets/generated/` 内现有伙伴图，无则 emoji 占位（🦄），素材到位后仅换 src
- [ ] 文案池 ≥12 条（开局按 `mods.label` 分 3 条 / 通关夸奖 4 条 / 失败打气 5 条**含策略提示**，如"下次把坚果种前面试试"）；`petLevel≥3` 称呼换"小园长"
- [ ] 庆祝卡：`recordPlaySession`/`grantProgressPoints` 返回 `awards` 中 `kind==='milestone'` 时弹全屏卡（徽章名 + 阳光数 + 星芒），点按关闭；同局多枚排队逐张弹
- **验证：** 断言绿（文案池长度、milestone 触发弹层函数）+ 浏览器手动触发 `ms-garden-3`
- **回滚成本：** 还原 HUD/弹层代码

### 6. 回归（R8）

- [ ] `node --test tests/world-games.test.mjs`
- [ ] `npm test`
- **验证：** 退出码 0（预期 238+新增）
- **回滚成本：** 整包 S1 文件还原

### 7. 浏览器证据

- [ ] `http://127.0.0.1:4180/prj/games/garden-defense/index.html`：HUD 档位徽标可见；通关结算三行齐全；devtools 改 `courseProgress.literacy.mastery` 数量后刷新，档位与僵尸速度变化
- [ ] Console 无报错；localStorage 仅 `petbank_huchuliang_preschool_workbench_state_v1`
- [ ] 结果回写 `test-report.md` 阶段 2
- **回滚成本：** 无

## Acceptance（S1）

- [ ] R1–R4 R8 有测试或浏览器证据
- [ ] R5–R7（S2）未开始——不是遗忘
- [ ] 未 commit（除非用户要求）
