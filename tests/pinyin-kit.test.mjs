import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const kit = path.join(repoRoot, 'pinyin-pronunciation-kit');

test('K1 kit data files load and expose the call tables', () => {
  const table = fs.readFileSync(path.join(kit, 'data', 'pinyin-call-table.js'), 'utf8');
  for (const word of ['波', '坡', '知', '啊', '凹', '儿', '翁']) {
    assert.ok(table.includes(`'${word}'`), 'missing call word ' + word);
  }
  assert.match(table, /PinyinCallTable/);
});

test('K2 legal syllables vendored with 403 entries and v-family rules', () => {
  const data = fs.readFileSync(path.join(kit, 'data', 'pinyin-legal-syllables.js'), 'utf8');
  const start = data.indexOf('[');
  const end = data.lastIndexOf(']') + 1;
  const list = JSON.parse(data.slice(start, end));
  assert.ok(list.length >= 400, 'syllables: ' + list.length);
  for (const probe of ['ba', 'nv', 'lv', 'ju', 'zhi', 'ying']) assert.ok(list.includes(probe), 'missing ' + probe);
  assert.ok(!list.includes('be') && !list.includes('jv'), 'illegal spellings must stay out');
});

test('K3 blend module resolves call text, blend parts and syllables', () => {
  const blend = fs.readFileSync(path.join(kit, 'blend.js'), 'utf8');
  assert.match(blend, /function callText\(/);
  assert.match(blend, /function blendParts\(/);
  assert.match(blend, /function syllableFor\(/);
  assert.match(blend, /u' \+ b\.slice\(1\)/);
});

test('K4 player falls back local → native → web and ships a manifest', () => {
  const player = fs.readFileSync(path.join(kit, 'pinyin-speech.js'), 'utf8');
  assert.match(player, /manifest\.json/);
  assert.match(player, /TextToSpeech/);
  assert.match(player, /speechSynthesis/);
  assert.match(player, /speakBlend/);
  const manifest = JSON.parse(fs.readFileSync(path.join(kit, 'audio', 'manifest.json'), 'utf8'));
  assert.ok(manifest.count >= 70, 'audio entries: ' + manifest.count);
  const sample = Object.values(manifest.map).slice(0, 3);
  for (const file of sample) assert.ok(fs.existsSync(path.join(kit, 'audio', file)), 'missing ' + file);
});

test('K5 baking script can regenerate audio via edge-tts', () => {
  const script = fs.readFileSync(path.join(kit, 'scripts', 'bake_call_audio.py'), 'utf8');
  assert.match(script, /edge-tts|edge_tts/);
  assert.match(script, /manifest\.json/);
});
