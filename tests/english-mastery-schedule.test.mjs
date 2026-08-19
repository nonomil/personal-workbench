import assert from 'node:assert/strict';
import test from 'node:test';

await import('../prj/child-courses.js');
await import('../prj/preschool-english-vocab.js');

const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;
const courses = globalThis.PersonalWorkbenchChildCourses;
const rules = { reviewIntervalsDays: [1, 3, 7, 14] };

test('markKnown appends an event with ts, mode, correct and source', () => {
  const next = vocab.markKnown(vocab.createDefaultProgress(), 'apple', true, '2026-08-14', rules, {
    source: 'blocklegend',
    now: '2026-08-14T12:00:00.000Z'
  });
  const events = next.mastery.apple.events;
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    ts: '2026-08-14T12:00:00.000Z',
    mode: 'self',
    correct: true,
    source: 'blocklegend'
  });
});

test('recordQuizAnswer appends a quiz event and keeps the error type as mode', () => {
  const next = vocab.recordQuizAnswer(vocab.createDefaultProgress(), 'panda', {
    type: 'listen',
    correct: false,
    date: '2026-08-14',
    rules: rules,
    source: 'workbench',
    now: '2026-08-14T08:00:00.000Z'
  });
  const events = next.mastery.panda.events;
  assert.equal(events.length, 1);
  assert.equal(events[0].mode, 'listen');
  assert.equal(events[0].correct, false);
  assert.equal(events[0].source, 'workbench');
  assert.equal(events[0].ts, '2026-08-14T08:00:00.000Z');
});

test('events keep the newest 20 and drop the oldest', () => {
  let progress = vocab.createDefaultProgress();
  for (let i = 0; i < 21; i += 1) {
    progress = vocab.markKnown(progress, 'cat', i % 2 === 0, '2026-08-14', rules, {
      source: 'workbench',
      now: '2026-08-14T00:00:00.000Z'
    });
    progress.mastery.cat.events[progress.mastery.cat.events.length - 1].ts = 'e' + i;
  }
  const events = progress.mastery.cat.events;
  assert.equal(events.length, 20);
  assert.equal(events[0].ts, 'e1');
  assert.equal(events[19].ts, 'e20');
});

test('old mastery without events still clones and can append', () => {
  const legacy = {
    mastery: {
      hello: { state: 'ready', dates: ['2026-08-14'], attempts: 1, correct: 1, nextReview: '2026-08-17' }
    }
  };
  const cloned = vocab.cloneProgress(legacy);
  assert.ok(!cloned.mastery.hello.events || cloned.mastery.hello.events.length === 0);
  const next = vocab.markKnown(cloned, 'hello', true, '2026-08-15', rules, { source: 'workbench' });
  assert.equal(next.mastery.hello.events.length, 1);
  assert.equal(next.mastery.hello.state, 'ready');
});

test('new words stamp planVersion 2 and next review in 6 hours', () => {
  const next = vocab.markKnown(vocab.createDefaultProgress(), 'sun', true, '2026-08-14', rules, {
    source: 'workbench',
    now: '2026-08-14T12:00:00.000Z'
  });
  assert.equal(next.mastery.sun.planVersion, 2);
  assert.equal(next.mastery.sun.nextReview, '2026-08-14T18:00:00.000Z');
});

test('v2 words walk the 6h/1/2/4/7/14/28 day table', () => {
  const steps = [
    ['2026-08-14T12:00:00.000Z', '2026-08-14T18:00:00.000Z'],
    ['2026-08-14T18:00:00.000Z', '2026-08-15T18:00:00.000Z'],
    ['2026-08-15T18:00:00.000Z', '2026-08-17T18:00:00.000Z'],
    ['2026-08-17T18:00:00.000Z', '2026-08-21T18:00:00.000Z'],
    ['2026-08-21T18:00:00.000Z', '2026-08-28T18:00:00.000Z'],
    ['2026-08-28T18:00:00.000Z', '2026-09-11T18:00:00.000Z'],
    ['2026-09-11T18:00:00.000Z', '2026-10-09T18:00:00.000Z']
  ];
  let progress = vocab.createDefaultProgress();
  steps.forEach(function (pair) {
    progress = vocab.markKnown(progress, 'moon', true, pair[0].slice(0, 10), rules, {
      source: 'workbench',
      now: pair[0]
    });
    assert.equal(progress.mastery.moon.planVersion, 2);
    assert.equal(progress.mastery.moon.nextReview, pair[1]);
  });
});

test('legacy words without planVersion stay on the 1/3/7/14 table', () => {
  const legacy = vocab.cloneProgress({
    mastery: {
      hello: { state: 'ready', dates: ['2026-08-14'], attempts: 1, correct: 1, nextReview: '2026-08-17' }
    }
  });
  assert.equal(legacy.mastery.hello.planVersion || 1, 1);
  const next = vocab.markKnown(legacy, 'hello', true, '2026-08-17', rules, {
    source: 'workbench',
    now: '2026-08-17T12:00:00.000Z'
  });
  assert.equal(next.mastery.hello.planVersion, 1);
  assert.equal(next.mastery.hello.nextReview, '2026-08-20T12:00:00.000Z');
  assert.equal(next.mastery.hello.state, 'ready');
});

test('review due window is 48 hours before overdue and never demotes', () => {
  const item = {
    state: 'ready',
    nextReview: '2026-08-14T12:00:00.000Z',
    planVersion: 2
  };
  assert.equal(vocab.isDue(item, '2026-08-14T12:00:00.000Z'), true);
  assert.equal(vocab.isOverdue(item, '2026-08-16T11:59:00.000Z'), false);
  assert.equal(vocab.isOverdue(item, '2026-08-16T12:01:00.000Z'), true);
  assert.equal(vocab.isDue(item, '2026-08-16T12:01:00.000Z'), true);
  const dated = { state: 'ready', nextReview: '2026-08-17' };
  assert.equal(vocab.isDue(dated, '2026-08-17T00:00:00.000Z'), true);
  assert.equal(vocab.isDue(dated, '2026-08-16T23:59:00.000Z'), false);

  const overdue = vocab.markKnown({
    mastery: {
      fox: {
        state: 'ready',
        dates: ['2026-08-01'],
        attempts: 2,
        correct: 2,
        nextReview: '2026-08-10T12:00:00.000Z',
        planVersion: 2,
        reviewRound: 3
      }
    }
  }, 'fox', true, '2026-08-19', rules, {
    source: 'workbench',
    now: '2026-08-19T12:00:00.000Z'
  });
  assert.equal(overdue.mastery.fox.state, 'ready');
  assert.equal(overdue.mastery.fox.planVersion, 2);
});

test('selectTodayTasks orders overdue then due then soon then a new-word quota', () => {
  const now = '2026-08-16T12:00:00.000Z';
  const mastery = {
    later: { state: 'ready', nextReview: '2026-08-20T12:00:00.000Z' },
    soon: { state: 'ready', nextReview: '2026-08-17T06:00:00.000Z' },
    due: { state: 'ready', nextReview: '2026-08-16T12:00:00.000Z' },
    overdue: { state: 'ready', nextReview: '2026-08-13T12:00:00.000Z' }
  };
  const words = ['later', 'soon', 'due', 'overdue', 'new1', 'new2', 'new3'];
  const picked = vocab.selectTodayTasks(mastery, now, 2, words);
  assert.deepEqual(picked.items.map(function (item) { return item.word + ':' + item.bucket; }), [
    'overdue:overdue',
    'due:due',
    'soon:soon',
    'new1:new',
    'new2:new'
  ]);
  assert.equal(picked.reviewCount, 3);
  assert.equal(picked.newCount, 2);
  assert.equal(picked.minutes, 3);
  assert.equal(picked.done, false);
  assert.equal(picked.empty, false);
});

test('selectTodayTasks gives a new-word guide when the bank is empty', () => {
  const picked = vocab.selectTodayTasks({}, '2026-08-16T12:00:00.000Z', 3, []);
  assert.deepEqual(picked.items, []);
  assert.equal(picked.empty, true);
  assert.equal(picked.done, false);
  assert.equal(picked.minutes, 0);
});

test('selectTodayTasks is done when reviews are clear and the new-word quota is already used', () => {
  const now = '2026-08-16T12:00:00.000Z';
  const mastery = {
    old: { state: 'ready', nextReview: '2026-08-20T12:00:00.000Z', dates: ['2026-08-01'] },
    fresh1: { state: 'introduced', dates: ['2026-08-16'], attempts: 1 },
    fresh2: { state: 'introduced', dates: ['2026-08-16'], attempts: 1 },
    fresh3: { state: 'introduced', dates: ['2026-08-16'], attempts: 1 }
  };
  const picked = vocab.selectTodayTasks(mastery, now, 3, ['old', 'fresh1', 'fresh2', 'fresh3', 'later']);
  assert.deepEqual(picked.items, []);
  assert.equal(picked.done, true);
  assert.equal(picked.empty, false);
  assert.equal(picked.newCount, 0);
});

test('saveMinecraft keeps events so game answers are not stripped', () => {
  const marked = vocab.markKnown(vocab.createDefaultProgress(), 'tree', true, '2026-08-14', rules, {
    source: 'blocklegend',
    now: '2026-08-14T12:00:00.000Z'
  });
  const saved = courses.saveMinecraft({}, marked);
  assert.equal(saved.minecraft.mastery.tree.events.length, 1);
  assert.equal(saved.minecraft.mastery.tree.events[0].source, 'blocklegend');
  assert.equal(saved.minecraft.mastery.tree.planVersion, 2);
});
