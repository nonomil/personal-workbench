import assert from 'node:assert/strict';
import test from 'node:test';

await import('../prj/child-courses.js');
const courses = globalThis.PersonalWorkbenchChildCourses;

test('completes each lesson once and keeps subject progress isolated', () => {
  const initial = courses.createDefaultProgress();
  const first = courses.completeLesson(initial, 'course-math-1');
  const duplicate = courses.completeLesson(first.progress, 'course-math-1');
  assert.equal(first.changed, true);
  assert.equal(duplicate.changed, false);
  assert.deepEqual(duplicate.progress.completedLessonIds, ['course-math-1']);
});

test('calculates completion percentages for Chinese, math and English lessons', () => {
  const progress = { completedLessonIds: ['course-chinese-1', 'course-chinese-2', 'course-math-1'] };
  const catalog = [
    { id: 'chinese', lessons: [{ id: 'course-chinese-1' }, { id: 'course-chinese-2' }, { id: 'course-chinese-3' }] },
    { id: 'math', lessons: [{ id: 'course-math-1' }, { id: 'course-math-2' }] },
    { id: 'english', lessons: [{ id: 'course-english-1' }] }
  ];
  const view = courses.getCourseView(catalog, progress);
  assert.equal(view.find(item => item.id === 'chinese').percent, 67);
  assert.equal(view.find(item => item.id === 'math').percent, 50);
  assert.equal(view.find(item => item.id === 'english').percent, 0);
});
