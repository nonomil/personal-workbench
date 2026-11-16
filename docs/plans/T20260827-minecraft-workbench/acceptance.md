# 验收手册

## 通用流程（每片必做）

1. `node tmp/serve-prj.mjs`（仓库根）启动本地服务。
2. 主验 URL：`http://127.0.0.1:8765/preschool-workbench/index.html?sim-android=1&theme=voxel-adventure`
3. 视口：412×915（竖屏第一目标）、1463×616（横屏平板）、800×360（矮横屏抽查）。
4. 隔离走查：换 `?theme=garden-defense` / `platform-quest` → 工坊入口消失、对应主题页面与改动前一致。
5. no-motion 走查：设置页关"动效" → 动画静止、功能完整。
6. 截图存 `screenshots/`，命名 `{片}-{tab或场景}-{视口}.png`。

## 每片验收门

- [ ] M0 骨架（见 `M0-skeleton/task.md`）
- [ ] M1 宠物工坊（见 `M1-pet/task.md`）
- [ ] M2 家园与攻城（见 `M2-home-battle/task.md`）
- [ ] M3 商店（见 `M3-shop/task.md`）
- [ ] M4 消消乐（见 `M4-memory-game/task.md`）
- [ ] M5 结算（见 `M5-settlement/task.md`）
- [ ] M6 打磨与 APK（见 `M6-polish/task.md`）

## 全包收口清单

- [ ] `npm test` ≥886 / ≤71，新测试全绿
- [ ] 红线复查：阳光只加不减（全局搜索阳光扣减代码为 0 处新增）；无新 storage key；`:has(`/裸 dvh/color-mix 零新增
- [ ] 三主题隔离截图各一张
- [ ] `npm run android:sync` + debug APK 构建，真机/模拟器抽查攻城与投喂
- [ ] README 状态表逐片更新 landed，本文件勾满后整包状态改 `review`
