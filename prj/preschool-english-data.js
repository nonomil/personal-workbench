(function (global) {
    'use strict';

    const DAILY_LOOP = [
        { text: 'you', zh: '你', theme: '表达', phrase: 'Did you sleep well?', phraseZh: '你睡得好吗？', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'me', zh: '我', theme: '表达', phrase: 'Let me tell you a story.', phraseZh: '我给你讲个故事吧。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'we', zh: '我们', theme: '表达', phrase: 'Where are we going today?', phraseZh: '我们今天去哪儿？', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'my', zh: '我的', theme: '高频词', phrase: 'Hold my hand.', phraseZh: '拉着我的手。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'go', zh: '走', theme: '动作', phrase: 'Let\'s go to school!', phraseZh: '我们去上学吧！', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'see', zh: '看见', theme: '表达', phrase: 'I see a cat.', phraseZh: '我看见一只猫。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'look', zh: '看', theme: '动作', phrase: 'Look at me!', phraseZh: '看我！', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'play', zh: '玩', theme: '动作', phrase: 'Let\'s play together!', phraseZh: '我们一起玩吧！', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'run', zh: '跑', theme: '动作', phrase: 'I can run fast.', phraseZh: '我跑得很快。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'jump', zh: '跳', theme: '动作', phrase: 'Jump up high.', phraseZh: '跳得高高的。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'come', zh: '来', theme: '动作', phrase: 'May I come in?', phraseZh: '我可以进来吗？', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'help', zh: '帮助', theme: '动作', phrase: 'Help me, please.', phraseZh: '请帮帮我。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'big', zh: '大', theme: '描述', phrase: 'A big dog runs.', phraseZh: '一只大狗在跑。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'little', zh: '小的', theme: '描述', phrase: 'I see a little cat.', phraseZh: '我看见一只小猫。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'up', zh: '向上', theme: '描述', phrase: 'Good morning! Time to get up!', phraseZh: '早上好！该起床啦！', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'down', zh: '向下', theme: '描述', phrase: 'Sit down, please.', phraseZh: '请坐下。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'red', zh: '红色', theme: '颜色', phrase: 'It\'s red.', phraseZh: '它是红色的。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'blue', zh: '蓝色', theme: '颜色', phrase: 'The sky is blue.', phraseZh: '天空是蓝色的。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'yellow', zh: '黄色', theme: '颜色', phrase: 'The sun looks yellow.', phraseZh: '太阳看起来是黄色的。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'one', zh: '一', theme: '描述', phrase: 'I have one book.', phraseZh: '我有一本书。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'two', zh: '二', theme: '描述', phrase: 'I see two birds.', phraseZh: '我看见两只鸟。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'three', zh: '三', theme: '描述', phrase: 'I have three apples.', phraseZh: '我有三个苹果。', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'can', zh: '能', theme: '高频词', phrase: 'You can do it!', phraseZh: '你一定能行！', source: 'Dolch Pre-Primer', level: 'L1' },
        { text: 'eat', zh: '吃', theme: '动作', phrase: 'Eat your vegetables, please.', phraseZh: '请吃蔬菜。', source: 'Dolch Primer', level: 'L1' },
        { text: 'please', zh: '请', theme: '表达', phrase: 'Wash your face, please.', phraseZh: '请洗脸。', source: 'Dolch Primer', level: 'L1' },
        { text: 'yes', zh: '是', theme: '表达', phrase: 'Yes, I like it.', phraseZh: '是的，我喜欢。', source: 'Dolch Primer', level: 'L1' },
        { text: 'no', zh: '不', theme: '表达', phrase: 'It\'s okay, no problem.', phraseZh: '没关系，没问题。', source: 'Dolch Primer', level: 'L1' },
        { text: 'good', zh: '好', theme: '高频词', phrase: 'Good morning! Time to get up!', phraseZh: '早上好！该起床啦！', source: 'Dolch Primer', level: 'L1' },
        { text: 'thank', zh: '谢谢', theme: '表达', phrase: 'Thank you!', phraseZh: '谢谢你！', source: 'Dolch First Grade', level: 'L1' },
        { text: 'walk', zh: '走', theme: '动作', phrase: 'I walk to school.', phraseZh: '我走到学校。', source: 'Dolch First Grade', level: 'L1' },
        { text: 'stop', zh: '停', theme: '高频词', phrase: 'I know stop.', phraseZh: '我认识停。', source: 'Dolch First Grade', level: 'L1' },
        { text: 'hello', zh: '你好', theme: '表达', phrase: 'Hello, I am here.', phraseZh: '你好，我在这里。', source: '课标一年级生活词', level: 'L1' },
        { text: 'goodbye', zh: '再见', theme: '表达', phrase: 'Goodbye, see you.', phraseZh: '再见，回头见。', source: '课标一年级生活词', level: 'L1' },
        { text: 'mom', zh: '妈妈', theme: '生活', phrase: 'My mom is here.', phraseZh: '我的妈妈在这里。', source: '课标一年级生活词', level: 'L1' },
        { text: 'dad', zh: '爸爸', theme: '生活', phrase: 'My dad is here.', phraseZh: '我的爸爸在这里。', source: '课标一年级生活词', level: 'L1' },
        { text: 'baby', zh: '宝宝', theme: '生活', phrase: 'The baby is cute.', phraseZh: '宝宝很可爱。', source: '课标一年级生活词', level: 'L1' },
        { text: 'boy', zh: '男孩', theme: '学校', phrase: 'Good boy / good girl!', phraseZh: '好孩子！', source: '课标一年级生活词', level: 'L1' },
        { text: 'girl', zh: '女孩', theme: '学校', phrase: 'Good boy / good girl!', phraseZh: '好孩子！', source: '课标一年级生活词', level: 'L1' },
        { text: 'friend', zh: '朋友', theme: '生活', phrase: 'You are my friend.', phraseZh: '你是我的朋友。', source: '课标一年级生活词', level: 'L1' },
        { text: 'family', zh: '家人', theme: '生活', phrase: 'I love my family.', phraseZh: '我爱我的家人。', source: '课标一年级生活词', level: 'L1' },
        { text: 'drink', zh: '喝', theme: '动作', phrase: 'Drink some water.', phraseZh: '喝点水。', source: '课标一年级生活词', level: 'L1' },
        { text: 'sleep', zh: '睡觉', theme: '动作', phrase: 'Did you sleep well?', phraseZh: '你睡得好吗？', source: '课标一年级生活词', level: 'L1' },
        { text: 'apple', zh: '苹果', theme: '食物', phrase: 'I like this apple.', phraseZh: '我喜欢这个苹果。', source: '课标一年级生活词', level: 'L1' },
        { text: 'milk', zh: '牛奶', theme: '食物', phrase: 'Do you want some milk?', phraseZh: '你想喝点牛奶吗？', source: '课标一年级生活词', level: 'L1' },
        { text: 'water', zh: '水', theme: '食物', phrase: 'Drink some water.', phraseZh: '喝点水。', source: '课标一年级生活词', level: 'L1' },
        { text: 'cake', zh: '蛋糕', theme: '食物', phrase: 'I love cake.', phraseZh: '我喜欢蛋糕。', source: '课标一年级生活词', level: 'L1' },
        { text: 'bread', zh: '面包', theme: '食物', phrase: 'I like bread.', phraseZh: '我喜欢面包。', source: '课标一年级生活词', level: 'L1' },
        { text: 'egg', zh: '鸡蛋', theme: '食物', phrase: 'I eat an egg.', phraseZh: '我吃一个鸡蛋。', source: '课标一年级生活词', level: 'L1' },
        { text: 'juice', zh: '果汁', theme: '食物', phrase: 'I drink juice.', phraseZh: '我喝果汁。', source: '课标一年级生活词', level: 'L1' },
        { text: 'sun', zh: '太阳', theme: '自然', phrase: 'The sun is big.', phraseZh: '太阳很大。', source: '课标一年级生活词', level: 'L1' },
        { text: 'moon', zh: '月亮', theme: '自然', phrase: 'I see the moon.', phraseZh: '我看见月亮。', source: '课标一年级生活词', level: 'L1' },
        { text: 'rain', zh: '雨', theme: '自然', phrase: 'The rain is falling.', phraseZh: '下雨了。', source: '课标一年级生活词', level: 'L1' },
        { text: 'tree', zh: '树', theme: '生活', phrase: 'Big tree.', phraseZh: '大树', source: '课标一年级生活词', level: 'L1' },
        { text: 'flower', zh: '花', theme: '生活', phrase: 'Beautiful flower.', phraseZh: '美丽的花', source: '课标一年级生活词', level: 'L1' },
        { text: 'book', zh: '书', theme: '物品', phrase: 'I read a book.', phraseZh: '我在看书。', source: '课标一年级生活词', level: 'L1' },
        { text: 'school', zh: '学校', theme: '生活', phrase: 'Let\'s go to school!', phraseZh: '我们去上学吧！', source: '课标一年级生活词', level: 'L1' },
        { text: 'home', zh: '家', theme: '生活', phrase: 'Let\'s go home.', phraseZh: '我们回家吧。', source: '课标一年级生活词', level: 'L1' },
        { text: 'car', zh: '小汽车', theme: '物品', phrase: 'The car is red.', phraseZh: '这辆小汽车是红色的。', source: '课标一年级生活词', level: 'L1' },
        { text: 'bus', zh: '公交车', theme: '物品', phrase: 'The bus is yellow.', phraseZh: '公交车是黄色的。', source: '课标一年级生活词', level: 'L1' },
        { text: 'ball', zh: '球', theme: '物品', phrase: 'Do you want to play ball?', phraseZh: '你想玩球吗？', source: '课标一年级生活词', level: 'L1' },
        { text: 'bike', zh: '自行车', theme: '物品', phrase: 'I ride a bike.', phraseZh: '我骑自行车。', source: '课标一年级生活词', level: 'L1' },
        { text: 'train', zh: '火车', theme: '物品', phrase: 'The train is long.', phraseZh: '火车很长。', source: '课标一年级生活词', level: 'L1' },
        { text: 'hat', zh: '帽子', theme: '物品', phrase: 'I wear a hat.', phraseZh: '我戴一顶帽子。', source: '课标一年级生活词', level: 'L1' },
        { text: 'shoe', zh: '鞋子', theme: '物品', phrase: 'Put on your shoe.', phraseZh: '穿上你的鞋子。', source: '课标一年级生活词', level: 'L1' },
        { text: 'bag', zh: '书包', theme: '物品', phrase: 'This is my bag.', phraseZh: '这是我的书包。', source: '课标一年级生活词', level: 'L1' },
        { text: 'bed', zh: '床', theme: '物品', phrase: 'It\'s time to go to bed.', phraseZh: '该睡觉啦。', source: '课标一年级生活词', level: 'L1' },
        { text: 'chair', zh: '椅子', theme: '物品', phrase: 'I sit on the chair.', phraseZh: '我坐在椅子上。', source: '课标一年级生活词', level: 'L1' },
        { text: 'hand', zh: '手', theme: '身体', phrase: 'Hold my hand.', phraseZh: '拉着我的手。', source: '课标一年级生活词', level: 'L1' },
        { text: 'eye', zh: '眼睛', theme: '身体', phrase: 'Close one eye.', phraseZh: '闭上眼睛。', source: '课标一年级生活词', level: 'L1' },
        { text: 'ear', zh: '耳朵', theme: '身体', phrase: 'Touch your ear.', phraseZh: '摸摸你的耳朵。', source: '课标一年级生活词', level: 'L1' },
        { text: 'mouth', zh: '嘴巴', theme: '身体', phrase: 'Open your mouth.', phraseZh: '张开你的嘴巴。', source: '课标一年级生活词', level: 'L1' },
        { text: 'nose', zh: '鼻子', theme: '身体', phrase: 'Touch your nose.', phraseZh: '摸摸你的鼻子。', source: '课标一年级生活词', level: 'L1' },
        { text: 'happy', zh: '开心', theme: '描述', phrase: 'I am happy.', phraseZh: '我很高兴。', source: '课标一年级生活词', level: 'L1' },
        { text: 'hot', zh: '热', theme: '高频词', phrase: 'It\'s very hot.', phraseZh: '天气很热。', source: '课标一年级生活词', level: 'L1' },
        { text: 'cold', zh: '冷', theme: '高频词', phrase: 'It\'s very cold.', phraseZh: '天气很冷。', source: '课标一年级生活词', level: 'L1' },
        { text: 'morning', zh: '早上', theme: '生活', phrase: 'Good morning! Time to get up!', phraseZh: '早上好！该起床啦！', source: '课标一年级生活词', level: 'L1' },
        { text: 'cat', zh: '猫', theme: '动物', phrase: 'I have a black cat.', phraseZh: '我有一只黑猫。', source: '课标一年级生活词', level: 'L1' },
        { text: 'dog', zh: '狗', theme: '动物', phrase: 'The dog can run.', phraseZh: '小狗会跑。', source: '课标一年级生活词', level: 'L1' },
        { text: 'bird', zh: '鸟', theme: '动物', phrase: 'A bird can fly.', phraseZh: '小鸟会飞。', source: '课标一年级生活词', level: 'L1' },
        { text: 'fish', zh: '鱼', theme: '动物', phrase: 'I see a little fish.', phraseZh: '我看见一条小鱼。', source: '课标一年级生活词', level: 'L1' }
    ];

    function normalize(item) {
        const text = String(item && item.text || '').trim().toLowerCase();
        return {
            id: 'daily-' + text,
            kind: 'english',
            text: text,
            zh: String(item && item.zh || '').trim(),
            theme: String(item && item.theme || 'daily').trim(),
            phrase: String(item && item.phrase || '').trim(),
            phraseZh: String(item && item.phraseZh || '').trim(),
            source: String(item && item.source || '').trim(),
            level: String(item && item.level || 'L1').trim() || 'L1'
        };
    }

    function getDailyLoopBank(runtimeBank) {
        const byText = {};
        (Array.isArray(runtimeBank) ? runtimeBank : []).forEach(function (row) {
            if (row && row.text) byText[String(row.text).toLowerCase()] = row;
        });
        return DAILY_LOOP.map(normalize).map(function (row) {
            const hit = byText[row.text];
            const merged = hit
                ? Object.assign({}, hit, {
                    source: row.source,
                    phrase: hit.phrase || row.phrase,
                    phraseZh: hit.phraseZh || row.phraseZh,
                    zh: hit.zh || row.zh
                })
                : row;
            const image = String((merged.media && merged.media.image) || merged.image || '').trim()
                || ('assets/img/vocab/' + merged.text + '.svg');
            merged.image = image;
            merged.media = Object.assign({}, merged.media || {}, { image: image, art: (merged.media && merged.media.art) || merged.art || '', audio: (merged.media && merged.media.audio) || merged.audio || '' });
            return merged;
        }).filter(function (item) {
            return item.text && item.zh && item.phrase && item.phraseZh;
        });
    }

    global.PersonalWorkbenchEnglishDailyData = {
        size: 3,
        bank: DAILY_LOOP.map(normalize),
        getDailyLoopBank: getDailyLoopBank
    };
})(typeof window !== 'undefined' ? window : globalThis);
