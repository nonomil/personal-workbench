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

test('world game entries stay open even when required plans are unfinished', () => {
    const todayStart = app.indexOf('function renderPreschoolCoursesTodayCard');
    const todayEnd = app.indexOf('\n    const PRESCHOOL_FLASHCARD_COURSES', todayStart);
    const today = app.slice(todayStart, todayEnd);
    assert.match(today, /必做/);
    assert.match(today, /冒险/);
    assert.doesNotMatch(today, /先完成今日必做/);
    assert.doesNotMatch(today, /disabled/);
    assert.match(today, /open-world-game/);
    assert.match(today, /garden-defense/);
    assert.match(today, /voxel-adventure/);
    assert.match(today, /platform-quest/);
    const openStart = app.indexOf('function openPreschoolWorldGame');
    const openEnd = app.indexOf('\n    function ', openStart + 10);
    const opener = app.slice(openStart, openEnd);
    assert.doesNotMatch(opener, /arePreschoolRequiredPlansDone/);
    assert.doesNotMatch(opener, /先完成今日必做/);
    const exitsStart = app.indexOf('preschool-home-exits');
    const exits = app.slice(exitsStart, exitsStart + 600);
    assert.match(exits, /data-action="open-world-game"/);
    assert.doesNotMatch(exits, /先完成今日必做/);
    assert.doesNotMatch(exits, /disabled/);
    assert.match(app, /进入方块传奇/);
    assert.doesNotMatch(app, /先完成今日必做/);
    assert.match(wall, /preschool-course-today-adventure/);
    assert.match(html, /app\.js\?v=20260816-literacy-ui-v5/);
    assert.doesNotMatch(bridge, /pendingRewardIds|arePreschoolRequiredPlansDone/);
});
