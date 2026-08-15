/**
 * blocklegend · 词卡纯函数（T20260815-blocklegend-3d S3）
 * 词池切分 + 四选一同 theme 干扰项 + 出题节奏。
 */
(function (global) {
    'use strict';

    const SKIP_COMBO = 3;
    const QUIZ_MS = 12000;
    const PACK_BASE = '../../assets/vocab/core-english-2026.08.15';
    const CAT_ORDER = ['颜色', '家人', '身体', '自然', '食物', '动物', '动作', '表达', '物品', '描述', '高频词', '生活', '学校'];

    function byId(a, b) {
        return String(a.id || a.text) < String(b.id || b.text) ? -1 : 1;
    }

    function catRank(theme) {
        const i = CAT_ORDER.indexOf(theme);
        return i < 0 ? 99 : i;
    }

    function cardsToBank(catalog, base) {
        const root = String(base || PACK_BASE).replace(/\/$/, '');
        const cards = (catalog && catalog.cards) || [];
        return cards.map(function (card) {
            const image = card.image ? root + '/' + card.image : '';
            const audio = card.audio ? root + '/' + card.audio : '';
            return {
                id: card.id,
                text: card.word,
                zh: card.translation,
                theme: card.category || '',
                level: card.curriculumLevel || 'L1',
                phrase: card.example || card.phrase || '',
                phraseZh: card.exampleZh || card.phraseTranslation || '',
                distractors: Array.isArray(card.distractors) ? card.distractors.slice() : [],
                media: { image: image, audio: audio }
            };
        }).filter(function (w) { return w.text && w.zh; });
    }

    function loadCatalog(done, opts) {
        const o = opts || {};
        const base = o.base || PACK_BASE;
        if (o.catalog) {
            done(null, cardsToBank(o.catalog, base));
            return;
        }
        if (typeof fetch !== 'function') {
            done(new Error('no fetch'));
            return;
        }
        fetch(base + '/catalog.json').then(function (res) {
            if (!res.ok) throw new Error('catalog ' + res.status);
            return res.json();
        }).then(function (json) {
            done(null, cardsToBank(json, base));
        }).catch(function (err) {
            done(err);
        });
    }

    function poolForLevel(bank, level) {
        const list = (Array.isArray(bank) ? bank.slice() : []).sort(function (a, b) {
            const d = catRank(a.theme) - catRank(b.theme);
            return d !== 0 ? d : byId(a, b);
        });
        if (!list.length) return [];
        const lv = Math.max(1, Math.min(6, Number(level) || 1));
        const size = Math.ceil(list.length / 6);
        const start = (lv - 1) * size;
        return list.slice(start, lv === 6 ? list.length : start + size);
    }

    function uniqueZh(list) {
        const seen = {};
        const out = [];
        (list || []).forEach(function (w) {
            const zh = w && w.zh;
            if (!zh || seen[zh]) return;
            seen[zh] = true;
            out.push(zh);
        });
        return out;
    }

    function pickN(arr, n) {
        const copy = arr.slice();
        const out = [];
        while (copy.length && out.length < n) {
            const i = Math.floor(Math.random() * copy.length);
            out.push(copy.splice(i, 1)[0]);
        }
        return out;
    }

    function shuffle(arr) {
        const copy = arr.slice();
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = copy[i]; copy[i] = copy[j]; copy[j] = t;
        }
        return copy;
    }

    function quizFor(word, bank) {
        const src = word || {};
        const answer = src.zh || '';
        const list = bank || [];
        let fallback = false;
        let picks = [];
        (src.distractors || []).forEach(function (en) {
            const hit = list.find(function (w) { return w && w.text === en && w.zh && w.zh !== answer; });
            if (hit && picks.indexOf(hit.zh) === -1) picks.push(hit.zh);
        });
        if (picks.length < 3) {
            const same = uniqueZh(list.filter(function (w) {
                return w && w.theme === src.theme && w.zh && w.zh !== answer;
            }));
            same.forEach(function (zh) {
                if (picks.length < 3 && picks.indexOf(zh) === -1) picks.push(zh);
            });
        }
        if (picks.length < 3) {
            fallback = true;
            uniqueZh(list.filter(function (w) { return w && w.zh && w.zh !== answer; })).forEach(function (zh) {
                if (picks.length < 3 && picks.indexOf(zh) === -1) picks.push(zh);
            });
        }
        picks = picks.slice(0, 3);
        return {
            word: src,
            answer: answer,
            choices: shuffle([answer].concat(picks)),
            fallback: fallback
        };
    }

    function shouldAsk(opts) {
        const o = opts || {};
        if (o.firstHit) return true;
        return (Number(o.combo) || 0) < SKIP_COMBO;
    }

    const KIND_ALIASES = {
        grass: ['grass'],
        dirt: ['dirt'],
        sand: ['sand'],
        snow: ['snow'],
        stone: ['stone'],
        log: ['log'],
        leaf: ['leaves', 'leaf'],
        slime: ['slime'],
        cube: ['mob'],
        husk: ['zombie', 'husk', 'skeleton'],
        boss: ['wither'],
        merchant: ['villager'],
        sword: ['sword'],
        axe: ['axe'],
        pickaxe: ['pickaxe'],
        shovel: ['shovel']
    };
    const KIND_FALLBACK_ZH = {
        grass: '草方块',
        dirt: '泥土',
        sand: '沙子',
        snow: '雪',
        stone: '石头',
        log: '原木',
        leaf: '树叶',
        slime: '史莱姆',
        cube: '方块兽',
        husk: '僵尸',
        boss: '首领',
        merchant: '村民'
    };

    function labelFor(kind, bank) {
        const key = String(kind || '');
        const aliases = KIND_ALIASES[key] || [key];
        const list = Array.isArray(bank) ? bank : [];
        for (let i = 0; i < aliases.length; i += 1) {
            const hit = list.find(function (w) { return w && w.text === aliases[i]; });
            if (hit) return { en: hit.text, zh: hit.zh || '', word: hit };
        }
        return { en: aliases[0] || key, zh: KIND_FALLBACK_ZH[key] || '', word: null };
    }

    function sayStrip(pool, n) {
        const take = Math.max(1, Number(n) || 8);
        const words = (pool || []).slice(0, take).map(function (w) { return w && w.text; }).filter(Boolean);
        return 'Say: ' + words.join(' ');
    }

    function nextWord(pool, learnedIds) {
        const known = {};
        (learnedIds || []).forEach(function (id) { known[id] = true; });
        const fresh = (pool || []).filter(function (w) { return w && !known[w.id]; });
        const src = fresh.length ? fresh : (pool || []);
        if (!src.length) return null;
        return src[Math.floor(Math.random() * src.length)];
    }

    global.BlockLegendWords = {
        SKIP_COMBO: SKIP_COMBO,
        QUIZ_MS: QUIZ_MS,
        PACK_BASE: PACK_BASE,
        CAT_ORDER: CAT_ORDER,
        cardsToBank: cardsToBank,
        loadCatalog: loadCatalog,
        poolForLevel: poolForLevel,
        quizFor: quizFor,
        shouldAsk: shouldAsk,
        nextWord: nextWord,
        labelFor: labelFor,
        sayStrip: sayStrip
    };
}(typeof window !== 'undefined' ? window : globalThis));
