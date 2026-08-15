# 步骤

> 验证命令以退出码为准。

### 1. S1 · 薄商店

- [x] 测试：`buy` / `statsOf` / 接触减免先红后绿
- [x] 新建 `prj/games/blocklegend/data/shop.js`
- [x] `game.js` 交易层列出 4 件并购买；`emptyProgress.gear = {}`
- [x] 接触伤害走防御减免；HUD ATK/DEF 读 `statsOf`
- **验证：** `node --test tests/blocklegend.test.mjs tests/world-games.test.mjs`

### 2. S2 · 放置手

- [x] 测试：`placeVoxel` 成功/拒绝
- [x] `engine.js` 导出 `placeVoxel`；`tools.js` 增加 `placeKindOf`
- [x] 热键 5；左键对准邻面放置并扣背包
- **验证：** 同上

### 3. S3 · 收口

- [x] 帮助与 hint；总控一行；test-report 记退出码
- **验证：** 定向测试绿。不标 accepted。
