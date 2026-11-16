import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const preschoolRoot = path.join(repoRoot, 'prj', 'preschool-workbench');
const indexHtml = fs.readFileSync(path.join(preschoolRoot, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(repoRoot, 'prj', 'css', 'preschool', '49-reference-density-companion.css'), 'utf8');

test('loads the compact density and companion layer after the scene layers', () => {
  assert.match(indexHtml, /47-home-scene-composition\.css/);
  assert.match(indexHtml, /48-home-visual-loop\.css/);
  assert.match(indexHtml, /49-reference-density-companion\.css\?[^"']*density-companion-v3/);
});

test('renders one companion rail with a themed three-item crew', () => {
  assert.match(app, /function renderPreschoolHomeCompanionRail\(\)/);
  assert.match(app, /preschool-home-companion-rail/);
  for (const asset of [
    'plant-sunflower', 'plant-peashooter', 'plant-wallnut',
    'voxel-companion', 'voxel-block-tree', 'voxel-purple-crystal',
    'platform-explorer', 'platform-coin', 'platform-flag'
  ]) {
    assert.match(app, new RegExp(`asset: '${asset}'`), `${asset} should be assigned to a companion`);
  }
  assert.match(app, /renderPreschoolHomeCompanionRail\(\)[\s\S]*preschool-home-exits/);
});

test('desktop home uses compact cards and restores the rail only on roomy web view', () => {
  assert.match(css, /body\.variant-preschool \.preschool-home-companion-rail\s*\{[\s\S]*?display:\s*none/);
  assert.match(css, /@media \(min-width:\s*761px\) and \(min-height:\s*481px\)[\s\S]*?\.preschool-home-companion-rail\s*\{[\s\S]*?display:\s*grid/);
  assert.match(css, /\.preschool-home-lane\s*\{[\s\S]*?height:\s*58px/);
  assert.match(css, /\.preschool-home-lanes\s*\{[\s\S]*?grid-auto-rows:\s*58px/);
  assert.match(css, /\.preschool-home-companion-list\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,/);
  assert.match(css, /\.preschool-home-exits\s*\{[\s\S]*?align-items:\s*center/);
  assert.match(css, /\.preschool-home-exits\s*> button\s*\{[\s\S]*?margin-top:\s*0/);
});

test('Android exclusion avoids adding a bottom row to the native pager', () => {
  assert.match(css, /body\.variant-preschool \.preschool-home-companion-rail\s*\{[\s\S]*?display:\s*none/);
  assert.doesNotMatch(css, /html\.is-android-app[^{}]*\.preschool-home-companion-rail\s*\{[\s\S]*?display:\s*grid/);
});
