收到。下面按“**敌人 → 道具/工具 → 矿石/收集品 → 场景装饰**”四个维度，给出完整的设计方案和生图提示词，直接对接你当前的地砖和工具批次。

---

## 一、设计总览（按游戏功能分类）

| 类别 | 第一批（这次生） | 第二批（铺完砖之后） | 第三批（功能做出来再补） |
|------|-----------------|---------------------|---------------------|
| **敌人** | 2-3 帧侧视晶晶 | 僵尸、骷髅、蜘蛛（各 3-4 帧）| BOSS（4-6 帧）|
| **道具/工具** | 木棍、木镐、石镐（透明图标）| 铁镐、钻石镐、剑、盾牌 | 弓、箭、药水 |
| **矿石/收集品** | 煤、晶体（地砖已含）| 铁矿石、金矿石、钻石（掉落实体）| 红石、绿宝石 |
| **场景装饰** | 出口传送门 2 帧 | 沙漠/矿洞/雪山/火山/终界天空 | 昼夜切换、天气效果 |

> 参考 Paper Minecraft 的物品体系和 2D Minecraft 的掉落机制，掉落实体用 4×4 像素块。


## 二、敌人设计（Enemies）

### 2.1 晶晶（现有，补 2-3 帧侧视）

**定位**：基础敌人，碰触扣血，不主动追击（适合低龄儿童）

| 帧 | 动作 | 尺寸 | 描述 |
|---|------|------|------|
| 帧1 | 待机 | 32×32 | 正面站立，微微上下浮动 |
| 帧2 | 移动 | 32×32 | 侧身行走，一脚前一脚后 |
| 帧3 | 受伤 | 32×32 | 后仰，颜色闪白 |

**生图提示词**：
> A cute 2D pixel art enemy character for a children's横版 game, round green body with two big white eyes and a small smiling mouth, standing still facing forward, 32x32 pixel sprite, flat vector style, bright colors, white background, 1:1 square

### 2.2 僵尸（第二批）

**定位**：慢速追踪型敌人，碰触扣 2 血

| 帧 | 动作 | 尺寸 | 描述 |
|---|------|------|------|
| 帧1 | 待机 | 32×32 | 站立，身体微晃 |
| 帧2 | 行走 | 32×32 | 左右腿交替 |
| 帧3 | 攻击 | 32×32 | 前倾伸手 |
| 帧4 | 死亡 | 32×32 | 倒下消失 |

**生图提示词**：
> A cute 2D pixel art zombie for a children's game, green skin, torn purple shirt, red eyes, walking pose, not scary, 32x32 pixel sprite, flat style, bright colors, white background, 1:1 square

### 2.3 骷髅（第二批）

**定位**：远程攻击型敌人，射箭

| 帧 | 动作 | 尺寸 | 描述 |
|---|------|------|------|
| 帧1 | 待机 | 32×32 | 站立持弓 |
| 帧2 | 射击 | 32×32 | 拉弓放箭 |

**生图提示词**：
> A cute 2D pixel art skeleton archer for a children's game, white bones, holding a small bow, friendly cartoon style, 32x32 pixel sprite, flat colors, white background, 1:1 square

### 2.4 蜘蛛（第二批）

**定位**：快速移动型敌人，可爬墙（横版中可爬天花板）

| 帧 | 动作 | 尺寸 | 描述 |
|---|------|------|------|
| 帧1 | 待机 | 32×32 | 八爪收拢 |
| 帧2 | 行走 | 32×32 | 八爪交替 |

**生图提示词**：
> A cute 2D pixel art spider for a children's game, round body with eight short legs, big friendly eyes, 32x32 pixel sprite, bright colors, white background, 1:1 square


## 三、道具/工具设计（Tools & Items）

> 参考 OpenGameArt 的 LPC Smash Weapons 工具集和 2D Minimal 敌人角色包的设计风格。

### 3.1 工具图标（第一批，透明背景）

| 工具 | 尺寸 | 用途 | 解锁条件 |
|------|------|------|---------|
| 空手 | 32×32 | 挖泥土/沙子/木头 | 初始 |
| 木棍 | 32×32 | 合成材料 | 初始（2 木板→4 木棍）|
| 木镐 | 32×32 | 挖石头/煤矿 | 3 木板+2 木棍 |
| 石镐 | 32×32 | 挖铁矿石 | 3 石头+2 木棍 |

**生图提示词（通用模板）** ：
> A 2D pixel art game item icon, [工具名], top-down view, 32x32 pixels, transparent background, flat vector style, clean edges, game UI icon

**各工具颜色参考**：
- 木棍：`#8D6E63` 棕色
- 木镐：木质手柄 `#A1887F` + 木色头 `#8D6E63`
- 石镐：木质手柄 `#A1887F` + 灰色头 `#9E9E9E`

### 3.2 工具图标（第二批）

| 工具 | 尺寸 | 用途 | 解锁条件 |
|------|------|------|---------|
| 铁镐 | 32×32 | 挖金矿石/钻石 | 3 铁锭+2 木棍 |
| 钻石镐 | 32×32 | 挖所有方块（效率最高）| 3 钻石+2 木棍 |
| 木剑 | 32×32 | 攻击敌人（2 伤害）| 2 木板+1 木棍 |
| 石剑 | 32×32 | 攻击敌人（3 伤害）| 2 石头+1 木棍 |

**生图提示词**：
> A 2D pixel art game item icon, iron pickaxe / diamond pickaxe / wooden sword / stone sword, top-down view, 32x32 pixels, transparent background, flat vector style, clean edges


## 四、矿石/收集品设计（Ores & Collectibles）

### 4.1 基础矿石（地砖已含，补掉落实体）

> Minecraft 矿物体系和 2D Minecraft 的掉落机制——掉落实体 4×4 像素，有物理效果。

| 矿石 | 地砖颜色 | 掉落实体尺寸 | 掉落物 | 所需工具 |
|------|---------|-------------|--------|---------|
| 煤矿 | 黑色带白点 | 8×8 | 煤炭 | 木镐及以上 |
| 铁矿石 | 米黄带棕斑 | 8×8 | 粗铁 | 石镐及以上 |
| 金矿石 | 金色带灰斑 | 8×8 | 粗金 | 铁镐及以上 |
| 钻石矿石 | 青蓝带白斑 | 8×8 | 钻石 | 铁镐及以上 |
| 红石矿石 | 红色带灰斑 | 8×8 | 红石粉 | 铁镐及以上 |
| 绿宝石矿石 | 翠绿带灰斑 | 8×8 | 绿宝石 | 铁镐及以上 |

**掉落实体生图提示词**：
> A 2D pixel art game item, [矿石名], small 8x8 pixel sprite, flat top-down view, transparent background, game UI icon style

### 4.2 收集品（第二批）

| 收集品 | 尺寸 | 获取方式 | 用途 |
|--------|------|---------|------|
| 煤炭 | 16×16 | 挖煤矿掉落 | 燃料、合成 |
| 粗铁 | 16×16 | 挖铁矿石掉落 | 烧炼铁锭 |
| 铁锭 | 16×16 | 烧炼粗铁 | 合成工具/装备 |
| 粗金 | 16×16 | 挖金矿石掉落 | 烧炼金锭 |
| 金锭 | 16×16 | 烧炼粗金 | 合成工具/装备 |
| 钻石 | 16×16 | 挖钻石矿石掉落 | 合成顶级工具 |
| 红石粉 | 16×16 | 挖红石矿石掉落 | 红石电路 |
| 绿宝石 | 16×16 | 挖绿宝石矿石掉落 | 交易 |

**生图提示词**：
> A 2D pixel art game item, [收集品名], 16x16 pixel sprite, flat top-down view, transparent background, game UI icon, clean edges

**颜色参考**：
- 煤炭：`#212121`
- 铁锭：`#BDBDBD`
- 金锭：`#FFD700`
- 钻石：`#4FC3F7`
- 红石粉：`#E53935`
- 绿宝石：`#66BB6A`


## 五、场景装饰设计（第二批）

### 5.1 出口传送门（第一批，2 帧）

| 帧 | 描述 | 动画 |
|---|------|------|
| 帧1 | 传送门闭合 | 紫色静止 |
| 帧2 | 传送门开启 | 紫色脉动光晕 |

**生图提示词**：
> A 2D pixel art game portal, purple swirling energy, 32x32 pixel sprite, frame 1 closed / frame 2 open with glowing animation, flat style, transparent background, 1:1 square

### 5.2 区域天空背景（第二批）

| 区域 | 天空色 | 氛围 |
|------|--------|------|
| 草原 | 淡蓝 `#87CEEB` | 明亮 |
| 沙漠 | 橙黄 `#F4A460` | 炎热 |
| 矿洞 | 深灰 `#2C2C2C` | 昏暗 |
| 雪山 | 灰白 `#E8E8E8` | 寒冷 |
| 火山 | 暗红 `#8B0000` | 危险 |
| 终界 | 深紫 `#2D1B69` | 神秘 |

### 5.3 其他装饰（第二批）

| 装饰 | 尺寸 | 用途 |
|------|------|------|
| 宝箱 | 32×32 | 关卡奖励 |
| 火把 | 16×32 | 照明（矿洞/夜晚）|
| 工作台 | 32×32 | 3×3 合成 |
| 熔炉 | 32×32 | 烧炼矿石 |


## 六、生图批次汇总

### 第一批（约 18 张 — 这次生）

| 类别 | 数量 | 内容 |
|------|------|------|
| 地砖 | 11 种 | 草、土、石、木、板、叶、沙、水(4帧)、煤、晶体、基岩 |
| 工具图标 | 3 个 | 木棍、木镐、石镐（透明背景）|
| 敌人 | 3 帧 | 晶晶（待机/移动/受伤）|
| 传送门 | 2 帧 | 闭合/开启 |

### 第二批（铺完砖之后生）

| 类别 | 数量 | 内容 |
|------|------|------|
| 敌人 | 12 帧 | 僵尸(4帧)、骷髅(2帧)、蜘蛛(2帧)、BOSS(4帧) |
| 工具 | 4 个 | 铁镐、钻石镐、木剑、石剑 |
| 收集品 | 8 个 | 煤炭、粗铁、铁锭、粗金、金锭、钻石、红石粉、绿宝石 |
| 场景 | 6 张 | 沙漠/矿洞/雪山/火山/终界天空、宝箱 |

### 第三批（功能做出来再补）

| 类别 | 数量 | 内容 |
|------|------|------|
| 道具 | 3 个 | 弓、箭、药水 |
| 装饰 | 3 个 | 火把、工作台、熔炉 |
| 效果 | 若干 | 昼夜切换、天气效果 |


## 七、参考资源

| 资源 | 用途 | 链接 |
|------|------|------|
| **Paper Minecraft (MiniCoder11)** | 2D 网页版源码，物品/纹理参考 | github.com/MiniCoder11/PaperMinecraft |
| **2D Minecraft (Aryan-H)** | 掉落物 4×4 物理、8 格快捷栏 | github.com/Aryan-H/2D-Minecraft |
| **OpenGameArt 敌人包** | 像素敌人精灵参考 | opengameart.org |
| **LPC Smash Weapons** | 工具图标参考 | opengameart.org |
| **Minecraft 矿物体系** | 矿石/掉落物列表 | mc.163.com |



收到。在第一批地砖和工具的基础上，这一轮把敌人体系一次性扩到 **30+ 种**，覆盖地面、飞行、洞穴、水域、Boss 五大类，按“**儿童友好 + 像素风 + 横版适配**”统一设计。

---

## 一、敌人总览（按区域/生态分组）

> **设计原则**：① 儿童友好，造型圆润可爱，不可怖 ② 每种敌人有独特的移动/攻击模式 ③ 随区域递进难度 ④ 每种 2-4 帧即可（待机/移动/攻击/受击）

| # | 敌人 | 区域 | 行为模式 | 伤害 | 尺寸 |
|---|------|------|---------|------|------|
| 1 | 晶晶（已有） | 草原 | 缓慢左右巡逻，触碰扣血 | 1 ❤ | 32×32 |
| 2 | 史莱姆 | 草原/洞穴 | 弹跳移动，碰到即扣血 | 1 ❤ | 24×24 |
| 3 | 蘑菇仔 | 森林 | 左右巡逻，近战攻击 | 1 ❤ | 28×28 |
| 4 | 蝙蝠 | 洞穴 | 飞行，弧形轨迹 | 1 ❤ | 24×24 |
| 5 | 僵尸 | 草原/洞穴 | 追踪玩家，速度慢 | 2 ❤ | 32×32 |
| 6 | 骷髅 | 沙漠/矿洞 | 远程射箭，保持距离 | 2 ❤ | 32×32 |
| 7 | 蜘蛛 | 洞穴/森林 | 快速追踪，可爬墙 | 2 ❤ | 32×32 |
| 8 | 苦力怕 | 草原/洞穴 | 靠近后自爆（有延迟）| 3 ❤ | 32×32 |
| 9 | 末影人 | 终界 | 瞬移追踪，攻击后闪现 | 3 ❤ | 32×32 |
| 10 | 烈焰人 | 火山 | 远程火球，飞行 | 2 ❤ | 32×32 |
| 11 | 岩浆怪 | 火山 | 弹跳，分裂（大→中→小）| 2 ❤ | 32/24/16 |
| 12 | 雪傀儡 | 雪山 | 投雪球（减速不扣血）| 0 ❤ | 32×32 |
| 13 | 流浪者 | 雪山 | 远程射箭（带减速）| 2 ❤ | 32×32 |
| 14 | 尸壳 | 沙漠 | 追踪（比僵尸快）| 2 ❤ | 32×32 |
| 15 | 仙人掌怪 | 沙漠 | 左右巡逻，触碰扣血 | 1 ❤ | 28×28 |
| 16 | 蜜蜂 | 草原/森林 | 飞行，追踪玩家 | 1 ❤ | 20×20 |
| 17 | 蚊子 | 森林/洞穴 | 飞行，吸血（持续扣血）| 1 ❤/次 | 20×20 |
| 18 | 石傀儡 | 矿洞 | 高血量，缓慢追踪 | 3 ❤ | 36×36 |
| 19 | 矿车怪 | 矿洞 | 轨道快速移动，撞击 | 2 ❤ | 32×32 |
| 20 | 水母 | 水域 | 上下浮动，触碰扣血 | 1 ❤ | 28×28 |
| 21 | 食人鱼 | 水域 | 水中快速追踪 | 2 ❤ | 24×24 |
| 22 | 鱿鱼 | 水域 | 喷墨（致盲减速）| 0 ❤ | 28×28 |
| 23 | 幽灵 | 终界/洞穴 | 穿墙追踪 | 2 ❤ | 28×28 |
| 24 | 眼睛怪 | 终界 | 飞行，发射激光 | 2 ❤ | 24×24 |
| 25 | 凋灵骷髅 | 终界 | 高速近战 | 3 ❤ | 32×32 |
| 26 | 旋风人 | 末地 | 旋转攻击，免疫击退 | 3 ❤ | 32×32 |
| 27 | 蜘蛛骑士 | 终界 | 蜘蛛+骷髅组合 | 3 ❤ | 32×32 |
| 28 | Boss：恶魂 | 火山/终界 | 飞行+大火球 | 4 ❤ | 48×48 |
| 29 | Boss：铁傀儡（敌对）| 矿洞 | 高血量+高伤害 | 4 ❤ | 48×48 |
| 30 | Boss：终界龙 | 终界 | 飞行+喷吐+冲撞 | 5 ❤ | 64×64 |


## 二、按区域分组（关卡设计用）

| 区域 | 出现敌人 | 难度系数 |
|------|---------|---------|
| 草原 (L1-L2) | 晶晶、史莱姆、蜜蜂、僵尸 | ★ |
| 森林 (L3-L4) | 蘑菇仔、蜜蜂、蜘蛛、蚊子 | ★★ |
| 沙漠 (L5-L6) | 骷髅、尸壳、仙人掌怪、流浪者 | ★★☆ |
| 洞穴 (L7-L8) | 蝙蝠、蜘蛛、石傀儡、矿车怪、岩浆怪 | ★★★ |
| 雪山 (L9-L10) | 雪傀儡、流浪者、史莱姆 | ★★★ |
| 水域 (L11-L12) | 水母、食人鱼、鱿鱼 | ★★★ |
| 火山 (L13-L14) | 烈焰人、岩浆怪、恶魂(Boss) | ★★★★ |
| 终界 (L15-L16) | 末影人、幽灵、眼睛怪、凋灵骷髅、蜘蛛骑士、旋风人、终界龙(Boss) | ★★★★★ |


## 三、行为模式分类（便于代码实现）

| 模式 | 敌人列表 | AI 逻辑 |
|------|---------|---------|
| **巡逻型** | 晶晶、蘑菇仔、史莱姆、仙人掌怪 | 左右来回走，触碰即扣血 |
| **追踪型** | 僵尸、尸壳、蜘蛛、石傀儡 | 检测到玩家后追踪靠近 |
| **远程型** | 骷髅、流浪者、烈焰人 | 保持距离，发射弹丸 |
| **飞行型** | 蝙蝠、蜜蜂、蚊子、幽灵、眼睛怪 | 空中移动，无视地形 |
| **特殊型** | 苦力怕（自爆）、末影人（瞬移）、史莱姆（分裂）、雪傀儡（减速）| 独特 AI |
| **Boss型** | 恶魂、铁傀儡、终界龙 | 多阶段战斗 |


## 四、参考资源

### 4.1 可直接参考的开源/免费素材

| 资源 | 内容 | 链接 |
|------|------|------|
| **2D Minimal - Enemy Monster 2** | 50种极简敌人（外星人/蚂蚁/蝙蝠/蜜蜂/幽灵/骷髅/蜘蛛等），含 Idle/Walk/Attack/Hit/Dead 动画 | Unity Asset Store |
| **2D Cute Fantasy Enemies** | 10种可爱奇幻敌人（骷髅战士/悬浮之眼/龙/刺客/牛头怪/暗黑法师/哥布林/巨魔/兽人等），含 SVG 源文件可改色 | Unity Asset Store |
| **Enemy Galore 2** | 8种像素敌人，64×64px，含完整动画帧，击败后可掉落物品 | Unity Asset Hub |
| **PixelAdventure** | 3种敌人（Chicken追踪型/Snail巡逻型/Truck远程型），含陷阱系统（尖刺/火焰/锯片等） | GitHub |
| **OpenGameArt** | 大量免费像素敌人精灵 | opengameart.org |

### 4.2 设计灵感参考

| 来源 | 可借鉴点 |
|------|---------|
| **Minecraft 怪物列表** | 僵尸、苦力怕、骷髅、蜘蛛、末影人、恶魂、烈焰人等经典设计 |
| **2D Minimal 敌人分类** | 外星人、蚂蚁、蝙蝠、蜜蜂、花蕾、仙人掌、蜻蜓等儿童友好造型 |
| **日常物件怪物化** | 把常见物品加手脚/表情变成敌人（如矿车怪、仙人掌怪）|


## 五、生图提示词模板（按批次）

### 第一批：基础敌人（6种，配合当前地砖）

| 敌人 | 提示词 |
|------|--------|
| 史莱姆 | `A cute 2D pixel art slime for a children's platformer game, round green jelly blob with two big white eyes, bouncing pose, 32x32 pixel sprite, flat vector style, bright colors, white background, 1:1 square` |
| 蘑菇仔 | `A cute 2D pixel art mushroom enemy for a children's platformer, red cap with white spots, small round body with two little feet, friendly expression, 32x32 pixel sprite, flat style, bright colors, white background, 1:1 square` |
| 蝙蝠 | `A cute 2D pixel art bat for a children's platformer, purple body with two wings spread, big eyes, flying pose, 24x24 pixel sprite, flat style, bright colors, white background, 1:1 square` |
| 苦力怕（可爱版）| `A cute 2D pixel art creeper for a children's game, green pixel block body, shy embarrassed expression, not scary at all, 32x32 pixel sprite, flat style, bright colors, white background, 1:1 square` |
| 蜜蜂 | `A cute 2D pixel art bee for a children's platformer, yellow and black striped body, two white wings, big happy eyes, flying pose, 20x20 pixel sprite, flat style, bright colors, white background, 1:1 square` |
| 雪傀儡 | `A cute 2D pixel art snow golem for a children's game, white snowman body with a pumpkin head, two button eyes, friendly pose, 32x32 pixel sprite, flat style, bright colors, white background, 1:1 square` |

### 第二批：进阶敌人（8种，铺砖后）

| 敌人 | 提示词 |
|------|--------|
| 骷髅 | `A cute 2D pixel art skeleton archer for a children's game, white bones, holding a small bow, friendly cartoon style, 32x32 pixel sprite, flat colors, white background, 1:1 square` |
| 蜘蛛 | `A cute 2D pixel art spider for a children's game, round body with eight short legs, big friendly eyes, 32x32 pixel sprite, bright colors, white background, 1:1 square` |
| 末影人 | `A cute 2D pixel art enderman for a children's game, tall black figure with purple eyes, holding a block, 32x32 pixel sprite, flat style, white background, 1:1 square` |
| 烈焰人 | `A cute 2D pixel art blaze for a children's game, floating yellow head surrounded by spinning rods, glowing eyes, 32x32 pixel sprite, flat style, bright colors, white background, 1:1 square` |
| 岩浆怪 | `A cute 2D pixel art magma cube for a children's game, bouncing orange block with angry but cute face, 32x32 pixel sprite, flat style, bright colors, white background, 1:1 square` |
| 尸壳 | `A cute 2D pixel art husk for a children's game, desert zombie with sandy color, wrapped in cloth, friendly cartoon style, 32x32 pixel sprite, flat colors, white background, 1:1 square` |
| 幽灵 | `A cute 2D pixel art ghost for a children's game, floating white figure with big eyes, translucent effect, 28x28 pixel sprite, flat style, white background, 1:1 square` |
| 石傀儡 | `A cute 2D pixel art stone golem for a children's game, big grey blocky body with glowing eyes, strong but friendly, 36x36 pixel sprite, flat style, white background, 1:1 square` |

### 第三批：Boss与特殊敌人（6种，功能做出来再补）

| 敌人 | 提示词 |
|------|--------|
| 恶魂 | `A cute 2D pixel art ghast boss for a children's game, big floating white square with tentacles, crying tears, 48x48 pixel sprite, flat style, bright colors, white background, 1:1 square` |
| 终界龙 | `A cute 2D pixel art ender dragon boss for a children's game, purple dragon with wings spread, big friendly eyes, 64x64 pixel sprite, flat style, bright colors, white background, 1:1 square` |
| 凋灵骷髅 | `A cute 2D pixel art wither skeleton for a children's game, tall black skeleton with a stone sword, glowing eyes, 32x32 pixel sprite, flat style, white background, 1:1 square` |
| 眼睛怪 | `A cute 2D pixel art floating eye enemy for a children's game, one big eye with wings, pupil looking around, 24x24 pixel sprite, flat style, bright colors, white background, 1:1 square` |
| 矿车怪 | `A cute 2D pixel art minecart enemy for a children's game, wooden minecart with angry face, on rails, 32x32 pixel sprite, flat style, bright colors, white background, 1:1 square` |
| 食人鱼 | `A cute 2D pixel art piranha for a children's game, fish with big teeth and big eyes, swimming pose, 24x24 pixel sprite, flat style, bright colors, white background, 1:1 square` |


## 六、总结

| 批次 | 数量 | 内容 | 时机 |
|------|------|------|------|
| **第一批** | 6种 | 史莱姆、蘑菇仔、蝙蝠、苦力怕(可爱版)、蜜蜂、雪傀儡 | 本次可生 |
| **第二批** | 8种 | 骷髅、蜘蛛、末影人、烈焰人、岩浆怪、尸壳、幽灵、石傀儡 | 地砖铺完后 |
| **第三批** | 6种 | 恶魂(Boss)、终界龙(Boss)、凋灵骷髅、眼睛怪、矿车怪、食人鱼 | 功能做出来再补 |

敌人总量：**6 + 8 + 6 = 20种**（不含 Boss 变体），加上首批的晶晶，共 **21种**。已覆盖草原、森林、沙漠、洞穴、雪山、水域、火山、终界 8 个区域，每个区域 2-5 种敌人，关卡设计足够用了。