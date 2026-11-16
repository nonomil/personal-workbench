import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const preschoolRoot = path.join(repoRoot, 'prj', 'preschool-workbench');
const indexHtml = fs.readFileSync(path.join(preschoolRoot, 'index.html'), 'utf8');
const sidebarCssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '46-sidebar-ux.css');

test('preschool Android sidebar has a dedicated final visual layer', () => {
  assert.match(indexHtml, /46-sidebar-ux\.css\?[^"']*sidebar-v1/);
  assert.equal(fs.existsSync(sidebarCssPath), true, 'sidebar UX CSS should be present');
});

test('preschool Android sidebar is a light card wall with touch-safe navigation', () => {
  const css = fs.readFileSync(sidebarCssPath, 'utf8');

  assert.match(css, /html\.is-android-app body\.variant-preschool \.preschool-mobile-nav\s*\{/);
  assert.match(css, /grid-template-rows:\s*auto\s+repeat\(5,\s*minmax\(44px,\s*1fr\)\)/);
  assert.match(css, /background:\s*linear-gradient\(180deg,\s*#f8fcff,\s*#edf8f1\)/);
  assert.match(css, /preschool-mobile-nav::before\s*\{\s*display:\s*none/);
  assert.match(css, /\.preschool-mobile-nav-item\s*\{[\s\S]*?min-height:\s*44px[\s\S]*?gap:\s*8px[\s\S]*?touch-action:\s*manipulation/);
  assert.match(css, /\.preschool-mobile-nav-item:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);

  for (let index = 1; index <= 5; index += 1) {
    assert.match(css, new RegExp(`preschool-mobile-nav-item:nth-of-type\\(${index}\\)`));
  }
});

test('preschool sidebar keeps all five routed destinations and native world assets', () => {
  for (const destination of ['overview', 'courses', 'battle', 'rewards', 'more']) {
    assert.match(indexHtml, new RegExp(`data-mobile-nav="${destination}"`));
  }

  const config = fs.readFileSync(path.join(repoRoot, 'prj', 'config.js'), 'utf8');
  const gardenTheme = config.slice(config.indexOf("'garden-defense':"), config.indexOf("'voxel-adventure':"));
  const voxelTheme = config.slice(config.indexOf("'voxel-adventure':"), config.indexOf("'platform-quest':"));
  const platformTheme = config.slice(config.indexOf("'platform-quest':"), config.indexOf("const variants"));
  assert.match(gardenTheme, /brand:\s*'sun-token'/);
  assert.match(gardenTheme, /battle:\s*'plant-peashooter'/);
  assert.match(gardenTheme, /courses:\s*'plant-sunflower'/);
  assert.match(voxelTheme, /brand:\s*'small-crystal'/);
  assert.match(platformTheme, /brand:\s*'star-companion'/);
  assert.doesNotMatch(gardenTheme, /preschool-(sun|storybook|sprout|gift|star)\.webp/);
});
