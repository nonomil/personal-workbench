import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repoRoot, 'prj');

await import('../prj/preschool-pinyin-data.js');
await import('../prj/preschool-pinyin-syllables-data.js');
await import('../prj/preschool-pinyin.js');

const pinyin = globalThis.PersonalWorkbenchPreschoolPinyin;

test('pinyin engine exposes a layered syllable bank with four tones on one content unit', () => {
    assert.equal(typeof pinyin.getRuntimeSyllableBank, 'function');

    const bank = pinyin.getRuntimeSyllableBank();
    assert.ok(bank.length >= 24);
    assert.ok(bank.some(item => item.type === 'liangpin'));
    assert.ok(bank.some(item => item.type === 'sanpin'));
    assert.ok(bank.some(item => item.group === 'front-nasal'));
    assert.ok(bank.some(item => item.group === 'back-nasal'));
    assert.ok(bank.some(item => item.type === 'zhengti'));

    const ba = bank.find(item => item.key === 'pinyin:syllable:ba');
    assert.ok(ba);
    assert.equal(ba.initial, 'b');
    assert.equal(ba.final, 'a');
    assert.equal(ba.tones.length, 4);
    assert.ok(ba.tones.find(item => item.tone === 1).pinyin.includes('ā'));
    assert.ok(ba.tones.find(item => item.tone === 4).hanzi.includes('爸'));
    assert.ok(ba.words.some(word => word.includes('爸爸')));
    assert.ok(ba.confusionCluster.includes('p'));
});

test('syllable quiz teaches split-and-blend without multiplying four tones into four SRS cards', () => {
    const bank = pinyin.getRuntimeSyllableBank();
    const quiz = pinyin.buildSyllableQuiz(bank, { preferred: 'ba', size: 4, level: 'L1', salt: 0 });

    assert.equal(quiz.mode, 'pinyin-syllable');
    assert.equal(quiz.rounds.length, 4);
    const first = quiz.rounds[0];
    assert.equal(first.contentId, 'pinyin:syllable:ba');
    assert.equal(first.initial, 'b');
    assert.equal(first.final, 'a');
    assert.equal(first.parts.join(' + '), 'b + a');
    assert.equal(first.toneVariants.length, 4);
    assert.ok(first.toneVariants.some(item => item.pinyin === 'bā'));
    assert.ok(first.hanzi.includes('八'));
    assert.ok(first.words.includes('爸爸'));
    assert.ok(first.options.includes(first.text));
    assert.equal(first.options[first.answer], first.text);
    assert.ok(first.confusionCluster.includes('p'));
    assert.equal(new Set(quiz.rounds.map(round => round.contentId)).size, quiz.rounds.length);
});

test('pinyin course and lesson UI wire the syllable route without removing existing tone practice', () => {
    const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css', 'preschool', '54-pinyin-game.css'), 'utf8');

    assert.match(config, /mode: 'pinyin-syllable'/);
    assert.match(config, /拆合拼读/);
    assert.match(config, /mode: 'pinyin-tone'/);
    assert.match(app, /mode === 'pinyin-syllable'/);
    assert.match(app, /buildSyllableQuiz/);
    assert.match(app, /pinyin-syllable-cue/);
    assert.match(app, /round\.contentId \|\| round\.key \|\| round\.text/);
    assert.match(css, /\.pinyin-syllable-cue/);
    assert.match(html, /preschool-pinyin-syllables-data/);
    assert.match(html, /54-pinyin-game\.css/);
});
