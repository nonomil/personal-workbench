# 智慧花园工作台 —— 完整项目提示词（精致UI版）

> 适用场景：复制粘贴到 WorkBuddy（codebuddy.cn），生成完整的单页 HTML 应用
> 技术栈：纯前端 + localStorage + Web Speech API + SVG 绘图
> 特色：植物大战僵尸游戏机制 + 11 个学习模块 + 移动端优先 + 液态玻璃精致UI
> 设计基准：Sago Mini 无边乐园 + Pok Pok 极简色彩 + iOS 26 Liquid Glass 材质


## 一、项目概述

你是一位顶级全栈架构师兼儿童产品交互专家。请为我生成一个名为「智慧花园工作台」的单页 HTML 应用。

### 核心定位
- **用户**：3-8 岁儿童及家长
- **场景**：幼小衔接 + 小学低年级学习 + 习惯养成
- **核心理念**：通过「植物大战僵尸」游戏化机制，驱动学习任务完成
- **设计哲学**：「精致感 = 极简的色彩数量 + 极致的层次细节 + 有物理感的交互反馈」

### 技术约束
- 单 HTML 文件，所有 CSS/JS 内联
- 数据存储：localStorage（所有数据持久化）
- 语音：Web Speech API（window.speechSynthesis），不依赖第三方
- 兼容：Chrome / Edge / Safari 主流浏览器（Edge 体验最佳）
- 适配：移动端优先（375px 基准），同时适配 PC
- 所有图标使用 Unicode Emoji
- 所有角色和配图使用内联 SVG（零外部依赖，秒开）
- 字体：优先使用 'Nunito', 'Quicksand', 'PingFang SC', 'Microsoft YaHei'


## 二、全局视觉设计系统

### 2.1 色彩系统（精致版，参考 Pok Pok 极简哲学）

```css
:root {
  /* === 主品牌色：活力橙（带光泽渐变）=== */
  --brand-primary: #FF8C42;
  --brand-gradient: linear-gradient(135deg, #FFB366 0%, #FF8C42 50%, #E86A2E 100%);
  --brand-glow: 0 0 20px rgba(255, 140, 66, 0.3);
  
  /* === 辅助色：薄荷绿（带水润光泽）=== */
  --accent-mint: #4ECDC4;
  --mint-gradient: linear-gradient(135deg, #7EDDD7 0%, #4ECDC4 50%, #3BA99F 100%);
  --mint-glow: 0 0 20px rgba(78, 205, 196, 0.25);
  
  /* === 奖励色：明亮黄（带金属光泽）=== */
  --reward-gold: #FFD93D;
  --gold-gradient: linear-gradient(135deg, #FFE066 0%, #FFD93D 40%, #F4C430 100%);
  --gold-shine: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%);
  
  /* === 成功色：草绿（带生机感）=== */
  --success-green: #6BCB77;
  --green-gradient: linear-gradient(135deg, #8FDB98 0%, #6BCB77 50%, #4CAF50 100%);
  
  /* === 背景色系（奶油质感，非纯白）=== */
  --bg-cream: #FFF8F0;
  --bg-warm: #FFF0E0;
  --bg-deep: #1A1A2E;
  
  /* === 文字色（避免纯黑，用暖灰）=== */
  --text-primary: #2D2D3A;
  --text-secondary: #6B6B7B;
  --text-light: #9B9BAB;
  
  /* === 玻璃材质通用值（三层液态玻璃）=== */
  --glass-bg: rgba(255, 255, 255, 0.15);
  --glass-border: rgba(255, 255, 255, 0.35);
  --glass-blur: blur(20px) saturate(180%);
  --glass-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
  
  /* === 阴影层级（暖灰阴影，禁用纯黑）=== */
  --shadow-sm: 0 2px 8px rgba(45, 45, 58, 0.08);
  --shadow-md: 0 4px 12px rgba(45, 45, 58, 0.1), 0 1px 3px rgba(45, 45, 58, 0.06);
  --shadow-lg: 0 8px 30px rgba(45, 45, 58, 0.12), 0 2px 8px rgba(45, 45, 58, 0.08);
  
  /* === 动画曲线（弹簧感，儿童友好）=== */
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  
  /* === 字号系统（比常规大20-30%，儿童视力保护）=== */
  --text-hero: 48px;
  --text-h1: 32px;
  --text-h2: 24px;
  --text-h3: 20px;
  --text-body: 18px;
  --text-small: 16px;
  --text-caption: 14px;
}
```

**色彩使用铁律**：
- **禁止**大面积使用纯色（`background: #FF6B35` ❌）
- **必须**使用渐变（`background: var(--brand-gradient)` ✅）
- 按钮/卡片必须添加 `var(--brand-glow)` 光晕
- 金色元素必须叠加 `--gold-shine` 扫光动画
- 阴影永远用暖灰 `rgba(45,45,58,0.x)`，禁用纯黑

### 2.2 动态背景（有机生命感）

**核心**：缓慢流动的动态渐变 + 有机漂浮形状，营造「花园里有风在吹」。

```css
body {
  background: linear-gradient(-45deg, #FFF8F0, #FFE8D6, #E8F4F8, #FFF0E0);
  background-size: 400% 400%;
  animation: gradientFlow 15s ease infinite;
  position: relative;
  overflow-x: hidden;
  font-family: 'Nunito', 'Quicksand', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

@keyframes gradientFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 有机漂浮形状（装饰层，营造空间深度） */
body::before, body::after {
  content: '';
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  z-index: 0;
  pointer-events: none;
}

body::before {
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(255,140,66,0.3) 0%, transparent 70%);
  top: -200px; right: -100px;
  animation: floatShape1 20s ease-in-out infinite;
}

body::after {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(78,205,196,0.25) 0%, transparent 70%);
  bottom: -100px; left: -100px;
  animation: floatShape2 25s ease-in-out infinite;
}

@keyframes floatShape1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-30px, 20px) scale(1.1); }
  66% { transform: translate(20px, -30px) scale(0.9); }
}

@keyframes floatShape2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(40px, -20px) scale(1.15); }
}
```

**时段微调**：
- **早晨**：暖橙光晕增强，背景偏 `#FFF5E6 → #FFE4B5`
- **下午**：薄荷光晕增强，背景偏 `#E8F4F8 → #B8E6F0`
- **夜晚**：深紫夜空 `#2D1B69 → #1A0F3C` + Canvas 星星粒子（200-300个白色小点，随机大小1-3px，随机透明度，每3-5秒流星划过）+ 萤火虫光点（5-8个黄色光点缓慢飘动）

### 2.3 液态玻璃卡片系统（三层结构）

**核心升级**：从简单毛玻璃 → 三层液态玻璃（高光层 + 主体层 + 边缘透光层）。

```css
/* === 基础液态玻璃卡片 === */
.glass-card {
  position: relative;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 24px; /* 大圆角，亲和柔软 */
  box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,0.4);
  overflow: hidden;
  transition: all 0.4s var(--ease-spring);
}

/* 玻璃表面高光层（模拟光线反射） */
.glass-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 40%;
  background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 100%);
  border-radius: 24px 24px 0 0;
  pointer-events: none;
  z-index: 1;
}

/* 玻璃边缘透光层（模拟玻璃厚度） */
.glass-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 24px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);
  pointer-events: none;
  z-index: 2;
}

/* 内卡片圆角规则：外24px → 内12px（刚好一半，视觉极度和谐） */
.glass-card .inner-card {
  border-radius: 12px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
}

/* 悬停/点击时的液态反馈 */
.glass-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 40px rgba(31,38,135,0.2), 0 0 30px rgba(255,140,66,0.1), inset 0 1px 0 rgba(255,255,255,0.5);
}

.glass-card:active {
  transform: translateY(0) scale(0.98);
  transition-duration: 0.1s;
}
```

### 2.4 软胶材质按钮（主要操作）

```css
.btn-soft {
  background: var(--brand-gradient);
  border: none;
  border-radius: 20px;
  padding: 14px 32px;
  color: white;
  font-size: 18px;
  font-weight: 700;
  box-shadow: 
    0 4px 15px rgba(255,140,66,0.4),
    0 8px 30px rgba(255,140,66,0.2),
    inset 0 -2px 0 rgba(0,0,0,0.1),
    inset 0 2px 0 rgba(255,255,255,0.3);
  transition: all 0.3s var(--ease-bounce);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

/* 扫光动画 */
.btn-soft::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shineSweep 3s ease-in-out infinite;
}

@keyframes shineSweep {
  0% { left: -100%; }
  50%, 100% { left: 200%; }
}

.btn-soft:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(255,140,66,0.5), 0 12px 40px rgba(255,140,66,0.3);
}

.btn-soft:active {
  transform: translateY(1px) scale(0.95);
  box-shadow: 0 2px 8px rgba(255,140,66,0.3), inset 0 2px 4px rgba(0,0,0,0.2);
}
```

### 2.5 圆角与形状系统（有机曲线）

| 元素类型 | 圆角值 | 说明 |
|:---|:---|:---|
| 大卡片/面板 | `24px` | 主内容容器，圆润饱满 |
| 中卡片/模块 | `20px` | 功能模块 |
| 内卡片 | `12px`（外的一半）| 嵌套卡片，视觉和谐 |
| 按钮 | `16px-20px` | 大圆角，像软糖 |
| 小标签/徽章 | `100px`（pill形）| 胶囊形状，可爱友好 |
| 输入框 | `12px` | 柔和但不幼稚 |
| 头像/图标容器 | `50%`（圆形）| 人物角色用圆形 |
| 异形装饰 | `60% 40% 30% 70% / 60% 30% 70% 40%` | 有机 blob 形状 |

### 2.6 阴影与深度系统

```css
.elevated-1 { box-shadow: 0 1px 3px rgba(45,45,58,0.08); }
.elevated-2 { box-shadow: 0 4px 12px rgba(45,45,58,0.1), 0 1px 2px rgba(45,45,58,0.06); }
.elevated-3 { box-shadow: 0 8px 24px rgba(45,45,58,0.12), 0 2px 6px rgba(45,45,58,0.08), 0 0 0 1px rgba(255,255,255,0.1); }
.elevated-4 { box-shadow: 0 16px 48px rgba(45,45,58,0.15), 0 4px 12px rgba(45,45,58,0.1), 0 0 0 1px rgba(255,255,255,0.15); }
```

### 2.7 全局布局结构

#### PC 端
- 左侧导航栏：固定宽度 220px，背景 `#1A1A2E`，文字 `#E0E0E0`
- 激活态：左侧 3px 荧光绿竖条（`#4ECDC4`），卡片高亮背景 `rgba(78,205,196,0.15)`
- 菜单项垂直排列，间距 6px，每个图标 24px
- 顶部：应用 Logo + 当前时间，液态玻璃风格
- 底部：阳光余额（带金色光晕）+ 连续打卡天数（火焰动效）

#### 移动端
- 底部导航：**液态玻璃浮动导航栏**（非贴底，距底16px，圆角32px胶囊形）
- Tab 图标 + 文字，选中态：背景色块 + 图标放大1.2倍 + 上浮4px + 底部小圆点指示器
- 完整 11 个模块通过底部「更多」展开或滑动切换
- 顶部状态栏：52px，显示时间 + 阳光（带光晕）+ 打卡

#### 主内容区
- flex:1，内边距 16-24px
- 卡片风格：液态玻璃（见 2.3）
- 所有模块卡片使用 `glass-card` 类


## 三、核心游戏引擎

### 3.1 阳光经济系统
| 操作 | 阳光变化 |
|:---|:---|
| 完成一个任务 | +5~20（任务设定值）|
| 种植基础植物 | -20 |
| 升级植物（二阶）| -30 |
| 升级植物（三阶）| -50 |
| 铲除植物 | +50% 消耗值（向下取整）|
| 僵尸抵达花园 | -10（警告）|

- localStorage 键名：`sunBalance`
- 初始值：100 阳光
- **视觉表现**：阳光数字使用金色渐变文字 + 光晕，变化时触发飘字动画

### 3.2 花园棋盘
- **布局**：4 行 × 8 列网格
- **PC 尺寸**：每个格子 80×80px，间距 8px
- **移动端尺寸**：每个格子 56×56px，间距 4px
- **格子样式**：液态玻璃小卡片，圆角 12px，悬停时微微发光
- **交互**：点击空位弹出植物选择面板（液态玻璃模态框）→ 消耗阳光种植
- **点击已有植物**：弹出升级/铲除选项（带弹性动画的上下文菜单）

### 3.3 僵尸机制
- **触发条件**：昨日有未完成任务 → 今日登录时生成僵尸
- **生成位置**：棋盘右侧（第 8 列），随机 1-3 行
- **移动速度**：每 2 秒向左移动 1 格
- **移动动画**：沉重感行走动画（上下浮动 + 手臂摆动 + 轻微旋转）
- **终点惩罚**：僵尸抵达第 1 列 → 屏幕红色闪烁 + 震动 + 扣除 10 阳光 + 警报文字
- **消灭方式**：植物子弹自动攻击当前行最右侧僵尸（每 3 秒一发，带拖尾粒子）
- **僵尸血量**：普通僵尸 3HP，路障僵尸 5HP，铁桶僵尸 8HP

### 3.4 任务系统
- **每日任务**：从所有自定义任务中随机抽取 5 个
- **任务状态**：待完成 ⭕ / 已完成 ✅（带金色勾选动画）
- **全部完成**：
  - 触发向日葵庆祝动画（全屏金色粒子爆炸，Canvas 300-500 粒子，金色到橙色渐变，带重力下落）
  - 日历自动打卡（标记绿点，带弹出动画）
  - 额外奖励 +20 阳光（飘字动画）
- **漏卡统计**：当日 24:00 前未完成 → 日历标红叉
- **出勤率**：已打卡天数 / 本月总天数 × 100%


## 四、11 个功能模块（所有模块卡片使用 glass-card 样式）

### 模块 1：日历打卡 🌞
- 月历网格视图（周一至周日），格子圆角 12px
- 每个日期格子显示：日期数字 + 状态图标（✅ 已打卡 / ❌ 漏卡 / ⭕ 未到）
- 状态图标带微动画：打卡成功时绿色圆圈从中心放大弹出
- 顶部统计卡片：本月出勤率 + 连续打卡天数（火焰图标带 flicker 动画）
- 点击日期可查看当日任务完成详情（液态玻璃弹窗）

### 模块 2：花园基地 🎮
- 渲染 4×8 棋盘（展示植物 + 僵尸）
- 顶部面板：阳光余额（金色光晕数字）+ 今日任务进度（3/5，进度条带渐变）
- 僵尸入侵倒计时（若存在僵尸，数字闪烁警告色）
- 3 个功能按钮（全部使用 btn-soft 样式）：
  - 【收阳光】一键收集当前所有阳光（阳光飞向顶部余额的磁吸动画）
  - 【快速种植】直接种植当前选中的植物
  - 【花园护盾】消耗 50 阳光，立即消灭所有僵尸（全屏绿色波纹扩散，CD 24 小时）

### 模块 3：识字专区 📖
- **字库**：内置 300-500 个常用汉字，按主题分类
  - 自然 🌿 / 动物 🐼 / 身体 🧍 / 数字 🔢 / 颜色 🎨 / 家庭 👨‍👩‍👦
- **分级**：启蒙（1-100）/ 进阶（101-300）/ 提高（301-500）
- **每日分配**：10 个新字 + 复习昨日错误率最高的 5 个字
- **交互**：
  - 点击文字 → Web Speech API 发音 + 文字放大弹跳动画
  - 长按（>500ms）→ 弹出气泡显示 3 个常用词组 + 组词发音（气泡使用液态玻璃样式）
- **进度**：已学 X / 总字数 Y（进度条带渐变色）

### 模块 4：拼音专区 🔊
- **内容**：23 个声母 + 24 个韵母 + 16 个整体认读音节
- **展示**：卡片网格，每个卡片使用 glass-card，圆角 20px
- 点击卡片翻转（3D 翻转动画，perspective 1000px，rotateY 180°）并发音
- **卡片正面**：拼音字母（大号 32px，粗体，渐变文字）
- **卡片背面**：发音方式讲解 + 顺口溜（背面背景用 mint-gradient）

### 模块 5：古诗专区 🏮
- **内容**：内置 50-100 首经典古诗
- **关卡制**：每 10 首为一关，解锁下一关需全部标记「学会」
- **展示**：左半屏原文（楷体，24px，深色），右半屏白话译文（18px，次要色）
- **操作**：
  - 【朗读】整首发音 + 文字高亮跟随（高亮背景为金色半透明）
  - 【跟读】显示跟读提示（录音动效模拟，脉冲圆环动画）
  - 【学会标记】点亮右上角小红花（花朵绽放动画：scale 0→1.2→1 + 旋转）
- **配图**：每首古诗右侧配一幅淡雅水墨风 SVG（300×200px，宣纸色背景，留白 30%）

### 模块 6：数学专区 🧮
- **难度分级**（下拉切换，下拉框使用 glass-card 样式）：
  - 🌱 10 以内加减
  - 🌿 20 以内进退位
  - 🌳 5 以内乘法
  - 🌲 10 以内乘除法
- **水果计数辅助**：题目下方显示对应数量水果 Emoji（如 3+2 显示 🍎🍎🍎 + 🍎🍎），水果带轻微浮动动画
- **数字键盘**：自定义大按钮键盘（0-9 + 退格 + 确认），按钮使用 btn-soft 样式，禁用系统键盘
- **闯关模式**：连续答对 10 题 → 记录「闯关天数」+ 额外阳光奖励（全屏彩带粒子）
- **机器人对战**（可选）：
  - BOT 有 70% 概率答对
  - 玩家答对 + BOT 答错 → 双倍积分（阳光爆炸特效）
  - BOT 答对 + 玩家答错 → 扣除 1 条命（每日 3 条命，心形图标碎裂动画）

### 模块 7：专注力训练 🧩
- **5 类题型**：
  1. 找不同：左右两图，点击不同之处（正确时绿色涟漪，错误时红色抖动）
  2. 迷宫：Canvas 绘制迷宫，手指画路线（路径发光效果）
  3. 数数：数出图中指定物品数量
  4. 规律：ABAB / ABB / ABC 规律推理
  5. 逻辑：谁不是同类 / 排序 / 分类
- **新增硬核题**：
  - **舒尔特方格**：5×5 数字随机排列，按顺序点击 1→25，计时并记录历史最快（点击正确时数字缩小消失，带绿色光晕）
  - **数独**：4×4 初级宫格（1-4），提供「提示」功能（提示数字以金色浮出）

### 模块 8：每日英语 🇬🇧
- **词库**：内置 200-500 个小学 PEP 人教版核心词汇
- **每日推送**：2 个新词 + 3 个复习词（艾宾浩斯遗忘曲线）
- **交互**：
  - 点击单词 → 英文发音（en-US）+ 单词卡片弹跳
  - 点击词组 → 发音 + 自动朗读例句
- **进度追踪**：已学 X / 总词数 Y（环形进度条，SVG绘制，渐变色）

### 模块 9：每日运动 🏃
- **10 项居家动作**：开合跳 / 深蹲 / 原地跑 / 高抬腿 / 平板支撑 / 原地摸高 / 侧身跳 / 弓步压腿 / 肩部环绕 / 原地踏步
- **交互**：每个动作 15 秒倒计时 + 圆形进度条（SVG，渐变色填充）
- **语音播报**：Web Speech API 播报动作名称和倒计时
- **完成奖励**：每完成一项 +5 阳光（飘字动画）

### 模块 10：错题本 📝
- **自动记录**：数学专区答错的题目自动存入
- **记录内容**：题目 + 用户错误答案 + 正确答案 + 错误时间
- **复习模式**：每日推送最多 5 道错题（错题卡片带红色左边框）
- **移除条件**：同一道题连续答对 3 次 → 从错题本移除（卡片缩小消失动画）

### 模块 11：奖励商城 🎁
- **植物商店**：用阳光购买植物品种
  - 向日葵（20 阳光）/ 豌豆射手（30 阳光）/ 坚果墙（30 阳光）/ 双发射手（50 阳光）/ 寒冰射手（60 阳光）
  - 每个植物卡片展示 SVG 预览 + 价格（金色标签）
- **自定义奖励**（家长端）：
  - 入口：左上角齿轮图标，长按 3 秒，密码 `8888`
  - 增删奖励项：名称 + 所需阳光 + Emoji 图标（提供 20+ 预设）
- **兑换流程**：点击奖励 → 确认兑换 → 消耗阳光 → 播放星星收集特效（星星从商品飞向顶部阳光余额）


## 五、交互与反馈系统（精致版）

### 5.1 视觉反馈（所有动画使用弹簧曲线）

| 操作 | 反馈 |
|:---|:---|
| 完成任务 | 飘字动画 "+10 ☀️"，金色渐变文字向上渐隐，带光晕阴影 |
| 种植植物 | 植物从地面冒出（popIn 动画：scale 0→1.15→1，translateY 20→-5→0，0.5s）|
| 僵尸生成 | 屏幕右侧出现僵尸，伴随低沉音效，僵尸带沉重行走动画 |
| 僵尸抵达终点 | 红色边框闪烁 + 屏幕震动 + 警报文字（警告色，非纯红）|
| 全部任务完成 | 全屏金色粒子爆炸（Canvas 300-500 粒子，金色到橙色，重力下落，1.5s）|
| 兑换奖励 | 星星从四周飞向中央汇合爆炸（磁吸动画）|
| 点击按钮 | 涟漪效果（ripple）+ 按压缩放（0.95）+ 回弹（1.02）|
| 获得阳光 | 阳光数字跳动（scale 1→1.2→1）+ 金色光晕脉冲 |
| 连续打卡 | 火焰图标 flicker 动画（0.8s 周期，轻微旋转缩放）|

### 5.2 关键动画代码规范

```css
/* 飘字动画 */
@keyframes floatUp {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  50% { transform: translateY(-30px) scale(1.2); opacity: 1; }
  100% { transform: translateY(-60px) scale(0.8); opacity: 0; }
}
.sun-float {
  animation: floatUp 1s var(--ease-spring) forwards;
  text-shadow: 0 0 10px rgba(255, 217, 61, 0.8);
  font-weight: 800;
  font-size: 24px;
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 种植破土动画 */
@keyframes popIn {
  0% { transform: scale(0) translateY(20px); opacity: 0; }
  60% { transform: scale(1.15) translateY(-5px); opacity: 1; }
  80% { transform: scale(0.95) translateY(2px); }
  100% { transform: scale(1) translateY(0); }
}

/* 僵尸沉重行走 */
@keyframes zombieWalk {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-2px) rotate(1deg); }
  50% { transform: translateX(-4px) rotate(0deg); }
  75% { transform: translateX(-2px) rotate(-1deg); }
}

/* 火焰 flicker */
@keyframes flameFlicker {
  0%, 100% { transform: scale(1) rotate(-2deg); }
  25% { transform: scale(1.05) rotate(2deg); }
  50% { transform: scale(0.95) rotate(-1deg); }
  75% { transform: scale(1.08) rotate(1deg); }
}
.flame-icon {
  animation: flameFlicker 0.8s ease-in-out infinite;
  filter: drop-shadow(0 0 8px rgba(255, 140, 66, 0.6));
}

/* 点击涟漪 */
.ripple {
  position: relative;
  overflow: hidden;
}
.ripple::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.6);
  transform: scale(0);
  opacity: 0;
  pointer-events: none;
}
.ripple:active::after {
  animation: rippleEffect 0.6s ease-out;
}
@keyframes rippleEffect {
  0% { transform: scale(0); opacity: 0.6; }
  100% { transform: scale(4); opacity: 0; }
}

/* 3D 卡片倾斜（鼠标跟随，JS动态计算） */
.tilt-card {
  transform-style: preserve-3d;
  transition: transform 0.1s ease-out;
}
```

### 5.3 音效反馈（Web Audio API 合成）

| 场景 | 音效 |
|:---|:---|
| 获得阳光 | 频率 800Hz→1200Hz，持续 0.15s，上升调，清脆 |
| 种植成功 | 频率 600Hz→800Hz，持续 0.15s，像水泡破裂 |
| 僵尸来袭 | 频率 200Hz，持续 0.5s，下降调，沉重 |
| 完成任务 | 频率 523Hz→659Hz→784Hz→1047Hz（C-E-G-C 和弦），欢快 |
| 警告 | 频率 300Hz，脉冲 0.1s 间隔，短促 |
| 按钮点击 | 频率 1000Hz，持续 0.05s，像软木塞弹出 |
| 升级成功 | 频率 400Hz→800Hz→1200Hz，持续 0.3s，华丽上升 |

### 5.4 数据持久化
- 所有数据写入 localStorage，实时保存
- 页面加载时从 localStorage 恢复状态
- 关键数据键名：
  - `sunBalance` —— 阳光余额
  - `gardenGrid` —— 棋盘状态（植物/僵尸位置）
  - `calendar` —— 打卡记录
  - `tasks` —— 任务列表
  - `learning` —— 各科学习进度
  - `wrongQuestions` —— 错题本
  - `rewards` —— 自定义奖励


## 六、家长控制面板

### 入口
- 左上角设置齿轮图标 → 长按 3 秒 → 密码验证（`8888`）
- 验证通过后以液态玻璃模态框展示面板

### 功能
1. **任务管理**：添加/删除自定义任务
   - 表单：任务名称 + 描述 + 阳光奖励值（5-20）
   - 表单输入框使用 glass-card 内嵌样式
2. **奖励管理**：添加/删除自定义奖励
   - 表单：奖励名称 + 阳光标价 + 选择预设 Emoji 图标（提供 20+ 预设）
3. **数据重置**：一键重置所有数据（二次确认弹窗，红色警告按钮）
4. **难度调整**：调整各学科难度级别（滑块控件，带弹性反馈）


## 七、PWA 配置（添加到手机桌面）

在 `<head>` 中添加：
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="智慧花园">
<link rel="apple-touch-icon" href="data:image/svg+xml,...（内联 SVG 图标，使用品牌渐变）">
<meta name="theme-color" content="#FF8C42">
```

## 八、预设数据（开箱即用）

### 8.1 示例任务（3 条）
1. 背诵古诗《静夜思》 — 奖励 10 阳光
2. 学习 5 个新汉字 — 奖励 10 阳光
3. 完成 10 道数学题 — 奖励 15 阳光

### 8.2 示例汉字（20 个，含分类）
- 自然：日、月、山、水、风、雨、花、草
- 动物：马、牛、羊、鸟、鱼、虫
- 身体：手、口、目、耳、心

### 8.3 示例古诗（5 首）
- 《静夜思》李白
- 《春晓》孟浩然
- 《咏鹅》骆宾王
- 《悯农》李绅
- 《登鹳雀楼》王之涣

### 8.4 示例数学题（10 道）
- 10 以内加减法随机生成


## 九、输出要求

1. 直接输出完整的 `index.html` 文件
2. 所有 CSS 内联在 `<style>` 中，所有 JS 内联在 `<script>` 中
3. 关键函数添加中文注释
4. 所有交互逻辑闭环，无死循环和内存泄漏
5. 移动端和 PC 端都能正常使用
6. **视觉要求**：
   - 所有卡片使用液态玻璃三层结构（高光+主体+边缘）
   - 所有按钮使用软胶材质（渐变+内阴影+扫光）
   - 所有动画使用弹簧曲线（cubic-bezier）
   - 所有阴影使用暖灰（禁用纯黑）
   - 所有圆角遵循有机曲线系统
   - 背景必须有流动渐变+有机漂浮形状
   - 夜间模式必须有 Canvas 星星粒子+萤火虫

**开始生成！**
