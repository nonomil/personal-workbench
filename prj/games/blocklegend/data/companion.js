/**
 * blocklegend · 过肩陪玩纯函数（Phase 6）
 * 快照进、短英语出。模型与 TTS 都是可选升级。
 * 不写 localStorage，不带音频/截图。
 */
(function (global) {
    'use strict';

    const COOLDOWN_MS = 4000;
    const MAX_WORDS = 8;
    const DEFAULT_MODEL = 'deepseek-v4-flash';
    const STORAGE_KEY = null;

    function wordOf(snap) {
        const look = (snap && snap.look) || {};
        return String(look.word || look.en || '').trim();
    }

    function clipLine(text) {
        const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
        return words.slice(0, MAX_WORDS).join(' ');
    }

    function decideCue(snap) {
        const o = snap || {};
        const now = Number(o.now) || 0;
        const last = Number(o.lastCueAt) || 0;
        if (last && now - last < COOLDOWN_MS) return { kind: 'silent', say: '' };
        if (o.heardHit || o.doing === 'speak-hit') {
            return { kind: 'cheer', say: 'Yes! Big hit.' };
        }
        if (o.shield === 'broken' && o.shieldChanged) {
            return { kind: 'cheer', say: 'Shield down. Hit!' };
        }
        if (o.nearMerchant || o.doing === 'walk-merchant') {
            return { kind: 'remind', say: 'Press F. Talk to Leo.' };
        }
        const word = wordOf(o);
        if (o.shield === 'up' && word) {
            return { kind: 'remind', say: clipLine('Shield. Say ' + word + '.') };
        }
        if (o.look && o.look.type === 'mob' && word) {
            return { kind: 'remind', say: clipLine('Press V. Say ' + word + '.') };
        }
        return { kind: 'silent', say: '' };
    }

    function heardHits(word, heard, matcher) {
        if (typeof matcher !== 'function' || !word) return false;
        if (matcher(word, heard) && matcher(word, heard).ok) return true;
        return String(heard || '').split(/\s+/).some(function (part) {
            return !!(matcher(word, part) && matcher(word, part).ok);
        });
    }

    function replyTo(opts) {
        const o = opts || {};
        const snap = o.snapshot || {};
        const word = wordOf(snap);
        const matcher = o.matchHeard;
        const heard = o.heard || '';
        const hit = heardHits(word, heard, matcher);
        if (hit) return { kind: 'reply', say: 'Yes! Big hit.', hit: true };
        if (word) return { kind: 'reply', say: clipLine('Try again. ' + word + '.'), hit: false };
        const kind = snap.look && snap.look.kind;
        if (kind) return { kind: 'reply', say: clipLine('I see the ' + kind + '.'), hit: false };
        return { kind: 'reply', say: 'Try again.', hit: false };
    }

    function normalizeEndpoint(endpoint) {
        return String(endpoint || '')
            .trim()
            .replace(/\/+$/, '')
            .replace(/\/chat\/completions$/i, '');
    }

    function buildChatRequest(opts) {
        const o = opts || {};
        const cfg = o.config || {};
        const snap = o.snapshot || {};
        const look = snap.look || {};
        const base = normalizeEndpoint(cfg.endpoint);
        const model = cfg.model || DEFAULT_MODEL;
        const user = [
            'look=' + (look.type || '') + ' ' + (look.kind || ''),
            'word=' + wordOf(snap),
            'doing=' + (snap.doing || ''),
            'heard=' + String(o.heard || '')
        ].join('; ');
        const headers = { 'content-type': 'application/json' };
        if (cfg.apiKey) headers.authorization = 'Bearer ' + cfg.apiKey;
        return {
            url: base + '/chat/completions',
            headers: headers,
            body: {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'Shoulder buddy. At most 8 English words. Do not translate. Do not mention pictures.'
                    },
                    { role: 'user', content: user }
                ],
                max_tokens: 24,
                stream: false
            }
        };
    }

    function parseChatReply(json) {
        const choice = json && json.choices && json.choices[0];
        const text = (choice && choice.message && choice.message.content)
            || (json && json.content)
            || '';
        return clipLine(text);
    }

    function queryGet(search, key) {
        if (search && typeof search.get === 'function') return search.get(key) || '';
        const raw = String(search || '').replace(/^\?/, '');
        try {
            return new URLSearchParams(raw).get(key) || '';
        } catch (e) {
            return '';
        }
    }

    function shouldSkipBuddyGate(search) {
        if (queryGet(search, 'playtest') === '1') return true;
        if (queryGet(search, 'skipBuddyGate') === '1') return true;
        if (queryGet(search, 'buddyEndpoint')) return true;
        return false;
    }

    function applyBuddyPick(pick) {
        const p = String(pick || '');
        if (p === 'home') return { pick: 'home', typeOnly: false, openForm: true, clearModel: false };
        if (p === 'type') return { pick: 'type', typeOnly: true, openForm: false, clearModel: true };
        return { pick: 'play', typeOnly: false, openForm: false, clearModel: true };
    }

    function resolveBuddyConfig(source) {
        const s = source || {};
        const q = s.query || {};
        const pasted = s.pasted || (s.window && s.window.BLOCKLEGEND_BUDDY) || {};
        const endpoint = q.buddyEndpoint || pasted.endpoint || '';
        const model = q.buddyModel || pasted.model || DEFAULT_MODEL;
        const apiKey = pasted.apiKey || '';
        const ttsUrl = q.buddyTts || pasted.ttsUrl || '';
        const base = normalizeEndpoint(endpoint);
        const sttUrl = q.buddyStt || pasted.sttUrl || (base ? base + '/stt' : '');
        return {
            enabled: !!endpoint,
            endpoint: endpoint,
            model: model,
            apiKey: apiKey,
            ttsUrl: ttsUrl,
            sttUrl: sttUrl
        };
    }

    function pickTtsVoice(voices) {
        const list = voices || [];
        function score(v) {
            const name = String((v && v.name) || '');
            const lang = String((v && v.lang) || '');
            let n = 0;
            if (/^en/i.test(lang)) n += 2;
            if (/en-US/i.test(lang)) n += 1;
            if (/microsoft/i.test(name)) n += 4;
            if (/aria|jenny|guy|natural|online/i.test(name)) n += 3;
            return n;
        }
        return list.slice().sort(function (a, b) { return score(b) - score(a); })[0] || null;
    }

    function planSpeak(text, opts) {
        const line = clipLine(text);
        if (!line) return { method: 'silent', text: '' };
        const o = opts || {};
        if (o.ttsUrl) {
            return {
                method: 'edge-tts',
                text: line,
                url: o.ttsUrl,
                voice: o.voice || 'en-US-JennyNeural'
            };
        }
        const picked = pickTtsVoice(o.voices || []);
        return {
            method: 'speechSynthesis',
            text: line,
            voice: picked ? picked.name : ''
        };
    }

    function withTimeout(promise, ms) {
        return new Promise(function (resolve, reject) {
            const timer = setTimeout(function () { reject(new Error('timeout')); }, ms);
            Promise.resolve(promise).then(function (value) {
                clearTimeout(timer);
                resolve(value);
            }, function (err) {
                clearTimeout(timer);
                reject(err);
            });
        });
    }

    function runBuddyTurn(opts) {
        const o = opts || {};
        const templ = replyTo({
            heard: o.heard || '',
            snapshot: o.snapshot || {},
            matchHeard: o.matchHeard
        });
        const speak = typeof o.speak === 'function' ? o.speak : function () {};
        if (templ.hit || typeof o.askModel !== 'function') {
            speak(templ.say);
            return Promise.resolve(Object.assign({ source: 'template' }, templ));
        }
        const timeoutMs = o.timeoutMs != null ? o.timeoutMs : 2000;
        return withTimeout(Promise.resolve().then(o.askModel), timeoutMs).then(function (line) {
            const say = clipLine(line) || templ.say;
            speak(say);
            return { kind: 'reply', say: say, hit: false, source: 'model' };
        }).catch(function () {
            speak(templ.say);
            return Object.assign({ source: 'template' }, templ);
        });
    }

    global.BlockLegendCompanion = {
        COOLDOWN_MS: COOLDOWN_MS,
        MAX_WORDS: MAX_WORDS,
        DEFAULT_MODEL: DEFAULT_MODEL,
        STORAGE_KEY: STORAGE_KEY,
        wordOf: wordOf,
        clipLine: clipLine,
        decideCue: decideCue,
        replyTo: replyTo,
        buildChatRequest: buildChatRequest,
        parseChatReply: parseChatReply,
        shouldSkipBuddyGate: shouldSkipBuddyGate,
        applyBuddyPick: applyBuddyPick,
        resolveBuddyConfig: resolveBuddyConfig,
        pickTtsVoice: pickTtsVoice,
        planSpeak: planSpeak,
        runBuddyTurn: runBuddyTurn
    };
}(typeof window !== 'undefined' ? window : globalThis));
