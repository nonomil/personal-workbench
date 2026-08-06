# 阳光成长工作台 v0.5.0 实施计划

> **给 Claude:** 必需子技能：使用 `superpowers:executing-plans` 来逐任务实施此计划。

**目标：** 在现有轻量工作台闭环上补齐今日计划的奖励凭证、跨入口幂等和已完成课程对来源计划的同步，避免取消/重复点击造成重复阳光或误导性提示。

**架构：** 60 日自然拼读和暑假资料继续作为资料库，不全量进入首页；首页只消费今日计划和一张轻量练习。计划完成仍由现有 `recordAction()` / `awardSunlight()` 结算，`completionRewardId` 只作为计划完成层的保护凭证；花园游戏不参与学习结算。

**技术栈：** Vanilla JS、`localStorage`、Node `node:test`、现有静态浏览器回归与 Capacitor 发布脚本。

---

### 任务 1：锁定 v0.5.0 数据合同与失败测试

**文件：**
- 修改：`G:\StudyCode\个人工作台\tests\preschool-daily-plan.test.mjs`
- 修改：`G:\StudyCode\个人工作台\tests\preschool-workbench-refresh.test.mjs`
- 修改：`G:\StudyCode\个人工作台\docs\plans\2026-08-06-workbench-v0.5-design.md`（如实施细节需要澄清）

**步骤 1：编写失败测试**

- 断言新建幼儿计划包含 `completionSource: ''` 与 `completionRewardId: ''`。
- 断言旧快照迁移补齐这两个字段，不覆盖标题、自定义计划、完成状态或已有凭证。
- 断言工作台源码在直接打卡路径中：取消旧完成计划时先写入保护凭证，重新完成时只在没有凭证时调用 `awardSunlight()`。
- 断言练习路径把 `lesson:<lessonId>` 写入来源计划的 `completionRewardId`。
- 断言课程已经独立完成时，从来源计划进入不会抛出“课程已经完成”，而是同步计划且不追加奖励。

**步骤 2：运行定向测试确认红测**

运行：

```powershell
node --test tests/preschool-daily-plan.test.mjs tests/preschool-workbench-refresh.test.mjs
```

预期：新增合同断言失败，失败原因是 `completionRewardId`、迁移保护或已完成课程同步尚未实现；不能接受语法错误作为红测。

### 任务 2：补齐计划字段和迁移保护

**文件：**
- 修改：`G:\StudyCode\个人工作台\storage.js`
- 修改：`G:\StudyCode\个人工作台\tests\preschool-daily-plan.test.mjs`

**步骤 1：实施最小存储改动**

- 新种子计划、按日补种计划和通用计划默认值补齐 `completionSource`、`completionRewardId`。
- 保持 `PRESCHOOL_DAY_PLAN_VERSION` 与现有内容迁移边界兼容，不能因为新增字段重新补回用户已经删除的内置任务。
- 增加一个稳定的 `getPreschoolPlanRewardId(plan)` 辅助函数供应用层使用，格式为 `plan:<planId>:<date>`。
- 旧计划缺少凭证时默认空字符串；不覆盖用户已有凭证。

**步骤 2：运行存储定向测试**

运行：

```powershell
node --test tests/preschool-daily-plan.test.mjs
```

预期：数据合同与迁移测试通过。

### 任务 3：修复练习/打卡的跨路径奖励幂等

**文件：**
- 修改：`G:\StudyCode\个人工作台\app.js`
- 修改：`G:\StudyCode\个人工作台\tests\preschool-workbench-refresh.test.mjs`

**步骤 1：实现直接打卡保护**

- 直接打卡首次完成时写入 `completionRewardId = plan:<id>:<date>`，且只在该字段为空时发放 10 阳光。
- 取消计划时保留已有凭证；旧完成计划第一次取消时补写 canonical 计划凭证，防止再次打卡补发。
- 让提示区分“本次获得阳光”和“完成状态恢复但阳光已领取”，不把重复操作显示成新奖励。

**步骤 2：实现练习完成同步**

- 练习完成写入 `completionSource = 'practice'` 与 `completionRewardId = lesson:<lessonId>`，并沿用现有课程奖励幂等。
- 先校验来源计划，再更新课程进度，避免来源计划不存在/已完成时留下半完成状态。
- 如果课程卡已经独立完成，来源计划入口直接把计划同步为完成，保留 `lesson:<lessonId>` 凭证，不追加阳光。
- 保持独立课程入口没有来源计划时的现有行为。

**步骤 3：运行定向测试**

运行：

```powershell
node --test tests/preschool-daily-plan.test.mjs tests/preschool-workbench-refresh.test.mjs
node --check app.js
node --check storage.js
git diff --check
```

预期：定向测试全绿，两个脚本语法检查与差异检查退出码为 0。

### 任务 4：全量回归与浏览器验收

**文件：**
- 修改：`G:\StudyCode\个人工作台\docs\00-总控\当前状态.md`
- 修改：`G:\StudyCode\个人工作台\docs\00-总控\进度看板.md`
- 修改：`G:\StudyCode\个人工作台\docs\优化\2026-08-06-游戏化学习工作台参考分析与落地优化.md`

**步骤：**

1. 运行 `npm test`，记录完整通过数。
2. 启动现有本地服务，浏览器验证首页、练习、刷新、取消后再打卡、独立完成课程后从计划进入；检查 390px 竖屏无横向溢出、横屏侧栏常驻、运行日志无错误。
3. 不把“资料 JSON 存在”写成“课程网页已完成”，不把网页回归写成 APK/MuMu 已验收。
4. 将实际命令、页面路径、可见状态变化和未完成的发布证据写入总控文档。

### 任务 5：发布门禁与交付

**文件：**
- 检查：`G:\StudyCode\个人工作台\scripts\assemble-pages-artifact.mjs`
- 检查：`G:\StudyCode\个人工作台\.github\workflows\android-apk.yml`
- 修改：`G:\StudyCode\个人工作台\README.md`、发布文档（仅在证据真实存在时）

**步骤：**

1. 运行 Pages 静态路由/快速门禁和制品组装。
2. 运行 `npm run android:prepare`、`npm run android:build`；仅在实际生成 Debug APK 后报告产物路径。
3. 如 GitHub Actions 与 MuMu 环境可用，下载 APK、安装并验证幼儿入口/轻量练习/花园出口/刷新持久化；失败时记录精确阻塞，不把网页通过推断为 APK 通过。
4. 检查 `git diff` 与 `git status`，只提交本轮相关文件；提交 `feat: protect preschool plan rewards`，推送 `main`。标签/Release 只有在网页、APK、MuMu 和远端证据都齐全后创建。

---

## 停止条件

- 任何跨路径测试无法稳定通过时，停在工作台数据层，不继续扩展课程或花园游戏。
- 不创建第二套 `docs/00-总控`，不在 `.worktrees` 建长期总控。
- APK、MuMu、GitHub Pages/Actions 若未实际验证，必须明确标为未完成/冻结。
