/**
 * blocklegend · 原像素皮肤（64×64，我的世界展开，非 Mojang 贴图）
 * 纯数据，无 DOM / three.js。浏览器挂 window.BlockLegendSkins。
 */
(function (global) {
    'use strict';

    const KINDS = [
        'slime', 'cube', 'husk', 'fox', 'magma', 'blaze', 'ghast', 'warden', 'merchant', 'boss',
        'skeleton', 'spider', 'enderman', 'piglin', 'witch', 'wither', 'chest', 'furnace',
        'pig', 'cow', 'sheep', 'chicken', 'wolf', 'villager', 'dragon', 'storm'
    ];

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
        } else if (k === 'skeleton') {
            paintHumanoid(img, {
                skin: [232, 216, 184], dark: [168, 148, 120], shirt: [220, 200, 168],
                pants: [210, 190, 158], eye: [24, 16, 12], glow: [8, 6, 4],
                mouth: [40, 28, 20]
            });
            fill(img, 8, 8, 8, 8, [232, 216, 184]);
            rect(img, 9, 10, 2, 2, [18, 12, 8]);
            rect(img, 13, 10, 2, 2, [18, 12, 8]);
            put(img, 10, 13, [48, 32, 24]);
            put(img, 12, 13, [48, 32, 24]);
            put(img, 11, 14, [48, 32, 24]);
            put(img, 13, 14, [48, 32, 24]);
        } else if (k === 'spider') {
            paintCube16(img, {
                base: [58, 36, 24], dark: [28, 16, 10], light: [90, 56, 36],
                eye: [20, 8, 6], glow: [240, 220, 180], mouth: [40, 16, 10]
            });
            [[20, 20], [25, 20], [22, 18], [27, 18]].forEach(function (e) {
                put(img, e[0], e[1], [240, 220, 180]);
                put(img, e[0] + 1, e[1], [180, 40, 30]);
            });
        } else if (k === 'enderman') {
            paintHumanoid(img, {
                skin: [16, 16, 24], dark: [8, 8, 12], shirt: [18, 18, 28],
                pants: [12, 12, 18], eye: [8, 4, 16], glow: [200, 76, 255],
                mouth: [12, 8, 20]
            });
            rect(img, 9, 10, 2, 1, [200, 76, 255]);
            rect(img, 13, 10, 2, 1, [200, 76, 255]);
        } else if (k === 'piglin') {
            paintHumanoid(img, {
                skin: [232, 168, 120], dark: [180, 110, 70], shirt: [107, 68, 36],
                pants: [74, 44, 24], eye: [40, 20, 12], glow: [255, 220, 160],
                mouth: [160, 80, 50], brow: [90, 50, 30]
            });
            rect(img, 10, 12, 4, 2, [240, 184, 136]);
        } else if (k === 'witch') {
            paintHumanoid(img, {
                skin: [138, 154, 106], dark: [80, 90, 60], shirt: [90, 42, 120],
                pants: [58, 24, 80], eye: [26, 32, 16], glow: [40, 48, 20],
                mouth: [70, 80, 50], brow: [50, 40, 28]
            });
            put(img, 12, 12, [90, 70, 50]);
            fill(img, 8, 0, 8, 8, [26, 26, 34]);
        } else if (k === 'wither') {
            paintHumanoid(img, {
                skin: [22, 22, 28], dark: [10, 10, 14], shirt: [28, 28, 34],
                pants: [16, 16, 20], eye: [8, 8, 10], glow: [248, 248, 248],
                mouth: [236, 236, 236]
            });
            rect(img, 8, 8, 8, 8, [22, 22, 28]);
            rect(img, 8, 8, 8, 1, [36, 36, 42]);
            rect(img, 9, 10, 2, 1, [248, 248, 248]);
            rect(img, 13, 10, 2, 1, [248, 248, 248]);
            rect(img, 10, 13, 4, 1, [236, 236, 236]);
        } else if (k === 'pig') {
            paintCube16(img, {
                base: [232, 150, 168], dark: [180, 90, 110], light: [248, 190, 200],
                eye: [32, 16, 16], glow: [255, 230, 220], mouth: [160, 70, 80]
            });
            rect(img, 22, 24, 4, 2, [224, 130, 148]);
        } else if (k === 'cow') {
            paintCube16(img, {
                base: [92, 62, 36], dark: [48, 30, 16], light: [244, 236, 220],
                eye: [20, 12, 8], glow: [255, 240, 210], mouth: [40, 24, 16]
            });
            rect(img, 18, 18, 3, 3, [244, 236, 220]);
            rect(img, 26, 22, 4, 3, [244, 236, 220]);
        } else if (k === 'sheep') {
            paintCube16(img, {
                base: [236, 232, 224], dark: [40, 32, 24], light: [255, 252, 246],
                eye: [20, 16, 12], glow: [255, 255, 255], mouth: [36, 28, 20]
            });
            rect(img, 20, 20, 8, 8, [48, 36, 26]);
        } else if (k === 'chicken') {
            paintCube16(img, {
                base: [240, 236, 228], dark: [200, 80, 60], light: [255, 252, 246],
                eye: [24, 16, 12], glow: [255, 220, 80], mouth: [230, 160, 40]
            });
            rect(img, 22, 18, 4, 2, [220, 48, 48]);
        } else if (k === 'wolf') {
            paintCube16(img, {
                base: [168, 168, 176], dark: [80, 80, 88], light: [236, 236, 240],
                eye: [20, 16, 12], glow: [255, 220, 80], mouth: [40, 28, 24]
            });
        } else if (k === 'villager') {
            paintHumanoid(img, {
                skin: [224, 178, 126], dark: [168, 120, 80], shirt: [90, 58, 36],
                pants: [62, 40, 24], eye: [40, 28, 20], glow: [255, 236, 200],
                mouth: [160, 90, 70], brow: [70, 48, 28]
            });
        } else if (k === 'dragon') {
            paintHumanoid(img, {
                skin: [28, 16, 40], dark: [12, 8, 18], shirt: [48, 24, 72],
                pants: [20, 12, 32], eye: [8, 4, 12], glow: [180, 80, 255],
                mouth: [12, 8, 16]
            });
        } else if (k === 'storm') {
            paintHumanoid(img, {
                skin: [18, 18, 22], dark: [8, 8, 10], shirt: [30, 30, 36],
                pants: [12, 12, 16], eye: [8, 8, 10], glow: [248, 248, 248],
                mouth: [236, 236, 236]
            });
            rect(img, 8, 8, 8, 8, [18, 18, 22]);
            rect(img, 9, 10, 2, 1, [248, 248, 248]);
            rect(img, 13, 10, 2, 1, [248, 248, 248]);
        } else if (k === 'chest') {
            fillBox(img, 0, 0, 16, 12, 8, [138, 90, 40], [90, 58, 28]);
            for (let y = 8; y < 20; y += 3) rect(img, 8, y, 16, 1, [90, 58, 28]);
            rect(img, 8, 8, 16, 2, [74, 46, 22]);
            rect(img, 15, 14, 2, 6, [224, 176, 64]);
            rect(img, 14, 16, 4, 3, [196, 148, 48]);
            rect(img, 8, 19, 16, 1, [74, 46, 22]);
        } else if (k === 'furnace') {
            fillBox(img, 0, 0, 16, 16, 8, [122, 122, 128], [70, 70, 76]);
            for (let y = 8; y < 24; y += 4) rect(img, 8, y, 16, 1, [70, 70, 76]);
            rect(img, 12, 12, 8, 2, [48, 48, 52]);
            rect(img, 12, 18, 8, 6, [20, 16, 14]);
            rect(img, 14, 20, 4, 3, [255, 138, 42]);
            rect(img, 15, 21, 2, 2, [255, 220, 120]);
            rect(img, 10, 10, 2, 2, [90, 90, 96]);
            rect(img, 20, 10, 2, 2, [90, 90, 96]);
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
