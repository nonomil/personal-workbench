# T20260814 - 任务定义卡

> 模式：L2 轻量（跨代码文案 / 素材 / 文档 / 人工验收，但每步小、串行）
> 执行策略：CLOSED 串行。S1 → S2（需确认）→ S3。不开 fleet。

## 0. 领域画像

- 主画像：软件开发（参考 `docs/plans/templates/profiles/software-dev.md`）
- 次画像：文案与素材治理（商标边界、删除门控）

## 1. Loop 类型判断

- [x] CLOSED 单 Agent：偏离点明确、每步有命令或浏览器证据
- [ ] CLOSED Fleet
- [ ] OPEN 转 CLOSED

## 2. 动机自检

- [x] 加速已理解的执行：审查已完成，偏离点全部有 file:line 证据
- [x] 不是用流程回避理解：voxel 运行时已 quest 驱动，只差外壳文案

## 3. 目标与背景

- 一句话目标：对外身份与版权边界全部对齐设计裁决，徽章验收留档。
- 背景：2026-08-14 审查发现 4 处偏离（见 README 摘要表）；徽章系统 DS 六问题中 5 项已修、唯「真机 17 项验收」无记录。
- 历史约束：一份阳光账本（`petbank_huchuliang_preschool_workbench_state_v1`）、Vanilla JS、bridge 协议不动。
- 兼容要求：voxel `questsDone[]` / `clearedLevels[]`、platform `clearedLevels[]`/`stars{}` 键名保持可读。

## 4. 为什么是 L2 而不是 L1

跨四个性质不同的面（游戏页文案、启动器文案、素材删除、人工验收清单），且 S2 有删除门控、S3 依赖真人设备。但每步独立可验、总量约 1 人日，L3 loop-spec 过重。

## 5. 子任务

见 `task-decomposition.md`。当前只执行 **S1 对外身份改口与文档修订**。

## 6. 边界

**只改（S1）：**
- `prj/games/voxel-adventure/index.html`（静态文案）
- `prj/index.html`（启动器 5 处商标词）
- `tests/world-games.test.mjs`（合同断言）
- `docs/01-方案/学习项目设计/01-落地分析-识字与字卡.md`（笔顺行修订）
- `docs/01-方案/优化方案2/幼小衔接工作台-方案文档/03-伙伴与激励/02-徽章与券.md`（券裁决标注）

**不碰：** `game.js` 游戏逻辑、`workbench-bridge.js`、localStorage key、花园世界、徽章判定逻辑（已验收为正确）。

**明确不做（另开包）：** 英语词库补 500（工作区已在推进）、专注模块舒尔特/数独、音频预生成工厂、PWA。

**禁止顺手优化：** voxel 关卡几何重构、启动器视觉改版、徽章重命名。

## 7. 验收（整体）

- [ ] S1：三处文案合同测试绿 + 两处文档修订 + npm test 全绿
- [ ] S2：删除素材后三世界浏览器无 404、manifest 同步
- [ ] S3：徽章 17 项验收记录归档至 `test-report.md` 并同步 `docs/00-总控/当前状态.md`

## 8. 升级触发

- 若 voxel 文案改口牵出 `game.js` 必须改逻辑 → 停，开 change-request，回 T20260813 体系
- 若删除素材导致运行时 404 → 还原删除，重新核对引用清单
- 若真机验收发现徽章判定 bug → 单独记 defect，不与本包文案混做
