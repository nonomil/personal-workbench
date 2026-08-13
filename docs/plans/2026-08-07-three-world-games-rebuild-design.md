# 幼儿三主题独立全屏小游戏重做 · 设计

**日期：** 2026-08-07  
**状态：** 已批准（用户确认按推荐方案）

## 目标

把幼儿工作台三款游戏世界（花园保卫 / 方块世界 / 横版闯关）统一为**独立全屏游戏页**，主角、敌人、背景等用 **Grok Imagine** 重做，玩法以可见可玩的真小游戏为准。

## 产品决策

| 项 | 决策 |
|----|------|
| 呈现 | 独立 HTML 全屏页 + 返回工作台 + 可选浏览器全屏 |
| 花园玩法 | **真塔防**：5×6、多种子、自动波次 `tickDefense` |
| 方块 / 横版 | 继续 `games/*`，Canvas 贴图升级 |
| 学习闭环 | 阳光与 `growth.garden.defense` 仍写幼儿快照；独立世界不另开积分账本 |
| 命名 | 产品文案用「花园保卫 / 方块世界 / 横版闯关」，不宣称官方 IP |

## 架构

```text
工作台 preschool-workbench
  ├─ overview / plans / rewards …（学习闭环）
  └─ 游戏入口 open-world-game
        ├─ games/garden-defense/   ← 新增，真塔防
        ├─ games/voxel-adventure/  ← 升级贴图
        └─ games/platform-quest/   ← 升级贴图 + 轻量敌人
```

- 规则层：`preschool-garden.js` 保持 API 与测试契约。  
- 花园独立页：加载 `preschool-garden.js`，读写 `petbank_huchuliang_preschool_workbench_state_v1` 的 `growth`。  
- 工作台 `garden-defense` 的 `worldGameHref` 指向独立页（与 voxel/platform 一致）。

## 资产

```text
prj/assets/generated/world-rebuild-20260807/
  garden/  voxel/  platform/
  SPEC.md  manifest.md
```

风格锚点：**阳光花园卡通 2D · 圆润厚描边 · 幼儿友好 · 无恐怖**。精灵可抠底；背景可整景。

## 非目标

- 不上 Phaser/打包器  
- 不恢复工作台内嵌多僵尸 DOM 作为主入口  
- 不引入官方商标素材  

## 验收

1. 三入口均可进独立全屏游戏并返回工作台  
2. 花园：种植 + 开局/出波 + 自动 tick + 阳光扣费  
3. 方块 / 横版：可见 Grok/主题贴图，可玩  
4. `npm test` 相关契约更新后通过  

## 修订 2026-08-07（用户反馈）

- **花园**：回退 `preschool-pvz-2d` 贴图；逻辑分辨率 1080×540；**方形 cell** + `drawSpriteContain` 禁止拉宽。  
- **方块**：改为网页常见 **等距沙盒 + 热键栏**（非奇怪顶视大格）。  
- **横版**：`idle / run / jump` 状态机 + 精灵切换。  
- 参考：plantsvszombiesjs 类车道塔防、voxel.js / 浏览器 MC clone 热键栏思路、HTML5 platformer 多动作帧。  
---