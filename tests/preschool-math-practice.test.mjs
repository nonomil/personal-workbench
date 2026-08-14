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

test('practice bands are five grade-label-free steps and default to mix100', () => {
    const bands = mathBank.listPracticeBands();
    assert.deepEqual(bands.map(item => item.id), ['within10', 'within20', 'within50', 'addsub100', 'mix100']);
    assert.equal(mathBank.DEFAULT_PRACTICE_BAND, 'mix100');
    assert.equal(mathBank.normalizePracticeBand(''), 'mix100');
    assert.equal(mathBank.normalizePracticeBand('within20'), 'within20');
    assert.equal(mathBank.normalizePracticeBand('within100'), 'mix100');
    assert.equal(mathBank.normalizePracticeBand('grade-2'), 'mix100');
    for (const band of bands) {
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
    assert.equal(growth.garden.mathPracticeBand, 'mix100');
    const next = gardenEngine.setMathPracticeBand(growth, 'within20');
    assert.equal(next.ok, true);
    assert.equal(next.growth.garden.mathPracticeBand, 'within20');
    const legacy = gardenEngine.normalize({ garden: { mathPracticeBand: 'within100' } });
    assert.equal(legacy.garden.mathPracticeBand, 'mix100');
    const fallback = gardenEngine.normalize({ garden: { mathPracticeBand: '一年级' } });
    assert.equal(fallback.garden.mathPracticeBand, 'mix100');
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
    assert.doesNotMatch(app, /一年级|二年级/);
    assert.match(config, /口算级别在设置里选|100 以内/);
    assert.match(html, /preschool-math-bank\.js\?v=20260814-math-bands-v2/);
    assert.match(html, /preschool-garden\.js\?v=20260814-zombie-pace-v1/);
    assert.match(html, /app\.js\?v=20260815-streak-v1/);
});
