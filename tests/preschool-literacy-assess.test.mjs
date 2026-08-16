import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repoRoot, 'prj');

await import('../prj/preschool-bank-levels.js');
await import('../prj/preschool-literacy.js');
await import('../prj/config.js');
await import('../prj/child-courses.js');

const literacy = globalThis.PersonalWorkbenchPreschoolLiteracy;
const config = globalThis.PersonalWorkbenchConfig;
const courses = globalThis.PersonalWorkbenchChildCourses;

function makeBank() {
    const bank = [];
    ['L1', 'L2', 'L3', 'L4', 'L5'].forEach(function (level, levelIndex) {
        for (let i = 0; i < 20; i += 1) {
            bank.push({
                char: String.fromCharCode(0x4e00 + levelIndex * 20 + i),
                pinyin: 'p' + (levelIndex + 1) + 'i' + i,
                theme: '测',
                words: ['词' + level + i, '组' + level + i],
                explain: '测',
                level: level
            });
        }
    });
    return bank;
}

function course(id) {
    const preschool = config.variants && config.variants.preschool;
    const list = (preschool && preschool.childCourses) || config.childCourses || [];
    return list.find(item => item.id === id);
}

function segmentLevels(rounds, size) {
    const levels = [];
    for (let i = 0; i < rounds.length; i += size) {
        levels.push(rounds[i].level);
    }
    return levels;
}

test('buildAssessment emits 25 unique chars with four distinct pinyin options', () => {
    const quiz = literacy.buildAssessment(makeBank(), literacy.createDefaultProgress(), { size: 25, salt: 7 });
    assert.equal(quiz.rounds.length, 25);
    const chars = quiz.rounds.map(item => item.char);
    assert.equal(new Set(chars).size, 25);
    quiz.rounds.forEach((round) => {
        assert.equal(round.options.length, 4);
        assert.equal(new Set(round.options).size, 4);
        assert.equal(round.options[round.answer], round.pinyin);
        assert.match(round.level, /^L[1-5]$/);
        assert.ok(round.char);
        assert.ok(round.word);
    });
});

test('assessment staircase rises after five-in-a-row and falls after five misses', () => {
    const bank = makeBank();
    const allRight = Array(25).fill(true);
    const up = literacy.buildAssessment(bank, {}, { size: 25, salt: 3, outcomes: allRight });
    assert.deepEqual(segmentLevels(up.rounds, 5), ['L1', 'L2', 'L3', 'L4', 'L5']);

    const allWrong = Array(25).fill(false);
    const down = literacy.buildAssessment(bank, {}, { size: 25, salt: 3, outcomes: allWrong });
    down.rounds.forEach((round) => {
        assert.equal(round.level, 'L1');
    });
});

test('ready and maintenance chars stay out of the assessment paper', () => {
    const bank = makeBank();
    const blocked = bank.filter(item => item.level === 'L1').slice(0, 8).map(item => item.char);
    const progress = { mastery: {} };
    blocked.forEach((char, index) => {
        progress.mastery[char] = { state: index % 2 ? 'maintenance' : 'ready' };
    });
    const quiz = literacy.buildAssessment(bank, progress, { size: 25, salt: 11 });
    quiz.rounds.forEach((round) => {
        assert.equal(blocked.includes(round.char), false, 'known char leaked: ' + round.char);
    });
});

test('scoreAssessment matches the L1-full plus L2-three-fifths hand example', () => {
    const rounds = [];
    for (let i = 0; i < 5; i += 1) rounds.push({ char: 'A' + i, pinyin: 'a' + i, options: ['a' + i, 'x', 'y', 'z'], answer: 0, level: 'L1' });
    for (let i = 0; i < 5; i += 1) rounds.push({ char: 'B' + i, pinyin: 'b' + i, options: ['b' + i, 'x', 'y', 'z'], answer: 0, level: 'L2' });
    const answers = [true, true, true, true, true, true, true, true, false, false].map(function (correct, index) {
        return { correct: correct, elapsedMs: 4000 + index };
    });
    const scored = literacy.scoreAssessment(rounds, answers, { L1: 100, L2: 200, L3: 300, L4: 400, L5: 500 });
    assert.equal(scored.estimate, 220);
    assert.equal(scored.stage, '字芽初萌');
    assert.deepEqual(scored.wrongChars, ['B3', 'B4']);
    assert.equal(scored.perLevel.L1.asked, 5);
    assert.equal(scored.perLevel.L1.hit, 5);
    assert.equal(scored.perLevel.L2.hit, 3);
});

test('confidence is high when five levels stay steady and low when only one level is reached', () => {
    const full = [];
    const answers = [];
    ['L1', 'L2', 'L3', 'L4', 'L5'].forEach(function (level) {
        for (let i = 0; i < 5; i += 1) {
            full.push({ char: level + i, pinyin: level + i, options: [level + i, 'x', 'y', 'z'], answer: 0, level: level });
            answers.push({ correct: true, elapsedMs: 3000 });
        }
    });
    const wide = literacy.scoreAssessment(full, answers, { L1: 100, L2: 100, L3: 100, L4: 100, L5: 100 });
    assert.ok(wide.confidence >= 0.6);
    assert.equal(wide.lowConfidence, false);
    assert.equal(wide.stage, '自主阅读期');

    const narrowRounds = full.slice(0, 5);
    const narrow = literacy.scoreAssessment(narrowRounds, answers.slice(0, 5), { L1: 100, L2: 100, L3: 100, L4: 100, L5: 100 });
    assert.ok(narrow.confidence < 0.6);
    assert.equal(narrow.lowConfidence, true);
});

test('five rushed answers under 1.5s mark the paper as low confidence', () => {
    const rounds = [];
    const answers = [];
    for (let i = 0; i < 5; i += 1) {
        rounds.push({ char: '急' + i, pinyin: 'ji' + i, options: ['ji' + i, 'x', 'y', 'z'], answer: 0, level: 'L1' });
        answers.push({ correct: true, elapsedMs: 800 });
    }
    const scored = literacy.scoreAssessment(rounds, answers, { L1: 80, L2: 80, L3: 80, L4: 80, L5: 80 });
    assert.equal(scored.lowConfidence, true);
});

test('stageForCount maps the four parent-facing bands', () => {
    assert.equal(literacy.stageForCount(0), '字芽初萌');
    assert.equal(literacy.stageForCount(249), '字芽初萌');
    assert.equal(literacy.stageForCount(250), '绘本启蒙期');
    assert.equal(literacy.stageForCount(499), '绘本启蒙期');
    assert.equal(literacy.stageForCount(500), '自主阅读期');
    assert.equal(literacy.stageForCount(749), '自主阅读期');
    assert.equal(literacy.stageForCount(750), '阅读进阶期');
});

test('recordAssessment appends history, caps at 24, and ignores low-confidence best', () => {
    let progress = literacy.createDefaultProgress();
    assert.deepEqual(progress.assessments || [], []);
    progress = literacy.recordAssessment(progress, { estimate: 180, confidence: 0.72, stage: '字芽初萌', wrongChars: ['山'], perLevel: { L2: { asked: 5 } } }, '2026-08-01');
    progress = literacy.recordAssessment(progress, { estimate: 260, confidence: 0.4, stage: '绘本启蒙期', wrongChars: [], perLevel: { L3: { asked: 5 } } }, '2026-08-02');
    progress = literacy.recordAssessment(progress, { estimate: 240, confidence: 0.8, stage: '字芽初萌', wrongChars: [], perLevel: { L2: { asked: 5 } } }, '2026-08-03');
    assert.equal(progress.assessments.length, 3);
    const summary = literacy.summarizeAssessments(progress);
    assert.equal(summary.latest.estimate, 240);
    assert.equal(summary.best.estimate, 240);
    assert.equal(summary.best.date, '2026-08-03');
    for (let i = 0; i < 24; i += 1) {
        progress = literacy.recordAssessment(progress, { estimate: 100 + i, confidence: 0.7, stage: '字芽初萌', wrongChars: [], perLevel: { L1: { asked: 5 } } }, '2026-08-10');
    }
    assert.equal(progress.assessments.length, 24);
    const cloned = literacy.cloneProgress ? literacy.cloneProgress(progress) : literacy.recordAssessment(progress, { estimate: 1, confidence: 0.1, stage: '字芽初萌', wrongChars: [], perLevel: {} }, '2026-08-11');
    assert.ok(Array.isArray((cloned.assessments || progress.assessments)));
});

test('rushed assessment stays reference-only even when its numeric confidence is high', () => {
    const progress = literacy.recordAssessment(literacy.createDefaultProgress(), {
        estimate: 900,
        confidence: 0.86,
        lowConfidence: true,
        stage: '阅读进阶期',
        wrongChars: [],
        perLevel: { L1: { asked: 5 }, L2: { asked: 5 }, L3: { asked: 5 }, L4: { asked: 5 }, L5: { asked: 5 } }
    }, '2026-08-16');
    assert.equal(progress.assessments[0].lowConfidence, true);
    assert.equal(literacy.summarizeAssessments(progress).best, null);
});

test('learning summary exposes latest and best literacy estimates from the same progress key', () => {
    const summary = courses.buildLearningSummary({
        streak: 2,
        courseProgress: {
            literacy: {
                mastery: { 山: { state: 'ready' } },
                assessments: [
                    { date: '2026-08-01', estimate: 180, confidence: 0.7, level: 'L2', stage: '字芽初萌', wrong: [] },
                    { date: '2026-08-10', estimate: 90, confidence: 0.3, level: 'L1', stage: '字芽初萌', wrong: ['水'] }
                ]
            }
        },
        mistakes: [],
        reviewQueue: [],
        claimedRewardIds: [],
        pendingRewardIds: [],
        rewards: []
    });
    assert.equal(summary.literacyAssess.latest.estimate, 90);
    assert.equal(summary.literacyAssess.best.estimate, 180);
    assert.equal(summary.literacyAssess.history.length, 2);
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    assert.match(app, /识字量：最近/);
    assert.match(app, /recordAssessment/);
});

test('literacy course adds a 25-question assess lesson that stays off the required path', () => {
    const literacyCourse = course('preschool-literacy');
    const lesson = literacyCourse.lessons.find(item => item.id === 'preschool-chinese-assess');
    assert.ok(lesson);
    assert.equal(lesson.activity.mode, 'literacy-assess');
    assert.equal(lesson.activity.size, 25);
    assert.match(lesson.meta, /25 题/);
    assert.equal(lesson.required, undefined);
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(app, /mode === 'literacy-assess'/);
    assert.match(app, /buildAssessment/);
    assert.match(app, /scoreAssessment/);
    assert.match(app, /识字量/);
    const bankQuizFn = app.match(/function isBankQuizLesson\([\s\S]*?\n    \}/);
    assert.ok(bankQuizFn);
    assert.equal(bankQuizFn[0].includes('literacy-assess'), false);
    assert.match(html, /preschool-literacy\.js\?v=20260816-literacy-ui-v2/);
    assert.match(html, /app\.js\?v=20260816-literacy-ui-v5/);
    assert.match(html, /config\.js\?v=20260816-literacy-uplift-v1/);
});
