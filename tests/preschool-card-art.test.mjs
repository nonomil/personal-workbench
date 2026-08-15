import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/preschool-card-art.js');
const art = globalThis.PersonalWorkbenchPreschoolCardArt;

test('card art returns offline svg for words, characters, pinyin and phonics', () => {
    const panda = art.render({ kind: 'english', text: 'panda', theme: '动物' });
    const blue = art.render({ kind: 'english', text: 'blue', theme: '颜色' });
    const mountain = art.render({ kind: 'literacy', char: '山', theme: 'nature' });
    const initial = art.render({ kind: 'pinyin', text: 'b', pinyinKind: 'initial', group: 'lips' });
    const sat = art.render({ kind: 'phonics', text: 'sat' });
    const math = art.render({ kind: 'math', main: '3 + 2', answer: 5 });
    for (const svg of [panda, blue, mountain, initial, sat, math]) {
        assert.match(svg, /<svg class="preschool-card-art"/);
        assert.doesNotMatch(svg, /twemoji|maxcdn|cdn\.jsdelivr/);
    }
    assert.match(blue, /circle/);
    assert.equal(art.resolveEmoji({ kind: 'english', text: 'panda' }), '🐼');
    assert.equal(art.resolveEmoji({ kind: 'literacy', char: '山', theme: 'nature' }), '⛰️');
});

test('workbench wires card art into flashcards and lesson cards', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(app, /function preschoolCardArt\(spec\)/);
    assert.match(app, /item\.art \|\| ''/);
    assert.match(app, /kind: 'english'/);
    assert.match(app, /kind: 'literacy'/);
    assert.match(app, /kind: 'pinyin'/);
    assert.match(app, /kind: 'phonics'/);
    assert.match(html, /preschool-card-art\.js\?v=20260815-english-auto-v1/);
});
