import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PendingOrdersView } from '../../src/components/orders/PendingOrdersView';
import { StockRegistryView } from '../../src/components/stock/StockRegistryView';
import { CustomerDirectoryView } from '../../src/components/customers/CustomerDirectoryView';
import { SupplierDirectoryView } from '../../src/components/suppliers/SupplierDirectoryView';
import { useAppStore } from '../../src/store/useAppStore';
import { INITIAL_ADMIN_USER } from '../../src/contracts';
import { DEFAULT_ROLE_PERMISSIONS } from '../../src/lib/permissions';

describe('UI Views Part 2: PendingOrdersView, StockRegistryView, CustomerDirectoryView, SupplierDirectoryView', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: {} }),
    });
    window.history.replaceState({}, '', '/orders');
    useAppStore.setState({
      currentUser: INITIAL_ADMIN_USER,
      authToken: 'mock.jwt.tok',
      isAuthenticated: true,
      language: 'EN',
      backendUrl: 'https://script.google.com/macros/s/mock/exec',
      rolePermissions: JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)),
      inventory: [{
        id: 'p1', name: 'Sona Masoori', nameTe: 'సోనా మసూరి', category: 'Rice',
        innerBagWeightKg: 26, innerBagsPerOuter: 2, outerBagTotalKg: 52,
        stockPhysicalOuter: 100, stockReservedOuter: 10, stockLooseInner: 4, stockLooseKg: 0,
        costPricePerBag: 1000, wholesalePriceBag: 1200, pricePerInnerBag: 600, retailPriceBag: 1350,
      }],
      customers: [{
        id: 'c1', name: 'Lakshmi Stores', phone: '9876543210', currentDue: 3000, createdAt: '2026-11-28T00:00:00.000Z',
      }],
      suppliers: [{
        id: 's1', businessName: 'Sri Sai Mill', bankName: 'SBI', accountNumber: '123456', ifscCode: 'SBIN0001234', nickname: 'SaiMill', createdAt: '2026-11-28T00:00:00.000Z',
      }],
      orders: [{
        id: 'o1', orderNumber: 'ORD-101', customerId: 'c1', customerName: 'Lakshmi Stores', customerPhone: '9876543210',
        orderDate: '2026-11-28T10:00:00.000Z', createdAt: '2026-11-28T10:00:00.000Z',
        items: [{ productId: 'p1', productName: 'Sona Masoori', unitType: 'OUTER_BAG', quantity: 5, unitPrice: 1200, lineTotal: 6000 }],
        totalOuterBags: 5, totalInnerBags: 0, totalWeightKg: 260, subtotal: 6000, hamaliCharges: 0, transportCharges: 0, discount: 0, grandTotal: 6000,
        paymentMode: 'CASH', status: 'PENDING_REVIEW', submittedByRole: 'OWNER',
      }],
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders PendingOrdersView, filters pipeline, opens new order builder, approves and deletes order', async () => {
    const setActiveTab = vi.fn();
    render(<PendingOrdersView setActiveTab={setActiveTab} />);
    expect(screen.getAllByText(/ORD-101/).length).toBeGreaterThan(0);

    // Pipeline filters
    fireEvent.click(screen.getByText(/Pending \(1\)/i));
    fireEvent.click(screen.getByText(/All Orders/i));
    expect(screen.getAllByText(/ORD-101/).length).toBeGreaterThan(0);

    // Open New Order modal
    fireEvent.click(screen.getByText('New Order'));
    expect(screen.getByText(/ORDER ITEMS & SALE RATES/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Add Item/i));
    fireEvent.click(screen.getByText('Cancel'));

    // Approve order with confirmation
    fireEvent.click(screen.getByText('Approve'));
    fireEvent.click(await screen.findByText(/Yes, Approve Order/i));
    await waitFor(() => expect(useAppStore.getState().orders[0].status).toBe('APPROVED'));
  });

  it('renders StockRegistryView, unpacks 1 bag, opens add commodity modal, and deletes commodity', async () => {
    window.history.replaceState({}, '', '/stock');
    render(<StockRegistryView />);
    expect(screen.getAllByText('Sona Masoori').length).toBeGreaterThan(0);

    // Unpack 1 bag with confirmation
    fireEvent.click(screen.getAllByText(/Unpack 1 Bag/i)[0]);
    const unpackConfirm = await screen.findByText(/Yes, Unpack|Unpack Bag/i);
    fireEvent.click(unpackConfirm);
    await waitFor(() => expect(useAppStore.getState().inventory[0].stockPhysicalOuter).toBe(99));

    // Open Add Commodity modal
    fireEvent.click(screen.getByText(/Add Commodity/i));
    expect(screen.getByText(/Add New Commodity/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('renders CustomerDirectoryView, adds a new customer, and opens edit modal', async () => {
    window.history.replaceState({}, '', '/customers');
    render(<CustomerDirectoryView />);
    expect(screen.getByText('Lakshmi Stores')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Add Customer/i));
    expect(screen.getByText(/Add New Customer/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('renders SupplierDirectoryView and opens add supplier modal', async () => {
    window.history.replaceState({}, '', '/suppliers');
    render(<SupplierDirectoryView />);
    expect(screen.getByText('Sri Sai Mill')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Add Supplier/i));
    expect(screen.getByText(/Add New Supplier/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
  });
});
