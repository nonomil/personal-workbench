基于你当前的游戏实现和对应的开源参考项目，可以从**性能、手感、内容、体验**四个维度进行优化：

---

## 一、🌻 阳光花园（塔防）优化

**参考项目：plantsvszombiesjs**（MIT协议，纯JS，轻量级塔防）

### 核心优化点

| 方向 | 问题 | 优化方案 | 参考来源 |
|------|------|---------|----------|
| **性能** | 大量对象频繁创建销毁 | **对象池**：预创建100个僵尸/子弹对象，避免频繁GC | 百度开发者中心 |
| **渲染** | 全屏重绘开销大 | **脏矩形技术**：只重绘变化区域；**分层渲染**：背景层/游戏层/UI层分离 | 百度开发者中心 |
| **帧率** | 可能掉帧 | **requestAnimationFrame + deltaTime**：统一不同设备速度 | 百度开发者中心 |
| **手感** | 点击种植延迟 | 目标：点击响应 < 80ms | CSDN |
| **内存** | 对象泄漏 | 离屏Canvas缓存静态元素（如植物卡片） | 百度开发者中心 |
| **交互** | 高频事件性能 | 鼠标移动使用 **节流(Throttle)** 和 **防抖(Debounce)** 优化 | CSDN |
| **内容** | 植物/僵尸种类少 | 参考 plantsvszombiesjs 的植物武器和僵尸波次设计 | plantsvszombiesjs |

### 具体代码方向

**对象池示例**：
```javascript
class ObjectPool {
    constructor(factory, size) {
        this.pool = [];
        for (let i = 0; i < size; i++) {
            this.pool.push(factory());
        }
    }
    acquire() { return this.pool.pop() || factory(); }
    release(obj) { this.pool.push(obj); }
}
```

**分层渲染**：背景层（静态草地/路径）→ 游戏层（植物/僵尸动态更新）→ UI层（状态栏）

**参考链接**：
- plantsvszombiesjs：`github.com/plantsvszombiesjs/plantsvszombiesjs.github.io`
- 技术详解：百度开发者中心「基于Canvas的植物大战僵尸复刻」


## 二、⛏️ 方块探险（2D沙盒）优化

**参考项目：MindCraft**（儿童友好、纯浏览器、无怪物无失败） + **KUBO Sandbox**（2D沙盒建造）

### 核心优化点

| 方向 | 问题 | 优化方案 | 参考来源 |
|------|------|---------|----------|
| **儿童友好** | 界面太硬核 | **MindCraft设计**：无怪物、无生命值、无失败——只有方块、动物、天气 | MindCraft |
| **存储** | 进度丢失 | **IndexedDB自动保存** + JSON导出/导入 | MindCraft |
| **触控** | 移动端体验差 | **虚拟摇杆**：屏幕左下角摇杆 + 右下角跳跃按钮 | MindCraft |
| **内容** | 方块种类少 | 参考 KUBO：动物系统、自然灾害、物理交互 | KUBO |
| **世界生成** | 世界单调 | **程序化生成**：山丘、湖泊、树木、花朵、雪顶 | MindCraft |
| **视觉** | 不够吸引儿童 | **三种视觉模式**：Classic / Ultra / Claude Dream（柔和梦幻世界） | MindCraft |
| **交互反馈** | 缺少趣味反馈 | 点击动物会开心跳舞 | MindCraft |

### 技术参考

**2D Minecraft 实现**：`cheyao/2d-minecraft` 使用 C++ 实现，在11年前的旧笔记本上可达 **750+ FPS**——说明2D沙盒的性能天花板很高。

**儿童友好沙盒**：`garethg85/Mini-masion-maker` 是一个拖拽式积木建造游戏，**零信号也能玩、纯离线**。

**参考链接**：
- MindCraft：`github.com/kinncj/MindCraft`
- KUBO Sandbox：`github.com/ikx337/kubo-sandbox`
- 2D Minecraft：`github.com/cheyao/2d-minecraft`


## 三、🌈 彩虹闯关（横版平台）优化

**参考项目：FullScreenMario**（HTML5复刻，含32关+随机地图+关卡编辑器） + **Discuz马里奥复刻**（手感调校三件套）

### 核心优化点

| 方向 | 问题 | 优化方案 | 参考来源 |
|------|------|---------|----------|
| **手感** | 跳跃不够跟手 | **三件套**：①土狼时间（离开平台边缘后短时间补跳仍有效）②跳跃缓冲（落地前提前按跳也能接上）③可变跳高（短按小跳、长按大跳） | Discuz马里奥 |
| **帧率** | 设备不同速度不同 | **固定60fps时间步长**：游戏逻辑按固定步长推进，不因设备快慢忽快忽慢 | Discuz马里奥 |
| **碰撞** | 碰撞判定不精确 | **AABB瓦片碰撞**：基于轴对齐包围盒与地图瓦片的碰撞判定 | Discuz马里奥 |
| **内容** | 关卡少 | **FullScreenMario**：原版32关 + 随机地图生成器 + 关卡编辑器 | FullScreenMario |
| **音效** | 缺少氛围 | **Web Audio API chiptune配乐**：标题/地下/夜晚/通关等多曲目 | Discuz马里奥 |
| **性能** | 资源加载慢 | **懒加载机制**：按需解码图片资源 | CSDN |
| **视觉** | 画面单薄 | **视差滚动背景**：多层背景滚动，增加层次感与代入感 | Discuz马里奥 |

### 具体代码方向

**手感调校三件套实现思路**：
```javascript
// 土狼时间 (Coyote Time)
let coyoteTimer = 0;
const COYOTE_TIME = 120; // 毫秒
// 离开平台后仍允许短时间跳跃

// 跳跃缓冲 (Jump Buffer)
let jumpBufferTimer = 0;
const JUMP_BUFFER = 100; // 毫秒
// 落地前提前按跳，落地后自动执行

// 可变跳高 (Variable Jump Height)
// 按住跳键跳更高，轻按跳更低
```

**参考链接**：
- FullScreenMario：`github.com/taiakindaniil/FullScreenMario`
- FullScreenMario-JSON（新版本）：`github.com/Diogenesthecynic/FullScreenMario-JSON`
- 超级猫里奥（轻量2D平台）：`github.com/HWT-hwt888/super-catrio`


## 四、📊 统一整合建议

### 性能优化通用方案

| 技术 | 适用 | 说明 |
|------|------|------|
| **requestAnimationFrame** | 三个游戏 | 替代setTimeout，保证60FPS |
| **对象池** | 花园（子弹/僵尸）| 预创建重用，避免GC |
| **脏矩形** | 花园（静态背景）| 只重绘变化区域 |
| **节流/防抖** | 三个游戏 | 优化高频事件（鼠标移动、点击） |

### 儿童游戏设计原则（参考MindCraft）

MindCraft 的设计理念非常值得借鉴：

> **“无怪物、无生命值、无失败——只有方块、动物、天气、昼夜循环。没有服务器、没有账户、没有广告、没有追踪。”**

应用到你的三个游戏：
- **花园**：失败不扣阳光（已实现✓），可增加“重新挑战”而非“游戏结束”
- **方块**：无生命值，只有建造和探索（可参考 MindCraft）
- **横版**：死亡后从最近存档点复活，不扣命（参考现代平台游戏设计）

### 儿童友好交互（参考MindCraft触控方案）

| 设备 | 控制方案 |
|------|---------|
| 桌面 | WASD/方向键 + 空格 + 鼠标 |
| 平板/手机 | 虚拟摇杆（左下）+ 跳跃按钮（右下）+ 触摸拖动视角 |

### 数据持久化统一方案

三个游戏共用 `petbank_huchuliang_preschool_workbench_state_v1`，建议统一增加：
- **自动保存**：每次操作后自动写入（参考 MindCraft 的 IndexedDB 自动保存）
- **导出/导入**：JSON 格式备份
- **保存指示器**：显示保存状态，让家长放心


## 五、📋 优化优先级建议

| 优先级 | 游戏 | 优化项 | 预期效果 |
|--------|------|--------|----------|
| **P0** | 横版 | 手感三件套（土狼时间+跳跃缓冲+可变跳高）| 跳跃手感提升最明显 |
| **P0** | 花园 | 对象池 + 脏矩形 | 性能提升，减少卡顿 |
| **P1** | 方块 | IndexedDB自动保存 | 进度不丢失 |
| **P1** | 三个游戏 | 触控虚拟摇杆 | 平板/手机可玩 |
| **P2** | 方块 | 程序化世界生成 + 更多方块类型 | 内容更丰富 |
| **P2** | 横版 | 关卡编辑器 / 随机地图生成 | 可玩性大幅提升 |
| **P3** | 花园 | 更多植物/僵尸种类 | 策略深度增加 |
| **P3** | 横版 | Web Audio API chiptune配乐 | 沉浸感提升 |


# 三个游戏世界 · 深度优化与合入方案

> 目标：将三个独立游戏页**无缝合入工作台**，建立**长期成长闭环**，**美术全面升级**


## 一、合入工作台：完整改造方案

### 1.1 当前架构 vs 目标架构

| 维度 | 当前 | 目标 |
|------|------|------|
| 入口 | 根入口三张卡 → 独立游戏页 | 工作台内「游戏世界」Tab → 三个游戏卡片 → 独立游戏页（全屏打开） |
| 数据桥接 | `workbench-bridge.js` 单向写入 | 双向同步：游戏进度 ↔ 工作台总账本 ↔ 宠物/徽章 |
| 返回体验 | 浏览器返回 | 游戏内「返回工作台」按钮 + 自动保存 |
| 账号体系 | 无 | 沿用 `petbank_huchuliang_preschool_workbench_state_v1` |

### 1.2 代码改造：工作台入口

**修改文件**：`prj/preschool-workbench/index.html` 或对应的游戏世界 Tab

```html
<!-- 游戏世界 Tab 中的三个卡片 -->
<div class="game-world-grid">
  <!-- 卡片1：阳光花园 -->
  <div class="game-card" data-game="garden">
    <div class="game-card-icon">🌻</div>
    <div class="game-card-title">阳光花园</div>
    <div class="game-card-status">
      <span>🏆 通关: <span id="garden-progress">0/12</span></span>
      <span>⭐ 今日阳光: <span id="garden-today-sun">0</span>/80</span>
    </div>
    <button class="game-card-btn" onclick="openGame('garden')">🌱 进入花园</button>
  </div>
  <!-- 卡片2：方块探险 -->
  <div class="game-card" data-game="voxel">
    <div class="game-card-icon">⛏️</div>
    <div class="game-card-title">方块探险</div>
    <div class="game-card-status">
      <span>🏆 等级: Lv.<span id="voxel-level">1</span></span>
      <span>📦 任务: <span id="voxel-tasks">0</span>/12</span>
    </div>
    <button class="game-card-btn" onclick="openGame('voxel')">⛏️ 进入世界</button>
  </div>
  <!-- 卡片3：彩虹闯关 -->
  <div class="game-card" data-game="platform">
    <div class="game-card-icon">🌈</div>
    <div class="game-card-title">彩虹闯关</div>
    <div class="game-card-status">
      <span>🏆 关卡: <span id="platform-progress">0</span>/10</span>
      <span>⭐ 最佳: <span id="platform-best">--</span></span>
    </div>
    <button class="game-card-btn" onclick="openGame('platform')">🏃 开始闯关</button>
  </div>
</div>
```

**游戏打开函数**：
```javascript
function openGame(gameId) {
  // 1. 保存当前工作台状态
  saveWorkbenchState();
  
  // 2. 全屏遮罩 + 加载游戏 iframe
  const overlay = document.createElement('div');
  overlay.id = 'game-overlay';
  overlay.innerHTML = `
    <div class="game-header">
      <button onclick="closeGame()">← 返回工作台</button>
      <span id="game-save-status">已保存</span>
    </div>
    <iframe src="/prj/games/${gameId}/index.html" id="game-iframe"></iframe>
  `;
  document.body.appendChild(overlay);
  
  // 3. 监听游戏消息（postMessage 通信）
  window.addEventListener('message', handleGameMessage);
}
```

### 1.3 双向通信协议

```javascript
// workbench-bridge.js 增强版
const GameBridge = {
  // 工作台 → 游戏：初始化数据
  sendInit(gameId) {
    const state = loadWorkbenchState();
    const gameData = {
      sunBalance: state.sunBalance || 0,
      day: state.day || 1,
      gameProgress: state.games?.[gameId] || {},
      petStage: state.pet?.stage || 0
    };
    postToGame(gameId, { type: 'INIT', data: gameData });
  },
  
  // 游戏 → 工作台：进度更新
  receiveProgress(gameId, data) {
    const state = loadWorkbenchState();
    // 更新游戏进度
    if (!state.games) state.games = {};
    state.games[gameId] = data.progress;
    
    // 更新阳光（每日上限80）
    const today = new Date().toDateString();
    if (state.sunDaily?.[today] || 0 < 80) {
      const earned = Math.min(data.sunEarned, 80 - (state.sunDaily?.[today] || 0));
      state.sunBalance += earned;
      state.sunDaily[today] = (state.sunDaily?.[today] || 0) + earned;
    }
    
    // 更新宠物经验
    if (data.expGained) {
      state.pet.exp += data.expGained;
      checkPetEvolution(state.pet);
    }
    
    // 更新徽章
    checkBadges(state);
    
    saveWorkbenchState(state);
    updateWorkbenchUI(state);
  }
};
```

### 1.4 游戏内返回按钮

在每个游戏的 `index.html` 中添加：

```html
<!-- 游戏内返回按钮（固定在左上角） -->
<div id="game-back-btn" onclick="exitGame()">
  ← 返回
</div>

<script>
function exitGame() {
  // 1. 保存游戏进度到 localStorage
  saveGameProgress();
  
  // 2. 通过 postMessage 通知父页面
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'GAME_EXIT',
      gameId: 'garden',
      progress: getGameProgress()
    }, '*');
  }
  
  // 3. 关闭自己（如果是在 iframe 中）
  window.parent.document.getElementById('game-overlay')?.remove();
}
</script>
```


## 二、长期成长体系：三游戏 × 五维度

> 参考宝贝成长计划的“三心两力”模型和游戏化研究中的等级/勋章机制

### 2.1 五个成长维度

| 维度 | 对应游戏 | 衡量指标 | 长期目标 |
|------|---------|---------|----------|
| **🌱 生命** | 阳光花园 | 通关数 + 植物收集 | 12关全通 + 全植物解锁 |
| **⛏️ 创造** | 方块探险 | 建造任务 + 矿工等级 | 12任务完成 + Lv.5 |
| **🏃 勇气** | 彩虹闯关 | 通关数 + 最佳时间 | 10关全通 + 全星 |
| **📚 智慧** | 学习模块 | 识字/英语/数学进度 | 各科达标 |
| **❤️ 爱心** | 宠物养成 | 宠物阶段 + 喂食次数 | 宠物进化 |

### 2.2 等级系统（1-50级）

```javascript
const LEVEL_SYSTEM = {
  // 每级所需经验 = 基础值 × 1.1^等级
  getExpForLevel(level) {
    return Math.floor(50 * Math.pow(1.1, level - 1));
  },
  
  // 经验来源
  getExpSources() {
    return {
      '花园通关1关': 20,
      '方块完成1任务': 25,
      '横版通关1关': 30,
      '识字完成1天': 15,
      '英语完成1天': 15,
      '宠物喂食1次': 5,
      '每日全勤': 50
    };
  },
  
  // 等级奖励
  getLevelReward(level) {
    const rewards = {
      5: { badge: '🌱 小芽', unlock: '花园新植物' },
      10: { badge: '🌿 绿苗', unlock: '方块新工具' },
      20: { badge: '🌻 花蕾', unlock: '横版新关卡' },
      30: { badge: '🌸 花开', unlock: '宠物进化' },
      50: { badge: '🏆 大师', unlock: '全部内容' }
    };
    return rewards[level] || null;
  }
};
```

### 2.3 三游戏联动机制

| 联动 | 触发条件 | 效果 |
|------|---------|------|
| 花园 → 方块 | 花园通关第6关 | 方块解锁「花园砖块」皮肤 |
| 方块 → 横版 | 方块Lv.3 | 横版解锁「矿工帽」角色皮肤 |
| 横版 → 花园 | 横版通关第5关 | 花园解锁「彩虹豌豆」植物 |
| 三游戏全通 | 全部完成 | 解锁「🌟 三界勇者」终极徽章 |

### 2.4 每日挑战系统

```javascript
const DailyChallenges = {
  generate(day) {
    return [
      { game: 'garden', task: '通关2关', reward: 20 },
      { game: 'voxel', task: '完成3个建造任务', reward: 25 },
      { game: 'platform', task: '收集50个金币', reward: 15 },
      { game: 'learning', task: '完成今日学习任务', reward: 30 }
    ];
  },
  
  // 连续完成奖励
  getStreakBonus(days) {
    if (days >= 30) return { badge: '👑 月度之星', bonus: 100 };
    if (days >= 14) return { badge: '⭐ 半月坚持', bonus: 50 };
    if (days >= 7) return { badge: '🔥 一周达人', bonus: 30 };
    return null;
  }
};
```


## 三、美术全面升级方案

### 3.1 当前问题诊断

| 问题 | 表现 | 影响 |
|------|------|------|
| 风格不统一 | 花园偏绿、方块像素、横版卡通，三游戏风格割裂 | 缺乏“同一个世界”的沉浸感 |
| 细节粗糙 | 植物/角色为简单几何+纯色填充 | 不够吸引儿童，缺乏“可爱感” |
| 动画缺失 | 角色静态，缺少呼吸/待机动画 | 游戏世界“死气沉沉” |
| UI简陋 | 按钮/卡片无装饰，纯文本 | 缺少“游戏感” |

### 3.2 统一美术风格：扁平卡通（Flat Vector）

根据调研，扁平卡通风格（Vector/Flat）是**最适合儿童游戏**的风格：**制作速度快、成本低、易于适配移动端**。

**核心特征**：
- **无渐变、无描边**：纯色填充，干净利落
- **圆润轮廓**：线条圆润简洁，无尖锐棱角
- **明亮柔和**：色彩明快柔和，饱和度适中
- **极简细节**：用抽象形状传达信息，避免繁杂

### 3.3 三游戏色彩体系

| 游戏 | 主色 | 辅色 | 背景色 | 情绪 |
|------|------|------|--------|------|
| 阳光花园 | #4CAF50 绿 | #FFD700 金 | #E8F5E9 淡绿 | 生机、成长 |
| 方块探险 | #42A5F5 蓝 | #FFA726 橙 | #E3F2FD 淡蓝 | 探索、创造 |
| 彩虹闯关 | #EC407A 粉 | #FFD54F 黄 | #FCE4EC 淡粉 | 活力、挑战 |

### 3.4 角色美术升级（以阳光花园为例）

**当前（简单几何）** ：
```
豌豆射手 = 绿色圆形 + 绿色矩形管
向日葵 = 黄色圆形 + 棕色中心点
```

**升级后（扁平卡通风格）** ：
```
豌豆射手 =
  - 深绿色茎（带弧度，非直线）
  - 亮绿色圆头（径向渐变模拟立体感）
  - 白色大眼睛（带黑色瞳孔 + 白色高光点）
  - 微笑弧线嘴巴
  - 绿色管状炮口（稍倾斜，有动态感）
  - 两片叶子（对称，带浅绿色叶脉线）
  - 粉色小腮红（圆形半透明）
```

**SVG 实现示例**：
```svg
<svg viewBox="0 0 200 200">
  <!-- 茎 -->
  <path d="M90 180 Q95 140 100 120" stroke="#2E7D32" stroke-width="8" fill="none"/>
  <!-- 身体（径向渐变模拟立体感） -->
  <radialGradient id="bodyGrad" cx="40%" cy="35%">
    <stop offset="0%" stop-color="#66BB6A"/>
    <stop offset="100%" stop-color="#388E3C"/>
  </radialGradient>
  <circle cx="100" cy="80" r="45" fill="url(#bodyGrad)"/>
  <!-- 眼睛 -->
  <circle cx="85" cy="70" r="12" fill="white"/>
  <circle cx="115" cy="70" r="12" fill="white"/>
  <circle cx="88" cy="70" r="6" fill="#1A237E"/>
  <circle cx="118" cy="70" r="6" fill="#1A237E"/>
  <circle cx="90" cy="68" r="2.5" fill="white"/>
  <circle cx="120" cy="68" r="2.5" fill="white"/>
  <!-- 嘴巴 -->
  <path d="M92 88 Q100 96 108 88" stroke="#1A237E" stroke-width="2.5" fill="none"/>
  <!-- 炮口 -->
  <rect x="135" y="65" width="30" height="20" rx="4" fill="#43A047"/>
  <!-- 腮红 -->
  <circle cx="75" cy="85" r="7" fill="#FF8A80" opacity="0.5"/>
  <circle cx="125" cy="85" r="7" fill="#FF8A80" opacity="0.5"/>
</svg>
```

### 3.5 开源美术资源（可直接使用）

| 资源 | 内容 | 协议 | 链接 |
|------|------|------|------|
| **SpriteCook Free Game Assets** | 像素角色、图标、道具 | CC0 | github.com/cellinlab/spritecook-free-game-assets |
| **PixelDa** | AI生成像素美术 | 开源 | github.com/dada-x/pixelda |
| **BabyBeast** | 可爱动物角色设计（圆润、柔和、极简） | 参考风格 | ByteBeasts |
| **扁平卡通插画** | 儿童游戏场景、角色 | 参考风格 | StockCake |

### 3.6 动画增强

| 动画 | 实现方式 | 效果 |
|------|---------|------|
| 呼吸动画 | CSS `@keyframes scale` | 角色轻轻起伏，仿佛活着 |
| 摇摆动画 | CSS `@keyframes rotate` | 植物随风轻摇 |
| 跳跃动画 | CSS `@keyframes bounce` | 角色跳跃落地有弹性 |
| 行走动画 | CSS `@keyframes translateX` + 角色替换 | 横版角色跑步 |
| 庆祝动画 | Canvas 粒子 + CSS 关键帧 | 通关时撒花/星星爆炸 |

**CSS 动画模板**：
```css
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}

@keyframes sway {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.character-garden {
  animation: breathe 2s ease-in-out infinite, sway 3s ease-in-out infinite;
}

.character-platform {
  animation: bounce 1.5s ease-in-out infinite;
}
```


## 四、实施路线图

### Phase 1：合入工作台（1-2天）

| 任务 | 文件 | 说明 |
|------|------|------|
| 工作台游戏卡片 | `index.html` | 三游戏卡片 + 进度展示 |
| 游戏打开/关闭 | `game-bridge.js` | iframe加载 + 返回逻辑 |
| 双向通信 | `workbench-bridge.js` | postMessage 协议 |
| 状态同步 | 各游戏 `index.html` | 发送进度到父页面 |

### Phase 2：长期成长体系（3-5天）

| 任务 | 说明 |
|------|------|
| 等级系统 | 1-50级，经验值计算 |
| 三游戏联动 | 跨游戏解锁条件 |
| 每日挑战 | 每日随机任务 + 连续奖励 |
| 徽章系统 | 里程碑徽章（参考已有徽章墙）|

### Phase 3：美术升级（5-7天）

| 任务 | 说明 | 工具 |
|------|------|------|
| 角色重绘 | 三游戏所有角色 SVG 重绘 | 手动 + Grok Imagine |
| UI美化 | 按钮/卡片/进度条统一风格 | CSS |
| 动画添加 | 呼吸/摇摆/跳跃/庆祝动画 | CSS + Canvas |
| 背景优化 | 视差滚动、动态天空 | CSS + Canvas |

### Phase 4：打磨与测试（2-3天）

| 任务 | 说明 |
|------|------|
| 触控优化 | 虚拟摇杆、大按钮 |
| 性能优化 | 对象池、脏矩形 |
| 儿童测试 | 5-7岁孩子试玩反馈 |


## 五、关键代码：三游戏统一桥接

```javascript
// prj/games/shared/game-bridge.js（三个游戏共用）
const GameBridge = {
  // 游戏ID：'garden' | 'voxel' | 'platform'
  gameId: null,
  
  init(gameId) {
    this.gameId = gameId;
    this.loadProgress();
    this.setupBackButton();
    this.setupMessageListener();
  },
  
  loadProgress() {
    // 从 localStorage 读取进度
    const state = JSON.parse(localStorage.getItem(
      'petbank_huchuliang_preschool_workbench_state_v1'
    ) || '{}');
    this.progress = state.games?.[this.gameId] || this.getDefaultProgress();
    return this.progress;
  },
  
  saveProgress(data) {
    // 保存到 localStorage + 通知父页面
    const state = JSON.parse(localStorage.getItem(
      'petbank_huchuliang_preschool_workbench_state_v1'
    ) || '{}');
    if (!state.games) state.games = {};
    state.games[this.gameId] = { ...this.progress, ...data };
    localStorage.setItem(
      'petbank_huchuliang_preschool_workbench_state_v1',
      JSON.stringify(state)
    );
    
    // 通知父页面
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'GAME_PROGRESS',
        gameId: this.gameId,
        progress: state.games[this.gameId],
        sunEarned: data.sunEarned || 0,
        expGained: data.expGained || 0
      }, '*');
    }
  },
  
  setupBackButton() {
    const btn = document.getElementById('game-back-btn');
    if (btn) {
      btn.addEventListener('click', () => this.exitGame());
    }
  },
  
  exitGame() {
    this.saveProgress({ lastPlayed: Date.now() });
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'GAME_EXIT',
        gameId: this.gameId
      }, '*');
    }
    window.parent.document.getElementById('game-overlay')?.remove();
  },
  
  setupMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'GAME_INIT') {
        // 父页面发送初始化数据
        this.applyInitData(event.data.data);
      }
    });
  },
  
  getDefaultProgress() {
    const defaults = {
      garden: { stage: 0, sunToday: 0, plants: [] },
      voxel: { level: 1, tasks: [], inventory: {} },
      platform: { stage: 0, bestTime: null, stars: 0 }
    };
    return defaults[this.gameId] || {};
  }
};
```


## 六、总结

| 维度 | 当前状态 | 优化后 |
|------|---------|--------|
| **合入** | 独立游戏页，需浏览器返回 | 工作台内全屏打开，一键返回，进度自动同步 |
| **成长** | 各自记录，互不联动 | 五维度成长体系，三游戏+学习+宠物全面联动 |
| **美术** | 简单几何，风格不统一 | 统一扁平卡通风格，角色精致，有动画 |
| **长期** | 12/12/10关，通关即结束 | 等级1-50、每日挑战、连续奖励、跨游戏解锁 |

**一句话**：三个游戏从“独立小游戏”升级为“同一世界的三个成长维度”，孩子通关后仍有等级、挑战、联动内容可以持续玩下去。



