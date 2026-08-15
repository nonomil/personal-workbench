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

test('schulte 5x5, sudoku 6x6, simon and visual search are completable without deducting sunlight', () => {
    const schulte = play.buildSchulteGrid(5, 11);
    assert.equal(schulte.cells.length, 25);
    assert.deepEqual(schulte.cells.slice().sort((a, b) => a - b), Array.from({ length: 25 }, (_, i) => i + 1));
    assert.notDeepEqual(schulte.cells, Array.from({ length: 25 }, (_, i) => i + 1));
    let next = play.tapSchulte(schulte, schulte.cells.indexOf(9));
    assert.equal(next.next, 1);
    assert.equal(next.wrong, true);
    next = play.tapSchulte(next, next.cells.indexOf(1));
    assert.equal(next.next, 2);
    assert.equal(next.wrong, false);
    for (let value = 2; value <= 25; value += 1) next = play.tapSchulte(next, next.cells.indexOf(value));
    assert.equal(next.complete, true);

    const sudoku = play.buildSudoku6(8, 16);
    assert.equal(sudoku.values.length, 36);
    assert.equal(sudoku.given.filter(Boolean).length, 16);
    assert.equal(sudoku.solution.every((value, index) => value >= 1 && value <= 6 && (sudoku.given[index] ? sudoku.values[index] === value : true)), true);
    const empty = sudoku.values.findIndex((value, index) => !sudoku.given[index] && value === 0);
    let puzzle = play.selectSudoku(sudoku, empty);
    puzzle = play.placeSudoku(puzzle, (sudoku.solution[empty] % 6) + 1);
    assert.equal(puzzle.wrong, true);
    assert.equal(puzzle.values[empty], 0);
    puzzle = play.placeSudoku(play.selectSudoku(puzzle, empty), sudoku.solution[empty]);
    assert.equal(puzzle.values[empty], sudoku.solution[empty]);
    for (let index = 0; index < 36; index += 1) {
        if (puzzle.given[index] || puzzle.values[index]) continue;
        puzzle = play.placeSudoku(play.selectSudoku(puzzle, index), puzzle.solution[index]);
    }
    assert.equal(puzzle.complete, true);

    const simon = play.buildSimonRound(6, 3);
    assert.equal(simon.sequence.length, 6);
    assert.equal(simon.phase, 'show');
    let shown = simon;
    for (let i = 0; i < 6; i += 1) shown = play.advanceSimonShow(shown);
    assert.equal(shown.phase, 'input');
    let tapped = play.tapSimon(shown, (shown.sequence[0] + 1) % 4);
    assert.equal(tapped.wrong, true);
    assert.equal(tapped.inputIndex, 0);
    shown.sequence.forEach((color) => {
        tapped = play.tapSimon(tapped, color);
    });
    assert.equal(tapped.complete, true);

    const search = play.buildSearchGrid(6, 8, 5);
    assert.equal(search.cells.length, 36);
    assert.equal(search.cells.filter((cell) => cell.isTarget).length, 8);
    let hunt = play.tapSearch(search, search.cells.findIndex((cell) => !cell.isTarget));
    assert.equal(hunt.wrong, true);
    search.cells.forEach((cell, index) => {
        if (cell.isTarget) hunt = play.tapSearch(hunt, index);
    });
    assert.equal(hunt.complete, true);
    assert.equal(hunt.found, 8);
});

test('config and app wire remade play modes onto existing preschool lessons', () => {
    const config = fs.readFileSync(path.join(repoRoot, 'prj', 'config.js'), 'utf8');
    const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(repoRoot, 'prj', 'preschool-workbench', 'index.html'), 'utf8');
    assert.match(config, /mode: 'play-schulte'/);
    assert.match(config, /mode: 'play-sudoku'/);
    assert.match(config, /mode: 'play-memory'/);
    assert.match(config, /mode: 'play-simon'/);
    assert.match(config, /mode: 'play-search'/);
    assert.match(config, /mode: 'pinyin-match'/);
    assert.match(app, /buildSchulteGrid/);
    assert.match(app, /buildSudoku/);
    assert.match(app, /getFocusStages/);
    assert.match(app, /data-action="play-schulte"/);
    assert.match(app, /data-action="play-sudoku-num"/);
    assert.match(app, /data-action="focus-start-level" data-level=/);
    assert.match(app, /focus-arcade/);
    assert.match(html, /preschool-play-games\.js\?v=20260815-focus-candy-v1/);
});

test('focus stages add 3x3 schulte, 4x4 sudoku and longer memory boards', () => {
    assert.equal(play.getFocusStages('play-schulte').length, 4);
    assert.equal(play.getFocusStages('play-schulte')[0].size, 3);
    assert.equal(play.getFocusStages('play-sudoku')[0].size, 4);
    assert.equal(play.getFocusStages('play-memory')[3].size, 10);
    assert.equal(play.getFocusStages('play-simon')[3].size, 10);
    assert.equal(play.getFocusStages('play-search')[0].targets, 5);

    const schulte = play.buildSchulteGrid(3, 2);
    assert.equal(schulte.cells.length, 9);
    let next = schulte;
    for (let value = 1; value <= 9; value += 1) next = play.tapSchulte(next, next.cells.indexOf(value));
    assert.equal(next.complete, true);

    const sudoku = play.buildSudoku4(4, 10);
    assert.equal(sudoku.size, 4);
    assert.equal(sudoku.values.length, 16);
    assert.equal(sudoku.given.filter(Boolean).length, 10);
    let puzzle = sudoku;
    for (let index = 0; index < 16; index += 1) {
        if (puzzle.given[index] || puzzle.values[index]) continue;
        puzzle = play.placeSudoku(play.selectSudoku(puzzle, index), puzzle.solution[index]);
    }
    assert.equal(puzzle.complete, true);
    assert.equal(play.buildSudoku(4, 4, 10).size, 4);
    assert.equal(play.buildSudoku(6, 8, 16).size, 6);

    const memory = play.buildMemoryBoard(10, 1);
    assert.equal(memory.cards.length, 20);
    const simon = play.buildSimonRound(10, 3);
    assert.equal(simon.sequence.length, 10);
    const search = play.buildSearchGrid(4, 5, 5);
    assert.equal(search.cells.length, 16);
    assert.equal(search.total, 5);
});
