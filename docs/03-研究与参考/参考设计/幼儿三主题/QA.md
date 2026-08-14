# 幼儿三主题参考图生成与验收记录

更新时间：2026-08-06

## 任务契约

- 目标：为幼儿版同一套工作台业务内核提供三种可切换主题的构图、配色和素材方向参考；先复现参考项目的工作台壳，再做主题皮肤。
- 生成模型：`gpt-image-2`。
- 接口：Cliprox OpenAI Images 兼容接口的 `/v1/images/generations`。
- 当前提示词：`04-garden-defense-workbench-v2.txt`、`05-voxel-adventure-workbench-v2.txt`、`06-platform-quest-workbench-v2.txt`。
- 硬性门槛：无文字/Logo/水印；不复制已有游戏角色和截图；三张图不能是同一张输出；必须能看出导航、主任务区、进度/奖励出口等构图层级。

## 结果

| 输出 | 结果 | 证据 |
| --- | --- | --- |
| 第一轮花园/方块/故事书 | 不作为页面参考 | 第一轮偏“整张游戏海报”；方块与故事书还出现相同 SHA-256，已拒收或移入对照目录 |
| 花园防守工作台 v2 | 通过 | 1024×1536；左侧紫绿导航、顶部草坪世界、科目卡、草坪棋盘、任务清单和奖励出口齐全 |
| 体素方块工作台 v2 | 通过 | 1024×1536；靛蓝导航、蓝天体素横幅、六张科目卡、方块地图、晶体和宝箱齐全 |
| 平台冒险工作台 v2 | 通过 | 1024×1536；红色导航、蓝天/砖块/问号奖励块/金币/管道/旗杆、科目网格和平台路径齐全 |

## 接口与重试证据

- `GET https://rn6.nonom.top/v1/models`：HTTP 200，确认模型目录可访问。
- 旧示例中的 `/v1/v1/models`：HTTP 404；本项目不采用该重复前缀。
- 低质量探针图：HTTP 200，返回 `data[0].b64_json`，确认 PNG 解码链路可用。
- 花园、体素方块、平台冒险 v2：均使用 1024×1536 请求、`quality=low`，串行返回 HTTP 200；实际 PNG 尺寸以 `accepted/manifest.json` 为准。
- 本轮提示词强制“portrait-first dashboard / sidebar / top world banner / subject grid / task checklist”，避免回到第一轮的泛化桌面海报。

## 生成流程参考

参考 [codex-image2free](https://github.com/chairmanz1991/codex-image2free) 的 job contract、硬门槛验收、候选与 accepted 分离、失败后只改必要差异的思路。本轮使用已授权的本地 Cliprox API 文档直接调用，没有读取或写入浏览器 Cookie、Token 或仓库密钥。

## 使用边界

- 这些是 UI 参考图，不是发布制品，也不是透明角色素材。
- 后续若要进入网页，应先为每个主题生成独立的透明角色/图标资产，执行 alpha 检查、语义命名、manifest 和浏览器加载验收。
- HTML 文字、进度、任务状态和交互仍由项目代码渲染；不能把参考图直接当成可交互页面。
