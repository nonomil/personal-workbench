(function (global) {
    'use strict';

    var PRACTICE_BANDS = [
        { id: 'within10', title: '10 以内', summary: '10 以内加减' },
        { id: 'within20', title: '20 以内', summary: '20 以内加减' },
        { id: 'within50', title: '50 以内', summary: '50 以内加减' },
        { id: 'addsub100', title: '100 以内', summary: '100 以内加减' },
        { id: 'mix100', title: '100 以内 + 乘法', summary: '100 以内加减 + 20 以内乘法' }
    ];
    var DEFAULT_PRACTICE_BAND = 'mix100';

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
        const near = salt % 2 === 0 ? answer + 1 : Math.max(0, answer - 1);
        const far = answer >= 10
            ? (salt % 3 === 0 ? answer + 10 : Math.max(0, answer - 10))
            : answer + 2;
        const mixed = rotate([
            String(answer),
            String(near === answer ? answer + 2 : near),
            String(far === answer ? answer + 2 : far)
        ], salt);
        const unique = [];
        mixed.forEach(function (option) {
            if (unique.indexOf(option) < 0) unique.push(option);
        });
        let bump = 2;
        while (unique.length < 3) {
            const extra = String(answer + bump);
            if (unique.indexOf(extra) < 0) unique.push(extra);
            bump += 1;
        }
        return unique.slice(0, 3);
    }

    function levelPool(bank, level) {
        return (Array.isArray(bank) ? bank : []).filter(function (item) {
            return item.level === String(level || 'L1');
        });
    }

    function normalizePracticeBand(id) {
        const value = String(id || '');
        if (value === 'within10' || value === 'within20' || value === 'within50' || value === 'addsub100' || value === 'mix100') return value;
        if (value === 'within100') return 'mix100';
        return DEFAULT_PRACTICE_BAND;
    }

    function listPracticeBands() {
        return PRACTICE_BANDS.map(function (item) {
            return { id: item.id, title: item.title, summary: item.summary };
        });
    }

    function opMark(op) {
        return op === '*' ? '×' : op;
    }

    function makeArithmetic(left, right, op, level) {
        const answer = op === '+' ? left + right : op === '-' ? left - right : left * right;
        const skillId = op === '+' ? 'addition' : op === '-' ? 'take-away' : 'multiply';
        return {
            id: 'math-' + skillId + '-' + left + '-' + right,
            skillId: skillId,
            level: level,
            prompt: left + ' ' + opMark(op) + ' ' + right + ' = ?',
            left: left,
            right: right,
            op: op,
            answer: answer
        };
    }

    function pushUnique(list, seen, item) {
        if (!item || !item.id || seen[item.id]) return;
        seen[item.id] = true;
        list.push(item);
    }

    function generateAddSub(max, levelAdd, levelSub) {
        const items = [];
        const seen = {};
        let a;
        let b;
        for (a = 1; a <= max; a += 1) {
            for (b = 1; b <= max - a; b += 1) {
                pushUnique(items, seen, makeArithmetic(a, b, '+', levelAdd));
            }
            for (b = 1; b <= a; b += 1) {
                pushUnique(items, seen, makeArithmetic(a, b, '-', levelSub));
            }
        }
        return items;
    }

    function generateMultiplyWithin20() {
        const items = [];
        const seen = {};
        let a;
        let b;
        for (a = 2; a <= 10; a += 1) {
            for (b = 1; b <= 10; b += 1) {
                if (a * b > 20) continue;
                pushUnique(items, seen, makeArithmetic(a, b, '*', 'L5'));
            }
        }
        return items;
    }

    function buildPracticePool(band) {
        const id = normalizePracticeBand(band);
        if (id === 'within10') return generateAddSub(10, 'L3', 'L4');
        if (id === 'within20') return generateAddSub(20, 'L3', 'L4');
        if (id === 'within50') return generateAddSub(50, 'L3', 'L4');
        if (id === 'addsub100') return generateAddSub(100, 'L3', 'L4');
        return generateAddSub(100, 'L3', 'L4').concat(generateMultiplyWithin20());
    }

    function mixPracticePool(pool, salt) {
        const adds = rotate(pool.filter(function (item) { return item.op === '+'; }), salt);
        const subs = rotate(pool.filter(function (item) { return item.op === '-'; }), salt + 1);
        const muls = rotate(pool.filter(function (item) { return item.op === '*'; }), salt + 2);
        const mixed = [];
        const max = Math.max(adds.length, subs.length, muls.length);
        let index;
        for (index = 0; index < max; index += 1) {
            if (adds[index]) mixed.push(adds[index]);
            if (subs[index]) mixed.push(subs[index]);
            if (muls[index]) mixed.push(muls[index]);
        }
        return mixed;
    }

    function toArithmeticRound(item, index) {
        const value = Math.max(0, Math.round(item.answer));
        const options = choiceOptions(value, index + 5);
        const expression = item.left + ' ' + opMark(item.op) + ' ' + item.right + ' = ?';
        return {
            id: item.id,
            level: item.level,
            skillId: item.skillId,
            prompt: '算一算',
            tokens: expression,
            speak: expression.replace('×', '乘'),
            answerValue: value,
            options: options,
            answer: Math.max(0, options.indexOf(String(value)))
        };
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
        const level = String(settings.level || 'L3');
        const pool = levelPool(bank, level).filter(function (item) {
            return item.op === '+' || item.op === '-' || item.op === '*';
        });
        const size = Math.max(1, Math.min(pool.length, Number(settings.size) || 5));
        return {
            mode: 'math-bank',
            level: level,
            rounds: pool.slice(0, size).map(toArithmeticRound)
        };
    }

    function buildPracticeQuiz(band, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const pool = mixPracticePool(buildPracticePool(band), Number(settings.salt) || 0);
        const size = Math.max(1, Math.min(pool.length, Number(settings.size) || 8));
        return {
            mode: 'math-bank',
            level: String(settings.level || 'L3'),
            band: normalizePracticeBand(band),
            rounds: pool.slice(0, size).map(toArithmeticRound)
        };
    }

    function buildQuiz(bank, options) {
        const settings = options && typeof options === 'object' ? options : {};
        const level = String(settings.level || 'L1');
        if (settings.band) {
            if (level === 'L1') return buildCountQuiz(bank, settings);
            if (level === 'L2') return buildCompareQuiz(bank, settings);
            return buildPracticeQuiz(settings.band, settings);
        }
        if (level === 'L2') return buildCompareQuiz(bank, settings);
        if (level === 'L3' || level === 'L4' || level === 'L5') return buildArithmeticQuiz(bank, settings);
        return buildCountQuiz(bank, settings);
    }

    function getRuntimeBank() {
        const data = global.PersonalWorkbenchMathBankData;
        const parsed = parseBank(data && data.bank);
        const extra = buildPracticePool(DEFAULT_PRACTICE_BAND);
        const core = extra.filter(function (item) { return item.op === '+'; }).slice(0, 20)
            .concat(extra.filter(function (item) { return item.op === '-'; }).slice(0, 20))
            .concat(extra.filter(function (item) { return item.op === '*'; }));
        const seen = {};
        const merged = [];
        parsed.concat(core).forEach(function (item) {
            if (!item || !item.id || seen[item.id]) return;
            seen[item.id] = true;
            merged.push(item);
        });
        return merged;
    }

    global.PersonalWorkbenchPreschoolMathBank = {
        DEFAULT_PRACTICE_BAND: DEFAULT_PRACTICE_BAND,
        parseBank: parseBank,
        choiceOptions: choiceOptions,
        normalizePracticeBand: normalizePracticeBand,
        listPracticeBands: listPracticeBands,
        buildPracticePool: buildPracticePool,
        buildCountQuiz: buildCountQuiz,
        buildCompareQuiz: buildCompareQuiz,
        buildArithmeticQuiz: buildArithmeticQuiz,
        buildPracticeQuiz: buildPracticeQuiz,
        buildQuiz: buildQuiz,
        getRuntimeBank: getRuntimeBank
    };
})(typeof window !== 'undefined' ? window : globalThis);
