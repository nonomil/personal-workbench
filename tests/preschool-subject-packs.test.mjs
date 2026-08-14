import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repoRoot, 'prj');
const subjects = [
    ['识字', 'preschool-hanzi', 'character-bank.json'],
    ['数学', 'preschool-math', 'problem-bank.json'],
    ['古诗', 'preschool-poetry', 'poem-bank.json'],
    ['英语', 'preschool-english', 'vocabulary-bank.json'],
    ['运动与专注', 'preschool-motion-focus', 'motion-bank.json'],
    ['成长游戏', 'preschool-garden-game', 'garden-bank.json']
];
const requiredDocFiles = [
    '00-README.md',
    '01-课程总方案.md',
    '02-60日课程表.md',
    '03-每日教案模板.md',
    '04-家长执行手册.md',
    '05-资料生产与版权规范.md'
];

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

test('every subject has a complete independent data and asset package', () => {
    for (const [folder, routeId, bankFile] of subjects) {
        const docsDir = path.join(repoRoot, 'docs', '02-课程', folder);
        const dataDir = path.join(root, 'data', 'preschool', folder);
        const assetDir = path.join(root, 'assets', 'generated', 'preschool', folder);
        for (const file of requiredDocFiles) {
            assert.equal(fs.existsSync(path.join(docsDir, file)), true, `${folder} missing ${file}`);
        }
        assert.equal(fs.existsSync(path.join(docsDir, 'research', 'sources.md')), true);
        assert.equal(fs.existsSync(path.join(docsDir, 'research', 'research.md')), true);
        assert.equal(fs.existsSync(path.join(docsDir, 'research', 'raw', 'README.md')), true);
        const route = readJson(path.join(dataDir, 'route.json'));
        const lessons = readJson(path.join(dataDir, 'lessons.json'));
        const bank = readJson(path.join(dataDir, bankFile));
        const rules = readJson(path.join(dataDir, 'review-rules.json'));
        const manifest = readJson(path.join(assetDir, 'manifest.json'));

        assert.equal(route.id, routeId);
        assert.equal(route.dayCount, 60);
        assert.equal(lessons.length, 60);
        assert.equal(new Set(lessons.map(item => item.id)).size, 60);
        assert.equal(lessons[0].day, 1);
        assert.equal(lessons.at(-1).day, 60);
        assert.ok(Array.isArray(bank) ? bank.length >= 5 : Object.keys(bank).length >= 1);
        assert.deepEqual(rules.reviewIntervalsDays, [1, 3, 7, 14]);
        assert.equal(manifest.policy.unknownLicensePublishable, false);
        assert.equal(fs.existsSync(path.join(assetDir, 'original')), true);
        assert.equal(fs.existsSync(path.join(assetDir, 'external')), true);
        assert.equal(fs.existsSync(path.join(repoRoot, 'tmp')), false, 'temporary downloads must stay outside the release tree');

        for (const lesson of lessons) {
            assert.equal(lesson.routeId, routeId);
            assert.ok(lesson.stageId);
            assert.ok(lesson.activityType);
            assert.ok(lesson.activity.prompt);
            assert.ok(Array.isArray(lesson.evidence));
            assert.ok(Array.isArray(lesson.reviewTags));
            assert.equal(lesson.source.kind, 'project-original');
            assert.equal(lesson.reward.duplicatePolicy, 'canonical-event-id');
        }
    }
});
