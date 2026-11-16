# S2 — 人物即导航（角色可点击进栏目）

## 目标

底部场景条/首页舞台的角色成为导航入口：点击角色 = 跳一下 + 气泡点名 + 进入对应栏目。三套主题角色映射自动切换。

## 现状锚点

- 伙伴 markup：`renderPreschoolCompanionRail`（`prj/app.js` 约 5839 行）——目前每个 `.preschool-learning-companion` 按钮已有 `data-action="navigate" data-page="growth"`（全部跳成长页），`aria-label` 带"名字，提示语"。
- 主题资产映射：`prj/app.js` `applyPreschoolTheme`（约 792 行）用 `theme.assetMap[slot]` 切换 `[data-preschool-nav-art]` 图片；主题定义在 `prj/config.js`（`workbenchConfig.themes`）。
- 场景条样式：56 号文件（≤480 横屏）；53 号文件 915/940/1072 行（高分横屏）。

## 实施步骤

1. **映射表**：在 `renderPreschoolCompanionRail` 的 `groups` 对象里，给每个角色增加 `target` 字段（页名或 `page + courseId`）：
   - 花园：向日葵 → `courses/preschool-literacy`；豌豆 → `courses/preschool-pinyin`；坚果 → `courses/preschool-math`
   - 方块：小晶体 → literacy；方块树 → pinyin；紫晶体 → math（沿用对应 voxel 资产）
   - 闯关：小探险家 → literacy；金币 → pinyin；终点旗 → math
   按钮的 `data-action` / `data-page` / `data-course-id` 按映射输出（`navigate` 动作已支持 courseId）。
2. **气泡点名**：heading strong 默认显示被指角色对应的栏目短名（"点我去识字～"轮换），实现方式：初始化后每 4s 轮换指向下一个角色（给对应角色加 `is-speaking` 高亮描边，气泡换文案）；点击某角色后气泡立即显示该角色栏目名。
3. **点击动画**：`.preschool-learning-companion.is-clicked` → `translateY(-10px)` 弹起 450ms 后跳转（跳转延迟 600ms，期间 `pointer-events: none` 防连点）。在 click 委托的 `navigate` 分支前，若 target 在 companion-rail 内则先加 class、延迟 `setPage`。
4. **CSS**：56 号（≤480）+ 53 号（高分横屏）各加 `is-clicked` 跳起 keyframes 与 `is-speaking` 描边（`outline` 2px 主题色，静态属性不参与动画）。全部 transform 动画。
5. **无障碍**：按钮 `aria-label` 改为"名字，去{栏目名}"。
6. **缓存戳**：`app.js` 追加 `&scene-nav=v1`。

## 边界

- 不动 `setPage` / 路由逻辑；只改渲染输出与点击前处理。
- 竖屏网页版 companion rail 若样式不同，允许仅安卓横屏生效（映射数据本身全局生效，样式可后补）。
- 607ms 延迟跳转必须可被下一次点击打断防呆（防连点已用 pointer-events 处理）。

## 验收

- [x] `preschool-scene-navigation.test.mjs` 断言三主题映射的 `data-page/data-course-id` 输出正确；场景专测 24/24 通过。
- [x] 800×360 与 1463×616 截图覆盖花园、方块、闯关主题的角色导航；角色点击沿用跳起、点名与栏目跳转逻辑。
- [x] 气泡按 4s 轮换点名并高亮对应角色，点击后立即更新栏目文案。
- [x] no-motion 下取消动画延迟并保持导航可用；测试覆盖点击隔离。
- [x] `scene-nav=v1` 已追加，三主题角色与栏目对应正确；全仓 WIP 失败按总验收手册隔离记录。
