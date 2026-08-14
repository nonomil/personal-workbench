import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'preschool', '33-course-media.css'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');

test('英语专区课程配置了动画屋 media 数组（B站 + 网盘）', () => {
    const englishIdx = config.indexOf('preschool-english');
    assert.ok(englishIdx >= 0);
    const section = config.slice(englishIdx, config.indexOf('\n            }\n', englishIdx));
    assert.match(section, /media:/);
    const bilibilis = (section.match(/type: 'bilibili'/g) || []).length;
    const links = (section.match(/type: 'link'/g) || []).length;
    assert.ok(bilibilis >= 1, '至少一支 B站 视频');
    assert.equal(links, 1, '一张网盘跳转占位卡');
});

test('每支 B站 视频都使用可内嵌播放器地址', () => {
    const media = config.match(/bvid: 'BV[\w]+'/g) || [];
    assert.ok(media.length >= 1);
    const rendererStart = app.indexOf('function renderPreschoolCourseMedia(course)');
    const renderer = app.slice(rendererStart, app.indexOf('function renderPreschoolCourseResources(course)', rendererStart));
    assert.match(renderer, /https:\/\/player\.bilibili\.com\/player\.html\?bvid='/);
    assert.match(renderer, /encodeURIComponent\(item\.bvid\)/);
    assert.match(renderer, /page=1&high_quality=1&danmaku=0/);
});

test('app.js 提供 renderPreschoolCourseMedia 并接入课程卡', () => {
    assert.match(app, /function renderPreschoolCourseMedia\(course\)/);
    assert.match(app, /\$\{renderPreschoolCourseSamples\(course\)\}\$\{renderPreschoolCourseMedia\(course\)\}\$\{renderPreschoolCourseResources\(course\)\}/);
});

test('视频以手风琴 details/summary 呈现，折叠时零 iframe 高度', () => {
    const rendererStart = app.indexOf('function renderPreschoolCourseMedia(course)');
    const rendererEnd = app.indexOf('function renderPreschoolCourseResources(course)');
    const renderer = app.slice(rendererStart, rendererEnd);
    assert.match(renderer, /<details class="preschool-media-item is-video">/);
    assert.match(renderer, /<summary class="preschool-media-summary">/);
    assert.match(renderer, /<div class="preschool-media-frame">/);
});

test('网盘链接使用 open-resource 动作，地址仅接受 http(s)', () => {
    assert.match(app, /if \(action === 'open-resource'\) openExternalResource\(target\.dataset\.url\);/);
    assert.match(app, /function openExternalResource\(url\)/);
    assert.ok(app.includes("const allowed = /^https:\\/\\//.test(target) || /^http:\\/\\//.test(target);"));
    assert.ok(app.includes("global.open(target, '_blank', 'noopener');"));
});

test('33-course-media.css 已注册且提供手风琴样式', () => {
    assert.match(manifest, /@import url\("\.\/preschool\/33-course-media\.css/);
    assert.match(css, /\.preschool-media-item\.is-video/);
    assert.match(css, /\.preschool-media-summary/);
    assert.match(css, /details-marker/);
    assert.match(css, /\[open\] \.preschool-media-chevron/);
    assert.match(css, /aspect-ratio: 16 \/ 9/);
});
