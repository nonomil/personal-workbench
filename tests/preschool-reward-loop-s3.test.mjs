import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
const pet = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-pet.js'), 'utf8');
const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
const storage = fs.readFileSync(path.join(repoRoot, 'prj', 'storage.js'), 'utf8');
const growth = fs.readFileSync(path.join(repoRoot, 'prj', 'child-growth.js'), 'utf8');

test('today card shows derived streak days without a new storage field', () => {
    const todayStart = app.indexOf('function renderPreschoolCoursesTodayCard');
    const todayEnd = app.indexOf('\n    const PRESCHOOL_FLASHCARD_COURSES', todayStart);
    const today = app.slice(todayStart, todayEnd);
    assert.match(today, /连续学习/);
    assert.match(today, /getChildGrowth|growth\.streak/);
    assert.doesNotMatch(today, /punish|断签清零|你又断了/);
    assert.doesNotMatch(storage, /streakDays\s*:/);
});

test('reopening a completed lesson shows the no-extra-sun hint and does not award again', () => {
    const openStart = app.indexOf('function openLessonDialog');
    const openEnd = app.indexOf('\n    function openPreschoolPlanPractice', openStart);
    const open = app.slice(openStart, openEnd);
    assert.match(open, /已领过阳光，再练不加分也不扣分/);
    assert.match(open, /replayNoSun|completedIds/);
    assert.match(app, /function completeCourseLesson[\s\S]*已领过阳光，再练不加分也不扣分/);
    assert.match(app, /function renderLessonDialog[\s\S]*已领过阳光，再练不加分也不扣分/);
});

test('lesson complete celebration reuses the existing feed-pet action', () => {
    assert.match(pet, /function renderFeedShortcut/);
    assert.match(pet, /去喂星芒/);
    assert.match(pet, /data-action="feed-pet"/);
    assert.match(app, /function showPreschoolCelebration[\s\S]*去喂星芒|renderFeedShortcut/);
    assert.match(app, /function completeCourseLesson[\s\S]*feedStar|renderFeedShortcut|去喂星芒/);
    assert.match(html, /app\.js\?v=20260816-literacy-ui-v1/);
    assert.match(growth, /function calculateStreak/);
});
