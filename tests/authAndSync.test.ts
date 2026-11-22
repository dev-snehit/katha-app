import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { pushToGoogleSheet, pingGoogleSheet, pullFromGoogleSheet } from '../src/lib/syncService';
import { hashPassword, generateTemporaryPassword } from '../src/lib/crypto';

import { INITIAL_ADMIN_USER } from '../src/contracts';

describe('Authentication & Session Gate', () => {
  beforeEach(() => {
    useAppStore.getState().logout();
    useAppStore.setState({
      users: [
        INITIAL_ADMIN_USER,
        ...useAppStore.getState().users.filter(u => u.email.toLowerCase() !== INITIAL_ADMIN_USER.email.toLowerCase())
      ]
    });
  });

  it('starts in unauthenticated state upon app initialization', () => {
    const state = useAppStore.getState();
    expect(state.currentUser).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('allows master admin Snehit Tadepalli to login with default passcode', async () => {
    const result = await useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    expect(result.success).toBe(true);
    expect(result.user?.email).toBe('dev.snehit@gmail.com');
    expect(result.user?.role).toBe('ADMIN');

    const state = useAppStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.currentUser?.name).toBe('Snehit Tadepalli');
  });

  it('allows first-time admin to login with shorthand email dev.snehit@gmail', async () => {
    const result = await useAppStore.getState().login('dev.snehit@gmail', 'admin');
    expect(result.success).toBe(true);
    expect(result.user?.role).toBe('ADMIN');
    expect(result.user?.status).toBe('APPROVED');
    expect(useAppStore.getState().isAuthenticated).toBe(true);
  });

  it('requires any new admin to raise access and remain pending until approved', async () => {
    const newAdminId = 'new-admin-uuid-1';
    useAppStore.getState().registerUser({
      id: newAdminId,
      name: 'Second Admin',
      email: 'admin2@example.com',
      phone: '9848012345',
      role: 'ADMIN',
      status: 'PENDING_APPROVAL',
      password: 'adminpassword',
      createdAt: new Date().toISOString()
    });

    // Trying to login immediately should be blocked
    const loginAttempt = await useAppStore.getState().login('admin2@example.com', 'adminpassword');
    expect(loginAttempt.success).toBe(false);
    expect(loginAttempt.message).toContain('pending approval');

    // Root admin approves the new admin
    useAppStore.getState().approveUser(newAdminId);

    // Now new admin can login with ADMIN role
    const approvedLogin = await useAppStore.getState().login('admin2@example.com', 'adminpassword');
    expect(approvedLogin.success).toBe(true);
    expect(approvedLogin.user?.role).toBe('ADMIN');
    expect(approvedLogin.user?.status).toBe('APPROVED');
  });

  it('rejects incorrect password for admin', async () => {
    const result = await useAppStore.getState().login('dev.snehit@gmail.com', 'wrongpassword');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid password');
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });

  it('blocks users with PENDING_APPROVAL status from logging in', async () => {
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

    const result = await useAppStore.getState().login('ramesh@example.com', 'password123');
    expect(result.success).toBe(false);
    expect(result.message).toContain('pending approval');
  });

  it('enforces mandatory password reset upon first login for users on temporary passwords', async () => {
    const tempId = 'temp-user-uuid';
    const tempPass = 'Katha-9281';
    const hashed = await hashPassword(tempPass);

    useAppStore.getState().registerUser({
      id: tempId,
      name: 'Temp User',
      email: 'tempuser@example.com',
      phone: '9876543210',
      role: 'STAFF',
      status: 'APPROVED',
      password: tempPass,
      passwordHash: hashed,
      mustResetPassword: true,
      createdAt: new Date().toISOString()
    }, tempPass);

    // Login triggers mustResetPassword
    const loginRes = await useAppStore.getState().login('tempuser@example.com', tempPass);
    expect(loginRes.success).toBe(true);
    expect(loginRes.mustResetPassword).toBe(true);
    expect(useAppStore.getState().isAuthenticated).toBe(false); // not authenticated until permanent password set

    // User sets permanent password
    const resetRes = await useAppStore.getState().resetPassword(tempId, 'NewPermPass99');
    expect(resetRes.success).toBe(true);

    // Now user is authenticated and passwordHash is updated
    expect(useAppStore.getState().isAuthenticated).toBe(true);
    const updatedUser = useAppStore.getState().users.find(u => u.id === tempId);
    expect(updatedUser?.mustResetPassword).toBe(false);

    // Old temporary password no longer works
    useAppStore.getState().logout();
    const oldLogin = await useAppStore.getState().login('tempuser@example.com', tempPass);
    expect(oldLogin.success).toBe(false);

    // New permanent password works
    const newLogin = await useAppStore.getState().login('tempuser@example.com', 'NewPermPass99');
    expect(newLogin.success).toBe(true);
    expect(newLogin.mustResetPassword).toBeFalsy();
  });

  it('handles forgot password flow by issuing temporary credentials that require reset', async () => {
    const forgotEmail = 'forgottest@example.com';
    useAppStore.getState().registerUser({
      id: 'forgot-user-id',
      name: 'Forgot Test User',
      email: forgotEmail,
      phone: '9848099999',
      role: 'STAFF',
      status: 'APPROVED',
      password: 'initialPass123',
      createdAt: new Date().toISOString()
    });

    const forgotRes = await useAppStore.getState().forgotPassword(forgotEmail);
    expect(forgotRes.success).toBe(true);
    expect(forgotRes.tempPassword).toBeDefined();

    const tempCode = forgotRes.tempPassword!;
    // Login with temporary password requires reset
    const loginRes = await useAppStore.getState().login(forgotEmail, tempCode);
    expect(loginRes.success).toBe(true);
    expect(loginRes.mustResetPassword).toBe(true);
  });

  it('clears session on logout', async () => {
    await useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
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
