# 测试计划

## 自动化（tests/blocklegend.test.mjs 增量）

| 切片 | 新/改断言 |
|---|---|
| S1 | 图集常量导出（列/行数、瓦片总数 ≥ 18）；`tileIndex` 支持 crack 4 档且互不相同；现有 species 瓦片索引不回归 |
| S2 | `voxelAt` 树列缓存前后一致性（200 随机点对拍）；L 形两格世界中内角面顶点色 < 无遮挡面（AO 生效）；`collectChunkFaces` 面数与缓存无关 |
| S3 | game.js 静态断言：crack 遮罩创建/进度换档/清理路径存在（正则，风格对齐 world-games 既有测试） |
| S4 | `WORLD_SIZE===128`；`chunksAround` 纯函数：中心/边缘/角落三个玩家位置的区块键集合正确、数量 ≤ (2R+1)² |
| 回归 | 既有 50 项全绿；world-games 桥接测试不动 |

## 手动（走查即测）

见 acceptance.md 手玩清单。重点补两条：

1. 性能：MuMu WebView `fps-label` 连续 60s ≥ 30；跨区块加载瞬间无 > 100ms 卡顿感。
2. 内存：走遍全图后回出生点，Chrome DevTools Memory 无持续增长（区块 dispose 生效）。

## 不测

- npm test 的 7 个既有无关失败（platform-physics 等）不修不测。
- 视觉「好看」主观项以截图走查为准，不写像素断言。
