import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/child-growth.js');
const growthLib = globalThis.PersonalWorkbenchChildGrowth;

const seed = () => growthLib.normalize({ sunlight: 150, wishes: [], pendingRewardIds: [], claimedRewardIds: [] });

test('wishes normalize trims, caps and drops junk entries', () => {
    const junk = growthLib.normalize({
        wishes: [
            { id: 'wish-a', title: '  去动物园  ', cost: 80, createdAt: '2026-08-28' },
            { id: '', title: '无id', cost: 10 },
            { id: 'wish-b', title: '', cost: 10 },
            { id: 'wish-c', title: '超级超级超级超级超级超级超级超级超级超级超级超级超长的心愿名', cost: 10 },
            { id: 'wish-d', title: '价错', cost: 5000 },
            'not-an-object'
        ]
    });
    assert.equal(junk.wishes.length, 3);
    assert.equal(junk.wishes[0].title, '去动物园');
    assert.equal(junk.wishes[0].cost, 80);
    assert.ok(junk.wishes[2].title.length <= 24, '超长标题截到 24 字');
    assert.ok(junk.wishes.find(item => item.id === 'wish-d').cost <= 999, '价格夹紧到 999');
    const capped = growthLib.normalize({
        wishes: Array.from({ length: 9 }, (_, i) => ({ id: 'wish-' + i, title: '愿' + i, cost: 10 }))
    });
    assert.equal(capped.wishes.length, 5, '最多保留 5 条');
});

test('addWish validates and removeWish cleans pending id', () => {
    let g = seed();
    const added = growthLib.addWish(g, { title: '看一场电影', cost: 120, id: 'wish-movie' }, '2026-08-28');
    assert.equal(added.ok, true);
    assert.equal(added.id, 'wish-movie');
    g = added.growth;
    assert.equal(g.wishes[0].createdAt, '2026-08-28');

    assert.equal(growthLib.addWish(g, { title: '   ', cost: 50 }).ok, false, '空标题拒绝');
    assert.equal(growthLib.addWish(g, { title: '太贵', cost: 2000 }).ok, false, '价格越界拒绝');
    assert.equal(growthLib.addWish(g, { title: '看一场电影', cost: 100 }).ok, false, '同名心愿拒绝');

    let g2 = growthLib.requestPendingReward(g, { id: 'wish-movie', cost: 120 }).growth;
    assert.ok(g2.pendingRewardIds.includes('wish-movie'), '心愿兑换走 pending 链路');
    const removed = growthLib.removeWish(g2, 'wish-movie');
    assert.equal(removed.ok, true);
    assert.equal(removed.growth.wishes.length, 0);
    assert.equal(removed.growth.pendingRewardIds.includes('wish-movie'), false, '删心愿同步清待确认');
    assert.equal(removed.growth.sunlight, 150, '删心愿不扣阳光');

    const confirmGrow = growthLib.confirmPendingReward(g2, { id: 'wish-movie', cost: 120 });
    assert.equal(confirmGrow.ok, true);
    assert.equal(confirmGrow.growth.sunlight, 30, '家长确认后扣阳光');
    assert.ok(confirmGrow.growth.claimedRewardIds.includes('wish-movie'));
});

test('app wires wish actions, catalog merge and stamps', () => {
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    assert.match(app, /function getChildRewardCatalog\(\)/);
    assert.match(app, /getChildRewards\(\)\.concat\(getWishList\(\)/);
    assert.equal((app.match(/data-action="add-wish"/g) || []).length, 1);
    assert.match(app, /data-action="remove-wish"/);
    assert.match(app, /data-action="wish-cost"/);
    assert.match(app, /if \(action === 'add-wish'\) addWishAction\(\);/);
    assert.match(app, /if \(action === 'remove-wish'\) removeWishAction\(target\.dataset\.id\);/);
    assert.match(app, /if \(action === 'wish-cost'\) selectWishCost\(target\);/);
    assert.match(app, /const reward = getChildRewardCatalog\(\)\.find\(item => item\.id === id\);/, '兑换与确认都走合并目录');
    assert.equal((app.match(/const reward = getChildRewardCatalog\(\)\.find/g) || []).length, 2, 'requestReward 与 confirmReward 各一处');
    assert.match(app, /renderPreschoolWishSection\(growth\)/);
    assert.match(app, /rewards: getChildRewardCatalog\(\)/, '学情摘要待确认列表解析心愿标题');
    const index = fs.readFileSync(path.join(repoRoot, 'prj/preschool-workbench/index.html'), 'utf8');
    assert.match(index, /child-growth\.js\?[^"']*wishes=v1/);
    assert.match(index, /app\.js\?[^"']*wishes=v1/);
    assert.match(index, /preschool-workbench\.css\?[^"']*wishes=v1/);
});

test('view exposes wishes and docs register the field', () => {
    const view = growthLib.getView(seed(), '2026-08-28');
    assert.ok(Array.isArray(view.wishes), 'getView 暴露 wishes');
    const model = fs.readFileSync(path.join(repoRoot, 'docs/data-model.md'), 'utf8');
    assert.match(model, /`growth\.wishes`/);
    const css = fs.readFileSync(path.join(repoRoot, 'prj/css/preschool/06-garden-ui.css'), 'utf8');
    assert.match(css, /\.preschool-wish-form/);
    assert.ok(!/:has\(/.test(css.split('.preschool-wish')[1] || ''), '心愿样式不使用 :has()');
});
