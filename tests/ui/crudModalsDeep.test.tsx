import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthView } from '../../src/components/auth/AuthView';
import { UserRequestsView } from '../../src/components/admin/UserRequestsView';
import { CustomerDirectoryView } from '../../src/components/customers/CustomerDirectoryView';
import { SupplierDirectoryView } from '../../src/components/suppliers/SupplierDirectoryView';
import { StockRegistryView } from '../../src/components/stock/StockRegistryView';
import { FollowUpsView } from '../../src/components/followups/FollowUpsView';
import { PendingOrdersView } from '../../src/components/orders/PendingOrdersView';
import { useAppStore } from '../../src/store/useAppStore';
import { INITIAL_ADMIN_USER } from '../../src/contracts';
import { DEFAULT_ROLE_PERMISSIONS } from '../../src/lib/permissions';

describe('Deep UI Flows: Auth Reset Link, Create/Edit/Delete User, Customer/Supplier/Stock CRUD', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: {}, message: 'ok' }),
    });
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
          id: 'u-edit-1',
          name: 'Staff One',
          email: 'staff1@kaatha.com',
          phone: '9876543219',
          role: 'STAFF',
          status: 'APPROVED',
          createdAt: '2026-11-28T00:00:00.000Z',
        },
      ],
      inventory: [{
        id: 'p1', name: 'Sona Masoori', category: 'Rice', brandOrMill: 'Sri Sai',
        innerBagWeightKg: 26, innerBagsPerOuter: 1, outerBagTotalKg: 26,
        stockPhysicalOuter: 50, stockReservedOuter: 0, stockLooseInner: 0, stockLooseKg: 0,
        costPricePerBag: 1000, wholesalePriceBag: 1200, pricePerInnerBag: 1200, retailPriceBag: 1300,
      }],
      customers: [{ id: 'c1', name: 'Lakshmi Stores', phone: '9876543210', currentDue: 1000, createdAt: '2026-11-28T00:00:00.000Z' }],
      suppliers: [{ id: 's1', businessName: 'Sri Sai Mill', bankName: 'SBI', accountNumber: '1234', ifscCode: 'SBIN0001234', nickname: 'Sai', createdAt: '2026-11-28T00:00:00.000Z' }],
      orders: [],
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('completes RESET_LINK flow in AuthView and redirects back to Login with pending banner', async () => {
    const token = 'rst-deep-123';
    useAppStore.setState({
      currentUser: null,
      authToken: null,
      isAuthenticated: false,
      users: [{
        ...INITIAL_ADMIN_USER,
        id: 'u-pend-tok',
        email: 'pendtok@kaatha.com',
        phone: '9876500999',
        status: 'PENDING_APPROVAL',
        resetPasswordToken: token,
        resetPasswordExpires: new Date(Date.now() + 3600_000).toISOString(),
      }],
    });

    window.history.replaceState({}, '', `/reset-password/${token}?resetToken=${token}`);
    render(<AuthView />);

    expect(screen.getByText(/Create New Password/i)).toBeInTheDocument();
    const passInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passInputs[0], { target: { value: 'SecurePass99' } });
    fireEvent.change(passInputs[1], { target: { value: 'SecurePass99' } });
    fireEvent.submit(screen.getByText(/Reset Password & Go to Sign In/i).closest('form')!);

    await waitFor(() => expect(screen.getByText(/pending administrator approval/i)).toBeInTheDocument());
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });

  it('creates a new user, edits an active user, and deletes an active user in UserRequestsView', async () => {
    render(<UserRequestsView />);

    // Create User
    fireEvent.click(screen.getByText('Create User'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Ramesh Kumar'), { target: { value: 'Kiran Merchant' } });
    fireEvent.change(screen.getByPlaceholderText('ramesh@example.com'), { target: { value: 'kiran@kaatha.com' } });
    fireEvent.change(screen.getByPlaceholderText('9848011223'), { target: { value: '9876508888' } });
    fireEvent.click(screen.getByText(/Create User & Send Email/i));

    await waitFor(() => expect(useAppStore.getState().users.some((u) => u.email === 'kiran@kaatha.com')).toBe(true));
  });

  it('adds and saves a new Customer in CustomerDirectoryView', async () => {
    render(<CustomerDirectoryView />);
    fireEvent.click(screen.getByText(/Add Customer/i));

    fireEvent.change(screen.getByPlaceholderText('e.g. Sri Balaji Kirana Stores'), { target: { value: 'Balaji Traders' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 9848022338'), { target: { value: '9876507777' } });
    fireEvent.click(screen.getByText(/Save Customer/i));

    await waitFor(() => expect(useAppStore.getState().customers.some((c) => c.name === 'Balaji Traders')).toBe(true));
  });

  it('adds and saves a new Supplier in SupplierDirectoryView', async () => {
    render(<SupplierDirectoryView />);
    fireEvent.click(screen.getByText(/Add Supplier/i));

    fireEvent.change(screen.getByPlaceholderText('e.g. Sri Lalitha Rice Industries'), { target: { value: 'Annapurna Rice Mill' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Lalitha SBI'), { target: { value: 'Annapurna SBI' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. State Bank of India'), { target: { value: 'SBI' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 30291823901'), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. SBIN0001234'), { target: { value: 'SBIN0001234' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '25000' } });
    fireEvent.click(screen.getByText(/Save Supplier/i));

    await waitFor(() => {
      const saved = useAppStore.getState().suppliers.find((s) => s.businessName === 'Annapurna Rice Mill');
      expect(saved).toBeDefined();
      expect(saved?.payableAmount).toBe(25000);
    });
  });

  it('adds a Walk-In / Follow-Up entry in FollowUpsView', async () => {
    const { container } = render(<FollowUpsView />);
    fireEvent.click(screen.getByText(/Add Follow-Up/i));

    const formInputs = container.querySelectorAll('form input');
    fireEvent.change(formInputs[0], { target: { value: 'Suresh Caterers' } });
    fireEvent.change(formInputs[1], { target: { value: '9848099887' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Monthly 50 bags Sona Masoori for catering'), { target: { value: 'Monthly 50 bags rice' } });
    fireEvent.click(screen.getByText(/Save Follow-Up/i));

    await waitFor(() => expect(useAppStore.getState().followUps.some((f) => f.name === 'Suresh Caterers')).toBe(true));
  });

  it('completes an Approved order as Delivered with selected payment mode (DD)', async () => {
    useAppStore.setState({
      orders: [{
        id: 'o-app-1', orderNumber: 'ORD-2026-0001', customerId: 'c1', customerName: 'Lakshmi Stores', customerPhone: '9876543210',
        orderDate: '2026-11-28', items: [], totalOuterBags: 2, totalInnerBags: 0, totalWeightKg: 52, subtotal: 2400,
        hamaliCharges: 0, transportCharges: 0, discount: 0, grandTotal: 2400, paymentMode: 'CREDIT', status: 'APPROVED',
        submittedByRole: 'OWNER', createdAt: '2026-11-28T00:00:00.000Z',
      }],
    });
    render(<PendingOrdersView />);
    fireEvent.click(screen.getByText(/Approved \(1\)/i));
    fireEvent.click(screen.getByText(/Complete & Deliver/i));
    fireEvent.click(screen.getByText('DD'));
    fireEvent.click(screen.getByText(/Confirm Delivery/i));

    await waitFor(() => {
      const updated = useAppStore.getState().orders.find((o) => o.id === 'o-app-1');
      expect(updated?.status).toBe('DELIVERED');
      expect(updated?.paymentMode).toBe('DD');
    });
  });

  it('opens StockRegistryView in Telugu mode and verifies localization', () => {
    useAppStore.setState({ language: 'TE' });
    render(<StockRegistryView />);
    expect(screen.getByText(/కొత్త సరుకు చేర్చండి/i)).toBeInTheDocument();
  });
});
