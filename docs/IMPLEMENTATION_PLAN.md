# Katha Wholesale – Master Implementation Plan
**Application:** Katha Wholesale (కథా హోల్‌సేల్) – Enterprise Rice & Groceries Wholesale Platform  
**Architecture:** Static Single-Page App on GitHub Pages + Google Apps Script Web App Backend  
**Deployment Cost:** $0.00 (Free Forever)  
**Status:** IMPLEMENTED & ACTIVE  

---

## 1. System Overview & Core Requirements

Katha Wholesale is a specialized web application engineered for wholesale commodity merchants trading in Rice, Flours (Wheat Ravva, Suji Ravva, Maida), and Groceries. It runs 100% free on **GitHub Pages**, synchronizes with a **Master Google Sheet** via Google Apps Script, and features a high-end mobile-first UI.

### Key Functional Pillars:
1. **Zero Dummy/Sample Data**: Starts 100% clean with zero mock commodities, customers, suppliers, or orders. All data entered by the user is real and persists locally via `localStorage` and remotely in Google Sheets.
2. **Pre-Seeded Master Administrator**: Root administrator account pre-configured for **Snehit Tadepalli** (`dev.snehit@gmail.com`, Role: `ADMIN`, Status: `APPROVED`).
3. **Dynamic Multi-Item Order Builder (`+ Add Item`)**: Allows orders and sales to contain multiple commodity line items at different quantities in a single bill, with dynamic calculation of bags, metric weight in kg, hamali, and freight.
4. **Mobile-First CRM / Pipeline UI**: Inspired by modern pipeline interfaces (coral-orange accents `#FF5A36`, multi-segment progress strip, 2-letter pastel avatar badges, and a sticky mobile bottom navigation bar).
5. **Zero Native Alerts (`AlertDialog.tsx`)**: Completely eliminated browser `alert()` and `confirm()` dialogs in favor of a sleek, accessible, responsive modal dialog supporting `info`, `success`, `warning`, `danger`, and `confirm` types.
6. **Two-Stage Stock Reservation**: Stock is marked `RESERVED` upon order creation to prevent overselling on the shop floor; permanently `DEDUCTED` when the Owner approves.
7. **Bilingual Engine (English & Telugu)**: Full interface toggling between English and **తెలుగు** with automatic English fallback (`item.nameTe || item.name`).
8. **Customer & Supplier Directories**: Mandatory 10-digit mobile number with 1-click WhatsApp (`wa.me`) billing, plus supplier bank account details and reference nicknames.
9. **Three Date & Date-Range PDF Exports**: Daily/Period Sales Report, Item-Wise Number Tally (`1 + 4 + 5 = 10 Bags`), and Closing Stock Position Report.
10. **Client-Side Master Excel Generator**: In-browser export of `master_records.xlsx` with formula cells protected.

---

## 2. Technical Architecture & Tech Stack

```mermaid
flowchart TD
    subgraph Client ["Client Layer: GitHub Pages (Static SPA)"]
        UI["React 18/19 + TypeScript + Tailwind CSS (Vite)"]
        Navbar["Bilingual Navbar + Sticky Mobile Bottom Nav"]
        Zustand["Contract-Driven Zustand Store with LocalStorage"]
        PDF["Client-Side PDF Generator (jspdf)"]
        Excel["Client-Side Master Excel Generator (exceljs)"]
    end

    subgraph ServerlessBackend ["Zero-Cost Cloud Backend: Google Apps Script"]
        GAS["backend/Code.gs (Web App URL)
        - Native private access to Google Sheets
        - Enforces Admin / Owner approval logic
        - Zero API keys exposed in public GitHub repo"]
    end

    subgraph Storage ["Cloud Persistence"]
        MasterSheet["Google Sheet Master (Cell-Protected)
        - Tabs: Users, Master_Products, Master_Customers,
          Master_Suppliers, Master_Orders_Sales, Pending_Orders, Master_Purchases"]
    end

    UI --> Zustand
    Zustand --> GAS
    GAS --> MasterSheet
    UI --> PDF
    UI --> Excel
```

* **Frontend**: React 18/19, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion.
* **Build Tool**: Vite v6.
* **Testing**: Vitest + React Testing Library (22 tests passing across 5 suites).
* **Backend**: Google Apps Script (`backend/Code.gs`) deployed as a Web App URL.
* **CI/CD**: GitHub Actions workflow (`.github/workflows/deploy.yml`) deploying automatically to GitHub Pages.

---

## 3. Data Contracts & Domain Models (`src/contracts/index.ts`)

All entities are strictly validated via **Zod schemas**:

### A. Customer Contract
* `id`: UUID string
* `name`: String (Mandatory)
* `nameTe`: String (Optional Telugu name)
* `phone`: 10-digit Indian mobile number (`^[6-9]\d{9}$`)
* `businessName`: String (Optional)
* `address`: String (Optional)
* `currentDue`: Number (Default: 0)

### B. Product / Commodity Contract
* `id`: UUID string
* `name`: String (English - Mandatory)
* `nameTe`: String (Optional Telugu name)
* `category`: `'RICE' | 'BROKEN_RICE' | 'SUJI_RAVVA' | 'WHEAT_RAVVA' | 'MAIDA' | 'ATTA' | 'OTHER'`
* `brandOrMill`: String (Optional)
* `innerBagWeightKg`: Number (e.g. 1.0 kg)
* `innerBagsPerOuter`: Number (e.g. 25 inner packets per outer bag)
* `outerBagTotalKg`: Number (`innerBagWeightKg * innerBagsPerOuter`)
* `stockPhysicalOuter`: Number (Physical bags in warehouse)
* `stockReservedOuter`: Number (Reserved for pending orders)
* `stockLooseInner`: Number (Opened loose packets)
* `wholesalePriceBag`: Number (Wholesale price per outer bag)
* `pricePerInnerBag`: Number (Price per inner packet)

### C. Order Contract (Multi-Item Support)
* `id`: UUID string
* `orderNumber`: String (e.g. `ORD-1042`)
* `customerId`: String
* `customerName`: String
* `customerPhone`: String
* `orderDate`: ISO Date string
* `status`: `'PENDING_REVIEW' | 'APPROVED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'`
* `totalOuterBags`: Number
* `totalWeightKg`: Number
* `items`: Array of Order Items:
  - `productId`: String
  - `productName`: String
  - `unitType`: `'OUTER_BAG' | 'INNER_BAG' | 'LOOSE_KG'`
  - `quantity`: Number
  - `unitPrice`: Number
  - `lineTotal`: Number
* `subtotal`: Number
* `hamaliCharges`: Number (Total bags &times; Hamali rate)
* `transportCharges`: Number (Freight)
* `grandTotal`: Number
* `paymentMode`: `'CASH' | 'CREDIT' | 'UPI' | 'CHEQUE'`
* `vehicleNumber`: String (Optional)
* `driverPhone`: String (Optional)

---

## 4. Mobile-First UI/UX & Color Scheme

Inspired by the provided reference pipeline design:
* **Brand Primary**: Coral Orange (`#FF5A36` to `#FF6B4A`) with glowing button shadows.
* **Canvas Background**: Soft Warm Neutral (`#F8F9FB`).
* **Card Containers**: Rounded 24px cards (`card-soft`) with ultra-diffused shadow and subtle borders.
* **Pipeline Progress Bar**: Top segmented color strip displaying:
  - 🔵 **Pending Review**
  - 🟡 **Packing**
  - 🟣 **In Transit**
  - 🟢 **Delivered**
* **Initials Badges**: 2-letter customer initials in rounded-xl pastel badges (`RM`, `KS`, `OS`, `SB`).
* **Sticky Mobile Bottom Navigation**: Fixed thumb-reachable navigation bar for mobile devices:
  - `Orders` (with live pending badge counter)
  - `Stock`
  - `Clients`
  - `Mills`
  - `Reports`

---

## 5. Verification & Testing

Every core engine is verified with automated tests in `tests/`:
* `packagingEngine.test.ts`: Outer bag calculation, net weight, and auto-unbundling math.
* `stockEngine.test.ts`: Two-stage reservation, overselling prevention, commitment, and release.
* `tallyEngine.test.ts`: Single-day arithmetic string (`1 + 4 + 5 = 10 Bags`) and date-range grouping.
* `bilingualHelper.test.ts`: Telugu text display with graceful English fallback.
* `contracts.test.ts`: Zod schema validation for 10-digit mobile, IFSC codes, and pre-seeded admin.

**Test Run Output:**
```
 Test Files  5 passed (5)
      Tests  22 passed (22)
```

---

## 6. Living Documentation Files in Repository

1. **`docs/IMPLEMENTATION_PLAN.md`**: This document (architectural blueprint, data models, and UI mapping).
2. **`docs/REQUIREMENTS_SPEC.md`**: Master Gherkin User Stories (US-1 to US-9) and executable specifications.
3. **`docs/SETUP_GUIDE.md`**: Plain-English onboarding manual for Google Sheets, Apps Script, and GitHub Pages setup.
