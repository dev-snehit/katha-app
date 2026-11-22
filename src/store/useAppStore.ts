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

export interface AppState {
  // Current user & authentication
  currentUser: User;
  users: User[];
  
  // Active Language
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  
  // Domain entities (CLEAN SLATE: Zero dummy data)
  orders: Order[];
  inventory: Product[];
  customers: Customer[];
  suppliers: Supplier[];

  // Backend Webhook Connection URL
  backendUrl: string;
  setBackendUrl: (url: string) => void;

  // Actions & Mutators
  setCurrentUser: (user: User) => void;
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

export const useAppStore = create<AppState>((set) => ({
  currentUser: INITIAL_ADMIN_USER,
  users: loadFromStorage<User[]>('users', [INITIAL_ADMIN_USER]),
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

  backendUrl: loadFromStorage<string>('backendUrl', ''),
  setBackendUrl: (url) => {
    saveToStorage('backendUrl', url);
    set({ backendUrl: url });
  },

  setCurrentUser: (user) => set({ currentUser: user }),
  
  registerUser: (user) => set((state) => {
    const updated = [...state.users, user];
    saveToStorage('users', updated);
    return { users: updated };
  }),
  
  approveUser: (userId, role) => set((state) => {
    const updated = state.users.map((u) => 
      u.id === userId ? { ...u, status: 'APPROVED' as const, ...(role ? { role } : {}) } : u
    );
    saveToStorage('users', updated);
    return { users: updated };
  }),

  denyUser: (userId) => set((state) => {
    const updated = state.users.map((u) => 
      u.id === userId ? { ...u, status: 'DENIED' as const } : u
    );
    saveToStorage('users', updated);
    return { users: updated };
  }),

  addOrder: (order) => set((state) => {
    // Reserve stock for items in the order
    const updatedInventory = state.inventory.map((prod) => {
      const orderItem = order.items.find((item) => item.productId === prod.id && item.unitType === 'OUTER_BAG');
      if (orderItem) {
        return {
          ...prod,
          stockReservedOuter: prod.stockReservedOuter + orderItem.quantity,
        };
      }
      return prod;
    });

    const updatedOrders = [order, ...state.orders];
    saveToStorage('orders', updatedOrders);
    saveToStorage('inventory', updatedInventory);

    return {
      orders: updatedOrders,
      inventory: updatedInventory,
    };
  }),

  approveOrder: (orderId, approvedByRole) => set((state) => {
    const targetOrder = state.orders.find((o) => o.id === orderId);
    if (!targetOrder) return state;

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

    return {
      orders: updatedOrders,
      inventory: updatedInventory,
      customers: updatedCustomers,
    };
  }),

  markOrderDispatched: (orderId, vehicleNo) => set((state) => {
    const updated = state.orders.map((o) => 
      o.id === orderId ? { ...o, status: 'DISPATCHED' as const, ...(vehicleNo ? { vehicleNumber: vehicleNo } : {}) } : o
    );
    saveToStorage('orders', updated);
    return { orders: updated };
  }),

  markOrderDelivered: (orderId) => set((state) => {
    const updated = state.orders.map((o) => 
      o.id === orderId ? { ...o, status: 'DELIVERED' as const } : o
    );
    saveToStorage('orders', updated);
    return { orders: updated };
  }),

  addCustomer: (customer) => set((state) => {
    const updated = [...state.customers, customer];
    saveToStorage('customers', updated);
    return { customers: updated };
  }),

  addSupplier: (supplier) => set((state) => {
    const updated = [...state.suppliers, supplier];
    saveToStorage('suppliers', updated);
    return { suppliers: updated };
  }),

  addProduct: (product) => set((state) => {
    const updated = [...state.inventory, product];
    saveToStorage('inventory', updated);
    return { inventory: updated };
  }),
  
  unpackProduct: (productId) => set((state) => {
    const updated = state.inventory.map((p) => {
      if (p.id === productId && p.stockPhysicalOuter > 0) {
        return {
          ...p,
          stockPhysicalOuter: p.stockPhysicalOuter - 1,
          stockLooseInner: p.stockLooseInner + p.innerBagsPerOuter,
        };
      }
      return p;
    });
    saveToStorage('inventory', updated);
    return { inventory: updated };
  })
}));
