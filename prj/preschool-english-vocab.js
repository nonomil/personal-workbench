(function (global) {
    'use strict';

    const STATES = ['introduced', 'practicing', 'ready', 'maintenance'];
    const DEFAULT_INTERVALS = [1, 3, 7, 14];

    function localMedia(value) {
        const raw = String(value || '').trim();
        return /^https?:/i.test(raw) ? '' : raw;
    }

    function parseBank(raw) {
        return (Array.isArray(raw) ? raw : []).map(function (row) {
            const source = row && typeof row === 'object' ? row : {};
            const media = source.media && typeof source.media === 'object' ? source.media : {};
            const image = localMedia(media.image || source.image);
            const audio = localMedia(media.audio || source.audio);
            const art = String(media.art || source.art || '').trim();
            return {
                id: String(source.id || ''),
                kind: String(source.kind || 'english'),
                text: String(source.text || '').trim().toLowerCase(),
                zh: String(source.zh || '').trim(),
                theme: String(source.theme || '').trim(),
                phrase: String(source.phrase || '').trim(),
                phraseZh: String(source.phraseZh || '').trim(),
                level: String(source.level || 'L1').trim() || 'L1',
                image: image,
                audio: audio,
                art: art,
                media: { image: image, art: art, audio: audio },
                source: source.source,
                extra: source.extra && typeof source.extra === 'object' ? source.extra : {}
            };
        }).filter(function (item) {
            return item.text && item.zh && item.phrase && item.phraseZh;
        });
    }

    function createDefaultProgress() {
        return { mastery: {} };
    }

    function cloneProgress(progress) {
        const source = progress && progress.mastery && typeof progress.mastery === 'object' ? progress.mastery : {};
        const next = { mastery: {} };
        Object.keys(source).forEach(function (word) {
            const item = source[word] && typeof source[word] === 'object' ? source[word] : {};
            next.mastery[word] = {
                state: STATES.indexOf(item.state) >= 0 ? item.state : 'introduced',
                dates: Array.isArray(item.dates) ? item.dates.filter(function (date) { return typeof date === 'string'; }).slice() : [],
                attempts: Math.max(0, Number(item.attempts) || 0),
                correct: Math.max(0, Number(item.correct) || 0),
                nextReview: String(item.nextReview || ''),
                sunlightDelta: 0
            };
        });
        return next;
    }

    function addDays(date, days) {
        const stamp = new Date(String(date) + 'T12:00:00');
        if (Number.isNaN(stamp.getTime())) return String(date || '');
        stamp.setDate(stamp.getDate() + Math.max(0, Number(days) || 0));
        return stamp.getFullYear() + '-' + String(stamp.getMonth() + 1).padStart(2, '0') + '-' + String(stamp.getDate()).padStart(2, '0');
    }

    function intervalDays(state, rules) {
        const intervals = rules && Array.isArray(rules.reviewIntervalsDays) ? rules.reviewIntervalsDays : DEFAULT_INTERVALS;
        if (state === 'ready') return intervals[1] || 3;
        if (state === 'maintenance') return intervals[2] || 7;
        return intervals[0] || 1;
    }

    function courseDay(today, cycle) {
        const stamp = new Date(String(today) + 'T12:00:00');
        const start = new Date('2026-08-01T12:00:00');
        if (Number.isNaN(stamp.getTime()) || Number.isNaN(start.getTime())) return 1;
        const diff = Math.round((stamp.getTime() - start.getTime()) / 86400000);
        const length = Math.max(1, Number(cycle) || 30);
        return ((diff % length) + length) % length + 1;
    }

    function scopedBank(bank, level) {
        const helper = global.PersonalWorkbenchBankLevels;
        if (!helper || !level) return Array.isArray(bank) ? bank : [];
        return helper.levelPoolOrAll(bank, level);
    }

    function dailyWindow(bank, today, size, level) {
        const items = scopedBank(bank, level);
        const count = Math.max(1, Math.min(items.length, Number(size) || 5));
        const cycle = Math.max(1, Math.ceil(items.length / count));
        const day = courseDay(today, cycle);
        const start = ((day - 1) * count) % Math.max(1, items.length);
        const batch = [];
        for (let index = 0; index < count; index += 1) {
            batch.push(Object.assign({}, items[(start + index) % items.length]));
        }
        return { day: day, cycle: cycle, batch: batch };
    }

    function todayTheme(bank, today, size, level) {
        const daily = dailyWindow(bank, today, size, level);
        const first = daily.batch[0];
        return first && first.theme ? first.theme : '';
    }

    function buildReviewQueue(progress, rules, today, words) {
        const mastery = progress && progress.mastery ? progress.mastery : {};
        const available = Array.isArray(words) ? words : Object.keys(mastery);
        return available.filter(function (word) {
            const key = String(word || '').toLowerCase();
            const item = mastery[key] || mastery[word];
            return item && item.nextReview && String(item.nextReview) <= String(today);
        });
    }

    function buildSpeakBatch(bank, progress, rules, today, preferred, size, level) {
        const daily = dailyWindow(bank, today, size, level);
        const items = scopedBank(bank, level);
        const count = Math.max(1, Math.min(items.length, Number(size) || 5));
        const byText = {};
        items.forEach(function (item) {
            byText[item.text] = item;
        });
        const used = {};
        const batch = [];
        function pushItem(item, review) {
            if (!item || used[item.text] || batch.length >= count) return;
            used[item.text] = true;
            batch.push(Object.assign({}, item, { review: !!review }));
        }
        buildReviewQueue(progress, rules, today, items.map(function (item) { return item.text; })).forEach(function (word) {
            pushItem(byText[String(word || '').toLowerCase()], true);
        });
        if (preferred && !used[String(preferred).toLowerCase()] && byText[String(preferred).toLowerCase()]) {
            const duePreferred = buildReviewQueue(progress, rules, today, [String(preferred).toLowerCase()]).length > 0;
            if (duePreferred) pushItem(byText[String(preferred).toLowerCase()], true);
        }
        daily.batch.forEach(function (item) {
            pushItem(item, false);
        });
        items.forEach(function (item) {
            pushItem(item, false);
        });
        return batch;
    }

    function toMatchPairs(batch) {
        return (Array.isArray(batch) ? batch : []).map(function (item) {
            return { id: String(item.text || ''), a: String(item.text || ''), b: String(item.zh || '') };
        }).filter(function (item) {
            return item.id && item.a && item.b;
        });
    }

    function markKnown(progress, word, known, date, rules) {
        const next = cloneProgress(progress);
        const key = String(word || '').toLowerCase();
        if (!key) return next;
        const current = next.mastery[key] || {
            state: 'introduced',
            dates: [],
            attempts: 0,
            correct: 0,
            nextReview: '',
            sunlightDelta: 0
        };
        const stamp = String(date || '');
        current.attempts += 1;
        if (known) current.correct += 1;
        if (stamp && current.dates.indexOf(stamp) === -1) current.dates.push(stamp);
        current.state = known ? (current.state === 'maintenance' ? 'maintenance' : 'ready') : 'practicing';
        current.nextReview = addDays(stamp, intervalDays(current.state, rules));
        current.sunlightDelta = 0;
        next.mastery[key] = current;
        return next;
    }

    function getRuntimeBank() {
        const data = global.PersonalWorkbenchEnglishVocabData;
        return parseBank(data && data.bank);
    }

    function getRuntimeMinecraftBank() {
        const data = global.PersonalWorkbenchMinecraftVocabData;
        return parseBank(data && data.bank);
    }

    function getRuntimeRules() {
        const data = global.PersonalWorkbenchEnglishVocabData;
        return data && data.reviewRules ? data.reviewRules : { reviewIntervalsDays: DEFAULT_INTERVALS };
    }

    global.PersonalWorkbenchPreschoolEnglishVocab = {
        parseBank: parseBank,
        createDefaultProgress: createDefaultProgress,
        courseDay: courseDay,
        dailyWindow: dailyWindow,
        todayTheme: todayTheme,
        buildReviewQueue: buildReviewQueue,
        buildSpeakBatch: buildSpeakBatch,
        toMatchPairs: toMatchPairs,
        markKnown: markKnown,
        getRuntimeBank: getRuntimeBank,
        getRuntimeMinecraftBank: getRuntimeMinecraftBank,
        getRuntimeRules: getRuntimeRules
    };
})(typeof window !== 'undefined' ? window : globalThis);
