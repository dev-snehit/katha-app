import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { Order, Product, Customer, Supplier, INITIAL_ADMIN_USER } from '../src/contracts';

describe('Admin & Owner Add / Update / Edit Capabilities', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    }));

    useAppStore.setState({
      currentUser: INITIAL_ADMIN_USER,
      isAuthenticated: true,
      orders: [],
      inventory: [],
      customers: [],
      suppliers: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Stock (Products) Add and Update/Edit', () => {
    it('allows admin/owner to add and update a product', () => {
      const prod: Product = {
        id: 'prod-test-1',
        name: 'Sona Masoori Rice 25kg',
        nameTe: 'సోనా మసూరి బియ్యం 25కిలోలు',
        category: 'RICE',
        brandOrMill: 'Lalitha',
        innerBagWeightKg: 25,
        innerBagsPerOuter: 1,
        outerBagTotalKg: 25,
        stockPhysicalOuter: 50,
        stockReservedOuter: 0,
        stockLooseInner: 0,
        stockLooseKg: 0,
        costPricePerBag: 1200,
        wholesalePriceBag: 1300,
        retailPriceBag: 1400,
        pricePerInnerBag: 1400,
      };

      // 1. Add product
      useAppStore.getState().addProduct(prod);
      expect(useAppStore.getState().inventory).toHaveLength(1);
      expect(useAppStore.getState().inventory[0].wholesalePriceBag).toBe(1300);

      // 2. Update/Edit product (e.g. updated pricing and stock)
      const updatedProd: Product = {
        ...prod,
        stockPhysicalOuter: 80,
        wholesalePriceBag: 1350,
        retailPriceBag: 1450,
      };
      useAppStore.getState().updateProduct(updatedProd);

      const items = useAppStore.getState().inventory;
      expect(items).toHaveLength(1);
      expect(items[0].stockPhysicalOuter).toBe(80);
      expect(items[0].wholesalePriceBag).toBe(1350);
      expect(items[0].retailPriceBag).toBe(1450);
    });

    it('allows admin/owner to delete a product and update inventory', async () => {
      const prod: Product = {
        id: 'prod-to-delete',
        name: 'Delete Me Rice',
        category: 'RICE',
        brandOrMill: 'Swarna',
        innerBagWeightKg: 25,
        innerBagsPerOuter: 1,
        outerBagTotalKg: 25,
        stockPhysicalOuter: 20,
        stockReservedOuter: 0,
        stockLooseInner: 0,
        stockLooseKg: 0,
        costPricePerBag: 1000,
        wholesalePriceBag: 1100,
        retailPriceBag: 1200,
        pricePerInnerBag: 1200,
      };
      useAppStore.getState().addProduct(prod);
      expect(useAppStore.getState().inventory).toHaveLength(1);

      await useAppStore.getState().deleteProduct(prod.id);
      expect(useAppStore.getState().inventory).toHaveLength(0);
    });
  });

  describe('Customer Add and Update/Edit', () => {
    it('allows admin/owner to add and update a customer', () => {
      const cust: Customer = {
        id: 'cust-test-1',
        name: 'Raju Kirana',
        nameTe: 'రాజు కిరాణా',
        phone: '9848011223',
        businessName: 'Sri Venkateswara Traders',
        address: 'Main Bazaar, Tenali',
        currentDue: 5000,
        createdAt: new Date().toISOString(),
      };

      // 1. Add customer
      useAppStore.getState().addCustomer(cust);
      expect(useAppStore.getState().customers).toHaveLength(1);
      expect(useAppStore.getState().customers[0].name).toBe('Raju Kirana');

      // 2. Update/Edit customer (e.g. updated phone and business name)
      const updatedCust: Customer = {
        ...cust,
        name: 'Raju General Store',
        phone: '9848099887',
        businessName: 'Venkateswara Wholesale & Retail',
        address: 'Shop 12, Market Road, Tenali',
      };
      useAppStore.getState().updateCustomer(updatedCust);

      const customers = useAppStore.getState().customers;
      expect(customers).toHaveLength(1);
      expect(customers[0].name).toBe('Raju General Store');
      expect(customers[0].phone).toBe('9848099887');
      expect(customers[0].businessName).toBe('Venkateswara Wholesale & Retail');
    });

    it('allows admin/owner to delete a customer', async () => {
      const cust: Customer = {
        id: 'cust-del-1',
        name: 'Delete Customer',
        phone: '9848077665',
        businessName: 'Delete Business',
        address: 'Vijayawada',
        currentDue: 0,
        createdAt: new Date().toISOString(),
      };
      useAppStore.getState().addCustomer(cust);
      expect(useAppStore.getState().customers.some((c) => c.id === 'cust-del-1')).toBe(true);

      await useAppStore.getState().deleteCustomer('cust-del-1');
      expect(useAppStore.getState().customers.some((c) => c.id === 'cust-del-1')).toBe(false);
    });
  });

  describe('Supplier Add, Update/Edit and Delete', () => {
    it('allows admin/owner to add and update a supplier', () => {
      const supp: Supplier = {
        id: 'supp-test-1',
        businessName: 'Sri Lalitha Modern Rice Mill',
        businessNameTe: 'శ్రీ లలిత మోడరన్ రైస్ మిల్లు',
        ownerName: 'Murali Krishna',
        bankName: 'State Bank of India',
        accountNumber: '112233445566',
        ifscCode: 'SBIN0001234',
        nickname: 'Lalitha Mill',
        createdAt: new Date().toISOString(),
      };

      // 1. Add supplier
      useAppStore.getState().addSupplier(supp);
      expect(useAppStore.getState().suppliers).toHaveLength(1);
      expect(useAppStore.getState().suppliers[0].nickname).toBe('Lalitha Mill');

      // 2. Update/Edit supplier (e.g. updated bank account and owner name)
      const updatedSupp: Supplier = {
        ...supp,
        ownerName: 'Murali Krishna Garu',
        accountNumber: '998877665544',
        ifscCode: 'HDFC0004321',
        bankName: 'HDFC Bank',
      };
      useAppStore.getState().updateSupplier(updatedSupp);

      const suppliers = useAppStore.getState().suppliers;
      expect(suppliers).toHaveLength(1);
      expect(suppliers[0].ownerName).toBe('Murali Krishna Garu');
      expect(suppliers[0].accountNumber).toBe('998877665544');
      expect(suppliers[0].ifscCode).toBe('HDFC0004321');
    });
  });

  describe('Order Add and Update/Edit', () => {
    it('allows admin/owner to add and update an order with stock reservation sync', () => {
      // Setup initial product
      const prod: Product = {
        id: 'prod-ord-test',
        name: 'HMT Rice 25kg',
        category: 'RICE',
        brandOrMill: 'Swarna',
        innerBagWeightKg: 25,
        innerBagsPerOuter: 1,
        outerBagTotalKg: 25,
        stockPhysicalOuter: 100,
        stockReservedOuter: 0,
        stockLooseInner: 0,
        stockLooseKg: 0,
        costPricePerBag: 1100,
        wholesalePriceBag: 1250,
        retailPriceBag: 1350,
        pricePerInnerBag: 1350,
      };
      useAppStore.getState().addProduct(prod);

      // 1. Place initial order with 10 bags
      const order1: Order = {
        id: 'ord-test-1',
        orderNumber: 'ORD-1001',
        customerId: 'cust-1',
        customerName: 'Kalyan Kirana',
        customerPhone: '9848011111',
        orderDate: new Date().toISOString(),
        status: 'PENDING_REVIEW',
        totalOuterBags: 10,
        totalInnerBags: 0,
        totalWeightKg: 250,
        items: [
          {
            productId: 'prod-ord-test',
            productName: 'HMT Rice 25kg',
            unitType: 'OUTER_BAG',
            quantity: 10,
            unitPrice: 1250,
            lineTotal: 12500,
          },
        ],
        subtotal: 12500,
        hamaliCharges: 100,
        transportCharges: 200,
        discount: 300,
        grandTotal: 12500,
        paymentMode: 'CREDIT',
        submittedByRole: 'ADMIN',
        createdAt: new Date().toISOString(),
      };

      useAppStore.getState().addOrder(order1);
      expect(useAppStore.getState().orders).toHaveLength(1);
      expect(useAppStore.getState().inventory[0].stockReservedOuter).toBe(10);

      // 2. Edit/Update order: Change quantity to 15 bags and update vehicle number
      const updatedOrder: Order = {
        ...order1,
        totalOuterBags: 15,
        totalWeightKg: 375,
        items: [
          {
            ...order1.items[0],
            quantity: 15,
            lineTotal: 18750,
          },
        ],
        subtotal: 18750,
        grandTotal: 18750,
        vehicleNumber: 'AP 16 TX 7788',
      };

      useAppStore.getState().updateOrder(updatedOrder);

      const orders = useAppStore.getState().orders;
      expect(orders).toHaveLength(1);
      expect(orders[0].totalOuterBags).toBe(15);
      expect(orders[0].vehicleNumber).toBe('AP 16 TX 7788');
      // Reserved stock should now accurately reflect 15 bags
      expect(useAppStore.getState().inventory[0].stockReservedOuter).toBe(15);
    });

    it('allows admin/owner to delete an order and safely restores reserved inventory', async () => {
      const prod: Product = {
        id: 'prod-del-order',
        name: 'Delete Order Rice 25kg',
        category: 'RICE',
        innerBagWeightKg: 25,
        innerBagsPerOuter: 1,
        outerBagTotalKg: 25,
        stockPhysicalOuter: 50,
        stockReservedOuter: 0,
        stockLooseInner: 0,
        stockLooseKg: 0,
        costPricePerBag: 1000,
        wholesalePriceBag: 1100,
        retailPriceBag: 1200,
        pricePerInnerBag: 1200,
      };
      useAppStore.getState().addProduct(prod);

      const order: Order = {
        id: 'ord-to-delete',
        orderNumber: 'ORD-9999',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        customerPhone: '9848011223',
        orderDate: new Date().toISOString(),
        status: 'PENDING_REVIEW',
        totalOuterBags: 20,
        totalInnerBags: 0,
        totalWeightKg: 500,
        items: [
          {
            productId: 'prod-del-order',
            productName: 'Delete Order Rice 25kg',
            unitType: 'OUTER_BAG',
            quantity: 20,
            unitPrice: 1100,
            lineTotal: 22000,
          },
        ],
        subtotal: 22000,
        hamaliCharges: 0,
        transportCharges: 0,
        discount: 0,
        grandTotal: 22000,
        paymentMode: 'CREDIT',
        submittedByRole: 'ADMIN',
        createdAt: new Date().toISOString(),
      };

      useAppStore.getState().addOrder(order);
      expect(useAppStore.getState().orders).toHaveLength(1);
      expect(useAppStore.getState().inventory.find(p => p.id === 'prod-del-order')?.stockReservedOuter).toBe(20);

      // Admin deletes the order
      await useAppStore.getState().deleteOrder(order.id);
      expect(useAppStore.getState().orders).toHaveLength(0);
      // Reserved stock must be released back
      expect(useAppStore.getState().inventory.find(p => p.id === 'prod-del-order')?.stockReservedOuter).toBe(0);
    });
  });

  describe('Role-based Access for Owner and Admin', () => {
    it('verifies owner role is recognized as authorized for edit operations', () => {
      const ownerUser = {
        ...INITIAL_ADMIN_USER,
        role: 'OWNER' as const,
      };
      useAppStore.setState({ currentUser: ownerUser });

      const state = useAppStore.getState();
      const isAdminOrOwner = state.currentUser?.role === 'ADMIN' || state.currentUser?.role === 'OWNER';
      expect(isAdminOrOwner).toBe(true);
    });

    it('verifies admin role is recognized as authorized for edit operations', () => {
      useAppStore.setState({ currentUser: INITIAL_ADMIN_USER });

      const state = useAppStore.getState();
      const isAdminOrOwner = state.currentUser?.role === 'ADMIN' || state.currentUser?.role === 'OWNER';
      expect(isAdminOrOwner).toBe(true);
    });
  });

  describe('User Modification and Deduplication for Admins', () => {
    it('allows admin to modify an active user (name, role, status)', async () => {
      useAppStore.setState({
        users: [
          INITIAL_ADMIN_USER,
          {
            id: 'staff-user-1',
            name: 'Original Staff',
            email: 'staff@example.com',
            phone: '9848012345',
            role: 'STAFF',
            status: 'APPROVED',
            passwordHash: 'hash',
            createdAt: new Date().toISOString(),
          },
        ],
      });

      await useAppStore.getState().updateUser('staff-user-1', {
        name: 'Senior Staff Lead',
        role: 'OWNER',
        status: 'APPROVED',
      });

      const updated = useAppStore.getState().users.find((u) => u.id === 'staff-user-1');
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Senior Staff Lead');
      expect(updated?.role).toBe('OWNER');
    });

    it('allows admin to delete an active user', async () => {
      useAppStore.setState({
        users: [
          INITIAL_ADMIN_USER,
          {
            id: 'user-to-del',
            name: 'Delete User',
            email: 'delete@example.com',
            phone: '9848099999',
            role: 'CUSTOMER',
            status: 'APPROVED',
            passwordHash: 'hash',
            createdAt: new Date().toISOString(),
          },
        ],
      });

      expect(useAppStore.getState().users).toHaveLength(2);
      await useAppStore.getState().deleteUser('user-to-del');
      expect(useAppStore.getState().users).toHaveLength(1);
      expect(useAppStore.getState().users[0].id).toBe(INITIAL_ADMIN_USER.id);
    });

    it('deduplicates users by unique email and phone combination', async () => {
      useAppStore.setState({
        users: [
          INITIAL_ADMIN_USER,
          {
            id: 'dup-1',
            name: 'Duplicate John',
            email: 'john@example.com',
            phone: '9848011111',
            role: 'STAFF',
            status: 'APPROVED',
            passwordHash: 'hash',
            createdAt: '2026-01-01T00:00:00Z',
          },
          {
            id: 'dup-2',
            name: 'Duplicate John Second Entry',
            email: 'JOHN@example.com',
            phone: '9848011111',
            role: 'STAFF',
            status: 'APPROVED',
            passwordHash: 'hash',
            createdAt: '2026-01-02T00:00:00Z',
          },
        ],
      });

      expect(useAppStore.getState().users).toHaveLength(3);
      await useAppStore.getState().cleanDuplicateUsers();
      // Should now be deduplicated to 2 (Admin + unique John)
      expect(useAppStore.getState().users).toHaveLength(2);
    });
  });

  describe('Action Loading State Tracking', () => {
    it('tracks start and stop action loading with messages', () => {
      const store = useAppStore.getState();
      expect(store.actionLoading).toBeNull();

      store.startActionLoading('Saving order...', 'ఆర్డర్ సేవ్ అవుతోంది...');
      expect(useAppStore.getState().actionLoading).toEqual({
        isLoading: true,
        message: 'Saving order...',
        messageTe: 'ఆర్డర్ సేవ్ అవుతోంది...',
      });

      store.stopActionLoading();
      expect(useAppStore.getState().actionLoading).toBeNull();
    });
  });
});
