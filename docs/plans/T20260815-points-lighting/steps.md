# steps（当前只细写 S1；S2 待 S1 验收 + 用户确认后补）

> 铁律：步骤 1 是只读侦查，结论写进 `test-report.md` 阶段 0 后才能改文件。
> 所有数值/位置必须来自亲自读代码的实录，禁止从方案文档转抄。

## 步骤 1：只读侦查（不改任何文件）

1. `npm test` 记录基线（用例数、退出码）。
2. `git status` 核对工作区，未提交文件与本包文件域重叠则停（见 execution-check）。
3. 核对 `T20260815-B1-docs-truth` 状态（读其 test-report.md 与 `docs/plans/README.md`）：它是否已验收、是否已改 `docs/data-model.md`。未验收且撞段落 → 停，请示。
4. 文案清单：全仓搜索孩子可见的"打卡"字样（`prj/app.js`、`prj/preschool-achievements.js`、`prj/preschool-workbench/`、config 文案），逐条记录 file:line + 上下文 + 是否被测试断言。**> 20 处被测试断言则停，请示范围。**
5. 记账实录：读 `prj/preschool-garden.js` 向日葵技能与防守 tick 的加阳光代码；读 `prj/child-growth.js` 中 `totalSunlightEarned` 的全部消费方（徽章条件、植物阶段、成长展示），判断方向 A 是否成立。
6. 兑换实录：读 `prj/app.js` `claimReward` 完整逻辑 + `prj/config.js` 奖励表。
7. 以上全部写入 `test-report.md` 阶段 0（含"方向 A/B 建议 + 证据"）。

## 步骤 2：S1-a claimReward 合同测试（锁现状）

1. 新建 `tests/preschool-rewards-claim.test.mjs`，按 R1 四条断言**当前行为**（特征测试，应直接绿；若跑红说明侦查有误，回步骤 1）。
2. `npm test` 全绿后回写 test-report 阶段 1。

## 步骤 3：S1-b 旁路记账裁决落地

- 默认方向 A：向日葵产出保持不进 `totalSunlightEarned`；在 `tests/preschool-garden.test.mjs` 增加锁定断言（技能 +10 与防守 tick +10 都只加 `sunlight`）。
- 若步骤 1.5 证据触发升级条件：停，带证据请示方向 B（补记 `totalSunlightEarned`、不进 `unicorn.xp`），获准后先红后绿。
- 回写 test-report 阶段 2（含裁决记录）。

## 步骤 4：S1-c 点亮文案统一（先红后绿）

1. 按步骤 1.4 清单，先更新断言中文文案的既有测试（改为"点亮"叙事）→ `npm test` 跑红，红的数量应与清单中"被测试断言"条数一致，对不上回查。
2. 改 `prj/app.js` / `prj/preschool-achievements.js` 文案转绿。改动原则：孩子可见处零"打卡"；连续叙事用"连续点亮 N 天""今天已点亮"；地图徽章描述用"完美日"。
3. 真机（浏览器打开幼儿工作台）走查清单每一处，截图归档到 `.tmp-analysis/` 或方案文件夹。
4. 回写 test-report 阶段 3。

## 步骤 5：S1-d data-model 口径节

1. 在 `docs/data-model.md` 增"点亮日 vs 完美日"一节：定义、来源函数、用途、`totalSunlightEarned` 口径（按步骤 3 裁决）。
2. 若 B1 已验收，直接改；否则按步骤 1.3 的协调结论执行。

## 步骤 6：S1 收尾

1. `npm test` 全绿；`git diff` 核对改动面 ⊆ `.meta.yaml` files 列表；确认 `workbench-bridge.js`/`recordAction` 零改动。
2. 回写 `requirements-checklist.md` R1–R5 实现/自测列 + 证据。
3. 同步 `docs/00-总控/当前状态.md` 一行记录；`docs/plans/README.md` 更新本包状态为 `S1-review`。
4. **停：汇报改动清单 + 测试结果，等用户验收并确认是否启动 S2。**

## S2 步骤（占位，待细化）

获用户确认后，按 `task-decomposition.md` S2-a/b/c 细化到本节：先写 `dailyIntensity` 单测（先红），再实现；日历渲染与收集箱分组各配 UI 合同测试；真机截图归档。
