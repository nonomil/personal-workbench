import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const generator = path.join(repoRoot, 'tools', 'tts-portable', 'generate-preschool-vocab.py');

function runDryRun(args = []) {
    const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [generator, '--dry-run', ...args], {
        cwd: repoRoot,
        encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
}

test('portable vocabulary generator exposes the preschool English bank contract', () => {
    const result = runDryRun(['--limit', '3']);
    assert.equal(result.total, 597);
    assert.equal(result.selected, 3);
    assert.equal(result.skippedExisting, 3);
    assert.equal(result.toGenerate, 0);
    assert.deepEqual(result.items.map((item) => item.word), ['black', 'blue', 'green']);
});

test('portable vocabulary generator reports only missing audio without writing files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-portable-contract-'));
    try {
        fs.writeFileSync(path.join(tempDir, 'apple.mp3'), Buffer.alloc(200));
        const result = runDryRun([
            '--bank', path.join(repoRoot, 'prj', 'data', 'preschool', '英语', 'vocabulary-bank.json'),
            '--output-dir', tempDir,
            '--word', 'fly', '--word', 'apple'
        ]);
        assert.equal(result.total, 597);
        assert.equal(result.selected, 2);
        assert.equal(result.skippedExisting, 1);
        assert.equal(result.toGenerate, 1);
        assert.equal(path.basename(result.items.find((item) => item.word === 'fly').target), 'fly.mp3');
        assert.equal(result.items.find((item) => item.word === 'apple').status, 'skip-existing');
        assert.equal(fs.existsSync(path.join(tempDir, 'fly.mp3')), false);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('portable vocabulary generator rejects a hallucinated long short-word result', () => {
    const code = [
        'import importlib.util',
        `p = r"${generator.replaceAll('\\', '\\\\')}"`,
        's = importlib.util.spec_from_file_location("generator", p)',
        'm = importlib.util.module_from_spec(s)',
        's.loader.exec_module(m)',
        'assert m.is_duration_acceptable("do", 0.96) is True',
        'assert m.is_duration_acceptable("do", 8.8) is False'
    ].join('; ');
    const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', code], {
        cwd: repoRoot,
        encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
});
