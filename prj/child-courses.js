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
            minecraft: { mastery: {} }
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
        const assessments = Array.isArray(literacy.assessments) ? literacy.assessments : [];
        return {
            mastery: cleaned,
            assessments: assessments.filter(function (item) {
                return item && typeof item === 'object';
            }).map(function (item) {
                return {
                    date: String(item.date || ''),
                    estimate: Math.max(0, Number(item.estimate) || 0),
                    confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
                    level: /^L[1-5]$/.test(String(item.level || '')) ? String(item.level) : 'L1',
                    stage: String(item.stage || ''),
                    wrong: Array.isArray(item.wrong) ? item.wrong.map(function (char) { return String(char || ''); }).filter(Boolean) : []
                };
            }).slice(-24)
        };
    }

    function normalizeEnglishQuiz(source) {
        const quiz = source && typeof source === 'object' ? source : {};
        function bucket(name) {
            const item = quiz[name] && typeof quiz[name] === 'object' ? quiz[name] : {};
            return {
                attempts: Math.max(0, Number(item.attempts) || 0),
                correct: Math.max(0, Number(item.correct) || 0)
            };
        }
        return { listen: bucket('listen'), read: bucket('read'), spell: bucket('spell') };
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
                sunlightDelta: 0,
                masteredAt: String(item.masteredAt || ''),
                quiz: normalizeEnglishQuiz(item.quiz)
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
            minecraft: normalizeEnglish({ english: source.minecraft })
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

    function saveMinecraft(input, minecraft) {
        const progress = normalize(input);
        progress.minecraft = normalizeEnglish({ english: minecraft });
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

    function countTrack(root) {
        const mastery = root && root.mastery && typeof root.mastery === 'object' ? root.mastery : {};
        let known = 0;
        let unknown = 0;
        Object.keys(mastery).forEach(function (key) {
            const state = mastery[key] && mastery[key].state;
            if (state === 'ready' || state === 'maintenance') known += 1;
            else unknown += 1;
        });
        return { known: known, unknown: unknown, seen: known + unknown };
    }

    function rewardTitle(catalog, id) {
        const found = (Array.isArray(catalog) ? catalog : []).find(function (item) { return item && item.id === id; });
        return found && found.title ? String(found.title) : String(id || '');
    }

    function buildLearningSummary(input) {
        const source = input && typeof input === 'object' ? input : {};
        const progress = normalize(source.courseProgress);
        const mistakes = Array.isArray(source.mistakes) ? source.mistakes : [];
        const claimedIds = Array.isArray(source.claimedRewardIds) ? source.claimedRewardIds : [];
        const pendingIds = Array.isArray(source.pendingRewardIds) ? source.pendingRewardIds : [];
        const reviewQueue = Array.isArray(source.reviewQueue) ? source.reviewQueue : [];
        const rewards = Array.isArray(source.rewards) ? source.rewards : [];
        const openMistakes = mistakes.filter(function (item) { return item && item.status !== 'mastered'; });
        const masteredMistakes = mistakes.filter(function (item) { return item && item.status === 'mastered'; });
        return {
            streak: Math.max(0, Math.round(Number(source.streak) || 0)),
            subjects: [
                { id: 'literacy', title: '识字' },
                { id: 'english', title: '英语' },
                { id: 'pinyin', title: '拼音' },
                { id: 'poetry', title: '古诗' },
                { id: 'math', title: '数学' },
                { id: 'phonics', title: '拼读' }
            ].map(function (row) {
                const counts = countTrack(progress[row.id]);
                return { id: row.id, title: row.title, known: counts.known, unknown: counts.unknown };
            }),
            mistakes: {
                open: openMistakes.length,
                mastered: masteredMistakes.length,
                due: reviewQueue.length
            },
            rewards: {
                claimed: claimedIds.map(function (id) { return { id: id, title: rewardTitle(rewards, id) }; }),
                pending: pendingIds.map(function (id) { return { id: id, title: rewardTitle(rewards, id) }; })
            },
            literacyAssess: summarizeLiteracyAssess(progress.literacy)
        };
    }

    function summarizeLiteracyAssess(literacy) {
        const list = Array.isArray(literacy && literacy.assessments) ? literacy.assessments : [];
        const latest = list.length ? list[list.length - 1] : null;
        let best = null;
        list.forEach(function (item) {
            if (!item || Number(item.confidence) < 0.6) return;
            if (!best || Number(item.estimate) > Number(best.estimate)) best = item;
        });
        return { latest: latest, best: best, history: list };
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
        saveMinecraft: saveMinecraft,
        saveSubject: saveSubject,
        markSubjectReady: markSubjectReady,
        getCourseView: getCourseView,
        buildLearningSummary: buildLearningSummary
    };
})(typeof window !== 'undefined' ? window : globalThis);
