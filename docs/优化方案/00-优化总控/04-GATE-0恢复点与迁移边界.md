# 04 GATE-0 恢复点与迁移边界

> 任务：`M0-GOV-002`  
> 仓库：`G:\StudyCode\个人工作台`  
> 分支：`main`  
> 核验日期：2026-08-09  
> 文档角色：记录恢复证据、根目录 vs `prj/` 迁移分类、脏工作树边界、已知/未跑验证，以及 **GATE-0 明确判定**。  
> 本文件是治理证据，不是实现授权；**未通过 GATE-0 时只允许调查，不允许清理和重构。**

---

## 1. 结论（先看）

| 项 | 结论 |
| --- | --- |
| GATE-0 总判定 | **BLOCKED_PENDING_RECOVERY_POINT_CONFIRMATION** |
| 是否可进入清理 / 重构 / 业务写任务 | **否** |
| 是否可进入只读调查 | **是** |
| 是否存在可用外部恢复点 | **是**（见第 2 节；足以覆盖 capture 时刻的工作树镜像） |
| 是否已把 `personal-workbench-cleanup-20260806` 当正式源 | **否**（明确禁止） |
| 本任务写范围 | 仅本文件 + 索引中的一条链接 |

**BLOCKED 主因（证据条件已齐；放行仍缺用户确认）：**

1. 条件 1 / 2 / 3 / 4 在本文件与 evidence 链上均已 **SATISFIED**（条件 2 见 **M0-GOV-004** 全量映射；条件 4 见 **M0-GOV-003**）。
2. **总判定仍 BLOCKED**：外部镜像 `G:\StudyCode\_backups\个人工作台-gate0-20260808-075610`（+ audit）虽已描述为最小安全恢复点，但**尚未经用户显式确认**为“当前认可的恢复点”；在用户书面确认之前，**禁止任何写实现**（清理/重构/业务写任务）。
3. **GATE-1 独立**：本文件不裁定 GATE-1；合同测试切换与实现切片另受 GATE-1 约束。

---

## 2. 恢复点证据（外部镜像 + 审计）

### 2.1 路径与角色

| 角色 | 路径 | 本轮状态 |
| --- | --- | --- |
| 当前工作副本 | `G:\StudyCode\个人工作台` | 存在；`main` |
| 外部镜像（GATE-0 capture） | `G:\StudyCode\_backups\个人工作台-gate0-20260808-075610` | **存在**（目录可访问） |
| 审计目录 | `G:\StudyCode\_backups\个人工作台-gate0-20260808-075610-audit` | **存在** |
| 审计清单 | `...\audit\manifest.json` | **可读** |
| 审计状态快照 | `...\audit\git-status-short.txt` | **可读**；701 行 |
| 审计哈希表 | `...\audit\files.sha256` | **可读**；**8664** 行 |

### 2.2 `manifest.json` 关键字段（已读原文）

| 字段 | 值 |
| --- | --- |
| `createdAt` | `2026-08-08T07:57:40.9634531+08:00` |
| `source` | `G:\StudyCode\个人工作台` |
| `backup` | `G:\StudyCode\_backups\个人工作台-gate0-20260808-075610` |
| `head` | `168ad6713230a7862f4ce42b22eef07b26b0b409` |
| `branch` | `main` |
| `sourceFileCount` | `8664` |
| `backupFileCount` | `8664` |
| `totalBytes` | `580166945`（约 553 MiB 量级） |
| `matchedSha256Count` | `8664` |
| `mismatchCount` | `0` |
| `extraCount` | `0` |
| `gitStatusEntryCount` | `701` |
| `robocopyExitCode` | `1`（Robocopy 语义：成功复制/有文件处理；**不是** Windows 一般意义的失败码） |
| `mismatches` | `[]` |
| `extras` | `[]` |

`recoveryCoverage`（manifest 原文）：

- tracked modified files
- untracked files
- current directory layout
- binary assets
- `.git` metadata at capture time

`caveats`（manifest 原文摘要）：

- 捕获前已删除的文件，在工作树镜像中仅以“不存在”表示；已提交版本仍在复制的 `.git` 历史中。
- 该备份任务**未执行 restore**。

### 2.3 当前仓库与备份对齐的抽样哈希（本轮实测）

命令：`Get-FileHash -Algorithm SHA256`（当前路径 vs 镜像路径）。

| 相对路径 | 当前 SHA256 | 镜像 SHA256 | 匹配 |
| --- | --- | --- | --- |
| `prj/app.js` | `960B19DF5EBA0FA2BB2AC09146A428498CAEF095AC3F997A1CBE74FCC8887965` | 同左 | **True** |
| `prj/config.js` | `23111081AB4E9A5F5ACB5E99651BF85DEBCA00D463CDC1B6C00A52F43C624BE1` | 同左 | **True** |
| `prj/storage.js` | `FAEA6673EE217EE0DECD6D1DB99590213F6EAAF665FCC930ACA38828E42B231D` | 同左 | **True** |
| `package.json` | `8700F8543136C7C9E5041BBF0014AB6CB205465A8C963CFD471595B4BD7F8D17` | 同左 | **True** |
| `index.html` | `AEEEC7DA4CC214A7DF7DF8D116954F5FEF6D5862CBFB6FF011B829B9DD89E5D0` | 同左 | **True** |

说明：

- 上述抽样证明 **关键运行文件在 2026-08-09 仍与 GATE-0 镜像一致**。
- **全量 8664 路径的再次对账未在本任务重跑** → 全量重校验标记为 **NOT_VERIFIED(本轮)**；依赖 audit 当时 `matchedSha256Count=8664 / mismatchCount=0`。

### 2.4 恢复点能恢复什么 / 不能恢复什么

| 能力 | 判定 | 依据 |
| --- | --- | --- |
| 恢复 capture 时刻工作树布局 | **可** | 完整目录镜像 + `files.sha256` |
| 恢复未跟踪文件（含当时的 `prj/`） | **可** | `recoveryCoverage` 含 untracked；镜像含 `prj/` |
| 恢复已修改跟踪文件 | **可** | 镜像为工作树拷贝，非仅 HEAD |
| 恢复二进制资产 | **可** | coverage 声明 + 镜像含 `prj/assets` 等 |
| 恢复 capture 时刻 `.git` 元数据 | **可** | 镜像含 `.git` |
| 仅靠 `HEAD` / 普通 `git diff` 完整恢复 701 项 | **不可** | HEAD 只能回到提交态；普通 diff **不能**完整表达未跟踪树与二进制 |
| 恢复 capture **之后** 新增/修改 | **不可保证** | 例如 `docs/优化方案` 当前文件数 34 vs 镜像 32 |
| 把 cleanup 副本当恢复源 | **禁止** | 见第 6 节 |

**最小安全恢复点定义（在不 commit / 不 stash / 不改主工作树的约束下）：**

> 外部只读归档  
> `G:\StudyCode\_backups\个人工作台-gate0-20260808-075610`  
> + 审计  
> `G:\StudyCode\_backups\个人工作台-gate0-20260808-075610-audit`  
> 是当前已知的最小安全恢复点。它覆盖 capture 时刻的跟踪修改、删除结果（以缺席表示）、未跟踪文件、二进制与 `.git` 元数据。它**不是**“HEAD + 测试通过”的口头状态，而是可拷贝的磁盘镜像。

---

## 3. 当前脏工作树边界（本轮实测）

### 3.1 Git 身份

| 项 | 值 |
| --- | --- |
| 分支 | `main` |
| `HEAD` | `168ad6713230a7862f4ce42b22eef07b26b0b409` |
| 与 audit 的 head | **一致** |
| `git status --short` 行数 | **701**（与 audit `gitStatusEntryCount` 一致） |

### 3.2 变化分类计数（本轮）

| 类别 | 计数 | 说明 |
| --- | ---: | --- |
| 修改（`.M` / 工作区 modified） | **25** | 含 workflow、README、根 `index.html`、若干 scripts/tests、部分旧总控文档 |
| 删除（`.D`） | **662** | 以旧根运行时/资源迁出为主 |
| 未跟踪（`??`） | **14** | 含整个 `prj/`、优化方案文档树、cleanup 目录、部分 tests/scripts |
| 其他状态码 | **0** | |
| 合计 | **701** | |

### 3.3 未跟踪入口（完整 14 项）

```text
?? docs/CHANGELOG.md
?? docs/handoff/
?? docs/plans/2026-08-07-longterm-adventure-meta.md
?? docs/plans/2026-08-07-three-world-games-rebuild-design.md
?? docs/plans/2026-08-07-three-world-games-rebuild-implementation.md
?? docs/plans/2026-08-07-world-games-growth-loop.md
?? docs/优化方案/
?? docs/工作台设计提示词/
?? personal-workbench-cleanup-20260806/
?? prj/
?? scripts/chroma-key-magenta.py
?? tests/project-layout.test.mjs
?? tests/world-games-growth.test.mjs
?? tests/world-games.test.mjs
```

### 3.4 删除项按顶层前缀（本轮聚合）

| 顶层前缀 / 文件 | 删除计数（约） | 初步归类 |
| --- | ---: | --- |
| `assets/` | 571 | 旧根素材 → 应对应 `prj/assets/` |
| `data/` | 37 | 旧根数据 → 应对应 `prj/data/` |
| `css/` | 35 | 旧根样式 → 应对应 `prj/css/` |
| 根级运行 JS/CSS 单文件 | 若干（`app.js`、`config.js`、`storage.js`、`launcher.js` 等） | 迁移到 `prj/` 同名文件 |
| `preschool-workbench` / `visual-tests` 等目录项 | 少量目录级删除记录 | 应对应 `prj/` 下同名树 |
| `CHANGELOG.md` | 1 | 精确文档搬迁到 `docs/CHANGELOG.md`（非 prj 运行时）；见 M0-GOV-004 |

> 注：上表是按 `git status --short` 前缀聚合的**分类边界**。逐文件 1:1 全量证明已由 M0-GOV-004 机器可读映射完成（见第 8 节条件 2）。

### 3.5 脏树边界规则（执行约束）

当前 701 项混合变化是**用户既有迁移中间态**，不是本专项产生的垃圾。

在 GATE-0 仍为 BLOCKED，或用户未单独授权时：

- **禁止** `git add` / `commit` / `stash` / `reset` / `clean` / `checkout` / `push` 作用于该混合树。
- **禁止** 把 701 项一揽子“整理提交”当作恢复点替代外部镜像。
- **禁止** 对 `prj/`、旧根删除结果、`personal-workbench-cleanup-20260806` 做自动清理。
- 专项写任务必须另开**明确文件白名单**；默认假设：主工作树已脏，任何额外改动都要可单独解释。

---

## 4. 根目录 vs `prj/` 迁移分类

### 4.1 运行源位置（本轮路径存在性）

| 路径 | 当前根目录 | `prj/` | 判定 |
| --- | --- | --- | --- |
| `app.js` | 缺失（git 记为 `D`） | 存在（324128 bytes） | **已迁移到 prj** |
| `config.js` | 缺失 | 存在 | **已迁移到 prj** |
| `storage.js` | 缺失 | 存在 | **已迁移到 prj** |
| `launcher.js` | 缺失 | 存在 | **已迁移到 prj** |
| `api-adapter.js` | 缺失 | 存在 | **已迁移到 prj** |
| `child-growth.js` / `child-courses.js` / `preschool-garden.js` 等 | 缺失 | 存在 | **已迁移到 prj** |
| `css/` | 缺失 | 存在 | **已迁移到 prj** |
| `assets/` | 缺失 | 存在 | **已迁移到 prj** |
| `games/` | 缺失 | 存在 | **已迁移到 prj** |
| `成人成长工作台/` | 缺失 | 存在 | **已迁移到 prj** |
| `儿童学习工作台/` | 缺失 | 存在 | **已迁移到 prj** |
| `preschool-workbench/` | 缺失 | 存在 | **已迁移到 prj** |
| 根 `index.html` | 存在（重定向到 `./prj/`） | `prj/index.html` 存在（正式入口） | **根为跳转壳，运行入口在 prj** |
| `package.json` | 存在（根工程清单） | 无独立替代要求 | **根保留** |
| `scripts/`、`tests/`、`.github/` | 存在（部分修改） | 非运行时页面源 | **工程侧，非 prj 页面源** |

结论（条件 1 抽样级）：**`prj/` 当前是实际运行源**；根 `index.html` 仅负责跳转到 `prj/index.html`。

### 4.2 分类表（供后续任务使用）

| 类别 | 含义 | 示例 | 处置边界 |
| --- | --- | --- | --- |
| A. 已迁入 `prj/` 的运行时 | 旧根删除，同名/同职责在 `prj/` | `app.js`→`prj/app.js`；`css/`→`prj/css/` | 不得从 git 历史“还原回根”作为现行源；改代码只改 `prj/` |
| B. 根跳转/工程壳 | 根仍保留但不再承载业务页面 | 根 `index.html`、`package.json` | 可改范围需单独任务卡；默认不动 |
| C. 工程与测试改动 | 跟踪文件修改，服务 prj 布局 | `scripts/prepare-mobile.mjs`、`tests/*.mjs`、`.github/workflows/android-apk.yml` | 属脏树的一部分；专项改动必须白名单，避免与历史修改缠绕 |
| D. 文档增量（未跟踪） | 方案/计划/交接 | `docs/优化方案/`、`docs/plans/`、`docs/handoff/` | 不作为运行源；可独立演进 |
| E. 清理副本（未跟踪） | 历史 worktree/dist 等大副本 | `personal-workbench-cleanup-20260806/`（本轮测得约 321,055,714 bytes） | **不是正式源**；默认不删、不迁、不发布 |
| F. 旧根删除的 prj 外处置 / 文档搬迁 | 非 `prj/` 运行时对应，但有明确替代或废弃理由 | `CHANGELOG.md`→`docs/CHANGELOG.md`（M0-GOV-004：`F_DOCUMENTATION_MIGRATION_OUTSIDE_PRJ`） | 不得在无映射证据时物理清理；文档例外不得冒充 prj 运行时源 |

### 4.3 明确非正式源

| 路径 | 角色 | 规则 |
| --- | --- | --- |
| `personal-workbench-cleanup-20260806/` | 历史清理/副本容器 | **禁止**当运行源、发布源或“可删证明” |
| `docs/**` 中的旧总控/愿景 | 叙述材料 | **不能**覆盖 `prj/` 代码事实 |
| git `HEAD` 单独 | 提交态锚点 | **不能**单独充当 701 项工作树恢复点 |

---

## 5. 验证命令：已知 vs 本轮未跑

### 5.1 本轮已执行（只读 / 允许）

| 命令 / 检查 | 结果 |
| --- | --- |
| `git rev-parse HEAD` | `168ad6713230a7862f4ce42b22eef07b26b0b409` |
| `git branch --show-current` | `main` |
| `git status --short` 计数 | 修改 25 / 删除 662 / 未跟踪 14 / 合计 **701** |
| 读取 audit `manifest.json` | 见第 2.2 节 |
| 读取 audit `git-status-short.txt` | **701** 行 |
| `files.sha256` 行数 | **8664** |
| 镜像目录存在性 | **存在**；含 `.git`、`prj`、`scripts`、`tests` 等 |
| 关键文件 SHA256 当前 vs 镜像 | 5/5 匹配（见 2.3） |
| `prj` 关键路径存在 | `prj/app.js`、`prj/config.js`、`prj/storage.js`、`prj/index.html` 均存在 |
| 根运行时单文件存在 | `app.js` 等根文件 **缺失**（与迁移一致） |
| cleanup 目录 | 存在；约 **321,055,714** bytes |

### 5.2 条件 4 真实命令证据（M0-GOV-003，2026-08-09）

证据文件（strict UTF-8，含命令顺序、时间戳、原始输出、退出码）：

`docs/优化方案/08-执行与交接/evidence/2026-08-09-M0-GOV-003-test-evidence.txt`

| 检查 | 记录结果 | 本 run 状态 |
| --- | --- | --- |
| `npm test` | exit **0**；119/119 pass | **SATISFIED** |
| `npm run release:verify` | exit **0**；ok（3 preschool themes + 2 general workbenches；5 assets checked） | **SATISFIED** |
| `node --check prj/app.js` | exit **0** | **SATISFIED** |
| `node --check prj/storage.js` | exit **0** | **SATISFIED** |
| `node --check prj/config.js` | exit **0** | **SATISFIED** |
| `npm run android:prepare` / 组装 dist | 未在本证据链执行 | **NOT_RUN / NOT_VERIFIED**（非条件 4 最小集） |

> 重要：条件 4 **SATISFIED** 只证明当前工作树消费者命令与语法检查通过，**只证明旧合同自洽**，不证明新产品三卡/五导航已实现，更**不能单独把 GATE-0 标为 READY**。

### 5.2b 外部事实包历史声称（保留对照；已被 5.2 覆盖）

来源：`docs/优化方案/08-执行与交接/prompts/M0-GATE-0-事实包复核.txt`。  
M0-GOV-002 当时禁止跑测，曾一律标 NOT_VERIFIED；**现以 5.2 证据文件为准**，不再把事实包口头声称当作 LIVE 条件 4。

### 5.3 为放行仍需补齐的项（四条件证据已齐；焦点转用户确认恢复点）

1. ~~在当前工作树重跑并保存 `npm test` / `release:verify` / 三次 `node --check` 输出~~ → **已完成**（见 5.2 与证据文件）。
2. ~~导出 662 删除项 → `prj/` 对应路径或明确文档/废弃处置的机器可读对照表~~ → **已完成（条件 2 SATISFIED）**；见  
   `docs/优化方案/08-执行与交接/evidence/2026-08-09-M0-GOV-004-root-to-prj-migration-map.json`  
   （`rawDeletedPathCount=662`；`A_MIGRATED_CANDIDATE=661`；`F_DOCUMENTATION_MIGRATION_OUTSIDE_PRJ=1`（`CHANGELOG.md`→`docs/CHANGELOG.md`）；`unresolvedPrjMissingWithoutReason=0`）。
3. **放行前必做（当前 BLOCKED 主因）**：用户**显式确认**外部镜像（+ audit）为当前认可的恢复点；确认前禁止写实现。
4. （可选加强）对 audit 的 `files.sha256` 做抽检比例扩大或全量复算。

---

## 6. 恢复程序（只读说明；默认不执行）

> 下列步骤是**应急手册**。在用户明确授权前，**执行代理不得擅自 restore、覆盖主工作树或改 git 状态**。

### 6.1 原则

1. 主工作树 `G:\StudyCode\个人工作台` 已含用户迁移成果；恢复的目标通常是**另开目录验活**，而不是直接覆盖主树。
2. 优先使用外部镜像，而不是 `git checkout` / `git restore` 去“收回” 662 项删除。
3. 禁止用 `personal-workbench-cleanup-20260806` 覆盖正式树。

### 6.2 推荐：旁路恢复（只读验活）

```text
1) 确认镜像与审计仍在：
   G:\StudyCode\_backups\个人工作台-gate0-20260808-075610
   G:\StudyCode\_backups\个人工作台-gate0-20260808-075610-audit

2) 将镜像复制到全新目录（示例）：
   G:\StudyCode\_restores\个人工作台-from-gate0-YYYYMMDD

3) 在恢复目录核验：
   - git rev-parse HEAD  == 168ad6713230a7862f4ce42b22eef07b26b0b409（若复制了 .git）
   - 存在 prj/app.js、prj/index.html
   - 抽样比对 files.sha256

4) 仅在恢复目录运行测试（不碰主树）
```

### 6.3 主树灾难覆盖（高风险；需用户书面授权）

```text
仅当主树不可用且用户明确要求时：
1) 再次完整备份当前主树到新的 _backups 时间戳目录
2) 再考虑从 gate0 镜像回拷
3) 回拷后立即对照 audit/files.sha256
4) 仍禁止自动 commit/push
```

### 6.4 不构成恢复的操作

- 仅 `git reset --hard HEAD`
- 仅 `git stash`
- 仅保存 `git diff` 文本补丁（无法完整覆盖未跟踪树与二进制）
- 从 cleanup 目录“捡回”部分文件当正式源

---

## 7. 禁止动作清单（GATE-0 期间）

| 禁止 | 原因 |
| --- | --- |
| 清理/重构业务代码 | GATE-0 未 READY |
| `git add/commit/stash/reset/clean/checkout/push` 处理 701 混合变化 | 可能摧毁用户迁移或制造不可逆历史 |
| 删除 `prj/` 或把运行源迁回旧根 | 破坏现行入口 |
| 删除或挪动 `personal-workbench-cleanup-20260806` | 大体积历史副本；需单独授权且非本专项默认 |
| 物理删除旧根已删路径的“残余研究资料” | 另受 GATE-4 / 用户授权约束 |
| 把 `npm test` 历史通过解释为产品完成 | 旧合同 ≠ 新目标 |
| 将本文件存在本身当作 GATE-0 通过 | 本文件是证据包，判定见第 8 节 |

---

## 8. GATE-0 四条件对照与总判定

依据 `03-范围边界与决策门.md`：

| # | 条件 | 本轮证据 | 状态 |
| ---: | --- | --- | --- |
| 1 | `prj/` 含完整运行源 | `prj/` 存在；关键 JS/HTML/css/assets/games/三工作台目录存在；根入口重定向到 `prj/` | **SATISFIED（抽样级）** |
| 2 | 旧根删除均有 `prj/` 对应或明确废弃/文档搬迁证据 | M0-GOV-004 全量映射：`docs/优化方案/08-执行与交接/evidence/2026-08-09-M0-GOV-004-root-to-prj-migration-map.json`（strict UTF-8 JSON；`rawDeletedPathCount=662` / `records=662`；**661** `A_MIGRATED_CANDIDATE`；**1** `CHANGELOG.md` → `F_DOCUMENTATION_MIGRATION_OUTSIDE_PRJ`，`alternativeDestination=docs/CHANGELOG.md`，Git blob SHA-1 与 `HEAD:CHANGELOG.md` 精确匹配，内容 SHA-256 已单独记录；`unresolvedPrjMissingWithoutReason=0`；`prj/CHANGELOG.md` 仍记为候选缺失，不冒充 prj 运行时源） | **SATISFIED** |
| 3 | 当前用户改动有可恢复提交、补丁或外部备份 | 外部镜像 + audit：8664 文件哈希匹配（capture 时）、701 状态快照、关键文件本轮哈希仍一致 | **SATISFIED（外部镜像存在；用户确认仍待）** |
| 4 | `npm test`、`release:verify`、语法检查真实结果已记录 | M0-GOV-003 本机重跑并落盘：`docs/优化方案/08-执行与交接/evidence/2026-08-09-M0-GOV-003-test-evidence.txt`（npm test 0、119/119；release:verify 0；三次 node --check 均 0） | **SATISFIED（本 run）** |

### 总判定

```text
GATE-0 = BLOCKED_PENDING_RECOVERY_POINT_CONFIRMATION
```

**含义：**

- 条件 1–4 的**证据链已齐**（含条件 2 全量 662 映射）；**仍不等于** GATE-0 READY。
- **BLOCKED 显式原因**：用户尚未把外部镜像（+ audit）**显式确认为**当前认可的恢复点；在该确认之前，禁止任何写实现。
- 允许：继续只读审计、维护本治理文档（在明确写白名单内）、等待/记录用户对恢复点的确认。
- 不允许：清理、重构、模块化抽页、CSS 删除、素材物理清理、发布动作、业务写实现。
- **GATE-1 不在本判定内**：即使日后 GATE-0 放行，合同测试切换与实现切片仍单独受 GATE-1 约束。

### 解除 BLOCKED 的最小证据包

1. ~~本轮或授权只读会话中保存 `npm test`、`release:verify`、三次 `node --check` 的真实输出~~ → **已完成（条件 4 SATISFIED）**；见  
   `docs/优化方案/08-执行与交接/evidence/2026-08-09-M0-GOV-003-test-evidence.txt`。
2. ~~662 删除项全量 1:1 / 明确处置映射~~ → **已完成（条件 2 SATISFIED）**；见  
   `docs/优化方案/08-执行与交接/evidence/2026-08-09-M0-GOV-004-root-to-prj-migration-map.json`  
   （661 → `prj/` 候选存在；1 条精确文档搬迁 `CHANGELOG.md`→`docs/CHANGELOG.md`，非 prj 运行时；无未解释的 prj 候选缺失）。
3. 维持外部镜像不被覆盖；若主树继续演化，宜新增时间戳镜像而不是改写 `...-20260808-075610`。
4. **仍缺（当前唯一放行闸）**：用户确认外部镜像即为当前认可的恢复点（若用户另选 patch/bundle/commit 方式，需更新本文件）。确认前 **GATE-0 保持 BLOCKED_PENDING_RECOVERY_POINT_CONFIRMATION**。

---

## 9. 与任务卡的关系

| 任务卡 | 关系 |
| --- | --- |
| `M0-GOV-001` | 只读基线审计；条件 4 由 M0-GOV-003 覆盖；条件 2 由 M0-GOV-004 覆盖 |
| `M0-GOV-002`（本文件） | 固化恢复点、边界、禁止项与 GATE-0 判定；**当前 BLOCKED_PENDING_RECOVERY_POINT_CONFIRMATION**（条件 1–4 证据已齐；待用户确认恢复点） |
| `M0-GOV-003` | 已产出条件 4 证据文件；**在 GATE-0 READY 前仍不得**改合同测试为写入实施 |
| `M0-GOV-004` | 已产出条件 2 全量 root→`prj/`（及文档例外）映射证据；**不**宣称 GATE-0 READY |
| 首个实现卡（如 `M1-IA-001`） | 额外依赖 **GATE-0 READY + GATE-1**（GATE-1 独立，本文件不裁定） |

建议顺序（收敛）：

1. 恢复/迁移边界（本文件，已落盘；门禁仍 BLOCKED，因恢复点待确认）  
2. ~~只读补齐测试输出（条件 4）~~ → **已完成**（`evidence/2026-08-09-M0-GOV-003-test-evidence.txt`）  
3. ~~全量 662 删除对照 / 明确处置（条件 2）~~ → **已完成**（`evidence/2026-08-09-M0-GOV-004-root-to-prj-migration-map.json`）  
4. **用户显式确认外部镜像为认可恢复点** — 解除 `BLOCKED_PENDING_RECOVERY_POINT_CONFIRMATION` 的主缺口  
5. 合同测试切换（**GATE-0 READY 且 GATE-1 放行后**；GATE-1 单独门）  
6. 最小实现切片（M1 起；不得跳过 GATE-0 / GATE-1）  

---

## 10. 本任务写范围与自检

| 项 | 内容 |
| --- | --- |
| 允许修改 | `docs/优化方案/00-优化总控/04-GATE-0恢复点与迁移边界.md` |
| 允许修改 | `docs/优化方案/00-优化总控/00-优化总控索引.md`（仅增加本文件链接） |
| 禁止修改 | 运行代码、测试、package、release 脚本、assets、cleanup、`prj/`、任何 git 写操作 |
| 提交 | **不提交、不推送** |

---

## 11. 残留风险

1. 主树在 GATE-0 镜像之后仍可能继续产生文档/本地改动；镜像是 **2026-08-08 07:57** 的点-in-time。
2. `docs/优化方案` 在镜像中为 32 文件、当前为 34+（且本任务继续增加），文档增量不在旧镜像完整覆盖内。
3. 未跟踪的整个 `prj/` 一旦被误 `clean` 将造成重大损失；外部镜像是主要保险。
4. 条件 4 已有 2026-08-09 本机 LIVE 证据（见 5.2）；若主树之后再改 `prj/`/tests/package/release，需**重新**跑测并换新证据文件，不得无限期沿用本文件。
5. `prepare-mobile.mjs` 会递归删除 `dist`（事实包提醒）；任何组装验证需单独授权并接受 dist 被重建。
6. 条件 2 已由 M0-GOV-004 SATISFIED（662 映射；661 prj 候选 + 1 精确文档搬迁）；映射为**存在性/文档例外**证据，**不**自动等于内容逐字节同一或可物理清理授权。
7. **GATE-0 仍 BLOCKED_PENDING_RECOVERY_POINT_CONFIRMATION**：四条件证据已齐，但外部镜像尚未经用户显式确认为认可恢复点 → **禁止写实现**；条件证据齐备 ≠ READY。
8. **GATE-1 独立**：即使用户确认恢复点并日后标 GATE-0 READY，仍不得把 GATE-1 / 合同测试切换 / M1 实现混为本文件已放行。

---

**文档结束。GATE-0 = BLOCKED_PENDING_RECOVERY_POINT_CONFIRMATION（条件 1–4 SATISFIED；待用户确认外部镜像为恢复点；非 READY；GATE-1 独立）。**
