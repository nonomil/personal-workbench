# T02 火球伤害与 toast

> 状态：pending · 依赖 T01

## 目标

破盾前被火球打到时，走现有 `incomingPlayerDamage`（接触 1/5 心，Boss/恶魂弹按 1/3 上限），toast 写「被火球击中」。禁止写死 −10 / 650。

## 文件

- 修改：`data/combat.js`（若需 `skyFireballHit({ hpMax, boss })` 薄封装，内部只调 `incomingPlayerDamage`）
- 修改：`test/combat.test.mjs`
- 修改：`game.js`（火球命中玩家时 toast；T05 之前可以先留函数，T05 再接线）
- 同步双仓

## 不做

新血条、RPG 三维条、固定 10 点伤害。
