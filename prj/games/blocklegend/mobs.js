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

        if (kind === 'slime') {
            const skin = box(1.18, 1.08, 1.18, 0x7ad35a);
            skin.position.y = 0.58;
            const cap = box(0.92, 0.38, 0.92, 0x8ee06a);
            cap.position.y = 1.12;
            const shine = box(0.22, 0.12, 0.04, 0xe8ffd4, { emissive: 0x6a9a40 });
            shine.position.set(-0.28, 1.18, 0.46);
            const face = new THREE.Mesh(
                new THREE.PlaneGeometry(0.92, 0.72),
                new THREE.MeshLambertMaterial({ map: faceTexture('slime') })
            );
            face.position.set(0, 0.7, 0.6);
            const core = box(0.42, 0.36, 0.42, 0x3f8a2c);
            core.position.y = 0.52;
            const footL = box(0.34, 0.16, 0.3, 0x5aa83c);
            const footR = box(0.34, 0.16, 0.3, 0x5aa83c);
            footL.position.set(-0.28, 0.08, 0.08);
            footR.position.set(0.28, 0.08, 0.08);
            g.add(skin); g.add(cap); g.add(shine); g.add(face); g.add(core); g.add(footL); g.add(footR);
            anim.body = skin; anim.face = face; anim.core = core;
            height = 1.45;
        } else if (kind === 'cube') {
            // 四足方块兽：横置身体 + 4 短腿 + 大头 + 尾巴
            const bodyC = 0xc47a3a;
            const body = box(0.78, 0.56, 1.12, bodyC);
            body.position.y = 0.78;
            const spot = box(0.22, 0.16, 0.22, 0x8a4e22);
            spot.position.set(0.18, 1.02, 0.1);
            const head = headMesh(0.58, 'cube', 0xd08646);
            head.position.set(0, 1.12, -0.72);
            const earL = box(0.12, 0.16, 0.08, 0x9a5a2a);
            const earR = box(0.12, 0.16, 0.08, 0x9a5a2a);
            earL.position.set(-0.18, 1.42, -0.72);
            earR.position.set(0.18, 1.42, -0.72);
            const snout = box(0.26, 0.2, 0.16, 0x9a5a2a);
            snout.position.set(0, 1.0, -1.04);
            const nose = box(0.1, 0.08, 0.06, 0x3a2214);
            nose.position.set(0, 1.02, -1.14);
            const tail = box(0.16, 0.16, 0.38, 0x9a5a2a);
            tail.position.set(0, 0.88, 0.72);
            g.add(body); g.add(spot); g.add(head); g.add(earL); g.add(earR); g.add(snout); g.add(nose); g.add(tail);
            [[-0.24, -0.34], [0.24, -0.34], [-0.24, 0.34], [0.24, 0.34]].forEach(function (p) {
                const leg = box(0.18, 0.4, 0.18, 0x8a4e22);
                leg.position.set(p[0], 0.2, p[1]);
                leg.geometry.translate(0, -0.18, 0); // 顶端为轴心摆动
                leg.position.y = 0.4;
                g.add(leg);
                anim.legs.push(leg);
            });
            anim.body = body; anim.head = head;
            height = 1.5;
        } else if (kind === 'merchant') {
            const robe = box(0.66, 1.1, 0.46, 0x3d6ec9);
            robe.position.y = 0.58;
            const collar = box(0.7, 0.12, 0.5, 0x2a4e96);
            collar.position.y = 1.16;
            const apron = box(0.5, 0.62, 0.06, 0xe8dcc0);
            apron.position.set(0, 0.5, -0.25);
            const pouch = box(0.18, 0.16, 0.1, 0x8a6234);
            pouch.position.set(0.22, 0.42, -0.28);
            const arms = box(0.82, 0.2, 0.24, 0x32589e);
            arms.position.set(0, 0.82, -0.14);
            const head = headMesh(0.46, 'merchant', 0xe0b27e);
            head.position.y = 1.38;
            const nose = box(0.09, 0.16, 0.09, 0xc4895a);
            nose.position.set(0, 1.34, -0.25);
            const brow = box(0.32, 0.04, 0.04, 0x6a4a2c);
            brow.position.set(0, 1.48, -0.22);
            const brim = box(0.64, 0.07, 0.64, 0x2c2c34);
            brim.position.y = 1.64;
            const top = box(0.36, 0.24, 0.36, 0x2c2c34);
            top.position.y = 1.78;
            g.add(robe); g.add(collar); g.add(apron); g.add(pouch); g.add(arms); g.add(head); g.add(nose); g.add(brow); g.add(brim); g.add(top);
            anim.body = robe; anim.head = head;
            height = 1.9;
        } else {
            // husk / boss：人形石壳怪（僵尸步态：双臂前伸）
            const isBoss = kind === 'boss';
            const s = isBoss ? 1.9 : 1;
            const skin = isBoss ? 0x8a5ca0 : 0x8a9096;
            const dark = isBoss ? 0x5c3a6e : 0x5e646a;
            const torso = box(0.66 * s, 0.78 * s, 0.38 * s, skin);
            torso.position.y = 0.95 * s * 0.72 + 0.14 * s;
            const shirt = box(0.7 * s, 0.36 * s, 0.42 * s, isBoss ? 0x4a2a58 : 0x4a6a48);
            shirt.position.y = 1.02 * s;
            const belt = box(0.7 * s, 0.14 * s, 0.42 * s, dark);
            belt.position.y = 0.58 * s;
            const head = headMesh(0.56 * s, isBoss ? 'boss' : 'husk', skin);
            head.position.y = 1.45 * s;
            const hair = box(0.58 * s, 0.1 * s, 0.58 * s, isBoss ? 0x2a1830 : 0x3a3a40);
            hair.position.y = 1.72 * s;
            [-1, 1].forEach(function (side) {
                const arm = box(0.2 * s, 0.72 * s, 0.2 * s, skin);
                arm.geometry.translate(0, -0.3 * s, 0); // 肩部为轴
                arm.position.set(side * 0.47 * s, 1.18 * s, 0);
                arm.rotation.x = -Math.PI / 2.4; // 前伸
                g.add(arm);
                anim.arms.push(arm);
                const leg = box(0.22 * s, 0.62 * s, 0.22 * s, dark);
                leg.geometry.translate(0, -0.28 * s, 0); // 髋部为轴
                leg.position.set(side * 0.17 * s, 0.62 * s, 0);
                g.add(leg);
                anim.legs.push(leg);
                if (isBoss) { // 肩甲 + 双角
                    const pad = box(0.3 * s, 0.16 * s, 0.3 * s, 0x3a2444);
                    pad.position.set(side * 0.47 * s, 1.28 * s, 0);
                    g.add(pad);
                    const horn = box(0.1 * s, 0.34 * s, 0.1 * s, 0xf0d890);
                    horn.position.set(side * 0.2 * s, 1.78 * s, 0);
                    horn.rotation.z = side * 0.35;
                    g.add(horn);
                }
            });
            g.add(torso); g.add(shirt); g.add(belt); g.add(head); g.add(hair);
            anim.body = torso; anim.head = head;
            height = 1.75 * s;
            if (isBoss) {
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
            update: function (dt, moving, tSec, hurtFlash) {
                anim.phase += dt * (moving ? 7.5 : 1.6);
                const swing = Math.sin(anim.phase) * (moving ? 0.55 : 0.06);
                anim.legs.forEach(function (leg, i) {
                    leg.rotation.x = swing * (i % 2 === 0 ? 1 : -1);
                });
                anim.arms.forEach(function (arm, i) {
                    arm.rotation.x = -Math.PI / 2.4 + (moving ? Math.sin(anim.phase + i * Math.PI) * 0.16 : Math.sin(anim.phase) * 0.05);
                });
                if (anim.body) {
                    if (kind === 'slime') { // 果冻呼吸 + 移动挤压
                        const squash = moving ? 1 + Math.sin(anim.phase * 1.4) * 0.12 : 1 + Math.sin(anim.phase) * 0.045;
                        anim.body.scale.set(2 - squash, squash, 2 - squash);
                        if (anim.face) anim.face.scale.copy(anim.body.scale);
                    } else {
                        anim.body.position.x = (moving ? Math.sin(anim.phase * 2) * 0.02 : 0);
                        anim.body.rotation.z = moving ? Math.sin(anim.phase) * 0.03 : 0;
                    }
                }
                if (anim.head) anim.head.rotation.z = Math.sin(anim.phase * 0.5) * 0.04;
                if (anim.shield) anim.shield.rotation.y += dt * 0.6;
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
        const g = new THREE.Group();
        const blade = box(0.07, 0.68, 0.02, 0xe8edf4);
        const edge = box(0.018, 0.64, 0.028, 0xffffff, { emissive: 0x8899bb });
        const fuller = box(0.02, 0.5, 0.026, 0x9aa6b8);
        const guard = box(0.24, 0.05, 0.07, 0xe0b040);
        const wrap = box(0.07, 0.08, 0.07, 0x8a5a28);
        const grip = box(0.055, 0.2, 0.055, 0x5a3a1c);
        const pommel = box(0.09, 0.07, 0.09, 0xe0b040);
        blade.position.set(0, 0.32, -0.04);
        edge.position.set(0, 0.32, -0.036);
        fuller.position.set(0, 0.3, -0.038);
        guard.position.set(0, 0, -0.02);
        wrap.position.set(0, -0.06, 0);
        grip.position.set(0, -0.16, 0);
        pommel.position.set(0, -0.28, 0);
        [blade, edge, fuller].forEach(function (m) { m.rotation.x = -0.35; });
        g.add(blade); g.add(edge); g.add(fuller); g.add(guard); g.add(wrap); g.add(grip); g.add(pommel);
        g.userData.glow = edge;
        return g;
    }

    function heldAxe() {
        const g = new THREE.Group();
        const handle = box(0.05, 0.62, 0.05, 0x6a4a2c);
        const collar = box(0.07, 0.08, 0.07, 0x8a8e96);
        const head = box(0.26, 0.18, 0.09, 0xd0d5dc);
        const bit = box(0.12, 0.24, 0.05, 0xc8ced6);
        const back = box(0.1, 0.12, 0.08, 0xa8aeb8);
        handle.rotation.x = -0.35;
        collar.rotation.x = -0.35;
        head.rotation.x = -0.35;
        bit.rotation.x = -0.35;
        back.rotation.x = -0.35;
        handle.position.set(0, 0.06, 0);
        collar.position.set(0.02, 0.28, -0.03);
        head.position.set(0.12, 0.3, -0.04);
        bit.position.set(0.22, 0.28, -0.04);
        back.position.set(0.02, 0.3, -0.04);
        g.add(handle); g.add(collar); g.add(head); g.add(bit); g.add(back);
        return g;
    }

    function heldPickaxe() {
        const g = new THREE.Group();
        const handle = box(0.045, 0.62, 0.045, 0x6a4a2c);
        const head = box(0.36, 0.07, 0.06, 0xb4bac4);
        const tipL = box(0.08, 0.08, 0.05, 0xc4cad2);
        const tipR = box(0.08, 0.08, 0.05, 0xc4cad2);
        handle.rotation.x = -0.35;
        head.rotation.x = -0.35;
        tipL.rotation.x = -0.35;
        tipR.rotation.x = -0.35;
        handle.position.set(0, 0.06, 0);
        head.position.set(0, 0.32, -0.05);
        tipL.position.set(-0.2, 0.3, -0.05);
        tipR.position.set(0.2, 0.3, -0.05);
        g.add(handle); g.add(head); g.add(tipL); g.add(tipR);
        return g;
    }

    function heldShovel() {
        const g = new THREE.Group();
        const handle = box(0.045, 0.52, 0.045, 0x6a4a2c);
        const neck = box(0.05, 0.1, 0.05, 0x8a8e96);
        const scoop = box(0.16, 0.18, 0.04, 0xb8bdc6);
        handle.rotation.x = -0.35;
        neck.rotation.x = -0.35;
        scoop.rotation.x = -0.35;
        handle.position.set(0, 0.04, 0);
        neck.position.set(0, 0.28, -0.04);
        scoop.position.set(0, 0.4, -0.06);
        g.add(handle); g.add(neck); g.add(scoop);
        return g;
    }

    /* ---------- 第一人称手臂 + 当前工具 ---------- */
    function createViewModel() {
        const g = new THREE.Group();
        const sleeve = box(0.14, 0.32, 0.14, 0x3d6ec9);
        sleeve.rotation.x = 0.9;
        const cuff = box(0.15, 0.06, 0.15, 0x2a4e96);
        cuff.rotation.x = 0.9;
        const fore = box(0.11, 0.3, 0.11, 0xe0b27e);
        fore.rotation.x = 0.9;
        const hand = box(0.13, 0.12, 0.13, 0xd8a670);
        const finger = box(0.04, 0.08, 0.04, 0xc8965a);
        hand.position.set(0.3, -0.32, -0.62);
        finger.position.set(0.26, -0.36, -0.7);
        fore.position.set(0.33, -0.2, -0.5);
        cuff.position.set(0.36, -0.12, -0.44);
        sleeve.position.set(0.38, -0.05, -0.38);
        g.add(sleeve); g.add(cuff); g.add(fore); g.add(hand); g.add(finger);

        const tools = {
            sword: heldSword(),
            axe: heldAxe(),
            pickaxe: heldPickaxe(),
            shovel: heldShovel()
        };
        Object.keys(tools).forEach(function (id) {
            tools[id].position.set(0.3, -0.28, -0.66);
            tools[id].visible = id === 'sword';
            g.add(tools[id]);
        });

        const state = { t: 0, swing: 0, cast: 0, bobPhase: 0, tool: 'sword' };
        return {
            group: g,
            blade: tools.sword,
            bladeGlow: tools.sword.userData.glow,
            setTool: function (id) {
                const next = tools[id] ? id : 'sword';
                state.tool = next;
                Object.keys(tools).forEach(function (k) { tools[k].visible = k === next; });
            },
            triggerSwing: function () { state.swing = 1; },
            triggerCast: function () { state.cast = 1; },
            update: function (dt, moving) {
                state.t += dt;
                state.bobPhase += dt * (moving ? 9 : 2);
                state.swing = Math.max(0, state.swing - dt * 5.2);
                state.cast = Math.max(0, state.cast - dt * 3.4);
                const bob = Math.sin(state.bobPhase) * (moving ? 0.02 : 0.006);
                const sw = state.swing;
                const swArc = Math.sin(sw * Math.PI);
                g.position.set(
                    bob * 0.6 - swArc * 0.18,
                    bob - swArc * 0.1 + state.cast * 0.05,
                    swArc * 0.22 - state.cast * 0.1
                );
                g.rotation.set(
                    -swArc * 1.5 + state.cast * -0.5,
                    swArc * 0.5,
                    swArc * -0.4
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
        sp.position.set(mob.x + (Math.random() - 0.5) * 0.3, mob.y + 1.6, mob.z);
        scene.add(sp);
        fx.push({ kind: 'text', obj: sp, life: 0.9, vy: 1.6 });
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
        boltMesh: boltMesh,
        coinMesh: coinMesh,
        stepFx: stepFx
    };
}());
