(function (global) {
    'use strict';

    const STATES = ['introduced', 'practicing', 'ready', 'maintenance'];
    const DEFAULT_INTERVALS = [1, 3, 7, 14];

    function rowLevel(row) {
        if (!Array.isArray(row)) return 'L1';
        for (let index = row.length - 1; index >= 4; index -= 1) {
            const value = String(row[index] || '').trim();
            if (/^L[1-5]$/.test(value)) return value;
        }
        return 'L1';
    }

    function rowExplain(row) {
        if (!Array.isArray(row) || row.length < 5) return '';
        const fifth = String(row[4] || '').trim();
        if (/^L[1-5]$/.test(fifth)) return '';
        return fifth;
    }

    function getLevelHelper() {
        return global.PersonalWorkbenchBankLevels || null;
    }

    function scopedBank(bank, level) {
        const helper = getLevelHelper();
        if (!helper || !level) return Array.isArray(bank) ? bank : [];
        return helper.levelPoolOrAll(bank, level);
    }

    function parseBank(raw) {
        return (Array.isArray(raw) ? raw : []).map(function (row) {
            const words = Array.isArray(row && row[3]) ? row[3].map(function (word) { return String(word || '').trim(); }).filter(Boolean) : [];
            return {
                char: String(row && row[0] || '').trim(),
                pinyin: String(row && row[1] || '').trim(),
                theme: String(row && row[2] || '').trim(),
                words: words,
                explain: rowExplain(row),
                level: rowLevel(row)
            };
        }).filter(function (item) {
            return item.char.length === 1;
        });
    }

    function findChar(bank, char) {
        return (Array.isArray(bank) ? bank : []).find(function (item) { return item.char === char; }) || null;
    }

    function otherItems(bank, char) {
        return (Array.isArray(bank) ? bank : []).filter(function (item) { return item.char !== char; });
    }

    function buildLoop(bank, char) {
        const item = findChar(bank, char);
        if (!item) return null;
        const others = otherItems(bank, char);
        const practiceOptions = [{ label: item.words[0] || item.char, value: item.char }].concat(
            others.slice(0, 3).map(function (entry) {
                return { label: entry.words[0] || entry.char, value: entry.char };
            })
        );
        const quizOptions = [{ label: item.char, value: item.char }].concat(
            others.slice(0, 3).map(function (entry) {
                return { label: entry.char, value: entry.char };
            })
        );
        const practiceShuffled = shuffleChoice(practiceOptions, 0);
        const quizShuffled = shuffleChoice(quizOptions, 0);
        return {
            char: item.char,
            pinyin: item.pinyin,
            theme: item.theme,
            word: item.words[0] || '',
            steps: [
                { kind: 'recognize', prompt: '先认这个字', char: item.char, pinyin: item.pinyin, word: item.words[0] || '', speak: item.char },
                { kind: 'practice', prompt: '哪个词里有这个字？', options: practiceShuffled.options, answer: practiceShuffled.answer, speak: item.words[0] || item.char },
                { kind: 'quiz', prompt: '听一听，选出刚才的字', options: quizShuffled.options, answer: quizShuffled.answer, speak: item.pinyin || item.char }
            ]
        };
    }

    function shuffleChoice(options, answer) {
        const items = (Array.isArray(options) ? options : []).slice();
        const correct = items[answer];
        for (let i = items.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            const swap = items[i];
            items[i] = items[j];
            items[j] = swap;
        }
        return {
            options: items,
            answer: Math.max(0, items.findIndex(function (item) { return item === correct; }))
        };
    }

    function buildWordBloom(bank, char) {
        const item = findChar(bank, char);
        if (!item) return null;
        const correct = item.words.slice(0, 3).map(function (word) {
            return { word: word, correct: true };
        });
        const distractors = [];
        otherItems(bank, char).forEach(function (entry) {
            entry.words.forEach(function (word) {
                if (word.indexOf(char) === -1 && distractors.length < 4) distractors.push({ word: word, correct: false });
            });
        });
        return {
            char: item.char,
            pinyin: item.pinyin,
            prompt: '选出带“' + item.char + '”的词',
            options: shuffleChoice(correct.concat(distractors).slice(0, 8), 0).options
        };
    }

    function createDefaultProgress() {
        return { mastery: {} };
    }

    function cloneProgress(progress) {
        const source = progress && typeof progress === 'object' ? progress : {};
        const mastery = source.mastery && typeof source.mastery === 'object' ? source.mastery : {};
        const next = { mastery: {} };
        Object.keys(mastery).forEach(function (char) {
            const item = mastery[char] && typeof mastery[char] === 'object' ? mastery[char] : {};
            next.mastery[char] = {
                state: STATES.indexOf(item.state) >= 0 ? item.state : 'introduced',
                dates: Array.isArray(item.dates) ? item.dates.filter(function (date) { return typeof date === 'string'; }).slice() : [],
                activityTypes: Array.isArray(item.activityTypes) ? item.activityTypes.filter(function (type) { return typeof type === 'string'; }).slice() : [],
                attempts: Math.max(0, Number(item.attempts) || 0),
                correct: Math.max(0, Number(item.correct) || 0),
                accuracy: Number(item.accuracy) || 0,
                nextReview: String(item.nextReview || ''),
                sunlightDelta: 0
            };
        });
        return next;
    }

    function addDays(date, days) {
        const stamp = new Date(String(date) + 'T12:00:00');
        if (Number.isNaN(stamp.getTime())) return String(date || '');
        stamp.setDate(stamp.getDate() + Number(days || 0));
        const year = stamp.getFullYear();
        const month = String(stamp.getMonth() + 1).padStart(2, '0');
        const day = String(stamp.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function intervalDays(state, rules) {
        const intervals = Array.isArray(rules && rules.reviewIntervalsDays) && rules.reviewIntervalsDays.length
            ? rules.reviewIntervalsDays
            : DEFAULT_INTERVALS;
        if (state === 'maintenance') return intervals[3] || 14;
        if (state === 'ready') return intervals[1] || 3;
        return intervals[0] || 1;
    }

    function applyReadyRule(item, rules) {
        const ready = rules && rules.readyRule ? rules.readyRule : {};
        const minActivities = Number(ready.minimumActivities) || 2;
        const minDates = Number(ready.minimumDistinctDates) || 2;
        const minAccuracy = Number(ready.minimumAccuracy) || 0.8;
        const mustDiffer = ready.activityTypesMustDiffer !== false;
        const distinctTypes = new Set(item.activityTypes);
        const readyNow = item.attempts >= minActivities
            && item.dates.length >= minDates
            && item.accuracy >= minAccuracy
            && (!mustDiffer || distinctTypes.size >= 2);
        if (item.state === 'maintenance') return 'maintenance';
        if (readyNow) return 'ready';
        if (item.attempts > 0) return 'practicing';
        return 'introduced';
    }

    function recordAttempt(progress, char, attempt, rules) {
        const next = cloneProgress(progress);
        const current = next.mastery[char] || {
            state: 'introduced',
            dates: [],
            activityTypes: [],
            attempts: 0,
            correct: 0,
            accuracy: 0,
            nextReview: '',
            sunlightDelta: 0
        };
        const date = String(attempt && attempt.date || '');
        const activityType = String(attempt && attempt.activityType || 'quiz');
        const correct = !!(attempt && attempt.correct);
        current.attempts += 1;
        if (correct) current.correct += 1;
        current.accuracy = current.attempts ? current.correct / current.attempts : 0;
        if (date && current.dates.indexOf(date) === -1) current.dates.push(date);
        if (activityType && current.activityTypes.indexOf(activityType) === -1) current.activityTypes.push(activityType);
        current.state = applyReadyRule(current, rules);
        current.nextReview = addDays(date, intervalDays(current.state, rules));
        current.sunlightDelta = 0;
        next.mastery[char] = current;
        return next;
    }

    function buildReviewQueue(progress, rules, today, chars) {
        const mastery = progress && progress.mastery ? progress.mastery : {};
        const available = Array.isArray(chars) ? chars : Object.keys(mastery);
        return available.filter(function (char) {
            const item = mastery[char];
            return item && item.nextReview && String(item.nextReview) <= String(today);
        });
    }

    function pickTodayChar(bank, progress, rules, today, preferred, level) {
        const items = scopedBank(bank, level);
        const chars = items.map(function (item) { return item.char; });
        const due = buildReviewQueue(progress, rules, today, chars);
        if (due.length) return due[0];
        const mastery = progress && progress.mastery ? progress.mastery : {};
        const unseen = chars.filter(function (char) { return !mastery[char]; });
        if (preferred && unseen.indexOf(preferred) >= 0) return preferred;
        if (unseen.length) return unseen[0];
        const practicing = chars.filter(function (char) {
            const item = mastery[char];
            return item && (item.state === 'introduced' || item.state === 'practicing');
        });
        if (practicing.length) return practicing[0];
        if (preferred && chars.indexOf(preferred) >= 0) return preferred;
        return chars[0] || '';
    }

    function buildFindRun(bank, progress, rules, today, preferred, roundCount, level) {
        const items = scopedBank(bank, level);
        const count = Math.max(1, Math.min(items.length, Number(roundCount) || 5));
        const used = [];
        const rounds = [];
        for (let i = 0; i < count; i += 1) {
            const remaining = items.filter(function (item) { return used.indexOf(item.char) === -1; });
            const char = pickTodayChar(remaining.length ? remaining : items, progress, rules, today, i === 0 ? preferred : '');
            const item = findChar(items, char);
            if (!item || used.indexOf(item.char) >= 0) break;
            used.push(item.char);
            const others = otherItems(items, item.char);
            const themed = others.filter(function (entry) { return entry.theme === item.theme; });
            const pool = (themed.length >= 3 ? themed : others).slice(0, 3);
            const options = [{ label: item.char, value: item.char }].concat(
                pool.map(function (entry) { return { label: entry.char, value: entry.char }; })
            );
            const shuffled = shuffleChoice(options, 0);
            rounds.push({
                char: item.char,
                pinyin: item.pinyin,
                word: item.words[0] || '',
                prompt: '听一听，点出这个字',
                options: shuffled.options,
                answer: shuffled.answer,
                speak: item.pinyin || item.char
            });
        }
        return { rounds: rounds };
    }

    function buildFlashBatch(bank, progress, rules, today, preferred, size, level) {
        const items = scopedBank(bank, level);
        const count = Math.max(1, Math.min(items.length, Number(size) || 8));
        const used = [];
        const batch = [];
        for (let i = 0; i < count; i += 1) {
            const remaining = items.filter(function (item) { return used.indexOf(item.char) === -1; });
            const char = pickTodayChar(remaining.length ? remaining : items, progress, rules, today, i === 0 ? preferred : '');
            const item = findChar(items, char);
            if (!item || used.indexOf(item.char) >= 0) break;
            used.push(item.char);
            batch.push({
                char: item.char,
                pinyin: item.pinyin,
                words: item.words.slice(),
                mark: null
            });
        }
        return batch;
    }

    function buildExplain(item) {
        if (item && item.explain) return item.explain;
        const words = item && Array.isArray(item.words) ? item.words.slice(0, 2) : [];
        if (!words.length) return '先认这个字，再放到词里读一读。';
        return '用组词来记：「' + words.join('」「') + '」。看见这些词，就能找到「' + item.char + '」。';
    }

    function getStrokeData(char) {
        const pack = global.PersonalWorkbenchLiteracyStrokes;
        const item = pack && pack.chars && pack.chars[char];
        if (!item || !Array.isArray(item.strokes) || !item.strokes.length) return null;
        return { char: char, strokes: item.strokes.slice() };
    }

    function buildTeachCard(bank, char) {
        const item = findChar(bank, char);
        if (!item) return null;
        const strokes = getStrokeData(char);
        return {
            char: item.char,
            pinyin: item.pinyin,
            words: item.words.slice(0, 3),
            explain: buildExplain(item),
            speak: item.char,
            strokes: strokes ? strokes.strokes : []
        };
    }

    function markFlash(progress, char, known, date, rules) {
        const next = cloneProgress(progress);
        const current = next.mastery[char] || {
            state: 'introduced',
            dates: [],
            activityTypes: [],
            attempts: 0,
            correct: 0,
            accuracy: 0,
            nextReview: '',
            sunlightDelta: 0
        };
        const stamp = String(date || '');
        current.attempts += 1;
        if (known) current.correct += 1;
        current.accuracy = current.attempts ? current.correct / current.attempts : 0;
        if (stamp && current.dates.indexOf(stamp) === -1) current.dates.push(stamp);
        if (current.activityTypes.indexOf('flash') === -1) current.activityTypes.push('flash');
        current.state = known ? (current.state === 'maintenance' ? 'maintenance' : 'ready') : 'practicing';
        current.nextReview = addDays(stamp, intervalDays(current.state, rules));
        current.sunlightDelta = 0;
        next.mastery[char] = current;
        return next;
    }

    function summarizeMastery(progress) {
        const mastery = progress && progress.mastery ? progress.mastery : {};
        let known = 0;
        let unknown = 0;
        Object.keys(mastery).forEach(function (char) {
            const state = mastery[char] && mastery[char].state;
            if (state === 'ready' || state === 'maintenance') known += 1;
            else unknown += 1;
        });
        return { known: known, unknown: unknown, total: known + unknown };
    }

    function getRuntimeBank() {
        const data = global.PersonalWorkbenchLiteracyData;
        return parseBank(data && data.bank);
    }

    function getRuntimeRules() {
        const data = global.PersonalWorkbenchLiteracyData;
        return data && data.reviewRules ? data.reviewRules : { reviewIntervalsDays: DEFAULT_INTERVALS };
    }

    global.PersonalWorkbenchPreschoolLiteracy = {
        parseBank: parseBank,
        findChar: findChar,
        buildLoop: buildLoop,
        buildWordBloom: buildWordBloom,
        createDefaultProgress: createDefaultProgress,
        recordAttempt: recordAttempt,
        buildReviewQueue: buildReviewQueue,
        pickTodayChar: pickTodayChar,
        buildFindRun: buildFindRun,
        buildFlashBatch: buildFlashBatch,
        buildTeachCard: buildTeachCard,
        getStrokeData: getStrokeData,
        markFlash: markFlash,
        summarizeMastery: summarizeMastery,
        getRuntimeBank: getRuntimeBank,
        getRuntimeRules: getRuntimeRules
    };
})(typeof window !== 'undefined' ? window : globalThis);
