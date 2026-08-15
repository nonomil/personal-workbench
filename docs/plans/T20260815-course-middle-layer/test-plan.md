# test-plan

## 自动化（npm test，先红后绿）

| 组 | 文件 | 断言 |
|---|---|---|
| 墙卡预览 | `tests/preschool-workbench-refresh.test.mjs`（扩展） | 墙卡模板含 `preschool-course-wall-preview`；`getPreschoolCourseTodayPreview` 存在且被墙卡调用；函数体不写 `ui.` 状态（源码正则或行为断言） |
| 菜单合同 | 同上 | classic 分支含 `preschool-course-menu`；`preschool-course-parent-detail` 用 `<details` 且含 `renderPreschoolCourseCard(`；`preschool-course-library-note` 不再出现 |
| 文案合同 | 同上 | app.js 无"看看资料和其他练习"；"更多练习"“更多资料”存在 |
| 缓存戳 | 侦查清单内全部文件 | 统一为 `20260815-course-middle-v1` |
| 回归 | 全部既有测试 | 零删除、全绿（尤其墙卡三点/状态字、focused 布局、course-lanes 侧边栏既有断言） |

## 人工（真机浏览器，390px + 桌面）

1. 卡片墙：9 科预览行内容正确；完成态"今天做完啦 ✓"（可用当日翻完一科验证）。
2. 菜单：翻卡完成 →"更多练习"→ 菜单五要素齐、按钮 ≥ 44px；"家长看详情"默认折叠、展开为完整大卡。
3. 链路：菜单 → 今日课（open-lesson）→ 完成返回；菜单 →"回到今日学习页"→ 翻卡页。
4. 古诗回归：打开卡片墙后再进古诗，今日一首正常（验证墙卡渲染未污染 ui.courseCards）。
5. 320px 复测无横向溢出。

## 判定

每阶段：命令 + 退出码 + 结论写 test-report；最终 npm test 退出码 0 + 人工 5 条全过 + checklist 证据齐。
