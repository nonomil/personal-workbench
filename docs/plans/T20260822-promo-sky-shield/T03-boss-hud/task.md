# T03 破盾 HUD

> 状态：pending · 依赖 T01

## 目标

底部一条学园口径的破盾条：关卡名（可写「山谷幼龙 · 火属 · L6」）+ `破盾 念对 0/5` + 倒计时（来自 `ride-policy.segmentMs`，约 60 秒）。

## 文件

- 修改：`game.js`、`game.css`、`index.html`（只碾本包相关 `?v=`）
- 测试：优先用字符串/DOM 片段单测或 `game.js` 源码断言（参照 `hub-camp.test.mjs` 读文件）；不要上 Playwright 除非已有入口

## 禁止出现

Lv.26、成长、饱食、完全体、三货币、技能栏、「急速 x1」常驻钮、3:52。
