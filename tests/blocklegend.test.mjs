import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

await import('../prj/games/blocklegend/data/combat.js');
const C = globalThis.BlockLegendCombat;

test('combat namespace exposes damage constants and pure helpers', () => {
  assert.equal(typeof C, 'object');
  assert.equal(typeof C.critMultiplier, 'function');
  assert.equal(typeof C.damage, 'function');
  assert.equal(typeof C.canAttack, 'function');
  assert.equal(typeof C.monsterOf, 'function');
  assert.equal(C.CRIT_MULT, 3);
  assert.ok(C.BASE_MELEE > 0);
  assert.ok(C.BASE_BOLT > 0);
  assert.notEqual(C.BASE_BOLT, C.BASE_MELEE);
  assert.ok(C.MELEE_COOLDOWN_MS > 0);
  assert.ok(C.BOLT_COOLDOWN_MS > 0);
  assert.equal(C.INVINCIBLE_MS, 1600);
  assert.ok(C.MELEE_RANGE > 1);
  assert.ok(C.BOLT_SPEED > 0);
  assert.ok(C.BOLT_TURN > 0);
});

test('unanswered or wrong attack stays at base damage and does not keep combo', () => {
  assert.equal(C.critMultiplier({ answered: false }), 1);
  assert.equal(C.critMultiplier({ answered: true, correct: false }), 1);
  assert.equal(C.critMultiplier({ answered: true, correct: false, combo: 5 }), 1);
  assert.equal(C.damage({ kind: 'melee', answered: false }), C.BASE_MELEE);
  assert.equal(C.damage({ kind: 'bolt', answered: true, correct: false }), C.BASE_BOLT);
  assert.equal(C.nextCombo({ answered: false, combo: 2 }), 0);
  assert.equal(C.nextCombo({ answered: true, correct: false, combo: 4 }), 0);
});

test('correct answer multiplies by CRIT_MULT, combo 3+ caps at CRIT_MULT+1', () => {
  assert.equal(C.critMultiplier({ answered: true, correct: true, combo: 0 }), C.CRIT_MULT);
  assert.equal(C.critMultiplier({ answered: true, correct: true, combo: 2 }), C.CRIT_MULT);
  assert.equal(C.critMultiplier({ answered: true, correct: true, combo: 3 }), C.CRIT_MULT + 1);
  assert.equal(C.critMultiplier({ answered: true, correct: true, combo: 9 }), C.CRIT_MULT + 1);
  assert.equal(C.damage({ kind: 'melee', answered: true, correct: true, combo: 0 }), C.BASE_MELEE * C.CRIT_MULT);
  assert.equal(C.damage({ kind: 'bolt', answered: true, correct: true, combo: 3 }), C.BASE_BOLT * (C.CRIT_MULT + 1));
  assert.equal(C.nextCombo({ answered: true, correct: true, combo: 0 }), 1);
  assert.equal(C.nextCombo({ answered: true, correct: true, combo: 2 }), 3);
});

test('attack cooldown is kind-specific', () => {
  assert.equal(C.canAttack({ kind: 'melee', lastAt: 1000, now: 1000 + C.MELEE_COOLDOWN_MS - 1 }), false);
  assert.equal(C.canAttack({ kind: 'melee', lastAt: 1000, now: 1000 + C.MELEE_COOLDOWN_MS }), true);
  assert.equal(C.canAttack({ kind: 'bolt', lastAt: 0, now: 0 }), true);
  assert.equal(C.canAttack({ kind: 'bolt', lastAt: 100, now: 100 + C.BOLT_COOLDOWN_MS - 1 }), false);
});

test('monster table has 2-3 kinds with hp and coin drops', () => {
  assert.ok(Array.isArray(C.MONSTER_KINDS));
  assert.ok(C.MONSTER_KINDS.length >= 3 && C.MONSTER_KINDS.length <= 16);
  C.MONSTER_KINDS.forEach((k) => {
    const m = C.monsterOf(k);
    assert.equal(m.kind, k);
    assert.ok(m.hp >= 8);
    assert.ok(m.coins >= 1);
    assert.ok(m.contact >= 1);
    assert.ok(m.speed > 0);
    assert.ok(m.loot);
  });
});

test('loot bag counts drops for the merchant and coins add up', () => {
  const bag = C.emptyBag();
  const after = C.addLoot(bag, 'slime-gel', 1);
  assert.equal(after['slime-gel'], 1);
  assert.equal(C.addLoot(after, 'slime-gel', 2)['slime-gel'], 3);
  assert.equal(C.pickupCoins(10, C.monsterOf('slime').coins), 10 + C.monsterOf('slime').coins);
});

test('melee fan and bolt homing stay deterministic', () => {
  // yaw 0 朝 -Z，前方目标应命中，背后不应
  assert.equal(C.inMeleeArc({ x: 0, z: 0 }, 0, { x: 0, z: -1.4 }), true);
  assert.equal(C.inMeleeArc({ x: 0, z: 0 }, 0, { x: 0, z: 2 }), false);
  assert.equal(C.inMeleeArc({ x: 0, z: 0 }, 0, { x: 0, z: -8 }), false);
  assert.equal(C.inMeleeArc({ x: 0, z: 0 }, 0, { x: 0, z: -3.8 }), true, 'sword should reach a mob a few steps ahead');
  assert.equal(C.inMeleeArc({ x: 0, z: 0 }, 0, { x: 0, z: -5.4, hitRadius: 1.2 }), true, 'tall boss body still counts');
  assert.ok(C.MELEE_RANGE >= 4, 'melee reach must be longer than a single block');
  const aim = C.aimPoint({ x: 2, y: 4, z: 6, height: 3.3 });
  assert.equal(aim.x, 2);
  assert.equal(aim.z, 6);
  assert.ok(aim.y > 5.5 && aim.y < 6.1);
  const nearest = C.nearestMonster({ x: 0, z: 0 }, [
    { id: 'a', x: 4, z: 0, hp: 4 },
    { id: 'b', x: 1, z: -1, hp: 4 },
    { id: 'c', x: 0, z: 0, hp: 0 }
  ]);
  assert.equal(nearest.id, 'b');
  const bolt = C.steerBolt({ x: 0, z: 0, vx: 0, vz: -C.BOLT_SPEED }, { x: 3, z: -4 }, 0.05);
  assert.ok(bolt.vx > 0, 'bolt should yaw toward +X');
});

test('first wave offsets sit in front of the look direction', () => {
  const f = C.forwardXZ(0);
  const spots = C.waveOffsets(0, 3);
  assert.equal(spots.length, 3);
  spots.forEach((s) => {
    assert.ok(s.dz * f.z > 0 || Math.abs(s.dz) < 0.01, 'forward-ish z');
    assert.ok(Math.hypot(s.dx, s.dz) >= 3.5);
    assert.ok(Math.hypot(s.dx, s.dz) <= 7);
  });
  assert.ok(Math.abs(spots[0].dx) < 0.2);
  assert.ok(spots[0].dz < 0);
});

test('holding attack prefers a mob in front over mining the ground', () => {
  assert.equal(typeof C.aimAction, 'function');
  assert.equal(C.aimAction({ mining: true, inMelee: true, hasBlock: true }), 'melee');
  assert.equal(C.aimAction({ mining: true, lookMob: true, lookDist: 4.2, meleeRange: 4.5, hasBlock: true }), 'melee');
  assert.equal(C.aimAction({ mining: true, inMelee: false, lookMob: false, hasBlock: true }), 'mine');
  assert.equal(C.aimAction({ mining: false, inMelee: false, lookMob: false, hasBlock: true }), 'none');
});

await import('../prj/games/blocklegend/data/words.js');
const W = globalThis.BlockLegendWords;
const coreCatalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'prj', 'assets', 'vocab', 'core-english-2026.08.15', 'catalog.json'), 'utf8'));
const bank = W.cardsToBank(coreCatalog);

test('fallback bank keeps five starter words when catalog is late', () => {
  assert.ok(Array.isArray(W.FALLBACK_BANK));
  assert.equal(W.FALLBACK_BANK.length, 5);
  assert.ok(W.FALLBACK_BANK.some((w) => w.text === 'slime'));
});

test('game starts a level before catalog returns and uses forward wave spots', () => {
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  const boot = game.slice(game.indexOf('function boot'), game.indexOf('function loadProgress'));
  const startAt = boot.indexOf('startLevel(');
  const catalogAt = boot.indexOf('loadCatalog(');
  assert.ok(startAt >= 0 && catalogAt >= 0);
  assert.ok(startAt < catalogAt, 'monsters must spawn even if catalog fetch fails');
  assert.match(game, /waveOffsets/);
  assert.match(game, /FALLBACK_BANK/);
});

test('word pools use core-english 597 daily words, easy themes first', () => {
  assert.equal(typeof W, 'object');
  assert.equal(typeof W.poolForLevel, 'function');
  assert.equal(typeof W.quizFor, 'function');
  assert.equal(bank.length, 597);
  const black = bank.find((w) => w.text === 'black');
  assert.ok(black);
  assert.equal(black.zh, '黑色');
  assert.match(black.media.image, /media\/semantic\/black\.png$/);
  assert.match(black.phrase || '', /black/i);
  assert.ok(black.phraseZh);
  const pools = [1, 2, 3, 4, 5, 6].map((lv) => W.poolForLevel(bank, lv));
  pools.forEach((p) => assert.ok(p.length > 0, 'level pool empty'));
  const ids = pools.flat().map((w) => w.id);
  assert.equal(new Set(ids).size, 597);
  assert.equal(ids.length, 597);
  assert.ok(pools[0].some((w) => w.theme === '颜色'));
  assert.ok(!pools[0].some((w) => w.theme === '学校' || w.theme === '生活'));
  assert.ok(pools[5].some((w) => w.theme === '学校' || w.theme === '生活'));
});

test('quizFor picks 3 unique same-theme distractors or marks fallback', () => {
  const word = bank.find((w) => w.text === 'black') || bank[0];
  const quiz = W.quizFor(word, bank);
  assert.equal(quiz.word.id, word.id);
  assert.equal(quiz.answer, word.zh);
  assert.equal(quiz.choices.length, 4);
  assert.equal(new Set(quiz.choices).size, 4);
  assert.ok(quiz.choices.includes(word.zh));
  const others = quiz.choices.filter((c) => c !== word.zh);
  assert.equal(others.length, 3);
  assert.equal(typeof W.makeQuiz, 'function');
  assert.equal(typeof W.checkQuiz, 'function');
  const easy = W.makeQuiz(word, bank, { turn: 9 });
  assert.equal(easy.mode, 'choice');
  assert.equal(easy.typed, false);
  const almost = W.makeQuiz(word, bank, { missStreak: 2 });
  assert.equal(almost.mode, 'choice');
  assert.equal(almost.showPhrase, false);
  const joined = W.makeQuiz(word, bank, { turn: 2 });
  assert.equal(joined.mode, 'choice');
  assert.equal(joined.showPhrase, true);
  assert.equal(joined.showPhraseZh, false);
  const sentence = W.makeQuiz(word, bank, { turn: 4 });
  assert.equal(sentence.mode, 'sentence');
  assert.equal(sentence.typed, false);
  assert.ok(sentence.choices.includes(word.phraseZh));
  assert.equal(W.checkQuiz(sentence, word.phraseZh), true);
  assert.equal(W.makeQuiz(word, bank, { turn: 4, gate: true }).mode, 'choice');
  assert.equal(bank.filter((w) => w.phrase && w.phraseZh).length, 597);
  const hard = W.makeQuiz(word, bank, { missStreak: 3 });
  assert.equal(hard.mode, 'spell');
  assert.equal(hard.typed, true);
  assert.equal(W.HARD_MISS, 3);
  assert.equal(W.needsHardMode(word, { missStreak: 2 }), false);
  assert.equal(W.needsHardMode(word, { missStreak: 3 }), true);
  const listen = W.makeQuiz(word, bank, { mode: 'listen' });
  assert.equal(listen.mode, 'listen');
  assert.equal(W.checkQuiz(listen, word.zh), true);
  const picture = W.makeQuiz(word, bank, { mode: 'picture' });
  assert.equal(picture.mode, 'picture');
  assert.ok(picture.choices.includes(word.text));
  assert.equal(W.checkQuiz(picture, word.text), true);
  const fill = W.makeQuiz(word, bank, { mode: 'fill' });
  assert.equal(fill.mode, 'fill');
  assert.match(fill.blank, /____/);
  assert.equal(W.checkQuiz(fill, 'Black'), true);
  const spell = W.makeQuiz(word, bank, { mode: 'spell' });
  assert.equal(spell.mode, 'spell');
  assert.equal(W.checkQuiz(spell, ' black '), true);
  assert.equal(W.checkQuiz(spell, 'blue'), false);
  const phraseWord = bank.find((w) => w.phrase && w.phraseZh) || word;
  const phrase = W.makeQuiz(phraseWord, bank, { mode: 'phrase' });
  assert.equal(phrase.mode, 'phrase');
  assert.equal(phrase.typed, true);
  assert.equal(W.checkQuiz(phrase, phraseWord.phrase), true);
  assert.ok(W.QUIZ_MODES.includes('phrase'));
  assert.ok(W.availableModes(phraseWord).includes('phrase'));
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  assert.match(html, /id="quiz-input"/);
  assert.match(html, /id="quiz-phrase"/);
  assert.match(html, /id="cast-hud"/);
  assert.match(html, /id="cast-input"/);
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(game, /makeQuiz\(/);
  assert.match(game, /submitTypedQuiz/);
  assert.match(game, /matchCast/);
  assert.match(game, /setCastMode/);
  const engine = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'engine.js'), 'utf8');
  assert.match(engine, /setCastMode/);
});

test('cast words bind uniquely and match typed English', () => {
  const a = W.bindCastWord(bank, []);
  assert.ok(a && a.text);
  const b = W.bindCastWord(bank, [a.id || a.text]);
  assert.ok(b && b.text);
  assert.notEqual(b.id || b.text, a.id || a.text);
  const mobs = [{ id: 'm1', word: a, hp: 4 }, { id: 'm2', word: b, hp: 4 }];
  assert.equal(W.matchCast(a.text.toUpperCase(), mobs), mobs[0]);
  assert.equal(W.matchCast('  ' + b.text + '  ', mobs), mobs[1]);
  assert.equal(W.matchCast('not-a-word', mobs), null);
  assert.equal(W.matchCast('   ', mobs), null);
});

test('look-at labels keep short Chinese fallbacks when the daily bank has no MC nouns', () => {
  const dirt = W.labelFor('dirt', bank);
  assert.equal(dirt.en, 'dirt');
  assert.equal(dirt.zh, '泥土');
  const log = W.labelFor('log', bank);
  assert.equal(log.zh, '原木');
  const leaf = W.labelFor('leaf', bank);
  assert.equal(leaf.zh, '树叶');
  const slime = W.labelFor('slime', bank);
  assert.equal(slime.zh, '史莱姆');
  const grass = W.labelFor('grass', bank);
  assert.equal(grass.zh, '草坪');
  const wordCube = W.labelFor('word', []);
  assert.equal(wordCube.zh, '单词方块');
  assert.equal(W.shouldAutoSpeak('grass', 'block'), false);
  assert.equal(W.shouldAutoSpeak('log', 'block'), false);
  assert.equal(W.shouldAutoSpeak('dirt', 'block'), false);
  assert.equal(W.shouldAutoSpeak('word', 'block'), true);
  assert.equal(W.shouldAutoSpeak('slime', 'mob'), true);
  const strip = W.sayStrip(W.poolForLevel(bank, 1), 6);
  assert.match(strip, /^Say: /);
  assert.ok(strip.split(' ').length >= 4);
});

test('collecting a word block pays coins, heals HP, and keeps the word', () => {
  const preview = W.collectWordBlock(
    { coins: 10, hp: 6, hpMax: 20, learnedIds: [] },
    { id: 'apple', text: 'apple', zh: '苹果' }
  );
  assert.equal(preview.pendingQuiz, true);
  assert.equal(preview.coins, 10);
  assert.equal(preview.hp, 6);
  assert.deepEqual(preview.learnedIds, []);
  const r = W.commitWordBlock(
    { coins: 10, hp: 6, hpMax: 20, learnedIds: [] },
    { id: 'apple', text: 'apple', zh: '苹果' }
  );
  assert.equal(r.coins, 13);
  assert.equal(r.hp, 10);
  assert.ok(r.learnedIds.indexOf('apple') >= 0);
  assert.equal(r.word.text, 'apple');
  const capped = W.commitWordBlock(
    { coins: 0, hp: 19, hpMax: 20, learnedIds: ['apple'] },
    { id: 'apple', text: 'apple', zh: '苹果' }
  );
  assert.equal(capped.hp, 20);
  assert.deepEqual(capped.learnedIds, ['apple']);
});

test('quiz cadence asks once per regular mob; boss asks 2 or 3 times by HP', () => {
  assert.equal(W.bossAskTimes(80), 2);
  assert.equal(W.bossAskTimes(140), 2);
  assert.equal(W.bossAskTimes(170), 3);
  assert.equal(W.bossAskTimes(240), 3);
  assert.deepEqual(W.bossAskMarks(80), [0.5, 0.25]);
  assert.deepEqual(W.bossAskMarks(200), [0.75, 0.5, 0.25]);
  assert.equal(W.shouldAsk({ firstHit: true }), true);
  assert.equal(W.shouldAsk({ firstHit: false }), false);
  assert.equal(W.shouldAsk({ firstHit: true, combo: W.SKIP_COMBO }), true);
  assert.equal(W.shouldAsk({ boss: true, hp: 80, maxHp: 80, askedCount: 0 }), false);
  assert.equal(W.shouldAsk({ boss: true, hp: 40, maxHp: 80, askedCount: 0 }), true);
  assert.equal(W.shouldAsk({ boss: true, hp: 40, maxHp: 80, askedCount: 1 }), false);
  assert.equal(W.shouldAsk({ boss: true, hp: 20, maxHp: 80, askedCount: 1 }), true);
  assert.equal(W.shouldAsk({ boss: true, hp: 20, maxHp: 80, askedCount: 2 }), false);
  assert.equal(W.shouldAsk({ boss: true, hp: 127, maxHp: 170, askedCount: 0 }), true);
  assert.equal(W.shouldAsk({ boss: true, hp: 160, maxHp: 170, askedCount: 0 }), false);
});

await import('../prj/games/blocklegend/data/levels.js');
const L = globalThis.BlockLegendLevels;

test('unlock prices are child-reachable and reject unpaid unlocks', () => {
  assert.deepEqual(L.UNLOCK_COST, [0, 50, 150, 300, 500, 800]);
  assert.equal(L.SUN_PER_LEVEL, 8);
  assert.equal(L.eventKey(1), 'level-1');
  const poor = L.tryUnlock({ unlockedLevel: 1, coined: 49 }, 2);
  assert.equal(poor.ok, false);
  assert.equal(poor.coined, 49);
  assert.equal(poor.unlockedLevel, 1);
  const ok = L.tryUnlock({ unlockedLevel: 1, coined: 50 }, 2);
  assert.equal(ok.ok, true);
  assert.equal(ok.coined, 0);
  assert.equal(ok.unlockedLevel, 2);
});

test('boss shield state machine: shielded reduce, broken window, recover 50%', () => {
  const boss = L.createBoss(1);
  assert.equal(boss.state, 'shielded');
  assert.equal(boss.color, 'blue');
  assert.ok(L.SHIELD_REDUCE >= 0.45, 'shielded hits must still chip visible HP');
  const tick = L.applyBossDamage(boss, 10, { now: 1000 });
  assert.equal(tick.dealt, 10 * L.SHIELD_REDUCE);
  assert.ok(tick.boss.hp <= boss.hp - 4);
  assert.equal(tick.boss.state, 'shielded');
  let b = tick.boss;
  while (b.shield > 0) {
    const r = L.chipShield(b, b.shield, { now: 2000 });
    b = r.boss;
  }
  assert.equal(b.state, 'broken');
  assert.equal(b.color, 'red');
  const open = L.applyBossDamage(b, 10, { now: 2100 });
  assert.equal(open.dealt, 10);
  const recovered = L.tickBoss(open.boss, 2100 + L.BROKEN_MS);
  assert.equal(recovered.state, 'shielded');
  assert.equal(recovered.color, 'blue');
  assert.ok(recovered.shield >= Math.floor(recovered.shieldMax * 0.5));
  const dying = L.applyBossDamage(Object.assign({}, open.boss, { hp: 4, state: 'broken', color: 'red' }), 10, { now: 2200 });
  assert.equal(dying.boss.dead, true);
  assert.notEqual(dying.boss.state, 'shielded');
});

test('workbench voxel home and game shell wire the S5 entry, help and merchant', () => {
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(app, /方块传奇 · 学英语/);
  assert.match(app, /games\/blocklegend\/index\.html/);
  assert.match(html, /id="help-layer"/);
  assert.match(html, /How to play/);
  assert.match(html, /id="trade-layer"/);
  assert.match(html, /id="look-card"/);
  assert.match(html, /Listening/);
  assert.match(game, /Press F to trade|openTrade|sellAll/);
});

test('contact requires a clear path and will not reach into a shelter', () => {
  assert.equal(typeof C.canTouch, 'function');
  assert.equal(C.canTouch({ x: 0, z: 0 }, { x: 1, z: 0 }, {}), true);
  assert.equal(C.canTouch({ x: 0, z: 0 }, { x: 8, z: 0 }, {}), false);
  assert.equal(C.canTouch({ x: 0, z: 0 }, { x: 1, z: 0 }, { wallBetween: true }), false);
  assert.equal(C.canTouch({ x: 0, z: 0 }, { x: 1, z: 0 }, { playerSheltered: true, mobSheltered: false }), false);
  assert.equal(C.canTouch({ x: 0, z: 0 }, { x: 1, z: 0 }, { playerSheltered: true, mobSheltered: true }), true);
});

test('contact hit respects invincible frames', () => {
  const first = C.applyContact({ hp: 10, lastHitAt: 0 }, { contact: 2 }, 1000);
  assert.equal(first.hit, true);
  assert.equal(first.hp, 8);
  const blocked = C.applyContact({ hp: first.hp, lastHitAt: first.lastHitAt }, { contact: 2 }, 1000 + C.INVINCIBLE_MS - 1);
  assert.equal(blocked.hit, false);
  assert.equal(blocked.hp, 8);
  const again = C.applyContact({ hp: first.hp, lastHitAt: first.lastHitAt }, { contact: 2 }, 1000 + C.INVINCIBLE_MS);
  assert.equal(again.hit, true);
  assert.equal(again.hp, 6);
});

await import('../prj/games/blocklegend/engine.js');
const E = globalThis.BlockLegendEngine;

test('terrain mesher emits unit cubes with grass/dirt/stone fill, not a paper-thin heightfield', () => {
  assert.equal(typeof E.collectChunkFaces, 'function');
  assert.equal(typeof E.hasBlock, 'function');
  const world = E.createWorld(7);
  const faces = E.collectChunkFaces(world, 0, 0);
  assert.ok(faces.length > 16 * 16, 'chunk should have more than just top skins');
  faces.forEach((f) => {
    const xs = f.corners.map((c) => c[0]);
    const ys = f.corners.map((c) => c[1]);
    const zs = f.corners.map((c) => c[2]);
    assert.ok(Math.max(...xs) - Math.min(...xs) <= 1);
    assert.ok(Math.max(...ys) - Math.min(...ys) <= 1);
    assert.ok(Math.max(...zs) - Math.min(...zs) <= 1);
  });
  assert.ok(E.WORLD_SIZE >= 80, 'playable map should be at least 80×80');
  assert.equal(E.WORLD_SIZE, 192);
  assert.equal(world.size, E.WORLD_SIZE);
  const species = new Set((world.trees || []).map((t) => t.species || 'oak'));
  assert.ok(species.size >= 2, 'trees should mix oak / birch / spruce');
  const dirtTint = E.blockColor('dirt', 3, 1, 3);
  assert.ok(dirtTint[0] > 0.72 && dirtTint[1] > 0.55, 'dirt under grass should be sandy, not chocolate');
  const luma = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  assert.ok(luma(E.blockColor('grass', 4, 2, 4)) > 0.62, 'grass should stay sunny');
  assert.ok(luma(E.blockColor('dirt', 4, 1, 4)) > 0.66, 'dirt should stay sandy');
  assert.ok(luma(E.blockColor('plank', 4, 2, 4)) > 0.62, 'planks should stay honey oak');
  assert.ok(luma(E.blockColor('log', 4, 3, 4, 'oak')) > 0.68, 'oak logs should not be chocolate');
  assert.ok(luma(E.blockColor('leaf', 4, 5, 4, 'oak')) > 0.68, 'oak leaves should stay spring green');
  const kinds = new Set(faces.map((f) => f.kind));
  assert.ok(kinds.has('grass') || kinds.has('sand') || kinds.has('snow') || kinds.has('stone'));
  assert.ok(kinds.has('dirt') || kinds.has('sand') || kinds.has('stone'));
  let tops = 0;
  let treesInChunk = 0;
  for (let z = 0; z < 16; z += 1) {
    for (let x = 0; x < 16; x += 1) {
      const h = world.surfaceAt(x, z);
      assert.equal(E.hasBlock(world, x, h - 1, z), true);
      const topKind = E.blockKindAt(world, x, h - 1, z);
      assert.ok(['grass', 'sand', 'snow', 'stone', 'water'].indexOf(topKind) >= 0);
      const tree = world.treeAt(x, z);
      if (tree) {
        treesInChunk += 1;
        assert.equal(E.voxelAt(world, x, h, z), 'log');
      } else {
        assert.equal(E.hasBlock(world, x, h, z), false);
      }
      const top = faces.find((f) => f.x === x && f.z === z && f.y === h - 1 && f.dir === '+y');
      if (top) tops += 1;
    }
  }
  assert.equal(tops, 16 * 16 - treesInChunk);
});

test('six climates make distinct Minecraft-like maps', () => {
  assert.equal(typeof E.biomeAt, 'function');
  const plains = E.createWorld(7, { climate: 'plains' });
  const forest = E.createWorld(21, { climate: 'forest' });
  const quarry = E.createWorld(33, { climate: 'quarry' });
  const astral = E.createWorld(71, { climate: 'astral' });
  assert.ok(forest.trees.length > quarry.trees.length, 'forest should be denser than quarry');
  const mid = Math.floor(plains.size / 2);
  assert.ok(['plains', 'forest', 'desert', 'mountain', 'snow'].indexOf(E.biomeAt(plains, mid, mid)) >= 0);
  let snow = 0;
  let sand = 0;
  let grass = 0;
  for (let i = 0; i < 80; i += 1) {
    const x = (i * 19) % plains.size;
    const z = (i * 23) % plains.size;
    const top = E.blockKindAt(plains, x, plains.surfaceAt(x, z) - 1, z);
    if (top === 'grass') grass += 1;
    const at = E.blockKindAt(astral, x, astral.surfaceAt(x, z) - 1, z);
    if (at === 'snow') snow += 1;
    const qt = E.blockKindAt(quarry, x, quarry.surfaceAt(x, z) - 1, z);
    if (qt === 'sand' || qt === 'stone') sand += 1;
  }
  assert.ok(grass >= 20, 'plains climate should still show grass');
  assert.ok(snow + sand >= 8, 'later climates should show snow / sand / stone');
  const climates = (globalThis.BlockLegendLevels.LEVELS || []).map((row) => row.climate);
  assert.ok(new Set(climates).size >= 5, 'each chapter should pick a different climate');
  const cherry = E.createWorld(21, { climate: 'cherry' });
  const desert = E.createWorld(33, { climate: 'desert' });
  const nether = E.createWorld(71, { climate: 'nether' });
  assert.ok(E.climateOf('cherry').sky !== E.climateOf('forest').sky);
  assert.ok(E.climateOf('nether').sky !== E.climateOf('astral').sky);
  assert.ok(cherry.trees.length > desert.trees.length);
  let desertSand = 0;
  for (let i = 0; i < 40; i += 1) {
    const x = (i * 17) % desert.size;
    const z = (i * 13) % desert.size;
    if (E.blockKindAt(desert, x, desert.surfaceAt(x, z) - 1, z) === 'sand') desertSand += 1;
  }
  assert.ok(desertSand >= 8, 'desert climate should show sand');
  assert.equal(nether.climate, 'nether');
  assert.ok(cherry.trees.length > 0 && cherry.trees.every((t) => t.species === 'cherry'), 'cherry jungle should grow cherry trees');
  assert.ok(desert.trees.some((t) => t.species === 'cactus'), 'desert should grow cacti');
  assert.ok(desert.trees.length >= 8, 'desert should still have cactus columns');
  assert.ok(nether.trees.some((t) => t.species === 'crimson'), 'nether should grow crimson fungi');
  assert.ok(nether.trees.length >= 8, 'nether should not be a bare stone field');
  assert.ok(E.tileIndex('leaf', '+y', 'cherry') !== E.tileIndex('leaf', '+y', 'oak'));
  assert.ok(E.tileIndex('log', '+x', 'cactus') !== E.tileIndex('log', '+x', 'oak'));
  assert.ok(E.tileIndex('sand', '+y') !== E.tileIndex('dirt'));
  assert.ok(E.tileIndex('grass', '+y', null, 'cherry') !== E.tileIndex('grass', '+y'));
  const cherryLeaf = E.blockColor('leaf', 4, 5, 4, 'cherry');
  assert.ok(cherryLeaf[0] > cherryLeaf[1], 'cherry leaves should stay pink');
});

test('plains map has caves, ores, water and a village', () => {
  const world = E.createWorld(7, { climate: 'plains' });
  assert.ok(world.hollow && Object.keys(world.hollow).length >= 20, 'caves should carve hollow cells');
  const mid = Math.floor(world.size / 2);
  let water = 0, coal = 0, iron = 0, plank = 0, hollowOpen = 0;
  for (let z = mid - 24; z <= mid + 24; z += 1) {
    for (let x = mid - 24; x <= mid + 24; x += 1) {
      const h = world.surfaceAt(x, z);
      if (E.blockKindAt(world, x, h - 1, z) === 'water') water += 1;
      if (E.blockKindAt(world, x, h - 1, z) === 'plank' || E.voxelAt(world, x, h, z) === 'plank') plank += 1;
      for (let y = 1; y < h - 1; y += 1) {
        const kind = E.voxelAt(world, x, y, z);
        if (kind === 'coal') coal += 1;
        if (kind === 'iron') iron += 1;
        if (!kind) hollowOpen += 1;
      }
    }
  }
  assert.ok(water >= 4, 'should have a pond');
  assert.ok(plank >= 8, 'village should stamp oak planks');
  assert.ok(coal + iron >= 3, 'stone should hide coal / iron');
  assert.ok(hollowOpen >= 8, 'caves should be walkable voids');
  assert.equal(E.tileIndex('water'), 14);
  assert.equal(E.tileIndex('coal'), 15);
  assert.ok(world.villagers && world.villagers.length >= 2, 'village should have villagers');
  assert.ok(world.beds && world.beds.length >= 1, 'houses should have beds');
  assert.ok(world.garden && world.garden.w >= 2, 'village should keep a garden plot');
  assert.ok(world.plants && world.plants.length >= 20, 'biomes should grow more than two flower cubes');
  assert.ok(world.animals && world.animals.length >= 4, 'plains should have passive animals');
  assert.ok(E.tileIndex('gold') !== E.tileIndex('iron'));
  assert.ok(E.tileIndex('diamond') !== E.tileIndex('gold'));
  const desertTown = E.createWorld(33, { climate: 'desert' });
  assert.ok(desertTown.houses && desertTown.houses.length >= 1, 'desert oasis should still have houses');
  assert.ok(desertTown.villagers && desertTown.villagers.length >= 1);
});

test('plains map stamps collectible word cubes from the level pool', () => {
  const words = [
    { id: 'red', text: 'red', zh: '红' },
    { id: 'blue', text: 'blue', zh: '蓝' },
    { id: 'cat', text: 'cat', zh: '猫' },
    { id: 'dog', text: 'dog', zh: '狗' },
    { id: 'sun', text: 'sun', zh: '太阳' },
    { id: 'book', text: 'book', zh: '书' }
  ];
  const world = E.createWorld(7, { climate: 'plains', words: words });
  assert.ok(world.wordCells);
  const keys = Object.keys(world.wordCells);
  assert.ok(keys.length >= 4, 'should plant several word cubes near spawn');
  keys.forEach((key) => {
    const p = key.split(',').map(Number);
    assert.equal(E.voxelAt(world, p[0], p[1], p[2]), 'word');
    assert.ok(world.wordCells[key].text);
  });
  assert.equal(E.tileIndex('word'), 7);
  assert.ok(world.wordGates && world.wordGates.length >= 2, 'Mario-style word gates should block paths');
  const gate = world.wordGates[0];
  assert.equal(E.voxelAt(world, gate.x, gate.y, gate.z), 'gate');
  assert.ok(gate.word && gate.word.text);
  assert.equal(E.openWordGate(world, gate), true);
  assert.equal(gate.open, true);
  assert.equal(E.voxelAt(world, gate.x, gate.y, gate.z), null);
});

test('cabin walls block bodies and house interiors keep monsters out', () => {
  const world = E.createWorld(7, { climate: 'plains' });
  assert.ok(Array.isArray(world.houses) && world.houses.length >= 1);
  const house = world.houses[0];
  const wallX = house.x + 0.5;
  const wallZ = house.z + 0.5;
  const wallY = world.surfaceAt(house.x, house.z);
  assert.equal(E.inHouse(world, house.x + 2, house.z + 2), true);
  assert.equal(E.inHouse(world, 4, 4), false);
  assert.equal(E.columnBlockedAt(world, wallX, wallZ, wallY), true, 'plank wall must stop a body');
  const inX = house.x + 2.5;
  const inZ = house.z + 2.5;
  const inY = world.surfaceAt(house.x + 2, house.z + 2);
  assert.equal(E.columnBlockedAt(world, inX, inZ, inY), false);
  const outX = house.x - 1.5;
  const outZ = house.z + 2.5;
  const outY = world.surfaceAt(house.x - 1, house.z + 2) + 1.2;
  const inEye = inY + 1.2;
  assert.equal(E.wallBetween(world, outX, outY, outZ, inX, inEye, inZ), true);
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(game, /inHouse\(/);
  assert.match(game, /canTouch\(/);
  assert.match(game, /wallBetween\(/);
});

test('atlas exports 18+ tiles and four distinct crack stages', () => {
  assert.ok(E.ATLAS_COLS >= 4);
  assert.ok(E.ATLAS_ROWS >= 5);
  assert.ok(E.ATLAS_COLS * E.ATLAS_ROWS >= 18, 'atlas must fit terrain + 4 crack tiles');
  const cracks = [0, 1, 2, 3].map((stage) => E.tileIndex('crack', stage));
  assert.deepEqual(new Set(cracks).size, 4);
  cracks.forEach((idx) => {
    assert.ok(idx >= 0 && idx < E.ATLAS_COLS * E.ATLAS_ROWS);
  });
  assert.equal(E.tileIndex('grass', '+y'), 0);
  assert.equal(E.tileIndex('dirt'), 2);
  assert.equal(E.tileIndex('log', '+x', 'oak'), 4);
  assert.equal(E.tileIndex('log', '+y', 'birch'), 9);
  assert.equal(E.tileIndex('leaf', '+y', 'spruce'), 13);
});

test('tree column cache keeps voxelAt stable across 200 samples', () => {
  const world = E.createWorld(7);
  assert.ok(world.treeCols);
  const tree = world.trees[0];
  assert.equal(E.voxelAt(world, tree.x, tree.surface, tree.z), 'log');
  const facesA = E.collectChunkFaces(world, 0, 0).length;
  const facesB = E.collectChunkFaces(world, 0, 0).length;
  assert.equal(facesA, facesB);
  for (let i = 0; i < 200; i += 1) {
    const x = (i * 17) % world.size;
    const z = (i * 29) % world.size;
    const y = i % 12;
    const a = E.voxelAt(world, x, y, z);
    const b = E.voxelAt(world, x, y, z);
    assert.equal(a, b);
  }
});

test('L-shaped dirt pair darkens the inner-corner face via AO', () => {
  assert.equal(E.faceShade('+x'), 0.6);
  assert.equal(E.faceShade('-y'), 0.5);
  assert.equal(E.faceShade('+y'), 1);
  const n = 16;
  const heights = new Uint8Array(n * n);
  for (let i = 0; i < heights.length; i += 1) heights[i] = 2;
  const world = {
    size: n,
    heights: heights,
    trees: [],
    treeCols: {},
    edits: {},
    surfaceAt: function (x, z) { return 2; },
    treeAt: function () { return null; }
  };
  E.placeVoxel(world, 3, 2, 3, 'dirt');
  E.placeVoxel(world, 4, 2, 4, 'dirt');
  const near = E.vertexAO(world, 3, 2, 3, '+z');
  E.placeVoxel(world, 10, 2, 10, 'dirt');
  const open = E.vertexAO(world, 10, 2, 10, '+z');
  assert.ok(Math.min.apply(null, near) < Math.min.apply(null, open), 'face beside a neighbor should AO-darken');
});

await import('../prj/games/blocklegend/data/tools.js');
const T = globalThis.BlockLegendTools;
await import('../prj/games/blocklegend/data/craft.js');
const CR = globalThis.BlockLegendCraft;

test('wood crafts into planks and four planks craft a table', () => {
  assert.equal(typeof CR, 'object');
  assert.equal(CR.craft({ 'oak-log': 1 }, 'plank').ok, true);
  assert.equal(CR.craft({ 'oak-log': 1 }, 'plank').bag.plank, 4);
  assert.equal(CR.craft({ 'oak-log': 1 }, 'plank').bag['oak-log'], 0);
  assert.equal(CR.craft({ plank: 3 }, 'table').ok, false);
  const table = CR.craft({ plank: 4 }, 'table');
  assert.equal(table.ok, true);
  assert.equal(table.bag.table, 1);
  assert.equal(table.bag.plank, 0);
  assert.equal(CR.craft({ plank: 3, stick: 2 }, 'wood_pick').ok, false);
  assert.equal(CR.craft({ plank: 3, stick: 2 }, 'wood_pick', { atTable: true }).ok, true);
  assert.equal(CR.craft({ plank: 2, stick: 1 }, 'wood_sword', { atTable: true }).bag.wood_sword, 1);
  assert.equal(CR.craft({ stick: 3, plank: 2 }, 'wood_bow', { atTable: true }).bag.wood_bow, 1);
  assert.equal(CR.craft({ plank: 6 }, 'wood_shield', { atTable: true }).bag.wood_shield, 1);
  assert.equal(CR.craft({ stick: 1, cobble: 1 }, 'arrow', { atTable: true }).bag.arrow, 4);
  assert.equal(CR.craft({ cobble: 2, stick: 1 }, 'iron_sword', { atTable: true }).ok, false);
  assert.ok(CR.toolBonus({ iron_sword: 1 }, 'sword').melee > CR.toolBonus({ wood_sword: 1 }, 'sword').melee);
  assert.equal(CR.craft({ plank: 1, stick: 2 }, 'wood_shovel', { atTable: true }).ok, true);
  assert.equal(CR.craft({ cobble: 8 }, 'furnace', { atTable: true }).ok, true);
  assert.equal(CR.matchGrid(['oak-log', null, null, null], 2).recipe.id, 'plank');
  assert.equal(CR.matchGrid(['plank', 'plank', 'plank', 'plank'], 2).recipe.id, 'table');
  assert.equal(CR.matchGrid(['plank', null, null, 'plank', null, null, 'stick', null, null], 3).recipe.id, 'wood_sword');
  assert.ok(CR.toolBonus({ wood_pick: 1 }, 'pickaxe').mine > 1);
  assert.ok(CR.toolBonus({ wood_sword: 1 }, 'sword').melee > 1);
  assert.ok(CR.toolBonus({ wood_bow: 1 }, 'sword').bolt > 1);
  assert.ok(CR.toolBonus({ wood_shield: 1 }, 'sword').def >= 1);
  assert.equal(T.placeKindOf('table'), 'table');
  assert.equal(T.dropOf('table'), 'table');
  const world = E.createWorld(7);
  const gx = 8, gz = 8;
  const airY = world.surfaceAt(gx, gz) + 5;
  const put = E.placeVoxel(world, gx, airY, gz, 'table');
  assert.equal(put.ok, true);
  assert.equal(E.voxelAt(world, gx, airY, gz), 'table');
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(html, /id="craft-layer"/);
  assert.match(html, /id="craft-grid"/);
  assert.match(html, /id="craft-out"/);
  assert.match(html, /id="craft-inv"/);
  assert.match(html, /data-place="table"/);
  assert.match(game, /e\.key === 'c'/);
  assert.match(game, /hit\.kind === 'table'/);
});

test('chunksAround returns clamped keys within view radius', () => {
  assert.equal(typeof E.chunksAround, 'function');
  const R = E.VIEW_CHUNKS;
  const mid = E.chunksAround(64.5, 64.5, 128, 16, R);
  assert.ok(mid.length <= (2 * R + 1) * (2 * R + 1));
  assert.ok(mid.indexOf('64,64') >= 0);
  const edge = E.chunksAround(0.5, 0.5, 128, 16, R);
  assert.ok(edge.indexOf('0,0') >= 0);
  edge.forEach((key) => {
    const parts = key.split(',');
    const cx = Number(parts[0]), cz = Number(parts[1]);
    assert.ok(cx >= 0 && cz >= 0 && cx < 128 && cz < 128);
    assert.equal(cx % 16, 0);
    assert.equal(cz % 16, 0);
  });
  const corner = E.chunksAround(127.2, 127.2, 128, 16, R);
  assert.ok(corner.indexOf('112,112') >= 0);
});

test('tools table: sword/axe/pickaxe/shovel have distinct mine and melee roles', () => {
  assert.equal(typeof T, 'object');
  assert.deepEqual(T.SLOT_IDS, ['sword', 'axe', 'pickaxe', 'shovel']);
  assert.ok(T.breakMs('axe', 'log') < T.breakMs('sword', 'log'));
  assert.ok(T.breakMs('pickaxe', 'stone') < T.breakMs('axe', 'stone'));
  assert.ok(T.breakMs('shovel', 'dirt') < T.breakMs('pickaxe', 'dirt'));
  assert.ok(T.meleeScale('sword') > T.meleeScale('axe'));
  assert.equal(T.dropOf('log'), 'oak-log');
  assert.equal(T.dropOf('stone'), 'cobble');
  assert.equal(T.dropOf('plank'), 'plank');
  assert.equal(T.dropOf('dirt'), 'dirt');
  assert.equal(T.placeKindOf('dirt'), 'dirt');
  assert.equal(T.placeKindOf('plank'), 'plank');
  assert.equal(T.placeKindOf('oak-log'), 'log');
  assert.equal(T.placeKindOf('cobble'), 'stone');
  assert.equal(T.lootOfPlace('plank'), 'plank');
  assert.equal(T.lookDir(0, 0).z < 0, true);
});

test('voxel ray hits the first solid cell along the look ray', () => {
  const sample = function (x, y, z) {
    if (x === 5 && y === 4 && z === 2) return 'log';
    return null;
  };
  const miss = T.voxelRay({ x: 0.5, y: 4.5, z: 8.5 }, { x: 0, y: 0, z: -1 }, 3, sample);
  assert.equal(miss.hit, false);
  const hit = T.voxelRay({ x: 5.4, y: 4.4, z: 8.5 }, { x: 0, y: 0, z: -1 }, 8, sample);
  assert.equal(hit.hit, true);
  assert.equal(hit.kind, 'log');
  assert.equal(hit.x, 5);
  assert.equal(hit.z, 2);
});

test('chopping a tree and mining a block clear voxels and drop the right item', () => {
  const world = E.createWorld(7);
  const tree = world.trees[0];
  assert.ok(tree);
  assert.equal(E.voxelAt(world, tree.x, tree.surface, tree.z), 'log');
  const chopped = E.breakVoxel(world, tree.x, tree.surface, tree.z);
  assert.equal(chopped.ok, true);
  assert.equal(chopped.drop, 'oak-log');
  assert.equal(E.voxelAt(world, tree.x, tree.surface, tree.z), null);
  assert.equal(E.voxelAt(world, tree.x, tree.surface + 1, tree.z), 'log');
  assert.ok(world.treeAt(tree.x, tree.z));
  const gx = 8, gz = 8;
  const gy = world.surfaceAt(gx, gz) - 1;
  const kind = E.voxelAt(world, gx, gy, gz);
  assert.ok(kind);
  const broke = E.breakVoxel(world, gx, gy, gz);
  assert.equal(broke.ok, true);
  assert.equal(broke.kind, kind);
  assert.equal(broke.drop, T.dropOf(kind));
  assert.equal(E.voxelAt(world, gx, gy, gz), null);
  assert.equal(E.breakVoxel(world, gx, 0, gz).ok, false);
  const py = world.surfaceAt(gx, gz);
  const put = E.placeVoxel(world, gx, py, gz, 'dirt');
  assert.equal(put.ok, true);
  assert.equal(E.voxelAt(world, gx, py, gz), 'dirt');
  assert.equal(E.placeVoxel(world, gx, 0, gz, 'dirt').ok, false);
  assert.equal(E.placeVoxel(world, gx, py, gz, 'dirt').ok, false);
  const airY = world.surfaceAt(gx, gz) + 4;
  assert.equal(E.voxelAt(world, gx, airY, gz), null);
  const plankPut = E.placeVoxel(world, gx, airY, gz, 'plank');
  assert.equal(plankPut.ok, true);
  assert.equal(E.voxelAt(world, gx, airY, gz), 'plank');
});

await import('../prj/games/blocklegend/data/shop.js');
const S = globalThis.BlockLegendShop;

test('shop sells four cheap items, writes gear, and defense floors contact at 1', () => {
  assert.equal(typeof S, 'object');
  assert.equal(S.ITEMS.length, 4);
  assert.equal(S.buy({ coined: 0, gear: {} }, 'leather-cap').ok, false);
  const cap = S.buy({ coined: 20, gear: {} }, 'leather-cap');
  assert.equal(cap.ok, true);
  assert.equal(cap.coined, 0);
  assert.equal(cap.gear.helm, 'leather-cap');
  assert.equal(S.statsOf(cap.gear).def, 2);
  assert.equal(S.mitigate(2, 2), 1);
  assert.equal(S.mitigate(2, 5), 1);
  const pot = S.buy({ coined: 12, gear: {} }, 'hp-potion');
  assert.equal(pot.ok, true);
  assert.equal(pot.heal, 8);
  assert.deepEqual(pot.gear, {});
});

function addDays(date, days) {
  const stamp = new Date(String(date) + 'T12:00:00');
  stamp.setDate(stamp.getDate() + Math.max(0, Number(days) || 0));
  return stamp.getFullYear() + '-' + String(stamp.getMonth() + 1).padStart(2, '0') + '-' + String(stamp.getDate()).padStart(2, '0');
}

function loadBridgeBox(opts) {
  const store = {};
  const box = {
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setItem(key, value) { store[key] = String(value); },
      removeItem(key) { delete store[key]; }
    },
    console: { warn() {}, log() {} }
  };
  box.window = box;
  box.globalThis = box;
  const files = [];
  if (!opts || opts.withEngines !== false) {
    files.push(path.join(repoRoot, 'prj', 'preschool-english-vocab.js'));
    files.push(path.join(repoRoot, 'prj', 'child-courses.js'));
  }
  files.push(path.join(repoRoot, 'prj', 'games', 'shared', 'workbench-bridge.js'));
  files.forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), box));
  if (opts && opts.seed) {
    box.localStorage.setItem(box.WorkbenchGameBridge.STORAGE_KEY, JSON.stringify(opts.seed));
  }
  return { box, store, bridge: box.WorkbenchGameBridge };
}

function masteryOf(bridge, word) {
  const state = bridge.readState();
  const mastery = state.courseProgress && state.courseProgress.minecraft && state.courseProgress.minecraft.mastery;
  return mastery ? mastery[String(word).toLowerCase()] : undefined;
}

test('recordWordAnswer marks a correct word ready and schedules +3 day review', () => {
  const { bridge } = loadBridgeBox();
  assert.equal(typeof bridge.recordWordAnswer, 'function');
  const item = bridge.recordWordAnswer('Creeper', true);
  assert.ok(item);
  assert.equal(item.attempts, 1);
  assert.equal(item.correct, 1);
  assert.equal(item.state, 'ready');
  assert.equal(item.nextReview, addDays(bridge.today(), 3));
  const stored = masteryOf(bridge, 'creeper');
  assert.equal(stored.state, 'ready');
  assert.equal(stored.attempts, 1);
  assert.equal(stored.correct, 1);
  assert.equal(stored.dates.length, 1);
  assert.equal(stored.dates[0], bridge.today());
});

test('recordWordAnswer same-day repeat increments attempts but not dates', () => {
  const { bridge } = loadBridgeBox();
  bridge.recordWordAnswer('Creeper', true);
  const again = bridge.recordWordAnswer('Creeper', true);
  assert.equal(again.attempts, 2);
  assert.equal(again.correct, 2);
  assert.equal(again.dates.length, 1);
  assert.equal(again.dates[0], bridge.today());
});

test('recordWordAnswer wrong answer stays practicing with +1 day review', () => {
  const { bridge } = loadBridgeBox();
  const item = bridge.recordWordAnswer('zombie', false);
  assert.equal(item.state, 'practicing');
  assert.equal(item.attempts, 1);
  assert.equal(item.correct, 0);
  assert.equal(item.nextReview, addDays(bridge.today(), 1));
});

test('recordWordAnswer never awards sunlight', () => {
  const { bridge } = loadBridgeBox({
    seed: {
      growth: { sunlight: 40, totalSunlightEarned: 40, awardedIds: [], worldGames: { meta: {} } },
      courseProgress: { completedLessonIds: [] }
    }
  });
  const before = bridge.readState();
  bridge.recordWordAnswer('Creeper', true);
  const after = bridge.readState();
  assert.equal(after.growth.sunlight, before.growth.sunlight);
  assert.equal(after.growth.totalSunlightEarned, before.growth.totalSunlightEarned);
  assert.deepEqual(after.growth.awardedIds || [], before.growth.awardedIds || []);
});

test('recordWordAnswer is a no-op when vocab engines are missing', () => {
  const { bridge, store } = loadBridgeBox({ withEngines: false });
  const keysBefore = Object.keys(store);
  let threw = false;
  let result;
  try {
    result = bridge.recordWordAnswer('Creeper', true);
  } catch (err) {
    threw = true;
  }
  assert.equal(threw, false);
  assert.equal(result, null);
  assert.deepEqual(Object.keys(store), keysBefore);
});

test('recordWordAnswer bootstraps missing minecraft field on old snapshots', () => {
  const { bridge } = loadBridgeBox({
    seed: {
      growth: { sunlight: 10, totalSunlightEarned: 10, awardedIds: [] },
      courseProgress: { completedLessonIds: ['preschool-chinese-1'] }
    }
  });
  const item = bridge.recordWordAnswer('oak', true);
  assert.equal(item.state, 'ready');
  const state = bridge.readState();
  assert.ok(state.courseProgress.minecraft);
  assert.ok(state.courseProgress.minecraft.mastery.oak);
  assert.equal(state.courseProgress.completedLessonIds.length, 1);
  assert.equal(state.courseProgress.completedLessonIds[0], 'preschool-chinese-1');
});

test('game.js mounts crack overlay while mining and clears it on stop', () => {
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(game, /function ensureCrack/);
  assert.match(game, /function hideCrack/);
  assert.match(game, /tileIndex\(\s*['"]crack['"]/);
  assert.match(game, /polygonOffset/);
  assert.match(game, /spawnBurst\([\s\S]{0,80}2/);
  assert.match(game, /aimAction\(/);
  assert.match(game, /collectWordBlock\(/);
  assert.match(game, /shouldAutoSpeak\(/);
  assert.match(game, /speechSynthesis\.cancel/);
});

await import('../prj/games/blocklegend/data/skins.js');
const SK = globalThis.BlockLegendSkins;

test('minecraft-style skins are original 64x64 pixel sheets, not solid colors', () => {
  assert.equal(typeof SK, 'object');
  assert.equal(typeof SK.createSkinImage, 'function');
  const slime = SK.createSkinImage('slime');
  const warden = SK.createSkinImage('warden');
  const blaze = SK.createSkinImage('blaze');
  assert.equal(slime.length, 64 * 64 * 4);
  assert.equal(warden.length, 64 * 64 * 4);
  let painted = 0;
  let diff = 0;
  for (let i = 0; i < slime.length; i += 4) {
    if (slime[i + 3] > 0) painted += 1;
    if (slime[i] !== warden[i] || slime[i + 1] !== warden[i + 1] || slime[i + 2] !== warden[i + 2]) diff += 1;
  }
  assert.ok(painted >= 64 * 8, 'skin should paint visible texels');
  assert.ok(diff >= 80, 'each mob kind needs its own palette');
  assert.ok(SK.kinds.indexOf('blaze') >= 0 && SK.kinds.indexOf('ghast') >= 0 && SK.kinds.indexOf('warden') >= 0);
  ['skeleton', 'spider', 'enderman', 'piglin', 'witch', 'wither', 'chest', 'furnace'].forEach((k) => {
    assert.ok(SK.kinds.indexOf(k) >= 0, k);
    const img = SK.createSkinImage(k);
    const face = SK.facePixels(img, k === 'spider' ? 20 : 8, k === 'spider' ? 20 : 8, 8, 8);
    const colors = new Set(face.map((p) => p.join(',')));
    assert.ok(colors.size >= 3, k + ' face should be a pixel sheet, not one fill');
  });
  const skel = SK.createSkinImage('skeleton');
  const ender = SK.createSkinImage('enderman');
  let kindDiff = 0;
  for (let i = 0; i < skel.length; i += 4) {
    if (skel[i] !== ender[i] || skel[i + 1] !== ender[i + 1] || skel[i + 2] !== ender[i + 2]) kindDiff += 1;
  }
  assert.ok(kindDiff >= 80, 'skeleton and enderman need distinct palettes');
  const front = SK.facePixels(blaze, 8, 8, 8, 8);
  const uniq = new Set(front.map((p) => p.join(',')));
  assert.ok(uniq.size >= 3, 'head front should be a pixel face, not one fill');
  const mobs = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'mobs.js'), 'utf8');
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  assert.match(mobs, /function mapMcBox/);
  assert.match(mobs, /NearestFilter/);
  assert.match(mobs, /skinTexture\(/);
  assert.match(html, /data\/skins\.js/);
  assert.match(html, /voxelPix\.js/);
  assert.match(html, /createCreeperModel\.js/);
});

function lum(p) {
  return p[0] + p[1] + p[2];
}

test('skeleton face has two hollow sockets with a bone bridge, not a black bar', () => {
  const face = SK.facePixels(SK.createSkinImage('skeleton'), 8, 8, 8, 8);
  const left = lum(face[2 * 8 + 1]);
  const mid = lum(face[2 * 8 + 3]);
  const right = lum(face[2 * 8 + 5]);
  assert.ok(left < 90 && right < 90, 'sockets should be dark cavities');
  assert.ok(mid > 380, 'bone should show between the two sockets');
});

test('wither face is a black skull with white eyes, not a gold band', () => {
  const face = SK.facePixels(SK.createSkinImage('wither'), 8, 8, 8, 8);
  let dark = 0;
  let white = 0;
  let gold = 0;
  face.forEach((p) => {
    if (p[0] > 180 && p[1] > 140 && p[2] < 110) gold += 1;
    if (lum(p) < 90) dark += 1;
    if (p[0] > 200 && p[1] > 200 && p[2] > 200) white += 1;
  });
  assert.equal(gold, 0, 'wither should not wear a gold stripe');
  assert.ok(dark >= 20, 'wither skull is mostly black');
  assert.ok(white >= 4, 'wither eyes/mouth are white');
});

test('review roster page and bat list animals plus extra bosses', () => {
  const review = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'review-roster.html'), 'utf8');
  const bat = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', '打开角色审查.bat'), 'utf8');
  ['pig', 'cow', 'sheep', 'chicken', 'wolf', 'villager', 'dragon', 'storm', 'wither', 'skeleton'].forEach((id) => {
    assert.match(review, new RegExp("id: '" + id + "'"));
  });
  assert.match(review, /review-grid/);
  assert.match(bat, /review-roster\.html/);
  ['pig', 'cow', 'sheep', 'chicken', 'wolf', 'villager', 'dragon', 'storm'].forEach((k) => {
    assert.ok(SK.kinds.indexOf(k) >= 0, k);
  });
  const torch = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'assets', 'img2threejs', 'createProps3d.js'), 'utf8');
  assert.match(torch, /flame/);
  assert.match(torch, /userData\.tick/);
});

test('roster rebuild: golem nose, wither necks, slime factory, wood/iron/diamond tools', () => {
  const golem = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'assets', 'img2threejs', 'createGolemModel.js'), 'utf8');
  assert.match(golem, /nose/);
  assert.match(golem, /brow/);
  const wither = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'assets', 'img2threejs', 'createWitherModel.js'), 'utf8');
  assert.match(wither, /neck/);
  const storm = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'assets', 'img2threejs', 'createStormModel.js'), 'utf8');
  assert.match(storm, /purple|0xb450ff|mandible/);
  const tools = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'assets', 'img2threejs', 'createTools3d.js'), 'utf8');
  assert.match(tools, /createDiamondSword/);
  assert.match(tools, /createIronAxe/);
  assert.match(tools, /createWoodPickaxe|createWoodenPickaxe|createPickaxeOf/);
  assert.ok(fs.existsSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'assets', 'img2threejs', 'createSlimeModel.js')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'assets', 'img2threejs', 'createFoxModel.js')));
  ['golem', 'animals', 'cubes-fox', 'bosses', 'tools'].forEach((id) => {
    assert.ok(fs.existsSync(path.join(repoRoot, 'prj', 'assets', 'generated', 'blocklegend-roster', 'raw', id + '.png')), id);
  });
});

test('first-person tools are parented to the arm, not floating boxes', () => {
  const mobs = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'mobs.js'), 'utf8');
  assert.match(mobs, /camera-space tools/);
  assert.match(mobs, /function heldSword/);
  assert.match(mobs, /function heldAxe/);
  assert.match(mobs, /function heldPickaxe/);
  assert.match(mobs, /function heldShovel/);
  assert.match(mobs, /tools\.place/);
  const factory = path.join(repoRoot, 'prj', 'games', 'blocklegend', 'assets', 'img2threejs', 'createTools3d.js');
  if (fs.existsSync(factory)) {
    const src = fs.readFileSync(factory, 'utf8');
    assert.match(src, /createShovel/);
    assert.match(src, /createBow/);
    assert.match(src, /createArrow/);
    assert.match(src, /woodTex/);
    assert.match(src, /rotation\.z = 0\.38/);
  }
  const refs = ['sword', 'axe', 'pickaxe', 'bow', 'arrow', 'shovel'].map((id) =>
    path.join(repoRoot, 'prj', 'assets', 'generated', 'blocklegend-tools', 'raw', id + '.png')
  );
  refs.forEach((p) => assert.ok(fs.existsSync(p), p));
});

test('levels carry biome wave rosters and a wither-style boss', () => {
  assert.equal(L.LEVELS.length, 6);
  L.LEVELS.forEach((row) => {
    assert.ok(Array.isArray(row.waveKinds) && row.waveKinds.length >= 3);
    row.waveKinds.forEach((k) => assert.ok(C.MONSTERS[k], k));
    assert.ok(row.bossId);
  });
  assert.equal(L.LEVELS[0].bossId, 'wither');
  assert.ok(C.MONSTERS.blaze && C.MONSTERS.ghast && C.MONSTERS.warden);
  assert.ok(C.MONSTERS.creeper && C.MONSTERS.zombie && C.MONSTERS.skeleton && C.MONSTERS.spider);
  assert.ok(C.MONSTERS.enderman && C.MONSTERS.piglin && C.MONSTERS.witch);
  assert.ok(C.MONSTERS.golem);
  const mobs = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'mobs.js'), 'utf8');
  assert.match(mobs, /kind === 'blaze'/);
  assert.match(mobs, /kind === 'ghast'/);
  assert.match(mobs, /kind === 'warden'/);
  assert.match(mobs, /kind === 'creeper'/);
  assert.match(mobs, /kind === 'zombie'/);
  assert.match(mobs, /kind === 'skeleton'/);
  assert.match(mobs, /kind === 'spider'/);
  assert.match(mobs, /kind === 'enderman'/);
  assert.match(mobs, /kind === 'piglin'/);
  assert.match(mobs, /kind === 'witch'/);
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(html, /createCreeperModel\.js/);
  assert.match(html, /createZombieModel\.js/);
  assert.match(html, /createSkeletonModel\.js/);
  assert.match(html, /createSpiderModel\.js/);
  assert.match(html, /createEndermanModel\.js/);
  assert.match(html, /createPiglinModel\.js/);
  assert.match(html, /createWitchModel\.js/);
  assert.match(html, /createWitherModel\.js/);
  assert.match(html, /createTools3d\.js/);
  assert.match(html, /createProps3d\.js/);
  assert.match(html, /id="boss-shield"/);
  assert.match(game, /bossHits/);
  assert.match(game, /aimPoint\(/);
  assert.match(game, /mob\.hp = session\.boss\.hp/);
  assert.match(mobs, /wither-head/);
});

test('right click places collected dirt/plank/log; Q keeps the bolt', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  const engine = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'engine.js'), 'utf8');
  assert.match(html, /data-place="plank"/);
  assert.match(html, /右键放方块/);
  assert.match(game, /if \(e\.button === 2\)[\s\S]{0,400}tryPlace\(\)/);
  assert.match(game, /tryInteract\(\)/);
  assert.match(game, /e\.key === 'q'[\s\S]{0,80}tryBolt\(\)/);
  assert.match(game, /function paintBagCounts/);
  assert.match(game, /addLoot\(session\.bag, result\.drop, 1\)/);
  assert.match(engine, /allowed = \{ dirt: true, stone: true, log: true, plank: true, table: true \}/);
});

test('minecraft-like hud has 9 hotbar slots and a heart row', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.css'), 'utf8');
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.equal((html.match(/class="bl-slot/g) || []).length, 9);
  assert.match(html, /id="hearts"/);
  assert.match(css, /\.bl-heart/);
  assert.match(css, /\.bl-mc-hud/);
  assert.match(game, /function paintHearts/);
  assert.match(game, /e\.key >= '1' && e\.key <= '9'/);
});

test('quiz overlay releases look capture and accepts 1-4 keys', () => {
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  const engine = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'engine.js'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.css'), 'utf8');
  assert.match(engine, /function setUiMode/);
  assert.match(engine, /exitPointerLock/);
  assert.match(engine, /function resumeLook/);
  assert.match(game, /setUiMode\(/);
  assert.match(game, /resumeLook\(/);
  assert.match(game, /pickQuizChoice/);
  assert.match(game, /shouldAsk\(\{[\s\S]{0,180}firstHit: !mob\.asked/);
  assert.match(game, /askedCount:/);
  assert.match(css, /\.bl-quiz-layer[\s\S]{0,180}pointer-events:\s*auto/);
});

test('blocklegend page loads mastery engines and game.js writes answers back', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(html, /preschool-english-vocab\.js\?v=/);
  assert.match(html, /child-courses\.js\?v=/);
  assert.match(game, /recordWordAnswer\(word\.text,\s*correct\)/);
});

test('blocklegend back link uses blocklegend theme, not voxel-adventure', () => {
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(game, /backHref\('blocklegend'\)/);
  assert.doesNotMatch(game, /backHref\('voxel-adventure'\)/);
});

test('food pips paint combo instead of a frozen full row', () => {
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(game, /function paintFood/);
  assert.match(game, /session\.combo/);
  assert.doesNotMatch(game, /if \(box\.childElementCount === 10\) return;/);
});

test('hud has mp fill nodes that syncHud already writes', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  assert.match(html, /id="mp-fill"/);
  assert.match(html, /id="mp-num"/);
});

test('iron tools need iron_ingot; ore smelts with coal', () => {
  assert.equal(CR.craft({ cobble: 2, stick: 1 }, 'iron_sword', { atTable: true }).ok, false);
  assert.equal(CR.craft({ iron_ingot: 2, stick: 1 }, 'iron_sword', { atTable: true }).ok, true);
  assert.equal(CR.craft({ iron_ingot: 3, stick: 2 }, 'iron_pick', { atTable: true }).ok, true);
  assert.equal(CR.craft({ iron_ingot: 3, stick: 2 }, 'iron_axe', { atTable: true }).ok, true);
  assert.equal(typeof CR.smelt, 'function');
  const smelted = CR.smelt({ iron_ore: 1, coal: 1 }, 'iron_ingot');
  assert.equal(smelted.ok, true);
  assert.equal(smelted.bag.iron_ingot, 1);
  assert.equal(T.dropOf('iron'), 'iron_ore');
  assert.equal(T.dropOf('coal'), 'coal');
});

test('blocklegend default progress includes empty gear', () => {
  const { bridge } = loadBridgeBox({ withEngines: false });
  const fresh = bridge.defaultProgress('blocklegend');
  assert.ok(fresh.gear && typeof fresh.gear === 'object');
});

await import('../prj/games/blocklegend/data/quests.js');
const Q = globalThis.BlockLegendQuests;

test('level 1 quest starts at look-tree and advances one event at a time', () => {
  const q = Q.create(1);
  assert.equal(Q.current(q).id, 'look-tree');
  assert.match(Q.current(q).title, /树|tree/i);
  const afterLook = Q.apply(q, { type: 'look', kind: 'log' });
  assert.equal(Q.current(afterLook).id, 'make-sword');
  const afterCraft = Q.apply(afterLook, { type: 'craft', id: 'wood_sword' });
  assert.equal(Q.current(afterCraft).id, 'hit-slime');
  const afterKill = Q.apply(afterCraft, { type: 'kill', kind: 'slime', quizCorrect: true });
  assert.equal(Q.current(afterKill).id, 'learn-five');
  const afterWords = Q.apply(afterKill, { type: 'word-correct', count: 5 });
  assert.equal(Q.current(afterWords).id, 'break-boss');
  const done = Q.apply(afterWords, { type: 'boss-shield-break' });
  assert.equal(done.complete, true);
});

test('hud copies reference look plaque, learn panel, and side bars', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.css'), 'utf8');
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(html, /词汇学习/);
  assert.match(html, /id="look-img"/);
  assert.match(html, /id="look-hp"/);
  assert.match(html, /id="stat-bank"/);
  assert.match(html, /id="hp-fill"/);
  assert.match(html, /id="learn-panel"/);
  assert.doesNotMatch(html, /id="stat-bank" hidden/);
  assert.match(css, /\.bl-look-card[\s\S]{0,220}top:\s*7%/);
  assert.match(css, /\.bl-learn/);
  assert.match(game, /look-img/);
  assert.match(game, /hp-fill/);
  assert.match(game, /hideLookTip/);
});

test('default hud shows a single quest goal node', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  assert.match(html, /id="quest-goal"/);
  assert.match(html, /id="quest-hint"/);
  assert.match(html, /data\/quests\.js/);
});

test('wrong quiz answer offers one free retry and does not mark mastery yet', () => {
  const quiz = W.makeQuiz({ text: 'tree', zh: '树', id: 'tree' }, []);
  const first = W.resolveAttempt(quiz, '花');
  assert.equal(first.correct, false);
  assert.equal(first.retry, true);
  assert.equal(first.record, false);
  assert.equal(first.reveal, '树');
  const secondWrong = W.resolveAttempt(quiz, '花', { retried: true });
  assert.equal(secondWrong.retry, false);
  assert.equal(secondWrong.record, true);
  assert.equal(secondWrong.correct, false);
  const recovered = W.resolveAttempt(quiz, '树', { retried: true });
  assert.equal(recovered.correct, true);
  assert.equal(recovered.crit, true);
  assert.equal(recovered.comboKeep, false);
});

test('playtest roster wires every combat kind, animal ticks, trader, and placeable props', () => {
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  const engine = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'engine.js'), 'utf8');
  const props = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'assets', 'img2threejs', 'createProps3d.js'), 'utf8');
  const mobs = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'mobs.js'), 'utf8');
  const words = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'data', 'words.js'), 'utf8');
  assert.match(game, /function spawnPlaytestRoster/);
  assert.match(game, /playtest=1/);
  assert.match(game, /C\.MONSTER_KINDS\.forEach/);
  assert.match(game, /bossId: bossId/);
  assert.match(game, /m\.parked/);
  assert.match(game, /function tryInteract/);
  assert.match(game, /setToolTiers/);
  assert.match(engine, /createTrader/);
  assert.match(engine, /placeProp:/);
  assert.match(engine, /placedProps/);
  assert.match(engine, /userData\.tick/);
  assert.match(props, /function attachWalk/);
  assert.match(props, /userData\.toggle/);
  assert.match(mobs, /createTrader/);
  assert.match(mobs, /createDiamondSword/);
  assert.match(mobs, /createIronAxe/);
  assert.match(words, /wolf: '狼'/);
  assert.match(words, /dragon: '末影龙'/);
  assert.equal(T.placeKindOf('chest'), 'chest');
  assert.equal(T.placeKindOf('furnace'), 'furnace');
  assert.equal(T.placeKindOf('torch'), 'torch');
  assert.deepEqual(T.SLOT_IDS, ['sword', 'axe', 'pickaxe', 'shovel']);
  assert.equal(C.MONSTER_KINDS.length, 16);
  const bat = path.join(repoRoot, 'prj', 'games', 'blocklegend', '打开审查场.bat');
  assert.ok(fs.existsSync(bat));
  assert.match(fs.readFileSync(bat, 'utf8'), /playtest=1/);
});

test('level 1 focuses five world words, not a 100-word exam pool', () => {
  const focused = W.focusPool(bank, 1, { size: 5, prefer: ['tree', 'dirt', 'sword', 'slime', 'apple'] });
  assert.equal(focused.length, 5);
  focused.forEach((w) => assert.ok(w.text && w.zh));
});

test('word cube break opens a quiz instead of auto-mastering', () => {
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(game, /wordBlock/);
  assert.match(game, /commitWordBlock/);
  assert.doesNotMatch(game, /hit\.kind === 'word'[\s\S]{0,500}recordWordAnswer\(cell\.text,\s*true\)/);
});

test('boss hud shows learn-phase names', () => {
  assert.equal(typeof L.bossPhase, 'function');
  assert.equal(L.bossPhase({ state: 'shielded', shield: 3, shieldMax: 3 }), '识别');
  assert.equal(L.bossPhase({ state: 'shielded', shield: 1, shieldMax: 3 }), '回忆');
  assert.equal(L.bossPhase({ state: 'broken', shield: 0, shieldMax: 3 }), '破罩输出');
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  assert.match(html, /id="boss-phase"/);
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(game, /bossPhase\(/);
});

test('settlement copy names new words, review list, and sunlight destination', () => {
  const lines = L.buildSettlement({
    level: 1,
    sunAwarded: 8,
    sunCapped: false,
    newWords: 3,
    reviewWords: ['fox', 'behind']
  });
  assert.match(lines.gain, /3/);
  assert.match(lines.gain, /阳光/);
  assert.match(lines.progressLabel, /fox/);
  assert.match(lines.nextGoal, /金币|关/);
  const capped = L.buildSettlement({ level: 6, sunAwarded: 0, sunCapped: true, newWords: 1, reviewWords: [] });
  assert.match(capped.gain, /上限|保存/);
});

await import('../prj/games/blocklegend/data/speech-input.js');
const Speech = globalThis.BlockLegendSpeech;

test('speech matcher accepts close child pronunciations and five failure kinds', () => {
  assert.equal(Speech.matchHeard('tree', 'tree').ok, true);
  assert.equal(Speech.matchHeard('tree', 'tre').ok, true);
  assert.equal(Speech.matchHeard('tree', 'flower').ok, false);
  ['no-permission', 'unsupported', 'timeout', 'noise', 'mismatch'].forEach((k) => {
    assert.equal(Speech.fail(k).kind, k);
  });
  assert.equal(Speech.canSpeak(), false);
});

test('channel multiplier does not change legacy critMultiplier defaults', () => {
  assert.equal(C.CRIT_MULT, 3);
  assert.equal(C.critMultiplier({ answered: true, correct: true, combo: 0 }), 3);
  assert.equal(C.critMultiplier({ answered: true, correct: true, combo: 3 }), 4);
  assert.equal(C.channelMultiplier(), 1);
  assert.equal(C.channelMultiplier('choice'), 2);
  assert.equal(C.channelMultiplier('spell'), 3);
  assert.equal(C.channelMultiplier('speak'), 3);
  assert.equal(C.channelMultiplier('combo'), 4);
});

test('masteryStage maps workbench records into new/familiar/recall/spoken/mastered/due', () => {
  assert.equal(W.masteryStage(null), 'new');
  assert.equal(W.masteryStage({}), 'new');
  assert.equal(W.masteryStage({ correct: 1 }), 'familiar');
  assert.equal(W.masteryStage({ correct: 2 }), 'recall');
  assert.equal(W.masteryStage({ correct: 1, quiz: { spell: { correct: 2 } } }), 'recall');
  assert.equal(W.masteryStage({ correct: 1, spoken: 1 }), 'spoken');
  assert.equal(W.masteryStage({
    correct: 3,
    spoken: 1,
    dates: ['2026-08-10', '2026-08-12', '2026-08-14'],
    quiz: { spell: { correct: 1 }, listen: { correct: 1 } }
  }, '2026-08-16'), 'mastered');
  assert.equal(W.masteryStage({
    correct: 2,
    nextReview: '2026-08-15',
    state: 'ready'
  }, '2026-08-16'), 'due');
  assert.equal(W.countFamiliar(['tree', 'dirt'], { tree: { correct: 1 } }), 2);
  assert.notEqual(W.masteryStage({ correct: 1 }), 'mastered');
});

test('quiz card keeps mic hidden unless speech is available', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  assert.match(html, /id="quiz-mic"/);
  assert.match(html, /data\/speech-input\.js/);
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(game, /function listenOnce/);
  assert.match(game, /channelMultiplier/);
  assert.match(game, /countFamiliar/);
});

test('boss can type-cast without a miss streak; regular mobs still need hard mode', () => {
  const word = { text: 'tree', zh: '树', id: 'tree' };
  assert.equal(W.canTypeCast({ boss: true, missStreak: 0, word: word }), true);
  assert.equal(W.canTypeCast({ boss: false, missStreak: 0, word: word }), false);
  assert.equal(W.canTypeCast({ boss: false, missStreak: 3, word: word }), true);
  const choice = W.makeQuiz(word, [word, { text: 'dirt', zh: '泥土' }], { mode: 'choice' });
  assert.equal(W.checkQuiz(choice, 'tree'), true);
  assert.equal(W.channelOf(choice, 'tree'), 'spell');
  assert.equal(W.channelOf(choice, word.zh), 'choice');
});

test('unread speak count rises on shown words and falls after speaking', () => {
  let shown = [];
  let spoken = [];
  shown = W.noteId(shown, 'pack');
  shown = W.noteId(shown, 'rise');
  shown = W.noteId(shown, 'pack');
  assert.equal(W.unreadSpeakCount(shown, spoken), 2);
  spoken = W.noteId(spoken, 'pack');
  assert.equal(W.unreadSpeakCount(shown, spoken), 1);
  spoken = W.noteId(spoken, 'rise');
  assert.equal(W.unreadSpeakCount(shown, spoken), 0);
});

test('speak or spell chips the remaining boss shield; choice chips one', () => {
  assert.equal(L.shieldChipOf('choice', 5), 1);
  assert.equal(L.shieldChipOf('speak', 5), 5);
  assert.equal(L.shieldChipOf('spell', 3), 3);
  const boss = L.createBoss(1);
  const broke = L.chipShield(boss, L.shieldChipOf('spell', boss.shield), { now: 1 }).boss;
  assert.equal(broke.state, 'broken');
  assert.equal(broke.color, 'red');
});

test('quiz mic stays visible on the card and learn panel counts unspoken words', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.css'), 'utf8');
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(html, /未跟读/);
  assert.match(html, /id="quiz-mic"/);
  assert.match(css, /\.bl-quiz-mic\s*\{/);
  assert.match(css, /\.bl-quiz\s+\.bl-btn\.is-ghost/);
  assert.match(game, /canTypeCast/);
  assert.match(game, /unreadSpeakCount/);
  assert.match(game, /shieldChipOf/);
  assert.match(game, /spokenWordIds/);
});

test('each level carries mission, themes, boss mechanic, and unlock gate', () => {
  L.LEVELS.forEach((row) => {
    assert.ok(row.missionType, 'missionType ' + row.level);
    assert.ok(Array.isArray(row.wordThemes) && row.wordThemes.length >= 1);
    assert.ok(row.targetWords >= 5);
    assert.ok(row.bossMechanic);
    assert.ok(row.unlock && row.unlock.coins >= 0);
    assert.ok(Array.isArray(row.focusWords));
  });
  assert.equal(L.LEVELS[0].bossId, 'wither');
  assert.equal(L.LEVELS[0].bossMechanic, 'speak-break');
  assert.equal(L.LEVELS[1].bossId, 'mirror-fox');
  assert.equal(L.LEVELS[1].bossMechanic, 'direction-callout');
  assert.equal(L.LEVELS[2].bossMechanic, 'spell-key');
  assert.notEqual(L.LEVELS[0].missionType, L.LEVELS[1].missionType);
  assert.equal(L.bossModelOf('wither'), 'boss');
  assert.equal(L.bossModelOf('mirror-fox'), 'fox');
  assert.equal(L.bossModelOf('dragon'), 'dragon');
  const b1 = L.createBoss(1);
  const b2 = L.createBoss(2);
  assert.equal(b1.mechanic, 'speak-break');
  assert.equal(b2.mechanic, 'direction-callout');
  assert.notEqual(L.bossPhase(b1), L.bossPhase(b2));
});

test('behaviorOf maps every combat kind to chase/ranged/shield/summon', () => {
  const seen = new Set();
  C.MONSTER_KINDS.forEach((k) => {
    const b = C.behaviorOf(k);
    assert.ok(['chase', 'ranged', 'shield', 'summon'].indexOf(b) >= 0, k + ' -> ' + b);
    seen.add(b);
  });
  assert.equal(seen.size, 4);
  assert.equal(C.behaviorOf('slime'), 'chase');
  assert.equal(C.behaviorOf('skeleton'), 'ranged');
  assert.equal(C.behaviorOf('warden'), 'shield');
  assert.equal(C.behaviorOf('witch'), 'summon');
  assert.ok(C.behaviorSpeedScale('ranged') < C.behaviorSpeedScale('chase'));
});

test('level 2 quest copy differs from level 1 and is not auto-complete', () => {
  const q1 = Q.current(Q.create(1));
  const q2 = Q.current(Q.create(2));
  const q3 = Q.current(Q.create(3));
  assert.equal(Q.create(2).complete, false);
  assert.notEqual(q1.title, q2.title);
  assert.notEqual(q2.title, q3.title);
  const afterLook = Q.apply(Q.create(2), { type: 'look', kind: 'fox' });
  assert.notEqual(Q.current(afterLook).id, 'find-fox');
});

test('five recall words discount the next-level unlock to 30%', () => {
  const full = L.tryUnlock({ unlockedLevel: 1, coined: 50, recallWords: 0 }, 2);
  assert.equal(full.ok, true);
  assert.equal(full.coined, 0);
  const cheap = L.tryUnlock({ unlockedLevel: 1, coined: 15, recallWords: 5 }, 2);
  assert.equal(cheap.ok, true);
  assert.equal(cheap.coined, 0);
  const stillPoor = L.tryUnlock({ unlockedLevel: 1, coined: 14, recallWords: 5 }, 2);
  assert.equal(stillPoor.ok, false);
});

test('craft ui maps every offered item to an icon class', () => {
  assert.equal(CR.itemIcon('oak-log'), 'log');
  assert.equal(CR.itemIcon('plank'), 'plank');
  assert.equal(CR.itemIcon('wood_sword'), 'sword-wood');
  assert.equal(CR.itemIcon('torch'), 'torch');
  assert.equal(CR.itemIcon('missing-thing'), 'unknown');
  CR.RECIPES.filter((r) => CR.isOffered(r.id)).forEach((r) => {
    assert.notEqual(CR.itemIcon(r.id), 'unknown', r.id);
    Object.keys(r.inputs).forEach((k) => assert.notEqual(CR.itemIcon(k), 'unknown', k));
  });
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.css'), 'utf8');
  assert.match(game, /function itemIconHtml/);
  assert.match(game, /bl-item-/);
  assert.match(game, /bl-craft-mat/);
  assert.match(css, /\.bl-item-plank/);
  assert.match(css, /\.bl-item-log/);
  assert.match(css, /\.bl-item-torch/);
});

test('recipe book hides unused items and keeps chest/torch/furnace offered', () => {
  assert.equal(CR.isOffered('chest'), true);
  assert.equal(CR.isOffered('torch'), true);
  assert.equal(CR.isOffered('furnace'), true);
  assert.equal(CR.isOffered('door'), true);
  ['boat', 'shears', 'fishing_rod', 'bucket', 'bowl'].forEach((id) => {
    assert.equal(CR.isOffered(id), false, id);
  });
  const book = CR.recipesFor({ atTable: true }).map((r) => r.id);
  assert.ok(book.indexOf('chest') >= 0);
  assert.ok(book.indexOf('boat') < 0);
  assert.equal(CR.recipeOf('chest').keepOnDeath, true);
  assert.equal(CR.keepsBagOnDeath({ chest: 1 }), true);
  assert.equal(CR.keepsBagOnDeath({}), false);
  assert.ok(C.torchSlow({ hasTorch: true, inCave: true }) < 1);
  assert.equal(C.torchSlow({ hasTorch: false, inCave: true }), 1);
});
