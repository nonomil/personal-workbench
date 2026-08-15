# T20260815-VR — 写码前自检（每片开工前过一遍；S5 前必过）

## 理解确认

- [ ] 我能不看文档说出三张接口表（bridge 调用集 / progress 键 / 入口路径）的内容
- [ ] 我知道 GAME_ID 与文件夹名解耦：新文件夹叫 voxel-craft，id 仍是 voxel-adventure
- [ ] 我读过 2d-minecraft 的 chunk.cpp / physicsSystem.cpp / registers.cpp（数值在 steps 附录 A）

## 边界确认

- [ ] 本切片只动 steps.md 列出的文件；`games/voxel-adventure/**` 与 bridge 零改动（S5 前）
- [ ] 不引入构建工具/外部 CDN——纯静态 Vanilla JS + Canvas
- [ ] 不拷 steve.png / 不写 Minecraft 商标 / 上游音频不入库

## 测试前移确认

- [ ] 本切片的红色测试已写好（S1）或断言锚点已列出（S2–S4）
- [ ] 退出码是判定标准，不用「看起来能跑」

## 并行会话确认（S5 必做）

- [ ] `grep -rn "voxel-adventure" prj/config.js prj/app.js tests/world-games*.test.mjs tests/voxel-world.test.mjs`
      的**当前实际值**已记录（不依赖旧快照）
- [ ] 若目标文件在我读取后被外部修改（编辑工具报 stale）：重读 → 重对齐 → 再改，不顺手覆盖他人改动
- [ ] 全量 `npm test` 的已知并行失败清单已对照（test-report 基线节）

## 幼儿体验确认（S2/S3 必做）

- [ ] 挖掘绝对时长 ≤ C++ 原值 ÷4；失败提示是可行动文案（「先完成前面的任务」而非错误码）
- [ ] 无致死压力（掉虚空=复活，不掉进度）；单任务 3–5 分钟内可完成
