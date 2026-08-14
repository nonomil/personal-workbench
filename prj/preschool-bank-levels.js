(function (global) {
    'use strict';

    var LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'];
    var UNLOCK_THRESHOLD = 0.8;

    var COURSE_TRACK = {
        'preschool-literacy': 'literacy',
        'preschool-pinyin': 'pinyin',
        'preschool-poetry': 'poetry',
        'preschool-math': 'math',
        'preschool-exercise': 'motion',
        'preschool-english': 'english',
        'preschool-phonics': 'phonics',
        'preschool-focus': 'literacy',
        'preschool-summer': 'literacy'
    };

    var TRACK_META = {
        literacy: { bank: 'literacy', progress: 'literacy', getKey: function (item) { return String(item && item.char || ''); } },
        english: { bank: 'english', progress: 'english', getKey: function (item) { return String(item && item.text || '').toLowerCase(); } },
        pinyin: { bank: 'pinyin', progress: 'pinyin', getKey: function (item) { return String(item && item.text || ''); } },
        poetry: { bank: 'poetry', progress: 'poetry', getKey: function (item) { return String(item && item.id || ''); } },
        math: { bank: 'math', progress: 'math', getKey: function (item) { return String(item && item.id || ''); } },
        motion: { bank: 'motion', progress: 'motion', getKey: function (item) { return String(item && item.id || ''); } },
        phonics: { bank: 'phonics', progress: 'phonics', getKey: function (item) { return String(item && (item.text || item.id) || ''); } }
    };

    function normalizeLevel(level) {
        var value = String(level || 'L1').trim().toUpperCase();
        return LEVELS.indexOf(value) >= 0 ? value : 'L1';
    }

    function levelIndex(level) {
        var index = LEVELS.indexOf(normalizeLevel(level));
        return index >= 0 ? index : 0;
    }

    function levelPool(bank, level) {
        var target = normalizeLevel(level);
        return (Array.isArray(bank) ? bank : []).filter(function (item) {
            return normalizeLevel(item && item.level) === target;
        });
    }

    function levelPoolOrAll(bank, level) {
        var pool = levelPool(bank, level);
        return pool.length ? pool : (Array.isArray(bank) ? bank : []);
    }

    function getDefinitions() {
        var data = global.PersonalWorkbenchPreschoolLevels;
        return data && Array.isArray(data.bands) ? data.bands.slice() : LEVELS.map(function (id, index) {
            return { id: id, title: '第' + (index + 1) + '级', summary: '' };
        });
    }

    function labelFor(level) {
        var target = normalizeLevel(level);
        var bands = getDefinitions();
        var match = bands.find(function (item) { return item.id === target; });
        return match ? match.title : target;
    }

    function countReadyInPool(pool, masteryRoot, getKey) {
        var mastery = masteryRoot && masteryRoot.mastery ? masteryRoot.mastery : {};
        var ready = 0;
        (Array.isArray(pool) ? pool : []).forEach(function (item) {
            var key = getKey(item);
            var entry = key && mastery[key];
            if (entry && (entry.state === 'ready' || entry.state === 'maintenance')) ready += 1;
        });
        return ready;
    }

    function buildTrackProgress(bank, masteryRoot, getKey, threshold) {
        var minRatio = typeof threshold === 'number' ? threshold : UNLOCK_THRESHOLD;
        var bands = LEVELS.map(function (level) {
            var pool = levelPool(bank, level);
            var ready = countReadyInPool(pool, masteryRoot, getKey);
            var total = pool.length;
            return {
                level: level,
                total: total,
                ready: ready,
                percent: total ? Math.round((ready / total) * 100) : 0,
                ratio: total ? ready / total : 0
            };
        });
        var unlocked = ['L1'];
        for (var i = 1; i < LEVELS.length; i += 1) {
            var prev = bands[i - 1];
            if (!prev.total) break;
            if (prev.ratio >= minRatio) unlocked.push(LEVELS[i]);
            else break;
        }
        return {
            bands: bands,
            unlocked: unlocked,
            maxUnlocked: unlocked[unlocked.length - 1] || 'L1',
            threshold: minRatio
        };
    }

    function trackForCourse(courseId) {
        return COURSE_TRACK[String(courseId || '')] || 'literacy';
    }

    function resolveTrackProgress(courseId, progress, banks) {
        var source = banks && typeof banks === 'object' ? banks : {};
        var courseProgress = progress && typeof progress === 'object' ? progress : {};
        var track = trackForCourse(courseId);
        var meta = TRACK_META[track] || TRACK_META.literacy;
        var bank = source[meta.bank] || [];
        var masteryRoot = courseProgress[meta.progress] || { mastery: {} };
        return buildTrackProgress(bank, masteryRoot, meta.getKey);
    }

    function resolveLevelStats(progress, banks) {
        var source = banks && typeof banks === 'object' ? banks : {};
        var courseProgress = progress && typeof progress === 'object' ? progress : {};
        var stats = {};
        Object.keys(TRACK_META).forEach(function (track) {
            var meta = TRACK_META[track];
            stats[track] = trackToLevelStat(buildTrackProgress(
                source[meta.bank] || [],
                courseProgress[meta.progress] || { mastery: {} },
                meta.getKey
            ));
        });
        return stats;
    }

    function isLevelUnlocked(level, trackProgress) {
        var target = normalizeLevel(level);
        if (target === 'L1') return true;
        if (!trackProgress || !Array.isArray(trackProgress.unlocked)) return false;
        return trackProgress.unlocked.indexOf(target) >= 0;
    }

    function clampLevel(level, trackProgress) {
        var requested = normalizeLevel(level);
        if (!trackProgress) return 'L1';
        if (isLevelUnlocked(requested, trackProgress)) return requested;
        return trackProgress.maxUnlocked || 'L1';
    }

    function unlockHint(level, trackProgress) {
        var target = normalizeLevel(level);
        if (isLevelUnlocked(target, trackProgress)) return '';
        var prevIndex = levelIndex(target) - 1;
        if (prevIndex < 0) return '';
        var prev = LEVELS[prevIndex];
        var band = (trackProgress.bands || []).find(function (entry) { return entry.level === prev; });
        var need = Math.ceil((trackProgress.threshold || UNLOCK_THRESHOLD) * 100);
        var current = band ? band.percent : 0;
        return '先把 ' + prev + ' 练到 ' + need + '% 会了，再开 ' + target + '。（现在 ' + current + '%）';
    }

    function trackToLevelStat(trackProgress) {
        var maxUnlocked = trackProgress && trackProgress.maxUnlocked ? trackProgress.maxUnlocked : 'L1';
        return {
            maxUnlocked: maxUnlocked,
            maxIndex: levelIndex(maxUnlocked),
            bands: trackProgress && Array.isArray(trackProgress.bands) ? trackProgress.bands : []
        };
    }

    global.PersonalWorkbenchBankLevels = {
        LEVELS: LEVELS.slice(),
        UNLOCK_THRESHOLD: UNLOCK_THRESHOLD,
        COURSE_TRACK: COURSE_TRACK,
        TRACK_META: TRACK_META,
        normalizeLevel: normalizeLevel,
        levelIndex: levelIndex,
        levelPool: levelPool,
        levelPoolOrAll: levelPoolOrAll,
        getDefinitions: getDefinitions,
        labelFor: labelFor,
        buildTrackProgress: buildTrackProgress,
        trackForCourse: trackForCourse,
        resolveTrackProgress: resolveTrackProgress,
        isLevelUnlocked: isLevelUnlocked,
        clampLevel: clampLevel,
        unlockHint: unlockHint,
        trackToLevelStat: trackToLevelStat,
        resolveLevelStats: resolveLevelStats
    };
})(typeof window !== 'undefined' ? window : globalThis);
