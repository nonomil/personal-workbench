# 测试方案

## 自动化（先跑，全绿才手玩）

```text
node --test --test-concurrency=1 tests/blocklegend-pack-switch.test.mjs
node --test --test-concurrency=1 tests/blocklegend-question-port.test.mjs
node --test --test-concurrency=1 tests/blocklegend-villages.test.mjs
node --test --test-concurrency=1 tests/blocklegend.test.mjs
```

| 文件 | 盯什么 |
| --- | --- |
| `blocklegend-pack-switch.test.mjs`（新） | S1：MC 包 catalog 能进 bank；2 章容错；缺省 core；家长页开关存在；`wordPack` 装配 |
| `blocklegend-question-port.test.mjs` | S2 toast 断言新增后仍 24+ 绿；老师出卡/欠账口径不回归 |
| `blocklegend-villages.test.mjs` | S4 断言改后全绿：碎词出 look 名单、村庄生成不动 |
| `blocklegend.test.mjs` | 旧主线回归：词池/波次/复习之门不被切包破坏 |

S3 另加 bridge 定向断言（`recordSubjectAnswer` 写当日日期字段），放进现有 bridge 测试文件，不新开测试床。

## 浏览器走查（对应 acceptance A1–A8）

1. 硬刷新 → 家长页开关默认位 → 不切，打一局，行为与基线一致（A1）。
2. 切 MC 包 → 刷新 → 第 1 关词牌抽查 5 个，全部在 `minecraft-english-2026.08.15/catalog.json` 里（A2）。
3. `__blDebug` 跳后面关，抽查词牌非空（A3）。
4. 切回 core → 图鉴/门里 MC 词仍在（A4）。
5. 新档打到 F=4 → toast 一次 + 老师 F 出卡（A5）。
6. 做 2 道识字 → 开工作台卡片墙看识字卡小字（A6）。
7. 对准椅子按 V/T、对准 farmer 按 V/T 各一次（A7）。
8. DevTools Application → Local Storage 核对无新顶层 key；打 Boss 确认蓝罩英语（A8）。

## 失败处理

- 任一自动化红：停手玩，先修，不改断言迁就实现。
- A3 词池空：`themesForLevel` 容错没兜住，回 S1 补测试再修。
- A6 拿不到当日字段：按 steps S3 核实步补 `lastPracticed`，不为此新开 key。
