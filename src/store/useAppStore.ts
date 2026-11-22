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
  
  // Domain entities
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

// Initial Sample Data for Rice & Groceries
const initialProducts: Product[] = [
  {
    id: 'prod-rice-1',
    name: 'Sona Masoori Rice (Raw Old)',
    nameTe: 'సోనా మసూరి పాత బియ్యం',
    category: 'RICE',
    brandOrMill: 'Sri Lalitha',
    brandOrMillTe: 'శ్రీ లలిత',
    innerBagWeightKg: 26.0,
    innerBagsPerOuter: 1,
    outerBagTotalKg: 26.0,
    stockPhysicalOuter: 120,
    stockReservedOuter: 0,
    stockLooseInner: 0,
    stockLooseKg: 0,
    costPricePerBag: 1380,
    wholesalePriceBag: 1480,
    pricePerInnerBag: 1480,
  },
  {
    id: 'prod-rice-2',
    name: 'Broken Rice / Tukda (Coarse)',
    nameTe: 'నూకలు (దొడ్డు)',
    category: 'BROKEN_RICE',
    brandOrMill: 'Local Mill',
    brandOrMillTe: 'లోకల్ మిల్లు',
    innerBagWeightKg: 50.0,
    innerBagsPerOuter: 1,
    outerBagTotalKg: 50.0,
    stockPhysicalOuter: 80,
    stockReservedOuter: 0,
    stockLooseInner: 0,
    stockLooseKg: 0,
    costPricePerBag: 1100,
    wholesalePriceBag: 1250,
    pricePerInnerBag: 1250,
  },
  {
    id: 'prod-ravva-1',
    name: 'Suji Ravva (Bombay Ravva)',
    nameTe: 'సూజీ రవ్వ (బొంబాయి రవ్వ)',
    category: 'SUJI_RAVVA',
    brandOrMill: 'Naga Brand',
    brandOrMillTe: 'నాగా బ్రాండ్',
    innerBagWeightKg: 1.0,
    innerBagsPerOuter: 25,
    outerBagTotalKg: 25.0,
    stockPhysicalOuter: 60,
    stockReservedOuter: 0,
    stockLooseInner: 12,
    stockLooseKg: 0,
    costPricePerBag: 920,
    wholesalePriceBag: 1040,
    pricePerInnerBag: 45,
  },
  {
    id: 'prod-maida-1',
    name: 'Maida (Bakery Special)',
    nameTe: 'మైదా (బేకరీ స్పెషల్)',
    category: 'MAIDA',
    brandOrMill: 'Silver Coin',
    brandOrMillTe: 'సిల్వర్ కాయిన్',
    innerBagWeightKg: 50.0,
    innerBagsPerOuter: 1,
    outerBagTotalKg: 50.0,
    stockPhysicalOuter: 45,
    stockReservedOuter: 0,
    stockLooseInner: 0,
    stockLooseKg: 0,
    costPricePerBag: 1600,
    wholesalePriceBag: 1750,
    pricePerInnerBag: 1750,
  }
];

const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Sri Balaji Kirana & General Stores',
    nameTe: 'శ్రీ బాలాజీ కిరాణా స్టోర్స్',
    phone: '9848022338',
    businessName: 'Balaji Traders',
    businessNameTe: 'బాలాజీ ట్రేడర్స్',
    address: 'Shop #4, Market Road, Secunderabad',
    addressTe: 'షాప్ #4, మార్కెట్ రోడ్, సికింద్రాబాద్',
    currentDue: 24500,
    createdAt: '2026-01-10T10:00:00.000Z'
  },
  {
    id: 'cust-2',
    name: 'Lakshmi Prasanna Supermarket',
    nameTe: 'లక్ష్మీ ప్రసన్న సూపర్ మార్కెట్',
    phone: '9849112233',
    businessName: 'Prasanna Retail',
    businessNameTe: 'ప్రసన్న రిటైల్',
    address: 'Near Clock Tower, Warangal',
    addressTe: 'క్లాక్ టవర్ దగ్గర, వరంగల్',
    currentDue: 58000,
    createdAt: '2026-01-12T11:00:00.000Z'
  }
];

const initialSuppliers: Supplier[] = [
  {
    id: 'supp-1',
    businessName: 'Sri Lalitha Rice Industries Pvt Ltd',
    businessNameTe: 'శ్రీ లలిత రైస్ ఇండస్ట్రీస్',
    ownerName: 'M. Venkateswara Rao',
    ownerNameTe: 'ఎం. వెంకటేశ్వరరావు',
    bankName: 'State Bank of India',
    accountNumber: '30291823901',
    ifscCode: 'SBIN0001234',
    nickname: 'Lalitha Mill SBI',
    nicknameTe: 'లలిత మిల్లు ఎస్బీఐ',
    createdAt: '2026-01-05T09:00:00.000Z'
  }
];

const initialOrders: Order[] = [
  {
    id: 'ord-101',
    orderNumber: 'ORD-2026-0001',
    customerId: 'cust-1',
    customerName: 'Sri Balaji Kirana & General Stores',
    customerNameTe: 'శ్రీ బాలాజీ కిరాణా స్టోర్స్',
    customerPhone: '9848022338',
    orderDate: '2026-11-22T08:30:00.000Z',
    status: 'PENDING_REVIEW',
    totalOuterBags: 15,
    totalInnerBags: 0,
    totalWeightKg: 390,
    items: [
      {
        productId: 'prod-rice-1',
        productName: 'Sona Masoori Rice (Raw Old)',
        productNameTe: 'సోనా మసూరి పాత బియ్యం',
        unitType: 'OUTER_BAG',
        quantity: 15,
        unitPrice: 1480,
        lineTotal: 22200
      }
    ],
    subtotal: 22200,
    hamaliCharges: 120,
    transportCharges: 200,
    grandTotal: 22520,
    paymentMode: 'CREDIT',
    vehicleNumber: 'TS 09 UA 4567',
    driverPhone: '9988776655',
    submittedByRole: 'STAFF',
    createdAt: '2026-11-22T08:30:00.000Z'
  }
];

export const useAppStore = create<AppState>((set) => ({
  currentUser: INITIAL_ADMIN_USER,
  users: [INITIAL_ADMIN_USER],
  language: 'EN',
  setLanguage: (lang) => set({ language: lang }),
  
  orders: initialOrders,
  inventory: initialProducts,
  customers: initialCustomers,
  suppliers: initialSuppliers,

  backendUrl: '',
  setBackendUrl: (url) => set({ backendUrl: url }),

  setCurrentUser: (user) => set({ currentUser: user }),
  
  registerUser: (user) => set((state) => ({ users: [...state.users, user] })),
  
  approveUser: (userId, role) => set((state) => ({
    users: state.users.map((u) => (u.id === userId ? { ...u, status: 'APPROVED', ...(role ? { role } : {}) } : u))
  })),

  denyUser: (userId) => set((state) => ({
    users: state.users.map((u) => (u.id === userId ? { ...u, status: 'DENIED' } : u))
  })),

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

    return {
      orders: [order, ...state.orders],
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

    return {
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, status: 'APPROVED', approvedByRole } : o)),
      inventory: updatedInventory,
      customers: updatedCustomers,
    };
  }),

  markOrderDispatched: (orderId, vehicleNo) => set((state) => ({
    orders: state.orders.map((o) => (o.id === orderId ? { ...o, status: 'DISPATCHED', ...(vehicleNo ? { vehicleNumber: vehicleNo } : {}) } : o))
  })),

  markOrderDelivered: (orderId) => set((state) => ({
    orders: state.orders.map((o) => (o.id === orderId ? { ...o, status: 'DELIVERED' } : o))
  })),

  addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),
  addSupplier: (supplier) => set((state) => ({ suppliers: [...state.suppliers, supplier] })),
  addProduct: (product) => set((state) => ({ inventory: [...state.inventory, product] })),
  
  unpackProduct: (productId) => set((state) => ({
    inventory: state.inventory.map((p) => {
      if (p.id === productId && p.stockPhysicalOuter > 0) {
        return {
          ...p,
          stockPhysicalOuter: p.stockPhysicalOuter - 1,
          stockLooseInner: p.stockLooseInner + p.innerBagsPerOuter,
        };
      }
      return p;
    })
  }))
}));
