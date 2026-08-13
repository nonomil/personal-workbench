import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
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
  assert.match(html, /class="seed-tray"/);
  assert.match(html, /class="sun-counter"/);
  assert.match(html, /class="game-lawn"/);
  assert.match(html, /class="lawn-lane"/);
  assert.match(html, /class="wood-sign"/);
  assert.match(html, /data-action="select-seed"/);
  assert.match(html, /data-action="collect-sun"/);
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
