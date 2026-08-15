# 测试报告

> 状态：S1+S2 代码已绿，待用户手玩。未标 accepted。

## 命令

`node --test tests/blocklegend.test.mjs tests/world-games.test.mjs`

- 退出码 0
- 50/50 通过（含商店 4 件/防御保底、放置成功/拒绝）

## 切片

| 切片 | 结果 |
| --- | --- |
| S1 薄商店 | 绿。`data/shop.js` + F 商店列表可买 |
| S2 放置手 | 绿。热键 5，dirt/cobble/oak-log |
| S3 收口 | 帮助/hint 已改；总控已登记 |

浏览器走查未做。建议：`http://127.0.0.1:4196/prj/games/blocklegend/index.html?v=look11`
