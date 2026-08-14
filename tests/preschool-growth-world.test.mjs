import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
await import('../prj/preschool-growth-world.js');
const engine = globalThis.PersonalWorkbenchGrowthWorld;

function makeState(options) {
  const opts = options || {};
  const mastery = {};
  (opts.chars || []).forEach(function (char) {
    mastery[char] = { state: 'introduced' };
  });
  return {
    courseProgress: {
      completedLessonIds: opts.completedLessonIds || [],
      literacy: { mastery: mastery }
    },
    dailyPlans: opts.dailyPlans || [],
    growth: { checkinDates: opts.checkinDates || [] }
  };
}

test('builds garden flowers from literacy mastery without a second ledger', () => {
  const view = engine.getView(makeState({ chars: ['山', '水', '火', '木'] }), []);
  assert.equal(view.garden.flowers.length, 4);
  assert.equal(view.garden.flowers[0].char, '山');
  assert.equal(view.garden.butterflies, 0);
  assert.equal(view.storageKey, undefined);
});

test('unlocks map stops from real check-in days and marks today', () => {
  const view = engine.getView(makeState({
    checkinDates: ['2026-08-01', '2026-08-02', '2026-08-03']
  }), [], { today: '2026-08-03' });
  assert.equal(view.adventure.days, 3);
  const house = view.adventure.locations.find(function (item) { return item.id === 'house'; });
  const forest = view.adventure.locations.find(function (item) { return item.id === 'forest'; });
  assert.equal(house.unlocked, true);
  assert.equal(forest.unlocked, false);
  assert.equal(view.adventure.todayHighlight, true);
});

test('builds town bricks from completed english lessons', () => {
  const catalog = [{
    id: 'preschool-english',
    lessons: [
      { id: 'en-1', activity: { options: ['cat', 'dog'] } },
      { id: 'en-2', activity: { options: ['mat', 'bat'] } }
    ]
  }];
  const view = engine.getView(makeState({ completedLessonIds: ['en-1', 'en-2'] }), catalog);
  assert.ok(view.builder.bricks.length >= 2);
  assert.ok(view.builder.bricks.some(function (item) { return item.word === 'cat'; }));
  assert.equal(view.builder.townLevel >= 1, true);
});

test('renders three world chooser cards and focused flower review hooks', () => {
  const html = engine.render(makeState({ chars: ['山'], checkinDates: ['2026-08-01'] }), []);
  assert.match(html, /成长世界/);
  assert.match(html, /花园世界/);
  assert.match(html, /冒险地图/);
  assert.match(html, /建造世界/);
  assert.match(html, /进入花园/);
  assert.match(html, /进入地图/);
  assert.match(html, /进入建造/);
  assert.doesNotMatch(html, /growth_world_data/);
  const garden = engine.render(makeState({ chars: ['山'], checkinDates: ['2026-08-01'] }), [], { focus: 'garden' });
  assert.match(garden, /data-action="review-growth-flower"/);
  assert.match(garden, /返回三个世界/);
});

test('preschool shell loads the growth-world module', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  assert.match(html, /preschool-growth-world\.js/);
  assert.ok(html.indexOf('preschool-growth-world.js') < html.indexOf('app.js'));
  assert.match(app, /PersonalWorkbenchGrowthWorld/);
  assert.match(app, /review-growth-flower/);
  assert.match(app, /open-growth-world/);
});

test('garden landmarks unlock from flower count and map stops show remaining days', () => {
  const chars = [];
  for (let index = 0; index < 20; index += 1) chars.push(`字${index}`);
  const view = engine.getView(makeState({ chars: chars, checkinDates: ['2026-08-01'] }), []);
  const fence = view.garden.landmarks.find(function (item) { return item.id === 'fence'; });
  const hut = view.garden.landmarks.find(function (item) { return item.id === 'hut'; });
  assert.equal(view.garden.butterflies, 2);
  assert.equal(fence.unlocked, true);
  assert.equal(hut.unlocked, false);
  const html = engine.render(makeState({ chars: ['山'], checkinDates: ['2026-08-01'] }), [], { focus: 'map' });
  assert.match(html, /review-growth-stop/);
  assert.match(html, /再 2 天|再 4 天|再 9 天/);
});

test('flower review card shows the character without a fake ledger', () => {
  const html = engine.renderReviewHtml('flower', { char: '山', pinyin: 'shān', word: '高山', color: '#FF6B6B', planted: '2026-08-01' });
  assert.match(html, /山/);
  assert.match(html, /shān/);
  assert.match(html, /认识于 2026-08-01/);
  assert.match(html, /认识了/);
});
