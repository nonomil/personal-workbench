import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCssGraph } from './helpers/css-graph.mjs';

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};

await import('../prj/storage.js');
await import('../prj/api-adapter.js');

const storage = globalThis.PersonalWorkbenchStorage;

test('uses an isolated localStorage key and seeds a usable snapshot', () => {
  assert.equal(storage.STORAGE_KEY, 'petbank_huchuliang_workbench_state_v1');
  const state = storage.repository.load();
  assert.equal(state.schemaVersion, 6);
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
  const contentRoot = path.join(root, 'prj');
  const adultHtml = fs.readFileSync(path.join(contentRoot, '成人成长工作台', 'index.html'), 'utf8');
  const childHtml = fs.readFileSync(path.join(contentRoot, '儿童学习工作台', 'index.html'), 'utf8');
  const preschoolHtml = fs.readFileSync(path.join(contentRoot, 'preschool-workbench', 'index.html'), 'utf8');
  const legacyPreschoolHtml = fs.readFileSync(path.join(contentRoot, '幼儿学习工作台', 'index.html'), 'utf8');
  const rootHtml = fs.readFileSync(path.join(contentRoot, 'index.html'), 'utf8');
  const config = fs.readFileSync(path.join(contentRoot, 'config.js'), 'utf8');
  const launcher = fs.readFileSync(path.join(contentRoot, 'launcher.js'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const capacitorConfig = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'android-apk.yml'), 'utf8');
  assert.match(adultHtml, /data-workbench-variant="adult"/);
  assert.match(adultHtml, /data-page="life"/);
  assert.match(adultHtml, /data-page="archive"/);
  assert.match(adultHtml, /data-page="settings"/);
  assert.match(childHtml, /data-workbench-variant="child"/);
  assert.match(preschoolHtml, /data-workbench-variant="preschool"/);
  assert.match(preschoolHtml, /data-page="battle"/);
  assert.match(preschoolHtml, /data-page="courses"/);
  assert.match(preschoolHtml, /data-page="rewards"/);
  assert.match(preschoolHtml, /preschool-garden\.js/);
  assert.match(legacyPreschoolHtml, /preschool-workbench/);
  assert.match(rootHtml, /成人成长工作台/);
  assert.match(rootHtml, /儿童学习工作台/);
  assert.match(rootHtml, /<span>03 WORLDS<\/span>[\s\S]*<span>02 WORKBENCHES<\/span>[\s\S]*<span>LOCAL FIRST<\/span>/);
  assert.match(rootHtml, /幼儿游戏世界/);
  assert.match(rootHtml, /植物僵尸工作台/);
  assert.match(rootHtml, /我的世界工作台/);
  assert.match(rootHtml, /马里奥工作台/);
  assert.match(rootHtml, /data-workbench-theme="garden-defense"/);
  assert.match(rootHtml, /data-workbench-theme="voxel-adventure"/);
  assert.match(rootHtml, /data-workbench-theme="platform-quest"/);
  assert.match(rootHtml, /data-launcher-group="preschool-worlds"/);
  assert.match(rootHtml, /data-launcher-group="general-workbenches"/);
  assert.ok(rootHtml.indexOf('data-launcher-group="preschool-worlds"') < rootHtml.indexOf('data-launcher-group="general-workbenches"'));
  const gardenHref = rootHtml.indexOf('href="./preschool-workbench/index.html?theme=garden-defense"');
  const voxelHref = rootHtml.indexOf('href="./preschool-workbench/index.html?theme=voxel-adventure"');
  const platformHref = rootHtml.indexOf('href="./preschool-workbench/index.html?theme=platform-quest"');
  const adultHref = rootHtml.indexOf('href="./成人成长工作台/index.html"');
  const childHref = rootHtml.indexOf('href="./儿童学习工作台/index.html"');
  assert.ok(gardenHref < voxelHref);
  assert.ok(voxelHref < platformHref);
  assert.ok(platformHref < adultHref);
  assert.ok(adultHref < childHref);
  assert.match(rootHtml, /launcher\.js/);
  assert.match(rootHtml, /choose=1/);
  assert.match(rootHtml, /data-workbench-variant="adult"/);
  assert.match(rootHtml, /data-workbench-variant="child"/);
  assert.match(rootHtml, /data-workbench-variant="preschool"/);
  assert.match(rootHtml, /href="\.\/preschool-workbench\/index\.html\?theme=garden-defense"/);
  assert.match(rootHtml, /@media \(max-width: 640px\)[\s\S]*launcher-topbar-meta span:last-child \{ display: none; \}/);
  assert.match(rootHtml, /@media \(max-width: 640px\)[\s\S]*launcher-topbar-meta span:first-child \{ white-space: nowrap; \}/);
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
  assert.match(config, /path: '\.\.\/成人成长工作台\/index\.html'/);
  assert.match(config, /path: '\.\.\/儿童学习工作台\/index\.html'/);
  assert.match(config, /path: '\.\.\/preschool-workbench\/index\.html'/);
  assert.match(config, /topbar-mode-link/);
  assert.match(config, /topbar-workbench-switcher/);
  assert.match(config, /dataset\.workbenchVariant/);
  const app = fs.readFileSync(path.join(contentRoot, 'app.js'), 'utf8');
  const styles = readCssGraph(path.join(contentRoot, 'styles.css'));
  assert.match(app, /workbench-switcher-panel/);
  assert.match(app, /renderWorkbenchSwitcher/);
  assert.match(app, /renderSettings[\s\S]*renderWorkbenchSwitcher/);
  assert.match(app, /function getWorkbenchSwitchEntries/);
  assert.match(app, /theme=garden-defense/);
  assert.match(app, /theme=voxel-adventure/);
  assert.match(app, /theme=platform-quest/);
  assert.match(app, /五个入口/);
  assert.match(config, /data-workbench-theme/);
  assert.match(config, /theme=garden-defense|theme=\$\{|theme=\$\{encodeURIComponent/);
  assert.equal(capacitorConfig.appId, 'com.nonomil.personalworkbench');
  assert.equal(capacitorConfig.webDir, 'dist');
  assert.equal(packageJson.scripts['android:init'], 'npm run android:prepare && cap add android');
  assert.equal(packageJson.scripts['android:sync'], 'npm run android:prepare && cap sync android');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /tags:\s*\n\s*- 'v\*'/);
  assert.match(workflow, /working-directory:\s*android/);
  assert.match(workflow, /assembleRelease/);
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
  assert.match(app, /startPreschoolMusic/);
  assert.match(app, /toggle-music/);
  assert.match(app, /toggle-motion/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /pixel-defense/);
});

test('publishes versioned CSS manifests and nested preschool assets', () => {
  const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
  const manifests = {
    adult: path.join(root, 'css', 'adult-workbench.css'),
    child: path.join(root, 'css', 'child-workbench.css'),
    preschool: path.join(root, 'css', 'preschool-workbench.css')
  };
  for (const manifestPath of Object.values(manifests)) {
    assert.equal(fs.existsSync(manifestPath), true, manifestPath);
    assert.match(fs.readFileSync(manifestPath, 'utf8'), /@import/);
  }
  const preschoolStyles = readCssGraph(manifests.preschool);
  assert.match(preschoolStyles, /\.\.\/\.\.\/assets\/generated\/preschool-pixel/);
  assert.equal(fs.existsSync(path.join(root, 'preschool-pvz-final.css')), true);
  assert.match(fs.readFileSync(path.join(root, 'styles.css'), 'utf8'), /Compatibility aggregate/);
});

test('keeps the adult dashboard and workbench switcher inside a phone viewport', () => {
  const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
  const adultStyles = fs.readFileSync(path.join(root, 'css', 'adult.css'), 'utf8');
  assert.match(adultStyles, /body\.variant-adult \.dashboard-grid \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(adultStyles, /body\.variant-adult \.dashboard-column \{[^}]*min-width:\s*0/);
  assert.match(adultStyles, /@media \(max-width: 1080px\)[\s\S]*body\.variant-adult \.metric-grid \{[^}]*grid-template-columns:\s*repeat\(2/);
  assert.match(adultStyles, /@media \(max-width: 1080px\)[\s\S]*body\.variant-adult \.focus-card \{[^}]*grid-template-columns:\s*1fr/);
  assert.match(adultStyles, /@media \(max-width: 700px\)[\s\S]*body\.variant-adult \.adult-command-grid[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(adultStyles, /@media \(max-width: 860px\)[\s\S]*body\.variant-adult \.dashboard-grid \{[^}]*grid-template-columns:\s*1fr/);
  assert.match(adultStyles, /@media \(max-width: 560px\)[\s\S]*body\.variant-adult \.topbar-workbench-menu \{[^}]*position:\s*fixed/);
  assert.match(adultStyles, /body\.variant-adult \.topbar-workbench-menu \{[^}]*max-width:\s*calc\(100vw - 28px\)/);
});

test('applies the woody study paper-glow palette to the adult workbench', () => {
  const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
  const adultStyles = fs.readFileSync(path.join(root, 'css', 'adult.css'), 'utf8');
  assert.match(adultStyles, /body\.variant-adult \{[^}]*--orange: #b9893a/s);
  assert.match(adultStyles, /body\.variant-adult \{[^}]*--lime: #3f5448/s);
  assert.match(adultStyles, /body\.variant-adult \{[^}]*color-scheme: light/s);
  assert.match(adultStyles, /0 1px 2px rgba\(90, 80, 60, 0\.05\)/);
  assert.match(adultStyles, /body\.variant-adult \.btn-primary \{[^}]*background: #3f5448/);
  assert.match(adultStyles, /rgba\(245, 230, 184, 0\.5\)/);
  assert.match(fs.readFileSync(path.join(root, '成人成长工作台', 'index.html'), 'utf8'), /adult-workbench\.css\?v=20260815-true-wb-v1/);
});

function sliceFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name + ' missing');
  const next = src.indexOf('\n    function ', start + 10);
  return src.slice(start, next === -1 ? start + 5000 : next);
}

test('adult workbench drops habit check-in from the home and life path', () => {
  const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const overview = sliceFn(app, 'renderAdultOverview');
  const life = sliceFn(app, 'renderLife');
  const habits = sliceFn(app, 'renderHabitRows');
  const derived = sliceFn(app, 'getDerived');
  assert.doesNotMatch(overview, /toggle-habit/);
  assert.match(overview, /adult-next-step|下一步/);
  assert.doesNotMatch(life, /习惯打卡/);
  assert.match(life, /习惯备忘/);
  assert.doesNotMatch(habits, /toggle-habit/);
  assert.doesNotMatch(derived, /habit\.checkedDates/);
});

test('workbench can build a local weekly memo without fetching', () => {
  const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /function buildWorkbenchWeekMemo\(/);
  const memo = sliceFn(app, 'buildWorkbenchWeekMemo');
  assert.doesNotMatch(memo, /fetch\s*\(/);
  assert.match(memo, /checkinDates|dailyPlans|mistakes/);
  assert.match(app, /data-action="export-week-memo"/);
});

console.log(`workbench contract: ${storage.STORAGE_KEY}`);
