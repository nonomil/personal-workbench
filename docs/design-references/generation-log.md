# 参考设计图生成记录

生成日期：2026-07-29

接口：Bee API `https://beeapi.ai/v1/images/generations`

模型：`gpt-image-2`

密钥来源：本机 `docs/生图/生图接口资源key/GPT生图模型key-2.md`，密钥未写入本目录、日志或图片元数据。

## 输出

| 方向 | 文件 | 结果 |
|---|---|---|
| 阳光花园 | `generated/workbench-garden-reference_001.png` | PNG，1536x1024，已通过视觉检查 |
| 原创像素冒险 | `generated/workbench-pixel-reference_001.png` | PNG，1536x1024，已通过视觉检查 |

当前实现采用原创像素冒险方向：`workbench-pixel-reference_001.png` 的中央像素地图区域作为幼儿版首页花园地图的装饰底图裁切使用，任务节点、中文标题、状态、按钮和数值仍全部由 HTML/CSS/JS 实时渲染。阳光花园参考图保留在本目录中，作为后续视觉迭代备选。

## 像素多元素爆炸图（2026-07-29）

首页接入的透明素材来自 Agnes API 的 `agnes-image-2.1-flash`，提示词保存在 `assets/generated/preschool-pixel/reference/prompts/`，原始爆炸图在 `assets/generated/preschool-pixel/raw/`，正式裁切结果在 `assets/generated/preschool-pixel/published/`。

- A 组：阳光、滴水、故事书、笑脸阳光、宝箱、阳光晶体簇。
- B 组：成长树、花朵 checkpoint、嫩芽、云朵小怪、旗帜石台、星星伙伴。
- A 组采用 3×3 网格裁切并二次清理绿色地面阴影；B 组采用自动分割，避免把重复云朵和独立阴影发布为素材。
- Bee API 本轮返回 `404 no enabled channel for model "gpt-image-2"`，失败响应只作为诊断证据保留，未接入页面。

## 本轮落地

- 首页改为像素 HUD、三张今日任务牌、花园地图、宝箱和收集栏。
- 任务牌与地图节点复用现有 `toggle-plan`，完成后继续走本地成长、阳光、收集和小怪驱散逻辑。
- 其它幼儿页面统一使用方块边框、木牌色、草地色和大触控目标；成人版、儿童版和各自 localStorage 不变。
- 浏览器检查覆盖 1280、768、390 三档，确认图片、任务点击和移动端无横向溢出。

## GPT 参考图拆解落地（2026-07-30）

用户提供的 GPT 输出保存在 `assets/GPT生图/01-1.png` 和 `assets/GPT生图/01-2.png`。其中 `01-2.png` 是带分区标注的多元素拆解图，已按坐标配置裁切为 47 个语义区域，去除棋盘格并发布为 46 个透明 PNG/WebP：

`assets/generated/preschool-pixel/reference/gpt-output-20260730/published-gpt-v2/`

发布前通过 `publish_transparent_assets.py` 检查，46 个素材均为 RGBA，最外圈 alpha 为 0。右侧收集栏素材因包含木板面板底色未接入；宝箱沿用已有透明版本作为回退。幼儿版 `app.js` 已切换到这套 GPT 拆解资源。
