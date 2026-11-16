import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const highResolutionLandscapeCss = fs.readFileSync(path.join(root, 'css', 'preschool', '53-high-resolution-landscape.css'), 'utf8');

function functionSlice(name, nextName) {
    const start = app.indexOf(`function ${name}(`);
    const end = app.indexOf(`\n    function ${nextName}`, start + 10);
    assert.ok(start >= 0, `${name} must exist`);
    return app.slice(start, end >= 0 ? end : app.length);
}

test('learning landing renders the course wall before the large today card', () => {
    const renderCourses = functionSlice('renderPreschoolCourses', 'renderPreschoolMistakes');
    const wall = renderCourses.indexOf('preschool-course-wall');
    const today = renderCourses.indexOf('renderPreschoolCoursesTodayCard');

    assert.ok(wall >= 0, 'learning landing must render a course wall');
    assert.ok(today >= 0, 'learning landing must keep the today action card');
    assert.ok(wall < today, 'the card wall must be visible before the today card');
});

test('Android landscape opens the learning wall as the first horizontal page', () => {
    const setupPages = functionSlice('setupAndroidLandscapePages', 'render');
    const wall = setupPages.indexOf("addChunkedChildren(wall, '学习传送门'");
    const today = setupPages.indexOf("addPage([intro, today], '今日学习'");

    assert.ok(wall >= 0, 'Android landscape must paginate the learning wall');
    assert.ok(today >= 0, 'Android landscape must keep a today page');
    assert.ok(wall < today, 'Android landscape must open on the learning wall');
});

test('Android landscape marks a partial wall page for the next horizontal screen', () => {
    assert.match(app, /wall\.children\.length > 0 && wall\.children\.length < fullWallSize/);
    assert.match(highResolutionLandscapeCss, /is-course-wall-tail/);
});

test('high-resolution landscape shows more learning areas with breathing room between cards', () => {
    assert.match(highResolutionLandscapeCss, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
    assert.match(highResolutionLandscapeCss, /@media \(min-width: 1280px\)[\s\S]*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/);
    assert.match(highResolutionLandscapeCss, /grid-template-rows: repeat\(2, minmax\(0, auto\)\);/);
    assert.match(highResolutionLandscapeCss, /gap: clamp\(28px, 4\.4dvh, 38px\) clamp\(28px, 2\.2dvw, 40px\);/);
    assert.match(highResolutionLandscapeCss, /is-course-wall-tail[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    assert.doesNotMatch(highResolutionLandscapeCss, /is-course-wall-four/);
});

test('high-resolution landscape cards use a compact content-height shell', () => {
    assert.match(highResolutionLandscapeCss, /height: clamp\(160px, 24dvh, 178px\);/);
    assert.match(highResolutionLandscapeCss, /height: clamp\(170px, 26dvh, 188px\);/);
    assert.match(highResolutionLandscapeCss, /align-self: center;/);
    assert.match(highResolutionLandscapeCss, /align-content: stretch;/);
    assert.match(highResolutionLandscapeCss, /height: clamp\(18px, 3dvh, 22px\);/);
});

test('course cards keep one primary action instead of stacking secondary options', () => {
    assert.match(app, /function renderPreschoolCourseWallOptions\(course\)/);
    assert.match(app, /preschool-course-wall-options/);
    assert.match(highResolutionLandscapeCss, /preschool-course-wall-options[\s\S]*display:\s*none;/);
    assert.match(highResolutionLandscapeCss, /preschool-course-wall-dots[\s\S]*display:\s*none;/);
    assert.match(highResolutionLandscapeCss, /preschool-course-wall-state[\s\S]*grid-row:\s*4/);
});

test('Android landscape exposes the full high-resolution catalogue and a larger 1080 first page', () => {
    assert.match(app, /const wallChunkSize = global\.innerWidth >= 1280 \? 10 : global\.innerWidth >= 1024 \? 8 : 4;/);
    assert.match(app, /const fullWallSize = global\.innerWidth >= 1280 \? 10 : global\.innerWidth >= 1024 \? 8 : 4;/);
    assert.match(app, /wall\.children\.length > 0 && wall\.children\.length < fullWallSize && wall\.children\.length <= 2/);
});
