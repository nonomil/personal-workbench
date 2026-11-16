/**
 * 个人工作台共享学习记忆核心。
 *
 * 纯函数、无 DOM：浏览器挂 window.WorkbenchMemory，Node 可通过 VM 加载。
 * key 是跨游戏的唯一学习对象；track 只描述最近一次使用的学科轨道。
 */
(function (global) {
    'use strict';

    const BOX_DAYS = Object.freeze([1, 3, 7, 14, 30]);
    const DAY_MS = 86400000;
    const MEMORY_VERSION = 2;
    const GRADES = Object.freeze(['again', 'good', 'easy']);

    function nowMs(value) {
        if (value instanceof Date) return value.getTime();
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        const parsed = Date.parse(String(value || ''));
        return Number.isNaN(parsed) ? Date.now() : parsed;
    }

    function keyOf(value) {
        if (value && typeof value === 'object') {
            return String(value.key || value.text || value.word || value.id || '').trim().toLowerCase();
        }
        return String(value == null ? '' : value).trim().toLowerCase();
    }

    function trackOf(value, fallback) {
        if (value && typeof value === 'object' && value.track) return String(value.track);
        return String(fallback || 'unknown');
    }

    function normalizeGrade(value) {
        if (value === true) return 'good';
        if (value === false) return 'again';
        return GRADES.indexOf(String(value || '').toLowerCase()) >= 0
            ? String(value).toLowerCase()
            : 'again';
    }

    function cloneRow(row) {
        return row && typeof row === 'object' ? Object.assign({}, row) : { box: 1 };
    }

    function createMemory(source) {
        const raw = source && typeof source === 'object' ? source : {};
        const words = raw.words && typeof raw.words === 'object' ? raw.words : {};
        const next = {
            memoryVersion: Math.max(MEMORY_VERSION, Number(raw.memoryVersion) || MEMORY_VERSION),
            words: {}
        };
        Object.keys(words).forEach(function (key) {
            const canonical = keyOf(key);
            if (canonical) next.words[canonical] = cloneRow(words[key]);
        });
        return next;
    }

    function intervalMs(box, ease) {
        const index = Math.max(1, Math.min(5, Math.round(Number(box) || 1))) - 1;
        const multiplier = Math.max(1.3, Math.min(3.2, Number(ease) || 2.5));
        return BOX_DAYS[index] * DAY_MS * multiplier;
    }

    function recordAnswer(source, card, grade, at, options) {
        const memory = createMemory(source);
        const key = keyOf(card);
        if (!key) return memory;
        const opt = options && typeof options === 'object' ? options : {};
        const normalized = normalizeGrade(grade);
        const time = nowMs(at);
        const previous = memory.words[key] && typeof memory.words[key] === 'object'
            ? memory.words[key]
            : null;
        const previousBox = Math.max(1, Math.min(5, Math.round(Number(previous && previous.box) || 1)));
        const previousEase = Math.max(1.3, Math.min(3.2, Number(previous && previous.ease) || 2.5));
        let box;
        let ease = previousEase;
        if (!previous) {
            box = normalized === 'easy' ? 3 : normalized === 'good' ? 2 : 1;
        } else if (normalized === 'again') {
            box = Math.max(1, previousBox - 1);
            ease = Math.max(1.3, previousEase - 0.1);
        } else if (normalized === 'easy') {
            box = Math.min(5, previousBox + 2);
            ease = Math.min(3.2, previousEase + 0.05);
        } else {
            box = Math.min(5, previousBox + 1);
        }
        const againStreak = normalized === 'again'
            ? Math.max(0, Number(previous && previous.againStreak) || 0) + 1
            : 0;
        const correct = Math.max(0, Number(previous && previous.correct) || 0) + (normalized === 'again' ? 0 : 1);
        const wrong = Math.max(0, Number(previous && previous.wrong) || 0) + (normalized === 'again' ? 1 : 0);
        const row = Object.assign({}, previous || {}, {
            key: key,
            track: trackOf(card, previous && previous.track),
            box: box,
            ease: Number(ease.toFixed(2)),
            streak: normalized === 'again' ? 0 : Math.max(0, Number(previous && previous.streak) || 0) + 1,
            againStreak: againStreak,
            attempts: Math.max(0, Number(previous && previous.attempts) || 0) + 1,
            correct: correct,
            wrong: wrong,
            lastGrade: normalized,
            lastOutcome: normalized === 'again' ? 'slip' : 'known',
            lastSeenAt: time,
            dueAt: normalized === 'again' ? time : time + intervalMs(box, ease),
            needsRelearn: normalized === 'again' && againStreak >= 2,
            lastSource: String(opt.source || (previous && previous.lastSource) || 'learning-mode')
        });
        if (opt.responseMs != null && Number.isFinite(Number(opt.responseMs))) {
            row.lastResponseMs = Math.max(0, Math.round(Number(opt.responseMs)));
        }
        memory.words[key] = row;
        return memory;
    }

    function recordOutcome(source, card, outcome, at, options) {
        const memory = createMemory(source);
        const key = keyOf(card);
        if (!key) return memory;
        const opt = options && typeof options === 'object' ? options : {};
        const value = String(outcome || '').trim().toLowerCase();
        const time = nowMs(at);
        const previous = memory.words[key] && typeof memory.words[key] === 'object'
            ? memory.words[key]
            : null;
        if (value !== 'unknown') {
            const grade = value === 'slip' || value === 'wrong' ? 'again' : (opt.grade || 'good');
            const next = recordAnswer(memory, card, grade, time, opt);
            const row = next.words[key];
            row.lastOutcome = value === 'slip' || value === 'wrong' ? 'slip' : value === 'unsure' ? 'unsure' : 'known';
            row.knownCount = Math.max(0, Number(previous && previous.knownCount) || 0) + (row.lastOutcome === 'known' ? 1 : 0);
            row.unsureCount = Math.max(0, Number(previous && previous.unsureCount) || 0) + (row.lastOutcome === 'unsure' ? 1 : 0);
            row.slipCount = Math.max(0, Number(previous && previous.slipCount) || 0) + (row.lastOutcome === 'slip' ? 1 : 0);
            row.unknownCount = Math.max(0, Number(previous && previous.unknownCount) || 0);
            row.needsReteach = false;
            return next;
        }
        const row = Object.assign({}, previous || {}, {
            key: key,
            contentId: String((card && card.contentId) || (previous && previous.contentId) || key),
            track: trackOf(card, previous && previous.track),
            attempts: Math.max(0, Number(previous && previous.attempts) || 0) + 1,
            correct: Math.max(0, Number(previous && previous.correct) || 0),
            wrong: Math.max(0, Number(previous && previous.wrong) || 0),
            knownCount: Math.max(0, Number(previous && previous.knownCount) || 0),
            unsureCount: Math.max(0, Number(previous && previous.unsureCount) || 0),
            slipCount: Math.max(0, Number(previous && previous.slipCount) || 0),
            unknownCount: Math.max(0, Number(previous && previous.unknownCount) || 0) + 1,
            lastOutcome: 'unknown',
            lastGrade: 'unknown',
            lastSeenAt: time,
            dueAt: time,
            needsReteach: true,
            lastSource: String(opt.source || (previous && previous.lastSource) || 'learning-mode')
        });
        memory.words[key] = row;
        return memory;
    }

    function dueWords(source, at, filterKeys) {
        const memory = createMemory(source);
        const time = nowMs(at);
        const allowed = Array.isArray(filterKeys)
            ? filterKeys.map(keyOf).filter(Boolean)
            : null;
        return Object.keys(memory.words).filter(function (key) {
            const row = memory.words[key] || {};
            if (allowed && allowed.indexOf(key) < 0) return false;
            return row.needsRelearn === true || (row.dueAt != null && nowMs(row.dueAt) <= time);
        });
    }

    function isDue(row, time) {
        return Boolean(row && (row.needsRelearn || (row.dueAt != null && nowMs(row.dueAt) <= time)));
    }

    function cardKey(card) {
        return keyOf(card && (card.key || card.text || card.word || card.id));
    }

    function cardId(card) {
        return String(card && (card.id || card.key || card.text || card.word) || '').trim();
    }

    function priority(card, memory, time) {
        const row = memory.words[cardKey(card)];
        if (isDue(row, time)) return 0;
        if (row && (row.lastGrade === 'again' || Number(row.wrong) > 0)) return 1;
        if (!row) return 2;
        return 3;
    }

    function pickCards(cards, source, at, options) {
        const list = Array.isArray(cards) ? cards.slice() : [];
        const memory = createMemory(source);
        const opt = options && typeof options === 'object' ? options : {};
        const time = nowMs(at);
        const count = Math.max(0, Math.floor(Number(opt.count) || list.length));
        const usedIds = new Set((Array.isArray(opt.usedIds) ? opt.usedIds : []).map(function (id) { return String(id); }));
        const usedKeys = new Set((Array.isArray(opt.usedKeys) ? opt.usedKeys : []).map(keyOf).filter(Boolean));
        const seenIds = new Set();
        const seenKeys = new Set();
        return list
            .filter(function (card) {
                const id = cardId(card);
                const key = cardKey(card);
                if (!id || !key || usedIds.has(id) || usedKeys.has(key) || seenIds.has(id) || seenKeys.has(key)) return false;
                seenIds.add(id);
                seenKeys.add(key);
                return true;
            })
            .sort(function (a, b) {
                const rank = priority(a, memory, time) - priority(b, memory, time);
                if (rank !== 0) return rank;
                const aRow = memory.words[cardKey(a)] || {};
                const bRow = memory.words[cardKey(b)] || {};
                const due = Number(aRow.dueAt || Infinity) - Number(bRow.dueAt || Infinity);
                if (due !== 0 && priority(a, memory, time) < 2) return due;
                return list.indexOf(a) - list.indexOf(b);
            })
            .slice(0, count);
    }

    function weakWords(source, limit) {
        const memory = createMemory(source);
        const max = Math.max(0, Math.floor(Number(limit) || 10));
        return Object.keys(memory.words).map(function (key) {
            const row = memory.words[key] || {};
            const score = Math.max(0, Number(row.wrong) || 0) * 3
                + (row.needsRelearn ? 4 : 0)
                + (row.lastGrade === 'again' ? 2 : 0)
                + (Number(row.unknownCount) || 0) * 4
                + Math.max(0, 3 - (Number(row.box) || 1));
            return { key: key, track: row.track || 'unknown', score: score, record: Object.assign({}, row) };
        }).sort(function (a, b) {
            return b.score - a.score || a.key.localeCompare(b.key);
        }).slice(0, max);
    }

    global.WorkbenchMemory = Object.freeze({
        BOX_DAYS: BOX_DAYS,
        DAY_MS: DAY_MS,
        MEMORY_VERSION: MEMORY_VERSION,
        GRADES: GRADES,
        keyOf: keyOf,
        normalizeGrade: normalizeGrade,
        createMemory: createMemory,
        recordAnswer: recordAnswer,
        recordOutcome: recordOutcome,
        dueWords: dueWords,
        pickCards: pickCards,
        weakWords: weakWords
    });
}(typeof window !== 'undefined' ? window : globalThis));
