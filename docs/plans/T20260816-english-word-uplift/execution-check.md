# T20260816-EW — 开工前执行检查

## 1. 前置门控

- [ ] T20260815-B3 S4（今日 3 词 + 80 词库）代码绿 —— 已确认（B3 记录 S1–S4 代码已绿）
- [ ] T20260815-vocab-unify 的 media schema 可用 —— 已确认（vocabulary-bank.json 含 media.image/audio）
- [x] 用户确认 `requirements-checklist.md` 裁决（2026-08-16：R2 无假词干扰、R19 血量缩水、R21 金币不出局、R22 双人后置）
- [x] 生图通道：S4 未走 grok，改用 `scripts/build-english-vocab-svgs.mjs` 产出 project-original SVG（80/80）

## 2. 并行冲突检查

- `prj/app.js` 是多包共改热点：确认当前无其他 in-progress 包正在改英语专区渲染段（B3 剩浏览器走查，不改代码，无冲突）
- S4 只动 assets 与 data 文件 media 字段，与 S2/S3 的 app.js/storage.js 改动无交集 → 允许并行
- `T20260816-literacy-uplift`（识字）若同期开工，双方都可能动 `storage.js` mistakes 结构 → **开工前互查字段设计，errorType 命名保持两包一致**

## 3. 可逆性

| 改动 | 回滚方式 |
|------|----------|
| app.js / vocab.js / storage.js | git 还原单文件 |
| 新 css / 新测试 / wordboss 目录 | 直接删除 |
| assets published 落位 + data media 路径 | 删新图 + 还原 data 文件（generated 目录保留不影响运行） |
| mastery 条目内新键 / mistakes.errorType | 读取端全部做缺省兼容，回滚代码后旧数据仍可读 |

高风险点：mastery ready 判定口径变更（S1 步骤 3）不可静默回滚——已升级的 ready 状态回滚后不降级，属可接受（不损害孩子体验，只是宽松）。

## 4. 范围自检

- 不重构英语引擎，只加函数/加 phase/加视图
- 不动 review-rules 间隔、阳光公式、bridge 协议、80 词内容
- 游戏只做 BOSS 战单模式单人版
- 生图只补缺失，不重绘已有 101 图

## 5. 回归预期

- 既有英语测试（B3 S4 相关）必须保持绿
- match/spell 两 phase 行为不变，只是序列中插入 quiz
- 通用错题本页仍可显示英语错词（errorType 是增量字段，不破坏旧渲染）

## 6. 结论

- [x] 放行 S1（用户 2026-08-16 确认裁决表）
