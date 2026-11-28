# Project Agent Instructions — Kaatha Wholesale

## Mandatory Documentation & Change-Tracking Policy

1. **Keep Documentation & Flowcharts Synchronized:**
   - Every code, UI, routing, permission, or backend change MUST also update the corresponding section and Mermaid flowchart in `docs/MODULES_AND_FLOWCHARTS.md` (and `docs/README.md` if new modules or routes are added).
2. **Sequential Prompt, Enhancement & Commit Log:**
   - Every user prompt, enhancement, and commit MUST be appended in sequential order to `docs/CHANGE_LOG_AND_PROMPTS.md` with the prompt summary, implemented changes, modified files, and commit hash.
3. **Zero Unrequested Code Edits on Documentation Tasks:**
   - When a request is strictly about documentation, never modify or break application code (`src/`, `backend/`, `tests/`).
