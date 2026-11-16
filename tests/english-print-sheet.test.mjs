import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/preschool-english-vocab.js');
const english = globalThis.PersonalWorkbenchPreschoolEnglishVocab;

const batch = [
    { text: 'apple', zh: '苹果', phrase: 'I eat an apple.', phraseZh: '我吃一个苹果。' },
    { text: 'water', zh: '水', phrase: 'Drink more water.', phraseZh: '多喝水。' },
    { text: 'cake', zh: '蛋糕', phrase: 'The cake is sweet.', phraseZh: '蛋糕很甜。' }
];
const mistakes = [
    { word: 'apple', zh: '苹果', label: '拼写错误', errorType: 'spell', attempts: 2, status: 'todo' },
    { word: 'read', zh: '读', label: '认读混淆', errorType: 'read', attempts: 1, status: 'todo' }
];

test('print sheet renders recite, dictation and mistake sections', () => {
    const html = english.renderEnglishPrintSheet({ batch, mistakes, date: '2026-08-28' });
    assert.match(html, /英语默写纸/);
    assert.match(html, /2026-08-28/);
    assert.match(html, /一、先读三遍/);
    assert.match(html, /二、英译汉/);
    assert.match(html, /三、汉译英/);
    assert.match(html, /四、错词订正/);
    assert.ok((html.match(/apple/g) || []).length >= 2, '今日词要出现在背诵区和英译汉区');
    assert.ok(html.includes('I eat an apple.'), '例句进入背诵区');
    assert.match(html, /拼写错误/);
    assert.equal((html.match(/english-print-blank/g) || []).length, 14, '6+6 默写行加 2 条错词行');
    assert.match(html, /家长签字/);
});

test('print sheet pads dictation to six rows and falls back when no mistakes', () => {
    const html = english.renderEnglishPrintSheet({ batch: [batch[0]], mistakes: [], date: '2026-08-28' });
    assert.equal((html.match(/english-print-row/g) || []).length, 13, '两张默写表各补足 6 行，另加 1 条抄写行');
    assert.match(html, /今天还没有错词/);
});

test('print sheet escapes html in word fields', () => {
    const html = english.renderEnglishPrintSheet({
        batch: [{ text: '<b>x</b>', zh: '危<险>', phrase: '', phraseZh: '' }],
        mistakes: [],
        date: '2026-08-28'
    });
    assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'), '词字段必须转义');
    assert.ok(!html.includes('<b>x</b>'), '不允许原始 HTML 注入');
    assert.ok(html.includes('危&lt;险&gt;'));
});

test('sheet printing is wired with actions, buttons and cache stamps', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj/app.js'), 'utf8');
    assert.equal((app.match(/data-action="print-english-sheet"/g) || []).length, 2, '仪表盘与错词本各一个入口');
    assert.match(app, /if \(action === 'print-english-sheet'\) printEnglishSheetAction\(\);/);
    assert.match(app, /engine\.renderEnglishPrintSheet/);
    const index = fs.readFileSync(path.join(repoRoot, 'prj/preschool-workbench/index.html'), 'utf8');
    assert.match(index, /preschool-english-vocab\.js\?[^"']*english-print=v1/);
    assert.match(index, /app\.js\?[^"']*english-print=v1/);
});

test('print styles stay inside the shared print host without new css file', () => {
    const css = fs.readFileSync(path.join(repoRoot, 'prj/css/preschool/40-literacy-uplift.css'), 'utf8');
    assert.match(css, /\.english-print-sheet/);
    assert.ok(!/:has\(/.test(css.slice(css.lastIndexOf('@media print'))), '新增打印样式不使用 :has()');
    const host = fs.readFileSync(path.join(repoRoot, 'prj/css/preschool/40-literacy-uplift.css'), 'utf8');
    assert.match(host, /#literacy-print-host/);
});
