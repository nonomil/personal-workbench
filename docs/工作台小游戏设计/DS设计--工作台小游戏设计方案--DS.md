> 2026-08-13 已用仓库实况与开源实查重写落地版，请以同目录为准：  
> [README.md](./README.md) · [01-花园保卫](./01-花园保卫-落地改造方案.md) · [02-方块世界](./02-方块世界-落地改造方案.md) · [03-横版闯关](./03-横版闯关-落地改造方案.md)  
> 下文保留为调研草稿：线索可用，**整仓 fork / 游戏券 / 5–8 小时工时不可执行**。

针对你提出的三个游戏模块的重做需求，我基于对开源项目的调研，为你梳理了三个可直接落地的详细方案。核心思路是：**寻找技术栈最匹配（纯HTML/CSS/JS）、玩法最成熟的轻量级项目，进行“精简-适配-整合”**，而非从零开发。

---

## 一、🌻 植物大战僵尸 · 重做方案

### 1.1 参考项目

| 项目                                 | 技术栈                         | 亮点                                        | 地址                                        |
| ------------------------------------ | ------------------------------ | ------------------------------------------- | ------------------------------------------- |
| **plantsvszombiesjs**                | 纯HTML/CSS/JS，零依赖，MIT协议 | 经典塔防、多种植物/僵尸、响应式设计         | github.com/plantsvszombiesjs                |
| **Azure12355 魔改版**                | 纯HTML/CSS/JS，Apache 2.0      | 保留原版风格 + 杂交植物/变异僵尸/中国馆模式 | github.com/Azure12355/game-plant-vs-zombies |
| **New-Plants-vs-Zombies-JavaScript** | 纯JavaScript                   | 原始版本，由江南游戏开发社开发              | github.com/jiangnangame                     |

**推荐首选**：`plantsvszombiesjs` —— 轻量、零依赖、MIT协议、持续更新。

### 1.2 改造方法

**核心策略：大幅精简，而非完整移植。**

| 改造项   | 原版      | 精简版（工作台适配）                                         |
| -------- | --------- | ------------------------------------------------------------ |
| 行数     | 5行       | **3行**（降低复杂度）                                        |
| 植物种类 | 10+种     | **4种**：向日葵（产阳光）、豌豆射手（攻击）、坚果墙（防御）、土豆雷（陷阱） |
| 僵尸种类 | 8+种      | **3种**：普通僵尸、路障僵尸、铁桶僵尸                        |
| 关卡     | 无尽模式  | **单局生存模式**：存活60秒即过关                             |
| 交互     | 键盘+鼠标 | **纯触控/点击**（儿童友好）                                  |
| 资源     | 图片+音效 | **SVG绘制+Web Audio合成**（零外部依赖）                      |

**精简版代码框架**：

```javascript
// 精简版PVZ核心（约200-300行）
class MiniPVZ {
    constructor() {
        this.rows = 3;
        this.cols = 7;
        this.grid = [];          // 3x7 二维数组
        this.sun = 50;
        this.zombies = [];
        this.bullets = [];
        this.score = 0;
        this.timeLeft = 60;      // 60秒生存
        this.isRunning = false;
    }
    
    // 种植植物（点击空位 → 弹出选择面板）
    plant(row, col, type) {
        const cost = { sunflower: 25, peashooter: 50, wallnut: 30, potato: 20 };
        if (this.sun >= cost[type] && !this.grid[row][col]) {
            this.sun -= cost[type];
            this.grid[row][col] = { type, hp: 100, timer: 0 };
            return true;
        }
        return false;
    }
    
    // 每帧更新（requestAnimationFrame驱动）
    update() {
        // 1. 僵尸生成（每5-8秒随机生成）
        // 2. 僵尸移动（每1.5秒左移一格）
        // 3. 植物攻击（每2秒发射子弹）
        // 4. 碰撞检测（子弹→僵尸、僵尸→植物）
        // 5. 游戏结束判定（僵尸到达最左列 或 时间到）
    }
}
```

### 1.3 整合到工作台的方式

```
工作台导航 → 「游戏世界」Tab → 「🌻 花园保卫战」卡片
                                    ↓
                              点击「开始游戏」
                                    ↓
                          消耗1张「游戏券」（如有）
                                    ↓
                          全屏弹出游戏界面（半透明遮罩）
                                    ↓
                              游戏结束 → 结算得分
                                    ↓
                      得分转化为阳光/积分 → 更新宠物状态
```

**关键点**：
- 游戏作为**独立组件**嵌入，不干扰工作台主框架
- 游戏结束后**自动关闭**，返回工作台
- 得分与工作台的**阳光/积分系统**联动

### 1.4 实施步骤

| 步骤     | 任务                            | 预估时间      |
| -------- | ------------------------------- | ------------- |
| 1        | Fork `plantsvszombiesjs` 仓库   | 5分钟         |
| 2        | 精简为3行×7列，4种植物，3种僵尸 | 2-3小时       |
| 3        | 将图片资源替换为SVG绘制         | 1-2小时       |
| 4        | 音效替换为Web Audio合成         | 30分钟        |
| 5        | 封装为独立组件，嵌入工作台      | 1小时         |
| 6        | 接入游戏券/积分系统             | 30分钟        |
| **合计** |                                 | **约5-7小时** |


## 二、⛏️ 我的世界（2D横版·可破坏方块）· 重做方案

### 2.1 参考项目

| 项目                           | 技术栈         | 亮点                       | 地址                                  |
| ------------------------------ | -------------- | -------------------------- | ------------------------------------- |
| **nadiahosisy/minecraft-2d**   | 纯HTML/CSS/JS  | 2D简化版，适合儿童，零依赖 | github.com/nadiahosisy/minecraft-2d   |
| **shellyalmo/minecraft-game**  | 纯HTML/CSS/JS  | 2D预生成世界，DOM操作练习  | github.com/shellyalmo/minecraft-game  |
| **Pixelikas/Minecraft2D-Game** | HTML/CSS/JS    | 2D克隆，Construct 2开发    | github.com/Pixelikas/Minecraft2D-Game |
| **ddalcu/adicraft**            | Three.js + Yjs | 3D体素，实时多人           | github.com/ddalcu/adicraft            |

**推荐首选**：`nadiahosisy/minecraft-2d` —— 最轻量、纯前端、专为简化体验设计。

### 2.2 改造方法

**核心策略：抽取「横版过关 + 破坏方块」核心玩法，做成闯关小游戏。**

| 改造项   | 原版          | 工作台适配版                              |
| -------- | ------------- | ----------------------------------------- |
| 视角     | 俯视图        | **横版侧视图**（类似2D平台）              |
| 世界大小 | 无限生成      | **固定关卡**（10关 × 逐渐变难）           |
| 方块类型 | 10+种         | **5种**：草、土、石、木、沙               |
| 核心玩法 | 自由建造+破坏 | **闯关破坏**：破坏所有目标方块过关        |
| 操作     | WASD+鼠标     | **触控/点击**：点击方块破坏，左右滑动移动 |
| 目标     | 无明确目标    | **每关限定步数/时间**内破坏所有目标       |

**精简版代码框架**：

```javascript
// 精简版2D Minecraft（横版闯关）
class MiniMinecraft {
    constructor() {
        this.level = 1;
        this.world = [];         // 预生成关卡地图
        this.player = { x: 0, y: 0 };
        this.targets = [];       // 需要破坏的目标方块
        this.steps = 0;
        this.maxSteps = 20;      // 每关限定步数
        this.isRunning = false;
    }
    
    // 生成关卡（每关逐渐增加方块数量和复杂度）
    generateLevel(level) {
        // 预置10关地图数据
        const maps = [...];
        this.world = maps[level - 1];
        this.targets = this.world.filter(b => b.type === 'target');
    }
    
    // 破坏方块（点击方块 → 如果是目标则消除）
    breakBlock(x, y) {
        const block = this.world.find(b => b.x === x && b.y === y);
        if (block && block.type === 'target') {
            this.world.splice(this.world.indexOf(block), 1);
            this.steps++;
            return true;
        }
        return false;
    }
    
    // 过关判定
    checkWin() {
        return this.targets.every(t => t.destroyed);
    }
}
```

### 2.3 整合到工作台的方式

```
工作台导航 → 「游戏世界」Tab → 「⛏️ 方块闯关」卡片
                                    ↓
                              点击「开始游戏」
                                    ↓
                          消耗1张「游戏券」
                                    ↓
                          全屏弹出游戏界面
                                    ↓
                    破坏所有目标方块 → 过关 → 下一关
                                    ↓
                              游戏结束 → 结算得分
                                    ↓
                      得分转化为阳光/积分 → 更新宠物状态
```

**关卡难度递进**：

| 关卡   | 方块数量 | 步数限制 | 新增挑战                 |
| ------ | -------- | -------- | ------------------------ |
| 1-3关  | 3-5个    | 20步     | 基础破坏                 |
| 4-6关  | 5-8个    | 15步     | 混合方块（需要区分目标） |
| 7-9关  | 8-12个   | 12步     | 移动平台 + 障碍物        |
| 第10关 | 15个     | 10步     | BOSS关（限时+复杂布局）  |

### 2.4 实施步骤

| 步骤     | 任务                                 | 预估时间      |
| -------- | ------------------------------------ | ------------- |
| 1        | Fork `nadiahosisy/minecraft-2d` 仓库 | 5分钟         |
| 2        | 改造为横版侧视图 + 预置10关地图      | 2-3小时       |
| 3        | 增加「破坏目标方块」核心玩法         | 1-2小时       |
| 4        | 增加过关判定 + 关卡递进逻辑          | 1小时         |
| 5        | 封装为独立组件，嵌入工作台           | 1小时         |
| 6        | 接入游戏券/积分系统                  | 30分钟        |
| **合计** |                                      | **约5-8小时** |


## 三、🏃 超级马里奥（横版过关）· 重做方案

### 3.1 参考项目

| 项目                                 | 技术栈                     | 亮点                             | 地址                                             |
| ------------------------------------ | -------------------------- | -------------------------------- | ------------------------------------------------ |
| **sugidaffection/js-supermariobros** | Vanilla JS + Canvas + Vite | ECS架构、流畅物理、响应式        | github.com/sugidaffection/js-supermariobros      |
| **FullScreenMario**                  | TypeScript + Grunt         | 原版32关 + 随机地图 + 关卡编辑器 | github.com/FullScreenShenanigans/FullScreenMario |
| **umaim/Mario**                      | HTML5 + TypeScript         | FullScreenMario的镜像仓库        | github.com/umaim/Mario                           |

**推荐首选**：`sugidaffection/js-supermariobros` —— 纯JS、ECS架构、MIT协议、持续更新。

### 3.2 改造方法

**核心策略：保留核心「跳跃+闯关」玩法，精简为适合儿童的短关卡。**

| 改造项   | 原版              | 工作台适配版                                          |
| -------- | ----------------- | ----------------------------------------------------- |
| 关卡数量 | 32关              | **10关**（每关逐渐变难）                              |
| 敌人类型 | 6+种              | **3种**：蘑菇怪（巡逻）、乌龟（可踩）、食人花（固定） |
| 道具     | 蘑菇、花朵、星星  | **蘑菇**（变大）+ **金币**（收集）                    |
| 操作     | 键盘（方向+空格） | **触控优化**：左/右按钮 + 跳跃按钮（大按钮）          |
| 生命值   | 3条命             | **无限续关**（儿童友好，不设惩罚）                    |
| 目标     | 到达终点旗杆      | **收集所有金币 + 到达终点**                           |

**精简版代码框架**：

```javascript
// 精简版马里奥（10关）
class MiniMario {
    constructor() {
        this.level = 1;
        this.player = { x: 0, y: 0, vx: 0, vy: 0, width: 30, height: 40 };
        this.platforms = [];
        this.enemies = [];
        this.coins = [];
        this.totalCoins = 0;
        this.collectedCoins = 0;
        this.isRunning = false;
        this.isJumping = false;
    }
    
    // 加载关卡（预置10关数据）
    loadLevel(level) {
        const levels = [...];
        const data = levels[level - 1];
        this.platforms = data.platforms;
        this.enemies = data.enemies;
        this.coins = data.coins;
        this.totalCoins = data.coins.length;
        this.player.x = data.startX;
        this.player.y = data.startY;
    }
    
    // 跳跃（点击跳跃按钮）
    jump() {
        if (!this.isJumping) {
            this.player.vy = -10;
            this.isJumping = true;
        }
    }
    
    // 更新（物理+碰撞检测）
    update() {
        // 1. 重力
        this.player.vy += 0.5;
        this.player.y += this.player.vy;
        // 2. 碰撞检测（平台/敌人/金币）
        // 3. 过关判定（收集所有金币 + 到达终点）
    }
}
```

### 3.3 整合到工作台的方式

```
工作台导航 → 「游戏世界」Tab → 「🏃 马里奥闯关」卡片
                                    ↓
                              点击「开始游戏」
                                    ↓
                          消耗1张「游戏券」
                                    ↓
                          全屏弹出游戏界面
                                    ↓
                    收集金币 + 到达终点 → 过关 → 下一关
                                    ↓
                              游戏结束 → 结算得分
                                    ↓
                      得分转化为阳光/积分 → 更新宠物状态
```

**关卡难度递进**：

| 关卡   | 平台数量 | 金币数量 | 敌人数量 | 新增挑战            |
| ------ | -------- | -------- | -------- | ------------------- |
| 1-2关  | 5-7个    | 5个      | 0-1个    | 基础跳跃            |
| 3-5关  | 7-10个   | 8个      | 1-2个    | 移动平台 + 敌人     |
| 6-8关  | 10-12个  | 10个     | 2-3个    | 间隙加大 + 多种敌人 |
| 9-10关 | 12-15个  | 12个     | 3-4个    | 复杂地形 + BOSS挑战 |

### 3.4 实施步骤

| 步骤     | 任务                                         | 预估时间      |
| -------- | -------------------------------------------- | ------------- |
| 1        | Fork `sugidaffection/js-supermariobros` 仓库 | 5分钟         |
| 2        | 精简为10关，预置关卡数据                     | 2-3小时       |
| 3        | 增加触控按钮（左/右/跳）                     | 1-2小时       |
| 4        | 修改为「收集金币+到达终点」过关条件          | 1小时         |
| 5        | 封装为独立组件，嵌入工作台                   | 1小时         |
| 6        | 接入游戏券/积分系统                          | 30分钟        |
| **合计** |                                              | **约5-8小时** |


## 四、📊 三个游戏方案对比与选择建议

| 维度           | 植物大战僵尸        | 我的世界（2D）           | 超级马里奥          |
| -------------- | ------------------- | ------------------------ | ------------------- |
| **参考项目**   | plantsvszombiesjs   | nadiahosisy/minecraft-2d | js-supermariobros   |
| **技术栈**     | 纯HTML/CSS/JS       | 纯HTML/CSS/JS            | Vanilla JS + Canvas |
| **改造难度**   | ⭐⭐⭐                 | ⭐⭐⭐                      | ⭐⭐⭐⭐                |
| **儿童友好度** | ⭐⭐⭐⭐⭐               | ⭐⭐⭐⭐                     | ⭐⭐⭐⭐⭐               |
| **与学习联动** | 强（策略+资源管理） | 中（创造力+问题解决）    | 强（反应+手眼协调） |
| **预估工时**   | 5-7小时             | 5-8小时                  | 5-8小时             |

**建议实施顺序**：
1. **先做植物大战僵尸** —— 参考项目最成熟、最轻量，与工作台「花园」主题最匹配
2. **再做超级马里奥** —— 触控优化后可玩性最高，孩子接受度最好
3. **最后做我的世界** —— 关卡设计相对独立，可作长期迭代


## 五、📁 资源清单

| 资源                      | 链接                                                     |
| ------------------------- | -------------------------------------------------------- |
| plantsvszombiesjs 仓库    | github.com/plantsvszombiesjs/plantsvszombiesjs.github.io |
| Azure12355 魔改版         | github.com/Azure12355/game-plant-vs-zombies              |
| nadiahosisy/minecraft-2d  | github.com/nadiahosisy/minecraft-2d                      |
| shellyalmo/minecraft-game | github.com/shellyalmo/minecraft-game                     |
| js-supermariobros         | github.com/sugidaffection/js-supermariobros              |
| FullScreenMario           | github.com/FullScreenShenanigans/FullScreenMario         |


## 六、🛠️ 通用整合模式（三游戏共用）

每个游戏嵌入工作台时，遵循以下统一模式：

```html
<!-- 工作台中的游戏卡片 -->
<div class="game-card" data-game="pvz">
    <div class="game-card-icon">🌻</div>
    <div class="game-card-title">花园保卫战</div>
    <div class="game-card-desc">种植植物，抵御僵尸！</div>
    <div class="game-card-stats">
        <span>🏆 最高: <span id="pvz-high-score">0</span>关</span>
        <span>🎫 需 1 张游戏券</span>
    </div>
    <button class="game-card-btn" onclick="openGame('pvz')">
        🎮 开始游戏
    </button>
</div>

<!-- 游戏容器（全屏弹出） -->
<div id="game-container" style="display:none">
    <div id="game-iframe-container">
        <!-- 游戏内容动态加载 -->
    </div>
    <button onclick="closeGame()">✕ 返回</button>
</div>
```

```javascript
// 统一游戏管理
const GameManager = {
    games: {
        pvz: { 
            title: '花园保卫战', 
            entry: 'games/pvz/index.html',
            ticketCost: 1,
            maxPlayTime: 180  // 3分钟
        },
        mario: { /* ... */ },
        minecraft: { /* ... */ }
    },
    
    open(gameId) {
        // 1. 检查游戏券
        // 2. 显示全屏容器
        // 3. 加载游戏HTML
        // 4. 启动计时器
    },
    
    close() {
        // 1. 停止游戏
        // 2. 结算得分
        // 3. 更新积分/宠物
        // 4. 关闭容器
    }
};
```

这三个方案都是基于成熟开源项目的**轻量改造**，而非从零开发，可以在1-2周内全部完成。建议先从植物大战僵尸开始，因为它与工作台现有主题最契合，改造成本最低。