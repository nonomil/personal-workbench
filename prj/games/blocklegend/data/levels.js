/**
 * blocklegend · 关卡与 Boss 纯函数（T20260815-blocklegend-3d S4）
 */
(function (global) {
    'use strict';

    const UNLOCK_COST = [0, 50, 150, 300, 500, 800];
    const SUN_PER_LEVEL = 8;
    const SHIELD_REDUCE = 0.5;
    const BROKEN_MS = 8000;
    const LEVEL_TOTAL = 6;

    const LEVELS = [
        {
            level: 1, waves: 2, bossHp: 80, bossShield: 3, climate: 'plains', worldSeed: 7,
            bossId: 'wither', bossMechanic: 'speak-break', missionType: 'chop-craft-fight',
            waveKinds: ['slime', 'cube', 'creeper'], targetWords: 5, reviewRatio: 0.2,
            wordThemes: ['自然', '物品', '动物'],
            focusWords: ['tree', 'dirt', 'sword', 'slime', 'apple'],
            unlock: { coins: 0, recallWords: 0 }
        },
        {
            level: 2, waves: 2, bossHp: 110, bossShield: 4, climate: 'cherry', worldSeed: 21,
            bossId: 'mirror-fox', bossMechanic: 'direction-callout', missionType: 'find-and-guide',
            waveKinds: ['slime', 'fox', 'creeper'], targetWords: 6, reviewRatio: 0.4,
            wordThemes: ['动物', '自然', '方位'],
            focusWords: ['fox', 'flower', 'left', 'right', 'behind', 'tree'],
            unlock: { coins: 50, recallWords: 5 }
        },
        {
            level: 3, waves: 3, bossHp: 140, bossShield: 4, climate: 'desert', worldSeed: 33,
            bossId: 'key-guardian', bossMechanic: 'spell-key', missionType: 'collect-key',
            waveKinds: ['cube', 'zombie', 'husk'], targetWords: 6, reviewRatio: 0.4,
            wordThemes: ['物品', '自然', '动作'],
            focusWords: ['sand', 'stone', 'key', 'door', 'chest', 'open'],
            unlock: { coins: 150, recallWords: 5 }
        },
        {
            level: 4, waves: 3, bossHp: 170, bossShield: 5, climate: 'duskvale', worldSeed: 47,
            bossId: 'dragon', bossMechanic: 'action-potion', missionType: 'night-escort',
            waveKinds: ['fox', 'skeleton', 'enderman'], targetWords: 7, reviewRatio: 0.5,
            wordThemes: ['动作', '生活', '动物'],
            focusWords: ['run', 'jump', 'torch', 'night', 'wolf', 'help', 'light'],
            unlock: { coins: 300, recallWords: 5 }
        },
        {
            level: 5, waves: 3, bossHp: 200, bossShield: 5, climate: 'crystal', worldSeed: 59,
            bossId: 'storm', bossMechanic: 'listen-pair', missionType: 'sort-crystal',
            waveKinds: ['spider', 'witch', 'warden', 'golem'], targetWords: 7, reviewRatio: 0.5,
            wordThemes: ['描述', '颜色', '自然'],
            focusWords: ['blue', 'red', 'hard', 'soft', 'bright', 'dark', 'crystal'],
            unlock: { coins: 500, recallWords: 5 }
        },
        {
            level: 6, waves: 4, bossHp: 240, bossShield: 6, climate: 'nether', worldSeed: 71,
            bossId: 'wither', bossMechanic: 'review-route', missionType: 'mixed-review',
            waveKinds: ['magma', 'piglin', 'ghast'], targetWords: 8, reviewRatio: 0.7,
            wordThemes: ['高频词', '动物', '物品'],
            focusWords: ['fire', 'gold', 'hot', 'dark', 'run', 'help', 'door', 'key'],
            unlock: { coins: 800, recallWords: 5 }
        }
    ];

    function cloneBoss(boss) {
        return Object.assign({}, boss);
    }

    function levelOf(n) {
        return LEVELS[Math.max(0, Math.min(LEVEL_TOTAL, Number(n) || 1) - 1)];
    }

    function eventKey(n) {
        return 'level-' + Number(n);
    }

    function bossModelOf(id) {
        if (id === 'dragon') return 'dragon';
        if (id === 'storm') return 'storm';
        if (id === 'mirror-fox') return 'fox';
        return 'boss';
    }

    function bossTitle(id) {
        if (id === 'dragon') return '末影龙';
        if (id === 'storm') return '凋零风暴';
        if (id === 'mirror-fox') return '镜子狐狸';
        if (id === 'key-guardian') return '钥匙守卫';
        return '凋零';
    }

    function createBoss(level) {
        const cfg = levelOf(level);
        return {
            level: cfg.level,
            id: cfg.bossId,
            mechanic: cfg.bossMechanic || 'speak-break',
            hp: cfg.bossHp,
            maxHp: cfg.bossHp,
            shield: cfg.bossShield,
            shieldMax: cfg.bossShield,
            state: 'shielded',
            color: 'blue',
            brokenUntil: 0,
            dead: false
        };
    }

    function applyBossDamage(boss, raw, opts) {
        const now = (opts && opts.now) || 0;
        let b = tickBoss(boss, now);
        if (b.dead) return { dealt: 0, boss: b };
        const amount = Number(raw) || 0;
        const dealt = b.state === 'shielded' ? amount * SHIELD_REDUCE : amount;
        b = cloneBoss(b);
        b.hp = Math.max(0, b.hp - dealt);
        if (b.hp <= 0) {
            b.hp = 0;
            b.dead = true;
        }
        return { dealt: dealt, boss: b };
    }

    function shieldChipOf(channel, shield) {
        if (channel === 'speak' || channel === 'spell') return Math.max(1, Number(shield) || 1);
        return 1;
    }

    function chipShield(boss, amount, opts) {
        const now = (opts && opts.now) || 0;
        let b = tickBoss(boss, now);
        if (b.dead || b.state === 'broken') return { boss: b };
        b = cloneBoss(b);
        b.shield = Math.max(0, b.shield - (Number(amount) || 0));
        if (b.shield <= 0) {
            b.shield = 0;
            b.state = 'broken';
            b.color = 'red';
            b.brokenUntil = now + BROKEN_MS;
        }
        return { boss: b };
    }

    function tickBoss(boss, now) {
        const b = cloneBoss(boss || createBoss(1));
        if (b.dead) return b;
        if (b.state === 'broken' && now >= (b.brokenUntil || 0)) {
            b.state = 'shielded';
            b.color = 'blue';
            b.shield = Math.max(1, Math.floor((b.shieldMax || 1) * 0.5));
            b.brokenUntil = 0;
        }
        return b;
    }

    function tryUnlock(progress, level) {
        const p = Object.assign({ unlockedLevel: 1, coined: 0 }, progress || {});
        const want = Number(level) || 1;
        if (want <= p.unlockedLevel) return { ok: true, unlockedLevel: p.unlockedLevel, coined: p.coined };
        if (want > p.unlockedLevel + 1) return { ok: false, unlockedLevel: p.unlockedLevel, coined: p.coined };
        let cost = UNLOCK_COST[want - 1] || 0;
        const gate = (levelOf(want) && levelOf(want).unlock) || {};
        const needRecall = Number(gate.recallWords) || 0;
        const haveRecall = Number(p.recallWords) || 0;
        if (needRecall && haveRecall >= needRecall) cost = Math.floor(cost * 0.3);
        if ((Number(p.coined) || 0) < cost) {
            return { ok: false, unlockedLevel: p.unlockedLevel, coined: p.coined };
        }
        return { ok: true, unlockedLevel: want, coined: (Number(p.coined) || 0) - cost };
    }

    function bossPhase(boss) {
        const b = boss || {};
        if (b.state === 'broken') return '破罩输出';
        const max = Number(b.shieldMax) || 0;
        const cur = Number(b.shield) || 0;
        const first = max > 0 && cur >= max;
        if (b.mechanic === 'direction-callout') return first ? '听方位' : '喊方位';
        if (b.mechanic === 'spell-key') return first ? '拼钥匙' : '拼写回忆';
        if (b.mechanic === 'action-potion') return first ? '听动作' : '解药水';
        if (b.mechanic === 'listen-pair') return first ? '听近音' : '辨近音';
        if (b.mechanic === 'review-route') return first ? '复习到期词' : '选路线';
        if (first) return '识别';
        return '回忆';
    }

    function buildSettlement(opts) {
        const o = opts || {};
        const sun = Number(o.sunAwarded) || 0;
        const capped = !!o.sunCapped;
        const lv = Number(o.level) || 1;
        const newWords = Number(o.newWords) || 0;
        const review = (o.reviewWords || []).filter(Boolean).slice(0, 5);
        const next = lv < LEVEL_TOTAL ? '下一关解锁要 ' + (UNLOCK_COST[lv] || 0) + ' 金币' : '全部关卡都打完啦';
        const sunLine = capped
            ? '阳光已达今日上限，学习进度已保存'
            : ('阳光 +' + sun + ' → 工作台成长');
        return {
            gain: '本关学会 ' + newWords + ' 个新词 · ' + sunLine,
            progressLabel: review.length ? ('明天将复习：' + review.join(', ')) : '本关没有待复习词',
            nextGoal: next
        };
    }

    global.BlockLegendLevels = {
        UNLOCK_COST: UNLOCK_COST,
        SUN_PER_LEVEL: SUN_PER_LEVEL,
        SHIELD_REDUCE: SHIELD_REDUCE,
        BROKEN_MS: BROKEN_MS,
        LEVEL_TOTAL: LEVEL_TOTAL,
        LEVELS: LEVELS,
        levelOf: levelOf,
        eventKey: eventKey,
        bossModelOf: bossModelOf,
        bossTitle: bossTitle,
        createBoss: createBoss,
        applyBossDamage: applyBossDamage,
        shieldChipOf: shieldChipOf,
        chipShield: chipShield,
        tickBoss: tickBoss,
        tryUnlock: tryUnlock,
        bossPhase: bossPhase,
        buildSettlement: buildSettlement
    };
}(typeof window !== 'undefined' ? window : globalThis));
