# 日期型计划

这里保存按日期产生的设计稿、实施草案和历史决策，便于追溯，不作为当前进度来源。

## 当前执行

- 产品方案：`docs/01-方案/工作台小游戏设计/`
- 任务包（按 templates 装配）：[`T20260813-world-games-growth/`](./T20260813-world-games-growth/README.md)
- 审查整改包（2026-08-14 审查结论）：[`T20260814-audit-remediation/`](./T20260814-audit-remediation/README.md)
- 学习内容体系优化批次（源头 `docs/01-方案/2026-08-15-学习内容体系优化/`，建议顺序 B1→B2→B3→B4）：
  - [`T20260815-B1-docs-truth/`](./T20260815-B1-docs-truth/README.md) 文档回真（P0，review 已执行待用户验收；当前 npm test 269/269、refresh 54/54，保留并行工作树，见其 test-report）
  - [`T20260815-B2-practice-review/`](./T20260815-B2-practice-review/README.md) 六项接练习 + 错题回流（P0，in-progress：S1+S2 代码/假时钟绿，浏览器走查待验收）
  - [`T20260815-B3-reward-loop/`](./T20260815-B3-reward-loop/README.md) 奖励闭环四件套（P1，in-progress：S1–S4 代码已绿，浏览器走查待做）
  - [`T20260815-B4-content-deepening/`](./T20260815-B4-content-deepening/README.md) 内容深化（P2，in-progress：C1–C4 已落地，真照片图配字等素材）
- 识字体验升级（源头 `docs/01-方案/学习项目设计/04-识字体验升级方案.md`，参考小书虫识字）：
  - [`T20260816-literacy-uplift/`](./T20260816-literacy-uplift/README.md) 识字量测评 + 错字本字卡化/打印 + 成长档案曲线 + 首页三大卡 + 视觉素材增量（P1，**review**；识字定向 18/18，V1–V3 与 Codex 浏览器链路已验收；全仓 npm test 468/475，7 项范围外既有失败）
- 认单词优化（源头 `docs/01-方案/学习项目设计/DS--认单词--参考方案.md` + 外部打BOSS单词游戏参考，裁决见包内 requirements-checklist）：
  - [`T20260816-english-word-uplift/`](./T20260816-english-word-uplift/README.md) 客观题型（听音选图/看图选词）+ 英语错词本三分类 + 词汇档案成长曲线 + 80 词 SVG 补齐 + 单词BOSS小游戏（P1，**in-progress**：S1–S5 代码已绿，浏览器关键路径已走，未标 accepted；S4 未走 grok）
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
- 3D 单词战斗游戏「方块传奇」（用户拍板 2026-08-15：参考小红书 blocklegend，新建独立游戏不动 voxel-craft）：
  - [`T20260815-blocklegend-3d/`](./T20260815-blocklegend-3d/README.md) 新建 `prj/games/blocklegend/`（首版 S1–S6，待手玩验收）
  - [`T20260815-blocklegend-sim/`](./T20260815-blocklegend-sim/README.md) 薄商店 + 放置手（源头 `docs/01-方案/工作台小游戏设计/05-方块传奇/`，P1，**in-progress**）
  - [`T20260816-blocklegend-mc-polish/`](./T20260816-blocklegend-mc-polish/README.md) 画面对齐成熟体素项目：Fable5-mc 图集画法/顶点 AO/挖掘裂纹 + dgreenheck 流式区块、世界 128×128（P1，**review** 待手玩；参考仓已浅克隆 `tmp/voxel-refs/` 不入库）
- Echo Loop（AGPL）借鉴批次（可参考源码但不复制代码；分析包 + 三个执行包，用户拍板 2026-08-19：mastery 间隔走方案 A 双轨）：
  - [`T20260819-echoloop-borrow/`](./T20260819-echoloop-borrow/README.md) 方案分析包（**已完成**；含机制提炼、AGPL 口径、04 参数速查）。`Echo-Loop-main/` 已 gitignore 留本地参考
  - [`T20260819-E1-speech-match/`](./T20260819-E1-speech-match/README.md) 共享跟读评测引擎（lemma+LCS 覆盖率+分场景阈值，接 Boss speak/练一句/跟读题；P0，**review**：S1–S3 代码已绿，手玩/独立仓未做）
  - [`T20260819-W1-mastery-uplift/`](./T20260819-W1-mastery-uplift/README.md) 工作台调度升级方案 A（S1–S3 代码已绿，未手玩；不标 accepted）
  - [`T20260819-E2-review-gate/`](./T20260819-E2-review-gate/README.md) 方块传奇复习之门+今日冒险+E3 切片（S1–S4 代码已绿，未手玩；独立仓未推）
  - [`T20260819-E4-scene-loop/`](./T20260819-E4-scene-loop/README.md) 句子跟读关（练一句三遍循环，代码已绿，未手玩）
  - 完整测试步骤：[`T20260819-echoloop-borrow/05-完整测试方案.md`](./T20260819-echoloop-borrow/05-完整测试方案.md)
- 英语词包切换 + 多科配菜优化（源头 2026-08-19 各科题库接入分析；MC 324 词包零消费者是主发现）：
  - [`T20260819-bank-switch-uplift/`](./T20260819-bank-switch-uplift/README.md) 家长页切生活/MC 词包 + 欠账 toast 指路老师 + 卡片墙显示游戏练习量 + 村庄碎词收敛（P0–P2，**review**：S1–S4 代码已绿，S5 手玩未做，不标 accepted）
- 地下城式关卡循环 + 单词记忆状态（源头 `docs/01-方案/工作台小游戏设计/05-方块传奇/07-地下城式关卡与ANKI复习优化.md`，与 E2 共用词账本）：
  - [`T20260819-dungeon-anki-uplift/`](./T20260819-dungeon-anki-uplift/README.md) 词级 Leitner 5 盒+词力 → 重玩三档难度 → 词卷轴隐藏关+营地 → 难词补救（P0/P1，**review**：D1–D4 代码已绿，未手玩，独立仓未推）
- 《什么是真正的工作台》对照整改（只改三套工作台，不改独立游戏）：
  - **主包** [`T20260815-工作台对照整改/`](./T20260815-工作台对照整改/README.md) W1–W3 已落地待手点（**review**；合同 16/16）
  - 偏题包 [`T20260815-真正的工作台整改/`](./T20260815-真正的工作台整改/README.md) 误把 P1 做成 blocklegend 词学回流；代码已在、不算本轮工作台目标
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
