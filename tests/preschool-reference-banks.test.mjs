import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repoRoot, 'prj');

await import('../prj/preschool-pinyin-data.js');
await import('../prj/preschool-pinyin.js');
await import('../prj/preschool-poetry-data.js');
await import('../prj/preschool-poetry.js');
await import('../prj/preschool-phonics-data.js');
await import('../prj/preschool-phonics.js');

const pinyin = globalThis.PersonalWorkbenchPreschoolPinyin;
const poetry = globalThis.PersonalWorkbenchPreschoolPoetry;
const phonics = globalThis.PersonalWorkbenchPreschoolPhonics;

test('pinyin bank ports 23 initials, 24 finals and 16 whole syllables', () => {
    const bank = JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', '识字', 'pinyin-initial-bank.json'), 'utf8'));
    const parsed = pinyin.parseBank(bank);
    const initials = parsed.filter(item => item.kind === 'initial');
    const finals = parsed.filter(item => item.kind === 'final');
    const wholes = parsed.filter(item => item.kind === 'whole');
    assert.equal(parsed.length, 63);
    assert.equal(initials.length, 23);
    assert.equal(finals.length, 24);
    assert.equal(wholes.length, 16);
    assert.equal(new Set(initials.map(item => item.text)).size, 23);
    for (const item of parsed) {
        assert.equal(['坡', '始', '游', '她', '店'].some(char => item.sample.includes(char)), false);
    }
    const first = pinyin.buildInitialQuiz(parsed, { kind: 'initial', preferred: 'b', size: 10 });
    assert.equal(first.rounds.length, 10);
    assert.equal(first.rounds[0].text, 'b');
    assert.equal(first.rounds[0].options[first.rounds[0].answer], 'b');
    const finalsQuiz = pinyin.buildInitialQuiz(parsed, { kind: 'final', preferred: 'a', size: 8 });
    assert.equal(finalsQuiz.rounds[0].text, 'a');
    assert.match(finalsQuiz.rounds[0].prompt, /韵母/);
    const wholeQuiz = pinyin.buildInitialQuiz(parsed, { kind: 'whole', preferred: 'zhi', size: 8 });
    assert.equal(wholeQuiz.rounds[0].text, 'zhi');
    assert.equal(pinyin.getRuntimeBank().length, 63);
});

test('poetry lessons pick the next line from the poem bank', () => {
    const bank = JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', '古诗', 'poem-bank.json'), 'utf8'));
    const parsed = poetry.parseBank(bank);
    assert.ok(parsed.length >= 32);
    assert.equal(new Set(parsed.map(item => item.id)).size, parsed.length);
    assert.ok(parsed.some(item => item.id === 'poem-dengguanquelou'));
    assert.ok(parsed.some(item => item.id === 'poem-shanxing'));
    const quiz = poetry.buildLineQuiz(parsed, { preferred: 'poem-jingyesi', size: 5 });
    assert.equal(quiz.rounds.length, 5);
    assert.equal(quiz.rounds[0].tokens, '床前明月光');
    assert.equal(quiz.rounds[0].options[quiz.rounds[0].answer], '疑是地上霜');
    assert.equal(poetry.getRuntimeBank().length, parsed.length);
    const lessons = poetry.expandPoetryLessons([], parsed);
    assert.equal(lessons.length, parsed.length);
    assert.equal(lessons[0].id, 'preschool-poetry-1');
    assert.equal(lessons[0].activity.preferred, 'poem-jingyesi');
    assert.equal(lessons[1].activity.preferred, 'poem-yong-e');
    assert.equal(lessons[2].activity.preferred, 'poem-chunxiao');
    assert.match(lessons[3].title, /朗读《/);
});

test('phonics lessons 1-2 listen for letter sounds from the letter bank', () => {
    const letters = phonics.parseLetters(JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', 'english', 'phonics', 'letter-bank.json'), 'utf8')));
    assert.ok(letters.length >= 8);
    const amt = phonics.buildLetterQuiz(letters, { groups: 'amt', preferred: 'm', size: 3 });
    assert.equal(amt.rounds.length, 3);
    assert.equal(amt.rounds[0].text, 'm');
    assert.equal(amt.rounds[0].speak, 'map');
    const fb = phonics.buildLetterQuiz(letters, { groups: 'fb,amt', preferred: 'f', size: 5 });
    assert.equal(fb.rounds[0].text, 'f');
    assert.equal(phonics.getRuntimeLetters().length, letters.length);
});

test('config wires pinyin, poetry and letter quizzes instead of handwritten cards', () => {
    const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(config, /mode: 'pinyin-initial'/);
    assert.match(config, /kind: 'final'/);
    assert.match(config, /kind: 'whole'/);
    assert.match(config, /mode: 'poetry-line'/);
    assert.match(app, /expandPoetryLessons|buildLineQuiz/);
    assert.match(config, /mode: 'phonics-letter'/);
    assert.doesNotMatch(config, /广播/);
    assert.doesNotMatch(config, /山坡/);
    assert.match(app, /buildInitialQuiz/);
    assert.match(app, /buildLineQuiz/);
    assert.match(app, /buildLetterQuiz/);
    assert.match(html, /preschool-pinyin\.js/);
    assert.match(html, /preschool-poetry\.js/);
});
