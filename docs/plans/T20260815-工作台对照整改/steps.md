# steps：怎么改工作台（函数级）

> 只改工作台壳层。执行顺序：S0 红合同 → S1 成人 → S2 儿童 → S3 导出。
> 不打开 `prj/games/`。

## S0 合同先红

在 `tests/workbench-contract.test.mjs` / `tests/child-workbench-ui.test.mjs` 加：

1. 成人 `renderAdultOverview` 的 HTML **不含** `data-action="toggle-habit"`。
2. 成人生活页标题不含「习惯打卡」；`yearActivityDates` 统计源码不含 `habit.checkedDates`（`app.js` 约 L970）。
3. `config.js` 儿童 overview 描述不含「先打卡」。
4. 儿童今日清单：带 `practiceLessonId` 的项主按钮不是 `toggle-plan`。
5. `app.js` 出现导出周总结函数名（如 `buildWorkbenchWeekMemo`），且函数内无 `fetch(`。

先跑红，再改生产代码。

## S1 成人工作台（W1）

文件：`prj/app.js`、`prj/config.js`。

1. **首页去勾**  
   `renderAdultOverview`（约 L5181）：删掉「今天的习惯」那张 `renderHabitRows` 卡。换成一张真实下一步卡，按优先级取第一条未完成项：
   - 未来 14 天内的 milestone → 按钮 `navigate` → `life`
   - 否则今日未完成 plan → `navigate` → `plans`
   - 否则「写下一条生活记录」→ `add-life-entry`
   - 否则「记一次阅读」→ `add-reading` / `navigate` → `reading`

2. **生活页去打卡外观**  
   `renderLife`（约 L5185）里「习惯打卡」改成「习惯备忘」。`renderHabitRows` 去掉 `data-action="toggle-habit"` 的方块按钮，只留标题和编辑/删除。`toggle-habit` 处理函数（约 L6816）可留着兼容旧 DOM，但新 HTML 不再渲染它。

3. **活跃天数不再吃打勾**  
   约 L970：`adult.habits.forEach(... checkedDates ... yearActivityDates.add)` **删掉**。年度活跃只统计：完成的计划、完成的任务、完成的生活记录、有分钟数的阅读/专注。这才是文章说的「做了工作才有热力」。

4. **文案**  
   `config.js` `adultPages.life` 可保持；`archive` 已有「完成的事项自动沉淀」，保留。

## S2 儿童工作台（W2）

文件：`prj/config.js`、`prj/app.js`。

1. **文案**  
   `childPages.overview`（`config.js` L19）：  
   `description: '先打卡，再玩耍；每一步都算数。'`  
   改为：  
   `description: '先做今天的学习，完成了会自动留下记录。'`  
   `eyebrow` 从 `TODAY / CHECK-IN` 改为 `TODAY / LEARN`。  
   `plans` 的 title「今日打卡」改为「今日学习」。

2. **今日清单主按钮**  
   儿童计划渲染（`app.js` 约 L5011 `child-plan-item`）：  
   - 若该项有 `practiceLessonId`（或能映射到课程），主行 `data-action` 改为 `open-plan-practice` / `open-plan-course`，副按钮才是 `toggle-plan`。  
   - 无练习映射的项（如运动）才允许主按钮勾选，文案写「做完再点」，不要写「完成后获得 10 阳光」当主卖点。

3. **不要新建积分。** 阳光仍走现有 `toggle-plan` / `finishLesson` 幂等，只是主 CTA 不再是勾选。

## S3 工作台导出周总结（W3）

文件：只动 `prj/app.js`。

新增纯函数 `buildWorkbenchWeekMemo(state, today)`，输入当前快照，输出 Markdown 字符串，字段全部从现有数据读：

- 本周点亮日：`growth.checkinDates` 落在本周一至今天的日期
- 完成课程：`courseProgress.completedLessonIds`（只列本周有 `dates` 的 mastery 也可，先用 completedLessonIds + 本周 dailyPlans 已完成标题）
- 未掌握错题：`mistakes` 中 `status !== 'mastered'`
- 成人：本周阅读标题、本周复盘、本周已完成生活记录
- 游戏里程碑：**不要**在本包展开。一句话带过或不写。

按钮位置：

- 幼儿 `#account` 设置页：`导出本周学习记录`
- 成人 `#reviews` 复盘页：`用本周记录起草`

点击后 `Blob` 下载 `week-memo-YYYY-MM-DD.md`。函数内禁止 `fetch`。

## S4 回归与文档

- 定向：本包新增合同先红后绿
- `npm test` 不低于启动基线（既有红不修）
- 写回 `docs/00-总控/当前状态.md` 一小节「工作台对照整改」，不要写游戏
- 不 commit

## 完成定义

成人首页看不到习惯勾；儿童今日页有练习的项主按钮是去学习；设置/复盘能下载出一份和快照对得上的 md。用户手点这三处后才标 accepted。
