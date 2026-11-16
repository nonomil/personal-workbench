import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');
const preschoolHtmlPath = path.join(prjRoot, 'preschool-workbench', 'index.html');
const mobileCssPath = path.join(prjRoot, 'css', 'preschool', '43-mobile-app-shell.css');
const childGameCssPath = path.join(prjRoot, 'css', 'preschool', '44-child-game-world.css');

test('Android activity hides both system bars for the whole APK', () => {
    const activity = fs.readFileSync(path.join(repoRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'nonomil', 'personalworkbench', 'MainActivity.java'), 'utf8');
    const launcher = fs.readFileSync(path.join(prjRoot, 'launcher.js'), 'utf8');

    assert.match(activity, /WindowInsets\.Type\.systemBars\(\)/);
    assert.match(activity, /BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE/);
    assert.match(activity, /onWindowFocusChanged/,
        'immersive mode must be restored after a transient system-bar gesture');
    assert.match(launcher, /Capacitor[\s\S]*getPlatform[\s\S]*is-android-app/,
        'every APK page must receive the native Android class');
});

test('preschool portrait and normal web pages keep a safe natural scrolling shell', () => {
    const html = fs.readFileSync(preschoolHtmlPath, 'utf8');
    const manifest = fs.readFileSync(path.join(prjRoot, 'css', 'preschool-workbench.css'), 'utf8');
    const mobileCss = fs.readFileSync(mobileCssPath, 'utf8');

    assert.match(html, /name="viewport"[^>]*viewport-fit=cover/);
    assert.match(manifest, /43-mobile-app-shell\.css/);
    assert.match(mobileCss, /@media \(max-width:\s*1024px\)/);
    assert.match(mobileCss, /min-height:\s*100dvh/);
    assert.match(mobileCss, /overflow-x:\s*(?:clip|hidden)/);
    assert.match(mobileCss, /safe-area-inset-bottom/);
    assert.match(mobileCss, /min-height:\s*44px/);
});

test('native Android landscape workbench pages use viewport-bound horizontal pages', () => {
    const app = fs.readFileSync(path.join(prjRoot, 'app.js'), 'utf8');
    const mobileCss = fs.readFileSync(mobileCssPath, 'utf8');

    assert.match(app, /function setupAndroidLandscapePages\(/);
    assert.match(app, /preschool-native-pager/);
    assert.match(app, /preschool-native-page-switch/);
    assert.match(app, /preschool-native-page/);
    assert.match(mobileCss, /@media \(orientation:\s*landscape\)/);
    assert.match(mobileCss, /html\.is-android-app[\s\S]*height:\s*100dvh/);
    assert.match(mobileCss, /html\.is-android-app[\s\S]*overflow:\s*hidden/);
    assert.match(mobileCss, /\.preschool-native-pager[\s\S]*scroll-snap-type:\s*x\s+mandatory/);
    assert.match(mobileCss, /\.preschool-native-page[\s\S]*flex:\s*0\s+0\s+100%/);
    assert.match(mobileCss, /\.preschool-mobile-nav[\s\S]*(?:grid-template-rows:\s*repeat\(5|flex-direction:\s*column)/,
        'landscape must use a compact vertical app rail instead of the long desktop sidebar');
});

test('native Android landscape learning wall keeps a two-row card rhythm', () => {
    const app = fs.readFileSync(path.join(prjRoot, 'app.js'), 'utf8');
    const childGameCss = fs.readFileSync(childGameCssPath, 'utf8');
    const wallRuleStart = childGameCss.indexOf('data-native-kind="courses-wall"] .preschool-course-wall');
    assert.ok(wallRuleStart >= 0, 'landscape learning wall rule must exist');
    const wallRuleEnd = childGameCss.indexOf('}', wallRuleStart);
    const wallRule = childGameCss.slice(wallRuleStart, wallRuleEnd + 1);

    assert.match(app, /const wallChunkSize = global\.innerWidth >= 1280 \? 10 : global\.innerWidth >= 1024 \? 8 : 4/);
    assert.match(app, /addChunkedChildren\(wall, '学习传送门', 'courses-wall', \[wall\.className\], wallChunkSize\)/);
    assert.match(wallRule, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    assert.match(wallRule, /grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

test('native Android launcher splits worlds and workbenches into two full-screen pages', () => {
    const html = fs.readFileSync(path.join(prjRoot, 'index.html'), 'utf8');
    const launcher = fs.readFileSync(path.join(prjRoot, 'launcher.js'), 'utf8');

    assert.match(html, /name="viewport"[^>]*viewport-fit=cover/);
    assert.match(html, /class="launcher-page-switch"/);
    assert.match(html, /class="launcher-app-pager"/);
    assert.equal((html.match(/class="launcher-app-page(?:\s|")/g) || []).length, 2);
    assert.match(html, /html\.is-android-app[\s\S]*\.launcher-app-pager[\s\S]*scroll-snap-type:\s*x\s+mandatory/);
    assert.match(html, /html\.is-android-app[\s\S]*height:\s*100dvh/);
    assert.match(launcher, /data-launcher-page[\s\S]*scrollTo/);
});
