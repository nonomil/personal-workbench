import assert from 'node:assert/strict';
import test from 'node:test';

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};

await import('../prj/family-interaction.js');
const family = globalThis.PersonalWorkbenchFamily;

test('keeps a shared family feed in its own local snapshot', () => {
  const empty = family.repository.load();
  assert.equal(empty.schemaVersion, 1);
  assert.deepEqual(empty.messages, []);
  const result = family.repository.add({ author: '家长', body: '今天先完成阅读，再去玩耍。', kind: 'parent-note' });
  assert.equal(result.ok, true);
  assert.equal(result.state.messages[0].author, '家长');
  assert.equal(family.repository.load().messages[0].body, '今天先完成阅读，再去玩耍。');
});

test('rejects empty family messages and normalizes the author boundary', () => {
  const empty = family.repository.add({ author: '未知角色', body: '   ' });
  assert.equal(empty.ok, false);
  const normalized = family.normalize({ messages: [{ id: 'm1', author: '陌生人', body: '可以看看这道题', kind: 'unknown' }] });
  assert.equal(normalized.messages[0].author, '家庭成员');
  assert.equal(normalized.messages[0].kind, 'family-note');
});
