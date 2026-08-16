import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repoRoot, 'prj');

await import('../prj/preschool-bank-levels.js');
await import('../prj/preschool-literacy.js');

const literacy = globalThis.PersonalWorkbenchPreschoolLiteracy;

const bank = [
    { char: '山', pinyin: 'shān', words: ['大山', '上山'], theme: '自然', level: 'L1' },
    { char: '水', pinyin: 'shuǐ', words: ['喝水', '雨水'], theme: '自然', level: 'L1' },
    { char: '火', pinyin: 'huǒ', words: ['火车', '大火'], theme: '自然', level: 'L1' },
    { char: '木', pinyin: 'mù', words: ['木头', '树木'], theme: '自然', level: 'L1' }
];

test('literacy mistake cards use tianzige fields and sort by miss count', () => {
    const cards = literacy.literacyMistakeCards([
        { subject: '数学', question: '1+1', attempts: 9, status: 'todo' },
        { subject: '识字', question: '识字量：水', attempts: 1, status: 'todo', sourceKey: 'a:水' },
        { subject: '识字', question: '识字量：山', attempts: 3, status: 'todo', sourceKey: 'a:山' }
    ], bank);
    assert.equal(cards.length, 2);
    assert.equal(cards[0].char, '山');
    assert.equal(cards[0].pinyin, 'shān');
    assert.ok(cards[0].word);
    assert.equal(cards[0].attempts, 3);
    assert.equal(cards[1].char, '水');
});

test('special drill queue keeps only open literacy misses and three-in-a-row masters them', () => {
    const mistakes = [
        { subject: '识字', question: '识字量：山', status: 'todo', sourceKey: 'drill:山', attempts: 2, correctStreak: 0 },
        { subject: '识字', question: '识字量：水', status: 'mastered', sourceKey: 'drill:水', attempts: 1, correctStreak: 3 },
        { subject: '数学', question: '3+2', status: 'todo', sourceKey: 'math:1', attempts: 1 }
    ];
    const drill = literacy.buildLiteracyDrill(mistakes, bank, { salt: 1 });
    assert.equal(drill.rounds.length, 1);
    assert.equal(drill.rounds[0].char, '山');
    assert.equal(drill.rounds[0].options.length, 4);
    let next = literacy.applyLiteracyDrillResult(mistakes, 'drill:山', true);
    next = literacy.applyLiteracyDrillResult(next, 'drill:山', true);
    assert.equal(next.find(item => item.sourceKey === 'drill:山').status, 'todo');
    next = literacy.applyLiteracyDrillResult(next, 'drill:山', true);
    assert.equal(next.find(item => item.sourceKey === 'drill:山').status, 'mastered');
    next = literacy.applyLiteracyDrillResult(next, 'drill:山', false);
    assert.equal(next.find(item => item.sourceKey === 'drill:山').correctStreak, 0);
});

test('print sheet lays out eight tianzige cards with practice boxes', () => {
    const cards = literacy.literacyMistakeCards([
        { subject: '识字', question: '识字量：山', attempts: 1, status: 'todo' },
        { subject: '识字', question: '识字量：水', attempts: 1, status: 'todo' }
    ], bank);
    const html = literacy.renderLiteracyPrintCards(cards);
    assert.match(html, /print-card/);
    assert.equal((html.match(/class="print-card"/g) || []).length, 8);
    assert.match(html, /print-practice/);
    assert.match(html, /山/);
});

test('archive svg branches for 0, 1 and many assessments', () => {
    assert.match(literacy.renderLiteracyArchive([]), /先测一次/);
    const one = literacy.renderLiteracyArchive([{ date: '2026-08-01', estimate: 180, confidence: 0.7 }]);
    assert.match(one, /<circle/);
    assert.equal(one.includes('<polyline'), false);
    const many = literacy.renderLiteracyArchive([
        { date: '2026-08-01', estimate: 120, confidence: 0.7 },
        { date: '2026-08-08', estimate: 260, confidence: 0.8 },
        { date: '2026-08-15', estimate: 400, confidence: 0.9 }
    ]);
    assert.match(many, /<polyline/);
    assert.match(many, /250/);
    assert.match(many, /500/);
    assert.match(many, /750/);
    const cert = literacy.renderLiteracyCertificate({ date: '2026-08-15', estimate: 400, stage: '绘本启蒙期', confidence: 0.9 });
    assert.match(cert, /2026-08-15/);
    assert.match(cert, /400/);
    assert.match(cert, /绘本启蒙期/);
});

test('literacy home and print/archive actions are wired in the workbench', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css', 'preschool-workbench.css'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
    const layer = fs.readFileSync(path.join(root, 'css', 'preschool', '40-literacy-uplift.css'), 'utf8');
    assert.match(app, /literacy-uplift-kpis/);
    assert.match(app, /data-action="open-literacy-assess"/);
    assert.match(app, /data-action="open-literacy-archive"/);
    assert.match(app, /data-action="print-literacy-cards"/);
    assert.match(app, /data-action="open-literacy-drill"/);
    assert.match(app, /literacy-week-streak/);
    assert.match(app, /renderPreschoolCourseFlashcards/);
    assert.match(css, /40-literacy-uplift\.css/);
    assert.match(layer, /literacy-tianzige/);
    assert.match(layer, /@media print/);
    assert.match(html, /40-literacy-uplift\.css\?v=20260816-literacy-ui-v8|preschool-workbench\.css\?v=20260816-switcher-z-v1/);
});
