# Learning Game System Optimization Implementation Plan

> **For Codex:** Use test-driven development for every behavior change. Preserve all unrelated dirty-worktree changes.

**Goal:** Make subject mastery evidence truthful, align game difficulty/rewards with that evidence, and make the preschool course page usable at 800×360 and in Android landscape.

**Architecture:** Keep the existing native JavaScript/Capacitor architecture for P0. Put reusable simple-subject mastery transitions in `child-courses.js`; make `app.js` emit attempts at the moment of interaction; keep world-state mutations inside one shared state object; fix the final CSS cascade without redesigning existing visuals.

**Tech Stack:** Native JavaScript, Node test runner, CSS, Capacitor Android, Codex in-app browser.

**Implementation status (2026-08-24):** Tasks 1–5 are complete and verified in the Codex in-app browser and an installed MuMu Android APK. The P1/P2 follow-ups below remain pending.

## Completed batch evidence

- [x] Task 1 — reusable simple-subject mastery transition.
- [x] Task 2 — real flashcard and bank-quiz attempts; completion separated from mastery.
- [x] Task 3 — mastery-based game difficulty and atomic play/reward writes.
- [x] Task 4 — normal-Web and Android short-landscape layout, including 44px touch targets.
- [x] Task 5 — targeted tests, release verification, Codex browser acceptance, Android sync/build/install and installed-WebView inspection.

Fresh verification summary:

- P0 target suite: 96 passed, 0 failed, 6 skipped.
- Adjacent literacy/cache contracts: 15 passed, 0 failed.
- Release verification: passed.
- Full suite: 865 total, 795 passed, 64 failed, 6 skipped. All 64 remaining failures are outside this plan and split exactly between the existing `blocklegend*.test.mjs` branch (36) and `platform-physics.test.mjs` branch (28).
- Browser 1280×720 and 800×360: no sidebar/main overlap, no document horizontal overflow, no visible controls below 44px.
- Installed APK overview and literacy routes: fixed rail at `x=0, y=0`, no document/page overflow, no visible controls below 44px.

---

## Task 1: Add a reusable simple-subject mastery transition

**Files:**

- Modify: `prj/child-courses.js`
- Test: `tests/preschool-subject-mastery.test.mjs`

**Steps:**

1. Write failing tests for `recordSubjectAttempt()`:
   - a first correct attempt becomes `practicing`, not `ready`;
   - attempts/correct/dates/activityTypes/accuracy/nextReview are stored;
   - two dates plus two activity types and accuracy ≥ 0.8 become `ready`;
   - a wrong answer remains/reverts to `practicing` and is due today;
   - normalization preserves the new fields.
2. Run `node --test tests/preschool-subject-mastery.test.mjs` and confirm the expected API-missing failure.
3. Implement the smallest date/schedule and transition helpers in `child-courses.js`.
4. Re-run the test and keep it green.

## Task 2: Emit real attempts from cards and bank quizzes

**Files:**

- Modify: `prj/app.js`
- Modify: `tests/preschool-workbench-refresh.test.mjs`
- Test: `tests/preschool-subject-attempt-integration.test.mjs`

**Steps:**

1. Write failing source-contract/integration tests that require:
   - `commitPreschoolSubjectMark()` to call `recordSubjectAttempt()` with `self-check` evidence;
   - `answerLesson()` bank-quiz path to record pinyin, poetry, math and phonics attempts immediately;
   - `recordSubjectProgressFromLesson()` not to call `markSubjectReady()`.
2. Run both target tests and confirm they fail for the intended behavior.
3. Add a round-to-subject-key helper and one commit helper in `app.js`.
4. Replace the completion-time ready promotion with per-interaction evidence.
5. Keep lesson completion rewards unchanged; completion and mastery remain separate concepts.
6. Re-run the target tests.

## Task 3: Fix game difficulty and atomic reward writes

**Files:**

- Modify: `prj/games/shared/workbench-bridge.js`
- Modify: `tests/play-mods.test.mjs`
- Modify: `tests/world-games.test.mjs`

**Steps:**

1. Write failing behavior tests showing:
   - only `ready/maintenance` entries count as literacy-known;
   - `recordPlaySession()` preserves both play stamps and awarded sunlight in storage;
   - duplicate calls do not duplicate rewards.
2. Run target tests and confirm the two regressions.
3. Make `awardSunlight()` accept an optional existing state and avoid internal read/write when supplied.
4. Pass the current state from `recordPlaySession()` and milestone checks.
5. Filter `countLiteracyKnown()` by mastery state.
6. Re-run target tests.

## Task 4: Fix normal-Web short-landscape layout

**Files:**

- Modify: `prj/css/preschool/20-sidebar-orientation.css`
- Modify: `prj/css/preschool/44-child-game-world.css`
- Test: `tests/preschool-landscape-layout.test.mjs`

**Steps:**

1. Write a failing CSS contract test requiring one shared landscape sidebar variable and preventing `.child-game-shell` from changing the normal-Web sidebar from fixed positioning.
2. Run the test and confirm it fails.
3. Use `clamp(176px, 24vw, 208px)` for both sidebar width and main-content offset at ≤860px landscape.
4. Exclude `.sidebar` from the generic positioned-child selector.
5. Re-run the CSS test.

## Task 5: Verification and browser acceptance

**Files:**

- Update only if findings require: files above

**Steps:**

1. Run targeted tests:

   ```powershell
   node --test tests/preschool-subject-mastery.test.mjs tests/preschool-subject-attempt-integration.test.mjs tests/play-mods.test.mjs tests/world-games.test.mjs tests/preschool-landscape-layout.test.mjs
   ```

2. Run the full suite:

   ```powershell
   npm test
   ```

3. Run release verification:

   ```powershell
   npm run release:verify
   ```

4. In the Codex in-app browser, reload the preschool literacy route and verify:
   - desktop layout has no overlap;
   - 800×360 normal-Web layout starts main content directly after the sidebar and keeps a useful content width;
   - simulated `html.is-android-app` landscape is viewport-bound and has no horizontal/vertical document overflow;
   - main actions remain at least 44×44 CSS px;
   - no new console errors.
5. Reset the temporary viewport and keep the verified page open for handoff.

## P1 follow-up: Mechanic-level game integration

- Adapt `G:\StudyCode\小游戏项目\pinyin-star-scout` first.
- Define a versioned `attempt/result/session-summary` bridge contract.
- Record independent correctness, prompted correctness, error tags, review candidates and session duration.
- Add pause, practice mode, speed choice and reduced-motion support.
- Verify game results update the same pinyin mastery records used by course unlocking.

## P2 follow-up: Activity registry and daily orchestrator

- Split subject/activity modules out of `prj/app.js` behind a registration API.
- Generate each daily route from due review, limited new content and one transfer game.
- Add a parent evidence report with accuracy, activity diversity, due reviews and mastery transitions.
- Apply the same bridge to English tennis, Hanzi bubble runner and math PK only after the pinyin vertical slice is proven.
