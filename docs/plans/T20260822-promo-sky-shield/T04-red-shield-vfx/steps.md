# T04 步骤

## 1. 失败测试（姿态）

`bubblePose(i, {x,y,z})`：10 个点分布在原点周围，半径有限，y 在空中。

## 2. 最小画面

- 红球：`Mesh` + 半透明红，`depthWrite: false`
- 词泡：已有文字/广告牌就复用；没有就用 canvas 贴图
- 破盾后删 mesh

## 3. 绿后同步，碾 `engine.js` / `game.js` cache
