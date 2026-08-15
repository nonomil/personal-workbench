# T20260815-B2 — S1 六项任务练习入口补全

> 优先级：P0 | 状态：pending | 前置：execution-check 放行
> 只执行 S1。S2（错题回流）验收 S1 后再展开写细，不在本页当正在做。
> 验证以退出码为准：`exit 0` 通过。

## 目标

今日任务卡上六项（以侦查实数为准）每项都有可点"去练习"，点开对应练习弹窗，完成后打卡状态回写。

## Steps

### 1. 侦查实况（R1，只读）

- [x] 读 `prj/config.js`：列出今日任务定义（id、名称、当前是否带 practice 映射）
- [x] 读 `prj/app.js` 今日卡渲染与 `dailyPlans` 处理（约 402–434、214+ 区域）：确认 `practiceLessonId` 的消费方式、"去练习"按钮的现有渲染条件
- [x] 逐项填实况表（写入 test-report 阶段 0）：

| 任务项 | 练习目标（lesson/mode） | 现状（已接/未接/半接） |
|---|---|---|
| 识字 | | |
| 古诗 | | |
| 数学 | | |
| 英语 | | |
| 运动 | 预期 `motion-timer` | |
| 专注 | 预期 focus 计时/小游戏 | |

- **验证：** 表齐全，每行有 file:line 依据
- **回滚成本：** 无写入

### 2. 合同测试先红（R3）

- [x] `tests/preschool-daily-plan.test.mjs` 新增断言：每个今日任务项在 config 中有非空练习映射（lessonId 存在于 childCourses 或 mode 合法）
- **验证：** `node --test tests/preschool-daily-plan.test.mjs` — **先非 0**（红，缺口项数与步骤 1 一致）
- **回滚成本：** 还原测试文件

### 3. 补缺口映射（R2）

- [x] 按步骤 1 缺口逐项补：`prj/config.js` 任务定义补 practice 映射（运动→`motion-timer` 课时、专注→现有 focus mode 课时；**只复用现有 mode，不造新引擎**）
- [x] `prj/app.js`：确保六项渲染"去练习"按钮并跳对应弹窗；完成练习后回写该任务打卡状态（复用现有完成回写路径）
- **验证：** 步骤 2 测试转绿
- **回滚成本：** 还原 config.js / app.js
- **升级触发：** 某项无现成 mode 可复用 → 停，见 task.md §8

### 4. 回归

- [x] `node --test tests/preschool-daily-plan.test.mjs tests/preschool-lesson-pack.test.mjs`
- [x] `npm test`（本包合同绿；全量 347/352，5 个既有失败未修）
- **验证：** 本包退出码 0；全量不宣称 0
- **回滚成本：** 整包 S1 文件还原

### 5. 浏览器证据

- [ ] 本地服起 `prj/preschool-workbench/index.html`：六项逐一点"去练习"→ 完成一次练习 → 回今日卡看该项状态变化
- [ ] 控制台无报错；`localStorage` 快照中 `dailyPlans` 当日记录正确
- [ ] 结果（含截图或文字记录）回写 `test-report.md` 阶段 2
- **回滚成本：** 无

## Acceptance（S1）

- [x] R1 R2 R3 有测试证据（浏览器仍待补）
- [x] R4 R5（S2）已在同切片落地（用户要求继续未完成学习项）
- [x] 未 commit（除非用户要求）

## S2 错题 1/3/7 回流（2026-08-15 已写细并执行）

- [x] `storage.buildMistakeReviewQueue`：未 mastered 且恰好第 1/3/7 天入队
- [x] `storage.markMistakeReviewed`：练对 mastered 出队，练错留队
- [x] 首页非空时显示「今天复习 N 题」，走 `open-review-practice` → 现有课时弹窗
- [x] 假时钟测试绿；无新 storage 字段
- [ ] 浏览器两种状态（有队列/无队列）截图仍待补
