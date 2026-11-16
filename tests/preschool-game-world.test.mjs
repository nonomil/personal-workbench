import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');
const shellCssPath = path.join(prjRoot, 'css', 'preschool', '44-child-game-world.css');

function readIfPresent(filePath) {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

test('game shell defines shared scene, theme and child-first navigation contracts', () => {
    const shellCss = readIfPresent(shellCssPath);
    const manifest = readIfPresent(path.join(prjRoot, 'css', 'preschool-workbench.css'));
    const workbenchHtml = readIfPresent(path.join(prjRoot, 'preschool-workbench', 'index.html'));
    const app = readIfPresent(path.join(prjRoot, 'app.js'));

    assert.ok(fs.existsSync(shellCssPath), 'shared game shell stylesheet must exist');
    assert.match(manifest, /44-child-game-world\.css/);
    assert.match(shellCss, /\.child-game-shell/);
    assert.match(shellCss, /data-world-theme|\[data-world-theme/);
    assert.match(shellCss, /\.child-game-scene/);
    assert.match(shellCss, /min-width:\s*44px|min-height:\s*44px/);
    assert.match(workbenchHtml, /child-game-shell|data-world-theme/);
    assert.match(app, /child-game-shell|data-world-theme/);
});

test('game shell keeps a single primary task and limits landscape content to full pages', () => {
    const shellCss = readIfPresent(shellCssPath);
    const app = readIfPresent(path.join(prjRoot, 'app.js'));

    assert.match(shellCss, /child-game-primary-task/);
    assert.match(shellCss, /child-game-support-panel/);
    assert.match(shellCss, /@media\s*\(orientation:\s*landscape\)/);
    assert.match(shellCss, /html\.is-android-app[\s\S]*overflow-y:\s*hidden/);
    assert.match(shellCss, /overflow-y:\s*hidden/);
    assert.match(app, /child-game-primary-task|child-game-support-panel/);
});

test('web and Android portrait keep natural vertical flow', () => {
    const shellCss = readIfPresent(shellCssPath);
    const landscapeStart = shellCss.indexOf('@media (orientation: landscape)');
    assert.ok(landscapeStart > 0, 'landscape rules must be isolated in a media block');
    const sharedRules = shellCss.slice(0, landscapeStart);
    assert.doesNotMatch(sharedRules, /overflow-y:\s*hidden/);
    assert.match(sharedRules, /overflow-y:\s*(?:auto|visible|scroll)/);
    assert.match(shellCss, /html\.is-android-app\s+body\.variant-preschool/);
});

test('course wall uses distinct illustration heroes and stays paged on landscape APK', () => {
    const app = readIfPresent(path.join(prjRoot, 'app.js'));
    const artCss = readIfPresent(path.join(prjRoot, 'css', 'preschool', '45-course-art-wall.css'));
    const manifest = readIfPresent(path.join(prjRoot, 'css', 'preschool-workbench.css'));
    const preschoolIndex = readIfPresent(path.join(prjRoot, 'preschool-workbench', 'index.html'));

    assert.match(manifest, /45-course-art-wall\.css/);
    assert.match(app, /const PRESCHOOL_COURSE_ART = \{/);
    assert.match(app, /preschool-literacy.*action-assess/);
    assert.match(app, /preschool-pinyin.*plant-snowpea/);
    assert.match(app, /preschool-math.*plant-peashooter/);
    assert.match(app, /preschool-course-wall-art-main/);
    assert.match(app, /preschool-course-wall-sticker/);
    assert.match(app, /preschool-course-wall-orbit/);
    assert.match(app, /slot\.indexOf\('course:'\)/);
    assert.match(app, /function preschoolCourseNavAssetSrc\(courseId\)/);
    assert.match(preschoolIndex, /data-preschool-nav-art="course:preschool-literacy"/);
    assert.match(preschoolIndex, /data-preschool-nav-art="course:preschool-exercise"/);
    assert.match(app, /data-course-art=/);
    assert.match(artCss, /preschool-course-wall-art-halo/);
    assert.match(artCss, /preschool-course-wall-art-spark/);
    assert.match(artCss, /preschool-course-wall-orbit/);
    assert.match(artCss, /@media \(orientation:\s*landscape\)/);
    assert.match(artCss, /overflow:\s*hidden/);
    assert.match(artCss, /min-height:\s*44px|min-height:\s*26px/);
});

test('course choices expose a compact illustrated scene strip for each option', () => {
    const app = readIfPresent(path.join(prjRoot, 'app.js'));
    const artCss = readIfPresent(path.join(prjRoot, 'css', 'preschool', '45-course-art-wall.css'));

    assert.match(app, /scene:\s*\[/);
    assert.match(app, /const scene = Array\.isArray\(art\.scene\)/);
    assert.match(app, /preschool-course-wall-scene/);
    assert.match(app, /preschool-course-wall-scene-item/);
    assert.match(artCss, /\.preschool-course-wall-scene/);
    assert.match(artCss, /\.preschool-course-wall-scene-item/);
    assert.match(artCss, /grid-template-columns/);
});
