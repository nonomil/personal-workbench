# 步骤

> 验证命令以退出码为准：`node --test tests/blocklegend.test.mjs tests/world-games.test.mjs`
> 每片先红后绿；任何一片失败不影响其它片回滚。

### 1. S1 · 图集细化 + 裂纹瓦片

- [x] 测试红：`makeBlockAtlas` 无法 node 测（DOM），改测纯函数——新增 `tileIndex('crack', stage)` 返回 4 档裂纹格；`ATLAS_COLS/ROWS` 常量导出后断言格数 ≥ 18
- [x] `engine.js`：图集扩容；移植草侧锯齿边 / 石头横纹 / 原木方形年轮 / 边缘暗列 / 树叶孔洞画法；画 4 档裂纹瓦片（半透明黑裂缝、底透明）
- [x] 地形材质 `alphaTest: 0.5`
- [ ] 浏览器走查：贴脸看草侧、石、三种原木、树叶
- **验证：** 定向测试绿 + `node --check`

### 2. S2 · 树体素缓存 + 顶点 AO

- [x] 先做树列缓存：`world` 建一个 `treeCols` Map（`x,z` → 该列 [y]→{kind,species}），`treeVoxelAt` 改查缓存；`removeTree`/edits 语义不变
- [x] 测试红：断言同一世界 `voxelAt` 结果与旧实现一致（抽 200 随机点）；`collectChunkFaces` 输出面数不变
- [x] `pushQuad` 增加每顶点 AO：采样 side1/side2/corner，`AO_CURVE=[0.45,0.64,0.82,1.0]`（顶面用弱曲线），乘进顶点色；AO 差大时翻转三角对角线
- [x] `faceShade` 改 MC 面向亮度：py 1.0 / ny 0.5 / ±z 0.8 / ±x 0.6
- [x] 测试红→绿：新增断言「贴地内角面的顶点色 < 无遮挡同向面」（构造两格 L 形世界验证 AO 生效）
- [ ] 浏览器走查：台阶内角、树冠下、洞口有暗角
- **验证：** 同上

### 3. S3 · 裂纹遮罩 + 碎屑

- [x] `game.js`：`session.mine` 时叠 1.002 倍裂纹盒（BoxGeometry + crack 瓦片 UV 材质、polygonOffset、transparent），进度换档；断/取消移除
- [x] 每挥动节拍 `spawnBurst` 2–3 粒（复用 DROP_COLOR 上色）
- [x] 测试：静态断言 game.js 含 crack 遮罩挂载/清理调用（对齐现有 world-games 测试风格）
- [ ] 浏览器走查：挖石头四档裂纹推进、松开消失
- **验证：** 同上

### 4. S4 · 区块流式 + 128 世界

- [x] 测试红：`WORLD_SIZE === 128`；`create` 后场景区块数 ≤ (2·VIEW_CHUNKS+1)²（node 下用 stub canvas 跳过或改测纯调度函数 `chunksAround(px,pz)`）
- [x] `engine.js`：抽出 `chunksAround` 纯函数（给定玩家位置 → 应存在区块键集合）；tick 内每帧最多建 1 个缺失区块、卸出界区块（dispose + remove）
- [x] 雾 near/far 与 VIEW_CHUNKS 匹配（远端藏进雾）
- [x] 出生点/商人/怪物刷新半径按 `world.size` 走查
- [ ] MuMu/浏览器：跨全图走一圈，FPS ≥ 30、无白洞
- **验证：** 同上

### 5. S5 · 收口

- [x] 设计方案 §世界、05-方块传奇 README「已可玩」行、帮助层文案同步
- [x] test-report.md 记全部命令与退出码；总控当前状态一行
- [x] index.html 缓存戳 `?v=20260816-bl-polish2`
- **验证：** 全量定向测试绿。不标 accepted，等手玩。
