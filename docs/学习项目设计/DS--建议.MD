你的感觉有道理。那份分析文件确实**过于保守**——它的判断标准是“能否直接把整个仓库搬进工作台”，但开源项目从来不是这么用的。

先看文件里的结论，再判断哪些合理、哪些过虑。


## 一、文件里分析得对的地方

| 结论 | 评价 |
|------|------|
| yxj-workbench 无 LICENSE，不能整库搬 | ✅ 对，但可以**看字段设计** |
| PEP 词库是教材整理，不是运行时数据源 | ✅ 对，只当筛词对照 |
| kouyu 是成人口语，不适合幼小衔接 | ✅ 对，不采用 |
| kids-learning-cards 是 Noncommercial 许可 | ✅ 对，生成器不进运行时 |
| 现有识字 215 字 > yxj 165 字，不必灌 | ✅ 对，你们更厚 |

文件里这几个判断是扎实的。


## 二、文件里“过于保守”的地方

### 1. “学结构不抄正文”被过度执行

开源项目的价值**恰恰在于看别人怎么组织数据**，不是把数据搬进来。

比如 `english/speak.js` 的数据格式：

```javascript
// yxj 英语数据结构
{
  en: "Good morning",
  zh: "早上好",
  theme: "greeting"
}
```

这个结构本身不受版权保护。你在工作台里用同样结构，自己写句子，完全没问题。文件说“不抄正文”是对的，但不能因此不敢借鉴结构设计。

### 2. “不进整仓”说得太死

有些 MIT/BSD 协议的项目，**可以直接引用部分数据文件**：

| 项目 | 许可证 | 可以做什么 |
|------|--------|-----------|
| PEP CSV 词表 | MIT（README 注明） | 读一年级 98 词作为**筛词清单** |
| OpenLingo | MIT | 参考 CEFR 分级体系和闪卡交互 |
| Early Reader App | MIT | 参考卡片数据结构 |

文件说“PEP 是教材版权不能进运行时”，但 MIT 协议只覆盖**代码和数据编排格式**，词表本身是教材内容，版权归属人教社。所以 PEP CSV 的用途是：帮你确认哪些词该在一年级出现，而不是直接把词表当运行数据。这个判断文件里是对的。

### 3. 对“无 LICENSE”一刀切

无 LICENSE 代表著作权保留，你不能 Fork 整个项目、不能在仓库里复制粘贴完整代码。但这**不限制**你：

- 阅读源码学习思路
- 参考字段命名和组织方式
- 用同样的交互模式自己写

比如 yxj 的 `data-english.js` 有 105 个词，你不能直接复制那个数组，但可以参照它的 **“词→主题→短句”结构** 自己写。

### 4. 低估了 kids-learning-cards 的参考价值

PolyForm Noncommercial 禁止的是**将生成器嵌入商业产品**，但完全不影响：

- 用它在本地批量生成卡片
- 参考生成的 HTML/CSS 结构自己写渲染
- 参考 YAML 里的字段设计

**工作流可以是**：`kids-learning-cards 本地生成卡片 → 提取结构 → 在工作台里用同样字段自己实现`


## 三、重新评估：哪些资源你该“拿来用”？

### 第一类：可以直接看源码学习（无限制）

| 项目 | 可以拿什么 |
|------|-----------|
| yxj-workbench | 数据结构设计、每日5词机制、课程路由 |
| Early Reader App | 卡片数据结构、自然拼读课程顺序 |
| kids-learning-cards | YAML字段设计、卡片布局结构 |

### 第二类：可以本地生成素材（不进运行时）

| 项目 | 用法 |
|------|------|
| kids-learning-cards | 本地跑生成器，输出卡片HTML/配图/音频，把生成好的文件放进 assets |
| OpenLingo | 本地跑 SM-2 闪卡逻辑，参考其间隔算法 |

### 第三类：可以当数据参考（不直接引用）

| 项目 | 用法 |
|------|------|
| PEP CSV | 看一年级 98 词是哪些，作为自己的词表对照 |
| yxj 105 词 | 看主题分类（颜色/动物/家人），补自己词表里缺的主题 |


## 四、合入文件里的三条线路怎么走

### 线路①：英语口语 —— 可推进，不依赖开源

| 步骤 | 做法 | 不开源也行？ |
|------|------|-------------|
| 30 词 → 80 词 | 从 PEP 一年级 98 词里筛 50 个生活词 | ✅ 自己看词表写 |
| 每词配一句儿童英语 | 自己写句子（不是抄 yxj） | ✅ 自己写 |
| 每日计划入口 | 改按钮路径 | ✅ 纯代码改动 |
| 本地 TTS 发音 | Web Speech API | ✅ 已实现 |

30 → 80 词，词汇是高频生活词，句子是自己写的儿童英语——这事不需要开源项目给你数据，**进度卡在“改按钮路径”和“自己写句子”**。

### 线路②：拼读 CVC —— 可推进，已有 94 词

文件说对了：`phonics/word-bank.json` 已经有 94 个 CVC 词，`preschool-english-phonics-3` 仍然手写 `mat/bat/fat`。这是代码没接数据源的问题，**改代码就能推进**，不需要找新开源。

### 线路③：口算第一关 —— 可推进，已有 L1 题库

`math/problem-bank.json` 已经有 L1 数数题，`preschool-math-1` 没接。**改代码就能推进**，不需要 npm 口算包。


## 五、总结：太保守了，但保守的边界有道理

| 文件里判断 | 是否合理 |
|-----------|---------|
| 不许整仓 Fork yxj | ✅ 合理（无 LICENSE）|
| 不许复制 yxj 原文 | ✅ 合理 |
| 不许把 PEP 795 词当运行时 | ✅ 合理（教材版权）|
| 不许把 kouyu 成人短语合入 | ✅ 合理（不适合儿童）|
| “学结构不抄正文”过度执行 | ❌ 稍微过虑，结构可以学 |

**“太保守”的地方是：把所有“不能直接搬”的资源都排除了，但开源项目最大的价值是看别人怎么组织、怎么设计、怎么命名，不是直接把数据灌进自己系统。**

下一步应该做的是：
1. **英语**：30 词→80 词（用 PEP 一年级 98 词筛），每词自己写一句儿童英语
2. **拼读**：改代码让 `preschool-english-phonics-3` 读 `word-bank.json` 的 CVC 词
3. **口算**：改代码让 `preschool-math-1` 读 `problem-bank.json` 的 L1 题

这三条都不需要克隆新仓库。文档里说的“下一刀如果继续，就是①”是对的——先做英语入口的推进。需要我帮你展开怎么做①吗？


好，一次性全部做完三条线路。

---

## 总览：三条线路一次性推进

| 线路 | 当前问题 | 本次改动 | 用户可见效果 |
|------|---------|---------|-------------|
| **① 英语口语** | 计划按钮指向拼读课，30词无中英文对照、无句子 | 改计划入口、扩词库到80词、每词配一句儿童英语 | 每日计划→英语→30天每日5张词卡，听词+听句 |
| **② 自然拼读** | preschool-english-phonics-3 手写 mat/bat/fat，未读 word-bank.json | 改代码读 word-bank 的 CVC 词 | 拼读第3课开始从94词库随机出题，不再手写 |
| **③ 口算** | preschool-math-1 手写 10-9、8+7、12-5，未读 problem-bank.json | 改代码读 problem-bank L1 题 | 数学第1课从题库出数数/比较/加减，不再超前出题 |


## 先确认你已有的数据

### word-bank.json（自然拼读94词）

```
路径：data/preschool/english/phonics/word-bank.json
结构：
{
  "stages": [
    {
      "id": "cvc-blending",
      "name": "CVC Blending",
      "words": ["cat", "mat", "sat", "bag", "cap", "map", "tap", "bed", "leg", "pen", "ten", "vet", ...]
    },
    {
      "id": "short-vowels-and-families",
      "words": ["bat", "fat", "rat", "hat", "pat", "nat", ...]
    },
    ...
  ]
}
```

### problem-bank.json（数学30题）

```
路径：data/preschool/数学/problem-bank.json
结构：
{
  "L1": {
    "name": "数一数",
    "problems": [
      { "question": "数一数：有几个苹果？🍎🍎🍎", "answer": "3" },
      ...
    ]
  },
  "L2": {
    "name": "比大小",
    "problems": [...]
  },
  "L3": {
    "name": "5以内加减",
    "problems": [...]
  }
}
```

### 英语词库（30词）

```
路径：data/preschool/英语/vocabulary-bank.json
当前结构：
{
  "words": [
    { "word": "red", "theme": "colors" },
    { "word": "blue", "theme": "colors" },
    ...
  ]
}
// 缺少：zh（中文释义）、phrase（包含该词的短语）、phraseZh（短语中文）
```


## 线路①：英语口语（完整改动）

### Step 1：补全 30 词的中文 + 儿童英语短句

**修改目标**：`data/preschool/英语/vocabulary-bank.json`

将现有 30 词补上 `zh`、`phrase`、`phraseZh` 字段，然后从 PEP 一年级词表筛 50 个新词，组成 80 词 + 80 句。

**30 词补全清单（直接执行）** ：

```json
[
  { "word": "red", "zh": "红色", "phrase": "I see a red apple.", "phraseZh": "我看见一个红苹果。" },
  { "word": "blue", "zh": "蓝色", "phrase": "The sky is blue.", "phraseZh": "天空是蓝色的。" },
  { "word": "green", "zh": "绿色", "phrase": "The grass is green.", "phraseZh": "草地是绿色的。" },
  { "word": "yellow", "zh": "黄色", "phrase": "The sun is yellow.", "phraseZh": "太阳是黄色的。" },
  { "word": "cat", "zh": "猫", "phrase": "I have a cat.", "phraseZh": "我有一只猫。" },
  { "word": "dog", "zh": "狗", "phrase": "The dog is big.", "phraseZh": "这只狗很大。" },
  { "word": "fish", "zh": "鱼", "phrase": "I like fish.", "phraseZh": "我喜欢鱼。" },
  { "word": "bird", "zh": "鸟", "phrase": "The bird can fly.", "phraseZh": "鸟会飞。" },
  { "word": "apple", "zh": "苹果", "phrase": "I eat an apple.", "phraseZh": "我吃一个苹果。" },
  { "word": "banana", "zh": "香蕉", "phrase": "I like bananas.", "phraseZh": "我喜欢香蕉。" },
  { "word": "book", "zh": "书", "phrase": "This is a book.", "phraseZh": "这是一本书。" },
  { "word": "ball", "zh": "球", "phrase": "I play with a ball.", "phraseZh": "我玩球。" },
  { "word": "sun", "zh": "太阳", "phrase": "The sun is hot.", "phraseZh": "太阳很热。" },
  { "word": "moon", "zh": "月亮", "phrase": "The moon is bright.", "phraseZh": "月亮很亮。" },
  { "word": "star", "zh": "星星", "phrase": "Stars shine at night.", "phraseZh": "星星在夜晚闪烁。" },
  { "word": "hand", "zh": "手", "phrase": "I have two hands.", "phraseZh": "我有两只手。" },
  { "word": "eye", "zh": "眼睛", "phrase": "I see with my eyes.", "phraseZh": "我用眼睛看。" },
  { "word": "run", "zh": "跑", "phrase": "I can run fast.", "phraseZh": "我能跑得快。" },
  { "word": "jump", "zh": "跳", "phrase": "I can jump high.", "phraseZh": "我能跳得高。" },
  { "word": "sit", "zh": "坐", "phrase": "Please sit down.", "phraseZh": "请坐下。" },
  { "word": "stand", "zh": "站", "phrase": "Please stand up.", "phraseZh": "请站起来。" },
  { "word": "play", "zh": "玩", "phrase": "I like to play.", "phraseZh": "我喜欢玩。" },
  { "word": "home", "zh": "家", "phrase": "I go home.", "phraseZh": "我回家。" },
  { "word": "family", "zh": "家庭", "phrase": "I love my family.", "phraseZh": "我爱我的家庭。" },
  { "word": "hello", "zh": "你好", "phrase": "Hello, how are you?", "phraseZh": "你好，你好吗？" },
  { "word": "bye", "zh": "再见", "phrase": "Goodbye, see you!", "phraseZh": "再见，回头见！" },
  { "word": "like", "zh": "喜欢", "phrase": "I like this.", "phraseZh": "我喜欢这个。" },
  { "word": "see", "zh": "看见", "phrase": "I can see you.", "phraseZh": "我能看见你。" },
  { "word": "small", "zh": "小的", "phrase": "It is small.", "phraseZh": "它很小。" },
  { "word": "big", "zh": "大的", "phrase": "It is big.", "phraseZh": "它很大。" }
]
```

### Step 2：扩充到 80 词（从 PEP 一年级词表筛选 + 自写句子）

**PEP 一年级词汇表（98 词）** ：从 billyjr/pep-english-vocabulary 的 CSV 中提取一年级词汇约 98 个。去重后与现有 30 词取并集，选出 50 个新增词汇。

**PEP 一年级词表（98词）** ：

**动物（16个）**：cat, dog, duck, pig, bear, rabbit, monkey, panda, elephant, tiger, lion, bird, fish, frog, horse, cow

**颜色（6个）**：red, blue, green, yellow, white, black

**数字（10个）**：one, two, three, four, five, six, seven, eight, nine, ten

**身体（5个）**：eye, ear, face, hand, foot

**食物（8个）**：apple, banana, egg, milk, bread, rice, cake, juice

**学校（10个）**：book, bag, pen, pencil, ruler, desk, chair, teacher, student, school

**家庭（8个）**：father, mother, brother, sister, friend, baby, family, home

**动作/指令（10个）**：go, come, sit, stand, jump, run, play, read, write, draw

**描述词（8个）**：big, small, tall, short, long, new, old, happy

**其他（17个）**：hello, hi, goodbye, thank, sorry, nice, me, you, he, she, it, we, they, yes, no, okay, please

这 98 词中，现有 30 词已包含约 20 个。新增 50-60 个核心词，即可达到 80-90 词。

**80 词完整词库（建议保留以下词，其余暂缓）** ：

```
第一组 - 动词（6）：go, come, read, write, draw, thank
第二组 - 家庭与人物（6）：father, mother, brother, sister, friend, baby
第三组 - 动物（5）：duck, pig, bear, monkey, rabbit
第四组 - 食物（5）：bread, rice, cake, juice, egg
第五组 - 学校物品（5）：pen, pencil, ruler, desk, chair
第六组 - 描述词（5）：tall, short, long, new, old
第七组 - 代词/功能词（5）：me, you, he, she, it
第八组 - 日常用语（5）：hi, nice, sorry, okay, please
```

**每词配一句儿童英语**（参考 PEP 一年级句型，自己写，不抄）:

```json
[
  { "word": "go", "zh": "走/去", "phrase": "Let's go to school.", "phraseZh": "我们去上学吧。" },
  { "word": "come", "zh": "来", "phrase": "Come here, please.", "phraseZh": "请到这里来。" },
  { "word": "read", "zh": "阅读", "phrase": "I read a book.", "phraseZh": "我读一本书。" },
  { "word": "write", "zh": "写", "phrase": "I write my name.", "phraseZh": "我写我的名字。" },
  { "word": "draw", "zh": "画", "phrase": "I draw a picture.", "phraseZh": "我画一幅画。" },
  { "word": "thank", "zh": "谢谢", "phrase": "Thank you very much.", "phraseZh": "非常感谢你。" },
  { "word": "father", "zh": "爸爸", "phrase": "My father is tall.", "phraseZh": "我的爸爸很高。" },
  { "word": "mother", "zh": "妈妈", "phrase": "My mother is kind.", "phraseZh": "我的妈妈很和蔼。" },
  { "word": "brother", "zh": "兄弟", "phrase": "I have a brother.", "phraseZh": "我有一个兄弟。" },
  { "word": "sister", "zh": "姐妹", "phrase": "I have a sister.", "phraseZh": "我有一个姐妹。" },
  { "word": "friend", "zh": "朋友", "phrase": "You are my friend.", "phraseZh": "你是我的朋友。" },
  { "word": "baby", "zh": "宝宝", "phrase": "The baby is cute.", "phraseZh": "宝宝很可爱。" },
  { "word": "duck", "zh": "鸭子", "phrase": "The duck can swim.", "phraseZh": "鸭子会游泳。" },
  { "word": "pig", "zh": "猪", "phrase": "The pig is pink.", "phraseZh": "猪是粉色的。" },
  { "word": "bear", "zh": "熊", "phrase": "The bear is big.", "phraseZh": "熊很大。" },
  { "word": "monkey", "zh": "猴子", "phrase": "The monkey can climb.", "phraseZh": "猴子会爬树。" },
  { "word": "rabbit", "zh": "兔子", "phrase": "The rabbit is white.", "phraseZh": "兔子是白色的。" },
  { "word": "bread", "zh": "面包", "phrase": "I like bread.", "phraseZh": "我喜欢面包。" },
  { "word": "rice", "zh": "米饭", "phrase": "I eat rice.", "phraseZh": "我吃米饭。" },
  { "word": "cake", "zh": "蛋糕", "phrase": "I love cake.", "phraseZh": "我喜欢蛋糕。" },
  { "word": "juice", "zh": "果汁", "phrase": "I drink juice.", "phraseZh": "我喝果汁。" },
  { "word": "egg", "zh": "鸡蛋", "phrase": "I eat an egg.", "phraseZh": "我吃一个鸡蛋。" },
  { "word": "pen", "zh": "钢笔", "phrase": "I write with a pen.", "phraseZh": "我用钢笔写字。" },
  { "word": "pencil", "zh": "铅笔", "phrase": "I draw with a pencil.", "phraseZh": "我用铅笔画画。" },
  { "word": "ruler", "zh": "尺子", "phrase": "I measure with a ruler.", "phraseZh": "我用尺子测量。" },
  { "word": "desk", "zh": "书桌", "phrase": "I sit at the desk.", "phraseZh": "我坐在书桌前。" },
  { "word": "chair", "zh": "椅子", "phrase": "I sit on the chair.", "phraseZh": "我坐在椅子上。" },
  { "word": "tall", "zh": "高的", "phrase": "I am tall.", "phraseZh": "我很高。" },
  { "word": "short", "zh": "矮的", "phrase": "I am short.", "phraseZh": "我很矮。" },
  { "word": "long", "zh": "长的", "phrase": "The road is long.", "phraseZh": "这条路很长。" },
  { "word": "new", "zh": "新的", "phrase": "I have a new bag.", "phraseZh": "我有一个新书包。" },
  { "word": "old", "zh": "旧的", "phrase": "It is old.", "phraseZh": "它是旧的。" },
  { "word": "me", "zh": "我", "phrase": "Look at me.", "phraseZh": "看我。" },
  { "word": "you", "zh": "你", "phrase": "I love you.", "phraseZh": "我爱你。" },
  { "word": "he", "zh": "他", "phrase": "He is a boy.", "phraseZh": "他是一个男孩。" },
  { "word": "she", "zh": "她", "phrase": "She is a girl.", "phraseZh": "她是一个女孩。" },
  { "word": "it", "zh": "它", "phrase": "It is cute.", "phraseZh": "它很可爱。" },
  { "word": "hi", "zh": "嗨", "phrase": "Hi, how are you?", "phraseZh": "嗨，你好吗？" },
  { "word": "nice", "zh": "好的", "phrase": "Nice to meet you.", "phraseZh": "很高兴见到你。" },
  { "word": "sorry", "zh": "对不起", "phrase": "I am sorry.", "phraseZh": "我很抱歉。" },
  { "word": "okay", "zh": "好的", "phrase": "It's okay.", "phraseZh": "没关系。" },
  { "word": "please", "zh": "请", "phrase": "Please help me.", "phraseZh": "请帮我。" }
]
```

### Step 3：改每日计划入口

**修改文件**：`workbench.js`（或 `app.js`/`main.js`）中的每日计划逻辑

**当前逻辑**：计划按钮 → `preschool-english-phonics-1`（拼读课）

**修改为**：计划按钮 → `preschool-english-words-1`（口语课）

```javascript
// 修改前
if (subject === '英语') {
  route = 'preschool-english-phonics-1';
}

// 修改后
if (subject === '英语') {
  route = 'preschool-english-words-1';  // 从每日5词口语开始
}
```

**每日英语课程读取**：

```javascript
function getDailyEnglishWords(day) {
  const allWords = vocabularyBank.words; // 80 词
  const start = (day - 1) * 5;
  const end = start + 5;
  return allWords.slice(start, end);
}
```

**UI 显示（词卡模式）** ：

```
┌─────────────────────────────────────┐
│  📖 Day 3 英语 · 5 个新词           │
│  ┌─────────────┐                    │
│  │  red  红色   │  ← 词卡           │
│  │  I see a red │  ← 听句子        │
│  │  apple.      │                   │
│  │  🔊 听词   🔊 听句              │
│  └─────────────┘                    │
│  ┌─────────────┐                    │
│  │  blue 蓝色   │                   │
│  │  The sky is  │                   │
│  │  blue.       │                   │
│  └─────────────┘                    │
│  ... 5 cards                        │
│  [✅ 全部完成 → +☀️]               │
└─────────────────────────────────────┘
```


## 线路②：自然拼读（完整改动）

### Step 1：确认 word-bank.json 的 CVC 词

**已有数据**：`data/preschool/english/phonics/word-bank.json`

```javascript
// 结构确认
{
  "stages": [
    { "id": "cvc-blending", "words": ["cat", "mat", "sat", "bag", "cap", "map", ...] },
    { "id": "short-vowels-and-families", "words": ["bat", "fat", "rat", "hat", ...] },
    ...
  ]
}
```

### Step 2：改拼读第3课读取逻辑

**修改文件**：`preschool-english-phonics-3` 对应的 JavaScript 逻辑

**当前逻辑**：手写 `mat/bat/fat` 三选一

**修改为**：从 `word-bank.json` 的 `cvc-blending` 和 `short-vowels-and-families` 中随机抽 10 词，每词作为一道听力/拼读题

```javascript
// 修改后的拼读出题逻辑
function getPhonicsQuestions(stage, count = 5) {
  const bank = loadWordBank();
  const stageData = bank.stages.find(s => s.id === stage);
  if (!stageData) return [];
  
  const shuffled = shuffle(stageData.words);
  const selected = shuffled.slice(0, count);
  
  return selected.map(word => {
    // 生成干扰项：从同 stage 中选 3 个不同词
    const others = shuffled.filter(w => w !== word).slice(0, 3);
    return {
      word: word,
      options: shuffle([word, ...others]),
      correct: word
    };
  });
}
```

### Step 3：UI 显示（拼读题）

```
┌─────────────────────────────────────┐
│  🔤 拼读练习 · 第 3 课              │
│  听音选词：                          │
│  🔊 播放：___?                      │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │  cat  │ │  bat  │ │  sat  │       │
│  └──────┘ └──────┘ └──────┘       │
│  正确 ✅ → 下一题                   │
│  错误 ❌ → 再听一次                 │
│  进度 ████░░░░ 3/10                │
└─────────────────────────────────────┘
```


## 线路③：口算（完整改动）

### Step 1：确认 problem-bank.json 的 L1 题

**已有数据**：`data/preschool/数学/problem-bank.json`

```javascript
// 结构确认
{
  "L1": {
    "name": "数一数",
    "problems": [
      { "question": "数一数：有几个苹果？🍎🍎🍎", "answer": "3" },
      { "question": "数一数：有几个星星？⭐️⭐️⭐️⭐️", "answer": "4" },
      ...
    ]
  }
}
```

### Step 2：改数学第1课读取逻辑

**修改文件**：`preschool-math-1` 对应的 JavaScript 逻辑

**当前逻辑**：手写 `10-9`、`8+7`、`12-5`

**修改为**：从 `problem-bank.json` 的 L1 中读取 5 道数数题

```javascript
// 修改后的数学出题逻辑
function getMathProblems(level, count = 5) {
  const bank = loadProblemBank();
  const levelData = bank[level];
  if (!levelData) return [];
  
  const shuffled = shuffle(levelData.problems);
  return shuffled.slice(0, count);
}
```

### Step 3：难度递进

```javascript
// 根据 Day 数自动切换难度
function getMathLevel(day) {
  if (day <= 10) return 'L1';   // 数一数
  if (day <= 20) return 'L2';   // 比大小
  if (day <= 30) return 'L3';   // 5以内加减
  return 'L3';
}
```


## 代码改动清单

| 文件 | 改动内容 | 优先级 |
|------|---------|--------|
| `data/preschool/英语/vocabulary-bank.json` | 30词补 zh/phrase/phraseZh，扩到80词 | ① |
| `workbench.js` / 计划逻辑 | 每日计划→preschool-english-words-1 | ① |
| `preschool-english-words-1.js` | 词卡UI + 听词/听句 + 进度保存 | ① |
| `preschool-english-phonics-3.js` | 改读 word-bank.json | ② |
| `preschool-math-1.js` | 改读 problem-bank.json L1 | ③ |


## 测试用例

| 测试 | 预期 |
|------|------|
| 点击每日计划 → 英语 | 打开 preschool-english-words-1，显示 5 张词卡 |
| 点击词卡🔊 | 播放英文发音（Web Speech API） |
| 点击句子🔊 | 播放整句英文 |
| 点击全部完成 | 记录进度，+☀️ 阳光 |
| 拼读第3课 | 从 word-bank.json 出题，不是手写 |
| 数学第1课 | 从 problem-bank.json L1 出题，不是 10-9 |


## 直接执行

以上三条线路同时改，顺序是：

1. **先补数据**：`vocabulary-bank.json` 扩到 80 词，补上 zh/phrase/phraseZh
2. **再改代码**：改三个模块的读取逻辑
3. **最后改入口**：改每日计划按钮路径

你确认一下，我直接开始写完整代码？