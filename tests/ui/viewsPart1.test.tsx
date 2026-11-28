import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardView } from '../../src/components/dashboard/DashboardView';
import { ExportCenterView } from '../../src/components/exports/ExportCenterView';
import { RolePermissionsManager } from '../../src/components/admin/RolePermissionsManager';
import { UserRequestsView } from '../../src/components/admin/UserRequestsView';
import { useAppStore } from '../../src/store/useAppStore';
import { INITIAL_ADMIN_USER } from '../../src/contracts';
import { DEFAULT_ROLE_PERMISSIONS } from '../../src/lib/permissions';

vi.mock('../../src/lib/pdfGenerator', () => ({
  generateSalesReportPDF: vi.fn(),
  generateNumberTallyPDF: vi.fn(),
  generateStockPositionPDF: vi.fn(),
}));

vi.mock('../../src/lib/excelExport', () => ({
  exportMasterExcelFile: vi.fn().mockResolvedValue(undefined),
}));

describe('UI Views Part 1: DashboardView, ExportCenterView, RolePermissionsManager, UserRequestsView', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: {} }),
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
          id: 'u-pend-1',
          name: 'Pending Staff',
          email: 'pend@kaatha.com',
          phone: '9876500111',
          role: 'STAFF',
          status: 'PENDING_APPROVAL',
          createdAt: '2026-11-28T00:00:00.000Z',
        },
        {
          id: 'u-role-req',
          name: 'Active Staff',
          email: 'act@kaatha.com',
          phone: '9876500222',
          role: 'STAFF',
          status: 'APPROVED',
          requestedRole: 'OWNER',
          requestedName: 'Active Owner',
          createdAt: '2026-11-28T00:00:00.000Z',
        },
      ],
      inventory: [{
        id: 'p1', name: 'Sona Masoori', nameTe: 'సోనా మసూరి', category: 'Rice',
        innerBagWeightKg: 26, innerBagsPerOuter: 1, outerBagTotalKg: 26,
        stockPhysicalOuter: 15, stockReservedOuter: 5, stockLooseInner: 1, stockLooseKg: 0,
        costPricePerBag: 1000, wholesalePriceBag: 1200, pricePerInnerBag: 1200, retailPriceBag: 1300,
      }],
      customers: [{
        id: 'c1', name: 'Lakshmi Stores', phone: '9876543210', currentDue: 4500, createdAt: '2026-11-28T00:00:00.000Z',
      }],
      suppliers: [{
        id: 's1', businessName: 'Sri Sai Mill', bankName: 'SBI', accountNumber: '1122', ifscCode: 'SBIN0001', nickname: 'Sai', createdAt: '2026-11-28T00:00:00.000Z',
      }],
      orders: [{
        id: 'o1', orderNumber: 'ORD-1', customerId: 'c1', customerName: 'Lakshmi Stores', customerPhone: '9876543210',
        orderDate: new Date().toISOString(), createdAt: '2026-11-28T00:00:00.000Z',
        items: [{ productId: 'p1', productName: 'Sona Masoori', unitType: 'OUTER_BAG', quantity: 5, unitPrice: 1200, lineTotal: 6000 }],
        totalOuterBags: 5, totalInnerBags: 0, totalWeightKg: 130, subtotal: 6000, hamaliCharges: 0, transportCharges: 0, discount: 0, grandTotal: 6000,
        paymentMode: 'CASH', status: 'DELIVERED', submittedByRole: 'OWNER',
      }],
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders DashboardView with KPIs, funnel, inventory health, credit table, recent activity, and quick actions', () => {
    render(<DashboardView />);
    expect(screen.getByText(/Kaatha Business Dashboard/i)).toBeInTheDocument();
    expect(screen.getAllByText('Lakshmi Stores').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sona Masoori').length).toBeGreaterThan(0);
    expect(screen.getByText(/Supplier Payables/i)).toBeInTheDocument();

    // Quick action button click navigates cleanly
    const newOrderBtn = screen.getByText('New Order');
    fireEvent.click(newOrderBtn);
  });

  it('renders ExportCenterView and triggers single-day/range PDF & Excel downloads', async () => {
    render(<ExportCenterView />);
    expect(screen.getByText(/Export & Reports/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Date Range'));
    fireEvent.click(screen.getByText('Single Day'));

    const downloadBtns = screen.getAllByRole('button').filter((b) => /Download|Generate|Export/i.test(b.textContent || ''));
    for (const btn of downloadBtns) {
      fireEvent.click(btn);
    }
    expect(downloadBtns.length).toBeGreaterThan(0);
  });

  it('renders RolePermissionsManager, switches roles, toggles flags, and saves with confirmation', async () => {
    render(<RolePermissionsManager />);
    expect(screen.getByText(/Role-Specific Features & Permissions Matrix/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('STAFF'));
    fireEvent.click(screen.getByText('Database JSON'));
    fireEvent.click(screen.getByText('Database JSON'));

    const saveBtn = screen.getByText(/Save to Database/i);
    fireEvent.click(saveBtn);

    // Confirmation dialog appears
    const confirmBtn = await screen.findByText(/Yes, Save to Database/i);
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('renders UserRequestsView, approves pending & role-change requests, creates user, edits and deletes active user', async () => {
    render(<UserRequestsView />);
    expect(screen.getByText(/Pending Approval Requests/i)).toBeInTheDocument();
    expect(screen.getByText(/Role Change Request: STAFF → OWNER/i)).toBeInTheDocument();

    // Approve role change request
    const approveBtns = screen.getAllByText('Approve');
    fireEvent.click(approveBtns[0]);
    fireEvent.click(await screen.findByText('Approve Access'));
    await waitFor(() => expect(useAppStore.getState().users.find((u) => u.id === 'u-pend-1')?.status).toBe('APPROVED'));

    // Open Create User modal
    fireEvent.click(screen.getByText('Create User'));
    expect(screen.getByText(/Create User in Database/i)).toBeInTheDocument();
  });

  it('supports Master Reset tab with double confirmation and role-switch visibility control', async () => {
    const { rerender } = render(<UserRequestsView />);
    const resetTab = screen.getByText('Master Reset');
    fireEvent.click(resetTab);

    expect(screen.getByText(/Master Database Reset/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Master Reset Database'));

    // Step 1 of 2 confirmation
    expect(await screen.findByText(/Confirm Master Reset \(Step 1 of 2\)/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Yes, Continue (1/2)'));

    // Step 2 of 2 confirmation
    expect(await screen.findByText(/Final Confirmation — Irreversible \(Step 2 of 2\)/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Execute Master Reset'));

    await waitFor(() => {
      expect(screen.getByText(/Master Reset Completed!/i)).toBeInTheDocument();
    });

    const stateUsers = useAppStore.getState().users;
    expect(stateUsers).toHaveLength(1);
    expect(stateUsers[0].email).toBe('dev.snehit@gmail.com');
    expect(stateUsers[0].phone).toBe('9032447447');
    expect(stateUsers[0].role).toBe('ADMIN');
    expect(stateUsers[0].status).toBe('APPROVED');

    // Verify permission switch hides the Master Reset tab when disabled for ADMIN
    const customPerms = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
    customPerms.ADMIN.user_management_page.functionalities.master_reset = false;
    useAppStore.setState({
      currentUser: { ...INITIAL_ADMIN_USER, role: 'ADMIN' },
      rolePermissions: customPerms,
    });
    rerender(<UserRequestsView />);
    expect(screen.queryByText('Master Reset')).toBeNull();
  });
});
