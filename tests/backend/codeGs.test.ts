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
    const regUserId = regRes.userId;
    const approveRes = gas.callPost({
      action: 'approveUser',
      authToken: adminToken,
      userId: regUserId,
      newStatus: 'APPROVED',
      role: 'STAFF',
    });
    expect(approveRes.status).toBe('success');

    // Existing APPROVED user submits role-change request -> keeps STAFF & passwordHash intact
    const roleChangeRes = gas.callPost({
      action: 'registerUser',
      isRoleChangeRequest: true,
      user: {
        id: regUserId,
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
      userId: regUserId,
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
    const createdUserId = createRes.userId;

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
    expect(forbiddenCreate.code).toBe('FORBIDDEN');
    expect(forbiddenCreate.message).toContain('Permission denied');

    // Update and delete user as admin
    expect(gas.callPost({ action: 'updateUser', authToken: adminToken, userId: createdUserId, name: 'Raju G', role: 'CUSTOMER', status: 'APPROVED' }).status).toBe('success');
    expect(gas.callPost({ action: 'deleteUser', authToken: adminToken, userId: createdUserId }).status).toBe('success');
  });

  it('executes full CRUD for orders, products, customers, suppliers, rolePermissions, and syncAll with JWT enforcement', () => {
    const adminToken = gas.callPost({ action: 'login', email: 'dev.snehit@gmail.com', passwordHash: adminHash }).token;

    const prodRes = gas.callPost({
      action: 'saveProduct',
      authToken: adminToken,
      product: { name: 'Sona Masoori', brandOrMill: 'Kaveri', category: 'Rice', innerBagWeightKg: 26, innerBagsPerOuter: 1, outerBagTotalKg: 26, stockPhysicalOuter: 100, stockReservedOuter: 0, wholesalePriceBag: 1200, costPricePerBag: 1000, retailPriceBag: 1350 },
    });
    expect(prodRes.status).toBe('success');
    expect(prodRes.id).toBeTruthy();
    expect(prodRes.version).toBe(1);

    const custRes = gas.callPost({
      action: 'saveCustomer',
      authToken: adminToken,
      customer: { name: 'Lakshmi Traders', phone: '9876543212', currentDue: 5000 },
    });
    expect(custRes.status).toBe('success');

    const suppRes = gas.callPost({
      action: 'saveSupplier',
      authToken: adminToken,
      supplier: { businessName: 'Sri Sai Mill', bankName: 'SBI', accountNumber: '12345', ifscCode: 'SBIN0001', nickname: 'SaiMill' },
    });
    expect(suppRes.status).toBe('success');

    const orderRes = gas.callPost({
      action: 'saveOrder',
      authToken: adminToken,
      order: { customerId: custRes.id, customerName: 'Lakshmi Traders', customerPhone: '9876543212', orderDate: '2026-11-28', totalOuterBags: 10, totalWeightKg: 260, subtotal: 12000, discount: 0, grandTotal: 12000, paymentMode: 'CASH', status: 'PENDING_REVIEW' },
    });
    expect(orderRes.status).toBe('success');
    expect(orderRes.orderNumber).toMatch(/^ORD-\d{4}-0001$/);

    expect(gas.callPost({ action: 'updateOrderStatus', authToken: adminToken, orderId: orderRes.id, newStatus: 'APPROVED' }).status).toBe('success');
    expect(gas.callPost({ action: 'deleteOrder', authToken: adminToken, orderId: orderRes.id }).status).toBe('success');
    expect(gas.callPost({ action: 'deleteProduct', authToken: adminToken, productId: prodRes.id }).status).toBe('success');
    expect(gas.callPost({ action: 'deleteCustomer', authToken: adminToken, customerId: custRes.id }).status).toBe('success');
    expect(gas.callPost({ action: 'deleteSupplier', authToken: adminToken, supplierId: suppRes.id }).status).toBe('success');

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

  it('enforces Repository locking, DUPLICATE_KEY, FOREIGN_KEY_VIOLATION, CHECK_CONSTRAINT_FAILED, CONFLICT_STALE_VERSION, and indexed query pagination', () => {
    const adminToken = gas.callPost({ action: 'login', email: 'dev.snehit@gmail.com', passwordHash: adminHash }).token;

    // 1. CHECK constraints
    const badProd = gas.callPost({
      action: 'saveProduct',
      authToken: adminToken,
      product: { name: 'Bad Rice', brandOrMill: 'MillX', category: 'Rice', innerBagWeightKg: 25, innerBagsPerOuter: 1, outerBagTotalKg: 25, stockPhysicalOuter: 5, stockReservedOuter: 10, wholesalePriceBag: 1200, costPricePerBag: 1000 },
    });
    expect(badProd.status).toBe('error');
    expect(badProd.code).toBe('CHECK_CONSTRAINT_FAILED');

    const badPricing = gas.callPost({
      action: 'saveProduct',
      authToken: adminToken,
      product: { name: 'Bad Price', brandOrMill: 'MillX', category: 'Rice', innerBagWeightKg: 25, innerBagsPerOuter: 1, outerBagTotalKg: 25, stockPhysicalOuter: 10, stockReservedOuter: 0, wholesalePriceBag: 900, costPricePerBag: 1000 },
    });
    expect(badPricing.code).toBe('CHECK_CONSTRAINT_FAILED');

    const badDue = gas.callPost({
      action: 'saveCustomer',
      authToken: adminToken,
      customer: { name: 'Neg Customer', phone: '9000011111', currentDue: -100 },
    });
    expect(badDue.code).toBe('CHECK_CONSTRAINT_FAILED');

    // 2. Insert valid Customer, Supplier, Product
    const cust = gas.callPost({
      action: 'saveCustomer',
      authToken: adminToken,
      customer: { name: 'Valid Cust', phone: '9000022222', currentDue: 100 },
    });
    expect(cust.status).toBe('success');

    // Duplicate phone UK -> DUPLICATE_KEY
    const dupCust = gas.callPost({
      action: 'saveCustomer',
      authToken: adminToken,
      customer: { name: 'Dup Cust', phone: '+91 9000022222', currentDue: 0 },
    });
    expect(dupCust.status).toBe('error');
    expect(dupCust.code).toBe('DUPLICATE_KEY');

    // 3. Optimistic concurrency CONFLICT_STALE_VERSION
    const upd1 = gas.callPost({
      action: 'saveCustomer',
      authToken: adminToken,
      customer: { id: cust.id, name: 'Valid Cust v2', phone: '9000022222', currentDue: 200, version: 1 },
    });
    expect(upd1.status).toBe('success');
    expect(upd1.version).toBe(2);

    const staleUpd = gas.callPost({
      action: 'saveCustomer',
      authToken: adminToken,
      customer: { id: cust.id, name: 'Stale Write', phone: '9000022222', currentDue: 300, version: 1 },
    });
    expect(staleUpd.status).toBe('error');
    expect(staleUpd.code).toBe('CONFLICT_STALE_VERSION');

    // 4. Foreign key validation & delete protection (FOREIGN_KEY_VIOLATION)
    const orphanOrder = gas.callPost({
      action: 'saveOrder',
      authToken: adminToken,
      order: { customerId: 'non-existent-cust', customerName: 'Ghost', grandTotal: 500, status: 'PENDING_REVIEW' },
    });
    expect(orphanOrder.status).toBe('error');
    expect(orphanOrder.code).toBe('FOREIGN_KEY_VIOLATION');

    const validOrder = gas.callPost({
      action: 'saveOrder',
      authToken: adminToken,
      order: { customerId: cust.id, customerName: 'Valid Cust v2', totalOuterBags: 5, grandTotal: 5000, status: 'PENDING_REVIEW' },
    });
    expect(validOrder.status).toBe('success');
    expect(validOrder.orderNumber).toMatch(/^ORD-\d{4}-0001$/);

    // Deleting customer referenced by active order must fail with FOREIGN_KEY_VIOLATION
    const blockedDelete = gas.callPost({ action: 'deleteCustomer', authToken: adminToken, customerId: cust.id });
    expect(blockedDelete.status).toBe('error');
    expect(blockedDelete.code).toBe('FOREIGN_KEY_VIOLATION');

    // Invalid state transition DELIVERED -> PENDING_REVIEW
    expect(gas.callPost({ action: 'updateOrderStatus', authToken: adminToken, orderId: validOrder.id, newStatus: 'DELIVERED' }).status).toBe('success');
    const badTransition = gas.callPost({ action: 'updateOrderStatus', authToken: adminToken, orderId: validOrder.id, newStatus: 'PENDING_REVIEW' });
    expect(badTransition.status).toBe('error');
    expect(badTransition.code).toBe('CHECK_CONSTRAINT_FAILED');

    // 5. Purchase sequential number PUR-YYYY-0001 & Supplier FK
    const supp = gas.callPost({
      action: 'saveSupplier',
      authToken: adminToken,
      supplier: { businessName: 'Godavari Mill', bankName: 'HDFC', accountNumber: '998877', ifscCode: 'HDFC0001', nickname: 'Goda' },
    });
    const pur = gas.callPost({
      action: 'savePurchase',
      authToken: adminToken,
      purchase: { supplierId: supp.id, totalBags: 50, grandTotal: 50000, referenceBill: 'BILL-1' },
    });
    expect(pur.status).toBe('success');
    expect(pur.purchaseNumber).toMatch(/^PUR-\d{4}-0001$/);

    // 6. Indexed query & pagination
    gas.callPost({ action: 'saveCustomer', authToken: adminToken, customer: { name: 'Alpha', phone: '9000033333', currentDue: 10 } });
    gas.callPost({ action: 'saveCustomer', authToken: adminToken, customer: { name: 'Beta', phone: '9000044444', currentDue: 20 } });
    const paged = gas.callPost({
      action: 'query',
      authToken: adminToken,
      table: 'Master_Customers',
      sortBy: 'name_en',
      sortDir: 'asc',
      limit: 2,
      offset: 1,
    });
    expect(paged.status).toBe('success');
    expect(paged.total).toBe(3);
    expect(paged.rows.length).toBe(2);

    // 7. LockService concurrency check: every lock acquired was released
    expect(gas.lockStats.acquisitions).toBeGreaterThan(0);
    expect(gas.lockStats.acquisitions).toBe(gas.lockStats.releases);
    expect(gas.lockStats.currentlyLocked).toBe(false);
  });
});
