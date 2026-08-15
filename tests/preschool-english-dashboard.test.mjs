import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/preschool-levels-data.js');
await import('../prj/preschool-bank-levels.js');
await import('../prj/preschool-english-vocab.js');
const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;

function word(text, level = 'L1') {
    return { text, level, zh: text + '义', phrase: 'I see ' + text + '.', phraseZh: '我看见' + text };
}

test('summarizeEnglishDashboard separates known, practicing, due and unseen words', () => {
    const bank = [
        word('hello'), word('cat'), word('dog'), word('sun'), word('apple', 'L2'), word('blue', 'L2')
    ];
    const progress = {
        mastery: {
            hello: { state: 'ready', masteredAt: '2026-08-01', dates: ['2026-08-14', '2026-08-15', '2026-08-16'] },
            cat: { state: 'ready', masteredAt: '2026-08-15', dates: ['2026-08-15', '2026-08-16'] },
            dog: { state: 'ready', masteredAt: '2026-08-16', dates: ['2026-08-16'] },
            sun: { state: 'ready', masteredAt: '2026-08-16', dates: ['2026-08-16'] },
            apple: { state: 'practicing', nextReview: '2026-08-16', dates: ['2026-08-16'] }
        }
    };

    const summary = vocab.summarizeEnglishDashboard(progress, bank, '2026-08-16');

    assert.equal(summary.bankSize, 6);
    assert.equal(summary.known, 4);
    assert.equal(summary.practicing, 1);
    assert.equal(summary.unseen, 1);
    assert.equal(summary.reviewing, 1);
    assert.equal(summary.thisWeekNew, 3);
    assert.equal(summary.currentStreak, 3);
    assert.equal(summary.currentStage.level, 'L2');
    assert.equal(summary.currentStage.total, 2);
    assert.equal(summary.currentStage.ready, 0);
});

test('summarizeEnglishDashboard returns stable zero values without history', () => {
    const summary = vocab.summarizeEnglishDashboard(null, [], '');

    assert.deepEqual({
        bankSize: summary.bankSize,
        known: summary.known,
        practicing: summary.practicing,
        unseen: summary.unseen,
        reviewing: summary.reviewing,
        thisWeekNew: summary.thisWeekNew,
        currentStreak: summary.currentStreak
    }, {
        bankSize: 0,
        known: 0,
        practicing: 0,
        unseen: 0,
        reviewing: 0,
        thisWeekNew: 0,
        currentStreak: 0
    });
    assert.equal(summary.currentStage.level, 'L1');
});

test('english dashboard exposes a direct practice loop and parent review routes', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const css = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool-workbench.css'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');

    assert.match(app, /function getEnglishDashboardView\(/);
    assert.match(app, /function renderPreschoolEnglishDashboard\(/);
    assert.match(app, /英语词汇启蒙/);
    assert.match(app, /开始今日测评/);
    assert.match(app, /open-english-wrongbook/);
    assert.match(app, /open-english-archive/);
    assert.match(app, /听音/);
    assert.match(app, /认读/);
    assert.match(app, /拼写/);
    assert.match(app, /今日 3 词/);
    assert.match(app, /待复习/);
    assert.match(app, /本周新增/);
    assert.match(app, /连续学习/);
    assert.match(app, /data-action="open-lesson"/);
    assert.match(css, /42-english-dashboard\.css/);
    assert.match(html, /42-english-dashboard\.css/);
});
