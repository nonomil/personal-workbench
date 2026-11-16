# M2 — 家园耐久 + 攻城战斗 + 冒险日志

## 目标

参考图3 战斗页 + 图1 家园卡：夜晚场景（平静/怪物两态）、家园耐久条与攻城掉血、按武器伤害的驱赶演出、时间戳冒险日志。

## 现状锚点

- `growth.zombieActive`（child-growth.js 268：昨天无记录且今天未打卡时 true）；`zombieDefeated` 计数已有。
- 家园快照 mosaic：`renderPreschoolVoxelHomeCard`（app.js 678）——家园卡顶部可嵌小尺寸 mosaic（有快照时）。
- 本项目状态：`growth.voxelWorkshop.homeDurability`（M0 建）。

## 数值（方案 §4）

- 怪物数 = `zombieActive ? min(2, max(1, 未完成必做任务数)) : 0`；全清则 0 只（平静）。
- 每晚结算扣耐久：`怪物数 × (6 − 护甲减免)`，下限 0——**结算时机**：每天首次打开工坊页时计算并落账（M0 的按日钩子处），不是实时掉。
- 出击：按钮 `workshop-fight` → 演出 N 回合打击（回合数 = ceil(怪血 10 / 武器伤害)，仅演出节奏）→ 胜利 → `zombieDefeated` 走既有驱散记账路径（检查现有驱散 action，若 garden 主题专用则新建 `voxel-workshop-fight` 独立 commit，仅计 `voxelWorkshop.log` + toast，不动 zombieActive 判定——它由次日打卡状态自然消除）。
- 修家园入口在商店（M3），本片只显示耐久。

## 实施步骤

1. **家园卡**（tasks tab 顶部 + battle tab 复用组件 `renderWorkshopHomeCard()`）：房屋像素图（CSS 画或复用 garden 资产）+ 耐久分格条（绿/黄/红三段色）+ 状态文案。
2. **战斗场景**：夜晚渐变底（深紫）+ 怪物立绘（复用 `garden-walker-v5`，可爱化）：
   - 无怪：怪物原地小踱步 + "今晚很平静…" + 小字"完成今天的任务，怪物就不会来"
   - 有怪：怪物 + 血条 + "出击"大按钮（≥56px）
3. **出击演出**：点击后怪物 `is-hit` class（translateX 抖动 + 闪白 opacity），N 回合每 400ms 一次（CSS animation-delay 实现，JS 只切 class），结束 `is-defeated`（倒下 rotate 90deg 渐隐）→ 胜利 toast + 日志"击退了来捣乱的小怪！"。期间按钮禁用防连点。
4. **冒险日志**：`growth.voxelWorkshop.log` 倒序渲染 `[HH:mm] text`；写入点统一封装 `logWorkshopEvent(text)`（M1 已有喂食调用，本片加出击/耐久结算；后续片复用）。日志区黑底绿字终端风。
5. **耐久结算**：M0 的按日钩子里：若昨日有攻城（未完成必做 >0），按公式扣耐久 + 日志"家园被啃了 N 点耐久"；若当天全清额外日志"家园平安夜"。
6. **CSS**：57 号文件扩展战斗/日志段；动画全 transform/opacity；no-motion 下演出瞬时完成（直接切结果态）。
7. **测试**：耐久公式（怪物数×(6−减免)下限0）、按日只结算一次、出击后日志、no-motion 路径。
8. **缓存戳**：`&workshop=v3`。

## 边界

- 耐久 0 的表现：家园卡显示"小怪们把家拆得乱七八糟"但**不禁任何功能**；修家园在 M3。
- 不动 zombieActive 判定逻辑本身；两套主题互不感知。

## 验收

- [ ] 造数据（今天无打卡）→ 有怪态：怪物数 = 未完成必做数（≤2）；出击演出完整、胜利入日志
- [ ] 全清 → 平静态
- [ ] 快照日期改昨天 → 打开工坊触发一次耐久结算（再刷新不重复扣）
- [ ] 日志时间戳格式 `[HH:mm]`；no-motion 演出瞬时；测试绿；截图两态
