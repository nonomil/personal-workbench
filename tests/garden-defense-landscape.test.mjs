import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const gameCssPath = path.join(repoRoot, 'prj', 'games', 'garden-defense', 'game.css');
const gameHtmlPath = path.join(repoRoot, 'prj', 'games', 'garden-defense', 'index.html');
const gameJsPath = path.join(repoRoot, 'prj', 'games', 'garden-defense', 'game.js');

test('garden defense keeps the real bitmap ratio without applying the APK shell to normal web pages', () => {
    const css = fs.readFileSync(gameCssPath, 'utf8');
    const html = fs.readFileSync(gameHtmlPath, 'utf8');

    assert.match(html, /name="viewport"[^>]*viewport-fit=cover/);
    assert.match(css, /#world-canvas\s*\{[\s\S]*?aspect-ratio:\s*1280\s*\/\s*540/);
    assert.match(css, /html\.is-android-app/,
        'the no-scroll app shell must be gated behind native Android detection');
    assert.doesNotMatch(css, /@media[^\{]*orientation:\s*landscape[^\{]*\{\s*\.world-shell/,
        'plain landscape web pages must keep their natural document flow');
});

test('garden defense Android landscape uses a viewport-bound two-page play shell', () => {
    const css = fs.readFileSync(gameCssPath, 'utf8');
    const html = fs.readFileSync(gameHtmlPath, 'utf8');
    const js = fs.readFileSync(gameJsPath, 'utf8');

    assert.match(js, /Capacitor[\s\S]*getPlatform[\s\S]*is-android-app/,
        'the game must identify the native Android runtime instead of guessing by viewport');
    assert.match(html, /class="play-pager"[^>]*id="play-pager"/);
    assert.match(html, /class="play-page play-battle-page"/);
    assert.match(html, /class="play-page play-guide-page"/);
    assert.match(html, /data-play-page="battle"/);
    assert.match(html, /data-play-page="guide"/);

    assert.match(css, /@media\s*\(orientation:\s*landscape\)\s*\{[\s\S]*?html\.is-android-app/,
        'native Android landscape must apply at every landscape viewport width, including tablet and emulator widths');
    assert.doesNotMatch(css, /@media[^\{]*orientation:\s*landscape[^\{]*max-width:/,
        'native Android landscape must not be disabled by a CSS viewport-width upper bound');
    assert.match(css, /html\.is-android-app[\s\S]*height:\s*100dvh/);
    assert.match(css, /html\.is-android-app[\s\S]*body:not\(\.is-picking\)[\s\S]*overflow:\s*hidden/);
    assert.match(css, /\.play-pager\s*\{[\s\S]*?scroll-snap-type:\s*x\s+mandatory/);
    assert.match(css, /\.play-battle-page\s*\{[\s\S]*?grid-template-columns:/);
    assert.match(css, /\.play-battle-page[\s\S]*?\.seed-tray\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2/);
    assert.match(css, /\.play-battle-page[\s\S]*?#world-canvas\s*\{[\s\S]*?max-height:\s*100%/);
    assert.match(css, /@media[^\{]*max-height:\s*330px[\s\S]*?body:not\(\.is-picking\)[\s\S]*?\.world-bar[\s\S]*?position:\s*fixed/,
        'very short Android WebViews must overlay the toolbar instead of spending a full row on it');
    assert.match(js, /IS_ANDROID_APP[\s\S]*requestFullscreen/,
        'entering a native landscape stage should request immersive fullscreen when Android allows it');
});
