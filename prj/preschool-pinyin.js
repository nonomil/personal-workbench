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

    function uniqueTexts(items) {
        const seen = {};
        const result = [];
        (Array.isArray(items) ? items : []).forEach(function (item) {
            const text = String(item || '').trim();
            if (!text || seen[text]) return;
            seen[text] = true;
            result.push(text);
        });
        return result;
    }

    function normalizeToneVariants(raw) {
        const source = Array.isArray(raw)
            ? raw
            : Object.keys(raw && typeof raw === 'object' ? raw : {}).map(function (key) {
                const item = raw[key] && typeof raw[key] === 'object' ? raw[key] : {};
                return Object.assign({ tone: Number(key) }, item);
            });
        return source.map(function (item, index) {
            const value = item && typeof item === 'object' ? item : {};
            return {
                tone: Math.max(1, Math.min(4, Number(value.tone) || index + 1)),
                pinyin: String(value.pinyin || '').trim(),
                hanzi: uniqueTexts(value.hanzi),
                words: uniqueTexts(value.words)
            };
        }).filter(function (item) {
            return item.pinyin;
        });
    }

    function parseSyllableBank(raw) {
        return (Array.isArray(raw) ? raw : []).map(function (row) {
            const source = row && typeof row === 'object' ? row : {};
            const text = String(source.text || source.syllable || '').trim().toLowerCase();
            const tones = normalizeToneVariants(source.tones || source.toneVariants);
            const hanzi = uniqueTexts((Array.isArray(source.hanzi) ? source.hanzi : []).concat(tones.reduce(function (list, item) {
                return list.concat(item.hanzi);
            }, [])));
            const words = uniqueTexts((Array.isArray(source.words) ? source.words : []).concat(tones.reduce(function (list, item) {
                return list.concat(item.words);
            }, [])));
            return {
                id: String(source.id || ('pinyin-syllable-' + text)),
                key: String(source.key || ('pinyin:syllable:' + text)),
                text: text,
                type: String(source.type || 'liangpin').trim() || 'liangpin',
                initial: String(source.initial || '').trim(),
                medial: String(source.medial || '').trim(),
                final: String(source.final || '').trim(),
                level: String(source.level || 'L1').trim() || 'L1',
                group: String(source.group || 'core').trim() || 'core',
                tones: tones,
                hanzi: hanzi,
                words: words,
                confusionCluster: uniqueTexts(source.confusionCluster),
                distractors: uniqueTexts(source.distractors)
            };
        }).filter(function (item) {
            return item.text && item.tones.length;
        });
    }

    function toneVariant(item, index) {
        const variants = item && Array.isArray(item.tones) ? item.tones : [];
        if (!variants.length) return { tone: 0, pinyin: item && item.text || '', hanzi: [], words: [] };
        return variants[Math.abs(Number(index) || 0) % variants.length];
    }

    function buildSyllableOptions(item, variant, pool, toneIndex) {
        const candidates = [];
        const add = function (value) {
            const text = String(value || '').trim();
            if (text && text !== variant.pinyin && candidates.indexOf(text) < 0) candidates.push(text);
        };
        (item.distractors || []).forEach(add);
        (item.confusionCluster || []).forEach(function (confusion) {
            const match = pool.find(function (entry) {
                return entry.text === confusion || entry.initial === confusion || entry.final === confusion;
            });
            if (match) add(toneVariant(match, toneIndex).pinyin);
        });
        pool.forEach(function (entry) {
            if (entry.key === item.key) return;
            add(toneVariant(entry, toneIndex).pinyin);
        });
        return rotate([variant.pinyin].concat(candidates), toneIndex + 1).slice(0, 4);
    }

    function buildSyllableQuiz(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const helper = global.PersonalWorkbenchBankLevels;
        const level = String(settings.level || '').trim();
        const groups = String(settings.groups || '').split(',').map(function (item) { return item.trim(); }).filter(Boolean);
        let pool = parseSyllableBank(bank).filter(function (item) {
            return !groups.length || groups.indexOf(item.group) >= 0;
        });
        if (level && helper) pool = helper.levelPoolOrAll(pool, level);
        const preferred = String(settings.preferred || '').trim().toLowerCase();
        const ordered = [];
        const preferredItem = pool.find(function (item) {
            return item.text === preferred || item.key === settings.preferred || item.initial + item.final === preferred;
        });
        if (preferredItem) ordered.push(preferredItem);
        pool.forEach(function (item) {
            if (ordered.some(function (entry) { return entry.key === item.key; })) return;
            ordered.push(item);
        });
        const size = Math.max(1, Math.min(ordered.length, Number(settings.size) || 8));
        const targets = rotate(ordered, Number(settings.salt) || 0).slice(0, size);
        return {
            mode: 'pinyin-syllable',
            rounds: targets.map(function (item, index) {
                const variant = toneVariant(item, index + (Number(settings.salt) || 0));
                const parts = [item.initial, item.medial, item.final].filter(Boolean);
                const isWhole = item.type === 'zhengti';
                const prompt = isWhole ? '听一听，哪个整体认读音节？' : '把声母和韵母合起来，哪个音节？';
                return {
                    id: item.id,
                    contentId: item.key,
                    key: item.key,
                    syllable: item.text,
                    text: variant.pinyin,
                    blend: (parts.length ? parts.join(' + ') : item.text) + ' = ' + variant.pinyin,
                    parts: parts.length ? parts : [item.text],
                    initial: item.initial,
                    medial: item.medial,
                    final: item.final,
                    type: item.type,
                    group: item.group,
                    level: item.level,
                    tone: variant.tone,
                    toneVariants: item.tones.map(function (toneItem) {
                        return { tone: toneItem.tone, pinyin: toneItem.pinyin, hanzi: toneItem.hanzi.slice(), words: toneItem.words.slice() };
                    }),
                    hanzi: item.hanzi.slice(),
                    words: item.words.slice(),
                    confusionCluster: item.confusionCluster.slice(),
                    speak: (variant.hanzi && variant.hanzi[0]) || item.text,
                    prompt: prompt,
                    options: buildSyllableOptions(item, variant, pool, index + (Number(settings.salt) || 0)),
                    answer: 0
                };
            }).map(function (round) {
                round.answer = round.options.indexOf(round.text);
                if (round.answer < 0) {
                    round.options = [round.text].concat(round.options).slice(0, 4);
                    round.answer = 0;
                }
                return round;
            })
        };
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

    function getRuntimeSyllableBank() {
        const data = global.PersonalWorkbenchPinyinSyllableData;
        return parseSyllableBank(data && data.bank);
    }

    global.PersonalWorkbenchPreschoolPinyin = {
        parseBank: parseBank,
        parseSyllableBank: parseSyllableBank,
        buildInitialQuiz: buildInitialQuiz,
        buildToneQuiz: buildToneQuiz,
        buildSyllableQuiz: buildSyllableQuiz,
        detectTone: detectTone,
        toneLabel: toneLabel,
        toMatchPairs: toMatchPairs,
        getRuntimeBank: getRuntimeBank,
        getRuntimeSyllableBank: getRuntimeSyllableBank
    };
})(typeof window !== 'undefined' ? window : globalThis);
