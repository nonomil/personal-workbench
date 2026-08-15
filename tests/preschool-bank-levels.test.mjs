import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = path.join(repoRoot, 'prj', 'data', 'preschool');

await import('../prj/preschool-levels-data.js');
await import('../prj/preschool-bank-levels.js');
await import('../prj/preschool-literacy-data.js');
await import('../prj/preschool-literacy.js');
await import('../prj/preschool-english-vocab-data.js');
await import('../prj/preschool-english-vocab.js');
await import('../prj/preschool-pinyin-data.js');
await import('../prj/preschool-pinyin.js');
await import('../prj/preschool-poetry-data.js');
await import('../prj/preschool-poetry.js');
await import('../prj/preschool-math-data.js');
await import('../prj/preschool-math-bank.js');

const levels = globalThis.PersonalWorkbenchBankLevels;
const literacy = globalThis.PersonalWorkbenchPreschoolLiteracy;
const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;
const pinyin = globalThis.PersonalWorkbenchPreschoolPinyin;
const poetry = globalThis.PersonalWorkbenchPreschoolPoetry;

const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'];

function countLevels(items) {
    const counts = Object.fromEntries(LEVELS.map(level => [level, 0]));
    for (const item of items) {
        counts[item.level] = (counts[item.level] || 0) + 1;
    }
    return counts;
}

test('english follows one theme sequence and does not offer child tracks', () => {
    const english = vocab.parseBank(JSON.parse(fs.readFileSync(path.join(dataRoot, '英语', 'vocabulary-bank.json'), 'utf8')));
    assert.equal(english.length, 597);
    assert.deepEqual(english.slice(0, 5).map(item => item.text), ['black', 'blue', 'green', 'pink', 'purple']);
    assert.equal(english[0].theme, '颜色');
    assert.equal(english[english.length - 1].theme, '高频词');
    const dayOne = vocab.dailyWindow(english, '2026-08-01', 5);
    assert.deepEqual(dayOne.batch.map(item => item.text), ['black', 'blue', 'green', 'pink', 'purple']);
    assert.equal(vocab.todayTheme(english, '2026-08-01', 5), '颜色');
    assert.deepEqual(levels.getDefinitions('english'), []);
    assert.equal(levels.labelFor('L1', 'literacy'), '起步');

    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(app, /今天学：/);
    assert.match(app, /hideEnglishPracticeLevels/);
    assert.doesNotMatch(app, /看图词/);
    assert.match(html, /preschool-english-vocab-data\.js\?v=20260815-english-auto-v1/);
    assert.match(html, /preschool-bank-levels\.js\?v=20260815-english-auto-v1/);
    assert.match(html, /app\.js\?v=20260816-literacy-ui-v1/);
});

test('shared level bands define L1-L5 without grade labels', () => {
    const defs = globalThis.PersonalWorkbenchPreschoolLevels;
    assert.equal(Array.isArray(defs.bands), true);
    assert.deepEqual(defs.bands.map(item => item.id), LEVELS);
    const blob = JSON.stringify(defs);
    assert.doesNotMatch(blob, /一年级|二年级|grade/i);
});

test('hanzi, english, pinyin and poetry banks all carry L1-L5 levels', () => {
    const hanzi = JSON.parse(fs.readFileSync(path.join(dataRoot, '识字', 'character-bank.json'), 'utf8'));
    for (const row of hanzi) {
        const level = Array.isArray(row) ? row[row.length - 1] : row.level;
        assert.match(String(level), /^L[1-5]$/);
    }
    assert.equal(hanzi.length, 1500);

    const english = vocab.parseBank(JSON.parse(fs.readFileSync(path.join(dataRoot, '英语', 'vocabulary-bank.json'), 'utf8')));
    assert.ok(english.length >= 500);
    for (const item of english) {
        assert.match(item.level, /^L[1-3]$/);
    }

    const pinyinBank = pinyin.parseBank(JSON.parse(fs.readFileSync(path.join(dataRoot, '识字', 'pinyin-initial-bank.json'), 'utf8')));
    for (const item of pinyinBank) {
        assert.match(item.level, /^L[1-5]$/);
    }

    const poemBank = poetry.parseBank(JSON.parse(fs.readFileSync(path.join(dataRoot, '古诗', 'poem-bank.json'), 'utf8')));
    for (const item of poemBank) {
        assert.match(item.level, /^L[1-5]$/);
    }

    const hanziCounts = countLevels(literacy.parseBank(hanzi));
    for (const level of LEVELS) {
        assert.ok(hanziCounts[level] >= 200, `${level} hanzi bucket too small: ${hanziCounts[level]}`);
    }
});

test('engines filter pools by activity level while keeping full bank fallback', () => {
    const hanziBank = literacy.getRuntimeBank();
    const l1Only = levels.levelPool(hanziBank, 'L1');
    assert.ok(l1Only.length >= 200);
    assert.ok(l1Only.every(item => item.level === 'L1'));
    const batch = literacy.buildFlashBatch(hanziBank, literacy.createDefaultProgress(), literacy.getRuntimeRules(), '2026-08-14', '山', 8, 'L1');
    assert.equal(batch.length, 8);
    assert.ok(batch.every(item => {
        const match = literacy.findChar(hanziBank, item.char);
        return match && match.level === 'L1';
    }));

    const englishBank = vocab.getRuntimeBank();
    const l1Words = levels.levelPool(englishBank, 'L1');
    assert.ok(l1Words.length >= 80);
    assert.equal(levels.levelPool(englishBank, 'L4').length, 0);
    assert.equal(levels.levelPool(englishBank, 'L5').length, 0);
    const daily = vocab.dailyWindow(englishBank, '2026-08-01', 5, 'L1');
    assert.equal(daily.batch.length, 5);
    assert.ok(daily.batch.every(item => item.level === 'L1'));

    const poemBank = poetry.getRuntimeBank();
    const quiz = poetry.buildLineQuiz(poemBank, { preferred: 'poem-jingyesi', size: 3, level: 'L1' });
    assert.ok(quiz.rounds.length >= 1);
});

test('subject routes map stages to L1-L5 bands', () => {
    const routePaths = [
        path.join(dataRoot, '识字', 'route.json'),
        path.join(dataRoot, '英语', 'route.json'),
        path.join(dataRoot, '数学', 'route.json'),
        path.join(dataRoot, '古诗', 'route.json'),
        path.join(dataRoot, '运动与专注', 'route.json'),
        path.join(dataRoot, 'english', 'phonics', 'route.json')
    ];
    for (const routePath of routePaths) {
        const route = JSON.parse(fs.readFileSync(routePath, 'utf8'));
        for (const stage of route.stages) {
            assert.match(stage.level, /^L[1-5]$/);
        }
    }
});

test('subject courses resolve their own bank tracks for level bands', () => {
    const bankLevels = globalThis.PersonalWorkbenchBankLevels;
    const pinyinBank = pinyin.getRuntimeBank();
    const poemBank = poetry.getRuntimeBank();
    const mathBank = globalThis.PersonalWorkbenchPreschoolMathBank.getRuntimeBank();
    assert.ok(pinyinBank.length >= 50);
    assert.ok(poemBank.length >= 8);
    assert.ok(mathBank.length >= 20);
    assert.equal(bankLevels.trackForCourse('preschool-pinyin'), 'pinyin');
    assert.equal(bankLevels.trackForCourse('preschool-poetry'), 'poetry');
    assert.equal(bankLevels.trackForCourse('preschool-math'), 'math');
    assert.equal(bankLevels.trackForCourse('preschool-exercise'), 'motion');

    const partial = {
        pinyin: { mastery: { b: { state: 'ready' }, p: { state: 'ready' }, m: { state: 'ready' } } }
    };
    const track = bankLevels.resolveTrackProgress('preschool-pinyin', partial, {
        literacy: [],
        english: [],
        pinyin: pinyinBank,
        poetry: poemBank,
        math: mathBank,
        motion: []
    });
    assert.equal(track.bands[0].level, 'L1');
    assert.ok(track.bands[0].ready >= 1);
});

test('math, poetry and motion banks fill every L1-L5 band', () => {
    const mathBank = globalThis.PersonalWorkbenchPreschoolMathBank.getRuntimeBank();
    const poemBank = poetry.getRuntimeBank();
    const motion = JSON.parse(fs.readFileSync(path.join(dataRoot, '运动与专注', 'motion-bank.json'), 'utf8'));
    for (const [name, items] of [['math', mathBank], ['poetry', poemBank], ['motion', motion]]) {
        const counts = countLevels(items);
        for (const level of LEVELS) {
            assert.ok(counts[level] >= 1, `${name} missing ${level}: ${JSON.stringify(counts)}`);
        }
    }
    const l4 = mathBank.filter(item => item.level === 'L4');
    const l5 = mathBank.filter(item => item.level === 'L5');
    const quiz4 = globalThis.PersonalWorkbenchPreschoolMathBank.buildQuiz(mathBank, { level: 'L4', size: 5 });
    const quiz5 = globalThis.PersonalWorkbenchPreschoolMathBank.buildQuiz(mathBank, { level: 'L5', size: 5 });
    assert.equal(quiz4.rounds.length, 5);
    assert.ok(quiz4.rounds.every(round => round.level === 'L4' && /\d+ [+\-×] \d+ = \?/.test(round.tokens)));
    assert.equal(quiz5.rounds.length, 5);
    assert.ok(quiz5.rounds.every(round => round.level === 'L5' && /\d+ [+\-×] \d+ = \?/.test(round.tokens)));
    assert.ok(l4.length >= 5);
    assert.ok(l5.length >= 5);

    const config = fs.readFileSync(path.join(repoRoot, 'prj', 'config.js'), 'utf8');
    assert.match(config, /id: 'preschool-math-4'[\s\S]{0,180}level: 'L4'/);
    assert.match(config, /id: 'preschool-math-5'[\s\S]{0,180}level: 'L5'/);
});

test('config lessons declare level for literacy, english, pinyin and poetry', () => {
    const config = fs.readFileSync(path.join(repoRoot, 'prj', 'config.js'), 'utf8');
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    assert.match(config, /mode: 'literacy-flash'[\s\S]{0,120}level: 'L1'/);
    assert.match(config, /mode: 'english-speak'[\s\S]{0,120}level: 'L1'/);
    assert.match(config, /mode: 'pinyin-initial'[\s\S]{0,120}level: 'L1'/);
    assert.match(config, /mode: 'poetry-line'[\s\S]{0,120}level: 'L1'/);
    assert.match(config, /mode: 'math-bank'[\s\S]{0,120}level: 'L1'/);
    assert.match(app, /isLessonLevelUnlocked/);
    assert.match(app, /renderPreschoolLevelBands/);
    assert.match(app, /renderPreschoolSubjectMastery/);
    assert.match(app, /preschool-pinyin/);
    assert.match(app, /preschool-math/);
    assert.match(app, /recordSubjectProgressFromLesson/);
});

test('resolveLevelStats reads literacy and english mastery tracks', () => {
    const bank = [
        { char: '一', level: 'L1' },
        { char: '二', level: 'L1' },
        { char: '三', level: 'L1' },
        { char: '四', level: 'L1' },
        { char: '五', level: 'L1' },
        { char: '六', level: 'L2' }
    ];
    const stats = levels.resolveLevelStats({
        literacy: {
            mastery: {
                一: { state: 'ready' },
                二: { state: 'ready' },
                三: { state: 'ready' },
                四: { state: 'ready' }
            }
        },
        english: { mastery: {} }
    }, { literacy: bank, english: [] });
    assert.equal(stats.literacy.maxUnlocked, 'L2');
    assert.equal(stats.literacy.maxIndex, 1);
    assert.equal(stats.english.maxUnlocked, 'L1');
});

test('unlock ladder opens the next level after 80% ready in the previous band', () => {
    const bank = [
        { char: '一', level: 'L1' },
        { char: '二', level: 'L1' },
        { char: '三', level: 'L1' },
        { char: '四', level: 'L1' },
        { char: '五', level: 'L1' },
        { char: '六', level: 'L2' }
    ];
    const empty = { mastery: {} };
    let track = levels.buildTrackProgress(bank, empty, item => item.char);
    assert.deepEqual(track.unlocked, ['L1']);
    assert.equal(levels.isLevelUnlocked('L2', track), false);

    const partial = {
        mastery: {
            一: { state: 'ready' },
            二: { state: 'ready' },
            三: { state: 'ready' },
            四: { state: 'ready' }
        }
    };
    track = levels.buildTrackProgress(bank, partial, item => item.char);
    assert.deepEqual(track.unlocked, ['L1', 'L2']);
    assert.equal(levels.clampLevel('L2', track), 'L2');
    assert.match(levels.unlockHint('L3', track), /L2/);
});
