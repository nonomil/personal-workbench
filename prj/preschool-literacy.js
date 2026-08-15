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
            if (row && !Array.isArray(row) && typeof row === 'object') {
                const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
                const words = Array.isArray(extra.words) ? extra.words : (Array.isArray(row.words) ? row.words : []);
                return {
                    id: String(row.id || ''),
                    char: String(row.text || row.char || '').trim(),
                    pinyin: String(extra.pinyin || row.pinyin || '').trim(),
                    theme: String(row.theme || '').trim(),
                    words: words.map(function (word) { return String(word || '').trim(); }).filter(Boolean),
                    explain: String(extra.explain || row.explain || '').trim(),
                    level: String(row.level || 'L1').trim() || 'L1',
                    art: String((row.media && row.media.art) || row.art || '').trim(),
                    media: row.media && typeof row.media === 'object' ? row.media : {}
                };
            }
            const words = Array.isArray(row && row[3]) ? row[3].map(function (word) { return String(word || '').trim(); }).filter(Boolean) : [];
            return {
                char: String(row && row[0] || '').trim(),
                pinyin: String(row && row[1] || '').trim(),
                theme: String(row && row[2] || '').trim(),
                words: words,
                explain: rowExplain(row),
                level: rowLevel(row),
                art: '',
                media: {}
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
        return { mastery: {}, assessments: [] };
    }

    function cloneProgress(progress) {
        const source = progress && typeof progress === 'object' ? progress : {};
        const mastery = source.mastery && typeof source.mastery === 'object' ? source.mastery : {};
        const next = { mastery: {}, assessments: [] };
        const assessments = Array.isArray(source.assessments) ? source.assessments : [];
        next.assessments = assessments.filter(function (item) {
            return item && typeof item === 'object';
        }).map(function (item) {
            return {
                date: String(item.date || ''),
                estimate: Math.max(0, Number(item.estimate) || 0),
                confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
                level: /^L[1-5]$/.test(String(item.level || '')) ? String(item.level) : 'L1',
                stage: String(item.stage || stageForCount(item.estimate)),
                wrong: Array.isArray(item.wrong) ? item.wrong.map(function (char) { return String(char || ''); }).filter(Boolean) : []
            };
        }).slice(-24);
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
        const dueSet = {};
        buildReviewQueue(progress, rules, today, items.map(function (item) { return item.char; })).forEach(function (char) {
            dueSet[char] = true;
        });
        for (let i = 0; i < count; i += 1) {
            const remaining = items.filter(function (item) { return used.indexOf(item.char) === -1; });
            const char = pickTodayChar(remaining.length ? remaining : items, progress, rules, today, i === 0 ? preferred : '');
            const item = findChar(items, char);
            if (!item || used.indexOf(item.char) >= 0) break;
            used.push(item.char);
            batch.push({
                char: item.char,
                pinyin: item.pinyin,
                theme: item.theme,
                words: item.words.slice(),
                mark: null,
                review: dueSet[item.char] === true
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
            theme: item.theme,
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

    const ASSESS_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'];

    function seededRandom(seed) {
        let t = (Number(seed) || 0) + 1;
        return function () {
            t += 0x6D2B79F5;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }

    function shuffleSeeded(items, rand) {
        const list = (Array.isArray(items) ? items : []).slice();
        for (let i = list.length - 1; i > 0; i -= 1) {
            const j = Math.floor(rand() * (i + 1));
            const swap = list[i];
            list[i] = list[j];
            list[j] = swap;
        }
        return list;
    }

    function assessKnownSet(progress) {
        const mastery = progress && progress.mastery ? progress.mastery : {};
        const blocked = {};
        Object.keys(mastery).forEach(function (char) {
            const state = mastery[char] && mastery[char].state;
            if (state === 'ready' || state === 'maintenance') blocked[char] = true;
        });
        return blocked;
    }

    function shiftAssessLevel(level, delta) {
        const index = ASSESS_LEVELS.indexOf(level);
        const next = Math.max(0, Math.min(ASSESS_LEVELS.length - 1, (index >= 0 ? index : 0) + Number(delta || 0)));
        return ASSESS_LEVELS[next];
    }

    function nextAssessLevel(level, segmentOutcomes) {
        const hits = (Array.isArray(segmentOutcomes) ? segmentOutcomes : []).filter(Boolean).length;
        if (hits >= 4) return shiftAssessLevel(level, 1);
        if (hits <= 2) return shiftAssessLevel(level, -1);
        return ASSESS_LEVELS.indexOf(level) >= 0 ? level : 'L1';
    }

    function pinyinHead(pinyin) {
        const raw = String(pinyin || '').toLowerCase();
        if (/^[zcs]h/.test(raw)) return raw.slice(0, 2);
        return raw.charAt(0);
    }

    function pickPinyinDistractors(bank, item, count, rand) {
        const seen = {};
        seen[String(item.pinyin || '')] = true;
        const others = (Array.isArray(bank) ? bank : []).filter(function (entry) {
            return entry && entry.char !== item.char && entry.pinyin && !seen[entry.pinyin];
        });
        const sameHead = others.filter(function (entry) {
            return pinyinHead(entry.pinyin) === pinyinHead(item.pinyin);
        });
        const pool = shuffleSeeded(sameHead.length >= count ? sameHead : others, rand);
        const picked = [];
        pool.forEach(function (entry) {
            if (picked.length >= count || seen[entry.pinyin]) return;
            seen[entry.pinyin] = true;
            picked.push(entry.pinyin);
        });
        return picked;
    }

    function pickAssessItem(bank, level, used, blocked, rand) {
        const atLevel = (Array.isArray(bank) ? bank : []).filter(function (item) {
            return item && item.level === level && item.pinyin && !used[item.char] && !blocked[item.char];
        });
        const fallback = (Array.isArray(bank) ? bank : []).filter(function (item) {
            return item && item.pinyin && !used[item.char] && !blocked[item.char];
        });
        const pool = shuffleSeeded(atLevel.length ? atLevel : fallback, rand);
        return pool[0] || null;
    }

    function buildAssessRound(item, bank, level, rand) {
        const distractors = pickPinyinDistractors(bank, item, 3, rand);
        while (distractors.length < 3) distractors.push('x' + distractors.length);
        const options = shuffleSeeded([item.pinyin].concat(distractors.slice(0, 3)), rand);
        return {
            char: item.char,
            pinyin: item.pinyin,
            word: item.words && item.words[0] ? item.words[0] : '',
            options: options,
            answer: Math.max(0, options.indexOf(item.pinyin)),
            level: level,
            prompt: '这个字读什么？',
            speak: item.words && item.words[0] ? item.words[0] : ''
        };
    }

    function buildAssessment(bank, progress, options) {
        const size = Math.max(5, Number(options && options.size) || 25);
        const segmentSize = 5;
        const rand = seededRandom((Number(options && options.salt) || 0) + size * 17);
        const outcomes = Array.isArray(options && options.outcomes) ? options.outcomes : [];
        const blocked = assessKnownSet(progress);
        const used = {};
        const rounds = [];
        let level = 'L1';
        const segments = Math.ceil(size / segmentSize);
        for (let seg = 0; seg < segments; seg += 1) {
            if (seg > 0) {
                const prev = outcomes.slice((seg - 1) * segmentSize, seg * segmentSize);
                if (prev.length === segmentSize) level = nextAssessLevel(level, prev);
            }
            const count = Math.min(segmentSize, size - rounds.length);
            for (let i = 0; i < count; i += 1) {
                const item = pickAssessItem(bank, level, used, blocked, rand);
                if (!item) break;
                used[item.char] = true;
                rounds.push(buildAssessRound(item, bank, level, rand));
            }
        }
        return { rounds: rounds, segmentSize: segmentSize };
    }

    function stageForCount(count) {
        const n = Math.max(0, Number(count) || 0);
        if (n >= 750) return '阅读进阶期';
        if (n >= 500) return '自主阅读期';
        if (n >= 250) return '绘本启蒙期';
        return '字芽初萌';
    }

    function scoreAssessment(rounds, answers, bankSizes) {
        const list = Array.isArray(rounds) ? rounds : [];
        const replies = Array.isArray(answers) ? answers : [];
        const sizes = bankSizes && typeof bankSizes === 'object' ? bankSizes : {};
        const perLevel = {};
        ASSESS_LEVELS.forEach(function (level) {
            perLevel[level] = { asked: 0, hit: 0 };
        });
        const wrongChars = [];
        let rushed = 0;
        list.forEach(function (round, index) {
            const reply = replies[index];
            const correct = reply === true || !!(reply && reply.correct);
            const elapsed = reply && typeof reply === 'object' ? Number(reply.elapsedMs) : NaN;
            if (Number.isFinite(elapsed) && elapsed < 1500) rushed += 1;
            const level = ASSESS_LEVELS.indexOf(round && round.level) >= 0 ? round.level : 'L1';
            perLevel[level].asked += 1;
            if (correct) perLevel[level].hit += 1;
            else if (round && round.char) wrongChars.push(round.char);
        });
        let raw = 0;
        ASSESS_LEVELS.forEach(function (level) {
            const row = perLevel[level];
            if (!row.asked) return;
            raw += (row.hit / row.asked) * (Number(sizes[level]) || 0);
        });
        const estimate = Math.round(raw / 10) * 10;
        const reached = ASSESS_LEVELS.filter(function (level) { return perLevel[level].asked > 0; }).length;
        const coverage = reached / 5;
        const hits = [];
        for (let i = 0; i < replies.length; i += 5) {
            const slice = replies.slice(i, i + 5);
            if (!slice.length) continue;
            hits.push(slice.filter(function (reply) { return reply === true || !!(reply && reply.correct); }).length);
        }
        const mean = hits.length ? hits.reduce(function (sum, n) { return sum + n; }, 0) / hits.length : 0;
        const variance = hits.length ? hits.reduce(function (sum, n) { return sum + (n - mean) * (n - mean); }, 0) / hits.length : 0;
        const consistency = 1 - Math.min(1, variance / 6.25);
        let confidence = 0.6 * consistency + 0.4 * coverage;
        if (reached <= 1) confidence = Math.min(confidence, 0.59);
        return {
            estimate: estimate,
            confidence: confidence,
            lowConfidence: rushed >= 5 || confidence < 0.6,
            stage: stageForCount(estimate),
            wrongChars: wrongChars,
            perLevel: perLevel
        };
    }

    function highestAssessLevel(result) {
        const perLevel = result && result.perLevel ? result.perLevel : {};
        let highest = 'L1';
        ASSESS_LEVELS.forEach(function (level) {
            if (perLevel[level] && perLevel[level].asked) highest = level;
        });
        return highest;
    }

    function recordAssessment(progress, result, date) {
        const next = cloneProgress(progress);
        const list = Array.isArray(next.assessments) ? next.assessments.slice() : [];
        list.push({
            date: String(date || ''),
            estimate: Math.max(0, Number(result && result.estimate) || 0),
            confidence: Math.max(0, Math.min(1, Number(result && result.confidence) || 0)),
            level: highestAssessLevel(result),
            stage: String((result && result.stage) || stageForCount(result && result.estimate)),
            wrong: Array.isArray(result && result.wrongChars) ? result.wrongChars.map(function (char) { return String(char || ''); }).filter(Boolean) : []
        });
        next.assessments = list.slice(-24);
        return next;
    }

    function summarizeAssessments(progress) {
        const list = Array.isArray(progress && progress.assessments) ? progress.assessments : [];
        const latest = list.length ? list[list.length - 1] : null;
        let best = null;
        list.forEach(function (item) {
            if (!item || Number(item.confidence) < 0.6) return;
            if (!best || Number(item.estimate) > Number(best.estimate)) best = item;
        });
        return { latest: latest, best: best, history: list };
    }

    function isLiteracyMistake(item) {
        if (!item) return false;
        if (String(item.subject || '') === '识字') return true;
        return /识字量：|找字：/.test(String(item.question || ''));
    }

    function extractMistakeChar(item) {
        const question = String(item && item.question || '');
        const marked = question.match(/识字量：\s*([一-龥])/) || question.match(/找字：\s*([一-龥])/);
        if (marked) return marked[1];
        const any = question.match(/[一-龥]/);
        return any ? any[0] : '';
    }

    function literacyMistakeCards(mistakes, bank) {
        const list = (Array.isArray(mistakes) ? mistakes : []).filter(isLiteracyMistake).map(function (item) {
            const char = extractMistakeChar(item);
            const found = findChar(bank, char);
            return {
                char: char,
                pinyin: found ? found.pinyin : '',
                word: found && found.words && found.words[0] ? found.words[0] : '',
                words: found && found.words ? found.words.slice(0, 2) : [],
                attempts: Math.max(1, Number(item.attempts) || 1),
                status: item.status === 'mastered' ? 'mastered' : 'todo',
                sourceKey: String(item.sourceKey || ''),
                question: String(item.question || ''),
                correctAnswer: String(item.correctAnswer || (found && found.pinyin) || '')
            };
        }).filter(function (item) { return item.char; });
        return list.sort(function (a, b) { return b.attempts - a.attempts; });
    }

    function buildLiteracyDrill(mistakes, bank, options) {
        const cards = literacyMistakeCards(mistakes, bank).filter(function (item) { return item.status !== 'mastered'; });
        const rand = seededRandom(Number(options && options.salt) || 3);
        const rounds = cards.map(function (card) {
            const item = findChar(bank, card.char) || { char: card.char, pinyin: card.pinyin || card.correctAnswer, words: card.words, level: 'L1' };
            const round = buildAssessRound(item, bank, item.level || 'L1', rand);
            round.sourceKey = card.sourceKey;
            return round;
        });
        return { rounds: rounds };
    }

    function applyLiteracyDrillResult(mistakes, sourceKey, known) {
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

    function renderLiteracyPrintCards(cards) {
        const source = (Array.isArray(cards) ? cards : []).slice(0, 8);
        while (source.length < 8) source.push({ char: '', pinyin: '', word: '', attempts: 0 });
        const cells = source.map(function (card, index) {
            const boxes = '<span></span><span></span><span></span><span></span><span></span><span></span>';
            return '<article class="print-card"><small>' + (index + 1) + '</small><div class="literacy-tianzige">' + (card.char || '') + '</div><p class="print-pinyin">' + (card.pinyin || '') + '</p><p class="print-word">' + (card.word || '') + '</p><div class="print-practice">' + boxes + '</div></article>';
        }).join('');
        return '<section class="literacy-print-sheet"><header class="literacy-print-head">识字错字卡 · 本次 8 张</header>' + cells + '</section>';
    }

    function archivePoint(entry, index, total) {
        const x = 28 + (total <= 1 ? 132 : (index / (total - 1)) * 264);
        const y = 168 - Math.max(0, Math.min(1000, Number(entry.estimate) || 0)) / 1000 * 140;
        return { x: x, y: y };
    }

    function renderLiteracyArchive(history) {
        const list = Array.isArray(history) ? history : [];
        if (!list.length) return '<p class="literacy-archive-empty">先测一次，这里就会画出识字量曲线。</p>';
        const latest = list[list.length - 1];
        const best = list.reduce(function (max, item) {
            return Number(item.estimate) > Number(max.estimate) ? item : max;
        }, list[0]);
        const month = String(latest.date || '').slice(0, 7);
        const monthGain = list.filter(function (item) { return String(item.date || '').slice(0, 7) === month; });
        const firstInMonth = monthGain[0] ? Number(monthGain[0].estimate) || 0 : 0;
        const added = Math.max(0, (Number(latest.estimate) || 0) - firstInMonth);
        const refs = [250, 500, 750].map(function (value) {
            const y = 168 - value / 1000 * 140;
            return '<line class="literacy-archive-ref" x1="28" x2="292" y1="' + y + '" y2="' + y + '"></line><text x="296" y="' + (y + 4) + '">' + value + '</text>';
        }).join('');
        const points = list.map(function (entry, index) { return archivePoint(entry, index, list.length); });
        const dots = points.map(function (point) {
            return '<circle cx="' + point.x + '" cy="' + point.y + '" r="4"></circle>';
        }).join('');
        const line = points.length > 1
            ? '<polyline points="' + points.map(function (point) { return point.x + ',' + point.y; }).join(' ') + '"></polyline>'
            : '';
        const fill = points.length > 1
            ? '<polygon class="literacy-archive-fill" points="' + points[0].x + ',168 ' + points.map(function (point) { return point.x + ',' + point.y; }).join(' ') + ' ' + points[points.length - 1].x + ',168"></polygon>'
            : '';
        return '<div class="literacy-archive"><div class="literacy-archive-kpis"><span><small>最近识字量</small><b>' + (latest.estimate || 0) + '</b></span><span><small>最高识字量</small><b>' + (best.estimate || 0) + '</b></span><span><small>本月新增</small><b>+' + added + '</b></span></div><svg class="literacy-archive-svg" viewBox="0 0 320 180" role="img" aria-label="识字量曲线">' + refs + fill + line + dots + '</svg></div>';
    }

    function renderLiteracyCertificate(entry) {
        const item = entry && typeof entry === 'object' ? entry : {};
        return '<section class="literacy-certificate"><p class="literacy-certificate-kicker">识字成就证书</p><p>' + String(item.date || '') + '</p><strong>' + String(item.estimate || 0) + '</strong><em>' + String(item.stage || '') + '</em></section>';
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
        buildAssessment: buildAssessment,
        scoreAssessment: scoreAssessment,
        stageForCount: stageForCount,
        recordAssessment: recordAssessment,
        summarizeAssessments: summarizeAssessments,
        cloneProgress: cloneProgress,
        literacyMistakeCards: literacyMistakeCards,
        buildLiteracyDrill: buildLiteracyDrill,
        applyLiteracyDrillResult: applyLiteracyDrillResult,
        renderLiteracyPrintCards: renderLiteracyPrintCards,
        renderLiteracyArchive: renderLiteracyArchive,
        renderLiteracyCertificate: renderLiteracyCertificate,
        getRuntimeBank: getRuntimeBank,
        getRuntimeRules: getRuntimeRules
    };
})(typeof window !== 'undefined' ? window : globalThis);
