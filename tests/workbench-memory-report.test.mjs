import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const reportFile = path.join(repoRoot, 'prj', 'review-workbench.html');

test('parent report consumes the shared memory ledger without another storage domain', () => {
  assert.equal(fs.existsSync(reportFile), true, 'review report missing');
  const html = fs.readFileSync(reportFile, 'utf8');
  assert.match(html, /workbench-memory\.js/);
  assert.match(html, /workbench-bridge\.js/);
  assert.match(html, /weakWords/);
  assert.match(html, /dueWords/);
  assert.match(html, /24/);
  assert.match(html, /薄弱|错题/);
  assert.match(html, /到期|复习/);
  assert.doesNotMatch(html, /localStorage\.setItem/);
});

test('parent report has a return path and does not replace the existing workbench pages', () => {
  const html = fs.readFileSync(reportFile, 'utf8');
  const workbench = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
  assert.match(html, /preschool-workbench\/index\.html/);
  assert.match(html, /window\.WorkbenchGameBridge\.getMemory/);
  assert.match(html, /id="memory-report"/);
  assert.match(workbench, /\.\.\/review-workbench\.html/);
});
