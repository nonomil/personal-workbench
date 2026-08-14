# 参考来源清单

> 抓取时间：2026-07-29（Asia/Shanghai）。搜索结果仅用于发现来源，关键结论回到页面正文或公开 DOM 核实。

## 主要来源

### 1. 用户提供的学习工作台笔记

- 标题：普通人如何学习胡楚靓制作出自己的第一个个人工作台
- URL：[https://mp.weixin.qq.com/s/piEl3a24o005DcysemujCA](https://mp.weixin.qq.com/s/piEl3a24o005DcysemujCA)
- 来源层级：用户提供的笔记 / 微信公众号公开文章
- 用途：确认工作台的基础信息架构、本地 localStorage 方案、云端方案的历史背景和提示词拆解。
- 关键摘录：工作台包含首页总览、每日计划、学习任务、阅读记录、长期规划；本地版通过 localStorage 保存。
- 使用边界：参考方法和结构，不复制原文提示词作为产品代码；Supabase 方案不作为本项目后端事实。

### 2. 小红书：娃的暑假学习工作台

- 分享短链：[http://xhslink.cn/o/3gWVzwfElWV](http://xhslink.cn/o/3gWVzwfElWV)
- 可核实页面：`https://www.xiaohongshu.com/explore/6a68a8ec0000000010024b67`
- 页面标题：workbuddy还有人不会用？？？
- 来源层级：小红书公开笔记，经浏览器公开页面核实
- 用途：提炼学习任务、闯关成长、奖励、错题、统计和亲子互动的闭环。
- 关键摘录：计划和玩法可定制；语数英任务可调整；完成任务积攒阳光；有语音暖心夸奖；配套错题本、奖励中心、打卡统计、亲子互动。
- 使用边界：不下载或复用笔记配图，不复制植物大战僵尸的角色、美术或文案。

### 3. Notion Personal Templates

- URL：[https://www.notion.com/templates/category/personal](https://www.notion.com/templates/category/personal)
- 来源层级：官方模板目录
- 用途：参考个人仪表盘、阅读清单、计划、习惯追踪等模块的组合方式。
- 关键摘录：页面列出 Personal Dashboards、Reading List & Book Tracker、Planner、Habit Tracker 等个人模板类别。
- 使用边界：只参考公开分类和信息架构，不复制模板内容或品牌视觉。

### 4. Todoist Productivity Methods

- URL：[https://www.todoist.com/zh-CN/productivity-methods](https://www.todoist.com/zh-CN/productivity-methods)
- 来源层级：官方方法目录
- 用途：参考“方法入口”而不是把所有效率方法硬塞进首页。
- 关键摘录：GTD、Kanban、Time Blocking、Pomodoro、Weekly Review、SMART Goals、PARA 等被拆成独立方法。
- 使用边界：本项目只保留简化后的今日计划、周复盘和目标推进交互。

### 5. AFFiNE Personal Productivity Dashboard

- URL：[https://affine.pro/blog/creating-a-personal-productivity-dashboard](https://affine.pro/blog/creating-a-personal-productivity-dashboard)
- 来源层级：产品官方博客
- 用途：参考先定义结果/KPI、再建数据模型的顺序，以及 local-first 与云端工具的取舍。
- 关键摘录：建议从结果和 KPI 开始；核心实体可包括 Tasks、Habits、Events、Time Logs；没有决策价值的指标应移除。
- 使用边界：数据字段与数据库草案按本项目 local-first 和自托管边界重新设计。

### 6. 搜索发现入口

- URL：[https://html.duckduckgo.com/html/?q=personal+learning+dashboard+app+design](https://html.duckduckgo.com/html/?q=personal+learning+dashboard+app+design)
- 来源层级：搜索发现入口
- 用途：发现个人学习 dashboard、Notion、AFFiNE、Dribbble、Figma 等进一步参考来源。
- 使用边界：搜索摘要不作为事实依据。

### 7. 公众号教程补充

- 腾讯云：《免部署，下了就能用！腾讯版“小龙虾”WorkBuddy正式上线》
- URL：<https://mp.weixin.qq.com/s/UFpX8UXg51HoF04zKMxCtQ>
- 用途：了解 WorkBuddy 的工具背景与公开使用语境，不把它当作本项目运行时依赖。

### 8. WorkBuddy 提示词教程（二手）

- 标题：WorkBuddy提示词教程：从入门到精通的完整指南
- URL：<https://www.tahou.com/article/211663666775884805>
- 来源层级：公开二手教程；用于补充提示词结构、验收标准和常见避坑方向。
- 使用边界：搜索摘要只用于定位，不替代原文核实；不复制第三方提示词作为项目代码。

### 9. 开源索引

- Awesome WorkBuddy：<https://github.com/semlinker/awesome-workbuddy>
- 用途：查找 WorkBuddy 场景提示词、微信读书笔记和 MCP 教程的进一步入口。
- 使用边界：具体条目仍需回到作者或官方文档核实。
