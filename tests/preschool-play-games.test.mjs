import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await import('../prj/preschool-english-vocab-data.js');
await import('../prj/preschool-english-vocab.js');
await import('../prj/preschool-pinyin-data.js');
await import('../prj/preschool-pinyin.js');
await import('../prj/preschool-play-games.js');

const play = globalThis.PersonalWorkbenchPreschoolPlayGames;
const vocab = globalThis.PersonalWorkbenchPreschoolEnglishVocab;
const pinyin = globalThis.PersonalWorkbenchPreschoolPinyin;

test('english match board pairs each daily word with its meaning', () => {
    const bank = vocab.getRuntimeBank();
    const batch = vocab.dailyWindow(bank, '2026-08-01', 5).batch;
    const board = play.buildMatchBoard(vocab.toMatchPairs(batch), 3);
    assert.equal(board.cards.length, 10);
    assert.equal(board.matchedCount, 0);
    const faces = board.cards.map(card => card.face);
    batch.forEach(item => {
        assert.ok(faces.includes(item.text));
        assert.ok(faces.includes(item.zh));
    });
    const first = board.cards[0];
    const mate = board.cards.find(card => card.pairId === first.pairId && card.id !== first.id);
    let next = play.flipCard(board, 0);
    assert.equal(next.selected.length, 1);
    next = play.flipCard(next, board.cards.findIndex(card => card.id === mate.id));
    assert.equal(next.matchedCount, 1);
    assert.equal(next.complete, false);
});

test('english spell round only accepts letters in order and never deducts sunlight', () => {
    const round = play.buildSpellRound({ text: 'cat', zh: '猫' }, 1);
    assert.ok(round.tiles.length >= 3);
    assert.ok(round.tiles.includes('c') && round.tiles.includes('a') && round.tiles.includes('t'));
    let next = play.tapSpell(round, 'x');
    assert.equal(next.typed, '');
    assert.equal(next.wrong, true);
    next = play.tapSpell(next, 'c');
    next = play.tapSpell(next, 'a');
    next = play.tapSpell(next, 't');
    assert.equal(next.typed, 'cat');
    assert.equal(next.complete, true);
    assert.equal(next.sunlightDelta, 0);
});

test('pinyin match board pairs a syllable with its sample character', () => {
    const bank = pinyin.getRuntimeBank().filter(item => item.kind === 'initial').slice(0, 4);
    const board = play.buildMatchBoard(pinyin.toMatchPairs(bank), 2);
    assert.equal(board.cards.length, 8);
    assert.ok(board.cards.some(card => card.face === 'b'));
    assert.ok(board.cards.some(card => card.face === '爸'));
});

test('memory, odd-one and number-order rounds are completable without a timer', () => {
    const memory = play.buildMemoryBoard(4, 5);
    assert.equal(memory.cards.length, 8);
    const first = memory.cards[0];
    const mate = memory.cards.find(card => card.pairId === first.pairId && card.id !== first.id);
    let next = play.flipCard(memory, 0);
    next = play.flipCard(next, memory.cards.findIndex(card => card.id === mate.id));
    assert.equal(next.matchedCount, 1);

    const odd = play.buildOddRounds(3, 7);
    assert.equal(odd.rounds.length, 3);
    assert.notEqual(odd.rounds[0].tiles[odd.rounds[0].oddIndex], odd.rounds[0].tiles[(odd.rounds[0].oddIndex + 1) % odd.rounds[0].tiles.length]);

    const order = play.buildOrderRound(5, 4);
    assert.deepEqual(order.target, [1, 2, 3, 4, 5]);
    assert.equal(order.tiles.length, 5);
    let stepped = order;
    [1, 2, 3, 4, 5].forEach(value => {
        stepped = play.tapOrder(stepped, value);
    });
    assert.equal(stepped.complete, true);
});

test('config and app wire remade play modes onto existing preschool lessons', () => {
    const config = fs.readFileSync(path.join(repoRoot, 'prj', 'config.js'), 'utf8');
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(config, /mode: 'play-memory'/);
    assert.match(config, /mode: 'play-odd'/);
    assert.match(config, /mode: 'play-order'/);
    assert.match(config, /mode: 'pinyin-match'/);
    assert.match(app, /buildMatchBoard/);
    assert.match(app, /buildSpellRound/);
    assert.match(app, /data-action="play-flip"/);
    assert.match(app, /data-action="play-spell"/);
    assert.match(html, /preschool-play-games\.js/);
});
