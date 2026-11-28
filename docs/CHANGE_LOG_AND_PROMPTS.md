# Kaatha Wholesale — Sequential Prompts, Enhancements & Commit Log

> **Tracking Rule:** Every user prompt, enhancement, bugfix, and git commit **must** be appended sequentially to this log so the full evolution of the project remains traceable.

---

## Entry Template (For All Future Updates)

```markdown
### #N — <Short Title> (`<commit-hash>`)
- **Date:** YYYY-MM-DD
- **User Prompt / Request:** <Summary of user prompt or enhancement request>
- **Changes & Enhancements:**
  - <Bullet list of implemented changes>
- **Files Touched:** `<comma-separated file paths>`
- **Docs Updated:** `<docs files updated>`
```

---

## Chronological History

### #1 — Initial Repository & Wholesale CRM Foundation (`c2ef663`, `9d211d7`, `8be8e4c`)
- **Date:** 2026-11-22
- **User Prompt / Request:** Initialize the wholesale rice & groceries application repository and baseline structure.
- **Changes & Enhancements:** Initialized Vite + React + TypeScript + Tailwind CSS project, README, and core wholesale data structures.

### #2 — Mobile-First Redesign, Dynamic Multi-Item Builder & Implementation Plan (`9181e39`, `320b397`)
- **Date:** 2026-11-22
- **User Prompt / Request:** Mobile-first CRM redesign, dynamic multi-item order row builder, clean slate without dummy data, and custom modal alerts.
- **Changes & Enhancements:** Added `docs/IMPLEMENTATION_PLAN.md`, dynamic `+ Add Item` row builder, and `AlertDialog.tsx` replacing native browser `alert()`/`confirm()`.

### #3 — Google Sheets Live Sync, Auth Gate & Three-Tier Pricing (`2a024ee`, `c90b9dd`, `0ed5c68`)
- **Date:** 2026-11-22
- **User Prompt / Request:** Connect live backend persistence, add sign-in/registration gate, enforce 3 pricing tiers on purchases, editable order rates, custom discounts, strict EN/TE isolation, and remove root admin details from UI.
- **Changes & Enhancements:** Implemented `syncService.ts`, `AuthView.tsx`, 3 pricing metrics on commodities, editable rates + custom discounts, and sanitized UI hints.

### #4 — Admin Approval Policy, SHA-256 Auth & Separate Registration Sheet (`c2b88c4`, `972bd9d`, `860dba7`)
- **Date:** 2026-11-22
- **User Prompt / Request:** Require admin approval even for new admin requests, hash passwords with SHA-256, send temporary passwords via email, enforce first-login reset, and track signups in `User_Registrations`.
- **Changes & Enhancements:** Added `crypto.ts`, `User_Registrations` sheet handling in `backend/Code.gs`, temporary password generation, mandatory first-login reset, and pre-seeded bootstrap admin.

### #5 — Server Hydration on Mount & Validation Rules (`3c8c211`, `98a04bb`, `a809097`, `4782f49`, `ebc0b3f`)
- **Date:** 2026-11-26
- **User Prompt / Request:** Hydrate server data on mount/login, validate purchase pricing (`purchase <= wholesale <= retail`), remove commodity character restrictions, and validate alphabetic customer names with 10-digit mobile numbers.
- **Changes & Enhancements:** Added `purchaseValidation.ts`, `customerValidation.ts`, automatic server hydration, and untrack `dist` from git.

### #6 — Navbar Polish, Modal Standardization, Font Scaling & Session Persistence (`ce544b6`, `fa429a1`, `16814bc`, `f629e7b`, `b0f7422`, `59f4c23`)
- **Date:** 2026-11-26
- **User Prompt / Request:** Fix navbar wrapping/clipping, remove duplicate `+` symbols, standardize modal sizing/Esc/overlay dismiss, add server sync loading overlay, persist base font size, and persist user login session until manual sign out.
- **Changes & Enhancements:** Added `useModalDismiss.ts`, `SettingsModal.tsx` font scaling, server sync blur overlay in `App.tsx`, and `localStorage` session persistence.

### #7 — Unique Registration Validation & Password Reset Link Flow (`46d063b`, `81ca61c`)
- **Date:** 2026-11-26
- **User Prompt / Request:** Enforce unique email and 10-digit mobile number on registration, and implement unique password reset links dispatched via email.
- **Changes & Enhancements:** Added `forgotPassword`, `validateResetToken`, `resetPasswordWithToken`, and `MailApp` reset-link emails in `backend/Code.gs`.

### #8 — Admin/Owner Full CRUD, Slash Routing & Backend Abstraction (`0a4063c`, `adc42c2`, `b957a2d`, `60aec7a`)
- **Date:** 2026-11-26 to 2026-11-27
- **User Prompt / Request:** Allow Admin & Owner to add/update/edit orders, stocks, customers, and suppliers; add bookmarkable slash (`/`) routes with browser history & reload persistence (no `#` routing); fix settings icon overflow; abstract Google Sheets references as backend/database.
- **Changes & Enhancements:** Built `src/lib/router.ts`, route params (`/orders/:orderid`, etc.), `intendedRoute` post-login redirect, and abstracted UI labels.

### #9 — Kaatha/కాతా Rebrand, Clickable Logo, Confirmations, Spinners & Active User Editing (`08296db`, `bda3e3d`)
- **Date:** 2026-11-27
- **User Prompt / Request:** Make navbar logo clickable to index page; rename platform references to **Kaatha** / **కాతా**; add action loading spinners; allow editing active users (`name`, `role`, `status`); deduplicate users; require confirmation dialogs on edit/delete actions.
- **Changes & Enhancements:** Updated branding across UI, PDFs, Excel, and `Code.gs`; added `actionLoading` overlay; added active user edit/delete modals and deduplication.

### #10 — Order Deletion, Auto-Combining Duplicate Items & Grid Overlap Fix (`db2c695`)
- **Date:** 2026-11-27
- **User Prompt / Request:** Allow Admin to delete orders with confirmation; combine quantities when duplicate commodity rows with same properties are added; fix overlapping totals/fields on large numbers.
- **Changes & Enhancements:** Added `deleteOrder` with stock restoration, duplicate line-item merging in `PendingOrdersView.tsx`, and balanced responsive grid layout.

### #11 — Role-Specific JSON Permissions & Removal of Clean Duplicates Button (`9bd2f68`)
- **Date:** 2026-11-27
- **User Prompt / Request:** Create role-specific JSON permissions controlling UI and backend actions together, add a dedicated Role Specific Controls section, remove "Clean Duplicates" button from Admin UI, and strictly keep zero dummy/sample data.
- **Changes & Enhancements:** Added `permissions.ts`, `RolePermissionsManager.tsx`, `Role_Permissions` sheet & `checkBackendPermission()` in `Code.gs`, and removed the Clean Duplicates UI button.

### #12 — Business Dashboard & Direct Database User Creation (`94d38a3`)
- **Date:** 2026-11-27
- **User Prompt / Request:** Add a cross-module Business Dashboard with interactive cards, charts, and tables controlled by role permissions JSON; replace simulated user creation with direct database `Create User` creating an entry with temporary password & reset link emailed to user.
- **Changes & Enhancements:** Added `DashboardView.tsx`, `dashboard_page` permissions, and `createUser` flow in `useAppStore.ts`, `UserRequestsView.tsx`, and `Code.gs`.

### #13 — Responsive Top Navbar Visibility Across All Screen Sizes (`cf442d8`)
- **Date:** 2026-11-27
- **User Prompt / Request:** Fix navbar options so all available options are visible at the top of the screen on desktop and smaller screens without clipping.
- **Changes & Enhancements:** Refactored `Navbar.tsx` with concise labels (`Orders`, `Stock`, `Reports`, `Admin`), full-title tooltips, `shrink-0` items, and a dedicated sticky top horizontal navigation rail for `< lg` (tablets & mobile) alongside the mobile bottom bar.

### #14 — Registration Reset Redirect & Role Re-Request Without Password Change (`94a5d2c`)
- **Date:** 2026-11-27
- **User Prompt / Request:** Redirect users to `/login` after resetting password via link instead of auto-logging in; block pending new users until admin approves; allow existing users to re-request a different role (and update full name) with the same email & mobile without changing password, while keeping existing privileges until approved.
- **Changes & Enhancements:** Updated `resetPasswordWithToken`, `registerUser`, `approveUser`, `denyUser`, `AuthView.tsx`, `UserRequestsView.tsx`, `UserSchema`, `Code.gs`, and added tests in `authAndSync.test.ts`.

### #15 — Externalized Role Configuration JSON Files (`c824dcf`)
- **Date:** 2026-11-27
- **User Prompt / Request:** Provide dedicated role configuration `.json` files in the repo to define and extend roles and permissions.
- **Changes & Enhancements:** Created `src/config/roles/roles.json`, `owner.json`, `admin.json`, `staff.json`, and `customer.json`, and wired them into `src/lib/permissions.ts`.

### #16 — Comprehensive Module Documentation, Flowcharts & Automated Sync Rules (`e9f67f0`)
- **Date:** 2026-11-28
- **User Prompt / Request:** Prepare detailed documentation and proper flowcharts for every functionality in the code; set up a workflow so every future change updates relevant docs; track commits, changes, prompts, and enhancements sequentially without modifying any application code.
- **Changes & Enhancements:** Created `docs/README.md`, `docs/MODULES_AND_FLOWCHARTS.md`, `docs/CHANGE_LOG_AND_PROMPTS.md`, `.agents/rules/documentation-sync.md`, and `AGENTS.md`.
- **Files Touched:** `docs/README.md`, `docs/MODULES_AND_FLOWCHARTS.md`, `docs/CHANGE_LOG_AND_PROMPTS.md`, `.agents/rules/documentation-sync.md`, `AGENTS.md`

### #17 — HS256 JWT Session Authentication, 1-Hour Expiry & 5-Minute Pre-Expiry Warning (`pending commit`)
- **Date:** 2026-11-28
- **User Prompt / Request:** Implement HS256 JWT-based session authentication with a 1-hour expiration, 5-minute pre-expiry warning dialog ("Stay Signed In" / "Sign Out Now"), forced logout on expiry/tampering, strict backend login, and synchronized documentation.
- **Changes & Enhancements:**
  - Added server-only `JWT_SECRET` in `PropertiesService.getScriptProperties()`, `signJwt()`, `verifyJwt()`, `login`, and `refreshToken` actions in `backend/Code.gs`, verifying `authToken` on all protected `doPost` mutations and deriving `userRole` from verified JWT claims.
  - Added `src/lib/jwt.ts`, `authToken` persistence in `localStorage`, strict backend `login()`, `refreshSessionToken()`, `checkSessionExpiry()`, and `TOKEN_EXPIRED`/`UNAUTHORIZED` forced logout handling in `useAppStore.ts` and `syncService.ts`.
  - Added strict 1-hour countdown monitor and bilingual 5-minute pre-expiry warning modal in `src/App.tsx`, plus expired-session banner in `src/components/auth/AuthView.tsx`.
  - Updated `tests/authAndSync.test.ts` with backend JWT mocks and unit tests for offline/unconfigured login failure, expired/tampered JWT forced logout, and 5-minute pre-expiry `refreshSessionToken()` renewal.
- **Files Touched:** `backend/Code.gs`, `src/lib/jwt.ts`, `src/lib/syncService.ts`, `src/store/useAppStore.ts`, `src/App.tsx`, `src/components/auth/AuthView.tsx`, `tests/authAndSync.test.ts`, `docs/README.md`, `docs/MODULES_AND_FLOWCHARTS.md`, `docs/CHANGE_LOG_AND_PROMPTS.md`

### #18 — Separated Unit, UI, Backend/API & E2E Regression Test Suites + V8 Coverage (`pending commit`)
- **Date:** 2026-11-28
- **User Prompt / Request:** Write separated unit, UI, backend/API, and E2E integration regression test cases across all components and flows targeting 99% coverage.
- **Changes & Enhancements:**
  - Configured `@vitest/coverage-v8`, `vite.config.ts` coverage reporting, and separated npm test scripts (`test:unit`, `test:ui`, `test:backend`, `test:e2e`, `test:coverage`) in `package.json`.
  - Added backend Google Apps Script VM harness (`tests/backend/gasHarness.ts`) and API/JWT tests (`tests/backend/codeGs.test.ts`).
  - Added deep unit tests (`tests/unit/libsAndExports.test.ts`, `tests/unit/storeAndLibsDeep.test.ts`).
  - Added UI component & regression test suites (`tests/ui/componentsCore.test.tsx`, `tests/ui/viewsPart1.test.tsx`, `tests/ui/viewsPart2.test.tsx`, `tests/ui/crudModalsDeep.test.tsx`, `tests/ui/regressionFlows.test.tsx`).
  - Added full-stack E2E integration suite (`tests/e2e/e2eFlows.test.tsx`) wiring `<App />` to the real `backend/Code.gs` VM harness.
  - Raised overall statement/line coverage from 17.72% to 87.08% across 22 test files (167 passing tests).
- **Files Touched:** `package.json`, `package-lock.json`, `vite.config.ts`, `tests/backend/gasHarness.ts`, `tests/backend/codeGs.test.ts`, `tests/unit/libsAndExports.test.ts`, `tests/unit/storeAndLibsDeep.test.ts`, `tests/ui/componentsCore.test.tsx`, `tests/ui/viewsPart1.test.tsx`, `tests/ui/viewsPart2.test.tsx`, `tests/ui/crudModalsDeep.test.tsx`, `tests/ui/regressionFlows.test.tsx`, `tests/e2e/e2eFlows.test.tsx`, `docs/README.md`, `docs/CHANGE_LOG_AND_PROMPTS.md`

### #19 — Move "Forgot Password?" Below Password Input for Smooth Keyboard Tab Flow (`pending commit`)
- **Date:** 2026-11-28
- **User Prompt / Request:** Move the "Forgot Password?" option below the password input field in the Sign In form so keyboard navigation (`Tab`) flows uninterrupted from Email to Password.
- **Changes & Enhancements:** Relocated the "Forgot Password?" button below the password input (right-aligned) in `src/components/auth/AuthView.tsx` and added `aria-label` on the password visibility toggle.
- **Files Touched:** `src/components/auth/AuthView.tsx`, `docs/CHANGE_LOG_AND_PROMPTS.md`

### #20 — Single-Command Hard Validation, Email Delivery Hold, DB Save Spinners, Top-Right Toasts & `/login` + `/register` Routing (`a53eec4`)
- **Date:** 2026-11-28
- **User Prompt / Request:** Add a single `npm` script for instant full validation (`typecheck`, `lint`, `format:check`, `build`, `tests`), temporarily disable sending emails while preserving reset-link functionality until SMTP is configured, show loading spinners and clear error messages on DB saves, add top-right toast notifications for backend save confirmations/errors, and redirect unauthenticated/logged-out sessions to `/login` while syncing Sign In / Request Access tabs with `/login` and `/register` URLs.
- **Changes & Enhancements:**
  - Added `typecheck`, `lint`, `format:check`, and `validate` scripts in `package.json`, and mocked `global.fetch` in `tests/rolePermissions.test.ts` so the full suite runs fast.
  - Added `ENABLE_EMAIL_DELIVERY = false` in `backend/Code.gs` to hold outbound `MailApp.sendEmail` calls while keeping reset tokens/links active, and displayed the generated setup link directly on screen in `src/components/auth/AuthView.tsx` after registration.
  - Created `src/components/ui/ToastContainer.tsx` (top-right fixed bilingual EN/TE toasts) and wired `toasts`, `addToast`, `dismissToast`, `actionLoading` spinner lifecycle, and user-friendly error/success notifications into `triggerSync` and `syncAllToGoogleSheets` in `src/store/useAppStore.ts`.
  - Mounted `<ToastContainer />` in `src/App.tsx` and enforced `navigate('/login', { replace: true })` whenever unauthenticated or forced out.
  - Added unit, backend, and UI tests in `tests/authAndSync.test.ts`, `tests/backend/codeGs.test.ts`, and `tests/ui/componentsCore.test.tsx`.
- **Files Touched:** `package.json`, `backend/Code.gs`, `src/components/ui/ToastContainer.tsx`, `src/store/useAppStore.ts`, `src/App.tsx`, `src/components/auth/AuthView.tsx`, `tests/rolePermissions.test.ts`, `tests/authAndSync.test.ts`, `tests/backend/codeGs.test.ts`, `tests/ui/componentsCore.test.tsx`, `docs/README.md`, `docs/MODULES_AND_FLOWCHARTS.md`, `docs/CHANGE_LOG_AND_PROMPTS.md`

### #21 — Show Temporary Password Notice Only After Valid Form Submission (`a53eec4`)
- **Date:** 2026-11-28
- **User Prompt / Request:** Show the temporary sign-in password notification only after the user submits the Request Access form with valid form data, rather than displaying it all the time.
- **Changes & Enhancements:** Gated the amber temporary-password notice in `src/components/auth/AuthView.tsx` on `regSuccess` and added assertions in `tests/ui/componentsCore.test.tsx` verifying it is hidden before valid submission and visible afterward.
- **Files Touched:** `src/components/auth/AuthView.tsx`, `tests/ui/componentsCore.test.tsx`, `docs/CHANGE_LOG_AND_PROMPTS.md`

### #22 — Documentation & Flowchart Sync Audit (`docs-only`)
- **Date:** 2026-11-28
- **User Prompt / Request:** Check whether everything is documented properly and all flowcharts are up to date.
- **Changes & Enhancements:** Updated the Mermaid flowcharts in Section 1 (Authentication, `/login` & `/register` URL sync, on-screen setup link & email delivery hold) and Section 9 (JWT `authToken` enforcement on all `triggerSync` requests, `actionLoading` spinner, `TOKEN_EXPIRED` forced logout, and top-right `ToastContainer` success/error notifications) in `docs/MODULES_AND_FLOWCHARTS.md`, and recorded commit `a53eec4` in `docs/CHANGE_LOG_AND_PROMPTS.md`. Zero application code modified.
- **Files Touched:** `docs/MODULES_AND_FLOWCHARTS.md`, `docs/CHANGE_LOG_AND_PROMPTS.md`

### #23 — Automated Git Pre-Commit & CI/CD Documentation Sync Enforcement (`da07e3a`)
- **Date:** 2026-11-28
- **User Prompt / Request:** Ensure every change in the repository is automatically documented and kept up to date at all times without needing explicit user prompts.
- **Changes & Enhancements:**
  - Created `.githooks/pre-commit` to block any commit touching `src/`, `backend/`, or `tests/` unless `docs/CHANGE_LOG_AND_PROMPTS.md` (and `docs/MODULES_AND_FLOWCHARTS.md` for `src/` or `backend/` changes) is also updated and staged.
  - Added `docs:check` and `prepare` (`git config core.hooksPath .githooks`) scripts to `package.json`, and wired `docs:check` into `npm run validate`.
  - Updated `.github/workflows/deploy.yml` to verify documentation/flowchart sync on `push` and run `npm run validate` before deploying.
- **Files Touched:** `.githooks/pre-commit`, `package.json`, `.github/workflows/deploy.yml`, `docs/CHANGE_LOG_AND_PROMPTS.md`

### #24 — Database-Agnostic Repository + Constraint Engine Refactor (`ee65a40`)
- **Date:** 2026-11-28
- **User Prompt / Request:** Refactor the Google Sheets backend (`backend/Code.gs`) using a Database-Agnostic Repository + Constraint Engine pattern with `DB_SCHEMA`, server-controlled UUIDs & sequential numbers (`ORD-YYYY-0001`, `PUR-YYYY-0001`), PK/UK/FK/CHECK/state-transition enforcement, `version` optimistic locking, soft deletes (`is_deleted`), `LockService` + `CacheService`/`_Indexes` O(1) lookups, structured error codes, comprehensive tests, and synchronized documentation.
- **Changes & Enhancements:**
  - Defined `DB_SCHEMA`, `ERROR_CODES`, `ORDER_STATUS_TRANSITIONS`, `ConstraintEngine`, and `createSheetsRepository` (`findById`, `findOne`, `query`, `insert`, `update`, `softDelete`, `transaction`) in `backend/Code.gs` covering all 10 tables plus `_Indexes`.
  - Wired all `doGet`/`doPost` handlers to `SheetsRepository` with `LockService.getScriptLock()`, `CacheService` O(1) index invalidation, `version` optimistic concurrency checks, `FOREIGN_KEY_VIOLATION` delete guards, and a paginated `query` action.
  - Added `LockService`, `CacheService`, and `MockRange.clearContent()` to `tests/backend/gasHarness.ts` and added full constraint/locking/pagination tests in `tests/backend/codeGs.test.ts`.
  - Updated `docs/MODULES_AND_FLOWCHARTS.md` and `docs/CHANGE_LOG_AND_PROMPTS.md`.
- **Files Touched:** `backend/Code.gs`, `tests/backend/gasHarness.ts`, `tests/backend/codeGs.test.ts`, `docs/MODULES_AND_FLOWCHARTS.md`, `docs/CHANGE_LOG_AND_PROMPTS.md`

### #25 — Update Live Backend Deployment URL & Centralize Single Source of Truth (`pending commit`)
- **Date:** 2026-11-28
- **User Prompt / Request:** Update the new Google Apps Script deployment URL everywhere required and ensure it only needs to be updated in one place.
- **Changes & Enhancements:**
  - Updated `DEFAULT_SERVER_URL` in `src/config/backend.ts` to `https://script.google.com/macros/s/AKfycbxc7DP7XQHm4-Ro0MtMl61zuErdqhMMhseg6TysR4iPyGKJq4rgr_2LTmCcVQ-cXQ8E/exec`.
  - Commented out the stale `VITE_GOOGLE_APPS_SCRIPT_URL` override in local `.env` so `src/config/backend.ts` acts as the single source of truth across local dev and production builds.
  - Updated `docs/MODULES_AND_FLOWCHARTS.md` and `docs/CHANGE_LOG_AND_PROMPTS.md`.
- **Files Touched:** `src/config/backend.ts`, `docs/MODULES_AND_FLOWCHARTS.md`, `docs/CHANGE_LOG_AND_PROMPTS.md`
