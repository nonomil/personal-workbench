# 需求对照表

| # | 用户原话 | 落点 | 切片 |
|---|---|---|---|
| 1 | 3D 形象（主角/敌人/工具）太简单，更好看更细致 | 已在 look12 加部件；本期 S1 图集 + S2 AO 提升世界质感；角色换贴图皮肤明确不做（另开任务） | S1/S2 |
| 2 | 联网搜类似项目 | 三仓已浅克隆 `tmp/voxel-refs/`，分析见 task.md §2 | 完成 |
| 3 | 地图更大 | 80→128 + 按玩家半径流式加载 | S4 |
| 4 | 草方块下泥土颜色太深 | 已改沙土色（look12）；S1 再统一草侧画法 | S1 |
| 5 | 树木多种方块、颜色纹理 | 橡/桦/杉已分（look12）；S1 统一画法质量（年轮/孔洞） | S1 |
| 6 | 挖地面/树干一次只去一个方块 | 已实现（look12）；S3 补裂纹反馈让手感成立 | S3 |
| 7 | 成熟项目/成熟提示词参考 | Fable5-mc（AI 一句话产物）+ dgreenheck + 官方手册；提示词对照已回复用户 | 完成 |

## 边界

- 不动：combat.js / words.js / levels.js / shop.js / bridge / voxel-craft / localStorage 口径
- 参考代码：只移植算法，文件头注明出处（Fable5-mc textures/mesher、dgreenheck world 调度）
- tmp/voxel-refs/ 在 gitignore（tmp/）内，不入库
