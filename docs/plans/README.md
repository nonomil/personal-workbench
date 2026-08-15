# 日期型计划

这里保存按日期产生的设计稿、实施草案和历史决策，便于追溯，不作为当前进度来源。

## 当前执行

- 产品方案：`docs/01-方案/工作台小游戏设计/`
- 任务包（按 templates 装配）：[`T20260813-world-games-growth/`](./T20260813-world-games-growth/README.md)
- 审查整改包（2026-08-14 审查结论）：[`T20260814-audit-remediation/`](./T20260814-audit-remediation/README.md)
- 学习内容体系优化批次（源头 `docs/01-方案/2026-08-15-学习内容体系优化/`，建议顺序 B1→B2→B3→B4）：
  - [`T20260815-B1-docs-truth/`](./T20260815-B1-docs-truth/README.md) 文档回真（P0，review 已执行待用户验收；当前 npm test 269/269、refresh 54/54，保留并行工作树，见其 test-report）
  - [`T20260815-B2-practice-review/`](./T20260815-B2-practice-review/README.md) 六项接练习 + 错题回流（P0，in-progress：S1+S2 代码/假时钟绿，浏览器走查待验收）
  - [`T20260815-B3-reward-loop/`](./T20260815-B3-reward-loop/README.md) 奖励闭环四件套（P1，blocked 等 B2）
  - [`T20260815-B4-content-deepening/`](./T20260815-B4-content-deepening/README.md) 内容深化（P2，deferred 按需启动）
- 词库统一与素材接入（源头 `docs/03-研究与参考/词库整理/` 三份分析文档）：
  - [`T20260815-vocab-unify/`](./T20260815-vocab-unify/README.md) WordQuest 重叠素材提取（108 图 + 33 音频）+ 统一 schema v1 + 统一媒体接口 + Minecraft 独立兴趣词库第一批 324 词（P1，pending；S1→S2→S3→S5 门控，S4 音频生成等用户拍板）
- 学习专区中间层改版（源头 `docs/01-方案/2026-08-15-学习专区中间层改版方案.md`，卡片墙改版的后续）：
  - [`T20260815-course-middle-layer/`](./T20260815-course-middle-layer/README.md) 墙卡今日预览 + classic 拆为更多练习菜单 + 家长详情折叠（P1，review 已执行待用户验收；npm test 275/275，未 commit）
- UI 柔光优雅改造（阶段 1 幼儿版三皮肤 + 阶段 2 儿童/成人版，色值定稿见 `.tmp-analysis/theme-demo-v3.html` / `theme-demo-v2.html`）：
  - [`2026-08-15-纸感柔光UI改造方案.md`](./2026-08-15-纸感柔光UI改造方案.md) 三皮肤配色收敛（花园雾绿/方块柔紫/闯关弃红改蜂蜜奶黄）+ 世界素材低透明背景嵌入 + 缓存戳与合同测试（阶段 1 已执行）；阶段 2 儿童晴空蓝/成人墨绿+黄铜细案见其 §7（已确认执行）
- 积分打卡优化批次（源头 `docs/01-方案/2026-08-15-积分打卡优化/` + D-011）：
  - [`T20260815-points-lighting/`](./T20260815-points-lighting/README.md) 点亮口径统一 + 账本补漏 + 兑换合同测试 + 热力图/徽章统一展示（P0，**S1-review** 待用户验收；S2 门控在 S1 验收后）
  - [`T20260815-points-hints/`](./T20260815-points-hints/README.md) 还差一点提示 + 学习专区余额（P1，blocked 等 points-lighting S1 与 B2；轻量待启动包）
- 三游戏优化包（2026-08-15 分册方案落地，推荐按序执行，不并行）：
  1. [`T20260815-garden-optimize/`](./T20260815-garden-optimize/README.md) 花园：playMods + 结算三行 + 星芒陪伴
  2. [`T20260815-voxel-optimize/`](./T20260815-voxel-optimize/README.md) 方块：周报总数 bug + 结算三行 + 升段仪式（唯一动 bridge 的包）
  3. [`T20260815-platform-optimize/`](./T20260815-platform-optimize/README.md) 横版：碰撞债清偿 + 手感锁定 + playMods + 结算三行
  - 素材生产归属：三包一律"占位不阻塞"，正式素材由用户另行发起生图会话（清单见各游戏分册 `02-美术与资产方案.md`，管线走 `.cursor/skills/game-asset-pipeline`）；素材门控切片（花园 G5、方块 V4 图标等）在素材就绪前保持 `延期`，不算缺失
- 方块世界 JS 完全重做（用户拍板 2026-08-15：新文件夹全新游戏、只保接口兼容；美术参照 cheyao/2d-minecraft，zlib 贴图已备）：
  - [`T20260815-voxel-remake/`](./T20260815-voxel-remake/README.md) 新建 `prj/games/voxel-craft/`（MC 贴图 + 挖掘裂纹 + 热键栏 + 合成/熔炉），GAME_ID/进度键/发奖口径不变，入口已切至新游戏（**review 待用户验收**；旧游戏保留为回滚兜底，遗留决策见其 test-report）
- 历史日期稿：`old/`（不叠加）
- 模板本身：`templates/`（只复制需要的卡，不要一次生成全部）

## 新任务怎么建包

1. 看 `templates/README.md` 的 5 类公开控制面，画像用 `templates/profiles/software-dev.md`
2. 新建 `docs/plans/T日期-短名/`，最少：`task.md`、`requirements-checklist.md`、`steps.md`、`acceptance.md`、`test-plan.md`、`test-report.md`
3. 有多来源需求再加 `requirements-source.md` + `source-requirements-alignment.md`
4. 要拆子任务再加 `task-decomposition.md`
5. 写代码前加 `execution-check.md`
6. **不要**为了整齐把 loop-spec / 四张 Gate / handoff 空卡先铺上

## 使用规则

- 当前主目标只看 [项目总控/进度看板](../00-总控/进度看板.md)。
- 计划执行前先检查 [当前状态](../00-总控/当前状态.md)，避免在过期基线上继续实施。
- 计划完成后，把最终结论、证据和未完成项同步到 `docs/00-总控/` 或对应稳定方案目录。
- 同一主题出现多份日期计划时，以最新决策记录和代码事实为准，不自动叠加全部要求。
