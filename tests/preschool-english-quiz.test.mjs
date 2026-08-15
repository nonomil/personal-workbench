import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/child-courses.js');
await import('../prj/preschool-english-vocab.js');
const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;
const courses = globalThis.PersonalWorkbenchChildCourses;

function word(text, extras) {
    const image = extras && Object.prototype.hasOwnProperty.call(extras, 'image')
        ? extras.image
        : 'assets/img/vocab/' + text + '.png';
    const base = {
        text: text,
        zh: text + '义',
        theme: '动物',
        level: 'L1',
        phrase: 'I see a ' + text + '.',
        phraseZh: '我看见' + text,
        image: image,
        media: { image: image, art: '', audio: '' }
    };
    return Object.assign(base, extras || {}, {
        image: image,
        media: Object.assign({ image: image, art: '', audio: '' }, extras && extras.media)
    });
}

function sampleBank() {
    return [
        word('cat'),
        word('dog'),
        word('pig'),
        word(' hen', { text: 'hen' }),
        word('duck'),
        word('frog'),
        word('bear', { theme: '颜色' }),
        word('lion', { level: 'L2' }),
        word('apple', { theme: '食物', image: '' }),
        word('banana', { theme: '食物', image: '' }),
        word('grape', { theme: '食物', image: '' }),
        word('pear', { theme: '食物', image: '' })
    ].map(function (item) {
        item.text = String(item.text || '').trim();
        return item;
    });
}

test('buildQuizQuestions makes listen-pick-image and see-image-pick-word per pictured word', () => {
    const bank = sampleBank();
    const batch = [bank[0], bank[1], bank[2]];
    const questions = vocab.buildQuizQuestions(batch, bank);
    const types = questions.map((item) => item.type);
    assert.equal(questions.length, 6);
    assert.equal(types.filter((type) => type === 'listen-pick-image').length, 3);
    assert.equal(types.filter((type) => type === 'see-image-pick-word').length, 3);
    for (const question of questions) {
        assert.equal(question.options.length, 4);
        assert.ok(question.answerIndex >= 0 && question.answerIndex < 4);
        assert.equal(question.options[question.answerIndex].text, question.word);
        const texts = question.options.map((option) => option.text);
        assert.equal(new Set(texts).size, 4);
        assert.equal(texts.includes(question.word), true);
        for (const option of question.options) {
            assert.equal(bank.some((item) => item.text === option.text), true, 'fake word ' + option.text);
            assert.notEqual(option.text, 'aple');
            assert.notEqual(option.text, 'appel');
        }
        const others = texts.filter((text) => text !== question.word);
        for (const extra of others) {
            assert.equal(batch.some((item) => item.text === extra), false, 'batch mate leaked as distractor: ' + extra);
        }
    }
});

test('listen-pick-image drops words without images and still yields see-image-pick-word only when pictured', () => {
    const bank = sampleBank();
    const batch = [bank.find((item) => item.text === 'apple'), bank.find((item) => item.text === 'cat')];
    const questions = vocab.buildQuizQuestions(batch, bank);
    const appleQs = questions.filter((item) => item.word === 'apple');
    const catQs = questions.filter((item) => item.word === 'cat');
    assert.equal(appleQs.some((item) => item.type === 'listen-pick-image'), false);
    assert.equal(appleQs.some((item) => item.type === 'see-image-pick-word'), false);
    assert.equal(catQs.some((item) => item.type === 'listen-pick-image'), true);
    assert.equal(catQs.some((item) => item.type === 'see-image-pick-word'), true);
    assert.ok(questions.length >= 2);
});

test('quiz answerIndex is not glued to one slot across many builds', () => {
    const bank = sampleBank();
    const batch = [bank[0], bank[1], bank[2]];
    const slots = new Set();
    for (let i = 0; i < 80; i += 1) {
        const questions = vocab.buildQuizQuestions(batch, bank);
        questions.forEach((question) => slots.add(question.answerIndex));
        if (slots.size >= 3) break;
    }
    assert.ok(slots.size >= 3, 'expected shuffled answer slots, got ' + [...slots].join(','));
});

test('self-assess markKnown still reaches ready so 我的词库 and game backflow stay compatible', () => {
    const rules = { reviewIntervalsDays: [1, 3, 7, 14] };
    const progress = vocab.markKnown(vocab.createDefaultProgress(), 'hello', true, '2026-08-16', rules);
    assert.equal(progress.mastery.hello.state, 'ready');
    assert.equal(progress.mastery.hello.sunlightDelta, 0);
    assert.equal(progress.mastery.hello.nextReview, '2026-08-19');
    assert.equal((progress.mastery.hello.quiz && progress.mastery.hello.quiz.listen.correct) || 0, 0);
});

test('recordQuizAnswer writes buckets and ready needs 3 correct across 2 types', () => {
    const rules = { reviewIntervalsDays: [1, 3, 7, 14] };
    let progress = vocab.createDefaultProgress();
    progress = vocab.recordQuizAnswer(progress, 'cat', { type: 'listen', correct: true, date: '2026-08-16', rules: rules });
    progress = vocab.recordQuizAnswer(progress, 'cat', { type: 'read', correct: true, date: '2026-08-16', rules: rules });
    assert.equal(progress.mastery.cat.state, 'practicing');
    assert.equal(progress.mastery.cat.attempts, 2);
    assert.equal(progress.mastery.cat.correct, 2);
    assert.equal(progress.mastery.cat.quiz.listen.correct, 1);
    assert.equal(progress.mastery.cat.quiz.read.correct, 1);
    progress = vocab.recordQuizAnswer(progress, 'cat', { type: 'spell', correct: true, date: '2026-08-16', rules: rules });
    assert.equal(progress.mastery.cat.state, 'ready');
    assert.equal(progress.mastery.cat.correct, 3);
    assert.equal(progress.mastery.cat.nextReview, '2026-08-19');
});

test('wrong quiz answers increment attempts only and expose errorType', () => {
    const rules = { reviewIntervalsDays: [1, 3, 7, 14] };
    let progress = vocab.recordQuizAnswer(vocab.createDefaultProgress(), 'dog', {
        type: 'listen',
        correct: false,
        date: '2026-08-16',
        rules: rules
    });
    assert.equal(progress.mastery.dog.attempts, 1);
    assert.equal(progress.mastery.dog.correct, 0);
    assert.equal(progress.mastery.dog.quiz.listen.attempts, 1);
    assert.equal(progress.mastery.dog.quiz.listen.correct, 0);
    assert.equal(progress.mastery.dog.state, 'practicing');
    assert.equal(vocab.quizErrorType('listen-pick-image'), 'listen');
    assert.equal(vocab.quizErrorType('see-image-pick-word'), 'read');
    assert.equal(vocab.quizErrorType('spell'), 'spell');
});

test('old mastery snapshots without quiz buckets stay readable', () => {
    const rules = { reviewIntervalsDays: [1, 3, 7, 14] };
    const cloned = vocab.cloneProgress({
        mastery: { hello: { state: 'ready', dates: ['2026-08-14'], attempts: 1, correct: 1, nextReview: '2026-08-17' } }
    });
    assert.equal(cloned.mastery.hello.state, 'ready');
    assert.equal(cloned.mastery.hello.quiz.listen.attempts, 0);
    const after = vocab.recordQuizAnswer(cloned, 'hello', { type: 'read', correct: true, date: '2026-08-16', rules: rules });
    assert.equal(after.mastery.hello.state, 'ready');
    assert.equal(after.mastery.hello.quiz.read.correct, 1);
});

test('today-3-words lesson inserts quiz phase before match and spell', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const css = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool-workbench.css'), 'utf8');
    assert.match(app, /buildQuizQuestions/);
    assert.match(app, /phase === 'quiz'/);
    assert.match(app, /english-quiz-pick/);
    assert.match(app, /english-quiz-confirm/);
    assert.match(app, /recordQuizAnswer/);
    assert.match(app, /english-quiz/);
    assert.match(css, /41-english-vocab-uplift\.css/);
});

test('child-courses normalizeEnglish keeps quiz buckets inside mastery entries', () => {
    const normalized = courses.normalize({
        english: {
            mastery: {
                cat: {
                    state: 'practicing',
                    dates: ['2026-08-16'],
                    attempts: 2,
                    correct: 1,
                    nextReview: '2026-08-17',
                    quiz: { listen: { attempts: 1, correct: 1 }, read: { attempts: 1, correct: 0 }, spell: { attempts: 0, correct: 0 } }
                }
            }
        }
    });
    assert.equal(normalized.english.mastery.cat.quiz.listen.correct, 1);
    assert.equal(normalized.english.mastery.cat.quiz.read.attempts, 1);
    assert.equal(normalized.english.mastery.cat.quiz.spell.correct, 0);
});
