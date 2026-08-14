# T20260813 — 任务拆分

## 1. 原始任务

把三世界独立页改成成长短局：先花园自动塔防，再方块挖放，再横版手感。

## 2. 粒度自检（整包）

| 问题 | 判断 | 备注 |
|---|---|---|
| 验证 ≤10 分钟？ | 整包否，S1 是 | 所以必须拆 |
| reviewer 5 分钟能判断？ | 整包否 | |
| 做错能整块丢？ | 整包否 | 三世界不能一起回滚 |

## 3. 类型

- 跨层修改：是（规则 JS + 游戏页 + 测试）
- 有隐性规则：是（一份阳光、任意种植、版权）
- 只读分析：否（方案已完成）

## 4. Loop

- 主结论：CLOSED 串行
- 不是 OPEN：方案已冻结抽循环、不 fork
- 不是 FLEET：禁止并行改三个 game.js

## 5. 禁止项

- 不得修改：localStorage key、学习完成、排行榜、S1 期间 voxel/platform
- 不得新增依赖：Phaser、Vite、Three.js
- 不得改变：`awardSunlight` 的 eventId 形态（可沿用现有 `game:garden-defense:stage-N-clear`）
- 其他：不拷贝 PopCap/Nintendo/Mojang 素材；不自动 commit

## 6. 分解结果

| 分解项 ID | 落地 | 描述 | 需求点 | 类型 | 隔离 | 文件上限 | allowed_paths | 上游 | 产出 | 验证命令 | 时长 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 本包 steps | 花园接 tickDefense + lost + waves | R1–R6 R9 | 跨层 | 当前工作区（单 Agent） | 6 | `prj/preschool-garden.js` `prj/games/garden-defense/` `tests/preschool-*.mjs` `tests/world-games.test.mjs` | 无 | 可玩自动塔防页 | 见 steps | ≤10 分钟 |
| S2 | 未建 | 方块挖放接 quests.js | R7 R9 | 跨层 | 待定 | — | `prj/games/voxel-adventure/` | S1 验收 | 挖放短局 | 待补 | — |
| S3 | 未建 | 横版物理 | R8 R9 | 隔离修改 | 待定 | — | `prj/games/platform-quest/` | S1 | 手感短关 | 待补 | — |

顺序：S1 →（验收）→ S2 → S3。S2/S3 禁止与 S1 并行。

## 7. 验证命令预定义

```bash
node --check prj/preschool-garden.js
node --check prj/games/garden-defense/game.js
node --test tests/preschool-defense-game.test.mjs tests/preschool-garden.test.mjs tests/world-games.test.mjs
npm test
```

本仓无 `taskctl.py`，不做模板里的 python 冒烟。

## 8. 分解后冒烟

- [x] S1/S2/S3 ID 唯一
- [x] 验证命令指向真实测试文件
- [x] S2/S3 不引用未建任务目录
- [ ] 命令尚未在本包执行（pending）

## 9. 回滚

- S1 失败：还原上述 allowed_paths，工作台 `#battle` 不受损
- 影响：仅花园独立页与防御规则 lost 态

## 10. 结论

- [x] 已分解为 3 个子任务，**进入 S1 的 steps.md**
- [ ] S2/S3 等 S1 过后再写各自 steps
