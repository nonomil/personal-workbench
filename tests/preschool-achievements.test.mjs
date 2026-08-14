import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
await import('../prj/preschool-achievements.js');
const engine = globalThis.PersonalWorkbenchAchievements;

function masteryOf(count) {
  const mastery = {};
  for (let index = 0; index < count; index += 1) {
    mastery[`字${index}`] = { state: 'introduced', dates: [], attempts: 1, correct: 1 };
  }
  return mastery;
}

function englishCatalog(count) {
  const lessons = [];
  for (let index = 0; index < count; index += 1) {
    lessons.push({
      id: `en-${index}`,
      title: `word ${index}`,
      activity: { options: [`word${index}`], answer: 0 }
    });
  }
  return [{ id: 'preschool-english', lessons: lessons }];
}

function makeState(options) {
  const opts = options || {};
  return {
    courseProgress: {
      completedLessonIds: Array.isArray(opts.completedLessonIds) ? opts.completedLessonIds : [],
      literacy: { mastery: opts.mastery || {} }
    },
    dailyPlans: Array.isArray(opts.dailyPlans) ? opts.dailyPlans : [],
    growth: {
      checkinDates: Array.isArray(opts.checkinDates) ? opts.checkinDates : [],
      achievements: opts.achievements || { unlocked: [], history: [], lastShown: '' }
    }
  };
}

test('counts flowers from literacy mastery, days from check-ins, bricks from english lessons', () => {
  const stats = engine.getGrowthStats(makeState({
    mastery: masteryOf(12),
    checkinDates: ['2026-08-01', '2026-08-02', '2026-08-03'],
    completedLessonIds: ['en-0', 'en-1', 'en-2']
  }), englishCatalog(3));
  assert.equal(stats.garden.flowers, 12);
  assert.equal(stats.adventure.days, 3);
  assert.equal(stats.builder.bricks, 3);
});

test('map days count only full plan days; english plans do not mint extra bricks', () => {
  const stats = engine.getGrowthStats(makeState({
    checkinDates: ['2026-08-01', '2026-08-02', '2026-08-03'],
    completedLessonIds: ['en-0'],
    dailyPlans: [
      { date: '2026-08-01', done: true, title: '识字' },
      { date: '2026-08-02', done: true, title: '英语' },
      { date: '2026-08-02', done: false, title: '拼音' },
      { date: '2026-08-03', done: true, title: '英语单词', category: '英语' }
    ]
  }), englishCatalog(1));
  assert.equal(stats.adventure.days, 2);
  assert.equal(stats.builder.bricks, 1);
  assert.match(engine.BADGE_DEFS.GARDEN_BRONZE.description, /汉字/);
});

test('pinyin lessons do not mint town bricks; course complete still goes through checkAchievements', () => {
  const catalog = englishCatalog(1).concat([{
    id: 'preschool-pinyin',
    lessons: [{ id: 'preschool-pinyin-1' }, { id: 'preschool-pinyin-2' }]
  }]);
  const stats = engine.getGrowthStats(makeState({
    completedLessonIds: ['preschool-pinyin-1', 'preschool-pinyin-2', 'en-0']
  }), catalog);
  assert.equal(stats.builder.bricks, 1);

  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const start = app.indexOf('function completeCourseLesson');
  assert.ok(start >= 0);
  assert.match(app.slice(start, start + 2500), /applyPreschoolAchievements/);
});

test('unlocks garden bronze at 10 flowers and does not repeat', () => {
  const first = engine.checkAchievements(makeState({ mastery: masteryOf(10) }), { now: 1000 });
  assert.deepEqual(first.newlyUnlocked, ['GARDEN_BRONZE']);
  assert.ok(first.growth.achievements.unlocked.includes('GARDEN_BRONZE'));
  assert.equal(first.growth.achievements.lastShown, 'GARDEN_BRONZE');
  assert.equal(first.growth.achievements.history[0].unlockedAt, 1000);

  const second = engine.checkAchievements({
    courseProgress: first.state ? first.state.courseProgress : makeState({ mastery: masteryOf(10) }).courseProgress,
    growth: first.growth
  }, { now: 2000 });
  assert.deepEqual(second.newlyUnlocked, []);
  assert.equal(second.growth.achievements.history.length, 1);
});

test('unlocks map and builder badges from real check-in and english progress', () => {
  const dates = [];
  for (let day = 1; day <= 15; day += 1) dates.push(`2026-08-${String(day).padStart(2, '0')}`);
  const completed = [];
  for (let index = 0; index < 50; index += 1) completed.push(`en-${index}`);
  const result = engine.checkAchievements(makeState({
    checkinDates: dates,
    completedLessonIds: completed
  }), { catalog: englishCatalog(50), now: 3 });
  assert.ok(result.newlyUnlocked.includes('MAP_BRONZE'));
  assert.ok(result.newlyUnlocked.includes('MAP_SILVER'));
  assert.ok(!result.newlyUnlocked.includes('MAP_GOLD'));
  assert.ok(result.newlyUnlocked.includes('BUILDER_BRONZE'));
  assert.ok(result.newlyUnlocked.includes('BUILDER_SILVER'));
  assert.ok(!result.newlyUnlocked.includes('BUILDER_GOLD'));
});

test('unlocks unified silver in the same pass when three silvers land together', () => {
  const dates = [];
  for (let day = 1; day <= 15; day += 1) dates.push(`2026-07-${String(day).padStart(2, '0')}`);
  const completed = [];
  for (let index = 0; index < 50; index += 1) completed.push(`en-${index}`);
  const result = engine.checkAchievements(makeState({
    mastery: masteryOf(50),
    checkinDates: dates,
    completedLessonIds: completed
  }), { catalog: englishCatalog(50), now: 4 });
  assert.ok(result.newlyUnlocked.includes('GARDEN_SILVER'));
  assert.ok(result.newlyUnlocked.includes('MAP_SILVER'));
  assert.ok(result.newlyUnlocked.includes('BUILDER_SILVER'));
  assert.ok(result.newlyUnlocked.includes('UNIFIED_SILVER'));
  assert.ok(!result.newlyUnlocked.includes('UNIFIED_GOLD'));
});

test('unlocks unified gold only after all three gold badges', () => {
  const dates = [];
  for (let day = 1; day <= 30; day += 1) dates.push(`2026-06-${String(day).padStart(2, '0')}`);
  const completed = [];
  for (let index = 0; index < 100; index += 1) completed.push(`en-${index}`);
  const result = engine.checkAchievements(makeState({
    mastery: masteryOf(100),
    checkinDates: dates,
    completedLessonIds: completed
  }), { catalog: englishCatalog(100), now: 5 });
  assert.equal(result.newlyUnlocked.length, 11);
  assert.ok(result.newlyUnlocked.includes('UNIFIED_GOLD'));
});

test('notifies petSystem once per new unlock batch and skips when absent', () => {
  const calls = [];
  globalThis.petSystem = { addHappiness: function (value) { calls.push(value); } };
  engine.checkAchievements(makeState({ mastery: masteryOf(10) }), { now: 6 });
  engine.checkAchievements(makeState({
    mastery: masteryOf(10),
    achievements: { unlocked: ['GARDEN_BRONZE'], history: [{ id: 'GARDEN_BRONZE', unlockedAt: 6 }], lastShown: 'GARDEN_BRONZE' }
  }), { now: 7 });
  assert.deepEqual(calls, [5]);
  delete globalThis.petSystem;
});

test('collection box groups badges by garden, map, and builder', () => {
  const achievements = {
    unlocked: ['GARDEN_BRONZE', 'MAP_BRONZE'],
    history: [{ id: 'GARDEN_BRONZE', unlockedAt: 1 }],
    lastShown: 'MAP_BRONZE'
  };
  const box = engine.renderCollectionBox(achievements, {
    garden: { flowers: 12 },
    adventure: { days: 3 },
    builder: { bricks: 0 }
  });
  assert.match(box, /徽章收集箱/);
  assert.match(box, /2\/19/);
  assert.match(box, /data-group="garden"/);
  assert.match(box, /data-group="map"/);
  assert.match(box, /data-group="builder"/);
  assert.match(box, /data-group="levels"/);
  assert.match(box, /分级解锁/);
  assert.match(box, /data-group="unified"/);
  assert.match(box, /花园世界/);
  assert.match(box, /冒险地图/);
  assert.match(box, /建造世界/);
  assert.match(box, /1\/3 · 还差 38 个汉字/);
  assert.match(box, /1\/3 · 还差 12 个全日/);
  assert.match(box, /0\/3 · 还差 10 节英语课/);
  assert.match(box, /已学汉字 12\/50/);
  assert.match(box, /0\/2 · 还差 3 枚银牌/);
  assert.match(box, /is-unlocked/);
  assert.match(box, /is-locked/);
  assert.match(box, /花园新秀/);
  assert.match(box, /✅ 已点亮/);
  assert.match(box, /⬜ 未点亮/);
  assert.match(box, /data-action="review-badge"/);
  assert.match(box, /收起/);
  assert.match(box, /preschool-badge-meter/);
  assert.match(box, /aria-valuenow="12"/);
  assert.match(box, /探索者/);
  assert.match(box, /建造者/);
  assert.match(box, /大师/);
  assert.match(box, /data-action="filter-badge-group"/);
  assert.match(box, /data-action="badge-confetti"/);
  assert.match(box, /preschool-badge-hero/);
  assert.match(box, /preschool-badge-card-meter/);
  assert.match(box, /is-new/);
  assert.doesNotMatch(box, /badge-garden-silver\.png/);
  assert.doesNotMatch(box, /<text[\s\S]*花园新秀/);

  const gardenOnly = engine.renderCollectionBox(achievements, {
    garden: { flowers: 12 },
    adventure: { days: 3 },
    builder: { bricks: 0 }
  }, { filter: 'garden' });
  assert.match(gardenOnly, /preschool-badge-group" data-group="garden"/);
  assert.doesNotMatch(gardenOnly, /preschool-badge-group" data-group="map"/);
  assert.doesNotMatch(gardenOnly, /preschool-badge-group" data-group="builder"/);
  assert.doesNotMatch(gardenOnly, /preschool-badge-group" data-group="unified"/);

  const wall = engine.renderParentBadgeWall(achievements);
  assert.match(wall, /徽章墙/);
  assert.match(wall, /2\/19 已获得/);
  assert.match(wall, /花园新秀/);
  assert.match(wall, /小探险家/);
  assert.doesNotMatch(wall, /花园园丁/);

  const latest = engine.renderLastShown(achievements, 10);
  assert.match(latest, /小探险家/);
  assert.match(latest, /data-open-badges="1"/);
  assert.match(box, /badge-garden-bronze\.png/);
  assert.match(latest, /badge-map-bronze\.png/);
});

test('home latest badge fades three days after unlock', () => {
  const now = 4 * 24 * 60 * 60 * 1000;
  const html = engine.renderLastShown({
    unlocked: ['GARDEN_BRONZE'],
    history: [{ id: 'GARDEN_BRONZE', unlockedAt: 1000 }],
    lastShown: 'GARDEN_BRONZE'
  }, now);
  assert.match(html, /徽章在收集箱/);
  assert.doesNotMatch(html, /花园新秀/);
});

test('celebration markup names the badge and keeps close copy', () => {
  const html = engine.renderCelebrationHtml(['GARDEN_BRONZE']);
  assert.match(html, /花园新秀/);
  assert.match(html, /已学汉字 10|10 个汉字|已学汉字达到10/);
  assert.match(html, /太棒了/);
  assert.match(html, /badge-garden-bronze\.png/);
  assert.match(html, /探索者/);
  assert.match(html, /伙伴更开心了/);
});

test('celebration shows every newly unlocked badge in one dialog', () => {
  const html = engine.renderCelebrationHtml(['GARDEN_BRONZE', 'GARDEN_SILVER', 'UNIFIED_SILVER']);
  assert.match(html, /一次点亮 3 枚徽章/);
  assert.match(html, /花园新秀/);
  assert.match(html, /花园园丁/);
  assert.match(html, /三域行者/);
  assert.match(html, /badge-garden-bronze\.png/);
  assert.match(html, /badge-garden-silver\.png/);
  assert.match(html, /badge-unified-silver\.png/);
});

test('stores badges on growth.achievements inside the existing workbench state', () => {
  const result = engine.checkAchievements(makeState({ mastery: masteryOf(10) }), { now: 8 });
  assert.ok(result.growth.achievements);
  assert.equal(result.growth.growth_achievements, undefined);
});

test('keeps unseen badges until the collection is marked seen', () => {
  const unlocked = {
    unlocked: ['GARDEN_BRONZE'],
    history: [{ id: 'GARDEN_BRONZE', unlockedAt: 1 }],
    lastShown: 'GARDEN_BRONZE'
  };
  assert.deepEqual(engine.unseenBadgeIds(unlocked), ['GARDEN_BRONZE']);
  const seen = engine.markAchievementsSeen(unlocked);
  assert.deepEqual(seen.seen, ['GARDEN_BRONZE']);
  assert.deepEqual(engine.unseenBadgeIds(seen), []);
  const fresh = engine.renderCollectionBox(unlocked, {
    garden: { flowers: 12 },
    adventure: { days: 0 },
    builder: { bricks: 0 }
  });
  const viewed = engine.renderCollectionBox(seen, {
    garden: { flowers: 12 },
    adventure: { days: 0 },
    builder: { bricks: 0 }
  });
  assert.match(fresh, /preschool-badge-new-chip/);
  assert.doesNotMatch(viewed, /preschool-badge-new-chip/);
});

test('preserves seen ids when a later badge unlocks', () => {
  const result = engine.checkAchievements(makeState({
    mastery: masteryOf(50),
    achievements: {
      unlocked: ['GARDEN_BRONZE'],
      history: [{ id: 'GARDEN_BRONZE', unlockedAt: 1 }],
      lastShown: 'GARDEN_BRONZE',
      seen: ['GARDEN_BRONZE']
    }
  }), { now: 9 });
  assert.deepEqual(result.growth.achievements.seen, ['GARDEN_BRONZE']);
  assert.ok(result.newlyUnlocked.includes('GARDEN_SILVER'));
  assert.ok(!result.growth.achievements.seen.includes('GARDEN_SILVER'));
});

test('unlocks literacy and english level badges when bands advance', () => {
  const stats = {
    garden: { flowers: 0 },
    adventure: { days: 0 },
    builder: { bricks: 0 },
    levels: {
      literacy: { maxUnlocked: 'L3', maxIndex: 2 },
      english: { maxUnlocked: 'L2', maxIndex: 1 }
    }
  };
  const result = engine.checkAchievements(makeState({}), { stats: stats, now: 11 });
  assert.ok(result.newlyUnlocked.includes('LITERACY_L2'));
  assert.ok(result.newlyUnlocked.includes('LITERACY_L3'));
  assert.ok(result.newlyUnlocked.includes('ENGLISH_L2'));
  assert.ok(!result.newlyUnlocked.includes('LITERACY_L4'));
  assert.ok(!result.newlyUnlocked.includes('ENGLISH_L3'));

  const html = engine.renderCelebrationHtml(['LITERACY_L3']);
  assert.match(html, /识字 L3/);
  assert.match(html, /分级/);
});

test('preschool shell loads the achievement module before app.js', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool-workbench.css'), 'utf8');
  assert.match(html, /preschool-achievements\.js/);
  assert.ok(html.indexOf('preschool-achievements.js') < html.indexOf('app.js'));
  assert.match(app, /PersonalWorkbenchAchievements/);
  assert.match(app, /applyPreschoolAchievements|checkAchievements/);
  assert.match(app, /togglePreschoolBadgeBox/);
  assert.match(app, /review-badge/);
  assert.match(app, /filter-badge-group/);
  assert.match(app, /badge-confetti/);
  assert.match(app, /markPreschoolBadgesSeen/);
  assert.match(css, /29-achievements\.css/);
});
