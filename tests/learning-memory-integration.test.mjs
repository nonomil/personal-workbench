import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8');

test('shared learning overlay grades answers and persists to the memory bridge', () => {
  const overlay = read('prj/games/shared/learning-card-overlay.js');
  assert.match(overlay, /recordMemoryAnswer/);
  assert.match(overlay, /learning-answer-option--unknown/);
  assert.match(overlay, /recordLearningOutcome/);
  assert.match(overlay, /skipCard/);
  assert.match(overlay, /responseMs/);
  assert.match(overlay, /again/);
  assert.match(overlay, /easy/);
  assert.match(overlay, /pickCard/);
});

test('voxel and platform learning shells select cards from the shared queue', () => {
  const voxel = read('prj/games/voxel-craft/game.js');
  const platform = read('prj/games/platform-quest/game.js');
  assert.match(voxel, /pickCards/);
  assert.match(platform, /pickCards/);
});

test('knowledge garden returns to the shared queue and records graded answers', () => {
  const defense = read('prj/games/learning-defense/game.js');
  assert.match(defense, /pickCards/);
  assert.match(defense, /recordMemoryAnswer/);
  assert.match(defense, /responseMs/);
  assert.match(defense, /usedCardIds/);
});

test('all learning shells load the shared memory script before their controller', () => {
  [
    'prj/games/learning-defense/index.html',
    'prj/games/voxel-craft/index.html',
    'prj/games/platform-quest/index.html'
  ].forEach(relative => {
    const html = read(relative);
    const memoryIndex = html.indexOf('workbench-memory.js');
    const bridgeIndex = html.indexOf('workbench-bridge.js');
    assert.ok(memoryIndex >= 0, `${relative} missing shared memory script`);
    assert.ok(memoryIndex < bridgeIndex, `${relative} must load memory before bridge`);
  });
});
