(function (global) {
    'use strict';

    function cleanLine(value) {
        return String(value == null ? '' : value).replace(/[，。、；：！？,.!?;:“”‘’《》\s]/g, '').trim();
    }

    function parseBank(raw) {
        return (Array.isArray(raw) ? raw : []).map(function (row) {
            const source = row && typeof row === 'object' ? row : {};
            const lines = Array.isArray(source.lines) ? source.lines.map(cleanLine).filter(Boolean) : [];
            return {
                id: String(source.id || ''),
                title: String(source.title || '').trim(),
                author: String(source.author || '').trim(),
                lines: lines,
                level: String(source.level || 'L1').trim() || 'L1'
            };
        }).filter(function (item) {
            return item.id && item.title && item.lines.length >= 2;
        });
    }

    function rotate(items, salt) {
        const list = (Array.isArray(items) ? items : []).slice();
        if (!list.length) return list;
        const shift = Math.abs(Number(salt) || 0) % list.length;
        return list.slice(shift).concat(list.slice(0, shift));
    }

    function buildLineQuiz(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const preferred = String(settings.preferred || 'poem-jingyesi');
        const level = String(settings.level || '').trim();
        const size = Math.max(1, Math.min(8, Number(settings.size) || 5));
        const helper = global.PersonalWorkbenchBankLevels;
        let poems = Array.isArray(bank) ? bank.slice() : [];
        if (level && helper) poems = helper.levelPoolOrAll(poems, level);
        const ordered = [];
        const preferredPoem = poems.find(function (item) { return item.id === preferred; });
        if (preferredPoem) ordered.push(preferredPoem);
        poems.forEach(function (item) {
            if (ordered.some(function (entry) { return entry.id === item.id; })) return;
            ordered.push(item);
        });
        const allLines = [];
        ordered.forEach(function (poem) {
            poem.lines.forEach(function (line) { allLines.push(line); });
        });
        const rounds = [];
        ordered.forEach(function (poem) {
            poem.lines.forEach(function (line, index) {
                if (index >= poem.lines.length - 1 || rounds.length >= size) return;
                const next = poem.lines[index + 1];
                const others = allLines.filter(function (entry) { return entry !== next && entry !== line; });
                const mixed = rotate([next].concat(rotate(others, index + poem.title.length).slice(0, 2)), index + 1);
                rounds.push({
                    text: next,
                    tokens: line,
                    speak: line,
                    prompt: '下一句是哪一句？',
                    options: mixed,
                    answer: Math.max(0, mixed.indexOf(next)),
                    title: poem.title
                });
            });
        });
        return { mode: 'poetry-line', rounds: rounds.slice(0, size) };
    }

    function getRuntimeBank() {
        const data = global.PersonalWorkbenchPoetryData;
        return parseBank(data && data.bank);
    }

    function orderedPoems(bank) {
        const poems = Array.isArray(bank) ? bank : [];
        const preferred = ['poem-jingyesi', 'poem-yong-e', 'poem-chunxiao'];
        const ordered = [];
        preferred.forEach(function (id) {
            const match = poems.find(function (item) { return item.id === id; });
            if (match) ordered.push(match);
        });
        poems.forEach(function (item) {
            if (ordered.some(function (entry) { return entry.id === item.id; })) return;
            ordered.push(item);
        });
        return ordered;
    }

    function expandPoetryLessons(lessons, bank) {
        const seed = Array.isArray(lessons) && lessons.length ? lessons[0] : {
            minutes: 10,
            activity: { mode: 'poetry-line', size: 5, prompt: '下一句是哪一句？', hint: '先听这一句。', options: ['听一句', '选下一句', '下一题'], answer: 0, optionIcons: ['moon', 'book-open', 'sparkles'], success: '诗句读懂啦！' }
        };
        return orderedPoems(bank).map(function (poem, index) {
            const activity = Object.assign({}, seed.activity || {}, {
                mode: 'poetry-line',
                preferred: poem.id,
                level: poem.level || 'L1',
                size: Math.max(3, Math.min(5, poem.lines.length - 1))
            });
            return {
                id: 'preschool-poetry-' + (index + 1),
                title: '朗读《' + poem.title + '》',
                minutes: Number(seed.minutes) || 10,
                meta: '《' + poem.title + '》 · ' + poem.author,
                tip: '听《' + poem.title + '》的上一句，选出下一句。',
                activity: activity
            };
        });
    }

    function attachPoetryLessons() {
        const config = global.PersonalWorkbenchConfig;
        if (!config || !Array.isArray(config.childCourses)) return;
        const course = config.childCourses.find(function (item) { return item && item.id === 'preschool-poetry'; });
        if (!course) return;
        const bank = getRuntimeBank();
        if (bank.length < 2) return;
        course.lessons = expandPoetryLessons(course.lessons, bank);
        course.badge = bank.length + ' 首诗库';
        course.note = '听上一句，选出下一句。诗句来自 ' + bank.length + ' 首小学必背诗库。';
        course.highlights = bank.slice(0, 3).map(function (item) { return '《' + item.title + '》'; });
    }

    attachPoetryLessons();

    global.PersonalWorkbenchPreschoolPoetry = {
        parseBank: parseBank,
        buildLineQuiz: buildLineQuiz,
        getRuntimeBank: getRuntimeBank,
        expandPoetryLessons: expandPoetryLessons
    };
})(typeof window !== 'undefined' ? window : globalThis);
