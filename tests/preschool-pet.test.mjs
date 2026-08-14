import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
await import('../prj/preschool-pet.js');
const pet = globalThis.PersonalWorkbenchPet;

test('defaults to egg stage with hunger and no extra storage key', () => {
  const state = pet.normalize({});
  assert.equal(state.stage, 0);
  assert.equal(state.hunger, 80);
  assert.equal(state.feedCount, 0);
  assert.ok(state.lastUpdate);
});

test('hunger decays by two points per hour', () => {
  const now = 1_000_000;
  const next = pet.sync({ hunger: 80, lastUpdate: now - 3 * 3600 * 1000, stage: 0, exp: 0 }, now);
  assert.equal(next.hunger, 74);
  assert.equal(next.lastUpdate, now);
});

test('feeding spends five sunlight, raises hunger and exp, then evolves', () => {
  const growth = { sunlight: 20, pet: { hunger: 40, lastUpdate: 1, stage: 0, exp: 45, feedCount: 0, maxExp: 50 } };
  const result = pet.feed(growth, 2);
  assert.equal(result.ok, true);
  assert.equal(result.growth.sunlight, 15);
  assert.equal(result.growth.pet.hunger, 60);
  assert.equal(result.growth.pet.feedCount, 1);
  assert.equal(result.growth.pet.stage, 1);
  assert.equal(result.evolved, true);
});

test('task awards add exp and badge happiness adds hunger', () => {
  const growth = { pet: pet.normalize({ hunger: 50, exp: 0, stage: 0, lastUpdate: 1 }) };
  const awarded = pet.awardExp(growth, 5, 3);
  assert.equal(awarded.pet.exp, 5);
  globalThis.petSystem.addHappiness(5);
  assert.ok(globalThis.petSystem);
  const happy = pet.addHappiness(awarded, 5, 3);
  assert.equal(happy.pet.hunger, 55);
});

test('theme maps to original companion names without commercial mascots', () => {
  const garden = pet.themeProfile('garden-defense');
  const voxel = pet.themeProfile('voxel-adventure');
  const platform = pet.themeProfile('platform-quest');
  assert.match(garden.name, /向日葵|星芒|阳光/);
  assert.match(voxel.name, /方块|村民|晶体/);
  assert.match(platform.name, /探险|星芒|旅伴/);
  assert.doesNotMatch(garden.name + voxel.name + platform.name, /马里奥|史蒂夫|皮卡丘/);
});

test('preschool shell loads pet module and feed action', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool-workbench.css'), 'utf8');
  assert.match(html, /preschool-pet\.js/);
  assert.ok(html.indexOf('preschool-pet.js') < html.indexOf('preschool-achievements.js'));
  assert.match(app, /PersonalWorkbenchPet/);
  assert.match(app, /feed-pet/);
  assert.match(css, /30-growth-world\.css/);
});

test('pet card uses published PNG and hungry art after decay', () => {
  const egg = pet.renderCard({ pet: pet.normalize({ hunger: 80, stage: 0, lastUpdate: 1 }) }, 'garden-defense', 1);
  assert.match(egg, /pet-garden-egg\.png/);
  assert.doesNotMatch(egg, /🥚/);
  const hungry = pet.view({ pet: pet.normalize({ hunger: 10, stage: 2, lastUpdate: 1 }) }, 'garden-defense', 1);
  assert.equal(hungry.hungry, true);
  assert.match(hungry.art, /pet-garden-hungry\.png/);
});
