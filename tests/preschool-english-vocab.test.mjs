import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bankPath = path.join(repoRoot, 'prj', 'data', 'preschool', '英语', 'vocabulary-bank.json');

await import('../prj/child-courses.js');
await import('../prj/preschool-english-vocab-data.js');
await import('../prj/preschool-english-vocab.js');
const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;

function readBank() {
    return JSON.parse(fs.readFileSync(bankPath, 'utf8'));
}

test('vocabulary bank keeps unique child words with a meaning and a sentence', () => {
    const parsed = vocab.parseBank(readBank());
    const texts = parsed.map(item => item.text.toLowerCase());
    assert.ok(parsed.length >= 500, `expected at least 500 words, got ${parsed.length}`);
    assert.ok(texts.includes('panda') && texts.includes('look') && texts.includes('school'));
    assert.equal(new Set(texts).size, parsed.length);
    for (const item of parsed) {
        assert.ok(item.text);
        assert.ok(item.zh);
        assert.ok(item.theme);
        assert.ok(item.phrase);
        assert.equal(item.phrase.toLowerCase().includes(item.text.toLowerCase()), true, `${item.text} missing from phrase`);
        assert.ok(item.phraseZh);
        assert.match(item.level, /^L[1-5]$/);
    }
    assert.equal(vocab.getRuntimeBank().length, parsed.length);
});

test('speak batch serves five daily word-in-sentence cards and never deducts sunlight', () => {
    const rules = { reviewIntervalsDays: [1, 3, 7, 14] };
    const bank = vocab.parseBank(readBank());
    const empty = vocab.createDefaultProgress();
    const dayOne = vocab.dailyWindow(bank, '2026-08-01', 5);
    const dayTwo = vocab.dailyWindow(bank, '2026-08-02', 5);
    assert.equal(dayOne.day, 1);
    assert.equal(dayOne.batch.length, 5);
    assert.equal(dayOne.batch[0].text, bank[0].text);
    assert.equal(dayTwo.day, 2);
    assert.notEqual(dayTwo.batch[0].text, dayOne.batch[0].text);
    assert.equal(new Set(dayOne.batch.map(item => item.text)).size, 5);
    const batch = vocab.buildSpeakBatch(bank, empty, rules, '2026-08-01', 'hello', 5);
    assert.deepEqual(batch.map(item => item.text), dayOne.batch.map(item => item.text));
    let progress = vocab.markKnown(empty, 'hello', true, '2026-08-14', rules);
    assert.equal(progress.mastery.hello.state, 'ready');
    assert.equal(progress.mastery.hello.sunlightDelta, 0);
});

test('speak batch puts due review words first using 1/3/7/14 without SM-2', () => {
    const rules = { reviewIntervalsDays: [1, 3, 7, 14] };
    const bank = vocab.parseBank(readBank());
    let progress = vocab.markKnown(vocab.createDefaultProgress(), 'panda', true, '2026-08-14', rules);
    assert.equal(progress.mastery.panda.nextReview, '2026-08-17');
    const sameDay = vocab.buildSpeakBatch(bank, progress, rules, '2026-08-14', '', 5);
    assert.equal(sameDay.some(item => item.text === 'panda' && item.review), false);
    const dueDay = vocab.buildSpeakBatch(bank, progress, rules, '2026-08-17', '', 5);
    assert.equal(dueDay[0].text, 'panda');
    assert.equal(dueDay[0].review, true);
    assert.deepEqual(vocab.buildReviewQueue(progress, rules, '2026-08-17', ['panda', 'blue']), ['panda']);
});

test('english mastery stays inside the existing courseProgress object', () => {
    const courses = globalThis.PersonalWorkbenchChildCourses;
    const normalized = courses.normalize({
        completedLessonIds: ['preschool-english-words-1'],
        english: { mastery: { hello: { state: 'ready', dates: ['2026-08-14'], attempts: 1, correct: 1, nextReview: '2026-08-17' } } }
    });
    assert.deepEqual(normalized.completedLessonIds, ['preschool-english-words-1']);
    assert.equal(normalized.english.mastery.hello.state, 'ready');
    assert.ok(normalized.literacy);
});

test('preschool english course reads the vocab bank instead of handwritten word cards', () => {
    const config = fs.readFileSync(path.join(repoRoot, 'prj', 'config.js'), 'utf8');
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    const storage = fs.readFileSync(path.join(repoRoot, 'prj', 'storage.js'), 'utf8');
    assert.match(config, /mode: 'english-speak'/);
    assert.match(config, /id: 'preschool-english-words-1'/);
    assert.match(app, /dailyWindow/);
    assert.match(app, /buildSpeakBatch/);
    assert.match(app, /今天再认/);
    assert.match(app, /Day \$\{english\.day\}/);
    assert.match(app, /data-action="english-known"/);
    assert.match(app, /听句子/);
    assert.match(app, /听单词/);
    assert.match(html, /preschool-english-vocab\.js/);
    assert.match(storage, /practiceLessonId: PRESCHOOL_ENGLISH_WORD_LESSON_ID/);
});
