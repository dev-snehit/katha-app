# SYSTEM REQUIREMENTS SPECIFICATION & LIVING BLUEPRINT
**Project:** Kaatha Wholesale (కాతా హోల్‌సేల్) – Enterprise Rice & Groceries Wholesale Platform  
**Target Architecture:** Static SPA on GitHub Pages + Google Apps Script Web App Serverless Backend  
**Document Version:** 1.0.0  
**Status:** APPROVED & ACTIVE  

> **Self-Containment Guarantee:** This document is the single source of truth for the entire application. Any software engineer or AI coding assistant can read this document and recreate the exact same application from scratch without access to any code repository.

---

## 1. Domain Overview & Business Context

### 1.1 Purpose
Kaatha Wholesale is a specialized web application built for wholesale merchants operating in the grain, rice, and grocery commodity trading sector (Mandi / Galla Vyapar). It automates bag-level inventory management, retailer credit ledgers (Khata), order dispatch pipelines with two-stage stock reservation, and end-of-day sales reconciliation.

### 1.2 Core Commodities & Packaging Hierarchy
Commodities include:
* **Rice Varieties**: Sona Masoori (Raw Old Crop, Raw New Crop, Steam, Boiled), BPT 5204, Basmati, Broken Rice (Tukda).
* **Flours & Ravva**: Wheat Ravva (Bombay Ravva), Suji Ravva, Bansi Ravva, Maida, Chakki Atta.

Packaging is strictly governed by the **Unified Outer/Inner Bag Equation**:
$$\text{Outer Bag Total Weight (kg)} = \text{Inner Bag Weight (kg)} \times \text{Inner Bags Count}$$

* **Solid Bulk Sacks**: Single bags where `innerBagsCount = 1` (e.g. 25kg, 26kg, 50kg, 100kg sacks).
* **Multipack Master Bags**: Large outer sacks containing discrete, consistent-weight consumer packets (e.g., a 25kg master bag containing $25 \times 1\text{kg}$ pouches of Suji Ravva, or 50kg containing $10 \times 5\text{kg}$ rice bags).
* **Auto-Unbundling**: If an order demands loose inner packets and none are opened, the system automatically unbundles 1 outer bag, incrementing loose packets by `innerBagsCount` and decrementing physical outer bags by 1.

---

## 2. Shared Data Contracts (Zod Schemas & Domain Types)

All services (Frontend, UI Store, Google Apps Script backend, and Master Excel/Sheets) strictly adhere to these schemas:

```typescript
import { z } from 'zod';

export const SupportedLanguageEnum = z.enum(['EN', 'TE']);
export type SupportedLanguage = z.infer<typeof SupportedLanguageEnum>;

export const RoleEnum = z.enum(['ADMIN', 'OWNER', 'STAFF', 'CUSTOMER']);
export type Role = z.infer<typeof RoleEnum>;

export const UserStatusEnum = z.enum(['PENDING_APPROVAL', 'APPROVED', 'DENIED']);
export type UserStatus = z.infer<typeof UserStatusEnum>;

export const OrderStatusEnum = z.enum([
  'PENDING_REVIEW',
  'APPROVED',
  'PACKED',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED'
]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const UnitTypeEnum = z.enum(['OUTER_BAG', 'INNER_BAG', 'LOOSE_KG']);
export type UnitType = z.infer<typeof UnitTypeEnum>;

export const PaymentModeEnum = z.enum(['CASH', 'CREDIT', 'UPI', 'CHEQUE', 'BANK_TRANSFER']);
export type PaymentMode = z.infer<typeof PaymentModeEnum>;

// --- User Contract ---
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "10-digit mobile required"),
  role: RoleEnum,
  status: UserStatusEnum.default('PENDING_APPROVAL'),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

// --- Customer Contract ---
export const CustomerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Customer name is required"),
  nameTe: z.string().optional().default(""),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit mobile number required"),
  address: z.string().optional().default(""),
  addressTe: z.string().optional().default(""),
  businessName: z.string().optional().default(""),
  businessNameTe: z.string().optional().default(""),
  currentDue: z.number().default(0),
  createdAt: z.string().datetime(),
});
export type Customer = z.infer<typeof CustomerSchema>;

// --- Supplier Contract ---
export const SupplierSchema = z.object({
  id: z.string().uuid(),
  businessName: z.string().min(2, "Business name required"),
  businessNameTe: z.string().optional().default(""),
  ownerName: z.string().optional().default(""),
  ownerNameTe: z.string().optional().default(""),
  bankName: z.string().min(2, "Bank name required"),
  accountNumber: z.string().min(6, "Valid account number required"),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Valid IFSC required"),
  nickname: z.string().min(2, "Reference nickname required (e.g. Lalitha SBI)"),
  nicknameTe: z.string().optional().default(""),
  createdAt: z.string().datetime(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

// --- Product Contract ---
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Product name required"),
  nameTe: z.string().optional().default(""),
  category: z.string(), // RICE, WHEAT_RAVVA, SUJI_RAVVA, MAIDA, BROKEN_RICE, OTHER
  brandOrMill: z.string().optional().default(""),
  brandOrMillTe: z.string().optional().default(""),
  innerBagWeightKg: z.number().positive(),
  innerBagsPerOuter: z.number().int().positive(),
  outerBagTotalKg: z.number().positive(),
  stockPhysicalOuter: z.number().int().nonnegative().default(0),
  stockReservedOuter: z.number().int().nonnegative().default(0),
  stockLooseInner: z.number().int().nonnegative().default(0),
  stockLooseKg: z.number().nonnegative().default(0),
  costPricePerBag: z.number().nonnegative(),
  wholesalePriceBag: z.number().nonnegative(),
  pricePerInnerBag: z.number().nonnegative(),
});
export type Product = z.infer<typeof ProductSchema>;

// --- Order Item & Order Contract ---
export const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  productNameTe: z.string().optional().default(""),
  unitType: UnitTypeEnum,
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  lineTotal: z.number().positive(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  customerId: z.string().uuid(),
  customerName: z.string(),
  customerNameTe: z.string().optional().default(""),
  customerPhone: z.string(),
  orderDate: z.string().datetime(),
  deliveryDate: z.string().datetime().optional(),
  status: OrderStatusEnum.default('PENDING_REVIEW'),
  totalOuterBags: z.number().int().default(0),
  totalInnerBags: z.number().int().default(0),
  totalWeightKg: z.number().default(0),
  items: z.array(OrderItemSchema).min(1, "At least one item required"),
  subtotal: z.number().nonnegative(),
  hamaliCharges: z.number().nonnegative().default(0),
  transportCharges: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative(),
  paymentMode: PaymentModeEnum.default('CREDIT'),
  vehicleNumber: z.string().optional().default(""),
  driverPhone: z.string().optional().default(""),
  submittedByRole: RoleEnum,
  approvedByRole: RoleEnum.optional(),
  createdAt: z.string().datetime(),
});
export type Order = z.infer<typeof OrderSchema>;
```

---

## 3. User Stories & Gherkin Acceptance Criteria

### Epic 1: User Authentication & Role Approval
#### US-1.1: Pre-Seeded Super Administrator
* **As** the business founder Snehit Tadepalli,
* **I want** a pre-seeded Admin account (`dev.snehit@gmail.com`),
* **So that** I have immediate root control over the system upon deployment.
* **Acceptance Criteria:**
  - `Given` the application is deployed for the first time,
  - `When` user logs in with `dev.snehit@gmail.com`,
  - `Then` the user is authenticated as `ADMIN` with status `APPROVED`.

#### US-1.2: User Registration & Admin Approval Workflow
* **As** a warehouse staff member or retail customer,
* **I want** to register for an account with my name, mobile, and requested role,
* **So that** I can access the system once approved by the administrator.
* **Acceptance Criteria:**
  - `Given` a user submits the registration form with valid credentials,
  - `When` registration completes,
  - `Then` account status is set to `PENDING_APPROVAL` and the user cannot view business data until approved.
  - `Given` the Admin navigates to the "User Requests" dashboard,
  - `When` the Admin clicks "Approve",
  - `Then` the user's status updates to `APPROVED` and they can log in.

---

### Epic 2: Bilingual UI & Fallback Engine
#### US-2.1: Language Switcher Dropdown
* **As** a wholesale user,
* **I want** to toggle the application interface between English and Telugu,
* **So that** staff and owners can navigate comfortably in their preferred language.
* **Acceptance Criteria:**
  - `Given` the user clicks the language dropdown in the top navbar,
  - `When` "తెలుగు" is selected,
  - `Then` all navigation titles, table headers, and status badges translate to Telugu.

#### US-2.2: Dynamic Data Fallback Resolution
* **As** a user viewing products and customers in Telugu mode,
* **I want** the system to display the Telugu name if available, or fall back to English if missing,
* **So that** I never encounter blank rows or layout crashes.
* **Acceptance Criteria:**
  - `Given` active language is `TE`,
  - `When` product has `nameTe = "సోనా మసూరి పాత బియ్యం"`,
  - `Then` UI renders `"సోనా మసూరి పాత బియ్యం"`.
  - `When` product has empty `nameTe`,
  - `Then` UI renders primary English `name` (`"Sona Masoori Rice (Raw Old)"`).

---

### Epic 3: Commodity Catalog & Packaging Engine
#### US-3.1: Outer/Inner Bag Weight Calculation
* **As** an inventory manager,
* **I want** commodities to define inner bag weight and inner count per outer bag,
* **So that** physical weight is automatically reconciled down to the kilogram.
* **Acceptance Criteria:**
  - `Given` a product with `innerBagWeightKg = 1.0` and `innerBagsPerOuter = 25`,
  - `When` saved,
  - `Then` `outerBagTotalKg` is automatically calculated as `25.0 kg`.

#### US-3.2: Automatic Unbundling on Loose Packet Sale
* **As** a counter sales clerk,
* **I want** the system to unpack 1 master bag when loose packets are requested and 0 are opened,
* **So that** I can complete the sale without manual inventory adjustments.
* **Acceptance Criteria:**
  - `Given` Product stock is `stockPhysicalOuter = 10` and `stockLooseInner = 0`,
  - `When` an order for `3 INNER_BAG` packets is confirmed,
  - `Then` `stockPhysicalOuter` becomes `9`, and `stockLooseInner` becomes `22` ($25 - 3$).

---

### Epic 4: Orders & Two-Stage Stock Reservation
#### US-4.1: Stock Reservation upon Order Creation
* **As** warehouse staff,
* **I want** newly submitted orders to reserve stock immediately,
* **So that** other staff members cannot accidentally oversell the same bags.
* **Acceptance Criteria:**
  - `Given` a product with `stockPhysicalOuter = 50` and `stockReservedOuter = 0`,
  - `When` Staff creates an order for `10` outer bags,
  - `Then` order status is `PENDING_REVIEW`, `stockPhysicalOuter` remains `50`, `stockReservedOuter` becomes `10`, and $\text{Available Stock}$ drops to `40`.

#### US-4.2: Owner Approval & Stock Commitment
* **As** the business owner,
* **I want** to review, edit, and approve pending staff orders,
* **So that** stock is permanently deducted and committed to the Master Sheet.
* **Acceptance Criteria:**
  - `Given` an order with status `PENDING_REVIEW` reserving `10` bags,
  - `When` Owner clicks "Approve Order",
  - `Then` order status changes to `APPROVED`, `stockPhysicalOuter` drops to `40`, `stockReservedOuter` resets to `0`, and the row is appended to the Master Google Sheet.

---

### Epic 5: Customer Directory & 1-Click WhatsApp Invoicing
#### US-5.1: Mandatory Customer Mobile Number
* **As** the business owner,
* **I want** every customer account to have a validated 10-digit Indian mobile number,
* **So that** automated WhatsApp/SMS notifications can be reliably dispatched.
* **Acceptance Criteria:**
  - `Given` user enters phone `"9848022338"`,
  - `When` form is submitted,
  - `Then` validation succeeds.
  - `When` user enters `"12345"` or letters,
  - `Then` validation fails with message `"Valid 10-digit mobile number required"`.

#### US-5.2: 1-Click WhatsApp Invoicing (`wa.me`)
* **As** a counter clerk or owner,
* **I want** a 1-click WhatsApp button next to every approved order,
* **So that** I can send customer bills and outstanding dues for free with zero API cost.
* **Acceptance Criteria:**
  - `Given` an approved order for Customer Raju (Phone: `9848022338`),
  - `When` user clicks "Send WhatsApp Bill",
  - `Then` browser opens `https://wa.me/919848022338?text=...` with pre-composed bill total, bag count, and running balance.

---

### Epic 6: Three Date & Date-Range PDF Exports
#### US-6.1: Daily / Period Sales Report PDF
* **As** the business owner,
* **I want** to export sales for any selected single date or date range as a PDF,
* **So that** I have an official printable sales ledger.
* **Acceptance Criteria:**
  - `Given` a date filter from `2026-11-01` to `2026-11-22`,
  - `When` user clicks "Download Sales Report PDF",
  - `Then` a formatted PDF is generated in the browser listing all invoices, customer names, items, bags, and cash vs. credit totals.

#### US-6.2: Item-Wise Number Tally PDF (Audit Sheet)
* **As** a warehouse supervisor,
* **I want** an item-wise PDF showing raw additive arithmetic strings (e.g. `1 + 4 + 5 + 6 = 16 Bags`),
* **So that** I can cross-verify loaded bags against warehouse stacks.
* **Acceptance Criteria:**
  - `Given` sales of `1`, `4`, `5`, and `6` bags of Sona Masoori 26kg on today's date,
  - `When` user clicks "Download Number Tally PDF",
  - `Then` the PDF displays `Sona Masoori 26kg: 1 + 4 + 5 + 6 = 16 Bags`.
  - `When` a multi-day range is selected,
  - `Then` the PDF groups tallies date-by-date with a period total.

#### US-6.3: Final Stock Position Report PDF
* **As** the business owner,
* **I want** to export a closing stock report for any date or range,
* **So that** I can reconcile physical godown inventory against the system.
* **Acceptance Criteria:**
  - `Given` any selected date,
  - `When` user exports Stock Position PDF,
  - `Then` the table displays: Opening Stock + Inward Purchases - Outward Sales = Closing Stock for every item.

#### US-7: Purchase Record & Commodity Registration Form Validation
* **As** an inventory manager or owner,
* **I want** strict validation on every input field of the Purchase Record / Add Commodity form,
* **So that** data integrity is maintained across alphabetic identifiers and wholesale commodity pricing.
* **Acceptance Criteria:**
  - `Given` the "Add New Commodity / Purchase Record" form,
  - `When` entering "Commodity Name",
  - `Then` any valid string (alphanumeric, symbols, spaces, minimum 2 characters) is accepted without character restrictions.
  - `When` entering "Bill Name" / "Brand / Mill Name",
  - `Then` only alphabetic characters and spaces `[A-Za-z ]` are accepted; digits, punctuation, and special symbols are disallowed.
  - `When` entering pricing values (`Purchase Value`, `Wholesale Value`, `Retail Value`),
  - `Then` the pricing values must satisfy: Wholesale value should be greater than or equal to Purchase value and retail value must be greater than or equal to wholesale value (`Purchase <= Wholesale <= Retail`).
  - `When` `Wholesale < Purchase`,
  - `Then` form submission is blocked with an alert: `Wholesale value (₹...) should be greater than or equal to Purchase value (₹...)!`
  - `When` `Retail < Wholesale`,
  - `Then` form submission is blocked with an alert: `Retail value (₹...) must be greater than or equal to Wholesale value (₹...)!`
  - `When` all fields are valid,
  - `Then` the commodity is saved to inventory and synchronized with the master database.

#### US-8: Customer Registration Form Validation
* **As** a counter clerk or manager,
* **I want** strict validation on Customer Name and Mobile Number when registering a new customer,
* **So that** only genuine contacts with working 10-digit mobile numbers are registered for billing and WhatsApp statements.
* **Acceptance Criteria:**
  - `Given` the "Add New Customer" modal,
  - `When` entering "Customer Name",
  - `Then` only alphabetic characters and spaces `[A-Za-z ]` are accepted; digits, punctuation, and special symbols are strictly disallowed.
  - `When` "Customer Name" contains numbers or symbols,
  - `Then` form submission is blocked with error: `"Customer name should only accept alphabets."`.
  - `When` entering "Mobile Number",
  - `Then` the input must definitely have exactly 10 digits (`^\d{10}$`).
  - `When` "Mobile Number" is invalid (not 10 digits or contains non-digits),
  - `Then` form submission is blocked with exact error: `"Mobile number should have 10 digits. Please verify."`.
  - `When` both inputs are valid,
  - `Then` the customer is saved to state and synchronized with Google Sheets.

---

## 4. Master Google Sheet Schema & Security Architecture

The Google Sheet acts as the primary cloud database. Manual human edits to cells are protected/locked. All mutations flow exclusively through the Google Apps Script Web App.

### Required Tabs & Column Layout:
1. `Users`: `[id, name, email, phone, role, status, createdAt]`
2. `Master_Products`: `[id, name_en, name_te, category, brand_en, brand_te, inner_wt_kg, inner_count, outer_wt_kg, stock_physical, stock_reserved, price_bag, cost_bag]`
3. `Master_Customers`: `[id, name_en, name_te, phone, business_en, business_te, address_en, address_te, current_due]`
4. `Master_Suppliers`: `[id, business_en, business_te, owner_en, owner_te, bank_name, account_no, ifsc_code, nickname_en, nickname_te]`
5. `Master_Orders_Sales`: `[id, order_no, customer_id, customer_name, customer_phone, date, total_bags, total_weight_kg, grand_total, payment_mode, status, approved_by]`
6. `Pending_Orders`: `[id, order_no, customer_id, customer_name, date, total_bags, grand_total, status, submitted_by]`
7. `Master_Purchases`: `[id, purchase_no, supplier_id, date, total_bags, grand_total, reference_bill]`

---

## 5. Client-Side Master Excel Generator (`master_records.xlsx`)

* Uses `exceljs` directly in browser memory.
* Triggered via **"Export Master Excel (.xlsx)"** button.
* Applies worksheet protection (`worksheet.protect('password')`) on formula and balance columns.
* Preserves complete UTF-8 Telugu characters in bilingual columns.
