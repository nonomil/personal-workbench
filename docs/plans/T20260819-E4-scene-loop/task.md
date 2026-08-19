# T20260819-E4-scene-loop - 任务定义卡

## 1. 任务目标

把 `scenes.js` 的练一句升级为迷你跟读循环：纯逻辑引擎 + 现有场景层装配。句级进度写入 `progress.sceneSentences`，不与词 mastery 混存。无新 localStorage key。

## 2. 输入基线

- 参数：借鉴包 `04-机制参数速查.md` §7（录音上限、遍间停顿、每句 3 遍、评分低也推进）
- 评测：已有 `SpeechMatch.evaluate(..., 'sentence')`
- 剧本：`data/scenes.js` 4×3，不扩句库

## 3. 子任务

| ID | 描述 | 验证 |
|---|---|---|
| S1 | `scene-loop.js` 状态机 + 句级 stamp | `tests/blocklegend-scene-loop.test.mjs` |
| S2 | 练一句 UI：听原句 / 该你说 / 倒计时 / 再来一遍 / 跳过等待 | 定向 + 手玩 |

## 4. 边界

不做词级时间轴、不做声学打分、不复制 Echo-Loop 代码。独立仓未推。
