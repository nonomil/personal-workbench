import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
const cssPath = path.join(projectRoot, 'css', 'preschool', '53-high-resolution-landscape.css');
const shellPath = path.join(projectRoot, 'preschool-workbench', 'index.html');

test('high-resolution Android landscape has a dedicated 1080/1440 layout layer', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.match(css, /@media\s*\(orientation:\s*landscape\)\s*and\s*\(min-width:\s*1024px\)\s*and\s*\(min-height:\s*560px\)/);
    assert.match(css, /html\.is-android-app\s+body\.variant-preschool/);
    assert.match(css, /preschool-home-hero-copy[\s\S]*font-size:\s*14px/);
    assert.match(css, /preschool-course-wall-art[\s\S]*clamp\(60px/);
    assert.match(css, /preschool-course-wall-preview[\s\S]*font-size:\s*10px/);
    assert.match(css, /preschool-literacy-wall-visual[\s\S]*clamp\(64px/);
});

test('high-resolution landscape keeps two-row cards and restores home task content', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.match(css, /data-native-kind="courses-wall"[\s\S]*grid-template-columns:\s*repeat\(4/);
    assert.match(css, /data-native-kind="courses-wall"[\s\S]*grid-template-rows:\s*repeat\(2/);
    assert.match(css, /@media\s*\(min-width:\s*1280px\)[\s\S]*data-native-kind="courses-wall"[\s\S]*grid-template-columns:\s*repeat\(5/);
    assert.match(css, /preschool-native-page\.is-course-wall-tail[\s\S]*grid-template-columns:\s*repeat\(2/);
    assert.doesNotMatch(css, /is-course-wall-four/);
    assert.match(css, /data-native-kind="home-tasks"[\s\S]*preschool-home-task-overview[\s\S]*display:\s*grid/);
    assert.match(css, /data-native-kind="home-tasks"[\s\S]*preschool-home-battlefield-head[\s\S]*display:\s*flex/);
    assert.match(css, /preschool-home-battlefield[\s\S]*overflow:\s*hidden/);
});

test('workbench shell loads high-resolution landscape rules after the compact layers', () => {
    const shell = fs.readFileSync(shellPath, 'utf8');
    assert.match(shell, /53-high-resolution-landscape\.css\?v=20260825-high-resolution-landscape-card-wall-v7-simple-cards/);
});

test('high-resolution landscape balances sidebar width and course-card information density', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.match(css, /--child-nav-width:\s*clamp\(176px,\s*13vw,\s*188px\);/);
    assert.match(css, /preschool-mobile-nav[\s\S]*grid-template-rows:\s*auto repeat\(5,\s*minmax\(58px,\s*68px\)\);/);
    assert.match(css, /preschool-mobile-nav[\s\S]*align-content:\s*start;/);
    assert.match(css, /preschool-mobile-nav-item[\s\S]*min-height:\s*68px;/);
    assert.match(css, /preschool-course-wall-options[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
    assert.match(css, /preschool-course-wall-option:nth-child\(3\)[\s\S]*display:\s*none;/);
});

test('high-resolution landscape course cards keep one primary action', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.match(css, /preschool-course-wall-options[\s\S]*display:\s*none;/);
    assert.match(css, /preschool-course-wall-scene[\s\S]*display:\s*none;/);
    assert.match(css, /preschool-course-wall-dots[\s\S]*display:\s*none;/);
    assert.match(css, /grid-template-rows:\s*auto auto minmax\(0, 1fr\) auto;/);
    assert.match(css, /preschool-course-wall-state[\s\S]*grid-row:\s*4;/);
    assert.match(css, /preschool-course-wall-orbit[\s\S]*display:\s*none;/);
});
