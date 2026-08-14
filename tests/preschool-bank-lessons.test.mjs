import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repoRoot, 'prj');

await import('../prj/preschool-phonics-data.js');
await import('../prj/preschool-phonics.js');
await import('../prj/preschool-math-data.js');
await import('../prj/preschool-math-bank.js');

const phonics = globalThis.PersonalWorkbenchPreschoolPhonics;
const mathBank = globalThis.PersonalWorkbenchPreschoolMathBank;

test('phonics lesson 3 builds CVC listen-and-choose rounds from the word bank', () => {
    const words = JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', 'english', 'phonics', 'word-bank.json'), 'utf8'));
    const parsed = phonics.parseBank(words);
    const cvc = parsed.filter(item => item.stageId === 'cvc-blending' || item.stageId === 'short-vowels-and-families');
    assert.ok(cvc.length >= 20);
    const ten = phonics.buildBlendQuiz(parsed, { preferred: 'mat', size: 10 });
    assert.equal(ten.rounds.length, 10);
    assert.equal(ten.rounds[0].text, 'mat');
    assert.ok(ten.rounds[0].blend.includes('-'));
    for (const round of ten.rounds) {
        assert.equal(round.options.length, 3);
        assert.equal(round.options[round.answer], round.text);
        assert.equal(new Set(round.options).size, 3);
        assert.ok(cvc.some(item => item.text === round.text));
        for (const option of round.options) {
            assert.ok(cvc.some(item => item.text === option), `${option} is not a CVC bank word`);
        }
    }
    assert.equal(phonics.getRuntimeBank().length, parsed.length);
});

test('math lesson 1 builds counting rounds from L1 problem bank answers', () => {
    const problems = JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', '数学', 'problem-bank.json'), 'utf8'));
    const parsed = mathBank.parseBank(problems);
    const quiz = mathBank.buildCountQuiz(parsed, { level: 'L1', size: 5 });
    assert.equal(quiz.rounds.length, 5);
    for (const round of quiz.rounds) {
        assert.equal(round.level, 'L1');
        assert.equal(typeof round.answerValue, 'number');
        assert.equal(Number(round.options[round.answer]), round.answerValue);
        assert.equal(round.options.length, 3);
        assert.match(round.prompt, /数一数/);
        assert.ok(round.tokens.length >= 1);
    }
    assert.equal(mathBank.getRuntimeBank().length, parsed.length);
});

test('math lessons 2 and 3 build compare and arithmetic rounds from L2/L3', () => {
    const problems = JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', '数学', 'problem-bank.json'), 'utf8'));
    const parsed = mathBank.parseBank(problems);
    const compare = mathBank.buildQuiz(parsed, { level: 'L2', size: 5 });
    assert.equal(compare.rounds.length, 5);
    for (const round of compare.rounds) {
        assert.equal(round.level, 'L2');
        assert.match(round.tokens, /vs/);
        assert.equal(Number(round.options[round.answer]), round.answerValue);
    }
    const arithmetic = mathBank.buildQuiz(parsed, { level: 'L3', size: 10 });
    assert.equal(arithmetic.rounds.length, 10);
    assert.ok(arithmetic.rounds.some(round => round.tokens.includes('8 + 7')));
    assert.ok(arithmetic.rounds.some(round => round.tokens.includes('12 - 5')));
    for (const round of arithmetic.rounds) {
        assert.equal(round.level, 'L3');
        assert.match(round.tokens, /\d+ [+-] \d+ = \?/);
        assert.equal(Number(round.options[round.answer]), round.answerValue);
    }
});

test('config and app wire phonics-cvc and math-bank instead of handwritten cards', () => {
    const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(config, /mode: 'phonics-cvc'/);
    assert.match(config, /id: 'preschool-english-phonics-3'/);
    assert.doesNotMatch(config, /options: \['mat', 'bat', 'fat'\]/);
    assert.match(config, /mode: 'math-bank'/);
    assert.match(config, /id: 'preschool-math-1'/);
    assert.match(config, /id: 'preschool-math-2'/);
    assert.match(config, /level: 'L2'/);
    assert.match(config, /id: 'preschool-math-3'/);
    assert.match(config, /level: 'L3'/);
    assert.match(config, /size: 10/);
    assert.doesNotMatch(config, /prompt: '10 - 9 = \?'/);
    assert.doesNotMatch(config, /prompt: '8 \+ 7 = \?'/);
    assert.doesNotMatch(config, /prompt: '12 - 5 = \?'/);
    assert.match(app, /buildBankQuizSession/);
    assert.match(app, /speakBankQuizRound/);
    assert.match(app, /buildQuiz/);
    assert.match(app, /bank-quiz-next/);
    assert.match(html, /preschool-phonics\.js/);
    assert.match(html, /preschool-math-bank\.js/);
});
