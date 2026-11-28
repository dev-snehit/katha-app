import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertDialog } from '../../src/components/ui/AlertDialog';
import { Navbar } from '../../src/components/Navbar';
import { SettingsModal } from '../../src/components/settings/SettingsModal';
import { AuthView } from '../../src/components/auth/AuthView';
import { ToastContainer } from '../../src/components/ui/ToastContainer';
import { useAppStore } from '../../src/store/useAppStore';
import { INITIAL_ADMIN_USER } from '../../src/contracts';

function makeValidJwt(role = 'ADMIN') {
  const b64u = (o: any) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  return `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: INITIAL_ADMIN_USER.id, email: INITIAL_ADMIN_USER.email, role, iat, exp: iat + 3600 })}.sig`;
}

describe('UI Components: AlertDialog, Navbar, SettingsModal & AuthView', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: {}, message: 'Connected' }),
    });
    useAppStore.setState({
      currentUser: INITIAL_ADMIN_USER,
      authToken: makeValidJwt('ADMIN'),
      isAuthenticated: true,
      users: [INITIAL_ADMIN_USER],
      language: 'EN',
      backendUrl: 'https://script.google.com/macros/s/mock/exec',
      syncStatus: 'SYNCED',
      sessionExpiredMessage: null,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders AlertDialog across types and triggers onAction/onClose', () => {
    const onClose = vi.fn();
    const onAction = vi.fn();
    const { rerender } = render(
      <AlertDialog isOpen={false} onClose={onClose} title="Hidden" message="Msg" />
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    for (const type of ['warning', 'info', 'error', 'success', 'danger'] as const) {
      rerender(
        <AlertDialog
          isOpen={true}
          onClose={onClose}
          onAction={onAction}
          type={type}
          title={`Title ${type}`}
          message="Body"
          actionText="Confirm"
          cancelText="Cancel"
        />
      );
      expect(screen.getByText(`Title ${type}`)).toBeInTheDocument();
    }

    fireEvent.click(screen.getByText('Confirm'));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders Navbar with all 7 navigation options, bilingual toggle, manual sync, and sign-out confirmation', async () => {
    const setActiveTab = vi.fn();
    const onOpenSettings = vi.fn();

    useAppStore.setState({
      orders: [{
        id: 'o1', orderNumber: 'ORD-1', customerId: 'c1', customerName: 'C1', customerPhone: '9876543210',
        orderDate: '2026-11-28', items: [], totalOuterBags: 2, totalInnerBags: 0, totalWeightKg: 52, subtotal: 2000,
        hamaliCharges: 0, transportCharges: 0, discount: 0, grandTotal: 2000, paymentMode: 'CASH', status: 'PENDING_REVIEW',
        submittedByRole: 'ADMIN', createdAt: '2026-11-28T00:00:00.000Z',
      }],
    });

    render(<Navbar activeTab="dashboard" setActiveTab={setActiveTab} onOpenSettings={onOpenSettings} />);

    // Verify all 7 options are rendered
    for (const label of ['Dashboard', 'Orders', 'Stock', 'Customers', 'Suppliers', 'Reports', 'Admin']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    // Click brand logo & tabs
    fireEvent.click(screen.getByLabelText('Kaatha App Home'));
    expect(setActiveTab).toHaveBeenCalledWith('dashboard');

    fireEvent.click(screen.getAllByText('Orders')[0]);
    expect(setActiveTab).toHaveBeenCalledWith('orders');

    fireEvent.click(screen.getByLabelText('Settings'));
    expect(onOpenSettings).toHaveBeenCalled();

    // Switch language to Telugu (verifies full language words English / తెలుగు)
    const langSelect = screen.getByLabelText('Language');
    expect(langSelect).toHaveTextContent('English');
    expect(langSelect).toHaveTextContent('తెలుగు');
    fireEvent.change(langSelect, { target: { value: 'TE' } });
    expect(useAppStore.getState().language).toBe('TE');

    // Open sign out dialog and confirm
    fireEvent.click(screen.getByTitle('లాగౌట్'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('అవును, లాగౌట్ చేయి'));
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });

  it('renders SettingsModal, tests connection, syncs all, and adjusts base font size', async () => {
    const onClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByText(/Test Connection/i));
    await waitFor(() => expect(screen.getByText(/Connected successfully/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Sync All Records to Database/i));
    await waitFor(() => expect(screen.getByText(/synced to cloud database/i)).toBeInTheDocument());

    // Font size controls
    fireEvent.click(screen.getByText(/Large/i));
    expect(useAppStore.getState().baseFontSize).toBeGreaterThan(16);
    fireEvent.click(screen.getByText(/Reset/i));
    expect(useAppStore.getState().baseFontSize).toBe(16);

    // If DEFAULT_SERVER_URL is configured via env, SettingsModal locks the URL input as readOnly
    const urlInput = screen.getByPlaceholderText(/script\.google\.com/i) as HTMLInputElement;
    if ((import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL) {
      expect(urlInput.readOnly).toBe(true);
      expect(screen.getByText(/CI\/CD Managed/i)).toBeInTheDocument();
    }
  });

  it('renders AuthView modes (Login, Request Access, Forgot Password, Reset Link redirect, Session Expired banner)', async () => {
    useAppStore.setState({
      currentUser: null,
      authToken: null,
      isAuthenticated: false,
      sessionExpiredMessage: 'Your session has expired. Please sign in again.',
    });

    const resetToken = 'rst-ui-test-123';
    useAppStore.setState({
      users: [{
        ...INITIAL_ADMIN_USER,
        id: 'u-pending-ui',
        email: 'pending.ui@kaatha.com',
        phone: '9876501111',
        status: 'PENDING_APPROVAL',
        resetPasswordToken: resetToken,
        resetPasswordExpires: new Date(Date.now() + 3600_000).toISOString(),
      }],
    });

    render(<AuthView />);
    expect(screen.getByText(/Your session has expired/i)).toBeInTheDocument();

    // Switch to Request Access & submit new user (updates URL to /register and shows on-screen setup link)
    fireEvent.click(screen.getByText('Request Access'));
    expect(window.location.pathname).toBe('/register');
    expect(screen.queryByText(/A secure temporary sign-in password/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Ramesh Kumar/i), { target: { value: 'New Merchant' } });
    fireEvent.change(screen.getByPlaceholderText('ramesh@example.com'), { target: { value: 'merchant@kaatha.com' } });
    fireEvent.change(screen.getByPlaceholderText('9876543210'), { target: { value: '9876502222' } });
    fireEvent.submit(screen.getByText(/Submit Access Request/i).closest('form')!);
    await waitFor(() => expect(screen.getByText(/Registration submitted/i)).toBeInTheDocument());
    expect(screen.getByText(/A secure temporary sign-in password/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Link/i)).toBeInTheDocument();

    // Switch to Sign In (updates URL to /login) and Forgot Password
    fireEvent.click(screen.getByText('Sign In'));
    expect(window.location.pathname).toBe('/login');
    fireEvent.click(screen.getByText('Forgot Password?'));
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'pending.ui@kaatha.com' } });
    fireEvent.click(screen.getByText('Send Reset Link'));
    await waitFor(() => expect(screen.getByText(/unique password reset link/i)).toBeInTheDocument());
  });

  it('renders and dismisses top-right ToastContainer notifications', () => {
    useAppStore.setState({ toasts: [] });
    useAppStore.getState().addToast({
      type: 'success',
      title: 'Saved to Database',
      titleTe: 'డేటాబేస్‌లో సేవ్ అయింది',
      message: 'Changes persisted.',
      messageTe: 'మార్పులు సేవ్ చేయబడ్డాయి.',
      durationMs: 0,
    });
    render(<ToastContainer />);

    expect(screen.getByText('Saved to Database')).toBeInTheDocument();
    expect(screen.getByText('Changes persisted.')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dismiss notification'));
    expect(screen.queryByText('Saved to Database')).not.toBeInTheDocument();
  });
});
