以下是基于现有游戏资产风格，为「植物大战僵尸」游戏设计的一套僵尸生成提示词。提示词按从通用到具体的层级组织，方便你批量生成或针对性调整。

---

## 一、通用风格基调（所有僵尸共用）

在生成任何僵尸前，先用这组提示词定下整体美术风格。以下示例来自 SeaArt 社区中还原度较高的 PVZ 风格作品：

**正向提示词：**
> A vibrant, cartoonish scene depicts a battle between anthropomorphic plants and a horde of zombies. The scene is from the world of Plants Vs Zombies Video game. Bright colors, bold outlines, smooth shading, expressive characters. Clean composition, high detail, game asset style.

**反向提示词：**
> blurry, low detail, flat lighting, washed colors, messy composition, duplicate characters, extra limbs, distorted, poorly drawn hands, text artifacts, watermark, logo clutter, oversaturated neon, jpeg artifacts, noise, grain, static poses, cropped characters, out of frame subjects.

**通用参数建议：**
- **模型**：推荐 Pony Diffusion V6 XL或 DreamShaper v8
- **分辨率**：512×512 或 1024×1024（正方形游戏素材）
- **CFG Scale**：7.0–7.5
- **Steps**：30


## 二、基础僵尸（Core Zombies）

以下六种为基础僵尸类型，建议优先生成。

### 1. 普通僵尸 (Basic Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, torn brown suit with red striped tie, messy hair, wide frantic eyes, open mouth revealing missing teeth, shambling forward with arms outstretched, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：灰绿皮肤、棕色破西装、红色条纹领带、疯狂眼神、缺牙张嘴

### 2. 旗帜僵尸 (Flag Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, torn brown suit, holding a red flag with a skull symbol, leading a horde of zombies, running forward with determined expression, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：手持红旗、跑在最前面、坚定表情

### 3. 路障僵尸 (Conehead Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, wearing a bright orange traffic cone on head, torn brown suit with red striped tie, shambling forward, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：头顶橙色路障锥、橙色是视觉焦点

### 4. 铁桶僵尸 (Buckethead Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, wearing a grey metal bucket on head with a handle, torn clothing, shambling forward slowly but menacingly, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：头顶灰色铁桶、金属质感、缓慢但威胁性强

### 5. 铁门僵尸 (Screen Door Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, carrying a wooden screen door as a shield in front of body, torn clothes, shambling forward cautiously, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：手持木纱门当盾牌、谨慎前进

### 6. 读报僵尸 (Newspaper Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, holding a newspaper in front of face, wearing glasses, torn suit, reading while shambling forward, enraged expression when newspaper is destroyed, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：手持报纸遮脸、戴眼镜、报纸被毁后暴怒


## 三、特殊能力僵尸（Special Ability Zombies）

以下五种僵尸具有特殊能力，生成时需突出其核心特征。

### 7. 撑杆僵尸 (Pole Vaulting Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, wearing a tracksuit, holding a long pole for pole vaulting, athletic pose ready to jump over obstacles, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：运动服、撑杆、跳跃姿态

### 8. 橄榄球僵尸 (Football Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, wearing American football helmet and shoulder pads, holding a football, charging forward aggressively, muscular build, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：橄榄球头盔和护具、冲锋姿态、肌肉发达

### 9. 小丑僵尸 (Jack-in-the-Box Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, wearing a jester costume with colorful patterns, holding a Jack-in-the-box with a crank, maniacal grin, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：小丑服装、手持八音盒摇杆、疯狂笑容

### 10. 舞王僵尸 (Dancing Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, wearing a white disco suit with flared pants and an afro wig, striking a disco dance pose, sunglasses, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：白色迪斯科套装、喇叭裤、爆炸头、墨镜

### 11. 伴舞僵尸 (Backup Dancer Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, wearing matching disco outfit, synchronized dance pose, part of a group of four dancers following the Dancing Zombie, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：与舞王僵尸服装一致、同步舞姿、四人一组


## 四、精英/Boss 僵尸（Elite & Boss Zombies）

以下僵尸体型更大、更具威胁性，适合作为关卡 Boss。

### 12. 巨人僵尸 (Gargantuar)

**正向提示词：**
> A giant cartoon zombie character from Plants vs Zombies game, massive muscular build, grey-green skin, wearing a torn wife-beater tank top, holding a massive telephone pole or giant club as a weapon, towering over other zombies, menacing expression, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：巨大体型、肌肉发达、手持电线杆/大棒

### 13. 红眼巨人僵尸 (Red-eyed Gargantuar)

**正向提示词：**
> A giant cartoon zombie character from Plants vs Zombies game, massive muscular build, grey-green skin, glowing red eyes, wearing a torn wife-beater tank top, holding a massive weapon, even more menacing than regular Gargantuar, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：红色发光眼睛、比普通巨人更具威胁性


## 五、风格化变体（Stylized Variants）

用于主题关卡或特殊活动。

### 14. 未来僵尸 (Future Zombie)

**正向提示词：**
> A cartoon zombie character from Plants vs Zombies game, grey-green skin, wearing futuristic sunglasses, sci-fi themed outfit, high-tech accessories, white background, game sprite style, bold outlines, flat vector art, 1:1 square.

**关键特征**：时尚太阳镜、科幻风格服装

### 15. 啦啦队僵尸 (Cheerleader Zombie)

**正向提示词：**
> cheerzomb, 1girl, zombie, zombie girl, green skin, colored skin, black hair, ponytail, pom poms, cheerleader, pom pom (cheerleading), red dress, cheering, open mouth, teeth, shoes, white background, game sprite style.

**关键特征**：啦啦队服装、绒球、马尾辫


## 六、快速生成清单

按优先级排序，建议按以下顺序逐批生成：

| 批次 | 僵尸 | 用途 |
|------|------|------|
| **第一批** | 普通僵尸、旗帜僵尸、路障僵尸 | 前几关基础敌人 |
| **第二批** | 铁桶僵尸、铁门僵尸、读报僵尸 | 中期普通敌人 |
| **第三批** | 撑杆僵尸、橄榄球僵尸、小丑僵尸 | 特殊机制敌人 |
| **第四批** | 舞王僵尸、伴舞僵尸 | 群体战术敌人 |
| **第五批** | 巨人僵尸、红眼巨人僵尸 | Boss 战 |
| **第六批** | 未来僵尸、啦啦队僵尸 | 主题关卡 |

**参数速查：**
- **模型**：Pony Diffusion V6 XL / DreamShaper v8
- **分辨率**：512×512（精灵图）或 1024×1024（高质量）
- **CFG Scale**：7.0–7.5
- **Steps**：30
- **风格关键词**：`cartoon, game sprite style, bold outlines, flat vector art, white background, 1:1 square`（保持风格一致）