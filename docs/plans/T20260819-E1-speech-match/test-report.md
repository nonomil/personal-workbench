# 测试报告

> 2026-08-19 执行。不标 accepted，手玩与独立仓推送未做。

| 项 | 命令 | 退出码 | 结果 |
|---|---|---|---|
| S1 评测模块 | `node --test tests/speech-match.test.mjs` | 0 | 10/10 |
| S2/S3 接入回归 | `node --test tests/blocklegend.test.mjs` | 0 | 187/187 |

先红后绿：首跑 `ERR_MODULE_NOT_FOUND`（缺 `speech-match.js`）；补模块后 S1 绿；S2 红测为 `starsFromRating` 缺失、`matchHeard('run','running')` 不通过、html 未挂 `speech-match.js`；接入后定向绿。
