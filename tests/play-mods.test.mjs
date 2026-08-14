import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
const bridgeSrc = fs.readFileSync(path.join(root, 'games', 'shared', 'workbench-bridge.js'), 'utf8');
const voxelSrc = fs.readFileSync(path.join(root, 'games', 'voxel-adventure', 'game.js'), 'utf8');

function loadPlayModsFromLiteracy() {
  const match = bridgeSrc.match(/function playModsFromLiteracy\([\s\S]*?\n    \}\n/);
  assert.ok(match, 'playModsFromLiteracy missing');
  const box = { playModsFromLiteracy: null };
  vm.runInNewContext(match[0] + '\nthis.playModsFromLiteracy = playModsFromLiteracy;', box);
  return box.playModsFromLiteracy;
}

test('literacy count picks easy / normal / hard play mods', () => {
  const playModsFromLiteracy = loadPlayModsFromLiteracy();
  const easy = playModsFromLiteracy(0);
  assert.equal(easy.mode, 'easy');
  assert.equal(easy.sunMult, 1);
  assert.equal(easy.enemySpeed < 1, true);
  assert.equal(easy.extraMob, false);

  const mid = playModsFromLiteracy(100);
  assert.equal(mid.mode, 'normal');
  assert.equal(mid.sunMult, 1.5);
  assert.equal(mid.enemySpeed > 1, true);

  const hard = playModsFromLiteracy(201);
  assert.equal(hard.mode, 'hard');
  assert.equal(hard.sunMult, 2);
  assert.equal(hard.extraMob, true);
  assert.equal(hard.chaseMs < mid.chaseMs, true);
});

test('voxel world consumes play mods for speed and sunlight', () => {
  assert.match(voxelSrc, /getPlayMods|refreshPlayMods/);
  assert.match(voxelSrc, /scaledSun/);
  assert.match(voxelSrc, /playMods\.enemySpeed/);
  assert.match(voxelSrc, /playMods\.chaseMs/);
  assert.doesNotMatch(voxelSrc, /gameTickets|游戏券/);
});
