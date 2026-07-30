import assert from 'node:assert/strict';
import test from 'node:test';

await import('../preschool-garden.js');
const gardenEngine = globalThis.PersonalWorkbenchPreschoolGarden;

test('creates a preschool garden with a starter plant and empty collection', () => {
  const growth = gardenEngine.normalize({});
  assert.equal(growth.garden.activePlantId, 'plant-sun-sprout');
  assert.deepEqual(growth.garden.unlockedPlantIds, ['plant-sun-sprout']);
  assert.deepEqual(growth.collection.unlockedIds, []);
  assert.equal(growth.collection.total, gardenEngine.COLLECTION_CATALOG.length);
});

test('unlocks original plant companions from lifetime sunlight', () => {
  const next = gardenEngine.applySunlight(gardenEngine.normalize({}), 120);
  assert.ok(next.garden.unlockedPlantIds.includes('plant-moon-mint'));
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

test('normalizes old growth snapshots without losing new garden state', () => {
  const old = gardenEngine.normalize({ sunlight: 40, zombie: { active: true, defeated: 2 } });
  assert.equal(old.sunlight, 40);
  assert.equal(old.garden.invader.defeated, 2);
  assert.equal(old.garden.invader.active, true);
  assert.ok(Array.isArray(old.collection.seenEventIds));
});
