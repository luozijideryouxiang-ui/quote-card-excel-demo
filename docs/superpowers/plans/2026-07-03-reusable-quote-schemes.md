# Reusable Quote Schemes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable quote scheme library so imported quote history and current quote selections can be reused without manually clicking every device again.

**Architecture:** Add a focused `schemeService.mjs` that stores custom schemes in Settings JSON and converts import history records into reusable scheme cards. Add API endpoints in `server.mjs`. Extend the existing quote workspace with a third mode that loads scheme lines into the current editable `QuoteLine[]` state.

**Tech Stack:** Node.js HTTP server, local JSON settings files, vanilla HTML/CSS/JS frontend, Node test runner.

---

### Task 1: Scheme Service

**Files:**
- Create: `src/schemeService.mjs`
- Test: `test/schemeService.test.mjs`

- [ ] Write failing tests for saving a custom scheme and listing import history as reusable schemes.
- [ ] Run `node --test test/schemeService.test.mjs` and verify missing module/function failures.
- [ ] Implement `loadSchemes`, `saveQuoteScheme`, and `loadReusableSchemes`.
- [ ] Run `node --test test/schemeService.test.mjs` and verify pass.

### Task 2: Scheme API

**Files:**
- Modify: `src/server.mjs`
- Modify: `test/serverContract.test.mjs`

- [ ] Add failing server contract assertions for `GET /api/schemes` and `POST /api/schemes`.
- [ ] Run `node --test test/serverContract.test.mjs` and verify failure.
- [ ] Wire API endpoints to `schemeService.mjs`.
- [ ] Run `node --test test/serverContract.test.mjs` and verify pass.

### Task 3: Quote Workspace UI

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `test/v3FrontendContract.test.mjs`

- [ ] Add failing frontend contract assertions for `schemeModeBtn`, `saveSchemeBtn`, and `/api/schemes`.
- [ ] Run `node --test test/v3FrontendContract.test.mjs` and verify failure.
- [ ] Add the "方案库" mode, scheme cards, save button, and copied-line loading.
- [ ] Run `node --test test/v3FrontendContract.test.mjs` and verify pass.

### Task 4: Build, Sync, Verify

**Files:**
- Update generated: `报价单快速生成器.html`
- Sync desktop: `/Users/momo/Desktop/02_财务表格/报价单生成工具/`

- [ ] Run all tests with bundled Node.
- [ ] Rebuild standalone HTML.
- [ ] Sync the full project and standalone HTML to the desktop folder.
- [ ] Restart the local service.
- [ ] Smoke check `GET /api/schemes` and the app page.
