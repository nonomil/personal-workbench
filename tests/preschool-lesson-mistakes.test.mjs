import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repoRoot, 'prj');

await import('../prj/storage.js');
const storage = globalThis.PersonalWorkbenchStorage;

test('recordLessonMistake writes into the existing mistakes list without a new key', () => {
    const first = storage.recordLessonMistake([], {
        subject: '数学',
        question: '36 + 28 = ?',
        correctAnswer: '64',
        mistakeReason: '选了 54',
        sourceKey: 'preschool-math-3:math-addition-36-28',
        lessonId: 'preschool-math-3',
        date: '2026-08-14',
        reviewDate: '2026-08-15',
        createdAt: '2026-08-14T10:00:00.000Z'
    });
    assert.equal(first.changed, true);
    assert.equal(first.mistakes.length, 1);
    assert.equal(first.item.subject, '数学');
    assert.equal(first.item.question, '36 + 28 = ?');
    assert.equal(first.item.correctAnswer, '64');
    assert.equal(first.item.status, 'todo');
    assert.equal(first.item.sourceKey, 'preschool-math-3:math-addition-36-28');
    assert.equal(first.item.attempts, 1);

    const again = storage.recordLessonMistake(first.mistakes, {
        subject: '数学',
        question: '36 + 28 = ?',
        correctAnswer: '64',
        mistakeReason: '选了 74',
        sourceKey: 'preschool-math-3:math-addition-36-28',
        date: '2026-08-14'
    });
    assert.equal(again.mistakes.length, 1);
    assert.equal(again.item.attempts, 2);
    assert.equal(again.item.mistakeReason, '选了 74');
    assert.equal(again.item.status, 'todo');
});

test('recordLessonMistake reopens a mastered item and ignores empty questions', () => {
    const mastered = [{
        id: 'mistake-old',
        subject: '识字',
        question: '找字：山',
        correctAnswer: '山',
        status: 'mastered',
        sourceKey: 'preschool-chinese-3:山',
        attempts: 1
    }];
    const reopened = storage.recordLessonMistake(mastered, {
        subject: '识字',
        question: '找字：山',
        correctAnswer: '山',
        mistakeReason: '选了水',
        sourceKey: 'preschool-chinese-3:山',
        date: '2026-08-14'
    });
    assert.equal(reopened.mistakes.length, 1);
    assert.equal(reopened.item.status, 'todo');
    assert.equal(reopened.item.id, 'mistake-old');

    const empty = storage.recordLessonMistake([], { subject: '英语', question: '   ', sourceKey: 'x' });
    assert.equal(empty.changed, false);
    assert.equal(empty.mistakes.length, 0);
});

test('maps preschool courses to mistake subjects and app records wrong answers', () => {
    assert.equal(storage.subjectForCourse('preschool-math'), '数学');
    assert.equal(storage.subjectForCourse('preschool-literacy'), '识字');
    assert.equal(storage.subjectForCourse('preschool-english'), '英语');
    assert.equal(storage.subjectForCourse('preschool-phonics'), '拼读');
    assert.equal(storage.subjectForCourse('preschool-pinyin'), '拼音');
    assert.equal(storage.subjectForCourse('preschool-poetry'), '古诗');
    assert.equal(storage.subjectForCourse('unknown'), '学习');

    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(app, /recordPreschoolLessonMistake/);
    assert.match(app, /recordLessonMistake/);
    assert.match(app, /subjectForCourse/);
    assert.match(html, /storage\.js\?v=20260816-english-uplift-v2/);
    assert.match(html, /app\.js\?v=20260816-literacy-ui-v5/);
});

test('mistake review queue only returns day 1/3/7 items and drops mastered ones', () => {
    const mistakes = [
        { id: 'a', date: '2026-08-14', status: 'todo', sourceKey: 'math:1', lessonId: 'preschool-math-1' },
        { id: 'b', date: '2026-08-12', status: 'todo', sourceKey: 'en:1', lessonId: 'preschool-english-words-1' },
        { id: 'c', date: '2026-08-08', status: 'todo', sourceKey: 'zh:1', lessonId: 'preschool-chinese-1' },
        { id: 'd', date: '2026-08-10', status: 'todo', sourceKey: 'skip:1', lessonId: 'preschool-poetry-1' },
        { id: 'e', date: '2026-08-14', status: 'mastered', sourceKey: 'done:1', lessonId: 'preschool-math-1' }
    ];
    const due = storage.buildMistakeReviewQueue(mistakes, '2026-08-15');
    assert.deepEqual(due.map((item) => item.id), ['a', 'b', 'c']);
    const empty = storage.buildMistakeReviewQueue(mistakes, '2026-08-16');
    assert.deepEqual(empty.map((item) => item.id), []);
});

test('reviewing a due mistake correctly removes it and a miss keeps it queued', () => {
    const start = [{ id: 'a', date: '2026-08-14', status: 'todo', sourceKey: 'math:1', lessonId: 'preschool-math-1' }];
    const missed = storage.markMistakeReviewed(start, 'math:1', false);
    assert.equal(missed[0].status, 'todo');
    assert.equal(storage.buildMistakeReviewQueue(missed, '2026-08-15').length, 1);
    const done = storage.markMistakeReviewed(missed, 'math:1', true);
    assert.equal(done[0].status, 'mastered');
    assert.equal(storage.buildMistakeReviewQueue(done, '2026-08-15').length, 0);
    assert.equal(storage.buildMistakeReviewQueue(done, '2026-08-17').length, 0);
});
