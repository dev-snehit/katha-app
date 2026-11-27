import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { pushToGoogleSheet, pingGoogleSheet, pullFromGoogleSheet } from '../src/lib/syncService';
import { hashPassword, generateTemporaryPassword } from '../src/lib/crypto';

import { INITIAL_ADMIN_USER } from '../src/contracts';

describe('Authentication & Session Gate', () => {
  beforeEach(() => {
    useAppStore.getState().logout();
    useAppStore.setState({
      users: [INITIAL_ADMIN_USER]
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
    const tempPass = 'Kaatha-9281';
    const hashed = await hashPassword(tempPass);

    useAppStore.getState().registerUser({
      id: tempId,
      name: 'Temp User',
      email: 'tempuser@example.com',
      phone: '9876543211',
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

  it('generates a unique reset password link when user requests forgot password', async () => {
    const testEmail = 'linktest@example.com';
    useAppStore.getState().registerUser({
      id: 'link-test-user-id',
      name: 'Link Test User',
      email: testEmail,
      phone: '9848077112',
      role: 'STAFF',
      status: 'APPROVED',
      password: 'initialPass123',
      createdAt: new Date().toISOString()
    });

    const res = await useAppStore.getState().forgotPassword(testEmail);
    expect(res.success).toBe(true);
    expect(res.resetToken).toBeDefined();
    expect(res.resetLink).toBeDefined();
    expect(res.resetLink).toContain('?resetToken=');
    expect(res.resetLink).toContain(res.resetToken!);

    // Verify user in store has reset token and expiry
    const user = useAppStore.getState().users.find(u => u.email === testEmail);
    expect(user?.resetPasswordToken).toBe(res.resetToken);
    expect(user?.resetPasswordExpires).toBeDefined();
  });

  it('validates reset token and detects expired or invalid token', async () => {
    const testEmail = 'tokentest@example.com';
    useAppStore.getState().registerUser({
      id: 'token-test-user-id',
      name: 'Token Test User',
      email: testEmail,
      phone: '9848077113',
      role: 'CUSTOMER',
      status: 'APPROVED',
      password: 'initialPass123',
      createdAt: new Date().toISOString()
    });

    const res = await useAppStore.getState().forgotPassword(testEmail);
    const validToken = res.resetToken!;

    // 1. Valid token passes
    const validCheck = useAppStore.getState().validateResetToken(validToken);
    expect(validCheck.valid).toBe(true);
    expect(validCheck.user?.email).toBe(testEmail);

    // 2. Non-existent token fails
    const invalidCheck = useAppStore.getState().validateResetToken('invalid-fake-token-999');
    expect(invalidCheck.valid).toBe(false);
    expect(invalidCheck.error).toContain('Invalid');

    // 3. Expired token fails
    useAppStore.setState({
      users: useAppStore.getState().users.map(u => 
        u.email === testEmail ? { ...u, resetPasswordExpires: new Date(Date.now() - 10000).toISOString() } : u
      )
    });
    const expiredCheck = useAppStore.getState().validateResetToken(validToken);
    expect(expiredCheck.valid).toBe(false);
    expect(expiredCheck.error).toContain('expired');
  });

  it('allows resetting password using unique token and invalidates token after use', async () => {
    const testEmail = 'resetcomplete@example.com';
    useAppStore.getState().registerUser({
      id: 'reset-complete-id',
      name: 'Reset Complete User',
      email: testEmail,
      phone: '9848077114',
      role: 'STAFF',
      status: 'APPROVED',
      password: 'oldPassword123',
      createdAt: new Date().toISOString()
    });

    const forgotRes = await useAppStore.getState().forgotPassword(testEmail);
    const token = forgotRes.resetToken!;

    // Reset password with token
    const resetRes = await useAppStore.getState().resetPasswordWithToken(token, 'BrandNewPassword2026');
    expect(resetRes.success).toBe(true);
    expect(useAppStore.getState().isAuthenticated).toBe(true);
    expect(useAppStore.getState().currentUser?.email).toBe(testEmail);

    // Verify token has been cleared / invalidated
    const updatedUser = useAppStore.getState().users.find(u => u.email === testEmail);
    expect(updatedUser?.resetPasswordToken).toBeUndefined();

    // Reusing the token must fail
    const reuseAttempt = useAppStore.getState().validateResetToken(token);
    expect(reuseAttempt.valid).toBe(false);

    // Log out and verify login with new password succeeds
    useAppStore.getState().logout();
    const loginRes = await useAppStore.getState().login(testEmail, 'BrandNewPassword2026');
    expect(loginRes.success).toBe(true);
    expect(loginRes.mustResetPassword).toBeFalsy();
  });

  it('clears session on logout', async () => {
    await useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    expect(useAppStore.getState().isAuthenticated).toBe(true);

    useAppStore.getState().logout();
    expect(useAppStore.getState().isAuthenticated).toBe(false);
    expect(useAppStore.getState().currentUser).toBeNull();
  });

  it('persists logged in user in localStorage and retains session until manual logout', async () => {
    const result = await useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    expect(result.success).toBe(true);
    expect(useAppStore.getState().isAuthenticated).toBe(true);

    // Verify localStorage has persisted currentUser
    const rawStored = localStorage.getItem('katha_wholesale_currentUser');
    expect(rawStored).toBeTruthy();
    const stored = JSON.parse(rawStored!);
    expect(stored.email).toBe('dev.snehit@gmail.com');
    expect(stored.role).toBe('ADMIN');

    // Manual logout clears both state and localStorage
    useAppStore.getState().logout();
    expect(useAppStore.getState().isAuthenticated).toBe(false);
    expect(useAppStore.getState().currentUser).toBeNull();
    const rawAfterLogout = localStorage.getItem('katha_wholesale_currentUser');
    expect(rawAfterLogout ? JSON.parse(rawAfterLogout) : null).toBeNull();
  });

  it('rejects user registration if email already exists', () => {
    // 1. Initial admin has email dev.snehit@gmail.com
    const duplicateEmailRes = useAppStore.getState().registerUser({
      id: 'dup-email-1',
      name: 'Duplicate Email User',
      email: 'dev.snehit@gmail.com',
      phone: '9848099881',
      role: 'STAFF',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString()
    });

    expect(duplicateEmailRes.success).toBe(false);
    expect(duplicateEmailRes.message).toContain('email address already exists');

    // 2. Also check case-insensitive and @gmail shorthand
    const shorthandRes = useAppStore.getState().registerUser({
      id: 'dup-email-2',
      name: 'Duplicate Shorthand User',
      email: 'DEV.SNEHIT@GMAIL',
      phone: '9848099882',
      role: 'STAFF',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString()
    });

    expect(shorthandRes.success).toBe(false);
    expect(shorthandRes.message).toContain('email address already exists');
  });

  it('rejects user registration if mobile number already exists', () => {
    // 1. Register a user first
    const res1 = useAppStore.getState().registerUser({
      id: 'user-unique-phone',
      name: 'First Phone User',
      email: 'firstphone@example.com',
      phone: '9848055555',
      role: 'STAFF',
      status: 'APPROVED',
      createdAt: new Date().toISOString()
    });
    expect(res1.success).toBe(true);

    // 2. Try registering another user with identical 10-digit mobile number
    const resDuplicate = useAppStore.getState().registerUser({
      id: 'user-dup-phone',
      name: 'Second Phone User',
      email: 'secondphone@example.com',
      phone: '9848055555',
      role: 'STAFF',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString()
    });
    expect(resDuplicate.success).toBe(false);
    expect(resDuplicate.message).toContain('mobile number already exists');

    // 3. Try with formatted variation (+91 98480 55555)
    const resFormatted = useAppStore.getState().registerUser({
      id: 'user-dup-phone-formatted',
      name: 'Third Phone User',
      email: 'thirdphone@example.com',
      phone: '+91 98480 55555',
      role: 'CUSTOMER',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString()
    });
    expect(resFormatted.success).toBe(false);
    expect(resFormatted.message).toContain('mobile number already exists');
  });

  it('rejects registration when email or phone has pending access request', () => {
    // Register pending request
    const resPending = useAppStore.getState().registerUser({
      id: 'user-pending-1',
      name: 'Pending User',
      email: 'pendinguser@example.com',
      phone: '9848066666',
      role: 'STAFF',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString()
    });
    expect(resPending.success).toBe(true);

    // Attempting duplicate email
    const resDupEmail = useAppStore.getState().registerUser({
      id: 'user-pending-dup-email',
      name: 'Another User',
      email: 'pendinguser@example.com',
      phone: '9848077777',
      role: 'STAFF',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString()
    });
    expect(resDupEmail.success).toBe(false);
    expect(resDupEmail.message).toContain('pending review');

    // Attempting duplicate mobile
    const resDupMobile = useAppStore.getState().registerUser({
      id: 'user-pending-dup-mobile',
      name: 'Yet Another User',
      email: 'otheruser@example.com',
      phone: '9848066666',
      role: 'STAFF',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString()
    });
    expect(resDupMobile.success).toBe(false);
    expect(resDupMobile.message).toContain('pending review');
  });

  it('allows registration when both email and phone are unique', () => {
    const res = useAppStore.getState().registerUser({
      id: 'user-unique-both',
      name: 'Unique User',
      email: 'completelyunique@example.com',
      phone: '9848019999',
      role: 'STAFF',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString()
    });

    expect(res.success).toBe(true);
    expect(res.user?.email).toBe('completelyunique@example.com');
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
