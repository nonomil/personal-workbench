# 资产计划

## 首版复用

- `assets/reused/learning/` 复制自 `prj/games/learning-defense/assets/reused/learning/`，供 10 张学习卡的图片选项使用。
- `assets/reused/world/` 复用 `platform-quest` 的天空和探险家 idle 图；`assets/reused/enemies/slime.png` 复用其 slime 图。
- Canvas 同时提供几何 fallback，素材加载失败时仍能看到天空、平台、玩家、敌人、检查点和旗帜。
- `assets/asset-manifest.json` 固定记录 source、target、sha256；所有卡片路径都是项目内 `./assets/reused/learning/...`。

## 原创替换计划

后续在 `assets/generated/<asset-id>` 下替换统一的儿童探险家动作帧、检查点旗帜、敌人和低刺激平台组。优先验收横屏小尺寸的可辨识轮廓、色盲对比、卡片图片语义和触控安全区，再更新 manifest；首版不要求调用生图。
