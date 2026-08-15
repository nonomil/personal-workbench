# T20260815-VR — 验收标准

## 完成定义（全部满足才算收口）

### 接口兼容（硬性）

- [ ] 工作台「方块探险」入口进的是新游戏（voxel-craft），返回链接带回主题参数
- [ ] 老存档无损：切换前在旧游戏攒的 `growth.worldGames.voxel-adventure`（questsDone/rank/
      crystalsTotal/unlockedTools/clearedLevels 读取）在新游戏照常生效
- [ ] 任务完成发奖口径不变：`quest-<id>` 一次 / `daily-<日期>-<key>` 每日，工作台阳光可见
- [ ] `getPlayMods()` 生效（难度影响手感/阳光倍率）
- [ ] launcher 五入口合同测试通过（路径已更新）

### 游戏体验

- [ ] 2d-minecraft 观感：MC 贴图世界、挖掘裂纹动画、MC 热键栏、背包/合成/熔炉面板
- [ ] 一局 3–5 分钟：进页即世界 + 顶部当前任务，完成有结算与下一目标
- [ ] 幼儿可玩：触屏可完成挖/放/走/跳；390px 无横向溢出
- [ ] 存档：刷新后世界/背包/进度还原

### 工程与合规

- [ ] `tests/voxel-craft.test.mjs` 及改口的三个测试文件退出码 0
- [ ] `games/voxel-adventure/` 在 S5 前零改动（git 可证）
- [ ] 无 steve.png、无 Minecraft 商标字样、`assets/mc/README.md` 署名在
- [ ] 未 commit（除非用户要求）

## 待用户拍板（验收时问）

1. 旧游戏文件夹去留：保留当回滚兜底 / 删除减重（建议：保留一个版本周期后删）
2. MC 贴图正式发布去留：保留（zlib 已署名）/ 替换为完全自制贴图
3. 铁镐是否作为合成线彩蛋提前放出（当前设计 rank5 前不可得）

## 回滚

见 `steps.md` 附录 B：切换前零风险；切换后改回 `config.js` 一行即回滚，数据无损。
