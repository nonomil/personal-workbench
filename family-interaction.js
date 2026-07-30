(function (global) {
    'use strict';

    const STORAGE_KEY = 'petbank_huchuliang_family_updates_v1';
    const SCHEMA_VERSION = 1;
    const AUTHORS = new Set(['家长', '小朋友', '家庭成员']);
    const KINDS = new Set(['parent-note', 'child-share', 'family-note']);

    function localDate() {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function createId() {
        if (global.crypto && typeof global.crypto.randomUUID === 'function') return `family-${global.crypto.randomUUID()}`;
        return `family-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function normalize(input) {
        const source = input && typeof input === 'object' ? input : {};
        const messages = Array.isArray(source.messages) ? source.messages : [];
        return {
            schemaVersion: SCHEMA_VERSION,
            messages: messages.map(function (item) {
                const author = AUTHORS.has(item.author) ? item.author : '家庭成员';
                const kind = KINDS.has(item.kind) ? item.kind : 'family-note';
                return {
                    id: typeof item.id === 'string' && item.id ? item.id : createId(),
                    author: author,
                    kind: kind,
                    body: String(item.body || '').trim().slice(0, 500),
                    date: /^\d{4}-\d{2}-\d{2}$/.test(String(item.date || '')) ? item.date : localDate(),
                    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString()
                };
            }).filter(item => item.body).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 100)
        };
    }

    const repository = {
        key: STORAGE_KEY,
        load: function () {
            try {
                const raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
                if (!raw) {
                    const seed = normalize({ messages: [] });
                    this.save(seed);
                    return seed;
                }
                const source = JSON.parse(raw);
                const parsed = normalize(source);
                if (parsed.schemaVersion !== source.schemaVersion) this.save(parsed);
                return parsed;
            } catch (error) {
                console.warn('[PersonalWorkbenchFamily] 读取家庭互动失败', error);
                return normalize({ messages: [] });
            }
        },
        save: function (input) {
            try {
                const state = normalize(input);
                global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                return { ok: true, state: state };
            } catch (error) {
                console.warn('[PersonalWorkbenchFamily] 写入家庭互动失败', error);
                return { ok: false, error: error };
            }
        },
        add: function (input) {
            const item = input && typeof input === 'object' ? input : {};
            const body = String(item.body || '').trim();
            if (!body) return { ok: false, error: new Error('家庭互动内容不能为空') };
            const current = this.load();
            current.messages.unshift({
                id: createId(),
                author: AUTHORS.has(item.author) ? item.author : '家庭成员',
                kind: KINDS.has(item.kind) ? item.kind : 'family-note',
                body: body,
                date: localDate(),
                createdAt: new Date().toISOString()
            });
            return this.save(current);
        }
    };

    global.PersonalWorkbenchFamily = { STORAGE_KEY: STORAGE_KEY, SCHEMA_VERSION: SCHEMA_VERSION, normalize: normalize, repository: repository };
})(typeof window !== 'undefined' ? window : globalThis);
