# 2026-07-31 视觉资产刷新

本轮根据《位图转矢量图工具调研报告（2026.07）》采用“位图生成 + 本地透明处理 + HTML 运行时排版”的管线。

## 分工

- Agnes：生成无文字 3x3 像素素材表，裁切后作为透明 PNG 组件。
- GPT/Bee：生成无文字宽幅花园场景，只承担背景和氛围，不承载中文标题、数值或按钮。
- HTML/CSS/JS：保留所有动态文案、任务状态、阳光、豌豆、按钮和无障碍标签。
- VTracer / SVG 工具：只用于后续需要矢量化的简单图标或几何标志；复杂像素插图不强制转 SVG，以免破坏像素边缘。

## 透明资产约束

- 原始生成图写入 `assets/generated/preschool-pixel/refresh-20260731/raw/`。
- 去背后的 PNG 写入 `assets/generated/preschool-pixel/refresh-20260731/published/`。
- 只接入通过 alpha 四角、尺寸、文件头和浏览器 `naturalWidth` 检查的素材。
- 不覆盖 `published-gpt-v2` 旧资产，新资产失败时继续使用旧回退路径。

## 来源记录

- 参考报告：飞书《位图转矢量图工具调研报告（2026.07）》。
- Agnes 配置：项目外部密钥文档 `G:\StudyCode\宠物积分系统\docs\生图\生图接口资源key\Agnes生图key.md`。
- GPT 配置：项目外部密钥文档 `G:\StudyCode\宠物积分系统\docs\生图\生图接口资源key\GPT生图模型key-2.md`。
- 密钥不写入仓库、图片元数据、生成日志或发布清单。
