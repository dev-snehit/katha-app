import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { pushToGoogleSheet, pingGoogleSheet, pullFromGoogleSheet } from '../src/lib/syncService';
import { hashPassword, generateTemporaryPassword } from '../src/lib/crypto';
import { decodeJwtPayload, getJwtRemainingSeconds, isJwtExpired } from '../src/lib/jwt';

import { INITIAL_ADMIN_USER } from '../src/contracts';

function makeMockJwt(payload: Record<string, any>, expiresInSec = 3600): string {
  const b64u = (obj: Record<string, any>) =>
    Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSec;
  return `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ ...payload, iat, exp })}.mock_hs256_sig`;
}

function installMockAuthBackendFetch() {
  const originalFetch = global.fetch;
  global.fetch = vi.fn().mockImplementation(async (_url: any, options: any) => {
    const body = options?.body ? JSON.parse(options.body) : {};
    const action = body.action;
    const state = useAppStore.getState();

    if (action === 'login') {
      let cleanEmail = (body.email || '').toLowerCase().trim();
      if (cleanEmail.endsWith('@gmail')) cleanEmail += '.com';
      const user = state.users.find((u) => {
        const uEmail = u.email.toLowerCase();
        return (
          uEmail === cleanEmail ||
          ((cleanEmail === 'dev.snehit@gmail.com' || cleanEmail === 'dev.snehit@gmail') &&
            (uEmail === 'dev.snehit@gmail.com' || uEmail === 'dev.snehit@gmail'))
        );
      });
      if (!user) {
        return {
          ok: true,
          json: async () => ({ status: 'error', code: 'UNAUTHORIZED', message: 'No registered account found with this email address.' }),
        };
      }
      if (user.status === 'PENDING_APPROVAL') {
        return {
          ok: true,
          json: async () => ({ status: 'error', code: 'PENDING_APPROVAL', message: 'Your account is pending approval by an administrator. Please check back shortly.' }),
        };
      }
      if (user.status === 'DENIED') {
        return {
          ok: true,
          json: async () => ({ status: 'error', code: 'DENIED', message: 'Access has been denied for this account. Contact your administrator.' }),
        };
      }
      const expectedHash = user.passwordHash || (user.password ? await hashPassword(user.password) : INITIAL_ADMIN_USER.passwordHash);
      if (body.passwordHash !== expectedHash) {
        return {
          ok: true,
          json: async () => ({ status: 'error', code: 'INVALID_CREDENTIALS', message: 'Invalid password. Please verify and try again.' }),
        };
      }
      if (user.mustResetPassword) {
        return {
          ok: true,
          json: async () => ({ status: 'success', mustResetPassword: true, user, message: 'Please choose a permanent password to continue.' }),
        };
      }
      const token = makeMockJwt({ sub: user.id, email: user.email, role: user.role, status: user.status }, 3600);
      return {
        ok: true,
        json: async () => ({ status: 'success', token, user }),
      };
    }

    if (action === 'refreshToken') {
      const payload = decodeJwtPayload(body.authToken);
      if (!payload || isJwtExpired(body.authToken)) {
        return {
          ok: true,
          json: async () => ({ status: 'error', code: 'TOKEN_EXPIRED', message: 'Your session has expired. Please sign in again.' }),
        };
      }
      const user = state.users.find((u) => u.id === payload.sub || u.email === payload.email);
      if (!user || user.status !== 'APPROVED') {
        return {
          ok: true,
          json: async () => ({ status: 'error', code: 'UNAUTHORIZED', message: 'User account is no longer active.' }),
        };
      }
      const freshToken = makeMockJwt({ sub: user.id, email: user.email, role: user.role, status: user.status }, 3600);
      return {
        ok: true,
        json: async () => ({ status: 'success', token: freshToken, user }),
      };
    }

    if (action === 'getData') {
      return {
        ok: true,
        json: async () => ({ status: 'success', data: {} }),
      };
    }

    return {
      ok: true,
      json: async () => ({ status: 'success', message: 'ok' }),
    };
  });
  return originalFetch;
}

describe('Authentication & Session Gate', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = installMockAuthBackendFetch();
    useAppStore.getState().logout();
    useAppStore.setState({
      backendUrl: 'https://script.google.com/macros/s/mock-auth/exec',
      users: [INITIAL_ADMIN_USER]
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
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

    // Reset password with token (redirects to login page without auto-authenticating)
    const resetRes = await useAppStore.getState().resetPasswordWithToken(token, 'BrandNewPassword2026');
    expect(resetRes.success).toBe(true);
    expect(useAppStore.getState().isAuthenticated).toBe(false);
    expect(useAppStore.getState().currentUser).toBeNull();

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

describe('Registration Reset Redirect & Role Re-Request Flows', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = installMockAuthBackendFetch();
    useAppStore.getState().logout();
    useAppStore.setState({
      backendUrl: 'https://script.google.com/macros/s/mock-auth/exec',
      users: [INITIAL_ADMIN_USER],
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not auto-login PENDING_APPROVAL user after resetting password via token link and blocks login until approved', async () => {
    const store = useAppStore.getState();
    store.logout();
    const token = 'rst-pending-test-' + Date.now();
    const newUser = {
      id: crypto.randomUUID(),
      name: 'Pending User',
      email: 'pending.reset@katha.com',
      phone: '9876500001',
      role: 'STAFF' as const,
      status: 'PENDING_APPROVAL' as const,
      password: 'TempPass123',
      passwordHash: await hashPassword('TempPass123'),
      mustResetPassword: true,
      resetPasswordToken: token,
      resetPasswordExpires: new Date(Date.now() + 3600_000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    const regRes = store.registerUser(newUser, 'TempPass123', `https://example.com/reset-password/${token}`);
    expect(regRes.success).toBe(true);

    // Reset password using link token
    const resetRes = await useAppStore.getState().resetPasswordWithToken(token, 'MyNewPass123');
    expect(resetRes.success).toBe(true);
    expect(useAppStore.getState().isAuthenticated).toBe(false);
    expect(useAppStore.getState().currentUser).toBeNull();

    // Attempt login while still PENDING_APPROVAL -> must be blocked
    const loginPending = await useAppStore.getState().login('pending.reset@katha.com', 'MyNewPass123');
    expect(loginPending.success).toBe(false);
    expect(loginPending.message.toLowerCase()).toContain('pending approval');

    // Admin approves -> now user can log in with the new password
    useAppStore.getState().approveUser(newUser.id);
    const loginApproved = await useAppStore.getState().login('pending.reset@katha.com', 'MyNewPass123');
    expect(loginApproved.success).toBe(true);
    expect(useAppStore.getState().isAuthenticated).toBe(true);
  });

  it('allows an existing APPROVED user to request a different role and updated name without changing password while retaining existing privileges until approved', async () => {
    const store = useAppStore.getState();
    store.logout();
    const origPass = 'StaffSecret99';
    const userId = crypto.randomUUID();
    const existingUser = {
      id: userId,
      name: 'Ravi Kumar',
      email: 'ravi.role@katha.com',
      phone: '9876500002',
      role: 'STAFF' as const,
      status: 'APPROVED' as const,
      password: origPass,
      passwordHash: await hashPassword(origPass),
      mustResetPassword: false,
      createdAt: new Date().toISOString(),
    };

    useAppStore.setState((s) => ({ users: [...s.users, existingUser] }));

    // Re-request via registerUser with same email & mobile, updated full name, and new role OWNER
    const reqRes = useAppStore.getState().registerUser({
      ...existingUser,
      id: crypto.randomUUID(),
      name: 'Ravi Kumar Updated',
      role: 'OWNER',
      status: 'PENDING_APPROVAL',
    });

    expect(reqRes.success).toBe(true);
    expect(reqRes.isRoleChangeRequest).toBe(true);

    // User MUST still be APPROVED with existing STAFF role and existing password
    const userBeforeApproval = useAppStore.getState().users.find((u) => u.id === userId)!;
    expect(userBeforeApproval.status).toBe('APPROVED');
    expect(userBeforeApproval.role).toBe('STAFF');
    expect(userBeforeApproval.requestedRole).toBe('OWNER');
    expect(userBeforeApproval.requestedName).toBe('Ravi Kumar Updated');

    const loginBeforeApproval = await useAppStore.getState().login('ravi.role@katha.com', origPass);
    expect(loginBeforeApproval.success).toBe(true);
    expect(loginBeforeApproval.user?.role).toBe('STAFF');

    // Admin approves the role change request -> role & name are updated, password unchanged
    useAppStore.getState().approveUser(userId);
    const userAfterApproval = useAppStore.getState().users.find((u) => u.id === userId)!;
    expect(userAfterApproval.role).toBe('OWNER');
    expect(userAfterApproval.name).toBe('Ravi Kumar Updated');
    expect(userAfterApproval.requestedRole).toBeUndefined();

    useAppStore.getState().logout();
    const loginAfterApproval = await useAppStore.getState().login('ravi.role@katha.com', origPass);
    expect(loginAfterApproval.success).toBe(true);
    expect(loginAfterApproval.user?.role).toBe('OWNER');
  });

  it('allows an existing PENDING_APPROVAL user to re-request with a different role without changing password and rejects mismatched mobile numbers', async () => {
    const store = useAppStore.getState();
    store.logout();
    const origPass = 'PendingPass42';
    const userId = crypto.randomUUID();
    const pendingUser = {
      id: userId,
      name: 'Kiran Rao',
      email: 'kiran.rereq@katha.com',
      phone: '9876500003',
      role: 'CUSTOMER' as const,
      status: 'PENDING_APPROVAL' as const,
      password: origPass,
      passwordHash: await hashPassword(origPass),
      mustResetPassword: false,
      createdAt: new Date().toISOString(),
    };

    useAppStore.setState((s) => ({ users: [...s.users, pendingUser] }));

    // Mismatched phone must be rejected
    const mismatchRes = useAppStore.getState().registerUser({
      ...pendingUser,
      id: crypto.randomUUID(),
      phone: '9876509999',
      role: 'STAFF',
    });
    expect(mismatchRes.success).toBe(false);

    // Matching email + mobile updates role & name without changing password
    const reReqRes = useAppStore.getState().registerUser({
      ...pendingUser,
      id: crypto.randomUUID(),
      name: 'Kiran Rao M',
      role: 'STAFF',
    });
    expect(reReqRes.success).toBe(true);
    expect(reReqRes.isReRequest).toBe(true);

    const updated = useAppStore.getState().users.find((u) => u.id === userId)!;
    expect(updated.role).toBe('STAFF');
    expect(updated.name).toBe('Kiran Rao M');
    expect(updated.status).toBe('PENDING_APPROVAL');
    expect(updated.password).toBe(origPass);
  });
});

describe('HS256 JWT Session Lifecycle & Pre-Expiry Warning', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = installMockAuthBackendFetch();
    useAppStore.getState().logout();
    useAppStore.setState({
      backendUrl: 'https://script.google.com/macros/s/mock-auth/exec',
      users: [INITIAL_ADMIN_USER],
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('blocks login strictly when backend URL is unconfigured or backend is unreachable', async () => {
    useAppStore.setState({ backendUrl: '' });
    const noUrlRes = await useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    expect(noUrlRes.success).toBe(false);
    expect(noUrlRes.message).toContain('not configured');
    expect(useAppStore.getState().isAuthenticated).toBe(false);
    expect(useAppStore.getState().authToken).toBeNull();

    useAppStore.setState({ backendUrl: 'https://script.google.com/macros/s/unreachable/exec' });
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));
    const offlineRes = await useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    expect(offlineRes.success).toBe(false);
    expect(offlineRes.message).toContain('Network offline');
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });

  it('persists authToken in localStorage on login and forces logout when token is expired or backend returns TOKEN_EXPIRED', async () => {
    const loginRes = await useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    expect(loginRes.success).toBe(true);
    expect(useAppStore.getState().authToken).toBeTruthy();
    expect(localStorage.getItem('katha_wholesale_authToken')).toBeTruthy();

    // Simulate expired JWT on periodic check
    const expiredToken = makeMockJwt({ sub: INITIAL_ADMIN_USER.id, email: INITIAL_ADMIN_USER.email, role: 'ADMIN' }, -30);
    useAppStore.setState({ authToken: expiredToken });
    useAppStore.getState().checkSessionExpiry();

    expect(useAppStore.getState().isAuthenticated).toBe(false);
    expect(useAppStore.getState().authToken).toBeNull();
    expect(useAppStore.getState().currentUser).toBeNull();
    expect(useAppStore.getState().sessionExpiredMessage).toContain('expired');

    // Re-login and simulate backend TOKEN_EXPIRED response on protected triggerSync
    await useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    expect(useAppStore.getState().isAuthenticated).toBe(true);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'error', code: 'TOKEN_EXPIRED', message: 'Session token has expired.' }),
    });

    await useAppStore.getState().triggerSync('saveProduct', { product: { id: 'p-1' } });
    expect(useAppStore.getState().isAuthenticated).toBe(false);
    expect(useAppStore.getState().authToken).toBeNull();
    expect(useAppStore.getState().sessionExpiredMessage).toContain('expired');
  });

  it('detects 5-minute pre-expiry window and renews 1-hour JWT on explicit refreshSessionToken()', async () => {
    const warningToken = makeMockJwt({ sub: INITIAL_ADMIN_USER.id, email: INITIAL_ADMIN_USER.email, role: 'ADMIN' }, 240); // 4 minutes left
    useAppStore.setState({
      currentUser: INITIAL_ADMIN_USER,
      authToken: warningToken,
      isAuthenticated: true,
    });

    const remainingBefore = getJwtRemainingSeconds(useAppStore.getState().authToken);
    expect(remainingBefore).toBeGreaterThan(0);
    expect(remainingBefore).toBeLessThanOrEqual(300);

    const refreshRes = await useAppStore.getState().refreshSessionToken();
    expect(refreshRes.success).toBe(true);

    const renewedToken = useAppStore.getState().authToken;
    expect(renewedToken).toBeTruthy();
    expect(renewedToken).not.toBe(warningToken);
    expect(getJwtRemainingSeconds(renewedToken)).toBeGreaterThan(3500);
    expect(useAppStore.getState().isAuthenticated).toBe(true);
  });

  it('triggers actionLoading spinner and top-right toast notifications on triggerSync success and failure', async () => {
    await useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    useAppStore.setState({ toasts: [] });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });
    await useAppStore.getState().triggerSync('saveProduct', { product: { id: 'p-toast-1' } });
    expect(useAppStore.getState().actionLoading).toBeNull();
    expect(useAppStore.getState().toasts.some((t) => t.type === 'success' && t.title === 'Saved to Database')).toBe(true);

    useAppStore.setState({ toasts: [] });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'error', message: 'Sheet quota exceeded' }),
    });
    await useAppStore.getState().triggerSync('saveProduct', { product: { id: 'p-toast-2' } });
    expect(useAppStore.getState().actionLoading).toBeNull();
    expect(useAppStore.getState().toasts.some((t) => t.type === 'error' && t.message.includes('Sheet quota exceeded'))).toBe(true);
  });

  it('throws a clear error from getRequiredServerUrl() when VITE_GOOGLE_APPS_SCRIPT_URL is not configured', async () => {
    const { getRequiredServerUrl } = await import('../src/config/backend');
    expect(() => getRequiredServerUrl('')).toThrow(/VITE_GOOGLE_APPS_SCRIPT_URL is not configured/);
    expect(getRequiredServerUrl('https://script.google.com/macros/s/test/exec')).toBe(
      'https://script.google.com/macros/s/test/exec'
    );
  });

  it('reconciles server-assigned UUID, orderNumber, and version in Zustand + localStorage', async () => {
    await useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    const localOrder = {
      id: 'local-ord-1',
      orderNumber: 'ORD-LOCAL-1',
      customerId: '00000000-0000-0000-0000-000000000002',
      customerName: 'Walk-In Customer',
      customerPhone: '0000000000',
      orderDate: '2026-11-28',
      status: 'PENDING_REVIEW' as const,
      totalOuterBags: 2,
      totalInnerBags: 0,
      totalWeightKg: 50,
      items: [{ productId: 'p1', productName: 'Rice', unitType: 'OUTER_BAG' as const, quantity: 2, unitPrice: 1000, lineTotal: 2000 }],
      subtotal: 2000,
      hamaliCharges: 0,
      transportCharges: 0,
      discount: 0,
      grandTotal: 2000,
      paymentMode: 'CASH' as const,
      submittedByRole: 'ADMIN' as const,
      createdAt: new Date().toISOString(),
    };
    useAppStore.setState({ orders: [localOrder] });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        id: 'srv-uuid-999',
        orderNumber: 'ORD-2026-0042',
        version: 1,
      }),
    });

    await useAppStore.getState().triggerSync('saveOrder', { order: localOrder });
    const saved = useAppStore.getState().orders.find((o) => o.id === 'srv-uuid-999');
    expect(saved).toBeDefined();
    expect(saved?.orderNumber).toBe('ORD-2026-0042');
    expect(saved?.version).toBe(1);
  });

  it('maps structured backend error codes to bilingual toasts and re-hydrates on CONFLICT_STALE_VERSION', async () => {
    await useAppStore.getState().login('dev.snehit@gmail.com', 'admin');
    useAppStore.setState({ toasts: [] });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'error', code: 'DUPLICATE_KEY', message: 'Phone exists' }),
    });
    await useAppStore.getState().triggerSync('saveCustomer', { customer: { id: 'c1' } });
    expect(useAppStore.getState().toasts.some((t) => t.message.includes('Duplicate record detected'))).toBe(true);

    // CONFLICT_STALE_VERSION triggers Data Out of Date toast + connectAndHydrateServer
    useAppStore.setState({ toasts: [] });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'error', code: 'CONFLICT_STALE_VERSION', message: 'Stale version' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { Users: [], Master_Products: [], Master_Customers: [], Master_Suppliers: [], Master_Orders_Sales: [], Pending_Orders: [] } }),
      });
    global.fetch = fetchMock;

    await useAppStore.getState().triggerSync('saveCustomer', { customer: { id: 'c1', version: 1 } });
    expect(useAppStore.getState().toasts.some((t) => t.title === 'Data Out of Date')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries once with 500ms backoff on transient network error in pushToGoogleSheet', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', message: 'Recovered on retry' }),
      });
    global.fetch = fetchMock;

    const res = await pushToGoogleSheet('https://script.google.com/macros/s/valid/exec', 'ping', {});
    expect(res.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
