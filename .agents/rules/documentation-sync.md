---
description: Enforce automatic documentation, flowchart, and sequential prompt/commit tracking on every change in this repository.
---

# Documentation & Change-Tracking Rule

Whenever any feature, bugfix, enhancement, refactor, schema update, route change, or configuration change is made in this repository, you **MUST**:

1. **Update Relevant Module Documentation & Flowcharts:**
   - Update the affected module section and Mermaid flowchart in `docs/MODULES_AND_FLOWCHARTS.md`.
   - If a new module, route, or config file is introduced, add it to the index and architecture map in `docs/README.md`.
2. **Append to the Sequential Change Log & Prompts Ledger:**
   - Add a new sequential entry (`#N`) to `docs/CHANGE_LOG_AND_PROMPTS.md` recording:
     - Date
     - User Prompt / Request summary
     - Changes & Enhancements implemented
     - Exact files touched
     - Git commit hash (after committing, or update the hash before/with the push)
3. **Documentation-Only Requests:**
   - When the user asks solely for documentation updates, **strictly do not modify or break any application code** (`src/`, `backend/`, `tests/`, `package.json`, `.github/`).
4. **Accuracy:**
   - Only document file paths, symbol names, routes, and behaviors directly verified in the current codebase.
