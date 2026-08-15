# T20260815-voxel-remake

> **状态（2026-08-16）：一期 S1–S5 完成；二期 S6–S10 与 S11 清理完成**（46/46 退出码 0，戳 craft-v23，
> 详见 `test-report.md`）。S11 拍板三项仍待确认。二期切片见 `steps.md`，
> 设计依据：`docs/01-方案/工作台小游戏设计/02-方块世界/06-Nick工作台对齐二期方案.md`。
> 按 `docs/plans/templates` 软件开发画像装配。
> 源头：用户拍板（2026-08-15）——「做个游戏文件夹，完全全新的游戏，只是接口兼容，
> 不要在当前游戏基础上修改。美术，内容，布局，都可以重做」。
> 美术参照 [cheyao/2d-minecraft](https://github.com/cheyao/2d-minecraft)（C++23/SDL3，Zlib 许可），
> 玩法参考其 C++ 源码用 JS 从零重写。

## 为什么有这个包

现有 `prj/games/voxel-adventure/` 是在旧横版引擎上外科手术改出来的「网格挖放」，
历史包袱重（选关面板、平台跳跃物理、旧像素贴图体系）。用户看过 2d-minecraft 的画面后
决定：**另起炉灶**——新文件夹、新引擎、新布局，只保留与工作台的接口兼容。

上一轮已把 34 张 zlib 贴图拷进旧游戏并做了热键栏 MC 皮肤（过渡态，见旧游戏
`assets/mc/`）；本包把这些资产**迁移进新游戏**，旧游戏在入口切换前保持原样可回滚。

## 一句话目标

`prj/games/voxel-craft/`：一个 2d-minecraft 观感的全新 Vanilla JS 游戏，
通过既有 bridge / 任务表 / 进度键与工作台无缝衔接，验收后一键切换入口。

## 怎么用

1. 本包是执行控制面；接口契约见 `task.md` §3（重做的边界就是这三张接口表）
2. 引擎规格（从 C++ 源码抽取）见 `steps.md` 附录 A，写码时照抄数值
3. **切片串行**（S1→S5），每片测完回写 `test-report.md`
4. S5 动 `config.js` / `app.js` / 两个测试文件——**并行会话热点，先 grep 再改**
5. 不 commit（除非用户要求）

## 本包文件

| 控制面 | 文件 | 作用 |
|---|---|---|
| 入口 | `task.md` | L2 任务定义 + 接口契约 |
| 核心 | `requirements-checklist.md` | 需求打勾表 |
| 核心 | `steps.md` | S1–S5 切片 + 引擎规格附录 |
| 验证 | `test-plan.md` | 合同测试前移 + 浏览器验收 |
| 验证 | `test-report.md` | 分阶段回写 |
| 验收 | `acceptance.md` | 完成定义 + 回滚预案 |
| Gate | `execution-check.md` | 写码前自检（S5 前必过） |
