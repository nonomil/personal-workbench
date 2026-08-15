# 验收

## 命令（退出码 0）

```
node --check prj/games/blocklegend/engine.js
node --check prj/games/blocklegend/game.js
node --test tests/blocklegend.test.mjs tests/world-games.test.mjs
```

## 手玩清单（http://127.0.0.1:4196/prj/games/blocklegend/index.html?v=20260816-bl-polish2）

- [ ] 贴脸看草方块：侧面锯齿草沿 + 沙土色土；石头有横纹；橡木顶是方形年轮
- [ ] 桦树白干、杉树深干锥形叶，树叶有细碎孔洞、不发糊
- [ ] 台阶内角/树冠下/挖出的坑内有 AO 暗角，方块棱角分明
- [ ] 按住左键挖：目标块出现裂纹并按 4 档推进，松开消失；每次挥动飞碎屑
- [ ] 一次只掉一格，树上半截保留
- [ ] 世界 128×128：朝一个方向走到边，沿途区块渐入无白洞、身后区块卸载，FPS ≥ 30（MuMu）
- [ ] 词卡/战斗/商人/Boss/工作台回流全部照旧（对照 blocklegend 测试 50 项绿）

## 不合格线

- 任何一项让 `npm test` 新增失败（7 个既有无关失败除外）
- MuMu 上 FPS < 24 或首屏白屏 > 3s
- 出现新的 localStorage key、外链资源、Mojang 贴图
