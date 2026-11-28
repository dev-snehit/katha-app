import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../../src/App';
import { useAppStore } from '../../src/store/useAppStore';
import { createGasRuntime } from '../backend/gasHarness';
import { INITIAL_ADMIN_USER } from '../../src/contracts';

describe('E2E Integration Flows: Full App -> Store -> Sync -> Backend Code.gs VM', () => {
  let originalFetch: typeof global.fetch;
  let gas: ReturnType<typeof createGasRuntime>;

  beforeEach(() => {
    originalFetch = global.fetch;
    gas = createGasRuntime();
    // Pre-initialize database
    gas.callGet({ action: 'ping' });

    global.fetch = vi.fn().mockImplementation(async (url: any, options: any) => {
      if (options?.method === 'POST' && options.body) {
        const res = gas.callPost(JSON.parse(options.body));
        return { ok: true, json: async () => res };
      }
      const u = new URL(String(url));
      const action = u.searchParams.get('action') || 'ping';
      const res = gas.callGet({ action });
      return { ok: true, json: async () => res };
    });

    window.history.replaceState({}, '', '/login');
    useAppStore.getState().logout();
    useAppStore.setState({
      backendUrl: 'https://script.google.com/macros/s/e2e-gas/exec',
      users: [INITIAL_ADMIN_USER],
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('completes full Admin E2E journey: Login (JWT) -> Dashboard -> Navigate All Modules -> Pre-Expiry Warning -> Refresh Token -> Sign Out', async () => {
    render(<App />);

    // 1. Sign In via AuthView against real Code.gs backend
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'dev.snehit@gmail.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'admin' },
    });
    fireEvent.click(screen.getByText('Sign In to Workspace'));

    // 2. Dashboard renders after JWT login
    await waitFor(() => expect(useAppStore.getState().isAuthenticated).toBe(true));
    expect(useAppStore.getState().authToken).toBeTruthy();

    await waitFor(() => expect(screen.getByText(/Kaatha Business Dashboard/i)).toBeInTheDocument());

    // 3. Navigate across all top-level views
    fireEvent.click(screen.getAllByText('Orders')[0]);
    await waitFor(() => expect(window.location.pathname).toBe('/orders'));

    fireEvent.click(screen.getAllByText('Stock')[0]);
    await waitFor(() => expect(window.location.pathname).toBe('/stock'));

    fireEvent.click(screen.getAllByText('Customers')[0]);
    await waitFor(() => expect(window.location.pathname).toBe('/customers'));

    fireEvent.click(screen.getAllByText('Suppliers')[0]);
    await waitFor(() => expect(window.location.pathname).toBe('/suppliers'));

    fireEvent.click(screen.getAllByText('Reports')[0]);
    await waitFor(() => expect(window.location.pathname).toBe('/exports'));

    fireEvent.click(screen.getAllByText('Admin')[0]);
    await waitFor(() => expect(window.location.pathname).toBe('/admin'));

    // 4. Simulate 5-minute pre-expiry warning window using a near-expiry real JWT from GAS
    const b64u = (o: any) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64url');
    const nowSec = Math.floor(Date.now() / 1000);
    const cryptoNode = await import('crypto');
    const secret = gas.scriptProps.get('JWT_SECRET')!;
    const h = b64u({ alg: 'HS256', typ: 'JWT' });
    const p = b64u({ sub: INITIAL_ADMIN_USER.id, email: INITIAL_ADMIN_USER.email, role: 'ADMIN', status: 'APPROVED', iat: nowSec - 3400, exp: nowSec + 200 });
    const sig = cryptoNode.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
    const nearExpiryJwt = `${h}.${p}.${sig}`;

    act(() => {
      useAppStore.setState({ authToken: nearExpiryJwt });
    });

    // Pre-expiry warning dialog appears
    await waitFor(() => expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument(), { timeout: 3000 });

    // Click "Stay Signed In" -> calls backend refreshToken -> issues fresh 1-hour JWT
    fireEvent.click(screen.getByText('Stay Signed In'));
    await waitFor(() => expect(screen.queryByText('Session Expiring Soon')).toBeNull(), { timeout: 3000 });
    expect(useAppStore.getState().authToken).not.toBe(nearExpiryJwt);

    // 5. Simulate expired JWT -> forces logout & redirects to /login with banner
    const pExp = b64u({ sub: INITIAL_ADMIN_USER.id, email: INITIAL_ADMIN_USER.email, role: 'ADMIN', status: 'APPROVED', iat: nowSec - 4000, exp: nowSec - 10 });
    const sigExp = cryptoNode.createHmac('sha256', secret).update(`${h}.${pExp}`).digest('base64url');
    act(() => {
      useAppStore.setState({ authToken: `${h}.${pExp}.${sigExp}` });
    });

    await waitFor(() => expect(useAppStore.getState().isAuthenticated).toBe(false), { timeout: 3000 });
    expect(screen.getByText(/Your session has expired/i)).toBeInTheDocument();
  });
});
