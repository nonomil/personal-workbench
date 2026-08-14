# T20260815-B1 - 任务定义卡

> 模式：L1 轻量（纯文档 + 1 个测试文件，串行半日）
> 执行策略：CLOSED 单 Agent，单阶段。

## 0. 领域画像

- 主画像：软件开发（参考 `docs/plans/templates/profiles/software-dev.md`）
- 次画像：文档治理（文档与代码对数）

## 1. Loop 类型判断

- [x] CLOSED 单 Agent：偏离点全部有 file 级证据，每步有命令或 diff 证据
- [ ] CLOSED Fleet
- [ ] OPEN 转 CLOSED

## 2. 动机自检

- [x] 加速已理解的执行：2026-08-15 盘点已完成，5 处偏离全部定位
- [x] 不是用流程回避理解：唯一不确定点（refresh 测试当前红绿状态）在步骤 1 侦查

## 3. 目标与背景

- 一句话目标：让课程/学习相关文档说的与代码做的完全一致。
- 背景：`docs/01-方案/2026-08-15-学习内容体系优化/01-现状盘点.md` 三、四节；卡片墙已实现但方案头部仍"待实施"；课程合同层数值停在旧版。
- 历史约束：一份阳光账本（`petbank_huchuliang_preschool_workbench_state_v1`）；文档不得宣称未实现功能；历史文档（99-归档/plans/old/handoff）旧表述不回改。

## 4. 为什么是 L1

改动面全是 markdown + 1 个测试文件的断言；无 storage、无产品逻辑、无素材；总量约半人日。

## 5. 子任务

不拆。见 `steps.md` 七步。

## 6. 边界

**只改：**
- `docs/01-方案/2026-08-15-学习专区卡片墙布局方案.md`（头部状态块）
- `tests/preschool-workbench-refresh.test.mjs`（course-directory → 卡片墙断言）
- `docs/02-课程/幼儿课程方案/README.md`（每日任务数表述）
- `docs/02-课程/幼儿课程方案/00-总控/数据与奖励合同.md`（数值对数）
- `docs/02-课程/识字/01-课程总方案.md` + `docs/02-课程/幼儿课程方案/01-识字/识字分方案.md`（识字目标）

**不碰：** `prj/` 全部产品代码、其余测试文件、`docs/data-model.md`（数值以它和代码为准，本包只改课程侧文档向它看齐）、历史归档文档。

**明确不做（属 B2/B3 包）：** 任何功能改动、错题回流、兑换流程。

**禁止顺手优化：** 重写整份奖励合同结构、给骨架学科补内容、调整卡片墙样式。

## 7. 验收（整体）

- [ ] 5 处偏离全部修订且有 diff/grep/测试证据
- [ ] `node --test tests/preschool-workbench-refresh.test.mjs` 退出码 0
- [ ] `npm test` 退出码 0，`git status` 无产品代码改动

## 8. 升级触发

- 若对数时发现**代码内部**数值自相矛盾（如 bridge 与 app.js 口径不同）→ 停，记 test-report，问用户裁决，不顺手改代码
- 若 refresh 测试改断言时发现卡片墙实现本身有 bug → 单独记 defect，本包只对齐断言，不修实现
- 若"每天 N 项"侦查发现 config.js 与综合改进规划也不一致 → 以代码为准改文档，并在 test-report 标注规划文档待修
