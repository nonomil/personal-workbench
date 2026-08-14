# 幼儿版三主题参考设计

本目录用于保存幼儿版主题系统的设计参考图、提示词和选择记录。三套主题共用同一套学习任务、练习、奖励和本地快照；图片只用于确认构图、色彩和素材方向，不直接替代 HTML/CSS 文字与交互。

## 主题候选

| ID | 视觉方向 | 适合的互动隐喻 | 当前状态 |
| --- | --- | --- | --- |
| `garden-defense` | 阳光花园 / 植物防守 | 完成任务收集阳光，去独立花园保卫战 | 页面参考 v2 |
| `voxel-adventure` | 体素方块探险 | 完成任务修建基地、解锁方块地标 | 页面参考 v2 |
| `platform-quest` | 平台冒险王国 | 完成任务走过平台、收集金币和宝箱 | 页面参考 v2 |

## 生成约束

- 仅生成无文字、无字母、无数字、无品牌标志的画面；界面文字由网页 HTML/CSS 叠加。
- 不复制第三方角色、地图、Logo 或原作截图；“植物防守、方块探险、冒险闯关”只作为交互和美术语汇参考。
- 参考图不进入运行时发布制品；选定方向后，另行生成透明角色/图标资产并做 alpha、尺寸和浏览器加载验收。
- API 密钥只从本地私有文档读取，不写入仓库、提示词或日志。

## 已验收参考图

网页/设计实现只引用 `accepted/` 中的三张图；`generated/` 保留每次 API 原始输出，便于复核，不直接作为运行时素材。

| 主题 | 验收图 | 用途 | 状态 |
| --- | --- | --- | --- |
| `garden-defense` | `accepted/garden-defense-reference.png` | 紫绿导航、草坪棋盘、泥土种植格、任务清单和奖励出口 | 通过 v2 |
| `voxel-adventure` | `accepted/voxel-adventure-reference.png` | 靛蓝导航、体素世界横幅、科目卡、方块地图和宝箱 | 通过 v2 |
| `platform-quest` | `accepted/platform-quest-reference.png` | 红色导航、蓝天砖块横幅、科目网格、平台路径和奖励区 | 通过 v2 |

> 第一轮 `block-adventure/storybook-quest` 输出曾出现相同 SHA-256，已移入 `generated/rejected/round-one/`；第一轮的泛化插画也不再作为页面参考。当前只认 `accepted/` 三张第二轮工作台图。

## 生成记录

生成模型：`gpt-image-2`（Cliprox OpenAI Images 兼容接口）

提示词文件：

- `01-garden-defense-reference.txt`、`02-block-adventure-reference.txt`、`03-storybook-quest-reference.txt`：第一轮探索提示词，仅保留作对照。
- `04-garden-defense-workbench-v2.txt`
- `05-voxel-adventure-workbench-v2.txt`
- `06-platform-quest-workbench-v2.txt`

生成图片和接口响应记录放在同目录的 `generated/`；若某次生成失败，不把失败响应当作设计图使用。

验收、接口状态、失败重试和 GitHub 参考项目记录见 [QA.md](./QA.md)；可复核文件清单见 [accepted/manifest.json](./accepted/manifest.json)。
