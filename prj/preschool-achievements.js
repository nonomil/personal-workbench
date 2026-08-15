(function (global) {
    'use strict';

    const BADGE_GROUPS = [
        { id: 'garden', title: '花园世界', ids: ['GARDEN_BRONZE', 'GARDEN_SILVER', 'GARDEN_GOLD'] },
        { id: 'map', title: '冒险地图', ids: ['MAP_BRONZE', 'MAP_SILVER', 'MAP_GOLD'] },
        { id: 'builder', title: '建造世界', ids: ['BUILDER_BRONZE', 'BUILDER_SILVER', 'BUILDER_GOLD'] },
        { id: 'levels', title: '分级解锁', ids: ['LITERACY_L2', 'LITERACY_L3', 'LITERACY_L4', 'LITERACY_L5', 'ENGLISH_L2', 'ENGLISH_L3', 'ENGLISH_L4', 'ENGLISH_L5'] },
        { id: 'unified', title: '三域', ids: ['UNIFIED_SILVER', 'UNIFIED_GOLD'] }
    ];
    const BADGE_ORDER = BADGE_GROUPS.reduce(function (ids, group) {
        return ids.concat(group.ids);
    }, []);
    const BADGE_COUNT = BADGE_ORDER.length;

    function levelUnlocked(stats, track, level) {
        const entry = stats && stats.levels && stats.levels[track];
        const maxIndex = entry && typeof entry.maxIndex === 'number' ? entry.maxIndex : 0;
        const bankLevels = global.PersonalWorkbenchBankLevels;
        const targetIndex = bankLevels && typeof bankLevels.levelIndex === 'function'
            ? bankLevels.levelIndex(level)
            : ['L1', 'L2', 'L3', 'L4', 'L5'].indexOf(String(level || 'L1').toUpperCase());
        return maxIndex >= targetIndex;
    }

    function makeLevelBadge(id, track, level, name, tier, color) {
        const trackLabel = track === 'literacy' ? '识字' : '英语';
        return {
            id: id,
            name: name,
            description: trackLabel + '分级开到 ' + level,
            category: 'levels',
            track: track,
            level: level,
            tier: tier,
            color: color,
            mark: 'level-gate',
            conditionLabel: trackLabel + '开到 ' + level,
            check: function (stats) { return levelUnlocked(stats, track, level); }
        };
    }

    const BADGE_DEFS = {
        GARDEN_BRONZE: { id: 'GARDEN_BRONZE', name: '花园新秀', description: '已学汉字达到10个', category: 'garden', tier: 'bronze', color: '#CD7F32', mark: 'flower', conditionLabel: '已学汉字 10 个', need: 10, check: function (stats) { return Number(stats.garden && stats.garden.flowers) >= 10; } },
        GARDEN_SILVER: { id: 'GARDEN_SILVER', name: '花园园丁', description: '已学汉字达到50个', category: 'garden', tier: 'silver', color: '#C0C0C0', mark: 'flower-star', conditionLabel: '已学汉字 50 个', need: 50, check: function (stats) { return Number(stats.garden && stats.garden.flowers) >= 50; } },
        GARDEN_GOLD: { id: 'GARDEN_GOLD', name: '花园大师', description: '已学汉字达到100个', category: 'garden', tier: 'gold', color: '#FFD700', mark: 'flower-glow', conditionLabel: '已学汉字 100 个', need: 100, check: function (stats) { return Number(stats.garden && stats.garden.flowers) >= 100; } },
        MAP_BRONZE: { id: 'MAP_BRONZE', name: '小探险家', description: '今日任务全部完成达到3天', category: 'map', tier: 'bronze', color: '#CD7F32', mark: 'flag', conditionLabel: '完美日 3 天', need: 3, check: function (stats) { return Number(stats.adventure && stats.adventure.days) >= 3; } },
        MAP_SILVER: { id: 'MAP_SILVER', name: '探险先锋', description: '今日任务全部完成达到15天', category: 'map', tier: 'silver', color: '#C0C0C0', mark: 'flag-path', conditionLabel: '完美日 15 天', need: 15, check: function (stats) { return Number(stats.adventure && stats.adventure.days) >= 15; } },
        MAP_GOLD: { id: 'MAP_GOLD', name: '大冒险家', description: '今日任务全部完成达到30天', category: 'map', tier: 'gold', color: '#FFD700', mark: 'flag-crown', conditionLabel: '完美日 30 天', need: 30, check: function (stats) { return Number(stats.adventure && stats.adventure.days) >= 30; } },
        BUILDER_BRONZE: { id: 'BUILDER_BRONZE', name: '小镇居民', description: '英语或拼读课达到10节', category: 'builder', tier: 'bronze', color: '#CD7F32', mark: 'house', conditionLabel: '已完成 10 节英语课', need: 10, check: function (stats) { return Number(stats.builder && stats.builder.bricks) >= 10; } },
        BUILDER_SILVER: { id: 'BUILDER_SILVER', name: '小镇工匠', description: '英语或拼读课达到50节', category: 'builder', tier: 'silver', color: '#C0C0C0', mark: 'house-brick', conditionLabel: '已完成 50 节英语课', need: 50, check: function (stats) { return Number(stats.builder && stats.builder.bricks) >= 50; } },
        BUILDER_GOLD: { id: 'BUILDER_GOLD', name: '镇长', description: '英语或拼读课达到100节', category: 'builder', tier: 'gold', color: '#FFD700', mark: 'castle', conditionLabel: '已完成 100 节英语课', need: 100, check: function (stats) { return Number(stats.builder && stats.builder.bricks) >= 100; } },
        LITERACY_L2: makeLevelBadge('LITERACY_L2', 'literacy', 'L2', '识字 L2', 'bronze', '#CD7F32'),
        LITERACY_L3: makeLevelBadge('LITERACY_L3', 'literacy', 'L3', '识字 L3', 'silver', '#C0C0C0'),
        LITERACY_L4: makeLevelBadge('LITERACY_L4', 'literacy', 'L4', '识字 L4', 'gold', '#FFD700'),
        LITERACY_L5: makeLevelBadge('LITERACY_L5', 'literacy', 'L5', '识字 L5', 'gold', '#FBBF24'),
        ENGLISH_L2: makeLevelBadge('ENGLISH_L2', 'english', 'L2', '英语 L2', 'bronze', '#CD7F32'),
        ENGLISH_L3: makeLevelBadge('ENGLISH_L3', 'english', 'L3', '英语 L3', 'silver', '#C0C0C0'),
        ENGLISH_L4: makeLevelBadge('ENGLISH_L4', 'english', 'L4', '英语 L4', 'gold', '#FFD700'),
        ENGLISH_L5: makeLevelBadge('ENGLISH_L5', 'english', 'L5', '英语 L5', 'gold', '#FBBF24'),
        UNIFIED_SILVER: { id: 'UNIFIED_SILVER', name: '三域行者', description: '三项银牌全部点亮', category: 'unified', tier: 'silver', color: '#7DD3FC', mark: 'rings', conditionLabel: '三枚银牌都点亮了', check: function (stats, unlocked) { return hasAll(unlocked, ['GARDEN_SILVER', 'MAP_SILVER', 'BUILDER_SILVER']); } },
        UNIFIED_GOLD: { id: 'UNIFIED_GOLD', name: '全能大师', description: '三项金牌全部点亮', category: 'unified', tier: 'gold', color: '#FBBF24', mark: 'rings-crown', conditionLabel: '三枚金牌都点亮了', check: function (stats, unlocked) { return hasAll(unlocked, ['GARDEN_GOLD', 'MAP_GOLD', 'BUILDER_GOLD']); } }
    };

    const LAST_SHOWN_MS = 3 * 24 * 60 * 60 * 1000;
    const BADGE_ART_BASE = '../assets/generated/preschool-badges-pets/badges/published/';
    const BADGE_ART_FILES = {
        GARDEN_BRONZE: 'badge-garden-bronze.png',
        GARDEN_SILVER: 'badge-garden-silver.png',
        GARDEN_GOLD: 'badge-garden-gold.png',
        MAP_BRONZE: 'badge-map-bronze.png',
        MAP_SILVER: 'badge-map-silver.png',
        MAP_GOLD: 'badge-map-gold.png',
        BUILDER_BRONZE: 'badge-builder-bronze.png',
        BUILDER_SILVER: 'badge-builder-silver.png',
        BUILDER_GOLD: 'badge-builder-gold.png',
        UNIFIED_SILVER: 'badge-unified-silver.png',
        UNIFIED_GOLD: 'badge-unified-gold.png'
    };

    function hasAll(list, ids) {
        const set = new Set(Array.isArray(list) ? list : []);
        return ids.every(function (id) { return set.has(id); });
    }

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value || {}));
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function normalizeAchievements(input) {
        const source = input && typeof input === 'object' ? input : {};
        const unlocked = asArray(source.unlocked).filter(function (item) { return typeof item === 'string' && BADGE_DEFS[item]; });
        const seen = new Set();
        const history = asArray(source.history).filter(function (item) {
            return item && typeof item === 'object' && typeof item.id === 'string' && BADGE_DEFS[item.id];
        }).map(function (item) {
            return { id: item.id, unlockedAt: Number(item.unlockedAt) || 0 };
        }).filter(function (item) {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
        const lastShown = typeof source.lastShown === 'string' && BADGE_DEFS[source.lastShown] ? source.lastShown : (unlocked[unlocked.length - 1] || '');
        const viewed = asArray(source.seen).filter(function (item) {
            return typeof item === 'string' && BADGE_DEFS[item] && unlocked.indexOf(item) >= 0;
        });
        return { unlocked: unlocked, history: history, lastShown: lastShown, seen: viewed };
    }

    function unseenBadgeIds(input) {
        const current = normalizeAchievements(input);
        const viewed = new Set(current.seen);
        return current.unlocked.filter(function (id) { return !viewed.has(id); });
    }

    function markAchievementsSeen(input, ids) {
        const current = normalizeAchievements(input);
        const extra = Array.isArray(ids) && ids.length ? ids : current.unlocked;
        const viewed = new Set(current.seen.concat(extra));
        current.seen = current.unlocked.filter(function (id) { return viewed.has(id); });
        return current;
    }

    function countCompletedLessons(catalog, completedIds, pattern) {
        const completed = new Set(asArray(completedIds));
        let count = 0;
        (Array.isArray(catalog) ? catalog : []).forEach(function (course) {
            if (!pattern.test(String(course && course.id || ''))) return;
            asArray(course.lessons).forEach(function (lesson) {
                if (lesson && completed.has(lesson.id)) count += 1;
            });
        });
        return count;
    }

    // 地图徽章按 Kids-Reward-Chart 的 perfect day：当天每项任务都完成才计 1 天。
    // 没有任务记录时，回退到 checkinDates，兼容旧数据和测试夹具。
    function countFullPlanDays(state) {
        const dated = asArray(state && state.dailyPlans).filter(function (plan) {
            return plan && /^\d{4}-\d{2}-\d{2}$/.test(String(plan.date || ''));
        });
        if (!dated.length) {
            return Array.from(new Set(asArray(state && state.growth && state.growth.checkinDates)
                .filter(function (date) { return /^\d{4}-\d{2}-\d{2}$/.test(String(date)); }))).length;
        }
        const byDate = {};
        dated.forEach(function (plan) {
            const date = String(plan.date);
            if (!byDate[date]) byDate[date] = { total: 0, done: 0 };
            byDate[date].total += 1;
            if (plan.done) byDate[date].done += 1;
        });
        return Object.keys(byDate).filter(function (date) {
            return byDate[date].total > 0 && byDate[date].done === byDate[date].total;
        }).length;
    }

    // 花朵=已学汉字；天数=全日任务完成；砖块=英语/拼读完成课；分级=词库掌握度解锁阶梯
    function getGrowthStats(state, catalog, banks) {
        const progress = state && state.courseProgress && typeof state.courseProgress === 'object' ? state.courseProgress : {};
        const mastery = progress.literacy && progress.literacy.mastery && typeof progress.literacy.mastery === 'object'
            ? progress.literacy.mastery
            : {};
        const stats = {
            garden: { flowers: Object.keys(mastery).length },
            adventure: { days: countFullPlanDays(state) },
            builder: { bricks: countCompletedLessons(catalog, progress.completedLessonIds, /english|phonics/i) },
            levels: {
                literacy: { maxUnlocked: 'L1', maxIndex: 0, bands: [] },
                english: { maxUnlocked: 'L1', maxIndex: 0, bands: [] }
            }
        };
        const bankLevels = global.PersonalWorkbenchBankLevels;
        if (bankLevels && typeof bankLevels.resolveLevelStats === 'function' && banks && typeof banks === 'object') {
            stats.levels = bankLevels.resolveLevelStats(progress, banks);
        }
        return stats;
    }

    function checkAchievements(state, options) {
        const opts = options || {};
        const stats = opts.stats || getGrowthStats(state, opts.catalog, opts.banks);
        const now = Number(opts.now) || Date.now();
        const growth = clone(state && state.growth ? state.growth : {});
        const current = normalizeAchievements(growth.achievements);
        const unlocked = current.unlocked.slice();
        const newlyUnlocked = [];
        BADGE_ORDER.forEach(function (id) {
            const def = BADGE_DEFS[id];
            if (unlocked.indexOf(id) >= 0) return;
            if (!def.check(stats, unlocked)) return;
            unlocked.push(id);
            newlyUnlocked.push(id);
            current.history.push({ id: id, unlockedAt: now });
        });
        current.unlocked = unlocked;
        if (newlyUnlocked.length) {
            current.lastShown = newlyUnlocked[newlyUnlocked.length - 1];
            if (global.petSystem && typeof global.petSystem.addHappiness === 'function') {
                global.petSystem.addHappiness(5);
            }
        }
        growth.achievements = current;
        return { growth: growth, newlyUnlocked: newlyUnlocked, stats: stats };
    }

    function iconMarkup(kind, color) {
        if (kind === 'flower' || kind === 'flower-star' || kind === 'flower-glow') {
            return `<g transform="translate(40,36)"><circle cx="0" cy="0" r="6" fill="#FFD700"/><circle cx="-10" cy="-6" r="5" fill="#FF6B6B"/><circle cx="10" cy="-6" r="5" fill="#FF6B6B"/><circle cx="-6" cy="8" r="5" fill="#FF6B6B"/><circle cx="6" cy="8" r="5" fill="#FF6B6B"/>${kind === 'flower-star' || kind === 'flower-glow' ? `<polygon points="0,-18 2,-12 8,-12 3,-8 5,-2 0,-6 -5,-2 -3,-8 -8,-12 -2,-12" fill="${color}"/>` : ''}${kind === 'flower-glow' ? `<circle cx="0" cy="0" r="22" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.55"/>` : ''}</g>`;
        }
        if (kind === 'flag' || kind === 'flag-path' || kind === 'flag-crown') {
            return `<g transform="translate(28,22)"><rect x="0" y="0" width="3" height="36" fill="#F8FAFC"/><polygon points="3,2 28,10 3,18" fill="#EF4444"/>${kind === 'flag-path' ? `<path d="M6 40 C14 34, 22 46, 32 40" fill="none" stroke="${color}" stroke-width="2"/>` : ''}${kind === 'flag-crown' ? `<polygon points="18,-6 22,-14 26,-6 32,-8 30,0 14,0 12,-8" fill="${color}"/>` : ''}</g>`;
        }
        if (kind === 'house' || kind === 'house-brick') {
            return `<g transform="translate(22,24)"><polygon points="18,2 34,16 2,16" fill="${color}"/><rect x="6" y="16" width="24" height="18" fill="#F8FAFC"/><rect x="14" y="24" width="8" height="10" fill="#334155"/>${kind === 'house-brick' ? `<rect x="-2" y="30" width="10" height="6" fill="#C2410C"/><rect x="28" y="30" width="10" height="6" fill="#C2410C"/>` : ''}</g>`;
        }
        if (kind === 'castle') {
            return `<g transform="translate(18,22)"><rect x="4" y="14" width="36" height="24" fill="#F8FAFC"/><rect x="0" y="8" width="10" height="30" fill="${color}"/><rect x="34" y="8" width="10" height="30" fill="${color}"/><rect x="18" y="4" width="8" height="34" fill="${color}"/><rect x="20" y="24" width="4" height="14" fill="#334155"/></g>`;
        }
        if (kind === 'rings' || kind === 'rings-crown') {
            return `<g transform="translate(40,40)" fill="none" stroke="${color}" stroke-width="3"><circle cx="-10" cy="2" r="10"/><circle cx="10" cy="2" r="10"/><circle cx="0" cy="-8" r="10"/>${kind === 'rings-crown' ? `<polygon points="-8,-22 -4,-30 0,-22 4,-30 8,-22 10,-16 -10,-16" fill="${color}" stroke="none"/>` : ''}</g>`;
        }
        if (kind === 'level-gate') {
            return `<g transform="translate(24,24)"><rect x="8" y="14" width="16" height="22" rx="2" fill="none" stroke="${color}" stroke-width="2"/><path d="M8 14 L16 6 L24 14" fill="none" stroke="${color}" stroke-width="2"/><circle cx="16" cy="24" r="3" fill="${color}"/></g>`;
        }
        return '';
    }

    function renderBadgeSvg(def, unlocked) {
        const color = unlocked ? def.color : '#94A3B8';
        const fillStart = unlocked ? '#1F2937' : '#4B5563';
        const fillEnd = unlocked ? '#111827' : '#374151';
        const gid = `badge-bg-${def.id}-${unlocked ? 'on' : 'off'}`;
        const shadowId = `badge-shadow-${def.id}-${unlocked ? 'on' : 'off'}`;
        return `<svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${fillStart}"/><stop offset="100%" stop-color="${fillEnd}"/></linearGradient><filter id="${shadowId}"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.32"/></filter></defs><circle cx="40" cy="40" r="36" fill="none" stroke="${color}" stroke-width="4" filter="url(#${shadowId})"/><circle cx="40" cy="40" r="30" fill="url(#${gid})"/><circle cx="20" cy="20" r="2" fill="${color}" opacity="0.5"/><circle cx="60" cy="20" r="2" fill="${color}" opacity="0.5"/><circle cx="40" cy="62" r="2" fill="${color}" opacity="0.5"/>${iconMarkup(def.mark, color)}</svg>`;
    }

    function renderBadgeArt(def, unlocked) {
        const file = BADGE_ART_FILES[def.id];
        // 未解锁用灰色 SVG 占位，不展示彩色 PNG
        if (!unlocked || !file) return renderBadgeSvg(def, false);
        return `<img class="preschool-badge-png" src="${BADGE_ART_BASE}${file}" alt="" width="80" height="80">`;
    }

    function badgeHave(def, stats) {
        if (!def || !stats) return 0;
        if (def.category === 'garden') return Number(stats.garden && stats.garden.flowers) || 0;
        if (def.category === 'map') return Number(stats.adventure && stats.adventure.days) || 0;
        if (def.category === 'builder') return Number(stats.builder && stats.builder.bricks) || 0;
        if (def.category === 'levels') {
            const entry = stats.levels && stats.levels[def.track];
            return entry && typeof entry.maxIndex === 'number' ? entry.maxIndex + 1 : 1;
        }
        return 0;
    }

    function badgeProgressLabel(def, stats, unlockedSet) {
        if (!def) return '';
        if (def.category === 'unified') return badgeRemainingHint(def, unlockedSet, stats);
        if (def.category === 'levels') {
            const entry = stats && stats.levels && stats.levels[def.track];
            const max = entry && entry.maxUnlocked ? entry.maxUnlocked : 'L1';
            return levelUnlocked(stats, def.track, def.level)
                ? def.conditionLabel
                : `${def.track === 'literacy' ? '识字' : '英语'}现在 ${max}`;
        }
        const have = badgeHave(def, stats);
        const need = Number(def.need) || 0;
        if (def.category === 'garden') return `已学汉字 ${have}/${need}`;
        if (def.category === 'map') return `完美日 ${have}/${need} 天`;
        return `英语课 ${have}/${need} 节`;
    }

    function badgeRemainingHint(def, unlocked, stats) {
        if (!def) return '';
        if (def.category === 'unified') {
            const need = unifiedNeedIds(def);
            const left = need.filter(function (id) { return !unlocked.has(id); }).length;
            const kind = def.id === 'UNIFIED_GOLD' ? '金牌' : '银牌';
            return left ? `还差 ${left} 枚${kind}` : def.conditionLabel;
        }
        if (!stats) return def.description;
        if (def.category === 'levels') {
            const entry = stats.levels && stats.levels[def.track];
            const max = entry && entry.maxUnlocked ? entry.maxUnlocked : 'L1';
            return levelUnlocked(stats, def.track, def.level)
                ? def.conditionLabel
                : `现在开到 ${max}，继续练上一级`;
        }
        const have = badgeHave(def, stats);
        const need = Number(def.need) || 0;
        const left = Math.max(0, need - have);
        if (!left) return def.conditionLabel;
        if (def.category === 'garden') return `还差 ${left} 个汉字`;
        if (def.category === 'map') return `还差 ${left} 个全日`;
        return `还差 ${left} 节英语课`;
    }

    function badgeStageLabel(def) {
        if (!def) return '';
        if (def.category === 'levels') return '分级';
        if (def.tier === 'bronze') return '探索者';
        if (def.tier === 'silver') return '建造者';
        return '大师';
    }

    function unifiedNeedIds(def) {
        return def && def.id === 'UNIFIED_GOLD'
            ? ['GARDEN_GOLD', 'MAP_GOLD', 'BUILDER_GOLD']
            : ['GARDEN_SILVER', 'MAP_SILVER', 'BUILDER_SILVER'];
    }

    function badgeCardMeterPercent(def, stats, unlockedSet) {
        if (!def) return 0;
        if (def.category === 'unified') {
            const need = unifiedNeedIds(def);
            const got = need.filter(function (id) { return unlockedSet.has(id); }).length;
            return Math.round(got / need.length * 100);
        }
        const need = Number(def.need) || 1;
        return Math.min(100, Math.round(badgeHave(def, stats) / need * 100));
    }

    function renderBadgeCard(def, unlocked, stats, unlockedSet, unseenSet) {
        const speak = unlocked
            ? `已点亮${def.name}`
            : `${def.name}，${badgeRemainingHint(def, unlockedSet, stats)}`;
        const progress = badgeProgressLabel(def, stats, unlockedSet);
        const isNew = unlocked && unseenSet && unseenSet.has(def.id);
        const percent = badgeCardMeterPercent(def, stats, unlockedSet);
        const stage = badgeStageLabel(def);
        return `<button class="preschool-badge-card is-${unlocked ? 'unlocked' : 'locked'} tier-${escapeHtml(def.tier)}${isNew ? ' is-new' : ''}" type="button" data-action="review-badge" data-badge-id="${escapeHtml(def.id)}" data-speak="${escapeHtml(speak)}">${isNew ? '<span class="preschool-badge-new-chip">新</span>' : ''}<span class="preschool-badge-art">${renderBadgeArt(def, unlocked)}</span><em class="preschool-badge-stage">${escapeHtml(stage)}</em><strong>${escapeHtml(def.name)}</strong><small>${escapeHtml(progress || def.description)}</small><span class="preschool-badge-card-meter" role="progressbar" aria-label="${escapeHtml(def.name)}进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="width:${percent}%"></i></span><b>${unlocked ? '✅ 已点亮' : '⬜ 未点亮'}</b></button>`;
    }

    function groupProgressHint(group, unlocked, stats) {
        const next = group.ids.map(function (id) { return BADGE_DEFS[id]; }).find(function (def) {
            return def && !unlocked.has(def.id);
        });
        if (!next) return '全部点亮啦';
        return badgeRemainingHint(next, unlocked, stats);
    }

    function groupMeterPercent(group, unlocked, stats) {
        if (group.id === 'garden') return Math.min(100, Math.round((Number(stats && stats.garden && stats.garden.flowers) || 0) / 100 * 100));
        if (group.id === 'map') return Math.min(100, Math.round((Number(stats && stats.adventure && stats.adventure.days) || 0) / 30 * 100));
        if (group.id === 'builder') return Math.min(100, Math.round((Number(stats && stats.builder && stats.builder.bricks) || 0) / 100 * 100));
        if (group.id === 'levels') {
            const got = group.ids.filter(function (id) { return unlocked.has(id); }).length;
            return Math.round(got / group.ids.length * 100);
        }
        const marks = ['GARDEN_SILVER', 'MAP_SILVER', 'BUILDER_SILVER', 'GARDEN_GOLD', 'MAP_GOLD', 'BUILDER_GOLD'];
        const got = marks.filter(function (id) { return unlocked.has(id); }).length;
        return Math.round(got / marks.length * 100);
    }

    function renderBadgeGroup(group, unlocked, stats, unseenSet) {
        const got = group.ids.filter(function (id) { return unlocked.has(id); }).length;
        const percent = groupMeterPercent(group, unlocked, stats);
        const cards = group.ids.map(function (id) {
            return renderBadgeCard(BADGE_DEFS[id], unlocked.has(id), stats, unlocked, unseenSet);
        }).join('');
        const ladder = group.id === 'unified' ? '' : group.id === 'levels'
            ? '<p class="preschool-badge-ladder">L2 → L3 → L4 → L5</p>'
            : '<p class="preschool-badge-ladder">探索者 → 建造者 → 大师</p>';
        return `<div class="preschool-badge-group" data-group="${escapeHtml(group.id)}"><h3>${escapeHtml(group.title)} <small>${got}/${group.ids.length} · ${escapeHtml(groupProgressHint(group, unlocked, stats))}</small></h3>${ladder}<div class="preschool-badge-meter" role="progressbar" aria-label="${escapeHtml(group.title)}进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="width:${percent}%"></i></div><div class="preschool-badge-grid">${cards}</div></div>`;
    }

    function renderBadgeFilters(filter) {
        const active = filter || 'all';
        const chips = [{ id: 'all', title: '全部' }].concat(BADGE_GROUPS).map(function (item) {
            const on = item.id === active;
            return `<button class="preschool-badge-filter${on ? ' is-active' : ''}" type="button" data-action="filter-badge-group" data-group="${escapeHtml(item.id)}" aria-pressed="${on ? 'true' : 'false'}">${escapeHtml(item.title)}</button>`;
        }).join('');
        return `<div class="preschool-badge-filters" role="tablist" aria-label="徽章分类">${chips}</div>`;
    }

    function renderCollectionBox(achievements, stats, options) {
        const opts = options || {};
        const filter = opts.filter || 'all';
        const current = normalizeAchievements(achievements);
        const unlocked = new Set(current.unlocked);
        const unseenSet = new Set(unseenBadgeIds(current));
        const groups = BADGE_GROUPS.filter(function (group) {
            return filter === 'all' || group.id === filter;
        }).map(function (group) {
            return renderBadgeGroup(group, unlocked, stats, unseenSet);
        }).join('');
        const flowers = stats && stats.garden ? stats.garden.flowers : '';
        const days = stats && stats.adventure ? stats.adventure.days : '';
        const bricks = stats && stats.builder ? stats.builder.bricks : '';
        const literacyLevel = stats && stats.levels && stats.levels.literacy ? stats.levels.literacy.maxUnlocked : '';
        const englishLevel = stats && stats.levels && stats.levels.english ? stats.levels.english.maxUnlocked : '';
        const meta = [flowers !== '' ? `${flowers} 个汉字` : '', days !== '' ? `${days} 个全日` : '', bricks !== '' ? `${bricks} 节英语课` : '', literacyLevel ? `识字 ${literacyLevel}` : '', englishLevel ? `英语 ${englishLevel}` : ''].filter(Boolean).join(' · ');
        const overall = Math.round(current.unlocked.length / BADGE_COUNT * 100);
        return `<section class="preschool-badge-collection" id="preschool-badge-collection" aria-label="徽章收集箱"><div class="preschool-growth-section-head"><div><span class="preschool-growth-kicker">BADGE BOX</span><h2>徽章收集箱</h2><p>徽章只记录已经完成的学习，不另做一份假进度。${meta ? `现在：${escapeHtml(meta)}` : ''}</p></div><div class="preschool-badge-collection-actions"><span class="preschool-growth-section-count">${current.unlocked.length}/${BADGE_COUNT} 已收集</span><button class="preschool-badge-box-close badge-collection-toggle" type="button" data-action="toggle-badge-box">收起</button></div></div><div class="preschool-badge-hero"><button class="preschool-badge-hero-trophy" type="button" data-action="badge-confetti" aria-label="撒花">🏅</button><div class="preschool-badge-hero-copy"><small>徽章收集</small><strong>${current.unlocked.length}<span>/${BADGE_COUNT}</span></strong></div><div class="preschool-badge-meter is-overall" role="progressbar" aria-label="徽章收集进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${overall}"><i style="width:${overall}%"></i></div></div>${renderBadgeFilters(filter)}<div class="preschool-badge-groups">${groups}</div></section>`;
    }

    function renderParentBadgeWall(achievements) {
        const current = normalizeAchievements(achievements);
        const items = current.unlocked.map(function (id) { return BADGE_DEFS[id]; }).filter(Boolean);
        const overall = Math.round(items.length / BADGE_COUNT * 100);
        const cards = items.length
            ? items.map(function (def) {
                return `<span class="preschool-parent-badge" title="${escapeHtml(def.description)}">${renderBadgeArt(def, true)}<em>${escapeHtml(def.name)}</em><small>${escapeHtml(badgeStageLabel(def))}</small></span>`;
            }).join('')
            : '<span class="preschool-weekly-empty">还没有成长徽章，识字、行动和英语会慢慢点亮。</span>';
        return `<section class="preschool-parent-badge-wall" aria-label="徽章墙"><strong>🏅 徽章墙</strong><small>${items.length}/${BADGE_COUNT} 已获得</small><div class="preschool-badge-meter is-overall" role="progressbar" aria-label="徽章墙进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${overall}"><i style="width:${overall}%"></i></div><div class="preschool-parent-badge-list">${cards}</div></section>`;
    }

    function isLastShownFresh(current, now) {
        const item = asArray(current && current.history).find(function (entry) {
            return entry && entry.id === current.lastShown;
        });
        if (!item || !item.unlockedAt) return Boolean(current && current.lastShown);
        return (Number(now) || Date.now()) - Number(item.unlockedAt) < LAST_SHOWN_MS;
    }

    function renderLastShown(achievements, now) {
        const current = normalizeAchievements(achievements);
        const def = BADGE_DEFS[current.lastShown];
        if (!def || !isLastShownFresh(current, now)) {
            const faded = Boolean(def);
            return `<button class="preschool-home-latest-badge is-empty" type="button" data-action="navigate" data-page="growth" data-open-badges="1" aria-label="${faded ? '徽章在收集箱' : '还没有徽章'}"><span>${faded ? '徽章在收集箱' : '还没有徽章'}</span><small>去收集箱看看</small></button>`;
        }
        return `<button class="preschool-home-latest-badge" type="button" data-action="navigate" data-page="growth" data-open-badges="1" aria-label="最新徽章 ${def.name}">${renderBadgeArt(def, true)}<span><b>${escapeHtml(def.name)}</b><small>最新徽章</small></span></button>`;
    }

    function renderCelebrationHtml(ids) {
        const list = asArray(ids).filter(function (id) { return BADGE_DEFS[id]; });
        if (!list.length) return '';
        const latest = BADGE_DEFS[list[list.length - 1]];
        const title = list.length === 1 ? latest.name : `一次点亮 ${list.length} 枚徽章`;
        const detail = list.length === 1
            ? latest.conditionLabel
            : list.map(function (id) { return BADGE_DEFS[id].name; }).join('、');
        const bonus = list.length === 1
            ? `${badgeStageLabel(latest)} · 伙伴更开心了`
            : '伙伴更开心了';
        const arts = list.map(function (id, index) {
            const def = BADGE_DEFS[id];
            return `<span class="preschool-achievement-art" data-badge-id="${escapeHtml(def.id)}" style="animation-delay:${index * 0.08}s">${renderBadgeArt(def, true)}<em>${escapeHtml(def.name)}</em><small>${escapeHtml(badgeStageLabel(def))}</small></span>`;
        }).join('');
        return `<div class="preschool-achievement-dialog" role="dialog" aria-modal="true" aria-label="解锁徽章 ${escapeHtml(title)}"><div class="preschool-achievement-arts ${list.length === 1 ? 'is-single' : 'is-many'}">${arts}</div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small><small class="preschool-achievement-bonus">${escapeHtml(bonus)}</small><button class="preschool-achievement-close" type="button" data-achievement-close="true">太棒了！🎉</button></div>`;
    }

    function renderConfettiPieces() {
        const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6BD6'];
        const pieces = [];
        for (let index = 0; index < 40; index += 1) {
            const left = Math.round(Math.random() * 1000) / 10;
            const delay = Math.round(Math.random() * 50) / 100;
            const size = 6 + Math.round(Math.random() * 8);
            const color = colors[index % colors.length];
            const radius = index % 2 === 0 ? '50%' : '2px';
            pieces.push(`<i class="preschool-confetti-piece" style="left:${left}%;background:${color};animation-delay:${delay}s;width:${size}px;height:${size}px;border-radius:${radius}"></i>`);
        }
        return `<div class="preschool-achievement-confetti" aria-hidden="true">${pieces.join('')}</div>`;
    }

    function burstBadgeConfetti(doc) {
        const root = doc || (typeof document !== 'undefined' ? document : null);
        if (!root || !root.body) return;
        const old = root.querySelector('.preschool-achievement-overlay.is-confetti-only');
        if (old) old.remove();
        const overlay = root.createElement('div');
        overlay.className = 'preschool-achievement-overlay is-confetti-only';
        overlay.innerHTML = renderConfettiPieces();
        overlay.setAttribute('aria-hidden', 'true');
        root.body.appendChild(overlay);
        if (typeof window !== 'undefined') {
            window.setTimeout(function () { overlay.remove(); }, 1800);
        }
    }

    function showAchievementCelebration(ids, doc, onClose) {
        const root = doc || (typeof document !== 'undefined' ? document : null);
        if (!root || !root.body) return;
        const html = renderCelebrationHtml(ids);
        if (!html) return;
        const old = root.querySelector('.preschool-achievement-overlay');
        if (old) old.remove();
        const overlay = root.createElement('div');
        overlay.className = 'preschool-achievement-overlay';
        overlay.innerHTML = html + renderConfettiPieces();
        function finish() {
            overlay.remove();
            if (typeof onClose === 'function') onClose();
        }
        overlay.addEventListener('click', function (event) {
            const close = event.target.closest('[data-achievement-close]');
            if (close || event.target === overlay) finish();
        });
        root.body.appendChild(overlay);
        if (typeof window !== 'undefined') {
            window.setTimeout(function () {
                const confetti = overlay.querySelector('.preschool-achievement-confetti');
                if (confetti) confetti.remove();
            }, 2000);
        }
    }

    global.PersonalWorkbenchAchievements = {
        BADGE_ORDER: BADGE_ORDER,
        BADGE_COUNT: BADGE_COUNT,
        BADGE_GROUPS: BADGE_GROUPS,
        BADGE_DEFS: BADGE_DEFS,
        normalizeAchievements: normalizeAchievements,
        unseenBadgeIds: unseenBadgeIds,
        markAchievementsSeen: markAchievementsSeen,
        getGrowthStats: getGrowthStats,
        checkAchievements: checkAchievements,
        renderBadgeSvg: renderBadgeSvg,
        renderBadgeArt: renderBadgeArt,
        renderCollectionBox: renderCollectionBox,
        renderParentBadgeWall: renderParentBadgeWall,
        renderLastShown: renderLastShown,
        renderCelebrationHtml: renderCelebrationHtml,
        burstBadgeConfetti: burstBadgeConfetti,
        showAchievementCelebration: showAchievementCelebration
    };
})(typeof window !== 'undefined' ? window : globalThis);
