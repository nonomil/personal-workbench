(function () {
    'use strict';

    /**
     * 横版闯关 · Paper-MC 风原创像素装饰（与 voxel-adventure/pixel-tiles.js 同调色板）。
     * 艺术像素 = 2 屏幕像素；所有 painter 直接画到主 ctx，整数对齐。
     */
    const P = 2;

    const C = {
        ink: '#2a1a10',
        grass: '#4fbf3a', grassHi: '#8eef5c', grassLo: '#2f8a24', grassMid: '#3aa02c',
        dirt: '#8a5a2b', dirtDark: '#6b421c', dirtHi: '#b07a3d', dirtEdge: '#5a3314',
        brick: '#c65a22', brickHi: '#e08a4a', brickLo: '#8a3c18', mortar: '#5a2c14',
        gold: '#f0c14a', goldHi: '#ffe27a', goldLo: '#c48a1c', cream: '#fff4d6',
        coin: '#ffd02f', coinHi: '#fff0a0', coinLo: '#c48a1c',
        pipe: '#2eb67a', pipeHi: '#6ee066', pipeLo: '#1e8a58', pipeInk: '#145c38',
        pole: '#8d9198', poleHi: '#c2c6cc', poleLo: '#5e636b',
        red: '#e85d2a', redHi: '#ff8a4a'
    };

    function createCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    function fill(ctx, x, y, w, h, color) {
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

    function bevel(ctx, size, light, dark) {
        fill(ctx, 0, 0, size, 1, light);
        fill(ctx, 0, 0, 1, size, light);
        fill(ctx, 0, size - 1, size, 1, dark);
        fill(ctx, size - 1, 0, 1, size, dark);
    }

    /* ---------- 20×20 砖块 / 问号块 ---------- */

    function drawBrickArt(ctx) {
        const s = 20;
        fill(ctx, 0, 0, s, s, C.brick);
        fill(ctx, 0, 9, s, 2, C.mortar);
        fill(ctx, 0, 0, s, 1, C.brickHi);
        fill(ctx, 0, 1, s, 1, C.brickHi);
        fill(ctx, 0, 0, 1, 9, C.brickHi);
        fill(ctx, 10, 0, 2, 9, C.mortar);
        fill(ctx, 5, 11, 2, 9, C.mortar);
        fill(ctx, 15, 11, 2, 9, C.mortar);
        fill(ctx, 2, 3, 3, 1, C.brickHi);
        fill(ctx, 13, 5, 3, 1, C.brickHi);
        fill(ctx, 7, 13, 3, 1, C.brickHi);
        fill(ctx, 17, 15, 2, 1, C.brickLo);
        fill(ctx, 2, 16, 2, 1, C.brickLo);
        fill(ctx, 0, 11, s, 1, C.brickHi);
        fill(ctx, 0, 19, s, 1, C.brickLo);
        fill(ctx, 19, 0, 1, s, C.brickLo);
    }

    const Q_PAL = { '.': null, k: C.ink, w: C.cream, s: C.goldLo };

    function drawQuestionArt(ctx, hit) {
        const s = 20;
        if (hit) {
            fill(ctx, 0, 0, s, s, '#9a7a3a');
            bevel(ctx, s, '#b8985a', '#6a4a1a');
            fill(ctx, 8, 8, 4, 4, '#6a4a1a');
            return;
        }
        fill(ctx, 0, 0, s, s, C.gold);
        bevel(ctx, s, C.goldHi, C.goldLo);
        // 四角铆钉
        px(ctx, 2, 2, C.coinLo); px(ctx, 17, 2, C.coinLo);
        px(ctx, 2, 17, C.coinLo); px(ctx, 17, 17, C.coinLo);
        stamp(ctx, [
            '..kkkk..',
            '.kkwwkk.',
            '.kkwwkk.',
            '....kk..',
            '...kk...',
            '...kk...',
            '........',
            '...kk...',
            '...kk...'
        ], Q_PAL, 6, 5);
    }

    /* ---------- 12×12 金币（4 帧旋转） ---------- */

    const COIN_PAL = { '.': null, k: '#8a5a10', g: C.coin, G: C.coinHi, d: C.coinLo, w: '#fffbe0' };

    const COIN_FRAMES = [
        [
            '....kkkk....',
            '..kkgGGgkk..',
            '.kgGwwwwGgk.',
            '.kGwggggwGk.',
            'kGwggddggwGk',
            'kGwgdwwdgwGk',
            'kGwgdwwdgwGk',
            'kGwggddggwGk',
            '.kGwggggwGk.',
            '.kgGwwwwGgk.',
            '..kkgGGgkk..',
            '....kkkk....'
        ],
        [
            '.....kk.....',
            '....kGGk....',
            '...kGwwGk...',
            '...kGwwGk...',
            '..kGgwwgGk..',
            '..kGgwwgGk..',
            '..kGgwwgGk..',
            '..kGgwwgGk..',
            '...kGwwGk...',
            '...kGwwGk...',
            '....kGGk....',
            '.....kk.....'
        ],
        [
            '.....kk.....',
            '.....kGk....',
            '.....kGk....',
            '.....kdk....',
            '.....kdk....',
            '.....kdk....',
            '.....kdk....',
            '.....kdk....',
            '.....kdk....',
            '.....kGk....',
            '.....kGk....',
            '.....kk.....'
        ],
        [
            '.....kk.....',
            '....kGGk....',
            '...kGwwGk...',
            '...kGwwGk...',
            '..kGgwwgGk..',
            '..kGgwwgGk..',
            '..kGgwwgGk..',
            '..kGgwwgGk..',
            '...kGwwGk...',
            '...kGwwGk...',
            '....kGGk....',
            '.....kk.....'
        ]
    ];

    /* ---------- 16×13 星星（2 帧闪烁） ---------- */

    const STAR_PAL = { '.': null, k: '#8a6a10', y: C.goldHi, d: C.gold };

    const STAR_FRAMES = [
        [
            '.......kk.......',
            '......kyyk......',
            '......kyyk......',
            '.....kyyyyk.....',
            '.....kyyyyk.....',
            'kkyyyyyyyyyyyykk',
            '.kdyyyyyyyyyydk.',
            '..kdyyyyyyyydk..',
            '...kdyyyyyydk...',
            '...kdyykkydk....',
            '..kdyk...kydk...',
            '.kdk.......kdk..',
            '.kk.........kk..'
        ],
        [
            '.......kk.......',
            '......kywk......',
            '......kywk......',
            '.....kywwyk.....',
            '.....kywwyk.....',
            'kkyywwyyyyyywwkk',
            '.kdyywyyyyyyddk.',
            '..kdyywyyyyddk..',
            '...kdyywwyydk...',
            '...kdyykkydk....',
            '..kdyk...kydk...',
            '.kdk.......kdk..',
            '.kk.........kk..'
        ]
    ];

    /* ---------- 14×14 蘑菇 ---------- */

    const SHROOM_PAL = { '.': null, k: C.ink, r: C.red, R: C.redHi, w: C.cream, s: '#f2c39a', e: C.ink };

    const SHROOM_MAP = [
        '....kkkkkk....',
        '..kkrrrrrrkk..',
        '.krrwwrrwwrrk.',
        '.krwwwwrwwwwk.',
        'krrwwrrrrwwrrk',
        'krrrrrwwrrrrrk',
        'krrrrrrrrrrrrk',
        '.kkkkkkkkkkkk.',
        '..kssssssssk..',
        '..ksessssesk..',
        '..ksessssesk..',
        '..kssssssssk..',
        '..kssssssssk..',
        '..kkkkkkkkkk..'
    ];

    function bake(w, h, frames, drawFn) {
        const sheet = createCanvas(w * frames, h);
        const sctx = sheet.getContext('2d');
        for (let f = 0; f < frames; f += 1) {
            const c = createCanvas(w, h);
            drawFn(c.getContext('2d'), f);
            sctx.drawImage(c, f * w, 0);
        }
        return sheet;
    }

    const sheets = {
        brick: bake(20, 20, 1, drawBrickArt),
        question: bake(20, 20, 2, function (c, f) { drawQuestionArt(c, f === 1); }),
        coin: bake(12, 12, 4, function (c, f) { stamp(c, COIN_FRAMES[f], COIN_PAL); }),
        star: bake(16, 13, 2, function (c, f) { stamp(c, STAR_FRAMES[f], STAR_PAL); }),
        shroom: bake(14, 14, 1, function (c) { stamp(c, SHROOM_MAP, SHROOM_PAL); })
    };

    const META = {
        brick: { w: 20, h: 20, frames: 1 },
        question: { w: 20, h: 20, frames: 2 },
        coin: { w: 12, h: 12, frames: 4 },
        star: { w: 16, h: 13, frames: 2 },
        shroom: { w: 14, h: 14, frames: 1 }
    };

    function drawSheet(ctx, name, x, y, size, frame) {
        const sheet = sheets[name];
        const meta = META[name];
        if (!sheet || !meta) return false;
        const f = (frame || 0) % meta.frames;
        const side = Math.round(size / P) * P;
        const h = Math.round(side * meta.h / meta.w / P) * P;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, f * meta.w, 0, meta.w, meta.h, Math.round(x), Math.round(y), side, h);
        return true;
    }

    /* ---------- 任意尺寸 painter（2px 网格矩形） ---------- */

    function grassCap(ctx, x, y, w, hPx) {
        // 草皮帽:顶部高光 2px + 草绿 6px + 深绿咬合线
        fill(ctx, x, y, w, 2, C.grassHi);
        fill(ctx, x, y + 2, w, 6, C.grass);
        for (let i = 0; i < w; i += P) {
            if ((i / P) % 3 === 0) fill(ctx, x + i, y + 2, P, P, C.grassMid);
            if ((i / P) % 4 === 1) fill(ctx, x + i, y, P, P, C.grassHi);
        }
        fill(ctx, x, y + 8, w, hPx - 8 > 0 ? hPx - 8 : 0, C.grassLo);
    }

    function platformSlice(ctx, x, y, w, h) {
        grassCap(ctx, x, y, w, 10);
        const dirtH = h - 10;
        if (dirtH <= 0) return;
        fill(ctx, x, y + 10, w, dirtH, C.dirt);
        for (let i = 0; i < w; i += P) {
            if ((i / P) % 5 === 2) fill(ctx, x + i, y + 10 + ((i / P) % 4) * P, P, P, C.dirtDark);
            if ((i / P) % 7 === 4) fill(ctx, x + i, y + 10 + ((i / P) % 3) * P, P, P, C.dirtHi);
        }
        fill(ctx, x, y + h - 2, w, 2, C.dirtEdge);
    }

    function pipe(ctx, x, y, w, h) {
        const rimH = 16;
        const bodyX = x + 6;
        const bodyW = w - 12;
        // 管身
        fill(ctx, bodyX, y + rimH, bodyW, h - rimH, C.pipe);
        fill(ctx, bodyX + 4, y + rimH, 6, h - rimH, C.pipeHi);
        fill(ctx, bodyX + bodyW - 8, y + rimH, 4, h - rimH, C.pipeLo);
        fill(ctx, bodyX - 2, y + rimH, 2, h - rimH, C.pipeInk);
        fill(ctx, bodyX + bodyW, y + rimH, 2, h - rimH, C.pipeInk);
        // 管口
        fill(ctx, x, y, w, rimH, C.pipe);
        fill(ctx, x, y, w, 2, C.pipeHi);
        fill(ctx, x + 4, y + 2, 6, rimH - 4, C.pipeHi);
        fill(ctx, x + w - 10, y + 2, 6, rimH - 4, C.pipeLo);
        fill(ctx, x, y + rimH - 2, w, 2, C.pipeLo);
        // 描边
        ctx.fillStyle = C.pipeInk;
        ctx.fillRect(x, y, 2, rimH);
        ctx.fillRect(x + w - 2, y, 2, rimH);
        ctx.fillRect(x, y, w, 2);
    }

    function flag(ctx, x, y, w, h, frame) {
        // 旗杆
        fill(ctx, x, y, 4, h, C.pole);
        fill(ctx, x, y, 2, h, C.poleHi);
        fill(ctx, x + 3, y, 1, h, C.poleLo);
        // 顶球
        fill(ctx, x - 2, y - 4, 8, 6, C.gold);
        fill(ctx, x - 2, y - 4, 4, 3, C.goldHi);
        // 旗面:红白棋盘,两帧飘动
        const fw = 30;
        const fh = 20;
        const fy = y + 6 + (frame % 2 ? 2 : 0);
        for (let r = 0; r < 4; r += 1) {
            for (let c = 0; c < 5; c += 1) {
                const cw = 6;
                const chh = 5;
                const wave = Math.sin((c / 5) * Math.PI * 2 + (frame % 2 ? Math.PI : 0)) * 2;
                const cellY = fy + r * chh + Math.round(wave);
                fill(ctx, x + 4 + c * cw, cellY, cw, chh, (r + c) % 2 ? C.red : C.cream);
            }
        }
    }

    function checkpoint(ctx, x, y, w, h, saved) {
        // 小旗标记杆(放在检查点区左侧)
        const px0 = Math.round(x + w / 2 - 2);
        fill(ctx, px0, y + h - 30, 3, 30, C.pole);
        fill(ctx, px0, y + h - 30, 1, 30, C.poleHi);
        const base = saved ? C.goldHi : '#7ec8ff';
        const edge = saved ? C.gold : '#3d7bdc';
        fill(ctx, px0 + 3, y + h - 30, 14, 9, base);
        fill(ctx, px0 + 3, y + h - 30, 14, 2, edge);
        fill(ctx, px0 + 3, y + h - 23, 14, 2, edge);
    }

    window.PlatformPixelDecor = {
        P: P,
        sheets: sheets,
        drawBrick: function (ctx, x, y, size) { return drawSheet(ctx, 'brick', x, y, size, 0); },
        drawQuestion: function (ctx, x, y, size, hit) { return drawSheet(ctx, 'question', x, y, size, hit ? 1 : 0); },
        drawCoin: function (ctx, x, y, size, frame) { return drawSheet(ctx, 'coin', x, y, size, frame); },
        drawStar: function (ctx, x, y, size, frame) { return drawSheet(ctx, 'star', x, y, size, frame); },
        drawShroom: function (ctx, x, y, size) { return drawSheet(ctx, 'shroom', x, y, size, 0); },
        platformSlice: platformSlice,
        pipe: pipe,
        flag: flag,
        checkpoint: checkpoint
    };
})();
