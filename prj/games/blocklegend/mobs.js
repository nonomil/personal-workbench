/**
 * blocklegend · 角色与特效（T20260815-blocklegend-3d 视觉翻新）
 * 全部程序化生成：怪物多部件体素模型 + 脸贴图 + 走路动画 + 头顶血条、
 * 第一人称手臂+像素剑 viewmodel、3D 伤害数字、魔法弹/金币/死亡粒子。
 * 无 DOM 依赖、无外部素材；接口被 game.js 消费，纯展示层。
 */
(function () {
    'use strict';

    /* ---------- 像素脸贴图（16×16，NearestFilter） ---------- */
    const faceCache = {};

    function faceTexture(kind) {
        if (faceCache[kind]) return faceCache[kind];
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const ctx = c.getContext('2d');
        function px(x, y, r, g, b) {
            ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
            ctx.fillRect(x, y, 1, 1);
        }
        function noise(base, jit, seed) {
            let s = seed;
            return function () {
                s = (s * 9301 + 49297) % 233280;
                const v = (s / 233280 - 0.5) * 2 * jit;
                return [
                    Math.round(base[0] + v * base[0] * 0.5),
                    Math.round(base[1] + v * base[1] * 0.5),
                    Math.round(base[2] + v * base[2] * 0.5)
                ];
            };
        }
        const kinds = {
            slime: { base: [96, 186, 74], eye: [28, 44, 24], glow: [210, 250, 190], mouth: true, horns: false },
            cube: { base: [188, 122, 58], eye: [40, 26, 14], glow: [255, 214, 120], mouth: true, horns: false },
            husk: { base: [128, 132, 138], eye: [34, 30, 28], glow: [255, 170, 60], mouth: true, horns: false },
            boss: { base: [104, 70, 120], eye: [60, 16, 16], glow: [255, 64, 48], mouth: true, horns: true },
            merchant: { base: [224, 178, 128], eye: [52, 38, 28], glow: [255, 236, 200], mouth: false, horns: false }
        };
        const k = kinds[kind] || kinds.husk;
        const rnd = noise(k.base, 0.12, kind.length * 977 + 13);
        for (let y = 0; y < 16; y += 1) {
            for (let x = 0; x < 16; x += 1) {
                const c0 = rnd();
                px(x, y, c0[0], c0[1], c0[2]);
            }
        }
        // 眼睛：外圈眼眶 + 发光瞳，凶相
        [[3, 5], [10, 5]].forEach(function (e) {
            for (let dy = 0; dy < 3; dy += 1) {
                for (let dx = 0; dx < 3; dx += 1) {
                    px(e[0] + dx, e[1] + dy, k.eye[0], k.eye[1], k.eye[2]);
                }
            }
            px(e[0] + 1, e[1] + 1, k.glow[0], k.glow[1], k.glow[2]);
            px(e[0] + 1, e[1] + 2, Math.round(k.glow[0] * 0.7), Math.round(k.glow[1] * 0.45), Math.round(k.glow[2] * 0.3));
        });
        if (k.mouth) {
            for (let x = 5; x <= 10; x += 1) px(x, 11, k.eye[0], k.eye[1], k.eye[2]);
            px(6, 12, k.eye[0], k.eye[1], k.eye[2]); px(9, 12, k.eye[0], k.eye[1], k.eye[2]);
        }
        if (kind === 'merchant') { // 一字眉
            for (let x = 3; x <= 6; x += 1) px(x, 4, 70, 50, 36);
            for (let x = 9; x <= 12; x += 1) px(x, 4, 70, 50, 36);
        }
        const tex = new THREE.CanvasTexture(c);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        faceCache[kind] = tex;
        return tex;
    }

    const SK = window.BlockLegendSkins;
    const skinCache = {};

    function skinTexture(kind) {
        if (skinCache[kind]) return skinCache[kind];
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const data = SK && SK.createSkinImage ? SK.createSkinImage(kind) : new Uint8ClampedArray(64 * 64 * 4);
        const id = ctx.createImageData(64, 64);
        id.data.set(data);
        ctx.putImageData(id, 0, 0);
        const tex = new THREE.CanvasTexture(c);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        skinCache[kind] = tex;
        return tex;
    }

    function setFaceUV(geo, face, x, y, w, h, tw, th) {
        const uv = geo.attributes.uv;
        const i = face * 4;
        const u0 = x / tw;
        const u1 = (x + w) / tw;
        const v1 = 1 - y / th;
        const v0 = 1 - (y + h) / th;
        uv.setXY(i + 0, u0, v1);
        uv.setXY(i + 1, u1, v1);
        uv.setXY(i + 2, u0, v0);
        uv.setXY(i + 3, u1, v0);
    }

    function mapMcBox(geo, tw, u, v, w, h, d) {
        setFaceUV(geo, 0, u + d + w, v + d, d, h, tw, tw);
        setFaceUV(geo, 1, u, v + d, d, h, tw, tw);
        setFaceUV(geo, 2, u + d, v, w, d, tw, tw);
        setFaceUV(geo, 3, u + d + w, v, w, d, tw, tw);
        setFaceUV(geo, 4, u + d, v + d, w, h, tw, tw);
        setFaceUV(geo, 5, u + d + w + d, v + d, w, h, tw, tw);
        geo.attributes.uv.needsUpdate = true;
    }

    function skinnedBox(w, h, d, kind, u, v, px, opts) {
        const o = opts || {};
        const geo = new THREE.BoxGeometry(w * px, h * px, d * px);
        mapMcBox(geo, 64, u, v, w, h, d);
        return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
            map: skinTexture(kind),
            transparent: !!o.transparent,
            opacity: o.opacity == null ? 1 : o.opacity,
            emissive: o.emissive || 0x000000
        }));
    }

    function addHumanoid(g, anim, kind, scale, pose) {
        const px = (1 / 16) * (scale || 1);
        const head = skinnedBox(8, 8, 8, kind, 0, 0, px);
        head.position.y = 28 * px;
        const body = skinnedBox(8, 12, 4, kind, 16, 16, px);
        body.position.y = 18 * px;
        g.add(head);
        g.add(body);
        anim.head = head;
        anim.body = body;
        [[-1, 40, 16], [1, 32, 48]].forEach(function (row) {
            const arm = skinnedBox(4, 12, 4, kind, row[1], row[2], px);
            arm.geometry.translate(0, -6 * px, 0);
            arm.position.set(row[0] * 6 * px, 24 * px, 0);
            if (pose === 'zombie') arm.rotation.x = -Math.PI / 2.4;
            g.add(arm);
            anim.arms.push(arm);
        });
        [[-1, 0, 16], [1, 16, 48]].forEach(function (row) {
            const leg = skinnedBox(4, 12, 4, kind, row[1], row[2], px);
            leg.geometry.translate(0, -6 * px, 0);
            leg.position.set(row[0] * 2 * px, 12 * px, 0);
            g.add(leg);
            anim.legs.push(leg);
        });
        return 32 * px;
    }

    function box(w, h, d, color, opts) {
        const o = opts || {};
        const mat = new THREE.MeshLambertMaterial({
            color: color,
            transparent: !!o.transparent,
            opacity: o.opacity == null ? 1 : o.opacity,
            emissive: o.emissive || 0x000000,
            depthWrite: o.transparent ? false : true
        });
        return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    }

    /** 带脸的头部：正面用脸贴图，其余面用底色 */
    function headMesh(size, kind, baseColor) {
        const sideMat = new THREE.MeshLambertMaterial({ color: baseColor });
        const faceMat = new THREE.MeshLambertMaterial({ map: faceTexture(kind) });
        const mats = [sideMat, sideMat, sideMat, sideMat, faceMat, sideMat]; // +x,-x,+y,-y,+z,-z（脸朝 +z）
        const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mats);
        return m;
    }

    /* ---------- 头顶血条（两个薄盒，游戏循环里朝向相机） ---------- */
    function makeHpBar() {
        const g = new THREE.Group();
        const bg = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 0.12),
            new THREE.MeshBasicMaterial({ color: 0x1c1410, transparent: true, opacity: 0.75, depthTest: false })
        );
        const fill = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 0.12),
            new THREE.MeshBasicMaterial({ color: 0x54d43c, depthTest: false })
        );
        fill.position.z = 0.001;
        bg.renderOrder = 998; fill.renderOrder = 999;
        g.add(bg); g.add(fill);
        g.userData.fill = fill;
        return g;
    }

    /* ---------- 怪物模型 ---------- */
    function create(kind, opts) {
        const o = opts || {};
        const g = new THREE.Group();
        const anim = { legs: [], arms: [], head: null, body: null, phase: Math.random() * 6.28, bob: 0 };
        let height = 1.6;

        if ((kind === 'slime' || kind === 'magma' || kind === 'cube') && window.BlockLegendSlimeModel) {
            const rig = window.BlockLegendSlimeModel.create(THREE, { kind: kind });
            g.add(rig);
            anim.rig = rig;
            height = kind === 'cube' ? 1.05 : 1.1;
        } else if (kind === 'fox' && window.BlockLegendFoxModel) {
            const rig = window.BlockLegendFoxModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 0.85;
        } else if (kind === 'blaze' && window.BlockLegendBlazeModel) {
            const rig = window.BlockLegendBlazeModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 1.7;
        } else if (kind === 'ghast' && window.BlockLegendGhastModel) {
            const rig = window.BlockLegendGhastModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 2.15;
        } else if (kind === 'creeper' && window.BlockLegendCreeperModel) {
            const rig = window.BlockLegendCreeperModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 1.7;
        } else if ((kind === 'zombie' || kind === 'husk') && window.BlockLegendZombieModel) {
            const rig = window.BlockLegendZombieModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 2;
        } else if (kind === 'skeleton' && window.BlockLegendSkeletonModel) {
            const rig = window.BlockLegendSkeletonModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 1.85;
        } else if (kind === 'spider' && window.BlockLegendSpiderModel) {
            const rig = window.BlockLegendSpiderModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 0.85;
        } else if (kind === 'enderman' && window.BlockLegendEndermanModel) {
            const rig = window.BlockLegendEndermanModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 2.55;
        } else if (kind === 'piglin' && window.BlockLegendPiglinModel) {
            const rig = window.BlockLegendPiglinModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 1.9;
        } else if (kind === 'witch' && window.BlockLegendWitchModel) {
            const rig = window.BlockLegendWitchModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 2.15;
        } else if (kind === 'golem' && window.BlockLegendGolemModel) {
            const rig = window.BlockLegendGolemModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 2.35;
        } else if (kind === 'warden' && window.BlockLegendWardenModel) {
            const rig = window.BlockLegendWardenModel.create(THREE);
            g.add(rig);
            anim.rig = rig;
            height = 2.4;
        } else if (kind === 'merchant') {
            if (window.BlockLegendProps3d && window.BlockLegendProps3d.createTrader) {
                const rig = window.BlockLegendProps3d.createTrader(THREE);
                g.add(rig);
                anim.rig = rig;
                height = 1.35;
            } else {
                height = addHumanoid(g, anim, 'merchant', 1, '');
                const brim = box(0.62, 0.07, 0.62, 0x2c2c34);
                const top = box(0.34, 0.22, 0.34, 0x2c2c34);
                brim.position.y = height - 0.02;
                top.position.y = height + 0.12;
                g.add(brim); g.add(top);
            }
        } else if (kind === 'boss') {
            const bossId = (o && o.bossId) || 'wither';
            const factory = bossId === 'dragon' && window.BlockLegendDragonModel
                ? window.BlockLegendDragonModel
                : bossId === 'storm' && window.BlockLegendStormModel
                    ? window.BlockLegendStormModel
                    : window.BlockLegendWitherModel;
            if (factory) {
                const rig = factory.create(THREE);
                g.add(rig);
                anim.rig = rig;
                anim.shield = rig.getObjectByName('boss-shield');
                height = bossId === 'dragon' ? 2.6 : bossId === 'storm' ? 2.8 : 2.2;
            }
        } else {
            const isBoss = kind === 'boss';
            const skinKind = isBoss ? 'boss' : 'husk';
            const s = isBoss ? 1.85 : 1;
            height = addHumanoid(g, anim, skinKind, s, 'zombie');
            if (isBoss) {
                [-1, 1].forEach(function (side) {
                    const extra = skinnedBox(8, 8, 8, 'boss', 0, 0, (1 / 16) * s * 0.72);
                    extra.position.set(side * 0.58 * s, 1.22 * s, 0.06 * s);
                    extra.name = 'wither-head';
                    g.add(extra);
                    const horn = box(0.1 * s, 0.3 * s, 0.1 * s, 0xf0d890);
                    horn.position.set(side * 0.18 * s, height + 0.02, 0);
                    horn.rotation.z = side * 0.35;
                    g.add(horn);
                });
                const shield = new THREE.Mesh(
                    new THREE.SphereGeometry(1.55 * s * 0.72, 18, 12),
                    new THREE.MeshLambertMaterial({ color: 0x3d7dff, transparent: true, opacity: 0.3, depthWrite: false })
                );
                shield.position.y = 1.0 * s * 0.8;
                shield.name = 'boss-shield';
                g.add(shield);
                anim.shield = shield;
            }
        }

        const hpBar = makeHpBar();
        hpBar.position.y = height + 0.34;
        hpBar.visible = false;
        g.add(hpBar);
        g.frustumCulled = false;
        g.traverse(function (o) {
            o.frustumCulled = false;
            if (o.geometry && o.geometry.computeBoundingSphere) o.geometry.computeBoundingSphere();
        });

        return {
            group: g,
            hpBar: hpBar,
            height: height,
            update: function (dt, moving, tSec) {
                anim.phase += dt * (moving ? 7.5 : 1.6);
                const swing = Math.sin(anim.phase) * (moving ? 0.55 : 0.06);
                anim.legs.forEach(function (leg, i) {
                    leg.rotation.x = swing * (i % 2 === 0 ? 1 : -1);
                });
                if (kind === 'blaze') {
                    anim.arms.forEach(function (rod, i) {
                        const a = anim.phase * 0.9 + i * (Math.PI / 4);
                        rod.position.x = Math.cos(a) * 0.48;
                        rod.position.z = Math.sin(a) * 0.48;
                        rod.position.y = 0.85 + Math.sin(anim.phase + i) * 0.08;
                    });
                } else {
                    anim.arms.forEach(function (arm, i) {
                        arm.rotation.x = -Math.PI / 2.4 + (moving ? Math.sin(anim.phase + i * Math.PI) * 0.16 : Math.sin(anim.phase) * 0.05);
                    });
                }
                if (anim.body) {
                    if (kind === 'slime') {
                        const squash = moving ? 1 + Math.sin(anim.phase * 1.4) * 0.12 : 1 + Math.sin(anim.phase) * 0.045;
                        anim.body.scale.set(2 - squash, squash, 2 - squash);
                    } else if (anim.float != null) {
                        anim.body.position.y = anim.float + Math.sin((tSec || 0) * 2.2) * 0.08;
                    } else {
                        anim.body.position.x = (moving ? Math.sin(anim.phase * 2) * 0.02 : 0);
                        anim.body.rotation.z = moving ? Math.sin(anim.phase) * 0.03 : 0;
                    }
                }
                if (anim.head) anim.head.rotation.z = Math.sin(anim.phase * 0.5) * 0.04;
                if (anim.shield) anim.shield.rotation.y += dt * 0.6;
                if (anim.rig && anim.rig.userData && anim.rig.userData.tick) {
                    anim.rig.userData.tick(anim.phase, moving);
                }
            },
            setHp: function (frac, visible) {
                hpBar.visible = !!visible && frac < 1.001;
                const fill = hpBar.userData.fill;
                frac = Math.max(0, Math.min(1, frac));
                fill.scale.x = frac || 0.0001;
                fill.position.x = -(1 - frac) / 2;
                fill.material.color.setHex(frac > 0.5 ? 0x54d43c : frac > 0.25 ? 0xf2c53d : 0xe05038);
            },
            faceHpBarTo: function (camera) {
                hpBar.lookAt(camera.position);
            }
        };
    }

    function heldSword() {
        if (window.BlockLegendTools3d) return window.BlockLegendTools3d.createSword(THREE);
        const g = new THREE.Group();
        const pommel = box(0.07, 0.05, 0.07, 0xe0b040);
        const grip = box(0.045, 0.2, 0.045, 0x5a3a1c);
        const guard = box(0.2, 0.04, 0.055, 0xe0b040);
        const blade = box(0.055, 0.52, 0.018, 0xe8edf4);
        const glow = box(0.02, 0.48, 0.024, 0xffffff, { emissive: 0x8899bb });
        pommel.position.y = 0.025;
        grip.position.y = 0.15;
        guard.position.y = 0.27;
        blade.position.y = 0.54;
        glow.position.y = 0.54;
        g.add(pommel); g.add(grip); g.add(guard); g.add(blade); g.add(glow);
        g.userData.glow = glow;
        return g;
    }

    function heldAxe() {
        if (window.BlockLegendTools3d) return window.BlockLegendTools3d.createAxe(THREE);
        const g = new THREE.Group();
        const handle = box(0.04, 0.56, 0.04, 0x6a4a2c);
        const head = box(0.2, 0.16, 0.07, 0xc8ced6);
        const bit = box(0.08, 0.2, 0.04, 0xd8dde4);
        handle.position.y = 0.28;
        head.position.set(0.09, 0.5, 0);
        bit.position.set(0.18, 0.5, 0);
        g.add(handle); g.add(head); g.add(bit);
        return g;
    }

    function heldPickaxe() {
        if (window.BlockLegendTools3d) return window.BlockLegendTools3d.createPickaxe(THREE);
        const g = new THREE.Group();
        const handle = box(0.04, 0.54, 0.04, 0x6a4a2c);
        const bar = box(0.4, 0.055, 0.055, 0xb4bac4);
        const tipL = box(0.07, 0.07, 0.05, 0xc4cad2);
        const tipR = box(0.07, 0.07, 0.05, 0xc4cad2);
        handle.position.y = 0.27;
        bar.position.y = 0.52;
        tipL.position.set(-0.2, 0.5, 0);
        tipR.position.set(0.2, 0.5, 0);
        g.add(handle); g.add(bar); g.add(tipL); g.add(tipR);
        return g;
    }

    function heldShovel() {
        if (window.BlockLegendTools3d && window.BlockLegendTools3d.createShovel) {
            return window.BlockLegendTools3d.createShovel(THREE);
        }
        const g = new THREE.Group();
        const handle = box(0.04, 0.48, 0.04, 0x6a4a2c);
        const neck = box(0.05, 0.08, 0.05, 0x8a8e96);
        const scoop = box(0.15, 0.18, 0.03, 0xb8bdc6);
        handle.position.y = 0.24;
        neck.position.y = 0.48;
        scoop.position.set(0, 0.58, 0.01);
        g.add(handle); g.add(neck); g.add(scoop);
        return g;
    }

    const BLOCK_TEX_SRC = {
        dirt: './assets/atlas/dirt.png',
        cobble: './assets/atlas/stone.png',
        'oak-log': './assets/atlas/oak_side.png',
        plank: './assets/atlas/oak_top.png',
        table: './assets/atlas/oak_top.png',
        chest: './assets/atlas/oak_top.png',
        furnace: './assets/atlas/stone.png',
        torch: './assets/atlas/oak_side.png'
    };
    const blockTexCache = {};

    function blockTex(kind) {
        const src = BLOCK_TEX_SRC[kind] || BLOCK_TEX_SRC.dirt;
        if (blockTexCache[src]) return blockTexCache[src];
        const loader = new THREE.TextureLoader();
        const tex = loader.load(src);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        if ('encoding' in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
        blockTexCache[src] = tex;
        return tex;
    }

    function heldBlock(THREE, kind) {
        const k = kind || 'dirt';
        const g = new THREE.Group();
        g.name = 'place_' + k;
        const mat = new THREE.MeshLambertMaterial({
            map: blockTex(k),
            color: 0xffffff
        });
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat);
        cube.position.y = 0.09;
        g.add(cube);
        if (k === 'table') {
            const top = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.2), mat);
            top.position.y = 0.195;
            g.add(top);
        }
        if (k === 'oak-log') {
            const cap = new THREE.Mesh(
                new THREE.BoxGeometry(0.181, 0.02, 0.181),
                new THREE.MeshLambertMaterial({ map: blockTex('plank'), color: 0xffffff })
            );
            cap.position.y = 0.181;
            g.add(cap);
        }
        return g;
    }

    /* ---------- 第一人称手臂 + 当前工具 ---------- */
    function createViewModel() {
        const g = new THREE.Group();
        const sleeve = box(0.2, 0.46, 0.2, 0x3d6ec9);
        sleeve.position.set(0.46, -0.46, -0.5);
        sleeve.rotation.set(1.05, 0.18, 0.08);
        const hand = box(0.16, 0.16, 0.16, 0xd8a670);
        hand.position.set(0.4, -0.28, -0.58);
        g.add(sleeve);
        g.add(hand);

        const grip = new THREE.Group();
        grip.name = 'grip';
        grip.position.set(0.06, 0.02, 0.04);
        grip.rotation.set(-0.88, -0.18, 0.42);
        hand.add(grip);

        const tools = {
            sword: heldSword(),
            axe: heldAxe(),
            pickaxe: heldPickaxe(),
            shovel: heldShovel(),
            place_dirt: heldBlock(THREE, 'dirt'),
            place_cobble: heldBlock(THREE, 'cobble'),
            'place_oak-log': heldBlock(THREE, 'oak-log'),
            place_plank: heldBlock(THREE, 'plank'),
            place_table: heldBlock(THREE, 'table')
        };
        if (window.BlockLegendTools3d) {
            const T3 = window.BlockLegendTools3d;
            tools.bow = T3.createBow(THREE);
            // keep explicit names for playtest roster wiring (createDiamondSword / createIronAxe)
            ['iron', 'gold', 'diamond'].forEach(function (tier) {
                ['sword', 'axe', 'pickaxe', 'shovel'].forEach(function (tool) {
                    const fn = 'create' + tier.charAt(0).toUpperCase() + tier.slice(1)
                        + tool.charAt(0).toUpperCase() + tool.slice(1);
                    if (T3[fn]) tools[tier + '_' + tool] = T3[fn](THREE);
                });
            });
        }
        const offhand = window.BlockLegendTools3d
            ? window.BlockLegendTools3d.createShield(THREE)
            : heldBlock(THREE, 'plank');
        offhand.name = 'offhand-shield';
        offhand.scale.set(1.35, 1.35, 1.35);
        offhand.position.set(-0.38, -0.22, -0.46);
        offhand.rotation.set(0.15, 0.85, 0.12);
        offhand.visible = false;
        g.add(offhand);
        Object.keys(tools).forEach(function (id) {
            const t = tools[id];
            if (id.indexOf('place') === 0) {
                t.scale.set(1.15, 1.15, 1.15);
                t.position.set(0.05, 0.02, 0.06);
                t.rotation.set(0.35, 0.55, 0.2);
            } else {
                t.scale.set(1.05, 1.05, 1.05);
                t.position.set(0, -0.13, 0);
                t.rotation.set(0, 0, 0);
            }
            t.visible = id === 'sword';
            grip.add(t);
        });

        const state = {
            t: 0, swing: 0, cast: 0, bobPhase: 0,
            tool: 'sword', blade: 'wood', placeKind: 'dirt',
            tiers: { sword: 'wood', axe: 'wood', pickaxe: 'wood', shovel: 'wood' }
        };
        function holdKey() {
            const tool = state.tool;
            if (tool === 'place') {
                const pk = 'place_' + (state.placeKind || 'dirt');
                return tools[pk] ? pk : 'place_dirt';
            }
            if (tool === 'bow' && tools.bow) return 'bow';
            const tier = state.tiers[tool] || (tool === 'sword' ? state.blade : 'wood');
            const keyed = tier + '_' + tool;
            if ((tier === 'iron' || tier === 'diamond' || tier === 'gold') && tools[keyed]) return keyed;
            return tools[tool] ? tool : 'sword';
        }
        function paintTools() {
            const show = holdKey();
            Object.keys(tools).forEach(function (k) { tools[k].visible = k === show; });
        }
        return {
            group: g,
            blade: tools.sword,
            bladeGlow: tools.sword.userData.glow,
            setTool: function (id) {
                if (id && String(id).indexOf('place') === 0) state.tool = 'place';
                else state.tool = tools[id] ? id : (id === 'bow' && tools.bow ? 'bow' : 'sword');
                paintTools();
            },
            setPlaceKind: function (kind) {
                const k = kind || 'dirt';
                state.placeKind = k;
                const key = 'place_' + k;
                if (!tools[key]) {
                    tools[key] = heldBlock(THREE, BLOCK_TEX_SRC[k] ? k : 'dirt');
                    tools[key].scale.set(1.15, 1.15, 1.15);
                    tools[key].position.set(0.05, 0.02, 0.06);
                    tools[key].rotation.set(0.35, 0.55, 0.2);
                    grip.add(tools[key]);
                }
                paintTools();
            },
            setBladeKind: function (kind) {
                state.blade = kind === 'diamond' ? 'diamond' : kind === 'iron' ? 'iron' : kind === 'gold' ? 'gold' : 'wood';
                state.tiers.sword = state.blade;
                paintTools();
            },
            setToolTiers: function (tiers) {
                state.tiers = Object.assign({ sword: 'wood', axe: 'wood', pickaxe: 'wood', shovel: 'wood' }, tiers || {});
                state.blade = state.tiers.sword || 'wood';
                paintTools();
            },
            setOffhand: function (on) {
                offhand.visible = !!on;
            },
            triggerSwing: function () { state.swing = 1; },
            triggerCast: function () { state.cast = 1; },
            update: function (dt, moving) {
                state.t += dt;
                state.bobPhase += dt * (moving ? 9 : 2);
                state.swing = Math.max(0, state.swing - dt * 5.2);
                state.cast = Math.max(0, state.cast - dt * 3.4);
                const bob = Math.sin(state.bobPhase) * (moving ? 0.018 : 0.005);
                const sw = state.swing;
                const swArc = Math.sin(sw * Math.PI);
                g.position.set(
                    bob * 0.5 - swArc * 0.12,
                    bob - swArc * 0.08 + state.cast * 0.04,
                    swArc * 0.16 - state.cast * 0.08
                );
                g.rotation.set(
                    -swArc * 1.15 + state.cast * -0.4,
                    swArc * 0.35,
                    swArc * -0.28
                );
                const glow = state.cast;
                const glowMesh = tools.sword.userData.glow;
                if (glowMesh && glowMesh.material && glowMesh.material.emissive) {
                    glowMesh.material.emissive.setRGB(0.53 + glow * 0.4, 0.6 - glow * 0.2, 0.73 - glow * 0.3);
                    glowMesh.material.color.setRGB(1, 1 - glow * 0.35, 1 - glow * 0.55);
                }
            }
        };
    }

    /* ---------- 特效 ---------- */

    // 3D 伤害数字（Sprite + CanvasTexture，按文本缓存）
    const dmgTexCache = {};
    function damageSprite(amount, crit) {
        const text = (crit ? '✸' : '') + String(Math.round(amount));
        const key = text + (crit ? '-c' : '-n');
        if (!dmgTexCache[key]) {
            const c = document.createElement('canvas');
            c.width = 128; c.height = 64;
            const ctx = c.getContext('2d');
            ctx.font = 'bold 40px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 7;
            ctx.strokeStyle = 'rgba(30,16,8,.9)';
            ctx.strokeText(text, 64, 34);
            ctx.fillStyle = crit ? '#ffd23c' : '#ffffff';
            ctx.fillText(text, 64, 34);
            if (crit) {
                ctx.font = 'bold 17px "Microsoft YaHei", sans-serif';
                ctx.strokeText('CRIT!', 64, 58);
                ctx.fillStyle = '#ff9a2c';
                ctx.fillText('CRIT!', 64, 58);
            }
            const tex = new THREE.CanvasTexture(c);
            dmgTexCache[key] = tex;
        }
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dmgTexCache[key], transparent: true, depthTest: false }));
        sp.scale.set(crit ? 1.5 : 1.1, crit ? 0.75 : 0.55, 1);
        sp.renderOrder = 1000;
        return sp;
    }

    function spawnDamageText(scene, fx, mob, amount, crit) {
        const sp = damageSprite(amount, crit);
        sp.position.set(mob.x + (Math.random() - 0.5) * 0.3, mob.y + (Number(mob.height) || 1.6) + 0.35, mob.z);
        scene.add(sp);
        fx.push({ kind: 'text', obj: sp, life: 0.9, vy: 1.6 });
    }

    function beginDeath(scene, fx, mesh) {
        if (!mesh) return;
        fx.push({ kind: 'death', obj: mesh, life: 0.28, maxLife: 0.28 });
    }

    function spawnBurst(scene, fx, x, y, z, colorHex, n) {
        for (let i = 0; i < (n || 10); i += 1) {
            const p = box(0.1 + Math.random() * 0.1, 0.1 + Math.random() * 0.1, 0.1 + Math.random() * 0.1, colorHex);
            p.position.set(x, y + Math.random() * 0.8, z);
            scene.add(p);
            fx.push({
                kind: 'part', obj: p, life: 0.7 + Math.random() * 0.5,
                vx: (Math.random() - 0.5) * 3.4, vy: 2 + Math.random() * 3, vz: (Math.random() - 0.5) * 3.4
            });
        }
    }

    function arrowMesh() {
        if (window.BlockLegendTools3d) {
            const g = window.BlockLegendTools3d.createArrow(THREE);
            g.rotation.x = Math.PI / 2;
            g.scale.set(1.4, 1.4, 1.4);
            return g;
        }
        return boltMesh();
    }

    function boltMesh() {
        const g = new THREE.Group();
        const core = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.14, 0),
            new THREE.MeshBasicMaterial({ color: 0xd9b3ff })
        );
        const halo = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.26, 1),
            new THREE.MeshBasicMaterial({ color: 0x7a3ce0, transparent: true, opacity: 0.4 })
        );
        g.add(core); g.add(halo);
        g.userData.spin = { core: core, halo: halo };
        return g;
    }

    function coinMesh() {
        const coin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.16, 0.05, 10),
            new THREE.MeshLambertMaterial({ color: 0xffd24a, emissive: 0x6a4a10 })
        );
        coin.rotation.x = Math.PI / 2.3;
        return coin;
    }

    /** fx 数组步进：文字上升淡出 / 粒子抛物线 */
    function stepFx(scene, fx, dt) {
        const keep = [];
        fx.forEach(function (e) {
            e.life -= dt;
            if (e.life <= 0) {
                scene.remove(e.obj);
                return;
            }
            if (e.kind === 'text') {
                e.obj.position.y += e.vy * dt;
                e.vy *= 0.94;
                e.obj.material.opacity = Math.min(1, e.life / 0.4);
            } else if (e.kind === 'part') {
                e.vy -= 9 * dt;
                e.obj.position.x += e.vx * dt;
                e.obj.position.y += e.vy * dt;
                e.obj.position.z += e.vz * dt;
                e.obj.rotation.x += dt * 6;
                e.obj.rotation.y += dt * 5;
                if (e.life < 0.3) e.obj.scale.setScalar(Math.max(0.01, e.life / 0.3));
            } else if (e.kind === 'death') {
                const s = Math.max(0.01, e.life / (e.maxLife || 0.28));
                e.obj.scale.set(s, s * (0.85 + s * 0.15), s);
            }
            keep.push(e);
        });
        fx.length = 0;
        fx.push.apply(fx, keep);
    }

    window.BlockLegendMobs = {
        faceTexture: faceTexture,
        create: create,
        createViewModel: createViewModel,
        spawnDamageText: spawnDamageText,
        spawnBurst: spawnBurst,
        beginDeath: beginDeath,
        boltMesh: boltMesh,
        arrowMesh: arrowMesh,
        coinMesh: coinMesh,
        stepFx: stepFx
    };
}());
