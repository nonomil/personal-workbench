import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'preschool', 'english', 'phonics');
const docsDir = path.join(root, 'docs', '自然拼读');
const assetDir = path.join(root, 'assets', 'generated', 'preschool', 'phonics');

function readJson(name) {
    return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
}

test('60 phonics lessons form a source-traceable continuous route', () => {
    for (const file of ['00-README.md', '01-课程总方案.md', '02-60日课程表.md', '03-每日教案模板.md', '04-家长执行手册.md', '05-资料生产与版权规范.md']) {
        assert.equal(fs.existsSync(path.join(docsDir, file)), true, `自然拼读缺少 ${file}`);
    }
    assert.equal(fs.existsSync(path.join(docsDir, 'research', 'sources.md')), true);
    assert.equal(fs.existsSync(path.join(docsDir, 'research', 'research.md')), true);
    assert.equal(fs.existsSync(path.join(docsDir, 'research', 'raw')), true);
    assert.equal(fs.existsSync(path.join(assetDir, 'manifest.json')), true);
    const route = readJson('route.json');
    const lessons = readJson('lessons.json');

    assert.equal(route.id, 'preschool-english-phonics');
    assert.equal(route.dayCount, 60);
    assert.equal(lessons.length, 60);
    assert.deepEqual(lessons.map(item => item.day), Array.from({ length: 60 }, (_, index) => index + 1));
    assert.equal(new Set(lessons.map(item => item.id)).size, lessons.length);

    const sentenceIds = new Set(readJson('sentence-bank.json').map(item => item.id));
    for (const lesson of lessons) {
        assert.equal(lesson.routeId, route.id);
        assert.ok(lesson.stageId);
        assert.ok(lesson.activityType);
        assert.ok(lesson.durationMin >= 8 && lesson.durationMin <= 15);
        assert.ok(Array.isArray(lesson.reviewPatterns));
        assert.ok(lesson.source && lesson.source.kind && lesson.source.license);
        assert.ok(lesson.reward && lesson.reward.source === 'existing-preschool-activity');
        assert.equal(lesson.reward.duplicatePolicy, 'canonical-event-id');
        for (const sentenceId of lesson.sentenceIds ?? []) assert.equal(sentenceIds.has(sentenceId), true, `${lesson.id} references missing ${sentenceId}`);
    }
});

test('phonics words and sentences declare their taught-code boundary', () => {
    const words = readJson('word-bank.json');
    const sentences = readJson('sentence-bank.json');

    assert.ok(words.length >= 90);
    assert.ok(sentences.length >= 36);
    assert.equal(new Set(words.map(item => item.id)).size, words.length);
    assert.equal(new Set(sentences.map(item => item.id)).size, sentences.length);
    for (const word of words) {
        assert.ok(word.id && word.text && word.stageId);
        assert.ok(Array.isArray(word.graphemes));
        assert.ok(Array.isArray(word.phonemes));
        assert.ok(word.source && word.source.kind === 'project-original');
    }
    for (const sentence of sentences) {
        assert.ok(sentence.id && sentence.text && sentence.stageId);
        assert.ok(Array.isArray(sentence.allowedPatterns));
        assert.ok(Array.isArray(sentence.trickyWords));
        assert.equal(sentence.source.kind, 'project-original');
        assert.ok(sentence.decodabilityPercent >= 0 && sentence.decodabilityPercent <= 100);
    }
});
