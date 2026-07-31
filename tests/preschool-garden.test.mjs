import assert from 'node:assert/strict';
import test from 'node:test';

await import('../preschool-garden.js');
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

test('fires a pea only when the garden has an active invader and energy', () => {
  const ready = gardenEngine.normalize({ garden: { defenseEnergy: 1, invader: { active: true, health: 1, maxHealth: 3, wave: 2 } } });
  const result = gardenEngine.firePea(ready, '2026-07-29');
  assert.equal(result.ok, true);
  assert.equal(result.hit, true);
  assert.equal(result.defeated, true);
  assert.equal(result.growth.garden.defenseEnergy, 0);
  assert.equal(result.growth.garden.defenseShots, 1);
  assert.equal(result.growth.garden.invader.active, false);

  const empty = gardenEngine.firePea(gardenEngine.normalize({}), '2026-07-29');
  assert.equal(empty.ok, false);
  assert.equal(empty.reason, '没有可发射的豌豆能量');
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
