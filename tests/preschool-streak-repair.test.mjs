import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
await import(`../prj/child-growth.js?refresh=${Date.now()}`);
const G = globalThis.PersonalWorkbenchChildGrowth;

function dateOffset(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const TODAY = '2026-08-15';
const YESTERDAY = dateOffset(TODAY, -1);

function seedWithDates(dates) {
  const growth = G.createDefaultGrowth();
  dates.forEach((date) => growth.checkinDates.push(date));
  return growth;
}

test('normalize fills streakRepair defaults and validates shape', () => {
  const growth = G.normalize({});
  assert.deepEqual(growth.streakRepair, { cardsUsedByMonth: {}, repairedDates: [] });
  const dirty = G.normalize({ streakRepair: { cardsUsedByMonth: { '2026-08': 1, bad: 9 }, repairedDates: ['2026-08-14', 'nope'] } });
  assert.equal(dirty.streakRepair.cardsUsedByMonth['2026-08'], 1);
  assert.equal(dirty.streakRepair.cardsUsedByMonth.bad, undefined);
  assert.deepEqual(dirty.streakRepair.repairedDates, ['2026-08-14']);
});

test('repairing yesterday reconnects the streak without any sunlight payout', () => {
  const growth = seedWithDates([dateOffset(TODAY, -3), dateOffset(TODAY, -2)]);
  const before = G.getView(growth, TODAY);
  assert.equal(before.streak, 0, 'gap day breaks the anchored streak');

  const result = G.repairStreak(growth, TODAY);
  assert.equal(result.ok, true);
  assert.equal(result.repairedDate, YESTERDAY);
  assert.equal(result.cardsLeft, 1, 'one of two monthly cards left');

  const after = result.growth;
  assert.ok(after.checkinDates.includes(YESTERDAY), 'yesterday becomes a checkin date');
  assert.equal(after.sunlight, growth.sunlight, 'no sunlight granted');
  assert.equal(after.totalSunlightEarned, growth.totalSunlightEarned, 'no earned total change');
  assert.equal(after.unicorn.xp, growth.unicorn.xp, 'no xp change');
  assert.deepEqual(after.awardedIds, growth.awardedIds, 'no settlement ids touched');

  const withToday = G.recordAction(after, { eventId: `test:${Date.now()}`, amount: 10, date: TODAY });
  assert.equal(G.getView(withToday.growth, TODAY).streak, 4, 'repaired chain counts 4 days in a row');
});

test('repair refuses when yesterday has no gap', () => {
  const growth = seedWithDates([YESTERDAY, TODAY]);
  const result = G.repairStreak(growth, TODAY);
  assert.equal(result.ok, false);
  assert.match(result.reason, /不需要补签/);
});

test('monthly allowance is two cards and resets next month', () => {
  const growth = seedWithDates([dateOffset(TODAY, -3), dateOffset(TODAY, -2)]);
  const first = G.repairStreak(growth, TODAY);
  const second = G.repairStreak(first.growth, TODAY);
  assert.equal(second.ok, false, 'yesterday is already repaired on second call');
  assert.match(second.reason, /不需要补签/);

  const gap2 = seedWithDates([dateOffset(TODAY, -4), dateOffset(TODAY, -3)]);
  gap2.streakRepair.cardsUsedByMonth['2026-08'] = 2;
  const denied = G.repairStreak(gap2, TODAY);
  assert.equal(denied.ok, false);
  assert.match(denied.reason, /用完/);

  gap2.streakRepair.cardsUsedByMonth['2026-08'] = 1;
  const allowed = G.repairStreak(gap2, TODAY);
  assert.equal(allowed.ok, true);
  assert.equal(allowed.growth.streakRepair.cardsUsedByMonth['2026-08'], 2);
});

test('getView exposes the repair card state for the UI', () => {
  const growth = seedWithDates([dateOffset(TODAY, -3), dateOffset(TODAY, -2)]);
  const view = G.getView(growth, TODAY);
  assert.equal(view.streakRepair.canRepair, true);
  assert.equal(view.streakRepair.welcomeBack, true);
  assert.equal(view.streakRepair.available, 2);

  const repaired = G.repairStreak(growth, TODAY).growth;
  assert.equal(G.getView(repaired, TODAY).streakRepair.canRepair, false, 'button disappears after repair');

  const fresh = G.getView(G.createDefaultGrowth(), TODAY);
  assert.equal(fresh.streakRepair.canRepair, false, 'no repair before any history');
});

test('app wires the repair action and the welcome-back card', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /repair-streak/);
  assert.match(app, /repairGrowthStreak/);
  assert.match(app, /欢迎回来！昨天断了一下/);

  const engine = fs.readFileSync(path.join(root, 'child-growth.js'), 'utf8');
  assert.match(engine, /STREAK_REPAIR_MONTHLY_CARDS = 2/);
  assert.match(engine, /repairStreak/);

  const dataModel = fs.readFileSync(path.join(fileURLToPath(new URL('..', import.meta.url)), 'docs', 'data-model.md'), 'utf8');
  assert.match(dataModel, /streakRepair/);
});
