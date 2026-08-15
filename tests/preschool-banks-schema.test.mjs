import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateBanks } from '../scripts/validate-banks.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/preschool-card-art.js');
const cardArt = globalThis.PersonalWorkbenchPreschoolCardArt;

test('banks-index and schema v1 pass validate-banks', () => {
    const result = validateBanks();
    assert.equal(result.ok, true, (result.errors || []).slice(0, 8).join('\n'));
    const byId = Object.fromEntries((result.summary || []).map((row) => [row.id, row]));
    assert.equal(byId.english.count, 597);
    assert.equal(byId.literacy.count, 1500);
    assert.equal(byId.pinyin.count, 63);
    assert.equal(byId['phonics-words'].count, 94);
    assert.equal(byId['phonics-letters'].count, 26);
});

test('card art honors emoji:X and none directives', () => {
    assert.equal(cardArt.render({ art: 'none', kind: 'english', text: 'about' }), '');
    const apple = cardArt.render({ art: 'emoji:🍎', kind: 'english', text: 'about' });
    assert.match(apple, /🍎/);
    assert.doesNotMatch(apple, /⭐/);
});

test('app.js exposes resolvePreschoolCardMedia and English auto-sequence copy', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    assert.match(app, /function resolvePreschoolCardMedia\(/);
    assert.match(app, /media\.image/);
    assert.match(app, /art !== 'none'/);
    assert.match(app, /hideEnglishPracticeLevels/);
    assert.doesNotMatch(app, /看图词/);
    assert.match(app, /今天学：/);
    assert.match(app, /英语按主题顺序自动往下学/);
});
