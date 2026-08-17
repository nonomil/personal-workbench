import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repoRoot, 'prj');

await import('../prj/preschool-math-data.js');
await import('../prj/preschool-math-bank.js');
await import('../prj/preschool-garden.js');

const mathBank = globalThis.PersonalWorkbenchPreschoolMathBank;
const gardenEngine = globalThis.PersonalWorkbenchPreschoolGarden;

test('practice bands cover add/sub, multiply, divide, koujue and mix without grade labels', () => {
    const bands = mathBank.listPracticeBands();
    assert.deepEqual(bands.map(item => item.id), [
        'within10', 'within20', 'within50', 'addsub100', 'addsub100big',
        'mul20', 'mul40', 'mul60', 'mul80', 'mul100',
        'divSimple', 'koujue',
        'mix100', 'mixMulDiv', 'mixKoujue'
    ]);
    assert.equal(mathBank.DEFAULT_PRACTICE_BAND, 'within20');
    assert.equal(mathBank.normalizePracticeBand(''), 'within20');
    assert.equal(mathBank.normalizePracticeBand('within20'), 'within20');
    assert.equal(mathBank.normalizePracticeBand('mul40'), 'mul40');
    assert.equal(mathBank.normalizePracticeBand('koujue'), 'koujue');
    assert.equal(mathBank.normalizePracticeBand('within100'), 'addsub100');
    assert.equal(mathBank.normalizePracticeBand('grade-2'), 'within20');
    for (const band of bands) {
        assert.ok(band.group);
        assert.doesNotMatch(band.title, /一年级|二年级|年级/);
        assert.doesNotMatch(band.summary, /一年级|二年级|年级/);
    }
    const current = bands.find(item => item.id === 'mix100');
    assert.match(current.summary, /100/);
    assert.match(current.summary, /乘法/);
});

test('mix100 pool is large and mixes 100-range add/sub with multiply to 20', () => {
    const pool = mathBank.buildPracticePool('mix100');
    assert.ok(pool.length >= 2000, `expected >= 2000 mix100 problems, got ${pool.length}`);
    const adds = pool.filter(item => item.op === '+');
    const subs = pool.filter(item => item.op === '-');
    const muls = pool.filter(item => item.op === '*');
    assert.ok(adds.length >= 400, `adds ${adds.length}`);
    assert.ok(subs.length >= 400, `subs ${subs.length}`);
    assert.ok(muls.length >= 20, `muls ${muls.length}`);
    assert.ok(adds.some(item => item.left >= 20 && item.right >= 10 && item.answer <= 100));
    assert.ok(subs.some(item => item.left >= 40 && item.answer >= 0 && item.answer <= 100));
    assert.ok(muls.every(item => item.left * item.right === item.answer && item.answer <= 20));
    assert.ok(muls.every(item => item.left >= 2 && item.right >= 1));
    for (const item of pool) {
        assert.ok(item.id);
        assert.equal(item.answer, item.op === '+' ? item.left + item.right : item.op === '-' ? item.left - item.right : item.left * item.right);
        if (item.op === '+' || item.op === '-') {
            assert.ok(item.left <= 100 && item.right <= 100 && item.answer <= 100);
        }
    }
});

test('addsub100big uses two-digit add/sub and multiply bands stay under product caps', () => {
    const big = mathBank.buildPracticePool('addsub100big');
    assert.ok(big.length >= 200);
    assert.ok(big.every(item => item.op === '+' || item.op === '-'));
    assert.ok(big.every(item => item.left >= 10 && item.right >= 10 && item.answer <= 100));
    const mul20 = mathBank.buildPracticePool('mul20');
    const mul40 = mathBank.buildPracticePool('mul40');
    const mul100 = mathBank.buildPracticePool('mul100');
    assert.ok(mul20.length >= 20);
    assert.ok(mul40.length > mul20.length);
    assert.ok(mul100.length > mul40.length);
    assert.ok(mul20.every(item => item.op === '*' && item.answer <= 20));
    assert.ok(mul40.every(item => item.op === '*' && item.answer <= 40));
    assert.ok(mul100.every(item => item.op === '*' && item.left * item.right === item.answer && item.answer <= 100));
});

test('simple divide and koujue pools stay exact and speak the table', () => {
    const divs = mathBank.buildPracticePool('divSimple');
    assert.ok(divs.length >= 40);
    assert.ok(divs.every(item => item.op === '/' && item.right >= 1 && item.right <= 10));
    assert.ok(divs.every(item => item.left === item.right * item.answer && item.answer >= 1 && item.answer <= 10));
    const koujue = mathBank.buildPracticePool('koujue');
    assert.equal(koujue.length, 64);
    assert.ok(koujue.every(item => item.op === '*' && item.left >= 2 && item.left <= 9 && item.right >= 2 && item.right <= 9));
    assert.ok(koujue.every(item => item.koujue));
    assert.ok(koujue.some(item => item.koujue === '二五一十'));
    assert.ok(koujue.some(item => item.koujue === '三四十二'));
    const mixMulDiv = mathBank.buildPracticePool('mixMulDiv');
    assert.ok(mixMulDiv.some(item => item.op === '*'));
    assert.ok(mixMulDiv.some(item => item.op === '/'));
    const mixKoujue = mathBank.buildPracticePool('mixKoujue');
    assert.ok(mixKoujue.some(item => item.op === '*' && item.koujue));
    assert.ok(mixKoujue.some(item => item.op === '/' && item.koujue));
    const quiz = mathBank.buildPracticeQuiz('koujue', { size: 8 });
    assert.ok(quiz.rounds.some(round => /口诀|×/.test(round.tokens + round.prompt)));
});

test('five practice pools stay inside their range and grow by band', () => {
    const ten = mathBank.buildPracticePool('within10');
    const twenty = mathBank.buildPracticePool('within20');
    const fifty = mathBank.buildPracticePool('within50');
    const hundred = mathBank.buildPracticePool('addsub100');
    assert.ok(ten.length >= 90);
    assert.ok(twenty.length > ten.length);
    assert.ok(fifty.length > twenty.length);
    assert.ok(hundred.length > fifty.length);
    assert.ok(hundred.every(item => item.op === '+' || item.op === '-'));
    for (const item of ten) {
        assert.ok(item.op === '+' || item.op === '-');
        assert.ok(item.left <= 10 && item.right <= 10 && item.answer <= 10);
    }
    for (const item of twenty) {
        assert.ok(item.op === '+' || item.op === '-');
        assert.ok(item.left <= 20 && item.right <= 20 && item.answer <= 20);
    }
    for (const item of fifty) {
        assert.ok(item.op === '+' || item.op === '-');
        assert.ok(item.left <= 50 && item.right <= 50 && item.answer <= 50);
    }
});

test('buildQuiz with mix100 band serves mixed add/sub/mul and scattered choices', () => {
    const quiz = mathBank.buildQuiz(mathBank.getRuntimeBank(), { band: 'mix100', level: 'L3', size: 24 });
    assert.equal(quiz.rounds.length, 24);
    const tokens = quiz.rounds.map(round => round.tokens);
    assert.ok(tokens.some(text => /\d+ \+ \d+ = \?/.test(text)));
    assert.ok(tokens.some(text => /\d+ - \d+ = \?/.test(text)));
    assert.ok(tokens.some(text => /\d+ \* \d+ = \?/.test(text) || /\d+ × \d+ = \?/.test(text)));
    assert.ok(quiz.rounds.some(round => round.answerValue >= 20));
    for (const round of quiz.rounds) {
        assert.equal(round.options.length, 3);
        assert.equal(new Set(round.options).size, 3);
        assert.equal(Number(round.options[round.answer]), round.answerValue);
    }
    const big = quiz.rounds.find(round => round.answerValue >= 20);
    assert.ok(big);
    const neighbors = [String(big.answerValue + 1), String(Math.max(0, big.answerValue - 1))];
    const extras = big.options.filter(option => !neighbors.includes(option) && option !== String(big.answerValue));
    assert.ok(extras.length >= 0);
    const twoDigitChoices = mathBank.choiceOptions(87, 3);
    assert.equal(twoDigitChoices.length, 3);
    assert.ok(twoDigitChoices.includes('87'));
    assert.ok(twoDigitChoices.some(option => option === '77' || option === '97'));
});

test('garden stores math practice band on existing growth without a new storage key', () => {
    const growth = gardenEngine.normalize({});
    assert.equal(growth.garden.mathPracticeBand, 'within20');
    const next = gardenEngine.setMathPracticeBand(growth, 'within20');
    assert.equal(next.ok, true);
    assert.equal(next.growth.garden.mathPracticeBand, 'within20');
    const koujue = gardenEngine.setMathPracticeBand(growth, 'koujue');
    assert.equal(koujue.growth.garden.mathPracticeBand, 'koujue');
    const mul = gardenEngine.setMathPracticeBand(growth, 'mul80');
    assert.equal(mul.growth.garden.mathPracticeBand, 'mul80');
    const legacy = gardenEngine.normalize({ garden: { mathPracticeBand: 'within100' } });
    assert.equal(legacy.garden.mathPracticeBand, 'addsub100');
    const fallback = gardenEngine.normalize({ garden: { mathPracticeBand: '一年级' } });
    assert.equal(fallback.garden.mathPracticeBand, 'within20');
});

test('settings and math lessons read the selected practice band', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(app, /renderPreschoolMathBandSettings/);
    assert.match(app, /set-math-band/);
    assert.match(app, /getMathPracticeBand/);
    assert.match(app, /setMathPracticeBand/);
    assert.match(app, /band:\s*getMathPracticeBand\(\)/);
    assert.match(app, /buildPracticeQuiz\(getMathPracticeBand\(\)/);
    assert.match(app, /flashcard-math-pick/);
    assert.match(app, /renderPreschoolMathBandChips/);
    assert.match(app, /preschool-math-bands/);
    assert.match(app, /math-band-group/);
    assert.match(app, /加减、乘法、除法和口诀可以分开练/);
    assert.doesNotMatch(app, /一年级|二年级/);
    assert.match(config, /今日口算直接选题/);
    assert.match(config, /乘法口诀/);
    assert.match(config, /简单除法/);
    assert.match(html, /preschool-math-bank\.js\?v=20260817-math-kouuan-v1/);
    assert.match(html, /preschool-garden\.js\?v=20260817-math-kouuan-v1/);
    assert.match(html, /app\.js\?v=20260818-phonics-zh-v1/);
});

test('garden stores per-subject practice levels without grade labels or a new storage key', () => {
    const growth = gardenEngine.normalize({});
    assert.equal(growth.garden.practiceLevels.literacy, 'L1');
    assert.equal(growth.garden.practiceLevels.english, 'L1');
    assert.equal(growth.garden.practiceLevels.pinyin, 'L1');
    assert.equal(growth.garden.practiceLevels.poetry, 'L1');
    assert.equal(growth.garden.practiceLevels.phonics, 'L1');
    assert.equal(growth.garden.practiceLevels.math, 'L1');
    assert.equal(growth.garden.practiceLevels.motion, 'L1');
    const next = gardenEngine.setPracticeLevel(growth, 'literacy', 'L3');
    assert.equal(next.ok, true);
    assert.equal(next.growth.garden.practiceLevels.literacy, 'L3');
    assert.equal(next.growth.garden.practiceLevels.english, 'L1');
    const bad = gardenEngine.setPracticeLevel(growth, 'literacy', '一年级');
    assert.equal(bad.ok, false);
    const legacy = gardenEngine.normalize({ garden: { practiceLevels: { literacy: 'L4', english: 'grade-2' } } });
    assert.equal(legacy.garden.practiceLevels.literacy, 'L4');
    assert.equal(legacy.garden.practiceLevels.english, 'L1');
});

test('settings and today cards read the selected subject practice level', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    assert.match(app, /renderPreschoolPracticeLevelSettings/);
    assert.match(app, /set-practice-level/);
    assert.match(app, /getPracticeLevelForCourse/);
    assert.match(app, /preschool-flashcard-levels/);
    assert.doesNotMatch(app, /一年级|二年级|年级/);
});
