import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const root = path.join(repoRoot, 'prj');

function loadBridge() {
  const store = {};
  const box = {
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setItem(key, value) { store[key] = String(value); },
      removeItem(key) { delete store[key]; }
    },
    console: { warn() {}, log() {} }
  };
  box.window = box;
  box.globalThis = box;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'games', 'shared', 'workbench-bridge.js'), 'utf8'), box);
  return box.WorkbenchGameBridge;
}

test('full day ledger: first learn lights the day, grants a play segment, stamp only after a real run', () => {
  const bridge = loadBridge();
  const date = '2026-08-16';

  assert.equal(bridge.getPlayPass('garden-defense', date).remaining, 2);
  const learned = bridge.grantPlayPass('garden-defense', { source: 'learn', date });
  assert.equal(learned.ok, true);
  assert.equal(learned.pass.remaining, 3);

  const before = bridge.readState();
  const beforeDay = ((before.growth.worldGames || {}).meta || {}).playByDay || {};
  assert.equal(Boolean(beforeDay[date] && beforeDay[date]['garden-defense']), false, 'opening a map must not count as played');

  const run = bridge.consumePlayPass('garden-defense', { date });
  assert.equal(run.ok, true);
  const after = bridge.readState();
  const afterDay = ((after.growth.worldGames || {}).meta || {}).playByDay || {};
  assert.equal(Boolean(afterDay[date] && afterDay[date]['garden-defense']), true, 'starting a run should stamp today');
});

test('learn celebration and home hero close the learn-to-play loop', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /function buildLearnLoopReward\(/);
  assert.match(app, /今日点亮/);
  assert.match(app, /还可以再守|去守一关/);
  assert.match(app, /function showPreschoolCelebration[\s\S]*open-world-game/);
  assert.match(app, /function renderPreschoolHomeHero[\s\S]*preschool-home-hero-reward/);
  assert.match(app, /pendingCelebration[\s\S]*playPassGranted/);

  const gardenJs = fs.readFileSync(path.join(root, 'games', 'garden-defense', 'game.js'), 'utf8');
  const boot = gardenJs.slice(gardenJs.indexOf('function boot('), gardenJs.indexOf('function boot(') + 900);
  assert.doesNotMatch(boot, /recordPlaySession/, 'garden boot must not stamp a play day');

  const platformJs = fs.readFileSync(path.join(root, 'games', 'platform-quest', 'game.js'), 'utf8');
  const platformTail = platformJs.slice(platformJs.lastIndexOf('loadProgress()'));
  assert.doesNotMatch(platformTail, /recordPlaySession\(GAME_ID\)/);

  const voxelJs = fs.readFileSync(path.join(root, 'games', 'voxel-craft', 'game.js'), 'utf8');
  assert.match(voxelJs, /consumePlayPass/);
  const voxelBoot = voxelJs.slice(voxelJs.lastIndexOf('if (bridge.recordPlaySession)'));
  assert.doesNotMatch(voxelJs.slice(voxelJs.lastIndexOf('function bind(')), /if \(bridge.recordPlaySession\) bridge.recordPlaySession\(GAME_ID\)/);
});
