# blocklegend UI 参考图（CliproxAPI / gpt-image-2）

后端：`POST {CLIPROX_API_BASE}/images/generations`，本机脚本 `gen_cliprox.py`。
不从浏览器前端调用。Key 只读 `cliprox.local.env`，不入库。
`127.0.0.1:8317` 未监听时保持公网 base，不改 Key。

| 文件 | 用途 |
|---|---|
| `quiz-tablet.png` | 打怪答题：橡木金边面板 + 1 主格 + 2×2 选项格 |
| `look-nametag.png` | 盯物：准星下极小铭牌，世界不被卡片挡住 |
| `hud-diegetic.png` | 左上木框状态栏 + 底栏热键，无学习报表 |

重跑：`python -X utf8 prj/games/blocklegend/assets/generated/ui-refs/gen_cliprox.py [name]`
403/1010 时脚本会打印 `cf-ray` 与 URL，不打印 Token。
