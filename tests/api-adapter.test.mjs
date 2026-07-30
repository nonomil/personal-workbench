import assert from 'node:assert/strict';
import test from 'node:test';

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};
globalThis.PersonalWorkbenchConfig = { variant: 'child' };

await import('../api-adapter.js');
const api = globalThis.PersonalWorkbenchApi;

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; }
  };
}

test('keeps auth session separate and sends bearer credentials to the self-hosted API', async () => {
  const calls = [];
  const adapter = api.createRemoteAdapter({
    baseUrl: 'https://sync.example.test/',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/api/v1/auth/login')) return response(200, { accessToken: 'access-1', refreshToken: 'refresh-1', account: { id: 'a1', username: 'parent' } });
      if (url.endsWith('/api/v1/auth/me')) return response(200, { account: { id: 'a1', username: 'parent' } });
      return response(404, { error: { code: 'NOT_FOUND' } });
    }
  });

  const login = await adapter.login({ username: 'parent', password: 'StrongPass123!' });
  assert.equal(login.ok, true);
  assert.equal(adapter.getSession().accessToken, 'access-1');
  assert.match(values.get('petbank_huchuliang_child_workbench_account_session_v1'), /refresh-1/);
  assert.equal((await adapter.me()).payload.account.username, 'parent');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer access-1');
  assert.equal(calls[1].init.credentials, 'omit');
  assert.equal(values.has('petbank_huchuliang_child_workbench_state_v1'), false);
});

test('maps a selected child to snapshot pull and push endpoints', async () => {
  const calls = [];
  const adapter = api.createRemoteAdapter({
    baseUrl: 'https://sync.example.test',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/api/v1/auth/login')) return response(200, { accessToken: 'access-2', refreshToken: 'refresh-2', account: { id: 'a2' } });
      if (url.endsWith('/snapshots/latest')) return response(200, { snapshot: { revision: 4, payload: { schemaVersion: 4 } } });
      if (url.endsWith('/snapshots')) return response(201, { snapshot: { revision: 5, payload: { schemaVersion: 4 } } });
      return response(404, { error: { code: 'NOT_FOUND' } });
    }
  });

  await adapter.login({ username: 'parent2', password: 'StrongPass123!' });
  adapter.setActiveChild({ id: 'child-2', name: '小星', localProfileId: 'local-default' });
  const pulled = await adapter.pullSnapshot();
  assert.equal(pulled.ok, true);
  assert.equal(pulled.payload.snapshot.revision, 4);
  const pushed = await adapter.pushSnapshot({ revision: 5, profileId: 'local-default', schemaVersion: 4 });
  assert.equal(pushed.ok, true);
  assert.match(calls[1].url, /children\/child-2\/snapshots\/latest$/);
  assert.match(calls[2].url, /children\/child-2\/snapshots$/);
  assert.deepEqual(JSON.parse(calls[2].init.body), { revision: 5, payload: { revision: 5, profileId: 'local-default', schemaVersion: 4 } });
});

test('returns a conflict result without hiding the server revision', async () => {
  const adapter = api.createRemoteAdapter({
    baseUrl: 'https://sync.example.test',
    fetchImpl: async () => response(409, { error: { code: 'SNAPSHOT_REVISION_CONFLICT', message: 'conflict' }, latestRevision: 9 })
  });
  adapter.setSession({ accessToken: 'access-3', refreshToken: 'refresh-3', account: { id: 'a3' } });
  adapter.setActiveChild({ id: 'child-3' });
  const result = await adapter.pushSnapshot({ revision: 2 });
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(result.code, 'SNAPSHOT_REVISION_CONFLICT');
  assert.equal(result.latestRevision, 9);
});
