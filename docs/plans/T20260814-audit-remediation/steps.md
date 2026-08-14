# T20260814 — S1 对外身份改口与文档修订

> 优先级：P0 | 状态：pending | 前置：execution-check 放行 + 工作区处置（步骤 1）
> 只执行 S1。S2/S3 不写进本页当正在做。
> 验证以退出码为准：`exit 0` 通过。

## 目标

方块世界页面以「任务 + 挖放」自述，启动器无任何 Minecraft / Mario 商标词，两处过时文档修订，合同测试守护。

## Steps

### 1. 处置工作区（R8）

- [ ] `git status` 确认 18 个未提交文件清单
- [ ] 问用户：先提交现有进展（推荐），还是本包改动与在途改动混在工作区
- **验证：** `git status` 输出已确认归属；`npm test` 退出码 0（基线 202 项）
- **回滚成本：** 无写入

### 2. 确认 voxel 运行时行为（决定文案，不改代码）

- [ ] 读 `prj/games/voxel-adventure/game.js`：确认 `quest-title`、`message-tip`、`关卡` 区三处由 JS 填什么（quest 标题？levels 卡？）
- [ ] grep `keydown|space|jump`：确认是否仍有跳跃输入（决定 footer 是否保留「空格」提示）
- **判定：**
  - `关卡` 区若由 quests 渲染 → h2 改「任务墙」
  - `关卡` 区若仍由 `levels.js` 渲染 → 本步**只改**横版/走到出口/空格相关文案，「任务墙」改名升级 change-request（见 task.md §8）
- **验证：** 无命令，结论写进 test-report 阶段 1
- **回滚成本：** 无写入

### 3. 合同测试先红（R4）

- [ ] `tests/world-games.test.mjs` voxel 段新增：
  - voxel `index.html` `doesNotMatch /横版过关|走到出口|空格跳跃/`
  - voxel `index.html` 匹配 `任务` 与 `挖矿|放置`
- [ ] 新增对外商标合同（放 world-games 或 project-layout）：
  - `prj/index.html` 与三个 `prj/games/*/index.html` 均 `doesNotMatch /我的世界|Minecraft|马里奥|Mario/`
- **验证：** `node --test tests/world-games.test.mjs` — **先非 0**（红）
- **回滚成本：** 还原该测试文件

### 4. voxel index.html 改口（R1）

参考替换（以步骤 2 结论为准）：

| 位置 | 现文案 | 改为 |
|---|---|---|
| `:16` quest-title 兜底 | 横版过关 · 走到出口 | 今日任务 · 挖一挖、放一放 |
| `:40` message-tip | 点击挖矿 \| 右键/长按放置 \| 走到出口 | 点击挖矿 \| 右键/长按放置 \| 完成任务领阳光 |
| `:48` footer | 横版过关 — WASD 移动 \| 空格跳跃 \| … \| 走到出口 | 方块世界 — WASD 移动 \| 点击挖矿 \| 右键/长按放置 \| 完成任务领阳光（若步骤 2 查明无跳跃，去掉空格项） |
| `:51` h2 | 关卡 | 任务墙（仅当 quests 渲染；否则不动，记 change-request） |

- [ ] `title`/`h1` 已是「方块世界」，不动
- **验证：** `node --check` 不适用（HTML）；步骤 3 测试转绿
- **回滚成本：** 还原 index.html

### 5. 启动器去商标词（R2）

`prj/index.html` 六处（158/159/162/163/192/193 行附近）：

| 现 | 改 |
|---|---|
| alt 我的世界式的方块山谷、基地和原创探险者 | 方块山谷、基地和原创探险者 |
| h2 我的世界式方块探险 | 方块世界探险 |
| alt 马里奥式的原创横版平台闯关场景 | 原创横版平台闯关场景 |
| h2 马里奥式横版闯关 | 横版闯关 |
| themeTitles voxel 我的世界式方块探险 | 方块世界探险 |
| themeTitles platform 马里奥式横版闯关 | 横版闯关 |

- **验证：** `grep -n "我的世界\|马里奥\|Minecraft\|Mario" prj/index.html` 无输出（退出码 1）
- **回滚成本：** 还原 index.html

### 6. 文档修订（R3）

- [ ] `docs/01-方案/学习项目设计/01-落地分析-识字与字卡.md` §1 表「165 字笔顺」行：裁决列由「按未实现处理」改为「**已实现**：`prj/preschool-literacy-strokes-data.js`（165 字，yxj-workbench 子集，Make Me a Hanzi 兼容）」；§10 本仓库现状行补该文件
- [ ] `docs/01-方案/优化方案2/幼小衔接工作台-方案文档/03-伙伴与激励/02-徽章与券.md` 游戏券节首加裁决注记：
  > 裁决（2026-08-14）：本仓不实现券系统，趣味短局以学习阳光代替（`workbench-bridge.js` 日上限 80 + eventKey 去重）。依据 `docs/01-方案/工作台小游戏设计/README.md`。下文保留为原始建议存档。
- **验证：** 人工 diff review；不跑测试
- **回滚成本：** 还原两个 md

### 7. 回归

- [ ] `node --test tests/world-games.test.mjs tests/project-layout.test.mjs`
- [ ] `npm test`
- **验证：** 退出码 0（预期 202+新增）
- **回滚成本：** 整包 S1 文件还原

### 8. 浏览器（阶段 2 证据）

- [ ] `http://127.0.0.1:4180/prj/games/voxel-adventure/index.html`：页面自述为任务/挖放；无「横版过关」字样；任务进度可推进
- [ ] `http://127.0.0.1:4180/prj/index.html`：两张卡片无商标词，图片正常
- [ ] 控制台无报错；结果回写 `test-report.md` 阶段 2
- **回滚成本：** 无

## Acceptance（S1）

- [ ] R1 R2 R3 R4 R7 有测试或浏览器证据
- [ ] R5（S2）待用户确认、R6（S3）未开始——不是遗忘
- [ ] 未 commit（除非用户要求）
