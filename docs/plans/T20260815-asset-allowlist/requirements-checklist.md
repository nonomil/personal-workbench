# 需求清单

- [x] R1 prj/ 内未被 ignore 的文件,文件名不含 mario/steve/creeper(release:verify 规则A)
- [x] R2 主角槽位(explorer-*)与 papermc 原件逐字节一致(规则B);发布前跑 verify 即可拦截史蒂夫/马里奥内容进槽
- [x] R3 prj/games/ref/、jumper-*、green-boom.png 均被 .gitignore 覆盖且已移出 git 索引
- [x] R4 creeper.png 改名 green-boom.png,游戏引用同步,玩法不回退(敌人仍显示,发布版回退像素怪)
- [x] R5 新增合同测试:真实仓 verify 通过 + 规则函数负样本
