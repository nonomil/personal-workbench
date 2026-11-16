# 拼音游戏化学习优化实施计划

> **给 Codex:** 本计划按 `writing-plans` 与 `test-driven-development` 执行；现有工作区存在用户未提交修改，不做重置或清理。

**目标：** 参考《拼音学习-游戏化方案》，把当前拼音专区从“单层 63 项听选”推进为“部件 → 音节 → 四声 → 汉字词语”的可玩的第一阶段，并保持现有学习记忆与横屏分页不回归。

**架构：** 在现有 `PersonalWorkbenchPreschoolPinyin` 引擎旁增加独立的音节内容包，先覆盖代表性两拼、三拼、前后鼻音和整体认读音节；新增拆合拼读题型复用当前 bank quiz、答题记账和语音管线。四声挂在音节记录的 `tones` 内，不为每个声调建立独立 SRS 卡。

**技术栈：** 原生 JavaScript、HTML/CSS、Node test、Capacitor Android debug APK。

---

### 任务 1：建立分层音节内容包

**文件：**
- 创建：`prj/preschool-pinyin-syllables-data.js`
- 修改：`prj/preschool-workbench/index.html`
- 测试：`tests/preschool-pinyin-gameification.test.mjs`

**步骤：**

1. 先写失败测试，要求音节记录具有 `key`、`initial`/`medial`、`final`、四声变体、例字和混淆簇，并覆盖两拼、三拼、前鼻、后鼻、整体认读。
2. 运行该测试确认因数据包和解析 API 不存在而失败。
3. 添加可审计的代表性音节数据，控制在可维护的首批内容，不伪造完整 400 音节表。
4. 扩展拼音引擎的解析与运行时读取 API。
5. 运行测试确认内容契约通过。

### 任务 2：实现拆合拼读题型

**文件：**
- 修改：`prj/preschool-pinyin.js`
- 修改：`prj/app.js`
- 测试：`tests/preschool-pinyin-gameification.test.mjs`

**步骤：**

1. 先写失败测试，要求 `buildSyllableQuiz` 产出声母/介母/韵母拆分、带调音节、例字词语、混淆项，并让正确选项位于 `answer`。
2. 运行测试确认新题型尚未实现。
3. 添加 `pinyin-syllable` session，复用现有 bank quiz 的选项、语音、答题推进和错题记录。
4. 记忆键优先使用音节 `contentId/key`，不再把同音不同声调误记成不同的 SRS 卡。
5. 运行相关拼音和 subject mastery 测试。

### 任务 3：把拼音课程编排成小步螺旋

**文件：**
- 修改：`prj/config.js`
- 修改：`prj/css/preschool/54-pinyin-game.css`
- 修改：`prj/preschool-workbench/index.html`
- 测试：`tests/preschool-pinyin-gameification.test.mjs`

**步骤：**

1. 先写失败测试，要求课程保留部件、整体认读、声调，同时出现“拼读合成”入口，并标出两拼/三拼/前后鼻音目标。
2. 运行测试确认课程与题面标记尚未存在。
3. 接入拼读合成课，并用低密度题面展示“声母 + 韵母 → 音节 + 例字”，四声作为同一音节的轮转信息。
4. 仅在拼音题面增加样式，不改网页/竖屏和上一轮高分辨率横屏卡片墙。
5. 运行 UI 静态测试与浏览器视口验证。

### 任务 4：交付验证

**步骤：**

1. 运行拼音、课程、学习记忆和横屏布局测试。
2. 运行 `node --check prj/app.js`。
3. 通过 CDP 验证网页竖屏自然滚动、安卓横屏无纵向溢出、拼音题目可打开。
4. 执行 `npm run android:sync` 与 `android/gradlew.bat assembleDebug`，安装到 MuMu 后交付 APK 路径。

