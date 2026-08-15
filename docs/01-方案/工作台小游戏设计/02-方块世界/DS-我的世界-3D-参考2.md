对，这就是现在测编码模型的**经典一题**：一句话（或一份完整 brief）让它写出能走、能挖、能放的浏览器 3D 方块世界。公开评测里 Gemini 3 Pro、Claude Opus、Fable 5、GPT 都拿过同一道题。

有两档提示词。短的用来「看模型会不会自己补全」；长的才是你说的那种**完整提示词**。

---

## 1. 评测里真正在用的短提示（零样本）

Fable 5 那条爆过几百万播放的，原文就一句：

> **Make a Minecraft clone.**

Claude / Gemini 对照评测里稍长一点，但仍是「故意写短」：

> Build a procedurally generated voxel world game with basic mechanics like movement, block placement, and block destruction.

[Better Stack 对 Opus 4.5 的复盘](https://betterstack.com/community/guides/ai/new-features-ai/claude-opus-4-5/) 写得很清楚：同一条给 Gemini 3 Pro，它往往只做出能走的地形；Opus 会自己补上挖/放、快捷栏、昼夜。模型比的是**会不会把「像我的世界」补成完整玩法**，不是提示词写得多细。

儿童向变体也一样短（[Tim Broddin](https://broddin.be/post/creating-a-minecraft-clone-in-under-a-day)）：

```text
Make a 3d voxel game called JanneCraft. Like Minecraft,
but everyone is named Janne and there are also a couple of others: <friends>
Use three.js
```

短提示的结论：对强模型越短越好；对你们这种**已经有战斗/词卡/工作台**的项目，短提示会让它另起炉灶，把现有循环冲掉。要用下面的长版，并写死「只改 `blocklegend/`，别动词库和 bridge」。

---

## 2. 完整提示词（公开站上最完整的一版）

来源：[docsbot · Browser Voxel Game](https://docsbot.ai/prompts/programming/browser-voxel-game)。这就是大家说的「可直接贴给模型」的那份。

```text
You are an expert browser game developer. Produce a polished, well-documented,
and performant Minecraft-like 3D voxel game that runs entirely in a modern
browser (Google Chrome). Use plain HTML5, CSS and vanilla JavaScript
(ES6 modules allowed). You may use Three.js via CDN for rendering, but do
not require any build tools, bundlers, or servers.

Deliver the complete source as separate files (index.html, style.css, script.js)
shown in distinct code blocks with the filename in the header.

Core gameplay (must implement):
- 3D voxel world with a grid-based coordinate system
- First-person: pointer lock, WASD, Space jump, Shift sprint (optional)
- Left click break, right click place, raycast from screen center
- Gravity + collision: walk on blocks, fall and land
- Procedural terrain ~64×64, height ~32, hills + flat ocean edges
- Blocks: grass, dirt, stone
- Crosshair + highlight outline on hovered block face
- Do not place a block inside the player's collision box
- Save/load world to localStorage

Rendering & performance:
- Three.js via CDN
- InstancedMesh OR greedy meshing per 16×16×16 chunks
- Only render chunks within a radius around the player
- Rebuild only affected chunks on block changes
- Target ~60 FPS; no whole-world iteration each frame
- Small or no external textures; procedural colors or a tiny atlas

Controls & UX:
- Esc exits pointer lock
- R regenerates the world
- HUD: selected block, optional FPS, block count
- Dismissible on-screen instructions

Do NOT ask clarifying questions. Desktop-first Chrome.
```

短视频对打常用的精简版（Prompt Playoffs）：

```text
Create a single HTML file with an 800×800 canvas that shows a simple
Minecraft-style 3D scene using JavaScript and either WebGL or Three.js.
Render a small voxel world (flat ground + a few hills, trees, and cubes)
with basic lighting, shadows, and a blue sky.
First-person: WASD move, mouse look.
Left-click remove a block, right-click place the selected type.
No mobs, inventory, or survival — just walk, place, and break in a tiny world.
```

---

## 3. 成熟项目（按「能抄多少」排序）

| 项目 | 地址 | 为什么值得看 |
|---|---|---|
| **Fable5-mc** | [github.com/Angais/Fable5-mc](https://github.com/Angais/Fable5-mc) | 就是「模型测试产物」：程序化 16×16 图集、生物群系、洞穴、AO、昼夜、TNT、快捷栏。架构目录可当清单。 |
| **dgreenheck clone** | [github.com/dgreenheck/minecraft-threejs-clone](https://github.com/dgreenheck/minecraft-threejs-clone) | 你们引擎已经在抄它。有完整 YouTube 课。 |
| **vyse12138** | [mc.yulei.me](https://mc.yulei.me/) / [仓库](https://github.com/vyse12138/minecraft-threejs) | 浏览器里最接近「能玩」的一档：无限世界、存档、音效、手机。 |
| **Three.js 官方** | [webgl_geometry_minecraft](https://threejs.org/examples/webgl_geometry_minecraft) + [手册 Voxel](https://threejs.org/manual/en/voxel-geometry.html) | 图集 UV、区块网格的标准写法。 |
| **twilson63/voxel** | [github.com/twilson63/voxel](https://github.com/twilson63/voxel) | 单文件、InstancedMesh、程序化贴图，体量接近你们。 |
| **voxel.js** | [voxeljs.com](http://www.voxeljs.com/) / [voxeljs-next](https://github.com/joshmarinacci/voxeljs-next/) | 更老的生态，模块多，不适合整仓搬。 |

Fable5-mc 的目录几乎就是「完整提示词落地后该有的文件」：`noise / textures / blocks / worldgen / mesher / world / player / sky / particles / audio / ui`。

---

## 4. 和方块传奇的关系

你们**已经有**短提示会做出来的那一层：第一人称、区块合批、挖放、树、工具。缺的是长提示里那几条会让画面突然「像 MC」的东西：

1. **玩家周围流式加载区块**（地图再大也不卡）  
2. **16×16 像素图集 + 草块顶/侧/底三张**（比再加盒子模型更有效）  
3. **顶点 AO**（方块接缝变立体）  
4. **准星描边 + 按住挖掘裂纹**

不建议把「Make a Minecraft clone」整段丢进当前仓库——它会重写一局，词卡和 bridge 会丢。若要下一刀，最值的是第 2 条：给现有合批网格换一套程序化 16×16 图集（Fable5 的 `textures.js` / 手册那套），角色仍用盒子，但世界会立刻好看一档。

你要的话，我可以按 Fable5 / 手册那套，**只改 `blocklegend/engine.js` 的图集和草土木叶 UV**，不动战斗和词库。