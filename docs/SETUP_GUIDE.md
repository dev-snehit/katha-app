# KAATHA WHOLESALE – ONBOARDING & SETUP GUIDE
**Application:** Kaatha Wholesale (కాతా హోల్‌సేల్)  
**Initial Master Administrator:** Snehit Tadepalli (`dev.snehit@gmail.com`)  
**Hosting Model:** Static Single-Page App (GitHub Pages) + Google Apps Script Web App Backend  
**Deployment Cost:** $0.00 (Free Forever)

---

## Welcome to Kaatha Wholesale!
This guide walks you through setting up, deploying, and operating Kaatha Wholesale from scratch. By following these steps, you will have a high-end wholesale management system running live on the web with an always-up-to-date Google Sheet backend—completely free of server charges.

---

## 1. Prerequisites (What You Need)
1. A **Google Account** (e.g., `dev.snehit@gmail.com`) for Google Sheets and Google Apps Script.
2. A **GitHub Account** (free) to host the frontend on GitHub Pages.
3. Node.js v18+ installed on your computer (for local development or building).

---

## 2. Step-by-Step Setup Guide

### Step 1: Create Your Master Google Sheet
1. Open [Google Sheets](https://sheets.new) in your browser while logged into your Google account.
2. Name the spreadsheet: **`Kaatha_Wholesale_Master_Database`**.
3. You do not need to create all tabs manually—our automated Apps Script will create them on first launch:
   - `Users`
   - `Master_Products`
   - `Master_Customers`
   - `Master_Suppliers`
   - `Master_Orders_Sales`
   - `Pending_Orders`
   - `Master_Purchases`

---

### Step 2: Deploy the Free Google Apps Script Backend
1. Inside your Google Sheet, click **Extensions > Apps Script** in the top menu.
2. Delete any default code in the editor (`Code.gs`).
3. Open the file `backend/Code.gs` from this project repository, copy its entire contents, and paste it into the Apps Script editor.
4. Click the **Save** icon (disk icon).
5. At the top right, click the blue **Deploy** button > **New deployment**.
6. Click the gear icon (**Select type**) > choose **Web app**.
7. Set the deployment fields:
   * **Description**: `Kaatha Wholesale Production Backend v1`
   * **Execute as**: `Me (your email)`
   * **Who has access**: `Anyone` *(Note: This allows your GitHub Pages web app to communicate with the script. Your sheet remains private, and authentication is handled by the script)*.
8. Click **Deploy**.
9. Grant the required permissions when prompted by Google:
   * Click *Review permissions* > choose your Google account > click *Advanced* > click *Go to Untitled project (unsafe)* > click *Allow*.
10. **Copy the Web App URL** displayed on the screen. It looks like:
    ```
    https://script.google.com/macros/s/AKfycbx.../exec
    ```
    *Keep this URL handy—you will enter it into the app settings or environment variables.*

---

### Step 3: Deploy to GitHub Pages
1. Push this repository to your GitHub account (public repository).
2. Go to your repository on GitHub > Click **Settings** > **Pages** (in the left sidebar).
3. Under **Build and deployment > Source**, select **GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) will automatically build and publish the static React application.
5. In 1–2 minutes, your live public URL will be ready:
   ```
   https://<your-username>.github.io/katha-app/
   ```

---

### Step 4: First-Time Master Admin Login
1. Open your live application URL in any browser or on your mobile device.
2. The **Kaatha Wholesale Auth Screen** will appear automatically upon opening the application.
3. Sign in using the pre-seeded Master Admin credentials:
   * **Email**: `dev.snehit@gmail.com`
   * **Password**: `admin`
   * **Name**: `Snehit Tadepalli`
   * **Role**: `Admin`
4. Once signed in, open the **Settings** icon (gear icon) in the top right.
5. Paste your deployed Google Apps Script Web App URL and click **Test & Save Connection**.
6. The sync status badge in the header will turn 🟢 **Synced with Google Sheet**. Every order, customer, stock change, and supplier you add will now automatically sync directly to your Master Google Sheet!

---

## 3. Daily Operations & User Workflows

### A. Staff Registration & Admin Approval
1. New warehouse staff open the website and click **Sign Up**.
2. They enter their Name, 10-digit Mobile Number, Email, Password, and select Role = **Staff**.
3. Upon signup, their account is flagged as **`PENDING_APPROVAL`**.
4. The Admin (`dev.snehit@gmail.com`) navigates to **Admin > User Requests**, reviews the new staff account, and clicks **Approve**.
5. Once approved, the staff member can log in and begin creating orders.

---

### B. Warehouse Staff: Creating an Order (Two-Stage Stock Reservation)
1. Staff logs in on their phone or tablet in the godown.
2. The landing screen displays **"Orders Yet to Deliver"**.
3. Staff clicks **+ New Pending Order**:
   * Selects Customer (or clicks *Counter Cash Walk-in* for casual buyers).
   * Chooses commodities (e.g. *Sona Masoori 26kg Bag* - 20 bags).
   * Adds Vehicle Number (e.g. `TS 08 AB 1234`) and Driver Mobile.
   * Clicks **Submit for Owner Review**.
4. **Instant Stock Reservation**: The system immediately marks 20 bags as **`RESERVED`**. This prevents other staff from selling those physical bags before the truck is dispatched.

---

### C. Business Owner: Review & Approval
1. Owner opens the app on their laptop or phone.
2. The order appears in the **Pending Review** queue.
3. The Owner reviews the quantities and rates, and clicks **Approve Order**:
   * Stock is permanently **deducted** from physical warehouse stock.
   * The order is written directly to the locked **Master Google Sheet**.
   * The order moves to **Ready to Load / Out for Delivery**.
4. The Owner clicks **"Send WhatsApp Bill"**: opens WhatsApp with a pre-filled bill summary and balance for the customer.

---

### D. Date & Date-Range PDF Reporting
1. Navigate to the **Export Center** in the top menu.
2. Select **Single Date** (e.g., today) or **Date Range** (e.g., 1st to 22nd of the month).
3. Click any of the 3 export buttons:
   * **Sales Report PDF**: Detailed invoice-by-invoice accounting breakdown.
   * **Item-Wise Number Tally PDF**: Physical loading audit showing raw calculations (`1 + 4 + 5 + 6 = 16 Bags`).
   * **Stock Position PDF**: Daily opening vs. closing inventory reconciliation.
4. The PDF downloads directly in your browser with zero server delay.

---

### E. In-Browser Master Excel Export
* At any time, click **"Export Master Excel (.xlsx)"**.
* The app compiles your complete database into a styled, bilingual `.xlsx` spreadsheet with formula protection enabled and downloads it instantly.

---

## 4. Language Toggling (English / తెలుగు)
* In the top navigation bar, click the language dropdown.
* Selecting **"తెలుగు"** translates navigation menus, buttons, and status tags into Telugu.
* Product and Customer names entered with optional Telugu keys (`nameTe`, `businessNameTe`) will display in Telugu script, falling back automatically to English if left blank.

---

## 5. Automated CI/CD with Fixed Deployment ID (`clasp` + GitHub Actions)

Once your initial Web App deployment is created, you **never need to manually copy/paste code or change `DEFAULT_SERVER_URL` again**. Whenever `backend/` changes are pushed to `main`, GitHub Actions automatically pushes `backend/Code.gs` + `backend/appsscript.json` and updates your **same fixed Deployment ID** (`GAS_DEPLOYMENT_ID`), keeping the Web App URL constant and avoiding Google's 20-deployment limit.

### One-Time Setup
1. **Enable Google Apps Script API:**
   - Visit `https://script.google.com/home/usersettings` and turn **Google Apps Script API** **ON**.
2. **Publish GCP OAuth Consent Screen to "In production":**
   - In Google Cloud Console for your Apps Script project, open **APIs & Services → OAuth consent screen**.
   - Click **Publish App** so status is **In production** *(prevents OAuth refresh tokens from expiring every 7 days)*.
3. **Authenticate `clasp` Locally & Export Credentials:**
   ```bash
   npx @google/clasp login
   ```
   - After signing in with your Google account, copy the entire JSON contents of `~/.clasprc.json` (on Windows: `%USERPROFILE%\.clasprc.json`).
   - **Never commit `.clasprc.json`** (it is excluded in `.gitignore`).
4. **Find Your `GAS_SCRIPT_ID` & Fixed `GAS_DEPLOYMENT_ID`:**
   - In Google Apps Script → **Project Settings**, copy the **Script ID** (`GAS_SCRIPT_ID`).
   - Run `npx @google/clasp deployments` (or check **Deploy → Manage deployments**) and copy the active Web App **Deployment ID** (`AKfycb...`, i.e., `GAS_DEPLOYMENT_ID`).
5. **Add GitHub Repository Secrets:**
   - Open your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret** and add:
     - `CLASPRC_JSON`: full JSON content of `~/.clasprc.json`
     - `GAS_SCRIPT_ID`: your Apps Script Project Script ID
     - `GAS_DEPLOYMENT_ID`: your fixed Web App Deployment ID (`AKfycb...`)
     - `GAS_WEB_APP_URL`: your fixed Web App `/exec` URL (injected as `VITE_GOOGLE_APPS_SCRIPT_URL` during GitHub Pages build and used for post-deploy `?action=ping` health checks)
6. **Zero Hardcoded Secrets or URL Fallbacks (`src/config/backend.ts` & `backend/Code.gs`):**
   - `DEFAULT_SERVER_URL` in `src/config/backend.ts` has no hardcoded URL fallback; it is injected from `GAS_WEB_APP_URL` in CI (or `.env` locally) and throws a clear error via `getRequiredServerUrl()` if missing. When `DEFAULT_SERVER_URL` is configured, `SettingsModal.tsx` locks the URL field as read-only (`CI/CD Managed`) and clears any stale `localStorage` URL so non-technical users never experience broken connections.
   - `backend/Code.gs` has no hardcoded admin password hash fallback; initial admin seeding reads `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_PHONE`, and `INITIAL_ADMIN_PASSWORD_HASH` from Apps Script **Project Settings → Script Properties** (`PropertiesService.getScriptProperties()`) when `Users` is empty.
   - `setupDatabase()` automatically seeds a deterministic **Walk-In Customer** (`00000000-0000-0000-0000-000000000002`) in `Master_Customers` so counter-cash orders always satisfy foreign-key constraints.

### 1-Command Version Rollback
If a backend deployment ever needs to be rolled back to an earlier Apps Script version (`<version>`):
```bash
npx @google/clasp versions
npx @google/clasp deploy -i <GAS_DEPLOYMENT_ID> -V <version>
```

---

## 6. Security & Data Protection
* **Sheet Cell Protection**: In your Google Sheet, you can lock the tabs (`Data > Protect sheets and ranges`) to make them read-only for humans. The Google Apps Script bypasses human locks and safely writes all validated transactions.
* **No Secret Leaks**: No API passwords, `.clasprc.json` tokens, or service account JSON keys are embedded in the public GitHub repository.

**Support / Questions:** Contact the Master Administrator at `dev.snehit@gmail.com`.
