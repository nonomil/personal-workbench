(function (global) {
    'use strict';

    function createDefaultProgress() {
        return {
            completedLessonIds: [],
            literacy: { mastery: {} },
            english: { mastery: {} },
            pinyin: { mastery: {} },
            poetry: { mastery: {} },
            math: { mastery: {} },
            motion: { mastery: {} },
            phonics: { mastery: {} },
            phonics: { mastery: {} }
        };
    }

    function normalizeSimpleMastery(source) {
        const root = source && typeof source === 'object' ? source : {};
        const mastery = root.mastery && typeof root.mastery === 'object' ? root.mastery : {};
        const cleaned = {};
        Object.keys(mastery).forEach(function (key) {
            const item = mastery[key] && typeof mastery[key] === 'object' ? mastery[key] : {};
            cleaned[key] = {
                state: ['introduced', 'practicing', 'ready', 'maintenance'].indexOf(item.state) >= 0 ? item.state : 'introduced',
                dates: Array.isArray(item.dates) ? item.dates.filter(function (date) { return typeof date === 'string'; }) : [],
                attempts: Math.max(0, Number(item.attempts) || 0),
                correct: Math.max(0, Number(item.correct) || 0)
            };
        });
        return { mastery: cleaned };
    }

    function normalizeLiteracy(source) {
        const literacy = source && source.literacy && typeof source.literacy === 'object' ? source.literacy : {};
        const mastery = literacy.mastery && typeof literacy.mastery === 'object' ? literacy.mastery : {};
        const cleaned = {};
        Object.keys(mastery).forEach(function (char) {
            const item = mastery[char] && typeof mastery[char] === 'object' ? mastery[char] : {};
            cleaned[char] = {
                state: ['introduced', 'practicing', 'ready', 'maintenance'].indexOf(item.state) >= 0 ? item.state : 'introduced',
                dates: Array.isArray(item.dates) ? item.dates.filter(function (date) { return typeof date === 'string'; }) : [],
                activityTypes: Array.isArray(item.activityTypes) ? item.activityTypes.filter(function (type) { return typeof type === 'string'; }) : [],
                attempts: Math.max(0, Number(item.attempts) || 0),
                correct: Math.max(0, Number(item.correct) || 0),
                accuracy: Number(item.accuracy) || 0,
                nextReview: String(item.nextReview || ''),
                sunlightDelta: 0
            };
        });
        return { mastery: cleaned };
    }

    function normalizeEnglish(source) {
        const english = source && source.english && typeof source.english === 'object' ? source.english : {};
        const mastery = english.mastery && typeof english.mastery === 'object' ? english.mastery : {};
        const cleaned = {};
        Object.keys(mastery).forEach(function (word) {
            const item = mastery[word] && typeof mastery[word] === 'object' ? mastery[word] : {};
            cleaned[word] = {
                state: ['introduced', 'practicing', 'ready', 'maintenance'].indexOf(item.state) >= 0 ? item.state : 'introduced',
                dates: Array.isArray(item.dates) ? item.dates.filter(function (date) { return typeof date === 'string'; }) : [],
                attempts: Math.max(0, Number(item.attempts) || 0),
                correct: Math.max(0, Number(item.correct) || 0),
                nextReview: String(item.nextReview || ''),
                sunlightDelta: 0
            };
        });
        return { mastery: cleaned };
    }

    function normalize(input) {
        const source = input && typeof input === 'object' ? input : {};
        return {
            completedLessonIds: Array.isArray(source.completedLessonIds) ? source.completedLessonIds.filter(item => typeof item === 'string') : [],
            literacy: normalizeLiteracy(source),
            english: normalizeEnglish(source),
            pinyin: normalizeSimpleMastery(source.pinyin),
            poetry: normalizeSimpleMastery(source.poetry),
            math: normalizeSimpleMastery(source.math),
            motion: normalizeSimpleMastery(source.motion),
            phonics: normalizeSimpleMastery(source.phonics),
            phonics: normalizeSimpleMastery(source.phonics)
        };
    }

    function completeLesson(input, lessonId) {
        const progress = normalize(input);
        if (!lessonId || progress.completedLessonIds.includes(lessonId)) return { progress: progress, changed: false };
        progress.completedLessonIds.push(lessonId);
        return { progress: progress, changed: true };
    }

    function saveLiteracy(input, literacy) {
        const progress = normalize(input);
        progress.literacy = normalizeLiteracy({ literacy: literacy });
        return progress;
    }

    function saveEnglish(input, english) {
        const progress = normalize(input);
        progress.english = normalizeEnglish({ english: english });
        return progress;
    }

    function saveSubject(input, field, subject) {
        const progress = normalize(input);
        progress[field] = normalizeSimpleMastery(subject && subject.mastery ? subject : { mastery: subject });
        return progress;
    }

    function markSubjectReady(subject, keys, date) {
        const current = normalizeSimpleMastery(subject);
        const mastery = current.mastery;
        (Array.isArray(keys) ? keys : []).forEach(function (key) {
            if (!key) return;
            const seen = Array.isArray(mastery[key] && mastery[key].dates) ? mastery[key].dates : [];
            mastery[key] = {
                state: 'ready',
                dates: seen.indexOf(date) >= 0 ? seen : seen.concat([date]),
                attempts: Math.max(1, Number(mastery[key] && mastery[key].attempts) || 0) + 1,
                correct: Math.max(1, Number(mastery[key] && mastery[key].correct) || 0) + 1
            };
        });
        return current;
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

    global.PersonalWorkbenchChildCourses = {
        createDefaultProgress: createDefaultProgress,
        normalize: normalize,
        completeLesson: completeLesson,
        saveLiteracy: saveLiteracy,
        saveEnglish: saveEnglish,
        saveSubject: saveSubject,
        markSubjectReady: markSubjectReady,
        getCourseView: getCourseView
    };
})(typeof window !== 'undefined' ? window : globalThis);
