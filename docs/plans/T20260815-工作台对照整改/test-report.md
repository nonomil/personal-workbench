# test-report

> W1–W3 已执行。未经用户手点三页不标 accepted、不 commit。

## 启动基线

- 启动日期：2026-08-15
- 定向合同先红：儿童「先打卡」、成人 `toggle-habit`、`buildWorkbenchWeekMemo` 均缺失

## 自动化结果

| # | 用例 | 结果 | 证据 |
|---|---|---|---|
| T1 | 成人 overview 无 toggle-habit | 通过 | `tests/workbench-contract.test.mjs` |
| T2 | 活跃天数不再读 habit.checkedDates | 通过 | 同上 |
| T3 | 儿童 overview 无「先打卡」 | 通过 | `tests/child-workbench-ui.test.mjs` |
| T4 | 学习/阅读项主按钮去课程 | 通过 | 同上 |
| T5 | buildWorkbenchWeekMemo 无 fetch | 通过 | 合同 16/16 |
| T6 | 本会话未改 games/ | 通过 | 本轮 diff 仅 app.js / config.js / adult.css / child.css / 两套工作台 html / 两份测试 |

`node --test tests/workbench-contract.test.mjs tests/child-workbench-ui.test.mjs`：**16/16**。

`preschool-workbench-refresh` 中闪卡 CSS 戳失败为既有问题，本包未修。

## 浏览器走查

待用户手点：成人首页、儿童今日、幼儿设置「导出本周学习记录」。

## 结论

- status：`review`
- 不 commit
