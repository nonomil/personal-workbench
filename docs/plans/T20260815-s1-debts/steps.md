# 步骤 — T20260815(只写细本轮)

## 步骤 1:水平碰撞守卫(R1)

`game.js` update() 水平解算循环改为最小穿透轴判定:

```js
player.x += player.vx * dt;
solids().forEach(function (platform) {
    if (!rectsOverlap(player, platform)) return;
    if (!player.vx) return;
    // 最小穿透轴:横向穿透小于纵向重叠才水平推出,否则交给竖直解算
    // (修复:下落按住方向键时,全宽地面把玩家瞬移到关卡边缘)
    const penX = player.vx > 0
        ? (player.x + player.w) - platform.x
        : platform.x + platform.w - player.x;
    const penY = (player.y + player.h) - platform.y;
    if (penX >= penY) return;
    if (player.vx > 0) player.x = platform.x - player.w;
    else player.x = platform.x + platform.w;
});
```

依据:AABB 最小穿透解算。下落时 penY(脚过地顶的距离)远小于 penX(到地面左/右缘距离)→ 跳过;横跑撞水管/砖块时 penX 小 → 正常推出。

## 步骤 2:删除死代码击退(R2)

两处(变大保护分支、掉心分支)删除 `player.vx = player.facing * -140/-180;` 与 `player.x += player.facing * -28;`,保留 `player.vy = -180/-220`、无敌帧与 toast。

## 步骤 3:缓存戳

`index.html` `game.js?v=` 升为 `20260815-debt-v1`。

## 步骤 4/5:合同测试

- `platform-physics.test.mjs`:断言 game.js 含 `penX >= penY` 守卫;不含 `/player\.vx = player\.facing \* -\d/`。
- 徽章总数:断言 `preschool-achievements.js` 含 `BADGE_COUNT = BADGE_ORDER.length`;`workbench-bridge.js` 含 `badgeTotal: badges.length`;全仓 js 无 `badgeTotal: 11`。

## 步骤 6:data-model.md

在幼儿版花园与收藏节后补三小节(字段以代码为准,见 requirements-source)。

## 步骤 7:验证

`npm test` 全绿;浏览器开 `platform-quest?level=1` 跑跳不瞬移、受伤不横飞。
