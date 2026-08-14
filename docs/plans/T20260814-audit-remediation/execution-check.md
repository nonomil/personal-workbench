# execution-check — T20260814（第一次写代码前过一遍）

## 基线确认

- [x] `npm test` 退出码 0（审查时基线：202 项全绿，含工作区未提交改动）
- [x] 已读 `docs/00-总控/当前状态.md`，不在过期基线上实施

## 工作区处置（R8，阻塞项）

当前 18 个文件未提交，其中 `prj/games/voxel-adventure/game.js`、`prj/index.html`（launcher 不在列但同目录）与本包 S1 同文件域。**先问用户**：

- [ ] 方案一（推荐）：先提交在途进展（英语词库 1666 行等），本包在干净基线上开干
- [x] 方案二：用户明确同意混行，接受 `git diff` 双线难读（会话授权「你自己决定」，选混行不提交，避免替用户在途改动打包）
- 未确认前不写任何代码。 → 已确认混行，S1 正常推进。

## 范围自查

- [x] S1 只改 5 个文件（voxel index.html、launcher index.html、world-games.test.mjs、两个 md）
- [x] game.js / bridge / storage / 徽章判定：零改动承诺已理解
- [x] 步骤 2 的「关卡区渲染来源」未查明前，不盲改 h2 → 已查明：renderQuests 用 levelsApi.list 渲染关卡卡，h2「关卡」准确，保留

## 删除门控（S2）

- [x] 明白删除必须先告知用户（全局规则），清单在 requirements-source B4 → 已在验收汇报中列出 12 个 PNG，等用户确认
- [ ] 删除前跑引用零匹配 grep（期望退出码 1） → 等授权后执行
- [ ] 删除后浏览器三页验证无 404 → 等授权后执行

## 回滚预案

- S1 全部文件可 `git checkout -- <file>` 还原
- S2 删除可 `git checkout -- <asset>` 恢复（未 commit 前提下用 `git restore`；已 commit 则 revert）
- 合同测试先红是闸门：红不了说明断言写错，不说明代码对 → 已先红（2 fail），后绿

## 放行结论

- [x] 放行 S1 / 不放行，原因：运行时侦查完成、合同先红后绿、商标零匹配、回归 216 全绿，放行。
- [ ] S2 删除：等用户确认。
- [ ] S3 真机：需设备。
