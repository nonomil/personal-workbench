(function (global) {
    'use strict';

    const MEMORY_FACES = ['🐶', '🐱', '🦊', '🐰', '🐼', '🐨', '🐸', '🐵', '🦁', '🐷', '🐹', '🐮'];
    const ODD_GROUPS = [
        { same: '🍎', odd: '🐱' },
        { same: '⭐', odd: '🐟' },
        { same: '🌸', odd: '🚗' },
        { same: '🥕', odd: '🎈' },
        { same: '🌞', odd: '🌙' }
    ];

    function rotate(items, salt) {
        const list = (Array.isArray(items) ? items : []).slice();
        if (!list.length) return list;
        const shift = Math.abs(Number(salt) || 0) % list.length;
        return list.slice(shift).concat(list.slice(0, shift));
    }

    function cloneBoard(board) {
        const source = board && typeof board === 'object' ? board : {};
        return {
            cards: (Array.isArray(source.cards) ? source.cards : []).map(function (card) {
                return {
                    id: String(card.id || ''),
                    pairId: String(card.pairId || ''),
                    face: String(card.face || ''),
                    matched: !!card.matched
                };
            }),
            selected: Array.isArray(source.selected) ? source.selected.slice() : [],
            matchedCount: Math.max(0, Number(source.matchedCount) || 0),
            complete: !!source.complete
        };
    }

    function buildMatchBoard(pairs, salt) {
        const cards = [];
        (Array.isArray(pairs) ? pairs : []).forEach(function (pair, index) {
            const id = String(pair && pair.id || index);
            cards.push({ id: id + '-a', pairId: id, face: String(pair && pair.a || ''), matched: false });
            cards.push({ id: id + '-b', pairId: id, face: String(pair && pair.b || ''), matched: false });
        });
        return {
            cards: rotate(cards, Number(salt) || 0),
            selected: [],
            matchedCount: 0,
            complete: false
        };
    }

    function flipCard(board, index) {
        const next = cloneBoard(board);
        const card = next.cards[index];
        if (!card || card.matched || next.complete) return next;
        if (next.selected.indexOf(index) >= 0) return next;
        if (next.selected.length >= 2) next.selected = [];
        next.selected.push(index);
        if (next.selected.length === 2) {
            const left = next.cards[next.selected[0]];
            const right = next.cards[next.selected[1]];
            if (left && right && left.pairId === right.pairId) {
                left.matched = true;
                right.matched = true;
                next.matchedCount += 1;
                next.selected = [];
                next.complete = next.cards.every(function (item) { return item.matched; });
            }
        }
        return next;
    }

    function buildSpellRound(item, salt) {
        const source = item && typeof item === 'object' ? item : {};
        const text = String(source.text || '').trim().toLowerCase();
        const extras = rotate('bcdfghjklmnpqrstvwxyz'.split(''), Number(salt) || 0).filter(function (letter) {
            return text.indexOf(letter) < 0;
        }).slice(0, 2);
        return {
            target: text,
            zh: String(source.zh || ''),
            tiles: rotate(text.split('').concat(extras), (Number(salt) || 0) + 1),
            typed: '',
            complete: false,
            wrong: false,
            sunlightDelta: 0
        };
    }

    function tapSpell(round, letter) {
        const next = {
            target: String(round && round.target || ''),
            zh: String(round && round.zh || ''),
            tiles: Array.isArray(round && round.tiles) ? round.tiles.slice() : [],
            typed: String(round && round.typed || ''),
            complete: false,
            wrong: false,
            sunlightDelta: 0
        };
        const expected = next.target.charAt(next.typed.length);
        if (String(letter || '') === expected) {
            next.typed += expected;
            next.complete = next.typed === next.target;
        } else {
            next.typed = '';
            next.wrong = true;
        }
        return next;
    }

    function buildMemoryBoard(pairs, salt) {
        const count = Math.max(2, Math.min(MEMORY_FACES.length, Number(pairs) || 4));
        const list = MEMORY_FACES.slice(0, count).map(function (face, index) {
            return { id: 'mem-' + index, a: face, b: face };
        });
        return buildMatchBoard(list, salt);
    }

    function buildOddRounds(size, salt) {
        const count = Math.max(1, Math.min(ODD_GROUPS.length, Number(size) || 3));
        const groups = rotate(ODD_GROUPS, Number(salt) || 0).slice(0, count);
        return {
            rounds: groups.map(function (group, index) {
                const tiles = rotate([group.same, group.same, group.same, group.odd], index + (Number(salt) || 0));
                return {
                    prompt: '哪一个和其他不一样？',
                    tiles: tiles,
                    oddIndex: tiles.indexOf(group.odd)
                };
            })
        };
    }

    function buildOrderRound(max, salt) {
        const end = Math.max(3, Math.min(9, Number(max) || 5));
        const target = [];
        for (let value = 1; value <= end; value += 1) target.push(value);
        return {
            target: target,
            tiles: rotate(target.slice(), Number(salt) || 0),
            typed: [],
            complete: false,
            wrong: false
        };
    }

    function tapOrder(round, value) {
        const next = {
            target: Array.isArray(round && round.target) ? round.target.slice() : [],
            tiles: Array.isArray(round && round.tiles) ? round.tiles.slice() : [],
            typed: Array.isArray(round && round.typed) ? round.typed.slice() : [],
            complete: false,
            wrong: false
        };
        const expected = next.target[next.typed.length];
        if (Number(value) === expected) {
            next.typed.push(expected);
            next.complete = next.typed.length === next.target.length;
        } else {
            next.wrong = true;
        }
        return next;
    }

    function seededShuffle(items, salt) {
        const list = (Array.isArray(items) ? items : []).slice();
        let seed = Math.abs(Number(salt) || 1);
        for (let index = list.length - 1; index > 0; index -= 1) {
            seed = (seed * 9301 + 49297) % 233280;
            const swap = seed % (index + 1);
            const hold = list[index];
            list[index] = list[swap];
            list[swap] = hold;
        }
        return list;
    }

    function buildSchulteGrid(size, salt) {
        const edge = Math.max(3, Math.min(6, Number(size) || 5));
        const total = edge * edge;
        const cells = [];
        for (let value = 1; value <= total; value += 1) cells.push(value);
        return {
            size: edge,
            cells: seededShuffle(cells, salt),
            next: 1,
            done: [],
            complete: false,
            wrong: false
        };
    }

    function tapSchulte(grid, index) {
        const next = {
            size: Math.max(3, Number(grid && grid.size) || 5),
            cells: Array.isArray(grid && grid.cells) ? grid.cells.slice() : [],
            next: Math.max(1, Number(grid && grid.next) || 1),
            done: Array.isArray(grid && grid.done) ? grid.done.slice() : [],
            complete: false,
            wrong: false
        };
        const picked = next.cells[Number(index)];
        if (picked === next.next) {
            next.done.push(picked);
            next.next += 1;
            next.complete = next.done.length === next.cells.length;
        } else {
            next.wrong = true;
        }
        return next;
    }

    const SUDOKU6_TEMPLATE = [
        1, 2, 3, 4, 5, 6,
        4, 5, 6, 1, 2, 3,
        2, 3, 1, 5, 6, 4,
        5, 6, 4, 2, 3, 1,
        3, 1, 2, 6, 4, 5,
        6, 4, 5, 3, 1, 2
    ];

    function permuteSudoku6(salt) {
        const digits = seededShuffle([1, 2, 3, 4, 5, 6], salt);
        const map = {};
        [1, 2, 3, 4, 5, 6].forEach(function (digit, index) { map[digit] = digits[index]; });
        const rowBands = seededShuffle([[0, 1], [2, 3], [4, 5]], salt + 3).map(function (band, index) {
            return seededShuffle(band, salt + 11 + index);
        });
        const colStacks = seededShuffle([[0, 1, 2], [3, 4, 5]], salt + 7).map(function (stack, index) {
            return seededShuffle(stack, salt + 17 + index);
        });
        const rows = rowBands[0].concat(rowBands[1], rowBands[2]);
        const cols = colStacks[0].concat(colStacks[1]);
        return rows.reduce(function (grid, row) {
            cols.forEach(function (col) {
                grid.push(map[SUDOKU6_TEMPLATE[row * 6 + col]]);
            });
            return grid;
        }, []);
    }

    const SUDOKU4_TEMPLATE = [
        1, 2, 3, 4,
        3, 4, 1, 2,
        2, 1, 4, 3,
        4, 3, 2, 1
    ];

    function permuteSudoku4(salt) {
        const digits = seededShuffle([1, 2, 3, 4], salt);
        const map = {};
        [1, 2, 3, 4].forEach(function (digit, index) { map[digit] = digits[index]; });
        const rowBands = seededShuffle([[0, 1], [2, 3]], salt + 3).map(function (band, index) {
            return seededShuffle(band, salt + 11 + index);
        });
        const colStacks = seededShuffle([[0, 1], [2, 3]], salt + 7).map(function (stack, index) {
            return seededShuffle(stack, salt + 17 + index);
        });
        const rows = rowBands[0].concat(rowBands[1]);
        const cols = colStacks[0].concat(colStacks[1]);
        return rows.reduce(function (grid, row) {
            cols.forEach(function (col) {
                grid.push(map[SUDOKU4_TEMPLATE[row * 4 + col]]);
            });
            return grid;
        }, []);
    }

    function buildSudoku4(salt, clues) {
        const solution = permuteSudoku4(salt);
        const keep = Math.max(6, Math.min(12, Number(clues) || 10));
        const order = seededShuffle(solution.map(function (_, index) { return index; }), salt + 29);
        const given = solution.map(function () { return false; });
        order.slice(0, keep).forEach(function (index) { given[index] = true; });
        return {
            size: 4,
            solution: solution,
            given: given,
            values: solution.map(function (value, index) { return given[index] ? value : 0; }),
            selected: -1,
            complete: false,
            wrong: false
        };
    }

    function buildSudoku(size, salt, clues) {
        return Number(size) === 4 ? buildSudoku4(salt, clues) : buildSudoku6(salt, clues);
    }

    const FOCUS_STAGES = {
        'play-schulte': [
            { id: 's1', title: '第 1 关', hint: '3×3 小格子', size: 3 },
            { id: 's2', title: '第 2 关', hint: '4×4 方格', size: 4 },
            { id: 's3', title: '第 3 关', hint: '5×5 专注', size: 5 },
            { id: 's4', title: '第 4 关', hint: '6×6 挑战', size: 6 }
        ],
        'play-sudoku': [
            { id: 'u1', title: '第 1 关', hint: '4 宫入门', size: 4, clues: 10 },
            { id: 'u2', title: '第 2 关', hint: '6 宫轻松', size: 6, clues: 20 },
            { id: 'u3', title: '第 3 关', hint: '6 宫进阶', size: 6, clues: 16 },
            { id: 'u4', title: '第 4 关', hint: '6 宫挑战', size: 6, clues: 12 }
        ],
        'play-memory': [
            { id: 'm1', title: '第 1 关', hint: '4 对卡片', size: 4 },
            { id: 'm2', title: '第 2 关', hint: '6 对卡片', size: 6 },
            { id: 'm3', title: '第 3 关', hint: '8 对卡片', size: 8 },
            { id: 'm4', title: '第 4 关', hint: '10 对卡片', size: 10 }
        ],
        'play-simon': [
            { id: 'i1', title: '第 1 关', hint: '记住 4 步', size: 4 },
            { id: 'i2', title: '第 2 关', hint: '记住 6 步', size: 6 },
            { id: 'i3', title: '第 3 关', hint: '记住 8 步', size: 8 },
            { id: 'i4', title: '第 4 关', hint: '记住 10 步', size: 10 }
        ],
        'play-search': [
            { id: 'h1', title: '第 1 关', hint: '16 格找 5 个', size: 4, targets: 5 },
            { id: 'h2', title: '第 2 关', hint: '25 格找 7 个', size: 5, targets: 7 },
            { id: 'h3', title: '第 3 关', hint: '36 格找 8 个', size: 6, targets: 8 },
            { id: 'h4', title: '第 4 关', hint: '36 格找 12 个', size: 6, targets: 12 }
        ]
    };

    function getFocusStages(mode) {
        return FOCUS_STAGES[mode] || [];
    }

    function buildSudoku6(salt, clues) {
        const solution = permuteSudoku6(salt);
        const keep = Math.max(12, Math.min(24, Number(clues) || 16));
        const order = seededShuffle(solution.map(function (_, index) { return index; }), salt + 29);
        const given = solution.map(function () { return false; });
        order.slice(0, keep).forEach(function (index) { given[index] = true; });
        return {
            size: 6,
            solution: solution,
            given: given,
            values: solution.map(function (value, index) { return given[index] ? value : 0; }),
            selected: -1,
            complete: false,
            wrong: false
        };
    }

    function cloneSudoku(puzzle) {
        const source = puzzle && typeof puzzle === 'object' ? puzzle : {};
        return {
            size: Math.max(4, Number(source.size) || 6),
            solution: Array.isArray(source.solution) ? source.solution.slice() : [],
            given: Array.isArray(source.given) ? source.given.slice() : [],
            values: Array.isArray(source.values) ? source.values.slice() : [],
            selected: Number.isInteger(Number(source.selected)) ? Number(source.selected) : -1,
            complete: false,
            wrong: false
        };
    }

    function selectSudoku(puzzle, index) {
        const next = cloneSudoku(puzzle);
        const picked = Number(index);
        if (next.given[picked] || picked < 0 || picked >= next.values.length) return next;
        next.selected = picked;
        return next;
    }

    function placeSudoku(puzzle, value) {
        const next = cloneSudoku(puzzle);
        const selected = next.selected;
        const digit = Number(value);
        if (selected < 0 || next.given[selected] || digit < 1 || digit > next.size) {
            next.wrong = true;
            return next;
        }
        if (digit !== next.solution[selected]) {
            next.wrong = true;
            return next;
        }
        next.values[selected] = digit;
        next.complete = next.values.every(function (item, index) { return item === next.solution[index]; });
        return next;
    }

    function buildSimonRound(length, salt) {
        const count = Math.max(3, Math.min(10, Number(length) || 6));
        const sequence = [];
        let seed = Math.abs(Number(salt) || 3);
        for (let index = 0; index < count; index += 1) {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            sequence.push(seed % 4);
        }
        return {
            colors: ['red', 'yellow', 'blue', 'green'],
            labels: ['红', '黄', '蓝', '绿'],
            sequence: sequence,
            showIndex: 0,
            inputIndex: 0,
            phase: 'show',
            complete: false,
            wrong: false
        };
    }

    function advanceSimonShow(round) {
        const next = {
            colors: Array.isArray(round && round.colors) ? round.colors.slice() : ['red', 'yellow', 'blue', 'green'],
            labels: Array.isArray(round && round.labels) ? round.labels.slice() : ['红', '黄', '蓝', '绿'],
            sequence: Array.isArray(round && round.sequence) ? round.sequence.slice() : [],
            showIndex: Math.max(0, Number(round && round.showIndex) || 0),
            inputIndex: Math.max(0, Number(round && round.inputIndex) || 0),
            phase: String(round && round.phase || 'show'),
            complete: false,
            wrong: false
        };
        if (next.phase !== 'show') return next;
        next.showIndex += 1;
        if (next.showIndex >= next.sequence.length) {
            next.phase = 'input';
            next.showIndex = -1;
        }
        return next;
    }

    function tapSimon(round, colorIndex) {
        const next = {
            colors: Array.isArray(round && round.colors) ? round.colors.slice() : ['red', 'yellow', 'blue', 'green'],
            labels: Array.isArray(round && round.labels) ? round.labels.slice() : ['红', '黄', '蓝', '绿'],
            sequence: Array.isArray(round && round.sequence) ? round.sequence.slice() : [],
            showIndex: -1,
            inputIndex: Math.max(0, Number(round && round.inputIndex) || 0),
            phase: 'input',
            complete: false,
            wrong: false
        };
        const picked = Number(colorIndex);
        if (picked !== next.sequence[next.inputIndex]) {
            next.wrong = true;
            next.inputIndex = 0;
            return next;
        }
        next.inputIndex += 1;
        next.complete = next.inputIndex >= next.sequence.length;
        return next;
    }

    const SEARCH_FACES = ['🍎', '🌞', '🐱', '🌸', '⭐', '🐟', '🥕', '🎈', '🍇', '🐼', '🍓', '🦋', '🌈', '🍀'];

    function buildSearchGrid(size, targetCount, salt) {
        const edge = Math.max(4, Math.min(6, Number(size) || 6));
        const total = edge * edge;
        const hits = Math.max(4, Math.min(total - 4, Number(targetCount) || 8));
        const faces = seededShuffle(SEARCH_FACES, salt);
        const target = faces[0];
        const decoys = faces.slice(1);
        const flags = seededShuffle(
            Array.from({ length: total }, function (_, index) { return index < hits; }),
            salt + 4
        );
        return {
            size: edge,
            target: target,
            cells: flags.map(function (isTarget, index) {
                return {
                    face: isTarget ? target : decoys[index % decoys.length],
                    isTarget: isTarget,
                    found: false
                };
            }),
            found: 0,
            total: hits,
            complete: false,
            wrong: false
        };
    }

    function tapSearch(grid, index) {
        const next = {
            size: Math.max(4, Number(grid && grid.size) || 6),
            target: String(grid && grid.target || ''),
            cells: (Array.isArray(grid && grid.cells) ? grid.cells : []).map(function (cell) {
                return { face: String(cell.face || ''), isTarget: !!cell.isTarget, found: !!cell.found };
            }),
            found: Math.max(0, Number(grid && grid.found) || 0),
            total: Math.max(0, Number(grid && grid.total) || 0),
            complete: false,
            wrong: false
        };
        const cell = next.cells[Number(index)];
        if (!cell || cell.found) return next;
        if (!cell.isTarget) {
            next.wrong = true;
            return next;
        }
        cell.found = true;
        next.found += 1;
        next.complete = next.found >= next.total;
        return next;
    }

    global.PersonalWorkbenchPreschoolPlayGames = {
        buildMatchBoard: buildMatchBoard,
        flipCard: flipCard,
        buildSpellRound: buildSpellRound,
        tapSpell: tapSpell,
        buildMemoryBoard: buildMemoryBoard,
        buildOddRounds: buildOddRounds,
        buildOrderRound: buildOrderRound,
        tapOrder: tapOrder,
        buildSchulteGrid: buildSchulteGrid,
        tapSchulte: tapSchulte,
        buildSudoku4: buildSudoku4,
        buildSudoku6: buildSudoku6,
        buildSudoku: buildSudoku,
        getFocusStages: getFocusStages,
        selectSudoku: selectSudoku,
        placeSudoku: placeSudoku,
        buildSimonRound: buildSimonRound,
        advanceSimonShow: advanceSimonShow,
        tapSimon: tapSimon,
        buildSearchGrid: buildSearchGrid,
        tapSearch: tapSearch
    };
})(typeof window !== 'undefined' ? window : globalThis);
