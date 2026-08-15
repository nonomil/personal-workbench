# T20260815-VR — 需求分解打勾确认表

状态：`待确认` / `OK` / `缺失` / `待补证据` / `不适用` / `延期` / `待用户确认`

| ID | 需求点 | 来源 | 计划测试阶段 | 验证命令 | 预计时长 | 测试证据 | 人工确认 | 最终验收 | 备注 |
|---|---|---|---|---|---|---|---|---|---|
| R1 | 新文件夹 `prj/games/voxel-craft/` 独立成游戏，旧 `voxel-adventure/` 零改动（S5 前） | 用户指令 | S1 | `git status` 不含旧文件夹 | — | | | | 可回滚性的根 |
| R2 | 世界模块纯函数化（生成/挖/放/门禁/任务判定），node 直测 | 工程前移 | S1 | `node --test tests/voxel-craft.test.mjs` | 3h | | | | 仿 VoxelWorld API 形状但全新实现 |
| R3 | 贴图渲染：MC 16×16 方块/物品贴图 + 最近邻放大 + 挖掘 destroy_stage 0-9 裂纹 | 用户美术要求 + 2d-minecraft | S2 | 浏览器目检 + 资产存在断言 | 4h | | | | assets/mc 已备 34 张 |
| R4 | 玩家物理侧视横版：走/跑/跳/重力，AABB 网格碰撞（数值见 steps 附录 A） | 2d-minecraft physicsSystem | S2 | 浏览器手感 + 常量断言 | 3h | | | | 幼儿手感需调参 |
| R5 | 热键栏（9 格，1-9 键 + 点选）+ E 键背包面板，MC 风皮肤 | 2d-minecraft ui | S2 | 浏览器 + DOM 断言 | 2h | | | | |
| R6 | 工具门禁 = 段位门禁（rank1-2 木镐 / rank3 石镐 / rank5 晶体），提示文案 | 01-玩法优化方案 P0 | S2 | 纯函数断言（S1 写好） | 2h | | | | 对齐 MINING_LEVEL |
| R7 | 任务桥：quest/daily 判定 → awardSunlight（eventKey 口径不变）→ 结算三行 | 接口契约 3.1/3.2 | S3 | 复用 world-games-growth 断言模式 | 3h | | | | |
| R8 | 升段仪式卡 + 星芒 HUD + getPlayMods 接入 | 接口契约 + 总纲 | S3 | 断言 + 浏览器 | 2h | | | | |
| R9 | 合成台（2×2 起步）+ 熔炉（燃料/产物/进度）面板 | 2d-minecraft crafting/furnace | S4 | 纯函数断言 | 4h | | | | 配方可重设计 |
| R10 | 家园快照写 progress（<8KB） | 接口契约 3.2 | S4 | 体积断言 | 1h | | | | |
| R11 | 入口切换：config.js voxel 入口 → voxel-craft；app.js 嵌入路径同步；主题参数透传 | 接口契约 3.3 | S5 | `npm test` + 工作台实点 | 2h | | | | **并行热点，先 grep** |
| R12 | 旧测试改口：world-games*.test.mjs / voxel-world.test.mjs 路径断言指向新游戏，语义不变 | 工程 | S5 | `npm test` 相关文件退出码 0 | 2h | | | | voxel-world.test.mjs 改口或归档 |
| R13 | 版权护栏：无 steve.png、无 Minecraft 商标字样、mc/ README 署名 | 仓库纪律 | S5 | allowlist 测试 + grep | 30min | | | | |
| R14 | 回归：本包涉及测试文件全绿；全量差异逐条归属并行会话 | 工程 | S5 | `npm test` | 10min | | | | 基线本有并行失败 |

## 二期需求（2026-08-16 装配，依据 06-Nick工作台对齐二期方案）

| ID | 需求点 | 来源 | 计划阶段 | 验证命令 | 测试证据 | 人工确认 | 最终验收 | 备注 |
|---|---|---|---|---|---|---|---|---|
| R15 | 家园展示卡在 voxel 主题首页不折叠可见（renderPreschoolVoxelHomeCard 提级） | Nick 视频「被看见」+ 03-成长陪伴册 §2 | S6 | 源码断言 + 浏览器目检 | | | | app.js 并行热点 |
| R16 | 升段材料奖励包（rank2–5 发放表 + 防重复 + 旧档补领） | Nick 视频 Level Rewards | S7 | `node --test tests/voxel-craft.test.mjs` | | | | |
| R17 | 音效补全：挖矿/跳跃/合成/购买接 game-sfx | test-plan 浏览器清单 | S8 | 源码断言 + 听感 | | | | |
| R18 | 移动端：390px 溢出修复 + 触屏挖掘环形进度 | test-plan 浏览器清单 | S9 | 390px 目检 | 源码断言绿 | | | 视口目检待人工 |
| R19 | 矿洞 biome：rank4 门禁 + 双 biome 独立存档 + 氛围渲染 | 01-玩法优化册 §5 + Nick 视频「下矿」 | S10 | 生成/存档 round-trip 断言 | 46/46 退出码 0 | | | 不做怪物（定位裁决见 06 方案 §5） |
| R20 | 调试残留清零（__vcDebug/坐标帧计数/BOOT sentinels） | HANDOFF §6 | S11 | grep 为零 | 源码断言绿 | | | 拍板三项未执行 |

## 人工补充区

- [ ] 隐藏约束：不 commit（除非用户要求）
- [x] 铁镐线：已砍（无铁矿+熔炼闭环；木→石→晶体）
- [x] 旧游戏去留：裁决为**冻结不删**——`world-games` / `voxel-world` / `play-mods` 仍合同旧目录；横版地砖已迁到 `games/shared/pixel-tiles.js`
- [x] MC 贴图正式发布：仓库保留、不对外发布（`assets/mc/README.md` 已写口径）
