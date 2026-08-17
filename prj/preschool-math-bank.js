(function (global) {
    'use strict';

    var PRACTICE_BANDS = [
        { id: 'within10', group: '加减', title: '10 以内', summary: '10 以内加减' },
        { id: 'within20', group: '加减', title: '20 以内', summary: '20 以内加减' },
        { id: 'within50', group: '加减', title: '50 以内', summary: '50 以内加减' },
        { id: 'addsub100', group: '加减', title: '100 以内', summary: '100 以内加减' },
        { id: 'addsub100big', group: '加减', title: '100 以内较大数', summary: '两边都是两位数的加减' },
        { id: 'mul20', group: '乘法', title: '乘法 20 以内', summary: '积不超过 20' },
        { id: 'mul40', group: '乘法', title: '乘法 40 以内', summary: '积不超过 40' },
        { id: 'mul60', group: '乘法', title: '乘法 60 以内', summary: '积不超过 60' },
        { id: 'mul80', group: '乘法', title: '乘法 80 以内', summary: '积不超过 80' },
        { id: 'mul100', group: '乘法', title: '乘法 100 以内', summary: '积不超过 100' },
        { id: 'divSimple', group: '除法口诀', title: '简单除法', summary: '整除，商是 1 到 10' },
        { id: 'koujue', group: '除法口诀', title: '乘法口诀', summary: '二到九的口诀' },
        { id: 'mix100', group: '混合', title: '加减 + 小乘法', summary: '100 以内加减 + 20 以内乘法' },
        { id: 'mixMulDiv', group: '混合', title: '乘除一起练', summary: '100 以内乘法 + 简单除法' },
        { id: 'mixKoujue', group: '混合', title: '口诀 + 除法', summary: '乘法口诀和对应的除法' }
    ];
    var DEFAULT_PRACTICE_BAND = 'within20';
    var BAND_IDS = {};
    PRACTICE_BANDS.forEach(function (item) { BAND_IDS[item.id] = true; });
    var CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

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

    function gcd(a, b) {
        let x = Math.abs(Number(a) || 0);
        let y = Math.abs(Number(b) || 0);
        while (y) {
            const next = x % y;
            x = y;
            y = next;
        }
        return x || 1;
    }

    function spread(items, salt) {
        const list = (Array.isArray(items) ? items : []).slice();
        const n = list.length;
        if (n <= 1) return list;
        let step = 7 + (Math.abs(Number(salt) || 0) % (n - 1));
        while (gcd(step, n) !== 1) step += 1;
        const out = [];
        let idx = Math.abs(Number(salt) || 0) % n;
        let i;
        for (i = 0; i < n; i += 1) {
            out.push(list[idx]);
            idx = (idx + step) % n;
        }
        return out;
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
        if (BAND_IDS[value]) return value;
        if (value === 'within100') return 'addsub100';
        return DEFAULT_PRACTICE_BAND;
    }

    function listPracticeBands() {
        return PRACTICE_BANDS.map(function (item) {
            return { id: item.id, title: item.title, summary: item.summary, group: item.group };
        });
    }

    function opMark(op) {
        if (op === '*') return '×';
        if (op === '/') return '÷';
        return op;
    }

    function numberToChinese(n) {
        const value = Math.max(0, Math.round(Number(n) || 0));
        if (value <= 10) return CN_NUM[value];
        const tens = Math.floor(value / 10);
        const ones = value % 10;
        const head = tens === 1 ? '十' : CN_NUM[tens] + '十';
        return ones ? head + CN_NUM[ones] : head;
    }

    function koujueSpeak(a, b, product) {
        const left = CN_NUM[a] || String(a);
        const right = CN_NUM[b] || String(b);
        if (product < 10) return left + right + '得' + (CN_NUM[product] || String(product));
        if (product === 10) return left + right + '一十';
        return left + right + numberToChinese(product);
    }

    function makeArithmetic(left, right, op, level, extra) {
        let answer = 0;
        let skillId = 'addition';
        if (op === '+') {
            answer = left + right;
            skillId = 'addition';
        } else if (op === '-') {
            answer = left - right;
            skillId = 'take-away';
        } else if (op === '*') {
            answer = left * right;
            skillId = 'multiply';
        } else {
            answer = right ? left / right : 0;
            skillId = 'divide';
        }
        return Object.assign({
            id: 'math-' + skillId + '-' + left + '-' + right,
            skillId: skillId,
            level: level,
            prompt: left + ' ' + opMark(op) + ' ' + right + ' = ?',
            left: left,
            right: right,
            op: op,
            answer: answer
        }, extra || {});
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

    function generateAddSubBig(max) {
        const items = [];
        const seen = {};
        let a;
        let b;
        for (a = 10; a <= max; a += 1) {
            for (b = 10; b <= max - a; b += 1) {
                pushUnique(items, seen, makeArithmetic(a, b, '+', 'L4'));
            }
            for (b = 10; b <= a; b += 1) {
                pushUnique(items, seen, makeArithmetic(a, b, '-', 'L4'));
            }
        }
        return items;
    }

    function generateMultiply(maxProduct) {
        const items = [];
        const seen = {};
        let a;
        let b;
        for (a = 2; a <= 10; a += 1) {
            for (b = 1; b <= 10; b += 1) {
                if (a * b > maxProduct) continue;
                pushUnique(items, seen, makeArithmetic(a, b, '*', 'L5'));
            }
        }
        return items;
    }

    function generateKoujue() {
        const items = [];
        const seen = {};
        let a;
        let b;
        for (a = 2; a <= 9; a += 1) {
            for (b = 2; b <= 9; b += 1) {
                const product = a * b;
                pushUnique(items, seen, makeArithmetic(a, b, '*', 'L5', {
                    koujue: koujueSpeak(a, b, product)
                }));
            }
        }
        return items;
    }

    function generateDivide(maxProduct) {
        const items = [];
        const seen = {};
        let a;
        let b;
        for (a = 2; a <= 10; a += 1) {
            for (b = 1; b <= 10; b += 1) {
                const product = a * b;
                if (product > maxProduct) continue;
                pushUnique(items, seen, makeArithmetic(product, a, '/', 'L5'));
            }
        }
        return items;
    }

    function generateKoujueDivide() {
        const items = [];
        const seen = {};
        let a;
        let b;
        for (a = 2; a <= 9; a += 1) {
            for (b = 2; b <= 9; b += 1) {
                const product = a * b;
                pushUnique(items, seen, makeArithmetic(product, a, '/', 'L5', {
                    koujue: koujueSpeak(a, b, product)
                }));
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
        if (id === 'addsub100big') return generateAddSubBig(100);
        if (id === 'mul20') return generateMultiply(20);
        if (id === 'mul40') return generateMultiply(40);
        if (id === 'mul60') return generateMultiply(60);
        if (id === 'mul80') return generateMultiply(80);
        if (id === 'mul100') return generateMultiply(100);
        if (id === 'divSimple') return generateDivide(100);
        if (id === 'koujue') return generateKoujue();
        if (id === 'mixMulDiv') return generateMultiply(100).concat(generateDivide(100));
        if (id === 'mixKoujue') return generateKoujue().concat(generateKoujueDivide());
        return generateAddSub(100, 'L3', 'L4').concat(generateMultiply(20));
    }

    function mixPracticePool(pool, salt) {
        const adds = spread(pool.filter(function (item) { return item.op === '+'; }), salt);
        const subs = spread(pool.filter(function (item) { return item.op === '-'; }), salt + 1);
        const muls = spread(pool.filter(function (item) { return item.op === '*'; }), salt + 2);
        const divs = spread(pool.filter(function (item) { return item.op === '/'; }), salt + 3);
        const mixed = [];
        const max = Math.max(adds.length, subs.length, muls.length, divs.length);
        let index;
        for (index = 0; index < max; index += 1) {
            if (adds[index]) mixed.push(adds[index]);
            if (subs[index]) mixed.push(subs[index]);
            if (muls[index]) mixed.push(muls[index]);
            if (divs[index]) mixed.push(divs[index]);
        }
        return mixed;
    }

    function toArithmeticRound(item, index) {
        const value = Math.max(0, Math.round(item.answer));
        const options = choiceOptions(value, index + 5);
        const expression = item.left + ' ' + opMark(item.op) + ' ' + item.right + ' = ?';
        const hint = item.koujue ? '（' + item.koujue + '）' : '';
        return {
            id: item.id,
            level: item.level,
            skillId: item.skillId,
            prompt: item.koujue ? '口诀算一算' : '算一算',
            tokens: expression + hint,
            speak: item.koujue || expression.replace('×', '乘').replace('÷', '除以'),
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
            return item.op === '+' || item.op === '-' || item.op === '*' || item.op === '/';
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
