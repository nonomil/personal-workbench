import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repoRoot, 'prj');

await import('../prj/preschool-motion-art.js');

const art = globalThis.PersonalWorkbenchPreschoolMotionArt;
const motionBank = JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', '运动与专注', 'motion-bank.json'), 'utf8'));

test('motion bank keeps real moves and art has svg plus how-to', () => {
    const moves = motionBank.filter(item => item.type !== 'focus');
    assert.ok(moves.length >= 4);
    assert.ok(moves.every(item => item.id && item.name && item.durationSec >= 15));
    const jumpingJack = motionBank.find(item => item.id === 'motion-13');
    assert.equal(jumpingJack.name, '开合跳');
    assert.match(art.howTo(jumpingJack), /跳开|拍手/);
    assert.match(art.render(jumpingJack), /<svg class="preschool-motion-svg"/);
    assert.match(art.render({ id: 'unknown' }), /<svg class="preschool-motion-svg"/);
});

test('exercise today page is action cards, not levels', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
    const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css', 'preschool', '35-course-flashcards.css'), 'utf8');
    assert.match(app, /getTodayMotionItems/);
    assert.match(app, /preschool-motion-grid/);
    assert.match(app, /flashcard-motion-card/);
    assert.match(app, /flashcard-motion-done/);
    assert.match(app, /course\.id === 'preschool-exercise' \|\| course\.id === 'preschool-focus'/);
    assert.match(app, /运动是今日动作卡/);
    assert.doesNotMatch(app, /\{ track: 'motion', title: '运动' \}/);
    assert.match(config, /今天几张动作卡，跟着图做完就能打卡/);
    assert.match(html, /preschool-motion-art\.js\?v=20260818-motion-cards-v1/);
    assert.match(html, /app\.js\?v=20260818-phonics-zh-v1/);
    assert.match(css, /\.preschool-motion-card/);
});
