import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bankPath = path.join(repoRoot, 'prj', 'data', 'preschool', '英语', 'minecraft-bank.json');
const indexPath = path.join(repoRoot, 'prj', 'data', 'preschool', 'banks-index.json');

await import('../prj/preschool-levels-data.js');
await import('../prj/preschool-bank-levels.js');
await import('../prj/preschool-english-vocab-data.js');
await import('../prj/preschool-english-vocab.js');
await import('../prj/preschool-minecraft-vocab-data.js');

const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;

test('minecraft interest bank is 324 schema-v1 words kept out of the core 597', () => {
    const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
    const core = vocab.parseBank(JSON.parse(fs.readFileSync(path.join(repoRoot, 'prj', 'data', 'preschool', '英语', 'vocabulary-bank.json'), 'utf8')));
    assert.equal(bank.length, 324);
    assert.equal(core.length, 597);
    const texts = new Set();
    for (const row of bank) {
        assert.equal(row.kind, 'english');
        assert.match(String(row.id), /^mc-/);
        assert.match(String(row.level), /^MC-D[12]$/);
        assert.equal(row.source, 'wordquest-mc');
        assert.ok(row.text && row.zh && row.phrase && row.phraseZh && row.theme);
        assert.doesNotMatch(String(row.phraseZh), /带在包里/);
        assert.doesNotMatch(JSON.stringify(row.media || {}), /https?:/i);
        assert.ok(fs.existsSync(path.join(repoRoot, 'prj', row.media.image)));
        assert.equal(texts.has(row.text), false, 'duplicate ' + row.text);
        texts.add(row.text);
    }
    assert.ok(texts.has('swamp'));
    assert.ok(!core.some((item) => item.id && String(item.id).startsWith('mc-')));
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const entry = (index.banks || []).find((item) => item.id === 'minecraft');
    assert.ok(entry);
    assert.equal(entry.expected, 324);
});

test('minecraft flashcards reuse the english engine and stay off the daily core course', () => {
    const data = globalThis.PersonalWorkbenchMinecraftVocabData;
    const bank = vocab.parseBank(data && data.bank);
    assert.equal(bank.length, 324);
    const dayOne = vocab.dailyWindow(bank.filter((item) => item.level === 'MC-D1'), '2026-08-01', 5);
    assert.equal(dayOne.batch.length, 5);
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const config = fs.readFileSync(path.join(repoRoot, 'prj', 'config.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(config, /id: 'preschool-minecraft'/);
    assert.match(app, /preschool-minecraft/);
    assert.match(app, /Minecraft 英语/);
    assert.doesNotMatch(app, /preschool-plan-.*minecraft/);
    assert.match(html, /preschool-minecraft-vocab-data\.js\?v=20260815-english-auto-v1/);
});
