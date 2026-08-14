import assert from 'node:assert/strict';
import test from 'node:test';

await import('../prj/child-growth.js');
const growthEngine = globalThis.PersonalWorkbenchChildGrowth;

test('keeps empty achievements on a fresh growth state', () => {
  const growth = growthEngine.createDefaultGrowth();
  assert.deepEqual(growth.achievements, { unlocked: [], history: [], lastShown: '', seen: [] });
});

test('awards an action once and adds one daily check-in bonus', () => {
  const initial = growthEngine.createDefaultGrowth();
  const first = growthEngine.recordAction(initial, { eventId: 'plan:one', amount: 10, date: '2026-07-29' });
  const duplicate = growthEngine.recordAction(first.growth, { eventId: 'plan:one', amount: 10, date: '2026-07-29' });
  assert.equal(first.awarded, true);
  assert.equal(first.dailyBonus, 10);
  assert.equal(first.growth.sunlight, 20);
  assert.equal(duplicate.awarded, false);
  assert.equal(duplicate.growth.sunlight, 20);
  assert.deepEqual(duplicate.growth.checkinDates, ['2026-07-29']);
});

test('calculates streak rewards and unlocks pet styles as growth accumulates', () => {
  let growth = growthEngine.createDefaultGrowth();
  for (const [index, date] of ['2026-07-27', '2026-07-28', '2026-07-29'].entries()) {
    growth = growthEngine.recordAction(growth, { eventId: `task:${index}`, amount: 50, date }).growth;
  }
  const view = growthEngine.getView(growth, '2026-07-29');
  assert.equal(view.streak, 3);
  assert.ok(view.unlockedStreakRewardIds.includes('streak-3'));
  assert.ok(view.unlockedStyleIds.includes('style-sparkle'));
  assert.ok(view.plant.stage >= 1);
  assert.ok(view.unicorn.level >= 2);
});

test('claims a streak reward and clears a missed-day zombie on the next action', () => {
  let growth = growthEngine.createDefaultGrowth();
  growth = growthEngine.recordAction(growth, { eventId: 'plan:old', amount: 10, date: '2026-07-28' }).growth;
  assert.equal(growthEngine.getView(growth, '2026-07-29').zombieActive, true);
  const claimed = growthEngine.claimStreakReward(growth, 'streak-1', '2026-07-28');
  assert.equal(claimed.ok, true);
  const next = growthEngine.recordAction(claimed.growth, { eventId: 'plan:new', amount: 10, date: '2026-07-29' });
  assert.equal(next.growth.zombie.active, false);
  assert.equal(next.growth.zombie.defeated, 1);
});
