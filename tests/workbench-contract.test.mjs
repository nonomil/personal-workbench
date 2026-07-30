import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};

await import('../storage.js');
await import('../api-adapter.js');

const storage = globalThis.PersonalWorkbenchStorage;

test('uses an isolated localStorage key and seeds a usable snapshot', () => {
  assert.equal(storage.STORAGE_KEY, 'petbank_huchuliang_workbench_state_v1');
  const state = storage.repository.load();
  assert.equal(state.schemaVersion, 5);
  assert.equal(state.profileId, 'local-default');
  assert.ok(state.dailyPlans.length > 0);
  assert.ok(state.tasks.length > 0);
  assert.ok(state.growth && Array.isArray(state.growth.awardedIds));
  assert.ok(state.growth.plant && state.growth.unicorn && state.growth.zombie);
  assert.ok(state.courseProgress && Array.isArray(state.courseProgress.completedLessonIds));
  assert.ok(Array.isArray(state.mistakes));
  assert.ok(state.adult && Array.isArray(state.adult.lifeEntries));
  assert.ok(Array.isArray(state.adult.habits));
  assert.ok(Array.isArray(state.adult.milestones));
});

test('normalizes numeric ranges and preserves the snapshot shape', () => {
  const state = storage.normalizeState({
    schemaVersion: 1,
    profileId: 'local-default',
    revision: 3,
    tasks: [{ id: 't', title: 'A', progress: 300 }],
    dailyPlans: [],
    readingLogs: [{ id: 'r', title: 'B', minutes: -20, pages: 5 }],
    focusSessions: [{ id: 'f', minutes: 9000 }],
    goals: [{ id: 'g', title: 'C', progress: -4 }],
    reviews: []
  });
  assert.equal(state.tasks[0].progress, 100);
  assert.equal(state.readingLogs[0].minutes, 0);
  assert.equal(state.focusSessions[0].minutes, 1440);
  assert.equal(state.goals[0].progress, 0);
  assert.ok(Array.isArray(state.reviews));
  assert.equal(state.growth.sunlight, 0);
  assert.deepEqual(state.growth.claimedRewardIds, []);
  assert.deepEqual(state.courseProgress.completedLessonIds, []);
  assert.deepEqual(state.mistakes, []);
  assert.ok(state.adult && Array.isArray(state.adult.archive));
});

test('updates revision and returns the saved state', () => {
  const before = storage.repository.load();
  const result = storage.repository.update((next) => {
    next.dailyPlans.push({ id: 'test-plan', date: storage.localDate(), title: '契约测试计划', category: '学习', done: false, order: 99, createdAt: new Date().toISOString(), completedAt: null });
  });
  assert.equal(result.ok, true);
  assert.equal(result.state.revision, before.revision + 1);
  assert.ok(result.state.dailyPlans.some((item) => item.id === 'test-plan'));
});

test('remote adapter reports local mode without making a network call', async () => {
  const adapter = globalThis.PersonalWorkbenchApi.createRemoteAdapter();
  assert.equal(adapter.status, 'not-configured');
  const result = await adapter.pullSnapshot();
  assert.equal(result.ok, false);
  assert.equal(result.status, 'not-configured');
});

test('keeps adult, child and preschool entry points isolated', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const adultHtml = fs.readFileSync(path.join(root, '成人成长工作台', 'index.html'), 'utf8');
  const childHtml = fs.readFileSync(path.join(root, '儿童学习工作台', 'index.html'), 'utf8');
  const preschoolHtml = fs.readFileSync(path.join(root, 'preschool-workbench', 'index.html'), 'utf8');
  const legacyPreschoolHtml = fs.readFileSync(path.join(root, '幼儿学习工作台', 'index.html'), 'utf8');
  const rootHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const launcher = fs.readFileSync(path.join(root, 'launcher.js'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const capacitorConfig = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'android-apk.yml'), 'utf8');
  assert.match(adultHtml, /data-workbench-variant="adult"/);
  assert.match(adultHtml, /data-page="life"/);
  assert.match(adultHtml, /data-page="archive"/);
  assert.match(adultHtml, /data-page="settings"/);
  assert.match(childHtml, /data-workbench-variant="child"/);
  assert.match(preschoolHtml, /data-workbench-variant="preschool"/);
  assert.match(preschoolHtml, /data-page="courses"/);
  assert.match(preschoolHtml, /data-page="rewards"/);
  assert.match(preschoolHtml, /preschool-garden\.js/);
  assert.match(legacyPreschoolHtml, /preschool-workbench/);
  assert.match(rootHtml, /成人成长工作台/);
  assert.match(rootHtml, /儿童学习工作台/);
  assert.match(rootHtml, /幼儿学习工作台/);
  assert.match(rootHtml, /launcher\.js/);
  assert.match(rootHtml, /choose=1/);
  assert.match(rootHtml, /data-workbench-variant="adult"/);
  assert.match(rootHtml, /data-workbench-variant="child"/);
  assert.match(rootHtml, /data-workbench-variant="preschool"/);
  assert.match(rootHtml, /href="\.\/preschool-workbench\/"/);
  assert.match(launcher, /personal_workbench_selected_variant_v1/);
  assert.match(launcher, /shouldAutoRedirect/);
  assert.match(adultHtml, /\.\.\/launcher\.js/);
  assert.match(childHtml, /\.\.\/launcher\.js/);
  assert.match(preschoolHtml, /\.\.\/launcher\.js/);
  assert.match(childHtml, /data-page="rewards"/);
  assert.match(childHtml, /data-page="mistakes"/);
  assert.match(config, /petbank_huchuliang_adult_workbench_state_v1/);
  assert.match(config, /petbank_huchuliang_child_workbench_state_v1/);
  assert.match(config, /petbank_huchuliang_preschool_workbench_state_v1/);
  assert.match(config, /path: '\.\.\/成人成长工作台\/'/);
  assert.match(config, /path: '\.\.\/儿童学习工作台\/'/);
  assert.match(config, /path: '\.\.\/preschool-workbench\/'/);
  assert.match(config, /topbar-mode-link/);
  assert.match(config, /topbar-workbench-switcher/);
  assert.match(config, /dataset\.workbenchVariant/);
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.match(app, /workbench-switcher-panel/);
  assert.match(app, /renderWorkbenchSwitcher/);
  assert.match(app, /renderSettings[\s\S]*renderWorkbenchSwitcher/);
  assert.equal(capacitorConfig.appId, 'com.nonomil.personalworkbench');
  assert.equal(capacitorConfig.webDir, 'dist');
  assert.equal(packageJson.scripts['android:init'], 'npm run android:prepare && cap add android');
  assert.equal(packageJson.scripts['android:sync'], 'npm run android:prepare && cap sync android');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /tags:\s*\n\s*- 'v\*'/);
  assert.match(workflow, /working-directory:\s*android/);
  assert.match(workflow, /assembleDebug/);
  assert.match(workflow, /softprops\/action-gh-release/);
  assert.match(config, /workbench-hero-child/);
  assert.match(config, /reward-story-choice/);
  assert.match(config, /life: \{ title: '生活分区'/);
  assert.match(config, /archive: \{ title: '归档与统计'/);
  assert.match(config, /settings: \{ title: '偏好设置'/);
  assert.match(config, /const page = item\.dataset\.page;/);
  assert.match(app, /data-action="fire-pea"/);
  assert.match(app, /getPreschoolDefense/);
  assert.match(app, /spawnInvader/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /pixel-defense/);
});

console.log(`workbench contract: ${storage.STORAGE_KEY}`);
