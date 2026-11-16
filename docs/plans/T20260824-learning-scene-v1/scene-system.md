# 识字学习舞台皮肤合同

## 1. 不是剧情系统

v1 不维护阶段、对白、计时器、奖励或事件 reducer。它只是现有识字 DOM 的视觉层：页面仍由当前 `app.js` 渲染，学习动作仍由当前按钮和 Canvas 处理。

## 2. 现有 DOM 的空间关系

```text
.preschool-flashcard-page.is-literacy.is-card-wall.learning-scene-v1
├─ .preschool-literacy-wall-head       返回、标题、进度
├─ .preschool-flashcard-levels         既有等级选择
├─ .preschool-literacy-study-grid
│  ├─ .preschool-literacy-writing-slot  当前目标字 + Canvas + 写字按钮
│  └─ .preschool-literacy-card-queue    紧凑字卡墙
└─ .preschool-learning-companion-rail  已有底部伙伴带
```

51 CSS 通过根节点背景、面板透明度、间距和伙伴带层级营造场景感，不插入新节点，也不移动 Canvas。

## 3. 桌面视觉合同

仅在 `html:not(.is-android-app)` 且 `min-width: 1024px` 下启用增强规则：

- 根节点使用继承的 `--child-scene-image` 作为背景，叠加柔和遮罩，背景必须持续可见；
- 目标字/手写面板是主焦点，右侧字卡墙使用两列小卡片，不允许单卡铺满整列；
- 伙伴带在学习内容下方，保持现有三伙伴和 4.1 秒错峰摆动；
- 伙伴只做轻微 `transform`，不修改按钮、Canvas 或根布局的尺寸；
- 面板使用半透明浅色而不是整块纯白，但文字对比度和手写网格保持清晰；
- 背景、卡片、伙伴带之间保留明显间距，避免“一个框套一个框”。

建议的布局预算：主学习区约 60–70% 宽度，字卡墙约 25–32% 宽度，底部伙伴带约 72–88px 高。具体尺寸以现有页面实际可用宽度为准，不通过新增固定高度解决视觉问题。

## 4. 动画和降级

动画不在 51 层重新实现：

- 复用 `50-learning-companion-writing.css` 的 `learning-companion-sway`、错峰和 hover/focus；
- 复用 `body.preschool-no-motion` 与 `prefers-reduced-motion: reduce`；
- Android 继续使用 44px/52px 的既有横屏行布局；不在 Android 放大角色；
- 51 层如果加载失败，CSS 不会创建新 DOM，稳定页面仍可学习。

## 5. 学习节奏不变

点击“听”、看提示、会了/还不会、Canvas 落笔、退一笔、重写和写好了全部沿用原有路径。皮肤不得自动播报、自动翻卡、自动庆祝或延迟首个可操作时间。

