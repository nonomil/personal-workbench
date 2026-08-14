结合你的需求，帮你筛了一遍。目前最符合要求、也最能直接用的，是 **CraftMine**，**KUBO Sandbox** 是备选。下面是具体分析和合入方案。

---

## 一、候选项目对比

| 项目 | 技术栈 | 玩法模式 | 工具栏/背包 | 挖掘/放置 | 敌人 | 横版过关 | 合入难度 |
|------|--------|----------|-------------|-----------|------|----------|----------|
| **CraftMine** | 单HTML文件 | 3D体素 | ✅ 46种方块 + 19种武器 | ✅ | ✅ 36种生物 | ❌ | ⭐⭐ |
| **KUBO Sandbox** | HTML5/Canvas | 2D横版沙盒 | ✅ 热键栏 | ✅ | ✅ 动物（非敌对） | ❌ | ⭐⭐⭐ |
| **cheyao/2d-minecraft** | C++/SDL3 | 2D俯视角 | ✅ 完整背包/合成 | ✅ | ✅ | ❌ | ⭐⭐⭐⭐⭐ |
| **nadiahosisy/minecraft-2d** | Vanilla JS | 2D俯视角 | ❌ | ✅ | ❌ | ❌ | ⭐⭐ |
| **PaisWillie/Minecraft-2D** | Turing语言 | 2D横版 | ✅ 1-9切换方块 | ✅ | ❌ | ❌ | ⭐⭐⭐⭐⭐ |
| **little-game-MC** | HTML5 Canvas | 2D俯视角 | ❌ | ❌ | ✅ 追蹤怪兽 | ❌ | ⭐⭐ |

---

## 二、推荐方案

### 🥇 首选：CraftMine（最接近“完整游戏”）

**项目地址**：`github.com/will-davisgwza1735/craftmine-voxel-game`

**在线试玩**：`will-davisgwza1735.github.io/craftmine-voxel-game/`

**为什么选它**：
- **单HTML文件**：开箱即用，与你现有工作台的“单页应用”风格一致
- **内容完整**：包含**46种方块、36种生物、19种武器**，游戏内容丰富
- **支持多人**：可联机，未来扩展空间大
- **纯浏览器运行**：无需安装任何东西

**缺点**：
- 它是3D体素（Voxel）风格，不是2D横版
- 功能太多，合入工作台需要大幅精简

**合入策略**：

```
┌─────────────────────────────────────────────────────────────┐
│  CraftMine → 工作台合入路线                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  第一步：提取核心                                           │
│  ├── 保留：区块系统 + 背包栏 + 挖掘/放置 + 基础敌人        │
│  └── 裁剪：多人模式、46种方块→精简到8种、36种生物→3-4种    │
│                                                             │
│  第二步：适配工作台                                         │
│  ├── 接入 petbank_huchuliang_preschool_workbench_state_v1  │
│  ├── 游戏内加「返回工作台」按钮                            │
│  └── 通关阳光写入同一账本（每日上限80）                    │
│                                                             │
│  第三步：儿童友好化                                         │
│  ├── 方块种类精简到儿童易理解的8种（草/土/石/木/沙/水/煤/金）│
│  ├── 敌人改成“可躲避”而非“可击杀”（降低难度）            │
│  └── 界面大按钮 + 触控支持                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🥈 备选：KUBO Sandbox（2D横版沙盒）

**项目地址**：`github.com/ikx337/kubo-sandbox`

**在线试玩**：`ikx337.github.io/kubo-sandbox/`

**为什么选它**：
- **2D横版**，视觉风格接近你想要的“横版过关”
- **有工具栏**：热键栏选择方块
- **有物理交互**：水、熔岩、爆炸物、生存机制
- **纯HTML5/Canvas**：技术栈匹配

**缺点**：
- 没有敌人（只有动物，非敌对）
- 没有明确的“过关”目标，是纯沙盒
- 需要自己加敌人和关卡系统

**合入策略**：

```
┌─────────────────────────────────────────────────────────────┐
│  KUBO → 工作台合入路线                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  第一步：保留核心                                           │
│  ├── 2D横版渲染引擎 + 物理引擎                            │
│  ├── 热键栏方块选择                                        │
│  └── 挖掘/放置系统                                         │
│                                                             │
│  第二步：新增（从其他项目移植）                             │
│  ├── 敌人系统 → 从 little-game-MC 移植追踪AI              │
│  ├── 关卡系统 → 预设10关地图                              │
│  └── 过关条件 → 收集指定数量矿石 + 到达出口               │
│                                                             │
│  第三步：适配工作台                                         │
│  └── 接入统一账本                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、详细合入方案（以CraftMine为例）

### 3.1 第一步：精简内容

**方块类型（46种 → 8种）** ：

| 保留 | 儿童友好说明 |
|------|-------------|
| 草地 | 绿色，可以种东西 |
| 泥土 | 棕色，最基础的方块 |
| 石头 | 灰色，比较硬 |
| 木头 | 棕色带纹路，可以做工具 |
| 沙子 | 黄色，会掉落 |
| 水 | 蓝色，可以游泳 |
| 煤矿 | 黑色带白点，可以烧 |
| 金矿 | 金色，很珍贵 |

**生物（36种 → 4种）** ：

| 保留 | 行为 | 儿童友好处理 |
|------|------|-------------|
| 牛 | 中立，不攻击 | 保留 |
| 羊 | 中立，不攻击 | 保留 |
| 僵尸 | 敌对，缓慢追踪 | 改成“可躲避”，碰到不会死，只扣1格血 |
| 骷髅 | 敌对，远程攻击 | 改成“可躲避”，射出的箭很慢 |

**武器（19种 → 3种）** ：

| 保留 | 用途 |
|------|------|
| 木镐 | 挖泥土/沙子 |
| 石镐 | 挖石头/煤矿 |
| 铁镐 | 挖金矿 |

### 3.2 第二步：接入工作台账本

```javascript
// 在 CraftMine 中接入工作台账本
const WORKBENCH_KEY = 'petbank_huchuliang_preschool_workbench_state_v1';

function loadWorkbenchState() {
  try {
    return JSON.parse(localStorage.getItem(WORKBENCH_KEY) || '{}');
  } catch { return {}; }
}

function saveWorkbenchState(state) {
  localStorage.setItem(WORKBENCH_KEY, JSON.stringify(state));
}

// 通关时写入阳光
function onLevelComplete(level, sunEarned) {
  const state = loadWorkbenchState();
  if (!state.games) state.games = {};
  if (!state.games.craftmine) state.games.craftmine = {};
  
  state.games.craftmine.levelsCompleted = state.games.craftmine.levelsCompleted || [];
  if (!state.games.craftmine.levelsCompleted.includes(level)) {
    state.games.craftmine.levelsCompleted.push(level);
  }
  
  // 阳光（每日上限80）
  const today = new Date().toDateString();
  state.sunDaily = state.sunDaily || {};
  const todaySun = state.sunDaily[today] || 0;
  const canEarn = Math.min(sunEarned, 80 - todaySun);
  if (canEarn > 0) {
    state.sunBalance = (state.sunBalance || 0) + canEarn;
    state.sunDaily[today] = todaySun + canEarn;
  }
  
  saveWorkbenchState(state);
}
```

### 3.3 第三步：儿童友好化改造

**UI改造**：
- 所有按钮 ≥ 52px（适合儿童手指）
- 热键栏从数字键改成**点击选择**（触控支持）
- 添加**屏幕虚拟摇杆**（左下移动 + 右下跳跃/挖掘）

**难度改造**：
- 敌人速度降低50%
- 初始生命值从10 → 20（更宽容）
- 死亡后从最近检查点复活，不丢失道具

### 3.4 第四步：游戏内返回工作台

```html
<!-- 在 CraftMine HTML 中添加返回按钮 -->
<div id="game-header" style="position:fixed;top:10px;left:10px;z-index:9999;">
  <button onclick="exitToWorkbench()" style="
    padding:12px 20px;
    font-size:18px;
    border-radius:12px;
    background:#4CAF50;
    color:white;
    border:none;
    box-shadow:0 4px 12px rgba(0,0,0,0.3);
  ">
    ← 返回工作台
  </button>
  <span id="game-save-status" style="color:white;margin-left:12px;">已保存</span>
</div>

<script>
function exitToWorkbench() {
  // 保存当前进度
  saveGameProgress();
  // 通知父页面（如果在iframe中）
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EXIT', gameId: 'craftmine' }, '*');
  }
  // 关闭自己
  window.close();
}
</script>
```

---

## 四、备选方案：如果CraftMine太重

如果CraftMine的3D体素引擎合入困难，可以考虑**组合方案**：

| 组件 | 来源 | 用途 |
|------|------|------|
| 2D横版引擎 | KUBO Sandbox | 提供横版渲染 + 物理 + 方块系统 |
| 敌人AI | little-game-MC | 移植追踪逻辑 |
| 关卡系统 | 自己写 | 10关预设地图，每关目标不同 |
| 工具栏 | KUBO已有 | 热键栏选择方块 |

这样拼装的工作量约3-5天，比直接改造CraftMine更可控。

---

## 五、实施路线图

| 阶段 | 任务 | 预估时间 |
|------|------|----------|
| **Day 1** | 下载CraftMine，跑通本地，理解代码结构 | 2-3小时 |
| **Day 2** | 精简方块(46→8)、生物(36→4)、武器(19→3) | 3-4小时 |
| **Day 3** | 接入工作台账本 + 返回按钮 + 阳光同步 | 2-3小时 |
| **Day 4** | 儿童友好改造（大按钮+触控+难度降低） | 3-4小时 |
| **Day 5** | 测试 + 修复bug + 真机验收 | 2-3小时 |
| **合计** | | **约5天** |

---

## 六、总结

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **CraftMine直接合入** | 内容最完整，单HTML，有敌人/武器/多人 | 3D体素，需精简 | ⭐⭐⭐⭐ |
| **KUBO + little-game-MC拼装** | 2D横版，更符合需求 | 需自己拼装 | ⭐⭐⭐ |
| **从零开发** | 完全可控 | 耗时太长 | ⭐ |

**建议**：先试 **CraftMine** 的在线版，如果觉得3D体素风格能接受，就直接合入精简。如果觉得必须2D横版，就用 **KUBO + little-game-MC 拼装方案**。

需要我帮你把哪个项目的核心代码抽出来，做成可直接嵌入工作台的独立模块？