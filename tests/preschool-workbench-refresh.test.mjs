import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

globalThis.PersonalWorkbenchConfig = {
  variant: 'preschool',
  current: { storageKey: 'petbank_huchuliang_preschool_workbench_state_v1' }
};
globalThis.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {}
};

await import('../preschool-garden.js?refresh=20260731');
await import('../child-growth.js?refresh=20260731');
await import('../storage.js?refresh=20260731');

const storage = globalThis.PersonalWorkbenchStorage;
const root = fileURLToPath(new URL('..', import.meta.url));

test('seeds six preschool workbench quests across learning and life lanes', () => {
  const state = storage.createSeedState();
  assert.equal(state.preschoolDayPlanVersion, 2);
  assert.equal(state.dailyPlans.length, 6);
  assert.deepEqual(state.dailyPlans.map(item => item.title), ['听故事', '数一数', '说 Hello', '画一画', '动一动', '整理玩具']);
  assert.equal(state.tasks.length, 6);
});

test('migrates an old three-quest preschool snapshot once without changing completed state', () => {
  const today = storage.localDate();
  const old = storage.normalizeState({
    schemaVersion: 5,
    profileId: 'local-default',
    revision: 4,
    tasks: [
      { id: 'preschool-task-story', title: '听故事', category: '语文', status: 'done', progress: 100 },
      { id: 'preschool-task-count', title: '数一数', category: '数学', status: 'todo', progress: 0 },
      { id: 'preschool-task-hello', title: '说 Hello', category: '英语', status: 'todo', progress: 0 }
    ],
    dailyPlans: [
      { id: 'preschool-plan-story', date: today, title: '听故事', category: '语文', done: true, order: 1 },
      { id: 'preschool-plan-count', date: today, title: '数一数', category: '数学', done: false, order: 2 },
      { id: 'preschool-plan-hello', date: today, title: '说 Hello', category: '英语', done: false, order: 3 }
    ],
    growth: { sunlight: 40, totalSunlightEarned: 40 }
  });
  const again = storage.normalizeState(old);
  assert.equal(old.preschoolDayPlanVersion, 2);
  assert.equal(old.dailyPlans.length, 6);
  assert.equal(old.dailyPlans.find(item => item.title === '听故事').done, true);
  assert.equal(again.dailyPlans.length, 6);
  assert.deepEqual(again.dailyPlans.map(item => item.id), old.dailyPlans.map(item => item.id));
});

test('keeps the refreshed reward tiers and three-lane defense contract in the preschool UI', () => {
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const preschoolIndex = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const tiers = Array.from(config.matchAll(/tier: '([^']+)'/g), match => match[1]);
  assert.equal(new Set(tiers).size, 4);
  assert.match(config, /tier: '小奖励'/);
  assert.match(config, /tier: '特别奖励'/);
  assert.match(app, /preschool-reward-tier/);
  assert.match(app, /preschool-reward-tier-grid/);
  assert.match(app, /pixel-battle-lanes/);
  assert.match(app, /pixel-battle-lane-row/);
  assert.match(app, /pixel-map-landmarks/);
  assert.match(app, /task-book-icon/);
  assert.match(app, /player-energy-bars/);
  assert.match(app, /growth\.collection/);
  assert.equal((app.match(/pixel-battle-path-cell/g) || []).length >= 1, true);
  assert.match(app, /preschool-pea-fired/);
  assert.match(app, /renderPixelStats/);
  assert.match(app, /pixel-stat-card/);
  assert.match(app, /renderPixelMap\(growth, plans, true\)/);
  assert.match(app, /function renderPreschoolBattle\(\)/);
  assert.match(app, /pixel-battle-layout/);
  assert.match(app, /pixel-rulebook/);
  assert.match(app, /pixel-battle-plant-grid/);
  assert.match(app, /if \(ui\.page === 'battle'\) return renderPreschoolBattle\(\)/);
  const statsPosition = app.indexOf('${renderPixelStats(growth, defense)}');
  const worldPosition = app.indexOf('<div class="pixel-world-grid">', statsPosition);
  const questsPosition = app.indexOf('<section class="pixel-quest-board">', worldPosition);
  assert.equal(statsPosition >= 0 && worldPosition > statsPosition && questsPosition > worldPosition, true);
  assert.match(styles, /pixel-battle-lane-row/);
  assert.match(styles, /pixel-pea-projectile/);
  assert.match(styles, /--pixel-route:\s*#5420b8/);
  assert.match(styles, /pixel-page-enter/);
  assert.match(styles, /pixel-map-panel\.is-compact/);
  assert.match(styles, /pixel-map-landmarks/);
  assert.match(app, /grass-platform\.png/);
  assert.match(styles, /pixel-quest-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2/);
  assert.match(styles, /pixel-world-grid\s*\{\s*grid-template-areas:\s*"map side" "quest side"/);
  assert.match(styles, /pixel-map-panel\s*\{\s*grid-area:\s*map/);
  assert.match(styles, /pixel-quest-board\s*\{\s*grid-area:\s*quest/);
  assert.match(styles, /pixel-side-stack\s*\{\s*grid-area:\s*side/);
  assert.match(styles, /@media \(max-width: 860px\)[\s\S]*?grid-template-areas:\s*"map" "quest" "side"/);
  assert.match(preschoolIndex, /castle-gate\.png/);
  for (const asset of ['nav-sun.png', 'castle-gate.png', 'nav-sprout.png', 'nav-flowers.png', 'nav-storybook.png', 'nav-chest.png', 'nav-family.png', 'settings-gear.png']) {
    assert.match(preschoolIndex, new RegExp(asset.replace('.', '\\.') ));
    assert.equal(fs.existsSync(path.join(root, 'assets', 'generated', 'preschool-pixel', 'reference', 'gpt-output-20260730', 'published-gpt-v2', asset)), true, asset);
  }
});

test('keeps preschool check-in cards visual and reward-led', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.match(app, /preschool-checkin-grid/);
  assert.match(app, /preschool-checkin-card/);
  assert.match(app, /preschool-checkin-reward/);
  assert.match(app, /preschool-reward-progress/);
  assert.match(app, /preschool-reward-next/);
  assert.match(app, /sun-progress-bar/);
  assert.match(styles, /preschool-checkin-grid/);
  assert.match(styles, /preschool-checkin-card/);
  assert.match(styles, /preschool-checkin-card-check \{[^}]*top:\s*9px/);
  assert.match(styles, /preschool-checkin-card-top \{[^}]*padding-right:\s*31px/);
  assert.match(styles, /preschool-reward-progress/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*preschool-checkin-grid/);
});

test('keeps preschool plant companions and defense HUD on the generated pixel asset path', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  assert.match(app, /function preschoolPlantAsset\(plant\)/);
  assert.match(app, /'plant-sun-sprout': 'seedling-node'/);
  assert.match(app, /'plant-moon-mint': 'flower-checkpoint'/);
  assert.match(app, /'plant-star-flower': 'flower-pot'/);
  assert.match(app, /'plant-rainbow-tree': 'growth-tree'/);
  assert.match(app, /preschoolAsset\(preschoolPlantAsset\(activePlant\), activePlant\.title\)/);
  assert.match(app, /const plantAsset = preschoolPlantAsset\(activePlant\)/);
  assert.match(app, /pixel-hud-defense-art/);
  assert.match(app, /asset: 'player-energy-bars'/);
  assert.match(config, /selected\.id === 'preschool' \? 'v0\.2\.0 · 幼儿版'/);
  assert.doesNotMatch(config, /v0\.3 · 幼儿版/);
  assert.match(styles, /pixel-hud-defense-art/);
  assert.match(styles, /image-rendering: pixelated/);
  for (const asset of ['seedling-node.png', 'flower-checkpoint.png', 'flower-pot.png', 'growth-tree.png', 'player-energy-bars.png']) {
    assert.equal(fs.existsSync(path.join(root, 'assets', 'generated', 'preschool-pixel', 'reference', 'gpt-output-20260730', 'published-gpt-v2', asset)), true, asset);
  }
});
