# M0 — 工坊页骨架（先做，其他片的地基）

## 目标

新增 `workshop` 页：路由可达、仅 voxel 主题显示入口、五 sub-tab 可切换（内容区先放占位），`growth.voxelWorkshop` 状态字段接入 normalize。

## 实施步骤

1. **状态**（`prj/child-growth.js`）：normalize 处（102 行 hunger 附近、134 行 unicorn 合并附近）补：
   ```js
   growth.voxelWorkshop = {
       homeDurability: clamp100(source.voxelWorkshop?.homeDurability ?? 100),
       weaponId: source.voxelWorkshop?.weaponId || 'none',
       armorId: source.voxelWorkshop?.armorId || 'none',
       log: Array.isArray(source.voxelWorkshop?.log) ? source.voxelWorkshop.log.slice(-24) : []
   };
   ```
   并在保存合并处带上该字段。 hunger 的按日衰减逻辑留 M1，不在 M0 做。
2. **页面注册**（`prj/app.js`）：
   - `PAGE_META` 增加 `workshop: { eyebrow: 'VOXEL / WORKSHOP', title: '方块工坊', ... }`
   - `getPageFromHash` 白名单加 `'workshop'`（检查 hash 白名单函数，约 844 行 `getRouteFromHash`）
   - `renderPreschoolPage` 分支：`ui.page === 'workshop' && isVoxelTheme` → `renderWorkshopPage()`
   - 非 voxel 主题访问 `#workshop` → 重定向 overview（防御）
3. **渲染骨架**（`prj/app.js` 新函数 `renderWorkshopPage()` + `ui.workshopTab` 状态）：
   - 顶栏：标题"方块工坊" + 阳光 chip（复用 `points-chip`）
   - 内容区按 `ui.workshopTab`（`'tasks'|'pet'|'battle'|'shop'|'game'`，默认 `tasks`）渲染占位卡
   - 底部 `.workshop-tabbar` 五按钮（`data-action="workshop-tab"`），当前项高亮
4. **入口**（`prj/preschool-workbench/index.html` 侧边栏"守护与奖励"组顶部加）：
   ```html
   <button class="nav-item" type="button" data-action="navigate" data-page="workshop">...<span>方块工坊</span><kbd>14</kbd></button>
   ```
   并在 `applyPreschoolTheme` / `syncPreschoolGameNavLabels`（app.js 792 起）里：非 voxel 主题 `hidden` 该按钮；voxel 主题显示且图标用 `data-preschool-nav-art` 机制挂 voxel 资产（config 主题 assetMap 加 `workshop` 槽位，如 `voxel-companion`）。
5. **CSS**：新建 `prj/css/preschool/57-voxel-workbench-shop.css`（在 `preschool-workbench/index.html` 引入，缓存戳 `?v=20260827-workshop-v1`）：像素风 tabbar、面板、按钮（token 用 31 号的 `--vw-*` 变量体系）；竖屏优先，≥768 横屏面板双列。
6. **测试**：新增 `tests/voxel-workshop.test.mjs`：
   - child-growth normalize：无字段时给默认值、超 24 条日志截断
   - app.js 源码断言：`workshop` 路由注册、非 voxel 重定向、tab 五值
7. **缓存戳**：`app.js`、`child-growth.js`（如有引用处）、新 CSS 在 `preschool-workbench/index.html` 的版本串追加 `&workshop=v1`。

## 边界

- 不动现有五页任何渲染；mobile 底部导航不重映射（列 P2 可选）。
- sub-tab 内容占位即可（M1~M5 逐片填充）。

## 验收

- [ ] `?theme=voxel-adventure`：侧边栏出现"方块工坊"，点击进入五 tab 页，切换 tab 正常
- [ ] `?theme=garden-defense`：无入口；手输 `#workshop` 被送回首页
- [ ] 刷新后 `growth.voxelWorkshop` 默认值落盘（DevTools 看快照）
- [ ] 新测试绿；`npm test` 基线不退；双档截图（412×915 / 1463×616）
