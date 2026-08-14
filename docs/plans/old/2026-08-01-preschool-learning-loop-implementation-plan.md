# Preschool Learning Loop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn preschool resource cards into small answerable activities with immediate feedback and a direct “continue learning” path, without changing the local-first reward ledger.

**Architecture:** Keep static activity content in `config.js`, keep transient answer state in `app.js`, and use a dedicated preschool `dialog` shell in `preschool-workbench/index.html`. Successful completion continues through `completeCourseLesson()` and the existing `awardSunlight()`/garden event path. Add a final scoped CSS layer for the dialog and extend contract tests plus served-browser checks.

**Tech Stack:** Vanilla JS, HTML templates, scoped CSS, localStorage repository, Node.js built-in test runner, Chrome/ADB verification.

---

### Task 1: Lock the activity data contract

**Files:**
- Modify: `config.js` preschool `childCourses` definitions
- Modify: `tests/preschool-workbench-refresh.test.mjs`
- Modify: `docs/data-model.md` only if the static-vs-persisted boundary is not already explicit

**Step 1: Write failing contract assertions**

Assert that every preschool lesson has `activity.prompt`, a non-empty `activity.options` array, and an answer index; assert the lesson IDs remain unique.

**Step 2: Run the focused test**

Run: `node --test tests/preschool-workbench-refresh.test.mjs`

Expected: FAIL because current lessons only have title, minutes, meta and tip.

**Step 3: Add minimal static activity metadata**

Add one short, age-appropriate activity to each of the 21 lessons. Use `mode: "choice"` for questions and `mode: "check"` for movement/voice tasks; include `prompt`, `hint`, `options`, `answer` and `success` text. Keep all metadata static and out of the snapshot.

**Step 4: Run the focused test**

Run: `node --test tests/preschool-workbench-refresh.test.mjs`

Expected: PASS for the data contract.

### Task 2: Add the preschool lesson dialog shell

**Files:**
- Modify: `preschool-workbench/index.html`
- Modify: `app.js`
- Modify: `tests/preschool-workbench-refresh.test.mjs`

**Step 1: Write failing shell assertions**

Assert that the preschool HTML contains a labelled `lesson-dialog`, a close action, a dynamic content container and a confirmation action hook.

**Step 2: Implement transient lesson session state**

Add `ui.lessonSession` with lesson ID, selected option and result state. Resolve the lesson from the configured course catalog, open the dialog, and render sanitized activity content. Guard all dialog references so adult and child pages still work without the preschool shell.

**Step 3: Implement answer and finish actions**

Add `open-lesson`, `lesson-answer`, `lesson-finish` and `close-lesson` event branches. Wrong answers update only the in-memory result. Correct answers enable the finish action; finishing calls the existing `completeCourseLesson()` once and closes the dialog after the repository commit succeeds.

**Step 4: Run focused tests and syntax checks**

Run: `node --test tests/preschool-workbench-refresh.test.mjs tests/workbench-contract.test.mjs`

Run: `node --check app.js; node --check config.js`

Expected: all focused tests pass and both checks exit 0.

### Task 3: Add the “continue learning” home route

**Files:**
- Modify: `app.js`
- Modify: `tests/preschool-workbench-refresh.test.mjs`

**Step 1: Write failing rendering assertions**

Assert that preschool overview renders a continue-learning action tied to the first incomplete lesson and a completed-state fallback when all lessons are done.

**Step 2: Render the derived next lesson**

Add a pure helper that scans the configured preschool catalog against `state.courseProgress.completedLessonIds`. Render a compact home strip with the course visual, lesson title, duration and `open-lesson` action.

**Step 3: Run focused tests**

Run: `node --test tests/preschool-workbench-refresh.test.mjs`

Expected: PASS.

### Task 4: Style the activity panel and responsive states

**Files:**
- Modify: `css/preschool/16-workbuddy-finish.css`
- Modify: `tests/preschool-workbench-refresh.test.mjs`

**Step 1: Add style contract assertions**

Assert selectors for the lesson dialog, large prompt, option states, correct/error feedback, disabled finish state, focus-visible state and reduced-motion fallback.

**Step 2: Implement scoped styles**

Use the current WorkBuddy tokens and original preschool art. Keep the dialog readable on desktop and 320/375/390/441px screens, ensure the bottom navigation does not cover its finish button, and keep every option at least 44px high.

**Step 3: Run tests and diff checks**

Run: `npm test`

Run: `git diff --check`

Expected: all tests pass and no whitespace errors are reported.

### Task 5: Browser, APK and release verification

**Files:**
- Modify: `README.md`, `CHANGELOG.md`, `package.json`, `package-lock.json`, `config.js` version label
- Test artifacts: `tmp/` only

**Step 1: Run the served-browser matrix**

Open root launcher and preschool `#overview`, `#courses`, `#courses?course=preschool-math` at 320, 375, 390, 441, 768 and 1440px. Verify no horizontal overflow, the dialog opens, a wrong option shows feedback, the correct option enables finish, and completion updates the course progress and reward feedback.

**Step 2: Run the local gates**

Run: `npm test`

Run: `npm run android:prepare`

Run: `git diff --check`

Expected: green output for all commands.

**Step 3: Bump and document the release**

Bump from `v0.2.4` to `v0.3.0`, update the changelog and README feature summary, then commit the implementation.

**Step 4: Push and verify GitHub Actions**

Run: `git push origin main`, then inspect the Pages deployment and Android APK workflow for the new commit.

**Step 5: Install the new APK in MuMu**

Download the APK artifact, uninstall the exact package `com.nonomil.personalworkbench`, install the artifact, and verify launcher selection, preschool overview, course dialog, garden and battle pages. Check `pidof` and recent logcat for `FATAL EXCEPTION`.
