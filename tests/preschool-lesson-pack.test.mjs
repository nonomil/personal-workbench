import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/config.js');
await import('../prj/preschool-lesson-pack-data.js');
await import('../prj/preschool-lesson-pack.js');

const config = globalThis.PersonalWorkbenchConfig;
const pack = globalThis.PersonalWorkbenchLessonPack;
const data = globalThis.PersonalWorkbenchLessonPackData;

function course(id) {
    const preschool = config.variants && config.variants.preschool;
    const courses = (preschool && preschool.childCourses) || config.childCourses || [];
    return courses.find(item => item.id === id);
}

test('60-day packs append onto literacy, math and english without replacing seed lessons', () => {
    const literacy = course('preschool-literacy');
    const math = course('preschool-math');
    const english = course('preschool-english');
    assert.equal(literacy.lessons[0].id, 'preschool-chinese-1');
    assert.equal(literacy.lessons[0].activity.mode, 'literacy-flash');
    assert.equal(math.lessons[0].id, 'preschool-math-1');
    assert.equal(english.lessons[0].id, 'preschool-english-words-1');
    assert.ok(literacy.lessons.length >= 3 + data.hanzi.length);
    assert.ok(math.lessons.length >= 3 + data.math.length);
    assert.ok(english.lessons.length >= 3 + data.english.length);
    assert.ok(literacy.lessons.some(item => item.id === 'preschool-hanzi-day-01'));
    assert.equal(pack.choiceLessons(data.hanzi).length, data.hanzi.length);
});

test('focus keeps play-memory/odd/order seeds and only appends timer days', () => {
    const focus = course('preschool-focus');
    assert.equal(focus.lessons[0].id, 'preschool-focus-1');
    assert.equal(focus.lessons[0].activity.mode, 'play-memory');
    assert.equal(focus.lessons[1].activity.mode, 'play-odd');
    assert.equal(focus.lessons[2].activity.mode, 'play-order');
    assert.ok(focus.lessons.length >= 3 + data.focusDays.length);
    assert.ok(focus.lessons.some(item => item.activity && item.activity.mode === 'motion-timer'));
});

test('exercise seeds become motion timers from the movement bank', () => {
    const exercise = course('preschool-exercise');
    assert.equal(exercise.lessons[0].id, 'preschool-exercise-1');
    assert.equal(exercise.lessons[0].activity.mode, 'motion-timer');
    assert.equal(exercise.lessons[0].title, '开合跳');
    assert.equal(exercise.lessons[1].id, 'preschool-exercise-2');
    assert.equal(exercise.lessons[2].id, 'preschool-exercise-3');
    assert.ok(exercise.lessons.length >= 3 + data.moveDays.length);
    assert.ok(exercise.lessons[0].activity.durationSec >= 15);
});

test('html and app wire the pack renderer and motion timer onto the existing dialog', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    const configSource = fs.readFileSync(path.join(repoRoot, 'prj', 'config.js'), 'utf8');
    assert.equal((configSource.split("id: 'preschool-literacy'")[1].split("actions: { 'add-plan'")[0].match(/activity:\s*\{/g) || []).length, 22);
    assert.match(html, /preschool-lesson-pack-data\.js/);
    assert.match(html, /preschool-lesson-pack\.js/);
    assert.match(html, /preschool-play-games\.js/);
    assert.match(app, /mode === 'motion-timer'/);
    assert.match(app, /data-action="motion-done"/);
    assert.match(app, /data-action="play-flip"/);
});
