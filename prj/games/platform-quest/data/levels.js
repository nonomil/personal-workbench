/**
 * 横版闯关 · 14 关
 * 环境抽自 refs/mahmodnasser-mario：格子铺台、高低错落、台阶、地面留坑。
 * 参考关宽 200 格 × 32 = 6400px；本关 TILE=40，第 1 关同样 160 格。
 */
(function (global) {
    'use strict';

    const T = 40;
    const GY = 400;

    function ay(tilesAbove) {
        return GY - tilesAbove * T;
    }

    function row(tileX, tilesAbove, n, type) {
        return {
            x: tileX * T,
            y: ay(tilesAbove),
            w: n * T,
            h: 20,
            type: type || 'grass'
        };
    }

    function stairs(tileX, steps, type) {
        const out = [];
        const kind = type || 'brick';
        for (let i = 0; i < steps; i += 1) {
            for (let j = 0; j <= i; j += 1) {
                out.push({
                    x: (tileX + i) * T,
                    y: ay(j + 1),
                    w: T,
                    h: T,
                    type: kind,
                    breakable: false,
                    stair: true
                });
            }
        }
        return out;
    }

    function groundsFromPits(width, pits) {
        const cuts = (pits || []).slice().sort(function (a, b) { return a[0] - b[0]; });
        const segs = [];
        let x = 0;
        cuts.forEach(function (p) {
            const px = Number(p[0]) || 0;
            const pw = Number(p[1]) || 0;
            if (px > x) segs.push({ x: x, w: px - x });
            x = Math.max(x, px + pw);
        });
        if (x < width) segs.push({ x: x, w: width - x });
        return segs;
    }

    function blockAt(tileX, tilesAbove, type, item) {
        return [tileX * T, ay(tilesAbove), type, item];
    }

    function coinAt(tileX, tilesAbove) {
        return [tileX * T + 8, ay(tilesAbove) - 36];
    }

    function enemyOn(tileX, dir, kind) {
        return [tileX * T, GY - 36, dir || 1, undefined, undefined, kind];
    }

    function pipeAt(tileX, h) {
        const hh = h || 60;
        return { x: tileX * T, y: GY - hh, w: 48, h: hh };
    }

    function plantOn(tileX) {
        return [tileX * T + 8, GY - 88, 1, undefined, undefined, 'plant'];
    }

    function underMap(width, platforms, coins, enemies, blocks, pipeTile) {
        const w = width || 2000;
        const pt = pipeTile != null ? pipeTile : Math.max(2, Math.floor(w / T) - 3);
        return {
            width: w,
            groundY: GY,
            grounds: [{ x: 0, w: w }],
            platforms: platforms || [],
            coins: (coins || []).map(function (c) { return { x: c[0], y: c[1], taken: false }; }),
            enemies: (enemies || []).map(function (e) {
                return { x: e[0], y: e[1], w: 36, h: 28, dir: e[2] || 1, minX: e[3], maxX: e[4], kind: e[5] || 'shroom' };
            }),
            blocks: (blocks || []).map(function (b) {
                return {
                    x: b[0], y: b[1], w: T, h: T,
                    type: b[2] || 'question',
                    item: b[3] || 'coin',
                    hit: false,
                    broken: false
                };
            }),
            pipe: { x: Math.min(w - 80, pt * T), y: GY - 60, w: 48, h: 60, exit: true },
            pipes: [{ x: Math.min(w - 80, pt * T), y: GY - 60, w: 48, h: 60, exit: true }],
            sky: 'sky-night'
        };
    }

    function L(id, title, width, platforms, coins, enemies, flagX, reward, parTime, blocks, checkpoints, pits, extras) {
        extras = extras || {};
        const pipeTile = extras.pipeTile != null ? extras.pipeTile : 18;
        const mainPipe = { x: Math.min(width - 80, pipeTile * T), y: GY - 60, w: 48, h: 60 };
        return {
            id: id,
            title: title,
            width: width,
            groundY: GY,
            grounds: groundsFromPits(width, pits),
            platforms: platforms,
            coins: coins.map(function (c) { return { x: c[0], y: c[1], taken: false }; }),
            enemies: enemies.map(function (e) {
                return { x: e[0], y: e[1], w: 36, h: 28, dir: e[2] || 1, minX: e[3], maxX: e[4], kind: e[5] || 'shroom' };
            }),
            blocks: (blocks || []).map(function (b) {
                return {
                    x: b[0], y: b[1], w: T, h: T,
                    type: b[2] || 'question',
                    item: b[3] || 'coin',
                    hit: false,
                    broken: false
                };
            }),
            checkpoints: (checkpoints || []).map(function (c) {
                return { x: c[0], y: c[1], w: c[2] || 44, h: c[3] || 44, saved: false };
            }),
            flag: { x: flagX, y: GY - 120, w: 44, h: 120 },
            pipe: mainPipe,
            pipes: [mainPipe].concat(extras.pipes || []),
            under: extras.under || null,
            rewardSun: reward,
            parTime: parTime || 90
        };
    }

    const LEVELS = [
        L(1, '青青草地', 6400,
            [
                row(20, 3, 3), row(30, 3, 3), row(40, 5, 5),
                row(50, 3, 8), row(65, 5, 4), row(75, 6, 3),
                row(90, 3, 10), row(145, 3, 12)
            ].concat(stairs(110, 6), stairs(130, 5)),
            [
                coinAt(20, 3), coinAt(22, 3), coinAt(40, 5), coinAt(42, 5),
                coinAt(51, 3), coinAt(65, 5), coinAt(75, 6), coinAt(91, 3),
                coinAt(111, 2), coinAt(132, 3), coinAt(146, 3)
            ],
            [enemyOn(24), enemyOn(35, -1), enemyOn(52), enemyOn(72), enemyOn(93), enemyOn(118)],
            155 * T, 12, 180,
            [
                blockAt(16, 4, 'question', 'coin'),
                blockAt(21, 4, 'question', 'mushroom'),
                blockAt(23, 4, 'question', 'coin'),
                blockAt(25, 7, 'question', 'coin'),
                blockAt(31, 4, 'question', 'mushroom'),
                blockAt(45, 6, 'question', 'coin'),
                blockAt(46, 6, 'question', 'coin'),
                blockAt(47, 6, 'question', 'coin'),
                blockAt(70, 4, 'question', 'mushroom'),
                blockAt(80, 7, 'question', 'ball')
            ],
            [[32 * T, GY - 44], [112 * T, GY - 44]],
            [[26 * T, 2 * T], [58 * T, 2 * T], [100 * T, 2 * T]],
            {
                pipeTile: 12,
                under: underMap(2000, [
                    row(6, 3, 4), row(16, 5, 3), row(28, 3, 6)
                ], [
                    coinAt(6, 3), coinAt(8, 3), coinAt(16, 5), coinAt(28, 3), coinAt(30, 3)
                ], [
                    enemyOn(20), enemyOn(34, -1, 'beetle')
                ], [
                    blockAt(18, 4, 'question', 'ball'),
                    blockAt(29, 4, 'question', 'coin')
                ], 42)
            }
        ),
        L(2, '砖块台阶', 4800,
            [
                row(8, 3, 2), row(14, 4, 3), row(22, 5, 3),
                row(36, 3, 6), row(52, 6, 3), row(70, 4, 4),
                row(88, 3, 8)
            ].concat(stairs(28, 4), stairs(100, 6)),
            [coinAt(8, 3), coinAt(14, 4), coinAt(22, 5), coinAt(36, 3), coinAt(52, 6), coinAt(70, 4), coinAt(101, 3)],
            [enemyOn(12), enemyOn(40, -1, 'beetle'), enemyOn(74), enemyOn(92, 1, 'leaf')],
            112 * T, 15, 150,
            [
                blockAt(15, 5, 'brick', 'coin'),
                blockAt(23, 6, 'question', 'mushroom'),
                blockAt(38, 4, 'question', 'ball'),
                blockAt(71, 5, 'brick', 'coin')
            ],
            [[40 * T, GY - 44]],
            [[20 * T, 2 * T], [60 * T, 2 * T]],
            {
                pipeTile: 18,
                under: underMap(1800, [
                    row(8, 4, 5), row(20, 3, 4)
                ], [
                    coinAt(8, 4), coinAt(10, 4), coinAt(20, 3), coinAt(22, 3)
                ], [
                    enemyOn(14, 1, 'beetle')
                ], [
                    blockAt(22, 4, 'question', 'ball')
                ], 38)
            }
        ),
        L(3, '水管山谷', 5200,
            [
                row(10, 3, 4), row(28, 5, 3), row(42, 3, 5),
                row(60, 6, 3), row(78, 4, 6), row(100, 3, 8)
            ].concat(stairs(88, 5)),
            [coinAt(10, 3), coinAt(28, 5), coinAt(42, 3), coinAt(60, 6), coinAt(78, 4), coinAt(89, 3), coinAt(101, 3)],
            [enemyOn(16, 1, 'leaf'), enemyOn(46, -1, 'beetle'), enemyOn(80), enemyOn(104, 1, 'leaf')],
            122 * T, 18, 160,
            [
                blockAt(12, 4, 'question', 'coin'),
                blockAt(30, 6, 'question', 'star'),
                blockAt(44, 4, 'question', 'ball')
            ],
            [[48 * T, GY - 44]],
            [[22 * T, 2 * T], [68 * T, 2 * T]],
            {
                pipeTile: 32,
                under: underMap(2200, [
                    row(10, 4, 6), row(24, 3, 5), row(40, 5, 4)
                ], [
                    coinAt(10, 4), coinAt(12, 4), coinAt(24, 3), coinAt(40, 5)
                ], [
                    enemyOn(18, 1, 'leaf'), enemyOn(36, -1, 'beetle')
                ], [
                    blockAt(26, 4, 'question', 'mushroom')
                ], 48)
            }
        ),
        L(4, '高台冲刺', 5600,
            [
                row(6, 2, 2), row(12, 3, 2), row(18, 4, 2), row(24, 5, 2),
                row(36, 3, 5), row(54, 6, 4), row(72, 4, 3), row(90, 3, 10)
            ].concat(stairs(108, 7)),
            [coinAt(6, 2), coinAt(12, 3), coinAt(18, 4), coinAt(24, 5), coinAt(36, 3), coinAt(54, 6), coinAt(90, 3)],
            [enemyOn(40, 1, 'beetle'), enemyOn(76, -1, 'leaf'), enemyOn(96)],
            128 * T, 22, 170,
            [
                blockAt(19, 5, 'question', 'coin'),
                blockAt(38, 4, 'question', 'mushroom'),
                blockAt(56, 7, 'brick', 'coin')
            ],
            [[48 * T, GY - 44]],
            [[30 * T, 2 * T], [64 * T, 2 * T], [102 * T, 2 * T]]
        ),
        L(5, '星光中场', 5200,
            [
                row(8, 3, 3), row(20, 5, 3), row(34, 3, 6),
                row(52, 6, 3), row(68, 4, 5), row(92, 3, 8)
            ].concat(stairs(80, 5)),
            [coinAt(8, 3), coinAt(20, 5), coinAt(34, 3), coinAt(52, 6), coinAt(68, 4), coinAt(81, 3), coinAt(93, 3)],
            [enemyOn(14, 1, 'leaf'), enemyOn(38, -1, 'beetle'), enemyOn(70), enemyOn(96, 1, 'leaf')],
            118 * T, 26, 160,
            [blockAt(22, 6, 'question', 'star'), blockAt(36, 4, 'question', 'coin')],
            [[50 * T, GY - 44]],
            [[16 * T, 2 * T], [58 * T, 2 * T]]
        ),
        L(6, '云端跳台', 5600,
            [
                row(8, 3, 2), row(16, 5, 2), row(24, 6, 2), row(32, 7, 2),
                row(48, 4, 4), row(66, 6, 3), row(84, 3, 6), row(110, 4, 8)
            ].concat(stairs(98, 5)),
            [coinAt(8, 3), coinAt(16, 5), coinAt(24, 6), coinAt(32, 7), coinAt(48, 4), coinAt(66, 6), coinAt(110, 4)],
            [enemyOn(50, 1, 'beetle'), enemyOn(86, -1, 'leaf'), enemyOn(114)],
            128 * T, 28, 175,
            [blockAt(26, 7, 'question', 'mushroom'), blockAt(68, 7, 'question', 'coin')],
            [[52 * T, GY - 44]],
            [[20 * T, 2 * T], [56 * T, 2 * T], [92 * T, 2 * T]]
        ),
        L(7, '峡谷风', 5400,
            [
                row(8, 3, 3), row(18, 4, 3),
                { x: 28 * T, y: ay(5), w: 3 * T, h: 20, mv: { axis: 'y', range: 36, speed: 1.1, phase: 0 } },
                row(42, 3, 5),
                { x: 60 * T, y: ay(5), w: 3 * T, h: 20, mv: { axis: 'x', range: 40, speed: 0.9, phase: 1.5 } },
                row(78, 4, 4), row(104, 3, 8)
            ].concat(stairs(90, 5)),
            [coinAt(8, 3), coinAt(18, 4), coinAt(42, 3), coinAt(78, 4), coinAt(91, 3), coinAt(105, 3)],
            [enemyOn(12, 1, 'leaf'), enemyOn(46, -1), enemyOn(80, 1, 'beetle'), enemyOn(108)],
            124 * T, 30, 170,
            [blockAt(20, 5, 'question', 'coin'), blockAt(44, 4, 'question', 'mushroom')],
            [[50 * T, GY - 44]],
            [[24 * T, 2 * T], [68 * T, 2 * T]]
        ),
        L(8, '密林冲刺', 5600,
            [
                row(6, 3, 3), row(16, 5, 3),
                { x: 26 * T, y: ay(4), w: 3 * T, h: 20, mv: { axis: 'y', range: 44, speed: 1.0, phase: 0.8 } },
                row(40, 3, 6), row(62, 6, 3),
                { x: 78 * T, y: ay(5), w: 3 * T, h: 20, mv: { axis: 'x', range: 36, speed: 1.2, phase: 0 } },
                row(100, 3, 10)
            ].concat(stairs(88, 6)),
            [coinAt(6, 3), coinAt(16, 5), coinAt(40, 3), coinAt(62, 6), coinAt(89, 3), coinAt(101, 3)],
            [enemyOn(10, 1, 'beetle'), enemyOn(44, -1, 'leaf'), enemyOn(66), enemyOn(104, 1, 'beetle')],
            128 * T, 32, 175,
            [blockAt(18, 6, 'question', 'coin'), blockAt(42, 4, 'question', 'star')],
            [[48 * T, GY - 44]],
            [[22 * T, 2 * T], [54 * T, 2 * T], [94 * T, 2 * T]]
        ),
        L(9, '夜路守卫', 5000,
            [
                row(8, 3, 3),
                { x: 20 * T, y: ay(5), w: 3 * T, h: 20, mv: { axis: 'y', range: 40, speed: 1.15, phase: 0 } },
                row(34, 4, 4), row(52, 6, 3), row(70, 3, 6), row(100, 4, 6)
            ].concat(stairs(84, 5)),
            [coinAt(8, 3), coinAt(34, 4), coinAt(52, 6), coinAt(70, 3), coinAt(85, 3), coinAt(101, 4)],
            [enemyOn(12, 1, 'leaf'), enemyOn(38, -1, 'beetle'), enemyOn(74), enemyOn(104, 1, 'leaf')],
            116 * T, 36, 155,
            [blockAt(36, 5, 'question', 'mushroom'), blockAt(54, 7, 'question', 'coin')],
            [[44 * T, GY - 44]],
            [[16 * T, 2 * T], [60 * T, 2 * T]]
        ),
        L(10, '彩虹终点', 5200,
            [
                row(8, 3, 3),
                { x: 18 * T, y: ay(5), w: 3 * T, h: 20, mv: { axis: 'y', range: 42, speed: 1.2, phase: 0.5 } },
                row(32, 6, 3), row(48, 4, 4),
                { x: 64 * T, y: ay(6), w: 3 * T, h: 20, mv: { axis: 'x', range: 50, speed: 1.1, phase: 0 } },
                row(82, 3, 6), row(110, 5, 8)
            ].concat(stairs(96, 6)),
            [coinAt(8, 3), coinAt(32, 6), coinAt(48, 4), coinAt(82, 3), coinAt(97, 3), coinAt(111, 5)],
            [enemyOn(12, 1, 'beetle'), enemyOn(50, -1, 'leaf'), enemyOn(86)],
            122 * T, 45, 165,
            [
                blockAt(34, 7, 'question', 'star'),
                blockAt(50, 5, 'question', 'coin'),
                blockAt(84, 4, 'question', 'mushroom')
            ],
            [[54 * T, GY - 44]],
            [[14 * T, 2 * T], [58 * T, 2 * T], [90 * T, 2 * T]]
        ),
        L(11, '硬壳山谷', 5400,
            [
                row(8, 3, 4), row(22, 5, 3), row(40, 3, 6),
                row(70, 4, 4), row(96, 3, 8)
            ].concat(stairs(54, 5), stairs(112, 6)),
            [coinAt(8, 3), coinAt(22, 5), coinAt(40, 3), coinAt(55, 3), coinAt(70, 4), coinAt(97, 3), coinAt(113, 3)],
            [
                enemyOn(14, 1, 'beetle'), enemyOn(30, -1, 'beetle'), enemyOn(46),
                plantOn(64), enemyOn(84, 1, 'beetle'), enemyOn(108, -1, 'leaf')
            ],
            126 * T, 40, 170,
            [
                blockAt(24, 6, 'question', 'ball'),
                blockAt(42, 4, 'question', 'mushroom'),
                blockAt(72, 5, 'brick', 'coin')
            ],
            [[50 * T, GY - 44]],
            [[18 * T, 2 * T], [78 * T, 2 * T]],
            { pipeTile: 10, pipes: [pipeAt(64), pipeAt(88)] }
        ),
        L(12, '水管花园', 5600,
            [
                row(8, 3, 3), row(28, 5, 4), row(48, 3, 5),
                row(72, 6, 3), row(100, 3, 8)
            ].concat(stairs(86, 5)),
            [coinAt(8, 3), coinAt(28, 5), coinAt(48, 3), coinAt(72, 6), coinAt(87, 3), coinAt(101, 3)],
            [
                plantOn(24), plantOn(40), enemyOn(16, 1, 'leaf'),
                enemyOn(54, -1, 'beetle'), plantOn(68), enemyOn(92), enemyOn(110, 1, 'beetle')
            ],
            128 * T, 42, 175,
            [
                blockAt(30, 6, 'question', 'ball'),
                blockAt(50, 4, 'question', 'star'),
                blockAt(74, 7, 'question', 'mushroom')
            ],
            [[56 * T, GY - 44]],
            [[20 * T, 2 * T], [60 * T, 2 * T], [94 * T, 2 * T]],
            {
                pipeTile: 12,
                pipes: [pipeAt(24), pipeAt(40), pipeAt(68), pipeAt(82)],
                under: underMap(2000, [
                    row(8, 4, 5), row(22, 3, 6)
                ], [
                    coinAt(8, 4), coinAt(10, 4), coinAt(22, 3), coinAt(24, 3)
                ], [
                    plantOn(16), enemyOn(30, 1, 'beetle')
                ], [
                    blockAt(20, 4, 'question', 'ball')
                ], 42)
            }
        ),
        L(13, '夜空飞叶', 5400,
            [
                row(8, 4, 3), row(22, 6, 3),
                { x: 36 * T, y: ay(5), w: 3 * T, h: 20, mv: { axis: 'y', range: 40, speed: 1.1, phase: 0 } },
                row(52, 3, 6), row(78, 5, 4), row(104, 3, 8)
            ].concat(stairs(90, 5)),
            [coinAt(8, 4), coinAt(22, 6), coinAt(52, 3), coinAt(78, 5), coinAt(91, 3), coinAt(105, 3)],
            [
                enemyOn(14, 1, 'bat'), enemyOn(28, -1, 'leaf'), enemyOn(44, 1, 'bat'),
                enemyOn(60, -1, 'beetle'), plantOn(72), enemyOn(98, 1, 'bat'), enemyOn(112, -1, 'leaf')
            ],
            124 * T, 44, 170,
            [
                blockAt(24, 7, 'question', 'ball'),
                blockAt(54, 4, 'question', 'mushroom')
            ],
            [[64 * T, GY - 44]],
            [[18 * T, 2 * T], [68 * T, 2 * T]],
            { pipeTile: 10, pipes: [pipeAt(72)] }
        ),
        L(14, '星桥冲刺', 5800,
            [
                row(8, 3, 3),
                { x: 20 * T, y: ay(5), w: 3 * T, h: 20, mv: { axis: 'y', range: 44, speed: 1.2, phase: 0.4 } },
                row(36, 6, 3), row(54, 4, 5),
                { x: 74 * T, y: ay(6), w: 3 * T, h: 20, mv: { axis: 'x', range: 48, speed: 1.1, phase: 0 } },
                row(96, 3, 6), row(122, 5, 8)
            ].concat(stairs(108, 6)),
            [coinAt(8, 3), coinAt(36, 6), coinAt(54, 4), coinAt(96, 3), coinAt(109, 3), coinAt(123, 5)],
            [
                enemyOn(14, 1, 'beetle'), enemyOn(42, -1, 'bat'), plantOn(32),
                enemyOn(62, 1, 'leaf'), enemyOn(88, -1, 'beetle'), enemyOn(118, 1, 'bat')
            ],
            136 * T, 48, 180,
            [
                blockAt(38, 7, 'question', 'star'),
                blockAt(56, 5, 'question', 'ball'),
                blockAt(98, 4, 'question', 'mushroom')
            ],
            [[70 * T, GY - 44]],
            [[16 * T, 2 * T], [48 * T, 2 * T], [84 * T, 2 * T]],
            { pipeTile: 10, pipes: [pipeAt(32), pipeAt(80)] }
        )
    ];

    global.PlatformLevels = {
        list: LEVELS,
        get: function (id) {
            const found = LEVELS.find(function (l) { return l.id === Number(id); });
            return found ? JSON.parse(JSON.stringify(found)) : JSON.parse(JSON.stringify(LEVELS[0]));
        },
        count: LEVELS.length
    };
}(typeof window !== 'undefined' ? window : globalThis));
