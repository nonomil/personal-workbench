import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pagePath = path.join(root, 'visual-tests', '智慧花园配色对比测试.html');

test('defines an isolated side-by-side wisdom garden palette comparison page', () => {
  assert.equal(fs.existsSync(pagePath), true);
  const html = fs.readFileSync(pagePath, 'utf8');
  assert.match(html, /data-palette-comparison/);
  assert.match(html, /const previewModes = \[/);
  assert.match(html, /\{ id: 'current'/);
  assert.match(html, /\{ id: 'liquid'/);
  assert.match(html, /data-preview="\$\{mode\.id\}"/);
  assert.match(html, /data-viewport="desktop"/);
  assert.match(html, /data-viewport="mobile"/);
  assert.match(html, /data-action="toggle-task"/);
  assert.match(html, /data-action="claim-demo-reward"/);
  for (const contract of ['seed-tray', 'sun-counter', 'game-lawn', 'lawn-lane', 'wood-sign']) {
    assert.match(html, new RegExp(`class="[^"]*${contract}`), contract);
  }
  for (const action of ['select-seed', 'collect-sun', 'plant-square', 'toggle-shovel', 'game-nav']) {
    assert.match(html, new RegExp(`data-action="${action}"`), action);
  }
  assert.match(html, /四条草坪战线/);
  assert.match(html, /pvz-zombie-(basic|conehead|buckethead)/);
  for (const color of ['#FF8C42', '#4ECDC4', '#FFD93D', '#6BCB77', '#FFF8F0', '#FFF0E0', '#2D2D3A']) {
    assert.match(html, new RegExp(color, 'i'), color);
  }
  assert.match(html, /@media\s*\(max-width:\s*900px\)/);
  assert.match(html, /@media\s*\(max-width:\s*560px\)/);
  assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(html, /const ASSET_BASE = ['"]\.\.\/assets\/generated\/preschool-pvz-2d\/published\//);
  assert.match(html, /pvz-(sun-token|sunflower|peashooter)/);
  assert.match(html, /background\/published\/pvz-garden-lawn-bg\.webp/);
  assert.doesNotMatch(html, /localStorage/);
});
