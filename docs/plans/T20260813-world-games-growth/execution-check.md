# T20260813 — 执行前确认卡

> 第一次写代码前看这张。未放行不要改 `prj/`。

## 当前任务

- 任务ID：`T20260813`
- 当前阶段：`execute`（仅 S1）
- 对应方案：`docs/工作台小游戏设计/01-花园保卫-落地改造方案.md`

## 本次执行范围

- 计划修改：`prj/preschool-garden.js`、`prj/games/garden-defense/game.js`、`data/stages.js`、`index.html`、`tests/preschool-defense-game.test.mjs`、`tests/world-games.test.mjs`
- 明确不碰：`voxel-adventure`、`platform-quest`、storage key、`app.js` 首页、`#battle` 棋盘

## 输入 / 环境

- 数据：现有幼儿快照；测试自造 growth
- 环境：Node 22、可选 `http://127.0.0.1:4180`
- 高成本：
  - [ ] 更换数据集
  - [ ] 更换方法路线
  - [x] 改动 > 3 个文件（已在 decomposition 声明例外：S1 跨规则+页+测试）
  - [ ] 大批量运行

## 方案落实

- 关键点：接 tickDefense，不 fork PVZ 仓库
- 落实：steps 2–5
- 可能遗漏：stages 字段改名后旧测试若写死 needKills — 执行时搜一遍

## 粒度自检

- [x] 验证命令 ≤10 分钟（npm test ~1 分钟）
- [x] S1 可整块回滚那一组路径
- [x] 禁止顺手改方块/横版
- [ ] 改动 ≤3 文件：否，已记录例外

## 需求分解核对

- [x] 本次对应 R1–R6 R9
- [x] R7/R8 延期
- [x] 不 commit 除非用户要求

## 验证与证据

- 自动：见 `test-plan.md` 命令块
- 手动：花园独立页一关
- 证据：`test-report.md`

## Git 确认卡

- 默认 **不 commit**
- 需要提交时显式 `git add` 上列文件，不用 `git add -A`
- 不把 `docs/plans/old` 当本任务提交范围

## Worktree

- [x] 豁免：单 Agent、当前工作区、无并行写入
- 豁免原因：用户未要求隔离工作树；S2/S3 未同时开工

## 相关 spec（只读这些）

- `docs/工作台小游戏设计/README.md`
- `docs/工作台小游戏设计/01-花园保卫-落地改造方案.md`
- `docs/成长游戏/05-资料生产与版权规范.md`
- 本包 `steps.md` / `acceptance.md` / `test-plan.md`

不要全量注入 `docs/plans/old`。

## 放行

- [ ] 人工确认可以开始改 `prj/`  
- 放行后：把 `.meta.yaml` 的 `status` 改为 `doing`，从 `steps.md` 第 2 步（先红测试）开始
