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
import { pushToGoogleSheet } from '../lib/syncService';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR' | 'UNLINKED';

export interface AppState {
  // Current user & authentication session
  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];
  login: (email: string, password: string) => { success: boolean; message: string; user?: User };
  logout: () => void;
  
  // Active Language
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  
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

  // Actions & Mutators
  setCurrentUser: (user: User | null) => void;
  registerUser: (user: User) => void;
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

// Initial pre-seeded users (ensures root admin is always present)
const storedUsers = loadFromStorage<User[]>('users', []);
const initialUsers = storedUsers.some(u => u.email === INITIAL_ADMIN_USER.email)
  ? storedUsers
  : [INITIAL_ADMIN_USER, ...storedUsers];

const initialBackendUrl = loadFromStorage<string>('backendUrl', '');

export const useAppStore = create<AppState>((set, get) => ({
  // Authentication: Session starts unauthenticated on app open
  currentUser: null,
  isAuthenticated: false,
  users: initialUsers,

  login: (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const user = get().users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'No registered account found with this email address.' };
    }

    if (user.status === 'PENDING_APPROVAL') {
      return { 
        success: false, 
        message: 'Your account is pending approval by Administrator Snehit Tadepalli. Please check back shortly.' 
      };
    }

    if (user.status === 'DENIED') {
      return { 
        success: false, 
        message: 'Access has been denied for this account. Contact your administrator.' 
      };
    }

    // Password check (fallback 'admin' for root admin if unset)
    const expectedPass = user.password || (user.email === INITIAL_ADMIN_USER.email ? 'admin' : '');
    if (expectedPass && cleanPass !== expectedPass) {
      return { success: false, message: 'Invalid password. Please verify and try again.' };
    }

    set({ currentUser: user, isAuthenticated: true });
    return { success: true, message: `Welcome back, ${user.name}!`, user };
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
  },

  language: loadFromStorage<SupportedLanguage>('lang', 'EN'),
  setLanguage: (lang) => {
    saveToStorage('lang', lang);
    set({ language: lang });
  },
  
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

    set({ syncStatus: 'SYNCING', syncError: null });
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
  },

  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  
  registerUser: (user) => {
    const updated = [...get().users, user];
    saveToStorage('users', updated);
    set({ users: updated });
    get().triggerSync('registerUser', { user });
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
