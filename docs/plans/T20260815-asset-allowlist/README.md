# T20260815-asset-allowlist

> 综合改进规划 S1 第 2 条 / 游戏 P0 行:**素材版权收尾 —— `release:verify` 增加素材白名单断言**。
> 源头:`docs/plans/T20260814-audit-remediation/`(S2 合入口径)+ 规划第 3 节。

## 审查发现(比规划记录更严重)

- `prj/games/ref/`(马里奥/史蒂夫/苦力怕全套原件)**被 git 追踪**——"ref 已 ignore 不入库"只对 `docs/*/refs/` 成立,`prj/games/ref/` 漏网。一旦提交即进发布制品。
- voxel 仓内仍有被追踪的商标命名遗留:`enemies/creeper.png`(现被 game.js 引用)、`enemies/keyed/creeper.png`、`hero/steve-idle.png`、`hero/steve-run.png`、`hero/keyed/steve-*`、`hero/miner-idle.png`。
- 主角槽位内容层面:platform `explorer-*` 已恢复原创;voxel `explorer-*` 当前是史蒂夫(工作树未提交修改)——commit 即发布史蒂夫,无任何检查拦得住。

## 方案(三件事)

1. **索引清理 + ignore**:商标命名文件移出 git 索引(`git rm -r --cached`,本地保留 ref/ 原件;仅暂存不提交);`.gitignore` 增补本地专用路径。
2. **中性改名**:voxel `creeper.png → green-boom.png`(绿爆爆),game.js 引用同步;新文件列为本地专用(ignore),发布版该敌人回退为代码像素怪,游戏仍可玩。
3. **release:verify 白名单断言**:新增 `verifyAssetAllowlist()`——(A) prj/ 工作树中文件名匹配 mario/steve/creeper 的文件必须被 git ignore;(B) platform/voxel 主角槽位文件必须与 `papermc/` 原创备份逐字节一致(md5);(C) `prj/games/ref/` 必须被 ignore;(D) platform `jumper-*.png`(马里奥,中性名)存在则必须被 ignore。

## 当前状态

- 状态:`done`(2026-08-15;发布前操作与历史残留风险见 test-report 结论)
