# 资产计划

## 首版复用

- `assets/reused/learning/` 复制自 `learning-defense` 的 8 张学习选项图，所有卡片引用项目内 `./assets/reused/learning/...`。
- `assets/reused/world/` 复制自 `voxel-craft` 的天空、玩家和基础方块，用作首版 Canvas 视觉参考；当前方块、传送门和 HUD 由 Canvas/CSS 绘制。
- `assets/asset-manifest.json` 固定记录了每个复制文件的 source、target 和 SHA-256。

## 原创替换计划

后续可在 `assets/generated/<asset-id>` 下替换：一套统一的儿童探险家动作帧、一组柔和高对比的草地/石头/泥土方块、一套“卡片落下/答对/纠错/传送门”反馈动效，以及不依赖文字也能识别的触控图标。替换时保留 learning 选项图的尺寸和语义 alt 文本，先做低刺激配色与小屏横屏可读性评审，再更新 manifest。
