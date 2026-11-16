import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function section(from, to) {
  const start = app.indexOf(from);
  const end = app.indexOf(to, start + from.length);
  assert.notEqual(start, -1, `${from} missing`);
  assert.notEqual(end, -1, `${to} missing`);
  return app.slice(start, end);
}

test('lesson completion no longer promotes every subject item to ready', () => {
  const completion = section('function recordSubjectProgressFromLesson', 'function getCourseTrackProgress');
  assert.doesNotMatch(completion, /markSubjectReady/);
});

test('subject flashcards emit self-check attempts instead of direct ready marks', () => {
  const commit = section('function commitPreschoolSubjectMark', 'function markPreschoolPoem');
  assert.match(commit, /recordSubjectAttempt/);
  assert.match(commit, /activityType:\s*'self-check'/);
  assert.doesNotMatch(commit, /markSubjectReady/);
});

test('bank quiz answers emit pinyin poetry math and phonics evidence immediately', () => {
  const answer = section('function answerLesson', 'function finishLesson');
  assert.match(app, /function recordPreschoolSubjectAttempt/);
  assert.match(answer, /recordPreschoolSubjectAttempt\(match, bankQuiz, round, correct\)/);
  assert.match(app, /track === 'pinyin'/);
  assert.match(app, /track === 'poetry'/);
  assert.match(app, /track === 'math'/);
  assert.match(app, /track === 'phonics'/);
});
