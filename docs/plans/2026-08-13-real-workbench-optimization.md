# 真实工作台优化实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 把幼儿今日页从“人为打勾冲完成率”收敛为“真实练习 → 自动记录 → 可见产物 → 下一步”。

**架构：** 对照《什么是真正的工作台》三原则、`docs/优化方案2` 幼小衔接方案，以及现有 `prj/` 运行时代码。不新建第二账本、不换框架、不接现算 TTS/Imagine、不做排行榜。本轮只交付幼儿首页一张可点击工作流卡。

**技术栈：** Vanilla JS、localStorage 既有三 key、现有 `completeCourseLesson` / `open-plan-practice`、Node 内置测试。

---

## 原则对照（文章 → 本项目）

| 文章原则 | 本项目硬规则 | 当前缺口 |
| --- | --- | --- |
| 不能反人性：不做人为打卡 | 幼儿主 CTA 打开练习，不是 `toggle-plan` | 首页战线主按钮仍是一键完成 |
| 不能舍本逐末：不要仪表盘 | 首页第一块是下一步，不是完成率/三界墙 | 身份卡、任务墙、世界进度、证据、周节奏同时堆在首页 |
| 不要局限成打卡网页 | 工作台=学习入口+事实库；游戏只消费事实 | 文案仍写“首页只负责打卡” |
| 游戏是壳，学习是核（方案2） | 游戏通关不得改写 `dailyPlans` | 已有 bridge，需保持 |
| 一份完成账本（方案2） | 成长世界读同一份快照 | 已遵守，禁止第二货币 |
| 儿童界面简（方案2） | 短词指令：去识字 / 去练习 / 去玩 | 任务标题偏口号，主按钮偏勾选 |

明确不做（方案2 + WorkBuddy 建议中应拒绝的项）：

- 公开排行榜、社交、班级竞争
- 空点任务发奖励、打开页现算 TTS/生图
- 整仓 fork 重型框架、引入 Supabase 作为主账本

## 现状（代码事实，不是愿望）

已有：三主题共用 `petbank_huchuliang_preschool_workbench_state_v1`；`practiceLessonId` 映射；`open-plan-practice` → `lesson-finish` → `completionSource=practice`；奖励幂等；独立 `games/`。

已补：今日页顶部工作流卡由真实下一步派生；主 CTA 为练习或游戏出口。任务墙仍保留兼容勾选。

## 切片顺序

| 优先级 | 切片 | 可见结果 | 本轮 |
| --- | --- | --- | --- |
| P0 | `M2-UX-001a` 幼儿今日工作流卡 | 首页顶部一张大卡：下一步练习 / 全完成去游戏 / 诚实空态 | **已落地**（`npm test` 120/120） |
| P1 | 首页信息减法 | 世界进度、周节奏移出首页主视觉 | **已落地**（成长页保留，`npm test` 121/121） |
| P1 | 认练测四科稳定 | 全屏关、级别档，不挂年级 | 不做 |
| P2 | 家长导出报告、PWA、素材补量 | 二级入口 | 不做 |

---

### 任务 1：工作流卡契约测试

**文件：**
- 修改：`tests/preschool-workbench-refresh.test.mjs`

**步骤 1：编写失败的测试**

断言 `getPreschoolHomeWorkflow` / `renderPreschoolHomeWorkflowCard` 存在；首页 overview 调用它；卡片动作为 `open-plan-practice` 或游戏出口，不含 `toggle-plan`；有练习证据次文案；去掉“首页只负责打卡”；`app.js` 缓存版本升级。

**步骤 2：运行测试以验证它失败**

运行：`node --test tests/preschool-workbench-refresh.test.mjs`

预期：新测试失败，显示函数未定义或首页未调用工作流卡。

### 任务 2：最小实施

**文件：**
- 修改：`prj/app.js`
- 修改：`prj/css/preschool/24-game-study-loop.css`
- 修改：`prj/preschool-workbench/index.html`（`app.js` 缓存戳）

**步骤 3：编写最小实施**

派生优先级：

1. 今日未完成且有 `practiceLessonId` 的计划 → `open-plan-practice`
2. 今日计划全部完成 → 当前主题游戏
3. 只剩无练习任务 → 去任务页（不把勾选当主 CTA）
4. 无计划 → 诚实空态 + 安排一项

若存在 `completionSource=practice`，卡片次文案显示最近一条“已完成练习：标题”。

`toggle-plan` 保留在任务墙，作为兼容弱完成。

**步骤 4：运行测试并确保它们通过**

运行：`npm test`

预期：全绿。

**步骤 5：提交**

不自动提交。用户明确要求后再 commit。

---

## 验收句

- 孩子能否不读长文点进下一步练习？
- 做完是否留下 `completionSource=practice` 且不重复发阳光？
- 全完成后卡片是否指向当前主题游戏，且游戏不改学习完成？
- 无候选时是否诚实空态，而不是假完成率？
