# 步骤

1. .gitignore 增补:`prj/games/ref/`、voxel steve*/miner/keyed、green-boom.png、platform jumper-*。
2. `git rm -r --cached prj/games/ref` + voxel 商标命名遗留(本地 ref/ 保留原件,工作树删除冗余副本)。
3. creeper.png → green-boom.png;game.js 路径同步;缓存戳 voxel game.js。
4. scripts/release-verify.mjs 增加 verifyAssetAllowlist(导出,可注入 git 判定便于测试);主入口串联。
5. tests/release-asset-allowlist.test.mjs:真实仓 ok + 负样本(临时目录造违规文件)。
6. 两份 manifest.md 同步回退说明;npm test + npm run release:verify。
