# Kaatha Wholesale — Migration, Replication & Secret Rotation Guide

> **Cost Guarantee:** Every workflow in this guide runs **100% free (\$0.00/month)** using **GitHub Pages (public repo) + GitHub Actions + Google Sheets + Google Apps Script**. No credit card or Google Cloud billing is required.
>
> **Security Rule:** Never hardcode URLs, passwords, SHA-256 password hashes, or `.clasprc.json` tokens in any source file. All sensitive values belong exclusively in **GitHub Repository Secrets** and **Apps Script `ScriptProperties`**.

---

## Quick Reference: Where Every Secret Lives

| Secret / Config | Where It Is Stored | Purpose |
| :--- | :--- | :--- |
| `GAS_WEB_APP_URL` | GitHub Repo Secrets | Fixed `/exec` Web App URL baked into the frontend at build time (`VITE_GOOGLE_APPS_SCRIPT_URL`) |
| `GAS_SCRIPT_ID` | GitHub Repo Secrets | Google Apps Script Project ID used by `clasp push` in CI |
| `GAS_DEPLOYMENT_ID` | GitHub Repo Secrets | Fixed Apps Script Deployment ID (`AKfycb...`) updated in place by CI |
| `CLASPRC_JSON` | GitHub Repo Secrets | OAuth JSON token from `npx @google/clasp login` (`%USERPROFILE%\.clasprc.json`) |
| `JWT_SECRET` | Apps Script `ScriptProperties` | Server-only HMAC-SHA256 signing key (auto-generated on first `setupDatabase()`) |
| `INITIAL_ADMIN_EMAIL` | Apps Script `ScriptProperties` | Root Admin email seeded when `Users` sheet is empty |
| `INITIAL_ADMIN_NAME` | Apps Script `ScriptProperties` | Root Admin display name (optional, defaults to `Administrator`) |
| `INITIAL_ADMIN_PHONE` | Apps Script `ScriptProperties` | Root Admin 10-digit mobile number (optional, defaults to `9999999999`) |
| `INITIAL_ADMIN_PASSWORD_HASH` | Apps Script `ScriptProperties` | SHA-256 hex hash of the Root Admin's initial password |

---

## Playbook A: Move Kaatha Wholesale to a New Google Account & Google Sheet
*(Keeps the same GitHub repository and GitHub Pages URL.)*

### Step 1: Export Data from the Old Google Sheet (Optional)
1. Sign into the **old** Google account and open your existing Master Google Sheet.
2. If you want to carry over existing records, click **File → Download → Microsoft Excel (.xlsx)** (or use **Export & Reports → Export Master Excel** inside the app) as a backup.

### Step 2: Create the New Master Google Sheet
1. Sign into the **new** Google account and open `https://sheets.new`.
2. Rename the spreadsheet (top-left) to `Kaatha_Wholesale_Master_Database`.
3. Click **Extensions → Apps Script** in the top menu.

### Step 3: Paste Backend Code & Configure `ScriptProperties`
1. In the new Apps Script editor, replace `Code.gs` with the contents of `backend/Code.gs` from this repository and click **Save** (disk icon).
2. In the left sidebar, click **Project Settings** (gear icon ⚙️).
3. Copy and save the **Script ID** — this is your new `GAS_SCRIPT_ID`.
4. Scroll down to **Script Properties → Add script property** and add:
   - `INITIAL_ADMIN_EMAIL` → your admin email (e.g., `owner@example.com`)
   - `INITIAL_ADMIN_NAME` → your admin full name
   - `INITIAL_ADMIN_PHONE` → your 10-digit admin mobile number
   - `INITIAL_ADMIN_PASSWORD_HASH` → SHA-256 hex hash of your chosen initial password *(you can generate one in PowerShell: `[BitConverter]::ToString(( [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes('YourPassword')) )).Replace('-','').ToLower()`)*
   - *(Note: `JWT_SECRET` is auto-generated securely the first time `setupDatabase()` runs.)*
5. Click **Save script properties**.

### Step 4: Create the Initial Fixed Web App Deployment
1. In Apps Script, click **Deploy → New deployment**.
2. Click the gear icon (**Select type**) → **Web app**.
3. Set:
   - **Description:** `Kaatha Wholesale Production Backend`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy** → **Authorize access** → choose the **new** Google account → **Advanced → Go to ... (unsafe) → Allow**.
5. Copy the **Deployment ID** (`GAS_DEPLOYMENT_ID`) and the **Web app URL** (`GAS_WEB_APP_URL`, ending in `/exec`).

### Step 5: Enable Apps Script API & Authenticate `clasp` on the New Google Account
1. Open `https://script.google.com/home/usersettings` (signed into the **new** Google account) and turn **Google Apps Script API** **ON**.
2. In PowerShell inside the project folder, run:
   ```powershell
   npx @google/clasp login
   ```
   Sign in with the **new** Google account and click **Allow**.
3. Print the token JSON:
   ```powershell
   Get-Content "$env:USERPROFILE\.clasprc.json" -Raw
   ```
   Copy the entire JSON output (never commit this file).

### Step 6: Update GitHub Repository Secrets
1. Open `https://github.com/<your-username>/katha-app/settings/secrets/actions`.
2. Update all 4 secrets:
   - `CLASPRC_JSON` → paste the new `.clasprc.json` JSON
   - `GAS_SCRIPT_ID` → paste the new Script ID
   - `GAS_DEPLOYMENT_ID` → paste the new Deployment ID
   - `GAS_WEB_APP_URL` → paste the new `/exec` URL

### Step 7: Redeploy, Verify & Retire the Old Deployment
1. Open GitHub **Actions → Deploy Kaatha Wholesale to GitHub Pages → Run workflow** (or re-run the latest workflow).
2. Verify the live backend health check in PowerShell or browser:
   ```powershell
   Invoke-RestMethod -Uri "<NEW_GAS_WEB_APP_URL>?action=ping"
   ```
   Confirm it returns `"status":"ok"`.
3. **Retire the old backend:** Sign into the **old** Google account → **Apps Script → Deploy → Manage deployments** → click the **Archive** icon on the old Web App deployment so no stale endpoint stays active.

---

## Playbook B: Replicate Kaatha Wholesale on Another GitHub & Google Account
*(Creates a completely independent second instance for another business or branch.)*

### Step 1: Create the New Public GitHub Repository
1. Sign into the **new** GitHub account.
2. Fork or import this repository (keep visibility **Public** so GitHub Pages and GitHub Actions remain **\$0/month**).
3. **If you rename the repository** (e.g., from `katha-app` to `my-wholesale-app`), update `base` in `vite.config.ts`:
   ```ts
   base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/my-wholesale-app/' : '/'),
   ```
4. Go to **Settings → Pages** in the new GitHub repo and set **Source** to **GitHub Actions**.

### Step 2: Set Up the New Google Sheet & Apps Script Backend
1. Follow **Steps 2–5 of Playbook A** on the new Google account to create the sheet, set `ScriptProperties`, create the Web App deployment, and generate `CLASPRC_JSON`.

### Step 3: Add the 4 Secrets to the New GitHub Repository
1. Open **Settings → Secrets and variables → Actions** in the **new** GitHub repo.
2. Add `CLASPRC_JSON`, `GAS_SCRIPT_ID`, `GAS_DEPLOYMENT_ID`, and `GAS_WEB_APP_URL`.

### Step 4: Trigger First Build & Verify
1. Go to **Actions → Deploy Kaatha Wholesale to GitHub Pages → Run workflow**.
2. Once green, verify `<NEW_GAS_WEB_APP_URL>?action=ping` returns `"status":"ok"`.
3. Open `https://<new-username>.github.io/<repo-name>/` and sign in with `INITIAL_ADMIN_EMAIL` and your chosen admin password.

---

## Playbook C: Rotate All Secrets Safely (Zero Hardcoded Fallbacks)

| What You Want to Rotate | Exact Steps | Impact on Users |
| :--- | :--- | :--- |
| **1. `JWT_SECRET`** *(invalidates all active sessions)* | Open Apps Script → **Project Settings → Script Properties** → edit `JWT_SECRET` to a new 64-character random string (or delete `JWT_SECRET` and run `setupDatabase()` once to auto-generate a new one). | All logged-in users are cleanly redirected to `/login` on their next request and just sign in again. |
| **2. `CLASPRC_JSON`** *(CI deployment token)* | Run `npx @google/clasp login` locally, copy `%USERPROFILE%\.clasprc.json`, and update `CLASPRC_JSON` in GitHub Repo Secrets. | Zero user impact. |
| **3. Admin Password / `INITIAL_ADMIN_PASSWORD_HASH`** | Sign into the app as Admin → change password (or use Forgot Password / `resetPassword`), and optionally update `INITIAL_ADMIN_PASSWORD_HASH` in Apps Script `ScriptProperties`. | Only affects future empty-sheet seeding; existing `Users` sheet row uses the updated hash. |
| **4. `GAS_DEPLOYMENT_ID` & `GAS_WEB_APP_URL`** *(only if URL leaked)* | In Apps Script → **Deploy → New deployment** (Web app, Me, Anyone) → copy new ID & URL → update `GAS_DEPLOYMENT_ID` and `GAS_WEB_APP_URL` in GitHub Secrets → re-run GitHub Actions → **Archive** the old deployment in Apps Script. | Zero manual action for users once GitHub Pages finishes rebuilding. |

---

## 1-Command Backend Version Rollback
If a backend push ever needs to be reverted to an earlier Apps Script version:
```powershell
npx @google/clasp versions
npx @google/clasp deploy -i <GAS_DEPLOYMENT_ID> -V <version_number>
```
Then verify `<GAS_WEB_APP_URL>?action=ping` returns `"status":"ok"`.
