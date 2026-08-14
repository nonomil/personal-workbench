# 归档区

本目录存放已经完成历史使命、被新文档取代、或只作一次性调研用途的文档。**日常开发不需要读这里**；需要历史依据时按下表回查。

- 归档日期：2026-08-14
- 归档方式：`git mv`，历史可用 `git log --follow <路径>` 追溯；如需恢复，`git mv` 回原路径即可。
- 依据：`docs/00-总控/变更与同步规则.md` 第 4 节（不直接删除，先登记来源与恢复方案）。

## 登记表

下表"原路径"为归档前（2026-08-14 之前）的位置；现均位于 `docs/99-归档/<同名目录>`。

| 归档项 | 原路径（归档前） | 内容 | 归档原因 / 被谁取代 |
| --- | --- | --- | --- |
| 优化 | `docs/` 下的 `优化/` | 2026-08-06 前后的两篇游戏化参考分析 | 结论已落入代码与 `00-总控/当前状态.md` |
| 优化方案 | `docs/` 下的 `优化方案/` | 第一代优化总控（00-优化总控 ~ 09-决策记录） | 被 `docs/01-方案/优化方案2/` 与 `00-总控/` 取代 |
| 当前 | `docs/` 下的 `当前/` | 2026-08-02 幼儿版与花园战场审计 | 被 `00-总控/当前状态.md` 取代 |
| 计划 / 设计 / 输出 | `docs/` 下的 `计划/`、`设计/`、`输出/` | 早期零散单篇 | 内容已并入总控与课程方案 |
| 工作台设计提示词 | `docs/` 下的 `工作台设计提示词/` | 早期 UI 提示词 | 生图流程改走 `.cursor/skills/game-asset-pipeline` |
| prompts | `docs/` 下的 `prompts/` | 2026-07 素材刷新提示词与脚本 | 同上 |
| workbuddy-reference | `docs/` 下的 `workbuddy-reference/` | WorkBuddy 参考调研 | 结论已并入 `01-方案/优化方案2/workbuddy整理/` |
| pvz-visual-research | `docs/` 下的 `pvz-visual-research/` | PVZ 视觉研究与切图产物 | 游戏素材已本地化到 `prj/games/*/assets/`，且原版素材因版权不再使用 |
| database | `docs/` 下的 `database/` | 早期 schema.sql 草稿 | 与现行本地优先架构无关；API 合同见 `docs/api-contract.md` |
| case-study-xhs.md 等 | `docs/` 根层散页 | `case-study-xhs.md`、`research.md`、`sources.md`、`wechat-tutorials.md`、`image-generation-tests.md` 立项期调研 | 一次性调研，不再维护 |
| 文件夹形式.md | `docs/文件夹形式.md` | 旧目录范式说明 | 目录导航已并入 `docs/README.md` |

> 注：2026-08-15 顶层编号重组（决策 D-008）后，历史文档中的 `docs/优化方案2`、`docs/识字` 等旧路径按 `docs/README.md` 的目录结构映射到 `01-方案/`、`02-课程/` 等新位置。

## 不在归档区、但同样"不用读"的内容

以下目录是**克隆进来的外部参考仓库**，已被 git ignore（不入库，只占本地磁盘），保留原地是为了对照代码，不属于本项目文档：

- `docs/01-方案/学习项目设计/refs/`（AI-GAME-COOL、chineseproject、kids-learning-cards、shici、yxj-workbench 等 12+ 个仓库）
- `docs/01-方案/徽章系统/refs/`（CoreXP、Kids-Reward-Chart-System、StarKids）
- `docs/01-方案/工作台小游戏设计/refs/` 与 `99-参考资料/12岁小孩哥用AI手搓我的世界工作台/`（视频转写与截图素材）
- `docs/03-研究与参考/幼儿学习工作台研究/raw/`、各学科 `research/raw/`（抓取证据存档）
