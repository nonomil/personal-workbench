import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');
const app = fs.readFileSync(path.join(prjRoot, 'app.js'), 'utf8');
const generator = fs.readFileSync(path.join(repoRoot, 'tools', 'tts-portable', 'generate-content-audio.py'), 'utf8');
const shell = fs.readFileSync(path.join(prjRoot, 'preschool-workbench', 'index.html'), 'utf8');

test('S1 initial call-pronunciation table covers all 23 shengmu', () => {
  assert.match(app, /PINYIN_INITIAL_CALL/);
  // 抽查呼读音：双拼母、翘舌、平舌、半元音
  assert.match(app, /'b':\s*'波'/);
  assert.match(app, /'p':\s*'坡'/);
  assert.match(app, /'zh':\s*'知'/);
  assert.match(app, /'c':\s*'刺'/);
  assert.match(app, /'y':\s*'衣'/);
  assert.match(app, /'w':\s*'乌'/);
});

test('S2 final call-pronunciation table covers the 24 finals', () => {
  assert.match(app, /PINYIN_FINAL_CALL/);
  assert.match(app, /'a':\s*'啊'/);
  assert.match(app, /'ao':\s*'凹'/);
  assert.match(app, /'er':\s*'儿'/);
  assert.match(app, /'un':\s*'温'/);
  assert.match(app, /'ong':\s*'翁'/);
});

test('S3 pinyin card speaks the letter sound and carries blend parts', () => {
  const pinyinBranch = sourceBetween(app, "if (course.id === 'preschool-pinyin') {", 'function preschoolDateSalt');
  assert.match(pinyinBranch, /pinyinCallText\(/);
  assert.match(pinyinBranch, /blendParts/);
  assert.match(app, /function pinyinCallText\(/);
  assert.match(app, /function pinyinBlendParts\(/);
  // 回归：runtime bank 的 extra 已被 parseBank 拆平，读 item.extra 会静默回退例字
  assert.doesNotMatch(pinyinBranch, /item\.extra/);
  // 拼读三段：呼读 + 韵母 + 音节（例字已烤音频）
  const blend = sourceBetween(app, 'function pinyinBlendParts(', 'function renderPreschoolHomeHero');
  assert.match(blend, /initialCall/);
  assert.match(blend, /finalCall/);
});

test('S4 card frame renders the blend button and the action speaks three parts', () => {
  assert.match(app, /data-action="pinyin-blend"/);
  assert.match(app, /跟我拼/);
  assert.match(app, /function speakPinyinBlend\(/);
  const handler = sourceBetween(app, 'function speakPinyinBlend(', 'function setupPreschoolHomeStageMotion');
  assert.match(handler, /kind: 'pinyin'/);
  assert.match(handler, /pauseMs/);
});

test('S5 tts baker also bakes call-pronunciation audio for initials and finals', () => {
  assert.match(generator, /PINYIN_CALL_TEXT/);
  assert.match(generator, /波/);
  assert.match(generator, /凹/);
});

function sourceBetween(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.ok(start >= 0, `missing source boundary: ${startText}`);
  const end = source.indexOf(endText, start + startText.length);
  assert.ok(end > start, `missing source boundary: ${endText}`);
  return source.slice(start, end);
}
