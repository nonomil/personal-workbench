# 测试与浏览器验证计划

## 1. 基线

从仓库根目录运行：

```powershell
node --test tests/preschool-learning-companion-writing.test.mjs
node --check prj/app.js
npm run release:verify
```

全量 `npm test` 只用于记录整体状态。当前基线已记录为 895 tests、808 passed、81 failed、6 skipped、exit 1；这些失败先按既有范围记录，不因本次皮肤顺手修复。

## 2. TDD 定向循环

```powershell
node --test tests/preschool-learning-scene-v1.test.mjs
node --check prj/app.js
```

新测试必须先在没有本次实现时因开关/CSS 合同缺失而失败，再在最小改动后通过。测试只读文件文本和模板，不启动第二套业务运行时。

## 3. 浏览器矩阵

| 地址 | 视口 | 预期 |
| --- | --- | --- |
| 花园识字 + episode-v1 | 1280×720 | 有 `learning-scene-v1`，背景和伙伴皮肤可见 |
| 花园识字无开关 | 1280×720 | 无 class，稳定页可用 |
| 方块/闯关 + episode-v1 | 1280×720 | 无 class，主题不串 |
| 英语/拼音/古诗 + episode-v1 | 1280×720 | 无 class，学科不串 |
| 花园识字 + episode-v1 | Android/窄屏 | 不应用桌面放大规则，保留原布局 |

在 Codex 浏览器中检查：

1. 开关页首帧可立即点击；
2. 点击“听一听”沿用原语音按钮；
3. Canvas 可画一笔、退一笔、重写、写好了；
4. 伙伴在下方，轻微左右摆动，三项不同时同步；
5. 去掉开关刷新后根 class 消失；
6. Console 无本次新增错误，页面没有水平溢出。

## 4. 发布检查

```powershell
npm run release:verify
node --test tests/preschool-learning-companion-writing.test.mjs tests/preschool-learning-scene-v1.test.mjs
```

最后只查看本次四个代码目标的 diff。若运行全量测试，记录真实通过/失败数和失败测试名，不写“全量通过”这种与基线不符的结论。

