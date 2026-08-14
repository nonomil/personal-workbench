import assert from 'node:assert/strict';
import test from 'node:test';

await import('../prj/preschool-garden.js');
const gardenEngine = globalThis.PersonalWorkbenchPreschoolGarden;

function growthWithSunlight(sunlight = 200) {
  return gardenEngine.normalize({
    sunlight,
    garden: {
      unlockedPlantIds: ['plant-sunflower', 'plant-peashooter', 'plant-wallnut', 'plant-snowpea', 'plant-cherrybomb']
    }
  });
}

test('creates a versioned five-lane six-column defense board', () => {
  const growth = gardenEngine.normalize({});
  const defense = growth.garden.defense;
  assert.equal(defense.version, 1);
  assert.equal(defense.board.lanes, 5);
  assert.equal(defense.board.columns, 6);
  assert.deepEqual(defense.plants, []);
  assert.deepEqual(defense.zombies, []);
});

test('selects the active plant and places it once on an empty cell', () => {
  const growth = growthWithSunlight();
  const selected = gardenEngine.selectPlant(growth, 'plant-peashooter');
  assert.equal(selected.ok, true);
  const placed = gardenEngine.placeDefensePlant(selected.growth, 2, 1);
  assert.equal(placed.ok, true);
  assert.equal(placed.growth.garden.activePlantId, 'plant-peashooter');
  assert.equal(placed.growth.garden.defense.plants[0].plantId, 'plant-peashooter');
  assert.equal(placed.growth.garden.defense.plants[0].lane, 2);
  assert.equal(placed.growth.garden.defense.plants[0].column, 1);
  assert.equal(placed.growth.sunlight, 160);

  const duplicate = gardenEngine.placeDefensePlant(placed.growth, 2, 1);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, '这个位置已经有植物了');
});

test('rejects placement when sunlight is insufficient', () => {
  const growth = growthWithSunlight(10);
  const result = gardenEngine.placeDefensePlant(growth, 1, 1);
  assert.equal(result.ok, false);
  assert.equal(result.reason, '阳光还不够');
  assert.equal(result.growth.sunlight, 10);
});

test('spawns three different zombies on different lanes with stable ids', () => {
  const started = gardenEngine.startDefenseGame(growthWithSunlight(), '2026-08-03');
  const wave = gardenEngine.spawnDefenseWave(started.growth, '2026-08-03');
  assert.equal(wave.ok, true);
  assert.equal(wave.growth.garden.defense.zombies.length, 3);
  assert.deepEqual(wave.growth.garden.defense.zombies.map(item => item.lane), [0, 2, 4]);
  assert.equal(new Set(wave.growth.garden.defense.zombies.map(item => item.kind)).size, 3);
  assert.equal(new Set(wave.growth.garden.defense.zombies.map(item => item.id)).size, 3);
  assert.equal(wave.growth.garden.defense.wave, 1);
});

test('keeps different zombie movement and health profiles observable', () => {
  const wave = gardenEngine.spawnDefenseWave(gardenEngine.startDefenseGame(growthWithSunlight()).growth, '2026-08-03');
  const ticked = gardenEngine.tickDefense(wave.growth, 10).growth.garden.defense;
  const basic = ticked.zombies.find(item => item.kind === 'zombie-basic');
  const cone = ticked.zombies.find(item => item.kind === 'zombie-conehead');
  const bucket = ticked.zombies.find(item => item.kind === 'zombie-buckethead');
  assert.ok(basic && cone && bucket);
  assert.ok(basic.column < 5);
  assert.ok(bucket.column === 5);
  assert.ok(bucket.maxHealth > cone.maxHealth);
});

test('wallnut blocks a zombie and never creates a projectile', () => {
  let growth = growthWithSunlight();
  growth = gardenEngine.selectPlant(growth, 'plant-wallnut').growth;
  growth = gardenEngine.placeDefensePlant(growth, 0, 3).growth;
  growth = gardenEngine.spawnDefenseWave(growth, '2026-08-03').growth;
  const before = growth.garden.defense.zombies.find(item => item.lane === 0);
  const ticked = gardenEngine.tickDefense(growth, 1);
  const after = ticked.growth.garden.defense.zombies.find(item => item.id === before.id);
  assert.equal(after.column, before.column);
  assert.deepEqual(ticked.growth.garden.defense.projectiles, []);
});

test('pea shooter creates a projectile while wallnut does not', () => {
  let growth = growthWithSunlight();
  growth = gardenEngine.selectPlant(growth, 'plant-peashooter').growth;
  growth = gardenEngine.placeDefensePlant(growth, 0, 0).growth;
  growth = gardenEngine.spawnDefenseWave(growth, '2026-08-03').growth;
  const ticked = gardenEngine.tickDefense(growth, 1);
  assert.equal(ticked.growth.garden.defense.projectiles.length, 1);
  assert.equal(ticked.growth.garden.defense.projectiles[0].lane, 0);
  assert.equal(ticked.growth.garden.defense.projectiles[0].damage, 1);
});

test('preserves the active game snapshot across normalization', () => {
  let growth = gardenEngine.startDefenseGame(growthWithSunlight(), '2026-08-03').growth;
  growth = gardenEngine.selectPlant(growth, 'plant-wallnut').growth;
  growth = gardenEngine.placeDefensePlant(growth, 4, 2).growth;
  growth = gardenEngine.spawnDefenseWave(growth, '2026-08-03').growth;
  const restored = gardenEngine.normalize(JSON.parse(JSON.stringify(growth)));
  assert.equal(restored.garden.defense.status, 'playing');
  assert.equal(restored.garden.defense.plants[0].plantId, 'plant-wallnut');
  assert.equal(restored.garden.defense.zombies.length, 3);
  assert.equal(restored.garden.defense.nextEntityId, growth.garden.defense.nextEntityId);
});

test('does not resurrect defeated entities during normalization', () => {
  const growth = growthWithSunlight();
  growth.garden.defense = {
    version: 1,
    board: { lanes: 5, columns: 6 },
    selectedPlantId: 'plant-wallnut',
    plants: [{ id: 'plant-1', plantId: 'plant-wallnut', lane: 0, column: 0, health: 0, maxHealth: 8, age: 2 }],
    zombies: [{ id: 'zombie-1', kind: 'zombie-basic', lane: 0, column: 5, health: 0, maxHealth: 3, slowTicks: 0, moveClock: 0 }],
    projectiles: [],
    wave: 1,
    nextEntityId: 3,
    tick: 4,
    defeated: 1,
    status: 'playing',
    startedAt: '2026-08-03'
  };
  const restored = gardenEngine.normalize(JSON.parse(JSON.stringify(growth))).garden.defense;
  assert.deepEqual(restored.plants, []);
  assert.deepEqual(restored.zombies, []);
});

test('marks defense lost when a zombie walks off the left edge', () => {
  let growth = gardenEngine.startDefenseGame(growthWithSunlight(), '2026-08-13').growth;
  growth = gardenEngine.selectPlant(growth, 'plant-peashooter').growth;
  growth = gardenEngine.placeDefensePlant(growth, 0, 5).growth;
  growth.garden.defense.zombies = [{
    id: 'zombie-1',
    kind: 'zombie-basic',
    lane: 0,
    column: 0,
    health: 3,
    maxHealth: 3,
    slowTicks: 0,
    moveClock: 99
  }];
  growth.garden.defense.wave = 1;
  const ticked = gardenEngine.tickDefense(growth, 1);
  assert.equal(ticked.growth.garden.defense.status, 'lost');
  const restored = gardenEngine.normalize(JSON.parse(JSON.stringify(ticked.growth))).garden.defense;
  assert.equal(restored.status, 'lost');
});

test('keeps a zombie on column zero through normalization', () => {
  const growth = gardenEngine.startDefenseGame(growthWithSunlight(), '2026-08-13').growth;
  growth.garden.defense.zombies = [{
    id: 'zombie-edge',
    kind: 'zombie-basic',
    lane: 2,
    column: 0,
    health: 3,
    maxHealth: 3,
    slowTicks: 0,
    moveClock: 1
  }];
  const restored = gardenEngine.normalize(JSON.parse(JSON.stringify(growth))).garden.defense;
  assert.equal(restored.zombies[0].column, 0);
});
