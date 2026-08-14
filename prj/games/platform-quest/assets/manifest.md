# platform-quest 本地资源（Paper-MC 像素家族）

> 与 `voxel-adventure/assets` 同一批生成的 Paper-MC 贴图；地砖/装饰由代码绘制，
> 见 `../voxel-adventure/pixel-tiles.js` 与 `./pixel-decor.js`。

| 路径 | 用途 | 关卡映射 |
|------|------|----------|
| hero/hero-idle.png | 水管工主角 · 站立 | 全部 |
| hero/hero-run.png | 水管工主角 · 跑步（walkA/walkB 共用） | 全部 |
| hero/hero-jump.png | 水管工主角 · 腾空跳 | 全部 |
| hero/jumper-idle.png | 跳跳侠 4 帧 · 加载回退 | 兜底 |
| hero/jumper-walk-a.png | 跳跳侠 4 帧 · 加载回退 | 兜底 |
| hero/jumper-walk-b.png | 跳跳侠 4 帧 · 加载回退 | 兜底 |
| hero/jumper-jump.png | 跳跳侠 4 帧 · 加载回退 | 兜底 |
| hero/explorer-idle.png | 旧探险家帧 · 离线兜底 | 兜底 |
| hero/explorer-walk-a.png | 旧探险家帧 · 离线兜底 | 兜底 |
| hero/explorer-walk-b.png | 旧探险家帧 · 离线兜底 | 兜底 |
| hero/explorer-jump.png | 旧探险家帧 · 离线兜底 | 兜底 |
| enemies/enemy-brownie.png | 果仁怪（world-rebuild 批次） | 1–3 / 奇数黄昏关 |
| enemies/enemy-slime.png | 史莱姆（world-rebuild 批次） | 偶数黄昏关 |
| enemies/bat-idle.png | 蝙蝠 | 8–10 夜晚关 |
| bg/sky-day.png | 白天天空 | 1–3 |
| bg/sky-sunset.png | 黄昏 | 4–7 |
| bg/sky-night.png | 夜晚 | 8–10 |

- 主角来源：`world-rebuild-20260807` 批次生成的三帧动作图（idle/run/jump 各自独立姿势，
  key 抠底透明），2026-08-14 经用户授权合入游戏；任一帧加载失败回退 `jumper-*` 跳跳侠 4 帧。
- 跳跳侠来源：`platform-hero` 批次 AI 原创重绘，`#00ff00` 抠底 + 256×320 底部对齐。
  生成脚本：`scripts/key-jumper-green.py`（原图在 `prj/assets/generated/platform-hero/raw/`）。
- 敌人/其余贴图来源：`world-rebuild-20260807` 与 `voxel-paper-mc` 批次生图 + key 抠图，
  进入本目录前已按内容包围盒裁齐。
- 下岗留存：`enemies/shroom-idle.png`、`enemies/slime-idle.png`（Paper-MC 旧小怪）不再被
  引用，留在盘上待用户决定删除。
- 本地参考：`ref/platform-quest/assets/hero/` 存有第三方原版风格贴图仅供个人比对参考，
  **ref 原图仅限本地查看，不进入本目录槽位**（其 mario 三文件实为同一帧重复拷贝，不可用）。
