# 测试报告

## S1~S4 首轮落地（2026-08-29）

- 定向单测 `tests/pvz-learning-loop.test.mjs`：**7/7 通过**（红→绿全程留痕）。
- 回归：识字四套件 **24/24**（card-wall 的 fire 断言同步为 `firePreschoolScenePea(isReviewDefeat)`）。
- 浏览器走查（800×360 sim-android，127.0.0.1:8642）：
  - S2：首页横幅「今天认 4 / 6 个字 · 认满 6 个，僵尸就不敢来」，4/6 进度点点亮；
    due<3 时无入侵行（正确不触发）。
  - S1：拼音场次 `data-review-count=4`、僵尸 3 只；会了复习卡 → 豌豆飞行(pea:true)、
    击退动画、meta 更新 4/1、toast「会了！+3 阳光」。
  - S3：due<3 未激活（正确）；due>=3 的浏览器实操（需造 3 道错题）留待真机验收，
    逻辑由单测合同覆盖（幂等键/激活/解除/+10）。
  - S4：音效为 WebAudio 合成，无素材依赖；no-motion 早退由单测覆盖
    （截图无法体现音频，真机验收时人工听）。
- 缓存戳：`app.js…&learning-loop=v1`、`56-phone-landscape-focus.css?v=…&learning-loop=v1`；
  dist 已重建（grep 确认 2 处戳 + rail 新签名已拷入）。

## 遗留

- S3/S4 的真机验收（听感、入侵实操）待用户在 APK 打包后确认。
- S5（多主题敌人）、S6（知识花园并入战斗）按方案后置，单独立项。

## 补丁：庆祝弹窗降级 + 豌豆蓄力（2026-08-29 晚，用户反馈）

用户反馈：学一张卡就弹"过关"窗太打断；建议学几个单词再发射一颗子弹。

- 庆祝降级：flashcard-mark 的 commit 带 `suppressSceneCelebration` 旗标，学习卡场景把
  "今日点亮啦"模态降级为轻 toast（其他场景的庆祝弹窗不受影响）。
- 豌豆蓄力：普通卡 3 张蓄 1 发（`ui.scenePeaCharge`，瞬态 UI 态），豌豆射手旁
  显示 3 格蓄力条（`.preschool-scene-charge`）；蓄满发射并清零（发射后补 render
  刷新蓄力格）。复习卡维持"当场击退"不占蓄力。
- 浏览器实测：复习卡第 4 张即时击退(pea:1)；普通卡 1/2 张 charge 1→2 不发；
  第 3 张 pea:1 + 清零；全程无庆祝模态。
- 缓存戳 `learning-loop=v3`；dist 已重建；pvz 7/7 + card-wall 6/6 全绿
  （两处断言同步到蓄力/抑制合同）。

## 补丁：拼音发音修复（呼读音 + 拼读三连播，2026-08-29 深夜）

用户反馈：拼音发音有问题；要求调研开源发音数据库（参考 DS 拼音调研 + blocklegend pinyin-db）。

- 根因：`听拼音` 一直读**例字**（b 卡读"爸"）——烘焙清单只烤了 63 个例字；
  声母呼读音（b→波）、韵母呼读（a→啊）、拼读流程完全缺失。
- 数据源评估：GitHub `shikangkai/Chinese-Pinyin-Audio`（1617 音节 mp3，无 LICENSE）、
  `zispace/hanyu-pinyin-audio`（网络采集，许可不明）——均不采用；
  blocklegend `pinyin-db` 数据层完整但零音频（sourcePolicy 要求本地批准来源）。
  最终用项目自有 edge-tts 管线（与既有 4535 条同 voice）烤 **22 个呼读音 mp3**
  （generate-content-audio.py 新增 PINYIN_CALL_TEXT 段，`--dry-run` 计划 4557/4535/22 后实烤，failed=[]）。
- 实现：`PINYIN_INITIAL_CALL`(23)/`PINYIN_FINAL_CALL`(24) 表 + `pinyinCallText` +
  `pinyinBlendParts`（声母卡派生"波|啊|爸"三段）；卡片新增「跟我拼」按钮
  （`pinyin-blend` → `speakPinyinBlend`：声母轻短 0.7 速 → 韵母 → 音节 0.85 速，段间 340ms）。
- 关键坑：`preschool-pinyin.js parseBank` 把 extra 拆平成顶层字段，读 `item.extra`
  永远为空 → 静默回退例字。已改为顶层字段并加 `doesNotMatch(item.extra)` 回归锁。
- 端到端：听拼音 data-text=波；跟我拼 data-parts="波|啊|爸"，播报序列 波→啊(→爸)，
  本地音频实际命中 `/tts/pinyin/24550478.mp3`、`3aafde6b.mp3`（新烤文件）。
- 缓存戳 `pinyin-sound=v2`；测试 pinyin-pronunciation 5/5；dist 已重建。
- 后置：四声（āáǎà 逐调）与拼读转盘按 DS 方案第三轮单独立项；
  开源音节音频（若用户接受上游许可）可作为更真实童声的替代来源。

## 补丁：拼音四声条（2026-08-29 深夜，"继续"切片）

- tests/pinyin-tones.test.mjs 4/4（红→绿）；回归 18/18。
- pinyinToneForms 标调规则（a→o/e→iu/ui 后标→i/u/v）+ pinyinToneCharIndex
  （识字字库 1500 字带调拼音自动索引例字）→ 声母/韵母/整体认读卡内四声条，
  点击读例字（八/拔/把/爸），当前声调高亮。
- 修复过程：处理器误用闭包外裸 speak() → 改走 speech 模块。
- 缓存戳 pinyin-tones=v1；dist 已重建；走查 b 卡四条数据正确。

## 补丁：S6 拼读转盘（2026-08-29 深夜）

- tests/pinyin-wheel.test.mjs 4/4（红→绿）；全线 26/26。
- 数据：403 合法音节表移植自 blocklegend pinyin-db（legal-bases，无调书写形）；
  v 系双拼写（nv/lv 保留 v、j/q/x 后转 u）由 pinyinSyllableFor 自动尝试。
- 交互：声母卡出现韵母转盘（本卡/a/o/i/u/ü/ai/…全部合法组合），点选后
  四声条切到新音节（例字自动索引：b+u→补/不）、跟我拼切"波|乌"并自动播报。
- 过程修复：拼音函数块误插卡片构建函数内部导致 ReferenceError 整页白屏
  （提升到闭包顶层）；item.initial 未透传导致转盘激活判断失效。
- 缓存戳 pinyin-wheel=v2；dist 已重建。

## 补丁：S7 多主题敌人（2026-08-29 深夜）

- tests/pinyin-theme-enemies.test.mjs 4/4（红→绿）；全线 30/30。
- 敌人映射 `PRESCHOOL_SCENE_ENEMIES`：garden=僵尸三只（不变）；voxel=苦力怕/骷髅/蜘蛛
  （复用 prj/assets/generated/blocklegend-roster 的 four-view/front.png，此前被
  prepare-mobile 跳过打包——dist 需确认该目录是否随包）；platform=砖块/水管/问号方块
  （is-obstacle：复习=敲碎障碍，蹒跚动画替换为轻微悬浮 bob）。
- 三列战场 CSS 作用域从 garden/platform 扩展到 voxel-adventure。
- 走查：voxel 敌人 3/3 加载、platform 障碍模式 + 三图加载、rail 元数据（has-review-queue）正常。
- 打包修复：blocklegend-roster 在 prepare-mobile 跳过清单里，APK 不会带这些 png；
  已把三张 front.png 拷为 `preschool-theme-assets/voxel-v1/published/voxel-enemy-*.png`
  （随 voxel 主题包走），敌人映射改指向新路径；dist 已确认三图在包内。
- 缓存戳 scene-enemies=v2；dist 已重建。

## 补丁：S8 知识门——主战斗内嵌字卡（2026-08-29 深夜）

- tests/garden-quiz-gate.test.mjs 6/6（红→绿）；相关回归 14/14。
- garden-defense 每关首棵植物前弹 learning-defense 字卡（图配字 3 选 1，复用其
  data/cards + learning-gate + reused 图，路径重写跨目录引用）；答对即种、答错
  高亮正确答案后仍种下（红线：幼儿无惩罚）；结果 recordLearningOutcome 回流。
- 端到端：关 1 点草坪弹"'山'是哪一张图"（3 图加载 OK）→ 点山 → 弹层关、
  defense.plants=1；二次种植直通。顺带验证 play pass 耗尽→休息层闭环正常。
- 缓存戳 quiz-gate=v1；dist 已重建。
- 后置候选：门频率可调（首棵→每 N 棵/每波首棵）；字卡换工作台识字库动态抽题
  （需 bridge 新增识字抽卡 API，本版先复用 learning-defense 固定 10 卡）。

## E1 动态知识门浏览器端到端走查（2026-08-30，dsh 接手补证据）

- 状态切换：代码 + 单测（D1~D5 5/5）早已落地；升级为 400 字动态抽题后的浏览器端到端
  此前被打断——本次补齐：**27/27 断言全绿**。证据在 `e1-evidence/`
  （截图 4 张 + 可复跑脚本 `e2e-quiz-gate.mjs` + `e1-summary.json`）。
- 走查覆盖（800×360，`?theme=garden-defense&sim-android`，127.0.0.1:8642）：
  - 工作台 #battle →「去花园游戏」跳转带 `sim-android=1`（复验 R5 全屏合同）；
  - 首棵弹「话怎么读？」拼音三选一（非图卡），选项与 `drawLiteracyQuiz` 同源（话/huà/hé/huì）；
  - 答错：该项变红 `is-wrong`、正确项变绿 `is-correct`，850ms 后弹层关且仍种下（plants=1）；
  - `recordLearningOutcome` 回流 `workbench:memory:v1`（"话"字条入库）；
  - 连种 4 棵不再弹，第 6 棵（计数 5）再弹动态卡；答对种下（plants=6）；
  - 断网兜底：题库脚本请求被断（route-abort，bank 与页面同包故纯断网不可复现）→
    回退 LearningDefenseCards「山」图卡，3 图加载成功，答对仍种下（plants=1）；
  - 全程未新增 storage key；无异常控制台错误。
- **走查抓到 3 个真 bug + 1 处附带（单测绿挡不住，均已浏览器实测修复）**：
  1. `quizGateDoneThisStage` 死变量赋值——game.js 为 'use strict' IIFE，给未声明变量
     赋值抛 ReferenceError，`closeQuizGate` 中断，**植物永不种下**（plants 恒 0）。
     已删该行（无任何读取处）。
  2. 游戏页未加载 `preschool-speech.js`（learning-defense / voxel-learning /
     platform-learning 都有，唯独 garden 缺），题面**从不自动朗读**。已挂载；并把
     `localAudioRoot` 从调用点传入（speech 默认相对深度在游戏页必 404，buildSpeechPlan
     原先丢弃该字段）。
  3. 动态卡答错只标红、不展示正确答案（与静态图卡不一致）→ 已补 `is-correct` 高亮。
  4. 附带：`showLearningCard`（兜底图卡）漏写 `quizPendingPoint`，图卡答完不种下 → 已补。
- 缓存戳：`game.js?v=20260829-quiz-gate=v2→v3`；`preschool-speech.js` 引用戳
  `20260823-speech-v1→20260829-speech-v2`（工作台 index.html / learning-defense /
  garden-defense 三处同步）。
- 回归：定向套件 **46/46**（合同新增：D3 答错高亮 + 死变量移除 + `quizPendingPoint`×2、
  D5 speech 挂载断言、G3 死变量合同改反向）。
- 遗留：真机听感（朗读 mp3 命中、四声音效时序）留 E2 清单。

## L1+L2 落地：准备度闸门 + 诚实出口 + redeem 学习门（2026-08-30 续）

对应个性化学习引擎规范 §4.1/§4.5/§4.6 与"学完才能继续游戏"落地：

**L1.1 准备度闸门（未学字不再出题）**
- `drawLiteracyQuiz` 重构：未学字（tier2）只返回 `teachOnly` 卡（展示字+拼音+跟读，双出口
  「还不会/会了」），不再三选一 —— 消灭"没教过就考"。
- 同时修复**闭环断裂**（E1 走查发现）：知识门答题只回流 `workbench:memory:v1`，而抽题分层
  只看 `courseProgress.literacy.mastery` → 答过的字永远算"未学"，练习中/到期优先从未生效。
  现在两本账合流判定（memory words ∪ mastery），`lastOutcome`/`dueAt`/`needsReteach` 参与分层。
- 浏览器证据（E1v2 30/30）：首棵（fresh）弹「新朋友『话』——先认识一下」teach 卡并自动朗读；
  点「会了」种下且 memory 记 known；已学字随后回归三选一。

**L1.2 干扰项已见字过滤**
- 干扰选项优先取"已见字"读音（seenIndex），冷启动才降级到生成器原候选项；
  规则 3/2 归位："考字时不显示图"维持（纯文本选项）、干扰池 400 维持。

**L1.3 诚实出口（不会/跳过）**
- 三选一题追加 `.quiz-gate-option-unknown`（不会/跳过）按钮：点击记 `unknown`
  （unknownCount+1、needsReteach、不惩罚、立即种下）；下一棵按练习中优先复现该字。
- 浏览器证据：第 6 棵（计数 5）三选一带出口 → 点"不会/跳过" → plants=6、memory unknown；
  第 11 棵（计数 10）**必弹同一字**（tier0 唯一候选）→ 答对变绿 → plants=11。

**L2 redeem 学习门（把"学完才能继续"钉死）**
- `grantPlayPass(source:'redeem')` 前加 `learntToday()` 闸门：今日无任何学习证据
  （memory 回流 ∪ 卡墙 mastery 任一日期记录）→ 拒绝，reason `learn-first`；
  游戏内提示「先学一张卡，再换守护次数」。
- 每日 3 次学习和学习补发次数（learn 源）不受影响；兑换仍扣阳光。

**验证与产物**
- 定向套件 **54/54**（workbench-memory-bridge 新增 4 个运行时断言：未学 teachOnly /
  已见字三选一+干扰已见 / unknown 复现 / redeem 闸门；garden-quiz-dynamic D2 扩展 + D6 新增）。
- E1v2 浏览器走查 **30/30**，证据 `e1-evidence/e1-v2-*`（teach 卡/三选一+出口/复现/兜底截图 +
  `e2e-quiz-gate-v2.mjs` + `e1-v2-summary.json`）。
- 缓存戳：`workbench-bridge.js / game.js / game.css?v=20260830-quiz-gate=v4`；
  dist 与 capacitor public 已同步（grep 验证）。
- E2 清单同步更新：首棵按未学/已学分流描述。
