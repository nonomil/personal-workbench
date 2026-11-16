(function (global) {
    'use strict';

    const SIMPLE_REVIEW_INTERVALS = [1, 3, 7, 14];
    const SIMPLE_READY_RULE = {
        minimumActivities: 2,
        minimumDistinctDates: 2,
        minimumAccuracy: 0.8,
        activityTypesMustDiffer: true
    };

    function uniqueStrings(values) {
        const seen = {};
        return (Array.isArray(values) ? values : []).filter(function (value) {
            if (typeof value !== 'string' || !value || seen[value]) return false;
            seen[value] = true;
            return true;
        });
    }

    function addDateDays(date, days) {
        const match = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return String(date || '');
        const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
        value.setUTCDate(value.getUTCDate() + Math.max(0, Number(days) || 0));
        return value.toISOString().slice(0, 10);
    }

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
            const attempts = Math.max(0, Number(item.attempts) || 0);
            const correct = Math.max(0, Number(item.correct) || 0);
            const storedAccuracy = Number(item.accuracy);
            cleaned[key] = {
                state: ['introduced', 'practicing', 'ready', 'maintenance'].indexOf(item.state) >= 0 ? item.state : 'introduced',
                dates: uniqueStrings(item.dates),
                activityTypes: uniqueStrings(item.activityTypes),
                attempts: attempts,
                correct: correct,
                accuracy: Number.isFinite(storedAccuracy) ? Math.max(0, Math.min(1, storedAccuracy)) : (attempts ? Math.max(0, Math.min(1, correct / attempts)) : 0),
                nextReview: String(item.nextReview || ''),
                reviewRound: Math.max(0, Number(item.reviewRound) || 0)
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

    function normalizeEvents(list) {
        const out = [];
        (Array.isArray(list) ? list : []).forEach(function (item) {
            if (!item || typeof item !== 'object') return;
            out.push({
                ts: String(item.ts || ''),
                mode: String(item.mode || ''),
                correct: !!item.correct,
                source: String(item.source || 'workbench')
            });
        });
        return out.slice(-20);
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
                quiz: normalizeEnglishQuiz(item.quiz),
                events: normalizeEvents(item.events),
                planVersion: Number(item.planVersion) === 2 ? 2 : (Number(item.planVersion) === 1 ? 1 : undefined),
                reviewRound: Math.max(0, Number(item.reviewRound) || 0)
            };
            if (!cleaned[word].planVersion) delete cleaned[word].planVersion;
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

    function recordSubjectAttempt(subject, key, input) {
        const current = normalizeSimpleMastery(subject);
        const itemKey = String(key || '');
        if (!itemKey) return current;
        const options = input && typeof input === 'object' ? input : {};
        const date = String(options.date || new Date().toISOString().slice(0, 10));
        const activityType = String(options.activityType || 'practice');
        const correctAttempt = options.correct === true;
        const previous = current.mastery[itemKey] || {
            state: 'introduced',
            dates: [],
            activityTypes: [],
            attempts: 0,
            correct: 0,
            accuracy: 0,
            nextReview: '',
            reviewRound: 0
        };
        const dates = uniqueStrings(previous.dates.concat(date ? [date] : []));
        const activityTypes = uniqueStrings(previous.activityTypes.concat(activityType ? [activityType] : []));
        const attempts = previous.attempts + 1;
        const correct = previous.correct + (correctAttempt ? 1 : 0);
        const accuracy = attempts ? correct / attempts : 0;
        const readyRule = Object.assign({}, SIMPLE_READY_RULE, options.readyRule || {});
        const enoughActivities = attempts >= Math.max(1, Number(readyRule.minimumActivities) || 1);
        const enoughDates = dates.length >= Math.max(1, Number(readyRule.minimumDistinctDates) || 1);
        const enoughTypes = !readyRule.activityTypesMustDiffer || activityTypes.length >= 2;
        const meetsReady = enoughActivities && enoughDates && enoughTypes && accuracy >= Math.max(0, Number(readyRule.minimumAccuracy) || 0);
        const intervals = Array.isArray(options.reviewIntervalsDays) && options.reviewIntervalsDays.length
            ? options.reviewIntervalsDays.map(function (value) { return Math.max(0, Number(value) || 0); })
            : SIMPLE_REVIEW_INTERVALS;
        const reviewRound = correctAttempt
            ? Math.min(intervals.length, Math.max(0, Number(previous.reviewRound) || 0) + 1)
            : 0;
        let state = 'practicing';
        if (correctAttempt && meetsReady) {
            state = previous.state === 'ready' && reviewRound >= intervals.length ? 'maintenance' : 'ready';
            if (previous.state === 'maintenance') state = 'maintenance';
        }
        const intervalIndex = Math.max(0, Math.min(intervals.length - 1, reviewRound - 1));
        current.mastery[itemKey] = {
            state: state,
            dates: dates,
            activityTypes: activityTypes,
            attempts: attempts,
            correct: correct,
            accuracy: accuracy,
            nextReview: correctAttempt ? addDateDays(date, intervals[intervalIndex] || 0) : date,
            reviewRound: reviewRound
        };
        return current;
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
        recordSubjectAttempt: recordSubjectAttempt,
        markSubjectReady: markSubjectReady,
        getCourseView: getCourseView,
        buildLearningSummary: buildLearningSummary
    };
})(typeof window !== 'undefined' ? window : globalThis);
