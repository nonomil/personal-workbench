import assert from 'node:assert/strict';
import test from 'node:test';

await import('../prj/preschool-garden.js');
const gardenEngine = globalThis.PersonalWorkbenchPreschoolGarden;

function growthWithSunlight(sunlight = 200) {
  return gardenEngine.normalize({
    sunlight,
    garden: {
      unlockedPlantIds: ['plant-sunflower', 'plant-peashooter', 'plant-wallnut', 'plant-snowpea', 'plant-cherrybomb', 'plant-potatomine']
    }
  });
}

test('creates a versioned five-lane eight-column defense board', () => {
  const growth = gardenEngine.normalize({});
  const defense = growth.garden.defense;
  assert.equal(defense.version, 1);
  assert.equal(defense.board.lanes, 5);
  assert.equal(defense.board.columns, 8);
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

test('spawns one slow basic zombie on the first garden day', () => {
  const started = gardenEngine.startDefenseGame(growthWithSunlight(), '2026-08-03');
  const wave = gardenEngine.spawnDefenseWave(started.growth, '2026-08-03');
  assert.equal(wave.ok, true);
  assert.equal(wave.growth.garden.defense.zombies.length, 1);
  assert.equal(wave.growth.garden.defense.zombies[0].kind, 'zombie-basic');
  assert.equal(wave.growth.garden.defense.zombies[0].lane, 0);
  assert.equal(wave.growth.garden.defense.wave, 1);
  assert.equal(gardenEngine.wavePlan(1, 1).count, 1);
});

test('roster overrides default wave kinds and potato mine arms then pops one zombie', () => {
  const started = gardenEngine.startDefenseGame(growthWithSunlight(), '2026-08-03');
  const wave = gardenEngine.spawnDefenseWave(started.growth, '2026-08-03', {
    stageId: 9,
    roster: ['football']
  });
  assert.equal(wave.spawned[0].kind, 'zombie-football');
  const noRoster = gardenEngine.wavePlan(1, 1);
  assert.deepEqual(noRoster.kinds, ['zombie-basic']);

  let growth = gardenEngine.startDefenseGame(growthWithSunlight(80)).growth;
  growth = gardenEngine.selectPlant(growth, 'plant-potatomine').growth;
  const placed = gardenEngine.placeDefensePlant(growth, 2, 3);
  assert.equal(placed.ok, true);
  assert.equal(placed.growth.sunlight, 60);
  growth = placed.growth;
  growth.garden.defense.zombies = [{
    id: 'z1', kind: 'zombie-buckethead', lane: 2, column: 3, health: 32, maxHealth: 32, slowTicks: 0, moveClock: 0
  }];
  growth = gardenEngine.tickDefense(growth, 2).growth;
  assert.equal(growth.garden.defense.plants[0].health > 0, true);
  assert.equal(growth.garden.defense.zombies[0].health, 32);
  growth = gardenEngine.tickDefense(growth, 1).growth;
  assert.equal(growth.garden.defense.plants.length, 0);
  assert.equal(growth.garden.defense.zombies.length, 0);
  assert.equal(growth.garden.defense.defeated, 1);
});

test('later stages mix tougher zombies but keep the wave small', () => {
  const started = gardenEngine.startDefenseGame(growthWithSunlight(), '2026-08-03');
  const wave = gardenEngine.spawnDefenseWave(started.growth, '2026-08-03', { stageId: 8 });
  assert.equal(wave.ok, true);
  assert.equal(wave.spawned.length, 1);
  assert.equal(wave.growth.garden.defense.zombies.length, 1);
  assert.ok(wave.spawned.every(item => ['zombie-basic', 'zombie-conehead', 'zombie-buckethead'].includes(item.kind)));
  assert.equal(gardenEngine.wavePlan(12, 2).maxAlive, 6);
  assert.ok(gardenEngine.wavePlan(12, 2).kinds.includes('zombie-football'));
});

test('keeps different zombie movement and health profiles observable', () => {
  let growth = gardenEngine.startDefenseGame(growthWithSunlight()).growth;
  growth.garden.defense.zombies = [
    { id: 'a', kind: 'zombie-basic', lane: 0, column: 5, health: 3, maxHealth: 3, slowTicks: 0, moveClock: 0 },
    { id: 'b', kind: 'zombie-conehead', lane: 2, column: 5, health: 5, maxHealth: 5, slowTicks: 0, moveClock: 0 },
    { id: 'c', kind: 'zombie-buckethead', lane: 4, column: 5, health: 8, maxHealth: 8, slowTicks: 0, moveClock: 0 }
  ];
  const ticked = gardenEngine.tickDefense(growth, 36).growth.garden.defense;
  const basic = ticked.zombies.find(item => item.kind === 'zombie-basic');
  const cone = ticked.zombies.find(item => item.kind === 'zombie-conehead');
  const bucket = ticked.zombies.find(item => item.kind === 'zombie-buckethead');
  assert.ok(basic && cone && bucket);
  assert.ok(basic.column < 5);
  assert.ok(bucket.column === 5);
  assert.ok(bucket.maxHealth > cone.maxHealth);
  assert.ok(gardenEngine.ZOMBIE_RULES['zombie-basic'].moveEvery > 10);
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
  assert.equal(restored.garden.defense.zombies.length, 1);
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

test('clearing the last zombie does not mark the defense won by itself', () => {
  let growth = gardenEngine.startDefenseGame(growthWithSunlight(), '2026-08-15').growth;
  growth.garden.defense.status = 'playing';
  growth.garden.defense.wave = 1;
  growth.garden.defense.zombies = [{
    id: 'z-last',
    kind: 'zombie-basic',
    lane: 0,
    column: 3,
    health: 1,
    maxHealth: 10,
    slowTicks: 0,
    moveClock: 0
  }];
  growth.garden.defense.projectiles = [{
    id: 'pea-1',
    lane: 0,
    column: 3,
    damage: 1,
    slowTicks: 0
  }];
  const ticked = gardenEngine.tickDefense(growth, 1).growth.garden.defense;
  assert.equal(ticked.zombies.length, 0);
  assert.equal(ticked.status, 'playing');
});
