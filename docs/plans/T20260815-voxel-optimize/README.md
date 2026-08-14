# T20260815-voxel-optimize

> 按 `docs/plans/templates` 软件开发画像装配，仿 `T20260814` 惯例。
> 源头：`docs/01-方案/工作台小游戏设计/02-方块世界/` 分册（2026-08-15）+ 总纲。

## 为什么有这个包

方块世界是三游戏中账本联动最好的（唯一已接 `getPlayMods`），但有一处**数据不一致 bug**和两处体验缺口：

| # | 缺口 | 级别 |
|---|---|---|
| 1 | `getWeeklyReport` 里方块世界总数硬编码 8，实际生涯任务 12 个——家长周报进度条虚高 | P0 bug |
| 2 | 任务完成结算无长线进度与下一目标（总纲三行规范） | P0 |
| 3 | rank 升段只是数字变化，无仪式感；星芒零出场 | P0 |

S2（二期）：V4 工具等级挖矿门禁、V5 蓝图任务、V6 家园快照+工作台展示、V7 大师任务 q13–q18——见分册 `01-玩法优化方案.md` 与 `04-落地路线与验收.md`。

## 怎么用

1. 产品方案（只读）：`docs/01-方案/工作台小游戏设计/02-方块世界/` 四份编号文档 + 总纲
2. 本包是执行控制面；只执行 S1（V1→V2→V3）
3. **V1 动 `workbench-bridge.js`**（三游戏共享文件）：只改 `getWeeklyReport` 的 labels 显示层，其余任何函数不碰；改完必须跑全量测试
4. 每阶段测完回写 `test-report.md`
5. 星芒像素小像未就绪时用 `voxel-companion` 现有图占位

## 本包文件

| 控制面 | 文件 | 作用 |
|---|---|---|
| 入口 | `task.md` | L2 任务定义 |
| 核心 | `requirements-checklist.md` | R1–R9 跨阶段打勾 |
| 核心 | `steps.md` | **当前只写细 S1（V1–V3）** |
| 核心 | `acceptance.md` | 算不算过 |
| 验证 | `test-plan.md` | 怎么测 |
| 验证 | `test-report.md` | 执行后填 |

**刻意不生成：** requirements-source、task-decomposition、loop-spec、handoff、execution-check（开工时按 `templates/` 复制）。

## 与其他包的关系

- 推荐顺序：T20260815-garden-optimize → **本包** → T20260815-platform-optimize。
- 本包 V1 是唯一的 bridge 改动点；garden/platform 包不动 bridge，避免共享文件冲突。
- V6（S2）会改 `prj/app.js` 成长页——与工作台学习专区改版（`docs/01-方案/2026-08-15-学习专区卡片墙布局方案.md`，待实施）可能同文件，展开 S2 前先确认该方案实施状态。

## 当前状态

- 任务 ID：`T20260815-VX`
- 状态：`pending`
- 执行顺序：S1（V1→V2→V3 串行）→ S2（V4→V5→V6→V7）
