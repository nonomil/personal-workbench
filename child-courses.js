(function (global) {
    'use strict';

    function createDefaultProgress() {
        return { completedLessonIds: [] };
    }

    function normalize(input) {
        const source = input && typeof input === 'object' ? input : {};
        return { completedLessonIds: Array.isArray(source.completedLessonIds) ? source.completedLessonIds.filter(item => typeof item === 'string') : [] };
    }

    function completeLesson(input, lessonId) {
        const progress = normalize(input);
        if (!lessonId || progress.completedLessonIds.includes(lessonId)) return { progress: progress, changed: false };
        progress.completedLessonIds.push(lessonId);
        return { progress: progress, changed: true };
    }

    function getCourseView(catalog, input) {
        const progress = normalize(input);
        const completed = new Set(progress.completedLessonIds);
        return (Array.isArray(catalog) ? catalog : []).map(function (course) {
            const lessons = Array.isArray(course.lessons) ? course.lessons : [];
            const done = lessons.filter(item => completed.has(item.id)).length;
            return Object.assign({}, course, { completed: done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 });
        });
    }

    global.PersonalWorkbenchChildCourses = { createDefaultProgress: createDefaultProgress, normalize: normalize, completeLesson: completeLesson, getCourseView: getCourseView };
})(typeof window !== 'undefined' ? window : globalThis);
