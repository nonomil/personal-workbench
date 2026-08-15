# 测试计划

## 自动

`node --test tests/blocklegend.test.mjs tests/world-games.test.mjs`

覆盖：`buy` 成功/余额不足、`statsOf`、接触减免、`placeVoxel` 合法/拒绝、HTML 仍有 help/trade。

## 浏览器

`http://127.0.0.1:4196/prj/games/blocklegend/index.html?v=look11`

买一件装备看 ATK/DEF；挖土后 5 号键放置；打一只怪确认词卡还在。
