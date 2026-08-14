# T20260815-B3 — S1 家长确认兑换

> 优先级：P1 | 状态：blocked（等 T20260815-B2）| 前置：execution-check 放行
> 只执行 S1。S2–S4 展开时把细步写进本页替换，不提前当正在做。
> 验证以退出码为准：`exit 0` 通过。

## 目标

孩子在阳光商城点"兑换"后进入"待家长确认"，家长确认后才核销扣阳光；随时可取消回退，阳光不丢。

## Steps

### 1. 侦查现有兑换流（只读）

- [ ] 读 `prj/app.js` `renderPreschoolRewards`（约 3066+）与兑换处理函数：确认当前是否点击即扣阳光、`claimedRewardIds` 写入时机
- [ ] 读 `prj/storage.js` 相关字段与 migrate 通道；读 `prj/config.js` `childRewards` 结构
- [ ] 读 `docs/data-model.md` 对应字段合同
- **验证：** 现状流程图（文字版）写入 test-report 阶段 0
- **回滚成本：** 无写入

### 2. 字段设计过评审门（R2）

- [ ] 设计 pending 态最小方案（二选一，按侦查结论定）：
  - 方案 A：新增 `pendingRewardIds: []`（或 `rewardRequests: [{id, ts}]`），`claimedRewardIds` 语义完全不动
  - 方案 B：`claimedRewardIds` 条目升级为对象含状态——**仅当 A 不可行**，且必须写 migrate
- [ ] 对照 `docs/00-总控/变更与同步规则.md` 自查清单；把选定方案与理由写入 test-report
- **验证：** 方案登记完成；若两案都动既有语义 → 停，问用户
- **回滚成本：** 无写入

### 3. 合同测试先红（R1）

- [ ] 新建 `tests/preschool-rewards-confirm.test.mjs`：
  - 发起兑换 → 阳光未扣、进入 pending
  - 家长确认 → 扣阳光、进 `claimedRewardIds`、退出 pending
  - 取消 → 回初始态、阳光不变
  - 阳光不足 → 不能发起
  - 重复发起同一奖励 → 幂等（不叠加 pending）
- **验证：** `node --test tests/preschool-rewards-confirm.test.mjs` — **先非 0**
- **回滚成本：** 删除该测试文件

### 4. storage 实现（R1/R2）

- [ ] `prj/storage.js`：pending 字段 + 默认值 + migrate（老快照无字段 → 空）
- [ ] 兑换核销逻辑拆两步：发起（不扣）/ 确认（扣 + 核销）/ 取消
- **验证：** 步骤 3 测试转绿
- **回滚成本：** 还原 storage.js

### 5. UI 接线

- [ ] `prj/app.js` 商城卡片三态渲染：可兑换 / 待家长确认（含取消按钮）/ 已兑换
- [ ] 家长确认交互用**长按 2 秒**"家长确认"按钮（本包不做密码系统；若用户要密码 → 记观察项）
- [ ] 确认成功给孩子可见的庆祝反馈（复用现有奖励动效，不新做动画系统）
- **验证：** 手动走三态；控制台无错
- **回滚成本：** 还原 app.js

### 6. 文档同步（R2）

- [ ] `docs/data-model.md`：新字段合同（名称、结构、默认、migrate 规则）
- **验证：** 人工 diff
- **回滚成本：** 还原 md

### 7. 回归与浏览器证据

- [ ] `node --test tests/preschool-rewards-confirm.test.mjs` + `npm test` 退出码 0
- [ ] 真机/浏览器：发起 → 刷新页面 → pending 保留 → 长按确认 → 阳光扣减正确 → 记录截图/文字进 test-report 阶段 2
- **回滚成本：** 整包 S1 文件还原

## Acceptance（S1）

- [ ] R1 R2 有测试与浏览器证据；红线自查通过（无新货币、数值规则未动）
- [ ] R3–R8（S2–S4）未开始——门控不是遗忘
- [ ] 未 commit（除非用户要求）

## S2–S4 展开备忘（防丢失）

- S2：必做/冒险分区在 `renderPreschoolCoursesTodayCard`；"全完成"判定复用 B2 的打卡回写；置灰态样式进 `34-course-wall.css`。
- S3：喂养直连挂完成弹层；连击由 `checkinDates` 连续日计算——**复用 `T20260815-streak-repair` 落地的派生口径（补签日 `repairedDates` 计入连续）**，不另写算法；断签不清零文案。防刷分提示在 `openLessonDialog` 重开已完成课分支。
- S4：先出 80 词溯源表（词 / 来源词表 / 自写例句）过 review 再写代码；`docs/02-课程/英语/01-课程总方案.md` 同步口径。
