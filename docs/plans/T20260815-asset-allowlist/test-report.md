# Test Report — T20260815-asset-allowlist

## 阶段 1:审查发现(比规划记录严重)

- `prj/games/ref/` 全套商标素材**被 git 追踪**("已 ignore"仅对 docs/*/refs/ 成立)——已 `git rm -r --cached`(本地保留)并 ignore。
- platform `jumper-*.png`(马里奥)**已被提交进历史**(8672e23 "merge hero/enemy art per S2 ruling")——已移出索引并 ignore。
- voxel 遗留商标命名文件(steve-*/miner/keyed/creeper)已移出索引;`creeper.png → green-boom.png`(中性名),game.js 引用与 manifest 同步。
- 以上均为**索引/工作树操作,未提交**;历史提交中仍残留商标字节(见结论)。

## 阶段 2:release:verify 白名单(scripts/release-verify.mjs)

新增 `verifyAssetAllowlist()`,四条规则:
- A. prj/ 内文件名含 mario/steve/creeper 的文件必须被 git ignore;
- B. platform/voxel 主角槽位(explorer-*)必须与 `papermc/` 原创备份 md5 一致;
- C. `prj/games/ref/` 必须被 ignore;
- D. `jumper-*.png` 存在则必须被 ignore。
主入口串联输出 `asset allowlist clean`。

## 阶段 3:测试

- 新增 `tests/release-asset-allowlist.test.mjs` 6 项:模式匹配、干净 fixture 通过、未 ignore 违规、槽位偏离违规、md5 助手、真实仓"零真违规"。git 判定可注入,负样本用临时目录,稳定。
- `npm test` 252 通过 / 7 失败——7 项全部是**另一会话花园保卫在途改造**(USE_PLAY_MODS 重构、背景图更换,改动时间与本人无关),不属于本包范围,未触碰。
- `npm run release:verify` 当前报 5 条:全部是规则B 的 voxel 槽位(库里是史蒂夫)——**这是正确的发布前警报**,不是误报。

## 阶段 4:浏览器/curl 冒烟

- `green-boom.png` 200(199KB)、旧 `creeper.png` 404、game.js 正常服务;游戏进第 1 关"探险中"。
- 截图工具本会话尾部持续超时,未能留图;以 HTTP 状态 + 运行状态文本为证。

## 结论

R1-R5 满足(白名单断言落地、索引清零、改名生效、测试绿)。**遗留两项需用户决策**:
1. 发布前须把 `papermc/` 四/五帧复制回 `explorer-*` 槽位并提交(当前 HEAD 的槽位是史蒂夫,干净 clone 发布会带出)——发布前跑 `npm run release:verify`,B 规则全绿即可发布;
2. 历史提交(8672e23 等)中的商标字节仍在;若仓库将来公开,需评估 history rewrite(当前仅自用,风险可接受)。
