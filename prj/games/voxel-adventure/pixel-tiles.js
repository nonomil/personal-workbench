(function () {
    'use strict';

    /**
     * Scratch / Paper-MC 风格原创像素图（非 Mojang 贴图、非 Steve）。
     * 16×16 地砖、16×24 探险者、16×16 道具，最近邻放大。
     */
    const PIXEL = 16;
    const SCALE = 2;
    const EXPLORER_W = 16;
    const EXPLORER_H = 24;

    function createCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    function fill(ctx, x, y, w, h, color) {
        if (x < 0 || y < 0) return;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    }

    function px(ctx, x, y, color) {
        fill(ctx, x, y, 1, 1, color);
    }

    function stamp(ctx, rows, pal, ox, oy) {
        ox = ox || 0;
        oy = oy || 0;
        for (let y = 0; y < rows.length; y += 1) {
            const row = rows[y];
            for (let x = 0; x < row.length; x += 1) {
                const c = pal[row.charAt(x)];
                if (c) px(ctx, ox + x, oy + y, c);
            }
        }
    }

    function hash(x, y, seed) {
        return ((x * 17 + y * 31 + seed * 13) >>> 0) % 97;
    }

    function speck(ctx, x0, y0, w, h, color, seed, every) {
        for (let y = y0; y < y0 + h; y += 1) {
            for (let x = x0; x < x0 + w; x += 1) {
                if (hash(x, y, seed) % every === 0) px(ctx, x, y, color);
            }
        }
    }

    function bevel(ctx, size, light, dark) {
        fill(ctx, 0, 0, size, 1, light);
        fill(ctx, 0, 0, 1, size, light);
        fill(ctx, 0, size - 1, size, 1, dark);
        fill(ctx, size - 1, 0, 1, size, dark);
    }

    function drawGrass(ctx) {
        fill(ctx, 0, 0, 16, 5, '#4fbf3a');
        fill(ctx, 0, 0, 16, 1, '#8eef5c');
        fill(ctx, 0, 4, 16, 1, '#2f8a24');
        const blades = [1, 3, 6, 8, 11, 13];
        blades.forEach(function (x, i) {
            px(ctx, x, 1, i % 2 ? '#7fe04a' : '#3aa02c');
            px(ctx, x, 2, '#6ad63c');
            if (i % 2 === 0) px(ctx, x + 1, 0, '#a8f56e');
        });
        fill(ctx, 0, 5, 16, 11, '#8a5a2b');
        fill(ctx, 0, 5, 16, 1, '#6e4520');
        speck(ctx, 1, 6, 14, 9, '#6b421c', 2, 5);
        speck(ctx, 1, 6, 14, 9, '#b07a3d', 5, 7);
        px(ctx, 4, 10, '#c4a06a');
        px(ctx, 11, 13, '#5a3314');
        bevel(ctx, 16, 'rgba(255,255,255,0.18)', 'rgba(0,0,0,0.22)');
    }

    function drawDirt(ctx) {
        fill(ctx, 0, 0, 16, 16, '#8a5a2b');
        speck(ctx, 0, 0, 16, 16, '#6b421c', 2, 4);
        speck(ctx, 0, 0, 16, 16, '#b07a3d', 7, 6);
        fill(ctx, 3, 4, 2, 2, '#5a3314');
        fill(ctx, 10, 9, 3, 2, '#c4a06a');
        fill(ctx, 7, 12, 2, 1, '#6b421c');
        bevel(ctx, 16, '#b07a3d', '#5a3314');
    }

    function drawStone(ctx) {
        fill(ctx, 0, 0, 16, 16, '#8d9198');
        speck(ctx, 0, 0, 16, 16, '#6f747c', 3, 5);
        speck(ctx, 0, 0, 16, 16, '#b4b8bf', 8, 6);
        fill(ctx, 2, 4, 5, 1, '#5e636b');
        fill(ctx, 8, 9, 6, 1, '#5e636b');
        fill(ctx, 4, 12, 3, 1, '#c2c6cc');
        px(ctx, 12, 3, '#c2c6cc');
        bevel(ctx, 16, '#c2c6cc', '#5e636b');
    }

    function drawWood(ctx) {
        fill(ctx, 0, 0, 16, 16, '#7a4a22');
        fill(ctx, 0, 0, 3, 16, '#5c3414');
        fill(ctx, 13, 0, 3, 16, '#5c3414');
        fill(ctx, 5, 0, 2, 16, '#9a6234');
        fill(ctx, 9, 0, 1, 16, '#5c3414');
        fill(ctx, 3, 2, 1, 3, '#3d220c');
        fill(ctx, 11, 8, 1, 4, '#3d220c');
        fill(ctx, 6, 0, 1, 16, '#c0844a');
        bevel(ctx, 16, '#c0844a', '#3d220c');
    }

    function drawPlank(ctx) {
        fill(ctx, 0, 0, 16, 16, '#c48a4a');
        [0, 5, 10, 15].forEach(function (y) {
            fill(ctx, 0, y, 16, 1, '#8a5a28');
        });
        fill(ctx, 0, 1, 16, 1, '#e0b06a');
        fill(ctx, 0, 6, 16, 1, '#e0b06a');
        fill(ctx, 0, 11, 16, 1, '#e0b06a');
        px(ctx, 3, 3, '#6a4018');
        px(ctx, 12, 8, '#6a4018');
        px(ctx, 7, 13, '#6a4018');
        fill(ctx, 0, 0, 1, 16, '#8a5a28');
        fill(ctx, 15, 0, 1, 16, '#8a5a28');
    }

    function drawLeaf(ctx) {
        fill(ctx, 0, 0, 16, 16, '#2f9a3c');
        speck(ctx, 0, 0, 16, 16, '#1d7028', 4, 4);
        speck(ctx, 0, 0, 16, 16, '#5ed45a', 9, 5);
        fill(ctx, 2, 2, 4, 3, '#6ee066');
        fill(ctx, 9, 8, 4, 3, '#1d7028');
        px(ctx, 7, 5, '#8ef07a');
        px(ctx, 12, 3, '#1d7028');
        bevel(ctx, 16, '#6ee066', '#1d7028');
    }

    function drawSand(ctx) {
        fill(ctx, 0, 0, 16, 16, '#e6d08a');
        speck(ctx, 0, 0, 16, 16, '#c8b05e', 5, 4);
        speck(ctx, 0, 0, 16, 16, '#f4e6b0', 2, 6);
        fill(ctx, 5, 6, 2, 1, '#c8b05e');
        fill(ctx, 11, 11, 3, 1, '#b89a48');
        bevel(ctx, 16, '#f4e6b0', '#b89a48');
    }

    function drawWater(ctx, frame) {
        const f = frame % 4;
        fill(ctx, 0, 0, 16, 16, '#1f6fd4');
        fill(ctx, 0, 0, 16, 3, '#5cb6ff');
        fill(ctx, 0, 1, 16, 1, '#8ad4ff');
        const y1 = 5 + (f % 2);
        const y2 = 10 - (f % 2);
        fill(ctx, 0, y1, 16, 1, '#3a94f0');
        fill(ctx, 2 + f, y1 + 1, 5, 1, '#8ad4ff');
        fill(ctx, 9 - f, y2, 6, 1, '#8ad4ff');
        fill(ctx, 0, 14, 16, 2, '#1558b0');
        bevel(ctx, 16, 'rgba(255,255,255,0.28)', 'rgba(0,40,80,0.25)');
    }

    function drawCoal(ctx) {
        fill(ctx, 0, 0, 16, 16, '#3a3a40');
        speck(ctx, 0, 0, 16, 16, '#222226', 6, 4);
        speck(ctx, 0, 0, 16, 16, '#5a5a62', 1, 6);
        fill(ctx, 3, 3, 3, 3, '#111114');
        fill(ctx, 10, 8, 3, 3, '#111114');
        px(ctx, 4, 4, '#8a8a96');
        px(ctx, 11, 9, '#6a6a74');
        bevel(ctx, 16, '#5a5a62', '#111114');
    }

    function drawCrystal(ctx) {
        fill(ctx, 0, 0, 16, 16, '#8d9198');
        speck(ctx, 0, 0, 16, 16, '#6f747c', 3, 6);
        stamp(ctx, [
            '....cc....',
            '...cCCc...',
            '..cCWWCc..',
            '..cCWWCc..',
            '.ccCccCcc.',
            '.cCccccCc.',
            '..cCccCc..',
            '...cCCc...',
            '....cc....'
        ], { c: '#6b4cff', C: '#9b7cff', W: '#efe6ff' }, 3, 3);
        bevel(ctx, 16, '#c2c6cc', '#5e636b');
    }

    function drawBedrock(ctx) {
        fill(ctx, 0, 0, 16, 16, '#3c3c44');
        speck(ctx, 0, 0, 16, 16, '#2a2a30', 7, 3);
        speck(ctx, 0, 0, 16, 16, '#55555e', 4, 5);
        fill(ctx, 2, 2, 4, 3, '#2a2a30');
        fill(ctx, 9, 8, 5, 3, '#222228');
        fill(ctx, 5, 12, 3, 2, '#55555e');
        bevel(ctx, 16, '#55555e', '#1a1a1e');
    }

    const SKIN = {
        '.': null,
        o: '#3a2414',
        C: '#e85d2a',
        c: '#c4481c',
        H: '#5a3218',
        s: '#f2c39a',
        d: '#e0a87a',
        V: '#2eb67a',
        v: '#1e8a58',
        S: '#fff4d6',
        P: '#4a3d8f',
        p: '#32286a',
        B: '#3d2a1a',
        K: '#c45c2a',
        k: '#8a3c18',
        e: '#2a1a10',
        w: '#ffffff'
    };

    const EXPLORER_IDLE = [
        '..............',
        '..............',
        '..oCCCCCCo....',
        '.oCccccccCo...',
        '.oCssssssCo...',
        '.oHsweewsHo...',
        '..osssssso....',
        '..osdddso.....',
        '..oSSSSSSo....',
        '.oVSSooSSVo...',
        'oVVVSVSVVVo...',
        'oVVVVVVVVVo...',
        'okVVVVVVVko...',
        '.oKkkkkKKo....',
        '..oPPPPo......',
        '..oPooPo......',
        '..oP..Po......',
        '..oP..Po......',
        '..op..po......',
        '..oB..Bo......',
        '..oB..Bo......',
        '..oBB.BBo.....',
        '..............',
        '..............'
    ];

    const EXPLORER_WALK_A = [
        '..............',
        '..............',
        '..oCCCCCCo....',
        '.oCccccccCo...',
        '.oCssssssCo...',
        '.oHsweewsHo...',
        '..osssssso....',
        '..osdddso.....',
        '..oSSSSSSo....',
        'oVVSSooSSVo...',
        'oVVVSVSVVVo...',
        '.oVVVVVVVVo...',
        '.okVVVVVVko...',
        '..oKkkkKKo....',
        '...oPPPPo.....',
        '..oPoo.Po.....',
        '.oP....Po.....',
        'oP.....po.....',
        'oB......Bo....',
        '.oB.....Bo....',
        '..oBB...oB....',
        '..............',
        '..............',
        '..............'
    ];

    const EXPLORER_WALK_B = [
        '..............',
        '..............',
        '..oCCCCCCo....',
        '.oCccccccCo...',
        '.oCssssssCo...',
        '.oHsweewsHo...',
        '..osssssso....',
        '..osdddso.....',
        '..oSSSSSSo....',
        '..oVSSooSSVo..',
        '..oVVVSVVVVo..',
        '..oVVVVVVVVo..',
        '..okVVVVVVko..',
        '...oKkkkKKo...',
        '....oPPPPo....',
        '....oPooPo....',
        '....oP..Poo...',
        '....op...Po...',
        '....oB...oB...',
        '....oB....Bo..',
        '....oBB...oB..',
        '..............',
        '..............',
        '..............'
    ];

    const EXPLORER_JUMP = [
        '..............',
        '..oCCCCCCo....',
        '.oCccccccCo...',
        '.oCssssssCo...',
        '.oHsweewsHo...',
        '..osssssso....',
        'o.osdddso.o...',
        'o.oSSSSSSo.o..',
        '.oVSSooSSVo...',
        '.oVVVSVVVVo...',
        '..oVVVVVVVo...',
        '..okVVVVVko...',
        '...oKkkkKo....',
        '....oPPPo.....',
        '....oP.Po.....',
        '....oP.Po.....',
        '....op.po.....',
        '....oB.Bo.....',
        '....oBBBo.....',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............'
    ];

    function drawExplorer(ctx, frame) {
        const maps = [EXPLORER_IDLE, EXPLORER_WALK_A, EXPLORER_WALK_B, EXPLORER_JUMP];
        stamp(ctx, maps[frame % maps.length], SKIN, 1, 0);
    }

    const SPARK_PAL = {
        '.': null,
        o: '#2a1460',
        p: '#6b45e8',
        P: '#9b78ff',
        w: '#ffffff',
        y: '#ffe27a',
        d: '#4a2db8'
    };

    function drawSpark(ctx, frame) {
        const bounce = frame % 3;
        const maps = [
            [
                '....oooo....',
                '...oPPPpo...',
                '..oPwwwPpo..',
                '.oPpwwpPppo.',
                '.oPppppPppo.',
                '.opPppPPppo.',
                '..opdddppo..',
                '...oddddo...',
                '....oooo....',
                '............',
                '............',
                '............',
                '............',
                '............',
                '............',
                '............'
            ],
            [
                '............',
                '....oooo....',
                '...oPPPpo...',
                '..oPwwwPpo..',
                '.oPpwwpPppo.',
                '.oPppppPppo.',
                '.opPppPPppo.',
                '..opdddppo..',
                '...oyyyyo...',
                '....oooo....',
                '............',
                '............',
                '............',
                '............',
                '............',
                '............'
            ],
            [
                '............',
                '............',
                '....oooo....',
                '...oPPPpo...',
                '..oPwwwPpo..',
                '.oPpwwpPppo.',
                '.oPppppPppo.',
                '.opPppPPppo.',
                '..opdddppo..',
                '..oddddddo..',
                '...oooooo...',
                '............',
                '............',
                '............',
                '............',
                '............'
            ]
        ];
        stamp(ctx, maps[bounce], SPARK_PAL, 2, 0);
    }

    const TOOL_PAL = {
        '.': null,
        o: '#2a1a10',
        w: '#c48a4a',
        W: '#e0b06a',
        s: '#8d9198',
        S: '#c2c6cc',
        d: '#5e636b',
        h: '#6b421c'
    };

    const HAND_MAP = [
        '................',
        '....oooo........',
        '...osssso.......',
        '...oswwso.......',
        '....osso........',
        '.....oo.........',
        '.....oo.........',
        '....oooo........',
        '...o....o.......',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
    ];

    const WOOD_PICK_MAP = [
        '.......SSSo.....',
        '......SssSo.....',
        '.....SsssSo.....',
        '....oooooo......',
        '...oWWo.........',
        '..oWWo..........',
        '.oWWo...........',
        'oWWo............',
        'oho.............',
        '.o..............',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
    ];

    const STONE_PICK_MAP = [
        '.......dddS.....',
        '......dSSdS.....',
        '.....dSSSdS.....',
        '....oooooo......',
        '...oWWo.........',
        '..oWWo..........',
        '.oWWo...........',
        'oWWo............',
        'oho.............',
        '.o..............',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................'
    ];

    function drawHand(ctx) { stamp(ctx, HAND_MAP, Object.assign({}, TOOL_PAL, { s: '#f2c39a', S: '#f2c39a' })); }
    function drawWoodPick(ctx) { stamp(ctx, WOOD_PICK_MAP, TOOL_PAL); }
    function drawStonePick(ctx) { stamp(ctx, STONE_PICK_MAP, TOOL_PAL); }

    const STICK_MAP = [
        '................',
        '.............oW.',
        '............oWo.',
        '...........oWo..',
        '..........oWo...',
        '.........oWo....',
        '........oWo.....',
        '.......oWo......',
        '......oWo.......',
        '.....oWo........',
        '....oho.........',
        '...oho..........',
        '..oho...........',
        '.oho............',
        '................',
        '................'
    ];
    function drawStick(ctx) { stamp(ctx, STICK_MAP, TOOL_PAL); }

    const UI_PAL = {
        '.': null, o: '#2a1a10', w: '#fff4d6', y: '#f0c14a', b: '#3d7bdc',
        g: '#2eb67a', r: '#e85d2a', n: '#8a5a2b', k: '#1b120c'
    };
    function drawUiBook(ctx) {
        stamp(ctx, [
            '..oooooooooo....',
            '.owwwwwwwwwbo...',
            '.owyyyyyyyibo...',
            '.owwwwwwwwwbo...',
            '.owyyyyyyyibo...',
            '.owwwwwwwwwbo...',
            '.owyyyyyyyibo...',
            '.owwwwwwwwwbo...',
            '..oooooooooo....',
            '................'
        ], Object.assign({}, UI_PAL, { i: '#c4481c' }), 0, 3);
    }
    function drawUiHome(ctx) {
        stamp(ctx, [
            '.......o........',
            '......oyo.......',
            '.....oyyyo......',
            '....oyyyyyo.....',
            '...oyyyyyyyo....',
            '..ooooooooooo...',
            '..owwwowwwwo....',
            '..owwworrrro....',
            '..owwworrrro....',
            '..oooooooooo....'
        ], UI_PAL, 0, 3);
    }
    function drawUiChore(ctx) {
        stamp(ctx, [
            '.........yyy....',
            '........yooo....',
            '.......yo.......',
            '......yo........',
            '.....yo.........',
            '....yo..........',
            '...yoooo........',
            '..oooooo........',
            '.onnnnno........',
            '..oooo..........'
        ], UI_PAL, 0, 3);
    }
    function drawUiCart(ctx) {
        stamp(ctx, [
            '..oooooooo......',
            '..oyyyyyyo......',
            '..oyyyyyyo......',
            '..oooooooo......',
            '.o......o.......',
            'o........o......',
            'ooooooooooo.....',
            '..o.....o.......',
            '.ooo...ooo......',
            '..o.....o.......'
        ], UI_PAL, 0, 3);
    }
    function drawUiPack(ctx) {
        stamp(ctx, [
            '...oooooo.......',
            '..onnnnnno......',
            '.onoooooono.....',
            '.onoyyyono......',
            '.onooooono......',
            '.onnnnnnno......',
            '.oooooooo.......',
            '................'
        ], UI_PAL, 0, 4);
    }
    function drawUiClock(ctx) {
        stamp(ctx, [
            '....oooo........',
            '...owwwwo.......',
            '..owwokwwo......',
            '..owwokwwo......',
            '..owwwwowo......',
            '...owwwwo.......',
            '....oooo........',
            '................'
        ], UI_PAL, 0, 4);
    }
    function drawUiLock(ctx) {
        stamp(ctx, [
            '....oooo........',
            '...owwwo........',
            '...owwwo........',
            '..ooooooo.......',
            '..oyyyyyo.......',
            '..oyykyyo.......',
            '..oyyyyyo.......',
            '..ooooooo.......'
        ], UI_PAL, 0, 4);
    }

    const PORTAL_PAL = {
        '.': null,
        o: '#3d220c',
        w: '#c48a4a',
        W: '#e0b06a',
        g: '#ffe27a',
        G: '#fff6b0',
        d: '#6b421c'
    };

    function drawPortal(ctx, frame) {
        const glow = frame % 2 ? 'g' : 'G';
        const rows = [
            'owwwwwwwwwwwwo',
            'wddddddddddddw',
            'wd..........dw',
            'wd..' + glow + glow + glow + glow + glow + glow + '..dw',
            'wd.' + glow + 'GGGG' + glow + '.dw',
            'wd.' + glow + 'GGGG' + glow + '.dw',
            'wd.' + glow + 'GGGG' + glow + '.dw',
            'wd.' + glow + 'GGGG' + glow + '.dw',
            'wd.' + glow + 'GGGG' + glow + '.dw',
            'wd..' + glow + glow + glow + glow + glow + glow + '..dw',
            'wd..........dw',
            'wddddddddddddw',
            'owwwwwwwwwwwwo',
            '..............',
            '..............',
            '..............'
        ];
        stamp(ctx, rows, PORTAL_PAL, 1, 0);
    }

    const CLOUD_PAL = { '.': null, w: '#ffffff', s: '#e8f4ff' };
    const CLOUD_MAP = [
        '....wwww....',
        '..wwwwwwww..',
        '.wwsswwwwww.',
        'wwwwwwwwwwww',
        '.wwwwwwwwww.'
    ];

    function drawCloud(ctx) { stamp(ctx, CLOUD_MAP, CLOUD_PAL); }

    const HILL_PAL = { '.': null, h: '#6bb86a', d: '#4a9a4a', t: '#3d8a3d' };
    const HILL_MAP = [
        '........hh........',
        '......hhhhhh......',
        '....hhhhhhhhhh....',
        '...hhhdhhhhhdhh...',
        '..hhhhhhhhhhhhhh..',
        '.hhhhthhhhhhthhhh.',
        'hhhhhhhhhhhhhhhhhh'
    ];

    function drawHill(ctx) { stamp(ctx, HILL_MAP, HILL_PAL); }

    function bakeTile(drawFn, frames) {
        const count = frames || 1;
        const sheet = createCanvas(PIXEL * count, PIXEL);
        const sctx = sheet.getContext('2d');
        for (let f = 0; f < count; f += 1) {
            const tile = createCanvas(PIXEL, PIXEL);
            const tctx = tile.getContext('2d');
            if (count === 1) drawFn(tctx);
            else drawFn(tctx, f);
            sctx.drawImage(tile, f * PIXEL, 0);
        }
        return sheet;
    }

    function bakeSprite(drawFn, w, h, frames) {
        const count = frames || 1;
        const sheet = createCanvas(w * count, h);
        const sctx = sheet.getContext('2d');
        for (let f = 0; f < count; f += 1) {
            const frame = createCanvas(w, h);
            drawFn(frame.getContext('2d'), f);
            sctx.drawImage(frame, f * w, 0);
        }
        return sheet;
    }

    const tiles = {
        grass: bakeTile(drawGrass),
        dirt: bakeTile(drawDirt),
        stone: bakeTile(drawStone),
        wood: bakeTile(drawWood),
        plank: bakeTile(drawPlank),
        leaf: bakeTile(drawLeaf),
        sand: bakeTile(drawSand),
        water: bakeTile(drawWater, 4),
        coal: bakeTile(drawCoal),
        crystal: bakeTile(drawCrystal),
        bedrock: bakeTile(drawBedrock)
    };

    const sprites = {
        explorer: bakeSprite(drawExplorer, EXPLORER_W, EXPLORER_H, 4),
        spark: bakeSprite(drawSpark, 16, 16, 3),
        portal: bakeSprite(drawPortal, 16, 16, 2),
        cloud: bakeSprite(drawCloud, 12, 5, 1),
        hill: bakeSprite(drawHill, 18, 7, 1),
        hand: bakeSprite(drawHand, 16, 16, 1),
        wood_pick: bakeSprite(drawWoodPick, 16, 16, 1),
        stone_pick: bakeSprite(drawStonePick, 16, 16, 1),
        stick: bakeSprite(drawStick, 16, 16, 1),
        book: bakeSprite(drawUiBook, 16, 16, 1),
        life: bakeSprite(drawUiHome, 16, 16, 1),
        chore: bakeSprite(drawUiChore, 16, 16, 1),
        cart: bakeSprite(drawUiCart, 16, 16, 1),
        pack: bakeSprite(drawUiPack, 16, 16, 1),
        clock: bakeSprite(drawUiClock, 16, 16, 1),
        lock: bakeSprite(drawUiLock, 16, 16, 1)
    };

    const SPRITE_META = {
        explorer: { w: EXPLORER_W, h: EXPLORER_H, frames: 4 },
        spark: { w: 16, h: 16, frames: 3 },
        portal: { w: 16, h: 16, frames: 2 },
        cloud: { w: 12, h: 5, frames: 1 },
        hill: { w: 18, h: 7, frames: 1 },
        hand: { w: 16, h: 16, frames: 1 },
        wood_pick: { w: 16, h: 16, frames: 1 },
        stone_pick: { w: 16, h: 16, frames: 1 },
        stick: { w: 16, h: 16, frames: 1 },
        book: { w: 16, h: 16, frames: 1 },
        life: { w: 16, h: 16, frames: 1 },
        chore: { w: 16, h: 16, frames: 1 },
        cart: { w: 16, h: 16, frames: 1 },
        pack: { w: 16, h: 16, frames: 1 },
        clock: { w: 16, h: 16, frames: 1 },
        lock: { w: 16, h: 16, frames: 1 }
    };

    const TILE_FRAMES = { water: 4 };

    function drawTile(ctx, kind, dx, dy, tileSize, frame) {
        const sheet = tiles[kind];
        if (!sheet) return false;
        const frames = TILE_FRAMES[kind] || 1;
        const sx = ((frame || 0) % frames) * PIXEL;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, sx, 0, PIXEL, PIXEL, Math.round(dx), Math.round(dy), tileSize, tileSize);
        return true;
    }

    function drawSprite(ctx, name, dx, dy, w, h, frame) {
        const sheet = sprites[name];
        const meta = SPRITE_META[name];
        if (!sheet || !meta) return false;
        const sx = ((frame || 0) % meta.frames) * meta.w;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, sx, 0, meta.w, meta.h, Math.round(dx), Math.round(dy), w == null ? meta.w * SCALE : w, h == null ? meta.h * SCALE : h);
        return true;
    }

    function previewDataUrl(sheet, sw, sh, size) {
        if (!sheet) return '';
        const out = size || PIXEL * 3;
        const c = createCanvas(out, out);
        const cctx = c.getContext('2d');
        cctx.imageSmoothingEnabled = false;
        cctx.drawImage(sheet, 0, 0, sw || PIXEL, sh || PIXEL, 0, 0, out, out);
        return c.toDataURL('image/png');
    }

    function tilePreviewDataUrl(kind, size) {
        return previewDataUrl(tiles[kind], PIXEL, PIXEL, size);
    }

    function iconPreviewDataUrl(name, size) {
        const sheet = sprites[name] || tiles[name];
        const meta = SPRITE_META[name];
        return previewDataUrl(sheet, meta ? meta.w : PIXEL, meta ? meta.h : PIXEL, size);
    }

    function kindIcon(kind, size) {
        if (tiles[kind]) return tilePreviewDataUrl(kind, size);
        return iconPreviewDataUrl(kind, size);
    }

    window.VoxelPixelTiles = {
        PIXEL: PIXEL,
        SCALE: SCALE,
        EXPLORER_W: EXPLORER_W,
        EXPLORER_H: EXPLORER_H,
        tiles: tiles,
        sprites: sprites,
        SPRITE_META: SPRITE_META,
        drawTile: drawTile,
        drawSprite: drawSprite,
        tilePreviewDataUrl: tilePreviewDataUrl,
        iconPreviewDataUrl: iconPreviewDataUrl,
        kindIcon: kindIcon
    };
})();
