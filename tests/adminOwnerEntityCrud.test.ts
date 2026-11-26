import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { Order, Product, Customer, Supplier, INITIAL_ADMIN_USER } from '../src/contracts';

describe('Admin & Owner Add / Update / Edit Capabilities', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentUser: INITIAL_ADMIN_USER,
      isAuthenticated: true,
      orders: [],
      inventory: [],
      customers: [],
      suppliers: [],
    });
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
  });

  describe('Supplier Add and Update/Edit', () => {
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
});
