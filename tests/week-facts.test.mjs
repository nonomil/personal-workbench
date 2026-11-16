import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');

function sliceFn(name) {
    const start = appSource.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `${name} must exist in app.js`);
    let depth = 0;
    let i = appSource.indexOf('{', start);
    let begin = i;
    for (; i < appSource.length; i += 1) {
        if (appSource[i] === '{') depth += 1;
        if (appSource[i] === '}') {
            depth -= 1;
            if (depth === 0) break;
        }
    }
    return appSource.slice(start, i + 1);
}

function loadFacts() {
    const storageStub = { localDate: (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d || '2026-08-28')) };
    const src = sliceFn('weekStartMonday') + '\n' + sliceFn('buildWeekFacts') + '\nreturn buildWeekFacts;';
    return new Function('storage', src)(storageStub);
}

test('week facts derive only from existing dated records, no new storage', () => {
    const facts = loadFacts();
    const snapshot = {
        dailyPlans: [
            { date: '2026-08-24', done: true, completedAt: '2026-08-24' },
            { date: '2026-08-25', done: false, completedAt: null },
            { date: '2026-08-17', done: true, completedAt: '2026-08-17' },
            { date: '2026-09-01', done: true, completedAt: '2026-09-01' }
        ],
        readingLogs: [
            { date: '2026-08-26', minutes: 30 },
            { date: '2026-08-20', minutes: 99 }
        ],
        focusSessions: [
            { date: '2026-08-27', minutes: 25 },
            { date: '2026-08-27', minutes: 15 }
        ],
        reviews: [{ date: '2026-08-28' }],
        adult: { lifeEntries: [{ status: 'done', updatedAt: '2026-08-26' }, { status: 'active', updatedAt: '2026-08-26' }] }
    };
    const out = facts(snapshot, '2026-08-28');
    assert.equal(out.start, '2026-08-24');
    assert.equal(out.day, '2026-08-28');
    assert.equal(out.plansDone, 1, '本周只算一条完成计划（上周与下周不计）');
    assert.equal(out.plansTotal, 2);
    assert.equal(out.readingMinutes, 30);
    assert.equal(out.readingCount, 1);
    assert.equal(out.focusMinutes, 40);
    assert.equal(out.focusCount, 2);
    assert.equal(out.reviewCount, 1);
    assert.equal(out.lifeDone, 1);
});

test('reviews page renders the auto facts card before the hand-written list', () => {
    const start = appSource.indexOf("renderIntro(PAGE_META.reviews");
    const chunk = appSource.slice(start, start + 600);
    assert.match(chunk, /renderWeekFactsCard\(\)/);
    const cardStart = appSource.indexOf('function renderWeekFactsCard()');
    const cardChunk = appSource.slice(cardStart, appSource.indexOf('function buildWorkbenchWeekMemo', cardStart));
    for (const label of ['计划完成', '阅读', '专注', '复盘', '生活记录完成', '不用填写']) {
        assert.ok(cardChunk.includes(label), `facts card should mention ${label}`);
    }
    assert.doesNotMatch(cardChunk, /localStorage|storage\.set/, '事实卡只读，不写任何状态');
});

test('cache stamp bumped for week facts', () => {
    for (const entry of ['成人成长工作台/index.html', '儿童学习工作台/index.html']) {
        const html = fs.readFileSync(path.join(repoRoot, 'prj', entry), 'utf8');
        assert.match(html, /-workbench\.css\?[^"']*week-facts=v1/);
    }
});
