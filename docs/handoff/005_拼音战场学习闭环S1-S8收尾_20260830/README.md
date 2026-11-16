# 005 · 拼音战场学习闭环 S1~S8 收尾交接（工作台 + 花园保卫战）

- **日期**：2026-08-30（工作发生于 2026-08-29 ~ 08-30）
- **交接方向**：ZCode 主会话 → dsh（外部模型/新会话）
- **完整度模式**：完整（接手者可能脱离原上下文，关键结论/数字/禁区已内嵌）
- **状态**：active

## 一句话现状

`docs/plans/T20260829-pvz-learning-loop/` 计划包 **S1~S8 全部代码落地**（"多认字=打僵尸=攒阳光=守花园"闭环贯通工作台与花园保卫战），定向测试 **46/46 绿**，dist 已同步；**未完成**的是：动态知识门的浏览器端到端走查（实现完、验证被打断）、APK 重打包与真机验收、计划包 README/acceptance 状态同步、以及若干 P1/P2 增量。

## 必含字段（接手确认用）

- **完整度模式**：完整
- **禁区**（不碰的口径 / 路线 / 已否决方案）：
  - 不引入第三方拼音音频库（shikangkai / zispace / blocklegend-audio 均因许可不明已评估否决，见 [技术分析/根因分析](./技术分析/根因分析.md)）
  - 不新增 localStorage key；奖励只走 `awardSunlight`（awardedIds 幂等）；阳光只加不减
  - 幼儿无惩罚：答错/不会不扣阳光、不阻断流程（知识门答错也种下）
  - `preschool-no-motion` / `prefers-reduced-motion` 下所有动画音效必须静止
  - 不读 `item.extra`（拼音运行时库已把 extra 拆平为顶层字段，读 extra 会静默回退成例字发音——历史坑，有回归锁）
  - 改 prj 下任何 JS/CSS 必须 bump `prj/preschool-workbench/index.html` 对应 `?v=` 缓存戳，然后 `npm run android:prepare`
  - 全仓 `npm test` 约有 43 个**并行工作遗留失败**（blocklegend / play-mods / wishes 等），不属本包范围，**不擅自修**
- **接手确认协议**：先总结复述本包 → 用户确认 → 才动手
- **当前会话 transcript 路径**：ZCode 会话 `sess_f2879109-2d3e-48a5-839c-22c3cb214ef6`（截图工件在 `C:/Users/<local-user>/.zcode/cli/artifacts/sess_f2879109-*/`）。`.jsonl` 原始路径未知，标注 🔲 待补充；权威证据链以 [测试分析报告](./测试分析报告.md) 引用的两份 test-report 为准
- **凝蜕状态指向**：`.claude/state/session-progress.md` 与 `.claude/memory/recent-decisions.md` **在本仓库不存在**（工具链不同）；最新进展以下列为准：`docs/plans/T20260829-pvz-learning-loop/{steps.md,test-report.md}`（逐切片勾选+测试数字）+ `docs/plans/T20260816-literacy-uplift/test-report.md`（布局修复六轮+知识门前身）
- **优先级链**：本交接包 → 计划包 test-report/steps → transcript；冲突时停下问用户
- **下一跳建议**：按 [行动项/下一步行动](./行动项/下一步行动.md) 的 P0 顺序执行——先补动态知识门的浏览器端到端走查（15 分钟），再重打包 APK 给用户做真机验收

## 关键产物路径 + 建议阅读顺序

1. 本 README（现状+禁区）
2. [背景上下文/关键发现](./背景上下文/关键发现.md)（闭环架构图 + 六条核心发现）
3. [技术分析/根因分析](./技术分析/根因分析.md)（历史 bug 的四个根因与修法）
4. [行动项/下一步行动](./行动项/下一步行动.md)（P0/P1/P2 全清单，含具体操作步骤）
5. [测试分析报告](./测试分析报告.md)（46/46 明细 + 既有失败口径）
6. 深证据面（只引路径，不复制）：`docs/plans/T20260829-pvz-learning-loop/`（计划包）、`docs/plans/T20260816-literacy-uplift/test-report.md`、`docs/01-方案/学习项目设计/07-僵尸战场与学习闭环优化方案.md`、`pinyin-pronunciation-kit/README.md`

## 环境与命令速查

- Windows + Git Bash；Python 3.11；Node 22
- 本地预览：`python -m http.server 8642 --bind 127.0.0.1`（仓库根起），浏览器开
  `http://127.0.0.1:8642/prj/preschool-workbench/index.html?theme=garden-defense&sim-android#courses?course=preschool-pinyin`
  （`&sim-android` = APK 模式；`#overview/#battle/#courses` 各页）
- 同步 APK 资产：`npm run android:prepare`；重打包：`npm run android:build`
- **APK 签名凭据（2026-08-30 生成，钥匙串请自行保管）**：`android/app/release.jks`
  （仓库无历史证书，此前真机均为 debug 包；首次 release 签名与旧 debug 不同，
  已装 debug 的机器需卸载重装）。alias `personalworkbench`；
  store/key 密码均为 `见仓库外私钥备份，不写入仓库`；构建时需设环境变量
  `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD`
- 定向测试：`node --test tests/pinyin-kit.test.mjs tests/pinyin-pronunciation.test.mjs tests/pinyin-tones.test.mjs tests/pinyin-wheel.test.mjs tests/pinyin-theme-enemies.test.mjs tests/garden-quiz-gate.test.mjs tests/garden-quiz-dynamic.test.mjs tests/pvz-learning-loop.test.mjs tests/preschool-literacy-card-wall.test.mjs` → **46/46**
- 题库重生成：`python scripts/build-literacy-quiz-bank.py`；音频重烤：`pip install edge-tts && python pinyin-pronunciation-kit/scripts/bake_call_audio.py`
