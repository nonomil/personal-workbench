(function (global) {
    'use strict';

    const CVC_STAGES = ['cvc-blending', 'short-vowels-and-families'];

    function parseBank(raw) {
        return (Array.isArray(raw) ? raw : []).map(function (row) {
            const source = row && typeof row === 'object' ? row : {};
            return {
                id: String(source.id || ''),
                text: String(source.text || '').trim().toLowerCase(),
                graphemes: Array.isArray(source.graphemes) ? source.graphemes.map(function (item) { return String(item || ''); }) : [],
                phonemes: Array.isArray(source.phonemes) ? source.phonemes.map(function (item) { return String(item || ''); }) : [],
                stageId: String(source.stageId || '')
            };
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

    function buildBlendQuiz(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const pool = cvcWords(bank);
        const preferred = String(settings.preferred || 'mat').toLowerCase();
        const size = Math.max(1, Math.min(pool.length, Number(settings.size) || 5));
        const preferredItem = pool.find(function (item) { return item.text === preferred; });
        const ordered = [];
        if (preferredItem) ordered.push(preferredItem);
        pool.forEach(function (item) {
            if (ordered.some(function (entry) { return entry.text === item.text; })) return;
            ordered.push(item);
        });
        const targets = ordered.slice(0, size);
        return {
            mode: 'phonics-cvc',
            rounds: targets.map(function (item, index) {
                const others = pool.filter(function (entry) { return entry.text !== item.text; }).map(function (entry) { return entry.text; });
                const distractors = rotate(others, index + item.text.length).slice(0, 2);
                const mixed = rotate([item.text].concat(distractors), index + 1);
                return {
                    text: item.text,
                    blend: (item.graphemes.length ? item.graphemes : item.text.split('')).join('-'),
                    speak: item.text,
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
            return {
                id: String(source.id || ''),
                letter: String(source.letter || '').trim().toLowerCase(),
                sound: String(source.sound || '').trim().toLowerCase(),
                keyword: String(source.keyword || '').trim().toLowerCase(),
                group: String(source.group || '').trim()
            };
        }).filter(function (item) {
            return item.letter && item.keyword;
        });
    }

    function buildLetterQuiz(letters, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const groups = String(settings.groups || '').split(',').map(function (item) { return item.trim(); }).filter(Boolean);
        const pool = (Array.isArray(letters) ? letters : []).filter(function (item) {
            return !groups.length || groups.indexOf(item.group) >= 0;
        });
        const preferred = String(settings.preferred || 'm').toLowerCase();
        const size = Math.max(1, Math.min(pool.length, Number(settings.size) || 5));
        const ordered = [];
        const preferredItem = pool.find(function (item) { return item.letter === preferred; });
        if (preferredItem) ordered.push(preferredItem);
        pool.forEach(function (item) {
            if (ordered.some(function (entry) { return entry.letter === item.letter; })) return;
            ordered.push(item);
        });
        const targets = ordered.slice(0, size);
        const allLetters = (Array.isArray(letters) ? letters : []).map(function (item) { return item.letter; });
        return {
            mode: 'phonics-letter',
            rounds: targets.map(function (item, index) {
                const others = allLetters.filter(function (letter) { return letter !== item.letter; });
                const distractors = rotate(others, index + item.letter.length).slice(0, 2);
                const mixed = rotate([item.letter].concat(distractors), index + 1);
                return {
                    text: item.letter,
                    blend: '/' + item.sound + '/',
                    speak: item.keyword,
                    prompt: '听一听，哪个字母？',
                    options: mixed,
                    answer: Math.max(0, mixed.indexOf(item.letter))
                };
            })
        };
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
        buildBlendQuiz: buildBlendQuiz,
        buildLetterQuiz: buildLetterQuiz,
        getRuntimeBank: getRuntimeBank,
        getRuntimeLetters: getRuntimeLetters
    };
})(typeof window !== 'undefined' ? window : globalThis);
