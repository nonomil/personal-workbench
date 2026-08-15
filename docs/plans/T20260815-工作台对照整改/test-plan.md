# test-plan

| # | 用例 | 文件 |
|---|---|---|
| T1 | 成人 overview HTML 无 toggle-habit | workbench-contract / 新建定向 |
| T2 | app.js 活跃天数不再读 habit.checkedDates | 源码合同 |
| T3 | config.js 儿童 overview 无「先打卡」 | 源码合同 |
| T4 | 儿童带 practiceLessonId 的项主 action 不是 toggle-plan | child-workbench-ui |
| T5 | buildWorkbenchWeekMemo 含本周日期与错题标题，且源码无 fetch | 单元 + 源码 |
| T6 | git diff games 为空（执行者自检，不写进测试也行） | 人工 |

浏览器：成人首页、儿童今日、幼儿设置导出，各截一次。
