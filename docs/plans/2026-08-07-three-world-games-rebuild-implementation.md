# 三世界小游戏重做 Implementation Plan

> **For Claude:** Execute task-by-task; keep preschool-garden API and storage key stable.

**Goal:** 三款游戏独立全屏 + Grok 资产 + 花园真塔防。

**Architecture:** 工作台只做入口；`games/*` 承载全屏玩法；花园复用 `preschool-garden.js` 规则与幼儿快照。

**Tech Stack:** 静态 HTML/CSS/Canvas、vanilla JS、localStorage、Grok Imagine。

---

### Task 1: 路由契约

- Modify: `prj/app.js` — `garden-defense.worldGameHref = '../games/garden-defense/index.html'`
- Modify: `tests/world-games.test.mjs` — 三游戏目录 + 三 href

### Task 2: 花园独立页

- Create: `prj/games/garden-defense/{index.html,game.css,game.js}`
- 加载 `../../preschool-garden.js`，真塔防 UI + 720ms tick

### Task 3: 方块 / 横版贴图

- Modify: `prj/games/voxel-adventure/game.js`、`platform-quest/game.js`
- 使用 published + world-rebuild 资产

### Task 4: Grok 生图

- 输出 `prj/assets/generated/world-rebuild-20260807/`
- SPEC + manifest

### Task 5: 测试

- `npm test` 修失败契约  
---