/**
 * blocklegend · 引擎层（T20260815-blocklegend-3d S1 + 体素地面）
 * three.js r147 UMD（本地 vendor，禁 CDN）。
 * 职责：种子化 192×192 多气候世界 + 洞穴/矿脉/水塘/村庄 + 按玩家半径流式区块 + 第一人称控制。
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
        astral: { temp: 0.16, moist: 0.38, hMin: 6, hMax: 16, trees: 48, flowers: 16, oak: 0, birch: 0.12, spruce: 0.88, sky: 0xc8d4e8 },
        cherry: { temp: 0.52, moist: 0.72, hMin: 3, hMax: 10, trees: 200, flowers: 180, oak: 0.1, birch: 0.1, spruce: 0.1, sky: 0xf3c2d4 },
        desert: { temp: 0.86, moist: 0.12, hMin: 3, hMax: 8, trees: 24, flowers: 8, oak: 0, birch: 0, spruce: 0, sky: 0xe8d08a },
        nether: { temp: 0.92, moist: 0.08, hMin: 4, hMax: 12, trees: 40, flowers: 0, oak: 0, birch: 0, spruce: 1, sky: 0x5a1814 }
    };
    const ATLAS_TILE = 16;
    const ATLAS_COLS = 4;
    const ATLAS_ROWS = 9;       // 0–19 旧地形/裂纹锁定；20+ 气候/矿石
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
    function inRect(x, z, box) {
        return !!(box && x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1);
    }

    function villagePlan(climate, cx, cz) {
        if (climate === 'astral' || climate === 'quarry' || climate === 'nether') return null;
        if (climate === 'desert') {
            return {
                x0: cx + 8,
                z0: cz + 2,
                x1: cx + 20,
                z1: cz + 14,
                style: 'desert',
                houses: [
                    { x: cx + 10, z: cz + 4, w: 5, d: 5, role: 'bed' },
                    { x: cx + 16, z: cz + 8, w: 5, d: 4, role: 'trader' }
                ],
                garden: { x: cx + 10, z: cz + 10, w: 3, d: 2 },
                well: { x: cx + 14, z: cz + 9 }
            };
        }
        return {
            x0: cx + 8,
            z0: cz + 2,
            x1: cx + 22,
            z1: cz + 16,
            style: climate === 'cherry' ? 'cherry' : climate === 'crystal' ? 'crystal' : climate === 'duskvale' ? 'dusk' : 'oak',
            houses: [
                { x: cx + 10, z: cz + 4, w: 5, d: 5, role: 'bed' },
                { x: cx + 17, z: cz + 3, w: 5, d: 4, role: 'trader' },
                { x: cx + 11, z: cz + 11, w: 4, d: 5, role: 'word' }
            ],
            garden: { x: cx + 16, z: cz + 9, w: 4, d: 2 },
            well: { x: cx + 15, z: cz + 7 }
        };
    }

    function fillPond(ponds, n, px, pz, r, village, cx, cz) {
        if (Math.abs(px - cx) < 6 && Math.abs(pz - cz) < 6) return;
        for (let dz = -r; dz <= r; dz += 1) {
            for (let dx = -r; dx <= r; dx += 1) {
                if (dx * dx + dz * dz > r * r) continue;
                const x = px + dx, z = pz + dz;
                if (x < 2 || z < 2 || x >= n - 2 || z >= n - 2) continue;
                if (inRect(x, z, village)) continue;
                ponds[x + ',' + z] = 1;
            }
        }
    }

    function stampPonds(n, ponds, rng, climate, cx, cz, village) {
        if (climate === 'desert' || climate === 'nether') return;
        if (climate !== 'astral' && climate !== 'quarry') {
            fillPond(ponds, n, cx - 14, cz + 6, 3, village, cx, cz);
            fillPond(ponds, n, cx - 7, cz - 11, 2, village, cx, cz);
        }
        if (climate === 'duskvale' || climate === 'plains') {
            fillPond(ponds, n, cx + 4, cz - 16, 3, village, cx, cz);
        }
        if (climate !== 'astral' && climate !== 'quarry') {
            let x = cx - 14, z = cz + 6;
            const endX = cx - 7, endZ = cz - 11;
            for (let i = 0; i < 48; i += 1) {
                fillPond(ponds, n, x, z, 1, village, cx, cz);
                if (x === endX && z === endZ) break;
                if (x !== endX) x += x < endX ? 1 : -1;
                else z += z < endZ ? 1 : -1;
            }
        }
        const extra = climate === 'duskvale' ? 8 : climate === 'plains' ? 5 : climate === 'forest' ? 3 : 0;
        for (let i = 0; i < extra; i += 1) {
            const px = 8 + Math.floor(rng() * (n - 16));
            const pz = 8 + Math.floor(rng() * (n - 16));
            const r = 2 + Math.floor(rng() * 3);
            fillPond(ponds, n, px, pz, r, village, cx, cz);
        }
    }

    function stampVillage(n, heights, edits, ponds, plan) {
        if (!plan) return;
        plan.beds = [];
        plan.villagers = [];
        plan.crops = [];
        const wall = plan.style === 'desert' ? 'sand' : 'plank';
        const post = plan.style === 'desert' ? 'sand' : 'log';
        plan.houses.forEach(function (house) {
            let y0 = 99;
            for (let z = house.z; z < house.z + house.d; z += 1) {
                for (let x = house.x; x < house.x + house.w; x += 1) {
                    if (x < 1 || z < 1 || x >= n - 1 || z >= n - 1) continue;
                    y0 = Math.min(y0, heights[z * n + x]);
                }
            }
            y0 = Math.max(2, y0);
            house.y0 = y0;
            const doorX = house.x + Math.floor(house.w / 2);
            const doorZ = house.z + house.d - 1;
            const winZ = house.z + 1;
            for (let z = house.z; z < house.z + house.d; z += 1) {
                for (let x = house.x; x < house.x + house.w; x += 1) {
                    if (x < 1 || z < 1 || x >= n - 1 || z >= n - 1) continue;
                    heights[z * n + x] = y0;
                    const edgeX = x === house.x || x === house.x + house.w - 1;
                    const edgeZ = z === house.z || z === house.z + house.d - 1;
                    const door = x === doorX && z === doorZ;
                    const window = edgeX && z === winZ && !door;
                    if (edgeX || edgeZ) {
                        if (!door) {
                            edits[x + ',' + y0 + ',' + z] = (edgeX && edgeZ) ? post : wall;
                            if (!window) edits[x + ',' + (y0 + 1) + ',' + z] = (edgeX && edgeZ) ? post : wall;
                        }
                    }
                    edits[x + ',' + (y0 + 2) + ',' + z] = wall;
                    if (!edgeX && z === house.z + Math.floor(house.d / 2)) {
                        edits[x + ',' + (y0 + 3) + ',' + z] = post;
                    }
                }
            }
            plan.beds.push({ x: house.x + 1, z: house.z + 1, y: y0, role: house.role || 'bed' });
            plan.villagers.push({
                x: doorX + 0.5,
                z: doorZ + 1.35,
                role: house.role === 'trader' ? 'trader' : house.role === 'word' ? 'teacher' : 'farmer'
            });
        });
        if (plan.houses.length >= 2) {
            const a = plan.houses[0], b = plan.houses[1];
            let x = a.x + Math.floor(a.w / 2), z = a.z + a.d;
            const ex = b.x + Math.floor(b.w / 2), ez = b.z + Math.floor(b.d / 2);
            for (let i = 0; i < 48; i += 1) {
                if (x >= 1 && z >= 1 && x < n - 1 && z < n - 1) {
                    const y = heights[z * n + x];
                    edits[x + ',' + (y - 1) + ',' + z] = plan.style === 'desert' ? 'sand' : 'dirt';
                }
                if (x === ex && z === ez) break;
                if (x !== ex) x += x < ex ? 1 : -1;
                else z += z < ez ? 1 : -1;
            }
        }
        if (plan.garden) {
            const g = plan.garden;
            for (let z = g.z; z < g.z + g.d; z += 1) {
                for (let x = g.x; x < g.x + g.w; x += 1) {
                    if (x < 1 || z < 1 || x >= n - 1 || z >= n - 1) continue;
                    const y = heights[z * n + x];
                    edits[x + ',' + (y - 1) + ',' + z] = 'dirt';
                    plan.crops.push({
                        x: x,
                        z: z,
                        y: y,
                        kind: plan.style === 'desert' ? 'deadbush' : 'wheat'
                    });
                }
            }
        }
        if (plan.well) {
            const wx = plan.well.x, wz = plan.well.z;
            let y0 = 99;
            for (let dz = -1; dz <= 1; dz += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    const x = wx + dx, z = wz + dz;
                    if (x < 1 || z < 1 || x >= n - 1 || z >= n - 1) continue;
                    y0 = Math.min(y0, heights[z * n + x]);
                }
            }
            y0 = Math.max(2, y0);
            for (let dz = -1; dz <= 1; dz += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    const x = wx + dx, z = wz + dz;
                    if (x < 1 || z < 1 || x >= n - 1 || z >= n - 1) continue;
                    heights[z * n + x] = y0;
                    if (dx === 0 && dz === 0) ponds[x + ',' + z] = 1;
                    else edits[x + ',' + y0 + ',' + z] = 'stone';
                }
            }
            edits[(wx - 1) + ',' + (y0 + 1) + ',' + (wz - 1)] = post;
            edits[(wx + 1) + ',' + (y0 + 1) + ',' + (wz - 1)] = post;
            edits[(wx - 1) + ',' + (y0 + 2) + ',' + (wz - 1)] = wall;
            edits[wx + ',' + (y0 + 2) + ',' + (wz - 1)] = wall;
            edits[(wx + 1) + ',' + (y0 + 2) + ',' + (wz - 1)] = wall;
        }
    }

    function stampWordCubes(n, heights, edits, wordCells, words, cx, cz, village, ponds, treeSet) {
        const list = (words || []).filter(function (w) { return w && w.text; }).slice(0, 8);
        if (!list.length) return;
        const spots = [
            [cx - 5, cz + 9], [cx - 3, cz + 11], [cx + 2, cz + 10],
            [cx - 9, cz + 3], [cx + 6, cz - 3], [cx - 4, cz - 8],
            [cx + 3, cz + 7], [cx - 8, cz - 5]
        ];
        let i = 0;
        spots.forEach(function (spot) {
            if (i >= list.length) return;
            const x = spot[0], z = spot[1];
            if (x < 2 || z < 2 || x >= n - 2 || z >= n - 2) return;
            if (inRect(x, z, village) || ponds[x + ',' + z] || treeSet[x + ',' + z]) return;
            if (Math.abs(x - cx) <= 2 && Math.abs(z - cz) <= 2) return;
            const y = heights[z * n + x];
            const key = x + ',' + y + ',' + z;
            edits[key] = 'word';
            wordCells[key] = list[i];
            i += 1;
        });
    }

    function addWordArch(n, heights, edits, gates, x, z, axis, word) {
        if (!word || x < 2 || z < 2 || x >= n - 2 || z >= n - 2) return;
        const y = heights[z * n + x] || 4;
        const cells = [];
        const put = function (ix, iy, iz, kind) {
            const key = ix + ',' + iy + ',' + iz;
            edits[key] = kind;
            cells.push(key);
        };
        for (let i = -1; i <= 1; i += 1) {
            const ix = axis === 'x' ? x : x + i;
            const iz = axis === 'x' ? z + i : z;
            put(ix, y, iz, i === 0 ? 'gate' : 'log');
            put(ix, y + 1, iz, i === 0 ? 'gate' : 'log');
            put(ix, y + 2, iz, i === 0 ? 'word' : 'plank');
        }
        gates.push({ x: x, z: z, y: y, word: word, open: false, cells: cells });
    }

    function stampWordGates(n, heights, edits, words, cx, cz, village) {
        const list = (words || []).filter(function (w) { return w && w.text; }).slice(0, 4);
        const gates = [];
        if (!list.length) return gates;
        addWordArch(n, heights, edits, gates, cx + 5, cz, 'x', list[0]);
        addWordArch(n, heights, edits, gates, cx - 6, cz + 1, 'x', list[1] || list[0]);
        if (village && village.houses && village.houses.length) {
            const house = village.houses.filter(function (h) { return h.role === 'word'; })[0] || village.houses[0];
            addWordArch(n, heights, edits, gates, house.x + Math.floor(house.w / 2), house.z + house.d, 'z', list[2] || list[0]);
        }
        return gates;
    }

    function openWordGate(world, gate) {
        if (!world || !gate || gate.open) return false;
        gate.open = true;
        if (!world.edits) world.edits = {};
        (gate.cells || []).forEach(function (key) {
            world.edits[key] = null;
        });
        return true;
    }

    function carveCaves(n, heights, hollow, rng, climate, cx, cz, village, treeSet, ponds) {
        const worms = climate === 'quarry' ? 22 : climate === 'astral' ? 8 : 14;
        const starts = [];
        if (climate !== 'astral') {
            starts.push([cx - 16, cz - 8], [cx - 10, cz + 14], [cx + 6, cz - 18]);
        }
        for (let w = 0; w < worms; w += 1) {
            starts.push([6 + Math.floor(rng() * (n - 12)), 6 + Math.floor(rng() * (n - 12))]);
        }
        starts.forEach(function (start) {
            let x = start[0], z = start[1];
            if (Math.abs(x - cx) < 8 && Math.abs(z - cz) < 8) return;
            if (inRect(x, z, village)) return;
            const h0 = heights[z * n + x] || 4;
            let y = Math.max(2, Math.min(h0 - 3, 2 + Math.floor(rng() * Math.max(1, h0 - 4))));
            const steps = 22 + Math.floor(rng() * 18);
            for (let s = 0; s < steps; s += 1) {
                for (let dy = -1; dy <= 1; dy += 1) {
                    for (let dz = -1; dz <= 0; dz += 1) {
                        for (let dx = -1; dx <= 0; dx += 1) {
                            const xx = x + dx, yy = y + dy, zz = z + dz;
                            if (xx < 1 || zz < 1 || xx >= n - 1 || zz >= n - 1 || yy < 1) continue;
                            if (inRect(xx, zz, village)) continue;
                            if (treeSet[xx + ',' + zz]) continue;
                            const top = heights[zz * n + xx];
                            if (yy >= top) continue;
                            if (ponds[xx + ',' + zz] && yy >= top - 1) continue;
                            if (yy === top - 1 && rng() > 0.12) continue;
                            hollow[xx + ',' + yy + ',' + zz] = 1;
                        }
                    }
                }
                x += Math.floor(rng() * 3) - 1;
                z += Math.floor(rng() * 3) - 1;
                y += Math.floor(rng() * 3) - 1;
                x = Math.max(2, Math.min(n - 3, x));
                z = Math.max(2, Math.min(n - 3, z));
                const nh = heights[z * n + x] || 4;
                y = Math.max(1, Math.min(nh - 2, y));
            }
        });
    }

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
        if (climateName === 'desert' || climateName === 'nether' || climateName === 'cherry') {
            const forced = climateName === 'desert' ? 2 : climateName === 'nether' ? 3 : 1;
            biomes.fill(forced);
        }
        const cx = Math.floor(n / 2), cz = Math.floor(n / 2);
        const base = at(cx, cz);
        for (let dz = -1; dz <= 1; dz += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
                put(cx + dx, cz + dz, base);
                biomes[(cz + dz) * n + (cx + dx)] = climateName === 'astral' ? 4
                    : climateName === 'nether' ? 3
                    : climateName === 'desert' ? 2
                    : climateName === 'quarry' ? 3
                    : climateName === 'cherry' ? 1
                    : 0;
            }
        }
        const village = villagePlan(climateName, cx, cz);
        const ponds = {};
        stampPonds(n, ponds, rng, climateName, cx, cz, village);
        const edits = {};
        stampVillage(n, heights, edits, ponds, village);
        const trees = [];
        let guard = 0;
        const wantTrees = climate.trees;
        while (trees.length < wantTrees && guard < 4000) {
            guard += 1;
            const tx = 3 + Math.floor(rng() * (n - 6));
            const tz = 3 + Math.floor(rng() * (n - 6));
            if (Math.abs(tx - cx) <= 3 && Math.abs(tz - cz) <= 3) continue;
            if (inRect(tx, tz, village) || ponds[tx + ',' + tz]) continue;
            const biome = BIOME_NAMES[biomes[tz * n + tx]];
            const minGap = climateName === 'desert' || biome === 'desert' ? 3
                : climateName === 'nether' ? 6
                : 5;
            if (trees.some(function (t) { return Math.abs(t.x - tx) + Math.abs(t.z - tz) < minGap; })) continue;
            const roll = rng();
            let species = 'oak';
            if (climateName === 'nether') species = 'crimson';
            else if (climateName === 'desert' || biome === 'desert') species = 'cactus';
            else if (climateName === 'cherry') species = 'cherry';
            else if (biome === 'snow' || climateName === 'astral') species = roll < 0.88 ? 'spruce' : 'birch';
            else if (biome === 'forest' || climateName === 'crystal') species = roll < climate.spruce ? 'spruce' : (roll < climate.spruce + climate.birch ? 'birch' : 'oak');
            else if (roll < climate.oak) species = 'oak';
            else if (roll < climate.oak + climate.birch) species = 'birch';
            else species = 'spruce';
            const trunk = species === 'cactus'
                ? 2 + Math.floor(rng() * 3)
                : species === 'crimson'
                    ? 3 + Math.floor(rng() * 2)
                    : species === 'cherry'
                        ? 5 + Math.floor(rng() * 2)
                        : species === 'spruce'
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
            if (inRect(fx, fz, village) || ponds[fx + ',' + fz]) continue;
            const biome = BIOME_NAMES[biomes[fz * n + fx]];
            if (biome === 'desert' || biome === 'snow' || climateName === 'nether') continue;
            if (trees.some(function (t) { return t.x === fx && t.z === fz; })) continue;
            const kind = climateName === 'cherry'
                ? (rng() > 0.4 ? 'petal' : 'sakura')
                : climateName === 'duskvale'
                    ? (rng() > 0.5 ? 'amber' : 'poppy')
                    : climateName === 'crystal'
                        ? (rng() > 0.5 ? 'crystal' : 'dandelion')
                        : (rng() > 0.45 ? 'poppy' : 'dandelion');
            flowers.push({ x: fx, z: fz, kind: kind });
        }
        const plants = ((village && village.crops) || []).slice();
        const wantPlants = climateName === 'nether' ? 28 : climateName === 'desert' ? 18 : Math.max(24, Math.floor(climate.flowers * 0.55));
        guard = 0;
        while (plants.length < wantPlants && guard < 2200) {
            guard += 1;
            const px = 2 + Math.floor(rng() * (n - 4));
            const pz = 2 + Math.floor(rng() * (n - 4));
            if (Math.abs(px - cx) <= 2 && Math.abs(pz - cz) <= 2) continue;
            if (inRect(px, pz, village) || ponds[px + ',' + pz]) continue;
            if (trees.some(function (t) { return t.x === px && t.z === pz; })) continue;
            const pkind = climateName === 'nether'
                ? (rng() > 0.5 ? 'wart' : 'mushroom')
                : climateName === 'desert'
                    ? (rng() > 0.45 ? 'deadbush' : 'tumble')
                    : climateName === 'cherry'
                        ? (rng() > 0.5 ? 'bush' : 'petalplant')
                        : climateName === 'crystal'
                            ? (rng() > 0.5 ? 'crystalbush' : 'reed')
                            : (rng() > 0.5 ? 'tallgrass' : (rng() > 0.45 ? 'bush' : 'reed'));
            plants.push({ x: px, z: pz, kind: pkind });
        }
        const animals = [];
        const animalKinds = climateName === 'nether' || climateName === 'desert' ? []
            : climateName === 'crystal' ? ['sheep', 'chicken']
                : ['pig', 'cow', 'sheep', 'chicken'];
        guard = 0;
        while (animals.length < animalKinds.length * 3 && guard < 1600 && animalKinds.length) {
            guard += 1;
            const ax = 4 + Math.floor(rng() * (n - 8));
            const az = 4 + Math.floor(rng() * (n - 8));
            if (Math.abs(ax - cx) <= 3 && Math.abs(az - cz) <= 3) continue;
            if (inRect(ax, az, village) || ponds[ax + ',' + az]) continue;
            if (trees.some(function (t) { return Math.abs(t.x - ax) + Math.abs(t.z - az) < 2; })) continue;
            animals.push({
                x: ax + 0.5,
                z: az + 0.5,
                kind: animalKinds[animals.length % animalKinds.length],
                yaw: rng() * Math.PI * 2,
                phase: rng()
            });
        }
        const treeSet = {};
        trees.forEach(function (t) { treeSet[t.x + ',' + t.z] = 1; });
        const wordCells = {};
        stampWordCubes(n, heights, edits, wordCells, opts.words, cx, cz, village, ponds, treeSet);
        const wordGates = stampWordGates(n, heights, edits, opts.words, cx, cz, village);
        const hollow = {};
        carveCaves(n, heights, hollow, rng, climateName, cx, cz, village, treeSet, ponds);
        return {
            seed: seed || 7,
            climate: climateName,
            size: n,
            heights: heights,
            biomes: biomes,
            trees: trees,
            treeCols: buildTreeCols(trees),
            flowers: flowers,
            plants: plants,
            animals: animals,
            villagers: village && village.villagers ? village.villagers.slice() : [],
            beds: village && village.beds ? village.beds.slice() : [],
            garden: village && village.garden ? village.garden : null,
            well: village && village.well ? village.well : null,
            edits: edits,
            ponds: ponds,
            hollow: hollow,
            wordCells: wordCells,
            wordGates: wordGates,
            houses: village && village.houses ? village.houses.slice() : [],
            surfaceAt: function (x, z) { return surfaceAtWorld(this, x, z); },
            treeAt: function (x, z) {
                return trees.find(function (t) { return t.x === x && t.z === z; }) || null;
            }
        };
    }

    /* ---------- 调色 ---------- */
    function blockColor(kind, x, y, z, species, climate) {
        const v = hash3(x, y, z) * 0.1 - 0.05;
        const grass = climate === 'cherry' ? [0.78, 0.62, 0.72]
            : climate === 'duskvale' ? [0.78, 0.58, 0.32]
            : climate === 'crystal' ? [0.42, 0.78, 0.74]
            : [0.64, 0.86, 0.48];
        const log = species === 'cactus' ? [0.28, 0.62, 0.32]
            : species === 'crimson' ? [0.46, 0.16, 0.18]
            : species === 'cherry' ? [0.58, 0.34, 0.40]
            : species === 'birch' ? [0.94, 0.90, 0.80]
            : species === 'spruce' ? [0.72, 0.58, 0.42]
            : [0.92, 0.74, 0.52];
        const leaf = species === 'cactus' ? [0.32, 0.70, 0.34]
            : species === 'crimson' ? [0.82, 0.22, 0.28]
            : species === 'cherry' ? [0.96, 0.58, 0.76]
            : species === 'birch' ? [0.80, 0.94, 0.52]
            : species === 'spruce' ? [0.52, 0.80, 0.58]
            : [0.68, 0.92, 0.52];
        const pal = {
            grass: grass,
            dirt: [0.90, 0.74, 0.54],
            sand: [0.91, 0.82, 0.52],
            snow: [0.92, 0.95, 0.98],
            stone: climate === 'nether' ? [0.42, 0.18, 0.16] : [0.62, 0.62, 0.65],
            log: log,
            leaf: leaf,
            water: [0.22, 0.48, 0.78],
            coal: [0.28, 0.28, 0.3],
            iron: [0.78, 0.7, 0.52],
            gold: [0.94, 0.78, 0.28],
            diamond: [0.42, 0.86, 0.88],
            plank: [0.90, 0.72, 0.48],
            table: [0.78, 0.52, 0.28],
            word: [0.95, 0.78, 0.28],
            gate: [0.86, 0.62, 0.18]
        };
        const base = pal[kind] || pal.dirt;
        if (climate === 'nether' && kind !== 'log' && kind !== 'leaf') {
            return [base[0] * 0.72 + 0.22 + v, base[1] * 0.38 + 0.04 + v, base[2] * 0.34 + 0.02 + v];
        }
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

    function tileIndex(kind, dir, species, climate) {
        if (kind === 'crack') {
            const stage = Math.max(0, Math.min(3, Number(dir) || 0));
            return CRACK_TILE0 + stage;
        }
        if (kind === 'grass') {
            if (dir === '+y') {
                if (climate === 'cherry') return 23;
                if (climate === 'duskvale') return 29;
                if (climate === 'crystal') return 30;
                return 0;
            }
            if (dir === '-y') return 2;
            return 1;
        }
        if (kind === 'sand') return 24;
        if (kind === 'dirt') return 2;
        if (kind === 'snow') return dir === '+y' || dir === '-y' ? 0 : 2;
        if (kind === 'stone') return climate === 'nether' ? 25 : 3;
        if (kind === 'log') {
            if (species === 'cactus') return 28;
            if (species === 'crimson') return 26;
            if (species === 'cherry') return (dir === '+y' || dir === '-y') ? 21 : 20;
            if (species === 'birch') return (dir === '+y' || dir === '-y') ? 9 : 8;
            if (species === 'spruce') return (dir === '+y' || dir === '-y') ? 12 : 11;
            return (dir === '+y' || dir === '-y') ? 5 : 4;
        }
        if (kind === 'leaf') {
            if (species === 'cactus') return 28;
            if (species === 'crimson') return 27;
            if (species === 'cherry') return 22;
            if (species === 'birch') return 10;
            if (species === 'spruce') return 13;
            return 6;
        }
        if (kind === 'water') return 14;
        if (kind === 'coal') return 15;
        if (kind === 'gold') return 32;
        if (kind === 'diamond') return 33;
        if (kind === 'iron') return 3;
        if (kind === 'plank') return 5;
        if (kind === 'table') return 5;
        if (kind === 'word' || kind === 'gate') return 7;
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
            grass: [138, 206, 96],
            dirt: [198, 152, 104],
            dirtDark: [156, 114, 74],
            dirtLight: [226, 184, 128],
            stone: [127, 127, 127],
            oak: [204, 156, 96],
            oakDark: [158, 114, 72],
            oakHeart: [232, 196, 140],
            birch: [240, 232, 214],
            birchDark: [120, 108, 90],
            spruce: [148, 114, 78],
            oakLeaf: [132, 208, 102],
            birchLeaf: [168, 216, 104],
            spruceLeaf: [110, 176, 122],
            cherry: [148, 86, 96],
            cherryDark: [92, 48, 58],
            cherryHeart: [210, 168, 150],
            cherryLeaf: [236, 132, 178],
            cherryGrass: [186, 148, 168],
            sand: [232, 206, 128],
            sandDark: [198, 168, 88],
            nether: [98, 36, 32],
            netherDark: [58, 18, 16],
            crimson: [118, 42, 48],
            crimsonDark: [64, 18, 22],
            crimsonCap: [196, 48, 62],
            cactus: [72, 148, 64],
            cactusDark: [36, 88, 40],
            duskGrass: [196, 132, 64],
            crystalGrass: [88, 186, 176]
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
                const c = mul(C.grass, 0.9);
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
                const edge = mul(C.grass, 0.82);
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
                    if (n2(x, y, seed) < 0.04) {
                        px(tx, ty, x, y, 0, 0, 0, 0);
                        continue;
                    }
                    const f = n2(x, y, seed + 1) < 0.28 ? 1.22 : 1.06;
                    const c = mul(base, f * lum(x, y, seed + 2, 0.08));
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
        function paintWord(tx, ty) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const edge = x === 0 || y === 0 || x === 15 || y === 15;
                    if (edge) {
                        px(tx, ty, x, y, 118, 72, 28);
                        continue;
                    }
                    const c = mul([236, 196, 72], lum(x, y, 90, 0.1));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
            for (let y = 4; y <= 11; y += 1) {
                px(tx, ty, 5, y, 70, 42, 18);
                px(tx, ty, 10, y, 70, 42, 18);
            }
            for (let x = 5; x <= 10; x += 1) {
                px(tx, ty, x, 4, 70, 42, 18);
                px(tx, ty, x, 8, 70, 42, 18);
            }
        }
        function paintWater(tx, ty) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const wave = 0.88 + n2(x, y, 70) * 0.18 + ((x + y) % 5 === 0 ? 0.08 : 0);
                    px(tx, ty, x, y, 36 * wave, 92 * wave, 168 * wave);
                }
            }
            for (let i = 0; i < 10; i += 1) {
                const x = Math.floor(n2(i, 1, 71) * tile);
                const y = Math.floor(n2(i, 2, 72) * tile);
                px(tx, ty, x, y, 120, 190, 230);
            }
        }
        function paintCoal(tx, ty) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const c = mul([52, 52, 56], lum(x, y, 80, 0.12));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
            for (let i = 0; i < 18; i += 1) {
                const x = Math.floor(n2(i, 1, 81) * tile);
                const y = Math.floor(n2(i, 2, 82) * tile);
                px(tx, ty, x, y, 18, 18, 20);
            }
            for (let i = 0; i < 6; i += 1) {
                const x = Math.floor(n2(i, 3, 83) * tile);
                const y = Math.floor(n2(i, 4, 84) * tile);
                px(tx, ty, x, y, 90, 90, 96);
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
        paintWord(3, 1);
        paintLogSide(0, 2, C.birch, C.birchDark, 9);
        paintLogTop(1, 2, C.birch, [236, 228, 210], 10);
        paintLeaf(2, 2, C.birchLeaf, 11);
        paintLogSide(3, 2, C.spruce, [48, 36, 22], 12);
        paintLogTop(0, 3, C.spruce, [148, 113, 64], 13);
        paintLeaf(1, 3, C.spruceLeaf, 14);
        paintWater(2, 3);
        paintCoal(3, 3);
        paintCrack(0, 4, 0);
        paintCrack(1, 4, 1);
        paintCrack(2, 4, 2);
        paintCrack(3, 4, 3);
        function paintTintedGrass(tx, ty, base, seed) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const c = mul(base, lum(x, y, seed, 0.12));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
            for (let i = 0; i < 18; i += 1) {
                const x = Math.floor(n2(i, 8, seed + 2) * tile);
                const y = Math.floor(n2(i, 9, seed + 3) * tile);
                const c = mul(base, 1.16);
                px(tx, ty, x, y, c[0], c[1], c[2]);
            }
        }
        function paintSand(tx, ty) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const c = mul(C.sand, lum(x, y, 60, 0.08));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
            for (let i = 0; i < 20; i += 1) {
                const x = Math.floor(n2(i, 1, 61) * tile);
                const y = Math.floor(n2(i, 2, 62) * tile);
                px(tx, ty, x, y, C.sandDark[0], C.sandDark[1], C.sandDark[2]);
            }
        }
        function paintNether(tx, ty) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const c = mul(C.nether, lum(x, y, 63, 0.1));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
            for (let i = 0; i < 14; i += 1) {
                const x = Math.floor(n2(i, 1, 64) * tile);
                const y = Math.floor(n2(i, 2, 65) * tile);
                px(tx, ty, x, y, C.netherDark[0], C.netherDark[1], C.netherDark[2]);
            }
            for (let i = 0; i < 5; i += 1) {
                const x = Math.floor(n2(i, 3, 66) * tile);
                const y = Math.floor(n2(i, 4, 67) * tile);
                px(tx, ty, x, y, 180, 72, 36);
            }
        }
        function paintCactus(tx, ty) {
            for (let x = 0; x < tile; x += 1) {
                const rib = x % 4 === 0;
                for (let y = 0; y < tile; y += 1) {
                    const c = mul(rib ? C.cactusDark : C.cactus, lum(x, y, 68, 0.08));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
        }
        paintLogSide(0, 5, C.cherry, C.cherryDark, 40);
        paintLogTop(1, 5, C.cherry, C.cherryHeart, 41);
        paintLeaf(2, 5, C.cherryLeaf, 42);
        paintTintedGrass(3, 5, C.cherryGrass, 43);
        paintSand(0, 6);
        paintNether(1, 6);
        paintLogSide(2, 6, C.crimson, C.crimsonDark, 50);
        paintLeaf(3, 6, C.crimsonCap, 51);
        paintCactus(0, 7);
        paintTintedGrass(1, 7, C.duskGrass, 52);
        paintTintedGrass(2, 7, C.crystalGrass, 53);
        function paintOre(tx, ty, base, spark, seed) {
            for (let y = 0; y < tile; y += 1) {
                for (let x = 0; x < tile; x += 1) {
                    const c = mul(C.stone, lum(x, y, seed, 0.08));
                    px(tx, ty, x, y, c[0], c[1], c[2]);
                }
            }
            for (let i = 0; i < 16; i += 1) {
                const x = Math.floor(n2(i, 1, seed + 2) * tile);
                const y = Math.floor(n2(i, 2, seed + 3) * tile);
                px(tx, ty, x, y, base[0], base[1], base[2]);
                if (i % 3 === 0) px(tx, ty, x, y, spark[0], spark[1], spark[2]);
            }
        }
        paintOre(0, 8, [214, 176, 48], [255, 230, 120], 70);
        paintOre(1, 8, [72, 210, 214], [180, 250, 255], 71);
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

    function oreNoise(x, y, z) {
        let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647)) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    function oreOrStone(x, y, z, climate) {
        const n = oreNoise(x, y + 11, z);
        const gemCut = climate === 'crystal' ? 0.982 : 0.994;
        const goldCut = climate === 'nether' ? 0.968 : 0.988;
        if (n > gemCut) return 'diamond';
        if (n > goldCut) return 'gold';
        if (n > 0.975) return 'iron';
        if (n > 0.94) return 'coal';
        return 'stone';
    }

    function groundKind(world, x, y, z) {
        const h = rawHeight(world, x, z);
        if (y < 0 || y >= h) return null;
        if (world.climate === 'nether') {
            if (y >= h - 2) return 'stone';
            return oreOrStone(x, y, z, world.climate);
        }
        const biome = biomeAt(world, x, z);
        if (world.climate === 'desert' || biome === 'desert') {
            if (y >= h - 2) return 'sand';
            return oreOrStone(x, y, z, world.climate);
        }
        if (biome === 'snow') {
            if (y === h - 1) return 'snow';
            if (y === h - 2) return 'dirt';
            return oreOrStone(x, y, z, world.climate);
        }
        if (biome === 'mountain' && h >= 11 && y === h - 1 && world.climate !== 'crystal' && world.climate !== 'cherry') return 'stone';
        if (y === h - 1) return 'grass';
        if (y === h - 2) return 'dirt';
        return oreOrStone(x, y, z, world.climate);
    }

    function eachTreeVoxel(tree, fn) {
        const species = tree.species || 'oak';
        for (let i = 0; i < tree.trunk; i += 1) fn(tree.x, tree.surface + i, tree.z, 'log', species);
        const ty = tree.surface + tree.trunk;
        if (species === 'cactus') {
            const h = hash3(tree.x, 9, tree.z);
            const ay = tree.surface + Math.max(1, tree.trunk - 2);
            if (h > 0.32) {
                const dir = h > 0.66 ? 1 : -1;
                fn(tree.x + dir, ay, tree.z, 'log', species);
                if (h > 0.78) fn(tree.x + dir, ay + 1, tree.z, 'log', species);
            }
            if (h < 0.48) fn(tree.x, ay, tree.z + (h < 0.24 ? 1 : -1), 'log', species);
            return;
        }
        if (species === 'crimson') {
            for (let dz = -2; dz <= 2; dz += 1) {
                for (let dx = -2; dx <= 2; dx += 1) {
                    if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
                    fn(tree.x + dx, ty, tree.z + dz, 'leaf', species);
                }
            }
            for (let dz = -1; dz <= 1; dz += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    fn(tree.x + dx, ty + 1, tree.z + dz, 'leaf', species);
                }
            }
            return;
        }
        if (species === 'cherry') {
            for (let ly = 0; ly < 3; ly += 1) {
                const r = ly === 2 ? 1 : 2;
                for (let dz = -r; dz <= r; dz += 1) {
                    for (let dx = -r; dx <= r; dx += 1) {
                        if (dx === 0 && dz === 0 && ly === 0) continue;
                        if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && ly === 0) continue;
                        fn(tree.x + dx, ty - 1 + ly, tree.z + dz, 'leaf', species);
                    }
                }
            }
            fn(tree.x, ty + 2, tree.z, 'leaf', species);
            fn(tree.x + 1, ty - 2, tree.z, 'leaf', species);
            fn(tree.x - 1, ty - 2, tree.z + 1, 'leaf', species);
            return;
        }
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
        if (world.hollow && world.hollow[key]) return null;
        const tree = treeVoxelAt(world, x, y, z);
        if (tree) return tree.kind;
        if (world.ponds && world.ponds[x + ',' + z] && y === rawHeight(world, x, z) - 1) return 'water';
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

    function inHouse(world, x, z) {
        const houses = world && world.houses;
        if (!houses || !houses.length) return false;
        const ix = Math.floor(x), iz = Math.floor(z);
        for (let i = 0; i < houses.length; i += 1) {
            const h = houses[i];
            if (ix >= h.x && ix < h.x + h.w && iz >= h.z && iz < h.z + h.d) return true;
        }
        return false;
    }

    function columnBlockedAt(world, px, pz, feetY) {
        const cx = Math.floor(px), cz = Math.floor(pz);
        if (!world) return true;
        if (world.surfaceAt(cx, cz) - feetY > STEP_UP) return true;
        const y0 = Math.floor(feetY + 0.35);
        const y1 = Math.floor(feetY + 1.55);
        for (let y = y0; y <= y1; y += 1) {
            const kind = voxelAt(world, cx, y, cz);
            if (kind && kind !== 'water') return true;
        }
        return false;
    }

    function wallBetween(world, ax, ay, az, bx, by, bz) {
        const dx = bx - ax, dy = by - ay, dz = bz - az;
        const dist = Math.hypot(dx, dy, dz) || 1;
        const steps = Math.max(4, Math.ceil(dist / 0.12));
        const minY = Math.min(ay, by) - 0.25;
        const stop = Math.max(0.2, dist - 0.35);
        for (let i = 1; i < steps; i += 1) {
            const t = i / steps;
            if (t * dist > stop) break;
            const y = ay + dy * t;
            if (y < minY) continue;
            const kind = voxelAt(world, Math.floor(ax + dx * t), Math.floor(y), Math.floor(az + dz * t));
            if (kind && kind !== 'water') return true;
        }
        return false;
    }

    function isGroundKind(kind) {
        return kind === 'grass' || kind === 'dirt' || kind === 'stone' || kind === 'sand' || kind === 'snow'
            || kind === 'water' || kind === 'coal' || kind === 'iron' || kind === 'gold' || kind === 'diamond' || kind === 'plank';
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
        const allowed = { dirt: true, stone: true, log: true, plank: true, table: true };
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
            const rgb = blockColor(faceKind(f.kind, f.dir), f.x, f.y, f.z, species, world.climate);
            const s = faceShade(f.dir);
            const aos = vertexAO(world, f.x, f.y, f.z, f.dir);
            const colors = aos.map(function (a) {
                return [rgb[0] * s * a, rgb[1] * s * a, rgb[2] * s * a];
            });
            const flip = aos[0] + aos[2] > aos[1] + aos[3];
            pushQuad(arr, f.nrm, colors, f.corners, tileCornersUV(tileIndex(f.kind, f.dir, species, world.climate)), flip);
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
        const hemi = new THREE.HemisphereLight(0xfff4d8, 0x6b8a4a, 0.88);
        scene.add(hemi);
        const sun = new THREE.DirectionalLight(0xfff2d0, 0.85);
        sun.position.set(30, 50, 20);
        scene.add(sun);

        const SKY_FILES = {
            plains: './assets/sky/plains.png',
            cherry: './assets/sky/cherry.png',
            desert: './assets/sky/desert.png',
            nether: './assets/sky/nether.png',
            duskvale: './assets/sky/duskvale.png',
            crystal: './assets/sky/crystal.png'
        };
        const CLIMATE_LIGHT = {
            plains: { hemi: 0xfff4d8, ground: 0x6b8a4a, sun: 0xfff2d0, cloud: 0xf4f7fb },
            cherry: { hemi: 0xffd6e8, ground: 0x8a6a78, sun: 0xffc8d8, cloud: 0xffd0e4 },
            desert: { hemi: 0xffe6a8, ground: 0xc4a060, sun: 0xffe8b0, cloud: 0xfff0d0 },
            duskvale: { hemi: 0xffc898, ground: 0x6a4a38, sun: 0xffb070, cloud: 0xffc8a0 },
            crystal: { hemi: 0xc8f0ff, ground: 0x3a6a78, sun: 0xb8e8f8, cloud: 0xd0f4ff },
            nether: { hemi: 0xff6040, ground: 0x3a1010, sun: 0xff4020, cloud: 0x6a2020 }
        };
        function applySky(climateName) {
            const sky = climateOf(climateName).sky;
            const light = CLIMATE_LIGHT[climateName] || CLIMATE_LIGHT.plains;
            hemi.color.setHex(light.hemi);
            hemi.groundColor.setHex(light.ground);
            sun.color.setHex(light.sun);
            scene.background = new THREE.Color(sky);
            scene.fog = new THREE.Fog(sky, climateName === 'nether' ? 28 : 46, climateName === 'nether' ? 62 : 78);
            const file = SKY_FILES[climateName];
            if (!file) return;
            const loader = new THREE.TextureLoader();
            loader.load(file, function (tex) {
                tex.magFilter = THREE.LinearFilter;
                tex.minFilter = THREE.LinearFilter;
                scene.background = tex;
            });
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

        const flowerColors = {
            poppy: 0xd63a3a,
            dandelion: 0xffe14a,
            petal: 0xf4a0c8,
            sakura: 0xffd0e8,
            amber: 0xe07a28,
            crystal: 0x7ee8e0
        };
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
            function boxMesh(w, h, d, color, y) {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: color }));
                mesh.position.y = y;
                return mesh;
            }
            function propOf(name, fallback) {
                const P = global.BlockLegendProps3d;
                if (P && typeof P[name] === 'function') return P[name](THREE);
                return fallback();
            }
            function placeLife(mesh, x, z, yOff) {
                const y = world.surfaceAt(Math.floor(x), Math.floor(z)) + (yOff || 0);
                mesh.position.set(x, y, z);
                decor.add(mesh);
                return mesh;
            }
            const plantTint = {
                tallgrass: 0x5aaa32,
                bush: 0x3d8a28,
                reed: 0x6aa84a,
                deadbush: 0x8a6230,
                tumble: 0xa07840,
                wart: 0x8a2030,
                mushroom: 0xc43a3a,
                petalplant: 0xf4a0c8,
                crystalbush: 0x7ee8e0,
                wheat: 0xd8b44a
            };
            (world.plants || []).forEach(function (p) {
                const tint = plantTint[p.kind] || 0x5aaa32;
                const tall = p.kind === 'reed' || p.kind === 'tallgrass' || p.kind === 'wheat';
                const stem = new THREE.Mesh(
                    new THREE.BoxGeometry(p.kind === 'bush' || p.kind === 'crystalbush' ? 0.34 : 0.1, tall ? 0.62 : 0.38, p.kind === 'bush' || p.kind === 'crystalbush' ? 0.34 : 0.1),
                    new THREE.MeshLambertMaterial({ color: tint })
                );
                const y = (p.y != null ? p.y : world.surfaceAt(p.x, p.z));
                stem.position.set(p.x + 0.5, y + (tall ? 0.32 : 0.2), p.z + 0.5);
                decor.add(stem);
            });
            (world.beds || []).forEach(function (b) {
                const bed = propOf('createBed', function () {
                    const g = new THREE.Group();
                    g.add(boxMesh(0.9, 0.18, 0.55, 0x6d4c41, 0.12));
                    g.add(boxMesh(0.28, 0.1, 0.4, 0xf5f5f5, 0.24));
                    const blanket = boxMesh(0.58, 0.1, 0.5, 0xc62828, 0.24);
                    blanket.position.x = 0.14;
                    g.add(blanket);
                    return g;
                });
                bed.position.set(b.x + 0.5, b.y, b.z + 0.5);
                decor.add(bed);
            });
            (world.villagers || []).forEach(function (v) {
                const npc = propOf('createVillager', function () {
                    const g = new THREE.Group();
                    g.add(boxMesh(0.34, 0.42, 0.22, v.role === 'trader' ? 0x4a6a8a : 0x8b4513, 0.72));
                    g.add(boxMesh(0.28, 0.26, 0.26, 0xd2a679, 1.06));
                    g.add(boxMesh(0.1, 0.1, 0.12, 0xc49a6c, 0.98));
                    g.add(boxMesh(0.12, 0.28, 0.12, 0x5a3a1a, 0.2));
                    g.add(boxMesh(0.12, 0.28, 0.12, 0x5a3a1a, 0.2));
                    return g;
                });
                v.mesh = placeLife(npc, v.x, v.z, 0);
            });
            (world.animals || []).forEach(function (a) {
                const factory = a.kind === 'cow' ? 'createCow'
                    : a.kind === 'sheep' ? 'createSheep'
                        : a.kind === 'chicken' ? 'createChicken'
                            : 'createPig';
                const animal = propOf(factory, function () {
                    const g = new THREE.Group();
                    const color = a.kind === 'cow' ? 0x6b4424 : a.kind === 'sheep' ? 0xf4f0ea : a.kind === 'chicken' ? 0xf4f0ea : 0xf2a0b4;
                    g.add(boxMesh(a.kind === 'chicken' ? 0.28 : 0.55, a.kind === 'chicken' ? 0.28 : 0.36, a.kind === 'chicken' ? 0.28 : 0.7, color, a.kind === 'chicken' ? 0.38 : 0.42));
                    return g;
                });
                a.mesh = placeLife(animal, a.x, a.z, 0);
                animal.rotation.y = a.yaw || 0;
            });
            const cloudHex = (CLIMATE_LIGHT[world.climate] || CLIMATE_LIGHT.plains).cloud;
            const cloudMat = new THREE.MeshLambertMaterial({ color: cloudHex });
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

        const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 220);
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
            return columnBlockedAt(world, px, pz, feetY);
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
        let moveLocked = false;
        function refreshKeys() {
            if (moveLocked) {
                input.fwd = false;
                input.back = false;
                input.left = false;
                input.right = false;
                input.jump = false;
                return;
            }
            input.fwd = !!(keys['w'] || keys['arrowup']);
            input.back = !!(keys['s'] || keys['arrowdown']);
            input.left = !!(keys['a'] || keys['arrowleft']);
            input.right = !!(keys['d'] || keys['arrowright']);
            input.jump = !!keys[' '];
        }

        let pointerLocked = false;
        let lookFrozen = false;
        let dragLook = null; // PointerLock 不可用（部分 WebView/触屏）时的拖动视角兜底
        const SENS = 0.0026, DRAG_SENS = 0.005;
        function syncLookTip() {
            const tip = document.getElementById('look-tip');
            if (!tip) return;
            tip.classList.toggle('is-hidden', lookFrozen || pointerLocked);
        }
        function setUiMode(on) {
            lookFrozen = !!on;
            dragLook = null;
            if (lookFrozen && document.exitPointerLock && document.pointerLockElement) {
                document.exitPointerLock();
            }
            syncLookTip();
        }
        function resumeLook() {
            lookFrozen = false;
            if (canvas.requestPointerLock) canvas.requestPointerLock();
            syncLookTip();
        }
        function setCastMode(on) {
            lookFrozen = !!on;
            moveLocked = !!on;
            if (moveLocked) {
                input.fwd = false;
                input.back = false;
                input.left = false;
                input.right = false;
                input.jump = false;
            } else {
                refreshKeys();
            }
            syncLookTip();
        }
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
                if (lookFrozen) return;
                if (!pointerLocked && canvas.requestPointerLock) canvas.requestPointerLock();
            });
            document.addEventListener('pointerlockchange', function () {
                pointerLocked = document.pointerLockElement === canvas;
                syncLookTip();
            });
            document.addEventListener('mousemove', function (e) {
                if (lookFrozen || !pointerLocked) return;
                look.yaw -= e.movementX * SENS;
                look.pitch = Math.max(-1.35, Math.min(1.35, look.pitch - e.movementY * SENS));
            });
            canvas.addEventListener('pointerdown', function (e) {
                if (lookFrozen || pointerLocked) return;
                dragLook = { x: e.clientX, y: e.clientY, id: e.pointerId };
            });
            window.addEventListener('pointermove', function (e) {
                if (lookFrozen || !dragLook || e.pointerId !== dragLook.id) return;
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
        function tickLife(dt) {
            (world.animals || []).forEach(function (a) {
                if (!a.mesh) return;
                a.phase = (a.phase || 0) + dt;
                if ((a.phase * 3) % 4 < dt * 3) a.yaw = (a.yaw || 0) + (hash3(Math.floor(a.x), 2, Math.floor(a.z)) - 0.5) * 1.6;
                const step = 0.7 * dt;
                const nx = a.x + Math.sin(a.yaw || 0) * step;
                const nz = a.z + Math.cos(a.yaw || 0) * step;
                if (nx > 2 && nz > 2 && nx < world.size - 2 && nz < world.size - 2
                    && !inHouse(world, nx, nz)
                    && !columnBlockedAt(world, nx, nz, world.surfaceAt(Math.floor(nx), Math.floor(nz)))) {
                    a.x = nx;
                    a.z = nz;
                }
                a.mesh.position.set(a.x, world.surfaceAt(Math.floor(a.x), Math.floor(a.z)), a.z);
                a.mesh.rotation.y = a.yaw || 0;
            });
            (world.villagers || []).forEach(function (v) {
                if (!v.mesh) return;
                v.bob = (v.bob || 0) + dt;
                v.mesh.position.y = world.surfaceAt(Math.floor(v.x), Math.floor(v.z)) + Math.sin(v.bob * 2) * 0.03;
            });
        }
        let tickHook = null;
        function pump(now) {
            const t = (Number(now) || Date.now()) / 1000;
            const dt = Math.min(MAX_DT, lastAt ? t - lastAt : 0.016);
            lastAt = t;
            updatePhysics(dt, input);
            tickLife(dt);
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
            fps: function () { return fps; },
            setUiMode: setUiMode,
            resumeLook: resumeLook,
            setCastMode: setCastMode
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
        placeVoxel: placeVoxel,
        inHouse: inHouse,
        columnBlockedAt: columnBlockedAt,
        wallBetween: wallBetween,
        collectChunkFaces: collectChunkFaces,
        openWordGate: openWordGate,
        create: create
    };
}(typeof window !== 'undefined' ? window : globalThis));
