import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/games/wordboss/data/bosses.js');
await import('../prj/games/wordboss/data/skills.js');
await import('../prj/games/wordboss/engine.js');
const engine = globalThis.PersonalWorkbenchWordbossEngine;
const bosses = globalThis.PersonalWorkbenchWordbossBosses;
const skills = globalThis.PersonalWorkbenchWordbossSkills;

test('letter pool keeps every target letter plus two extras', () => {
    const pool = engine.buildLetterPool('cat');
    assert.equal(pool.length, 5);
    assert.equal(pool.filter((letter) => letter === 'c').length, 1);
    assert.equal(pool.filter((letter) => letter === 'a').length, 1);
    assert.equal(pool.filter((letter) => letter === 't').length, 1);
});

test('word pool always includes the daily three words', () => {
    const pool = engine.buildWordPool({
        daily: [{ text: 'hello', zh: '你好' }, { text: 'cat', zh: '猫' }, { text: 'dog', zh: '狗' }],
        learned: [{ text: 'apple', zh: '苹果' }],
        bank: [{ text: 'sun', zh: '太阳' }, { text: 'moon', zh: '月亮' }, { text: 'tree', zh: '树' }, { text: 'home', zh: '家' }],
        size: 8
    });
    const texts = pool.map((item) => item.text);
    assert.equal(texts.includes('hello'), true);
    assert.equal(texts.includes('cat'), true);
    assert.equal(texts.includes('dog'), true);
    assert.ok(pool.length <= 8);
});

test('skills and freeze and shop stay in memory only', () => {
    const fire = skills.find((item) => item.id === 'fire');
    const ice = skills.find((item) => item.id === 'ice');
    let battle = engine.createBattle(bosses[0], 80);
    battle = engine.applySkill(battle, fire);
    assert.equal(battle.bossHp, 60 - 12);
    assert.equal(battle.gold, 10);
    battle = engine.applySkill(battle, ice);
    assert.equal(battle.freeze, 1);
    const afterFreeze = engine.applyBossHit(battle, 6);
    assert.equal(afterFreeze.heroHp, 80);
    assert.equal(afterFreeze.freeze, 0);
    const bought = engine.buyEquip(afterFreeze, { id: 'wood', bonus: 4, price: 20 });
    assert.equal(bought.gold, 0);
    assert.equal(bought.bonus, 4);
    assert.equal(Object.prototype.hasOwnProperty.call(bought, 'goldLedger'), true);
});

test('wordboss files exist and do not write a storage gold key', () => {
    const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'wordboss', 'game.js'), 'utf8');
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    assert.match(game, /awardSunlight/);
    assert.match(game, /recordWordAnswer/);
    assert.equal(/localStorage\.setItem\([^\)]*gold/.test(game), false);
    assert.match(app, /open-wordboss/);
    assert.equal(fs.existsSync(path.join(repoRoot, 'prj', 'assets', 'generated', 'wordboss', 'published', 'goblin-king.svg')), true);
});
