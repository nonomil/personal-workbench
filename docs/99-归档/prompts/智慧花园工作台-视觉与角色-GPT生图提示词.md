# 智慧花园工作台：视觉与角色生成提示词（GPT Image 专用）

> 用途：生成幼儿版工作台的透明角色、植物、僵尸、奖励和课程插图。
>
> 生图模型：仅 GPT Image。不要使用 Agnes，不要把 Agnes 作为备选或验收通道。
>
> 项目素材目录：`G:\StudyCode\个人工作台\assets\generated\`

## 0. 总体执行规则

你是一位儿童教育产品的角色美术指导和 UI 素材设计师。请为“智慧花园工作台”生成原创、可直接用于网页的 2D 图片素材。

生成前先遵守：

- 不复制任何现成游戏角色、Logo、字体、截图、UI 面板或品牌标识。
- 可以使用“阳光花园、植物防守、友好僵尸、任务奖励”的游戏化语义，但角色必须原创。
- 不在图片内生成中文、英文、数字、按钮、标签或水印；文字由 HTML/CSS 渲染。
- 不生成复杂背景替代透明角色素材；角色、植物、道具优先单独透明输出。
- 不使用 Agnes；只走 GPT Image 生成和本地后处理流程。
- 每次生成后必须检查透明角、主体完整度、裁切边界、自然尺寸和浏览器渲染效果。

## 1. 统一风格母提示词

将以下英文母提示词放在每个角色 prompt 前面，再追加具体角色描述：

```text
Original 2D children's picture-book game asset for a preschool learning workbench called Smart Sun Garden. Friendly educational garden-defense game language, warm hand-painted cartoon illustration, rounded organic shapes, clear silhouette, expressive face, bright but gentle colors, subtle paper texture, soft painterly shading, clean readable details at 64px display size, centered single subject, front three-quarter view, no text, no letters, no numbers, no logo, no watermark, no UI, isolated on a fully transparent background, complete subject visible with generous padding, crisp alpha edges, production-ready PNG asset.
```

反向约束追加：

```text
No copyrighted game character replication, no franchise logo, no frightening horror, no blood, no realistic weapon, no photorealism, no busy background, no cropped limbs, no extra characters, no text artifacts, no checkerboard baked into the image.
```

推荐输出：`1024x1024`，透明 PNG；需要横向场景时使用 `1536x1024`。生成后再转 WebP 供页面加载，保留原始 PNG 作为可追溯源文件。

## 2. 核心角色提示词

每条都与“统一风格母提示词”拼接后单独生成，不要一次让模型输出多个角色。

### 2.1 向日葵伙伴

```text
A cheerful original sunflower helper, twelve rounded golden petals, warm brown seed center, big friendly eyes, rosy cheeks, small smiling mouth, two broad green leaves, short stem, tiny leaf-shaped backpack, gentle morning glow, welcoming pose, subtle breathing-friendly silhouette.
```

### 2.2 豌豆射手伙伴

```text
An original friendly pea-shooter plant, rounded mint-green head, one soft pea-launcher tube integrated as a plant feature, big bright eyes, determined but kind smile, two layered leaves, small root base, playful ready-to-help pose, no realistic weapon details.
```

### 2.3 坚果墙伙伴

```text
An original nut-wall guardian, rounded warm brown oval body, soft shell bands and a few simple decorative cracks, large calm eyes, brave reassuring smile, two tiny leaves at the base, sturdy child-safe pose, plush-toy feeling.
```

### 2.4 寒冰植物伙伴

```text
An original ice-flower plant, blue-green leaves, pale cyan flower head, small translucent frost crystals, happy sparkling eyes, cool mint and sky-blue palette, gentle snow-glow, friendly not sharp, clean silhouette.
```

### 2.5 樱桃炸弹伙伴

```text
An original cherry celebration plant, two glossy red cherry-like fruit heads connected by a green stem, excited smiling faces, tiny party sparkles and soft warm glow, playful celebration prop rather than a weapon, rounded child-safe silhouette.
```

### 2.6 友好普通僵尸

```text
A silly non-scary garden invader, blue-gray rounded skin, oversized curious eyes, messy dark hair, oversized soft brown jacket, loose tie, mismatched shoes, arms slightly forward as if politely asking for a task, goofy smile, no horror, no decay, no teeth emphasis.
```

### 2.7 路障僵尸

```text
A silly friendly garden invader wearing a bright orange striped cone as a soft oversized hat, blue-gray skin, curious eyes, loose colorful clothes, wobbling stance, playful expression, no horror, no injury, clearly readable cone silhouette.
```

### 2.8 铁桶僵尸

```text
A silly friendly garden invader wearing a rounded silver bucket helmet with one soft highlight, blue-gray skin, oversized sweater, slow careful pose, kind goofy eyes, safe preschool illustration, no threatening weapon, no horror.
```

### 2.9 旗帜僵尸

```text
A cheerful garden invader holding a small fabric flag with a smiling sun symbol, blue-gray skin, colorful patched clothes, proud but harmless expression, flag gently waving, clear separated silhouette, no skull, no horror.
```

### 2.10 猫头鹰向导

```text
A friendly owl tutor companion, round cocoa-brown body, very large warm eyes, tiny golden beak, soft wings opened in a welcoming gesture, little green leaf satchel, curious intelligent smile, cozy storybook silhouette.
```

## 3. 奖励、道具与 UI 图形提示词

这些素材也必须透明、单主体、无文字：

```text
An original glowing golden sun token with a friendly tiny face, soft yellow rays, centered icon silhouette, transparent background, no text.
```

```text
An original small garden treasure chest filled with colorful stars, rounded wooden body, leaf-shaped metal details, open lid, transparent background, no text.
```

```text
An original seed packet icon, warm paper pouch with a simple sprout symbol, green and yellow palette, no letters or numbers, transparent background.
```

```text
An original child-friendly garden shield, round leaf-and-sun emblem, mint green and golden yellow, soft highlight, transparent background, no text.
```

```text
An original collection badge showing a tiny sprout growing from a star, rounded badge shape, four color variants for bronze, silver, gold and sky-blue, transparent background, no text.
```

## 4. 课程与古诗插图提示词

课程插图只做“看一眼就知道是什么”的场景，不在图中写字：

```text
An original preschool literacy learning illustration: a friendly sunflower, three large picture-book pages, simple leaf and animal shapes, warm orange and green palette, clean open composition, no text, no letters, no numbers, transparent background.
```

```text
An original preschool pinyin learning illustration: colorful sound bubbles, a friendly owl pointing at rounded speech shapes, blue and mint palette, simple expressive forms, no letters, no text, transparent background.
```

```text
An original preschool mathematics learning illustration: three apples and two apples beside a smiling number-free counting tray, bright red, green and yellow, clear separation, no text, no numbers, transparent background.
```

古诗场景使用独立横向图，不做透明角色图：

```text
Original delicate Chinese picture-book landscape illustration for a preschool poetry card, quiet moonlit window, distant blue-gray mountains, a small warm house silhouette, generous negative space, light ink-wash and soft paper texture, calm cream and blue palette, no text, no calligraphy, no watermark, wide 3:2 composition.
```

将“月夜窗前”替换为以下主题分别生成：春晨落花与鸟鸣、白鹅与绿水红掌、田间锄禾与烈日、黄河远山与落日。每幅画面至少保留三个主题元素，留白不少于 30%。

## 5. 动效与切图要求

GPT 图片本身不承担复杂动画。生成素材时保证轮廓稳定，由 CSS 负责：

- 植物：`rotate(-2deg) -> rotate(2deg)`，周期 1.8-2.4 秒。
- 僵尸：`translateY(-2px) rotate(-1deg) -> translateY(2px) rotate(1deg)`，周期 1.4-1.8 秒。
- 阳光：轻微缩放和亮度变化，周期 2 秒。
- 奖励：进入页面时 `scale(.86) -> scale(1)`，一次性完成。
- `prefers-reduced-motion: reduce` 时关闭动画，不影响点击和结算。

如一次生成多元素爆炸图，必须在本地后处理为单个文件：

```text
raw/                 GPT 原始输出，只读保存
working/             裁切、透明边缘修复、人工筛选
published/           页面正式引用的 PNG/WebP
manifest.json        文件名、来源 prompt、尺寸、透明度检查结果
```

每个发布素材需要：

- 四角透明或背景透明策略明确；
- 主体不贴边，四周保留 8%-15% 安全边距；
- 文件名使用语义名，例如 `plant-sunflower.png`、`zombie-conehead.webp`；
- HTML `alt` 使用中文角色名；
- 页面检查 `naturalWidth > 0`，加载失败有 fallback。

## 6. 生图验收清单

生成完成后逐项检查：

1. 是否确实由 GPT Image 生成；不接受 Agnes 或未知通道替代。
2. 是否无文字、无 Logo、无水印、无多余角色。
3. 是否透明背景，四角没有白底、灰底或棋盘格。
4. 64px、96px、160px 显示时轮廓和表情仍清楚。
5. 植物和僵尸能在同一页面保持色彩区分，僵尸不可恐怖。
6. 图片在幼儿版首页、植物大战页和课程页均不挤压文字。
7. 生成日志不保存密钥、Authorization、base64 或完整私密响应。

## 7. 执行顺序

```text
确定素材清单 → 编写 GPT prompt → 生成透明原图 → 本地裁切与 alpha 检查
→ 写入 manifest → 接入 preschoolAsset() → 浏览器截图检查 → npm test
```

如果 GPT 生图通道暂时不可用，保留现有正式素材和 CSS fallback，记录失败原因，不用空白占位图覆盖可用素材。
