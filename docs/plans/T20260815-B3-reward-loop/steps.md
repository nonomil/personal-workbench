# T20260815-B3 — S1 家长确认兑换

> 优先级：P1 | 状态：in-progress（S1 代码已绿）| 前置：execution-check 已放行
> S1–S4 代码已绿。浏览器走查待做。
> 验证以退出码为准：`exit 0` 通过。

## 目标

孩子在阳光商城点"兑换"后进入"待家长确认"，家长确认后才核销扣阳光；随时可取消回退，阳光不丢。

## Steps

### 1. 侦查现有兑换流（只读）

- [x] 读 `prj/app.js` `renderPreschoolRewards`（约 3066+）与兑换处理函数：确认当前是否点击即扣阳光、`claimedRewardIds` 写入时机
- [x] 读 `prj/storage.js` 相关字段与 migrate 通道；读 `prj/config.js` `childRewards` 结构
- [x] 读 `docs/data-model.md` 对应字段合同
- **验证：** 现状流程图（文字版）写入 test-report 阶段 0
- **回滚成本：** 无写入

### 2. 字段设计过评审门（R2）

- [x] 设计 pending 态最小方案（二选一，按侦查结论定）：
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
- [x] R3–R8（S2–S4）代码已做——不是遗忘
- [ ] 未 commit（除非用户要求）

## S2 必做 / 冒险（代码已绿）

- [x] `renderPreschoolCoursesTodayCard` 分「必做」「冒险」；`arePreschoolRequiredPlansDone` 只看 `required === true`
- [x] 未完置灰 +「先完成今日必做」；完成点亮三世界；`openPreschoolWorldGame` 同样拦截
- [x] 样式进 `34-course-wall.css`；`tests/preschool-required-adventure.test.mjs` 绿
- [ ] 浏览器两状态走查

## S3 喂星芒 / 连击 / 防刷分（代码已绿）

- [x] 完成课弹层加「去喂星芒」，复用 `feed-pet` / `PersonalWorkbenchPet.renderFeedShortcut`
- [x] 今日卡「连续学习 n 天」读 `getChildGrowth().streak`（含补签日），不另写算法
- [x] `openLessonDialog` 重开已完成课提示「已领过阳光，再练不加分也不扣分」
- [x] `tests/preschool-reward-loop-s3.test.mjs` 绿；无新 storage 字段
- [ ] 浏览器走查

## S4 英语日定量（代码已绿）

- [x] 80 词溯源表：`docs/02-课程/英语/06-80词溯源表.md`（Dolch / 课标一年级生活词 + 本仓库自写句）
- [x] `prj/preschool-english-data.js` 日闭环 80 词；不替换 597 词运行库
- [x] 英语专区「今日 3 词」+「我的词库」；到期复习标黄
- [x] `tests/preschool-english-daily.test.mjs` 绿；老 mastery 兼容
- [ ] 浏览器走查
