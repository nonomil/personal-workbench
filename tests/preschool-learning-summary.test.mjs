import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/child-courses.js');

const courses = globalThis.PersonalWorkbenchChildCourses;

test('learning summary is read-only and matches hand-counted mastery, mistakes and rewards', () => {
    const input = {
        streak: 4,
        courseProgress: {
            literacy: { mastery: { 我: { state: 'ready' }, 你: { state: 'practicing' } } },
            english: { mastery: { hello: { state: 'maintenance' } } },
            math: { mastery: { 'math-1': { state: 'introduced' } } }
        },
        mistakes: [
            { id: 'm1', status: 'todo' },
            { id: 'm2', status: 'mastered' },
            { id: 'm3', status: 'todo' }
        ],
        reviewQueue: [{ id: 'm1' }],
        claimedRewardIds: ['reward-sticker'],
        pendingRewardIds: ['reward-park'],
        rewards: [
            { id: 'reward-sticker', title: '贴纸' },
            { id: 'reward-park', title: '去公园' }
        ]
    };
    const before = JSON.stringify(input);
    const summary = courses.buildLearningSummary(input);
    assert.equal(JSON.stringify(input), before);
    assert.equal(summary.streak, 4);
    const literacy = summary.subjects.find(item => item.id === 'literacy');
    const english = summary.subjects.find(item => item.id === 'english');
    const math = summary.subjects.find(item => item.id === 'math');
    const pinyin = summary.subjects.find(item => item.id === 'pinyin');
    assert.equal(literacy.known, 1);
    assert.equal(literacy.unknown, 1);
    assert.equal(english.known, 1);
    assert.equal(math.known, 0);
    assert.equal(math.unknown, 1);
    assert.equal(pinyin.known, 0);
    assert.equal(summary.mistakes.open, 2);
    assert.equal(summary.mistakes.mastered, 1);
    assert.equal(summary.mistakes.due, 1);
    assert.deepEqual(summary.rewards.claimed.map(item => item.title), ['贴纸']);
    assert.deepEqual(summary.rewards.pending.map(item => item.title), ['去公园']);
});

test('family page shows the parent-only learning summary without a new storage key', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    const coursesSource = fs.readFileSync(path.join(repoRoot, 'prj', 'child-courses.js'), 'utf8');
    assert.match(coursesSource, /function buildLearningSummary/);
    assert.match(app, /function renderPreschoolLearningSummary/);
    assert.match(app, /renderPreschoolLearningSummary\(\)/);
    assert.match(app, /学情摘要/);
    assert.match(app, /只给家长看，不改分数、不扣阳光/);
    assert.match(html, /child-courses\.js\?v=20260819-w1s1/);
    assert.match(html, /app\.js\?v=20260819-v074/);
});
