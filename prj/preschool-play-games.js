(function (global) {
    'use strict';

    const MEMORY_FACES = ['🍎', '🌞', '🐱', '🌸', '⭐', '🐟', '🥕', '🎈'];
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

    global.PersonalWorkbenchPreschoolPlayGames = {
        buildMatchBoard: buildMatchBoard,
        flipCard: flipCard,
        buildSpellRound: buildSpellRound,
        tapSpell: tapSpell,
        buildMemoryBoard: buildMemoryBoard,
        buildOddRounds: buildOddRounds,
        buildOrderRound: buildOrderRound,
        tapOrder: tapOrder
    };
})(typeof window !== 'undefined' ? window : globalThis);
