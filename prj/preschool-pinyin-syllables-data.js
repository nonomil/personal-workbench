(function (global) {
    'use strict';

    function tone(pinyin, hanzi, words) {
        return { pinyin: pinyin, hanzi: hanzi || [], words: words || [] };
    }

    function row(text, type, initial, medial, final, level, group, tones, options) {
        const source = options && typeof options === 'object' ? options : {};
        return {
            id: 'pinyin-syllable-' + text,
            key: 'pinyin:syllable:' + text,
            text: text,
            type: type,
            initial: initial || '',
            medial: medial || '',
            final: final || '',
            level: level || 'L1',
            group: group || 'core',
            tones: tones,
            hanzi: source.hanzi || [],
            words: source.words || [],
            confusionCluster: source.confusionCluster || [],
            distractors: source.distractors || []
        };
    }

    const bank = [
        row('ba', 'liangpin', 'b', '', 'a', 'L1', 'lips', [
            tone('bā', ['八'], ['八个']), tone('bá', ['拔'], ['拔河']),
            tone('bǎ', ['把'], ['把手']), tone('bà', ['爸', '吧'], ['爸爸', '好吧'])
        ], { hanzi: ['八', '拔', '把', '爸', '吧'], words: ['八个', '拔河', '把手', '爸爸', '好吧'], confusionCluster: ['p', 'd'], distractors: ['pā', 'dá', 'bō'] }),
        row('ma', 'liangpin', 'm', '', 'a', 'L1', 'lips', [
            tone('mā', ['妈'], ['妈妈']), tone('má', ['麻'], ['麻花']),
            tone('mǎ', ['马'], ['小马']), tone('mà', ['骂'], ['骂人'])
        ], { hanzi: ['妈', '麻', '马', '骂'], words: ['妈妈', '麻花', '小马', '骂人'], confusionCluster: ['n', 'l'], distractors: ['mó', 'nǎ', 'mā'] }),
        row('da', 'liangpin', 'd', '', 'a', 'L1', 'tip', [
            tone('dā', ['搭'], ['搭车']), tone('dá', ['答'], ['回答']),
            tone('dǎ', ['打'], ['打球']), tone('dà', ['大'], ['大人'])
        ], { hanzi: ['搭', '答', '打', '大'], words: ['搭车', '回答', '打球', '大人'], confusionCluster: ['t', 'b'], distractors: ['dā', 'tǎ', 'dà'] }),
        row('ge', 'liangpin', 'g', '', 'e', 'L1', 'root', [
            tone('gē', ['哥'], ['哥哥']), tone('gé', ['格'], ['方格']),
            tone('gě', ['葛'], ['葛根']), tone('gè', ['个'], ['一个'])
        ], { hanzi: ['哥', '格', '葛', '个'], words: ['哥哥', '方格', '葛根', '一个'], confusionCluster: ['k', 'h'], distractors: ['kē', 'hē', 'gǔ'] }),
        row('ke', 'liangpin', 'k', '', 'e', 'L1', 'root', [
            tone('kē', ['科'], ['科学']), tone('ké', ['咳'], ['咳嗽']),
            tone('kě', ['可'], ['可以']), tone('kè', ['课'], ['上课'])
        ], { hanzi: ['科', '咳', '可', '课'], words: ['科学', '咳嗽', '可以', '上课'], confusionCluster: ['g', 'h'], distractors: ['gē', 'hē', 'kǒu'] }),
        row('he', 'liangpin', 'h', '', 'e', 'L1', 'root', [
            tone('hē', ['喝'], ['喝水']), tone('hé', ['河'], ['小河']),
            tone('hě', [], []), tone('hè', ['贺'], ['祝贺'])
        ], { hanzi: ['喝', '河', '贺'], words: ['喝水', '小河', '祝贺'], confusionCluster: ['g', 'k'], distractors: ['gē', 'kě', 'hǎo'] }),
        row('ji', 'liangpin', 'j', '', 'i', 'L2', 'palatal', [
            tone('jī', ['鸡'], ['小鸡']), tone('jí', ['急'], ['着急']),
            tone('jǐ', ['几'], ['几个']), tone('jì', ['记'], ['记住'])
        ], { hanzi: ['鸡', '急', '几', '记'], words: ['小鸡', '着急', '几个', '记住'], confusionCluster: ['q', 'x'], distractors: ['qī', 'xǐ', 'jǔ'] }),
        row('qi', 'liangpin', 'q', '', 'i', 'L2', 'palatal', [
            tone('qī', ['七'], ['七个']), tone('qí', ['旗'], ['红旗']),
            tone('qǐ', ['起'], ['起床']), tone('qì', ['气'], ['生气'])
        ], { hanzi: ['七', '旗', '起', '气'], words: ['七个', '红旗', '起床', '生气'], confusionCluster: ['j', 'x'], distractors: ['jī', 'xī', 'qǔ'] }),
        row('xi', 'liangpin', 'x', '', 'i', 'L2', 'palatal', [
            tone('xī', ['西'], ['西边']), tone('xí', ['习'], ['学习']),
            tone('xǐ', ['喜'], ['喜欢']), tone('xì', ['细'], ['仔细'])
        ], { hanzi: ['西', '习', '喜', '细'], words: ['西边', '学习', '喜欢', '仔细'], confusionCluster: ['j', 'q'], distractors: ['jī', 'qí', 'xǔ'] }),
        row('zhi', 'zhengti', '', '', 'zhi', 'L2', 'whole', [
            tone('zhī', ['知'], ['知道']), tone('zhí', ['直'], ['直线']),
            tone('zhǐ', ['纸'], ['白纸']), tone('zhì', ['字'], ['写字'])
        ], { hanzi: ['知', '直', '纸', '字'], words: ['知道', '直线', '白纸', '写字'], confusionCluster: ['zi', 'chi'], distractors: ['zī', 'chī', 'zhǐ'] }),
        row('chi', 'zhengti', '', '', 'chi', 'L2', 'whole', [
            tone('chī', ['吃'], ['吃饭']), tone('chí', ['池'], ['水池']),
            tone('chǐ', ['尺'], ['尺子']), tone('chì', ['赤'], ['赤色'])
        ], { hanzi: ['吃', '池', '尺', '赤'], words: ['吃饭', '水池', '尺子', '赤色'], confusionCluster: ['zhi', 'ci'], distractors: ['zhī', 'cī', 'chǐ'] }),
        row('shi', 'zhengti', '', '', 'shi', 'L2', 'whole', [
            tone('shī', ['师'], ['老师']), tone('shí', ['十'], ['十个']),
            tone('shǐ', ['使'], ['使用']), tone('shì', ['是'], ['不是'])
        ], { hanzi: ['师', '十', '使', '是'], words: ['老师', '十个', '使用', '不是'], confusionCluster: ['si', 'zhi'], distractors: ['sī', 'zhī', 'shǐ'] }),
        row('zi', 'zhengti', '', '', 'zi', 'L2', 'whole', [
            tone('zī', ['资'], ['资料']), tone('zí', [], []),
            tone('zǐ', ['子'], ['孩子']), tone('zì', ['字'], ['汉字'])
        ], { hanzi: ['资', '子', '字'], words: ['资料', '孩子', '汉字'], confusionCluster: ['zhi', 'ci'], distractors: ['zhī', 'cī', 'zǐ'] }),
        row('si', 'zhengti', '', '', 'si', 'L2', 'whole', [
            tone('sī', ['丝'], ['丝线']), tone('sí', [], []),
            tone('sǐ', ['死'], ['生死']), tone('sì', ['四'], ['四个'])
        ], { hanzi: ['丝', '死', '四'], words: ['丝线', '生死', '四个'], confusionCluster: ['shi', 'ci'], distractors: ['shī', 'cī', 'sǐ'] }),
        row('gu', 'liangpin', 'g', '', 'u', 'L2', 'root', [
            tone('gū', ['姑'], ['姑姑']), tone('gú', [], []),
            tone('gǔ', ['古'], ['古代']), tone('gù', ['故'], ['故事'])
        ], { hanzi: ['姑', '古', '故'], words: ['姑姑', '古代', '故事'], confusionCluster: ['ku', 'hu'], distractors: ['kū', 'hú', 'gǔ'] }),
        row('ku', 'liangpin', 'k', '', 'u', 'L2', 'root', [
            tone('kū', ['哭'], ['哭声']), tone('kú', [], []),
            tone('kǔ', ['苦'], ['辛苦']), tone('kù', ['裤'], ['裤子'])
        ], { hanzi: ['哭', '苦', '裤'], words: ['哭声', '辛苦', '裤子'], confusionCluster: ['gu', 'hu'], distractors: ['gū', 'hū', 'kǔ'] }),
        row('hu', 'liangpin', 'h', '', 'u', 'L2', 'root', [
            tone('hū', ['呼'], ['呼吸']), tone('hú', ['湖'], ['湖水']),
            tone('hǔ', ['虎'], ['老虎']), tone('hù', ['户'], ['户口'])
        ], { hanzi: ['呼', '湖', '虎', '户'], words: ['呼吸', '湖水', '老虎', '户口'], confusionCluster: ['gu', 'ku'], distractors: ['gū', 'kǔ', 'hǔ'] }),
        row('bo', 'liangpin', 'b', '', 'o', 'L2', 'lips', [
            tone('bō', ['波'], ['波浪']), tone('bó', ['伯'], ['伯伯']),
            tone('bǒ', ['跛'], []), tone('bò', ['薄'], ['薄荷'])
        ], { hanzi: ['波', '伯', '薄'], words: ['波浪', '伯伯', '薄荷'], confusionCluster: ['po', 'mo'], distractors: ['pō', 'mó', 'bǔ'] }),
        row('po', 'liangpin', 'p', '', 'o', 'L2', 'lips', [
            tone('pō', ['坡'], ['山坡']), tone('pó', ['婆'], ['婆婆']),
            tone('pǒ', ['叵'], []), tone('pò', ['破'], ['破了'])
        ], { hanzi: ['坡', '婆', '破'], words: ['山坡', '婆婆', '破了'], confusionCluster: ['bo', 'mo'], distractors: ['bō', 'mó', 'pǔ'] }),
        row('bai', 'liangpin', 'b', '', 'ai', 'L2', 'compound', [
            tone('bāi', ['掰'], ['掰开']), tone('bái', ['白'], ['白色']),
            tone('bǎi', ['百'], ['一百']), tone('bài', ['拜'], ['拜拜'])
        ], { hanzi: ['掰', '白', '百', '拜'], words: ['掰开', '白色', '一百', '拜拜'], confusionCluster: ['pai', 'dai'], distractors: ['pái', 'dǎi', 'bèi'] }),
        row('mei', 'liangpin', 'm', '', 'ei', 'L2', 'compound', [
            tone('mēi', [], []), tone('méi', ['没'], ['没有']),
            tone('měi', ['美'], ['美丽']), tone('mèi', ['妹'], ['妹妹'])
        ], { hanzi: ['没', '美', '妹'], words: ['没有', '美丽', '妹妹'], confusionCluster: ['nei', 'lei'], distractors: ['mái', 'nèi', 'mǐ'] }),
        row('gua', 'sanpin', 'g', 'u', 'a', 'L3', 'three-part', [
            tone('guā', ['瓜'], ['西瓜']), tone('guá', [], []),
            tone('guǎ', ['寡'], []), tone('guà', ['挂'], ['挂上'])
        ], { hanzi: ['瓜', '寡', '挂'], words: ['西瓜', '挂上'], confusionCluster: ['kua', 'hua'], distractors: ['kuā', 'huā', 'guó'] }),
        row('hua', 'sanpin', 'h', 'u', 'a', 'L3', 'three-part', [
            tone('huā', ['花'], ['花朵']), tone('huá', ['划'], ['划船']),
            tone('huǎ', [], []), tone('huà', ['画'], ['画画'])
        ], { hanzi: ['花', '划', '画'], words: ['花朵', '划船', '画画'], confusionCluster: ['gua', 'kua'], distractors: ['guā', 'kuā', 'huó'] }),
        row('shui', 'sanpin', 'sh', 'u', 'ei', 'L3', 'three-part', [
            tone('shuī', [], []), tone('shuǐ', ['水'], ['喝水']),
            tone('shuǐ', ['水'], ['水面']), tone('shuì', ['睡'], ['睡觉'])
        ], { hanzi: ['水', '睡'], words: ['喝水', '水面', '睡觉'], confusionCluster: ['sui', 'chui'], distractors: ['suǐ', 'chuì', 'shǔ'] }),
        row('xue', 'sanpin', 'x', 'ü', 'e', 'L3', 'three-part', [
            tone('xuē', ['靴'], ['靴子']), tone('xué', ['学'], ['学习']),
            tone('xuě', ['雪'], ['下雪']), tone('xuè', ['血'], ['血液'])
        ], { hanzi: ['靴', '学', '雪', '血'], words: ['靴子', '学习', '下雪', '血液'], confusionCluster: ['jue', 'que'], distractors: ['juē', 'què', 'xū'] }),
        row('juan', 'sanpin', 'j', 'ü', 'an', 'L3', 'three-part', [
            tone('juān', ['捐'], ['捐款']), tone('juán', [], []),
            tone('juǎn', ['卷'], ['卷子']), tone('juàn', ['倦'], ['疲倦'])
        ], { hanzi: ['捐', '卷', '倦'], words: ['捐款', '卷子', '疲倦'], confusionCluster: ['quan', 'xuan'], distractors: ['quān', 'xuǎn', 'jiān'] }),
        row('lian', 'liangpin', 'l', '', 'ian', 'L3', 'front-nasal', [
            tone('liān', [], []), tone('lián', ['连'], ['连线']),
            tone('liǎn', ['脸'], ['脸蛋']), tone('liàn', ['练'], ['练习'])
        ], { hanzi: ['连', '脸', '练'], words: ['连线', '脸蛋', '练习'], confusionCluster: ['nian', 'liang'], distractors: ['nián', 'liǎng', 'liǔ'] }),
        row('an', 'liangpin', '', '', 'an', 'L3', 'front-nasal', [
            tone('ān', ['安'], ['安全']), tone('án', [], []),
            tone('ǎn', [], []), tone('àn', ['按'], ['按住'])
        ], { hanzi: ['安', '按'], words: ['安全', '按住'], confusionCluster: ['ang', 'en'], distractors: ['áng', 'ēn', 'ān'] }),
        row('en', 'liangpin', '', '', 'en', 'L3', 'front-nasal', [
            tone('ēn', ['恩'], ['恩情']), tone('én', [], []),
            tone('ěn', [], []), tone('èn', ['摁'], ['摁下'])
        ], { hanzi: ['恩', '摁'], words: ['恩情', '摁下'], confusionCluster: ['eng', 'an'], distractors: ['ēng', 'áng', 'ěn'] }),
        row('in', 'liangpin', '', '', 'in', 'L3', 'front-nasal', [
            tone('yīn', ['因'], ['因为']), tone('yín', ['银'], ['银色']),
            tone('yǐn', ['引'], ['引导']), tone('yìn', ['印'], ['印章'])
        ], { hanzi: ['因', '银', '引', '印'], words: ['因为', '银色', '引导', '印章'], confusionCluster: ['ing', 'un'], distractors: ['yīng', 'wēn', 'yǐng'] }),
        row('un', 'liangpin', '', '', 'un', 'L3', 'front-nasal', [
            tone('wēn', ['温'], ['温暖']), tone('wén', ['文'], ['文字']),
            tone('wěn', ['吻'], ['亲吻']), tone('wèn', ['问'], ['问题'])
        ], { hanzi: ['温', '文', '吻', '问'], words: ['温暖', '文字', '亲吻', '问题'], confusionCluster: ['ong', 'in'], distractors: ['wēng', 'yīn', 'wǒ'] }),
        row('ang', 'liangpin', '', '', 'ang', 'L4', 'back-nasal', [
            tone('āng', [], []), tone('áng', ['昂'], ['昂头']),
            tone('ǎng', [], []), tone('àng', [], [])
        ], { hanzi: ['昂'], words: ['昂头'], confusionCluster: ['an', 'eng'], distractors: ['ān', 'ēng', 'áng'] }),
        row('eng', 'liangpin', '', '', 'eng', 'L4', 'back-nasal', [
            tone('ēng', [], []), tone('éng', [], []),
            tone('ěng', [], []), tone('èng', [], [])
        ], { hanzi: [], words: [], confusionCluster: ['en', 'ing'], distractors: ['ēn', 'yīng', 'éng'] }),
        row('ing', 'liangpin', '', '', 'ing', 'L4', 'back-nasal', [
            tone('yīng', ['英'], ['英语']), tone('yíng', ['迎'], ['欢迎']),
            tone('yǐng', ['影'], ['电影']), tone('yìng', ['硬'], ['坚硬'])
        ], { hanzi: ['英', '迎', '影', '硬'], words: ['英语', '欢迎', '电影', '坚硬'], confusionCluster: ['in', 'eng'], distractors: ['yīn', 'ēng', 'yǐng'] }),
        row('ong', 'liangpin', '', '', 'ong', 'L4', 'back-nasal', [
            tone('ōng', [], []), tone('óng', [], []),
            tone('ǒng', [], []), tone('òng', [], [])
        ], { hanzi: [], words: [], confusionCluster: ['un', 'eng'], distractors: ['wēn', 'ēng', 'ōu'] }),
        row('yin', 'zhengti', '', '', 'yin', 'L4', 'whole', [
            tone('yīn', ['音'], ['声音']), tone('yín', ['银'], ['白银']),
            tone('yǐn', ['引'], ['引路']), tone('yìn', ['印'], ['印花'])
        ], { hanzi: ['音', '银', '引', '印'], words: ['声音', '白银', '引路', '印花'], confusionCluster: ['ying', 'in'], distractors: ['yīng', 'yīn', 'yǐng'] }),
        row('yuan', 'zhengti', '', '', 'yuan', 'L4', 'whole', [
            tone('yuān', ['冤'], ['冤枉']), tone('yuán', ['元'], ['一元']),
            tone('yuǎn', ['远'], ['远方']), tone('yuàn', ['愿'], ['心愿'])
        ], { hanzi: ['冤', '元', '远', '愿'], words: ['冤枉', '一元', '远方', '心愿'], confusionCluster: ['yue', 'yun'], distractors: ['yuē', 'yǔn', 'yuǎn'] })
    ];

    global.PersonalWorkbenchPinyinSyllableData = {
        version: 1,
        source: { kind: 'project-original', license: 'project-original' },
        bank: bank
    };
})(typeof window !== 'undefined' ? window : globalThis);
