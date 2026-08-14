# 需求清单 — T20260815

- [x] R1 水平碰撞守卫:横向重叠深于纵向时不再水平推出(全宽地面下落不再瞬移到关卡边缘)
- [x] R2 死代码击退删除:game.js 不再含 `player.vx = player.facing * -180/-140` 赋值;受伤仍有竖直弹跳 + 无敌闪烁
- [x] R3 徽章总数回归锁:合同测试断言总数三处派生(BADGE_COUNT === BADGE_ORDER.length;bridge badges.length 派生;无硬编码 11)
- [x] R4 platform-physics 测试补两条断言(R1/R2 的源级合同)
- [x] R5 data-model.md 补 `growth.achievements`、`growth.worldGames.*`、`courseProgress` 字段说明
