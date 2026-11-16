import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
await import('../prj/games/shared/workbench-bridge.js');
const bridge = globalThis.WorkbenchGameBridge;

test('theme adventure titles keep garden names and map voxel level 2 to 铁锭学徒', () => {
  const ranks = bridge.ADVENTURE_RANKS;
  assert.equal(ranks.length, 7);
  assert.equal(ranks[1].title, '草坪学徒');
  assert.equal(ranks[1].need, 15);
  assert.equal(ranks[1].gardenStartSun, 10);
  assert.equal(ranks[6].need, 320);
  assert.equal(ranks[6].gardenStartSun, 60);
  assert.equal(bridge.themeAdventureTitle('garden-defense', 2), '草坪学徒');
  assert.equal(bridge.themeAdventureTitle('garden-defense', 7), '传说冒险家');
  assert.equal(bridge.themeAdventureTitle('voxel-adventure', 2), '铁锭学徒');
  assert.equal(bridge.themeAdventureTitle('voxel-adventure', 1), '木镐旅人');
  assert.equal(bridge.themeAdventureTitle('platform-quest', 2), '旗杆学徒');
  assert.equal(bridge.themeAdventureTitle('unknown-theme', 3), '阳光骑士');
  assert.equal(bridge.themeAdventureTitle('voxel-adventure', 0), ranks[0].title);
  const summary = bridge.getMetaSummary({
    growth: { worldGames: { meta: { adventurePoints: 15, playDates: [], playByDay: {}, badges: [] } } }
  });
  assert.equal(summary.adventureLevel, 2);
  assert.equal(summary.adventureTitle, '草坪学徒');
});

test('workbench shows themed rank titles and a fullscreen rank overlay without new storage keys', () => {
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool', '29-achievements.css'), 'utf8');
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
  const manifest = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool-workbench.css'), 'utf8');
  const bridgeSrc = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'shared', 'workbench-bridge.js'), 'utf8');
  assert.match(app, /themeAdventureTitle/);
  assert.match(app, /showAdventureRankCeremony/);
  assert.match(app, /preschool-rank-overlay/);
  assert.match(app, /data-rank-close/);
  assert.match(css, /preschool-rank-overlay/);
  assert.match(css, /inset:\s*0/);
  assert.doesNotMatch(css, /:has\(/);
  assert.doesNotMatch(css, /color-mix\(/);
  assert.doesNotMatch(css, /(?<![a-z-])dvh/);
  assert.match(manifest, /29-achievements\.css\?[^"']*rank-ceremony=v1/);
  assert.match(html, /app\.js\?[^"']*rank-ceremony=v1/);
  assert.match(html, /workbench-bridge\.js\?[^"']*rank-ceremony=v1/);
  assert.doesNotMatch(bridgeSrc, /localStorage\.setItem\(\s*['"][^'"]*rank/);
  assert.doesNotMatch(app, /localStorage\.setItem\(\s*['"][^'"]*rank/);
});
