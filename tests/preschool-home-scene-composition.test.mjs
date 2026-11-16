import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const preschoolRoot = path.join(repoRoot, 'prj', 'preschool-workbench');
const indexHtml = fs.readFileSync(path.join(preschoolRoot, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
const sceneCssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '47-home-scene-composition.css');

test('preschool home loads a final scene composition layer', () => {
  assert.match(indexHtml, /47-home-scene-composition\.css\?[^"']*home-scene-v3-alpha/);
  assert.equal(fs.existsSync(sceneCssPath), true, 'home scene composition CSS should be present');
});

test('preschool home uses the scene as a surface and keeps cards independent', () => {
  const css = fs.readFileSync(sceneCssPath, 'utf8');

  assert.match(css, /\.preschool-home-overview\.is-simple\s*\{[\s\S]*?background:[\s\S]*?var\(--child-scene-image\)/);
  assert.match(css, /\.preschool-home-overview\.is-simple\s*\{[\s\S]*?border:\s*0/);
  assert.match(css, /\.preschool-home-battlefield\s*\{[\s\S]*?background:\s*transparent[\s\S]*?border:\s*0/);
  assert.match(css, /\.preschool-home-lanes\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.preschool-home-lane:nth-child\(3n\s*\+\s*1\)/);
  assert.match(css, /\.preschool-home-lane:nth-child\(3n\s*\+\s*2\)/);
  assert.match(css, /\.preschool-home-lane:nth-child\(3n\s*\+\s*3\)/);
  assert.match(css, /Reference composition v2/);
  assert.match(css, /\.preschool-home-hero-card\s*\{[\s\S]*?border:\s*0[;\s\S]*?background:\s*transparent[;\s\S]*?box-shadow:\s*none/);
  assert.match(css, /\.preschool-home-hero-copy::after/);
  assert.match(css, /\.preschool-home-hero-art\s*\{[\s\S]*?position:\s*absolute/);
});

test('preschool home keeps routed actions and bounds Android landscape layout', () => {
  const css = fs.readFileSync(sceneCssPath, 'utf8');

  assert.match(app, /data-action="navigate" data-page="plans"/);
  assert.match(app, /preschool-home-lane-main/);
  assert.match(app, /open-plan-course/);
  assert.match(css, /@media \(orientation:\s*landscape\)/);
  assert.match(css, /html\.is-android-app body\.variant-preschool[\s\S]*?\.preschool-home-overview\.is-simple[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
