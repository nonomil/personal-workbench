# T04 红罩与词泡表现

> 状态：pending · 依赖 T01

## 目标

程序化半透明红球 + 白色词泡（泡上写英文）。不新做堡垒 GLB，不换第二条龙。第 6 关球包着恶魂附近空域即可；第 12 关球可以套在已有 `fortressLayoutOf` 中心。

## 文件

- 修改：`engine.js` 和/或 `game.js`（放置 mesh / sprite）
- 可选：`data/sky-shield.js` 增加泡的世界坐标纯函数 `bubblePose(i, origin)`
- 测试：坐标纯函数单测；禁止为了测画面去截 WebGL

## 不做

新网格资源、新龙、金色灯柱、再铺一批高台（营地已压平，关卡里也不借机抬地）。
