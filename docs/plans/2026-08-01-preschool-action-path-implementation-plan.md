# Preschool Action Path Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give the preschool homepage a clear three-step action route and make the course directory show actionable progress without changing business state.

**Architecture:** Add pure render helpers in `app.js` that read the existing derived plans, course progress, growth and defense view. Style the new route in the preschool WorkBuddy stylesheet and verify the contract with focused source tests plus the existing browser checks.

**Tech Stack:** Vanilla JavaScript, inline HTML templates, CSS, Node `node:test`, localStorage-backed repository.

---

### Task 1: Add the failing contract tests

**Files:**
- Modify: `tests/preschool-workbench-refresh.test.mjs`

**Steps:**

1. Add assertions for a `preschool-action-path` section, three action steps, route state labels, and course directory progress markup.
2. Run `npm test -- --test-name-pattern="action path"` and confirm the new assertions fail before implementation.

### Task 2: Implement the homepage action route

**Files:**
- Modify: `app.js`

**Steps:**

1. Add a helper that resolves the current incomplete plan, next preschool lesson, and reward/defense destination from existing state.
2. Render three accessible action buttons with existing `navigate` and `open-lesson` actions; use current progress values only.
3. Insert the action route after the daily note and keep the existing continue-learning block as the detailed focus card.

### Task 3: Add course-directory progress visuals

**Files:**
- Modify: `app.js`
- Modify: `css/preschool/15-workbuddy-overview.css`

**Steps:**

1. Render a compact progress track and state label for every course-directory item.
2. Add desktop, tablet, and 320/390px layout rules for the new route and directory progress without changing existing selectors' behavior.

### Task 4: Verify, document, and release

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `config.js`

**Steps:**

1. Run focused tests, `npm test`, syntax checks, and `git diff --check`.
2. Run the local browser smoke check at 320px and 390px and confirm no horizontal overflow.
3. Bump the preschool displayed version, update release notes, commit, push `main`, and wait for the Android workflow.
4. Download the APK, install it on MuMu, and test the homepage route plus one lesson reward flow.
