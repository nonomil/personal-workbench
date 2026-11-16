# T01 步骤

## 1. 写失败测试

文件：`test/sky-shield.test.mjs`

必须覆盖：

1. `pickBubbles` 从 `['dance','girl','horse']` 抽 10 个，全部属于输入集。
2. 输入 ≥10 个不同词时，抽 10 个且不重复。
3. `hearBubble` 念 `Girl` 能打掉 `girl`；`have` 变成 1。
4. 连对 5 个不同泡后 `broken === true`。
5. 念不在泡上的词，`have` 不变。
6. 同一词念两次只算一次。

## 2. 跑红

```
cd G:\StudyCode\blocklegend
node --test test/sky-shield.test.mjs
```

预期：失败（模块不存在或函数未定义）。

## 3. 最小实施

新建 `data/sky-shield.js`，挂 `global.BlockLegendSkyShield`。不要在这里画球、改 HUD。

## 4. 跑绿

同上命令，全绿。

## 5. 同步

拷 `data/sky-shield.js`、`test/sky-shield.test.mjs` 到工作台镜像，再跑一次测试。
