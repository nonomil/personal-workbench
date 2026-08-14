# 需求来源 — T20260815

| 来源 | 位置 | 内容 |
|---|---|---|
| 综合改进规划 | `docs/00-总控/2026-08-14-综合改进规划.md` S1 第 1 条 | 徽章总数硬编码修复 + platform-quest 两项碰撞债(半天级) |
| 综合改进规划 | 同文第 3 节 P0 行 | "删除死代码击退分支;全宽地面碰撞加保护;platform-physics 测试补两条断言;手玩 10 关不穿地" |
| 综合改进规划 | 同文第 4 节 P0 行 | "总数从徽章目录 length 派生;测试断言总数一致" |
| 综合改进规划 | 同文 S1 第 5 条 | `data-model.md` 补齐三组字段 |
| 当前状态 | `docs/00-总控/当前状态.md` 3.13 边界 | "platform-quest 水平击退速度是死代码、水平碰撞对全宽地面缺保护(已记录未改);徽章总数硬编码 11" |
| 代码事实 | `prj/games/platform-quest/game.js` update() | 水平解算对任意重叠实体无条件按 vx 方向推出;击退赋值后下一帧被输入覆盖 |
| 代码事实 | `prj/preschool-achievements.js:14`、`prj/games/shared/workbench-bridge.js` | 总数已是派生值(`BADGE_ORDER.length` / `badges.length`),无回归测试 |
