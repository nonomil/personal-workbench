# WorkBuddy Preschool UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the approved WorkBuddy-inspired visual system to the modular preschool workbench without changing its local-first data model or learning business logic.

**Architecture:** Add one final preschool CSS layer after the existing visual layers, update the preschool shell with a compact mobile bottom navigation, and keep all navigation routed through the current `data-action` handlers. Extend focused contract tests for the new shell and responsive rules, then verify with the existing test suite and a served-browser pass.

**Tech Stack:** Vanilla JS, HTML templates in `app.js`, CSS imports, Lucide icon markup already provided by the project, Node.js built-in test runner, Chrome headless verification.

---

### Task 1: Add the final WorkBuddy visual layer

**Files:**
- Create: `css/preschool/16-workbuddy-finish.css`
- Modify: `css/preschool-workbench.css`
- Modify: `styles.css`

**Step 1: Write the failing style contract**

Add assertions that the preschool manifest imports the final layer and that the final layer defines the WorkBuddy color tokens, glass card treatment, soft primary button, reduced-motion fallback, and mobile floating navigation selectors.

**Step 2: Run the focused test**

Run: `node --test tests/preschool-workbench-refresh.test.mjs`

Expected: FAIL because the final stylesheet and selectors do not exist yet.

**Step 3: Implement the minimal CSS layer**

Define warm cream/mint/orange/gold tokens, remove the most visible purple legacy appearance on preschool pages, style the shell/page header/cards/buttons, add focus-visible states, and add final responsive rules at 760px and 440px. Keep all selectors scoped with `body.variant-preschool`.

**Step 4: Run the focused test**

Run: `node --test tests/preschool-workbench-refresh.test.mjs`

Expected: PASS for the new style contract and all existing preschool assertions.

### Task 2: Add the mobile floating navigation shell

**Files:**
- Modify: `preschool-workbench/index.html`
- Modify: `app.js`
- Modify: `css/preschool/16-workbuddy-finish.css`
- Test: `tests/preschool-workbench-refresh.test.mjs`

**Step 1: Write the failing navigation contract**

Assert that the preschool shell contains five mobile entries for home, learning, battle, rewards, and more, with `data-action` hooks and accessible labels.

**Step 2: Run the focused test**

Run: `node --test tests/preschool-workbench-refresh.test.mjs`

Expected: FAIL because the shell has no floating navigation and the app does not mark the active shortcut.

**Step 3: Implement the shell behavior**

Add the bottom navigation markup to the preschool page, update the app route activation routine to toggle its active state, and route “more” to the existing sidebar drawer. Do not add a second navigation state or storage key.

**Step 4: Run the focused test**

Run: `node --test tests/preschool-workbench-refresh.test.mjs`

Expected: PASS.

### Task 3: Verify visual behavior at desktop and mobile sizes

**Files:**
- Modify only if verification finds a real issue: `css/preschool/16-workbuddy-finish.css`, `app.js`, `preschool-workbench/index.html`
- Test artifacts: `tmp/` only

**Step 1: Start the static server**

Run: `python -m http.server 4173` from `G:\StudyCode\个人工作台` if port 4173 is not already listening.

**Step 2: Capture served pages**

Open the preschool overview, courses, calendar, and battle routes at 1440px and 375px. Check that the page content remains within the viewport, the bottom nav appears only on mobile, and all generated assets resolve.

**Step 3: Run the full test suite**

Run: `npm test`

Expected: all tests pass with zero failures.

**Step 4: Run whitespace and route checks**

Run: `git diff --check`

Expected: no whitespace errors. Report any pre-existing CRLF warnings separately.
