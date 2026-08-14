# T20260813 — 测试方案

本任务不是算法指标任务。不使用 F1/Precision 等字段。证据是命令退出码 + 浏览器可玩路径。

## 测试目标

- [ ] 主路径：种 → 来一波 → 自动战斗 → 通关阳光
- [ ] 关键边界：任意种植过近拒绝；僵尸破线 lost
- [ ] 回归：preschool-garden 旧网格种植测试、npm test 全量

## 分阶段

| 阶段 | 何时 | 测什么 | 通过后 |
|---|---|---|---|
| 1 前提 | 写代码前 | preschool-garden 导出 tick；游戏页能加载 | 步骤 2 |
| 2 最小主链路 | game.js 改完 | tick 合同 + lost 测试 + 浏览器一关 | 步骤 6 回归 |
| 3 关键边界 | 主路径后 | 同路两点种植；useSkill 主路径消失 | npm test |
| 4 阶段回归 | 关键改动后 | `npm test` | S1 验收 |
| 5 扩量 | 不适用 | 不扩植物种类 | — |
| 6 最终 | S1 收口 | 浏览器清单 + 全绿 | 可开 S2 |

## 验证命令

```text
node --check prj/preschool-garden.js
node --check prj/games/garden-defense/game.js
node --test tests/preschool-defense-game.test.mjs tests/preschool-garden.test.mjs tests/world-games.test.mjs
npm test
```

浏览器：`http://127.0.0.1:4180/prj/games/garden-defense/index.html`

退出码：`0` 成功，非 0 失败。不要靠解析 TAP 文案判定。

## 日志

- 开关：basic（测试 TAP + 浏览器控制台）
- 路径：本包 `test-report.md`
- 关键字段：exit_code、plantCount、defense.status、clearedStages

## 需求点映射

| ID | 阶段 | 动作 | 时长 | 证据 |
|---|---|---|---|---|
| R1 | 2 | world-games tickDefense + 浏览器 | ≤5 分钟 | test-report#阶段-2 |
| R2 | 3 | preschool-garden 任意种植测试 | ≤1 分钟 | test-report#阶段-3 |
| R3 | 1 | 不引入第三方游戏目录 | ≤1 分钟 | test-report#阶段-1 |
| R4 | 2 | 无 function useSkill | ≤1 分钟 | 阶段-2 |
| R5 | 2 | game.js awardSunlight | ≤1 分钟 | 阶段-2 |
| R6 | 2 | lost 测试 | ≤1 分钟 | 阶段-2 |
| R9 | 4 | npm test | ≤1 分钟 | 阶段-4 |
| R7 R8 | 延期 | 不测 | — | 不适用 |

## 真值

| 指标 | 含义 | 通过=成功？ | 补充 |
|---|---|---|---|
| npm test 全绿 | 合同没破 | 否，还要浏览器能玩 | 阶段 2 浏览器清单 |
| 测试匹配 tickDefense | 源码接了规则 | 否 | 必须看见僵尸移动 |

## 报告约定

- 阶段测试报告：要（回写 test-report.md）
- 截图：可选 1 张战场；不是必须
- 受众：自己复盘
- 详细度：精简（结论 + 命令 + 退出码）
