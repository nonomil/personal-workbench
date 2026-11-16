# 幼儿学习语音支持实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 让幼儿工作台学习区的汉字、英语单词、拼音和自然拼读音标/拆音在 Web 与 Capacitor Android 中都能点击朗读。

**架构：** 新增一个无框架的语音适配层，优先调用 Capacitor 原生 TTS，Web 环境回退到标准 `SpeechSynthesis`；已有词汇音频继续优先播放。适配层把学习内容转换成明确的语言和可朗读文本：汉字/拼音用 `zh-CN`，单词/音素用 `en-US`，音标显示值不直接交给 TTS，而使用课程已有的 `speakParts`。

**技术栈：** 原生 JavaScript、Web Speech API、`@capacitor-community/text-to-speech@8.0.2`、Node 内置测试运行器。

---

## 方案裁决

- `edge-tts` 是基于微软 Edge 在线服务的 Python 模块，适合服务端或构建期批量生成音频；当前应用是本地优先的静态 Web/Capacitor 工程，因此不把它作为运行时依赖。
- `@capacitor-community/text-to-speech@8.0.2` 的 peer 依赖支持 Capacitor 8，能在 Android 直接使用系统 TTS；Web 端仍由 `SpeechSynthesis` 覆盖。
- 音标不是可直接朗读的普通文本。自然拼读数据已经提供 `speakParts`（如 `mmm`、`ah`、`tuh`），适配层应按音素顺序朗读它们，避免把 `/m/` 读成“斜杠 m 斜杠”。

### 任务 1：建立语音适配层的失败测试

**文件：**
- 创建：`tests/preschool-speech.test.mjs`
- 创建（下一任务）：`prj/preschool-speech.js`

**步骤 1：编写失败的测试**

覆盖以下行为：

```js
test('buildSpeechPlan maps learning kinds to language and spoken text', () => {
  assert.deepEqual(Speech.buildSpeechPlan({ kind: 'hanzi', text: '山' }), {
    text: '山', lang: 'zh-CN', rate: 0.8, kind: 'hanzi'
  });
  assert.equal(Speech.buildSpeechPlan({ kind: 'pinyin', text: 'b', spokenText: '爸' }).text, '爸');
  assert.equal(Speech.buildSpeechPlan({ kind: 'word', text: 'apple' }).lang, 'en-US');
  assert.deepEqual(Speech.buildSpeechPlan({ kind: 'ipa', text: '/m/ · /æ/ · /t/', parts: ['mmm', 'ah', 'tuh'] }).parts, ['mmm', 'ah', 'tuh']);
});

test('speak prefers the Capacitor native plugin when available', async () => {
  const calls = [];
  globalThis.Capacitor = { Plugins: { TextToSpeech: {
    stop: async () => calls.push(['stop']),
    speak: async (options) => calls.push(['speak', options])
  } } };
  const result = await Speech.speak({ kind: 'hanzi', text: '爸' });
  assert.equal(result.provider, 'native');
  assert.equal(calls[1][1].lang, 'zh-CN');
});
```

**步骤 2：运行测试以验证它失败**

运行：`node --test tests/preschool-speech.test.mjs`

预期：失败，显示 `ERR_MODULE_NOT_FOUND` 或 `Speech is not defined`，证明测试没有误测已有实现。

### 任务 2：实现跨端语音适配层

**文件：**
- 创建：`prj/preschool-speech.js`

**步骤 1：实现最小计划转换**

- `buildSpeechPlan(input)` 清理空文本，按 kind 选择 `zh-CN`/`en-US` 和儿童友好的默认语速。
- `pinyin` 使用 `spokenText`（通常是例字）作为实际朗读文本；保留 `displayText` 仅用于调试，不朗读拼音字母名。
- `ipa`/`phoneme` 使用 `parts`；没有 parts 时才清理 `/`、`·` 后回退普通 TTS。

**步骤 2：实现原生优先、浏览器回退**

- 检测 `Capacitor.Plugins.TextToSpeech`，调用 `stop()` 后以 `queueStrategy: 0` 调用 `speak()`。
- 原生插件不存在或报错时，等待 `voiceschanged`/短超时后选择匹配 BCP-47 前缀的浏览器 voice。
- 暴露 `speakParts()` 和 `stop()`；所有失败返回结构化结果，不让点击事件产生未处理 Promise。

**步骤 3：运行定向测试**

运行：`node --test tests/preschool-speech.test.mjs`

预期：适配层测试全部通过，覆盖 native、Web Speech 和 native 失败回退。

### 任务 3：接入幼儿工作台学习入口

**文件：**
- 修改：`prj/preschool-workbench/index.html`
- 修改：`prj/app.js`

**步骤 1：加载适配层**

在 `app.js` 之前加载 `preschool-speech.js`，确保 Web 与移动端静态复制都能拿到同一个全局命名空间。

**步骤 2：替换发音入口**

- `speakLiteracy()` 委托 `PersonalWorkbenchPreschoolSpeech.speak()`，保留原有 toast 兜底。
- `speakPhonicsParts()` 委托 `speakParts()`，继续按 `speakParts` 顺序播放。
- 词汇 MP3 失败时仍回退到统一语音适配层。
- 词卡和拼音卡为朗读按钮传递 `kind`，英语保持 `word`，识字保持 `hanzi`，拼音传递例字为 `spokenText`。

**步骤 3：运行现有定向回归**

运行：`npm test -- --test-name-pattern="phonics|english|literacy|pinyin"`

预期：相关断言通过；如果仓库测试脚本不接受过滤参数，则改用 `node --test tests/phonics-display.test.mjs tests/preschool-english-vocab.test.mjs`。

### 任务 4：加入 Android 原生插件

**文件：**
- 修改：`package.json`
- 修改：`package-lock.json`
- 生成/同步：`android/` Capacitor 插件注册文件（仅由 Capacitor 同步命令生成）

**步骤 1：安装精确版本**

运行：`npm install --save-exact @capacitor-community/text-to-speech@8.0.2`

预期：应用依赖和 lockfile 都记录 8.0.2，peer 依赖与现有 Capacitor 8 对齐。

**步骤 2：同步移动端**

运行：`npm run android:sync`

预期：`dist/` 包含 `preschool-speech.js`，Android 工程完成插件同步。

### 任务 5：最终验证

**步骤 1：运行适配层和相关回归**

运行：`node --test tests/preschool-speech.test.mjs tests/phonics-display.test.mjs tests/preschool-english-vocab.test.mjs tests/prepare-mobile.test.mjs`

预期：本次新增与相关回归通过。

**步骤 2：验证发布契约**

运行：`npm run release:verify`

预期：语音脚本和新依赖不破坏静态发布检查。

**步骤 3：记录基线差异**

若全量 `npm test` 仍包含本次改动前已有失败，只报告失败数量和首个失败测试，不把无关基线失败归因于语音改动。

## 执行结果（2026-08-23）

- [x] 完成 `Capacitor.Plugins.TextToSpeech` 与静态页面 `Capacitor.registerPlugin('TextToSpeech')` 双路径检测；原生调用失败时回退 Web Speech。
- [x] 完成汉字、英语单词、拼音例字、自然拼读拆音的统一入口接入。
- [x] `@capacitor-community/text-to-speech@8.0.2` 已同步到 Android；Debug APK 构建通过。
- [x] 语音定向测试 6/6、自然拼读回归 5/5、英语词汇回归 6/6、移动端准备回归 4/4 通过；`release:verify` 通过。
- [ ] Release APK 仍需外部提供 `android/app/release.jks`，当前只阻塞签名打包，不影响 Debug 构建或插件编译。
