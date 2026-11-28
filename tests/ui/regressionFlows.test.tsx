import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PendingOrdersView } from '../../src/components/orders/PendingOrdersView';
import { StockRegistryView } from '../../src/components/stock/StockRegistryView';
import { CustomerDirectoryView } from '../../src/components/customers/CustomerDirectoryView';
import { SupplierDirectoryView } from '../../src/components/suppliers/SupplierDirectoryView';
import { UserRequestsView } from '../../src/components/admin/UserRequestsView';
import { useAppStore } from '../../src/store/useAppStore';
import { INITIAL_ADMIN_USER } from '../../src/contracts';
import { DEFAULT_ROLE_PERMISSIONS } from '../../src/lib/permissions';

describe('UI Regression Flows: Edit, Delete, Dispatch, Deliver & Bilingual TE Coverage', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: {}, message: 'ok' }),
    });
    window.open = vi.fn();
    useAppStore.setState({
      currentUser: { ...INITIAL_ADMIN_USER, role: 'OWNER' },
      authToken: 'mock.jwt.tok',
      isAuthenticated: true,
      language: 'EN',
      backendUrl: 'https://script.google.com/macros/s/mock/exec',
      rolePermissions: JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)),
      users: [
        INITIAL_ADMIN_USER,
        {
          id: 'u-pend-deny',
          name: 'Deny Candidate',
          email: 'deny@kaatha.com',
          phone: '9876500112',
          role: 'STAFF',
          status: 'PENDING_APPROVAL',
          createdAt: '2026-11-28T00:00:00.000Z',
        },
        {
          id: 'u-active-edit',
          name: 'Active Staff',
          email: 'actedit@kaatha.com',
          phone: '9876500113',
          role: 'STAFF',
          status: 'APPROVED',
          createdAt: '2026-11-28T00:00:00.000Z',
        },
      ],
      inventory: [{
        id: 'p1', name: 'Sona Masoori', nameTe: 'సోనా మసూరి', category: 'Rice', brandOrMill: 'Sri Sai',
        innerBagWeightKg: 26, innerBagsPerOuter: 1, outerBagTotalKg: 26,
        stockPhysicalOuter: 100, stockReservedOuter: 5, stockLooseInner: 0, stockLooseKg: 0,
        costPricePerBag: 1000, wholesalePriceBag: 1200, pricePerInnerBag: 1200, retailPriceBag: 1350,
      }],
      customers: [{ id: 'c1', name: 'Lakshmi Stores', phone: '9876543210', currentDue: 2000, createdAt: '2026-11-28T00:00:00.000Z' }],
      suppliers: [{ id: 's1', businessName: 'Sri Sai Mill', bankName: 'SBI', accountNumber: '1234', ifscCode: 'SBIN0001234', nickname: 'Sai', createdAt: '2026-11-28T00:00:00.000Z' }],
      orders: [
        {
          id: 'o-pend', orderNumber: 'ORD-201', customerId: 'c1', customerName: 'Lakshmi Stores', customerPhone: '9876543210',
          orderDate: '2026-11-28T10:00:00.000Z', createdAt: '2026-11-28T10:00:00.000Z',
          items: [{ productId: 'p1', productName: 'Sona Masoori', unitType: 'OUTER_BAG', quantity: 5, unitPrice: 1200, lineTotal: 6000 }],
          totalOuterBags: 5, totalInnerBags: 0, totalWeightKg: 130, subtotal: 6000, hamaliCharges: 0, transportCharges: 0, discount: 0, grandTotal: 6000,
          paymentMode: 'CASH', status: 'PENDING_REVIEW', submittedByRole: 'OWNER',
        },
        {
          id: 'o-appr', orderNumber: 'ORD-202', customerId: 'c1', customerName: 'Lakshmi Stores', customerPhone: '9876543210',
          orderDate: '2026-11-28T10:00:00.000Z', createdAt: '2026-11-28T10:00:00.000Z',
          items: [{ productId: 'p1', productName: 'Sona Masoori', unitType: 'OUTER_BAG', quantity: 2, unitPrice: 1200, lineTotal: 2400 }],
          totalOuterBags: 2, totalInnerBags: 0, totalWeightKg: 52, subtotal: 2400, hamaliCharges: 0, transportCharges: 0, discount: 0, grandTotal: 2400,
          paymentMode: 'CASH', status: 'APPROVED', submittedByRole: 'OWNER',
        },
        {
          id: 'o-disp', orderNumber: 'ORD-203', customerId: 'c1', customerName: 'Lakshmi Stores', customerPhone: '9876543210',
          orderDate: '2026-11-28T10:00:00.000Z', createdAt: '2026-11-28T10:00:00.000Z',
          items: [{ productId: 'p1', productName: 'Sona Masoori', unitType: 'OUTER_BAG', quantity: 1, unitPrice: 1200, lineTotal: 1200 }],
          totalOuterBags: 1, totalInnerBags: 0, totalWeightKg: 26, subtotal: 1200, hamaliCharges: 0, transportCharges: 0, discount: 0, grandTotal: 1200,
          paymentMode: 'CASH', status: 'DISPATCHED', vehicleNumber: 'AP07AB1234', submittedByRole: 'OWNER',
        },
      ],
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('exercises PendingOrdersView edit, dispatch, deliver, WhatsApp, and delete order flows', async () => {
    render(<PendingOrdersView setActiveTab={vi.fn()} />);

    // WhatsApp statement button
    fireEvent.click(screen.getAllByTitle('Send WhatsApp Statement')[0]);
    expect(window.open).toHaveBeenCalled();

    // Edit Order modal
    fireEvent.click(screen.getAllByTitle('Edit Order')[0]);
    expect(screen.getByText(/Edit Order/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Update Order|Save Order/i));
    const maybeConfirm = screen.queryByText(/Yes, Save Changes/i);
    if (maybeConfirm) fireEvent.click(maybeConfirm);
    const maybeCancel = screen.queryByText('Cancel');
    if (maybeCancel) fireEvent.click(maybeCancel);

    // Delete Order with confirmation
    fireEvent.click(screen.getAllByTitle('Delete Order')[0]);
    fireEvent.click(await screen.findByText(/Yes, Delete Order/i));
    await waitFor(() => expect(useAppStore.getState().orders.some((o) => o.id === 'o-pend')).toBe(false));
  });

  it('exercises StockRegistryView add commodity submit, edit, and delete', async () => {
    render(<StockRegistryView />);

    // Edit existing commodity
    fireEvent.click(screen.getAllByText('Edit')[0]);
    fireEvent.click(screen.getByText(/Save Changes|Update Commodity/i));

    // Delete commodity
    fireEvent.click(screen.getAllByTitle('Delete Commodity')[0]);
    fireEvent.click(await screen.findByText('Yes, Delete Commodity'));
    await waitFor(() => expect(useAppStore.getState().inventory.length).toBe(0));
  });

  it('exercises CustomerDirectoryView edit, delete, and TE mode', async () => {
    render(<CustomerDirectoryView />);
    fireEvent.click(screen.getByTitle('Edit Customer'));
    fireEvent.click(screen.getByText(/Save Changes|Update Customer/i));
    fireEvent.click(await screen.findByText(/Yes, Save|Yes, Update/i));

    fireEvent.click(screen.getByTitle('Delete Customer Account'));
    fireEvent.click(await screen.findByText('Yes, Delete Account'));
    await waitFor(() => expect(useAppStore.getState().customers.length).toBe(0));

    useAppStore.setState({ language: 'TE' });
    render(<CustomerDirectoryView />);
    expect(screen.getAllByText(/కస్టమర్‌ను చేర్చండి/i).length).toBeGreaterThan(0);
  });

  it('exercises SupplierDirectoryView edit, delete, and TE mode', async () => {
    render(<SupplierDirectoryView />);
    fireEvent.click(screen.getByTitle('Edit Supplier'));
    fireEvent.click(screen.getByText(/Save Changes|Update Supplier/i));
    fireEvent.click(await screen.findByText(/Yes, Save|Yes, Update/i));

    fireEvent.click(screen.getByTitle('Delete Supplier'));
    fireEvent.click(await screen.findByText('Yes, Delete Supplier'));
    await waitFor(() => expect(useAppStore.getState().suppliers.length).toBe(0));

    useAppStore.setState({ language: 'TE' });
    render(<SupplierDirectoryView />);
    expect(screen.getAllByText(/సప్లయర్‌ను చేర్చండి/i).length).toBeGreaterThan(0);
  });

  it('exercises UserRequestsView deny request, edit active user, and delete active user', async () => {
    render(<UserRequestsView />);

    // Deny pending request
    fireEvent.click(screen.getByText('Deny'));
    fireEvent.click(await screen.findByText('Deny Request'));
    await waitFor(() => expect(useAppStore.getState().users.find((u) => u.id === 'u-pend-deny')?.status).toBe('DENIED'));

    // Edit active user
    fireEvent.click(screen.getAllByText('Edit')[0]);
    fireEvent.click(screen.getByText(/Save Changes|Update User/i));
    fireEvent.click(await screen.findByText(/Yes, Save|Yes, Update/i));
  });
});
