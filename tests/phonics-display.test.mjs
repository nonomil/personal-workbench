import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repoRoot, 'prj');

await import('../prj/config.js');
await import('../prj/preschool-phonics-data.js');
await import('../prj/preschool-phonics.js');
await import('../prj/preschool-lesson-pack-data.js');
await import('../prj/preschool-lesson-pack.js');

const phonics = globalThis.PersonalWorkbenchPreschoolPhonics;
const pack = globalThis.PersonalWorkbenchLessonPack;

test('word cards show IPA, not a second copy of the spelling', () => {
    const parsed = phonics.parseBank(JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', 'english', 'phonics', 'word-bank.json'), 'utf8')));
    const mat = parsed.find((item) => item.text === 'mat');
    assert.ok(mat);
    assert.equal(mat.ipa, '/mæt/');
    assert.equal(mat.zh, '垫子');
    assert.equal(mat.ipaParts, '/m/ · /æ/ · /t/');
    assert.equal(mat.blend, 'm-a-t');
    assert.deepEqual(mat.speakParts, ['mmm', 'ah', 'tuh']);
    assert.notEqual(mat.ipaParts.replace(/[\/\s·]/g, ''), mat.blend.replace(/-/g, ''));

    const cards = phonics.buildWordCards(parsed, { preferred: 'mat', size: 3 });
    assert.equal(cards[0].main, 'mat');
    assert.equal(cards[0].sub, '/mæt/');
    assert.equal(cards[0].zh, '垫子');
    assert.ok(cards[0].rows.some((row) => row.label === '意思' && row.text === '垫子'));
    assert.ok(cards[0].rows.some((row) => row.label === '音标' && row.text === '/m/ · /æ/ · /t/'));
    assert.ok(cards[0].rows.some((row) => row.label === '拼一拼' && row.text === 'm-a-t'));
    assert.ok(!cards[0].rows.some((row) => row.label === '读音' && row.text === 'm · a · t'));
    assert.equal(parsed.filter((item) => !item.zh).length, 0);
    assert.equal(parsed.length, 94);
});

test('letter cards show the phoneme IPA and a keyword, not the letter name', () => {
    const letters = phonics.parseLetters(JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', 'english', 'phonics', 'letter-bank.json'), 'utf8')));
    const a = letters.find((item) => item.letter === 'a');
    const m = letters.find((item) => item.letter === 'm');
    assert.equal(a.ipa, '/æ/');
    assert.equal(a.speakSound, 'ah');
    assert.equal(m.ipa, '/m/');
    assert.equal(m.speakSound, 'mmm');

    const cards = phonics.buildLetterCards(letters, { groups: 'amt', preferred: 'm', size: 3 });
    assert.equal(cards[0].main, 'm');
    assert.equal(cards[0].sub, '/m/');
    assert.ok(cards[0].rows.some((row) => row.label === '例词' && row.text === 'map · 地图'));
    assert.equal(cards[0].zh, 'map · 地图');
    assert.equal(cards[0].speak, 'map');
    assert.deepEqual(cards[0].speakParts, ['mmm']);
});

test('blend and letter quizzes carry IPA plus speakable sound parts', () => {
    const words = phonics.getRuntimeBank();
    const letters = phonics.getRuntimeLetters();
    const blend = phonics.buildBlendQuiz(words, { preferred: 'mat', size: 3 });
    assert.equal(blend.rounds[0].ipa, '/mæt/');
    assert.equal(blend.rounds[0].ipaParts, '/m/ · /æ/ · /t/');
    assert.deepEqual(blend.rounds[0].speakParts, ['mmm', 'ah', 'tuh']);
    assert.equal(blend.rounds[0].speak, 'mat');

    const letter = phonics.buildLetterQuiz(letters, { groups: 'amt', preferred: 'a', size: 3 });
    assert.equal(letter.rounds[0].text, 'a');
    assert.equal(letter.rounds[0].ipa, '/æ/');
    assert.equal(letter.rounds[0].speak, 'apple');
    assert.equal(letter.rounds[0].speakSound, 'ah');
    assert.equal(letter.rounds[0].keyword, 'apple');
});

test('60-day pack keeps awareness, rhyme and oral-blend days instead of dropping them', () => {
    const data = globalThis.PersonalWorkbenchLessonPackData;
    const lessons = pack.phonicsLessons(data.phonics);
    const byId = Object.fromEntries(lessons.map((item) => [item.id, item]));
    assert.ok(byId['preschool-english-phonics-day-001'], 'day 1 awareness should stay');
    assert.ok(byId['preschool-english-phonics-day-003'], 'hyphen rhyme pairs should stay');
    assert.ok(byId['preschool-english-phonics-day-005'], 'oral-blend IPA examples should stay');
    assert.equal(byId['preschool-english-phonics-day-003'].activity.mode, 'phonics-cvc');
    assert.equal(byId['preschool-english-phonics-day-003'].activity.preferred, 'cat');
    assert.equal(byId['preschool-english-phonics-day-005'].activity.preferred, 'sun');
    assert.equal(byId['preschool-english-phonics-day-006'].activity.mode, 'phonics-letter');
    assert.equal(byId['preschool-english-phonics-day-006'].activity.preferred, 's');
    assert.ok(lessons.length >= 60);
});

test('workbench flashcards and quiz cue render IPA and a sound-parts button', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(app, /buildWordCards|buildLetterCards/);
    assert.match(app, /phonics-speak-parts/);
    assert.match(app, /听拆音/);
    assert.match(app, /phonics-ipa/);
    assert.match(app, /phonics-zh/);
    assert.match(app, /pickSpeechVoice/);
    assert.match(html, /preschool-phonics\.js\?v=20260818-phonics-zh-v1/);
    assert.match(html, /app\.js\?v=20260819-v074/);
});
