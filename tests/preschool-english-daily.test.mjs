import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

await import('../prj/preschool-english-vocab-data.js');
await import('../prj/preschool-english-data.js');
await import('../prj/preschool-english-vocab.js');
const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;
const daily = globalThis.PersonalWorkbenchEnglishDailyData;

test('daily loop bank has 80 sourced words and serves three a day', () => {
    assert.equal(daily.bank.length, 80);
    assert.equal(daily.size, 3);
    const loop = vocab.getDailyLoopBank();
    assert.equal(loop.length, 80);
    const texts = loop.map((item) => item.text);
    assert.equal(new Set(texts).size, 80);
    assert.ok(texts.includes('hello'));
    assert.ok(texts.includes('apple'));
    const missingImages = loop.filter((item) => {
        const rel = String((item.media && item.media.image) || item.image || '').replace(/^\.\.\//, '');
        return !rel || !fs.existsSync(path.join(repoRoot, 'prj', rel));
    });
    assert.equal(missingImages.length, 0, missingImages.map((item) => item.text).join(','));
    const dayOne = vocab.dailyWindow(loop, '2026-08-01', 3);
    const dayTwo = vocab.dailyWindow(loop, '2026-08-02', 3);
    assert.equal(dayOne.batch.length, 3);
    assert.equal(dayTwo.batch.length, 3);
    assert.notEqual(dayOne.batch[0].text, dayTwo.batch[0].text);
    for (const item of loop) {
        assert.ok(item.zh);
        assert.ok(item.phrase);
        assert.ok(item.phraseZh);
        assert.ok(item.source);
        assert.equal(item.phrase.toLowerCase().includes(item.text), true, `${item.text} missing from phrase`);
    }
});

test('known daily-loop words stay in existing english mastery', () => {
    const rules = { reviewIntervalsDays: [1, 3, 7, 14] };
    const loop = vocab.getDailyLoopBank();
    let progress = vocab.recordQuizAnswer(vocab.createDefaultProgress(), 'hello', { type: 'listen', correct: true, date: '2026-08-15', rules: rules });
    progress = vocab.recordQuizAnswer(progress, 'hello', { type: 'read', correct: true, date: '2026-08-15', rules: rules });
    progress = vocab.recordQuizAnswer(progress, 'hello', { type: 'spell', correct: true, date: '2026-08-15', rules: rules });
    assert.equal(progress.mastery.hello.state, 'ready');
    const due = vocab.buildReviewQueue(progress, rules, '2026-08-18', loop.map((item) => item.text));
    assert.deepEqual(due, ['hello']);
    const batch = vocab.buildSpeakBatch(loop, progress, rules, '2026-08-18', '', 3);
    assert.equal(batch[0].text, 'hello');
    assert.equal(batch[0].review, true);
});

test('english today ui shows 今日 3 词 and 我的词库', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    const config = fs.readFileSync(path.join(repoRoot, 'prj', 'config.js'), 'utf8');
    const table = fs.readFileSync(path.join(repoRoot, 'docs', '02-课程', '英语', '06-80词溯源表.md'), 'utf8');
    assert.match(app, /今日 3 词/);
    assert.match(app, /我的词库/);
    assert.match(app, /getDailyLoopBank/);
    assert.match(app, /preschool-english-daily/);
    assert.match(app, /english-more-panel/);
    assert.match(app, /renderPreschoolCourseFlashcards\(course\) \+ renderPreschoolEnglishExtras\(course\)/);
    assert.doesNotMatch(app, /\$\{renderPreschoolEnglishTodayChips\(course\)\}/);
    assert.doesNotMatch(app, /\$\{renderPreschoolEnglishDailyLoop\(course\)\}/);
    assert.match(config, /今日 3 词/);
    assert.match(config, /size: 3/);
    assert.match(html, /preschool-english-data\.js\?v=20260816-english-uplift-v2/);
    assert.match(html, /app\.js\?v=20260818-phonics-zh-v1/);
    assert.match(table, /hello/);
    assert.match(table, /Dolch/);
    assert.match(table, /课标一年级生活词/);
});
