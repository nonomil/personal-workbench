import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repoRoot, 'prj');

await import('../prj/config.js');
await import('../prj/preschool-pinyin-data.js');
await import('../prj/preschool-pinyin.js');
await import('../prj/preschool-lesson-pack-data.js');
await import('../prj/preschool-lesson-pack.js');

const config = globalThis.PersonalWorkbenchConfig;
const pinyin = globalThis.PersonalWorkbenchPreschoolPinyin;
const pack = globalThis.PersonalWorkbenchLessonPack;
const data = globalThis.PersonalWorkbenchLessonPackData;

function course(id) {
    const preschool = config.variants && config.variants.preschool;
    const courses = (preschool && preschool.childCourses) || config.childCourses || [];
    return courses.find(item => item.id === id);
}

test('pinyin tone quiz hides marks and maps 妈 to first tone', () => {
    assert.equal(pinyin.detectTone('mā'), 1);
    assert.equal(pinyin.detectTone('pí'), 2);
    assert.equal(pinyin.detectTone('nǐ'), 3);
    assert.equal(pinyin.detectTone('bà'), 4);
    assert.equal(pinyin.detectTone('ma'), 0);
    assert.equal(pinyin.toneLabel(1), '一声');
    const bank = pinyin.getRuntimeBank();
    const quiz = pinyin.buildToneQuiz(bank, { preferred: '妈', size: 8 });
    assert.equal(quiz.mode, 'pinyin-tone');
    assert.equal(quiz.rounds.length, 8);
    assert.equal(quiz.rounds[0].text, '妈');
    assert.equal(quiz.rounds[0].speak, '妈');
    assert.deepEqual(quiz.rounds[0].options, ['一声', '二声', '三声', '四声']);
    assert.equal(quiz.rounds[0].options[quiz.rounds[0].answer], '一声');
    quiz.rounds.forEach((round) => {
        assert.ok(round.tone >= 1 && round.tone <= 4);
        assert.equal(round.options[round.answer], pinyin.toneLabel(round.tone));
        assert.match(round.prompt, /第几声/);
    });
});

test('hanzi match days become picture-match, role days stay choice', () => {
    assert.equal(pack.isPictureMatchType('image-character-match'), true);
    assert.equal(pack.isPictureMatchType('character-picture-match'), true);
    assert.equal(pack.isPictureMatchType('nature-character-match'), true);
    assert.equal(pack.isPictureMatchType('role-character-choice'), false);
    const hanzi = pack.choiceLessons(data.hanzi);
    const picture = hanzi.find(item => item.id === 'preschool-hanzi-day-01');
    const role = hanzi.find(item => item.id === 'preschool-hanzi-day-02');
    const sun = hanzi.find(item => item.id === 'preschool-hanzi-day-11');
    assert.equal(picture.activity.mode, 'picture-match');
    assert.deepEqual(picture.activity.options, ['我', '你']);
    assert.equal(role.activity.mode, 'choice');
    assert.equal(sun.activity.mode, 'picture-match');
    assert.ok(hanzi.filter(item => item.activity.mode === 'picture-match').length >= 20);
});

test('pinyin course adds listen-for-tone and literacy keeps picture-match days', () => {
    const pinyinCourse = course('preschool-pinyin');
    const literacy = course('preschool-literacy');
    const tone = pinyinCourse.lessons.find(item => item.id === 'preschool-pinyin-4');
    assert.ok(tone);
    assert.equal(tone.activity.mode, 'pinyin-tone');
    assert.equal(tone.activity.preferred, '妈');
    assert.ok(pinyinCourse.highlights.includes('听音选调'));
    assert.ok(literacy.lessons.some(item => item.activity && item.activity.mode === 'picture-match'));
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(app, /mode === 'pinyin-tone'/);
    assert.match(app, /buildToneQuiz/);
    assert.match(app, /picture-match-option/);
    assert.match(app, /lookupLiteracyCard/);
    assert.match(html, /preschool-pinyin\.js\?v=20260815-b4-c1-v1/);
    assert.match(html, /app\.js\?v=20260816-literacy-ui-v1/);
    assert.match(html, /preschool-workbench\.css\?v=20260816-english-uplift-v2/);
});
