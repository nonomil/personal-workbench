import assert from 'node:assert/strict';
import test from 'node:test';

await import('../prj/preschool-garden.js');
const gardenEngine = globalThis.PersonalWorkbenchPreschoolGarden;

test('creates a preschool garden with a starter plant and empty collection', () => {
  const growth = gardenEngine.normalize({});
  assert.equal(growth.garden.activePlantId, 'plant-sunflower');
  assert.deepEqual(growth.garden.unlockedPlantIds, ['plant-sunflower']);
  assert.deepEqual(growth.collection.unlockedIds, []);
  assert.equal(growth.collection.total, gardenEngine.COLLECTION_CATALOG.length);
  assert.equal(growth.garden.defenseEnergy, 0);
  assert.equal(growth.garden.defenseShots, 0);
  assert.equal(growth.garden.invader.health, 3);
  assert.equal(growth.garden.invader.maxHealth, 3);
  assert.equal(growth.garden.feedbackPreferences.musicEnabled, false);
  assert.equal(growth.garden.feedbackPreferences.motionEnabled, true);
});

test('unlocks PVZ plant companions from lifetime sunlight', () => {
  const next = gardenEngine.applySunlight(gardenEngine.normalize({}), 120);
  assert.ok(next.garden.unlockedPlantIds.includes('plant-peashooter'));
  assert.ok(next.garden.unlockedPlantIds.includes('plant-wallnut'));
  assert.ok(next.garden.unlockedPlantIds.includes('plant-snowpea'));
  assert.ok(next.collection.unlockedIds.includes('sticker-sun'));
  assert.equal(new Set(next.garden.unlockedPlantIds).size, next.garden.unlockedPlantIds.length);
});

test('records collection rewards once for learning events', () => {
  const first = gardenEngine.recordEvent(gardenEngine.normalize({}), 'lesson-complete');
  const duplicate = gardenEngine.recordEvent(first.growth, 'lesson-complete');
  assert.equal(first.rewardIds.includes('sticker-book'), true);
  assert.equal(first.changed, true);
  assert.equal(duplicate.changed, false);
  assert.deepEqual(duplicate.growth.collection.unlockedIds, first.growth.collection.unlockedIds);
});

test('clears an active garden invader when a child completes an action', () => {
  const active = gardenEngine.normalize({ garden: { invader: { active: true, defeated: 0, lastSpawnDate: '2026-07-28' } } });
  const result = gardenEngine.recordEvent(active, 'checkin-complete', '2026-07-29');
  assert.equal(result.invaderDefeated, true);
  assert.equal(result.growth.garden.invader.active, false);
  assert.equal(result.growth.garden.invader.defeated, 1);
  assert.ok(result.rewardIds.includes('sticker-brave'));
});

test('grants one defense energy for a unique learning event', () => {
  const first = gardenEngine.recordEvent(gardenEngine.normalize({}), 'lesson-complete', '2026-07-29', 'lesson:one');
  const duplicate = gardenEngine.recordEvent(first.growth, 'lesson-complete', '2026-07-29', 'lesson:one');
  assert.equal(first.growth.garden.defenseEnergy, 1);
  assert.equal(duplicate.changed, false);
  assert.equal(duplicate.growth.garden.defenseEnergy, 1);
});

test('fires a pea only when the active plant is a shooter with an active invader and energy', () => {
  const ready = gardenEngine.normalize({ garden: { activePlantId: 'plant-peashooter', unlockedPlantIds: ['plant-sunflower', 'plant-peashooter'], defenseEnergy: 1, invader: { active: true, health: 1, maxHealth: 3, wave: 2 } } });
  const result = gardenEngine.firePea(ready, '2026-07-29');
  assert.equal(result.ok, true);
  assert.equal(result.hit, true);
  assert.equal(result.defeated, true);
  assert.equal(result.growth.garden.defenseEnergy, 0);
  assert.equal(result.growth.garden.defenseShots, 1);
  assert.equal(result.growth.garden.invader.active, false);

  const empty = gardenEngine.firePea(gardenEngine.normalize({ garden: { activePlantId: 'plant-peashooter', unlockedPlantIds: ['plant-sunflower', 'plant-peashooter'], invader: { active: true, health: 3, maxHealth: 3 } } }), '2026-07-29');
  assert.equal(empty.ok, false);
  assert.equal(empty.reason, '需要 1 点豌豆能量');
});

test('gives each preschool plant a distinct skill and effect', () => {
  const makeReady = (activePlantId, defenseEnergy = 3) => gardenEngine.normalize({
    sunlight: 40,
    garden: {
      activePlantId,
      unlockedPlantIds: ['plant-sunflower', 'plant-peashooter', 'plant-wallnut', 'plant-snowpea', 'plant-cherrybomb'],
      defenseEnergy,
      invader: { active: true, health: 5, maxHealth: 5, wave: 2 }
    }
  });

  const sunflower = gardenEngine.usePlantSkill(makeReady('plant-sunflower', 0), '2026-07-29');
  assert.equal(sunflower.ok, true);
  assert.equal(sunflower.effect, 'sunlight');
  assert.equal(sunflower.amount, 10);
  assert.equal(sunflower.growth.sunlight, 50);

  const wallnut = gardenEngine.usePlantSkill(makeReady('plant-wallnut'), '2026-07-29');
  assert.equal(wallnut.ok, true);
  assert.equal(wallnut.effect, 'block');
  assert.equal(wallnut.damage, 0);
  assert.equal(wallnut.growth.garden.invader.health, 5);
  assert.equal(wallnut.growth.garden.invader.blockedTurns, 2);

  const peashooter = gardenEngine.usePlantSkill(makeReady('plant-peashooter'), '2026-07-29');
  assert.equal(peashooter.ok, true);
  assert.equal(peashooter.effect, 'pea');
  assert.equal(peashooter.damage, 1);
  assert.equal(peashooter.growth.garden.defenseEnergy, 2);

  const snowpea = gardenEngine.usePlantSkill(makeReady('plant-snowpea'), '2026-07-29');
  assert.equal(snowpea.ok, true);
  assert.equal(snowpea.effect, 'ice-pea');
  assert.equal(snowpea.growth.garden.invader.slowedTurns, 2);

  const cherrybomb = gardenEngine.usePlantSkill(makeReady('plant-cherrybomb'), '2026-07-29');
  assert.equal(cherrybomb.ok, true);
  assert.equal(cherrybomb.effect, 'blast');
  assert.equal(cherrybomb.damage, 3);
  assert.equal(cherrybomb.growth.garden.defenseEnergy, 1);

  const wallnutFire = gardenEngine.firePea(makeReady('plant-wallnut'), '2026-07-29');
  assert.equal(wallnutFire.ok, false);
  assert.match(wallnutFire.reason, /坚果墙/);
});

test('keeps sunflower skill sunlight outside the lifetime sunlight ledger', () => {
  const ready = gardenEngine.normalize({
    sunlight: 40,
    totalSunlightEarned: 100,
    awardedIds: ['lesson:2026-08-15'],
    unicorn: { xp: 12 },
    garden: { activePlantId: 'plant-sunflower', unlockedPlantIds: ['plant-sunflower'], growthPoints: 100 }
  });
  const result = gardenEngine.usePlantSkill(ready, '2026-08-15');

  assert.equal(result.ok, true);
  assert.equal(result.growth.sunlight, 50);
  assert.equal(result.growth.garden.growthPoints, 110);
  assert.equal(result.growth.totalSunlightEarned, 100);
  assert.deepEqual(result.growth.awardedIds, ['lesson:2026-08-15']);
  assert.equal(result.growth.unicorn.xp, 12);
});

test('keeps sunflower defense-tick sunlight outside the lifetime sunlight ledger', () => {
  const ready = gardenEngine.normalize({
    sunlight: 40,
    totalSunlightEarned: 100,
    awardedIds: ['lesson:2026-08-15'],
    unicorn: { xp: 12 },
    garden: {
      growthPoints: 100,
      defense: {
        tick: 4,
        status: 'ready',
        plants: [{ id: 'plant-1', plantId: 'plant-sunflower', lane: 0, column: 0, health: 3, maxHealth: 3, age: 0 }]
      }
    }
  });
  const result = gardenEngine.tickDefense(ready, 1);

  assert.equal(result.ok, true);
  assert.equal(result.growth.sunlight, 50);
  assert.equal(result.growth.garden.growthPoints, 110);
  assert.equal(result.growth.totalSunlightEarned, 100);
  assert.deepEqual(result.growth.awardedIds, ['lesson:2026-08-15']);
  assert.equal(result.growth.unicorn.xp, 12);
});

test('spawns a wave without resetting an existing active invader', () => {
  const calm = gardenEngine.spawnInvader(gardenEngine.normalize({}), '2026-07-29');
  assert.equal(calm.growth.garden.invader.active, true);
  assert.equal(calm.growth.garden.invader.health, 3);
  assert.equal(calm.growth.garden.invader.wave, 1);
  const existing = gardenEngine.spawnInvader(calm.growth, '2026-07-29');
  assert.equal(existing.changed, false);
  assert.equal(existing.growth.garden.invader.wave, 1);
});

test('stores preschool feedback preferences without changing learning data', () => {
  const initial = gardenEngine.normalize({ sunlight: 40 });
  const result = gardenEngine.setFeedbackPreference(initial, 'musicEnabled', true);
  assert.equal(result.ok, true);
  assert.equal(result.growth.garden.feedbackPreferences.musicEnabled, true);
  assert.equal(result.growth.sunlight, 40);
  const invalid = gardenEngine.setFeedbackPreference(result.growth, 'unknown', true);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.growth.garden.feedbackPreferences.musicEnabled, true);
});

test('normalizes old growth snapshots without losing new garden state', () => {
  const old = gardenEngine.normalize({ sunlight: 40, zombie: { active: true, defeated: 2 } });
  assert.equal(old.sunlight, 40);
  assert.equal(old.garden.invader.defeated, 2);
  assert.equal(old.garden.invader.active, true);
  assert.equal(old.garden.invader.health, 3);
  assert.equal(old.garden.defenseEnergy, 0);
  assert.ok(Array.isArray(old.collection.seenEventIds));
});

test('settles a skill against an invader derived from a missed day', () => {
  const ready = gardenEngine.normalize({
    checkinDates: ['2026-07-28'],
    garden: {
      activePlantId: 'plant-peashooter',
      unlockedPlantIds: ['plant-sunflower', 'plant-peashooter'],
      defenseEnergy: 1,
      invader: { active: false, health: 3, maxHealth: 3 }
    }
  });
  const view = gardenEngine.getDefenseView(ready, '2026-07-29');
  assert.equal(view.invader.active, true);
  const result = gardenEngine.usePlantSkill(ready, '2026-07-29');
  assert.equal(result.ok, true);
  assert.equal(result.effect, 'pea');
  assert.equal(result.growth.garden.invader.health, 2);
});

test('places the selected plant once and protects occupied cells', () => {
  const ready = gardenEngine.normalize({
    sunlight: 50,
    garden: { activePlantId: 'plant-sunflower', unlockedPlantIds: ['plant-sunflower'] }
  });
  const placed = gardenEngine.placeDefensePlant(ready, 2, 3);
  assert.equal(placed.ok, true);
  assert.equal(placed.growth.sunlight, 25);
  assert.deepEqual(placed.growth.garden.defense.plants[0], {
    id: 'plant-1',
    plantId: 'plant-sunflower',
    lane: 2,
    column: 3,
    health: 3,
    maxHealth: 3,
    age: 0
  });
  const duplicate = gardenEngine.placeDefensePlant(placed.growth, 2, 3);
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.reason, /已经有植物/);
  assert.equal(duplicate.growth.sunlight, 25);
  assert.equal(duplicate.growth.garden.defense.plants.length, 1);
});

test('places plants at free lawn points on the same lane without filling a whole grid cell', () => {
  const ready = gardenEngine.normalize({
    sunlight: 80,
    garden: { activePlantId: 'plant-sunflower', unlockedPlantIds: ['plant-sunflower'] }
  });
  const first = gardenEngine.placeDefensePlant(ready, 2, 0, { x: 0.22 });
  assert.equal(first.ok, true);
  assert.equal(first.plant.x, 0.22);
  const second = gardenEngine.placeDefensePlant(first.growth, 2, 0, { x: 0.58 });
  assert.equal(second.ok, true);
  assert.equal(second.growth.garden.defense.plants.length, 2);
  assert.equal(second.growth.garden.defense.plants[0].x, 0.22);
  assert.equal(second.growth.garden.defense.plants[1].x, 0.58);
  const restored = gardenEngine.normalize(JSON.parse(JSON.stringify(second.growth)));
  assert.equal(restored.garden.defense.plants[0].x, 0.22);
  assert.equal(restored.garden.defense.plants[1].x, 0.58);
  const tooClose = gardenEngine.placeDefensePlant(second.growth, 2, 0, { x: 0.24 });
  assert.equal(tooClose.ok, false);
  assert.match(tooClose.reason, /已经有植物/);
  assert.equal(tooClose.growth.garden.defense.plants.length, 2);
});
