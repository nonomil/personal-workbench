# 幼儿英语 VoxCPM 音频生成实施计划

> **给 Claude:** 必需子技能：使用 superpowers:executing-plans 来逐任务实施此计划。

**目标：** 用本机构建期的 VoxCPM 为幼儿英语 597 词生成可随 APK 发布的自然单词音频，并保留运行时 TTS 作为缺失或播放失败时的回退。

**架构：** VoxCPM 只在开发机/构建机上运行，不进入 Web 或 Android 运行时；生成的音频写入现有 `prj/assets/audio/vocab/`。词库的 `media.audio` 仍保留原有稀疏字段，运行时对 `source=base-597` 推导确定性的同名路径，文件存在就播放本地 MP3，缺失时继续回退到 TTS。当前机器已有可用的 `D:\PythonEnvs\tts-voxcpm`、RTX 5060 Laptop 8GB 显卡和 `D:\HuggingFaceCache\VoxCPM2` 本地权重，因此采用 VoxCPM2；模型不复制进仓库，运行时仍保留 Capacitor/Web Speech 回退。

**技术栈：** Python 3.11、PyTorch/CUDA、`voxcpm`、`soundfile`、SciPy 重采样、Node 内置测试运行器、Capacitor 静态资源复制。

---

### 任务 1：固定本机 VoxCPM 运行环境与模型策略

**文件：**
- 修改：`docs/plans/2026-08-23-preschool-voxcpm-audio.md`
- 不入库：用户目录下的 VoxCPM 虚拟环境与 Hugging Face 模型缓存

**步骤 1：核对硬件与官方模型约束**

确认 RTX 5060 Laptop 8GB 显存，使用已存在的 VoxCPM2 环境和本地权重；记录模型来源、许可和约 4.62GiB 权重体积。

**步骤 2：安装隔离环境**

不重复安装：复用 `D:\PythonEnvs\tts-voxcpm\Scripts\python.exe`，模型复用 `D:\HuggingFaceCache\VoxCPM2`，避免污染项目 Node 依赖和系统 Python。

**步骤 3：运行单句健康检查**

生成一条英语单词样音，确认模型加载、CUDA 推理、VoxCPM2 括号声线提示和 MP3 编码均可用；失败时记录具体缺口，不直接批量生成。

---

### 任务 2：实现可重复的词库音频生成器

**文件：**
- 创建：`tools/tts-portable/generate-preschool-vocab.py`
- 创建：`tests/voxcpm-audio-contract.test.mjs`

**步骤 1：编写契约测试**

覆盖 597 词库、输出目录、音频相对路径安全性、默认跳过已有文件和 `--dry-run` 清单行为；测试不加载模型。

**步骤 2：实现最小生成器**

读取 `prj/data/preschool/英语/vocabulary-bank.json`，按 `media.audio` 的目标文件生成单词音频；支持 `--limit`、`--word`、`--overwrite`、`--dry-run`、`--device`、`--model`，模型只加载一次。共享入口放在 `tools/tts-portable/`，下一个项目可以复用同一目录。

**步骤 3：统一输出格式**

VoxCPM 输出转为 24kHz/单声道 MP3；临时文件在成功或失败后清理，避免半成品被前端误读。

**步骤 4：运行契约测试**

运行：`node --test tests/voxcpm-audio-contract.test.mjs`

预期：不需要模型即可全部通过。

---

### 任务 3：生成样音并做人工试听门槛

**文件：**
- 生成：`prj/assets/audio/vocab/{hello,apple,cat}.mp3`
- 生成：`output/research/20260823-preschool-voxcpm-001/`

**步骤 1：生成三条样音**

只生成 `hello`、`apple`、`cat`，不覆盖已有资源；记录模型、seed、设备、采样率、耗时和字节数。

**步骤 2：检查音频技术属性**

确认文件可读、时长合理、无空文件，并能被静态服务器和 `Audio` 播放。

**步骤 3：人工试听确认**

若发音、重音或音色不适合儿童学习，先调整模型/参数，不批量生成；通过后才进入任务 4。

---

### 任务 4：补齐 597 词并同步移动端资源

**文件：**
- 修改/生成：`prj/assets/audio/vocab/*.mp3`
- 生成：`dist/`
- 生成：`output/research/20260823-preschool-voxcpm-001/report.md`

**步骤 1：生成缺失单词音频**

默认跳过已存在的 33 个文件，只补齐剩余词；任何单词失败都写入失败清单，不用空文件冒充成功。

**步骤 2：校验覆盖率与体积**

统计 597/597 覆盖、总音频体积、单词平均体积和 APK 增量估算。

**步骤 3：复制到移动端**

运行：`npm run android:prepare`

确认 `dist/assets/audio/vocab/` 与 `prj/assets/audio/vocab/` 覆盖一致。

---

### 任务 5：回归测试与浏览器验收

**步骤 1：运行自动化验证**

运行：`node --test tests/tts-portable-contract.test.mjs tests/preschool-speech.test.mjs tests/preschool-english-vocab.test.mjs tests/prepare-mobile.test.mjs tests/preschool-vocab-assets.test.mjs`

运行：`npm run release:verify`

**步骤 2：启动本地工作台**

在 Codex 浏览器打开英语课程，检查词卡朗读按钮仍能播放本地 MP3；删除/改名一条样音后，确认运行时 TTS 回退仍可用。

**步骤 3：记录结果**

在生成报告中记录样音质量结论、覆盖率、体积和未解决问题；若 GPU/模型下载阻塞，只保留生成器与 dry-run 验证，不声称批量完成。

---

## 执行结果（2026-08-24）

- 共享维护入口已集中到 `tools/tts-portable/`；统一入口为 `invoke.ps1` / `run.bat`，调用说明见 `tools/tts-portable/docs/工作台调用.md`。
- VoxCPM2 使用 `D:\PythonEnvs\tts-voxcpm\Scripts\python.exe` + `D:\HuggingFaceCache\VoxCPM2`，健康检查返回 `voxcpm2=true`、`gpu=true`。
- 597 个词条对应 596 个唯一 MP3（`ice cream` 与 `ice-cream` 规范化后共用 `ice-cream.mp3`）；缺失 0、格式/时长异常 0。
- 音频总大小 4,243,272 bytes（4.047 MiB），平均时长 1.119 秒；输出为 24kHz、单声道 MP3，单条时长门槛为 0.08–4 秒。
- `prj/assets/audio/vocab/` 与 `dist/assets/audio/vocab/` 文件集合和字节数一致；Android debug APK 已构建，包内包含 596 个词汇 MP3，大小 58,068,849 bytes（55.379 MiB）。
- 自动验证：指定回归集合 26/26 通过；`npm run release:verify` 通过；Codex 浏览器中 `ear` / `mouth` 词卡的 `data-audio` 均指向 `../assets/audio/vocab/*.mp3`，资源返回 200 / `audio/mpeg`，点击无控制台错误。
- release APK 尚未生成：项目 `android/app/release.jks` 缺失，保留为签名配置阻塞，不自动生成新的签名密钥。

详细批量日志和样音诊断保留在 `output/research/20260823-preschool-voxcpm-001/`。
