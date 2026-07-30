# 生图接口测试记录

> 测试时间：2026-07-29（Asia/Shanghai）
>
> 密钥只从本机 key 文档读取；此文件不记录密钥、完整响应、Authorization header 或 base64 图片内容。

## 本轮测试

| 通道 | 请求 | 结果 | 处理 |
|---|---|---|---|
| Agnes API | `POST https://apihub.agnes-ai.com/v1/images/generations`，模型 `agnes-image-2.1-flash`，儿童版无文字桌面 prompt，`1024x1024` | 成功，PNG 1024x1024，约 1.34 MB | 作为儿童版候选素材，转换为 WebP 后接入 |
| TokenX24 | `POST https://tokenx24.com/v1/images/generations`，模型 `gpt-image-2`，最小工作台 prompt | HTTP 403 Forbidden | 不保存失败响应为图片，不接入页面 |
| Bee API 主通道 | `POST https://beeapi.ai/v1/images/generations`，模型 `gpt-image-2` | 本轮先前测试出现上游超时 | 保留 CSS fallback；后续可在通道恢复后重试 |
| Bee API / beecode.cc | `POST https://beecode.cc/v1/images/generations` | HTTP 401/403，不能视为生成成功 | 不接入页面 |
| Bee/Grok 模型通道 | `grok-imagine-image-quality` | 历史测试持续 HTTP 502 | 不接入页面，等待重新探测 |

## 接入规则

1. 只接受 HTTP 成功且返回可解码图片的数据。
2. 保存前检查 PNG 文件头、实际像素尺寸和浏览器 `naturalWidth`。
3. 生成失败只进入诊断记录，不生成占位图片覆盖真实素材。
4. 页面必须保留缺图 fallback，网络或供应商不可用时仍能离线使用。

## 2026-07-29 幼儿版视觉重做

| 通道 | 请求 | 结果 | 处理 |
|---|---|---|---|
| Bee API 主通道 | `POST https://beeapi.ai/v1/images/generations`，模型 `gpt-image-2`，阳光花园主视觉 | HTTP 404：`no enabled channel for model "gpt-image-2"` | 记录失败响应，不接入页面 |
| TokenX24 key-2 | `GET https://tokenx24.com/v1/models` | HTTP 401 Unauthorized | 不继续发送生图请求 |
| Agnes API | 阳光花园横向主视觉，`1536x1024` 请求，模型 `agnes-image-2.1-flash` | 成功，实际 PNG `1248x832` | 转为 `preschool-garden-hero.webp` |
| Agnes API | 3x3 幼儿图标表，`1024x1024` 请求，模型 `agnes-image-2.1-flash` | 成功；9 格中 7 格无文字 | 历史候选，保留在生成记录中 |

## 2026-07-29 像素爆炸图重做

| 通道 | 请求 | 结果 | 处理 |
|---|---|---|---|
| Bee API 主通道 | A/B 两组透明素材爆炸图，`gpt-image-2` | HTTP 404：`no enabled channel for model "gpt-image-2"` | 失败响应保留在 `assets/generated/preschool-pixel/raw/`，不接入 |
| Agnes API | A 组 16-bit 像素任务、奖励和宝箱素材，`1024x1024` | 成功；原始图已目视检查 | 3x3 裁切，去色键后发布 6 个语义 PNG |
| Agnes API | B 组植物、树、云朵、星星和任务旗帜素材，`1024x1024` | 成功；洋红色键版本通过透明度检查 | 自动裁切，发布 6 个语义 PNG，重复云朵不接入 |

正式素材清单：`assets/generated/preschool-pixel/published/manifest.json`。

生成提示词保存在 `assets/generated/preschool/reference/`，正式素材清单见 `assets/generated/preschool/preschool-assets-manifest.json`。
