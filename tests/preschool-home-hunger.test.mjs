import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
await import('../prj/preschool-pet.js');
const pet = globalThis.PersonalWorkbenchPet;

test('home capsule shows a hunger meter and feeds without leaving home', () => {
  const hungry = pet.renderCapsule({
    sunlight: 20,
    pet: pet.normalize({ hunger: 10, stage: 1, lastUpdate: 1, speciesId: 'pvz-sunflower' })
  }, 'garden-defense', 1);
  assert.match(hungry, /role="progressbar"/);
  assert.match(hungry, /aria-valuenow="10"/);
  assert.match(hungry, /data-action="feed-pet"/);
  assert.match(hungry, /好饿/);
  assert.doesNotMatch(hungry, /data-page="growth"/);

  const full = pet.renderCapsule({
    sunlight: 20,
    pet: pet.normalize({ hunger: 80, stage: 1, lastUpdate: 1, speciesId: 'platform-star' })
  }, 'platform-quest', 1);
  assert.match(full, /饱饱的/);
  assert.match(full, /role="progressbar"/);
  assert.match(full, /data-action="feed-pet"/);
});

test('reward stage copy shows hunger label and a satiety bar', () => {
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const start = app.indexOf('function renderPreschoolRewardStage');
  const end = app.indexOf('\n    function ', start + 1);
  const stage = app.slice(start, end);
  assert.match(stage, /hungerLabel/);
  assert.match(stage, /preschool-reward-stage-hunger/);
  assert.match(stage, /role="progressbar"/);
  assert.match(stage, /aria-valuenow=/);
  assert.match(stage, /data-action="feed-pet"/);
});

test('home hunger presentation does not change feed cost or workshop food table', () => {
  assert.equal(pet.FEED_COST, 5);
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  assert.match(app, /\{ id: 'carrot', emoji: '🥕', name: '胡萝卜', cost: 5, hunger: 15 \}/);
  assert.match(app, /\{ id: 'apple', emoji: '🍎', name: '苹果', cost: 8, hunger: 25 \}/);
  assert.match(app, /\{ id: 'cake', emoji: '🎂', name: '蛋糕', cost: 15, hunger: 50 \}/);
});

test('preschool index stamps home-hunger without dropping reward-stage', () => {
  const index = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool-workbench.css'), 'utf8');
  assert.match(index, /app\.js\?[^"']*home-hunger=v1/);
  assert.match(index, /app\.js\?[^"']*reward-stage=v1/);
  assert.match(index, /preschool-pet\.js\?[^"']*home-hunger=v1/);
  assert.match(index, /preschool-workbench\.css\?[^"']*home-hunger=v1/);
  assert.match(css, /30-growth-world\.css\?[^"']*home-hunger=v1/);
  const growthCss = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool', '30-growth-world.css'), 'utf8');
  assert.match(growthCss, /\.preschool-home-hunger/);
  assert.match(growthCss, /\.preschool-reward-stage-hunger/);
});
