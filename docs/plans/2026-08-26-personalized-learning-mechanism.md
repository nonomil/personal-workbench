# 幼儿工作台个性化学习机制实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 在不重写现有课程库、Leitner 复习队列和 Android/Web 外壳的前提下，为幼儿工作台补齐“先教后考、四值判断、动态新内容、不会重教、可信掌握、家长交接、可打印家庭复习单”闭环。

**架构：** 保留 `WorkbenchMemory` 作为唯一到期复习权威，在它之前增加一个无 DOM 的纯函数判断/预算层 `PersonalWorkbenchLearningAdaptation`。所有工作台和学习游戏通过 `WorkbenchGameBridge.recordLearningOutcome()` 写入同一本 `workbench:memory:v1` 账本，`courseProgress` 仅保留为兼容展示投影；家长复习单由同一账本确定性渲染为 Markdown/HTML，网页和 APK 直接打印，Windows 家长电脑可选调用 `E:/MineCraft/Minecraft-AI` 的 Pandoc + Edge PDF 转换链。

**技术栈：** Vanilla JavaScript、浏览器 `localStorage`/`window.print()`、Node.js `node:test`、Capacitor 8 Android、Android `PrintManager`、现有 PreschoolSpeech/TTS 与课程数据模块；可选 Windows Pandoc + Edge/Chrome 无头 PDF 转换。

---

## 0. 执行摘要

当前项目不是从零开始：已经有八学科掌握记录、`again/good/easy` Leitner 队列、错题/到期优先选择、游戏内学习卡、家长薄弱 Top 10 和 Android 横屏分页。问题主要在“判断层”和“接线层”，不是缺一套新的调度器。

本方案的裁决如下：

1. **不重建 SRS。** `prj/games/shared/workbench-memory.js` 继续拥有 `dueAt/box/ease` 和到期选题权。
2. **新增轻量适配层。** 创建 `prj/learning-adaptation.js`，只负责四值判断、准备度、预算、选项数、干扰项排序、家长交接和健康指标；不自行计算第二套到期时间。
3. **统一写入口。** 新增 `recordLearningOutcome()`，一次输入同时完成判断、记忆写入和旧 `courseProgress` 投影，逐步淘汰 UI 同时调用 `recordMemoryAnswer()` 与 `recordSubjectAnswer()/recordWordAnswer()` 的双账本行为。
4. **先解决“不会”。** 普通课程测验、闪卡和三个学习游戏都提供“我不会”；它进入重教队列，不当错题、不扣奖励、不直接再次出同一道选择题。
5. **掌握必须可信。** 首次小选项答对先记 `unsure`；只有独立确认和产出式证据才能晋级，不能只凭眼熟选择题宣布掌握。
6. **6 岁默认偏教学。** `accuracyBand=[0.90,0.96]`、教:考为 `2:1`、每日新内容上限 4，动态预算可以为 0。
7. **拼音服务识字。** 拼音的前置链、例字、词语和产出任务都与识字项关联，不建立孤立背 400 个音节的并行系统。
8. **不做 UI 大改。** 网页保留自然纵向滚动，Android 竖屏局部优化，Android 横屏沿用全屏横向分页；本次只增加必要按钮、状态和家长信息，避免重新堆满卡片。
9. **交接直接变成纸面行动。** 家长不是导出一份原始 JSON 后自己整理，而是直接得到 2–4 页 A4 家庭复习单：第一页给家长说明原因和带学动作，中间是孩子练习页，末页是答案/参考；黑白打印仍可读。

建议按 P0→P4 分五个可独立上线的版本推进。P0 单独上线就能消除当前最严重的“不会后乱选且不回流”。

---

## 1. 调研输入与采用裁决

| 输入资料 | 采用内容 | 不采用/延期 |
|---|---|---|
| `G:/UserCode/跨平台采集器/docs/调研分析总结/个性化学习机制/2026-08-25-个性化学习引擎设计规范.md` | 五状态、准备度闸门、四值结果、反应时中位数、动态预算、随状态变化的选项数、已教干扰项、产出式验证、≤10 条交接、健康指标 | 不照搬其自研稳定度模型 |
| `G:/UserCode/跨平台采集器/docs/调研分析总结/个性化学习机制/个性化学习机制-与三库结合裁决.md` | 判断层/预算层增量接入；现有 scheduler 为唯一 due 权威；不引入 BKT 全后验；不整体替换 SRS | 不复制 DS 掌机 HTML，不建立第二套账本 |
| `G:/UserCode/跨平台采集器/docs/调研分析总结/个性化学习机制/ClaudeSonnet--意见.md` | 幼小衔接边界、先用真实操作数据校准反应时、拼音应关联具体汉字/词语、远期若换调度器再评估 FSRS | 当前不接 FSRS，不把 ESP32/新硬件拉入范围 |
| `G:/UserCode/跨平台采集器/docs/调研分析总结/个性化学习机制/DS--个性化学习机制调研分析.md` | 只采用“小书包”：允许诚实说不会，并把难点交给家长 | 纯轮转、固定每日 4 个、跳过后不回流、干扰项只取当日池均不可复用 |
| `E:/MineCraft/Minecraft-AI` 打印资料链 | 复用“结构化 Markdown → A4 HTML → Edge/Chrome 无头打印 PDF”的方法；参考学习单 2–4 页、黑白可读、表格不跨页 | 不调用其 Minecraft 日志/模型生成流程；不把 `E:` 盘做成 APK 运行时依赖；DOCX 转换器有硬编码 Minecraft 页脚，当前不直接复用 |

这里最重要的不是增加题量，而是停止制造三类假信号：没教过却考、蒙对却算会、只会认却算掌握。

---

## 2. 当前项目能力与缺口

| 机制 | 当前已有能力 | 真实缺口 | 裁决 |
|---|---|---|---|
| 分科学情 | `prj/child-courses.js:29-40` 已有 literacy/english/pinyin/poetry/math/motion/phonics/minecraft 八轨；`197-247` 记录活动、日期、正确率 | 输入仍是 `correct:boolean`；状态只有 `introduced/practicing/ready/maintenance`；正确率阈值 80%；没有 unknown/unsure/slip、重教和产出证据 | 保留为兼容投影，状态语义由统一记忆账本提供 |
| 到期调度 | `prj/games/shared/workbench-memory.js` 已有 `recordAnswer/dueWords/pickCards/weakWords`，间隔 `[1,3,7,14,30]` | 只懂 `again/good/easy`；`responseMs` 只存最后一次；连续两次 again 才 `needsRelearn`；unknown 会被误压成 wrong | 扩展 `recordOutcome()`，不替换现有 Leitner 算法 |
| 统一持久化 | `prj/games/shared/workbench-bridge.js:181-233` 使用独立域 `workbench:memory:v1` | `recordMemoryAnswer()` 与 `recordWordAnswer()/recordSubjectAnswer()` 形成双写、双语义；主工作台没先加载 memory 核心时会走不同的 3 天 fallback | 新增单一命令入口；projection 可重建 |
| 游戏学习卡 | `prj/games/shared/learning-card-overlay.js:68-105` 同时写课程进度和记忆；三个游戏可从共享队列选卡 | 固定 `≤2500ms=easy`；错题只有 `again`；没有“我不会”；未基于个人基线；纠错后又写一次课程正确记录 | UI 只报 `correct/wrong/unknown`，判断交给适配层 |
| 工作台闪卡 | `prj/app.js:5871-5904` 已有“会了/还不会”，识字有提示流程 | 普通 bank quiz `prj/app.js:3353-3394` 没有“我不会”；`unknown` 多是 UI mark，不是重教状态 | 统一三值输入和重教教学卡 |
| 掌握证据 | 已要求至少两次活动、两个日期、两种活动 | 仍可只靠选择/自评；首次答对直接加正确；没有独立确认和产出证据 | 新晋级要求四值 known + 独立确认 + 产出证据 |
| 干扰项 | 各学科已有自己的题库和选项 | 没有中央硬规则保证“只用已教项、池≥8、按可混淆度、提示不泄漏” | 适配层统一过滤与排序，各学科只实现 confusability |
| 家长视图 | `prj/review-workbench.html:49-92` 已有薄弱 Top 10、24 小时到期；`app.js:6490` 有学情摘要 | 只显示错几次/box；没有原因、动作、unknown/unsure/lapse；无法判断掌握是否虚高 | 改成 ≤10 条可行动交接，同时保留到期摘要 |
| 导出与打印 | `prj/app.js:6145-6172` 已能用 `window.print()` 打印识字错字卡/证书；`8714-8729` 能下载 Markdown 周记录；`40-literacy-uplift.css:983-1034` 已有 A4 print CSS | 打印仅覆盖识字；周记录是原始摘要，不是家长可直接带学的复习材料；APK 的 `window.print()` 缺少原生打印兜底 | 抽出通用打印服务，按 handoff 生成跨学科 A4 复习单；Web 用浏览器打印，APK 接 Android PrintManager，Windows 可选生成 PDF |
| Android/Web 布局 | 已有网页自然滚动、Android 横屏全屏横向分页、高分辨率 1080/1440 布局测试 | 新按钮或家长指标若直接塞进现有卡片，会再次造成横屏拥挤或纵向滚动 | 学习交互一屏一个步骤；详细指标只放家长页 |

### 2.1 当前最危险的接线问题

`prj/preschool-workbench/index.html` 当前加载 `child-courses.js → workbench-bridge.js → app.js`，却没有像三个学习游戏一样先加载 `workbench-memory.js`。因此同一个 `recordMemoryAnswer()`：

- 在游戏内走完整 Leitner 核心；
- 在主工作台可能走 `workbench-bridge.js:207-226` 的 fallback；
- fallback 固定 3 天、没有 ease/needsRelearn/responseMs 完整语义。

P0 必须先修脚本加载顺序，否则后续个性化逻辑会在网页、APK 主工作台和独立游戏中表现不一致。

---

## 3. 目标架构

```text
现有课程/词库/题库
        │  领域适配：cue / teach / prereq / tags / produce
        ▼
准备度闸门 ── new 只能教学；前置未掌握不得投放
        │
        ▼
今日计划 ── 重教 → 到期复习 → 已教练习 → 动态新内容
        │
        ├──────── Web 工作台 / APK 竖屏
        └──────── APK 横屏分页 / 三个学习游戏
                         │ UI 只报 correct / wrong / unknown
                         ▼
              LearningAdaptation.classifyOutcome()
              known / unsure / slip / unknown
                         │
                         ▼
              WorkbenchMemory.recordOutcome()
                唯一记忆账本 + 唯一 due 权威
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       courseProgress 兼容投影    家长交接 / 健康指标
                                      │
                                      ▼
                         ReviewSheet Markdown/HTML
                         Web print / APK PrintManager
                         Windows 可选 PDF 转换
```

### 3.1 模块所有权

| 职责 | 唯一所有者 | 说明 |
|---|---|---|
| 内容本身、前置、教学素材、混淆标签、产出方式 | 现有各学科数据模块 | 不复制一套新题库 |
| UI 三值输入推导四值结果 | `prj/learning-adaptation.js` | 无 DOM、无存储、可单测 |
| `box/ease/dueAt` 和到期排序 | `prj/games/shared/workbench-memory.js` | 唯一 scheduler |
| 本地账本读写与兼容投影 | `prj/games/shared/workbench-bridge.js` | UI 不直接 setItem |
| 分科学情汇总 | `prj/child-courses.js` | 从统一记录生成只读投影 |
| 页面/游戏交互 | `prj/app.js`、`learning-card-overlay.js` | 只呈现与收集输入，不自行判定 easy/good |
| 家长交接与健康统计 | 适配层纯函数 + `review-workbench.html` 渲染 | 不创建新 storage key |
| 家庭复习单数据与打印版式 | `prj/parent-review-sheet.js` + `55-parent-review-print.css` | 同一份 handoff 数据生成家长说明、孩子练习、答案参考；不输出原始 JSON 作为学习材料 |
| APK 打印 | `ParentReviewPrintPlugin` + `MainActivity` | 调用 Android `PrintManager`；不读取 Windows 路径 |
| Windows PDF 转换 | `scripts/export-parent-review.ps1`，可选调用 `E:\MineCraft\Minecraft-AI\tools\生成每日学习资料PDF.ps1` | 只复用确定性 Markdown→HTML→PDF 链，不调用 Minecraft 模型/日志流程 |

### 3.2 新纯函数 API

创建 `prj/learning-adaptation.js`，浏览器挂载：

```js
global.PersonalWorkbenchLearningAdaptation = Object.freeze({
    DEFAULT_POLICY,
    normalizeRecord,
    classifyOutcome,
    computeReadiness,
    computeNewBudget,
    optionCountForState,
    rankDistractors,
    buildHandoff,
    buildHealth
});
```

职责边界：

- 不访问 DOM。
- 不读写 `localStorage`。
- 不计算独立的 `dueAt`。
- 不生成课程内容。
- 不改变阳光、奖励、游戏通行证。

### 3.3 6 岁默认策略

```js
const DEFAULT_POLICY = Object.freeze({
    accuracyBand: [0.90, 0.96],
    unknownRateMax: 0.25,
    dailyNewCap: 4,
    teachToTestRatio: 2,
    optionsByState: { taught: 2, practicing: 3, mastered: 4, maintained: 0 },
    distractorPoolMin: 8,
    distractorTopK: 5,
    masteryKnownStreak: 3,
    provisionalFirst: true,
    guessRtRatio: 0.4,
    distractedRtRatio: 8,
    rtBaselineWindow: 20,
    rtBaselineMinSamples: 8,
    handoffLimit: 10
});
```

`rtBaselineMinSamples=8` 是本项目的保守冷启动值，不是学术常数。未积累 8 个有效 known 样本前，不用固定毫秒阈值猜测孩子快慢，只应用“首次小选项答对暂记 unsure”和“使用提示后不晋级”。后续必须用真实设备数据校准。

---

## 4. 状态、结果与数据模型

### 4.1 五状态

```text
new --完成教学--> taught --首次独立 known--> practicing
practicing --满足可信证据--> mastered --30 天冷测通过--> maintained
  ▲                    │                │                     │
  └──── unknown 后重教 ◄────────────────┴─────────────────────┘
```

硬规则：

- `new` 绝不进入测验，也不能当干扰项。
- 前置项未 `mastered`，目标项不能进入 teach 队列。
- `unknown` 立即设置 `needsReteach=true`，学习状态回到 `taught`；完成一次真实重教事件后才重新可测。
- 单次 `slip` 缩短复习，但不把历史掌握直接清零；反复 lapse 进入家长交接。
- `maintained` 使用说、写、拼、直接作答等无选项产出任务。

### 4.2 UI 三值与引擎四值

| UI 输入 | 引擎输出 | 判定 | 学习动作 | 调度动作 |
|---|---|---|---|---|
| `unknown` | `unknown` | 主动点“我不会” | 展示教学卡，加入重教；不惩罚 | 不把 unknown 当 Again 喂给 Leitner；保留旧调度参数，优先走重教队列 |
| `wrong` | `slip` | 选择了错误答案 | 纠错；累计 lapse/混淆 | 走缩短间隔语义，不伪造 unknown |
| `correct` | `unsure` | 首次答对且选项≤3；使用过提示；反应时 `<0.4×个人中位数` 或 `>8×个人中位数` | 继续练，掌握信用 +0 | 不拉长间隔、不晋级 |
| `correct` | `known` | 非首次、无提示、反应时正常的独立成功；或产出式成功 | 累计 known/独立/产出证据 | 沿用现有 good/easy 推进规则 |

“独立确认”至少满足：不是同一道题的纠错点击、没有揭示答案/提示、拥有新的 attempt id。晋级仍要求跨日期和跨活动证据，因此同一局连续点对不能刷成 mastered。

### 4.3 统一记录（memoryVersion 2）

继续使用 `workbench:memory:v1` 存储键，只升级内部 `memoryVersion`，避免迁移时同时维护两个存储域。

```js
{
  memoryVersion: 2,
  words: {
    "english:apple": {
      contentId: "english:apple",
      key: "apple",
      track: "english",
      learningState: "practicing",

      box: 2,
      ease: 2.5,
      dueAt: 1787702400000,
      lastSeenAt: 1787616000000,
      lastGrade: "good",

      attempts: 6,
      correct: 4,
      wrong: 1,
      knownCount: 2,
      unsureCount: 2,
      slipCount: 1,
      unknownCount: 1,
      knownStreak: 1,
      lapses: 0,

      firstTaughtAt: 1787000000000,
      lastOutcome: "known",
      recentResponseMs: [3100, 2800, 2950],
      needsReteach: false,
      distinctDates: ["2026-08-24", "2026-08-26"],
      activityTypes: ["listen-select", "speak"],
      evidence: {
        independentKnown: 2,
        recognitionKnown: 1,
        productionKnown: 1,
        lastProductionAt: 1787616000000
      }
    }
  },
  healthByDate: [
    { date: "2026-08-26", known: 12, unsure: 2, slip: 1, unknown: 1 }
  ]
}
```

约束：

- `recentResponseMs` 只收录有效 known，最多 20 条；不用均值。
- `healthByDate` 是最多 30 天的聚合计数，不保存无限事件流。
- `confusionTags/prereq/produce` 属于内容 Item，不复制到每个学习者记录。
- 保留 `box/ease/dueAt/correct/wrong` 以兼容已有代码与报表。
- `contentId` 用领域命名空间避免碰撞；同一个英语词在工作台、Minecraft 和三个游戏中都映射为同一 `english:apple`，来源放 `lastSource`，不要复制成三条。

### 4.4 旧状态迁移

| 旧 `courseProgress.*.mastery.state` | 新 `learningState` | 迁移说明 |
|---|---|---|
| 无记录 | `new` | 必须先教学 |
| `introduced` | `new` | 旧数据不能证明真的看过教学卡；保守地重新教学一次 |
| `practicing` | `practicing` | 保留 attempts/dates/activityTypes |
| `ready` | `mastered` + `legacyMastery=true` | 不清空孩子已有成果；进入 maintained 前补一次产出式验证 |
| `maintenance` | `maintained` + `legacyMastery=true` | 保留，但下一次到期任务优先采用产出式 |

迁移函数必须幂等：相同 v1 输入运行两次得到同一 v2，不得重复增加计数、阳光或尝试次数。

---

## 5. 今日计划与内容选择

### 5.1 队列顺序

一次学习会话按以下优先级取内容：

1. `needsReteach=true` 的重教项；
2. `WorkbenchMemory.dueWords()` 返回的到期项；
3. 已教但仍 practicing 的轻量确认；
4. `computeNewBudget()` 允许的新内容，先 teach 后 test；
5. maintained 的低频产出式冷测。

重教队列不是第二个 scheduler：它没有另一套间隔，只是由 `needsReteach` 明确标记的教学动作，完成后仍回到唯一 due 队列。

### 5.2 动态新内容预算

```js
function computeNewBudget(input, policy) {
    const limits = policy || DEFAULT_POLICY;
    let budget = Math.max(0, Math.min(limits.dailyNewCap, Number(input.previousBudget) || 2));
    const unknownRate = Number(input.unknownRate);
    const accuracy = Number(input.retrievalAccuracy);

    if (Number.isFinite(unknownRate) && unknownRate > limits.unknownRateMax) budget -= 2;
    else if (Number.isFinite(accuracy) && accuracy < limits.accuracyBand[0]) budget -= 1;
    else if (Number.isFinite(accuracy)
        && accuracy > limits.accuracyBand[1]
        && Number.isFinite(unknownRate)
        && unknownRate < 0.10) budget += 1;

    return Math.max(0, Math.min(limits.dailyNewCap, budget));
}
```

规则解释：

- 没有足够历史数据时从 2 个开始，不直接投满 4 个。
- 某天 unknown 高或检索正确率低时允许 0 个新内容，只重教和复习。
- `retrievalAccuracy = known / (known + slip + unsure)`；unknown 单独用 `unknownRate` 观察，不能混成一个正确率。
- teach:test 为 2:1，表示每 1 个轻量测验步骤前后应有约 2 个教学/重教步骤，不是要求一屏同时显示三块内容。

### 5.3 选项与干扰项

| 状态 | 答案选项 | 额外出口 |
|---|---:|---|
| taught 首次检索 | 2 | “我不会” |
| practicing | 3 | “我不会” |
| mastered | 4 | “我不会” |
| maintained | 0，产出式 | “我不会/请家长帮忙” |

干扰项管线固定为：

```text
全领域候选
→ 同一可比较维度
→ learningState 至少 taught
→ 排除目标/同义重复/本局已用
→ 候选池必须 ≥8
→ confusability 由高到低
→ 在 Top 5 内带种子随机
```

如果已教池不足 8，不允许拿未教项凑数：回退为教学卡、是非辨析或延迟该题。考字时不同时显示能直接泄漏答案的图片；教学阶段可以继续图文音齐全。

---

## 6. 分学科适配

| 学科 | 教学 Item | 测验 cue | 可混淆项 | 最高档产出 | 个性化约束 |
|---|---|---|---|---|---|
| 识字 literacy | 字形、标准音、图片、例词、语境 | 单独字形或听音，不同时给答案图 | 形近字、同音/近音字、同部件字，且都已教 | 读出、组词、描/写 | 识别与产出分开计证据 |
| 拼音 pinyin | 声母/韵母/声调规则 + 具体例字/词 | 字→音、音→拼合、调号辨析 | 同音节异调、近声母、近韵母 | 读出音节、拆合、给字标音 | `prereq` 关联识字项；整体课程权重低于识字，不孤立背音节表 |
| 英语 english | 图片、语义、音频、例句 | 听音选图、看词选义、词形辨析 | 同类别、近音、近拼写的已教词 | 说词、拼写、在短句中使用 | 工作台/Minecraft/游戏共享 `english:<word>` |
| 自然拼读 phonics | 音素、字母/字母组、blend 示范 | grapheme→sound、sound→grapheme、解码 | 已教近音位/近字母组 | 拼读未见但可解码词、听音拼字 | “背过这个词”不能替代规则迁移证据 |
| 数学 math | 实物/点阵/数轴/动作讲解 | 尽量直接口答/键入/摆放 | 仅在必要时用常见错误结果 | 直接作答并说思路/操作 | 能产出就不默认选择题，减少猜测污染 |
| 古诗 poetry | 图景、释义、分句音频、节奏 | 上句接下句、缺词、排序 | 同首已教诗句或语义近项 | 无提示背诵/续句 | 家长确认可作为产出证据，但必须标 source |
| Minecraft 兴趣词 | 复用英语 Item，附主题来源 | 与英语一致 | 与英语已教池共用 | 说/拼写/游戏中辨认 | 不建立重复 mastery，只增加 context/source |
| 运动 motion | 动作示范、安全提示 | 不做知识型多选 | 不适用 | 实际完成 + 家长确认 | 不纳入 retrievalAccuracy/chanceLeak；只做计划和完成记录 |

### 6.1 拼音的具体优先顺序

1. 已认识的例字/词进入拼音教学；
2. 教声母/韵母/声调或拆合规则；
3. 首次检索二选一 + “我不会”；
4. 独立拼读同规则的新例字；
5. 最终读出/拼出，不再给选项。

这能避免“音节卡背熟，但遇到新字不会拼”的假掌握。

---

## 7. 家长交接与健康指标

### 7.1 交接清单

`buildHandoff()` 最多返回 10 条，每条包含：内容、学科、原因、证据、建议动作、最高可混淆项、前置缺口。

```js
{
  contentId: "pinyin:ba1",
  label: "bā",
  track: "pinyin",
  reasonCode: "repeated-unknown",
  reason: "最近主动点了 3 次不会",
  evidence: { unknownCount: 3, unsureCount: 0, lapses: 0 },
  action: "用“八/爸爸”的实物或动作重新讲一次，再回 App 做二选一",
  confusedWith: "pinyin:pa1",
  blockedBy: []
}
```

优先级与动作：

| 触发 | 原因 | 建议动作 |
|---|---|---|
| `unknownCount≥2` | 反复够不着 | 换实物、动作或情境进行首次/重新讲解，不在 App 里机械重复 |
| 曾 mastered 且 `lapses≥2` | 学过又忘 | 与最高可混淆项并排对比 |
| `unsureCount≥3` | 长期疑似蒙对 | 换成说/写/拼等产出式验证 |
| 前置未通却已排队 | 前置链断裂 | 先教明确列出的前置内容 |

### 7.2 指标定义

| 指标 | 计算 | 目标/解释 |
|---|---|---|
| `unknownRate` | unknown / 全部结果 | 5%–20%；>25% 表示闸门漏或投放太快，<3% 要检查孩子是否理解“我不会” |
| `retrievalAccuracy` | known / (known + slip + unsure) | 本项目目标 90%–96% |
| `unsureRate` | unsure / (known + unsure) | <15%；>25% 检查选项、干扰项和提示泄漏 |
| `chanceLeak` | 未教灰盒题正确率 vs 1/n | 默认只在自动化/家长诊断模式运行，不进入正常儿童计划、不记成绩、不改状态 |
| `coldRetention` | mastered 项 30 天后无预告重测 known 率 | ≥80% |
| `productionTransfer` | 产出式 known / 产出式尝试 | 与认读率并列显示；差距过大说明只建立了眼熟 |

`chanceLeak` 与“new 永不正常出题”表面冲突，因此本项目不默认每 50 题向孩子插入陌生题。P4 首先用固定夹具和模拟记录检测位置/提示/干扰项泄漏；如启用真人灰盒诊断，必须由家长显式开启、完全不计分、不写学习记录，并在结束后立即解释/教学。

### 7.3 可打印家庭复习单

“导出数据”要区分两种用途：

| 输出 | 用途 | 是否给孩子直接看 |
|---|---|---|
| JSON 快照 | 备份/迁移/故障恢复 | 否 |
| 原始 Markdown 周记录 | 发给家长或 AI 做总结 | 否，不作为带学材料 |
| 家庭复习单 Markdown/HTML/PDF | 家长拿着带学、复习、勾选完成 | 是，按页面角色分开 |

复习单由 `buildHandoff()` 和当前内容 Item 确定性生成，不再调用模型重新判断孩子会不会。默认 2–4 页 A4：

1. **家长说明页：** 日期、孩子昵称（可选）、本次最多 10 项、每项的原因、证据和建议动作；明确“先讲什么、怎么讲、何时回 App 复测”。
2. **孩子练习页：** 每项只展示适合带学的 cue、图片/字形/拼音/例词、说一说/指一指/写一写/拼一拼空格；不把 `unknownCount`、`lapses` 等失败标签贴在孩子面前。
3. **答案与提示页：** 正确读音、例字/词、家长提示、容易混淆项；默认分页，避免孩子先看到答案。
4. **按需专项页：** 识字田字格、拼音声调/拆合、英语音标与短句、phonics blend、数学草稿区、古诗续句；没有专项内容时不生成空页。

打印版式要求：

- `@page { size: A4; margin: 14–16mm; }`，表格重复表头，卡片 `break-inside: avoid`。
- 黑白打印保留边框、层级和勾选框；彩色只作辅助，不用颜色传递唯一信息。
- 一页内容不足时不强行塞满；一项内容过长时从下一页开始，不让题目跨页断开。
- 输出文件名固定为 `YYYY-MM-DD_<child>_家庭复习单.md/.html/.pdf`；原始 JSON 仍单独保存，避免互相覆盖。

#### 参考 `Minecraft-AI` 的真实方法

已核对参考仓库中的调用链：

```text
E:\MineCraft\Minecraft-AI\tools\导出Minecraft英语资料.py
  └─ 生成 Markdown 学习单
      ├─ tools\生成每日学习资料DOCX.py
      │    └─ scripts\markdown-to-learning-docx.py
      └─ tools\生成每日学习资料PDF.ps1
           └─ scripts\markdown-to-learning-pdf.ps1
                └─ Pandoc → standalone HTML → Edge/Chrome headless → PDF
```

当前项目只复用最后一段确定性排版方法：先生成自己的复习单 Markdown，再调用 PDF 转换脚本；不调用 `导出Minecraft英语资料.py` 的 Minecraft 日志读取或模型生成，因为本项目已经有本地学习记录，模型不应重新猜测学情。参考仓库的 DOCX 转换器页脚写死为 `Minecraft English Learning Sheet`，因此第一版不直接把它当通用 DOCX 生成器；如果要支持 DOCX，先把页脚、输出根目录和标题参数化，再接入。

由于 Android APK 无法访问家长电脑的 `E:` 盘，运行时分三层：

- Web：在当前页面创建打印 DOM，调用 `window.print()`；也提供下载 HTML 作为浏览器打印兜底。
- APK：优先调用本地 `ParentReviewPrintPlugin` 的 Android `PrintManager`，系统打印对话框可以打印或保存 PDF；插件不可用时下载打印 HTML。
- Windows 家长电脑：可用 `scripts/export-parent-review.ps1` 把下载/生成的 Markdown 传给 `E:\MineCraft\Minecraft-AI\tools\生成每日学习资料PDF.ps1 -MarkdownPath <path>`，生成固定 PDF。脚本路径通过 `MINECRAFT_AI_ROOT` 覆盖，默认才使用该 `E:` 路径。

---

## 8. 分阶段实施

| 阶段 | 范围 | 可独立验收的结果 |
|---|---|---|
| P0 | 主工作台加载统一核心；全入口“我不会”；unknown 回到重教；桥接单入口 | 孩子可以诚实退出，不会被记错，也不会从队列永久消失 |
| P1 | 四值结果、个人反应时中位数、首次答对 provisional、bounded counters | 蒙对不再增加掌握信用；手滑与不会分开 |
| P2 | 五状态准备度、前置链、动态 newBudget、2:1 教考 | 未教项不出题，状态差时当天可 0 新内容 |
| P3 | 已教干扰项、领域 confusability、产出式晋级、拼音-识字关联 | 选择题不再靠排除陌生项；掌握至少有一次产出证据 |
| P4 | ≤10 家长交接、健康指标、chanceLeak 夹具、30 天 coldRetention、家庭复习单 Markdown/HTML/PDF | 家长知道为什么卡住、下一步做什么，并能直接带着纸面材料复习；能发现虚假掌握 |

---

## 9. 逐任务实施计划

> 下面所有任务都应在专用 worktree 中执行。当前仓库存在大量未提交修改，不得 reset/clean，也不得覆盖与本计划无关的用户改动。

### 任务 1：建立适配层合同与 v2 幂等迁移

**文件：**
- 创建：`prj/learning-adaptation.js`
- 创建：`tests/learning-adaptation.test.mjs`
- 修改：`prj/games/shared/workbench-memory.js`
- 修改：`tests/workbench-memory.test.mjs`

**步骤 1：编写失败测试**

```js
test('v1 memory migrates to v2 once and preserves Leitner scheduling', () => {
  const v1 = { memoryVersion: 1, words: { apple: { key: 'apple', track: 'word', box: 2, ease: 2.5, dueAt: 100, attempts: 2 } } };
  const once = memory.createMemory(v1);
  const twice = memory.createMemory(once);
  assert.equal(once.memoryVersion, 2);
  assert.deepEqual(twice, once);
  assert.equal(once.words.apple.box, 2);
  assert.equal(once.words.apple.dueAt, 100);
  assert.deepEqual(Array.from(once.words.apple.recentResponseMs), []);
});

test('policy exposes the six-year high-success defaults', () => {
  assert.deepEqual(Array.from(adaptation.DEFAULT_POLICY.accuracyBand), [0.90, 0.96]);
  assert.equal(adaptation.DEFAULT_POLICY.dailyNewCap, 4);
  assert.equal(adaptation.DEFAULT_POLICY.teachToTestRatio, 2);
  assert.equal(adaptation.DEFAULT_POLICY.handoffLimit, 10);
});
```

**步骤 2：运行并确认失败**

运行：

```powershell
node --test tests/learning-adaptation.test.mjs tests/workbench-memory.test.mjs
```

预期：`learning-adaptation.js` 或 v2 字段/导出不存在而失败。

**步骤 3：最小实现**

- 使用现有 IIFE + `globalThis` 风格，确保浏览器和 Node VM 都可加载。
- `createMemory()` 只做结构迁移，不增加任何学习次数。
- 新增字段按零值/空数组补齐，保留旧 `box/ease/dueAt`。
- `recentResponseMs`、`distinctDates`、`activityTypes` 都做定长/去重规范化。

**步骤 4：运行并确认通过**

运行同上，预期定向测试全绿。

**步骤 5：提交**

```powershell
git add prj/learning-adaptation.js prj/games/shared/workbench-memory.js tests/learning-adaptation.test.mjs tests/workbench-memory.test.mjs
git commit -m "feat: add personalized learning adaptation contract"
```

### 任务 2（P0）：统一脚本加载与单一写入口

**文件：**
- 修改：`prj/preschool-workbench/index.html`
- 修改：`prj/games/learning-defense/index.html`
- 修改：`prj/games/voxel-craft/index.html`
- 修改：`prj/games/platform-quest/index.html`
- 修改：`prj/games/shared/workbench-bridge.js`
- 修改：`tests/learning-memory-integration.test.mjs`
- 修改：`tests/workbench-memory-bridge.test.mjs`

**步骤 1：编写失败测试**

```js
test('every learning consumer loads memory and adaptation before the bridge', () => {
  consumers.forEach(relative => {
    const html = read(relative);
    const memoryAt = html.indexOf('workbench-memory.js');
    const adaptationAt = html.indexOf('learning-adaptation.js');
    const bridgeAt = html.indexOf('workbench-bridge.js');
    assert.ok(memoryAt >= 0, `${relative} missing memory`);
    assert.ok(adaptationAt > memoryAt, `${relative} adaptation order`);
    assert.ok(bridgeAt > adaptationAt, `${relative} bridge order`);
  });
});

test('recordLearningOutcome writes memory first and returns one classified result', () => {
  const result = loaded.bridge.recordLearningOutcome(
    { contentId: 'english:apple', key: 'apple', track: 'english' },
    { outcome: 'unknown', responseMs: 1200 },
    { at: 100, source: 'workbench-quiz' }
  );
  assert.equal(result.outcome, 'unknown');
  assert.equal(loaded.memory().words['english:apple'].unknownCount, 1);
  assert.equal(loaded.memory().words['english:apple'].needsReteach, true);
});
```

**步骤 2：运行并确认失败**

```powershell
node --test tests/learning-memory-integration.test.mjs tests/workbench-memory-bridge.test.mjs
```

预期：主工作台缺少脚本，`recordLearningOutcome` 不存在。

**步骤 3：最小实现**

- 所有消费者使用相同顺序：`workbench-memory.js → learning-adaptation.js → workbench-bridge.js → overlay/app/controller`。
- 桥接新增 `recordLearningOutcome(card, uiInput, options)`。
- 先写唯一记忆账本，再写兼容 `courseProgress` 投影；投影失败不回滚记忆，后续可重建。
- 旧 `recordMemoryAnswer/recordWordAnswer/recordSubjectAnswer` 暂保留并标注 deprecated，旧调用仍通过测试。

**步骤 4：运行并确认通过**

运行同上，预期全部通过且原阳光、dailyPlans、worldGames 数据不变。

**步骤 5：提交**

```powershell
git add prj/preschool-workbench/index.html prj/games/learning-defense/index.html prj/games/voxel-craft/index.html prj/games/platform-quest/index.html prj/games/shared/workbench-bridge.js tests/learning-memory-integration.test.mjs tests/workbench-memory-bridge.test.mjs
git commit -m "fix: unify personalized learning ledger wiring"
```

### 任务 3（P0）：全入口增加“我不会”并回到重教

**文件：**
- 修改：`prj/games/shared/learning-card-overlay.js`
- 修改：`prj/app.js`
- 修改：`prj/css/preschool/35-course-flashcards.css`
- 修改：`prj/games/learning-defense/game.css`
- 修改：`prj/games/voxel-craft/game.css`
- 修改：`prj/games/platform-quest/game.css`
- 创建：`tests/preschool-learning-unknown.test.mjs`
- 修改：`tests/learning-memory-integration.test.mjs`

**步骤 1：编写失败测试**

```js
test('bank quiz and game overlay expose a non-punitive unknown action', () => {
  assert.match(app, /data-action="lesson-unknown"/);
  assert.match(overlay, /data-learning-unknown/);
  assert.match(overlay, /recordLearningOutcome/);
  assert.doesNotMatch(unknownHandler, /awardSunlight|spendSunlight|correct:\s*false/);
});

test('unknown does not complete a quiz attempt and schedules reteaching first', () => {
  const result = adaptation.computeReadiness({ learningState: 'taught', needsReteach: true }, []);
  assert.equal(result.canTest, false);
  assert.equal(result.canTeach, true);
  assert.equal(result.reason, 'needs-reteach');
});
```

**步骤 2：运行并确认失败**

```powershell
node --test tests/preschool-learning-unknown.test.mjs tests/learning-memory-integration.test.mjs
```

预期：普通 bank quiz/overlay 没有 unknown 控件和处理器。

**步骤 3：最小实现**

- “我不会”放在答案网格外，视觉为次级安全动作，触控高度至少 44px。
- 点击后展示 teach 内容（图、音、例字/词），设置 `needsReteach=true`，不展示红叉、不扣阳光。
- 重教完成后清除 `needsReteach`，产生 `teach` 事件；不能把“看过答案”伪装成 correct/known。
- 修正 overlay 纠错流程：`completeCorrection()` 不再额外写一次课程正确记录。

**步骤 4：运行并确认通过**

运行同上，并补跑：

```powershell
node --test tests/preschool-subject-attempt-integration.test.mjs tests/learning-defense.test.mjs tests/learning-worlds.test.mjs
```

预期：unknown 闭环通过，既有游戏状态机仍通过。

**步骤 5：提交**

```powershell
git add prj/app.js prj/games/shared/learning-card-overlay.js prj/css/preschool/35-course-flashcards.css prj/games/learning-defense/game.css prj/games/voxel-craft/game.css prj/games/platform-quest/game.css tests/preschool-learning-unknown.test.mjs tests/learning-memory-integration.test.mjs
git commit -m "feat: add reteaching path for unknown answers"
```

### 任务 4（P1）：实现四值判断和个人反应时基线

**文件：**
- 修改：`prj/learning-adaptation.js`
- 修改：`prj/games/shared/workbench-memory.js`
- 修改：`prj/games/shared/workbench-bridge.js`
- 修改：`prj/games/shared/learning-card-overlay.js`
- 修改：`tests/learning-adaptation.test.mjs`
- 修改：`tests/workbench-memory.test.mjs`

**步骤 1：编写失败测试**

```js
test('first small-choice success is provisional and does not gain mastery credit', () => {
  const result = adaptation.classifyOutcome({
    uiOutcome: 'correct', optionCount: 2, previousKnownCount: 0,
    responseMs: 900, recentKnownResponseMs: []
  });
  assert.equal(result.outcome, 'unsure');
  assert.equal(result.masteryCredit, 0);
});

test('relative reaction thresholds use the learner median, not 2500ms', () => {
  const recent = [2800, 2900, 3000, 3000, 3100, 3200, 3300, 3400];
  assert.equal(adaptation.classifyOutcome({ uiOutcome: 'correct', optionCount: 4, previousKnownCount: 2, responseMs: 900, recentKnownResponseMs: recent }).outcome, 'unsure');
  assert.equal(adaptation.classifyOutcome({ uiOutcome: 'correct', optionCount: 4, previousKnownCount: 2, responseMs: 3000, recentKnownResponseMs: recent }).outcome, 'known');
});

test('unknown does not alter box or ease while slip shortens retrieval', () => {
  const before = seedMasteredMemory();
  const unknown = memory.recordOutcome(before, card, 'unknown', 1000, {});
  assert.equal(unknown.words[id].box, before.words[id].box);
  assert.equal(unknown.words[id].ease, before.words[id].ease);
  assert.equal(unknown.words[id].needsReteach, true);
  const slip = memory.recordOutcome(before, card, 'slip', 1000, {});
  assert.ok(slip.words[id].dueAt <= before.words[id].dueAt);
});
```

**步骤 2：运行并确认失败**

```powershell
node --test tests/learning-adaptation.test.mjs tests/workbench-memory.test.mjs
```

预期：`classifyOutcome/recordOutcome` 或四值计数不存在。

**步骤 3：最小实现**

- 删除 overlay 的固定 `2500ms` 分档，让它只上报耗时和 UI 三值。
- 只把 known 的有效耗时推进长度 20 的数组；hint/correction/background 超时不进入基线。
- unsure 增 attempts/unsureCount，但不增 knownStreak，不延长到期。
- slip 增 slipCount；若此前为 mastered/maintained，再增 lapses；单次 slip 不降状态。
- unknown 增 unknownCount、清 knownStreak、回到 taught、设置重教；不作为 wrong/again 写入。

**步骤 4：运行并确认通过**

运行同上，再运行桥接与 overlay 集成测试，预期均通过。

**步骤 5：提交**

```powershell
git add prj/learning-adaptation.js prj/games/shared/workbench-memory.js prj/games/shared/workbench-bridge.js prj/games/shared/learning-card-overlay.js tests/learning-adaptation.test.mjs tests/workbench-memory.test.mjs
git commit -m "feat: classify learning answers into four outcomes"
```

### 任务 5（P2）：准备度闸门与动态今日计划

**文件：**
- 修改：`prj/learning-adaptation.js`
- 修改：`prj/child-courses.js`
- 修改：`prj/storage.js`
- 修改：`prj/app.js`
- 修改：`tests/learning-adaptation.test.mjs`
- 修改：`tests/preschool-subject-mastery.test.mjs`
- 修改：`tests/preschool-daily-plan.test.mjs`

**步骤 1：编写失败测试**

```js
test('new and prerequisite-blocked items can never be tested', () => {
  assert.equal(adaptation.computeReadiness({ learningState: 'new', prereq: [] }, []).canTest, false);
  const blocked = adaptation.computeReadiness(
    { learningState: 'new', prereq: ['literacy:八'] },
    [{ contentId: 'literacy:八', learningState: 'practicing' }]
  );
  assert.equal(blocked.canTeach, false);
  assert.equal(blocked.reason, 'prerequisite-not-mastered');
});

test('new budget can fall to zero and never exceeds four', () => {
  assert.equal(adaptation.computeNewBudget({ previousBudget: 2, unknownRate: 0.30, retrievalAccuracy: 0.91 }), 0);
  assert.equal(adaptation.computeNewBudget({ previousBudget: 4, unknownRate: 0.02, retrievalAccuracy: 0.99 }), 4);
});
```

**步骤 2：运行并确认失败**

```powershell
node --test tests/learning-adaptation.test.mjs tests/preschool-subject-mastery.test.mjs tests/preschool-daily-plan.test.mjs
```

**步骤 3：最小实现**

- 给今日计划生成器传入统一记忆快照，而不是只读固定 seed plans。
- 按“重教→到期→practicing→新教学→maintained”排序。
- 新内容预算从 2 冷启动，按昨日/最近窗口健康指标调整并 clamp 到 0..4。
- 教学动作与测验动作分开记；new 卡首次出现只能渲染 teach 视图。
- `child-courses.js` 输出旧四状态投影，供现有 UI 继续显示；不得成为 due 选择依据。

**步骤 4：运行并确认通过**

运行同上，再补跑：

```powershell
node --test tests/preschool-subject-attempt-integration.test.mjs tests/preschool-exercise-today.test.mjs
```

**步骤 5：提交**

```powershell
git add prj/learning-adaptation.js prj/child-courses.js prj/storage.js prj/app.js tests/learning-adaptation.test.mjs tests/preschool-subject-mastery.test.mjs tests/preschool-daily-plan.test.mjs
git commit -m "feat: gate readiness and adapt daily new content"
```

### 任务 6（P3）：可信干扰项与产出式晋级

**文件：**
- 修改：`prj/learning-adaptation.js`
- 修改：`prj/preschool-literacy-data.js`
- 修改：`prj/preschool-pinyin-data.js`
- 修改：`prj/preschool-pinyin-syllables-data.js`
- 修改：`prj/preschool-english-data.js`
- 修改：`prj/preschool-english-vocab-data.js`
- 修改：`prj/preschool-phonics-data.js`
- 修改：`prj/preschool-math-data.js`
- 修改：`prj/preschool-poetry-data.js`
- 修改：`prj/app.js`
- 修改：`tests/learning-adaptation.test.mjs`
- 创建：`tests/preschool-personalized-content.test.mjs`

**步骤 1：编写失败测试**

```js
test('distractors are taught, confusable and drawn from a pool of at least eight', () => {
  const ranked = adaptation.rankDistractors(target, candidates, records, seededRandom);
  assert.ok(candidates.length >= 8);
  assert.equal(ranked.every(item => records[item.contentId].learningState !== 'new'), true);
  assert.equal(ranked.every(item => item.contentId !== target.contentId), true);
  assert.ok(ranked[0].confusability >= ranked.at(-1).confusability);
});

test('recognition-only evidence cannot promote a new item to mastered', () => {
  const record = makeRecord({ knownStreak: 3, distinctDates: ['2026-08-25', '2026-08-26'], evidence: { independentKnown: 3, recognitionKnown: 3, productionKnown: 0 } });
  assert.equal(adaptation.nextLearningState(record), 'practicing');
  record.evidence.productionKnown = 1;
  assert.equal(adaptation.nextLearningState(record), 'mastered');
});
```

**步骤 2：运行并确认失败**

```powershell
node --test tests/learning-adaptation.test.mjs tests/preschool-personalized-content.test.mjs
```

**步骤 3：最小实现**

- 各数据模块以兼容字段增加 `contentId/cue/teach/prereq/tags/produce`，不删除现有字段。
- cue 与 teach 分开；答题 cue 不携带会直接暴露答案的图片/翻译。
- 每个学科实现或提供 `confusability(a,b)` 所需标签；适配层负责统一过滤、排序和 seeded Top-K 随机。
- 候选不足 8 时不拼凑陌生项，回退教学/延迟。
- 新记录晋级 mastered 同时要求：`knownStreak≥3`、至少 2 日期、至少 2 活动类型、至少 1 次 independent production known。
- legacy ready/maintenance 不立即清空；下一次 maintained/cold test 补产出证据。

**步骤 4：运行学科回归**

```powershell
node --test tests/preschool-personalized-content.test.mjs tests/preschool-literacy.test.mjs tests/preschool-pinyin-gameification.test.mjs tests/phonics-course-data.test.mjs tests/preschool-english-quiz.test.mjs tests/preschool-math-practice.test.mjs
```

预期：新合同与既有学科测试全绿。

**步骤 5：提交**

```powershell
git add prj/learning-adaptation.js prj/preschool-literacy-data.js prj/preschool-pinyin-data.js prj/preschool-pinyin-syllables-data.js prj/preschool-english-data.js prj/preschool-english-vocab-data.js prj/preschool-phonics-data.js prj/preschool-math-data.js prj/preschool-poetry-data.js prj/app.js tests/learning-adaptation.test.mjs tests/preschool-personalized-content.test.mjs
git commit -m "feat: add trustworthy distractors and production mastery"
```

### 任务 7（P4）：家长交接与可验证指标

**文件：**
- 修改：`prj/learning-adaptation.js`
- 修改：`prj/review-workbench.html`
- 修改：`prj/child-courses.js`
- 修改：`prj/app.js`
- 修改：`tests/workbench-memory-report.test.mjs`
- 修改：`tests/preschool-learning-summary.test.mjs`
- 创建：`tests/personalized-learning-health.test.mjs`

**步骤 1：编写失败测试**

```js
test('handoff is bounded and every row has a reason and action', () => {
  const rows = adaptation.buildHandoff(memoryWithTwentyWeakItems(), catalog, { limit: 10 });
  assert.equal(rows.length, 10);
  rows.forEach(row => {
    assert.ok(row.reasonCode);
    assert.ok(row.reason);
    assert.ok(row.action);
  });
});

test('health separates unknown from retrieval accuracy', () => {
  const health = adaptation.buildHealth({ known: 9, unsure: 1, slip: 0, unknown: 2 });
  assert.equal(health.unknownRate, 2 / 12);
  assert.equal(health.retrievalAccuracy, 9 / 10);
  assert.equal(health.unsureRate, 1 / 10);
});
```

**步骤 2：运行并确认失败**

```powershell
node --test tests/personalized-learning-health.test.mjs tests/workbench-memory-report.test.mjs tests/preschool-learning-summary.test.mjs
```

**步骤 3：最小实现**

- 家长页保留到期列表，薄弱列表改为原因+动作，最多 10 条。
- 日常仅显示 unknownRate/retrievalAccuracy/unsureRate 和趋势，不向孩子显示分数压力。
- chanceLeak 先实现自动化夹具，不默认插入儿童正常会话。
- coldRetention 使用 30 天到期采样；productionTransfer 单独显示。
- 页面只读 `workbench:memory:v1`，不得新增 localStorage 写域。

**步骤 4：运行并确认通过**

运行同上，预期全部通过。

**步骤 5：提交**

```powershell
git add prj/learning-adaptation.js prj/review-workbench.html prj/child-courses.js prj/app.js tests/workbench-memory-report.test.mjs tests/preschool-learning-summary.test.mjs tests/personalized-learning-health.test.mjs
git commit -m "feat: add bounded parent handoff and learning health"
```

### 任务 8（P4）：生成可打印家庭复习单并接入 APK 打印

**文件：**
- 创建：`prj/parent-review-sheet.js`
- 创建：`prj/css/preschool/55-parent-review-print.css`
- 创建：`android/app/src/main/java/com/nonomil/personalworkbench/ParentReviewPrintPlugin.java`
- 创建：`scripts/export-parent-review.ps1`
- 创建：`tests/parent-review-print.test.mjs`
- 修改：`prj/preschool-workbench/index.html`
- 修改：`prj/app.js`
- 修改：`prj/review-workbench.html`
- 修改：`prj/css/preschool-workbench.css`
- 修改：`android/app/src/main/java/com/nonomil/personalworkbench/MainActivity.java`

**步骤 1：编写失败测试**

```js
test('review sheet is bounded, printable and separates parent/child/answer pages', () => {
  const sheet = renderer.buildReviewSheet({
    childName: '小星', date: '2026-08-26',
    handoff: twentyHandoffRows(), catalog: fixtureCatalog
  });
  assert.equal(sheet.items.length, 10);
  assert.match(sheet.markdown, /家庭复习单/);
  assert.match(sheet.html, /data-print-page="parent-guide"/);
  assert.match(sheet.html, /data-print-page="child-practice"/);
  assert.match(sheet.html, /data-print-page="answer-key"/);
  assert.match(sheet.html, /@page/);
  assert.doesNotMatch(sheet.childHtml, /unknownCount|lapses|repeated-unknown/);
});

test('desktop converter wrapper delegates only the generated markdown to the reference PDF chain', () => {
  const script = read('scripts/export-parent-review.ps1');
  assert.match(script, /MINECRAFT_AI_ROOT/);
  assert.match(script, /生成每日学习资料PDF\.ps1/);
  assert.match(script, /-MarkdownPath/);
  assert.doesNotMatch(script, /导出Minecraft英语资料\.py/);
});

test('android native fallback exposes PrintManager without depending on a Windows path', () => {
  const plugin = read('android/app/src/main/java/com/nonomil/personalworkbench/ParentReviewPrintPlugin.java');
  const activity = read('android/app/src/main/java/com/nonomil/personalworkbench/MainActivity.java');
  assert.match(plugin, /PrintManager/);
  assert.match(plugin, /createPrintDocumentAdapter/);
  assert.match(activity, /registerPlugin\(ParentReviewPrintPlugin\.class\)/);
  assert.doesNotMatch(plugin, /Minecraft-AI|E:\\\\MineCraft/);
});
```

**步骤 2：运行并确认失败**

```powershell
node --test tests/parent-review-print.test.mjs
```

预期：复习单 renderer、Windows 转换脚本和 Android 打印插件尚不存在。

**步骤 3：编写最小实施**

- `buildReviewSheet()` 接收已经裁决过的 handoff 和内容 Item，不访问 localStorage，不调用模型，不改变学习记录。
- 按 handoff 原因生成家长页：`repeated-unknown` 用“换实物/动作/情景重教”，`lapses` 用对比辨析，`unsure` 用产出式验证，前置阻塞用先教前置。
- 儿童页只显示内容、图片/字形、拼音/音标、例词/短句、练习框和勾选框；错误计数与原因仅在家长页/答案页出现。
- 复用现有 `prj/app.js:6164-6173` 的临时 print host 思路，但抽成通用 `parent-review-sheet.js`，避免每个学科各写一套打印逻辑。
- `55-parent-review-print.css` 实现 A4、分页、重复表头、黑白边框和 `break-inside: avoid`；不把整个工作台页面打印出去。
- 家长设置页和 `review-workbench.html` 都增加“生成家庭复习单”入口；JSON 备份按钮继续保留，避免把可打印文档当作唯一备份。
- Web 端生成 HTML 后调用 `window.print()`；如果浏览器拒绝打印，触发 HTML 下载并提示家长用浏览器打印。
- Android 新增 `ParentReviewPrintPlugin`：使用当前 WebView 的 `createPrintDocumentAdapter()` 和系统 `PrintManager.print()`；插件失败时回退为下载 HTML。插件源码不得出现 `E:`、Minecraft 或任何 Windows 路径。
- `scripts/export-parent-review.ps1` 只接收 Markdown 路径，并按以下规则找参考转换器：`$env:MINECRAFT_AI_ROOT` → `E:\MineCraft\Minecraft-AI`。找到后调用：

  ```powershell
  & "$minecraftRoot\tools\生成每日学习资料PDF.ps1" -MarkdownPath $markdownPath
  ```

  该脚本复用参考仓库已验证的 `Pandoc → standalone HTML → Edge/Chrome headless → PDF` 链。缺少参考仓库、Pandoc 或 Edge 时，不删除 Markdown/HTML，只报告“已生成可打印 HTML，PDF 转换未执行”。

- 不调用 `E:\MineCraft\Minecraft-AI\tools\导出Minecraft英语资料.py`：它会读取 Minecraft 对话并请求模型，和当前孩子的本地学情不是同一个输入；本项目只把自己的 Markdown 交给参考 PDF 转换器。
- 第一版不直接调用参考 DOCX 入口，因为 `scripts/markdown-to-learning-docx.py` 页脚写死为 `Minecraft English Learning Sheet`。若以后要 DOCX，先在当前项目增加通用标题/页脚参数，再复用其 A4 页边距、表格宽度、字体和重复表头逻辑。

**步骤 4：运行并确认通过**

```powershell
node --test tests/parent-review-print.test.mjs tests/workbench-memory-report.test.mjs tests/preschool-mistake-cards.test.mjs
```

预期：复习单静态合同、已有识字打印卡和家长报告测试全绿。

如果 Windows 转换器可用，再做只读样例验证：

```powershell
$env:MINECRAFT_AI_ROOT = 'E:\MineCraft\Minecraft-AI'
& '.\scripts\export-parent-review.ps1' -MarkdownPath '.\exports\parent-review\2026-08-26\2026-08-26_小星_家庭复习单.md'
Get-Item -LiteralPath '.\exports\parent-review\2026-08-26\2026-08-26_小星_家庭复习单.pdf'
```

预期：PDF 与 Markdown 同目录生成；参考脚本失败时 Markdown/HTML 仍保留，不能把 PDF 失败报告成整次导出失败。真实打印检查 A4 页数、中文字体、表格换行、黑白可读性和答案是否被儿童页提前泄漏。

**步骤 5：提交**

```powershell
git add prj/parent-review-sheet.js prj/css/preschool/55-parent-review-print.css android/app/src/main/java/com/nonomil/personalworkbench/ParentReviewPrintPlugin.java scripts/export-parent-review.ps1 tests/parent-review-print.test.mjs prj/preschool-workbench/index.html prj/app.js prj/review-workbench.html prj/css/preschool-workbench.css android/app/src/main/java/com/nonomil/personalworkbench/MainActivity.java
git commit -m "feat: add printable family review sheets"
```

### 任务 9：迁移三个学习游戏并消除双账本调用

**文件：**
- 修改：`prj/games/learning-defense/game.js`
- 修改：`prj/games/voxel-craft/game.js`
- 修改：`prj/games/platform-quest/game.js`
- 修改：`prj/games/shared/learning-card-overlay.js`
- 修改：`tests/learning-memory-integration.test.mjs`
- 修改：`tests/learning-defense.test.mjs`
- 修改：`tests/learning-worlds.test.mjs`

**步骤 1：编写失败测试**

```js
test('learning games use only the unified learning outcome command', () => {
  [overlay, defense, voxel, platform].forEach(source => {
    assert.doesNotMatch(source, /recordMemoryAnswer[\s\S]*recordSubjectAnswer/);
    assert.doesNotMatch(source, /recordMemoryAnswer[\s\S]*recordWordAnswer/);
  });
  assert.match(overlay, /recordLearningOutcome/);
});
```

**步骤 2：运行并确认失败**

```powershell
node --test tests/learning-memory-integration.test.mjs tests/learning-defense.test.mjs tests/learning-worlds.test.mjs
```

**步骤 3：最小实现**

- 三个游戏继续复用同一个 overlay，只传 `contentId/source/activityType/promptType`。
- 游戏不自行把耗时转 easy/good，不直接更新 courseProgress。
- 局内去重、10 张闸门、Canvas 冻结/恢复和通行证逻辑保持不变。
- unknown 完成重教后才计该学习卡流程完成；不把重教当 known。

**步骤 4：运行并确认通过**

运行同上，并补跑 `tests/workbench-memory-bridge.test.mjs`，预期全部通过。

**步骤 5：提交**

```powershell
git add prj/games/learning-defense/game.js prj/games/voxel-craft/game.js prj/games/platform-quest/game.js prj/games/shared/learning-card-overlay.js tests/learning-memory-integration.test.mjs tests/learning-defense.test.mjs tests/learning-worlds.test.mjs
git commit -m "refactor: route learning games through one outcome ledger"
```

### 任务 10：三种外壳布局回归与完整交付验证

**文件：**
- 修改：`tests/preschool-mobile-layout.test.mjs`
- 修改：`tests/preschool-high-resolution-landscape.test.mjs`
- 修改：`tests/parent-review-print.test.mjs`
- 创建：`tests/preschool-personalized-layout.test.mjs`
- 只在测试发现问题时修改：`prj/css/preschool/43-mobile-app-shell.css`
- 只在测试发现问题时修改：`prj/css/preschool/53-high-resolution-landscape.css`

**步骤 1：增加布局合同测试**

验证：

- 网页模式允许 `body` 自然纵向滚动；
- Android 竖屏保留自然滚动与底部安全区；
- Android 横屏保持 `100dvh + overflow:hidden + 横向分页`；
- 答案区、“我不会”、反馈、下一步在一个学习页内完成，不引入 body 纵向滚动；
- 家长详细指标放独立家长页，不塞入儿童卡片墙；
- 打印预览不打印侧边栏、游戏 HUD 或工作台背景，只打印 `data-print-page` 复习单页面；
- A4 复习单的家长页、孩子练习页、答案页分页稳定，图片缺失时仍有文字/边框可读；
- 继续支持 1080p、1440p 和 MuMu 实际分辨率，不把旧的 800×360/915×412 当本轮目标尺寸。

**步骤 2：运行布局与全量测试**

```powershell
node --test tests/preschool-personalized-layout.test.mjs tests/preschool-mobile-layout.test.mjs tests/preschool-high-resolution-landscape.test.mjs
node --test tests/parent-review-print.test.mjs
npm test
```

预期：定向测试和全量测试退出码均为 0。

**步骤 3：准备 Android 并构建 Debug APK**

```powershell
npm run android:sync
Set-Location -LiteralPath 'android'
.\gradlew.bat assembleDebug
```

预期：`android/app/build/outputs/apk/debug/app-debug.apk` 存在。

**步骤 4：读取 MuMu 真实显示参数**

```powershell
adb devices
adb -s 127.0.0.1:16384 shell wm size
adb -s 127.0.0.1:16384 shell wm density
```

若设备序列号不同，以 `adb devices` 返回值为准，不猜分辨率。

**步骤 5：真实消费者手测**

至少覆盖：

- 浏览器网页：允许上下滑动，学习/首页/工作台内容完整；
- Android 竖屏：局部纵向滚动正常，按钮不被安全区遮挡；
- Android 横屏：在 1920×1080、2560×1440、MuMu 实际分辨率中全屏横向分页；
- 普通课程测验、识字闪卡、拼音、英语、phonics、数学、古诗各完成一次 unknown→重教→重新检索；
- learning-defense、voxel-craft、platform-quest 各完成一次 known/unsure/slip/unknown 写入；
- 从家长页生成一次家庭复习单：Web 调用打印预览，APK 调用系统打印/保存 PDF，Windows 脚本再用 `MINECRAFT_AI_ROOT` 转一份 PDF；
- 检查输出的 Markdown、HTML、PDF 均不包含原始 JSON、无限事件流或孩子不应看到的失败计数；
- 关闭再打开 APK 后，due、重教、反应时数组和家长交接仍存在；
- 重复运行迁移不会增加 attempts、阳光或完成计划。

**步骤 6：提交验证合同**

```powershell
git add tests/preschool-personalized-layout.test.mjs tests/preschool-mobile-layout.test.mjs tests/preschool-high-resolution-landscape.test.mjs
git commit -m "test: lock personalized learning layouts and apk flow"
```

---

## 10. 发布闸门与验收标准

### 10.1 功能闸门

- 所有测验入口都有“我不会”。
- unknown 不增加 wrong、不增加掌握、不扣奖励，且下一动作是 teach。
- 未教项在普通计划中出题次数为 0；未教项当干扰项次数为 0。
- 首次小选项答对只记 unsure；纠错后的正确点击不记 known。
- `WorkbenchMemory` 仍是唯一 `dueAt` 权威；仓库不存在第二个 scheduler/storage key。
- 新晋级 mastered 至少有一次产出式 independent known。
- 家长交接最多 10 条，每条都有原因和建议动作。
- 家长点击“生成家庭复习单”即可得到可打印 HTML；Windows 环境有 `MINECRAFT_AI_ROOT` 时可额外得到 PDF。
- APK 打印流程不读取、不打包、不依赖 `E:\MineCraft\Minecraft-AI`。
- 孩子练习页不显示 `unknownCount/lapses/reasonCode`，家长页和答案页才显示原因与动作。

### 10.2 数据健康闸门

- `recentResponseMs.length <= 20`。
- `healthByDate.length <= 30`。
- v1→v2 迁移幂等并保留 box/ease/dueAt。
- `unknownRate`、`retrievalAccuracy`、`unsureRate` 分母为 0 时返回 null/“数据不足”，不得显示 NaN。
- `coldRetention` 只统计 30 天后无提示的独立重测。
- `chanceLeak` 不污染儿童成绩与掌握记录。
- 复习单没有数据时显示“暂时没有需要带学的内容”，不生成空白答案页。

### 10.3 回归闸门

- `npm test` 全绿。
- `npm run android:sync` 成功。
- Debug APK 成功构建并在真实 MuMu 消费路径验证。
- 复习单在浏览器打印预览、Android 系统打印预览、参考 PDF 转换链三处都能生成 A4 可读结果。
- 网页自然滚动、Android 竖屏滚动、Android 横屏一屏分页三种模式均不回归。
- 游戏冻结状态机、10 卡闸门、阳光/通行证/奖励、课程完成逻辑不回归。

---

## 11. 明确不做

- 不引入后端、账号云端个性化或在线模型依赖。
- 不引入 BKT 全贝叶斯后验。
- 不立即替换为 FSRS；若未来替换，仅替换 `WorkbenchMemory` 内的间隔计算，不触碰四值、闸门和交接。
- 不复制 DS 的单文件掌机 HTML。
- 不把 unknown 当 wrong/again。
- 不用未教项补干扰项数量。
- 不通过增加更多儿童卡片、徽章、排行榜来掩盖学习判断问题。
- 不把 motion 这类实际行为任务硬塞进知识检索正确率。
- 不在本阶段做 OCR/LLM 自动出题；未来若做，必须有家长批量批准闸门。
- 不把 `E:\MineCraft\Minecraft-AI` 硬编码进 APK；它只是 Windows 家长电脑上的可选 PDF 转换器。
- 不直接调用参考仓库的 Minecraft 日志/模型导出编排器来重算当前孩子的学情。

---

## 12. 风险与回滚

| 风险 | 控制 | 回滚 |
|---|---|---|
| 新状态让已有“ready”看似减少 | legacyMastery 保留；先只对新晋级启用产出门 | 关闭 `requireProductionForLegacy`，不删数据 |
| 反应时阈值误判 | 至少 8 个 known 样本才启用相对阈值；家长页显示 unsure 趋势 | 关闭 RT 推断，仅保留 provisional 首答 |
| 两个 localStorage 写入中途失败 | memory 为唯一真相，courseProgress 是可重建投影 | 运行 projection reconcile，不回滚 memory |
| 已教干扰池不足 8 导致题少 | 回退教学/是非辨析，不用陌生项凑数 | 临时降低该学科测试量，不降低数据规则 |
| 横屏新按钮挤压游戏画面 | 学习层一屏单步骤，unknown 放独立底栏；用现有 pager | 回退该 CSS 变更，不回退数据模型 |
| `E:` 盘、Pandoc 或 Edge 不可用 | HTML/Markdown 仍是主输出，PDF 转换是可选增强；APK 走系统打印 | 保留 HTML 让家长浏览器打印，不把整次导出判为失败 |
| Android WebView 不支持 `window.print()` | 原生 `PrintManager` 插件优先，HTML 下载为兜底 | 仅关闭原生打印入口，不影响学习账本和复习单生成 |
| 参考 DOCX 页脚带 Minecraft 名称 | 第一版只承诺 PDF/HTML；DOCX 先不接 | 参数化页脚后再开放 DOCX，不交付带错品牌的文件 |
| 数据版本升级损坏旧档 | 迁移前在内存 clone、幂等测试、保留兼容字段 | 恢复原 JSON 快照；不得用 destructive reset |

---

## 13. 建议执行顺序

先连续完成任务 1–3 形成 P0，并在真实 APK 验证后再开始 P1。P1–P4 每阶段都应：失败测试 → 最小实现 → 定向回归 → 全量回归 → APK 消费路径 → 单独提交。任务 8 的打印单可在 P4 与任务 7 同批推进，但必须先有 handoff 数据合同；任务 10 再做三种外壳和 PDF/系统打印的真实消费验证。不要一次性修改全部学科数据后才验证，也不要在四值判断稳定前先做大规模 UI 美化。

## 14. 本轮落地记录：家庭复习单与不会/跳过

- 新增 `scripts/parent-review-exporter-server.mjs` 与 `prj/parent-review-exporter/`，电脑端通过 `npm run parent-review:start` 打开本地家庭复习单工具。
- 复习单接收共享 `learning-review-package/v1`，最多输出 10 条家长重点，并同时生成 Markdown、HTML；Windows 电脑存在 `E:\MineCraft\Minecraft-AI` 时，直接调用其 DOCX/PDF 转换脚本。
- PDF 默认使用 PowerShell 7 (`pwsh`) 执行参考脚本，以正确读取无 BOM 的 UTF-8 中文脚本；可通过 `PARENT_REVIEW_POWERSHELL` 覆盖命令。
- 所有工作台选择题与三个独立学习游戏的学习卡都提供“不会 / 跳过”。该结果写入共享 `unknown` 记忆，不增加 `wrong`，不触发错题纠正或本轮学习奖励，但仍完成一次卡片接触并进入家长复习单。
- 横屏游戏卡片的选项区采用四列；手机窄屏回落为两列，避免新增选项造成横屏上下滚动。
