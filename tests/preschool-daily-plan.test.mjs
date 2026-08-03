import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

globalThis.PersonalWorkbenchConfig = {
  variant: 'preschool',
  current: { storageKey: 'preschool-daily-plan-contract-test' }
};

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};

await import('../storage.js?preschool-daily-plan-contract');
const storage = globalThis.PersonalWorkbenchStorage;

test('seeds three core preschool actions and three optional actions', () => {
  const today = storage.localDate();
  const plans = storage.repository.load().dailyPlans.filter(item => item.date === today);
  assert.equal(plans.length, 6);
  assert.equal(plans.filter(item => item.required === true).length, 3);
  assert.equal(plans.filter(item => item.required === false).length, 3);
  assert.deepEqual(
    plans.filter(item => item.required).map(item => item.id),
    ['preschool-plan-story', 'preschool-plan-count', 'preschool-plan-hello']
  );
});

test('adds required flags to legacy plans without changing completion state', () => {
  const today = storage.localDate();
  const state = storage.normalizeState({
    schemaVersion: 2,
    preschoolDayPlanVersion: 2,
    preschoolPlanSeedDates: [today],
    tasks: [],
    dailyPlans: [
      { id: 'preschool-plan-story', date: today, title: '旧识字标题', done: true },
      { id: 'preschool-plan-draw', date: today, title: '旧英语标题', done: false }
    ]
  });
  const story = state.dailyPlans.find(item => item.id === 'preschool-plan-story');
  const optional = state.dailyPlans.find(item => item.id === 'preschool-plan-draw');
  assert.equal(story.required, true);
  assert.equal(story.done, true);
  assert.equal(optional.required, false);
  assert.equal(optional.done, false);
});

test('keeps the 60-day phonics pack as data-only content', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const lessons = JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', 'english', 'phonics', 'lessons.json'), 'utf8'));
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.equal(lessons.length, 60);
  assert.doesNotMatch(app, /data\/preschool\/english\/phonics/);
});
