import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
const wall = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool', '34-course-wall.css'), 'utf8');
const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
const bridge = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'shared', 'workbench-bridge.js'), 'utf8');

const helperStart = app.indexOf('function arePreschoolRequiredPlansDone');
const helperEnd = app.indexOf('\n    function ', helperStart + 10);
assert.ok(helperStart >= 0, 'required-done helper must exist');
const arePreschoolRequiredPlansDone = new Function(`return (${app.slice(helperStart, helperEnd)});`)();

test('required plans unlock adventure only after every required item is done', () => {
    assert.equal(arePreschoolRequiredPlansDone([
        { required: true, done: true },
        { required: true, done: false },
        { required: false, done: false }
    ]), false);
    assert.equal(arePreschoolRequiredPlansDone([
        { required: true, done: true },
        { required: true, done: true },
        { required: false, done: false }
    ]), true);
    assert.equal(arePreschoolRequiredPlansDone([{ required: false, done: false }]), true);
});

test('today card and home exits show locked adventure copy until required work is done', () => {
    const todayStart = app.indexOf('function renderPreschoolCoursesTodayCard');
    const todayEnd = app.indexOf('\n    const PRESCHOOL_FLASHCARD_COURSES', todayStart);
    const today = app.slice(todayStart, todayEnd);
    assert.match(today, /必做/);
    assert.match(today, /冒险/);
    assert.match(today, /先完成今日必做/);
    assert.match(today, /open-world-game/);
    assert.match(today, /garden-defense/);
    assert.match(today, /voxel-adventure/);
    assert.match(today, /platform-quest/);
    assert.match(app, /function openPreschoolWorldGame[\s\S]*arePreschoolRequiredPlansDone/);
    assert.match(app, /preschool-home-exits[\s\S]*先完成今日必做|先完成今日必做[\s\S]*preschool-home-exits/);
    assert.match(wall, /preschool-course-today-adventure/);
    assert.match(wall, /is-locked/);
    assert.match(html, /app\.js\?v=20260816-literacy-ui-v1/);
    assert.doesNotMatch(bridge, /pendingRewardIds|arePreschoolRequiredPlansDone/);
});
