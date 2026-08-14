(function (global) {
    'use strict';

    function parseBank(raw) {
        return (Array.isArray(raw) ? raw : []).map(function (row) {
            const source = row && typeof row === 'object' ? row : {};
            return {
                id: String(source.id || ''),
                skillId: String(source.skillId || ''),
                level: String(source.level || ''),
                prompt: String(source.prompt || ''),
                left: Number(source.left),
                right: Number(source.right),
                op: String(source.op || ''),
                answer: Number(source.answer)
            };
        }).filter(function (item) {
            return item.id && item.level && Number.isFinite(item.answer) && item.answer >= 0;
        });
    }

    function tokenString(count) {
        const n = Math.max(0, Math.min(12, Number(count) || 0));
        let marks = '';
        for (let i = 0; i < n; i += 1) marks += '☀️';
        return marks || '·';
    }

    function rotate(items, salt) {
        const list = (Array.isArray(items) ? items : []).slice();
        if (!list.length) return list;
        const shift = Math.abs(Number(salt) || 0) % list.length;
        return list.slice(shift).concat(list.slice(0, shift));
    }

    function choiceOptions(value, salt) {
        const answer = Math.max(0, Math.round(Number(value) || 0));
        const plus = String(answer + 1);
        const minus = String(Math.max(0, answer - 1));
        const mixed = rotate([String(answer), plus, minus === String(answer) ? String(answer + 2) : minus], salt);
        const unique = [];
        mixed.forEach(function (option) {
            if (unique.indexOf(option) < 0) unique.push(option);
        });
        while (unique.length < 3) unique.push(String(unique.length + answer + 1));
        return unique.slice(0, 3);
    }

    function levelPool(bank, level) {
        return (Array.isArray(bank) ? bank : []).filter(function (item) {
            return item.level === String(level || 'L1');
        });
    }

    function buildCountQuiz(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const level = String(settings.level || 'L1');
        const pool = levelPool(bank, level);
        const counting = pool.filter(function (item) { return item.skillId === 'counting'; });
        const source = counting.length >= 5 ? counting : pool;
        const size = Math.max(1, Math.min(source.length, Number(settings.size) || 5));
        return {
            mode: 'math-bank',
            level: level,
            rounds: source.slice(0, size).map(function (item, index) {
                const value = Math.max(0, Math.round(item.answer));
                const options = choiceOptions(value, index + 1);
                return {
                    id: item.id,
                    level: item.level,
                    skillId: item.skillId,
                    prompt: '数一数，有几个太阳？',
                    tokens: tokenString(Math.max(1, value || 1)),
                    answerValue: value || 1,
                    options: options,
                    answer: Math.max(0, options.indexOf(String(value || 1)))
                };
            })
        };
    }

    function buildCompareQuiz(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const pool = levelPool(bank, 'L2').filter(function (item) {
            return Number.isFinite(item.left) && Number.isFinite(item.right);
        });
        const size = Math.max(1, Math.min(pool.length, Number(settings.size) || 5));
        return {
            mode: 'math-bank',
            level: 'L2',
            rounds: pool.slice(0, size).map(function (item, index) {
                const left = Math.max(0, Math.round(item.left));
                const right = Math.max(0, Math.round(item.right));
                const value = Math.max(left, right);
                const options = choiceOptions(value, index + 3);
                return {
                    id: item.id,
                    level: item.level,
                    skillId: 'compare',
                    prompt: '哪边太阳更多？选更多的那个数。',
                    tokens: tokenString(left) + '  vs  ' + tokenString(right),
                    answerValue: value,
                    options: options,
                    answer: Math.max(0, options.indexOf(String(value)))
                };
            })
        };
    }

    function buildArithmeticQuiz(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const pool = levelPool(bank, 'L3').filter(function (item) {
            return item.op === '+' || item.op === '-';
        });
        const size = Math.max(1, Math.min(pool.length, Number(settings.size) || 5));
        return {
            mode: 'math-bank',
            level: 'L3',
            rounds: pool.slice(0, size).map(function (item, index) {
                const value = Math.max(0, Math.round(item.answer));
                const options = choiceOptions(value, index + 5);
                const expression = item.left + ' ' + item.op + ' ' + item.right + ' = ?';
                return {
                    id: item.id,
                    level: item.level,
                    skillId: item.skillId,
                    prompt: '算一算',
                    tokens: expression,
                    speak: expression,
                    answerValue: value,
                    options: options,
                    answer: Math.max(0, options.indexOf(String(value)))
                };
            })
        };
    }

    function buildQuiz(bank, options) {
        const level = String(options && options.level || 'L1');
        if (level === 'L2') return buildCompareQuiz(bank, options);
        if (level === 'L3') return buildArithmeticQuiz(bank, options);
        return buildCountQuiz(bank, options);
    }

    function getRuntimeBank() {
        const data = global.PersonalWorkbenchMathBankData;
        return parseBank(data && data.bank);
    }

    global.PersonalWorkbenchPreschoolMathBank = {
        parseBank: parseBank,
        buildCountQuiz: buildCountQuiz,
        buildCompareQuiz: buildCompareQuiz,
        buildArithmeticQuiz: buildArithmeticQuiz,
        buildQuiz: buildQuiz,
        getRuntimeBank: getRuntimeBank
    };
})(typeof window !== 'undefined' ? window : globalThis);
