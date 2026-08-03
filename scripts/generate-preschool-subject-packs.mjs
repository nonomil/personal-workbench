import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const preschoolDataRoot = path.join(root, 'data', 'preschool');
const preschoolAssetRoot = path.join(root, 'assets', 'generated', 'preschool');
const tmpRoot = path.join(root, 'tmp');

const source = { kind: 'project-original', license: 'project-original', attribution: '个人工作台幼儿课程组' };
const reviewRules = {
    version: 1,
    reviewIntervalsDays: [1, 3, 7, 14],
    masteryStates: ['introduced', 'practicing', 'ready', 'maintenance'],
    readyRule: { minimumActivities: 2, minimumDistinctDates: 2, minimumAccuracy: 0.8, activityTypesMustDiffer: true },
    errorPolicy: { storeIn: 'mistakes', retryBeforeNewLesson: true, sunlightDeduction: 0, speechRecognitionRequired: false },
    source
};

const sharedLessonFields = (definition, day, stage, seed, stageDay) => ({
    id: `${definition.id}-day-${String(day).padStart(2, '0')}`,
    routeId: definition.id,
    subject: definition.subject,
    day,
    stageId: stage.id,
    title: `第${day}天 · ${seed.title}`,
    objective: seed.objective,
    activityType: seed.activityType,
    durationMin: seed.durationMin ?? 8,
    activity: {
        prompt: seed.prompt,
        options: seed.options ?? [],
        answer: seed.answer ?? null,
        success: seed.success ?? '完成一次尝试，花园收到一束阳光。'
    },
    fourSteps: {
        warmup: stage.warmup[stageDay % stage.warmup.length],
        teach: seed.teach,
        practice: seed.practice,
        apply: seed.apply
    },
    evidence: seed.evidence,
    reviewTags: seed.reviewTags,
    reward: { source: 'existing-preschool-activity', kind: 'core', duplicatePolicy: 'canonical-event-id' },
    source
});

const stage = (id, start, end, title, focus, warmup, seeds) => ({ id, days: [start, end], title, focus, warmup, seeds });

const definitions = [
    {
        id: 'preschool-hanzi', subject: 'hanzi', folder: '识字', title: '识字小路', description: '从生活里看见字、听见字、理解字。', parentRoute: 'preschool-chinese', lessonDurationMin: { min: 5, max: 8 },
        stages: [
            stage('self-and-family', 1, 10, '我和家人', ['我', '你', '人', '手'], ['看图说一说“我”', '找一找家人的动作'], [
                { title: '找到“我”', objective: '能在两张字卡中找到“我”。', activityType: 'image-character-match', prompt: '哪张字卡是“我”？', options: ['我', '你'], answer: 0, teach: '用镜子和自画像解释“我”。', practice: '在两张卡里找“我”，再换位置。', apply: '指着自己说一次“我”。', evidence: ['pointed-character', 'said-word'], reviewTags: ['我'] },
                { title: '认识“你”', objective: '能在对话场景中认出“你”。', activityType: 'role-character-choice', prompt: '我对着谁说“你”？', options: ['伙伴', '太阳'], answer: 0, teach: '用两个人的对话示范“你”。', practice: '给人物卡配“你”。', apply: '和家长互指说“我/你”。', evidence: ['matched-scene', 'spoke-word'], reviewTags: ['我', '你'] },
                { title: '找“人”', objective: '能把“人”与人物图片配对。', activityType: 'character-picture-match', prompt: '哪张图里有“人”？', options: ['人物', '花朵'], answer: 0, teach: '观察“人”的字形和人物站立图。', practice: '找字、找图各一次。', apply: '在绘本封面找一个人。', evidence: ['matched-image', 'found-in-book'], reviewTags: ['人'] },
                { title: '手在哪里', objective: '能认出“手”并做出动作。', activityType: 'character-action', prompt: '用哪只手和“手”字打招呼？', options: ['手', '脚'], answer: 0, teach: '摸手、看字、听读音。', practice: '字卡和身体部位配对。', apply: '用手完成一次收拾。', evidence: ['matched-body', 'completed-action'], reviewTags: ['手'] },
                { title: '我和你复习', objective: '能区分“我/你/人”。', activityType: 'mixed-character-review', prompt: '指一指“你”。', options: ['我', '你', '人'], answer: 1, teach: '用人物小剧场复习三字。', practice: '连续完成三次指认。', apply: '说一句“我和你”。', evidence: ['selected-character', 'said-phrase'], reviewTags: ['我', '你', '人'] }
            ]),
            stage('nature-and-direction', 11, 20, '自然与方向', ['日', '月', '天', '山', '水'], ['看窗外说天气', '用手指天空'], [
                { title: '太阳和“日”', objective: '能把“日”与太阳图配对。', activityType: 'nature-character-match', prompt: '太阳旁边是哪一个字？', options: ['日', '月'], answer: 0, teach: '看太阳图，朗读“日”。', practice: '找“日”并拖到太阳下。', apply: '今天找一次太阳。', evidence: ['matched-nature', 'found-character'], reviewTags: ['日'] },
                { title: '月亮和“月”', objective: '能认出“月”并说出月亮。', activityType: 'nature-character-match', prompt: '月亮是哪一个字？', options: ['月', '山'], answer: 0, teach: '用夜空图解释“月”。', practice: '月亮图与字卡配对。', apply: '晚上和家长找月亮。', evidence: ['matched-nature', 'parent-observation'], reviewTags: ['月', '日'] },
                { title: '天空的“天”', objective: '能在自然图中找到“天”。', activityType: 'scene-character-match', prompt: '天空上方放哪个字？', options: ['水', '天'], answer: 1, teach: '手指天空，连接“天”的意义。', practice: '在云朵场景中找字。', apply: '说“今天的天”。', evidence: ['selected-character', 'spoke-phrase'], reviewTags: ['天', '日', '月'] },
                { title: '山和水', objective: '能区分“山”和“水”。', activityType: 'character-picture-match', prompt: '哪一个字配小河？', options: ['山', '水'], answer: 1, teach: '用山和河两张图做对比。', practice: '交换图卡再配一次。', apply: '画一座山和一条水。', evidence: ['matched-image', 'drew-scene'], reviewTags: ['山', '水'] },
                { title: '自然字复习', objective: '能混合认出日、月、天、山、水。', activityType: 'mixed-character-review', prompt: '把“山”放到山图上。', options: ['水', '山', '月'], answer: 1, teach: '用五张图卡快速回顾。', practice: '完成五次配对。', apply: '选择最喜欢的自然字。', evidence: ['matched-five', 'made-choice'], reviewTags: ['日', '月', '天', '山', '水'] }
            ]),
            stage('quantity-and-color', 21, 30, '数量与颜色', ['大', '小', '多', '少', '红', '绿'], ['比较两盘物品', '找一找颜色'], [
                { title: '大和小', objective: '能把“大/小”与物品大小配对。', activityType: 'size-character-match', prompt: '哪一个是“大”？', options: ['大', '小'], answer: 0, teach: '用大球和小球示范。', practice: '交换物品后再次判断。', apply: '在家找一个大物品。', evidence: ['matched-size', 'found-object'], reviewTags: ['大', '小'] },
                { title: '更多和更少', objective: '能认出“多/少”的生活意义。', activityType: 'quantity-character-match', prompt: '哪一盘水果更多？', options: ['多', '少'], answer: 0, teach: '数两盘水果后连接字义。', practice: '看图选多/少。', apply: '分零食时说多或少。', evidence: ['compared-quantity', 'said-relation'], reviewTags: ['多', '少'] },
                { title: '红色的“红”', objective: '能把“红”与红色物品配对。', activityType: 'color-character-match', prompt: '哪张卡是“红”？', options: ['红', '绿'], answer: 0, teach: '用红花示范颜色和字。', practice: '找红色物品并点字。', apply: '在家找一个红色物品。', evidence: ['matched-color', 'found-object'], reviewTags: ['红'] },
                { title: '绿色的“绿”', objective: '能把“绿”与叶子配对。', activityType: 'color-character-match', prompt: '叶子旁边放哪个字？', options: ['红', '绿'], answer: 1, teach: '观察花园里的绿色。', practice: '绿字和叶子配对。', apply: '给花园植物浇水。', evidence: ['matched-color', 'garden-action'], reviewTags: ['绿', '红'] },
                { title: '数量颜色复习', objective: '能混合识别大、小、多、少、红、绿。', activityType: 'mixed-character-review', prompt: '选择“少”。', options: ['多', '少', '大'], answer: 1, teach: '用一组混合图卡复习。', practice: '完成六次快速选择。', apply: '说一个“红色的小东西”。', evidence: ['mixed-review', 'made-sentence'], reviewTags: ['大', '小', '多', '少', '红', '绿'] }
            ]),
            stage('animals-and-actions', 31, 40, '动物与动作', ['猫', '狗', '鱼', '花', '吃', '看'], ['听动物叫声', '做一个动作'], [
                { title: '小猫找“猫”', objective: '能把“猫”与猫的图片配对。', activityType: 'animal-character-match', prompt: '哪张卡是“猫”？', options: ['猫', '狗'], answer: 0, teach: '看猫图、听猫叫、读“猫”。', practice: '猫图和猫字互换配对。', apply: '模仿猫走路。', evidence: ['matched-animal', 'acted-animal'], reviewTags: ['猫'] },
                { title: '小狗找“狗”', objective: '能认出“狗”并模仿动作。', activityType: 'animal-character-match', prompt: '哪张图是狗？', options: ['鱼', '狗'], answer: 1, teach: '用狗图和动作示范。', practice: '字图配对两轮。', apply: '说“狗会走”。', evidence: ['matched-animal', 'said-action'], reviewTags: ['狗', '猫'] },
                { title: '小鱼和“鱼”', objective: '能把“鱼”与水中场景配对。', activityType: 'animal-character-match', prompt: '水里是哪一个字？', options: ['花', '鱼'], answer: 1, teach: '看水和鱼的关系。', practice: '把鱼字拖到水中。', apply: '画一条鱼。', evidence: ['matched-scene', 'drew-animal'], reviewTags: ['鱼'] },
                { title: '动作“吃”和“看”', objective: '能用动作区分“吃/看”。', activityType: 'action-character-match', prompt: '拿勺子是什么动作？', options: ['吃', '看'], answer: 0, teach: '用玩具食物演示吃和看。', practice: '看动作选字。', apply: '饭前说一次“吃”。', evidence: ['matched-action', 'used-in-life'], reviewTags: ['吃', '看'] },
                { title: '动物动作复习', objective: '能混合识别动物和动作字。', activityType: 'mixed-character-review', prompt: '找到“鱼”，再做游泳动作。', options: ['鱼', '狗', '吃'], answer: 0, teach: '把动物和动作混在一起复习。', practice: '完成四次字图动作配对。', apply: '选一个最喜欢的动物。', evidence: ['mixed-review', 'acted-choice'], reviewTags: ['猫', '狗', '鱼', '吃', '看'] }
            ]),
            stage('mixed-life-reading', 41, 50, '生活短语', ['家', '门', '书', '学', '画', '唱'], ['翻开一本书', '看看家里的门'], [
                { title: '回到“家”', objective: '能把“家”与房屋图配对。', activityType: 'life-character-match', prompt: '哪一个字是家？', options: ['家', '门'], answer: 0, teach: '从家人和房屋连接“家”。', practice: '房屋图和“家”字配对。', apply: '说“回家”。', evidence: ['matched-home', 'said-phrase'], reviewTags: ['家', '人'] },
                { title: '打开“门”', objective: '能认出“门”并完成开门动作。', activityType: 'life-character-action', prompt: '打开门前找哪个字？', options: ['书', '门'], answer: 1, teach: '观察门的形状和动作。', practice: '开门图与字配对。', apply: '找家中一扇门。', evidence: ['matched-object', 'found-object'], reviewTags: ['门'] },
                { title: '我的“书”', objective: '能把“书”与绘本配对。', activityType: 'book-character-match', prompt: '哪一个字配绘本？', options: ['书', '画'], answer: 0, teach: '摸书、翻页、读“书”。', practice: '从三张字卡中找书。', apply: '翻开一本书看一页。', evidence: ['matched-book', 'read-page'], reviewTags: ['书'] },
                { title: '学、画、唱', objective: '能把三个动作字和活动图配对。', activityType: 'activity-character-match', prompt: '画画时选哪个字？', options: ['唱', '画', '学'], answer: 1, teach: '用三个活动场景示范。', practice: '逐图选择字。', apply: '完成一幅小画。', evidence: ['matched-activity', 'created-work'], reviewTags: ['学', '画', '唱'] },
                { title: '生活字小书', objective: '能从生活字中选择并说一个短语。', activityType: 'mixed-character-review', prompt: '选择“家”，组成“回家”。', options: ['家', '书', '门'], answer: 0, teach: '复习生活字并示范短语。', practice: '选择字卡组成短语。', apply: '给家长读自己的小短语。', evidence: ['made-phrase', 'read-to-parent'], reviewTags: ['家', '门', '书', '学', '画', '唱'] }
            ]),
            stage('transfer-and-review', 51, 60, '混合迁移', ['我', '日', '大', '猫', '家', '书'], ['快速找一个旧字', '看图猜今天的字'], [
                { title: '我的错字小队', objective: '能复习个人错字中的一个字。', activityType: 'mistake-review', prompt: '从错字卡里找今天要练的字。', options: ['复习字', '新字'], answer: 0, teach: '展示个人复习队列并给出线索。', practice: '完成两轮错字配图。', apply: '在生活中找这个字。', evidence: ['reviewed-mistake', 'found-in-life'], reviewTags: ['mistake-queue'] },
                { title: '字和图的旅行', objective: '能在新场景中识别已学字。', activityType: 'transfer-character-match', prompt: '公园图里找“花”。', options: ['花', '书', '门'], answer: 0, teach: '说明同一个字会出现在不同画面。', practice: '在三张新图中找字。', apply: '和家长一起拍/指出一个字。', evidence: ['transferred-character', 'parent-observation'], reviewTags: ['花', '生活迁移'] },
                { title: '字卡小剧场', objective: '能用三张字卡说一个短语。', activityType: 'character-phrase', prompt: '用“我、看、书”说一句话。', options: ['我看书', '书看我'], answer: 0, teach: '用字卡排出短语。', practice: '交换顺序再排一次。', apply: '真的看一页书。', evidence: ['ordered-phrase', 'completed-life-action'], reviewTags: ['我', '看', '书'] },
                { title: '我会认的字', objective: '能从混合卡片中选出 8 个熟悉字。', activityType: 'mastery-review', prompt: '挑出你认识的字。', options: ['自由选择'], answer: null, teach: '解释“认识就是能指出来”。', practice: '完成八张卡的自主选择。', apply: '告诉家长最喜欢的一个字。', evidence: ['selected-known-cards', 'explained-choice'], reviewTags: ['mixed-review'] },
                { title: '识字花园毕业卡', objective: '能展示一个字、一个词和一个生活应用。', activityType: 'portfolio-showcase', prompt: '选择一个字完成你的识字卡。', options: ['选择一个已学字'], answer: null, teach: '示范字、词、图三部分。', practice: '完成个人小卡。', apply: '给家长展示并记录下一步。', evidence: ['created-card', 'showed-to-parent'], reviewTags: ['mastery-transfer'] }
            ])
        ],
        bankFile: 'character-bank.json', bank: [
            ['我', 'wǒ', 'self', ['我爱家']], ['你', 'nǐ', 'self', ['你和我']], ['人', 'rén', 'self', ['人们']], ['手', 'shǒu', 'body', ['小手']], ['口', 'kǒu', 'body', ['开口']], ['眼', 'yǎn', 'body', ['眼睛']], ['日', 'rì', 'nature', ['日出']], ['月', 'yuè', 'nature', ['月亮']], ['天', 'tiān', 'nature', ['今天']], ['山', 'shān', 'nature', ['大山']], ['水', 'shuǐ', 'nature', ['喝水']], ['大', 'dà', 'quantity', ['大树']], ['小', 'xiǎo', 'quantity', ['小花']], ['多', 'duō', 'quantity', ['很多']], ['少', 'shǎo', 'quantity', ['很少']], ['红', 'hóng', 'color', ['红花']], ['绿', 'lǜ', 'color', ['绿叶']], ['猫', 'māo', 'animal', ['小猫']], ['狗', 'gǒu', 'animal', ['小狗']], ['鱼', 'yú', 'animal', ['小鱼']], ['花', 'huā', 'nature', ['花朵']], ['吃', 'chī', 'action', ['吃饭']], ['看', 'kàn', 'action', ['看书']], ['家', 'jiā', 'life', ['回家']], ['门', 'mén', 'life', ['开门']], ['书', 'shū', 'life', ['读书']], ['学', 'xué', 'action', ['学习']], ['画', 'huà', 'action', ['画画']], ['唱', 'chàng', 'action', ['唱歌']], ['跳', 'tiào', 'action', ['跳舞']]]
    },
    {
        id: 'preschool-math', subject: 'math', folder: '数学', title: '数学探险路', description: '先数一数、摆一摆，再走进数量和算式。', parentRoute: 'preschool-math', lessonDurationMin: { min: 6, max: 10 },
        stages: [
            stage('counting-correspondence', 1, 10, '一一对应', ['1-3', '点数', '一样多'], ['数手指', '给植物放水滴'], [
                { title: '数出 1 个', objective: '能从 1 个物品中找到数量 1。', activityType: 'count-and-select', prompt: '请给花朵 1 颗阳光。', options: ['1', '2'], answer: 0, teach: '逐个点数并停在 1。', practice: '给三朵花分别放 1 颗阳光。', apply: '在家找 1 个圆形物品。', evidence: ['one-to-one-count', 'selected-count'], reviewTags: ['count-1'] },
                { title: '数出 2 个', objective: '能一一对应 2 个物品。', activityType: 'count-and-select', prompt: '哪一盘有 2 个果子？', options: ['1', '2', '3'], answer: 1, teach: '慢慢点数两次。', practice: '摆 2 个果子再收回。', apply: '找 2 只袜子。', evidence: ['one-to-one-count', 'built-set'], reviewTags: ['count-1', 'count-2'] },
                { title: '数出 3 个', objective: '能稳定点数 3 个物品。', activityType: 'count-and-select', prompt: '给豌豆射手 3 颗能量。', options: ['2', '3', '4'], answer: 1, teach: '手指和物品一一对应。', practice: '完成三次 3 个摆放。', apply: '找 3 个积木。', evidence: ['one-to-one-count', 'built-set'], reviewTags: ['count-3'] },
                { title: '一样多', objective: '能判断两组 1-3 个物品是否一样多。', activityType: 'compare-quantity', prompt: '哪两组一样多？', options: ['1 和 1', '1 和 2'], answer: 0, teach: '把两组物品排成对应行。', practice: '逐个配对判断。', apply: '和家长各拿同样多的积木。', evidence: ['paired-sets', 'explained-same'], reviewTags: ['same-quantity'] },
                { title: '第一关复习', objective: '能混合完成 1-3 点数和对应。', activityType: 'mixed-counting-review', prompt: '选择有 3 个的花盆。', options: ['1 个', '2 个', '3 个'], answer: 2, teach: '用三种数量快速回顾。', practice: '完成五次点数。', apply: '给植物浇 3 滴水。', evidence: ['mixed-counting', 'garden-action'], reviewTags: ['count-1', 'count-2', 'count-3'] }
            ]),
            stage('compare-and-classify', 11, 20, '比较与分类', ['更多', '更少', '大', '小', '颜色'], ['比较两盘水果', '按颜色找伙伴'], [
                { title: '找到更多', objective: '能比较两组 1-5 个物品的多少。', activityType: 'compare-quantity', prompt: '哪一盘水果更多？', options: ['2 个', '4 个'], answer: 1, teach: '先点数再比较。', practice: '交换左右位置再比较。', apply: '分水果时说“更多”。', evidence: ['counted-objects', 'selected-more'], reviewTags: ['more-less'] },
                { title: '找到更少', objective: '能比较两组物品并选择更少的一组。', activityType: 'compare-quantity', prompt: '哪一组更少？', options: ['5 个', '3 个'], answer: 1, teach: '用短线排列数量。', practice: '完成两次更多/更少判断。', apply: '找家里更少的一组东西。', evidence: ['selected-less', 'explained-relation'], reviewTags: ['more-less'] },
                { title: '大和小', objective: '能按大小把物品分到两边。', activityType: 'classify-size', prompt: '把大南瓜放到“大”篮子。', options: ['大', '小'], answer: 0, teach: '比较同类物品大小。', practice: '分类 4 个物品。', apply: '整理一个大/小玩具。', evidence: ['classified-size', 'completed-life-action'], reviewTags: ['size'] },
                { title: '颜色分类', objective: '能按颜色把物品分组。', activityType: 'classify-color', prompt: '红色的花放哪边？', options: ['红色', '蓝色'], answer: 0, teach: '展示颜色和分类篮。', practice: '分类 6 个彩色物品。', apply: '整理一盒彩笔。', evidence: ['classified-color', 'organized-items'], reviewTags: ['color-classify'] },
                { title: '比较分类复习', objective: '能混合判断数量、大小和颜色。', activityType: 'mixed-classification-review', prompt: '找出“少而小”的一组。', options: ['少而小', '多而大'], answer: 0, teach: '示范先看数量再看大小。', practice: '完成三次混合分类。', apply: '说出一个分类理由。', evidence: ['mixed-classification', 'explained-choice'], reviewTags: ['more-less', 'size', 'color-classify'] }
            ]),
            stage('compose-within-five', 21, 30, '5 以内合并', ['合起来', '加 1', '分开'], ['把两组积木靠近', '数一数花瓣'], [
                { title: '合起来是 2', objective: '能把 1 和 1 合成 2。', activityType: 'compose-quantity', prompt: '1 颗阳光加 1 颗是多少？', options: ['1', '2', '3'], answer: 1, teach: '把两颗阳光合到一个盘里。', practice: '操作两轮合并。', apply: '把两种颜色积木合在一起。', evidence: ['composed-set', 'selected-total'], reviewTags: ['compose-2'] },
                { title: '合起来是 3', objective: '能用实物表示 2 加 1。', activityType: 'compose-quantity', prompt: '2 个果子再来 1 个是多少？', options: ['2', '3', '4'], answer: 1, teach: '先数 2，再加 1。', practice: '摆放并说出总数。', apply: '给花园增加 1 朵花。', evidence: ['composed-set', 'said-total'], reviewTags: ['compose-3'] },
                { title: '合起来是 4', objective: '能用实物表示 3 加 1。', activityType: 'compose-quantity', prompt: '3 颗种子加 1 颗是多少？', options: ['3', '4', '5'], answer: 1, teach: '使用五格框表示数量。', practice: '完成 3+1 和 2+2。', apply: '收集 4 片叶子。', evidence: ['filled-five-frame', 'selected-total'], reviewTags: ['compose-4'] },
                { title: '分开看', objective: '能把 4 个物品分成两组。', activityType: 'decompose-quantity', prompt: '4 个果子可以分成哪两组？', options: ['2 和 2', '1 和 4'], answer: 0, teach: '把 4 个物品分到两个篮子。', practice: '尝试两种分法。', apply: '和家长平分 4 个小物品。', evidence: ['decomposed-set', 'shared-items'], reviewTags: ['decompose-4'] },
                { title: '5 以内合并复习', objective: '能在实物情景中完成 5 以内合并。', activityType: 'mixed-compose-review', prompt: '花园里 2 朵花又开 2 朵，一共几朵？', options: ['3', '4', '5'], answer: 1, teach: '用花园图复习合并。', practice: '完成三道合并题。', apply: '画出自己的 5 朵花。', evidence: ['composed-set', 'drew-quantity'], reviewTags: ['compose-within-five'] }
            ]),
            stage('take-away-within-five', 31, 40, '5 以内取走', ['拿走', '还剩', '前进后退'], ['从盘子里拿走一个', '棋子退一格'], [
                { title: '拿走 1 个', objective: '能理解 3 个拿走 1 个还剩 2 个。', activityType: 'take-away', prompt: '3 颗果子拿走 1 颗，还剩？', options: ['1', '2', '3'], answer: 1, teach: '真实拿走并重新点数。', practice: '完成两次取走。', apply: '整理玩具时拿走一个。', evidence: ['removed-object', 'recounted-set'], reviewTags: ['take-away-1'] },
                { title: '还剩 3 个', objective: '能理解 4 个拿走 1 个还剩 3 个。', activityType: 'take-away', prompt: '4 个阳光拿走 1 个还剩？', options: ['2', '3', '4'], answer: 1, teach: '用花盆格子展示剩余。', practice: '操作 4-1。', apply: '说出自己的剩余物品。', evidence: ['removed-object', 'said-remainder'], reviewTags: ['take-away-1'] },
                { title: '走格子', objective: '能在 5 格路线中前进或后退 1 格。', activityType: 'number-path', prompt: '小植物在 2，前进 1 格到？', options: ['1', '2', '3'], answer: 2, teach: '手指沿路线移动。', practice: '前进和后退各一次。', apply: '在地板上走 3 步。', evidence: ['moved-on-path', 'followed-direction'], reviewTags: ['number-path'] },
                { title: '取走和剩余', objective: '能在图中表示取走后的数量。', activityType: 'take-away-picture', prompt: '5 只小虫走了 2 只，还剩？', options: ['2', '3', '4'], answer: 1, teach: '划掉离开的虫再数。', practice: '完成 5-2 和 4-2。', apply: '收起两个玩具再数。', evidence: ['crossed-out-count', 'selected-remainder'], reviewTags: ['take-away-2'] },
                { title: '5 以内减法复习', objective: '能用实物或路线完成 5 以内取走。', activityType: 'mixed-take-away-review', prompt: '花园里 5 朵花，摘走 1 朵，还剩？', options: ['3', '4', '5'], answer: 1, teach: '把花朵从场景中移走。', practice: '完成三道取走题。', apply: '告诉家长还剩多少。', evidence: ['removed-object', 'explained-remainder'], reviewTags: ['take-away-within-five'] }
            ]),
            stage('within-ten-add-subtract', 41, 50, '10 以内加减', ['凑 5', '加减混合', '算式'], ['用五格框复习', '走 10 格路线'], [
                { title: '凑成 5', objective: '能找出 3 还需要几个才是 5。', activityType: 'make-five', prompt: '3 颗阳光还需要几颗到 5？', options: ['1', '2', '3'], answer: 1, teach: '用五格框补空位。', practice: '完成 2/3/4 凑 5。', apply: '收集 5 个小物品。', evidence: ['filled-frame', 'selected-complement'], reviewTags: ['make-five'] },
                { title: '6 以内加法', objective: '能用实物完成 4+2。', activityType: 'addition-with-manipulatives', prompt: '4 个果子再来 2 个是多少？', options: ['5', '6', '7'], answer: 1, teach: '两组物品合并后点数。', practice: '操作 3+2、4+2。', apply: '给家长讲合并过程。', evidence: ['composed-set', 'explained-process'], reviewTags: ['addition-within-ten'] },
                { title: '8 以内减法', objective: '能用图示完成 8-3。', activityType: 'subtraction-with-manipulatives', prompt: '8 颗种子拿走 3 颗还剩？', options: ['4', '5', '6'], answer: 1, teach: '逐个拿走并数剩下。', practice: '完成两道取走题。', apply: '整理 8 个玩具。', evidence: ['removed-object', 'selected-remainder'], reviewTags: ['subtraction-within-ten'] },
                { title: '加减选方法', objective: '能判断题目是合并还是取走。', activityType: 'operation-choice', prompt: '又来了 2 只小鸟，要用加法还是减法？', options: ['加法', '减法'], answer: 0, teach: '用“来了/走了”词语区分。', practice: '四道情景选择。', apply: '说一个“又来了”的生活例子。', evidence: ['selected-operation', 'created-example'], reviewTags: ['operation-language'] },
                { title: '10 以内闯关复习', objective: '能在图示支持下完成 10 以内加减。', activityType: 'mixed-add-subtract-review', prompt: '花园里 6 个太阳，来了 2 个，一共？', options: ['7', '8', '9'], answer: 1, teach: '混合复习加减线索。', practice: '完成五道低风险题。', apply: '选择一道给家长讲。', evidence: ['mixed-operations', 'explained-solution'], reviewTags: ['addition-within-ten', 'subtraction-within-ten'] }
            ]),
            stage('grouping-and-transfer', 51, 60, '分组与迁移', ['几组', '每组几个', '规律'], ['给植物分队', '观察重复图案'], [
                { title: '两组两个', objective: '能看出 2 组、每组 2 个。', activityType: 'repeated-groups', prompt: '这里有几组？每组几个？', options: ['2 组，每组 2 个', '4 组，每组 1 个'], answer: 0, teach: '把 4 个物品排成两组。', practice: '交换分组方式再描述。', apply: '给玩具分成两组。', evidence: ['made-groups', 'described-groups'], reviewTags: ['grouping'] },
                { title: '三组两个', objective: '能用实物表达 3 组、每组 2 个。', activityType: 'repeated-groups', prompt: '怎样摆出 3 组，每组 2 个？', options: ['6 个分三组', '3 个分两组'], answer: 0, teach: '先分组再总数。', practice: '完成两种分组。', apply: '给植物伙伴分 3 队。', evidence: ['made-groups', 'counted-total'], reviewTags: ['grouping', 'multiplication-experience'] },
                { title: '找规律', objective: '能补出简单的颜色或数量规律。', activityType: 'pattern-complete', prompt: '红、绿、红、绿，下一 个是什么？', options: ['红', '绿'], answer: 0, teach: '用重复节奏读规律。', practice: '补三组图案。', apply: '用积木做一个规律。', evidence: ['completed-pattern', 'created-pattern'], reviewTags: ['pattern'] },
                { title: '生活里的数学', objective: '能把数量、比较或分组应用到新情景。', activityType: 'transfer-math', prompt: '给 2 个小朋友每人 2 个贴纸，需要几个？', options: ['2', '4', '6'], answer: 1, teach: '画两个人和每人两个贴纸。', practice: '摆放并检查总数。', apply: '在家公平分配小物品。', evidence: ['transferred-skill', 'shared-fairly'], reviewTags: ['grouping', 'transfer'] },
                { title: '数学花园毕业卡', objective: '能选择一个会做的数学技能并展示过程。', activityType: 'portfolio-showcase', prompt: '选择你想展示的数学任务。', options: ['数一数', '合起来', '拿走', '分成小组'], answer: null, teach: '示范如何说“我先……再……”。', practice: '完成个人挑战卡。', apply: '给家长展示并记录下一步。', evidence: ['completed-choice', 'showed-process'], reviewTags: ['mixed-transfer'] }
            ])
        ],
        bankFile: 'problem-bank.json', bank: Array.from({ length: 30 }, (_, index) => ({ id: `math-problem-${String(index + 1).padStart(2, '0')}`, skillId: ['counting', 'compare', 'compose', 'take-away', 'addition', 'grouping'][index % 6], level: index < 10 ? 'L1' : index < 20 ? 'L2' : 'L3', prompt: `花园数量题 ${index + 1}`, answer: (index % 5) + 1, manipulatives: ['sun-token', 'fruit', 'plant'], source }))
    },
    {
        id: 'preschool-poetry', subject: 'poetry', folder: '古诗', title: '古诗画中游', description: '听一听、看画面、跟着节奏说一说。', parentRoute: 'preschool-poetry', lessonDurationMin: { min: 6, max: 10 },
        stages: [
            stage('listen-and-notice', 1, 10, '听见画面', ['声音', '节奏', '自然'], ['听风声', '看一幅诗中画'], [
                { title: '听见春天', objective: '能听一遍朗读并找出春天画面。', activityType: 'listen-and-scene', prompt: '诗里出现了春天吗？', options: ['出现了', '没有'], answer: 0, teach: '朗读《春晓》片段，展示春天图。', practice: '找花、鸟、雨等画面。', apply: '说一个春天声音。', evidence: ['listened', 'matched-scene'], reviewTags: ['spring'] },
                { title: '月亮在哪里', objective: '能把《静夜思》的月亮画面指出来。', activityType: 'poem-scene-match', prompt: '诗里的月亮在哪一幅图？', options: ['月亮', '太阳'], answer: 0, teach: '用夜空图解释“月”。', practice: '图文配对。', apply: '晚上找月亮。', evidence: ['matched-scene', 'parent-observation'], reviewTags: ['moon'] },
                { title: '小鹅的声音', objective: '能听出《咏鹅》的动物画面。', activityType: 'poem-animal-match', prompt: '谁在诗里唱歌？', options: ['鹅', '猫'], answer: 0, teach: '模仿鹅叫和动作。', practice: '鹅图与诗句配对。', apply: '做小鹅走路动作。', evidence: ['matched-animal', 'acted-animal'], reviewTags: ['animal'] },
                { title: '小池的水', objective: '能找出《小池》中的水和荷叶。', activityType: 'poem-nature-match', prompt: '小池旁边有什么？', options: ['荷叶', '雪山'], answer: 0, teach: '看小池画面，朗读两句。', practice: '找画面物件。', apply: '画一片荷叶。', evidence: ['matched-nature', 'drew-scene'], reviewTags: ['water', 'summer'] },
                { title: '第一组诗复习', objective: '能从四幅图中找到读过的诗意象。', activityType: 'poem-image-review', prompt: '哪幅图是《静夜思》的画面？', options: ['月夜', '春雨', '鹅群', '小池'], answer: 0, teach: '用四幅图复习。', practice: '完成四次意象选择。', apply: '选择一幅图跟读一句。', evidence: ['mixed-scene-review', 'read-with-parent'], reviewTags: ['spring', 'moon', 'animal', 'water'] }
            ]),
            stage('follow-and-order', 11, 20, '跟读与排序', ['两句', '节奏', '先后'], ['拍节奏', '听一句找下一句'], [
                { title: '两句跟读', objective: '能跟读《春晓》中的两句。', activityType: 'read-along', prompt: '跟着节奏读两句。', options: ['开始跟读'], answer: null, teach: '成人先读，孩子跟读。', practice: '慢速和正常速度各一次。', apply: '选择一个春天动作。', evidence: ['read-along', 'kept-rhythm'], reviewTags: ['spring', 'read-along'] },
                { title: '诗句排队', objective: '能按画面先后排列两张诗句卡。', activityType: 'line-order', prompt: '哪一句先出现？', options: ['第一句', '第二句'], answer: 0, teach: '用画面线索排序。', practice: '交换卡片再排一次。', apply: '说“先……再……”。', evidence: ['ordered-lines', 'used-sequence'], reviewTags: ['order'] },
                { title: '动作朗诵', objective: '能用两个动作帮助记住诗句。', activityType: 'gesture-recitation', prompt: '哪一个动作表示“看月亮”？', options: ['抬头', '跺脚'], answer: 0, teach: '示范动作和句意。', practice: '动作配诗句。', apply: '自己设计一个动作。', evidence: ['matched-gesture', 'created-gesture'], reviewTags: ['gesture'] },
                { title: '古诗声音', objective: '能分辨轻声和重读的节奏变化。', activityType: 'rhythm-choice', prompt: '哪种节奏更像轻轻的春风？', options: ['轻轻读', '大声喊'], answer: 0, teach: '示范两种朗读。', practice: '跟着节拍读。', apply: '给家长读一遍。', evidence: ['followed-rhythm', 'read-to-parent'], reviewTags: ['rhythm'] },
                { title: '跟读小复习', objective: '能选择一首诗完成跟读或动作表达。', activityType: 'poem-choice-review', prompt: '今天想读哪一首？', options: ['春晓', '静夜思', '咏鹅'], answer: null, teach: '让孩子自主选择。', practice: '完成两句跟读。', apply: '说出最喜欢的画面。', evidence: ['made-choice', 'read-or-acted'], reviewTags: ['read-along', 'choice'] }
            ]),
            stage('meaning-and-expression', 21, 30, '理解与表达', ['画面', '人物', '感受'], ['找一个诗中物件', '说说喜欢什么'], [
                { title: '诗里有什么', objective: '能从诗中找出两个物件。', activityType: 'meaning-match', prompt: '《静夜思》里能找到什么？', options: ['月亮', '书包'], answer: 0, teach: '用画面解释诗中物件。', practice: '找两个物件。', apply: '画出其中一个。', evidence: ['matched-meaning', 'drew-object'], reviewTags: ['meaning'] },
                { title: '人物的心情', objective: '能用表情选择人物心情。', activityType: 'emotion-choice', prompt: '想家时可能是什么心情？', options: ['想念', '生气'], answer: 0, teach: '用表情解释“思”。', practice: '诗句和表情配对。', apply: '说一次想念家人的话。', evidence: ['matched-emotion', 'expressed-feeling'], reviewTags: ['emotion'] },
                { title: '自然的变化', objective: '能说出诗中一个自然变化。', activityType: 'nature-change', prompt: '春天会发生什么？', options: ['花开', '雪人出现'], answer: 0, teach: '看季节图，连接诗意。', practice: '选择并说变化。', apply: '观察今天的天气。', evidence: ['selected-change', 'observed-weather'], reviewTags: ['season'] },
                { title: '画面讲故事', objective: '能用自己的话讲一幅诗画。', activityType: 'picture-retell', prompt: '看图说说发生了什么。', options: ['自由表达'], answer: null, teach: '示范“我看见……”。', practice: '说两句画面。', apply: '录/说给家长听。', evidence: ['retold-scene', 'spoke-to-parent'], reviewTags: ['retell'] },
                { title: '理解复习', objective: '能从新画面中迁移诗意象和情感。', activityType: 'mixed-meaning-review', prompt: '这幅夜空图让你想到哪首诗？', options: ['静夜思', '咏鹅', '小池'], answer: 0, teach: '复习画面、诗名和感受。', practice: '完成三组匹配。', apply: '选诗画一幅新画。', evidence: ['transferred-meaning', 'created-art'], reviewTags: ['meaning', 'retell'] }
            ]),
            stage('season-and-family', 31, 40, '季节与亲情', ['春', '夏', '秋', '亲情'], ['看季节卡', '给家人一个拥抱'], [
                { title: '春晓小侦探', objective: '能找出春晓中的两个春天线索。', activityType: 'season-clues', prompt: '哪两个是春天线索？', options: ['花和鸟', '雪和冰'], answer: 0, teach: '按画面找线索。', practice: '选择线索并朗读关键词。', apply: '找生活中的春天。', evidence: ['found-clues', 'read-keywords'], reviewTags: ['spring'] },
                { title: '小池夏日', objective: '能用一句话描述小池画面。', activityType: 'scene-description', prompt: '小池里有什么？', options: ['荷叶', '枫叶'], answer: 0, teach: '用颜色和位置描述。', practice: '完成“我看见……”句式。', apply: '画夏天的水边。', evidence: ['described-scene', 'created-art'], reviewTags: ['summer'] },
                { title: '秋天的山', objective: '能把秋天颜色和诗画配对。', activityType: 'season-match', prompt: '哪种颜色更像秋天的山？', options: ['红叶', '粉雪'], answer: 0, teach: '展示秋色和山行画面。', practice: '颜色与季节配对。', apply: '在家找秋天色彩。', evidence: ['matched-season', 'found-color'], reviewTags: ['autumn'] },
                { title: '谢谢家人', objective: '能跟读一段亲情主题诗句并表达感谢。', activityType: 'family-read-along', prompt: '今天想对谁说谢谢？', options: ['家人', '花盆'], answer: 0, teach: '解释亲情诗句的画面。', practice: '跟读和动作表达。', apply: '说一句谢谢。', evidence: ['read-along', 'expressed-thanks'], reviewTags: ['family'] },
                { title: '季节亲情复习', objective: '能选择诗句、画面或动作表达一个主题。', activityType: 'theme-review', prompt: '选择一个你想表达的主题。', options: ['春天', '夏天', '家人'], answer: null, teach: '展示三种表达方式。', practice: '完成一张主题卡。', apply: '给家长展示。', evidence: ['selected-theme', 'showed-work'], reviewTags: ['spring', 'summer', 'family'] }
            ]),
            stage('portfolio-and-review', 41, 50, '作品与复习', ['复述', '朗诵', '画面'], ['从诗名找画面', '挑一首喜欢的诗'], [
                { title: '我会找诗名', objective: '能根据画面选择对应诗名。', activityType: 'title-scene-match', prompt: '月夜画面对应哪首诗？', options: ['静夜思', '小池'], answer: 0, teach: '建立诗名和画面连接。', practice: '完成四组匹配。', apply: '说出最喜欢的诗名。', evidence: ['matched-title', 'said-title'], reviewTags: ['title'] },
                { title: '我会讲画面', objective: '能用两句话复述一幅诗画。', activityType: 'scene-retell', prompt: '说说画面里先看见什么，再看见什么。', options: ['自由表达'], answer: null, teach: '示范先后和位置词。', practice: '复述两句。', apply: '给家长讲一遍。', evidence: ['retold-two-lines', 'read-to-parent'], reviewTags: ['retell', 'order'] },
                { title: '我会打节奏', objective: '能用拍手保持诗句节奏。', activityType: 'rhythm-practice', prompt: '跟着拍手读一遍。', options: ['开始朗读'], answer: null, teach: '成人示范拍手节奏。', practice: '慢速/正常各一次。', apply: '设计自己的节奏。', evidence: ['kept-rhythm', 'created-rhythm'], reviewTags: ['rhythm'] },
                { title: '我会选作品', objective: '能从朗读、排序、画画中选择一种展示。', activityType: 'portfolio-choice', prompt: '今天用什么方式展示？', options: ['朗读', '排句子', '画画'], answer: null, teach: '解释三种展示方式。', practice: '完成一项作品。', apply: '保存到成长记录。', evidence: ['made-choice', 'created-work'], reviewTags: ['portfolio'] },
                { title: '古诗小复习', objective: '能混合完成听、看、说、画中的两项。', activityType: 'mixed-poetry-review', prompt: '选择一项完成古诗挑战。', options: ['听一首', '找画面', '说两句', '画一幅'], answer: null, teach: '回顾四种证据。', practice: '完成两项。', apply: '告诉家长下一首想学什么。', evidence: ['mixed-evidence', 'next-choice'], reviewTags: ['mixed-review'] }
            ]),
            stage('final-showcase', 51, 60, '亲子展示', ['选择', '朗读', '分享'], ['回看作品', '听一次熟悉朗读'], [
                { title: '我的最爱', objective: '能选择一首最喜欢的诗并说理由。', activityType: 'favorite-poem-choice', prompt: '你最喜欢哪首诗？', options: ['春晓', '静夜思', '咏鹅', '小池'], answer: null, teach: '示范“我喜欢……因为……”。', practice: '完成选择和理由。', apply: '告诉家长。', evidence: ['made-choice', 'gave-reason'], reviewTags: ['favorite'] },
                { title: '亲子共读', objective: '能和家长完成两句轮流朗读。', activityType: 'parent-reading', prompt: '一人一句读一读。', options: ['开始共读'], answer: null, teach: '示范轮流朗读。', practice: '完成两轮。', apply: '记录亲子阅读。', evidence: ['parent-reading', 'completed-turns'], reviewTags: ['parent-reading'] },
                { title: '诗中找数学', objective: '能在诗画中数出 1-5 个物件。', activityType: 'cross-subject-poetry-math', prompt: '画面里有几只小鸟？', options: ['1', '2', '3'], answer: 2, teach: '把诗画和点数连接。', practice: '数两幅诗画。', apply: '说出诗画中的数量。', evidence: ['counted-scene', 'connected-subjects'], reviewTags: ['transfer'] },
                { title: '我的诗画', objective: '能制作一张诗画卡并说出诗名。', activityType: 'poetry-card', prompt: '选择一首诗制作画卡。', options: ['选择一首'], answer: null, teach: '示范画面、诗名、我的话三部分。', practice: '完成卡片。', apply: '展示给家长。', evidence: ['created-card', 'showed-card'], reviewTags: ['portfolio'] },
                { title: '古诗花园毕业', objective: '能用听、读、画或讲中的两项展示成长。', activityType: 'poetry-showcase', prompt: '选择两项完成毕业展示。', options: ['听', '读', '画', '讲'], answer: null, teach: '回顾 60 日作品。', practice: '完成两项展示。', apply: '领取古诗徽章。', evidence: ['showcase-two-evidence', 'received-badge'], reviewTags: ['mastery-transfer'] }
            ])
        ],
        bankFile: 'poem-bank.json', bank: [
            { id: 'poem-chunxiao', title: '春晓', author: '孟浩然', theme: 'spring', lines: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'], source },
            { id: 'poem-jingyesi', title: '静夜思', author: '李白', theme: 'moon', lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'], source },
            { id: 'poem-yong-e', title: '咏鹅', author: '骆宾王', theme: 'animal', lines: ['鹅鹅鹅', '曲项向天歌', '白毛浮绿水', '红掌拨清波'], source },
            { id: 'poem-minnong', title: '悯农', author: '李绅', theme: 'labor', lines: ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦'], source },
            { id: 'poem-xiaochi', title: '小池', author: '杨万里', theme: 'summer', lines: ['泉眼无声惜细流', '树阴照水爱晴柔', '小荷才露尖尖角', '早有蜻蜓立上头'], source },
            { id: 'poem-shanxing', title: '山行', author: '杜牧', theme: 'autumn', lines: ['远上寒山石径斜', '白云生处有人家', '停车坐爱枫林晚', '霜叶红于二月花'], source },
            { id: 'poem-zengwanglun', title: '赠汪伦', author: '李白', theme: 'friendship', lines: ['李白乘舟将欲行', '忽闻岸上踏歌声', '桃花潭水深千尺', '不及汪伦送我情'], source },
            { id: 'poem-youziyin', title: '游子吟', author: '孟郊', theme: 'family', lines: ['慈母手中线', '游子身上衣', '临行密密缝', '意恐迟迟归'], source }
        ]
    },
    {
        id: 'preschool-english', subject: 'english', folder: '英语', title: '英语探险路', description: '听一听、说一说、读一小句。', parentRoute: 'preschool-english', lessonDurationMin: { min: 6, max: 12 },
        stages: [
            stage('listen-and-move', 1, 10, '听音和动作', ['hello', 'bye', 'stand', 'clap'], ['听一个声音', '做一个动作'], [
                { title: 'Hello 你好', objective: '能听到 hello 后挥手或跟读。', activityType: 'listen-and-move', prompt: '听到 hello 做什么？', options: ['挥手', '睡觉'], answer: 0, teach: '示范 hello 和挥手。', practice: '听三次并选择动作。', apply: '见到家人说 hello。', evidence: ['matched-command', 'spoke-word'], reviewTags: ['hello'] },
                { title: 'Bye bye', objective: '能在结束情景中使用 bye。', activityType: 'listen-and-move', prompt: '要离开时说什么？', options: ['bye', 'apple'], answer: 0, teach: '用离开场景示范 bye。', practice: '角色扮演告别。', apply: '和家长告别一次。', evidence: ['matched-situation', 'role-play'], reviewTags: ['bye'] },
                { title: 'Stand up', objective: '能听懂 stand up 并站起来。', activityType: 'listen-command', prompt: '听到 stand up 要做什么？', options: ['站起来', '坐下'], answer: 0, teach: '用身体动作演示。', practice: '站/坐指令交替。', apply: '运动前听一次。', evidence: ['followed-command', 'moved-body'], reviewTags: ['stand-up'] },
                { title: 'Clap your hands', objective: '能听懂 clap 并拍手。', activityType: 'listen-command', prompt: 'clap 是什么动作？', options: ['拍手', '跺脚'], answer: 0, teach: '示范词和动作。', practice: '跟着节奏拍手。', apply: '古诗朗读前拍两下。', evidence: ['followed-command', 'kept-rhythm'], reviewTags: ['clap'] },
                { title: '动作热身复习', objective: '能在四个指令中正确完成两个。', activityType: 'mixed-listening-review', prompt: '选择一个你会做的动作。', options: ['hello', 'bye', 'stand up', 'clap'], answer: null, teach: '回顾四个动作。', practice: '完成四轮听指令。', apply: '告诉家长最喜欢哪个。', evidence: ['followed-two-commands', 'made-choice'], reviewTags: ['hello', 'bye', 'stand-up', 'clap'] }
            ]),
            stage('theme-vocabulary', 11, 20, '主题词汇', ['red', 'blue', 'cat', 'dog', 'apple'], ['指一个颜色', '找一个动物'], [
                { title: 'Red 红色', objective: '能把 red 与红色物品配对。', activityType: 'picture-word-match', prompt: '哪一个是 red？', options: ['红色', '蓝色'], answer: 0, teach: '展示红色物品和 red。', practice: '找红色并跟读。', apply: '找家里一件 red 物品。', evidence: ['matched-color', 'repeated-word'], reviewTags: ['red'] },
                { title: 'Blue 蓝色', objective: '能把 blue 与蓝色物品配对。', activityType: 'picture-word-match', prompt: '哪一个是 blue？', options: ['红色', '蓝色'], answer: 1, teach: '展示蓝色物品和 blue。', practice: '红蓝混合选择。', apply: '找一件 blue 物品。', evidence: ['matched-color', 'found-object'], reviewTags: ['blue', 'red'] },
                { title: 'Cat 小猫', objective: '能听到 cat 后选猫图。', activityType: 'animal-word-match', prompt: 'cat 是哪一个？', options: ['猫', '狗'], answer: 0, teach: '看猫图、听 cat。', practice: '猫狗配对。', apply: '模仿猫叫。', evidence: ['matched-animal', 'acted-animal'], reviewTags: ['cat'] },
                { title: 'Dog 小狗', objective: '能听到 dog 后选狗图。', activityType: 'animal-word-match', prompt: 'dog 是哪一个？', options: ['猫', '狗'], answer: 1, teach: '看狗图、听 dog。', practice: '猫狗混合听辨。', apply: '说 dog 并做动作。', evidence: ['matched-animal', 'spoke-word'], reviewTags: ['dog', 'cat'] },
                { title: '主题词复习', objective: '能混合匹配两个颜色和两个动物词。', activityType: 'mixed-vocabulary-review', prompt: '选择你听到的词。', options: ['red', 'blue', 'cat', 'dog'], answer: null, teach: '用四张图复习。', practice: '完成四次听图配对。', apply: '选一个词放进情景。', evidence: ['mixed-vocabulary', 'made-choice'], reviewTags: ['red', 'blue', 'cat', 'dog'] }
            ]),
            stage('phonics-bridge', 21, 30, '声音和字母', ['s', 'a', 't', 'p', 'i'], ['听首音', '拍音素节奏'], [
                { title: '听见 s', objective: '能在两个声音中找出 s 的首音。', activityType: 'sound-discrimination', prompt: '哪一个词以 s 开头？', options: ['sun', 'cat'], answer: 0, teach: '示范 /s/ 和太阳图。', practice: '听三个词判断首音。', apply: '找一个 s 开头的词。', evidence: ['heard-initial-sound', 'matched-word'], reviewTags: ['s'] },
                { title: '听见 a', objective: '能听辨短 a 并跟读一个示例词。', activityType: 'grapheme-sound-match', prompt: '哪张字母卡表示目标音？', options: ['a', 'i'], answer: 0, teach: '示范 a 的短音。', practice: 'a/i 听辨。', apply: '跟读 cat 或 map。', evidence: ['matched-grapheme', 'read-cvc'], reviewTags: ['a'] },
                { title: 's-a-t 合成', objective: '能在引导下把 s-a-t 合成 sat。', activityType: 'blend-track', prompt: 's + a + t 读成什么？', options: ['sat', 'sit'], answer: 0, teach: '连续合成三个音。', practice: '拖动声音珠。', apply: '读一句短句。', evidence: ['blended-word', 'read-short-line'], reviewTags: ['s', 'a', 't', 'sat'] },
                { title: 'p-i-n 合成', objective: '能在引导下把 p-i-n 合成 pin。', activityType: 'blend-track', prompt: 'p + i + n 读成什么？', options: ['pin', 'pan'], answer: 0, teach: '示范短 i。', practice: '比较 pin/pan。', apply: '找一个 pin 的图片意义。', evidence: ['blended-word', 'matched-meaning'], reviewTags: ['p', 'i', 'n', 'pin'] },
                { title: '声音字母复习', objective: '能完成两个音-字匹配和一个 CVC 合成。', activityType: 'phonics-bridge-review', prompt: '选择今天想读的词。', options: ['sat', 'pin', 'map'], answer: null, teach: '回顾音、字、词三层关系。', practice: '完成两张卡和一个词。', apply: '跟家长读一遍。', evidence: ['matched-grapheme', 'blended-word', 'read-with-parent'], reviewTags: ['phonics-bridge'] }
            ]),
            stage('situational-speaking', 31, 40, '情景口语', ['I see', 'I like', 'This is', 'Can I'], ['看一幅场景图', '选择想说的词'], [
                { title: 'I see...', objective: '能用 I see + 图片词表达看见的东西。', activityType: 'sentence-frame', prompt: '看见猫可以怎么说？', options: ['I see a cat.', 'I see sleep.'], answer: 0, teach: '示范句型和图片。', practice: '替换 cat/dog。', apply: '在家说一次 I see。', evidence: ['used-sentence-frame', 'spoke-in-context'], reviewTags: ['I-see'] },
                { title: 'I like...', objective: '能用 I like 表达一个喜欢的物品。', activityType: 'sentence-frame', prompt: '喜欢苹果怎么说？', options: ['I like apple.', 'I am apple.'], answer: 0, teach: '用喜欢表情示范。', practice: '选择两个主题词。', apply: '说一个喜欢的颜色。', evidence: ['used-sentence-frame', 'expressed-preference'], reviewTags: ['I-like'] },
                { title: 'This is...', objective: '能用 This is 指认一个物品。', activityType: 'sentence-frame', prompt: '指着书怎么说？', options: ['This is a book.', 'Book is run.'], answer: 0, teach: '示范指认句型。', practice: '书、花、球轮换。', apply: '给家长介绍一个物品。', evidence: ['used-sentence-frame', 'introduced-object'], reviewTags: ['This-is'] },
                { title: 'Can I?', objective: '能在游戏中用 Can I? 请求一次。', activityType: 'role-play-request', prompt: '想要一个贴纸怎么说？', options: ['Can I have a sticker?', 'I sticker.'], answer: 0, teach: '用请求和回应示范。', practice: '角色扮演请求。', apply: '礼貌请求一个小物品。', evidence: ['role-play', 'used-request'], reviewTags: ['Can-I'] },
                { title: '情景口语复习', objective: '能从四个句型中选择一个完成情景表达。', activityType: 'mixed-speaking-review', prompt: '选择一个你想说的句型。', options: ['I see', 'I like', 'This is', 'Can I'], answer: null, teach: '回顾四个句型。', practice: '完成一轮角色扮演。', apply: '和家长说完整一句。', evidence: ['selected-frame', 'spoke-full-sentence'], reviewTags: ['speaking-transfer'] }
            ]),
            stage('story-and-transfer', 41, 50, '故事和迁移', ['beginning', 'middle', 'end', 'meaning'], ['看故事三张图', '预测下一幅图'], [
                { title: '故事开头', objective: '能按图片说出故事开始发生了什么。', activityType: 'story-sequence', prompt: '第一幅图发生了什么？', options: ['开始', '结束'], answer: 0, teach: '示范 first/begin。', practice: '图片排序。', apply: '讲给家长听。', evidence: ['ordered-story', 'retold-scene'], reviewTags: ['story-order'] },
                { title: '故事中间', objective: '能用一张图片描述故事中间动作。', activityType: 'story-description', prompt: '小伙伴正在做什么？', options: ['play', 'sleep'], answer: 0, teach: '用 play 和场景示范。', practice: '选择动作词。', apply: '做相同动作。', evidence: ['matched-action', 'acted-story'], reviewTags: ['story-action'] },
                { title: '故事结尾', objective: '能根据结尾图选择结果。', activityType: 'story-ending', prompt: '故事最后他们做了什么？', options: ['go home', 'start'], answer: 0, teach: '用结尾图解释结果。', practice: '三图排序和选择。', apply: '说 goodbye。', evidence: ['ordered-story', 'used-goodbye'], reviewTags: ['story-ending'] },
                { title: '听故事找词', objective: '能在故事中找出一个已学主题词。', activityType: 'story-word-hunt', prompt: '故事里出现了哪种动物？', options: ['cat', 'tree'], answer: 0, teach: '朗读短故事并停顿。', practice: '找词和配图。', apply: '说 I see a cat。', evidence: ['found-word-in-story', 'used-sentence-frame'], reviewTags: ['cat', 'story'] },
                { title: '故事复习', objective: '能完成听、说、看中的两项故事任务。', activityType: 'mixed-story-review', prompt: '选择两项完成故事挑战。', options: ['排序', '说一句', '找一个词'], answer: null, teach: '回顾故事三段式。', practice: '完成两项。', apply: '记录最喜欢的角色。', evidence: ['mixed-story-evidence', 'made-choice'], reviewTags: ['story-transfer'] }
            ]),
            stage('final-english-showcase', 51, 60, '英语小展示', ['listen', 'speak', 'read', 'choose'], ['回顾熟悉词', '听一遍自己的录音/朗读'], [
                { title: '我的主题词', objective: '能选择并说出 3 个熟悉主题词。', activityType: 'vocabulary-showcase', prompt: '选择三个你会说的词。', options: ['red', 'cat', 'apple', 'blue'], answer: null, teach: '示范主题词卡展示。', practice: '完成三词选择和跟读。', apply: '给家长说一遍。', evidence: ['selected-three-words', 'spoke-to-parent'], reviewTags: ['vocabulary-transfer'] },
                { title: '我的一句话', objective: '能选择一个句型完成口语表达。', activityType: 'sentence-showcase', prompt: '选择一个句型。', options: ['I see', 'I like', 'This is', 'Can I'], answer: null, teach: '示范完整句子。', practice: '替换一个词完成表达。', apply: '在家庭场景使用。', evidence: ['spoke-full-sentence', 'used-in-life'], reviewTags: ['speaking-transfer'] },
                { title: '我会读一个词', objective: '能在自然拼读已学范围内尝试读一个词。', activityType: 'decodable-word-showcase', prompt: '选择一个词读一读。', options: ['sat', 'pin', 'map'], answer: null, teach: '示范逐音合成。', practice: '尝试两个词。', apply: '指图说明词义。', evidence: ['read-cvc', 'matched-meaning'], reviewTags: ['phonics-transfer'] },
                { title: '亲子英语小卡', objective: '能制作一张词语或句型卡。', activityType: 'english-card', prompt: '制作你的英语小卡。', options: ['词语卡', '句型卡'], answer: null, teach: '展示图片、英文、动作三部分。', practice: '完成一张卡。', apply: '给家长展示。', evidence: ['created-card', 'showed-card'], reviewTags: ['portfolio'] },
                { title: '英语花园毕业', objective: '能用听说读中的两项展示 60 日成长。', activityType: 'english-showcase', prompt: '选择两项完成毕业展示。', options: ['听指令', '说一句', '读一个词'], answer: null, teach: '回顾三条英语路线。', practice: '完成两项。', apply: '领取英语徽章。', evidence: ['showcase-two-evidence', 'received-badge'], reviewTags: ['mastery-transfer'] }
            ])
        ],
        bankFile: 'vocabulary-bank.json', bank: [
            ...[['red', '颜色'], ['blue', '颜色'], ['green', '颜色'], ['yellow', '颜色'], ['cat', '动物'], ['dog', '动物'], ['fish', '动物'], ['bird', '动物'], ['apple', '食物'], ['banana', '食物'], ['book', '物品'], ['ball', '物品'], ['sun', '自然'], ['moon', '自然'], ['star', '自然'], ['hand', '身体'], ['eye', '身体'], ['run', '动作'], ['jump', '动作'], ['sit', '动作'], ['stand', '动作'], ['play', '动作'], ['home', '生活'], ['family', '生活'], ['hello', '表达'], ['bye', '表达'], ['like', '表达'], ['see', '表达'], ['small', '描述'], ['big', '描述']].map(([text, theme], index) => ({ id: `english-word-${String(index + 1).padStart(2, '0')}`, text, theme, image: '', source }))]
    },
    {
        id: 'preschool-motion-focus', subject: 'motion-focus', folder: '运动与专注', title: '身体能量站', description: '动一动、停一停、记住一个小目标。', parentRoute: 'preschool-motion', lessonDurationMin: { min: 3, max: 8 },
        stages: [
            stage('body-awakening', 1, 10, '身体唤醒', ['走', '伸展', '拍手'], ['先看看地面', '慢慢呼吸一次'], [
                { title: '走线小路', objective: '能沿着安全路线走 30 秒。', activityType: 'movement-walk-line', prompt: '沿着花园线走到终点。', teach: '示范脚跟脚尖和停下。', practice: '走两轮，允许慢走。', apply: '在家走一小段安全路线。', evidence: ['started-motion', 'completed-motion'], reviewTags: ['walk'] },
                { title: '伸展小树', objective: '能完成两种伸展动作。', activityType: 'movement-stretch', prompt: '像小树一样伸伸手。', teach: '示范不疼的伸展范围。', practice: '伸手、侧弯各一次。', apply: '坐久后伸展。', evidence: ['followed-motion', 'completed-motion'], reviewTags: ['stretch'] },
                { title: '拍手节奏', objective: '能跟随 3 拍节奏拍手。', activityType: 'rhythm-clap', prompt: '跟着节奏拍三下。', teach: '成人示范慢节奏。', practice: '三拍和两拍交替。', apply: '给古诗拍一遍。', evidence: ['kept-rhythm', 'followed-pattern'], reviewTags: ['rhythm'] },
                { title: '停走游戏', objective: '能听到停下信号并停住。', activityType: 'stop-go', prompt: '听到停就像小树一样不动。', teach: '示范走和停。', practice: '完成三轮。', apply: '过道中和家长玩一次。', evidence: ['followed-stop-signal', 'self-controlled'], reviewTags: ['stop-go'] },
                { title: '唤醒复习', objective: '能选择两种安全动作完成短回合。', activityType: 'mixed-motion-review', prompt: '选两个动作完成。', teach: '回顾走、伸展、拍手、停走。', practice: '完成两个回合。', apply: '说出身体感受。', evidence: ['made-motion-choice', 'completed-two-rounds'], reviewTags: ['walk', 'stretch', 'stop-go'] }
            ]),
            stage('coordination', 11, 20, '协调动作', ['跳', '投', '接', '左右'], ['看清目标', '先慢后快'], [
                { title: '跳过小水坑', objective: '能双脚跳过低矮标记。', activityType: 'jump-over', prompt: '双脚跳过一条线。', teach: '示范屈膝和落地。', practice: '跳两次，成人在旁。', apply: '在地面贴纸上玩。', evidence: ['started-motion', 'landed-safely'], reviewTags: ['jump'] },
                { title: '投给植物', objective: '能把软球投向大目标。', activityType: 'soft-throw', prompt: '把软球投进大篮子。', teach: '示范近距离投掷。', practice: '投三次，目标不比较远近。', apply: '收拾时把软物放入篮子。', evidence: ['threw-to-target', 'completed-round'], reviewTags: ['throw'] },
                { title: '接住阳光', objective: '能尝试接住或拍到缓慢滚来的软球。', activityType: 'catch-or-tap', prompt: '准备接住滚来的阳光球。', teach: '成人慢慢滚球。', practice: '完成三次尝试。', apply: '和家长轮流。', evidence: ['attempted-catch', 'took-turn'], reviewTags: ['catch'] },
                { title: '左右找方向', objective: '能根据左右指令移动一步。', activityType: 'direction-move', prompt: '听到左/右移动一步。', teach: '用身体标记左右。', practice: '四轮指令。', apply: '收拾时把物品放到指定侧。', evidence: ['followed-direction', 'completed-action'], reviewTags: ['left-right'] },
                { title: '协调复习', objective: '能完成跳、投、接、方向中的两项。', activityType: 'mixed-coordination-review', prompt: '选择两个协调动作。', teach: '说明可慢速完成。', practice: '完成两轮。', apply: '说出最舒服的动作。', evidence: ['made-choice', 'completed-two-rounds'], reviewTags: ['jump', 'throw', 'catch', 'left-right'] }
            ]),
            stage('balance-and-control', 21, 30, '平衡与控制', ['平衡', '慢走', '停住'], ['双脚站稳', '看前方目标'], [
                { title: '独角兽平衡', objective: '能单脚或脚尖尝试保持 3 秒。', activityType: 'balance-stand', prompt: '像独角兽一样站稳。', teach: '靠近墙边示范。', practice: '左右脚各尝试一次。', apply: '穿鞋时站稳再穿。', evidence: ['attempted-balance', 'safe-control'], reviewTags: ['balance'] },
                { title: '慢慢走', objective: '能沿线慢走并保持身体控制。', activityType: 'slow-walk', prompt: '像小蜗牛一样慢慢走。', teach: '示范慢速和停下。', practice: '完成两次慢走。', apply: '端轻物品走一步。', evidence: ['controlled-walk', 'safe-control'], reviewTags: ['slow-walk'] },
                { title: '冻结小树', objective: '能听到信号后保持姿势 3 秒。', activityType: 'freeze-pose', prompt: '听到铃声后冻结。', teach: '示范稳定姿势。', practice: '三轮冻结。', apply: '拍照前保持姿势。', evidence: ['stopped-body', 'held-pose'], reviewTags: ['freeze'] },
                { title: '障碍路线', objective: '能按照两个步骤绕过安全标志。', activityType: 'obstacle-route', prompt: '先绕花，再走到石头。', teach: '成人示范两步路线。', practice: '完成一条短路线。', apply: '收拾玩具时按路线走。', evidence: ['remembered-route', 'completed-route'], reviewTags: ['route-memory'] },
                { title: '控制复习', objective: '能完成一个平衡动作和一个路线动作。', activityType: 'mixed-control-review', prompt: '选择平衡或路线挑战。', teach: '回顾安全边界。', practice: '完成两项。', apply: '告诉家长哪里需要帮助。', evidence: ['made-choice', 'asked-for-help'], reviewTags: ['balance', 'route-memory'] }
            ]),
            stage('attention-games', 31, 40, '专注小游戏', ['找相同', '听指令', '记路线'], ['眼睛看目标', '听完再行动'], [
                { title: '找相同', objective: '能在 4 张图中找出相同图案。', activityType: 'find-same', prompt: '找到和这张一样的花。', teach: '示范先看形状再看颜色。', practice: '完成三组配对。', apply: '在家找两个相同物品。', evidence: ['found-same', 'explained-feature'], reviewTags: ['visual-match'] },
                { title: '听两步指令', objective: '能完成两个连续动作指令。', activityType: 'two-step-command', prompt: '先拍手，再摸头。', teach: '成人慢速示范。', practice: '变换动作顺序。', apply: '和家长玩两步指令。', evidence: ['remembered-two-steps', 'followed-command'], reviewTags: ['auditory-memory'] },
                { title: '路线记忆', objective: '能记住三格短路线。', activityType: 'route-memory', prompt: '小植物先上、再右、再下。', teach: '手指走一遍并隐藏路线。', practice: '回忆并点击三格。', apply: '说出房间里一条路线。', evidence: ['remembered-route', 'completed-route'], reviewTags: ['route-memory'] },
                { title: '停走听觉', objective: '能在声音变化时停止动作。', activityType: 'auditory-stop', prompt: '听到短声音停下，长声音走。', teach: '示范两种声音。', practice: '完成四轮。', apply: '和家长用拍手玩。', evidence: ['discriminated-sound', 'self-controlled'], reviewTags: ['auditory-discrimination'] },
                { title: '专注复习', objective: '能选择一个短专注游戏完成两轮。', activityType: 'mixed-focus-review', prompt: '选找相同、听指令或路线。', teach: '回顾三种策略。', practice: '完成两轮并说策略。', apply: '告诉家长“我先看/听/记”。', evidence: ['completed-focus-rounds', 'named-strategy'], reviewTags: ['visual-match', 'auditory-memory', 'route-memory'] }
            ]),
            stage('family-challenge', 41, 50, '亲子挑战', ['轮流', '合作', '表达'], ['先约定规则', '给伙伴加油'], [
                { title: '轮流投球', objective: '能和家长轮流完成三次投球。', activityType: 'turn-taking-throw', prompt: '轮到谁就投一次。', teach: '示范等待和轮流。', practice: '完成三轮。', apply: '说“轮到你”。', evidence: ['took-turn', 'used-social-language'], reviewTags: ['turn-taking'] },
                { title: '合作路线', objective: '能听家长提示共同完成一条路线。', activityType: 'cooperative-route', prompt: '一起把植物带到花园。', teach: '一人说方向，一人移动。', practice: '交换角色。', apply: '共同收拾一小块区域。', evidence: ['cooperated', 'completed-route'], reviewTags: ['cooperation'] },
                { title: '亲子节奏', objective: '能和家长轮流完成一个节奏。', activityType: 'parent-rhythm', prompt: '家长拍两下，孩子接两下。', teach: '示范轮流节奏。', practice: '完成四轮。', apply: '给诗歌打节奏。', evidence: ['kept-rhythm', 'took-turn'], reviewTags: ['rhythm', 'turn-taking'] },
                { title: '我来讲规则', objective: '能向家长说出一个游戏规则。', activityType: 'explain-rule', prompt: '告诉家长什么时候停。', teach: '示范一句规则。', practice: '孩子讲、家长复述。', apply: '换一个游戏继续。', evidence: ['explained-rule', 'checked-understanding'], reviewTags: ['expression'] },
                { title: '合作复习', objective: '能和家长完成一个动作和一个专注挑战。', activityType: 'mixed-family-review', prompt: '选择一个动起来和一个静下来任务。', teach: '说明可以合作完成。', practice: '完成两项。', apply: '一起选择明天的活动。', evidence: ['completed-family-activity', 'made-next-choice'], reviewTags: ['cooperation', 'transfer'] }
            ]),
            stage('movement-showcase', 51, 60, '身体小展示', ['选择', '坚持', '感受'], ['回看喜欢的动作', '做一次深呼吸'], [
                { title: '我的动作', objective: '能选择并完成一个喜欢的动作。', activityType: 'movement-choice', prompt: '选择跳、走、平衡或投掷。', teach: '回顾安全动作。', practice: '完成两轮。', apply: '说出身体感受。', evidence: ['made-choice', 'completed-motion'], reviewTags: ['movement-choice'] },
                { title: '我的专注法', objective: '能选择看、听、记中的一种策略。', activityType: 'focus-choice', prompt: '今天用哪种方法？', teach: '回顾三种专注策略。', practice: '完成一个短回合。', apply: '说出策略。', evidence: ['made-choice', 'named-strategy'], reviewTags: ['focus-choice'] },
                { title: '三步挑战', objective: '能完成三步动作或路线任务。', activityType: 'three-step-challenge', prompt: '完成三步小路线。', teach: '把任务拆成三步。', practice: '慢慢完成。', apply: '给家长复述三步。', evidence: ['completed-three-steps', 'retold-steps'], reviewTags: ['route-memory'] },
                { title: '亲子运动卡', objective: '能制作一张自己喜欢的动作卡。', activityType: 'motion-card', prompt: '画出一个动作并写/说规则。', teach: '示范动作卡三部分。', practice: '完成一张卡。', apply: '和家长执行一次。', evidence: ['created-card', 'used-card'], reviewTags: ['portfolio'] },
                { title: '身体能量毕业', objective: '能展示运动、专注、合作中的两项成长。', activityType: 'motion-showcase', prompt: '选择两项完成毕业展示。', teach: '回顾 60 日记录。', practice: '完成两项。', apply: '领取运动徽章。', evidence: ['showcase-two-evidence', 'received-badge'], reviewTags: ['mastery-transfer'] }
            ])
        ],
        bankFile: 'motion-bank.json', bank: [
            ...['走线', '伸展', '拍手', '停走', '跳格', '投软球', '接滚球', '单脚平衡', '绕障碍', '找相同', '听两步指令', '路线记忆'].map((name, index) => ({ id: `motion-${String(index + 1).padStart(2, '0')}`, name, type: index < 8 ? 'movement' : 'focus', durationSec: index < 8 ? 45 : 90, safety: ['成人在旁', '地面清空'], source }))]
    },
    {
        id: 'preschool-garden-game', subject: 'garden-game', folder: '成长游戏', title: '智慧花园成长线', description: '学习获得阳光，阳光照亮植物和小花园。', parentRoute: 'preschool-garden', lessonDurationMin: { min: 3, max: 8 },
        stages: [
            stage('seed-and-sun', 1, 10, '种子发芽', ['完成一项', '收集阳光', '认识花园'], ['看看今天的阳光', '摸一摸植物伙伴'], [
                { title: '收集第一束光', objective: '完成一个学习活动后领取阳光。', activityType: 'collect-sunlight', prompt: '完成一项小任务，收集阳光。', teach: '说明学习事件和阳光的关系。', practice: '从今日活动返回领取。', apply: '把阳光放进花园。', evidence: ['completed-linked-activity', 'claimed-sunlight'], reviewTags: ['sunlight'] },
                { title: '给种子喝水', objective: '能用阳光浇水并看到植物状态改变。', activityType: 'water-seed', prompt: '花 5 阳光给种子浇水。', options: ['浇水', '先不浇'], answer: 0, teach: '展示余额、消耗和植物变化。', practice: '完成一次浇水。', apply: '说说植物需要什么。', evidence: ['spent-sunlight', 'watered-plant'], reviewTags: ['watering'] },
                { title: '认识植物伙伴', objective: '能选择并记住一个植物伙伴。', activityType: 'choose-plant', prompt: '选择今天陪你学习的植物。', options: ['向日葵', '豌豆射手', '坚果伙伴'], answer: null, teach: '介绍三种原创伙伴的作用。', practice: '选择一个伙伴。', apply: '给伙伴起一个昵称。', evidence: ['selected-companion', 'named-companion'], reviewTags: ['collection'] },
                { title: '第一颗种子', objective: '能用累计阳光解锁第一颗种子并查看收藏。', activityType: 'unlock-plant', prompt: '查看已经解锁的种子。', options: ['查看收藏'], answer: null, teach: '说明累计成长和余额不同。', practice: '打开收藏并查看。', apply: '说说下一颗想要什么。', evidence: ['opened-collection', 'made-next-choice'], reviewTags: ['collection'] },
                { title: '发芽复习', objective: '能完成收集、浇水、选择中的两项。', activityType: 'mixed-garden-review', prompt: '选择两项照料花园。', options: ['收集', '浇水', '选择伙伴'], answer: null, teach: '回顾三种花园动作。', practice: '完成两项。', apply: '告诉家长花园状态。', evidence: ['completed-two-garden-actions', 'reported-state'], reviewTags: ['sunlight', 'watering', 'collection'] }
            ]),
            stage('plant-growth', 11, 20, '植物成长', ['阶段', '升级', '贴纸'], ['查看植物阶段', '找一张新贴纸'], [
                { title: '植物长高', objective: '能查看累计成长和植物阶段。', activityType: 'view-growth', prompt: '植物现在长到哪一阶段？', options: ['种子', '发芽', '开花'], answer: null, teach: '用成长条解释累计阳光。', practice: '查看阶段并选择。', apply: '说出植物下一步。', evidence: ['viewed-growth', 'named-next-step'], reviewTags: ['growth-stage'] },
                { title: '升级植物', objective: '能在余额足够时完成一次植物升级。', activityType: 'upgrade-plant', prompt: '花 30 阳光升级植物。', options: ['升级', '暂不升级'], answer: 0, teach: '说明消费和状态变更。', practice: '完成一次升级或选择暂缓。', apply: '比较升级前后外观。', evidence: ['made-upgrade-choice', 'viewed-state-change'], reviewTags: ['upgrade'] },
                { title: '收集贴纸', objective: '能从完成事件中领取一张原创贴纸。', activityType: 'claim-sticker', prompt: '查看今天得到的贴纸。', options: ['查看贴纸'], answer: null, teach: '说明收藏事件不会重复。', practice: '打开收藏并确认。', apply: '选择一张贴纸讲故事。', evidence: ['claimed-collection', 'told-story'], reviewTags: ['collection'] },
                { title: '植物伙伴对话', objective: '能选择一个伙伴反馈并完成语音/文字夸奖。', activityType: 'plant-feedback', prompt: '选择植物给你的夸奖。', options: ['你做得很棒', '再试一次也很好'], answer: null, teach: '展示语音不可用时的文字反馈。', practice: '播放或阅读反馈。', apply: '自己夸奖一次。', evidence: ['read-feedback', 'self-encouraged'], reviewTags: ['feedback'] },
                { title: '成长复习', objective: '能完成查看、升级、收藏中的两项。', activityType: 'mixed-growth-review', prompt: '选择两项成长操作。', options: ['看阶段', '升级', '收集贴纸'], answer: null, teach: '复习成长点和阳光的区别。', practice: '完成两项。', apply: '告诉家长最喜欢的变化。', evidence: ['completed-two-growth-actions', 'reported-change'], reviewTags: ['growth-stage', 'upgrade', 'collection'] }
            ]),
            stage('garden-defense', 21, 30, '花园防守', ['能量', '路线', '发射'], ['查看三路路线', '数一数豌豆能量'], [
                { title: '获得豌豆能量', objective: '能理解完成唯一学习活动会获得一颗能量。', activityType: 'earn-defense-energy', prompt: '完成活动后查看能量。', options: ['查看能量'], answer: null, teach: '区分阳光余额和防守能量。', practice: '完成关联活动并返回。', apply: '说说能量用来做什么。', evidence: ['completed-linked-activity', 'viewed-energy'], reviewTags: ['defense-energy'] },
                { title: '选择防守路线', objective: '能在三路棋盘中选择一条路线。', activityType: 'choose-defense-lane', prompt: '选择一条要守护的路线。', options: ['上路', '中路', '下路'], answer: null, teach: '展示植物列、路径格、入侵者列。', practice: '点击一条路线。', apply: '说出路线位置。', evidence: ['selected-lane', 'named-position'], reviewTags: ['defense-lane'] },
                { title: '发射第一颗豌豆', objective: '能消耗 1 能量发射并看到命中反馈。', activityType: 'fire-pea', prompt: '选择能量足够时发射豌豆。', options: ['发射', '暂不发射'], answer: null, teach: '先结算能量，再播放动画。', practice: '完成一次发射。', apply: '说说命中后发生什么。', evidence: ['spent-energy', 'viewed-hit-feedback'], reviewTags: ['fire-pea'] },
                { title: '友好入侵者', objective: '能理解小怪是提醒，不是扣分惩罚。', activityType: 'invader-feedback', prompt: '花园出现小怪时应该怎么办？', options: ['完成一项小行动', '删除所有成长'], answer: 0, teach: '解释下一步行动和驱散。', practice: '选择一个可完成行动。', apply: '完成后查看状态。', evidence: ['selected-recovery-action', 'understood-no-penalty'], reviewTags: ['invader'] },
                { title: '防守复习', objective: '能完成路线选择、发射或驱散中的两项。', activityType: 'mixed-defense-review', prompt: '选择两项守护花园。', options: ['选路线', '发射', '完成行动驱散'], answer: null, teach: '回顾三种防守动作。', practice: '完成两项。', apply: '告诉家长花园战况。', evidence: ['completed-two-defense-actions', 'reported-battle-state'], reviewTags: ['defense-energy', 'defense-lane', 'invader'] }
            ]),
            stage('collection-and-reward', 31, 40, '收藏与奖励', ['兑换', '确认', '收藏'], ['看今日奖励', '数一数收藏'], [
                { title: '奖励小店', objective: '能查看按层级分组的奖励。', activityType: 'view-reward-shop', prompt: '选择一个想了解的奖励层级。', options: ['小奖励', '亲子奖励', '特别奖励'], answer: null, teach: '说明奖励由家长配置。', practice: '打开一个层级。', apply: '告诉家长想要什么。', evidence: ['viewed-reward-tier', 'reported-choice'], reviewTags: ['reward-shop'] },
                { title: '提出兑换', objective: '能提出一个奖励兑换请求并看到 pending 状态。', activityType: 'request-reward', prompt: '选择阳光足够的奖励申请。', options: ['提出申请', '先不申请'], answer: null, teach: '展示 pending 不等于已兑现。', practice: '发起一次申请。', apply: '和家长约定确认时间。', evidence: ['requested-reward', 'viewed-pending'], reviewTags: ['reward-request'] },
                { title: '家长确认', objective: '能理解家长确认后才进入 claimed。', activityType: 'parent-reward-confirmation', prompt: '看到家长确认后可以做什么？', options: ['领取约定奖励', '重复申请十次'], answer: 0, teach: '用状态流程解释。', practice: '查看确认状态。', apply: '和家长完成线下约定。', evidence: ['understood-confirmation', 'completed-family-reward'], reviewTags: ['reward-confirmation'] },
                { title: '收藏整理', objective: '能在收藏中找到一个植物、贴纸或徽章。', activityType: 'collection-organize', prompt: '选择一个收藏分类。', options: ['植物', '贴纸', '徽章'], answer: null, teach: '介绍收藏分类。', practice: '打开并查看一个物品。', apply: '说说如何获得。', evidence: ['opened-collection-category', 'explained-source'], reviewTags: ['collection'] },
                { title: '奖励复习', objective: '能完成查看、申请、确认流程中的两项。', activityType: 'mixed-reward-review', prompt: '选择两项奖励中心操作。', options: ['看奖励', '申请', '看确认状态'], answer: null, teach: '回顾状态和阳光扣除时机。', practice: '完成两项。', apply: '和家长复盘是否可兑现。', evidence: ['completed-two-reward-actions', 'family-review'], reviewTags: ['reward-shop', 'reward-confirmation'] }
            ]),
            stage('daily-loop-and-planning', 41, 50, '每日规划', ['三项核心', '连续', '复盘'], ['看今日三项', '回顾昨天一项'], [
                { title: '三项核心', objective: '能看懂今日三项核心行动的顺序。', activityType: 'view-daily-core', prompt: '今天先做哪一项？', options: ['核心 A', '核心 B', '核心 C'], answer: null, teach: '说明三项核心和可选项。', practice: '选择下一项。', apply: '完成第一项。', evidence: ['viewed-daily-plan', 'made-next-choice'], reviewTags: ['daily-plan'] },
                { title: '连续成长', objective: '能查看连续行动天数并理解不中断比比较更重要。', activityType: 'view-streak', prompt: '连续成长记录在哪里？', options: ['成长页', '删除页'], answer: 0, teach: '说明连续天数是自己的节奏。', practice: '查看并说出天数。', apply: '计划明天一项小行动。', evidence: ['viewed-streak', 'made-plan'], reviewTags: ['streak'] },
                { title: '今日复盘', objective: '能选择一个完成活动和一个下次复习点。', activityType: 'daily-review', prompt: '今天哪一项需要再练？', options: ['选择一个复习点'], answer: null, teach: '用简单表情和标签复盘。', practice: '选择复习标签。', apply: '把复习点带入明天。', evidence: ['selected-review-tag', 'planned-review'], reviewTags: ['daily-review'] },
                { title: '自己的节奏', objective: '能在核心和可选活动中做一个合理选择。', activityType: 'choice-and-pacing', prompt: '今天完成核心后想做什么？', options: ['休息', '可选复习', '花园照料'], answer: null, teach: '说明休息也是合理选择。', practice: '选择并完成。', apply: '说出为什么这样选。', evidence: ['made-pacing-choice', 'explained-choice'], reviewTags: ['pacing'] },
                { title: '规划复习', objective: '能为明天选择一项核心和一项可选活动。', activityType: 'next-day-plan', prompt: '为明天选一个小目标。', options: ['学习', '运动', '花园'], answer: null, teach: '示范目标不超过一小步。', practice: '完成选择。', apply: '告诉家长。', evidence: ['planned-next-day', 'reported-plan'], reviewTags: ['planning'] }
            ]),
            stage('showcase-and-care', 51, 60, '成长展示', ['植物', '学习', '奖励'], ['回看成长记录', '选择最喜欢的变化'], [
                { title: '植物成长故事', objective: '能说出植物从种子到现在的一次变化。', activityType: 'plant-growth-story', prompt: '植物发生了什么变化？', options: ['长高了', '消失了'], answer: 0, teach: '回看成长时间线。', practice: '选择并说变化。', apply: '画一株植物。', evidence: ['retold-growth', 'created-art'], reviewTags: ['growth-story'] },
                { title: '我的学习徽章', objective: '能选择一个最有意义的学习徽章。', activityType: 'badge-reflection', prompt: '哪个徽章最像你的努力？', options: ['识字', '数学', '英语', '运动'], answer: null, teach: '解释徽章来自活动事件。', practice: '选择一个并说原因。', apply: '查看相关活动。', evidence: ['selected-badge', 'gave-reason'], reviewTags: ['badge-reflection'] },
                { title: '花园小管家', objective: '能完成一次浇水、收藏或整理操作。', activityType: 'garden-care', prompt: '选择一项照料花园。', options: ['浇水', '整理收藏', '查看植物'], answer: null, teach: '回顾花园照料规则。', practice: '完成一项。', apply: '告诉家长状态。', evidence: ['completed-care-action', 'reported-state'], reviewTags: ['care'] },
                { title: '家长奖励回顾', objective: '能和家长确认一个可执行奖励。', activityType: 'family-reward-review', prompt: '选择一个可以一起完成的奖励。', options: ['亲子散步', '一起读书', '小手工'], answer: null, teach: '说明奖励要真实可兑现。', practice: '选择并提交确认。', apply: '完成一次亲子活动。', evidence: ['selected-family-reward', 'completed-family-activity'], reviewTags: ['family-reward'] },
                { title: '智慧花园毕业', objective: '能展示学习、成长、花园中的两项成果。', activityType: 'garden-showcase', prompt: '选择两项成果展示。', options: ['学习记录', '植物变化', '收藏', '奖励'], answer: null, teach: '回顾 60 日记录和下一步。', practice: '完成两项展示。', apply: '领取成长徽章。', evidence: ['showcase-two-evidence', 'received-badge'], reviewTags: ['mastery-transfer'] }
            ])
        ],
        bankFile: 'garden-bank.json', bank: {
            plants: [
                { id: 'sun-sprout', name: '太阳芽', cost: 0, unlockTotalSunlight: 0, source },
                { id: 'pea-pal', name: '豌豆伙伴', cost: 20, unlockTotalSunlight: 40, source },
                { id: 'wallnut-pal', name: '坚果伙伴', cost: 30, unlockTotalSunlight: 80, source },
                { id: 'moon-mint', name: '月光薄荷', cost: 40, unlockTotalSunlight: 140, source },
                { id: 'rainbow-tree', name: '彩虹树', cost: 60, unlockTotalSunlight: 220, source },
                { id: 'star-flower', name: '星星花', cost: 80, unlockTotalSunlight: 320, source }
            ],
            rewards: [
                { id: 'reward-sticker', name: '选一张贴纸', tier: 'small', cost: 20, status: 'parent-confirmed-only', source },
                { id: 'reward-story', name: '亲子读一本书', tier: 'family', cost: 50, status: 'parent-confirmed-only', source },
                { id: 'reward-walk', name: '亲子散步', tier: 'family', cost: 60, status: 'parent-confirmed-only', source },
                { id: 'reward-craft', name: '一起做小手工', tier: 'happy', cost: 100, status: 'parent-confirmed-only', source },
                { id: 'reward-special', name: '周末特别活动', tier: 'special', cost: 200, status: 'parent-confirmed-only', source }
            ]
        }
    }
];

const writeJson = (file, value) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = (file, text) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${text.trim()}\n`, 'utf8');
};

const routeFor = definition => ({
    id: definition.id,
    subject: definition.subject,
    title: definition.title,
    description: definition.description,
    ageBand: 'preschool',
    dayCount: 60,
    lessonDurationMin: definition.lessonDurationMin,
    navigation: { parentRoute: definition.parentRoute, topLevel: false },
    stages: definition.stages.map(item => ({ id: item.id, days: item.days, title: item.title, focus: item.focus })),
    dailyContract: {
        coreSlots: 1,
        optionalSlots: 3,
        steps: ['warmup', 'teach', 'practice', 'apply', 'celebrate'],
        reviewRatioMin: 0.5,
        noSpeechRecognitionGate: true
    },
    rewardContract: { source: 'existing-preschool-activity', coreKind: 'core', optionalKind: 'optional', duplicatePolicy: 'canonical-event-id', noSecondLedger: true },
    source
});

const lessonsFor = definition => definition.stages.flatMap(item => {
    const [start] = item.days;
    return Array.from({ length: item.days[1] - item.days[0] + 1 }, (_, index) => sharedLessonFields(definition, start + index, item, item.seeds[index % item.seeds.length], index));
});

const subjectPackReadme = (definition) => `# ${definition.title}运行数据\n\n- \`route.json\`：60 日路线、阶段和共同活动合同。\n- \`lessons.json\`：60 条每日课程活动，所有完成都使用 canonical activity event。\n- \`${definition.bankFile}\`：${definition.subject === 'hanzi' ? '识字字库' : definition.subject === 'math' ? '数学题库' : definition.subject === 'poetry' ? '古诗库' : definition.subject === 'english' ? '英语主题词库' : definition.subject === 'motion-focus' ? '动作与专注活动库' : '植物和奖励库'}。\n- \`review-rules.json\`：间隔复习、掌握状态和错误规则。\n\n内容是项目原创种子数据，发布前仍需经过页面、家长试用和素材授权验收。`;

for (const definition of definitions) {
    const dataDir = path.join(preschoolDataRoot, definition.folder);
    writeJson(path.join(dataDir, 'route.json'), routeFor(definition));
    writeJson(path.join(dataDir, 'lessons.json'), lessonsFor(definition));
    writeJson(path.join(dataDir, definition.bankFile), definition.bank);
    writeJson(path.join(dataDir, 'review-rules.json'), reviewRules);
    writeText(path.join(dataDir, 'README.md'), subjectPackReadme(definition));

    const assetDir = path.join(preschoolAssetRoot, definition.folder);
    fs.mkdirSync(path.join(assetDir, 'original'), { recursive: true });
    fs.mkdirSync(path.join(assetDir, 'external'), { recursive: true });
    writeJson(path.join(assetDir, 'manifest.json'), {
        schemaVersion: 1,
        subject: definition.subject,
        status: 'seed-only',
        policy: { defaultLicense: 'project-original', externalRequiresAttribution: true, unknownLicensePublishable: false, researchOnlyPath: `docs/${definition.folder}/research/raw` },
        items: []
    });
    writeText(path.join(assetDir, 'original', 'README.md'), '只放通过内容、视觉和版权检查的项目原创图片、音频和打印材料。每个文件必须登记在上级 manifest.json。');
    writeText(path.join(assetDir, 'external', 'README.md'), '只放许可证明确并完成署名登记的外部资源。未核验资源只能放 docs 对应科目的 research/raw。');

    writeText(path.join(tmpRoot, `${definition.folder}-downloads`, 'README.md'), `此目录是 ${definition.title} 的临时下载缓存，只保存待核验网页、PDF、截图和授权文件，不进入 Pages/APK 发布制品。`);
}

console.log(`generated ${definitions.length} preschool subject packs with ${definitions.length * 60} lessons`);
