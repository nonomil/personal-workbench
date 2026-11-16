import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
const css40 = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool', '40-literacy-uplift.css'), 'utf8');

function sourceBetween(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.ok(start >= 0, `missing source boundary: ${startText}`);
  const end = source.indexOf(endText, start + startText.length);
  assert.ok(end > start, `missing source boundary: ${endText}`);
  return source.slice(start, end);
}

test('W1 legal syllable table vendored with 400+ entries incl. v-family', () => {
  assert.match(app, /PINYIN_LEGAL_SYLLABLES/);
  const table = sourceBetween(app, 'const PINYIN_LEGAL_SYLLABLES =', ').split(');
  const words = table.match(/'[^']*'/)[0].slice(1).trim().split(/\s+/);
  assert.ok(words.length >= 400, 'legal syllables too few: ' + words.length);
  for (const probe of ['ba', 'nv', 'lv', 'ju', 'zhi', 'ying']) {
    assert.ok(words.includes(probe), 'missing legal syllable ' + probe);
  }
  assert.ok(!words.includes('be'), 'be must stay illegal');
  assert.ok(!words.includes('jv'), 'jv must be spelled ju');
});

test('W2 resolver maps initial+final to a legal written syllable', () => {
  assert.match(app, /function pinyinSyllableFor\(/);
  assert.match(app, /function pinyinLegalFinals\(/);
});

test('W3 initial cards carry the legal final list for the wheel', () => {
  const pinyinBranch = sourceBetween(app, "if (course.id === 'preschool-pinyin') {", 'function preschoolDateSalt');
  assert.match(pinyinBranch, /pinyinLegalFinals\(/);
  assert.match(pinyinBranch, /wheelFinals/);
});

test('W4 wheel ui renders final chips, reset chip and swaps the active syllable', () => {
  assert.match(app, /preschool-pinyin-wheel/);
  assert.match(app, /data-action="pinyin-wheel-pick"/);
  assert.match(app, /ui\.pinyinWheel/);
  const handler = sourceBetween(app, "if (action === 'pinyin-wheel-pick')", "if (action === 'pinyin-speak-tone')");
  assert.match(handler, /ui\.pinyinWheel/);
  assert.match(handler, /render\(\)/);
  assert.match(css40, /\.preschool-pinyin-wheel/);
});
