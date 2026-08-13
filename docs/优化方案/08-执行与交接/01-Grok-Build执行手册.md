# 01 Grok Build 执行手册

## 1. 当前是否适合直接执行

当前不适合直接让 Grok Build 在主目录完成全部优化。原因：工作树处于迁移中间态，存在大量删除、修改和未跟踪的 `prj/`；自动代理可能把用户已有迁移误判为垃圾或回滚对象。

推荐顺序：

1. 先让 Grok Build 执行只读 Phase 0，并输出报告。
2. 用户/Codex 审查基线和迁移恢复点。
3. 再按 Phase 1、Phase 2 分批执行。
4. 每阶段完成后审查 diff 和测试，不让它一次跑完整个计划。

## 2. Grok Build 总提示词

```text
你正在优化 G:\StudyCode\个人工作台。

执行前必须完整阅读：
1. docs/优化方案/README.md
2. docs/优化方案/01-现状审计与目标.md
3. docs/优化方案/02-产品减法与信息架构.md
4. docs/优化方案/03-技术模块化方案.md
5. docs/优化方案/04-样式与资源治理方案.md
6. docs/优化方案/05-数据兼容与迁移方案.md
7. docs/优化方案/06-分阶段实施计划.md
8. docs/优化方案/07-测试验收与发布门禁.md

项目唯一当前状态仍以 docs/00-总控/ 为准。本任务是减重和模块化，不是新增功能。

硬性约束：
- 保留用户当前所有未提交改动，不回滚、不覆盖、不批量清理。
- 禁止 git reset --hard、git checkout --、git clean、删除仓库根或 prj。
- 不重新生成整个项目，不更换技术栈。
- 不新增第二套 localStorage、积分、课程或游戏账本。
- 不修改三个现有业务存储 key。
- 不自动 commit、push、tag、发布，除非本轮明确授权。
- 每次只执行用户指定的一个 Phase。
- 先写失败测试，再做最小实现，最后运行定向和全量测试。
- 任何测试失败、数据兼容不明或工作树来源不明时停止并汇报。

本轮只执行：[在这里填写 Phase 和任务编号]

结束时必须输出：
- 修改文件列表
- 每项需求与代码证据
- 实际运行的命令和通过数量
- 未执行的浏览器/APK/Pages 项
- git diff --stat 与剩余风险
```

## 3. Phase 0 专用提示词

```text
只执行 docs/优化方案/06-分阶段实施计划.md 的 Phase 0。
本轮只读分析和测试，不修改、不删除、不暂存、不提交任何文件。

输出：
1. 当前 git 状态分类和迁移边界。
2. prj 是否为完整运行源。
3. npm test、release:verify、node --check 结果。
4. dist 文件数、体积和 raw/reference/split 占比。
5. 开始 Phase 1 前必须由用户决定的事项。
```

## 4. Phase 1 专用提示词

```text
只执行 Phase 1：根入口三卡和幼儿主题选择。
不得开始五导航、app.js 拆分、CSS 合并或素材删除。
先修改/新增合同测试使其针对当前五卡失败，再完成最小实现。
保留 personal_workbench_selected_variant_v1 和
personal_workbench_selected_preschool_theme_v1。
完成后运行定向测试、npm test、npm run release:verify，并提供浏览器尺寸证据。
```

## 5. Phase 2 专用提示词

```text
只执行 Phase 2：幼儿五导航、首页四块和二级内容归并。
不得修改奖励结算、存储 schema、三个独立游戏规则。
旧 hash 必须有兼容映射。
完成后验证任务完成、轻量练习、刷新恢复和重复奖励。
```

## 6. 审查清单

每次 Grok Build 返回后，主控应检查：

- 是否偷偷扩大范围。
- 是否把历史文档写成已实现。
- 是否新增 CSS 最终覆盖层。
- 是否直接写 localStorage 或阳光。
- 是否删除 raw/reference 前完成引用检查。
- 是否只跑了静态测试却宣称浏览器/APK 通过。
- 是否把三主题拆成三个数据仓。
- 是否修改用户已有无关文件。

## 7. CLI 调用建议

本机检测到 `grok` 可执行文件：`C:\Users\No'mi'l\.grok\bin\grok.exe`。`grok --help` 已确认当前 CLI 支持 `--cwd`、`--single/-p`、`--prompt-file`、`--permission-mode plan`、`--no-subagents`、`--disable-web-search`、`--max-turns` 和结构化输出。

第一轮安全命令：

```powershell
grok --cwd "G:\StudyCode\个人工作台" `
  --permission-mode plan `
  --no-subagents `
  --disable-web-search `
  --max-turns 1 `
  --output-format plain `
  --prompt-file "G:\StudyCode\个人工作台\docs\优化方案\08-执行与交接\prompts\M0-GOV-001-只读基线.txt"
```

该命令仍会把 Prompt 和模型读取到的项目内容发送给 Grok/xAI。执行前需要用户接受这一外部披露边界。不要使用 `--always-approve`、`--permission-mode auto` 或 `bypassPermissions`。

第一轮只建议执行 M0-GOV-001。等报告经人工审查后，再决定是否进入写任务。

## 8. 何时改用 Codex 执行

以下任务更适合由当前 Codex 会话执行并逐步审查：

- 当前脏工作树的迁移确认。
- localStorage 和奖励幂等重构。
- CSS 删除和素材白名单清理。
- Git 提交、推送、标签和发布。
- APK 下载、MuMu 安装和设备验证。

Grok Build 可以用于生成候选实现和独立 Phase，但不能替代主控对状态、测试和发布证据的审查。
