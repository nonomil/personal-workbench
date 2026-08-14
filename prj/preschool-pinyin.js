(function (global) {
    'use strict';

    function parseBank(raw) {
        return (Array.isArray(raw) ? raw : []).map(function (row) {
            const source = row && typeof row === 'object' ? row : {};
            const text = String(source.text || source.initial || '').trim();
            return {
                id: String(source.id || ''),
                text: text,
                initial: text,
                sample: String(source.sample || '').trim(),
                pinyin: String(source.pinyin || '').trim(),
                kind: String(source.kind || 'initial').trim() || 'initial',
                group: String(source.group || '').trim()
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

    function buildInitialQuiz(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const kind = String(settings.kind || 'initial');
        const groups = String(settings.groups || '').split(',').map(function (item) { return item.trim(); }).filter(Boolean);
        const pool = (Array.isArray(bank) ? bank : []).filter(function (item) {
            if (item.kind !== kind) return false;
            return !groups.length || groups.indexOf(item.group) >= 0;
        });
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
                const others = pool.filter(function (entry) { return entry.text !== item.text; }).map(function (entry) { return entry.text; });
                const distractors = rotate(others, index + item.text.length).slice(0, 2);
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
        toMatchPairs: toMatchPairs,
        getRuntimeBank: getRuntimeBank
    };
})(typeof window !== 'undefined' ? window : globalThis);
