# Visual Match Loop · 首页场景清晰度与向日葵 alpha 修复

## Reference and baseline

- Reference screenshot: `C:/Users/<local-user>/AppData/Local/Temp/codex-clipboard-4ee4c51c-616c-47c5-b8a3-08c8899755ce.png`
- Route: `http://127.0.0.1:4174/preschool-workbench/index.html?theme=garden-defense#overview`
- Viewport: 1280×720
- Baseline symptoms: scene washed by a strong white/cream overlay; sunflower PNG rendered as a semi-transparent rectangular block.

## Bounded change

- Lowered only the final desktop scene overlay in `47-home-scene-composition.css` from `.34/.58/.94` to `.08/.14/.30`.
- Replaced the corrupted published sunflower PNG with the existing clean RGBA reference asset and bumped the cache query to `20260824-alpha-v2`.
- No business logic, storage, course data, or external asset generation changed.

## After evidence

- Screenshot: `iteration-01-after-1280x720.png`
- The grass scene is readable and saturated; the sunflower has an opaque subject with transparent corners and no rectangular veil.
- Browser checks: garden, voxel, and platform home routes all rendered with zero horizontal/vertical overflow; hero art opacity was `1`.
- Alpha check: 742×828 RGBA PNG; all four corners alpha `0`; 367,923 opaque pixels; 9,123 antialiased partial-alpha pixels.

## Verification

- `node --test tests/preschool-home-visual-loop.test.mjs tests/preschool-home-scene-composition.test.mjs tests/preschool-density-companion.test.mjs` → 12/12 passed
- `node --check prj/app.js` → passed
- `node --check prj/games/garden-defense/game.js` → passed
- `npm run release:verify` → passed
