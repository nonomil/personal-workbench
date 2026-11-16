import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const generator = path.join(repoRoot, 'tools', 'tts-portable', 'generate-content-audio.py');

await import('../prj/preschool-speech.js');
const speech = globalThis.PersonalWorkbenchPreschoolSpeech;

function runDryRun(args = [], useDefaultOutput = false) {
    const outputDir = useDefaultOutput
        ? path.join(repoRoot, 'prj', 'assets', 'audio', 'tts')
        : fs.mkdtempSync(path.join(os.tmpdir(), 'tts-content-audio-'));
    try {
        const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [
            generator,
            '--dry-run',
            '--output-dir',
            outputDir,
            ...args
        ], { cwd: repoRoot, encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr || result.stdout);
        return JSON.parse(result.stdout);
    } finally {
        if (!useDefaultOutput) fs.rmSync(outputDir, { recursive: true, force: true });
    }
}

function runPlanAt(outputDir, args = []) {
    const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [
        generator,
        '--dry-run',
        '--output-dir',
        outputDir,
        ...args
    ], { cwd: repoRoot, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
}

test('content audio catalog covers Chinese, pinyin, poetry and phonics source counts', () => {
    const result = runDryRun(['--limit', '1']);
    assert.equal(result.sourceCounts.hanziCharacters, 1500);
    assert.equal(result.sourceCounts.hanziWords, 2672);
    assert.equal(result.sourceCounts.pinyin, 63);
    assert.equal(result.sourceCounts.poems, 34);
    assert.equal(result.sourceCounts.poemLines, 139);
    assert.ok(result.sourceCounts.phonicsWords >= 90);
    assert.ok(result.sourceCounts.phonicsLetters >= 26);
    assert.ok(result.total > 4400);
});

test('content audio generator supports category selection and dry-run has no side effects', () => {
    const result = runDryRun(['--category', 'hanzi', '--limit', '2']);
    assert.equal(result.selected, 2);
    assert.equal(result.toGenerate, 2);
    assert.deepEqual(result.items.map((item) => item.text), ['的', '他的']);
    assert.ok(result.items.every((item) => item.kind === 'hanzi'));
    assert.ok(result.items.every((item) => item.target.includes('/hanzi/')));
});

test('content audio generator skips valid files and marks overwrite explicitly', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-content-audio-existing-'));
    try {
        const first = runPlanAt(outputDir, ['--category', 'pinyin', '--limit', '1']);
        const target = first.items[0].target;
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, Buffer.alloc(200));
        const skipped = runPlanAt(outputDir, ['--category', 'pinyin', '--limit', '1']);
        assert.equal(skipped.skippedExisting, 1);
        assert.equal(skipped.toGenerate, 0);
        assert.equal(skipped.items[0].status, 'skip-existing');
        const overwritten = runPlanAt(outputDir, ['--category', 'pinyin', '--limit', '1', '--overwrite']);
        assert.equal(overwritten.items[0].status, 'overwrite');
        assert.equal(overwritten.toGenerate, 1);
    } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
    }
});

test('content audio generator accepts bounded Edge worker settings', () => {
    const result = runDryRun(['--category', 'pinyin', '--limit', '1', '--workers', '2']);
    assert.equal(result.selected, 1);
    assert.equal(result.toGenerate, 1);
});

test('Edge batches expose bounded timeout, retry, and temporary-file cleanup controls', () => {
    const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [
        generator,
        '--help'
    ], { cwd: repoRoot, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /--edge-timeout/);
    assert.match(result.stdout, /--edge-retries/);
    assert.match(result.stdout, /--edge-retry-delay/);
});

test('runtime and generator use the same deterministic local audio key', () => {
    const result = runDryRun(['--category', 'hanzi', '--text', '山'], true);
    const item = result.items.find((entry) => entry.text === '山');
    assert.ok(item);
    const local = speech.getLocalAudioSource({ text: '山', kind: 'hanzi', lang: 'zh-CN' });
    assert.ok(local);
    assert.ok(local.endsWith(item.target.replace(/^prj/, '..')));
});

test('poetry and phoneme speech resolve to their own local audio kinds', () => {
    const poemText = '春晓，春眠不觉晓，处处闻啼鸟，夜来风雨声，花落知多少';
    assert.match(speech.getLocalAudioSource({ text: poemText, kind: 'poetry', lang: 'zh-CN' }), /audio\/tts\/poetry\//);
    assert.match(speech.getLocalAudioSource({ text: 'buh', kind: 'phoneme', lang: 'en-US' }), /audio\/tts\/phoneme\//);
});

test('poetry today view exposes line and full-poem speech actions', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    assert.match(app, /data-action="poetry-speak"/);
    assert.match(app, /data-speech-kind="poetry"/);
});

test('shared TTS server and client expose a language-aware request contract', () => {
    const server = fs.readFileSync(path.join(repoRoot, 'tools', 'tts-portable', 'tts_server.py'), 'utf8');
    const config = fs.readFileSync(path.join(repoRoot, 'tools', 'tts-portable', 'config.py'), 'utf8');
    const client = fs.readFileSync(path.join(repoRoot, 'tools', 'tts-portable', 'client', 'voice.js'), 'utf8');
    assert.match(server, /lang: Literal\["zh-CN", "en-US"\]/);
    assert.match(server, /_edge_preset\(voice_key, lang\)/);
    assert.match(config, /"en-US": \{"voice": "en-US-/);
    assert.match(client, /lang: opts\.lang \|\| 'zh-CN'/);
    assert.match(client, /allowSingle/);
});
