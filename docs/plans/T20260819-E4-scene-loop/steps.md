# 步骤

### 1. S1 · 循环纯函数

- [x] 测试先红：`ERR_MODULE_NOT_FOUND`
- [x] `prj/games/blocklegend/data/scene-loop.js`：录音上限、smart/fixed 间隔、PlayingPrompt→Recording→WaitingInterval、失败等用户、三遍后换句、again 可超过 3/3、skipWait≈1s、`sceneSentences` 留最高星
- **验证：** `node --test tests/blocklegend-scene-loop.test.mjs` 8/8

### 2. S2 · 接入练一句

- [x] `index.html` 挂 `scene-loop.js`，加 `#scene-phase` / `#scene-count`
- [x] `game.js`：开场播原句 → 自动听 → 评分后停顿 → 下一遍；打字仍算一遍；无麦走 WaitingForUser
- **验证：** 定向 8/8。未手玩。
