# Test Plan — T20260815-B1

> 验证以退出码为准。文档类需求用 grep 反证 + 人工 diff。

## 阶段 0：现状侦查（改动前）

| 项 | 命令/动作 | 预期 |
|---|---|---|
| refresh 测试现状 | `node --test tests/preschool-workbench-refresh.test.mjs` | 记录红/绿与失败清单，写入 test-report |
| 每日任务实数 | 读 `prj/config.js` | 数出 N 项与项名 |
| 奖励数值实录 | 读 `prj/storage.js`、`prj/games/shared/workbench-bridge.js` | 抄录课完成奖励 / 游戏日 cap / 打卡奖励 |
| 识字库字数 | 读 `prj/preschool-literacy-data.js` | 实数 N 字 |

## 阶段 1：测试迁移

| 项 | 命令 | 预期 |
|---|---|---|
| 断言替换后 | `node --test tests/preschool-workbench-refresh.test.mjs` | 退出码 0 |
| 旧断言清除 | `rg "course-directory" tests/preschool-workbench-refresh.test.mjs` | 退出码 1 |

## 阶段 2：文档修订

| 项 | 命令/动作 | 预期 |
|---|---|---|
| 任务数改口 | `rg "三项核心|每天三项" docs/02-课程/` | 退出码 1 |
| 识字目标 | `rg "60-80|60–80" docs/02-课程/识字/ docs/02-课程/幼儿课程方案/01-识字/` | 无误导残留（人工判读） |
| 卡片墙状态 | 人工 diff | 三要素齐（缓存戳/落点/守护测试） |
| 奖励对数 | 对数表（合同值→代码值→改定值）入 test-report | 每行有据 |

## 阶段 3：回归

| 项 | 命令 | 预期 |
|---|---|---|
| 全量回归 | `npm test` | 退出码 0 |
| 改动面核对 | `git status` | 仅 .meta.yaml files 所列 6 文件 + 本包记录文件 |

## 不测什么

- 卡片墙 UI 视觉（已上线，非本包范围）
- 浏览器真机（本包无运行时改动）
