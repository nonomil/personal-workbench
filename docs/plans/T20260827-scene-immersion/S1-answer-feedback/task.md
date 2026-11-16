# S1 — 人物回应学习（本包最高价值切片，先做）

## 目标

孩子答题时底部场景条的角色有情绪回应：答对集体欢呼、答错安慰、连对三个下阳光雨；场景条气泡显示真实进度语。让"想看角色反应"成为再答一题的动力。

## 现状锚点

- 场景条 DOM：`renderPreschoolCompanionRail`（`prj/app.js` 约 5839 行）生成 `section.preschool-learning-companion-rail`，含 heading（label）+ 3 个 `.preschool-learning-companion` 按钮（art + copy）。
- 场景条样式：`prj/css/preschool/56-phone-landscape-focus.css`"底部伙伴场景条"段（气泡 + 三角色 + 草地渐变），仅 ≤480 横屏生效。
- 答题判定点（`prj/app.js` click 委托内）：
  - `flashcard-mark`（识字卡"会了/还不会"）
  - `lesson-answer`（课程弹窗选项答题，`ui.lessonSession.selectedIndex`、`bankQuiz.roundCorrect`）
  - `flashcard-reveal`（点卡看提示，不触发反馈）
- 进度数据：`prj/preschool-bank-levels.js`（`levelPoolOrAll` 等）；识字已点亮数在 flashcard session 内（`session.markedCount` / `total`）。

## 实施步骤

1. **事件派发**：在 `flashcard-mark`（`data-known="1"` → correct，`"0"` → wrong）与 `lesson-answer`（选项对错已有判定变量）两处，派发 `new CustomEvent('preschool:answer', { detail: { correct, streak } })` 到 `document`。streak 用模块级计数器（连对次数，答错清零，不入 storage）。
2. **场景条监听**：新增 `setupCompanionSceneFeedback()`（app.js，init 时调用一次）：监听 `preschool:answer`，给 `.preschool-learning-companion-rail` 切换 `is-cheer`（答对）/ `is-comfort`（答错），600~900ms 后移除；streak ≥ 3 时追加 `is-sunrain` 2s。同时把气泡文案（heading strong）换成夸奖/安慰语（随机池各 4~6 条，硬编码数组即可）。
3. **CSS 动画**（56 号文件内新增，遵守 transform/opacity 红线）：
   - `is-cheer`：三个 `.preschool-learning-companion` 依次 `translateY(-8px)` 跳起（`animation` 450ms，角色间 `animation-delay` 80ms 错开）。
   - `is-comfort`：第二个角色（坚果位）`rotate(±8deg)` 滚半圈。
   - `is-sunrain`：在场景条内绝对定位 5~6 枚小阳光（复用 `preschoolAsset('sun-token')`，JS 克隆或伪元素+background），`translateY(-20px→条底)` + 渐隐，2s 一次性。
   - 气泡文案切换：淡入（opacity 0.2→1，200ms）。
4. **进度语**：识字课程页场景条气泡默认文案从"陪你学完这一页"改为 `{已点亮}/{总数} · 再认 {n} 个升级`（数据在 flashcard session；`renderPreschoolCompanionRail` 需接收或读取当前 session，若耦合不便，允许在 `preschool:answer` 监听里同步更新 DOM 文本）。
5. **动效开关**：`body.preschool-no-motion` 下不切动画 class（JS 判断），文案照常更新。
6. **缓存戳**：`index.html` 的 `app.js` 与 56 号 CSS 版本串追加 `&scene-fb=v1`。

## 边界

- 不改答题判定逻辑本身，只在其后追加事件派发（每处 ≤ 3 行）。
- 阳光雨不产生真实阳光收入（纯视觉）；不得调用 `awardSunlight`。
- 错误反馈不得使用红色/叉号（保护积极性，方案 §4.3）。
- 竖屏与非安卓网页布局不参与本切片（场景条本身只在 ≤480 横屏存在；若在其他断点也想生效，样式沿用 53 号文件的 companion 规则处另加，但本切片不强求）。

## 验收

- [x] `tests/preschool-scene-feedback.test.mjs` 已覆盖 `preschool:answer` 派发、cheer/comfort/sunrain class、no-motion 与矮屏卡墙回归；场景专测 24/24 通过。
- [x] 800×360 真实浏览器已验证识字卡点“会了”→ 三角色欢呼、气泡夸奖和进度语；wrong/sunrain 路径由事件/VM 回归覆盖，未改变卡片动效红线。
- [x] 课程弹窗答题的 `lesson-answer` 路径由“every answerLesson mode”场景测试覆盖。
- [x] no-motion 下不切动画 class，文案仍更新；场景专测通过。
- [x] S1 缓存戳 `scene-fb=v1` 已追加；三主题共用反馈逻辑，主题资产由导航/场景映射切换。
