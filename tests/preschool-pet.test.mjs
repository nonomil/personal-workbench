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

test('catalog ships a small PVZ and Minecraft egg set without a new storage key', () => {
  const catalog = pet.listSpecies();
  const ids = catalog.map((item) => item.id);
  assert.ok(ids.includes('pvz-sunflower'));
  assert.ok(ids.includes('pvz-peashooter'));
  assert.ok(ids.includes('mc-slime'));
  assert.ok(ids.includes('mc-golem'));
  assert.ok(catalog.length >= 8 && catalog.length <= 16);
  assert.equal(catalog.some((item) => item.series === 'pvz'), true);
  assert.equal(catalog.some((item) => item.series === 'mc'), true);
  const source = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-pet.js'), 'utf8');
  assert.doesNotMatch(source, /localStorage\.(setItem|getItem)/);
  assert.doesNotMatch(source, /fetch\s*\(/);
});

test('old snapshots without speciesId still hatch as the theme starter', () => {
  const garden = pet.normalize({ type: 'sunflower', hunger: 80, stage: 0, lastUpdate: 1 });
  const voxel = pet.normalize({ type: 'crystal', hunger: 80, stage: 0, lastUpdate: 1 });
  assert.equal(garden.speciesId, 'pvz-sunflower');
  assert.equal(voxel.speciesId, 'mc-slime');
});

test('hatching an unlocked egg keeps the same growth key and can switch only while still an egg', () => {
  const growth = {
    sunlight: 20,
    pet: pet.normalize({ hunger: 80, stage: 0, lastUpdate: 1 }),
    worldGames: { 'garden-defense': { unlockedStage: 2, totalWins: 0 }, 'voxel-adventure': { unlockedLevel: 1, crystalsTotal: 0, questsDone: [] } }
  };
  const hatched = pet.hatch(growth, 'pvz-peashooter', 2);
  assert.equal(hatched.ok, true);
  assert.equal(hatched.growth.pet.speciesId, 'pvz-peashooter');
  assert.equal(hatched.growth.pet.stage, 0);
  assert.equal(hatched.growth.pet.name, '豌豆射手');
  const locked = pet.hatch(hatched.growth, 'mc-golem', 3);
  assert.equal(locked.ok, false);
  const grown = pet.feed({ sunlight: 20, pet: { ...hatched.growth.pet, exp: 45 } }, 4);
  assert.equal(grown.ok, true);
  assert.equal(grown.growth.pet.stage, 1);
  const blocked = pet.hatch(grown.growth, 'pvz-sunflower', 5);
  assert.equal(blocked.ok, false);
});

test('grown PVZ and Minecraft pets use published plant or voxel sprites', () => {
  const sunflower = pet.view({ pet: pet.normalize({ speciesId: 'pvz-sunflower', stage: 2, hunger: 80, lastUpdate: 1 }) }, 'garden-defense', 1);
  const peashooter = pet.view({ pet: pet.normalize({ speciesId: 'pvz-peashooter', stage: 2, hunger: 80, lastUpdate: 1 }) }, 'garden-defense', 1);
  const slime = pet.view({ pet: pet.normalize({ speciesId: 'mc-slime', stage: 2, hunger: 80, lastUpdate: 1 }) }, 'voxel-adventure', 1);
  const golem = pet.view({ pet: pet.normalize({ speciesId: 'mc-golem', stage: 3, hunger: 80, lastUpdate: 1 }) }, 'voxel-adventure', 1);
  assert.match(sunflower.art, /pvz-sunflower\.png|pet-garden-sunflower\.png/);
  assert.match(peashooter.art, /pvz-peashooter\.png|plant-peashooter\.png/);
  assert.match(slime.art, /slime-idle\.png|pet-voxel-growth\.png/);
  assert.match(golem.art, /golem\.png|pet-voxel-evolved\.png/);
  const nest = pet.renderCard({
    pet: pet.normalize({ hunger: 80, stage: 0, lastUpdate: 1 }),
    worldGames: { 'garden-defense': { unlockedStage: 2 }, 'voxel-adventure': { unlockedLevel: 1 } }
  }, 'garden-defense', 1);
  assert.match(nest, /data-action="hatch-egg"/);
  assert.match(nest, /pvz-peashooter/);
});

test('minecraft workbench nest only offers MC companions from the pet catalog', () => {
  const voxel = pet.listSpecies({
    'voxel-adventure': { unlockedLevel: 4, crystalsTotal: 1, questsDone: ['q1'] }
  }, 'voxel-adventure');
  const ids = voxel.map((item) => item.id);
  assert.ok(ids.includes('mc-slime'));
  assert.ok(ids.includes('mc-spider'));
  assert.ok(ids.includes('mc-bat'));
  assert.ok(ids.includes('mc-blaze'));
  assert.ok(ids.includes('mc-golem'));
  assert.equal(voxel.every((item) => item.series === 'mc'), true);
  assert.equal(ids.some((id) => id.startsWith('pvz-')), false);
  const nest = pet.renderCard({
    pet: pet.normalize({ type: 'crystal', hunger: 80, stage: 0, lastUpdate: 1 }),
    worldGames: { 'voxel-adventure': { unlockedLevel: 4, crystalsTotal: 1, questsDone: ['q1'] } }
  }, 'voxel-adventure', 1);
  assert.match(nest, /data-id="mc-spider"/);
  assert.match(nest, /data-id="mc-blaze"/);
  assert.doesNotMatch(nest, /pvz-peashooter|pvz-sunflower/);
  const spider = pet.view({ pet: pet.normalize({ speciesId: 'mc-spider', stage: 2, hunger: 80, lastUpdate: 1 }) }, 'voxel-adventure', 1);
  const blaze = pet.view({ pet: pet.normalize({ speciesId: 'mc-blaze', stage: 2, hunger: 80, lastUpdate: 1 }) }, 'voxel-adventure', 1);
  assert.equal(spider.displayName, '蜘蛛');
  assert.equal(blaze.displayName, '烈焰人');
  assert.match(spider.art, /spider\.png/);
  assert.match(blaze.art, /fire-spirit-idle\.png/);
  const hatched = pet.hatch({
    pet: pet.normalize({ type: 'crystal', hunger: 80, stage: 0, lastUpdate: 1 }),
    worldGames: { 'voxel-adventure': { unlockedLevel: 2, crystalsTotal: 0, questsDone: [] } }
  }, 'mc-spider', 2);
  assert.equal(hatched.ok, true);
  assert.equal(hatched.growth.pet.speciesId, 'mc-spider');
});

test('locked MC eggs say which voxel progress unlocks them', () => {
  const nest = pet.renderCard({
    pet: pet.normalize({ type: 'crystal', hunger: 80, stage: 0, lastUpdate: 1 }),
    worldGames: { 'voxel-adventure': { unlockedLevel: 1, crystalsTotal: 0, questsDone: [] } }
  }, 'voxel-adventure', 1);
  assert.match(nest, /方块 2 关/);
  assert.match(nest, /方块 4 关/);
  assert.match(nest, /收集晶体|完成任务/);
});

test('minecraft workbench hides a leftover garden egg and feeds the slime starter', () => {
  const nest = pet.renderCard({
    pet: pet.normalize({ speciesId: 'pvz-sunflower', hunger: 80, stage: 0, lastUpdate: 1 }),
    worldGames: { 'voxel-adventure': { unlockedLevel: 1 } }
  }, 'voxel-adventure', 1);
  assert.doesNotMatch(nest, /pvz-sunflower|小向日葵|阳光蛋/);
  assert.match(nest, /史莱姆|方块蛋/);
  assert.match(nest, /data-id="mc-slime"/);
  const fed = pet.feed({
    sunlight: 20,
    pet: pet.normalize({ speciesId: 'pvz-sunflower', hunger: 40, stage: 0, exp: 0, lastUpdate: 1 })
  }, 2, 'voxel-adventure');
  assert.equal(fed.ok, true);
  assert.equal(fed.growth.pet.speciesId, 'mc-slime');
  assert.equal(fed.growth.pet.exp, 10);
});

test('growth page wires hatch-egg without adding a storage key', () => {
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const model = fs.readFileSync(path.join(repoRoot, 'docs', 'data-model.md'), 'utf8');
  assert.match(app, /hatch-egg/);
  assert.match(app, /hatchPreschoolPet|PersonalWorkbenchPet\.hatch/);
  assert.match(model, /speciesId/);
  assert.doesNotMatch(app, /petbank_pet/);
});
