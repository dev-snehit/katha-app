import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAppStore } from '../../src/store/useAppStore';
import { INITIAL_ADMIN_USER } from '../../src/contracts';
import { generateNumberTallyPDF, generateStockPositionPDF } from '../../src/lib/pdfGenerator';
import { validatePurchaseRecord } from '../../src/lib/purchaseValidation';
import { validateCustomer } from '../../src/lib/customerValidation';
import { isPageEnabled, isFunctionalityEnabled, mergeWithDefaultPermissions } from '../../src/lib/permissions';
import { parseRoute, goBack } from '../../src/lib/router';

vi.mock('jspdf', () => ({
  default: class MockJsPDF {
    setFontSize = vi.fn();
    setTextColor = vi.fn();
    text = vi.fn();
    save = vi.fn();
    lastAutoTable = { finalY: 120 };
  },
}));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

describe('Deep Unit Coverage: Store Hydration, CRUD, PDF, Validation & Permissions', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    useAppStore.setState({
      currentUser: { ...INITIAL_ADMIN_USER, role: 'OWNER' },
      authToken: 'mock.jwt.tok',
      isAuthenticated: true,
      backendUrl: 'https://script.google.com/macros/s/mock/exec',
      users: [INITIAL_ADMIN_USER],
      inventory: [],
      customers: [],
      suppliers: [],
      orders: [],
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('hydrates all sheets in connectAndHydrateServer and logs out DENIED active users', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: {
          Master_Products: [{
            id: 'p1', name_en: 'Sona', name_te: 'సోనా', category: 'Rice',
            brand_en: 'Sri', brand_te: 'శ్రీ', inner_wt_kg: 26, inner_count: 1,
            outer_wt_kg: 26, stock_physical: 50, stock_reserved: 5,
            price_bag: 1200, cost_bag: 1000, retail_price_bag: 1350,
          }],
          Master_Customers: [{
            id: 'c1', name_en: 'Ravi', name_te: 'రవి', phone: '9876543210',
            business_en: 'Ravi Kirana', address_en: 'Guntur', current_due: 2500,
          }],
          Master_Suppliers: [{
            id: 's1', business_en: 'Sai Mill', owner_en: 'Venkat',
            bank_name: 'SBI', account_no: '1234', ifsc_code: 'SBIN0001', nickname_en: 'Sai',
          }],
          Master_Orders_Sales: [{
            id: 'o1', order_no: 'ORD-1', customer_id: 'c1', customer_name: 'Ravi',
            customer_phone: '9876543210', date: '2026-11-28', total_bags: 5,
            total_weight_kg: 130, subtotal: 6000, discount: 0, grand_total: 6000,
            payment_mode: 'CASH', status: 'DELIVERED',
          }],
          Pending_Orders: [{
            id: 'o2', order_no: 'ORD-2', customer_id: 'c1', customer_name: 'Ravi',
            customer_phone: '9876543210', date: '2026-11-28', total_bags: 2,
            discount: 0, grand_total: 2400, status: 'PENDING_REVIEW',
          }],
          Users: [{
            id: INITIAL_ADMIN_USER.id,
            name: 'Snehit Tadepalli',
            email: 'dev.snehit@gmail.com',
            phone: '9999999999',
            role: 'OWNER',
            status: 'DENIED',
          }],
          rolePermissions: { STAFF: { orders_page: { enabled: true, functionalities: { view_orders: true } } } },
        },
      }),
    });

    const ok = await useAppStore.getState().connectAndHydrateServer();
    expect(ok).toBe(true);
    expect(useAppStore.getState().inventory.length).toBe(1);
    expect(useAppStore.getState().customers.length).toBe(1);
    expect(useAppStore.getState().suppliers.length).toBe(1);
    expect(useAppStore.getState().orders.length).toBe(2);
    // Active user was DENIED on server -> forced logout
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });

  it('covers store syncAll, lockManagedSheets, cleanDuplicateUsers, order dispatch/delivery/delete, and entity deletes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', message: 'ok' }),
    });

    const store = useAppStore.getState();
    store.addProduct({
      id: 'p1', name: 'Sona', category: 'Rice', innerBagWeightKg: 26, innerBagsPerOuter: 1,
      outerBagTotalKg: 26, stockPhysicalOuter: 20, stockReservedOuter: 0, stockLooseInner: 0, stockLooseKg: 0,
      costPricePerBag: 1000, wholesalePriceBag: 1200, pricePerInnerBag: 1200, retailPriceBag: 1300,
    });
    store.addCustomer({ id: 'c1', name: 'Ravi', phone: '9876543210', currentDue: 0, createdAt: '2026-11-28T00:00:00.000Z' });
    store.addSupplier({ id: 's1', businessName: 'Mill', bankName: 'SBI', accountNumber: '11', ifscCode: 'SBIN0001', nickname: 'M', createdAt: '2026-11-28T00:00:00.000Z' });

    store.addOrder({
      id: 'o1', orderNumber: 'ORD-10', customerId: 'c1', customerName: 'Ravi', customerPhone: '9876543210',
      orderDate: '2026-11-28', createdAt: '2026-11-28T00:00:00.000Z',
      items: [{ productId: 'p1', productName: 'Sona', unitType: 'OUTER_BAG', quantity: 3, unitPrice: 1200, lineTotal: 3600 }],
      totalOuterBags: 3, totalInnerBags: 0, totalWeightKg: 78, subtotal: 3600, hamaliCharges: 0, transportCharges: 0, discount: 0, grandTotal: 3600,
      paymentMode: 'CASH', status: 'PENDING_REVIEW', submittedByRole: 'OWNER',
    });

    store.approveOrder('o1', 'OWNER');
    store.markOrderDispatched('o1', 'AP07AB1234');
    store.markOrderDelivered('o1');
    expect(useAppStore.getState().orders[0].status).toBe('DELIVERED');

    await useAppStore.getState().deleteOrder('o1');
    await useAppStore.getState().deleteCustomer('c1');
    await useAppStore.getState().deleteSupplier('s1');
    await useAppStore.getState().deleteProduct('p1');
    expect(useAppStore.getState().orders.length).toBe(0);

    await useAppStore.getState().syncAllToGoogleSheets();
    await useAppStore.getState().lockManagedSheets();
    const dedup = await useAppStore.getState().cleanDuplicateUsers();
    expect(dedup.total).toBeGreaterThanOrEqual(1);

    // Sync TOKEN_EXPIRED on syncAllToGoogleSheets
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'error', code: 'TOKEN_EXPIRED', message: 'Expired' }),
    });
    const syncRes = await useAppStore.getState().syncAllToGoogleSheets();
    expect(syncRes).toBe(false);
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });

  it('covers permissions edge cases, purchase/customer validations in TE, router goBack, and PDF edge cases', () => {
    expect(isPageEnabled(null, null, 'orders_page')).toBe(false);
    expect(isPageEnabled(null, 'OWNER', 'orders_page')).toBe(true);
    expect(isFunctionalityEnabled(null, null, 'orders_page', 'view_orders')).toBe(false);
    expect(isFunctionalityEnabled(null, 'OWNER', 'orders_page', 'view_orders')).toBe(true);
    expect(mergeWithDefaultPermissions(null).ADMIN).toBeDefined();

    const pInvalid = validatePurchaseRecord({
      name: 'A', category: '', brandOrMill: '123', innerBagWeightKg: -1, innerBagsPerOuter: 0,
      stockPhysicalOuter: -5, costPricePerBag: 500, wholesalePriceBag: 400, retailPriceBag: 300,
    }, 'TE');
    expect(pInvalid.isValid).toBe(false);

    const pValid = validatePurchaseRecord({
      name: 'Sona Masoori', category: 'Rice', brandOrMill: 'Sri Sai', innerBagWeightKg: 26, innerBagsPerOuter: 1,
      stockPhysicalOuter: 10, costPricePerBag: 1000, wholesalePriceBag: 1200, retailPriceBag: 1300,
    }, 'EN');
    expect(pValid.isValid).toBe(true);

    expect(validateCustomer({ name: 'A', phone: '123' }, 'EN').isValid).toBe(false);
    expect(validateCustomer({ name: 'Ravi Kumar', phone: '9876543210' }, 'EN').isValid).toBe(true);

    // Date range tally PDF & empty stock PDF
    expect(() => generateNumberTallyPDF([], [], true, 'Period: 2026-11-01 to 2026-11-28')).not.toThrow();
    expect(() => generateStockPositionPDF([], 'Kaatha')).not.toThrow();

    expect(parseRoute('/orders/new').subView).toBe('new');
    goBack('/orders');
  });
});
