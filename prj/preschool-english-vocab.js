(function (global) {
    'use strict';

    const STATES = ['introduced', 'practicing', 'ready', 'maintenance'];
    const DEFAULT_INTERVALS = [1, 3, 7, 14];
    const INTERVALS_BY_VERSION = {
        1: [1, 3, 7, 14],
        2: [0.25, 1, 2, 4, 7, 14, 28]
    };
    const OVERDUE_GRACE_MS = 48 * 60 * 60 * 1000;

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

    function emptyQuizBuckets() {
        return {
            listen: { attempts: 0, correct: 0 },
            read: { attempts: 0, correct: 0 },
            spell: { attempts: 0, correct: 0 }
        };
    }

    function normalizeQuizBuckets(source) {
        const quiz = source && typeof source === 'object' ? source : {};
        const next = emptyQuizBuckets();
        ['listen', 'read', 'spell'].forEach(function (type) {
            const bucket = quiz[type] && typeof quiz[type] === 'object' ? quiz[type] : {};
            next[type] = {
                attempts: Math.max(0, Number(bucket.attempts) || 0),
                correct: Math.max(0, Number(bucket.correct) || 0)
            };
        });
        return next;
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

    function eventTime(extra, date) {
        const o = extra && typeof extra === 'object' ? extra : {};
        if (o.now) return String(o.now);
        const stamp = String(date || '');
        if (/^\d{4}-\d{2}-\d{2}$/.test(stamp)) return stamp + 'T12:00:00.000Z';
        return stamp || new Date().toISOString();
    }

    function appendEvent(item, event) {
        const current = item && typeof item === 'object' ? item : {};
        const next = normalizeEvents(current.events);
        next.push({
            ts: String(event && event.ts || ''),
            mode: String(event && event.mode || ''),
            correct: !!(event && event.correct),
            source: String(event && event.source || 'workbench')
        });
        current.events = next.slice(-20);
        return current;
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
                sunlightDelta: 0,
                masteredAt: String(item.masteredAt || ''),
                quiz: normalizeQuizBuckets(item.quiz),
                events: normalizeEvents(item.events),
                planVersion: Number(item.planVersion) === 2 ? 2 : (Number(item.planVersion) === 1 ? 1 : undefined),
                reviewRound: Math.max(0, Number(item.reviewRound) || 0)
            };
        });
        Object.keys(next.mastery).forEach(function (word) {
            if (!next.mastery[word].planVersion) delete next.mastery[word].planVersion;
        });
        return next;
    }

    function nowMs(now) {
        if (now instanceof Date) return now.getTime();
        if (typeof now === 'number' && Number.isFinite(now)) return now;
        const raw = String(now || '');
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            const day = Date.parse(raw + 'T12:00:00.000Z');
            return Number.isNaN(day) ? Date.now() : day;
        }
        const parsed = Date.parse(raw);
        return Number.isNaN(parsed) ? Date.now() : parsed;
    }

    function parseReviewAt(value) {
        const raw = String(value || '');
        if (!raw) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            const day = Date.parse(raw + 'T00:00:00.000Z');
            return Number.isNaN(day) ? null : day;
        }
        const parsed = Date.parse(raw);
        return Number.isNaN(parsed) ? null : parsed;
    }

    function addDuration(from, days) {
        return new Date(nowMs(from) + Number(days) * 86400000).toISOString();
    }

    function isDue(item, now) {
        const at = parseReviewAt(item && item.nextReview);
        return at != null && nowMs(now) >= at;
    }

    function isOverdue(item, now) {
        const at = parseReviewAt(item && item.nextReview);
        return at != null && nowMs(now) > at + OVERDUE_GRACE_MS;
    }

    function isSoon(item, now) {
        const at = parseReviewAt(item && item.nextReview);
        if (at == null) return false;
        const t = nowMs(now);
        return at > t && at <= t + 24 * 60 * 60 * 1000;
    }

    function taskBucket(item, now) {
        if (isOverdue(item, now)) return 'overdue';
        if (isDue(item, now)) return 'due';
        if (isSoon(item, now)) return 'soon';
        return '';
    }

    function normalizeWordList(words) {
        const out = [];
        const seen = {};
        (Array.isArray(words) ? words : []).forEach(function (item) {
            const key = typeof item === 'string'
                ? String(item || '').trim().toLowerCase()
                : String(item && (item.text || item.word) || '').trim().toLowerCase();
            if (!key || seen[key]) return;
            seen[key] = true;
            out.push(key);
        });
        return out;
    }

    function lookupMastery(source, word) {
        if (source[word]) return source[word];
        const keys = Object.keys(source);
        for (let i = 0; i < keys.length; i += 1) {
            if (String(keys[i] || '').toLowerCase() === word) return source[keys[i]];
        }
        return null;
    }

    function firstSeenDay(item) {
        const dates = item && Array.isArray(item.dates) ? item.dates : [];
        if (dates.length) return String(dates[0] || '').slice(0, 10);
        const events = item && Array.isArray(item.events) ? item.events : [];
        if (events.length) return String(events[0] && events[0].ts || '').slice(0, 10);
        return '';
    }

    function isNewCandidate(item) {
        if (!item) return true;
        const attempts = Number(item.attempts) || 0;
        const dates = Array.isArray(item.dates) ? item.dates : [];
        return attempts === 0 && dates.length === 0 && !item.nextReview;
    }

    function selectTodayTasks(mastery, now, quota, words) {
        const source = mastery && typeof mastery === 'object' ? mastery : {};
        const hasList = arguments.length >= 4;
        const list = hasList ? normalizeWordList(words) : Object.keys(source).map(function (key) {
            return String(key || '').toLowerCase();
        }).filter(Boolean);
        const empty = list.length === 0;
        if (empty) {
            return { items: [], reviewCount: 0, newCount: 0, minutes: 0, done: false, empty: true };
        }
        const cap = quota == null || quota === '' ? 3 : Math.max(0, Math.round(Number(quota)));
        const rank = { overdue: 0, due: 1, soon: 2, new: 3 };
        const review = [];
        const used = {};
        list.forEach(function (word) {
            const item = lookupMastery(source, word);
            const bucket = item ? taskBucket(item, now) : '';
            if (!bucket) return;
            used[word] = true;
            review.push({ word: word, bucket: bucket, at: parseReviewAt(item.nextReview) });
        });
        review.sort(function (a, b) {
            const byBucket = (rank[a.bucket] || 0) - (rank[b.bucket] || 0);
            if (byBucket) return byBucket;
            const ta = a.at == null ? 0 : a.at;
            const tb = b.at == null ? 0 : b.at;
            if (ta !== tb) return ta - tb;
            return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
        });
        const today = String(now || '').slice(0, 10);
        let usedNew = 0;
        list.forEach(function (word) {
            const item = lookupMastery(source, word);
            if (item && firstSeenDay(item) === today) usedNew += 1;
        });
        const remain = Math.max(0, (Number.isFinite(cap) ? cap : 3) - usedNew);
        const newcomers = [];
        list.forEach(function (word) {
            if (newcomers.length >= remain || used[word]) return;
            if (!isNewCandidate(lookupMastery(source, word))) return;
            newcomers.push({ word: word, bucket: 'new' });
        });
        const items = review.map(function (item) {
            return { word: item.word, bucket: item.bucket };
        }).concat(newcomers);
        return {
            items: items,
            reviewCount: review.length,
            newCount: newcomers.length,
            minutes: items.length ? Math.ceil(items.length * 25 / 60) : 0,
            done: items.length === 0,
            empty: false
        };
    }

    function resolvePlanVersion(item) {
        const n = Number(item && item.planVersion);
        if (n === 1 || n === 2) return n;
        const seen = (Number(item && item.attempts) || 0) > 0
            || (item && Array.isArray(item.dates) && item.dates.length > 0)
            || !!(item && item.nextReview);
        return seen ? 1 : 2;
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
            return item && isDue(item, today);
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

    function blankMastery() {
        return {
            state: 'introduced',
            dates: [],
            attempts: 0,
            correct: 0,
            nextReview: '',
            sunlightDelta: 0,
            masteredAt: '',
            quiz: emptyQuizBuckets(),
            events: []
        };
    }

    function quizCoveredTypes(quiz) {
        const buckets = normalizeQuizBuckets(quiz);
        return ['listen', 'read', 'spell'].filter(function (type) {
            return buckets[type].correct > 0;
        });
    }

    function quizCorrectTotal(quiz) {
        const buckets = normalizeQuizBuckets(quiz);
        return buckets.listen.correct + buckets.read.correct + buckets.spell.correct;
    }

    function readyFromQuiz(item) {
        return quizCorrectTotal(item && item.quiz) >= 3 && quizCoveredTypes(item && item.quiz).length >= 2;
    }

    function applyMasteryStamp(current, known, date, rules, mode, extra) {
        const stamp = String(date || '');
        const opts = extra && typeof extra === 'object' ? extra : {};
        const version = resolvePlanVersion(current);
        current.planVersion = version;
        current.attempts += 1;
        if (known) current.correct += 1;
        if (stamp && current.dates.indexOf(stamp) === -1) current.dates.push(stamp);
        if (current.state === 'maintenance') {
            current.state = 'maintenance';
        } else if (mode === 'self' && known) {
            current.state = 'ready';
        } else if (current.state === 'ready' || readyFromQuiz(current)) {
            current.state = 'ready';
        } else {
            current.state = 'practicing';
        }
        const when = opts.now || stamp;
        if (version === 2) {
            const table = INTERVALS_BY_VERSION[2];
            const round = Math.max(0, Math.min(Number(current.reviewRound) || 0, table.length - 1));
            current.nextReview = addDuration(when, table[round]);
            current.reviewRound = Math.min(round + 1, table.length - 1);
        } else {
            current.nextReview = addDuration(when, intervalDays(current.state, rules));
        }
        current.sunlightDelta = 0;
        if (current.state === 'ready' && !current.masteredAt) current.masteredAt = stamp;
        return current;
    }

    function markKnown(progress, word, known, date, rules, extra) {
        const next = cloneProgress(progress);
        const key = String(word || '').toLowerCase();
        if (!key) return next;
        const opts = extra && typeof extra === 'object' ? extra : {};
        const current = next.mastery[key] || blankMastery();
        const stamped = applyMasteryStamp(current, known, date, rules, 'self', opts);
        next.mastery[key] = appendEvent(stamped, {
            ts: eventTime(opts, date),
            mode: 'self',
            correct: !!known,
            source: opts.source || 'workbench'
        });
        return next;
    }

    function quizErrorType(type) {
        if (type === 'listen-pick-image' || type === 'listen') return 'listen';
        if (type === 'see-image-pick-word' || type === 'read') return 'read';
        if (type === 'spell') return 'spell';
        return 'read';
    }

    function recordQuizAnswer(progress, word, input) {
        const source = input && typeof input === 'object' ? input : {};
        const next = cloneProgress(progress);
        const key = String(word || '').toLowerCase();
        if (!key) return next;
        const type = quizErrorType(source.type);
        const current = next.mastery[key] || blankMastery();
        current.quiz = normalizeQuizBuckets(current.quiz);
        current.quiz[type].attempts += 1;
        if (source.correct) current.quiz[type].correct += 1;
        const stamped = applyMasteryStamp(current, !!source.correct, source.date, source.rules, 'quiz', source);
        next.mastery[key] = appendEvent(stamped, {
            ts: eventTime(source, source.date),
            mode: type,
            correct: !!source.correct,
            source: source.source || 'workbench'
        });
        return next;
    }

    function itemImage(item) {
        const source = item && typeof item === 'object' ? item : {};
        const media = source.media && typeof source.media === 'object' ? source.media : {};
        return String(media.image || source.image || '').trim();
    }

    function shuffleCopy(list) {
        const next = (Array.isArray(list) ? list : []).slice();
        for (let index = next.length - 1; index > 0; index -= 1) {
            const swap = Math.floor(Math.random() * (index + 1));
            const hold = next[index];
            next[index] = next[swap];
            next[swap] = hold;
        }
        return next;
    }

    function pickDistractors(target, bank, blocked, need, requireImage) {
        const used = {};
        used[String(target && target.text || '').toLowerCase()] = true;
        (Array.isArray(blocked) ? blocked : []).forEach(function (word) {
            used[String(word || '').toLowerCase()] = true;
        });
        const sameTheme = [];
        const sameLevel = [];
        const rest = [];
        (Array.isArray(bank) ? bank : []).forEach(function (item) {
            const text = String(item && item.text || '').toLowerCase();
            if (!text || used[text]) return;
            if (requireImage && !itemImage(item)) return;
            if (item.level === target.level && item.theme === target.theme) sameTheme.push(item);
            else if (item.level === target.level) sameLevel.push(item);
            else rest.push(item);
        });
        return shuffleCopy(sameTheme).concat(shuffleCopy(sameLevel), shuffleCopy(rest)).slice(0, need);
    }

    function makeQuestion(type, target, distractors) {
        const options = shuffleCopy([target].concat(distractors)).map(function (item) {
            return {
                text: String(item.text || ''),
                zh: String(item.zh || ''),
                image: itemImage(item),
                art: String((item.media && item.media.art) || item.art || '')
            };
        });
        const answerIndex = options.findIndex(function (option) {
            return option.text === target.text;
        });
        return {
            type: type,
            word: String(target.text || ''),
            zh: String(target.zh || ''),
            image: itemImage(target),
            audio: String((target.media && target.media.audio) || target.audio || ''),
            options: options,
            answerIndex: answerIndex
        };
    }

    function buildQuizQuestions(batch, bank) {
        const items = Array.isArray(batch) ? batch : [];
        const pool = Array.isArray(bank) && bank.length ? bank : items;
        const blocked = items.map(function (item) { return item && item.text; });
        const questions = [];
        items.forEach(function (target) {
            if (!target || !target.text) return;
            if (itemImage(target)) {
                const listenPool = pickDistractors(target, pool, blocked, 3, true);
                if (listenPool.length >= 3) questions.push(makeQuestion('listen-pick-image', target, listenPool));
                const readPool = pickDistractors(target, pool, blocked, 3, false);
                if (readPool.length >= 3) questions.push(makeQuestion('see-image-pick-word', target, readPool));
            }
        });
        return questions;
    }

    function isEnglishMistake(item) {
        if (!item) return false;
        if (String(item.subject || '') === '英语') return true;
        return /^(english|minecraft):/.test(String(item.sourceKey || ''));
    }

    function extractMistakeWord(item) {
        const key = String(item && item.sourceKey || '');
        const fromKey = key.replace(/^(english|minecraft):/i, '').trim().toLowerCase();
        if (fromKey) return fromKey;
        const question = String(item && item.question || '');
        const head = question.split('·')[0] || question.split(' ')[0] || '';
        return head.trim().toLowerCase();
    }

    function errorTypeLabel(type) {
        if (type === 'listen') return '听力误判';
        if (type === 'spell') return '拼写错误';
        return '认读混淆';
    }

    function englishMistakeCards(mistakes, bank, today) {
        const byText = {};
        (Array.isArray(bank) ? bank : []).forEach(function (item) {
            if (item && item.text) byText[String(item.text).toLowerCase()] = item;
        });
        const stamp = String(today || '');
        return (Array.isArray(mistakes) ? mistakes : []).filter(isEnglishMistake).map(function (item) {
            const word = extractMistakeWord(item);
            const found = byText[word] || {};
            const errorType = quizErrorType(item.errorType || 'read');
            const elapsed = (function () {
                const start = new Date(String(item.date || '') + 'T12:00:00');
                const end = new Date(stamp + 'T12:00:00');
                if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return NaN;
                return Math.round((end.getTime() - start.getTime()) / 86400000);
            }());
            return {
                word: word,
                zh: String(found.zh || item.correctAnswer || ''),
                image: itemImage(found),
                errorType: errorType,
                label: errorTypeLabel(errorType),
                attempts: Math.max(1, Number(item.attempts) || 1),
                status: item.status === 'mastered' ? 'mastered' : 'todo',
                sourceKey: String(item.sourceKey || ('english:' + word)),
                due: item.status !== 'mastered' && (elapsed === 1 || elapsed === 3 || elapsed === 7 || elapsed === 14),
                question: String(item.question || word)
            };
        }).filter(function (item) {
            return item.word && item.status !== 'mastered';
        });
    }

    function buildEnglishWrongbookDrill(mistakes, bank) {
        const cards = englishMistakeCards(mistakes, bank, '');
        const wanted = {};
        cards.forEach(function (card) { wanted[card.word] = true; });
        const batch = (Array.isArray(bank) ? bank : []).filter(function (item) { return item && wanted[item.text]; });
        return { questions: buildQuizQuestions(batch, bank), cards: cards };
    }

    function applyEnglishWrongbookResult(mistakes, sourceKey, known) {
        const key = String(sourceKey || '');
        return (Array.isArray(mistakes) ? mistakes : []).map(function (item) {
            if (!item || item.sourceKey !== key) return item;
            const next = Object.assign({}, item);
            if (known) {
                next.correctStreak = (Number(next.correctStreak) || 0) + 1;
                if (next.correctStreak >= 3) next.status = 'mastered';
            } else {
                next.correctStreak = 0;
                next.status = 'todo';
            }
            return next;
        });
    }

    function summarizeEnglishArchive(progress, bank, today) {
        const mastery = progress && progress.mastery && typeof progress.mastery === 'object' ? progress.mastery : {};
        const items = Array.isArray(bank) ? bank : [];
        const stamp = String(today || '');
        let known = 0;
        let practicing = 0;
        let reviewing = 0;
        const rates = {
            listen: { attempts: 0, correct: 0 },
            read: { attempts: 0, correct: 0 },
            spell: { attempts: 0, correct: 0 }
        };
        const dated = [];
        Object.keys(mastery).forEach(function (word) {
            const item = mastery[word] || {};
            if (item.state === 'ready' || item.state === 'maintenance') known += 1;
            else if (item.state === 'practicing' || item.state === 'introduced') practicing += 1;
            if (stamp && item.state !== 'introduced' && isDue(item, stamp)) reviewing += 1;
            const quiz = normalizeQuizBuckets(item.quiz);
            ['listen', 'read', 'spell'].forEach(function (type) {
                rates[type].attempts += quiz[type].attempts;
                rates[type].correct += quiz[type].correct;
            });
            if (item.masteredAt) dated.push({ date: String(item.masteredAt), word: word });
        });
        dated.sort(function (a, b) { return a.date.localeCompare(b.date); });
        const curve = [];
        dated.forEach(function (entry) {
            const last = curve[curve.length - 1];
            if (last && last.date === entry.date) last.count += 1;
            else curve.push({ date: entry.date, count: (last ? last.count : 0) + 1 });
        });
        return { known: known, practicing: practicing, reviewing: reviewing, bankSize: items.length, rates: rates, curve: curve };
    }

    function shiftDate(date, days) {
        const stamp = new Date(String(date || '') + 'T12:00:00');
        if (Number.isNaN(stamp.getTime())) return '';
        stamp.setDate(stamp.getDate() + (Number(days) || 0));
        return stamp.getFullYear() + '-' + String(stamp.getMonth() + 1).padStart(2, '0') + '-' + String(stamp.getDate()).padStart(2, '0');
    }

    function englishStageLabel(level) {
        const definitions = global.PersonalWorkbenchPreschoolLevels;
        const bands = definitions && Array.isArray(definitions.bands) ? definitions.bands : [];
        const match = bands.find(function (item) { return item && item.id === level; });
        return match && match.title ? String(match.title) : ({ L1: '起步', L2: '扩展', L3: '巩固', L4: '挑战', L5: '综合' }[level] || level);
    }

    function buildEnglishStageProgress(items, progress) {
        const helper = global.PersonalWorkbenchBankLevels;
        if (helper && typeof helper.buildTrackProgress === 'function') {
            return helper.buildTrackProgress(items, progress, function (item) {
                return String(item && item.text || '').toLowerCase();
            });
        }
        const mastery = progress && progress.mastery && typeof progress.mastery === 'object' ? progress.mastery : {};
        const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
        const bands = levels.map(function (level) {
            const pool = items.filter(function (item) { return String(item.level || 'L1').toUpperCase() === level; });
            const ready = pool.filter(function (item) {
                const entry = mastery[String(item.text || '').toLowerCase()];
                return entry && (entry.state === 'ready' || entry.state === 'maintenance');
            }).length;
            return { level: level, total: pool.length, ready: ready, percent: pool.length ? Math.round(ready / pool.length * 100) : 0 };
        });
        let maxUnlocked = 'L1';
        for (let index = 1; index < bands.length; index += 1) {
            const previous = bands[index - 1];
            if (previous.total && previous.ready / previous.total >= 0.8) maxUnlocked = bands[index].level;
            else break;
        }
        return { bands: bands, maxUnlocked: maxUnlocked };
    }

    function summarizeEnglishDashboard(progress, bank, today) {
        const source = progress && progress.mastery && typeof progress.mastery === 'object' ? progress.mastery : {};
        const items = [];
        const seen = {};
        (Array.isArray(bank) ? bank : []).forEach(function (item) {
            const key = String(item && item.text || '').trim().toLowerCase();
            if (!key || seen[key]) return;
            seen[key] = true;
            items.push(Object.assign({}, item, { text: key }));
        });
        const stamp = String(today || '').slice(0, 10);
        const dueDate = stamp && shiftDate(stamp, -6);
        let known = 0;
        let practicing = 0;
        let reviewing = 0;
        let thisWeekNew = 0;
        const studyDates = {};
        const rates = emptyQuizBuckets();
        items.forEach(function (item) {
            const entry = source[item.text] || {};
            const state = STATES.indexOf(entry.state) >= 0 ? entry.state : '';
            if (state === 'ready' || state === 'maintenance') known += 1;
            else if (state === 'introduced' || state === 'practicing') practicing += 1;
            if (stamp && state !== 'introduced' && isDue(entry, stamp)) reviewing += 1;
            const masteredAt = String(entry.masteredAt || '').slice(0, 10);
            if (masteredAt && dueDate && masteredAt >= dueDate && masteredAt <= stamp) thisWeekNew += 1;
            const dates = Array.isArray(entry.dates) ? entry.dates : [];
            dates.forEach(function (date) {
                const dateKey = String(date || '').slice(0, 10);
                if (dateKey) studyDates[dateKey] = true;
            });
            if (!dates.length && masteredAt) studyDates[masteredAt] = true;
            const quiz = normalizeQuizBuckets(entry.quiz);
            ['listen', 'read', 'spell'].forEach(function (type) {
                rates[type].attempts += quiz[type].attempts;
                rates[type].correct += quiz[type].correct;
            });
        });
        let currentStreak = 0;
        if (stamp) {
            let cursor = stamp;
            while (cursor && studyDates[cursor]) {
                currentStreak += 1;
                cursor = shiftDate(cursor, -1);
            }
        }
        const stageTrack = buildEnglishStageProgress(items, progress);
        const stageLevel = stageTrack && stageTrack.maxUnlocked ? stageTrack.maxUnlocked : 'L1';
        const stageBand = (stageTrack && Array.isArray(stageTrack.bands) ? stageTrack.bands : []).find(function (item) {
            return item && item.level === stageLevel;
        }) || { level: stageLevel, total: 0, ready: 0, percent: 0 };
        return {
            bankSize: items.length,
            known: known,
            practicing: practicing,
            unseen: Math.max(0, items.length - known - practicing),
            reviewing: reviewing,
            thisWeekNew: thisWeekNew,
            currentStreak: currentStreak,
            studyDays: Object.keys(studyDates).length,
            currentStage: {
                level: stageLevel,
                label: englishStageLabel(stageLevel),
                total: Number(stageBand.total) || 0,
                ready: Number(stageBand.ready) || 0,
                percent: Number(stageBand.percent) || 0
            },
            rates: rates
        };
    }

    function renderEnglishArchive(curve) {
        const list = Array.isArray(curve) ? curve : [];
        const maxY = 300;
        const points = list.map(function (entry, index) {
            const x = 36 + (list.length <= 1 ? 240 : (index / (list.length - 1)) * 240);
            const y = 168 - Math.max(0, Math.min(maxY, Number(entry.count) || 0)) / maxY * 140;
            return x.toFixed(1) + ',' + y.toFixed(1);
        }).join(' ');
        const line80 = (168 - 80 / maxY * 140).toFixed(1);
        const line300 = (168 - 300 / maxY * 140).toFixed(1);
        const poly = points ? '<polyline points="' + points + '"></polyline>' : '';
        return '<svg class="english-archive-svg literacy-archive-svg" viewBox="0 0 320 190" role="img" aria-label="词汇成长曲线"><line x1="28" y1="' + line80 + '" x2="300" y2="' + line80 + '" stroke="#8a6b1f" stroke-dasharray="4 4"></line><line x1="28" y1="' + line300 + '" x2="300" y2="' + line300 + '" stroke="#2d8748" stroke-dasharray="4 4"></line><text x="302" y="' + (Number(line80) + 4) + '" font-size="10" fill="#8a6b1f">80</text><text x="302" y="' + (Number(line300) + 4) + '" font-size="10" fill="#2d8748">300</text>' + poly + '</svg>';
    }

    function getRuntimeBank() {
        const data = global.PersonalWorkbenchEnglishVocabData;
        return parseBank(data && data.bank);
    }

    function getDailyLoopBank() {
        const data = global.PersonalWorkbenchEnglishDailyData;
        const runtime = getRuntimeBank();
        if (data && typeof data.getDailyLoopBank === 'function') return data.getDailyLoopBank(runtime);
        return runtime;
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
        appendEvent: appendEvent,
        isDue: isDue,
        isOverdue: isOverdue,
        selectTodayTasks: selectTodayTasks,
        INTERVALS_BY_VERSION: INTERVALS_BY_VERSION,
        cloneProgress: cloneProgress,
        buildQuizQuestions: buildQuizQuestions,
        recordQuizAnswer: recordQuizAnswer,
        quizErrorType: quizErrorType,
        englishMistakeCards: englishMistakeCards,
        buildEnglishWrongbookDrill: buildEnglishWrongbookDrill,
        applyEnglishWrongbookResult: applyEnglishWrongbookResult,
        summarizeEnglishArchive: summarizeEnglishArchive,
        summarizeEnglishDashboard: summarizeEnglishDashboard,
        renderEnglishArchive: renderEnglishArchive,
        getRuntimeBank: getRuntimeBank,
        getDailyLoopBank: getDailyLoopBank,
        getRuntimeMinecraftBank: getRuntimeMinecraftBank,
        getRuntimeRules: getRuntimeRules
    };
})(typeof window !== 'undefined' ? window : globalThis);
