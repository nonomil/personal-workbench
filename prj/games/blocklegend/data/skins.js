/**
 * blocklegend · 原像素皮肤（64×64，我的世界展开，非 Mojang 贴图）
 * 纯数据，无 DOM / three.js。浏览器挂 window.BlockLegendSkins。
 */
(function (global) {
    'use strict';

    const KINDS = ['slime', 'cube', 'husk', 'fox', 'magma', 'blaze', 'ghast', 'warden', 'merchant', 'boss'];

    function put(img, x, y, c) {
        if (x < 0 || y < 0 || x >= 64 || y >= 64) return;
        const i = (y * 64 + x) * 4;
        img[i] = c[0];
        img[i + 1] = c[1];
        img[i + 2] = c[2];
        img[i + 3] = c[3] == null ? 255 : c[3];
    }

    function rect(img, x, y, w, h, c) {
        for (let j = 0; j < h; j += 1) {
            for (let i = 0; i < w; i += 1) put(img, x + i, y + j, c);
        }
    }

    function jitter(c, n) {
        const j = ((n % 7) - 3) * 6;
        return [
            Math.max(0, Math.min(255, c[0] + j)),
            Math.max(0, Math.min(255, c[1] + j)),
            Math.max(0, Math.min(255, c[2] + j)),
            255
        ];
    }

    function fill(img, x, y, w, h, c) {
        for (let j = 0; j < h; j += 1) {
            for (let i = 0; i < w; i += 1) put(img, x + i, y + j, jitter(c, i * 13 + j * 29 + x + y));
        }
    }

    function fillBox(img, u, v, w, h, d, c, bottom) {
        fill(img, u + d, v, w, d, c);
        fill(img, u + d + w, v, w, d, bottom || c);
        fill(img, u, v + d, d, h, c);
        fill(img, u + d, v + d, w, h, c);
        fill(img, u + d + w, v + d, d, h, c);
        fill(img, u + d + w + d, v + d, w, h, c);
    }

    function facePixels(img, x, y, w, h) {
        const out = [];
        for (let j = 0; j < h; j += 1) {
            for (let i = 0; i < w; i += 1) {
                const p = ((y + j) * 64 + (x + i)) * 4;
                out.push([img[p], img[p + 1], img[p + 2], img[p + 3]]);
            }
        }
        return out;
    }

    function paintEyes(img, x, y, eye, glow) {
        put(img, x + 1, y + 2, eye);
        put(img, x + 2, y + 2, glow || eye);
        put(img, x + 5, y + 2, glow || eye);
        put(img, x + 6, y + 2, eye);
        put(img, x + 1, y + 3, eye);
        put(img, x + 2, y + 3, eye);
        put(img, x + 5, y + 3, eye);
        put(img, x + 6, y + 3, eye);
    }

    function paintMouth(img, x, y, c) {
        put(img, x + 2, y + 5, c);
        put(img, x + 3, y + 6, c);
        put(img, x + 4, y + 6, c);
        put(img, x + 5, y + 5, c);
    }

    function paintHumanoid(img, pal) {
        fillBox(img, 0, 0, 8, 8, 8, pal.skin, pal.dark);
        fillBox(img, 16, 16, 8, 12, 4, pal.shirt, pal.dark);
        fillBox(img, 40, 16, 4, 12, 4, pal.skin, pal.dark);
        fillBox(img, 0, 16, 4, 12, 4, pal.pants, pal.dark);
        fillBox(img, 32, 48, 4, 12, 4, pal.skin, pal.dark);
        fillBox(img, 16, 48, 4, 12, 4, pal.pants, pal.dark);
        paintEyes(img, 8, 8, pal.eye, pal.glow);
        paintMouth(img, 8, 8, pal.mouth);
        if (pal.brow) {
            rect(img, 9, 9, 2, 1, pal.brow);
            rect(img, 13, 9, 2, 1, pal.brow);
        }
    }

    function paintCube16(img, pal) {
        fillBox(img, 0, 0, 16, 16, 16, pal.base, pal.dark);
        paintEyes(img, 20, 20, pal.eye, pal.glow);
        put(img, 20 + 2, 20 + 3, pal.eye);
        put(img, 20 + 5, 20 + 3, pal.eye);
        paintMouth(img, 20, 20, pal.mouth);
        rect(img, 22, 22, 4, 2, pal.light || pal.base);
    }

    function paintSkin(kind, img) {
        const k = String(kind || 'husk');
        if (k === 'slime') {
            paintCube16(img, {
                base: [92, 186, 74], dark: [46, 112, 40], light: [168, 226, 130],
                eye: [22, 36, 18], glow: [210, 250, 180], mouth: [28, 44, 22]
            });
        } else if (k === 'magma') {
            paintCube16(img, {
                base: [168, 52, 22], dark: [72, 18, 10], light: [255, 140, 40],
                eye: [20, 8, 6], glow: [255, 180, 60], mouth: [40, 12, 8]
            });
            for (let i = 0; i < 18; i += 1) {
                put(img, 16 + (i * 3) % 16, 16 + (i * 5) % 16, [255, 110, 30]);
            }
        } else if (k === 'ghast') {
            paintCube16(img, {
                base: [236, 230, 224], dark: [196, 188, 180], light: [255, 252, 248],
                eye: [36, 32, 40], glow: [20, 16, 24], mouth: [48, 40, 48]
            });
            rect(img, 21, 26, 6, 2, [48, 40, 48]);
        } else if (k === 'cube') {
            paintCube16(img, {
                base: [196, 122, 58], dark: [120, 68, 32], light: [230, 168, 96],
                eye: [40, 24, 14], glow: [255, 210, 120], mouth: [60, 32, 16]
            });
        } else if (k === 'fox') {
            paintCube16(img, {
                base: [224, 122, 40], dark: [168, 72, 20], light: [244, 210, 166],
                eye: [32, 20, 12], glow: [255, 236, 180], mouth: [80, 40, 20]
            });
        } else if (k === 'husk') {
            paintHumanoid(img, {
                skin: [138, 142, 120], dark: [78, 80, 70], shirt: [74, 96, 64],
                pants: [62, 64, 70], eye: [28, 24, 20], glow: [255, 170, 60],
                mouth: [40, 32, 28], brow: [50, 48, 40]
            });
        } else if (k === 'merchant') {
            paintHumanoid(img, {
                skin: [224, 178, 126], dark: [168, 120, 80], shirt: [52, 98, 196],
                pants: [40, 70, 150], eye: [52, 38, 28], glow: [255, 236, 200],
                mouth: [160, 90, 70], brow: [90, 60, 36]
            });
            fill(img, 8, 0, 8, 8, [44, 44, 52]);
        } else if (k === 'warden') {
            paintHumanoid(img, {
                skin: [22, 52, 62], dark: [10, 24, 30], shirt: [18, 40, 48],
                pants: [14, 28, 36], eye: [10, 16, 18], glow: [58, 220, 230],
                mouth: [40, 200, 210]
            });
            rect(img, 22, 24, 4, 5, [58, 220, 230]);
            rect(img, 23, 25, 2, 3, [180, 255, 255]);
        } else if (k === 'blaze') {
            fillBox(img, 0, 0, 8, 8, 8, [255, 188, 64], [196, 90, 20]);
            paintEyes(img, 8, 8, [40, 16, 8], [255, 240, 160]);
            paintMouth(img, 8, 8, [80, 24, 10]);
            fillBox(img, 16, 16, 4, 12, 4, [196, 110, 32], [120, 50, 16]);
        } else if (k === 'boss') {
            paintHumanoid(img, {
                skin: [104, 70, 120], dark: [48, 28, 58], shirt: [58, 32, 72],
                pants: [36, 22, 48], eye: [60, 12, 12], glow: [255, 64, 48],
                mouth: [20, 8, 12], brow: [30, 16, 36]
            });
        } else {
            paintHumanoid(img, {
                skin: [138, 142, 148], dark: [80, 84, 90], shirt: [74, 106, 72],
                pants: [62, 64, 70], eye: [28, 24, 20], glow: [255, 200, 80],
                mouth: [40, 32, 28]
            });
        }
    }

    function createSkinImage(kind) {
        const data = new Uint8ClampedArray(64 * 64 * 4);
        paintSkin(kind, data);
        return data;
    }

    global.BlockLegendSkins = {
        KINDS: KINDS,
        kinds: KINDS,
        paintSkin: paintSkin,
        createSkinImage: createSkinImage,
        facePixels: facePixels,
        fillBox: fillBox
    };
}(typeof window !== 'undefined' ? window : globalThis));
