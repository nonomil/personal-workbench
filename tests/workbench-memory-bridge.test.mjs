import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const memoryFile = path.join(repoRoot, 'prj', 'games', 'shared', 'workbench-memory.js');
const bridgeFile = path.join(repoRoot, 'prj', 'games', 'shared', 'workbench-bridge.js');

function loadBridge(initialState) {
  let stateStored = JSON.stringify(initialState);
  let memoryStored = '';
  const localStorage = {
    getItem(key) {
      return key === 'workbench:memory:v1' ? memoryStored : stateStored;
    },
    setItem(key, value) {
      if (key === 'workbench:memory:v1') memoryStored = String(value);
      else stateStored = String(value);
    }
  };
  const sandbox = { console, localStorage, location: { search: '' }, URLSearchParams, Date };
  sandbox.globalThis = sandbox;
  sandbox.LiteracyQuizBank = null;
  vm.runInNewContext(fs.readFileSync(memoryFile, 'utf8'), sandbox, { filename: memoryFile });
  vm.runInNewContext(fs.readFileSync(bridgeFile, 'utf8'), sandbox, { filename: bridgeFile });
  return {
    bridge: sandbox.WorkbenchGameBridge,
    state: () => JSON.parse(stateStored),
    memory: () => memoryStored ? JSON.parse(memoryStored) : null,
    setQuizBank(bank) { sandbox.LiteracyQuizBank = bank; }
  };
}

const QUIZ_BANK = [
  { char: '话', pinyin: 'huà', options: ['huà', 'hé', 'huì'] },
  { char: '山', pinyin: 'shān', options: ['shān', 'shuǐ', 'huā'] },
  { char: '水', pinyin: 'shuǐ', options: ['shuǐ', 'shān', 'huì'] }
];

test('quiz gate: unseen chars are teach-only, never tested (readiness gate)', () => {
  const loaded = loadBridge({ growth: { sunlight: 100, worldGames: { meta: {} } }, courseProgress: {} });
  loaded.setQuizBank(QUIZ_BANK);
  const quiz = loaded.bridge.drawLiteracyQuiz({ count: 3 });
  assert.equal(quiz.length, 3);
  quiz.forEach((item) => {
    assert.equal(item.teachOnly, true, '全未学时不得出三选一题');
    assert.equal(item.options.length, 0);
  });
});

test('quiz gate: seen chars get three options whose distractors prefer seen chars', () => {
  const loaded = loadBridge({ growth: { sunlight: 100, worldGames: { meta: {} } }, courseProgress: {} });
  loaded.setQuizBank(QUIZ_BANK);
  // 卡墙已会"话"；知识门答会"山"（memory 回流）
  loaded.bridge.recordLearningOutcome({ key: '话', track: 'literacy' }, 'correct', { at: Date.now() - 1000 });
  loaded.bridge.recordLearningOutcome({ key: '山', track: 'literacy' }, 'correct', { at: Date.now() - 500 });
  const quiz = loaded.bridge.drawLiteracyQuiz({ count: 2 });
  quiz.forEach((item) => {
    assert.equal(item.teachOnly, false);
    assert.equal(item.options.length, 3);
    assert.ok(item.options.includes(item.pinyin), '正确项必须在选项中');
  });
  // 干扰项至少包含一个"已见字"的读音（排除法假信号防御）
  const seenPinyins = ['huà', 'shān'];
  assert.ok(quiz.every((item) =>
    item.options.some((o) => o !== item.pinyin && seenPinyins.includes(o))
  ), '干扰项应优先取已见字读音');
});

test('quiz gate: unknown learners stay in practice tier so they reappear first', () => {
  const loaded = loadBridge({ growth: { sunlight: 100, worldGames: { meta: {} } }, courseProgress: {} });
  loaded.setQuizBank(QUIZ_BANK);
  // 知识门点"不会/跳过" → memory lastOutcome unknown → 练习中（tier0），下一题优先复现
  loaded.bridge.recordLearningOutcome({ key: '话', track: 'literacy' }, 'unknown', { at: Date.now() - 1000 });
  const quiz = loaded.bridge.drawLiteracyQuiz({ count: 1 });
  assert.equal(quiz[0].char, '话');
  assert.equal(quiz[0].teachOnly, false);
});

test('play pass redeem requires learning evidence today (learn-first gate)', () => {
  const loaded = loadBridge({ growth: { sunlight: 100, worldGames: { meta: {} } }, courseProgress: {} });
  const gated = loaded.bridge.grantPlayPass('garden-defense', { source: 'redeem' });
  assert.equal(gated.ok, false);
  assert.equal(gated.reason, 'learn-first');
  // 今日完成一次学习（memory 回流）后 redeem 放行并扣阳光
  loaded.bridge.recordLearningOutcome({ key: '话', track: 'literacy' }, 'correct', { at: Date.now() });
  const granted = loaded.bridge.grantPlayPass('garden-defense', { source: 'redeem' });
  assert.equal(granted.ok, true);
  assert.ok(loaded.state().growth.sunlight < 100, 'redeem 应扣减阳光');
});

test('memory bridge writes a separate cross-game ledger and preserves old progress', () => {
  const loaded = loadBridge({
    dailyPlans: [{ id: 'keep', done: false }],
    growth: { sunlight: 42, worldGames: { meta: {} } },
    courseProgress: {}
  });
  assert.equal(typeof loaded.bridge.getMemory, 'function');
  assert.equal(typeof loaded.bridge.saveMemory, 'function');
  assert.equal(typeof loaded.bridge.recordMemoryAnswer, 'function');

  const first = loaded.bridge.recordMemoryAnswer(
    { key: 'Apple', track: 'word' },
    'again',
    { at: 0, source: 'voxel-learning', responseMs: 3200 }
  );
  const second = loaded.bridge.recordMemoryAnswer(
    { key: 'apple', track: 'word' },
    'good',
    { at: 86400000, source: 'platform-learning', responseMs: 900 }
  );

  assert.equal(first.key, 'apple');
  assert.equal(second.attempts, 2);
  assert.equal(Object.keys(loaded.bridge.getMemory().words).length, 1);
  assert.equal(loaded.bridge.getMemory().words.apple.lastSource, 'platform-learning');
  assert.equal(loaded.bridge.getMemory().words.apple.lastResponseMs, 900);
  assert.equal(loaded.state().growth.sunlight, 42);
  assert.equal(loaded.state().dailyPlans[0].id, 'keep');
  assert.equal(loaded.memory().words.apple.track, 'word');
});

test('memory bridge gracefully starts empty when storage is malformed', () => {
  const loaded = loadBridge({ growth: { worldGames: { meta: {} } } });
  loaded.bridge.saveMemory({ words: { 山: { box: 2, track: 'hanzi' } } });
  assert.equal(loaded.bridge.getMemory().words['山'].box, 2);
});

test('unified learning outcome records unknown without touching course progress or sunlight', () => {
  const loaded = loadBridge({ growth: { sunlight: 42, worldGames: { meta: {} } }, courseProgress: {} });
  const row = loaded.bridge.recordLearningOutcome(
    { key: 'bā', contentId: 'pinyin:bā', track: 'pinyin' },
    'unknown',
    { at: 0, source: 'bank-quiz' }
  );
  assert.equal(row.lastOutcome, 'unknown');
  assert.equal(row.unknownCount, 1);
  assert.equal(row.wrong, 0);
  assert.equal(row.correct, 0);
  assert.equal(row.needsReteach, true);
  assert.equal(loaded.state().growth.sunlight, 42);
  assert.deepEqual(loaded.state().courseProgress, {});
});
