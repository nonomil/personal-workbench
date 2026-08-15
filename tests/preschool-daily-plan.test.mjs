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

await import('../prj/storage.js?preschool-daily-plan-contract');
const storage = globalThis.PersonalWorkbenchStorage;

test('seeds three core preschool actions and three optional actions', () => {
  const today = storage.localDate();
  const plans = storage.repository.load().dailyPlans.filter(item => item.date === today);
  assert.equal(plans.length, 9);
  assert.equal(plans.filter(item => item.required === true).length, 3);
  assert.equal(plans.filter(item => item.required === false).length, 6);
  assert.deepEqual(
    plans.filter(item => item.required).map(item => item.id),
    ['preschool-plan-story', 'preschool-plan-count', 'preschool-plan-hello']
  );
  assert.equal(plans.find(item => item.id === 'preschool-plan-story').practiceLessonId, 'preschool-chinese-1');
  assert.equal(plans.find(item => item.id === 'preschool-plan-draw').practiceLessonId, 'preschool-english-words-1');
  assert.equal(plans.find(item => item.id === 'preschool-plan-move').practiceLessonId, 'preschool-exercise-1');
  assert.equal(plans.find(item => item.id === 'preschool-plan-picturebook').checkinMode, 'timed');
  assert.equal(plans.find(item => item.id === 'preschool-plan-cartoon').estimateMinutes, 20);
  assert.equal(plans.find(item => item.id === 'preschool-plan-listen').hint, '早晚各一次 · 约15分钟');
  assert.equal(plans.find(item => item.id === 'preschool-plan-story').completionSource, 'seed');
  assert.equal(plans.find(item => item.id === 'preschool-plan-story').completionRewardId, '');
  assert.equal(plans.find(item => item.id === 'preschool-plan-count').completionSource, '');
  assert.equal(plans.find(item => item.id === 'preschool-plan-count').completionRewardId, '');
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
      { id: 'preschool-plan-draw', date: today, title: '旧英语标题', done: false, practiceLessonId: 'preschool-english-phonics-1' }
    ]
  });
  const story = state.dailyPlans.find(item => item.id === 'preschool-plan-story');
  const optional = state.dailyPlans.find(item => item.id === 'preschool-plan-draw');
  assert.equal(story.required, true);
  assert.equal(story.done, true);
  assert.equal(story.practiceLessonId, 'preschool-chinese-1');
  assert.equal(optional.required, false);
  assert.equal(optional.done, false);
  assert.equal(optional.practiceLessonId, 'preschool-english-words-1');
  assert.equal(story.completionSource, '');
  assert.equal(story.completionRewardId, '');
  assert.equal(optional.completionSource, '');
  assert.equal(optional.completionRewardId, '');
});

test('provides a stable plan reward id without coupling it to the UI', () => {
  const rewardId = storage.getPreschoolPlanRewardId({ id: 'preschool-plan-draw', date: '2026-08-06' });
  assert.equal(rewardId, 'plan:preschool-plan-draw:2026-08-06');
  assert.equal(storage.getPreschoolPlanRewardId({ id: '', date: '2026-08-06' }), '');
});

test('keeps the 60-day phonics pack as runtime content and reference bank separate', () => {
  const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
  const lessons = JSON.parse(fs.readFileSync(path.join(root, 'data', 'preschool', 'english', 'phonics', 'lessons.json'), 'utf8'));
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.equal(lessons.length, 60);
  assert.doesNotMatch(app, /data\/preschool\/english\/phonics\/lessons\.json/);
  assert.match(app, /data\/preschool\/english\/phonics\/reference-bank\.json/);
});
