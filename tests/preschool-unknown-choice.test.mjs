import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const memoryFile = path.join(repoRoot, 'prj', 'games', 'shared', 'workbench-memory.js');
const adaptationFile = path.join(repoRoot, 'prj', 'learning-adaptation.js');
const appFile = path.join(repoRoot, 'prj', 'app.js');

function loadModule(file, name) {
  const sandbox = { console, Date, Set, Map, Math, JSON, Object, Array, Number, String, Boolean, RegExp };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  assert.ok(sandbox[name], name + ' missing');
  return sandbox[name];
}

test('主动选择不会/跳过会进入 unknown，而不增加 wrong', () => {
  const memory = loadModule(memoryFile, 'WorkbenchMemory');
  assert.equal(typeof memory.recordOutcome, 'function');
  let state = memory.createMemory();
  state = memory.recordOutcome(state, { key: 'bā', contentId: 'pinyin:bā', track: 'pinyin' }, 'unknown', 0, { source: 'lesson' });
  const row = state.words['bā'];
  assert.equal(row.lastOutcome, 'unknown');
  assert.equal(row.unknownCount, 1);
  assert.equal(row.wrong, 0);
  assert.equal(row.correct, 0);
  assert.equal(row.needsReteach, true);
  assert.deepEqual(memory.weakWords(state, 10).map(item => item.key), ['bā']);
});

test('unknown 的四值分类不等同于错误或答对', () => {
  const adaptation = loadModule(adaptationFile, 'PersonalWorkbenchLearningAdaptation');
  const unknown = adaptation.classifyOutcome({ input: 'unknown' });
  assert.equal(unknown.outcome, 'unknown');
  assert.equal(unknown.grade, null);
  assert.equal(unknown.penalize, false);
  assert.equal(unknown.reward, false);
  assert.deepEqual(adaptation.classifyOutcome({ input: 'wrong' }).outcome, 'slip');
  assert.deepEqual(adaptation.classifyOutcome({ input: 'correct', firstAttempt: true, optionCount: 2 }).outcome, 'unsure');
});

test('选择题渲染包含统一的不会/跳过动作', () => {
  const source = fs.readFileSync(appFile, 'utf8');
  assert.match(source, /data-action="lesson-unknown"/);
  assert.match(source, /不会\s*\/\s*跳过/);
});
