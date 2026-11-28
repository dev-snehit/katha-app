import { z } from 'zod';

// --- Supported Languages & Roles ---
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

export const PaymentModeEnum = z.enum(['CASH', 'CREDIT', 'UPI', 'CHEQUE', 'BANK_TRANSFER', 'DD']);
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
  password: z.string().optional(),
  passwordHash: z.string().optional(),
  mustResetPassword: z.boolean().default(false).optional(),
  resetPasswordToken: z.string().optional(),
  resetPasswordExpires: z.string().optional(),
  requestedRole: RoleEnum.optional(),
  requestedName: z.string().optional(),
  requestedAt: z.string().optional(),
  version: z.number().int().positive().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const WALK_IN_CUSTOMER_ID = '00000000-0000-0000-0000-000000000002';

// Pre-seeded Root Administrator
export const INITIAL_ADMIN_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Snehit Tadepalli',
  email: 'dev.snehit@gmail.com',
  phone: '9999999999',
  role: 'ADMIN',
  status: 'APPROVED',
  createdAt: '2026-01-01T00:00:00.000Z',
  password: 'admin',
  passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  mustResetPassword: false
};

// --- Customer Contract ---
export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Customer name is required").regex(/^[A-Za-z\s]+$/, "Customer name should only accept alphabets"),
  nameTe: z.string().optional(),
  phone: z.string().regex(/^\d{10}$/, "Mobile number should have 10 digits. Please verify."),
  address: z.string().optional(),
  addressTe: z.string().optional(),
  businessName: z.string().optional(),
  businessNameTe: z.string().optional(),
  currentDue: z.number().default(0),
  createdAt: z.string(),
  version: z.number().int().positive().optional(),
});
export type Customer = z.infer<typeof CustomerSchema>;

// --- Supplier Contract ---
export const SupplierSchema = z.object({
  id: z.string(),
  businessName: z.string().min(2, "Business name required"),
  businessNameTe: z.string().optional(),
  ownerName: z.string().optional(),
  ownerNameTe: z.string().optional(),
  bankName: z.string().min(2, "Bank name required"),
  accountNumber: z.string().min(6, "Valid account number required"),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Valid IFSC required"),
  nickname: z.string().min(2, "Reference nickname required (e.g. Lalitha SBI)"),
  nicknameTe: z.string().optional(),
  payableAmount: z.number().nonnegative().default(0).optional(),
  createdAt: z.string(),
  version: z.number().int().positive().optional(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

// --- Follow-Up / Walk-In Leads Contract ---
export const FollowUpStatusEnum = z.enum(['OPEN', 'CONTACTED', 'CONVERTED']);
export type FollowUpStatus = z.infer<typeof FollowUpStatusEnum>;

export const FollowUpSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^\d{10}$/, "10-digit mobile number required"),
  address: z.string().optional(),
  purpose: z.string().min(2, "Purpose of purchase/inquiry required"),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
  status: FollowUpStatusEnum.default('OPEN'),
  createdAt: z.string(),
  version: z.number().int().positive().optional(),
});
export type FollowUp = z.infer<typeof FollowUpSchema>;

// --- Product Contract ---
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Product name required"),
  nameTe: z.string().optional(),
  category: z.string(), // RICE, WHEAT_RAVVA, SUJI_RAVVA, MAIDA, BROKEN_RICE, DALS, OTHER
  categoryTe: z.string().optional(),
  brandOrMill: z.string().optional(),
  brandOrMillTe: z.string().optional(),
  innerBagWeightKg: z.number().positive(),
  innerBagsPerOuter: z.number().int().positive(),
  outerBagTotalKg: z.number().positive(),
  stockPhysicalOuter: z.number().int().nonnegative().default(0),
  stockReservedOuter: z.number().int().nonnegative().default(0),
  stockLooseInner: z.number().int().nonnegative().default(0),
  stockLooseKg: z.number().nonnegative().default(0),
  costPricePerBag: z.number().nonnegative(), // Purchase Value
  wholesalePriceBag: z.number().nonnegative(), // Wholesale Value
  retailPriceBag: z.number().nonnegative().optional(), // Retail Value
  pricePerInnerBag: z.number().nonnegative(),
  version: z.number().int().positive().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

// --- Order Item & Order Contract ---
export const OrderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productNameTe: z.string().optional(),
  category: z.string().optional(),
  categoryTe: z.string().optional(),
  unitType: UnitTypeEnum,
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  lineTotal: z.number().positive(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  customerNameTe: z.string().optional(),
  customerPhone: z.string(),
  orderDate: z.string(),
  deliveryDate: z.string().optional(),
  status: OrderStatusEnum.default('PENDING_REVIEW'),
  totalOuterBags: z.number().int().default(0),
  totalInnerBags: z.number().int().default(0),
  totalWeightKg: z.number().default(0),
  items: z.array(OrderItemSchema).min(1, "At least one item required"),
  subtotal: z.number().nonnegative(),
  hamaliCharges: z.number().nonnegative().default(0),
  transportCharges: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative(),
  paymentMode: PaymentModeEnum.default('CREDIT'),
  vehicleNumber: z.string().optional(),
  driverPhone: z.string().optional(),
  submittedByRole: RoleEnum,
  approvedByRole: RoleEnum.optional(),
  createdAt: z.string(),
  version: z.number().int().positive().optional(),
});
export type Order = z.infer<typeof OrderSchema>;

// --- Role-Based Feature Permissions Contract ---
export const PagePermissionConfigSchema = z.object({
  enabled: z.boolean(),
  functionalities: z.record(z.string(), z.boolean()),
});
export type PagePermissionConfig = z.infer<typeof PagePermissionConfigSchema>;

export type RolePermissionsConfig = Record<Role, Record<string, PagePermissionConfig>>;
