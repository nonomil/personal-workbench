import assert from 'node:assert/strict';
import test from 'node:test';

await import('../prj/child-courses.js');
await import('../prj/preschool-english-vocab.js');
const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;
const courses = globalThis.PersonalWorkbenchChildCourses;

test('markKnown stamps masteredAt when first becoming ready', () => {
    const rules = { reviewIntervalsDays: [1, 3, 7, 14] };
    const progress = vocab.markKnown(vocab.createDefaultProgress(), 'hello', true, '2026-08-16', rules);
    assert.equal(progress.mastery.hello.masteredAt, '2026-08-16');
    const again = vocab.markKnown(progress, 'hello', true, '2026-08-17', rules);
    assert.equal(again.mastery.hello.masteredAt, '2026-08-16');
});

test('summarizeEnglishArchive counts states, rates and curve points', () => {
    const bank = [
        { text: 'hello' }, { text: 'cat' }, { text: 'dog' }, { text: 'apple' }
    ];
    const progress = {
        mastery: {
            hello: { state: 'ready', masteredAt: '2026-08-10', quiz: { listen: { attempts: 2, correct: 2 }, read: { attempts: 1, correct: 1 }, spell: { attempts: 1, correct: 0 } } },
            cat: { state: 'practicing', nextReview: '2026-08-17', quiz: { listen: { attempts: 1, correct: 0 }, read: { attempts: 0, correct: 0 }, spell: { attempts: 0, correct: 0 } } },
            dog: { state: 'ready', masteredAt: '2026-08-12', nextReview: '2026-08-16', quiz: { listen: { attempts: 0, correct: 0 }, read: { attempts: 2, correct: 2 }, spell: { attempts: 0, correct: 0 } } }
        }
    };
    const summary = vocab.summarizeEnglishArchive(progress, bank, '2026-08-16');
    assert.equal(summary.known, 2);
    assert.equal(summary.practicing, 1);
    assert.equal(summary.reviewing, 1);
    assert.equal(summary.bankSize, 4);
    assert.equal(summary.rates.listen.correct, 2);
    assert.equal(summary.rates.listen.attempts, 3);
    assert.equal(summary.curve.length, 2);
    assert.equal(summary.curve[0].date, '2026-08-10');
    assert.equal(summary.curve[0].count, 1);
    assert.equal(summary.curve[1].count, 2);
    assert.match(vocab.renderEnglishArchive(summary.curve), /english-archive-svg/);
    assert.match(vocab.renderEnglishArchive(summary.curve), /80/);
    assert.match(vocab.renderEnglishArchive(summary.curve), /300/);
});

test('normalizeEnglish keeps masteredAt', () => {
    const normalized = courses.normalize({
        english: { mastery: { hello: { state: 'ready', dates: ['2026-08-16'], masteredAt: '2026-08-16' } } }
    });
    assert.equal(normalized.english.mastery.hello.masteredAt, '2026-08-16');
});
