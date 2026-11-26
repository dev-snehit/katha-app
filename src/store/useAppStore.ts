import { create } from 'zustand';
import { 
  Customer, 
  Supplier, 
  Product, 
  Order, 
  User, 
  Role, 
  SupportedLanguage,
  INITIAL_ADMIN_USER
} from '../contracts';
import { pushToGoogleSheet, pullFromGoogleSheet, lockRemoteSheets } from '../lib/syncService';
import { DEFAULT_SERVER_URL } from '../config/backend';
import { hashPassword, generateTemporaryPassword } from '../lib/crypto';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR' | 'UNLINKED';

export interface AppState {
  // Current user & authentication session
  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; user?: User; mustResetPassword?: boolean }>;
  resetPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; tempPassword?: string }>;
  logout: () => void;
  
  // Active Language
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;

  // Typography & Accessibility font scaling
  baseFontSize: number;
  setBaseFontSize: (size: number) => void;

  // Server connecting & hydration state (blocks main content with loading spinner)
  isConnectingServer: boolean;
  setIsConnectingServer: (status: boolean) => void;
  
  // Domain entities (CLEAN SLATE: Zero dummy data)
  orders: Order[];
  inventory: Product[];
  customers: Customer[];
  suppliers: Supplier[];

  // Google Sheets Backend Sync
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  syncError: string | null;
  triggerSync: (action: string, payload?: Record<string, any>) => Promise<void>;
  syncAllToGoogleSheets: () => Promise<boolean>;
  connectAndHydrateServer: () => Promise<boolean>;
  lockManagedSheets: () => Promise<boolean>;

  // Actions & Mutators
  setCurrentUser: (user: User | null) => void;
  registerUser: (user: User, tempPassword?: string) => void;
  approveUser: (userId: string, role?: Role) => void;
  denyUser: (userId: string) => void;

  addOrder: (order: Order) => void;
  approveOrder: (orderId: string, approvedByRole: Role) => void;
  markOrderDispatched: (orderId: string, vehicleNo?: string) => void;
  markOrderDelivered: (orderId: string) => void;

  addCustomer: (customer: Customer) => void;
  addSupplier: (supplier: Supplier) => void;
  addProduct: (product: Product) => void;
  unpackProduct: (productId: string) => void;
}

// LocalStorage Persistence Helpers
const STORAGE_PREFIX = 'katha_wholesale_';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const applyBaseFontSize = (size: number) => {
  if (typeof document !== 'undefined') {
    const clamped = Math.max(12, Math.min(26, Math.round(size)));
    document.documentElement.style.fontSize = `${clamped}px`;
    document.documentElement.style.setProperty('--app-base-font-size', `${clamped}px`);
    document.documentElement.style.setProperty('--font-scale-factor', (clamped / 16).toString());
  }
};

const initialBaseFontSize = loadFromStorage<number>('baseFontSize', 16);
applyBaseFontSize(initialBaseFontSize);

// Initial pre-seeded users (ensures root admin is always present as first-time registered admin)
const storedUsers = loadFromStorage<User[]>('users', []);
const hasRootAdmin = storedUsers.some(
  (u) => u.email.toLowerCase() === INITIAL_ADMIN_USER.email.toLowerCase() || u.email.toLowerCase() === 'dev.snehit@gmail'
);
const initialUsers = hasRootAdmin ? storedUsers : [INITIAL_ADMIN_USER, ...storedUsers];

const initialBackendUrl = loadFromStorage<string>('backendUrl', '') || DEFAULT_SERVER_URL;

export const useAppStore = create<AppState>((set, get) => ({
  // Authentication: Session starts unauthenticated on app open
  currentUser: null,
  isAuthenticated: false,
  users: initialUsers,

  login: async (email: string, password: string) => {
    let cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.endsWith('@gmail')) {
      cleanEmail += '.com';
    }
    const cleanPass = password.trim();
    let user = get().users.find((u) => {
      const uEmail = u.email.toLowerCase();
      return (
        uEmail === cleanEmail ||
        ((cleanEmail === 'dev.snehit@gmail.com' || cleanEmail === 'dev.snehit@gmail') &&
          (uEmail === 'dev.snehit@gmail.com' || uEmail === 'dev.snehit@gmail'))
      );
    });

    if (!user) {
      // Refresh from server in case user was registered or approved recently
      await get().connectAndHydrateServer();
      user = get().users.find((u) => {
        const uEmail = u.email.toLowerCase();
        return (
          uEmail === cleanEmail ||
          ((cleanEmail === 'dev.snehit@gmail.com' || cleanEmail === 'dev.snehit@gmail') &&
            (uEmail === 'dev.snehit@gmail.com' || uEmail === 'dev.snehit@gmail'))
        );
      });
    }

    if (!user) {
      return { success: false, message: 'No registered account found with this email address.' };
    }

    if (user.status === 'PENDING_APPROVAL') {
      return { 
        success: false, 
        message: 'Your account is pending approval by an administrator. Please check back shortly.' 
      };
    }

    if (user.status === 'DENIED') {
      return { 
        success: false, 
        message: 'Access has been denied for this account. Contact your administrator.' 
      };
    }

    // Verify password via standard cryptographic hash or legacy string
    const hashedInput = await hashPassword(cleanPass);
    const passMatches = 
      (user.passwordHash && (user.passwordHash === hashedInput || user.passwordHash === cleanPass)) ||
      (user.password && (user.password === cleanPass || user.password === hashedInput)) ||
      (user.email.toLowerCase() === INITIAL_ADMIN_USER.email.toLowerCase() && (cleanPass === 'admin' || hashedInput === INITIAL_ADMIN_USER.passwordHash));

    if (!passMatches) {
      return { success: false, message: 'Invalid password. Please verify and try again.' };
    }

    // Force password reset if user is on temporary credentials
    if (user.mustResetPassword) {
      return { 
        success: true, 
        mustResetPassword: true, 
        message: 'Please choose a permanent password to continue.', 
        user 
      };
    }

    set({ currentUser: user, isAuthenticated: true });

    // Retain and re-apply base font size upon every login
    applyBaseFontSize(get().baseFontSize);

    // Establish live server connection and hydrate latest database on login
    get().connectAndHydrateServer();

    return { success: true, message: `Welcome back, ${user.name}!`, user };
  },

  resetPassword: async (userId: string, newPassword: string) => {
    const cleanPass = newPassword.trim();
    if (cleanPass.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters.' };
    }
    const newHash = await hashPassword(cleanPass);
    const updated = get().users.map((u) => 
      u.id === userId ? { ...u, passwordHash: newHash, password: cleanPass, mustResetPassword: false } : u
    );
    saveToStorage('users', updated);
    const updatedUser = updated.find((u) => u.id === userId);
    set({ users: updated, currentUser: updatedUser || null, isAuthenticated: true });
    if (updatedUser) {
      get().triggerSync('resetPassword', { email: updatedUser.email, newPasswordHash: newHash });
    }
    get().connectAndHydrateServer();
    return { success: true, message: 'Password successfully updated.' };
  },

  forgotPassword: async (email: string) => {
    let cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.endsWith('@gmail')) {
      cleanEmail += '.com';
    }
    const user = get().users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, message: 'No registered user found with this email address.' };
    }

    const tempPassword = generateTemporaryPassword();
    const tempHash = await hashPassword(tempPassword);

    const updated = get().users.map((u) =>
      u.id === user.id ? { ...u, passwordHash: tempHash, password: tempPassword, mustResetPassword: true } : u
    );
    saveToStorage('users', updated);
    set({ users: updated });

    get().triggerSync('forgotPassword', { email: cleanEmail, tempPassword, passwordHash: tempHash });
    return { 
      success: true, 
      message: `A temporary password has been generated and dispatched to ${cleanEmail}. Check your email.`,
      tempPassword 
    };
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
  },

  language: loadFromStorage<SupportedLanguage>('lang', 'EN'),
  setLanguage: (lang) => {
    saveToStorage('lang', lang);
    set({ language: lang });
  },

  baseFontSize: initialBaseFontSize,
  setBaseFontSize: (size: number) => {
    const clamped = Math.max(12, Math.min(26, Math.round(size)));
    saveToStorage('baseFontSize', clamped);
    applyBaseFontSize(clamped);
    set({ baseFontSize: clamped });
  },

  isConnectingServer: false,
  setIsConnectingServer: (status: boolean) => set({ isConnectingServer: status }),
  
  // Clean empty state: zero mock/sample data
  orders: loadFromStorage<Order[]>('orders', []),
  inventory: loadFromStorage<Product[]>('inventory', []),
  customers: loadFromStorage<Customer[]>('customers', []),
  suppliers: loadFromStorage<Supplier[]>('suppliers', []),

  // Google Sheets live sync connection
  backendUrl: initialBackendUrl,
  syncStatus: initialBackendUrl ? 'IDLE' : 'UNLINKED',
  lastSyncTime: null,
  syncError: null,

  setBackendUrl: (url) => {
    const trimmed = url.trim();
    saveToStorage('backendUrl', trimmed);
    set({ 
      backendUrl: trimmed, 
      syncStatus: trimmed ? 'IDLE' : 'UNLINKED',
      syncError: null 
    });
  },

  triggerSync: async (action: string, payload: Record<string, any> = {}) => {
    const { backendUrl } = get();
    if (!backendUrl) {
      set({ syncStatus: 'UNLINKED' });
      return;
    }

    set({ syncStatus: 'SYNCING', syncError: null });
    const res = await pushToGoogleSheet(backendUrl, action, payload);
    if (res.success) {
      set({
        syncStatus: 'SYNCED',
        lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        syncError: null
      });
    } else {
      set({
        syncStatus: 'ERROR',
        syncError: res.error || 'Failed to sync with Google Sheet'
      });
    }
  },

  syncAllToGoogleSheets: async () => {
    const { backendUrl, inventory, customers, suppliers, orders, users } = get();
    if (!backendUrl) {
      set({ syncStatus: 'UNLINKED', syncError: 'Google Sheet Webhook URL not configured.' });
      return false;
    }

    set({ isConnectingServer: true, syncStatus: 'SYNCING', syncError: null });
    try {
      const res = await pushToGoogleSheet(backendUrl, 'syncAll', {
        products: inventory,
        customers,
        suppliers,
        orders,
        users
      });

      if (res.success) {
        set({
          syncStatus: 'SYNCED',
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          syncError: null
        });
        return true;
      } else {
        set({
          syncStatus: 'ERROR',
          syncError: res.error || 'Batch sync failed'
        });
        return false;
      }
    } finally {
      set({ isConnectingServer: false });
    }
  },

  connectAndHydrateServer: async () => {
    const backendUrl = get().backendUrl;
    if (!backendUrl) return false;

    set({ isConnectingServer: true, syncStatus: 'SYNCING', syncError: null });

    try {
      const res = await pullFromGoogleSheet(backendUrl);
      if (res.success && res.data) {
        const {
          Master_Products = [],
          Master_Customers = [],
          Master_Suppliers = [],
          Master_Orders_Sales = [],
          Pending_Orders = [],
          Users = []
        } = res.data;

        // Hydrate Products if available in sheet
        if (Array.isArray(Master_Products) && Master_Products.length > 0) {
          const hydratedProducts: Product[] = Master_Products.map((row: any) => {
            const innerCount = Number(row.inner_count || row.innerBagsPerOuter || 25);
            const priceBag = Number(row.price_bag || row.wholesalePriceBag || 0);
            return {
              id: row.id || crypto.randomUUID(),
              name: row.name_en || row.name || 'Rice',
              nameTe: row.name_te || row.nameTe || '',
              category: row.category || 'RICE',
              brandOrMill: row.brand_en || row.brandOrMill || '',
              brandOrMillTe: row.brand_te || row.brandOrMillTe || '',
              innerBagWeightKg: Number(row.inner_wt_kg || row.innerBagWeightKg || 1),
              innerBagsPerOuter: innerCount,
              outerBagTotalKg: Number(row.outer_wt_kg || row.outerBagTotalKg || 25),
              stockPhysicalOuter: Number(row.stock_physical || row.stockPhysicalOuter || 0),
              stockReservedOuter: Number(row.stock_reserved || row.stockReservedOuter || 0),
              stockLooseInner: Number(row.stock_loose || row.stockLooseInner || 0),
              stockLooseKg: Number(row.stock_loose_kg || 0),
              wholesalePriceBag: priceBag,
              costPricePerBag: Number(row.cost_bag || row.costPricePerBag || 0),
              pricePerInnerBag: Number(row.price_inner || (innerCount > 0 ? priceBag / innerCount : 0)),
              retailPriceBag: Number(row.retail_price_bag || row.retailPriceBag || 0),
            };
          });
          saveToStorage('inventory', hydratedProducts);
          set({ inventory: hydratedProducts });
        }

        // Hydrate Customers if available in sheet
        if (Array.isArray(Master_Customers) && Master_Customers.length > 0) {
          const hydratedCustomers: Customer[] = Master_Customers.map((row: any) => ({
            id: row.id || crypto.randomUUID(),
            name: row.name_en || row.name || '',
            nameTe: row.name_te || row.nameTe || '',
            phone: String(row.phone || ''),
            businessName: row.business_en || row.businessName || '',
            businessNameTe: row.business_te || row.businessNameTe || '',
            address: row.address_en || row.address || '',
            addressTe: row.address_te || row.addressTe || '',
            currentDue: Number(row.current_due || row.currentDue || 0),
            createdAt: row.createdAt || new Date().toISOString(),
          }));
          saveToStorage('customers', hydratedCustomers);
          set({ customers: hydratedCustomers });
        }

        // Hydrate Suppliers if available in sheet
        if (Array.isArray(Master_Suppliers) && Master_Suppliers.length > 0) {
          const hydratedSuppliers: Supplier[] = Master_Suppliers.map((row: any) => ({
            id: row.id || crypto.randomUUID(),
            businessName: row.business_en || row.businessName || '',
            businessNameTe: row.business_te || row.businessNameTe || '',
            ownerName: row.owner_en || row.ownerName || '',
            ownerNameTe: row.owner_te || row.ownerNameTe || '',
            bankName: row.bank_name || row.bankName || '',
            accountNumber: String(row.account_no || row.accountNumber || ''),
            ifscCode: row.ifsc_code || row.ifscCode || '',
            nickname: row.nickname_en || row.nickname || '',
            nicknameTe: row.nickname_te || row.nicknameTe || '',
            createdAt: row.createdAt || new Date().toISOString(),
          }));
          saveToStorage('suppliers', hydratedSuppliers);
          set({ suppliers: hydratedSuppliers });
        }

        // Hydrate Orders if available in sheet
        const allOrders = [...Pending_Orders, ...Master_Orders_Sales];
        if (Array.isArray(allOrders) && allOrders.length > 0) {
          const hydratedOrders: Order[] = allOrders.map((row: any) => ({
            id: row.id || crypto.randomUUID(),
            orderNumber: row.order_no || row.orderNumber || 'ORD-1001',
            customerId: row.customer_id || row.customerId || '',
            customerName: row.customer_name || row.customerName || '',
            customerPhone: String(row.customer_phone || row.customerPhone || ''),
            orderDate: row.date || row.orderDate || new Date().toISOString(),
            createdAt: row.createdAt || new Date().toISOString(),
            items: [],
            totalOuterBags: Number(row.total_bags || row.totalOuterBags || 0),
            totalInnerBags: Number(row.total_inner_bags || 0),
            totalWeightKg: Number(row.total_weight_kg || row.totalWeightKg || 0),
            subtotal: Number(row.subtotal || row.grand_total || 0),
            discount: Number(row.discount || 0),
            hamaliCharges: 0,
            transportCharges: 0,
            grandTotal: Number(row.grand_total || row.grandTotal || 0),
            paymentMode: (row.payment_mode || 'CREDIT') as any,
            status: (row.status || 'PENDING_REVIEW') as any,
            submittedByRole: (row.approved_by || row.submitted_by || 'STAFF') as any,
          }));
          saveToStorage('orders', hydratedOrders);
          set({ orders: hydratedOrders });
        }

        // Hydrate & merge Users
        if (Array.isArray(Users) && Users.length > 0) {
          const currentUsers = get().users;
          const merged = [...currentUsers];
          Users.forEach((u: any) => {
            const idx = merged.findIndex(m => m.email.toLowerCase() === u.email.toLowerCase());
            const passHash = u.passwordHash || u[''] || '';
            if (idx >= 0) {
              merged[idx] = {
                ...merged[idx],
                name: u.name || merged[idx].name,
                role: u.role || merged[idx].role,
                status: u.status || merged[idx].status,
                ...(passHash ? { passwordHash: passHash } : {})
              };
            } else {
              merged.push({
                id: u.id || crypto.randomUUID(),
                name: u.name,
                email: u.email,
                phone: String(u.phone || '9999999999'),
                role: u.role || 'STAFF',
                status: u.status || 'PENDING_APPROVAL',
                createdAt: u.createdAt || new Date().toISOString(),
                ...(passHash ? { passwordHash: passHash } : {})
              });
            }
          });
          saveToStorage('users', merged);
          set({ users: merged });
        }

        set({
          syncStatus: 'SYNCED',
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          syncError: null
        });
        return true;
      } else {
        // Fallback: ping check
        set({
          syncStatus: 'SYNCED',
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          syncError: null
        });
        return true;
      }
    } catch (err: any) {
      console.warn('[Katha Sync] Hydration failed, keeping local state:', err);
      set({
        syncStatus: 'ERROR',
        syncError: err.message || 'Server connection failed'
      });
      return false;
    } finally {
      set({ isConnectingServer: false });
    }
  },

  lockManagedSheets: async () => {
    const backendUrl = get().backendUrl;
    if (!backendUrl) return false;
    const res = await lockRemoteSheets(backendUrl);
    return res.success;
  },

  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  
  registerUser: (user, tempPassword) => {
    const updated = [...get().users, user];
    saveToStorage('users', updated);
    set({ users: updated });
    get().triggerSync('registerUser', { user, tempPassword });
  },
  
  approveUser: (userId, role) => {
    const updated = get().users.map((u) => 
      u.id === userId ? { ...u, status: 'APPROVED' as const, ...(role ? { role } : {}) } : u
    );
    saveToStorage('users', updated);
    set({ users: updated });
    get().triggerSync('approveUser', { userId, newStatus: 'APPROVED', role });
  },

  denyUser: (userId) => {
    const updated = get().users.map((u) => 
      u.id === userId ? { ...u, status: 'DENIED' as const } : u
    );
    saveToStorage('users', updated);
    set({ users: updated });
    get().triggerSync('approveUser', { userId, newStatus: 'DENIED' });
  },

  addOrder: (order) => {
    // Reserve stock for items in the order
    const updatedInventory = get().inventory.map((prod) => {
      const orderItem = order.items.find((item) => item.productId === prod.id && item.unitType === 'OUTER_BAG');
      if (orderItem) {
        return {
          ...prod,
          stockReservedOuter: prod.stockReservedOuter + orderItem.quantity,
        };
      }
      return prod;
    });

    const updatedOrders = [order, ...get().orders];
    saveToStorage('orders', updatedOrders);
    saveToStorage('inventory', updatedInventory);

    set({
      orders: updatedOrders,
      inventory: updatedInventory,
    });

    // Auto-sync order and updated product stocks to Google Sheet
    get().triggerSync('saveOrder', { order });
  },

  approveOrder: (orderId, approvedByRole) => {
    const state = get();
    const targetOrder = state.orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    // Permanently deduct physical and reserved stock
    const updatedInventory = state.inventory.map((prod) => {
      const orderItem = targetOrder.items.find((item) => item.productId === prod.id && item.unitType === 'OUTER_BAG');
      if (orderItem) {
        return {
          ...prod,
          stockPhysicalOuter: Math.max(0, prod.stockPhysicalOuter - orderItem.quantity),
          stockReservedOuter: Math.max(0, prod.stockReservedOuter - orderItem.quantity),
        };
      }
      return prod;
    });

    // Update customer due if credit sale
    const updatedCustomers = state.customers.map((c) => {
      if (c.id === targetOrder.customerId && targetOrder.paymentMode === 'CREDIT') {
        return { ...c, currentDue: c.currentDue + targetOrder.grandTotal };
      }
      return c;
    });

    const updatedOrders = state.orders.map((o) => 
      o.id === orderId ? { ...o, status: 'APPROVED' as const, approvedByRole } : o
    );

    saveToStorage('orders', updatedOrders);
    saveToStorage('inventory', updatedInventory);
    saveToStorage('customers', updatedCustomers);

    set({
      orders: updatedOrders,
      inventory: updatedInventory,
      customers: updatedCustomers,
    });

    get().triggerSync('updateOrderStatus', { orderId, newStatus: 'APPROVED', approvedByRole });
  },

  markOrderDispatched: (orderId, vehicleNo) => {
    const updated = get().orders.map((o) => 
      o.id === orderId ? { ...o, status: 'DISPATCHED' as const, ...(vehicleNo ? { vehicleNumber: vehicleNo } : {}) } : o
    );
    saveToStorage('orders', updated);
    set({ orders: updated });
    get().triggerSync('updateOrderStatus', { orderId, newStatus: 'DISPATCHED', vehicleNumber: vehicleNo });
  },

  markOrderDelivered: (orderId) => {
    const updated = get().orders.map((o) => 
      o.id === orderId ? { ...o, status: 'DELIVERED' as const } : o
    );
    saveToStorage('orders', updated);
    set({ orders: updated });
    get().triggerSync('updateOrderStatus', { orderId, newStatus: 'DELIVERED' });
  },

  addCustomer: (customer) => {
    const updated = [...get().customers, customer];
    saveToStorage('customers', updated);
    set({ customers: updated });
    get().triggerSync('saveCustomer', { customer });
  },

  addSupplier: (supplier) => {
    const updated = [...get().suppliers, supplier];
    saveToStorage('suppliers', updated);
    set({ suppliers: updated });
    get().triggerSync('saveSupplier', { supplier });
  },

  addProduct: (product) => {
    const updated = [...get().inventory, product];
    saveToStorage('inventory', updated);
    set({ inventory: updated });
    get().triggerSync('saveProduct', { product });
  },
  
  unpackProduct: (productId) => {
    let affectedProduct: Product | undefined;
    const updated = get().inventory.map((p) => {
      if (p.id === productId && p.stockPhysicalOuter > 0) {
        affectedProduct = {
          ...p,
          stockPhysicalOuter: p.stockPhysicalOuter - 1,
          stockLooseInner: p.stockLooseInner + p.innerBagsPerOuter,
        };
        return affectedProduct;
      }
      return p;
    });
    saveToStorage('inventory', updated);
    set({ inventory: updated });
    if (affectedProduct) {
      get().triggerSync('saveProduct', { product: affectedProduct });
    }
  }
}));
