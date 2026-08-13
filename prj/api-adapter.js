(function (global) {
    'use strict';

    const workbenchConfig = global.PersonalWorkbenchConfig || {};
    const variant = workbenchConfig.variant || 'adult';
    const storage = global.localStorage;
    const SESSION_STORAGE_KEY = `petbank_huchuliang_${variant}_workbench_account_session_v1`;
    const SETTINGS_STORAGE_KEY = `petbank_huchuliang_${variant}_workbench_account_settings_v1`;

    function clone(value) {
        return value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
    }

    function readJson(key, fallback) {
        try {
            const raw = storage && storage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.warn('[PersonalWorkbenchApi] 读取本地连接设置失败', error);
            return fallback;
        }
    }

    function normalizeBaseUrl(value) {
        return String(value || '').trim().replace(/\/$/, '');
    }

    function normalizeSession(value) {
        const source = value && typeof value === 'object' ? value : {};
        return {
            accessToken: typeof source.accessToken === 'string' ? source.accessToken : '',
            refreshToken: typeof source.refreshToken === 'string' ? source.refreshToken : '',
            expiresIn: Number(source.expiresIn) || 0,
            account: source.account && typeof source.account === 'object' ? source.account : null,
            activeChild: source.activeChild && typeof source.activeChild === 'object' ? source.activeChild : null,
            updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : ''
        };
    }

    function createRemoteAdapter(config) {
        const input = config || {};
        const storedSettings = readJson(SETTINGS_STORAGE_KEY, {});
        const options = {
            baseUrl: normalizeBaseUrl(Object.prototype.hasOwnProperty.call(input, 'baseUrl') ? input.baseUrl : storedSettings.baseUrl),
            token: String(input.token || ''),
            fetchImpl: input.fetchImpl || global.fetch,
            storage: input.storage || storage
        };
        let session = normalizeSession(readJson(SESSION_STORAGE_KEY, {}));
        if (options.token && !session.accessToken) session.accessToken = options.token;
        const configured = () => Boolean(options.baseUrl);

        function saveSession(next) {
            session = normalizeSession(next);
            if (!options.storage) return session;
            try {
                if (session.accessToken || session.refreshToken || session.account) options.storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
                else options.storage.removeItem(SESSION_STORAGE_KEY);
            } catch (error) {
                console.warn('[PersonalWorkbenchApi] 保存登录状态失败', error);
            }
            return session;
        }

        function saveSettings() {
            if (!options.storage) return;
            try {
                options.storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ baseUrl: options.baseUrl }));
            } catch (error) {
                console.warn('[PersonalWorkbenchApi] 保存连接地址失败', error);
            }
        }

        async function request(path, init, requestOptions) {
            if (!configured()) return { ok: false, status: 'not-configured', message: '当前使用本地模式' };
            if (typeof options.fetchImpl !== 'function') return { ok: false, status: 'fetch-unavailable', message: '当前浏览器不支持网络请求' };
            const requestInit = init || {};
            const headers = Object.assign({ Accept: 'application/json' }, requestInit.headers || {});
            if (requestInit.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
            const token = session.accessToken || options.token;
            if (token) headers.Authorization = `Bearer ${token}`;
            try {
                const response = await options.fetchImpl(`${options.baseUrl}${path}`, Object.assign({}, requestInit, { headers, credentials: 'omit' }));
                const payload = await response.json().catch(function () { return null; });
                if (response.status === 401 && !(requestOptions && requestOptions.skipRefresh) && session.refreshToken && path !== '/api/v1/auth/refresh') {
                    const refreshed = await refreshSession();
                    if (refreshed.ok) return request(path, init, { skipRefresh: true });
                }
                if (!response.ok) {
                    const error = payload && payload.error ? payload.error : {};
                    return { ok: false, status: response.status, payload: payload, data: payload, code: error.code || `HTTP_${response.status}`, message: error.message || '远端请求失败', latestRevision: payload && payload.latestRevision };
                }
                return { ok: true, status: response.status, payload: payload, data: payload };
            } catch (error) {
                console.warn('[PersonalWorkbenchApi] 远端请求失败', error);
                return { ok: false, status: 'network-error', error: error, message: '网络不可用，已保留本地状态' };
            }
        }

        async function refreshSession() {
            if (!configured() || !session.refreshToken) return { ok: false, status: 'signed-out' };
            const result = await request('/api/v1/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refreshToken: session.refreshToken })
            }, { skipRefresh: true });
            if (!result.ok) {
                saveSession({});
                return result;
            }
            saveSession(Object.assign({}, session, result.payload || {}));
            return result;
        }

        async function authenticate(path, details) {
            const result = await request(path, { method: 'POST', body: JSON.stringify(details) }, { skipRefresh: true });
            if (result.ok && result.payload) saveSession(Object.assign({}, result.payload, { updatedAt: new Date().toISOString() }));
            return result;
        }

        const adapter = {
            configured: configured(),
            status: configured() ? 'configured' : 'not-configured',
            sessionStorageKey: SESSION_STORAGE_KEY,
            settingsStorageKey: SETTINGS_STORAGE_KEY,
            getBaseUrl: function () { return options.baseUrl; },
            setBaseUrl: function (value) {
                options.baseUrl = normalizeBaseUrl(value);
                adapter.configured = configured();
                adapter.status = adapter.configured ? 'configured' : 'not-configured';
                saveSettings();
                return options.baseUrl;
            },
            getSession: function () { return clone(session); },
            setSession: function (value) { saveSession(value); return adapter.getSession(); },
            getAccount: function () { return clone(session.account); },
            getActiveChild: function () { return clone(session.activeChild); },
            setActiveChild: function (child) {
                saveSession(Object.assign({}, session, { activeChild: child || null }));
                return adapter.getActiveChild();
            },
            getStatus: function () {
                if (!configured()) return { id: 'not-configured', label: '本地模式', detail: '填写自托管 API 地址后登录' };
                if (!session.accessToken) return { id: 'signed-out', label: '未登录', detail: '本地数据仍可继续使用' };
                if (!session.activeChild) return { id: 'signed-in', label: '已登录', detail: '请选择一个工作台档案' };
                return { id: 'ready', label: '云端已连接', detail: '本地优先 · 可手动同步' };
            },
            register: function (details) { return authenticate('/api/v1/auth/register', details); },
            login: function (details) { return authenticate('/api/v1/auth/login', details); },
            refresh: refreshSession,
            logout: async function () {
                const result = configured() ? await request('/api/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: session.refreshToken }) }, { skipRefresh: true }) : { ok: true, status: 'local' };
                saveSession({});
                return result;
            },
            me: function () { return request('/api/v1/auth/me', { method: 'GET' }); },
            listHouseholds: function () { return request('/api/v1/households', { method: 'GET' }); },
            createHousehold: function (name) { return request('/api/v1/households', { method: 'POST', body: JSON.stringify({ name: name }) }); },
            listMembers: function (householdId) { return request(`/api/v1/households/${encodeURIComponent(householdId)}/members`, { method: 'GET' }); },
            createInvite: function (householdId) { return request(`/api/v1/households/${encodeURIComponent(householdId)}/invites`, { method: 'POST', body: JSON.stringify({}) }); },
            redeemInvite: function (code) { return request('/api/v1/household-invites/redeem', { method: 'POST', body: JSON.stringify({ code: code }) }); },
            listChildren: function (householdId) {
                const query = householdId ? `?householdId=${encodeURIComponent(householdId)}` : '';
                return request(`/api/v1/children${query}`, { method: 'GET' });
            },
            createChild: function (householdId, name, localProfileId) {
                return request('/api/v1/children', { method: 'POST', body: JSON.stringify({ householdId: householdId, name: name, localProfileId: localProfileId }) });
            },
            pullSnapshot: function (childId) {
                if (!configured()) return Promise.resolve({ ok: false, status: 'not-configured', message: '当前使用本地模式' });
                const child = childId || (session.activeChild && session.activeChild.id);
                if (!child) return Promise.resolve({ ok: false, status: 'child-not-selected', message: '请先选择工作台档案' });
                return request(`/api/v1/children/${encodeURIComponent(child)}/snapshots/latest`, { method: 'GET' });
            },
            pushSnapshot: function (snapshot, childId) {
                if (!configured()) return Promise.resolve({ ok: false, status: 'not-configured', message: '当前使用本地模式' });
                const child = childId || (session.activeChild && session.activeChild.id);
                const revision = Number(snapshot && snapshot.revision);
                if (!child) return Promise.resolve({ ok: false, status: 'child-not-selected', message: '请先选择工作台档案' });
                if (!Number.isSafeInteger(revision) || revision < 1) return Promise.resolve({ ok: false, status: 'invalid-snapshot', message: '快照 revision 无效' });
                return request(`/api/v1/children/${encodeURIComponent(child)}/snapshots`, {
                    method: 'POST',
                    body: JSON.stringify({ revision: revision, payload: snapshot })
                });
            }
        };

        return adapter;
    }

    global.PersonalWorkbenchApi = {
        SESSION_STORAGE_KEY: SESSION_STORAGE_KEY,
        SETTINGS_STORAGE_KEY: SETTINGS_STORAGE_KEY,
        createRemoteAdapter: createRemoteAdapter
    };
})(typeof window !== 'undefined' ? window : globalThis);
