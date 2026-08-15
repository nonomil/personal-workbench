# T20260816-blocklegend-mc-polish · 方块传奇画面对齐成熟体素项目

> 优先级：P1 | 状态：review（S1–S5 代码已绿，待手玩） | 创建：2026-08-16
> 源头：`docs/01-方案/工作台小游戏设计/05-方块传奇/` + 三个参考仓分析（见 task.md）
> 一句话：把 Fable5-mc 的贴图画法、顶点 AO、挖掘裂纹，和 dgreenheck 的按玩家半径流式加载，移植进 blocklegend 引擎，让世界从「彩色盒子」升到「像 MC」，同时地图扩到 128×128。

## 参考仓（已浅克隆到 tmp/voxel-refs/，gitignore 内，不入库）

| 仓库 | 抄什么 | 不抄什么 |
|---|---|---|
| `Fable5-mc`（AI 一句话生成的完整 clone） | `src/textures.js` 瓦片画法（草侧锯齿边、石头横纹、原木年轮、树叶孔洞）；`src/mesher.js` 顶点 AO + 面向亮度 + quad 翻转；裂纹遮罩思路 | 无限世界、水、火把光、生物群系、音频（超出 MuMu 性能预算与本期范围） |
| `dgreenheck/minecraft-threejs-clone`（engine.js 已引用它的遮挡裁剪） | `scripts/world.js` drawDistance 半径加载/卸载区块的调度 | InstancedMesh 按方块类型分 mesh（我们合批面片更省 draw call）；外置 PNG 贴图（禁外部素材） |
| `twilson63/voxel` | 无新增（画法比我们现状还简单，仅作对照） | 全部 |

## 分期

| 切片 | 交付 | 消费者 |
|---|---|---|
| S1 | 图集细化：草/土/石/三种原木/叶的 16×16 像素画升级 + 裂纹 4 档瓦片 | `engine.js makeBlockAtlas` → 游戏画面 |
| S2 | 顶点 AO + 面向亮度对齐（方块接缝立体感） | `buildChunkGeometry` |
| S3 | 挖掘反馈：目标块裂纹遮罩 + 每击碎屑粒子 | `game.js stepMining` |
| S4 | 区块流式：只建玩家半径内区块，世界 80→128 | `engine.create` + tick |
| S5 | 收口：走查、test-report、总控一行 | 文档 |

## 硬约束（沿用系列任务）

- three.js r147 UMD 本地 vendor，禁 CDN、禁 Mojang 贴图、禁外部图片素材（全程序化 Canvas）。
- 不碰 `voxel-craft/`、combat/words/levels/bridge、不开新 localStorage key。
- MuMu WebView 预算：每区块 1 draw call、pixelRatio ≤ 1.5、无阴影、单材质地形。
- 测试驱动：每片先改 `tests/blocklegend.test.mjs` 再改引擎；`node --test tests/blocklegend.test.mjs tests/world-games.test.mjs` 全绿才算。
- 参考代码只移植算法并在文件头注明出处（同现有 dgreenheck 注释惯例），不整段复制。
