/**
 * blocklegend · 引擎层（T20260815-blocklegend-3d S1 + 体素地面）
 * three.js r147 UMD（本地 vendor，禁 CDN）。
 * 职责：种子化 192×192 多气候世界 + 按玩家半径流式区块 + 第一人称控制。
 * 体素填充/遮挡裁剪改自 dgreenheck/minecraft-threejs-clone（WorldChunk.generateTerrain
 * + isBlockObscured）：列内从 y=0 填到地表，只画邻格为空的单位面。
 * 区块流式改自同仓 scripts/world.js drawDistance：只建玩家半径内区块，离开则 dispose。
 * 性能约束（MuMu WebView）：低模、每区块一次 draw call、pixelRatio ≤ 1.5、无阴影。
 */
(function (global) {
    'use strict';

    /* ---------- 常量（集中文件头，便于调参与审查） ---------- */
    const WORLD_SIZE = 192;     // 世界边长（格）→ 12×12 区块
    const CHUNK = 16;           // 区块边长
    const VIEW_CHUNKS = 3;      // 玩家周围半径（区块）
    const BOOT_CHUNKS = 1;      // 首屏只建 3×3
    const PIXEL_RATIO_CAP = 1.5;
    const EYE_HEIGHT = 1.62;
    const MOVE_SPEED = 4.2;     // 格/秒
    const JUMP_VY = 7.2;        // 格/秒
    const GRAVITY = 22;         // 格/秒²
    const STEP_UP = 1.05;       // 允许跨 1 格台阶
    const MAX_DT = 0.05;        // 挂起恢复时防大步长穿地
    const HEIGHT_MIN = 2;
    const HEIGHT_MAX = 16;
    const TREE_COUNT = 96;
    const FLOWER_COUNT = 160;
    const BIOME_NAMES = ['plains', 'forest', 'desert', 'mountain', 'snow'];
    const CLIMATES = {
        plains: { temp: 0.55, moist: 0.42, hMin: 3, hMax: 9, trees: 90, flowers: 140, oak: 0.5, birch: 0.28, spruce: 0.22, sky: 0x7ec8f0 },
        forest: { temp: 0.48, moist: 0.78, hMin: 3, hMax: 11, trees: 210, flowers: 70, oak: 0.32, birch: 0.22, spruce: 0.46, sky: 0x6aa87a },
        quarry: { temp: 0.42, moist: 0.22, hMin: 5, hMax: 16, trees: 32, flowers: 28, oak: 0.18, birch: 0.12, spruce: 0.7, sky: 0x9aa4b0 },
        duskvale: { temp: 0.5, moist: 0.58, hMin: 2, hMax: 8, trees: 72, flowers: 200, oak: 0.4, birch: 0.42, spruce: 0.18, sky: 0xc48a6a },
        crystal: { temp: 0.34, moist: 0.7, hMin: 4, hMax: 13, trees: 170, flowers: 40, oak: 0.08, birch: 0.14, spruce: 0.78, sky: 0x7aa8c8 },
        astral: { temp: 0.16, moist: 0.38, hMin: 6, hMax: 16, trees: 48, flowers: 16, oak: 0, birch: 0.12, spruce: 0.88, sky: 0xc8d4e8 }
    };
    const ATLAS_TILE = 16;
    const ATLAS_COLS = 4;
    const ATLAS_ROWS = 5;       // 20 格：14 地形 + 4 裂纹 + 2 备用
    const CRACK_TILE0 = 16;     // 第 5 行：crack 0–3

    /* ---------- 确定性随机 ---------- */
    function makeRng(seed) {
        let s = (seed >>> 0) || 1;
        return function () {
            s ^= s << 13; s >>>= 0;
            s ^= s >> 17;
            s ^= s << 5; s >>>= 0;
            return s / 4294967296;
        };
    }
    function hash3(x, y, z) {
        let h = (x * 374761393 + y * 668265263 + z * 2147483647) >>> 0;
        h = (h ^ (h >> 13)) * 1274126177;
        return ((h ^ (h >> 16)) >>> 0) / 4294967296;
    }

    function climateOf(name) {
        return CLIMATES[name] || CLIMATES.plains;
    }

    function makeGrid(rng, coarse) {
        const grid = [];
        for (let i = 0; i <= coarse; i += 1) {
            grid.push([]);
            for (let j = 0; j <= coarse; j += 1) grid[i].push(rng());
        }
        return grid;
    }

    function sampleGrid(grid, coarse, n, x, z) {
        const smooth = function (t) { return t * t * (3 - 2 * t); };
        const fx = x / n * coarse, fz = z / n * coarse;
        const x0 = Math.min(coarse - 1, Math.floor(fx)), z0 = Math.min(coarse - 1, Math.floor(fz));
        const tx = smooth(fx - x0), tz = smooth(fz - z0);
        const a = grid[z0][x0] * (1 - tx) + grid[z0][x0 + 1] * tx;
        const b = grid[z0 + 1][x0] * (1 - tx) + grid[z0 + 1][x0 + 1] * tx;
        return a * (1 - tz) + b * tz;
    }

    function pickBiome(temp, moist, height01) {
        if (temp < 0.28) return 4;
        if (temp > 0.74 && moist < 0.38) return 2;
        if (height01 > 0.72 || (moist < 0.3 && temp < 0.55)) return 3;
        if (moist > 0.62) return 1;
        return 0;
    }

    function biomeAt(world, x, z) {
        if (!world || x < 0 || z < 0 || x >= world.size || z >= world.size) return 'plains';
        if (!world.biomes) return world.climate || 'plains';
        return BIOME_NAMES[world.biomes[z * world.size + x]] || 'plains';
    }

    /* ---------- 世界生成（纯数据，node 可测） ---------- */
    function createWorld(seed, options) {
        const opts = options || {};
        const climateName = opts.climate || 'plains';
        const climate = climateOf(climateName);
        const rng = makeRng(seed || 7);
        const n = WORLD_SIZE;
        const heightGrid = makeGrid(rng, 12);
        const tempGrid = makeGrid(rng, 6);
        const moistGrid = makeGrid(rng, 6);
        const heights = new Uint8Array(n * n);
        const biomes = new Uint8Array(n * n);
        const at = function (x, z) { return heights[z * n + x]; };
        const put = function (x, z, h) { heights[z * n + x] = h; };
        const hSpan = Math.max(1, climate.hMax - climate.hMin);
        for (let z = 0; z < n; z += 1) {
            for (let x = 0; x < n; x += 1) {
                const hv = sampleGrid(heightGrid, 12, n, x, z);
                const tv = Math.max(0, Math.min(1, climate.temp + (sampleGrid(tempGrid, 6, n, x, z) - 0.5) * 0.7));
                const mv = Math.max(0, Math.min(1, climate.moist + (sampleGrid(moistGrid, 6, n, x, z) - 0.5) * 0.7));
                const step = hash3(x, 3, z) > 0.8 ? 1 : 0;
                const h = Math.min(HEIGHT_MAX, climate.hMin + Math.round(hv * hSpan) + step);
                put(x, z, h);
                biomes[z * n + x] = pickBiome(tv, mv, hv);
            }
        }
        const cx = Math.floor(n / 2), cz = Math.floor(n / 2);
        const base = at(cx, cz);
        for (let dz = -1; dz <= 1; dz += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
                put(cx + dx, cz + dz, base);
                biomes[(cz + dz) * n + (cx + dx)] = climateName === 'astral' ? 4 : (climateName === 'quarry' ? 3 : 0);
            }
        }
        const trees = [];
        let guard = 0;
        const wantTrees = climate.trees;
        while (trees.length < wantTrees && guard < 4000) {
            guard += 1;
            const tx = 3 + Math.floor(rng() * (n - 6));
            const tz = 3 + Math.floor(rng() * (n - 6));
            if (Math.abs(tx - cx) <= 3 && Math.abs(tz - cz) <= 3) continue;
            const biome = BIOME_NAMES[biomes[tz * n + tx]];
            if (biome === 'desert') continue;
            if (trees.some(function (t) { return Math.abs(t.x - tx) + Math.abs(t.z - tz) < 5; })) continue;
            const roll = rng();
            let species = 'oak';
            if (biome === 'snow' || climateName === 'astral') species = roll < 0.88 ? 'spruce' : 'birch';
            else if (biome === 'forest' || climateName === 'crystal') species = roll < climate.spruce ? 'spruce' : (roll < climate.spruce + climate.birch ? 'birch' : 'oak');
            else if (roll < climate.oak) species = 'oak';
            else if (roll < climate.oak + climate.birch) species = 'birch';
            else species = 'spruce';
            const trunk = species === 'spruce'
                ? 6 + Math.floor(rng() * 3)
                : species === 'birch'
                    ? 5 + Math.floor(rng() * 2)
                    : 4 + Math.floor(rng() * 2);
            trees.push({ x: tx, z: tz, surface: at(tx, tz), trunk: trunk, species: species });
        }
        const flowers = [];
        guard = 0;
        const wantFlowers = climate.flowers;
        while (flowers.length < wantFlowers && guard < 2500) {
            guard += 1;
            const fx = 2 + Math.floor(rng() * (n - 4));
            const fz = 2 + Math.floor(rng() * (n - 4));
            if (Math.abs(fx - cx) <= 2 && Math.abs(fz - cz) <= 2) continue;
            const biome = BIOME_NAMES[biomes[fz * n + fx]];
            if (biome === 'desert' || biome === 'snow') continue;
            if (trees.some(function (t) { return t.x === fx && t.z === fz; })) continue;
            flowers.push({ x: fx, z: fz, kind: rng() > 0.45 ? 'poppy' : 'dandelion' });
        }
        return {
            seed: seed || 7,
            climate: climateName,
            size: n,
            heights: heights,
            biomes: biomes,
            trees: trees,
            treeCols: buildTreeCols(trees),
            flowers: flowers,
            edits: {},
            surfaceAt: function (x, z) { return surfaceAtWorld(this, x, z); },
            treeAt: function (x, z) {
                return trees.find(function (t) { return t.x === x && t.z === z; }) || null;
            }
        };
    }

    /* ---------- 调色 ---------- */
    function blockColor(kind, x, y, z, species) {
        const v = hash3(x, y, z) * 0.1 - 0.05;
        const pal = {
            grass: [0.48, 0.72, 0.34],
            dirt: [0.78, 0.62, 0.42],
            sand: [0.91, 0.82, 0.52],
            snow: [0.92, 0.95, 0.98],
            stone: [0.62, 0.62, 0.65],
            log: species === 'birch' ? [0.86, 0.82, 0.72] : species === 'spruce' ? [0.36, 0.26, 0.18] : [0.58, 0.42, 0.26],
            leaf: species === 'birch' ? [0.62, 0.74, 0.28] : species === 'spruce' ? [0.18, 0.42, 0.28] : [0.32, 0.58, 0.26],
            water: [0.22, 0.48, 0.78],
            coal: [0.28, 0.28, 0.3],
            iron: [0.78, 0.7, 0.52],
            plank: [0.72, 0.56, 0.32]
        };
        const base = pal[kind] || pal.dirt;
        return [base[0] + v, base[1] + v, base[2] + v];
    }

    // 草块侧面/底面按 dirt 上色（同 dgreenheck grass material 六面贴图分工）
    function faceKind(kind, dir) {
        if (kind === 'grass' && dir !== '+y') return 'dirt';
        if (kind === 'snow' && dir !== '+y') return 'dirt';
        return kind;
    }

    function faceShade(dir) {
        if (dir === '+y') return 1;
        if (dir === '-y') return 0.5;
        if (dir === '+x' || dir === '-x') return 0.6;
        return 0.8;
    }

    function tileIndex(kind, dir, species) {
        if (kind === 'crack') {
            const stage = Math.max(0, Math.min(3, Number(dir) || 0));
            return CRACK_TILE0 + stage;
        }
        if (kind === 'grass') {
            if (dir === '+y') return 0;
            if (dir === '-y') return 2;
            return 1;
        }
        if (kind === 'dirt' || kind === 'sand') return 2;
        if (kind === 'snow') return dir === '+y' || dir === '-y' ? 0 : 2;
        if (kind === 'stone') return 3;
        if (kind === 'log') {
            if (species === 'birch') return (dir === '+y' || dir === '-y') ? 9 : 8;
            if (species === 'spruce') return (dir === '+y' || dir === '-y') ? 12 : 11;
            return (dir === '+y' || dir === '-y') ? 5 : 4;
        }
        if (kind === 'leaf') {
            if (species === 'birch') return 10;
            if (species === 'spruce') return 13;
            return 6;
        }
        return 2;
    }

    function tileCornersUV(index) {
        const w = ATLAS_TILE * ATLAS_COLS;
        const h = ATLAS_TILE * ATLAS_ROWS;
        const col = index % ATLAS_COLS;
        const row = Math.floor(index / ATLAS_COLS);
        const padU = 0.5 / w;
        const padV = 0.5 / h;
        const u0 = col * ATLAS_TILE / w + padU;
        const u1 = (col + 1) * ATLAS_TILE / w - padU;
        const v1 = 1 - row * ATLAS_TILE / h - padV;
        const v0 = 1 - (row + 1) * ATLAS_TILE / h + padV;
        return [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    }

    // 图集画法移植自 Fable5-mc src/textures.js（noiseFill/speckle/年轮/锯齿草沿），无外部贴图
    function makeBlockAtlas() {
        const tile = ATLAS_TILE;
        const canvas = document.createElement('canvas');
        canvas.width = tile * ATLAS_COLS;
        canvas.height = tile * ATLAS_ROWS;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        function px(tx, ty, x, y, r, g, b, a) {
            const alpha = a == null ? 255 : a;
            ctx.fillStyle = 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',' + (alpha / 255) + ')';
            ctx.fillRect(tx * tile + x, ty * tile + y, 1, 1);
        }
        function n2(x, y, s) {
            return hash3(x * 17 + s, y * 31 + s, s * 13);
        }
        function lum(x, y, s, amt) {
            return 1 + (n2(x, y, s) - 0.5) * 2 * amt;
        }
        function mul(c, f) {
            return [c[0] * f, c[1] * f, c[2] * f];
        }
        const C = {
            grass: [110, 178, 72],
            dirt: [168, 122, 78],
            dirtDark: [120, 82, 48],
            dirtLight: [196, 148, 98],
            stone: [127, 127, 127],
            oak: [118, 84, 48],
            oakDark: [80, 56, 32],
            oakHeart: [178, 142, 90],
            birch: [228, 220, 198],
            birchDark: [70, 62, 52],
            spruce: [74, 57, 35],
            oakLeaf: [58, 126, 34],
            birchLeaf: [110, 158, 42],
            spruceLeaf: [44, 96, 60]
        };
        function paintDirtTile(tx, ty, seed) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const c = mul(C.dirt, lum(x, y, seed, 0.1));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
            for (let i = 0; i < 24; i += 1) {
                const x = Math.floor(n2(i, 1, seed + 3) * tile);
                const y = Math.floor(n2(i, 2, seed + 4) * tile);
                px(tx, ty, x, y, C.dirtDark[0], C.dirtDark[1], C.dirtDark[2]);
            }
            for (let i = 0; i < 12; i += 1) {
                const x = Math.floor(n2(i, 3, seed + 5) * tile);
                const y = Math.floor(n2(i, 4, seed + 6) * tile);
                px(tx, ty, x, y, C.dirtLight[0], C.dirtLight[1], C.dirtLight[2]);
            }
        }
        function paintGrassTop(tx, ty) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const c = mul(C.grass, lum(x, y, 1, 0.1));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
            for (let i = 0; i < 26; i += 1) {
                const x = Math.floor(n2(i, 8, 11) * tile);
                const y = Math.floor(n2(i, 9, 12) * tile);
                const c = mul(C.grass, 0.78);
                px(tx, ty, x, y, c[0], c[1], c[2]);
            }
            for (let i = 0; i < 14; i += 1) {
                const x = Math.floor(n2(i, 10, 13) * tile);
                const y = Math.floor(n2(i, 11, 14) * tile);
                const c = mul(C.grass, 1.18);
                px(tx, ty, x, y, c[0], c[1], c[2]);
            }
        }
        function paintGrassSide(tx, ty) {
            paintDirtTile(tx, ty, 20);
            for (let x = 0; x < tile; x += 1) {
                const depth = 2 + Math.floor(n2(x, 0, 21) * 2.4);
                for (let y = 0; y < depth; y += 1) {
                    const c = mul(C.grass, lum(x, y, 22, 0.1));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
                const edge = mul(C.grass, 0.62);
                px(tx, ty, x, depth, edge[0], edge[1], edge[2]);
            }
        }
        function paintStone(tx, ty) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const c = mul(C.stone, lum(x, y, 30, 0.07));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
            for (let i = 0; i < 9; i += 1) {
                const x0 = Math.floor(n2(i, 0, 31) * 14);
                const y0 = Math.floor(n2(i, 1, 32) * tile);
                const len = 2 + Math.floor(n2(i, 2, 33) * 3);
                for (let k = 0; k < len; k += 1) {
                    const c = mul(C.stone, 0.82 + n2(i, k, 34) * 0.06);
                    px(tx, ty, x0 + k, y0, c[0], c[1], c[2]);
                }
            }
        }
        function paintLogSide(tx, ty, bark, dark, seed) {
            for (let x = 0; x < tile; x += 1) {
                const f = 0.82 + n2(x, 0, seed) * 0.36;
                for (let y = 0; y < tile; y += 1) {
                    const c = mul(bark, f * lum(x, y, seed + 1, 0.07));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
            for (let y = 0; y < tile; y += 1) {
                px(tx, ty, 0, y, dark[0] * 0.95, dark[1] * 0.95, dark[2] * 0.95);
                px(tx, ty, 15, y, dark[0] * 0.95, dark[1] * 0.95, dark[2] * 0.95);
            }
        }
        function paintLogTop(tx, ty, bark, heart, seed) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) | 0;
                    const c = ring >= 6
                        ? mul(bark, lum(x, y, seed, 0.08))
                        : mul(ring % 2 === 0 ? heart : bark, lum(x, y, seed + 1, 0.05));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
        }
        function paintLeaf(tx, ty, base, seed) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    if (n2(x, y, seed) < 0.09) {
                        px(tx, ty, x, y, 0, 0, 0, 0);
                        continue;
                    }
                    const f = n2(x, y, seed + 1) < 0.18 ? 1.3 : 1;
                    const c = mul(base, f * lum(x, y, seed + 2, 0.16));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
        }
        function paintCloud(tx, ty) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const cl = n2(x, y, 8);
                    px(tx, ty, x, y, 236 + cl * 16, 240 + cl * 12, 246);
                }
            }
        }
        function paintCrack(tx, ty, stage) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) px(tx, ty, x, y, 0, 0, 0, 0);
            }
            const lines = [
                [[3, 1], [7, 6], [5, 11], [8, 15]],
                [[12, 0], [10, 5], [13, 9], [11, 15]],
                [[0, 8], [4, 7], [8, 9], [15, 8]],
                [[6, 0], [6, 7], [9, 10], [4, 14]]
            ];
            const count = stage + 1;
            for (let i = 0; i < count; i += 1) {
                const pts = lines[i];
                for (let p = 0; p < pts.length - 1; p += 1) {
                    const a = pts[p], b = pts[p + 1];
                    const steps = 8;
                    for (let s = 0; s <= steps; s += 1) {
                        const t = s / steps;
                        const x = Math.round(a[0] + (b[0] - a[0]) * t);
                        const y = Math.round(a[1] + (b[1] - a[1]) * t);
                        px(tx, ty, x, y, 20, 16, 12, 220);
                        if (stage >= 2) px(tx, ty, x + 1, y, 12, 10, 8, 160);
                    }
                }
            }
        }
        paintGrassTop(0, 0);
        paintGrassSide(1, 0);
        paintDirtTile(2, 0, 3);
        paintStone(3, 0);
        paintLogSide(0, 1, C.oak, C.oakDark, 5);
        paintLogTop(1, 1, C.oak, C.oakHeart, 6);
        paintLeaf(2, 1, C.oakLeaf, 7);
        paintCloud(3, 1);
        paintLogSide(0, 2, C.birch, C.birchDark, 9);
        paintLogTop(1, 2, C.birch, [236, 228, 210], 10);
        paintLeaf(2, 2, C.birchLeaf, 11);
        paintLogSide(3, 2, C.spruce, [48, 36, 22], 12);
        paintLogTop(0, 3, C.spruce, [148, 113, 64], 13);
        paintLeaf(1, 3, C.spruceLeaf, 14);
        paintCrack(0, 4, 0);
        paintCrack(1, 4, 1);
        paintCrack(2, 4, 2);
        paintCrack(3, 4, 3);
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;
        if ('encoding' in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
        return tex;
    }

    /* ---------- 体素占用：高度图 + 树 + 玩家挖掘覆盖 ---------- */
    function rawHeight(world, x, z) {
        if (x < 0 || z < 0 || x >= world.size || z >= world.size) return 0;
        return world.heights[z * world.size + x];
    }

    function groundKind(world, x, y, z) {
        const h = rawHeight(world, x, z);
        if (y < 0 || y >= h) return null;
        const biome = biomeAt(world, x, z);
        if (biome === 'desert') {
            if (y >= h - 2) return 'sand';
            return 'stone';
        }
        if (biome === 'snow') {
            if (y === h - 1) return 'snow';
            if (y === h - 2) return 'dirt';
            return 'stone';
        }
        if (biome === 'mountain' && h >= 11 && y === h - 1) return 'stone';
        if (y === h - 1) return 'grass';
        if (y === h - 2) return 'dirt';
        return 'stone';
    }

    function eachTreeVoxel(tree, fn) {
        const species = tree.species || 'oak';
        for (let i = 0; i < tree.trunk; i += 1) fn(tree.x, tree.surface + i, tree.z, 'log', species);
        const ty = tree.surface + tree.trunk;
        if (species === 'spruce') {
            for (let ly = 0; ly < 5; ly += 1) {
                const r = Math.max(0, 2 - Math.floor(ly / 2));
                const y = ty - 2 + ly;
                for (let dz = -r; dz <= r; dz += 1) {
                    for (let dx = -r; dx <= r; dx += 1) {
                        if (dx === 0 && dz === 0 && ly < 3) continue;
                        if (r > 0 && Math.abs(dx) === r && Math.abs(dz) === r) continue;
                        fn(tree.x + dx, y, tree.z + dz, 'leaf', species);
                    }
                }
            }
            return;
        }
        const layers = species === 'birch' ? 2 : 2;
        for (let ly = 0; ly < layers; ly += 1) {
            const r = species === 'birch' ? 1 : (ly === 0 ? 2 : 1);
            for (let dz = -r; dz <= r; dz += 1) {
                for (let dx = -r; dx <= r; dx += 1) {
                    if (dx === 0 && dz === 0 && ly === 0) continue;
                    if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
                    fn(tree.x + dx, ty - 1 + ly, tree.z + dz, 'leaf', species);
                }
            }
        }
        fn(tree.x, ty + 1, tree.z, 'leaf', species);
        if (species === 'oak') fn(tree.x, ty + 2, tree.z, 'leaf', species);
    }

    function buildTreeCols(trees) {
        const cols = {};
        (trees || []).forEach(function (tree) {
            eachTreeVoxel(tree, function (x, y, z, kind, species) {
                const key = x + ',' + z;
                if (!cols[key]) cols[key] = {};
                cols[key][y] = { kind: kind, species: species || tree.species || 'oak' };
            });
        });
        return cols;
    }

    function treeVoxelAt(world, x, y, z) {
        if (!world.treeCols) world.treeCols = buildTreeCols(world.trees || []);
        const col = world.treeCols[x + ',' + z];
        return col && col[y] ? col[y] : null;
    }

    function treeKindAt(world, x, y, z) {
        const hit = treeVoxelAt(world, x, y, z);
        return hit ? hit.kind : null;
    }

    function editKey(x, y, z) { return x + ',' + y + ',' + z; }

    function voxelAt(world, x, y, z) {
        if (y < 0 || x < 0 || z < 0 || x >= world.size || z >= world.size) return null;
        if (!world.edits) world.edits = {};
        const key = editKey(x, y, z);
        if (Object.prototype.hasOwnProperty.call(world.edits, key)) return world.edits[key];
        const tree = treeVoxelAt(world, x, y, z);
        if (tree) return tree.kind;
        return groundKind(world, x, y, z);
    }

    function voxelSpecies(world, x, y, z) {
        const tree = treeVoxelAt(world, x, y, z);
        return tree ? tree.species : null;
    }

    function hasBlock(world, x, y, z) {
        return voxelAt(world, x, y, z) != null;
    }

    function blockKindAt(world, x, y, z) {
        return voxelAt(world, x, y, z);
    }

    function isGroundKind(kind) {
        return kind === 'grass' || kind === 'dirt' || kind === 'stone' || kind === 'sand' || kind === 'snow';
    }

    function surfaceAtWorld(world, x, z) {
        if (x < 0 || z < 0 || x >= world.size || z >= world.size) return HEIGHT_MAX + 4;
        const top = rawHeight(world, x, z);
        for (let y = top - 1; y >= 0; y -= 1) {
            const kind = voxelAt(world, x, y, z);
            if (kind && isGroundKind(kind)) return y + 1;
        }
        return 0;
    }

    function removeTree(world, tree) {
        if (!tree || !world.trees) return { ok: false };
        const idx = world.trees.indexOf(tree);
        const target = idx >= 0 ? tree : world.treeAt(tree.x, tree.z);
        if (!target) return { ok: false };
        const at = world.trees.indexOf(target);
        if (at < 0) return { ok: false };
        world.trees.splice(at, 1);
        world.treeCols = buildTreeCols(world.trees);
        return { ok: true, drop: 'oak-log', x: target.x, z: target.z, y: target.surface, kind: 'log' };
    }

    function breakVoxel(world, x, y, z) {
        if (y <= 0) return { ok: false };
        const kind = voxelAt(world, x, y, z);
        if (!kind) return { ok: false };
        if (!world.edits) world.edits = {};
        world.edits[editKey(x, y, z)] = null;
        const drop = (global.BlockLegendTools && global.BlockLegendTools.dropOf)
            ? global.BlockLegendTools.dropOf(kind)
            : kind;
        return { ok: true, kind: kind, drop: drop, x: x, y: y, z: z };
    }

    function placeVoxel(world, x, y, z, kind) {
        const allowed = { dirt: true, stone: true, log: true };
        if (y <= 0 || !allowed[kind]) return { ok: false };
        if (voxelAt(world, x, y, z)) return { ok: false };
        if (x < 0 || z < 0 || x >= world.size || z >= world.size) return { ok: false };
        if (!world.edits) world.edits = {};
        world.edits[editKey(x, y, z)] = kind;
        return { ok: true, kind: kind, x: x, y: y, z: z };
    }

    // 单位立方体面：corners 逆时针朝向法线，跨度恒为 1
    const FACE_DIRS = [
        { dir: '+y', dx: 0, dy: 1, dz: 0, nrm: [0, 1, 0], t1: [0, 0, 1], t2: [1, 0, 0], sc: [[-1, -1], [1, -1], [1, 1], [-1, 1]], corners: function (x, y, z) { return [[x, y + 1, z], [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z]]; } },
        { dir: '-y', dx: 0, dy: -1, dz: 0, nrm: [0, -1, 0], t1: [1, 0, 0], t2: [0, 0, 1], sc: [[-1, -1], [1, -1], [1, 1], [-1, 1]], corners: function (x, y, z) { return [[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]]; } },
        { dir: '-z', dx: 0, dy: 0, dz: -1, nrm: [0, 0, -1], t1: [0, 1, 0], t2: [1, 0, 0], sc: [[-1, -1], [1, -1], [1, 1], [-1, 1]], corners: function (x, y, z) { return [[x, y, z], [x, y + 1, z], [x + 1, y + 1, z], [x + 1, y, z]]; } },
        { dir: '+z', dx: 0, dy: 0, dz: 1, nrm: [0, 0, 1], t1: [1, 0, 0], t2: [0, 1, 0], sc: [[1, -1], [1, 1], [-1, 1], [-1, -1]], corners: function (x, y, z) { return [[x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1], [x, y, z + 1]]; } },
        { dir: '-x', dx: -1, dy: 0, dz: 0, nrm: [-1, 0, 0], t1: [0, 1, 0], t2: [0, 0, 1], sc: [[-1, 1], [1, 1], [1, -1], [-1, -1]], corners: function (x, y, z) { return [[x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z], [x, y, z]]; } },
        { dir: '+x', dx: 1, dy: 0, dz: 0, nrm: [1, 0, 0], t1: [0, 1, 0], t2: [0, 0, 1], sc: [[-1, -1], [1, -1], [1, 1], [-1, 1]], corners: function (x, y, z) { return [[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]]; } }
    ];
    const AO_CURVE = [0.45, 0.64, 0.82, 1];
    const AO_CURVE_TOP = [0.6, 0.8, 0.92, 1];

    function vertexAO(world, x, y, z, dir) {
        const face = FACE_DIRS.find(function (d) { return d.dir === dir; });
        if (!face) return [1, 1, 1, 1];
        const cellX = x + face.dx, cellY = y + face.dy, cellZ = z + face.dz;
        const curve = dir === '+y' ? AO_CURVE_TOP : AO_CURVE;
        const out = [];
        for (let i = 0; i < 4; i += 1) {
            const s1 = face.sc[i][0], s2 = face.sc[i][1];
            const o1 = hasBlock(world, cellX + s1 * face.t1[0], cellY + s1 * face.t1[1], cellZ + s1 * face.t1[2]) ? 1 : 0;
            const o2 = hasBlock(world, cellX + s2 * face.t2[0], cellY + s2 * face.t2[1], cellZ + s2 * face.t2[2]) ? 1 : 0;
            const oc = hasBlock(world, cellX + s1 * face.t1[0] + s2 * face.t2[0], cellY + s1 * face.t1[1] + s2 * face.t2[1], cellZ + s1 * face.t1[2] + s2 * face.t2[2]) ? 1 : 0;
            const ao = (o1 && o2) ? 0 : 3 - (o1 + o2 + oc);
            out.push(curve[ao]);
        }
        return out;
    }

    function pushCubeFaces(faces, x, y, z, kind, occluded) {
        for (let i = 0; i < FACE_DIRS.length; i += 1) {
            const d = FACE_DIRS[i];
            if (occluded && occluded(x + d.dx, y + d.dy, z + d.dz)) continue;
            faces.push({
                x: x, y: y, z: z, kind: kind, dir: d.dir,
                nrm: d.nrm,
                corners: d.corners(x, y, z)
            });
        }
    }

    function collectChunkFaces(world, cx0, cz0) {
        const faces = [];
        const n = world.size;
        const x1 = Math.min(n, cx0 + CHUNK);
        const z1 = Math.min(n, cz0 + CHUNK);
        const hidden = function (nx, ny, nz) { return hasBlock(world, nx, ny, nz); };
        const yMax = HEIGHT_MAX + 16;
        for (let z = cz0; z < z1; z += 1) {
            for (let x = cx0; x < x1; x += 1) {
                for (let y = 0; y < yMax; y += 1) {
                    const kind = voxelAt(world, x, y, z);
                    if (!kind) continue;
                    pushCubeFaces(faces, x, y, z, kind, hidden);
                }
            }
        }
        return faces;
    }

    /* ---------- 流式：玩家周围应存在的区块键（纯函数，node 可测） ---------- */
    function chunksAround(px, pz, size, chunk, radius) {
        const ch = chunk || CHUNK;
        const n = size || WORLD_SIZE;
        const r = radius == null ? VIEW_CHUNKS : radius;
        const originX = Math.floor(px / ch) * ch;
        const originZ = Math.floor(pz / ch) * ch;
        const keys = [];
        for (let dz = -r; dz <= r; dz += 1) {
            for (let dx = -r; dx <= r; dx += 1) {
                const cx = originX + dx * ch;
                const cz = originZ + dz * ch;
                if (cx < 0 || cz < 0 || cx >= n || cz >= n) continue;
                keys.push(cx + ',' + cz);
            }
        }
        return keys;
    }

    /* ---------- 区块网格：单位暴露面合批（每区块 1 draw call） ---------- */
    function pushQuad(arr, normal, colors, corners, uvs, flip) {
        const tri = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
        for (const i of tri) {
            const c = colors[i] || colors[0];
            arr.pos.push(corners[i][0], corners[i][1], corners[i][2]);
            arr.nor.push(normal[0], normal[1], normal[2]);
            arr.col.push(c[0], c[1], c[2]);
            arr.uv.push(uvs[i][0], uvs[i][1]);
        }
    }

    function buildChunkGeometry(world, cx0, cz0) {
        const arr = { pos: [], nor: [], col: [], uv: [] };
        const faces = collectChunkFaces(world, cx0, cz0);
        for (let i = 0; i < faces.length; i += 1) {
            const f = faces[i];
            const species = voxelSpecies(world, f.x, f.y, f.z);
            const rgb = blockColor(faceKind(f.kind, f.dir), f.x, f.y, f.z, species);
            const s = faceShade(f.dir);
            const aos = vertexAO(world, f.x, f.y, f.z, f.dir);
            const colors = aos.map(function (a) {
                return [rgb[0] * s * a, rgb[1] * s * a, rgb[2] * s * a];
            });
            const flip = aos[0] + aos[2] > aos[1] + aos[3];
            pushQuad(arr, f.nrm, colors, f.corners, tileCornersUV(tileIndex(f.kind, f.dir, species)), flip);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(arr.pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(arr.nor, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(arr.col, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(arr.uv, 2));
        return geo;
    }

    /* ---------- 引擎工厂 ---------- */
    function create(canvas, options) {
        const opts = options || {};
        let world = opts.world || createWorld(opts.seed || 7, opts);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_CAP));
        renderer.shadowMap.enabled = false;

        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xfff4d8, 0x6b8a4a, 0.88));
        const sun = new THREE.DirectionalLight(0xfff2d0, 0.85);
        sun.position.set(30, 50, 20);
        scene.add(sun);

        function applySky(climateName) {
            const sky = climateOf(climateName).sky;
            scene.background = new THREE.Color(sky);
            scene.fog = new THREE.Fog(sky, 40, 70);
        }
        applySky(world.climate);

        const atlas = makeBlockAtlas();
        const terrainMat = new THREE.MeshLambertMaterial({
            map: atlas,
            vertexColors: true,
            alphaTest: 0.5,
            transparent: false
        });
        const chunkMeshes = [];
        const chunkMap = {};
        const decor = new THREE.Group();
        scene.add(decor);

        const flowerColors = { poppy: 0xd63a3a, dandelion: 0xffe14a };
        function rebuildDecor() {
            while (decor.children.length) {
                const ch = decor.children[0];
                decor.remove(ch);
                if (ch.geometry && ch.geometry.dispose) ch.geometry.dispose();
            }
            (world.flowers || []).forEach(function (f) {
                const stem = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 0.34, 0.08),
                    new THREE.MeshLambertMaterial({ color: 0x3d8a28 })
                );
                const head = new THREE.Mesh(
                    new THREE.BoxGeometry(0.22, 0.16, 0.22),
                    new THREE.MeshLambertMaterial({ color: flowerColors[f.kind] || 0xffe14a })
                );
                const y = world.surfaceAt(f.x, f.z);
                stem.position.set(f.x + 0.5, y + 0.17, f.z + 0.5);
                head.position.set(f.x + 0.5, y + 0.4, f.z + 0.5);
                decor.add(stem);
                decor.add(head);
            });
            const cloudMat = new THREE.MeshLambertMaterial({ color: 0xf4f7fb });
            const cloudRng = makeRng((world.seed || 7) + 99);
            for (let c = 0; c < 16; c += 1) {
                const gx = 4 + cloudRng() * (world.size - 8);
                const gz = 4 + cloudRng() * (world.size - 8);
                const gy = 18 + cloudRng() * 3;
                const w = 2 + Math.floor(cloudRng() * 3);
                for (let i = 0; i < w; i += 1) {
                    const cloud = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.4), cloudMat);
                    cloud.position.set(gx + i * 1.2, gy + (i % 2) * 0.25, gz + (cloudRng() - 0.5));
                    decor.add(cloud);
                }
            }
        }
        rebuildDecor();

        const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 220);
        const player = {
            x: Math.floor(world.size / 2) + 0.5,
            z: Math.floor(world.size / 2) + 0.5,
            y: world.surfaceAt(Math.floor(world.size / 2), Math.floor(world.size / 2)),
            vy: 0, onGround: true, hp: 10, hpMax: 10
        };
        const look = { yaw: Math.PI * 0.25, pitch: -0.28 };
        const keys = {};

        function ensureChunk(cx, cz) {
            const key = cx + ',' + cz;
            if (chunkMap[key]) return;
            if (cx < 0 || cz < 0 || cx >= world.size || cz >= world.size) return;
            const mesh = new THREE.Mesh(buildChunkGeometry(world, cx, cz), terrainMat);
            scene.add(mesh);
            chunkMeshes.push(mesh);
            chunkMap[key] = mesh;
        }

        function dropChunk(key) {
            const mesh = chunkMap[key];
            if (!mesh) return;
            scene.remove(mesh);
            if (mesh.geometry && mesh.geometry.dispose) mesh.geometry.dispose();
            delete chunkMap[key];
            const i = chunkMeshes.indexOf(mesh);
            if (i >= 0) chunkMeshes.splice(i, 1);
        }

        function streamChunks(budget) {
            const want = {};
            const keys = chunksAround(player.x, player.z, world.size, CHUNK, VIEW_CHUNKS);
            keys.forEach(function (k) { want[k] = true; });
            Object.keys(chunkMap).forEach(function (k) {
                if (!want[k]) dropChunk(k);
            });
            keys.sort(function (a, b) {
                const pa = a.split(',');
                const pb = b.split(',');
                const da = Math.abs(Number(pa[0]) + 8 - player.x) + Math.abs(Number(pa[1]) + 8 - player.z);
                const db = Math.abs(Number(pb[0]) + 8 - player.x) + Math.abs(Number(pb[1]) + 8 - player.z);
                return da - db;
            });
            let built = 0;
            const cap = budget == null ? 1 : budget;
            for (let i = 0; i < keys.length && built < cap; i += 1) {
                if (chunkMap[keys[i]]) continue;
                const parts = keys[i].split(',');
                ensureChunk(Number(parts[0]), Number(parts[1]));
                built += 1;
            }
        }

        chunksAround(player.x, player.z, world.size, CHUNK, BOOT_CHUNKS).forEach(function (key) {
            const parts = key.split(',');
            ensureChunk(Number(parts[0]), Number(parts[1]));
        });

        function reloadWorld(next) {
            world = next || createWorld(7);
            Object.keys(chunkMap).forEach(dropChunk);
            player.x = Math.floor(world.size / 2) + 0.5;
            player.z = Math.floor(world.size / 2) + 0.5;
            player.y = world.surfaceAt(Math.floor(player.x), Math.floor(player.z));
            player.vy = 0;
            applySky(world.climate);
            rebuildDecor();
            chunksAround(player.x, player.z, world.size, CHUNK, BOOT_CHUNKS).forEach(function (key) {
                const parts = key.split(',');
                ensureChunk(Number(parts[0]), Number(parts[1]));
            });
        }

        function remeshAt(x, z) {
            const seen = {};
            for (let dz = -2; dz <= 2; dz += 1) {
                for (let dx = -2; dx <= 2; dx += 1) {
                    const cx = Math.floor((x + dx) / CHUNK) * CHUNK;
                    const cz = Math.floor((z + dz) / CHUNK) * CHUNK;
                    const key = cx + ',' + cz;
                    if (seen[key]) continue;
                    seen[key] = true;
                    const mesh = chunkMap[key];
                    if (!mesh) continue;
                    const old = mesh.geometry;
                    mesh.geometry = buildChunkGeometry(world, cx, cz);
                    if (old && old.dispose) old.dispose();
                }
            }
        }

        /* ---------- 碰撞：高度场 + 树干 ---------- */
        function columnBlocked(px, pz, feetY) {
            const cx = Math.floor(px), cz = Math.floor(pz);
            if (world.surfaceAt(cx, cz) - feetY > STEP_UP) return true;
            const y0 = Math.floor(feetY + 0.2);
            const y1 = Math.floor(feetY + 1.55);
            for (let y = y0; y <= y1; y += 1) {
                const kind = voxelAt(world, cx, y, cz);
                if (kind && !isGroundKind(kind)) return true;
            }
            return false;
        }

        function updatePhysics(dt, input) {
            // 朝向移动（yaw: 0 朝 -Z，与相机一致）
            const dirX = Math.sin(look.yaw) * (input.back ? 1 : 0) - Math.sin(look.yaw) * (input.fwd ? 1 : 0);
            const dirZ = Math.cos(look.yaw) * (input.back ? 1 : 0) - Math.cos(look.yaw) * (input.fwd ? 1 : 0);
            // strafe: 右向量 = (cos(yaw), 0, -sin(yaw))
            const rgtX = Math.cos(look.yaw) * (input.right ? 1 : 0) - Math.cos(look.yaw) * (input.left ? 1 : 0);
            const rgtZ = -Math.sin(look.yaw) * (input.right ? 1 : 0) + Math.sin(look.yaw) * (input.left ? 1 : 0);
            let mx = dirX + rgtX, mz = dirZ + rgtZ;
            const len = Math.hypot(mx, mz);
            if (len > 0) {
                mx = mx / len * MOVE_SPEED * dt;
                mz = mz / len * MOVE_SPEED * dt;
                const R = 0.3; // 玩家半径
                // 分轴试探：撞墙只挡该轴，可贴墙滑动
                if (!columnBlocked(player.x + mx + Math.sign(mx) * R, player.z, player.y)) player.x += mx;
                if (!columnBlocked(player.x, player.z + mz + Math.sign(mz) * R, player.y)) player.z += mz;
            }
            // 竖直
            player.vy -= GRAVITY * dt;
            player.y += player.vy * dt;
            const groundY = world.surfaceAt(Math.floor(player.x), Math.floor(player.z));
            if (player.y <= groundY) {
                player.y = groundY;
                player.vy = 0;
                player.onGround = true;
            } else if (player.y - groundY < 0.02) {
                player.onGround = true;
            } else {
                player.onGround = false;
            }
            if (input.jump && player.onGround) {
                player.vy = JUMP_VY;
                player.onGround = false;
            }
        }

        function applyCamera() {
            camera.position.set(player.x, player.y + EYE_HEIGHT, player.z);
            camera.rotation.order = 'YXZ';
            camera.rotation.y = look.yaw;
            camera.rotation.x = look.pitch;
        }

        function resize() {
            const rect = canvas.getBoundingClientRect();
            const w = Math.max(1, Math.floor(rect.width));
            const h = Math.max(1, Math.floor(rect.height));
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }

        /* ---------- 输入 ---------- */
        const input = { fwd: false, back: false, left: false, right: false, jump: false };
        function refreshKeys() {
            input.fwd = !!(keys['w'] || keys['arrowup']);
            input.back = !!(keys['s'] || keys['arrowdown']);
            input.left = !!(keys['a'] || keys['arrowleft']);
            input.right = !!(keys['d'] || keys['arrowright']);
            input.jump = !!keys[' '];
        }

        let pointerLocked = false;
        let dragLook = null; // PointerLock 不可用（部分 WebView/触屏）时的拖动视角兜底
        const SENS = 0.0026, DRAG_SENS = 0.005;
        function bindInput() {
            document.addEventListener('keydown', function (e) {
                keys[e.key.toLowerCase()] = true;
                refreshKeys();
            });
            document.addEventListener('keyup', function (e) {
                keys[e.key.toLowerCase()] = false;
                refreshKeys();
            });
            canvas.addEventListener('click', function () {
                if (!pointerLocked && canvas.requestPointerLock) canvas.requestPointerLock();
            });
            document.addEventListener('pointerlockchange', function () {
                pointerLocked = document.pointerLockElement === canvas;
                const tip = document.getElementById('look-tip');
                if (tip) tip.classList.toggle('is-hidden', pointerLocked);
            });
            document.addEventListener('mousemove', function (e) {
                if (pointerLocked) {
                    look.yaw -= e.movementX * SENS;
                    look.pitch = Math.max(-1.35, Math.min(1.35, look.pitch - e.movementY * SENS));
                }
            });
            canvas.addEventListener('pointerdown', function (e) {
                if (pointerLocked) return;
                dragLook = { x: e.clientX, y: e.clientY, id: e.pointerId };
            });
            window.addEventListener('pointermove', function (e) {
                if (!dragLook || e.pointerId !== dragLook.id) return;
                look.yaw -= (e.clientX - dragLook.x) * DRAG_SENS;
                look.pitch = Math.max(-1.35, Math.min(1.35, look.pitch - (e.clientY - dragLook.y) * DRAG_SENS));
                dragLook.x = e.clientX; dragLook.y = e.clientY;
            });
            window.addEventListener('pointerup', function (e) {
                if (dragLook && e.pointerId === dragLook.id) dragLook = null;
            });
            window.addEventListener('resize', resize);
        }

        /* ---------- 主循环（rAF 优先，挂起降级 setInterval，voxel 系同款） ---------- */
        let lastAt = 0, fpsCount = 0, fpsAt = 0, fps = 0;
        let tickHook = null;
        function pump(now) {
            const t = (Number(now) || Date.now()) / 1000;
            const dt = Math.min(MAX_DT, lastAt ? t - lastAt : 0.016);
            lastAt = t;
            updatePhysics(dt, input);
            streamChunks(1);
            if (typeof tickHook === 'function') tickHook(dt, t);
            applyCamera();
            renderer.render(scene, camera);
            fpsCount += 1;
            if (t - fpsAt >= 1) {
                fps = fpsCount; fpsCount = 0; fpsAt = t;
                const el = document.getElementById('fps-label');
                if (el) el.textContent = String(fps);
            }
        }
        function startLoop() {
            requestAnimationFrame(function raf(now) {
                requestAnimationFrame(raf);
                pump(now);
            });
            setInterval(function () {
                const idle = performance.now() - (lastAt * 1000);
                if (idle > 500) pump(performance.now());
            }, 33);
        }

        bindInput();
        resize();
        const api = {
            THREE_REF: THREE,
            world: world,
            scene: scene,
            camera: camera,
            renderer: renderer,
            player: player,
            look: look,
            input: input,
            chunkMeshes: chunkMeshes,
            columnBlocked: columnBlocked,
            atlas: atlas,
            remeshAt: remeshAt,
            reloadWorld: function (next) {
                reloadWorld(next);
                api.world = world;
            },
            resize: resize,
            startLoop: startLoop,
            onTick: function (fn) { tickHook = fn; },
            fps: function () { return fps; }
        };
        return api;
    }

    global.BlockLegendEngine = {
        WORLD_SIZE: WORLD_SIZE,
        CHUNK: CHUNK,
        VIEW_CHUNKS: VIEW_CHUNKS,
        chunksAround: chunksAround,
        ATLAS_COLS: ATLAS_COLS,
        ATLAS_ROWS: ATLAS_ROWS,
        tileIndex: tileIndex,
        tileCornersUV: tileCornersUV,
        faceShade: faceShade,
        vertexAO: vertexAO,
        PIXEL_RATIO_CAP: PIXEL_RATIO_CAP,
        EYE_HEIGHT: EYE_HEIGHT,
        MOVE_SPEED: MOVE_SPEED,
        JUMP_VY: JUMP_VY,
        GRAVITY: GRAVITY,
        STEP_UP: STEP_UP,
        TREE_COUNT: TREE_COUNT,
        createWorld: createWorld,
        biomeAt: biomeAt,
        climateOf: climateOf,
        blockColor: blockColor,
        hasBlock: hasBlock,
        blockKindAt: blockKindAt,
        voxelAt: voxelAt,
        voxelSpecies: voxelSpecies,
        removeTree: removeTree,
        breakVoxel: breakVoxel,
        place