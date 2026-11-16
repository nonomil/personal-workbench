import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/child-growth.js');
const growthEngine = globalThis.PersonalWorkbenchChildGrowth;

test('voxel workshop state normalizes with safe defaults', () => {
    const growth = growthEngine.normalize({});
    assert.equal(growth.voxelWorkshop.homeDurability, 100);
    assert.equal(growth.voxelWorkshop.weaponId, 'none');
    assert.equal(growth.voxelWorkshop.armorId, 'none');
    assert.deepEqual(growth.voxelWorkshop.ownedWeaponIds, ['none']);
    assert.deepEqual(growth.voxelWorkshop.ownedArmorIds, ['none']);
    assert.deepEqual(growth.voxelWorkshop.log, []);
});

test('voxel workshop keeps existing values and clamps durability and log', () => {
    const growth = growthEngine.normalize({
        voxelWorkshop: {
            homeDurability: 250,
            weaponId: 'diamond',
            armorId: 'iron',
            ownedWeaponIds: ['none', 'diamond'],
            ownedArmorIds: ['none', 'iron'],
            log: Array.from({ length: 40 }, (_, index) => ({ t: '10:00', text: `e${index}` }))
        }
    });
    assert.equal(growth.voxelWorkshop.homeDurability, 100);
    assert.equal(growth.voxelWorkshop.weaponId, 'diamond');
    assert.equal(growth.voxelWorkshop.armorId, 'iron');
    assert.equal(growth.voxelWorkshop.ownedWeaponIds.length, 2);
    assert.ok(growth.voxelWorkshop.log.length <= 24);
});

test('workshop page actions and theme guard exist in app.js', () => {
    const app = fs.readFileSync(path.join(root, 'prj', 'app.js'), 'utf8');
    assert.match(app, /if \(ui\.page === 'workshop'\) return getPreschoolThemeId\(\) === 'voxel-adventure' \? renderWorkshopPage\(derived\) : renderPreschoolHomeOverview\(derived\);/);
    for (const action of ['workshop-tab', 'workshop-feed', 'workshop-fight', 'workshop-buy', 'workshop-equip', 'workshop-repair-home', 'workshop-memory-start', 'workshop-memory-flip', 'workshop-settle', 'workshop-close-report']) {
        assert.ok(app.includes(`'${action}'`), `missing action ${action}`);
    }
    // sunlight is only spent via explicit cost checks; no unconditional deduction paths beyond the three
    const spendSites = app.match(/next\.growth\.sunlight -=/g) || [];
    assert.ok(spendSites.length >= 1 && spendSites.length <= 2, `unexpected sunlight deduction sites: ${spendSites.length}`);
});

test('workshop economy constants match the reference design', () => {
    const app = fs.readFileSync(path.join(root, 'prj', 'app.js'), 'utf8');
    assert.match(app, /cost: 5, hunger: 15/);
    assert.match(app, /cost: 8, hunger: 25/);
    assert.match(app, /cost: 15, hunger: 50/);
    assert.match(app, /const WORKSHOP_REPAIR_COST = 25;/);
    assert.match(app, /const WORKSHOP_SETTLE_BONUS = 30;/);
    assert.match(app, /const WORKSHOP_MEMORY_REWARD = 10;/);
    // no penalty: tasks never deduct sunlight on incompleteness
    assert.doesNotMatch(app, /未完成.*-5|扣.*阳光惩罚/);
});

test('workshop entry is voxel-only in the sidebar markup', () => {
    const html = fs.readFileSync(path.join(root, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(html, /data-page="workshop"[^>]*data-voxel-only="1"/);
    const app = fs.readFileSync(path.join(root, 'prj', 'app.js'), 'utf8');
    assert.match(app, /workshopEntry\.hidden = themeId !== 'voxel-adventure'/);
});
