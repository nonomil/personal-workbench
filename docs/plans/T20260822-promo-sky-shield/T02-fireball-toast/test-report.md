# T02 测试报告

- 日期：2026-08-22
- `node --test test/combat.test.mjs`：绿（含「天空火球走现有伤害，不写死 -10」）
- toast：`被火球击中`，无 `−10 HP`
- 伤害：`skyFireballHit` = `incomingPlayerDamage`
