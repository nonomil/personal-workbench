import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('courses wall header shows the sunlight balance chip', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const start = app.indexOf('function renderPreschoolCourses()');
    const end = app.indexOf('\n    function ', start + 10);
    const source = app.slice(start, end);
    assert.match(source, /class="pixel-hud-sun">/);
    assert.match(source, /getChildGrowth\(\)\.sunlight/);
    assert.match(source, /个专区<\/span>/, '保留专区数量标签');
});

test('badge progress labels exist for every category (points-hints H1b already landed)', () => {
    const source = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-achievements.js'), 'utf8');
    for (const marker of ['badgeProgressLabel', 'badgeRemainingHint', 'badgeCardMeterPercent', '已学汉字 ', '完美日 ', '英语课 ', '还差 ', '现在 ']) {
        assert.ok(source.includes(marker), `achievements module should contain ${marker}`);
    }
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    assert.match(app, /renderPreschoolCoursesTodayCard/, 'course wall renders');
});

test('cache stamp is bumped for the courses balance change', () => {
    const index = fs.readFileSync(path.join(repoRoot, 'prj/preschool-workbench/index.html'), 'utf8');
    assert.match(index, /app\.js\?[^"']*courses-sun=v1/);
});
