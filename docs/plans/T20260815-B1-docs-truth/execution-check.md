# execution-check — T20260815-B1（动手前过一遍）

## 基线确认

- [ ] `npm test` 退出码 0，记录当前测试数作为基线
- [ ] 已读 `docs/00-总控/当前状态.md`，不在过期基线上实施
- [ ] 已读 `docs/01-方案/2026-08-15-学习内容体系优化/00-README.md` 前置决策五条

## 工作区处置（阻塞项）

- [ ] `git status` 确认未提交文件清单及是否与本包文件域重叠（本包文件域：5 个 md + 1 个测试）
- [ ] 核对 `T20260815-s1-debts` 包进度：其 R4 会补全 `docs/data-model.md` 缺失字段（growth.achievements 等）。本包 R4 奖励对数以**代码为第一基准**、data-model 为辅；若 s1-debts 已完成，对数时顺带核对新登记字段口径一致
- [ ] 若重叠 → 问用户：先提交在途进展（推荐）还是混行
- 未确认前不写任何文件。

## 范围自查

- [ ] 只改 `.meta.yaml` files 列出的 6 个文件
- [ ] 步骤 1 侦查未完成前，不改任何文档数值
- [ ] 明白"以代码为准"：所有改定值来自 `prj/` 实读，规划/探查文档只是线索

## 回滚预案

- 全部文件可 `git checkout -- <file>` 还原；无删除类操作、无 storage 变更

## 放行结论

- [x] **放行（2026-08-15，用户裁决后）。**

过程记录：首次门控**不放行**，事实如下：
1. `npm test` 基线**红**：253 项中 7 项失败，全部位于 `tests/world-games.test.mjs`（断言 garden `game.js` 应含 `USE_PLAY_MODS` / `applyPlayMods` / `advanceMoveClocks` / `buildSettlementLines` 等运行时代码，实读缺失）。该文件域与本包无交集；不处理则本包 R6（`npm test` 退出码 0）无法达成。
2. `git status` 与本包 6 文件域**全部重叠**：
   - `tests/preschool-workbench-refresh.test.mjs`：有未提交修改，且**已包含 R2 的断言迁移**（course-directory → course-wall/course-today、缓存戳 `20260815-course-wall-v1` / `20260815-streak-v1`）；工作树实跑 `node --test` 52/52 通过、无 `course-directory` 残留。
   - 5 个文档文件均为未提交状态（A/AM/未跟踪）：R1/R3/R4/R5 均未在途完成。
3. 全仓另有大量与本包无关的未提交改动（文档重组、素材移动、streak/allowlist 在途工作等）。

**用户裁决（2026-08-15）：**
- A. 在途进展处置：**先提交**——已执行，基线 commit `ebc5592`（含文档编号重组、素材移动、R2 断言迁移、asset-allowlist/streak 在途测试；B1 包目录按设计留在提交外）。提交后工作树仅余 B1 包目录未跟踪。
- B. world-games 7 个红测试：**记录基线后放行**——基线 246/253；本包 R6 口径调整为「除既有 7 个 world-games 失败外无新增失败，且 `node --test tests/preschool-workbench-refresh.test.mjs` 退出码 0」；缺陷已登记 test-report 遗留区，不在本包修。
