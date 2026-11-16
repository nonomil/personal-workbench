import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const memoryFile = path.join(repoRoot, 'prj', 'games', 'shared', 'workbench-memory.js');

function loadMemory() {
  assert.equal(fs.existsSync(memoryFile), true, 'shared memory module missing');
  const sandbox = { console, Date };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(memoryFile, 'utf8'), sandbox, { filename: memoryFile });
  assert.ok(sandbox.WorkbenchMemory, 'WorkbenchMemory missing');
  return sandbox.WorkbenchMemory;
}

test('shared memory records one canonical key with track and Leitner grade', () => {
  const memory = loadMemory();
  let state = memory.createMemory();

  state = memory.recordAnswer(state, { key: 'Apple', track: 'word' }, 'again', 0);
  assert.deepEqual(Object.keys(state.words), ['apple']);
  assert.equal(state.words.apple.track, 'word');
  assert.equal(state.words.apple.box, 1);
  assert.equal(state.words.apple.needsRelearn, false);
  assert.equal(state.words.apple.lastGrade, 'again');

  state = memory.recordAnswer(state, { key: 'apple', track: 'word' }, 'good', 86400000);
  assert.equal(Object.keys(state.words).length, 1);
  assert.equal(state.words.apple.box, 2);
  assert.equal(state.words.apple.attempts, 2);
  assert.equal(state.words.apple.wrong, 1);
  assert.equal(state.words.apple.correct, 1);
  assert.equal(state.words.apple.lastGrade, 'good');
  assert.ok(state.words.apple.dueAt > 86400000);
});

test('again becomes due before good and repeated again marks relearning', () => {
  const memory = loadMemory();
  let state = memory.createMemory();
  state = memory.recordAnswer(state, { key: '山', track: 'hanzi' }, 'good', 0);
  const goodDue = state.words['山'].dueAt;
  state = memory.recordAnswer(state, { key: '山', track: 'hanzi' }, 'again', goodDue);
  const againDue = state.words['山'].dueAt;
  assert.ok(againDue <= goodDue);
  state = memory.recordAnswer(state, { key: '山', track: 'hanzi' }, 'again', goodDue + 1);
  assert.equal(state.words['山'].needsRelearn, true);
  assert.deepEqual(Array.from(memory.dueWords(state, goodDue + 1)), ['山']);
});

test('pickCards prioritizes due and weak cards, then fills with unseen cards without duplicates', () => {
  const memory = loadMemory();
  let state = memory.createMemory();
  state = memory.recordAnswer(state, { key: 'fresh-a', track: 'word' }, 'good', 0);
  state = memory.recordAnswer(state, { key: 'weak', track: 'word' }, 'again', 0);
  const cards = [
    { id: 'fresh-a-card', key: 'fresh-a', track: 'word' },
    { id: 'new-card', key: 'new-word', track: 'word' },
    { id: 'weak-card', key: 'weak', track: 'word' },
    { id: 'other-card', key: 'other', track: 'hanzi' }
  ];
  const picked = memory.pickCards(cards, state, 1, { count: 3 });
  assert.deepEqual(picked.map(card => card.id), ['weak-card', 'new-card', 'other-card']);
  const used = new Set();
  const next = memory.pickCards(cards, state, 1, { count: 4, usedIds: ['weak-card'] });
  next.forEach(card => used.add(card.id));
  assert.equal(used.size, next.length);
  assert.equal(next.some(card => card.id === 'weak-card'), false);
});

test('weakWords returns a cross-game parent-facing ranking', () => {
  const memory = loadMemory();
  let state = memory.createMemory();
  state = memory.recordAnswer(state, { key: 'cat', track: 'word' }, 'again', 0);
  state = memory.recordAnswer(state, { key: '猫', track: 'hanzi' }, 'again', 0);
  state = memory.recordAnswer(state, { key: '猫', track: 'hanzi' }, 'again', 1);
  const rows = memory.weakWords(state, 10);
  assert.equal(rows[0].key, '猫');
  assert.equal(rows[0].track, 'hanzi');
  assert.ok(rows[0].score >= rows[1].score);
});
