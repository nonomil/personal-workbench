import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const indexHtml = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
const cssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '48-home-visual-loop.css');
const sceneCssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '47-home-scene-composition.css');
const sunflowerPath = path.join(repoRoot, 'prj', 'assets', 'generated', 'preschool-pixel', 'pvz', 'plant-sunflower.png');

test('home visual loop layer is loaded after the scene composition', () => {
  assert.match(indexHtml, /48-home-visual-loop\.css\?[^"']*reference-loop-v2-switcher-right/);
  assert.equal(fs.existsSync(cssPath), true, 'visual loop CSS should be present');
});

test('desktop garden scene stays vivid and uses the refreshed sunflower asset', () => {
  const sceneCss = fs.readFileSync(sceneCssPath, 'utf8');
  assert.match(indexHtml, /47-home-scene-composition\.css\?[^"']*home-scene-v3-alpha/);
  assert.match(indexHtml, /app\.js\?[^"']*home-alpha-v2/);
  assert.match(sceneCss, /rgba\(232, 247, 255, \.08\)[\s\S]*rgba\(255, 249, 233, \.14\)[\s\S]*rgba\(255, 249, 233, \.30\)/);
  assert.equal(fs.existsSync(sunflowerPath), true, 'published sunflower asset should be present');
});

test('preschool topbar actions stay anchored to the upper-right corner', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /body\.variant-preschool \.topbar-actions\s*\{[\s\S]*?margin-inline-start:\s*auto/);
});

test('desktop homepage presents a scene with independent floating task cards', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /@media \(min-width:\s*761px\) and \(min-height:\s*481px\)/);
  assert.match(css, /\.preschool-home-battlefield\s*\{[\s\S]*?position:\s*absolute[\s\S]*?background:\s*transparent/);
  assert.match(css, /\.preschool-home-lanes\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,/);
  assert.match(css, /\.preschool-home-lane\s*\{[\s\S]*?min-height:\s*0/);
  assert.match(css, /\.preschool-home-hero-card\s*\{[\s\S]*?background:\s*transparent/);
});

test('Android landscape keeps the native pager flow bounded', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /html\.is-android-app[\s\S]*?\.preschool-home-overview\.is-simple[\s\S]*?height:\s*100%/);
  assert.match(css, /html\.is-android-app[\s\S]*?\.preschool-home-top[\s\S]*?min-height:\s*0/);
  assert.match(css, /html\.is-android-app[\s\S]*?\.preschool-home-battlefield[\s\S]*?position:\s*relative/);
});
