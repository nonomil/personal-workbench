# T20260813 — S1 花园自动塔防

> 优先级：P0 | 状态：pending | 前置：execution-check 放行  
> 只执行 S1。S2/S3 不要写进本页当正在做。

## 目标

独立花园页用 `tickDefense` 自动打，僵尸走路；任意种植保留；通关阳光走 bridge。

## Steps

> 验证以退出码为准：`exit 0` 通过。

### 1. 前提：入口还在

- [ ] 确认 `tickDefense` / `spawnDefenseWave` / `placeDefensePlant` 仍从 `prj/preschool-garden.js` 导出
- [ ] 确认独立页仍加载 `../../preschool-garden.js` 与 `workbench-bridge.js`
- **验证：** `node --check prj/preschool-garden.js` — 退出码 0，≈2s
- **回滚成本：** 无写入

### 2. 失败测试：僵尸破线 → lost

- [ ] 在 `tests/preschool-defense-game.test.mjs` 增加 lost 用例（僵尸 column=0 且 moveClock 足够左移）
- **验证：** `node --test tests/preschool-defense-game.test.mjs` — **先非 0**（红）
- **回滚成本：** 删该测试

### 3. 规则层 lost

- [ ] `stepDefense`：僵尸越出最左 → `status = 'lost'`
- [ ] `won` 不在 lost 时置位
- **验证：** 同上命令退出码 0，且 `tests/preschool-garden.test.mjs` 仍绿
- **回滚成本：** 还原 preschool-garden.js 该函数

### 4. 合同测试：独立页必须 tick

- [ ] `tests/world-games.test.mjs`：gardenScript 匹配 `tickDefense` 与 `spawnDefenseWave`；匹配 `lawnFromEvent|任意种植`；`doesNotMatch` `/function useSkill/`
- **验证：** `node --test tests/world-games.test.mjs` — **先非 0**
- **回滚成本：** 还原该测试文件

### 5. 独立页改接 tick

- [ ] `game.js`：enterStage 用 `startDefenseGame`；rAF 每 720ms `tickDefense`；来一波用 `spawnDefenseWave`；画 zombies/projectiles
- [ ] 去掉主按钮「使用技能」
- [ ] `data/stages.js`：`needKills` → `waves` + `parSec`（第 1 关 waves=1, parSec=45）
- [ ] `index.html` 文案同步
- [ ] 通关仍 `awardSunlight` `eventKey: 'stage-'+id+'-clear'`
- [ ] lost 时 toast，可重开，不扣阳光
- **验证：**
  ```text
  node --check prj/games/garden-defense/game.js
  node --test tests/world-games.test.mjs tests/preschool-garden.test.mjs tests/preschool-defense-game.test.mjs
  ```
  退出码 0
- **回滚成本：** 还原 garden-defense 三文件

### 6. 回归

- [ ] `npm test`
- **验证：** 退出码 0，≈1 分钟
- **回滚成本：** 整包 S1 文件还原

### 7. 浏览器（阶段 2 证据）

- [ ] 打开 `http://127.0.0.1:4180/prj/games/garden-defense/index.html`
- [ ] 同路两点种植、来一波、不点技能也能看到子弹与僵尸左移
- [ ] 结果回写 `test-report.md` 阶段 2
- **验证：** 人工清单；无控制台报错
- **回滚成本：** 无

## Acceptance（S1）

- [ ] R1–R6、R9 在测试或浏览器上有证据
- [ ] R7/R8 仍标记延期
- [ ] 未 commit（除非用户要求）
