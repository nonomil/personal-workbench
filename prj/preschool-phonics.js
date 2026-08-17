(function (global) {
    'use strict';

    const CVC_STAGES = ['cvc-blending', 'short-vowels-and-families'];
    const VOICED_TH = /^(this|that|the|them|then|than)$/;
    const IPA_BY_PHONEME = Object.freeze({
        a: 'æ', e: 'e', i: 'ɪ', o: 'ɒ', u: 'ʌ',
        b: 'b', c: 'k', d: 'd', f: 'f', g: 'g', h: 'h',
        j: 'dʒ', k: 'k', l: 'l', m: 'm', n: 'n', p: 'p',
        q: 'kw', r: 'r', s: 's', t: 't', v: 'v', w: 'w',
        x: 'ks', y: 'j', z: 'z',
        sh: 'ʃ', ch: 'tʃ', th: 'θ', ck: 'k', ng: 'ŋ'
    });
    const SPEAK_BY_PHONEME = Object.freeze({
        a: 'ah', e: 'eh', i: 'ih', o: 'aw', u: 'uh',
        b: 'buh', c: 'kuh', d: 'duh', f: 'fff', g: 'guh', h: 'huh',
        j: 'juh', k: 'kuh', l: 'lll', m: 'mmm', n: 'nnn', p: 'puh',
        q: 'kwuh', r: 'rrr', s: 'sss', t: 'tuh', v: 'vvv', w: 'wuh',
        x: 'ks', y: 'yuh', z: 'zzz',
        sh: 'shh', ch: 'ch', th: 'th', ck: 'kuh', ng: 'ng'
    });
    const WORD_ZH = Object.freeze({
        sat: '坐下', pat: '轻拍', map: '地图', tap: '轻敲', mat: '垫子',
        mad: '生气', sad: '难过', sam: '山姆', am: '我是', at: '在',
        an: '一个', in: '里面', it: '它', is: '是', sit: '坐',
        pin: '别针', pit: '坑', tip: '尖尖', tin: '罐子', nip: '轻咬',
        pan: '平底锅', nap: '小睡', man: '男人', can: '可以', cat: '猫',
        hat: '帽子', ham: '火腿', hit: '打', bit: '一点', bin: '箱子',
        dip: '蘸一蘸', hot: '热', pot: '锅', not: '不', hop: '跳',
        mop: '拖把', top: '上面', dog: '狗', log: '木头', fog: '雾',
        pet: '宠物', get: '拿到', ten: '十', bed: '床', bug: '虫子',
        mug: '杯子', sun: '太阳', run: '跑', fun: '好玩',
        ship: '船', shop: '商店', shut: '关上', fish: '鱼', dish: '盘子',
        wish: '许愿', chip: '薯片', chat: '聊天', chop: '砍', rich: '有钱',
        much: '很多', such: '这样', thin: '瘦', that: '那个', this: '这个',
        back: '后面', pick: '捡', kick: '踢', sing: '唱歌', ring: '戒指',
        long: '长', stop: '停', step: '一步', stand: '站', spin: '转',
        spot: '斑点', spun: '转过', slam: '摔门', slip: '滑倒', slap: '拍打',
        skip: '跳过', skin: '皮肤', skit: '小品', hand: '手', sand: '沙子',
        send: '寄出', tent: '帐篷', mint: '薄荷', pant: '喘气', lamp: '灯',
        jump: '跳', camp: '营地', left: '左边', gift: '礼物', soft: '软'
    });
    const KEYWORD_ZH = Object.freeze({
        apple: '苹果', bat: '球棒', cat: '猫', dog: '狗', egg: '鸡蛋',
        fan: '风扇', goat: '山羊', hat: '帽子', igloo: '冰屋', jam: '果酱',
        kite: '风筝', leaf: '叶子', map: '地图', net: '网', octopus: '章鱼',
        pan: '平底锅', queen: '女王', rat: '老鼠', sun: '太阳', tap: '水龙头',
        umbrella: '雨伞', van: '面包车', web: '蜘蛛网', box: '盒子',
        yellow: '黄色', zip: '拉链'
    });

    function zhForWord(text, fallback) {
        const key = String(text || '').trim().toLowerCase();
        return String(fallback || '').trim() || WORD_ZH[key] || '';
    }

    function ipaFor(phoneme, word) {
        const key = String(phoneme || '').trim().toLowerCase();
        if (!key) return '';
        if (key === 'th' && VOICED_TH.test(String(word || '').toLowerCase())) return 'ð';
        return IPA_BY_PHONEME[key] || key;
    }

    function speakFor(phoneme) {
        const key = String(phoneme || '').trim().toLowerCase();
        return SPEAK_BY_PHONEME[key] || key;
    }

    function decorateWord(item) {
        const source = item && typeof item === 'object' ? item : {};
        const graphemes = (Array.isArray(source.graphemes) && source.graphemes.length ? source.graphemes : String(source.text || '').split(''))
            .map(function (part) { return String(part || '').toLowerCase(); })
            .filter(Boolean);
        const phonemes = (Array.isArray(source.phonemes) && source.phonemes.length ? source.phonemes : graphemes)
            .map(function (part) { return String(part || '').toLowerCase(); })
            .filter(Boolean);
        const ipaBits = phonemes.map(function (part) { return ipaFor(part, source.text); });
        return Object.assign({}, source, {
            graphemes: graphemes,
            phonemes: phonemes,
            zh: zhForWord(source.text, source.zh),
            blend: graphemes.join('-'),
            ipa: '/' + ipaBits.join('') + '/',
            ipaParts: ipaBits.map(function (part) { return '/' + part + '/'; }).join(' · '),
            speakParts: phonemes.map(speakFor)
        });
    }

    function decorateLetter(item) {
        const source = item && typeof item === 'object' ? item : {};
        const sound = String(source.sound || source.letter || '').toLowerCase();
        const ipa = ipaFor(sound, source.keyword);
        return Object.assign({}, source, {
            ipa: '/' + ipa + '/',
            speakSound: speakFor(sound),
            keywordZh: KEYWORD_ZH[String(source.keyword || '').toLowerCase()] || ''
        });
    }

    function parseBank(raw) {
        return (Array.isArray(raw) ? raw : []).map(function (row) {
            const source = row && typeof row === 'object' ? row : {};
            const extra = source.extra && typeof source.extra === 'object' ? source.extra : {};
            return decorateWord({
                id: String(source.id || ''),
                text: String(source.text || '').trim().toLowerCase(),
                zh: String(source.zh || extra.zh || '').trim(),
                graphemes: Array.isArray(extra.graphemes) ? extra.graphemes.map(function (item) { return String(item || ''); }) : (Array.isArray(source.graphemes) ? source.graphemes.map(function (item) { return String(item || ''); }) : []),
                phonemes: Array.isArray(extra.phonemes) ? extra.phonemes.map(function (item) { return String(item || ''); }) : (Array.isArray(source.phonemes) ? source.phonemes.map(function (item) { return String(item || ''); }) : []),
                stageId: String(extra.stageId || source.stageId || ''),
                level: String(source.level || ''),
                art: String((source.media && source.media.art) || source.art || '').trim(),
                media: source.media && typeof source.media === 'object' ? source.media : {}
            });
        }).filter(function (item) {
            return item.text && item.stageId;
        });
    }

    function cvcWords(bank) {
        return (Array.isArray(bank) ? bank : []).filter(function (item) {
            return CVC_STAGES.indexOf(item.stageId) >= 0;
        });
    }

    function rotate(items, salt) {
        const list = (Array.isArray(items) ? items : []).slice();
        if (!list.length) return list;
        const shift = Math.abs(Number(salt) || 0) % list.length;
        return list.slice(shift).concat(list.slice(0, shift));
    }

    function pickOrdered(pool, preferredKey, preferred, size) {
        const ordered = [];
        const match = pool.find(function (item) { return item[preferredKey] === preferred; });
        if (match) ordered.push(match);
        pool.forEach(function (item) {
            if (ordered.some(function (entry) { return entry[preferredKey] === item[preferredKey]; })) return;
            ordered.push(item);
        });
        return ordered.slice(0, Math.max(1, Math.min(pool.length, Number(size) || 5)));
    }

    function buildBlendQuiz(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const pool = cvcWords(bank);
        const preferred = String(settings.preferred || 'mat').toLowerCase();
        const targets = pickOrdered(pool, 'text', preferred, settings.size || 5);
        return {
            mode: 'phonics-cvc',
            rounds: targets.map(function (item, index) {
                const others = pool.filter(function (entry) { return entry.text !== item.text; }).map(function (entry) { return entry.text; });
                const distractors = rotate(others, index + item.text.length).slice(0, 2);
                const mixed = rotate([item.text].concat(distractors), index + 1);
                return {
                    text: item.text,
                    zh: item.zh,
                    blend: item.blend,
                    ipa: item.ipa,
                    ipaParts: item.ipaParts,
                    speak: item.text,
                    speakParts: item.speakParts,
                    prompt: '听一听，哪个词？',
                    options: mixed,
                    answer: Math.max(0, mixed.indexOf(item.text))
                };
            })
        };
    }

    function parseLetters(raw) {
        return (Array.isArray(raw) ? raw : []).map(function (row) {
            const source = row && typeof row === 'object' ? row : {};
            const extra = source.extra && typeof source.extra === 'object' ? source.extra : {};
            const letter = String(source.text || source.letter || extra.letter || '').trim().toLowerCase();
            return decorateLetter({
                id: String(source.id || ''),
                letter: letter,
                sound: String(extra.sound || source.sound || '').trim().toLowerCase(),
                keyword: String(extra.keyword || source.keyword || '').trim().toLowerCase(),
                group: String(extra.group || source.group || '').trim(),
                level: String(source.level || 'L1'),
                art: String((source.media && source.media.art) || source.art || '').trim(),
                media: source.media && typeof source.media === 'object' ? source.media : {}
            });
        }).filter(function (item) {
            return item.letter && item.keyword;
        });
    }

    function filterLetters(letters, groups) {
        const wanted = String(groups || '').split(',').map(function (item) { return item.trim(); }).filter(Boolean);
        return (Array.isArray(letters) ? letters : []).filter(function (item) {
            return !wanted.length || wanted.indexOf(item.group) >= 0;
        });
    }

    function buildLetterQuiz(letters, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const pool = filterLetters(letters, settings.groups);
        const preferred = String(settings.preferred || 'm').toLowerCase();
        const targets = pickOrdered(pool, 'letter', preferred, settings.size || 5);
        const allLetters = (Array.isArray(letters) ? letters : []).map(function (item) { return item.letter; });
        return {
            mode: 'phonics-letter',
            rounds: targets.map(function (item, index) {
                const others = allLetters.filter(function (letter) { return letter !== item.letter; });
                const distractors = rotate(others, index + item.letter.length).slice(0, 2);
                const mixed = rotate([item.letter].concat(distractors), index + 1);
                return {
                    text: item.letter,
                    blend: item.letter,
                    ipa: item.ipa,
                    ipaParts: item.ipa,
                    keyword: item.keyword,
                    zh: item.keywordZh,
                    speak: item.keyword,
                    speakSound: item.speakSound,
                    speakParts: [item.speakSound],
                    prompt: '听一听，哪个字母？',
                    options: mixed,
                    answer: Math.max(0, mixed.indexOf(item.letter))
                };
            })
        };
    }

    function buildWordCards(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const level = String(settings.level || '').toUpperCase();
        const pool = (Array.isArray(bank) ? bank : []).filter(function (item) {
            return !level || String(item.level || '').toUpperCase() === level;
        });
        const use = pool.length ? pool : (Array.isArray(bank) ? bank : []);
        const preferred = String(settings.preferred || (use[0] && use[0].text) || 'mat').toLowerCase();
        return pickOrdered(use, 'text', preferred, settings.size || 8).map(function (item) {
            return {
                key: item.text,
                main: item.text,
                sub: item.ipa,
                zh: item.zh,
                rows: [
                    { label: '意思', text: item.zh },
                    { label: '拼一拼', text: item.blend },
                    { label: '音标', text: item.ipaParts }
                ].filter(function (row) { return row.text; }),
                speak: item.text,
                speakParts: item.speakParts,
                lang: 'en-US',
                art: item.art,
                media: item.media,
                theme: item.stageId
            };
        });
    }

    function buildLetterCards(letters, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const pool = filterLetters(letters, settings.groups);
        const preferred = String(settings.preferred || 'm').toLowerCase();
        return pickOrdered(pool, 'letter', preferred, settings.size || 8).map(function (item) {
            return {
                key: item.letter,
                main: item.letter,
                sub: item.ipa,
                zh: item.keywordZh ? item.keyword + ' · ' + item.keywordZh : item.keyword,
                rows: [
                    { label: '音标', text: item.ipa },
                    { label: '例词', text: item.keywordZh ? item.keyword + ' · ' + item.keywordZh : item.keyword }
                ],
                speak: item.keyword,
                speakParts: [item.speakSound],
                lang: 'en-US',
                art: item.art,
                media: item.media,
                theme: item.group
            };
        });
    }

    function getRuntimeBank() {
        const data = global.PersonalWorkbenchPhonicsData;
        return parseBank(data && data.bank);
    }

    function getRuntimeLetters() {
        const data = global.PersonalWorkbenchPhonicsData;
        return parseLetters(data && data.letters);
    }

    global.PersonalWorkbenchPreschoolPhonics = {
        parseBank: parseBank,
        parseLetters: parseLetters,
        decorateWord: decorateWord,
        decorateLetter: decorateLetter,
        buildBlendQuiz: buildBlendQuiz,
        buildLetterQuiz: buildLetterQuiz,
        buildWordCards: buildWordCards,
        buildLetterCards: buildLetterCards,
        getRuntimeBank: getRuntimeBank,
        getRuntimeLetters: getRuntimeLetters
    };
})(typeof window !== 'undefined' ? window : globalThis);
