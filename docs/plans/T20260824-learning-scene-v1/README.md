# 沉浸式识字皮肤 v1 实施计划

## 结论

这个版本可以落地，但范围必须从“剧情系统”收敛为“学习页皮肤”。现有代码已经有学习伙伴轻动画、Canvas 手写、花园背景和 Android 动效降级；重复实现它们只会增加风险和体积。

v1 只做一件事：在明确的 URL 开关下，把现有花园识字卡墙呈现为“背景场景 + 中央手写学习板 + 紧凑字卡墙 + 底部学习伙伴”的视觉布局。学习数据、按钮、语音、手写和课程状态继续由当前实现负责。

## 目标地址

```text
http://127.0.0.1:4174/preschool-workbench/index.html?theme=garden-defense&learning-scene=episode-v1#courses?course=preschool-literacy
```

只有以下条件同时满足，根节点才增加 `learning-scene-v1`：

- `learning-scene=episode-v1`；
- 主题是 `garden-defense`；
- 路由是 `courses`，课程是 `preschool-literacy`；
- 课程 tab 是 `today`（未写 tab 时也视为 today）。

其他页面和无开关地址保持现状。Android 与窄屏不使用桌面放大规则；继续继承现有 50 层的横屏和 reduced-motion 处理。

## 实际改动边界

| 文件 | 改动 |
| --- | --- |
| `prj/css/preschool/51-learning-scene-v1.css` | 新增隔离皮肤；只在 `learning-scene-v1` 根节点下生效 |
| `tests/preschool-learning-scene-v1.test.mjs` | 新增静态机械测试 |
| `prj/app.js` | 只增加 URL 开关判断，并在识字卡墙根节点增加条件 class |
| `prj/preschool-workbench/index.html` | 加载 51 CSS；更新 app.js 缓存串但保留 `learning-companion=writing-v1` |

不新增 JS 控制器、剧情状态机、对白节点、素材目录、manifest、生成图、storage key、语音接口或 APK 专用逻辑。复用已经存在的 `pvz-garden-lawn-bg.webp`、学习伙伴、Canvas 和 `50-learning-companion-writing.css`。

## 视觉和学习目标

- 背景可见，减少一块不透明大白板占满页面的感觉。
- 手写区仍是最大学习焦点，字卡墙是右侧紧凑卡片队列。
- 学习伙伴继续位于内容下方，使用已有的轻微错峰摆动；不把角色放大到遮挡学习内容。
- 不增加自动剧情或额外语音。孩子仍通过“听、看提示、手写、会了/还不会”完成原学习流程。
- 关闭开关即可回到当前稳定页；不需要迁移数据或删除素材。

## 五个执行任务

1. **基线与脏工作树保护**：记录 `git status`、定向回归和发布校验；禁止整体回退、清理或整文件提交。
2. **最小挂载**：先写失败测试，再在 `app.js` 增加纯 URL 判断和识字根节点 class。
3. **皮肤实现**：新增 51 CSS，复用已有背景和伙伴；所有规则以 `learning-scene-v1` 为边界，桌面增强限定在 `html:not(.is-android-app) and min-width:1024px`。
4. **机械测试**：验证开关、课程/主题/路由边界、CSS 隔离、Android 放大护栏、动效继承和旧查询串。
5. **浏览器与回归**：打开 Codex 浏览器检查 1280×720 开关页与无开关页，检查溢出、背景、伙伴、Canvas 和原有手写回归。

## 停止和回退

无开关地址是稳定回退。若出现手写、语音、按钮、课程状态、Android 横屏或无开关页面变化，立即去掉 URL 开关并只修复/撤回本次 51 层。当前工作树有用户既有改动，禁止 `git reset --hard`、`git clean -fd`、`git checkout --` 和 `git stash`。

其他文档：

- [design-review.md](./design-review.md)：范围收敛依据；
- [scope-and-rollback.md](./scope-and-rollback.md)：挂载和回退合同；
- [scene-system.md](./scene-system.md)：皮肤布局与动画复用合同；
- [asset-plan.md](./asset-plan.md)：素材复用说明；
- [tasks.md](./tasks.md)：五个可执行任务；
- [acceptance.md](./acceptance.md)：验收门禁；
- [test-plan.md](./test-plan.md)：测试和浏览器检查命令；
- [execution-check.md](./execution-check.md)：证据与决策记录。
