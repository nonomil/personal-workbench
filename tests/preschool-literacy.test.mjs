import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bankPath = path.join(repoRoot, 'prj', 'data', 'preschool', '识字', 'character-bank.json');
const rulesPath = path.join(repoRoot, 'prj', 'data', 'preschool', '识字', 'review-rules.json');
const banned = ['坡', '始', '游', '她', '店'];

await import('../prj/child-courses.js');
await import('../prj/preschool-literacy-data.js');
await import('../prj/preschool-literacy.js');
const literacy = globalThis.PersonalWorkbenchPreschoolLiteracy;

function readBank() {
    return JSON.parse(fs.readFileSync(bankPath, 'utf8'));
}

test('parses the character bank into unique life characters with child words', () => {
    const parsed = literacy.parseBank(readBank());
    assert.ok(parsed.length >= 1500, `expected at least 1500 chars, got ${parsed.length}`);
    assert.equal(literacy.getRuntimeBank().length, parsed.length);
    const chars = parsed.map(item => item.char);
    assert.equal(new Set(chars).size, parsed.length);
    for (const item of parsed) {
        assert.equal(item.char.length, 1);
        assert.ok(item.pinyin);
        assert.ok(item.theme);
        assert.ok(item.words.length >= 2, `${item.char} needs two child words`);
        assert.ok(item.words.every(word => word.includes(item.char)));
        assert.ok(item.explain, `${item.char} needs explain`);
        assert.match(item.level, /^L[1-5]$/);
        assert.equal(banned.includes(item.char), false, `banned char leaked: ${item.char}`);
    }
});

test('builds a recognize-practice-quiz loop from the bank for 山', () => {
    const loop = literacy.buildLoop(literacy.parseBank(readBank()), '山');
    assert.equal(loop.char, '山');
    assert.equal(loop.pinyin, 'shān');
    assert.deepEqual(loop.steps.map(step => step.kind), ['recognize', 'practice', 'quiz']);
    const practice = loop.steps[1];
    const quiz = loop.steps[2];
    assert.ok(practice.options.length >= 2);
    assert.equal(practice.options[practice.answer].label.includes('山'), true);
    assert.ok(practice.options.every(option => !banned.some(char => option.label.includes(char))));
    assert.equal(quiz.options[quiz.answer].label, '山');
    assert.ok(quiz.options.every(option => option.label.length === 1));
    assert.equal(quiz.speak, 'shān');
});

test('word bloom uses only curated child words and never dumps adult lexicon', () => {
    const bloom = literacy.buildWordBloom(literacy.parseBank(readBank()), '山');
    const selected = bloom.options.filter(item => item.correct).map(item => item.word);
    assert.ok(selected.length >= 2);
    assert.ok(selected.every(word => word.includes('山')));
    assert.equal(bloom.options.some(item => item.word === '山寨'), false);
    assert.ok(bloom.options.filter(item => !item.correct).every(item => !item.word.includes('山')));
    assert.ok(bloom.options.length >= 6);
});

test('review queue follows 1/3/7/14 days and readyRule without SM-2', () => {
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    let progress = literacy.createDefaultProgress();
    progress = literacy.recordAttempt(progress, '山', { correct: true, date: '2026-08-01', activityType: 'recognize' }, rules);
    progress = literacy.recordAttempt(progress, '山', { correct: true, date: '2026-08-01', activityType: 'quiz' }, rules);
    const sameDay = literacy.buildReviewQueue(progress, rules, '2026-08-01', ['山', '水']);
    assert.equal(sameDay.includes('山'), false);
    const nextDay = literacy.buildReviewQueue(progress, rules, '2026-08-02', ['山', '水']);
    assert.deepEqual(nextDay, ['山']);
    progress = literacy.recordAttempt(progress, '山', { correct: true, date: '2026-08-02', activityType: 'practice' }, rules);
    const item = progress.mastery['山'];
    assert.equal(item.state, 'ready');
    assert.equal(item.nextReview, '2026-08-05');
});

test('wrong answers never deduct sunlight and stay out of ready', () => {
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    let progress = literacy.createDefaultProgress();
    progress = literacy.recordAttempt(progress, '猫', { correct: false, date: '2026-08-01', activityType: 'quiz' }, rules);
    progress = literacy.recordAttempt(progress, '猫', { correct: false, date: '2026-08-02', activityType: 'practice' }, rules);
    assert.equal(progress.mastery['猫'].state, 'practicing');
    assert.equal(progress.mastery['猫'].sunlightDelta, 0);
    assert.ok(progress.mastery['猫'].accuracy < 0.8);
});

test('child-courses snapshot keeps literacy mastery inside the existing progress object', () => {
    const courses = globalThis.PersonalWorkbenchChildCourses;
    const normalized = courses.normalize({
        completedLessonIds: ['preschool-chinese-1'],
        literacy: { mastery: { 山: { state: 'ready', dates: ['2026-08-01'], attempts: 2, correct: 2, nextReview: '2026-08-02' } } }
    });
    assert.deepEqual(normalized.completedLessonIds, ['preschool-chinese-1']);
    assert.equal(normalized.literacy.mastery['山'].state, 'ready');
});

test('today picker uses due chars then unseen bank chars and prefers 山 as the first seed', () => {
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    const bank = literacy.parseBank(readBank());
    const chars = bank.map(item => item.char);
    const firstUnseen = chars.find(char => char !== '山') || chars[0];
    const empty = literacy.createDefaultProgress();
    assert.equal(literacy.pickTodayChar(bank, empty, rules, '2026-08-14', '山'), '山');
    let progress = literacy.recordAttempt(empty, '山', { correct: true, date: '2026-08-14', activityType: 'quiz' }, rules);
    assert.equal(literacy.pickTodayChar(bank, progress, rules, '2026-08-14', '山'), firstUnseen);
    assert.equal(literacy.pickTodayChar(bank, progress, rules, '2026-08-15', '山'), '山');
    progress = literacy.recordAttempt(progress, '山', { correct: true, date: '2026-08-15', activityType: 'practice' }, rules);
    assert.equal(progress.mastery['山'].state, 'ready');
    assert.equal(literacy.pickTodayChar(bank, progress, rules, '2026-08-16', '山'), firstUnseen);
});

test('find run builds five unique 4-choice rounds without giving away the answer in the prompt', () => {
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    const bank = literacy.parseBank(readBank());
    const run = literacy.buildFindRun(bank, literacy.createDefaultProgress(), rules, '2026-08-14', '山', 5);
    assert.equal(run.rounds.length, 5);
    assert.equal(run.rounds[0].char, '山');
    const chars = run.rounds.map(round => round.char);
    assert.equal(new Set(chars).size, 5);
    for (const round of run.rounds) {
        assert.equal(round.options.length, 4);
        assert.equal(round.options[round.answer].label, round.char);
        assert.ok(round.options.every(option => option.label.length === 1));
        assert.equal(banned.some(char => round.options.some(option => option.label === char)), false);
        assert.equal(round.prompt, '听一听，点出这个字');
        assert.ok(round.pinyin);
        assert.ok(round.word);
    }
});

test('flash batch marks known chars as ready and teaches unknown chars with word explanations', () => {
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    const bank = literacy.parseBank(readBank());
    const empty = literacy.createDefaultProgress();
    const batch = literacy.buildFlashBatch(bank, empty, rules, '2026-08-14', '山', 8);
    assert.equal(batch.length, 8);
    assert.equal(batch[0].char, '山');
    assert.equal(batch[0].review, false);
    assert.equal(new Set(batch.map(item => item.char)).size, 8);
    let dueProgress = literacy.markFlash(empty, '山', true, '2026-08-14', rules);
    const sameDay = literacy.buildFlashBatch(bank, dueProgress, rules, '2026-08-14', '山', 8);
    assert.equal(sameDay.some(item => item.char === '山' && item.review), false);
    const nextDay = literacy.buildFlashBatch(bank, dueProgress, rules, '2026-08-17', '水', 8);
    assert.equal(nextDay[0].char, '山');
    assert.equal(nextDay[0].review, true);
    let progress = literacy.markFlash(empty, '山', true, '2026-08-14', rules);
    assert.equal(progress.mastery['山'].state, 'ready');
    assert.equal(progress.mastery['山'].sunlightDelta, 0);
    progress = literacy.markFlash(progress, '我', false, '2026-08-14', rules);
    assert.equal(progress.mastery['我'].state, 'practicing');
    const card = literacy.buildTeachCard(bank, '山');
    assert.ok(card.words.includes('大山'));
    assert.match(card.explain, /大山/);
    assert.equal(card.explain.includes('山寨'), false);
    const summary = literacy.summarizeMastery(progress);
    assert.equal(summary.known, 1);
    assert.equal(summary.unknown, 1);
});

test('literacy loop remains replayable after preschool-chinese-1 is complete', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    assert.match(app, /pickTodayChar/);
    assert.match(app, /if \(completedIds\.includes\(match\.lesson\.id\)\)[\s\S]*if \(!isReplayableLesson\(match\)\)/);
});

test('preschool literacy course copy drops 坡/始/游 and still has answerable activities', () => {
    const config = fs.readFileSync(path.join(repoRoot, 'prj', 'config.js'), 'utf8');
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    const literacyBlock = config.split("id: 'preschool-literacy'")[1].split("id: 'preschool-pinyin'")[0];
    assert.match(literacyBlock, /山/);
    assert.doesNotMatch(literacyBlock, /坡/);
    assert.doesNotMatch(literacyBlock, /['"]始['"]/);
    assert.doesNotMatch(literacyBlock, /游 yóu/);
    assert.match(literacyBlock, /mode: 'literacy-flash'/);
    assert.match(literacyBlock, /mode: 'literacy-bloom'/);
    assert.match(literacyBlock, /mode: 'literacy-find'/);
    assert.match(app, /buildLiteracySession/);
    assert.match(app, /data-action="literacy-speak"/);
    assert.match(app, /data-action="literacy-mark"/);
    assert.match(app, /data-action="literacy-remember"/);
    assert.match(app, /会了/);
    assert.match(app, /还不会/);
    assert.match(app, /renderPreschoolLiteracyMastery/);
    assert.match(app, /今天再认/);
    assert.match(app, /literacy-flash-review/);
    assert.match(app, /mode === 'literacy-bloom'[\s\S]{0,400}pickTodayChar/);
    assert.match(html, /preschool-literacy\.js/);
});
