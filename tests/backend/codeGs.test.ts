import { describe, it, expect, beforeEach } from 'vitest';
import { createGasRuntime } from './gasHarness';
import { hashPassword } from '../../src/lib/crypto';

describe('Backend Code.gs API & HS256 JWT Integration', () => {
  let gas: ReturnType<typeof createGasRuntime>;
  let adminHash: string;

  beforeEach(async () => {
    gas = createGasRuntime();
    adminHash = await hashPassword('admin');
  });

  it('initializes database, auto-generates JWT_SECRET, and handles doGet ping/getData/lockSheets', () => {
    const ping = gas.callGet({ action: 'ping' });
    expect(ping.status).toBe('ok');
    expect(gas.scriptProps.get('JWT_SECRET')).toBeTruthy();

    const dataRes = gas.callGet({ action: 'getData' });
    expect(dataRes.status).toBe('success');
    expect(dataRes.data.Users.length).toBe(1);
    expect(dataRes.data.rolePermissions.OWNER).toBeDefined();

    const lockRes = gas.callGet({ action: 'lockSheets' });
    expect(lockRes.status).toBe('success');

    const unknown = gas.callGet({ action: 'unknownAction' });
    expect(unknown.status).toBe('error');
  });

  it('authenticates via login, issues 1-hour HS256 JWT, and verifies/refreshes tokens', async () => {
    const badLogin = gas.callPost({ action: 'login', email: 'dev.snehit@gmail.com', passwordHash: 'wrong' });
    expect(badLogin.status).toBe('error');
    expect(badLogin.code).toBe('INVALID_CREDENTIALS');

    const missingLogin = gas.callPost({ action: 'login', email: 'nobody@kaatha.com', passwordHash: adminHash });
    expect(missingLogin.code).toBe('UNAUTHORIZED');

    const okLogin = gas.callPost({ action: 'login', email: 'dev.snehit@gmail.com', passwordHash: adminHash });
    expect(okLogin.status).toBe('success');
    expect(okLogin.token).toBeTruthy();
    expect(okLogin.user.role).toBe('ADMIN');

    // Tampered token rejected
    const parts = okLogin.token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.tamperedsignature`;
    const tamperedRes = gas.callPost({ action: 'refreshToken', authToken: tampered });
    expect(tamperedRes.status).toBe('error');
    expect(tamperedRes.code).toBe('UNAUTHORIZED');

    // Valid token refreshes cleanly
    const refreshRes = gas.callPost({ action: 'refreshToken', authToken: okLogin.token });
    expect(refreshRes.status).toBe('success');
    expect(refreshRes.token).toBeTruthy();

    // Unauthenticated mutation rejected even if client spoofs userRole='ADMIN'
    const unauthOrder = gas.callPost({
      action: 'saveOrder',
      userRole: 'ADMIN',
      order: { id: 'ord-unauth', orderNumber: 'ORD-0', customerId: 'c1', customerName: 'C1', customerPhone: '9876543210', orderDate: '2026-11-28', totalOuterBags: 1, totalWeightKg: 26, subtotal: 1000, discount: 0, grandTotal: 1000, paymentMode: 'CASH', status: 'PENDING_REVIEW' },
    });
    expect(unauthOrder.status).toBe('error');
    expect(unauthOrder.code).toBe('UNAUTHORIZED');
  });

  it('enforces registerUser, role re-request without password change, approveUser, createUser, forgotPassword, resetPassword, updateUser, deleteUser', async () => {
    const adminLogin = gas.callPost({ action: 'login', email: 'dev.snehit@gmail.com', passwordHash: adminHash });
    const adminToken = adminLogin.token;

    // Register new user
    const staffHash = await hashPassword('StaffPass1');
    const regRes = gas.callPost({
      action: 'registerUser',
      user: {
        id: 'u-staff-1',
        name: 'Suresh',
        email: 'suresh@kaatha.com',
        phone: '9876543210',
        role: 'STAFF',
        status: 'PENDING_APPROVAL',
        passwordHash: staffHash,
        mustResetPassword: false,
      },
      tempPassword: 'Temp123',
      resetLink: 'https://kaatha.app/reset-password/tok-1',
    });
    expect(regRes.status).toBe('success');
    // Email delivery is temporarily on hold (ENABLE_EMAIL_DELIVERY = false)
    expect(gas.sentEmails.length).toBe(0);

    // Pending user blocked from login
    const pendingLogin = gas.callPost({ action: 'login', email: 'suresh@kaatha.com', passwordHash: staffHash });
    expect(pendingLogin.code).toBe('PENDING_APPROVAL');

    // Admin approves
    const approveRes = gas.callPost({
      action: 'approveUser',
      authToken: adminToken,
      userId: 'u-staff-1',
      newStatus: 'APPROVED',
      role: 'STAFF',
    });
    expect(approveRes.status).toBe('success');

    // Existing APPROVED user submits role-change request -> keeps STAFF & passwordHash intact
    const roleChangeRes = gas.callPost({
      action: 'registerUser',
      isRoleChangeRequest: true,
      user: {
        id: 'u-staff-1',
        name: 'Suresh',
        email: 'suresh@kaatha.com',
        phone: '9876543210',
        role: 'STAFF',
        requestedRole: 'OWNER',
        requestedName: 'Suresh Owner',
      },
    });
    expect(roleChangeRes.status).toBe('success');

    const staffLoginBeforeApprove = gas.callPost({ action: 'login', email: 'suresh@kaatha.com', passwordHash: staffHash });
    expect(staffLoginBeforeApprove.user.role).toBe('STAFF');

    // Admin approves role change
    gas.callPost({
      action: 'approveUser',
      authToken: adminToken,
      userId: 'u-staff-1',
      newStatus: 'APPROVED',
      role: 'OWNER',
      name: 'Suresh Owner',
    });

    const staffLoginAfterApprove = gas.callPost({ action: 'login', email: 'suresh@kaatha.com', passwordHash: staffHash });
    expect(staffLoginAfterApprove.user.role).toBe('OWNER');
    expect(staffLoginAfterApprove.user.name).toBe('Suresh Owner');

    // Admin createUser + forgotPassword + resetPassword
    const createRes = gas.callPost({
      action: 'createUser',
      authToken: adminToken,
      user: { id: 'u-cust-1', name: 'Raju', email: 'raju@kaatha.com', phone: '9876543211', role: 'CUSTOMER', passwordHash: staffHash },
      tempPassword: 'TempRaju1',
      resetLink: 'https://kaatha.app/reset-password/tok-2',
    });
    expect(createRes.status).toBe('success');

    const mustResetLogin = gas.callPost({ action: 'login', email: 'raju@kaatha.com', passwordHash: staffHash });
    expect(mustResetLogin.mustResetPassword).toBe(true);

    const newRajuHash = await hashPassword('RajuPerm99');
    gas.callPost({ action: 'resetPassword', email: 'raju@kaatha.com', newPasswordHash: newRajuHash });
    const rajuLogin = gas.callPost({ action: 'login', email: 'raju@kaatha.com', passwordHash: newRajuHash });
    expect(rajuLogin.status).toBe('success');
    expect(rajuLogin.token).toBeTruthy();

    // Customer role cannot create users (derives CUSTOMER from JWT even if client spoofs userRole='ADMIN')
    const forbiddenCreate = gas.callPost({
      action: 'createUser',
      authToken: rajuLogin.token,
      userRole: 'ADMIN',
      user: { id: 'u-x', name: 'X', email: 'x@kaatha.com', phone: '9876543299', role: 'ADMIN' },
    });
    expect(forbiddenCreate.status).toBe('error');
    expect(forbiddenCreate.message).toContain('Permission denied');

    // Update and delete user as admin
    expect(gas.callPost({ action: 'updateUser', authToken: adminToken, userId: 'u-cust-1', name: 'Raju G', role: 'CUSTOMER', status: 'APPROVED' }).status).toBe('success');
    expect(gas.callPost({ action: 'deleteUser', authToken: adminToken, userId: 'u-cust-1' }).status).toBe('success');
  });

  it('executes full CRUD for orders, products, customers, suppliers, rolePermissions, and syncAll with JWT enforcement', () => {
    const adminToken = gas.callPost({ action: 'login', email: 'dev.snehit@gmail.com', passwordHash: adminHash }).token;

    expect(gas.callPost({
      action: 'saveProduct',
      authToken: adminToken,
      product: { id: 'p1', name: 'Sona Masoori', category: 'Rice', innerBagWeightKg: 26, innerBagsPerOuter: 1, outerBagTotalKg: 26, stockPhysicalOuter: 100, stockReservedOuter: 0, wholesalePriceBag: 1200, costPricePerBag: 1000, retailPriceBag: 1350 },
    }).status).toBe('success');

    expect(gas.callPost({
      action: 'saveCustomer',
      authToken: adminToken,
      customer: { id: 'c1', name: 'Lakshmi Traders', phone: '9876543212', currentDue: 5000 },
    }).status).toBe('success');

    expect(gas.callPost({
      action: 'saveSupplier',
      authToken: adminToken,
      supplier: { id: 's1', businessName: 'Sri Sai Mill', bankName: 'SBI', accountNumber: '12345', ifscCode: 'SBIN0001', nickname: 'SaiMill' },
    }).status).toBe('success');

    expect(gas.callPost({
      action: 'saveOrder',
      authToken: adminToken,
      order: { id: 'o1', orderNumber: 'ORD-101', customerId: 'c1', customerName: 'Lakshmi Traders', customerPhone: '9876543212', orderDate: '2026-11-28', totalOuterBags: 10, totalWeightKg: 260, subtotal: 12000, discount: 0, grandTotal: 12000, paymentMode: 'CASH', status: 'PENDING_REVIEW' },
    }).status).toBe('success');

    expect(gas.callPost({ action: 'updateOrderStatus', authToken: adminToken, orderId: 'o1', newStatus: 'APPROVED' }).status).toBe('success');
    expect(gas.callPost({ action: 'deleteOrder', authToken: adminToken, orderId: 'o1' }).status).toBe('success');
    expect(gas.callPost({ action: 'deleteProduct', authToken: adminToken, productId: 'p1' }).status).toBe('success');
    expect(gas.callPost({ action: 'deleteCustomer', authToken: adminToken, customerId: 'c1' }).status).toBe('success');
    expect(gas.callPost({ action: 'deleteSupplier', authToken: adminToken, supplierId: 's1' }).status).toBe('success');

    expect(gas.callPost({
      action: 'saveRolePermissions',
      authToken: adminToken,
      role: 'STAFF',
      config: { orders_page: { enabled: true, functionalities: { view_orders: true } } },
    }).status).toBe('success');
  });

  it('holds outbound email delivery when ENABLE_EMAIL_DELIVERY is false while still generating reset links', () => {
    const adminToken = gas.callPost({ action: 'login', email: 'dev.snehit@gmail.com', passwordHash: adminHash }).token;
    const beforeCount = gas.sentEmails.length;

    const reg = gas.callPost({
      action: 'registerUser',
      user: {
        id: 'u-hold-1',
        name: 'Hold User',
        email: 'hold@kaatha.com',
        phone: '9988776611',
        role: 'STAFF',
        status: 'PENDING_APPROVAL',
        resetPasswordToken: 'rst-hold-1',
      },
      resetLink: 'https://kaatha.app/reset-password/rst-hold-1',
    });
    expect(reg.status).toBe('success');

    const forgot = gas.callPost({
      action: 'forgotPassword',
      email: 'hold@kaatha.com',
      resetToken: 'rst-hold-2',
      resetLink: 'https://kaatha.app/reset-password/rst-hold-2',
    });
    expect(forgot.status).toBe('success');

    const created = gas.callPost({
      action: 'createUser',
      authToken: adminToken,
      user: { id: 'u-hold-2', name: 'Hold Admin Created', email: 'hold2@kaatha.com', phone: '9988776622', role: 'CUSTOMER' },
      tempPasswordHash: 'hash-123',
      tempPasswordPlain: 'TempPass123',
    });
    expect(created.status).toBe('success');
    expect(gas.sentEmails.length).toBe(beforeCount);
  });
});
