(function (global) {
    'use strict';

    function parseBank(raw) {
        return (Array.isArray(raw) ? raw : []).map(function (row) {
            const source = row && typeof row === 'object' ? row : {};
            const extra = source.extra && typeof source.extra === 'object' ? source.extra : {};
            const text = String(source.text || extra.initial || source.initial || '').trim();
            return {
                id: String(source.id || ''),
                text: text,
                initial: String(extra.initial || source.initial || text).trim(),
                sample: String(source.sample || extra.sample || '').trim(),
                pinyin: String(source.pinyin || extra.pinyin || '').trim(),
                kind: String(extra.kind || source.kind || 'initial').trim() || 'initial',
                group: String(extra.group || source.group || '').trim(),
                level: String(source.level || 'L1').trim() || 'L1',
                homophones: Array.isArray(extra.homophones) ? extra.homophones : [],
                nearPhones: Array.isArray(extra.nearPhones) ? extra.nearPhones : [],
                art: String((source.media && source.media.art) || source.art || '').trim(),
                media: source.media && typeof source.media === 'object' ? source.media : {}
            };
        }).filter(function (item) {
            return item.text && item.sample && item.pinyin;
        });
    }

    function rotate(items, salt) {
        const list = (Array.isArray(items) ? items : []).slice();
        if (!list.length) return list;
        const shift = Math.abs(Number(salt) || 0) % list.length;
        return list.slice(shift).concat(list.slice(0, shift));
    }

    function promptFor(kind) {
        if (kind === 'final') return '听一听，哪个韵母？';
        if (kind === 'whole') return '听一听，哪个整体认读音节？';
        return '听一听，哪个声母？';
    }

    const TONE_MARKS = [
        'āēīōūǖĀĒĪŌŪǕ',
        'áéíóúǘÁÉÍÓÚǗ',
        'ǎěǐǒǔǚǍĚǏǑǓǙ',
        'àèìòùǜÀÈÌÒÙǛ'
    ];
    const TONE_LABELS = ['一声', '二声', '三声', '四声'];

    function detectTone(pinyin) {
        const text = String(pinyin || '');
        let index = 0;
        for (index = 0; index < TONE_MARKS.length; index += 1) {
            const marks = TONE_MARKS[index];
            let markIndex = 0;
            for (markIndex = 0; markIndex < marks.length; markIndex += 1) {
                if (text.indexOf(marks.charAt(markIndex)) >= 0) return index + 1;
            }
        }
        return 0;
    }

    function toneLabel(tone) {
        return TONE_LABELS[tone - 1] || '';
    }

    function buildToneQuiz(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const helper = global.PersonalWorkbenchBankLevels;
        const level = String(settings.level || '').trim();
        let pool = (Array.isArray(bank) ? bank : []).filter(function (item) {
            return item && item.sample && detectTone(item.pinyin);
        });
        if (level && helper) pool = helper.levelPoolOrAll(pool, level);
        const seen = {};
        const unique = [];
        pool.forEach(function (item) {
            const key = String(item.sample || '');
            if (!key || seen[key]) return;
            seen[key] = true;
            unique.push(item);
        });
        const preferred = String(settings.preferred || '').trim();
        const size = Math.max(1, Math.min(unique.length, Number(settings.size) || 8));
        const ordered = [];
        const preferredItem = unique.find(function (item) {
            return item.sample === preferred || item.text === preferred || item.pinyin === preferred;
        });
        if (preferredItem) ordered.push(preferredItem);
        unique.forEach(function (item) {
            if (ordered.some(function (entry) { return entry.sample === item.sample; })) return;
            ordered.push(item);
        });
        const targets = rotate(ordered, Number(settings.salt) || 0).slice(0, size);
        return {
            mode: 'pinyin-tone',
            rounds: targets.map(function (item) {
                const tone = detectTone(item.pinyin);
                return {
                    text: item.sample,
                    blend: item.sample + ' ' + item.pinyin,
                    speak: item.sample,
                    prompt: '听一听，第几声？',
                    options: TONE_LABELS.slice(),
                    answer: Math.max(0, tone - 1),
                    tone: tone
                };
            })
        };
    }

    function buildInitialQuiz(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const kind = String(settings.kind || 'initial');
        const level = String(settings.level || '').trim();
        const groups = String(settings.groups || '').split(',').map(function (item) { return item.trim(); }).filter(Boolean);
        const helper = global.PersonalWorkbenchBankLevels;
        let pool = (Array.isArray(bank) ? bank : []).filter(function (item) {
            if (item.kind !== kind) return false;
            return !groups.length || groups.indexOf(item.group) >= 0;
        });
        if (level && helper) pool = helper.levelPoolOrAll(pool, level);
        const preferred = String(settings.preferred || '').trim();
        const size = Math.max(1, Math.min(pool.length, Number(settings.size) || 8));
        const ordered = [];
        const preferredItem = pool.find(function (item) { return item.text === preferred; });
        if (preferredItem) ordered.push(preferredItem);
        pool.forEach(function (item) {
            if (ordered.some(function (entry) { return entry.text === item.text; })) return;
            ordered.push(item);
        });
        const targets = ordered.slice(0, size);
        const prompt = promptFor(kind);
        return {
            mode: 'pinyin-initial',
            rounds: targets.map(function (item, index) {
                const others = pool.filter(function (entry) { return entry.text !== item.text; });
                const otherTexts = others.map(function (entry) { return entry.text; });
                const near = Array.isArray(item.nearPhones) ? item.nearPhones : [];
                const fromNear = [];
                near.forEach(function (phone) {
                    const folded = String(phone || '').toLowerCase().replace(/[āáǎà]/g, 'a').replace(/[ōóǒò]/g, 'o').replace(/[ēéěè]/g, 'e').replace(/[īíǐì]/g, 'i').replace(/[ūúǔù]/g, 'u').replace(/[ǖǘǚǜü]/g, 'v');
                    const match = others.find(function (entry) {
                        const text = String(entry.text || '').toLowerCase();
                        return text === folded || folded.indexOf(text) === 0 || text.indexOf(folded) === 0;
                    });
                    if (match && fromNear.indexOf(match.text) < 0) fromNear.push(match.text);
                });
                const fallback = rotate(otherTexts, index + item.text.length);
                const distractors = fromNear.concat(fallback.filter(function (text) { return fromNear.indexOf(text) < 0; })).slice(0, 2);
                const mixed = rotate([item.text].concat(distractors), index + 1);
                return {
                    text: item.text,
                    blend: item.sample + ' ' + item.pinyin,
                    speak: item.sample,
                    prompt: prompt,
                    options: mixed,
                    answer: Math.max(0, mixed.indexOf(item.text))
                };
            })
        };
    }

    function toMatchPairs(bank) {
        return (Array.isArray(bank) ? bank : []).map(function (item) {
            return { id: String(item.text || ''), a: String(item.text || ''), b: String(item.sample || '') };
        }).filter(function (item) {
            return item.id && item.a && item.b;
        });
    }

    function getRuntimeBank() {
        const data = global.PersonalWorkbenchPinyinData;
        return parseBank(data && data.bank);
    }

    global.PersonalWorkbenchPreschoolPinyin = {
        parseBank: parseBank,
        buildInitialQuiz: buildInitialQuiz,
        buildToneQuiz: buildToneQuiz,
        detectTone: detectTone,
        toneLabel: toneLabel,
        toMatchPairs: toMatchPairs,
        getRuntimeBank: getRuntimeBank
    };
})(typeof window !== 'undefined' ? window : globalThis);
