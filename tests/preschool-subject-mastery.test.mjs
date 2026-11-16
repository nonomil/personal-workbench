import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');

function loadCourses() {
  const box = {};
  box.window = box;
  box.globalThis = box;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'child-courses.js'), 'utf8'), box);
  return box.PersonalWorkbenchChildCourses;
}

function record(courses, subject, key, input) {
  assert.equal(typeof courses.recordSubjectAttempt, 'function', 'recordSubjectAttempt API missing');
  return courses.recordSubjectAttempt(subject, key, input);
}

test('first subject attempt records evidence without claiming mastery', () => {
  const courses = loadCourses();
  const result = record(courses, { mastery: {} }, 'b', {
    date: '2026-08-24',
    correct: true,
    activityType: 'self-check'
  });
  const entry = result.mastery.b;

  assert.equal(entry.state, 'practicing');
  assert.equal(entry.attempts, 1);
  assert.equal(entry.correct, 1);
  assert.equal(entry.accuracy, 1);
  assert.deepEqual(Array.from(entry.dates), ['2026-08-24']);
  assert.deepEqual(Array.from(entry.activityTypes), ['self-check']);
  assert.equal(entry.nextReview, '2026-08-25');
  assert.equal(entry.reviewRound, 1);
});

test('two dates and two activity types at 80 percent accuracy unlock ready', () => {
  const courses = loadCourses();
  let subject = record(courses, { mastery: {} }, 'b', {
    date: '2026-08-24',
    correct: true,
    activityType: 'self-check'
  });
  subject = record(courses, subject, 'b', {
    date: '2026-08-25',
    correct: true,
    activityType: 'pinyin-initial'
  });

  const entry = subject.mastery.b;
  assert.equal(entry.state, 'ready');
  assert.equal(entry.attempts, 2);
  assert.equal(entry.correct, 2);
  assert.equal(entry.accuracy, 1);
  assert.deepEqual(Array.from(entry.dates), ['2026-08-24', '2026-08-25']);
  assert.deepEqual(Array.from(entry.activityTypes), ['self-check', 'pinyin-initial']);
  assert.equal(entry.nextReview, '2026-08-28');
});

test('wrong answer returns an item to practicing and makes it due today', () => {
  const courses = loadCourses();
  const ready = {
    mastery: {
      b: {
        state: 'ready',
        dates: ['2026-08-23', '2026-08-24'],
        activityTypes: ['self-check', 'pinyin-initial'],
        attempts: 2,
        correct: 2,
        accuracy: 1,
        nextReview: '2026-08-25',
        reviewRound: 2
      }
    }
  };
  const result = record(courses, ready, 'b', {
    date: '2026-08-25',
    correct: false,
    activityType: 'pinyin-initial'
  });
  const entry = result.mastery.b;

  assert.equal(entry.state, 'practicing');
  assert.equal(entry.attempts, 3);
  assert.equal(entry.correct, 2);
  assert.equal(entry.accuracy, 2 / 3);
  assert.equal(entry.nextReview, '2026-08-25');
  assert.equal(entry.reviewRound, 0);
});

test('normalization preserves simple-subject review evidence', () => {
  const courses = loadCourses();
  const normalized = courses.normalize({
    pinyin: {
      mastery: {
        b: {
          state: 'practicing',
          dates: ['2026-08-24'],
          activityTypes: ['self-check'],
          attempts: 1,
          correct: 1,
          accuracy: 1,
          nextReview: '2026-08-25',
          reviewRound: 1
        }
      }
    }
  });
  const entry = normalized.pinyin.mastery.b;

  assert.deepEqual(Array.from(entry.activityTypes), ['self-check']);
  assert.equal(entry.accuracy, 1);
  assert.equal(entry.nextReview, '2026-08-25');
  assert.equal(entry.reviewRound, 1);
});
