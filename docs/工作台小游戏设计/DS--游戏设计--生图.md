基于三个游戏的世界观和视觉风格，以下是用 Grok Imagine 生成美术素材的完整方案。

---

## 一、Grok Imagine 使用方式

### 方式一：X 平台直接使用（快速验证）

在 X 侧边栏打开 Grok，选择 **“Imagine”** 模式，直接输入提示词即可生成。支持通过**追加对话进行微调**，适合快速测试风格。

### 方式二：API 批量调用（生产级）

**请求地址**：`https://api.x.ai/v1/images/generations`

**Python 示例**：
```python
import xai_sdk
client = xai_sdk.Client()
response = client.image.sample(
    prompt="你的提示词",
    model="grok-imagine-image-quality",  # 高质量版
    n=1,  # 一次生成1-10张
)
print(response.url)
```

**定价**：约 **$0.05 / 张**。宽高比支持 1:1、16:9、9:16、4:3、3:4 等。返回的 URL 是临时的，需及时下载。


## 二、核心提示词技巧

根据 Grok Imagine 官方指南，一个有效的提示词应包含以下要素：

| 要素 | 说明 | 示例 |
|------|------|------|
| **主体** | 核心角色或物体 | "a cute cartoon pea shooter plant" |
| **动作/状态** | 主体在做什么 | "standing on grass, smiling at viewer" |
| **环境** | 场景设定 | "in a bright sunny garden" |
| **风格** | 视觉风格 | "children's book illustration style" |
| **光照** | 光影氛围 | "soft warm sunlight" |
| **构图/镜头** | 视角和取景 | "front view, clean composition" |

**关键原则**：
- 具体描述优于模糊词汇——“a cute cartoon pea shooter”优于“a plant”
- 50-200 词的提示词效果最佳
- 如需多图合并，明确说明各来源如何贡献
- 编辑图片时采用“原始场景 + 具体变化 + 光影匹配”公式


## 三、阳光花园 · 生图方案

### 3.1 游戏视觉定位

| 维度 | 规格 |
|------|------|
| 主色 | #4CAF50 绿 + #FFD700 金 |
| 风格 | 明亮儿童绘本风 / Pixar风格3D渲染 |
| 情绪 | 生机、成长、温暖 |

### 3.2 核心角色提示词

**豌豆射手（Peashooter）**
> A cute cartoon pea shooter plant character, bright green round head with two large white eyes and small black pupils with white highlights, a smiling mouth, a green pipe-shaped mouth pointing forward, two small green leaves on the sides, standing on a patch of grass in a bright sunny garden, soft warm sunlight, playful and friendly children's book illustration style, Pixar-inspired 3D render, clean composition, front view, 1:1 square aspect ratio

**向日葵（Sunflower）**
> A cute cartoon sunflower character with 12 bright yellow petals evenly arranged around a brown center disk, a smiling face on the disk with two big eyes and a happy mouth, standing on green grass in a sunny garden, soft golden sunlight, children's book illustration style, Pixar-inspired 3D render, warm and cheerful mood, front view, 1:1 square

**坚果墙（Wall-nut）**
> A cute cartoon wall-nut plant character, brown rounded rectangular body with a determined but friendly expression, two small eyes and a straight mouth, a small green leaf on top, standing firmly on grass in a sunny garden, children's book illustration style, Pixar-inspired 3D render, front view, 1:1 square

**普通僵尸（Basic Zombie）**
> A cute cartoon zombie character for children's game, light green skin, wearing a torn blue suit with a red tie, messy hair, friendly goofy expression with a slight smile, not scary at all, standing in a sunny garden, children's book illustration style, Pixar-inspired 3D render, front view, 1:1 square

### 3.3 场景背景图

**花园草地背景（游戏主背景）**
> A bright sunny garden background for a children's tower defense game, green grass lawn, blue sky with white fluffy clouds, some flowers and bushes in the background, warm golden sunlight, 5 rows of lawn visible, children's book illustration style, wide landscape view, 16:9 aspect ratio

**偶数关白天草坪**
> A bright sunny garden path with 5 lanes of green grass, blue sky, white clouds, colorful flowers along the sides, warm sunlight, children's book illustration style, top-down view, 16:9

### 3.4 UI图标

**阳光图标（资源图标）**
> A shiny golden sun icon for a children's game UI, bright yellow with orange highlights, cartoon style, clean white background, game UI icon design, 1:1 square, 256x256

**植物卡片图标**
> A set of plant card icons for a children's tower defense game, each card showing a cute cartoon plant character on a green background, game UI style, clean design, 1:1 square


## 四、方块探险 · 生图方案

### 4.1 游戏视觉定位

| 维度 | 规格 |
|------|------|
| 主色 | #42A5F5 蓝 + #FFA726 橙 |
| 风格 | 像素艺术 / 低多边形 / 体素风格 |
| 情绪 | 探索、创造、冒险 |

### 4.2 核心角色提示词

**小村民（主角）**
> A cute pixel art style character for a children's voxel game, a small blocky character with a blue shirt and brown pants, happy expression, big pixel eyes, holding a wooden pickaxe, standing in a colorful blocky world, 16-bit pixel art style, bright colors, game character design, front view, 1:1 square

**铁傀儡（Iron Golem）**
> A cute pixel art style iron golem character, blocky body made of grey blocks, friendly expression with pixel eyes, holding a poppy flower, standing in a voxel village, 16-bit pixel art style, children's game character, front view, 1:1 square

**苦力怕（Creeper，可爱版）**
> A cute pixel art style creeper character for children, green blocky body, shy embarrassed expression instead of scary, pixel art style, friendly and not intimidating, 16-bit pixel art, front view, 1:1 square

### 4.3 场景与方块

**方块世界场景**
> A colorful voxel-style world for a children's game, 16x12 grid of blocks with grass, dirt, stone, wood, and crystal blocks, bright blue sky, pixel art style, isometric view, children's game aesthetic, 16:9

**方块贴图集（Tileset）**
> A collection of 16x16 pixel art block textures for a children's voxel game: grass block (green top with brown sides), dirt block (brown), stone block (grey), wood block (brown with lines), crystal block (blue glowing), pixel art style, clean grid layout, 1:1

### 4.4 工具图标

**工具图标集**
> A set of game tool icons for a children's voxel game: wooden pickaxe, stone pickaxe, iron pickaxe, wooden axe, stone axe, wooden shovel, pixel art style, game UI icons, clean background, 1:1 square


## 五、彩虹闯关 · 生图方案

### 5.1 游戏视觉定位

| 维度 | 规格 |
|------|------|
| 主色 | #EC407A 粉 + #FFD54F 黄 |
| 风格 | 动态卡通渲染 / 2.5D插画 |
| 情绪 | 活力、挑战、欢乐 |

### 5.2 核心角色提示词

**主角（跑酷角色）**
> A cute cartoon platformer character for a children's game, small character with a red cap and blue overalls, big expressive eyes, smiling face, running pose with one foot forward, dynamic action pose, colorful cartoon style, children's game character design, front 3/4 view, 1:1 square

### 5.3 关卡元素

**关卡背景（第1-3关）**
> A bright colorful side-scrolling platform game level background for children, blue sky with clouds, green hills, rainbow in the background, colorful platforms, coins floating in the air, cheerful and vibrant, children's cartoon illustration style, 16:9 landscape

**关卡背景（第4-7关）**
> A side-scrolling platform game level background for children, forest theme with tall trees, wooden platforms, green foliage, sunbeams through leaves, magical forest atmosphere, cheerful cartoon style, 16:9 landscape

**关卡背景（第8-10关）**
> A side-scrolling platform game level background for children, cloud kingdom theme, floating islands, golden clouds, rainbow bridges, starry sky, dreamy and magical atmosphere, children's cartoon illustration style, 16:9 landscape

### 5.4 游戏元素

**金币**
> A shiny golden coin game asset for a children's platformer, cartoon style, glowing effect, clean white background, game item design, 1:1 square

**敌人（蘑菇怪）**
> A cute cartoon mushroom enemy character for a children's platform game, red cap with white spots, small angry but cute expression, short legs, walking pose, children's game character design, 1:1 square

**终点旗帜**
> A colorful checkered flag game asset for a children's platformer, red and white checkered pattern, flagpole, cartoon style, game goal marker, clean background, 1:1 square


## 六、跨游戏共享素材

### 6.1 宠物角色（三游戏共用）

**蛋形态**
> A cute glowing egg with a small crack, warm golden light coming from inside, mysterious and exciting feeling, children's book illustration style, soft pastel colors, 1:1 square

**幼崽形态**
> A cute baby animal character emerging from an egg, small and fluffy, big curious eyes, looking happy and excited, children's book illustration style, soft warm colors, 1:1 square

**进化形态**
> A majestic cute creature character, evolved form of a baby animal, with glowing elements and confident expression, fantasy children's book illustration style, magical atmosphere, 1:1 square

### 6.2 通用UI元素

**按钮状态图**
> A set of game UI button states for a children's educational game: normal state (rounded green), hover state (lighter green with glow), pressed state (darker green), disabled state (grey), cartoon style, clean design, 1:1


## 七、批量生产建议

### 7.1 生产流程

```
第一步：风格测试
用核心角色提示词生成1-2张 → 确认风格方向 → 微调提示词

第二步：批量生成
用确认的提示词模板批量生成 → 每个提示词 n=4-10 → 人工筛选最佳

第三步：统一处理
下载图片 → 裁剪/调整尺寸 → 命名规范 → 放入 assets/
```

### 7.2 命名规范

```
阳光花园/
  ├── characters/
  │   ├── peashooter.png
  │   ├── sunflower.png
  │   └── wall-nut.png
  ├── backgrounds/
  │   ├── garden-day.png
  │   └── garden-night.png
  └── ui/
      ├── sun-icon.png
      └── plant-cards/

方块探险/
  ├── characters/
  │   ├── villager.png
  │   └── golem.png
  ├── tilesets/
  │   ├── grass.png
  │   ├── dirt.png
  │   └── stone.png
  └── ui/
      ├── pickaxe.png
      └── axe.png

彩虹闯关/
  ├── characters/
  │   └── runner.png
  ├── backgrounds/
  │   ├── level1-3.png
  │   ├── level4-7.png
  │   └── level8-10.png
  └── assets/
      ├── coin.png
      ├── enemy.png
      └── flag.png

shared/
  ├── pet/
  │   ├── egg.png
  │   ├── baby.png
  │   └── evolved.png
  └── ui/
      └── buttons/
```

### 7.3 API批量生成脚本（Python）

```python
import xai_sdk
import time
import json

client = xai_sdk.Client()

# 提示词列表
prompts = [
    {"name": "peashooter", "prompt": "A cute cartoon pea shooter..."},
    {"name": "sunflower", "prompt": "A cute cartoon sunflower..."},
    # ... 更多提示词
]

for item in prompts:
    response = client.image.sample(
        prompt=item["prompt"],
        model="grok-imagine-image-quality",
        n=4,  # 每批4张供筛选
    )
    # 保存URL列表
    with open(f"{item['name']}_urls.json", "w") as f:
        json.dump(response.urls, f)
    time.sleep(1)  # 避免限流
```