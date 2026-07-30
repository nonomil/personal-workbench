import assert from 'node:assert/strict';
import test from 'node:test';

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};

await import('../launcher.js');
const launcher = globalThis.PersonalWorkbenchLauncher;

test('accepts only the three supported workbench variants', () => {
  assert.deepEqual(launcher.VALID_VARIANTS, ['adult', 'child', 'preschool']);
  assert.equal(launcher.isValidVariant('child'), true);
  assert.equal(launcher.isValidVariant('settings'), false);
  assert.equal(launcher.isValidVariant(''), false);
});

test('remembers a valid variant and ignores invalid stored values', () => {
  assert.equal(launcher.getSelected(), null);
  assert.equal(launcher.remember('child'), 'child');
  assert.equal(launcher.getSelected(), 'child');
  values.set(launcher.KEY, 'unknown');
  assert.equal(launcher.getSelected(), null);
});

test('resolves static paths for the root launcher and current workbench pages', () => {
  assert.equal(launcher.getPath('adult'), './成人成长工作台/');
  assert.equal(launcher.getPath('preschool'), './preschool-workbench/');
  assert.equal(launcher.getSiblingPath('child', 'adult'), '../成人成长工作台/');
  assert.equal(launcher.getSiblingPath('adult', 'preschool'), '../preschool-workbench/');
});

test('only auto-redirects when a remembered choice exists and choose mode is absent', () => {
  launcher.remember('preschool');
  assert.equal(launcher.shouldAutoRedirect(''), true);
  assert.equal(launcher.shouldAutoRedirect('?choose=1'), false);
  values.delete(launcher.KEY);
  assert.equal(launcher.shouldAutoRedirect(''), false);
});
