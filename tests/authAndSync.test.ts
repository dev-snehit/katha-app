import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { pushToGoogleSheet, pingGoogleSheet } from '../src/lib/syncService';

describe('Authentication & Session Gate', () => {
  beforeEach(() => {
    useAppStore.getState().logout();
  });

  it('starts in unauthenticated state upon app initialization', () => {
    const state = useAppStore.getState();
    expect(state.currentUser).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('allows master admin Snehit Tadepalli to login with default passcode', () => {
    const result = useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    expect(result.success).toBe(true);
    expect(result.user?.email).toBe('dev.snehit@gmail.com');
    expect(result.user?.role).toBe('ADMIN');

    const state = useAppStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.currentUser?.name).toBe('Snehit Tadepalli');
  });

  it('rejects incorrect password for admin', () => {
    const result = useAppStore.getState().login('dev.snehit@gmail.com', 'wrongpassword');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid password');
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });

  it('blocks users with PENDING_APPROVAL status from logging in', () => {
    useAppStore.getState().registerUser({
      id: 'test-pending-uuid',
      name: 'Ramesh Staff',
      email: 'ramesh@example.com',
      phone: '9876543210',
      role: 'STAFF',
      status: 'PENDING_APPROVAL',
      password: 'password123',
      createdAt: new Date().toISOString()
    });

    const result = useAppStore.getState().login('ramesh@example.com', 'password123');
    expect(result.success).toBe(false);
    expect(result.message).toContain('pending approval');
  });

  it('clears session on logout', () => {
    useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    expect(useAppStore.getState().isAuthenticated).toBe(true);

    useAppStore.getState().logout();
    expect(useAppStore.getState().isAuthenticated).toBe(false);
    expect(useAppStore.getState().currentUser).toBeNull();
  });
});

describe('Google Sheets Live Sync Engine', () => {
  it('returns graceful error when backendUrl is not configured', async () => {
    const res = await pushToGoogleSheet('', 'saveOrder', {});
    expect(res.success).toBe(false);
    expect(res.error).toContain('not configured');
  });

  it('handles simulated fetch failure gracefully', async () => {
    const fakeUrl = 'https://script.google.com/macros/s/nonexistent/exec';
    // Mock global fetch to reject
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

    const res = await pushToGoogleSheet(fakeUrl, 'saveOrder', {});
    expect(res.success).toBe(false);
    expect(res.error).toBe('Network disconnected');

    global.fetch = originalFetch;
  });

  it('formats payload correctly without triggering CORS application/json preflight', async () => {
    const fakeUrl = 'https://script.google.com/macros/s/valid/exec';
    const originalFetch = global.fetch;
    let capturedOptions: any = null;

    global.fetch = vi.fn().mockImplementation((url, options) => {
      capturedOptions = options;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'success', message: 'Order recorded' })
      });
    });

    const res = await pushToGoogleSheet(fakeUrl, 'saveOrder', { order: { id: 'ord-1' } });
    expect(res.success).toBe(true);
    expect(capturedOptions.headers['Content-Type']).toBe('text/plain;charset=utf-8');
    expect(capturedOptions.redirect).toBe('follow');

    global.fetch = originalFetch;
  });
});
