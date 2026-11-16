# 知识花园保卫战 · 资产计划

## 首版复用

首版只复制运行必需资产，不复制旧游戏脚本、关卡和重复备份图。复用目标包括：一张草坪背景、三种植物、两种普通敌人、一种精英敌人、一个阳光图标，以及学习题所需的 8 张语义图。

所有复用文件存放在：

```text
assets/reused/
├─ scene/
├─ plants/
├─ enemies/
├─ ui/
└─ learning/
```

来源和 SHA256 记录在 `assets/asset-manifest.json`。代码只引用新项目内的目标路径，旧游戏后续更换资源不会意外改变本游戏。

## 原创生成资产

新资产必须遵循：

```text
assets/generated/<asset-id>/
├─ source/
├─ 2d/
├─ transparent/
├─ manifest.json
└─ review.md
```

稳定 ID 使用小写 kebab-case，例如：

- `sunny-learning-lawn-background`
- `sun-bloom-guardian`
- `seed-pod-guardian`
- `moss-shell-guardian`
- `shadow-snail-raider`
- `learning-card-frame`

## 美术方向

- 儿童绘本式花园，不复制现有商业游戏角色轮廓。
- 粗轮廓、柔和体积、高饱和但不刺眼，缩到 64–96px 仍可识别。
- 背景采用横向分层：左侧树屋、中间五路草坪、右侧林间入口，上方保留卡片下落空间。
- 植物与敌人使用透明背景，统一光源来自左上方。
- UI 不在位图里烘焙文字，避免适配和本地化困难。

## 生成验收

- 检查格式、尺寸、透明通道、运行尺寸可读性和命名。
- `manifest.json` 记录提示词、工具、尺寸、来源、输出 SHA256 和限制。
- 禁止把棋盘格当透明背景。
- 新场景通过 800×360、915×412、1280×800 三种裁切检查后才能替换首版背景。

