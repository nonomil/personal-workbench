import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (filePath) => fs.readFileSync(filePath, 'utf8');

function sliceFn(source, name) {
  const start = source.indexOf('function ' + name);
  assert.ok(start >= 0, name + ' must exist');
  const next = source.indexOf('\n    function ', start + 10);
  const end = next >= 0 ? next : source.length;
  return source.slice(start, end);
}

test('home hero renders today-goals strip and start-today CTA', () => {
  const app = read(path.join(repoRoot, 'prj', 'app.js'));
  const hero = sliceFn(app, 'renderPreschoolHomeHero');
  const workflow = sliceFn(app, 'getPreschoolHomeWorkflow');
  const goals = sliceFn(app, 'getPreschoolTodayGoalPlans');
  const renderGoals = sliceFn(app, 'renderPreschoolTodayGoals');

  assert.match(hero, /renderPreschoolTodayGoals\(plans/);
  assert.match(hero, /开始今日学习|继续今日学习/);
  assert.match(workflow, /开始今日学习/);
  assert.match(workflow, /继续今日学习/);
  assert.match(goals, /practiceLessonId/);
  assert.match(goals, /isPreschoolTimedCheckin/);
  assert.match(renderGoals, /今日学习目标/);
  assert.match(renderGoals, /preschool-today-goals/);
  assert.match(renderGoals, /data-action="open-plan-practice"/);
  assert.doesNotMatch(renderGoals, /toggle-plan/);
});

test('home workflow treats practice goals as complete even if timed check-ins remain', () => {
  const app = read(path.join(repoRoot, 'prj', 'app.js'));
  const workflow = sliceFn(app, 'getPreschoolHomeWorkflow');
  assert.match(workflow, /getPreschoolTodayGoalState/);
  assert.match(workflow, /kind: 'game'/);
});

test('today-goals CSS is compact on short landscape and avoids old-WebView traps', () => {
  const cssPath = path.join(repoRoot, 'prj', 'css', 'preschool', '58-today-goals.css');
  assert.equal(fs.existsSync(cssPath), true, '58-today-goals.css should exist');
  const css = read(cssPath);
  assert.match(css, /preschool-today-goals/);
  assert.match(css, /@media \(orientation:\s*landscape\) and \(max-height:\s*480px\)/);
  assert.match(css, /preschool-today-goals-list[\s\S]{0,120}display:\s*none/);
  assert.doesNotMatch(css, /:has\(/);
  assert.doesNotMatch(css, /color-mix\(/);
  assert.doesNotMatch(css, /(?<![a-z-])dvh/);
});

test('preschool index loads today-goals CSS and cache stamps', () => {
  const index = read(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'));
  assert.match(index, /58-today-goals\.css\?[^"']*today-goals=v1/);
  assert.match(index, /app\.js\?[^"']*today-goals=v1/);
});
