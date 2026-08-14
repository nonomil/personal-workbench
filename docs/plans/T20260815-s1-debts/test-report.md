# Test Report — T20260815

## 阶段 1:源级合同(node 级)

- `node --check prj/games/platform-quest/game.js` 通过。
- 水平解算守卫落地:`penX >= penY` 跳过逻辑进入 update()(最小穿透轴解算)。
- 死代码击退移除:两处 `player.vx = player.facing * -1x0` 与 `player.x += player.facing * -28` 删除,竖直弹跳(`vy = -180/-220`)保留。
- 缓存戳:`game.js?v=20260815-debt-v1`;无测试断言旧戳(grep 确认)。

## 阶段 2:全量测试

- `npm test` **241/241 全绿**(238 基线 + 新增 3 项):
  - platform-physics +2:最小穿透守卫存在断言;死代码击退 doesNotMatch + 竖直弹跳保留断言。
  - world-games-growth +1:徽章总数三处派生(`BADGE_COUNT = BADGE_ORDER.length` / `badgeTotal: badges.length` / 全仓无 `badgeTotal: 11`)。
- 徽章硬编码核查结论:**当前代码已是派生值**(当前状态 3.13 的记录滞后),本包用回归测试锁死口径,不改运行时。

## 阶段 3:浏览器冒烟(platform-quest level 1)

- 起跳 → 下落中按 → 落地:主角落回起点附近地面,**未瞬移到关卡左/右缘**(修复前:下落+方向输入会被水平解算瞬移到 x=0)。
- 主角显示完整,无卡地/穿地。
- 撞水管/受伤分支为同路径解算(水平推出仅当横向穿透更小),合同断言覆盖;逐帧人工逐关回归留待 T20260814 包真机验收一并做。

## 阶段 4:文档

- `docs/data-model.md` 快照示例补:`growth.achievements`、`growth.worldGames.{garden-defense,voxel-adventure,platform-quest,meta}`、`courseProgress.literacy/english`;新增"幼儿版徽章与世界游戏"一节说明口径与 bridge 上限规则,字段与 `preschool-achievements.js` / `workbench-bridge.js` / `child-courses.js` 代码一致。

## 结论

R1–R5 全部满足,验收通过。遗留:`当前状态.md` 3.13 的"碰撞/击退/徽章硬编码"边界描述待下次发版记录时同步清除。
