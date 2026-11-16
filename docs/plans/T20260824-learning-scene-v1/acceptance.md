# 皮肤 v1 验收标准

## A. 自动机械门禁

- [ ] 无 `learning-scene=episode-v1` 时，识字根节点没有 `learning-scene-v1`。
- [ ] 精确花园识字 today 地址有 class；错误主题、课程、route、tab 没有 class。
- [ ] `51-learning-scene-v1.css` 在 50 CSS 之后加载。
- [ ] 51 层每条规则都包含 `.learning-scene-v1` 边界；增强规则含 `html:not(.is-android-app)` 和 `min-width:1024px`。
- [ ] 既有 `learning-companion-sway`、错峰、`preschool-no-motion` 和 `prefers-reduced-motion` 文本/规则未被覆盖或删除。
- [ ] `learning-companion=writing-v1` 仍在 index 的 app.js 查询串中。
- [ ] `node --check prj/app.js` 通过；定向测试通过；`npm run release:verify` 通过。

## B. 稳定学习功能

- [ ] 无开关页仍有目标字、字卡墙、Canvas、听、看提示、会了/还不会、退一笔、重写和写好了。
- [ ] 开关只改变视觉 class，不改变课程数据、按钮 data-action、Canvas 节点和语音入口。
- [ ] 不新增 localStorage/IndexedDB key，不新增 TTS、网络请求、奖励或剧情状态。
- [ ] 关闭动效和 reduced-motion 仍保留可操作的学习流程。

## C. 视觉门禁（浏览器截图）

- [ ] 1280×720 开关页能看到花园背景，不是纯白大框铺满。
- [ ] 手写区是最大视觉焦点；右侧是多张紧凑字卡，不是一张卡占满列。
- [ ] 学习伙伴带位于内容下方；角色不遮挡目标字、Canvas 或按钮。
- [ ] 背景/面板/卡片层级清楚，文字和手写网格可读。
- [ ] 伙伴主体无整体半透明、白底、黑底或矩形 matte；已有动画轻微且错峰。

## D. 平台护栏

- [ ] Android 不应用桌面角色放大和大屏布局规则。
- [ ] Android 横屏原有 `grid-template-rows: 44px 40px minmax(0,1fr) 52px` 不被 51 覆盖。
- [ ] 其他主题和其他学科不受 51 CSS 污染。

## 决策

| 结果 | 决策 |
| --- | --- |
| A–D 全部通过 | `pilot-only`：保留显式开关，后续另立扩科计划 |
| 稳定功能或平台护栏失败 | `rollback`：去掉开关并定向撤回本次皮肤 |
| 视觉尚可但无法证明隔离 | `pilot-only`，不推广、不生图 |

本版本不以“像动画片”作为唯一通过条件；稳定学习功能和回退安全优先。

