# T20260827-minecraft-workbench — 我的世界工坊页（打卡积分 + 宠物投喂 + 攻城守家 + 装备商店）

> 源头方案：`docs/plans/2026-08-27-minecraft-workbench-design.md`（必读：§2 三大决策 D1/D2/D3、§4 数值表、§7 红线）
> 参考输入：`G:\UserCode\跨平台采集器\notes\游戏化学习工作台\纯手搓 儿子minecraft学习工作台打卡积分\`（5 屏截图已逐屏分析进方案 §1）
> 适用范围：仅 `voxel-adventure` 主题；花园/马里奥主题零改动。

## 为什么有这个包

用户提供一个 MC 风格作业工作台参考（作业积分经济、宠物喂养、怪物攻城、武器商店、消消乐任务化），希望长到现有我的世界主题上。本包把它实现为**工坊页（workshop）**：新页面五 sub-tab，状态挂在既有 growth 快照上，不新建 storage key，不动学习引擎。

## 红线（所有切片必须遵守）

1. **阳光只加不减**：不做参考的"未完成 -5 积分"真实扣分；负面后果全部是虚拟演出（家园耐久、怪物多一只）。见设计稿 D1。
2. **不新建 storage key**：新状态全部放 `growth.voxelWorkshop`（child-growth normalize 补默认值），随既有快照落盘，日志封顶 24 条。
3. **仅 voxel 主题生效**：工坊入口、tab 内容、战斗/商店行为不得影响 garden-defense / platform-quest 主题与 child/adult 工作台。
4. **旧 WebView 兼容**：禁 `:has()`、裸 `dvh/svh`（必须前置 vh 回退行）、`color-mix()`；动画只用 transform/opacity；尊重 `body.preschool-no-motion` 与 `prefers-reduced-motion`。
5. **不改学习记账数值**：任务完成奖励、测评、错题等既有数值逻辑一律不动；新增奖励只有全清 bonus(+30) 与消消乐打卡(+10)两个防重 ID。
6. **怪物可爱化**：数量 ≤2、文案不恐吓（禁"来抓你"，用"来捣乱/找你玩"）。
7. 测试基线：每片后 `npm test` ≥886 pass / ≤71 fail（历史遗留不得增加），新功能带测试。

## 切片一览（按序执行，不并行）

| 片 | 内容 | 预估 | 子文件夹 | 状态 |
| --- | --- | --- | --- | --- |
| M0 | 工坊页骨架：page 'workshop' + 路由 + 五 sub-tab + voxel 专属入口 + voxelWorkshop normalize | 0.5 天 | `M0-skeleton/` | pending |
| M1 | 宠物工坊：饱食度 UI + 投喂三档 + 像素场景 | 0.5~1 天 | `M1-pet/` | pending |
| M2 | 家园耐久 + 攻城战斗页 + 冒险日志 | 1 天 | `M2-home-battle/` | pending |
| M3 | 商店：武器四档 / 护甲三档 / 修家园 | 0.5~1 天 | `M3-shop/` | pending |
| M4 | 消消乐任务化：独立开局 + 每日一次打卡记账 | 0.5 天 | `M4-memory-game/` | pending |
| M5 | 结算仪式：全清 bonus(+30) + 结算按钮 + 总结弹窗 | 0.5 天 | `M5-settlement/` | pending |
| M6 | 皮肤打磨 + 双端验收 + APK | 0.5 天 | `M6-polish/` | pending |

## 关键代码锚点（全包通用）

| 锚点 | 位置 | 说明 |
| --- | --- | --- |
| growth 字段 normalize | `prj/child-growth.js` 102 行附近（hunger 已存在）、134 行 unicorn 合并处 | M0 的 voxelWorkshop 默认值挂点 |
| zombie 判定 | `prj/child-growth.js` 268 行 `zombieActive` | M2 攻城夜数据源 |
| awardSunlight | `prj/app.js` 8552 行（含 awardId 防重） | 新增 bonus 用同机制传新 ID |
| 页面路由 | `prj/app.js` `getPageFromHash`(约844)/`setPage`(1117)/`PAGE_META`/render 内分页分发(1484~1502) 及 preschool 分支 renderPreschoolPage(约6986) | M0 新 page 接线点 |
| 侧边栏导航 | `prj/preschool-workbench/index.html` sidebar"守护与奖励"组（66 行前后）；voxel 主题标签替换在 app.js `syncPreschoolGameNavLabels`/`applyPreschoolTheme`(792 起) | M0 入口按钮 |
| 任务清单渲染 | `prj/app.js` `renderPreschoolPlanRows`（约 4414 起的定义区搜索）+ todayPlans derived（1073） | Tab1 作业数据源 |
| 宠物系统 | `prj/preschool-pet.js`（eggs/styles/hatch-egg action）、growth.unicorn/lastFedDate 等 | M1 复用 |
| 记忆配对引擎 | `prj/app.js` 2371 行 `'play-memory'` 定义、2975 行 `renderPlayMatchBody`、play.board 动作链（play-flip 等） | M4 复用开局引擎 |
| 方块家园快照 | `prj/app.js` `renderPreschoolVoxelHomeCard`（678） | 家园卡可嵌入 mosaic |
| 主题皮肤 token | `prj/css/preschool/26-theme-skins.css`、`31-voxel-workshop.css`（--vw-* 变量）、27-theme-asset-overrides.css | 视觉语言来源 |
| 手机底导航 | `prj/preschool-workbench/index.html` 64~71 行 `.preschool-mobile-nav` | P2 可选重映射位（默认不动） |
| 本地预览 | `node tmp/serve-prj.mjs` → `http://127.0.0.1:8765`，URL 加 `?sim-android=1&theme=voxel-adventure` | 验收环境 |

## 验收基线

- 浏览器双档：手机竖屏 412×915（第一目标，参考图即竖屏）、平板横屏 1463×616（分页器整页）。
- 主题隔离走查：同 URL 换 `?theme=garden-defense` 必须看不到工坊入口、页面不受影响。
- no-motion 下：攻城动画、宠物动画静止但功能完整。
- 最新缓存戳与本包测试文件名随各片登记进各子 task.md。

## 当前状态

- 任务 ID：`T20260827-minecraft-workbench`
- 状态：`ready`（方案已确认待执行）
- 基线测试：886 pass / 71 fail（历史遗留）
