# M1 — 宠物工坊（饱食度 + 投喂）

## 目标

参考图2 的宠物页：像素场景 + 宠物名牌、Lv/EXP 条、饱食度条（激活沉睡的 `growth.hunger` 字段）、投喂三档（胡萝卜/苹果/蛋糕）、每日衰减。

## 数值（方案 §4）

- 衰减：`normalize` 时按"距上次更新日期的天数 ×15"扣 hunger（下限 0）；`lastFedDate` 记最近投喂日。
- 投喂：胡萝卜 5 阳光 +15 / 苹果 8 +25 / 蛋糕 15 +50；每次 +5 petXp；上限 100。
- 阳光不足按钮禁用并显示"还差 N 阳光"。

## 现状锚点

- `growth.hunger` 已存在：`prj/child-growth.js` 102 行（默认 80）；无任何 UI 引用（全局搜索确认）。
- 宠物 art：`preschool-pet.js`（造型/孵蛋），当前造型取 `activeStyleId` → `STYLE_CATALOG`；`feed-pet` action 已有基础（app.js 9148 `feedPreschoolPet`）——工坊投喂**新建独立 action** `workshop-feed`（`data-food-id`），避免与既有 feed 语义耦合。
- 场景视觉：56 号文件（scene-immersion 包）的草地渐变语言可直接抄 token。

## 实施步骤

1. **衰减**：child-growth normalize 里，比较 `growth.updatedAt 日期 vs storage.localDate()`，差 n 天扣 `n×15`（有 updatedAt 字段；没有则在 growth 上补记 `workshopDay`）。只扣不涨、下限 0、不产生负数风险。
2. **渲染**（`renderWorkshopPage` 的 pet 分支）：
   - 场景框：宠物 art 大图 + 底部草地渐变 + 名牌（宠物名 ❤️）
   - `Lv.{level}` + EXP 条（`petXp % 100`）
   - 饱食度条：分格像素条（10 格，`hunger/10` 格点亮，颜色 hunger<30 时变红）
   - 提示行："用阳光换食物投喂，喂得越多升级越快！每天饱食度会 -15"
   - 投喂三卡：emoji（🥕🍎 cake 🎂）+ 名称 + 价格/饱食度，按钮 `data-action="workshop-feed" data-food-id="carrot|apple|cake"`
3. **动作**：click 委托加 `workshop-feed`：校验阳光 → `commit`（扣阳光走既有 `growth.sunlight -= cost` 的一致路径——注意：这是**支出**不是惩罚，D1 红线"只加不减"指惩罚性扣分，消费性支出与现有浇水-5 阳光同类，允许）→ hunger/XP 上账 → 日志 push（"喂了{name}一个{食物}"）→ `render()` + toast。
4. **动画**：投喂成功宠物跳一下（`is-fed` class 450ms）+ 心形粒子 ≤3（transform/opacity）；no-motion 静止。
5. **定价表**：放 `renderWorkshopPage` 模块级常量 `WORKSHOP_FOODS`（不进 config，本片内聚）。
6. **测试**：扩展 `tests/voxel-workshop.test.mjs`：衰减计算（n 天×15、下限 0）、投喂校验（阳光不足拒绝）、hunger 上限 100、日志条目格式。
7. **缓存戳**：追加 `&workshop=v2`。

## 边界

- 不动 `feed-pet`/`water-plant` 既有逻辑；造型切换不实现（跳转现有衣橱入口即可）。
- 饱食度 0 不惩罚、不死、不减 XP——只显示"它饿了"文案引导投喂。

## 验收

- [ ] 412×915：场景 + 双条 + 三档投喂卡完整；投喂后饱食度条上涨、阳光扣减、日志新增
- [ ] 手动把 growth 快照 updatedAt 改到 3 天前刷新：hunger 下降 45（下限 0）
- [ ] 阳光不足时按钮禁用；no-motion 无动画但功能正常
- [ ] 测试绿；截图 2 张（满/饿状态）
