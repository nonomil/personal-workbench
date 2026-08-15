import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/storage.js');
await import('../prj/preschool-english-vocab.js');
const storage = globalThis.PersonalWorkbenchStorage;
const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;

test('old mistakes migrate to errorType read without exploding', () => {
    const normalized = storage.normalizeState({
        schemaVersion: 5,
        tasks: [],
        dailyPlans: [],
        mistakes: [{ id: 'm1', subject: '英语', question: 'cat · 猫', sourceKey: 'english:cat', status: 'todo', date: '2026-08-10' }]
    });
    assert.equal(normalized.mistakes[0].errorType, 'read');
    assert.equal(normalized.mistakes[0].correctStreak, 0);
});

test('recordLessonMistake keeps listen/read/spell errorType', () => {
    const first = storage.recordLessonMistake([], {
        subject: '英语',
        question: 'dog · 狗',
        sourceKey: 'english:dog',
        errorType: 'listen',
        date: '2026-08-16'
    });
    assert.equal(first.item.errorType, 'listen');
    const again = storage.recordLessonMistake(first.mistakes, {
        subject: '英语',
        question: 'dog · 狗',
        sourceKey: 'english:dog',
        errorType: 'spell',
        date: '2026-08-16'
    });
    assert.equal(again.item.errorType, 'spell');
    assert.equal(again.item.attempts, 2);
});

test('english mistake cards classify and mark due review', () => {
    const bank = [
        { text: 'cat', zh: '猫', image: 'assets/img/vocab/cat.png', theme: '动物', level: 'L1', phrase: 'A cat.', phraseZh: '猫' },
        { text: 'dog', zh: '狗', image: 'assets/img/vocab/dog.png', theme: '动物', level: 'L1', phrase: 'A dog.', phraseZh: '狗' }
    ];
    const cards = vocab.englishMistakeCards([
        { subject: '英语', question: 'cat · 猫', sourceKey: 'english:cat', errorType: 'listen', status: 'todo', date: '2026-08-15', attempts: 2 },
        { subject: '英语', question: 'dog · 狗', sourceKey: 'english:dog', errorType: 'spell', status: 'mastered', date: '2026-08-15' },
        { subject: '识字', question: '识字量：的', sourceKey: 'literacy:的' }
    ], bank, '2026-08-16');
    assert.equal(cards.length, 1);
    assert.equal(cards[0].word, 'cat');
    assert.equal(cards[0].errorType, 'listen');
    assert.equal(cards[0].due, true);
    assert.equal(cards[0].label, '听力误判');
});

test('wrongbook drill uses quiz engine and three correct answers master the card', () => {
    const bank = [
        { text: 'cat', zh: '猫', image: 'assets/img/vocab/cat.png', theme: '动物', level: 'L1', phrase: 'A cat.', phraseZh: '猫' },
        { text: 'dog', zh: '狗', image: 'assets/img/vocab/dog.png', theme: '动物', level: 'L1', phrase: 'A dog.', phraseZh: '狗' },
        { text: 'pig', zh: '猪', image: 'assets/img/vocab/pig.png', theme: '动物', level: 'L1', phrase: 'A pig.', phraseZh: '猪' },
        { text: 'hen', zh: '鸡', image: 'assets/img/vocab/hen.png', theme: '动物', level: 'L1', phrase: 'A hen.', phraseZh: '鸡' }
    ];
    const mistakes = [{ subject: '英语', question: 'cat · 猫', sourceKey: 'english:cat', errorType: 'read', status: 'todo', date: '2026-08-16' }];
    const drill = vocab.buildEnglishWrongbookDrill(mistakes, bank);
    assert.ok(drill.questions.length >= 1);
    assert.equal(drill.questions[0].word, 'cat');
    let next = vocab.applyEnglishWrongbookResult(mistakes, 'english:cat', true);
    next = vocab.applyEnglishWrongbookResult(next, 'english:cat', true);
    next = vocab.applyEnglishWrongbookResult(next, 'english:cat', true);
    assert.equal(next[0].status, 'mastered');
    assert.equal(next[0].correctStreak, 3);
    const reset = vocab.applyEnglishWrongbookResult(next, 'english:cat', false);
    assert.equal(reset[0].status, 'todo');
    assert.equal(reset[0].correctStreak, 0);
});

test('english zone wires wrongbook and archive actions', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    assert.match(app, /open-english-wrongbook/);
    assert.match(app, /open-english-archive/);
    assert.match(app, /open-english-drill/);
    assert.match(app, /englishMistakeCards/);
});
