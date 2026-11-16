import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
await import('../prj/preschool-english-vocab-data.js');
await import('../prj/preschool-english-data.js');
await import('../prj/preschool-english-vocab.js');
const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;

test('today sentences take two unique phrases from the three-word batch', () => {
  const batch = [
    { text: 'hello', zh: '你好', phrase: 'Hello, I am here.', phraseZh: '你好，我在这里。' },
    { text: 'apple', zh: '苹果', phrase: 'I like this apple.', phraseZh: '我喜欢这个苹果。' },
    { text: 'sun', zh: '太阳', phrase: 'The sun is big.', phraseZh: '太阳很大。' }
  ];
  const sentences = vocab.selectTodaySentences(batch, 2);
  assert.equal(sentences.length, 2);
  assert.equal(sentences[0].phrase, 'Hello, I am here.');
  assert.equal(sentences[1].phrase, 'I like this apple.');
  assert.equal(vocab.selectTodaySentences(batch).length, 2);
});

test('today sentences skip blank and duplicate phrases without changing the three-word quota', () => {
  const loop = vocab.getDailyLoopBank();
  assert.equal(globalThis.PersonalWorkbenchEnglishDailyData.size, 3);
  const sentences = vocab.selectTodaySentences([
    { text: 'boy', phrase: 'Good boy / good girl!', phraseZh: '好孩子！' },
    { text: 'girl', phrase: 'Good boy / good girl!', phraseZh: '好孩子！' },
    { text: 'apple', phrase: 'I like this apple.', phraseZh: '我喜欢这个苹果。' },
    { text: 'blank', phrase: '', phraseZh: '' }
  ], 2);
  assert.equal(sentences.length, 2);
  assert.equal(sentences[0].phrase, 'Good boy / good girl!');
  assert.equal(sentences[1].phrase, 'I like this apple.');
  const day = vocab.dailyWindow(loop, '2026-08-28', 3);
  assert.equal(day.batch.length, 3);
  const fromDay = vocab.selectTodaySentences(day.batch, 2);
  assert.ok(fromDay.length >= 1);
  fromDay.forEach(function (item) {
    assert.ok(item.phrase);
    assert.ok(item.phraseZh);
  });
});

test('english dashboard shows today 2 sentences and still keeps 今日 3 词', () => {
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool', '42-english-dashboard.css'), 'utf8');
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
  const config = fs.readFileSync(path.join(repoRoot, 'prj', 'config.js'), 'utf8');
  assert.match(app, /selectTodaySentences/);
  assert.match(app, /今日 2 句/);
  assert.match(app, /english-dashboard-sentence/);
  assert.match(app, /data-action="english-speak"/);
  assert.match(app, /今日 3 词/);
  assert.match(config, /size: 3/);
  assert.match(css, /english-dashboard-sentence/);
  assert.doesNotMatch(css, /:has\(/);
  assert.doesNotMatch(css, /color-mix\(/);
  assert.doesNotMatch(css, /(?<![a-z-])dvh/);
  assert.match(html, /42-english-dashboard\.css\?[^"']*today-sentences=v1/);
  assert.match(html, /app\.js\?[^"']*today-sentences=v1/);
  assert.match(html, /preschool-english-vocab\.js\?[^"']*today-sentences=v1/);
});
