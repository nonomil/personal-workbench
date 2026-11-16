# T01 词泡破盾纯函数

> 状态：pending · 无前置

## 目标

在不碰 HUD / Three / 关卡接线的前提下，把宣传片规则收成可测函数：从本关词表抽 10 个泡，语音命中任意未破泡，累计 5 个破盾。

## 文件

- 创建：`G:\StudyCode\blocklegend\data\sky-shield.js`
- 创建：`G:\StudyCode\blocklegend\test\sky-shield.test.mjs`
- 同步：`prj/games/blocklegend/` 同名文件
- 不改：`game.js`、`engine.js`、`index.html`（本包 T01 不碾 cache）

## API（本夹锁死）

```js
pickBubbles(words, n, rng)  // n 默认 10；去重；词不足则允许重复补满
startShield(words, rng)     // { bubbles, popped: [], need: 5 }
hearBubble(state, heard)    // 大小写不敏感；命中则从 bubbles 去掉并记入 popped
shieldOf(state)             // { have, need, broken, left }
```

禁止：写死 `congratulations` / `Genes`；依赖 DOM；新存储 key。

## 验证

`node --test test/sky-shield.test.mjs`（独立仓）。工作台镜像拷过去再跑一遍。
