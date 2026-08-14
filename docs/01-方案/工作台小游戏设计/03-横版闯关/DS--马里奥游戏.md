好的，结合你“彩虹闯关”已有的 10 关底子，下面是用开源项目给它“加料”的完整方案。

---

## 一、候选项目对比

| 项目 | 技术栈 | 关卡 | 手感特性 | 编辑器 | 合入难度 |
|------|--------|------|----------|--------|----------|
| **mahmodnasser/mario** | 纯JS+Canvas | 单关演示 | ✅ 变跳高/奔跑/无敌帧 | ❌ | ⭐⭐ |
| **sugidaffection/js-supermariobros** | JS+Vite | 多关 | ✅ ECS架构/响应式 | ❌ | ⭐⭐⭐ |
| **iam-veeramalla/super-mario-mimic** | TypeScript+Vite | 多关 | ✅ 完整物理/音效 | ❌ | ⭐⭐⭐ |
| **FullScreenMario** | TypeScript+Grunt | 32关 | ✅ 完整 | ✅ 随机/编辑器 | ⭐⭐⭐⭐ |
| **HWT-hwt888/super-catrio** | 纯HTML+JS | 多关 | ✅ **二段跳** | ❌ | ⭐ |

---

## 二、推荐方案

### 🥇 首选：mahmodnasser/mario

**项目地址**：`github.com/mahmodnasser/mario`

**为什么选它**：

| 优势 | 说明 |
|------|------|
| **单HTML文件** | 所有代码在 `index.html` + `game.js` + `style.css`，与你工作台风格一致 |
| **手感完整** | 变跳高（按住跳更高）、奔跑（Shift加速）、无敌帧、精确碰撞 |
| **纯Canvas渲染** | 像素风图形全部用 Canvas API 绘制，无外部图片依赖 |
| **MIT协议** | 可商用修改，无法律风险 |
| **无外部依赖** | 纯 Vanilla JS，开箱即用 |

**缺点**：
- 只有单关演示，需要自己扩展关卡
- 无触控支持，需自己加

### 🥈 备选：super-catrio（超级猫里奥）

**项目地址**：`github.com/HWT-hwt888/super-catrio`

**为什么选它**：

| 优势 | 说明 |
|------|------|
| **纯HTML+JS** | 单入口，直接打开 `index.html` 即可运行 |
| **二段跳** | 原生支持二段跳，儿童友好 |
| **完整关卡** | 有多关、敌人、收集品、终点通关 |
| **有音效** | 自带背景音乐和音效 |

**缺点**：
- 美术资源是外部图片（需要替换或保留）
- 协议未明确（个人学习项目，非商用）

---

## 三、详细合入方案（以 mahmodnasser/mario 为例）

### 3.1 第一步：提取核心代码

**项目结构**：
```
mario/
├── index.html   # 主页面
├── style.css    # UI样式
└── game.js      # 完整游戏引擎（核心）
```

**提取策略**：将 `game.js` 中的游戏引擎封装为可调用的类，方便嵌入工作台。

```javascript
// 封装后的游戏入口
class MarioGame {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      level: options.level || 1,
      maxLives: options.maxLives || 5,      // 儿童友好：更多命
      invincibleTime: options.invincibleTime || 3000,
      ...options
    };
    this.game = null;
  }
  
  start() {
    // 初始化 game.js 中的游戏引擎
    this.game = new Game(this.container, this.options);
    this.game.init();
    this.game.start();
  }
  
  pause() { this.game?.pause(); }
  resume() { this.game?.resume(); }
  exit() { 
    const state = this.game?.getState();
    this.game?.destroy();
    return state; // 返回进度用于写入账本
  }
}
```

### 3.2 第二步：精简与儿童友好化

| 改造项 | 原版 | 儿童版 |
|--------|------|--------|
| 初始生命 | 3条 | **5条**（更宽容） |
| 无敌帧 | 有 | **延长至3秒** |
| 敌人 | Goomba/Koopa | 保留，但**速度降低30%** |
| 死亡惩罚 | 掉落即死 | **从最近检查点复活** |
| 触控 | 无 | **增加虚拟摇杆+跳跃按钮** |

**触控支持示例**：
```html
<!-- 在游戏中叠加触控按钮 -->
<div id="touch-controls">
  <button id="btn-left">◀</button>
  <button id="btn-right">▶</button>
  <button id="btn-jump">⬆</button>
  <button id="btn-run">🏃</button>
</div>
```

```css
#touch-controls {
  position: fixed;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 100;
  pointer-events: none; /* 让点击穿透，但按钮本身可点 */
}
#touch-controls button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  font-size: 28px;
  background: rgba(255,255,255,0.3);
  backdrop-filter: blur(4px);
  border: 2px solid rgba(255,255,255,0.5);
  pointer-events: auto;
  touch-action: none;
}
```

### 3.3 第三步：关卡扩展（从1关→10关）

参考 FullScreenMario 的关卡数据结构，设计10关地图：

```javascript
// 关卡数据（参考 FullScreenMario 的 JSON 格式）
const LEVELS = [
  { id: 1, name: '草地平原', enemies: 3, coins: 10, platforms: [...] },
  { id: 2, name: '蘑菇森林', enemies: 4, coins: 12, platforms: [...] },
  // ... 共10关
];

// 每关难度递增
function getLevelConfig(level) {
  return {
    enemySpeed: 0.8 + level * 0.15,  // 敌人越来越快
    coinCount: 8 + level * 2,         // 金币越来越多
    platforms: generatePlatforms(level),
    hasGaps: level > 3,               // 第4关开始有坑
    hasMovingPlatforms: level > 6,    // 第7关开始有移动平台
  };
}
```

### 3.4 第四步：接入工作台账本

```javascript
// 与工作台共用同一账本
const WORKBENCH_KEY = 'petbank_huchuliang_preschool_workbench_state_v1';

function loadWorkbenchState() {
  try {
    return JSON.parse(localStorage.getItem(WORKBENCH_KEY) || '{}');
  } catch { return {}; }
}

function saveWorkbenchState(state) {
  localStorage.setItem(WORKBENCH_KEY, JSON.stringify(state));
}

// 通关时写入
function onLevelComplete(level, stars, time) {
  const state = loadWorkbenchState();
  if (!state.games) state.games = {};
  if (!state.games.mario) state.games.mario = { levels: {}, bestTime: {} };
  
  // 记录通关
  state.games.mario.levels[level] = { 
    completed: true, 
    stars: stars, 
    time: time,
    completedAt: Date.now()
  };
  
  // 更新最佳时间
  if (!state.games.mario.bestTime[level] || time < state.games.mario.bestTime[level]) {
    state.games.mario.bestTime[level] = time;
  }
  
  // 阳光（每日上限80）
  const today = new Date().toDateString();
  state.sunDaily = state.sunDaily || {};
  const todaySun = state.sunDaily[today] || 0;
  const sunEarned = Math.min(10 + level * 2, 30); // 越往后阳光越多
  const canEarn = Math.min(sunEarned, 80 - todaySun);
  if (canEarn > 0) {
    state.sunBalance = (state.sunBalance || 0) + canEarn;
    state.sunDaily[today] = todaySun + canEarn;
  }
  
  saveWorkbenchState(state);
}
```

### 3.5 第五步：游戏内返回工作台

```html
<!-- 在游戏界面叠加返回按钮 -->
<div id="game-header" style="position:fixed;top:10px;left:10px;z-index:9999;">
  <button onclick="exitToWorkbench()" style="
    padding:12px 20px;
    font-size:18px;
    border-radius:12px;
    background:#EC407A;
    color:white;
    border:none;
    box-shadow:0 4px 12px rgba(0,0,0,0.3);
    font-weight:bold;
  ">
    ← 返回工作台
  </button>
  <span id="game-save-status" style="color:white;margin-left:12px;font-size:14px;">✓ 已保存</span>
</div>

<script>
function exitToWorkbench() {
  // 1. 保存当前进度
  const state = getGameState();
  if (state) onLevelComplete(state.level, state.stars, state.time);
  
  // 2. 通知父页面
  if (window.parent !== window) {
    window.parent.postMessage({ 
      type: 'GAME_EXIT', 
      gameId: 'mario',
      progress: state 
    }, '*');
  }
  
  // 3. 关闭游戏
  window.parent.document.getElementById('game-overlay')?.remove();
}
</script>
```

### 3.6 第六步：接入工作台入口

```html
<!-- 工作台游戏世界Tab中的卡片 -->
<div class="game-card" data-game="mario">
  <div class="game-card-icon">🌈</div>
  <div class="game-card-title">彩虹闯关</div>
  <div class="game-card-status">
    <span>🏆 通关: <span id="mario-progress">0</span>/10</span>
    <span>⭐ 星星: <span id="mario-stars">0</span></span>
  </div>
  <button class="game-card-btn" onclick="openGame('mario')">🏃 开始闯关</button>
</div>
```

---

## 四、备选方案：如果 mahmodnasser/mario 单关不够用

如果觉得单关扩展工作量大，可以考虑以下组合方案：

| 组件 | 来源 | 用途 |
|------|------|------|
| 游戏引擎 | mahmodnasser/mario | 物理/碰撞/渲染 |
| 关卡数据 | FullScreenMario JSON 格式 | 多关地图数据 |
| 触控支持 | 自己写 | 虚拟摇杆 |
| 音效 | Web Audio API 合成 | 跳跃/踩怪/收集音效 |

---

## 五、实施路线图

| 阶段 | 任务 | 预估时间 |
|------|------|----------|
| **Day 1** | 下载 mahmodnasser/mario，跑通本地，理解代码结构 | 2-3小时 |
| **Day 2** | 封装游戏引擎为可调用类 + 增加触控支持 | 3-4小时 |
| **Day 3** | 关卡扩展（1关→10关），难度递增 | 3-4小时 |
| **Day 4** | 接入工作台账本 + 返回按钮 | 2-3小时 |
| **Day 5** | 测试 + 修复bug + 真机验收 | 2-3小时 |
| **合计** | | **约5天** |

---

## 六、总结

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **mahmodnasser/mario** | 单HTML、手感完整、MIT协议 | 单关需扩展 | ⭐⭐⭐⭐ |
| **super-catrio** | 二段跳、完整关卡、有音效 | 非商用限制、外部图片依赖 | ⭐⭐⭐ |
| **FullScreenMario** | 32关、编辑器、随机地图 | 体量大、需构建工具 | ⭐⭐ |

**建议**：先用 **mahmodnasser/mario** 做基础引擎（手感最好），参考 **FullScreenMario** 的关卡数据结构扩展10关，参考 **super-catrio** 的二段跳实现。这样既有完整手感，又有足够关卡，还保持了单HTML的轻量优势。

需要我先把 mahmodnasser/mario 的核心代码抽出来，做成可直接嵌入工作台的独立模块吗？