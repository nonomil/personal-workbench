# T20260815-VR — 测试计划

## 1. 策略

- **合同测试前移**：S1 先写 `tests/voxel-craft.test.mjs`（红），实现到绿——世界/挖放/门禁/任务判定全部纯函数，node 直测无 DOM
- 引擎层（渲染/物理/输入）不可 node 测：用源码锚点断言（常量、函数名、贴图引用）+ 浏览器人工清单
- 接口层（bridge/进度键/入口）复用旧包 world-games-growth 的断言模式，S5 改口时语义不变

## 2. 自动化

| 阶段 | 文件 | 断言要点 | 时机 |
|---|---|---|---|
| S1 | `tests/voxel-craft.test.mjs` | createWorld 分层/树/矿脉；break/place/门禁 8 种任务判定；serialize round-trip | 先红后绿 |
| S2 | 同上追加 | assets/mc 关键贴图存在；engine.js 含 destroy_stage / imageSmoothing / G= 常量锚点 | S2 末 |
| S3 | 同上追加 | game.js 含 awardSunlight 口径 `quest-` / `daily-`、getPlayMods、结算三行文案锚点 | S3 末 |
| S4 | 同上追加 | craft/smelt 纯函数；homeSnapshot <8KB；无 steve.png | S4 末 |
| S5 | world-games*.test.mjs / voxel-world.test.mjs | 路径改口后退出码 0；五入口合同仍过；allowlist 过 | 收口 |

## 3. 浏览器人工清单（每阶段末过一遍）

- [ ] 进页 3 秒内可玩，无 console 报错
- [ ] 走/跑/跳手感；水中减速；不掉出世界（边界/基岩）
- [ ] 按住挖：裂纹逐帧加深 → 碎屑 + 进背包；工具/段位不够有提示
- [ ] 热键栏 1-9 切换；右键/长按放置；放置计数驱动任务进度
- [ ] 任务完成 → 结算三行 → 阳光到账（工作台同 key 可见）→ 升段卡
- [ ] E 键背包/合成/熔炉面板开合；配方消耗与产出正确
- [ ] 390px 移动宽度无横向溢出；虚拟方向键可玩
- [ ] 刷新页面：世界/背包/进度还原（存档 round-trip）
- [ ] 「返回工作台」带回 `?theme=voxel-adventure`

## 4. 止损

- 任一阶段自动化红 → 停在当前切片，不进下一片
- S5 入口切换后工作台异常 → 立即回滚 config.js 路径（附录 B），问题回写 test-report
