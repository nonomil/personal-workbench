import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');
const app = fs.readFileSync(path.join(prjRoot, 'app.js'), 'utf8');
const css40 = fs.readFileSync(path.join(prjRoot, 'css', 'preschool', '40-literacy-uplift.css'), 'utf8');

function sourceBetween(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.ok(start >= 0, `missing source boundary: ${startText}`);
  const end = source.indexOf(endText, start + startText.length);
  assert.ok(end > start, `missing source boundary: ${endText}`);
  return source.slice(start, end);
}

test('T1 pinyinToneForms places tone marks by the standard vowel rules', () => {
  assert.match(app, /function pinyinToneForms\(/);
  const fn = sourceBetween(app, 'function pinyinToneForms(', 'function pinyinToneCharIndex');
  // a 优先；无 a 标 o/e；iu/ui 标在后一个字母上
  assert.match(fn, /'a'/);
  assert.match(fn, /'o'/);
  assert.match(fn, /'e'/);
  assert.match(fn, /iu|ui/);
  assert.match(fn, /pinyinToneMark\(/);
});

test('T2 tone strip covers all marked vowels for form generation', () => {
  const strip = sourceBetween(app, 'const PINYIN_TONE_STRIP', '};');
  for (const ch of ['ā', 'á', 'ǎ', 'à', 'ǖ', 'ǘ', 'ǚ', 'ǜ']) {
    assert.ok(strip.includes(ch), 'missing tone vowel ' + ch);
  }
});

test('T3 pinyin cards carry four-tone rows with example chars from the literacy bank', () => {
  const pinyinBranch = sourceBetween(app, "if (course.id === 'preschool-pinyin') {", 'function preschoolDateSalt');
  assert.match(pinyinBranch, /pinyinToneForms\(/);
  assert.match(pinyinBranch, /toneRows/);
  assert.match(app, /function pinyinToneCharIndex\(/);
  const index = sourceBetween(app, 'function pinyinToneCharIndex(', 'function renderPreschoolTodaySunGoal');
  assert.match(index, /getLiteracyEngine/);
  assert.match(index, /pinyin/);
  assert.match(app, /data-action="pinyin-speak-tone"/);
});

test('T4 card frame renders the tone strip and the handler speaks the example char', () => {
  assert.match(app, /preschool-pinyin-tones/);
  const handler = sourceBetween(app, "if (action === 'pinyin-speak-tone')", "if (action === 'literacy-bloom')");
  assert.match(handler, /dataset\.char/);
  assert.match(handler, /kind: 'pinyin'/);
  assert.match(handler, /kind: 'hanzi'/);
  assert.match(css40, /\.preschool-pinyin-tones/);
});
