# T20260815-B1 — 文档回真步骤

> 优先级：P0 | 状态：pending | 前置：execution-check 放行
> 单阶段包，按序执行。验证以退出码为准：`exit 0` 通过。

## 目标

5 处文档偏离改回与代码一致；refresh 测试守护卡片墙结构。

## Steps

### 1. 侦查现状（只读，不改任何文件）

- [ ] `node --test tests/preschool-workbench-refresh.test.mjs` — 记录当前红/绿与失败断言清单
- [ ] 读 `prj/app.js` 3015–3058（`renderPreschoolCourseWallCard` / `renderPreschoolCoursesTodayCard` / `renderPreschoolCourses`），记下卡片墙实际 DOM 类名/结构
- [ ] 读 `prj/config.js` 今日任务定义，**数出实际每日核心任务项数**（预期 6：识字/古诗/数学/英语/运动/专注，以数出来的为准）
- [ ] 读 `prj/storage.js`（`awardSunlight`、发奖去重）与 `prj/games/shared/workbench-bridge.js`（日 cap、eventId 去重），抄录实际数值：课完成奖励、游戏日上限、全勤/打卡奖励
- [ ] `rg -c "" prj/preschool-literacy-data.js` 或读数据头部，确认识字库实际字数（探查口径为 240，需复核）
- **验证：** 侦查结论表写入 `test-report.md` 阶段 0
- **回滚成本：** 无写入

### 2. refresh 测试断言迁移（R2，先改测试）

- [ ] 删除/替换 `preschool-course-directory` 相关断言（约 265–866 行区间内出现处）
- [ ] 新增断言（按步骤 1 抄录的真实类名写，示例）：
  - `app.js` 源码匹配 `renderPreschoolCourseWallCard`、`renderPreschoolCoursesTodayCard`
  - `preschool-workbench/index.html` 含缓存戳 `20260815-course-wall-v1`
  - CSS 引入 `34-course-wall.css`
- **验证：** `node --test tests/preschool-workbench-refresh.test.mjs` 退出码 0
- **回滚成本：** 还原该测试文件

### 3. 卡片墙方案文档状态（R1）

- [ ] `docs/01-方案/2026-08-15-学习专区卡片墙布局方案.md` 头部"方案待实施"改为：
  > 状态：**已实施**（2026-08-15，缓存戳 `20260815-course-wall-v1`；落点 `prj/css/preschool/34-course-wall.css`、`prj/app.js` renderPreschoolCourses 系列；守护测试 `tests/preschool-workbench-refresh.test.mjs`）
- [ ] 正文与实现有出入的小节（若步骤 1 发现）加"实现差异"注记，不改正文原设计
- **验证：** 人工 diff
- **回滚成本：** 还原该 md

### 4. 每日任务数改口（R3）

- [ ] `docs/02-课程/幼儿课程方案/README.md`"每天三项核心行动"改为步骤 1 数出的实际项数与项名
- [ ] `rg "三项核心|每天三项" docs/02-课程/` 复查其余出现处（含 00-总控 各计划文件），同批改
- **验证：** `rg "三项核心" docs/02-课程/` 退出码 1
- **回滚成本：** 还原相关 md

### 5. 奖励合同对数（R4）

- [ ] `docs/02-课程/幼儿课程方案/00-总控/数据与奖励合同.md`：逐行列"合同值 → 代码值 → 改定值"对数表（写进 test-report），然后按代码值修订合同
- [ ] 合同里代码没有对应机制的条目（如已否决的机制）：标注"裁决：未实现/已否决，见 00-总控/决策记录.md"
- **验证：** 人工 diff + 对数表齐全；与 `docs/data-model.md` 不冲突
- **回滚成本：** 还原该 md
- **升级触发：** 代码内部数值互相矛盾 → 停，问用户

### 6. 识字目标改口（R5）

- [ ] `docs/02-课程/识字/01-课程总方案.md`、`docs/02-课程/幼儿课程方案/01-识字/识字分方案.md`：字量目标改为"运行库已有 N 字（步骤 1 实数）/ 主线目标 1500（进度显示见综合改进规划 P1）"；60 日节奏表述保留但注明"60 日表≠字库全量"
- **验证：** 两文件 diff；`rg "60-80" docs/02-课程/识字` 无误导残留
- **回滚成本：** 还原两个 md

### 7. 回归与收尾

- [ ] `npm test` 退出码 0
- [ ] `git status`：改动清单与 `.meta.yaml` files 列表一致，无产品代码
- [ ] `docs/00-总控/当前状态.md` 补一行"文档回真（B1）完成"
- [ ] `docs/plans/README.md` 本包状态更新
- **验证：** 命令退出码 + diff review
- **回滚成本：** 整包文件还原

## Acceptance

- [ ] R1–R6 全部有证据（见 `acceptance.md`）
- [ ] 未 commit（除非用户要求）
