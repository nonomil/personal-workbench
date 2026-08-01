(function (global) {
    'use strict';

    const adultPages = {
        overview: { title: '概览', eyebrow: 'TODAY / OVERVIEW', heading: '今天，做一点可持续的进步', description: '把最重要的一步先做完，剩下的交给节奏。' },
        plans: { title: '今日计划', eyebrow: 'TODAY / PLAN', heading: '今天要完成什么', description: '只保留今天真正值得完成的几件事。' },
        tasks: { title: '成长任务', eyebrow: 'WORKSPACE / TASKS', heading: '把正在推进的事看清楚', description: '任务有方向、进度和下一步，才会慢慢变轻。' },
        reading: { title: '阅读记录', eyebrow: 'INPUT / READING', heading: '把输入变成自己的积累', description: '记录时间，也留下真正值得回看的内容。' },
        goals: { title: '长期目标', eyebrow: 'DIRECTION / GOALS', heading: '给长期目标一个可见的进度', description: '目标不用每天催促，但需要经常被看见。' },
        life: { title: '生活分区', eyebrow: 'LIFE OS / AREAS', heading: '把生活也放进工作台', description: '学习、健身、护肤和生活清单，按自己的节奏轻量维护。' },
        archive: { title: '归档与统计', eyebrow: 'LIFE OS / ARCHIVE', heading: '看见已经完成的时间', description: '完成的事项自动沉淀，年度统计只用来理解节奏，不用制造压力。' },
        family: { title: '家庭互动', eyebrow: 'FAMILY / FEEDBACK', heading: '把一句鼓励送到对方那里', description: '家长可以留下鼓励和约定，孩子也能分享今天完成的事。' },
        reviews: { title: '每周复盘', eyebrow: 'REFLECT / REVIEW', heading: '把经历整理成下一步', description: '记下发生了什么，再决定下一步怎么做。' },
        account: { title: '账号与同步', eyebrow: 'ACCOUNT / SYNC', heading: '把本地工作台带到另一台设备', description: '登录现有自托管服务，按孩子档案上传或恢复快照。' },
        settings: { title: '偏好设置', eyebrow: 'WORKBENCH / SETTINGS', heading: '让工作台更贴合你的节奏', description: '管理语言、本地数据和导入导出，不影响离线使用。' }
    };

    const childPages = {
        overview: { title: '今天', eyebrow: 'TODAY / CHECK-IN', heading: '今天，完成三件小事', description: '先打卡，再玩耍；每一步都算数。' },
        growth: { title: '成长地图', eyebrow: 'GROW / ADVENTURE', heading: '让阳光、植物和星芒一起长大', description: '完成真实行动，照顾自己的小花园，也为星芒解锁新造型。' },
        plans: { title: '今日打卡', eyebrow: 'TODAY / CHECK-IN', heading: '今天的成长清单', description: '把学习、运动和自己的小习惯排成一条清楚的路线。' },
        tasks: { title: '学习任务', eyebrow: 'LEARN / MISSIONS', heading: '把学习任务变成小关卡', description: '拖动进度，记录已经走到哪一步。' },
        mistakes: { title: '错题本', eyebrow: 'LEARN / REVIEW', heading: '把卡住的题变成下一次会做', description: '记录错因和正确思路，复习时只看最需要的几道。' },
        courses: { title: '语数英课程', eyebrow: 'LEARN / COURSES', heading: '每天推进一小节，三门课都看得见', description: '语文、数学、英语各自有小课节，完成一节就留下一个成长脚印。' },
        reading: { title: '阅读记录', eyebrow: 'READ / JOURNAL', heading: '把读过的故事留下来', description: '记下书名、页数和最喜欢的一句话。' },
        goals: { title: '成长目标', eyebrow: 'GROW / BADGES', heading: '给想坚持的事一枚徽章', description: '目标可以很小，持续完成就会越来越亮。' },
        rewards: { title: '奖励中心', eyebrow: 'GROW / REWARDS', heading: '用阳光换一个期待', description: '完成真实的学习和生活行动，再选择一个值得期待的小奖励。' },
        family: { title: '家长互动', eyebrow: 'FAMILY / SHARE', heading: '把今天的成长分享给家长', description: '看到鼓励，也让家长知道你今天完成了什么。' },
        account: { title: '账号与同步', eyebrow: 'ACCOUNT / SYNC', heading: '在自己的设备上继续成长', description: '登录现有自托管服务，和家庭共享同一份快照。' },
        reviews: { title: '成长日记', eyebrow: 'REFLECT / DIARY', heading: '今天的自己有什么发现', description: '写下一件做得好的事，再给明天留一个小提示。' }
    };

    const preschoolPages = {
        overview: { title: '首页', eyebrow: 'HOME / GARDEN', heading: '今天点亮六项', description: '选一张图，完成一小步。' },
        calendar: { title: '日历打卡', eyebrow: 'CHECK-IN / CALENDAR', heading: '每天走过的路，都有小绿点', description: '完成任务会留下打卡记录，回头看看自己的坚持。' },
        battle: { title: '植物大战', eyebrow: 'PLAY / DEFENSE', heading: '植物伙伴，准备发射', description: '完成小任务收集豌豆能量，守护自己的阳光花园。' },
        growth: { title: '花园基地', eyebrow: 'GARDEN / GROW', heading: '我的小花园', description: '阳光、植物和星芒一起长大。' },
        plans: { title: '学习任务', eyebrow: 'TODAY / QUESTS', heading: '今天做什么', description: '做完一项，就点亮一颗星。' },
        courses: { title: '课程资源', eyebrow: 'LEARN / LIBRARY', heading: '识字、拼音、古诗、数学都在这里', description: '把参考站里的学习分区整理成自己的资源卡和小题目。' },
        mistakes: { title: '改错本', eyebrow: 'TRY AGAIN', heading: '再试一次', description: '不会的题，和家长一起看看。' },
        rewards: { title: '奖励商城', eyebrow: 'SUN / SHOP', heading: '阳光换礼物', description: '攒阳光，选一个小期待。' },
        family: { title: '家长互动', eyebrow: 'FAMILY', heading: '告诉家长', description: '把今天的小成就分享出去。' },
        account: { title: '设置', eyebrow: 'SETTINGS', heading: '家长设置', description: '账号和多设备同步。' }
    };

    const variants = {
        adult: {
            id: 'adult',
            name: '成人成长工作台',
            shortName: '成长工作台',
            englishName: 'ADULT GROWTH WORKBENCH',
            path: '../成人成长工作台/index.html',
            switchIcon: 'layout-dashboard',
            switchTone: 'orange',
            switchSummary: '计划、阅读、目标与复盘',
            avatar: '我',
            statusNote: '本地快照 · 独立保存',
            storageKey: 'petbank_huchuliang_adult_workbench_state_v1',
            heroSrc: '../assets/generated/workbench-hero-adult.webp',
            heroAlt: '深色桌面上的空白笔记本与专注工具',
            pageMeta: adultPages,
            actions: { 'add-plan': '添加今日计划', 'add-task': '添加成长任务', 'add-life-entry': '添加生活记录', 'add-milestone': '添加截止/考试', 'add-habit': '添加习惯', 'add-family': '写家庭互动', 'add-review': '添加每周复盘' }
        },
        child: {
            id: 'child',
            name: '儿童学习工作台',
            shortName: '学习工作台',
            englishName: 'CHILD LEARNING WORKBENCH',
            path: '../儿童学习工作台/index.html',
            switchIcon: 'book-open',
            switchTone: 'blue',
            switchSummary: '语数英、错题、奖励与互动',
            avatar: '星',
            statusNote: '本地快照 · 家长可备份',
            storageKey: 'petbank_huchuliang_child_workbench_state_v1',
            heroSrc: '../assets/generated/workbench-hero-child.webp',
            heroAlt: '明亮学习桌上的书本、彩色便签与成长徽章',
            pageMeta: childPages,
            childRewards: [
                { id: 'reward-story-choice', title: '今晚选一个故事', description: '今天的睡前故事由你来选。', cost: 40, icon: 'book-open', tone: 'blue' },
                { id: 'reward-family-choice', title: '周末活动提案', description: '提出一个周末活动，和家人一起讨论。', cost: 80, icon: 'sparkles', tone: 'orange' },
                { id: 'reward-family-time', title: '专属亲子时间', description: '兑换一次由你选择的亲子时光。', cost: 120, icon: 'heart-handshake', tone: 'lime' }
            ],
            childCourses: [
                { id: 'chinese', title: '语文', description: '阅读、表达和文字观察', icon: 'book-open', tone: 'orange', lessons: [{ id: 'course-chinese-1', title: '找出一句拟人句', minutes: 15 }, { id: 'course-chinese-2', title: '读一段故事并说出感受', minutes: 20 }, { id: 'course-chinese-3', title: '写下今天的新词', minutes: 10 }] },
                { id: 'math', title: '数学', description: '口算、图形和生活中的数字', icon: 'calculator', tone: 'blue', lessons: [{ id: 'course-math-1', title: '完成两位数口算', minutes: 15 }, { id: 'course-math-2', title: '找出身边的三种图形', minutes: 10 }, { id: 'course-math-3', title: '用数字记录一次购物', minutes: 15 }] },
                { id: 'english', title: '英语', description: '词卡、句子和听说输入', icon: 'languages', tone: 'lime', lessons: [{ id: 'course-english-1', title: '复习 20 张词卡', minutes: 20 }, { id: 'course-english-2', title: '读出五个完整句子', minutes: 15 }, { id: 'course-english-3', title: '写下三个今天会用的词', minutes: 10 }] }
            ],
            actions: { 'add-plan': '添加打卡项', 'add-task': '添加学习任务', 'add-mistake': '记录错题', 'add-reading': '记录阅读', 'add-goal': '添加成长目标', 'add-family': '分享今日成长', 'add-review': '写成长日记' }
        },
        preschool: {
            id: 'preschool',
            name: '植物大战暑假作业台',
            shortName: '植物大战',
            englishName: 'SUN GARDEN ADVENTURE',
            path: '../preschool-workbench/index.html',
            switchIcon: 'sprout',
            switchTone: 'lime',
            switchSummary: '大图打卡、花园、收集与奖励',
            assetBase: '../assets/generated/preschool/',
            avatar: '芽',
            statusNote: '本地快照 · 家长可备份',
            storageKey: 'petbank_huchuliang_preschool_workbench_state_v1',
            heroSrc: '../assets/generated/preschool/preschool-garden-hero.webp',
            heroAlt: '阳光花园里的植物伙伴和星星',
            pageMeta: preschoolPages,
            childRewards: [
                { id: 'preschool-reward-sticker', title: '选一张贴纸', description: '挑一张喜欢的贴纸，贴到成长本上。', tier: '小奖励', cost: 20, icon: 'stamp', tone: 'blue' },
                { id: 'preschool-reward-story', title: '选故事', description: '今晚选一本喜欢的故事。', tier: '开心奖励', cost: 40, icon: 'book-open', tone: 'orange' },
                { id: 'preschool-reward-play', title: '选游戏', description: '和家人玩一个小游戏。', tier: '开心奖励', cost: 60, icon: 'gamepad-2', tone: 'lime' },
                { id: 'preschool-reward-family', title: '亲子时光', description: '和家人一起做喜欢的事。', tier: '亲子奖励', cost: 80, icon: 'heart-handshake', tone: 'pink' },
                { id: 'preschool-reward-adventure', title: '周末小探险', description: '和家长一起去公园走一圈。', tier: '特别奖励', cost: 120, icon: 'map', tone: 'gold' }
            ],
            childCourses: [
                {
                    id: 'preschool-literacy',
                    title: '识字专区',
                    description: '今天学 10 个汉字，按自然、植物、动物慢慢认。',
                    icon: 'book-open',
                    tone: 'orange',
                    badge: '684 字启蒙字库',
                    note: '参考页里是自动分配 10 字 + 分类字库，这里整理成自己的识字路线。',
                    highlights: ['今日 10 字', '自然 / 植物 / 动物', '学会 15 字解锁下一阶'],
                    samples: ['坡 pō', '始 shǐ', '游 yóu'],
                    lessons: [
                        { id: 'preschool-chinese-1', title: '今日识字 10 字', minutes: 10, meta: '坡、始、游、她、店…', tip: '完成后点亮“完成今日识字”', activity: { mode: 'choice', prompt: '“坡”怎么读？', hint: '想想 p 开头的音。', options: ['pō', 'bō', 'mā'], answer: 0, optionIcons: ['languages', 'book-open', 'sparkles'], success: '会认“坡”啦！' } },
                        { id: 'preschool-literacy-2', title: '分类认字', minutes: 8, meta: '自然 / 植物 / 动物', tip: '先认一类，再扩展到下一类', activity: { mode: 'choice', prompt: '下面哪个是植物？', hint: '植物会在土地里生长。', options: ['花', '猫', '山'], answer: 0, optionIcons: ['flower-2', 'heart', 'tree-pine'], success: '找到植物啦！' } },
                        { id: 'preschool-literacy-3', title: '字库复习', minutes: 10, meta: '684 字启蒙字库', tip: '学会上一阶 15 字再解锁下一阶', activity: { mode: 'choice', prompt: '“游”字在哪个词里？', hint: '想想在水里玩。', options: ['游泳', '月亮', '安静'], answer: 0, optionIcons: ['droplets', 'moon', 'sparkles'], success: '词语配对成功！' } }
                    ]
                },
                {
                    id: 'preschool-pinyin',
                    title: '拼音专区',
                    description: '从声母开始，跟读、顺口溜和发音练习一起做。',
                    icon: 'languages',
                    tone: 'blue',
                    badge: '23 个声母',
                    note: '把参考页的“全套拼音学习”压缩成更适合幼儿版的三张大卡。',
                    highlights: ['声母', '单韵母 / 复韵母', '整体认读'],
                    samples: ['b p m f', 'd t n l', 'zh ch sh r'],
                    lessons: [
                        { id: 'preschool-pinyin-1', title: '声母跟读', minutes: 10, meta: 'b p m f d t n l', tip: '先听，再跟着读一遍', activity: { mode: 'choice', prompt: '“广播”的声母是哪一个？', hint: '广播 b，山坡 p。', options: ['b', 'p', 'm'], answer: 0, optionIcons: ['languages', 'book-open', 'sparkles'], success: '声母找对啦！' } },
                        { id: 'preschool-pinyin-2', title: '顺口溜记忆', minutes: 8, meta: '广播 b，山坡 p', tip: '用顺口溜记住发音位置', activity: { mode: 'choice', prompt: '“山坡 p”要选哪个声母？', hint: '嘴唇轻轻闭上再打开。', options: ['p', 't', 'l'], answer: 0, optionIcons: ['languages', 'target', 'sparkle'], success: '顺口溜记住啦！' } },
                        { id: 'preschool-pinyin-3', title: '发音小游戏', minutes: 10, meta: '轻短发音练习', tip: '点一下，和家长一起纠正口型', activity: { mode: 'choice', prompt: '跟读练习前，先做什么？', hint: '先听清楚，再开口。', options: ['听一遍', '马上乱点', '关灯'], answer: 0, optionIcons: ['book-open', 'play', 'moon'], success: '准备好跟读啦！' } }
                    ]
                },
                {
                    id: 'preschool-poetry',
                    title: '古诗专区',
                    description: '一关 10 首，从《静夜思》开始，朗读、跟读、会背一句。',
                    icon: 'book-open',
                    tone: 'pink',
                    badge: '每关 10 首',
                    note: '参考页里是古诗关卡，这里保留“朗读 + 跟读 + 过关”的节奏。',
                    highlights: ['《静夜思》', '朗读 / 跟读', '学会上关 3 首解锁下一关'],
                    samples: ['床前明月光', '举头望明月', '低头思故乡'],
                    lessons: [
                        { id: 'preschool-poetry-1', title: '朗读一首古诗', minutes: 10, meta: '从《静夜思》开始', tip: '完成后点亮“朗读一首古诗”', activity: { mode: 'choice', prompt: '“举头望明月”里望什么？', hint: '夜空里亮亮的东西。', options: ['明月', '大树', '小船'], answer: 0, optionIcons: ['moon', 'tree-pine', 'sparkles'], success: '诗句读懂啦！' } },
                        { id: 'preschool-poetry-2', title: '跟读一句', minutes: 8, meta: '听一句，学一句', tip: '先学会节奏，再学解释', activity: { mode: 'choice', prompt: '诗人先看到了什么？', hint: '就在床前。', options: ['床前月光', '小河', '花朵'], answer: 0, optionIcons: ['moon', 'droplets', 'flower-2'], success: '画面想起来啦！' } },
                        { id: 'preschool-poetry-3', title: '记住诗意', minutes: 10, meta: '一句诗 + 一个画面', tip: '会背一句也算过关', activity: { mode: 'choice', prompt: '《静夜思》的最后一句是？', hint: '想念自己的家乡。', options: ['低头思故乡', '春风吹又生', '一岁一枯荣'], answer: 0, optionIcons: ['book-marked', 'sprout', 'trees'], success: '诗意记住啦！' } }
                    ]
                },
                {
                    id: 'preschool-math',
                    title: '数学专区',
                    description: '10 以内加减和 20 以内进退位，像闯关一样做口算。',
                    icon: 'calculator',
                    tone: 'blue',
                    badge: '10 / 20 以内闯关',
                    note: '保留参考页“换一题、闯一关”的节奏，改成更轻的任务卡。',
                    highlights: ['10 以内加减', '20 以内进退位', '换一题'],
                    samples: ['10 - 9 = ?', '8 + 7 = ?', '12 - 5 = ?'],
                    lessons: [
                        { id: 'preschool-math-1', title: '数学闯关一关', minutes: 10, meta: '完成 1 题就算过关', tip: '完成后点亮“数学闯关一关”', activity: { mode: 'choice', prompt: '10 - 9 = ?', hint: '从 10 个里拿走 9 个。', options: ['1', '2', '0'], answer: 0, optionIcons: ['calculator', 'plus', 'circle-check'], success: '第一关答对啦！' } },
                        { id: 'preschool-math-2', title: '10 以内加减', minutes: 8, meta: '先快算，再核对', tip: '用手指或小物件辅助', activity: { mode: 'choice', prompt: '8 + 7 = ?', hint: '先凑成 10，再加剩下的。', options: ['15', '14', '16'], answer: 0, optionIcons: ['calculator', 'plus', 'circle-check'], success: '口算很棒！' } },
                        { id: 'preschool-math-3', title: '20 以内挑战', minutes: 10, meta: '进位 / 退位', tip: '不会就换一题继续', activity: { mode: 'choice', prompt: '12 - 5 = ?', hint: '12 个拿走 5 个。', options: ['7', '8', '6'], answer: 0, optionIcons: ['calculator', 'plus', 'circle-check'], success: '挑战过关啦！' } }
                    ]
                },
                {
                    id: 'preschool-focus',
                    title: '专注力训练',
                    description: '找不同、迷宫、数数、规律、逻辑，练一题也算完成。',
                    icon: 'sparkles',
                    tone: 'gold',
                    badge: '5 类训练',
                    note: '参考页是题型切换式训练，这里保留题型感，不把页面做得太复杂。',
                    highlights: ['找不同', '迷宫 / 数数', '规律 / 逻辑'],
                    samples: ['🍊🍎🍊', '走迷宫', '找规律'],
                    lessons: [
                        { id: 'preschool-focus-1', title: '专注力训练一题', minutes: 10, meta: '找不同 / 迷宫 / 规律', tip: '完成后点亮“专注力训练一题”', activity: { mode: 'choice', prompt: '哪一行不一样？', hint: '看看中间那个图形。', options: ['○ △ ○', '○ ○ ○', '○ △ ○'], answer: 1, optionIcons: ['target', 'circle-check', 'sparkles'], success: '观察得真仔细！' } },
                        { id: 'preschool-focus-2', title: '找不同', minutes: 8, meta: '圈出不一样的那个', tip: '先慢慢看，再动手', activity: { mode: 'choice', prompt: '找不同前，先做什么？', hint: '慢慢看，才不会漏掉。', options: ['慢慢看', '马上乱点', '闭上眼'], answer: 0, optionIcons: ['target', 'play', 'circle-check'], success: '专注小眼睛上线啦！' } },
                        { id: 'preschool-focus-3', title: '规律小游戏', minutes: 10, meta: '下一步会是什么', tip: '说出来，再选答案', activity: { mode: 'choice', prompt: '○ △ ○ △ 之后是什么？', hint: '圆形和三角形轮流出现。', options: ['○', '△', '□'], answer: 0, optionIcons: ['circle-check', 'sparkle', 'target'], success: '规律找到了！' } }
                    ]
                },
                {
                    id: 'preschool-english',
                    title: '每日英语',
                    description: '每天 5 个单词，带图片、例句和跟读，先会说出来。',
                    icon: 'languages',
                    tone: 'lime',
                    badge: '每日 5 个单词',
                    note: '保留参考页“自动分配 5 词 + 例句”的节奏，让英语页更像单词卡盒。',
                    highlights: ['动物 / 食物 / 数字', '图片 + 例句', '15 词解锁下一阶'],
                    samples: ['wolf 狼', 'pig 猪', 'bread 面包'],
                    lessons: [
                        { id: 'preschool-english-1', title: '学习今日英语', minutes: 8, meta: '今天的 5 个单词', tip: '完成后点亮“学习今日英语”', activity: { mode: 'choice', prompt: 'wolf 是什么？', hint: '它是一种会嚎叫的动物。', options: ['狼', '猫', '鱼'], answer: 0, optionIcons: ['trees', 'heart', 'droplets'], success: '单词认对啦！' } },
                        { id: 'preschool-english-2', title: '跟读一句短句', minutes: 8, meta: 'I see a cat.', tip: '先听，再大声说出来', activity: { mode: 'choice', prompt: 'I see a cat. 里有谁？', hint: 'cat 是小猫。', options: ['cat', 'sun', 'book'], answer: 0, optionIcons: ['heart', 'sun', 'book-open'], success: '短句听懂啦！' } },
                        { id: 'preschool-english-3', title: '按阶段复习', minutes: 10, meta: '启蒙 / 进阶 / 挑战', tip: '学会 15 词再开下一阶', activity: { mode: 'choice', prompt: 'bread 是什么？', hint: '早餐里软软香香的食物。', options: ['面包', '水', '树'], answer: 0, optionIcons: ['book-open', 'droplets', 'tree-pine'], success: '词义记住啦！' } }
                    ]
                },
                {
                    id: 'preschool-exercise',
                    title: '每日运动',
                    description: '参考页有 10 个居家动作，这里保留动作清单和开始按钮节奏。',
                    icon: 'heart',
                    tone: 'green',
                    badge: '10 个动作',
                    note: '把开合跳、深蹲、跳绳、放松这些动作整理成可点亮的运动卡。',
                    highlights: ['开合跳', '深蹲 / 高抬腿', '跳绳 / 放松'],
                    samples: ['开合跳', '深蹲', '跳绳'],
                    lessons: [
                        { id: 'preschool-exercise-1', title: '做一项运动', minutes: 15, meta: '居家运动 15 分钟', tip: '完成后点亮“做一项运动”', activity: { mode: 'choice', prompt: '开始运动前先做什么？', hint: '先把身体慢慢活动开。', options: ['热身', '吃糖', '躺下'], answer: 0, optionIcons: ['sparkles', 'flame', 'moon'], success: '运动准备完成啦！' } },
                        { id: 'preschool-exercise-2', title: '热身拉伸', minutes: 8, meta: '先动开，再开始', tip: '运动前后都做一遍', activity: { mode: 'choice', prompt: '深蹲时脚要怎样？', hint: '双脚稳稳踩在地上。', options: ['稳稳站好', '跳到桌上', '闭眼走路'], answer: 0, optionIcons: ['tree-pine', 'sparkles', 'moon'], success: '动作记得很安全！' } },
                        { id: 'preschool-exercise-3', title: '体能小游戏', minutes: 10, meta: '跳一跳 / 慢跑 / 静蹲', tip: '选最喜欢的一项继续', activity: { mode: 'choice', prompt: '运动后要做什么？', hint: '让身体慢慢安静下来。', options: ['放松喝水', '马上睡觉', '一直不动'], answer: 0, optionIcons: ['droplets', 'moon', 'shield-check'], success: '运动收尾完成啦！' } }
                    ]
                }
            ],
            actions: { 'add-plan': '加一项', 'add-task': '加任务', 'add-mistake': '记下来', 'add-family': '告诉家长' }
        }
    };

    const body = typeof document !== 'undefined' ? document.body : null;
    const variantId = body && body.dataset && body.dataset.workbenchVariant ? body.dataset.workbenchVariant : 'adult';
    const selected = variants[variantId] || variants.adult;
    const configuredStorageKey = body && body.dataset && body.dataset.storageKey ? body.dataset.storageKey : '';
    const configuredHeroSrc = body && body.dataset && body.dataset.heroSrc ? body.dataset.heroSrc : '';
    const launcher = global.PersonalWorkbenchLauncher;

    if (launcher && typeof launcher.remember === 'function') launcher.remember(selected.id);

    global.PersonalWorkbenchConfig = {
        variant: selected.id,
        current: Object.assign({}, selected, {
            storageKey: configuredStorageKey || selected.storageKey,
            heroSrc: configuredHeroSrc || selected.heroSrc
        }),
        variants: variants,
        pageMeta: selected.pageMeta,
        actions: selected.actions,
        childRewards: selected.childRewards || [],
        childCourses: selected.childCourses || []
    };

    if (!body) return;
    body.classList.add(`variant-${selected.id}`);
    document.title = selected.name;
    const labelMap = {
        '.brand strong': selected.name,
        '.brand small': selected.englishName,
        '.sidebar-section-label': selected.id === 'preschool' ? '小小路线' : selected.id === 'child' ? '学习路线' : '工作台',
        '.topbar-context strong': selected.pageMeta.overview.title,
        '.mode-status strong': '本地模式',
        '.mode-status small': selected.statusNote,
        '.sidebar-footnote': selected.id === 'preschool' ? 'v0.3.4 · 幼儿版' : selected.id === 'child' ? 'v0.2 · 儿童版' : 'v0.2 · 成人版',
        '.avatar': selected.avatar
    };
    Object.keys(labelMap).forEach(function (selector) {
        const element = document.querySelector(selector);
        if (element) element.textContent = labelMap[selector];
    });
    document.querySelectorAll('.nav-item').forEach(function (item) {
        const page = item.dataset.page;
        const span = item.querySelector('span');
        const course = item.dataset.courseId && selected.childCourses
            ? selected.childCourses.find(function (entry) { return entry.id === item.dataset.courseId; })
            : null;
        if (span && course) span.textContent = course.title;
        else if (span && selected.pageMeta[page]) span.textContent = selected.pageMeta[page].title;
    });
    const focusLabel = document.querySelector('.topbar-focus-button span');
    if (focusLabel && selected.id === 'child') focusLabel.textContent = '记录学习';
    if (focusLabel && selected.id === 'preschool') focusLabel.textContent = '开始学习';

    const topbarActions = document.querySelector('.topbar-actions');
    if (topbarActions && !topbarActions.querySelector('.topbar-workbench-switcher')) {
        const switcher = document.createElement('details');
        switcher.className = 'topbar-workbench-switcher';
        const summary = document.createElement('summary');
        summary.className = 'topbar-mode-link';
        summary.title = '切换工作台';
        summary.setAttribute('aria-label', '切换工作台');
        summary.innerHTML = '<i data-lucide="layout-dashboard"></i><span>切换工作台</span>';
        const menu = document.createElement('div');
        menu.className = 'topbar-workbench-menu';
        Object.keys(variants).forEach(function (id) {
            const item = variants[id];
            const link = document.createElement('a');
            link.className = `topbar-workbench-option ${id === selected.id ? 'is-current' : ''}`;
            link.href = launcher && typeof launcher.getSiblingPath === 'function' ? launcher.getSiblingPath(selected.id, id) : (item.path || '../');
            link.dataset.workbenchVariant = id;
            if (id === selected.id) link.setAttribute('aria-current', 'page');
            link.innerHTML = `<i data-lucide="${item.switchIcon || 'layout-dashboard'}"></i><span><strong>${item.name}</strong><small>${item.switchSummary || item.statusNote || ''}</small></span>${id === selected.id ? '<b>当前</b>' : ''}`;
            menu.appendChild(link);
        });
        switcher.append(summary, menu);
        topbarActions.insertBefore(switcher, topbarActions.firstChild);
    }
})(typeof window !== 'undefined' ? window : globalThis);
