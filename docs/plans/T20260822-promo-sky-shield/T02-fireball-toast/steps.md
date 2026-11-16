# T02 步骤

## 1. 失败测试

在 `test/combat.test.mjs` 增加：

- `incomingPlayerDamage({ hpMax: 10, boss: true })` 仍约 `10/3`（回归）
- 若新增 `skyFireballHit`：结果必须等于 `incomingPlayerDamage`，且 **不等于 10**

## 2. 跑红 → 最小实施 → 跑绿

```
cd G:\StudyCode\blocklegend
node --test test/combat.test.mjs
```

## 3. toast

`game.js` 火球命中分支：`toast('被火球击中')`。不要拼 `−10 HP`。

## 4. 同步双仓
