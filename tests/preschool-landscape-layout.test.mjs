import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj', 'css', 'preschool');
const orientation = fs.readFileSync(path.join(root, '20-sidebar-orientation.css'), 'utf8');
const childWorld = fs.readFileSync(path.join(root, '44-child-game-world.css'), 'utf8');
const manifest = fs.readFileSync(path.join(root, '..', 'preschool-workbench.css'), 'utf8');
const shell = fs.readFileSync(path.join(root, '..', '..', 'preschool-workbench', 'index.html'), 'utf8');

test('short landscape uses one bounded sidebar width for rail and content offset', () => {
  assert.match(orientation, /--preschool-landscape-sidebar:\s*clamp\(176px,\s*24vw,\s*208px\)/);
  assert.match(orientation, /\.sidebar\s*\{[\s\S]*?width:\s*var\(--preschool-landscape-sidebar\)[\s\S]*?overflow-x:\s*hidden/);
  assert.match(orientation, /\.main-content\s*\{[\s\S]*?width:\s*calc\(100%\s*-\s*var\(--preschool-landscape-sidebar\)\)[\s\S]*?margin-left:\s*var\(--preschool-landscape-sidebar\)/);
});

test('normal web child shell does not turn the fixed sidebar into a flex child', () => {
  assert.doesNotMatch(childWorld, /\.child-game-shell\s*>\s*:not\(/);
  assert.match(childWorld, /\.child-game-shell\s*>\s*\.main-content\s*\{/);
});

test('desktop preschool navigation and course controls keep 44px touch targets', () => {
  assert.match(childWorld, /\.topbar-focus-button,[\s\S]*?\.sidebar-section-toggle,[\s\S]*?\.tool-button,[\s\S]*?\.preschool-flashcard-level\s*\{[\s\S]*?min-height:\s*44px/);
});

test('android landscape keeps primary navigation and literacy controls at 44px', () => {
  assert.match(childWorld, /\.preschool-home-overview\s+\.workbench-overview-actions\s+\.pixel-settings-button\s*\{[^}]*width:\s*44px;\s*height:\s*44px;[^}]*flex:\s*0\s+0\s+44px/);
  assert.match(childWorld, /\.preschool-home-battlefield-add\s*\{[^}]*min-height:\s*44px/);
  assert.match(childWorld, /\.preschool-course-tabs\s*\{[^}]*height:\s*44px;\s*min-height:\s*44px/);
  assert.match(childWorld, /\.preschool-course-tab\s*\{[^}]*min-height:\s*44px/);
  assert.match(childWorld, /\.preschool-flashcard-levels\s*\{[^}]*min-height:\s*44px;\s*flex:\s*0\s+0\s+44px/);
  assert.match(childWorld, /\.preschool-flashcard-level\s*\{[^}]*min-height:\s*44px/);
  assert.match(childWorld, /\.preschool-flashcard-toolbar\s*\{[^}]*min-height:\s*44px;\s*flex:\s*0\s+0\s+44px/);
  assert.match(childWorld, /\.preschool-flashcard-toolbar\s+\.preschool-flashcard-speak\s*\{[^}]*min-height:\s*44px/);
});

test('preschool css manifest invalidates both changed landscape layers', () => {
  assert.match(manifest, /20-sidebar-orientation\.css\?v=20260824-learning-game-p0b/);
  assert.match(manifest, /44-child-game-world\.css\?v=20260824-learning-game-p0e/);
  assert.match(shell, /preschool-workbench\.css\?v=20260824-learning-game-p0f/);
  assert.match(shell, /44-child-game-world\.css\?v=20260824-learning-game-p0e/);
});
