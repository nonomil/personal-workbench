# 中文与拼读语音支持实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 将汉字、汉语组词、拼音、英语拼读和古诗的发音纳入共享 `tts-portable` 工具，并让幼小衔接工作台在浏览器与 APK 中优先播放已打包的本地音频。

**架构：** 由共享工具从现有课程 JSON 生成一个确定性的内容音频清单，按 `kind/lang/voice/text` 计算稳定音频键，输出到宿主项目的 `prj/assets/audio/tts/`。工作台运行时先按同一规则查找本地 MP3，找不到再依次回退到 Android 原生 TTS、浏览器 Web Speech；实时 HTTP 服务继续提供 Edge TTS / VoxCPM2 兜底，并补齐中英文语言参数。

**技术栈：** Python 3、FastAPI、edge-tts、VoxCPM2、原生 HTML/JavaScript、Node test runner、Capacitor Android。

---

### 任务 1：建立内容音频清单契约与失败测试

**文件：**
- 创建：`tools/tts-portable/generate-content-audio.py`
- 创建：`tests/tts-content-audio.test.mjs`
- 修改：`prj/preschool-speech.js`

**步骤 1：编写失败测试**

- 验证清单包含 1,500 个汉字、2,672 个汉语组词、63 个拼音、34 首古诗、139 行诗句和英语拼读词/音素。
- 验证 dry-run 不创建音频文件，并输出稳定的 `kind`、`lang`、`text`、`target`。
- 验证 JavaScript 运行时为同一文本计算出的本地音频路径与 Python 清单一致。

**步骤 2：运行测试以验证它失败**

运行：`npm test -- --test-name-pattern="content audio"`

预期：失败，因为生成器和运行时契约尚未存在。

**步骤 3：编写最小实施**

- 生成器读取现有识字、拼音、古诗和英语拼读 JSON，不复制课程数据。
- 统一使用 FNV-1a UTF-8 稳定键，避免中文文件名和长诗句造成路径问题。
- 默认 dry-run 覆盖全部内容，支持 `--category`、`--limit`、`--id`、`--engine`、`--overwrite`。

**步骤 4：运行测试以验证它通过**

运行：`npm test -- --test-name-pattern="content audio"`

预期：契约测试通过，dry-run 报告待生成项但不写 MP3。

### 任务 2：接入 Edge TTS 与 VoxCPM2 批量生成

**文件：**
- 修改：`tools/tts-portable/generate-content-audio.py`
- 修改：`tools/tts-portable/config.py`
- 修改：`tools/tts-portable/invoke.ps1`
- 修改：`tools/tts-portable/run.bat`

**步骤 1：编写失败测试**

- 验证 `dry-run` 可以按类别筛选。
- 验证已存在且大于 100 bytes 的文件会跳过，`--overwrite` 才会重生成。
- 验证错误项目会进入 `failed` 清单而不会吞掉批次结果。

**步骤 2：运行测试以验证它失败**

运行：`npm test -- --test-name-pattern="content audio generator"`

预期：失败，因为 CLI 和生成策略尚未实现。

**步骤 3：编写最小实施**

- 普通话默认使用 Edge 中文神经音色，支持切换到 VoxCPM2；英语单词/音素支持英文音色与 VoxCPM2。
- 将 `lang`、`voice`、`engine` 写入生成清单，并生成 `prj/assets/audio/tts/manifest.json`。
- 通过 `run.bat content-dry-run`、`run.bat content-generate` 统一调用，保留原英语 `dry-run/generate` 入口。

**步骤 4：运行测试以验证它通过**

运行：`npm test -- --test-name-pattern="content audio generator"`

预期：类别筛选、跳过、覆盖和失败汇总测试通过。

### 任务 3：让工作台和 APK 优先使用本地内容音频

**文件：**
- 修改：`prj/preschool-speech.js`
- 修改：`prj/app.js`
- 修改：`prj/css/preschool/35-course-flashcards.css`
- 修改：`tests/tts-content-audio.test.mjs`

**步骤 1：编写失败测试**

- 验证汉字、拼音、英语音素和古诗输入能映射到 `../assets/audio/tts/<kind>/<key>.mp3`。
- 验证本地音频失败时仍回退到原生 TTS/Web Speech。
- 验证古诗整首和逐行入口都传递 `poetry` 语音类型。

**步骤 2：运行测试以验证它失败**

运行：`npm test -- --test-name-pattern="local content speech|poetry speech"`

预期：失败，因为当前统一语音模块只调用原生 TTS/Web Speech。

**步骤 3：编写最小实施**

- 在 `preschool-speech.js` 中增加稳定路径计算、音频播放、停止和失败回退。
- 在 `app.js` 中把识字/拼音/拼读/古诗入口的 `kind` 和本地音频参数传给统一语音模块。
- 古诗卡片增加逐行可点击朗读，整首仍保留一个入口。
- 单字符和单音素不使用通用播报过滤规则，保证“字”和“音”不会被误判为空文本。

**步骤 4：运行测试以验证它通过**

运行：`npm test -- --test-name-pattern="local content speech|poetry speech"`

预期：本地路径、回退和古诗入口测试通过。

### 任务 4：补齐共享实时服务的中英文参数

**文件：**
- 修改：`tools/tts-portable/tts_server.py`
- 修改：`tools/tts-portable/config.py`
- 修改：`tools/tts-portable/client/voice.js`

**步骤 1：编写失败测试**

- 验证 `/tts` 接受 `lang: zh-CN/en-US`，中文和英文选择对应 Edge 音色。
- 验证前端客户端把 `lang`、`voice`、`engine` 传给后端。

**步骤 2：运行测试以验证它失败**

运行：`npm test -- --test-name-pattern="tts language contract"`

预期：失败，因为当前请求模型没有语言字段，客户端固定使用中文。

**步骤 3：编写最小实施**

- 扩展音色配置，不改变已有四个中文音色键。
- 后端根据语言选择 Edge/VoxCPM2 声线描述；不把模型和虚拟环境复制到项目或 APK。
- 客户端保留浏览器 Web Speech 兜底，并允许单字符、单音素主动播报。

**步骤 4：运行测试以验证它通过**

运行：`npm test -- --test-name-pattern="tts language contract"`

预期：语言参数契约测试通过，已有服务健康检查不回归。

### 任务 5：生成资产、更新文档并做浏览器/APK 验证

**文件：**
- 创建/更新：`prj/assets/audio/tts/manifest.json` 及其 MP3 子目录
- 修改：`tools/tts-portable/docs/工作台调用.md`
- 修改：`tools/tts-portable/README.md`
- 修改：`docs/plans/2026-08-24-tts-multilingual-content.md`

**步骤 1：生成前检查**

运行：`G:\StudyCode\个人工作台\tools\tts-portable\run.bat content-dry-run`

预期：报告各类总数、已存在数、待生成数，不加载模型。

**步骤 2：生成内容音频**

先用 Edge TTS 生成普通话与古诗，再用 VoxCPM2 生成需要更自然英文表现的拼读词；若单项失败保留失败清单并不覆盖已有可用音频。

**步骤 3：运行回归测试**

运行：`npm test`

预期：全量 Node 测试通过。

**步骤 4：验证工作台和 APK**

- 启动预览，验证汉字、拼音、拼读、古诗的音频请求命中 `audio/mpeg`，控制台无错误。
- 执行 `npm run release:verify`。
- 如既有签名密钥可用，再执行 Android debug/release 构建；缺少签名密钥时只报告，不自动生成新密钥。

**步骤 5：记录结果**

- 记录各类音频数量、总大小、失败项、浏览器验证 URL 和 APK 验证结果。
- 将日常调用命令和“本地音频优先、TTS 回退”规则写入共享工具文档。

---

## 实施记录（2026-08-24）

- 内容清单契约已落地：汉字 1,500、去重汉语组词 2,672、拼音 63、古诗 34 首/139 句、英语拼读词 94、拼音字母 26；清单总条目 4,535。
- 共享生成器、稳定音频键和工作台运行时已完成；本地 MP3 优先，缺失时回退 Android 原生 TTS / Web Speech。
- 已完成全量内容音频生成：`content-dry-run` 为 `total=4535`、`skippedExisting=4535`、`toGenerate=0`；独立校验为 4,535 个唯一目标、全部大于 100 bytes、总计 38,662,800 bytes、无 `.tmp`，Manifest 4,535 条。
- Edge 长批次增加了单请求超时、有限重试和临时文件清理；重试批次退出码 0，最终汇总 `failed=[]`。英语词库 dry-run 为 597/597 已存在，磁盘为 596 个唯一 MP3。
- 浏览器验证地址为 `http://127.0.0.1:4174/preschool-workbench/index.html?v=20260824-tts-full#courses?course=preschool-literacy`；已点击汉字、拼音、自然拼读单词/拆音、古诗逐句/整首、英语单词入口。静态服务器抽查六类资源均为 `200 audio/mpeg`。
- `npm run android:sync` 和 Debug APK 构建通过；APK：`android/app/build/outputs/apk/debug/app-debug.apk`，大小 97,637,058 bytes（约 93.11 MiB），打包内容音频 4,535 个、英语词音频 596 个。当前没有连接 Android 设备，未执行安装实测。
- Release 构建已验证到签名阶段后停止，原因是既有 `android/app/release.jks` 不存在；不自动生成新签名密钥。
- 本轮回归：TTS/语音/便携词库相关测试 18/18、`npm run release:verify` 通过；仓库全量测试仍有与本任务无关的既有失败，需另行清理。

### 全量补充执行（2026-08-24）

用户确认不能只保留 38 个样音，验收口径改为“全量可播放”。先对比独立内容包
`D:\WorkPlace\xueersi\xiaomiao-learning-content-pack`，结果如下：

| 内容 | 当前工作台 | 独立内容包 | 结论 |
| --- | ---: | ---: | --- |
| 英语单词 | 597 | 597 | ID 与词条集合完全一致 |
| 汉字 | 1,500 | 1,500 | ID 与词条集合完全一致 |
| 拼音 | 63 | 63 | ID 与词条集合完全一致 |
| 自然拼读词 | 94 | 94（另含 26 个字母卡） | 完全一致 |
| 自然拼读合计 | 120 | 120 | 当前 94 词 + 26 字母已覆盖 |

因此不覆盖当前 JSON，也不把参考包 SQLite 直接复制进运行时；参考包只作为内容审计基线。
工作台的英语词库已有完整 597 条逻辑记录和可用 MP3（`ice cream`/`ice-cream` 共用一个
规范化文件名，因此为 596 个唯一文件）；全量执行前 `prj/assets/audio/tts/` 中的
4,497 个内容音频目标已全部补齐。

本次全量验收标准：

- 内容清单 `total=4535`，包含汉字、汉字组词、拼音去重发音、古诗整首/逐句、拼读词/字母音；
- 生成后 `skippedExisting=total`、`toGenerate=0`、`failed=[]`；
- 每个目标 MP3 大于 100 bytes，Manifest 与目标文件一一对应；
- 重新同步 Android 并记录最终 APK 大小；没有设备时明确记录“未安装实测”，不伪造通过。

### 全量执行结果

- 词库决策：不合并参考包 SQLite/JSON；四类核心集合已与参考包一致，拼读 120 条由当前
  94 词 + 26 字母覆盖。
- 音频决策：普通话、古诗和英语拼读缺口使用 Edge TTS 并发生成；原有 VoxCPM2 样音
  文件未被覆盖。Edge 请求使用 4 并发、20 秒超时、4 次重试完成尾部重试。
- APK 体积：从 58,740,641 bytes（38 个样音基线）变为 97,637,058 bytes，增加
  38,896,417 bytes（约 37.09 MiB）。
- 设备限制：`adb devices` 当前无设备，因此只完成 APK 构建和资源打包验证，未声称安装实测通过。
