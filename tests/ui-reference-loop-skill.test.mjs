import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const skillRoot = path.join(
  process.env.USERPROFILE || 'C:\\Users\\No\'mi\'l',
  '.codex',
  'skills',
  'ui-reference-loop-recreation'
);
const skillFile = path.join(skillRoot, 'SKILL.md');

test('visual recreation skill is installed and discoverable', () => {
  assert.equal(fs.existsSync(skillFile), true, `missing ${skillFile}`);
  const skill = fs.readFileSync(skillFile, 'utf8');
  assert.match(skill, /^---\nname:\s*ui-reference-loop-recreation\n/);
  assert.match(skill, /description:\s*Use when/i);
});

test('visual recreation skill protects the loop invariants', () => {
  const skill = fs.readFileSync(skillFile, 'utf8');
  for (const invariant of [
    'baseline screenshot',
    'target viewport',
    'Top 3',
    'screenshot after',
    'stop',
    'overflow',
    'business logic'
  ]) {
    assert.match(skill, new RegExp(invariant, 'i'), `missing invariant: ${invariant}`);
  }
});

test('visual recreation skill records a reusable evidence artifact', () => {
  const skill = fs.readFileSync(skillFile, 'utf8');
  assert.match(skill, /iteration[-_ ]?\d+/i);
  assert.match(skill, /json|markdown/i);
  assert.match(skill, /reference.*asset|copyright|third-party.*IP/i);
});
