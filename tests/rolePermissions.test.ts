import { describe, it, expect, beforeEach } from 'vitest';
import { 
  DEFAULT_ROLE_PERMISSIONS, 
  PERMISSION_PAGES_META, 
  isPageEnabled, 
  isFunctionalityEnabled, 
  mergeWithDefaultPermissions 
} from '../src/lib/permissions';
import { useAppStore } from '../src/store/useAppStore';
import { Role, RolePermissionsConfig } from '../src/contracts';

describe('Role Specific Permissions & Access Governance', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store state
    useAppStore.setState({
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
      currentUser: null,
      isAuthenticated: false,
    });
  });

  describe('PERMISSION_PAGES_META and DEFAULT_ROLE_PERMISSIONS matrix', () => {
    it('defines metadata for all core application modules', () => {
      const pageKeys = PERMISSION_PAGES_META.map((p) => p.key);
      expect(pageKeys).toContain('dashboard_page');
      expect(pageKeys).toContain('orders_page');
      expect(pageKeys).toContain('stock_page');
      expect(pageKeys).toContain('customers_page');
      expect(pageKeys).toContain('suppliers_page');
      expect(pageKeys).toContain('reports_page');
      expect(pageKeys).toContain('user_management_page');
    });

    it('contains default configurations for all 4 roles', () => {
      const roles: Role[] = ['ADMIN', 'OWNER', 'STAFF', 'CUSTOMER'];
      roles.forEach((r) => {
        expect(DEFAULT_ROLE_PERMISSIONS[r]).toBeDefined();
        expect(DEFAULT_ROLE_PERMISSIONS[r].orders_page).toBeDefined();
        expect(DEFAULT_ROLE_PERMISSIONS[r].orders_page.functionalities).toBeDefined();
      });
    });

    it('grants OWNER and ADMIN full access by default', () => {
      expect(isPageEnabled(DEFAULT_ROLE_PERMISSIONS, 'OWNER', 'orders_page')).toBe(true);
      expect(isFunctionalityEnabled(DEFAULT_ROLE_PERMISSIONS, 'OWNER', 'orders_page', 'delete_order')).toBe(true);
      expect(isPageEnabled(DEFAULT_ROLE_PERMISSIONS, 'ADMIN', 'user_management_page')).toBe(true);
      expect(isFunctionalityEnabled(DEFAULT_ROLE_PERMISSIONS, 'ADMIN', 'user_management_page', 'approve_user')).toBe(true);
    });

    it('restricts CUSTOMER from admin and delete actions by default', () => {
      expect(isPageEnabled(DEFAULT_ROLE_PERMISSIONS, 'CUSTOMER', 'user_management_page')).toBe(false);
      expect(isFunctionalityEnabled(DEFAULT_ROLE_PERMISSIONS, 'CUSTOMER', 'user_management_page', 'approve_user')).toBe(false);
      expect(isFunctionalityEnabled(DEFAULT_ROLE_PERMISSIONS, 'CUSTOMER', 'orders_page', 'delete_order')).toBe(false);
      expect(isFunctionalityEnabled(DEFAULT_ROLE_PERMISSIONS, 'CUSTOMER', 'orders_page', 'view_orders')).toBe(true);
    });
  });

  describe('isPageEnabled & isFunctionalityEnabled evaluation', () => {
    it('returns false for unknown role or null user', () => {
      expect(isPageEnabled(DEFAULT_ROLE_PERMISSIONS, undefined, 'orders_page')).toBe(false);
      expect(isFunctionalityEnabled(DEFAULT_ROLE_PERMISSIONS, undefined, 'orders_page', 'view_orders')).toBe(false);
    });

    it('returns false for functionality when parent page is disabled', () => {
      const customConfig: RolePermissionsConfig = {
        ...DEFAULT_ROLE_PERMISSIONS,
        STAFF: {
          ...DEFAULT_ROLE_PERMISSIONS.STAFF,
          orders_page: {
            enabled: false,
            functionalities: {
              view_orders: true,
              create_order: true,
            },
          },
        },
      };

      expect(isPageEnabled(customConfig, 'STAFF', 'orders_page')).toBe(false);
      // Even if view_orders is true, since page is disabled, it must evaluate to false
      expect(isFunctionalityEnabled(customConfig, 'STAFF', 'orders_page', 'view_orders')).toBe(false);
    });

    it('returns true when both parent page and functionality are enabled', () => {
      const customConfig: RolePermissionsConfig = {
        ...DEFAULT_ROLE_PERMISSIONS,
        STAFF: {
          ...DEFAULT_ROLE_PERMISSIONS.STAFF,
          orders_page: {
            enabled: true,
            functionalities: {
              view_orders: true,
              delete_order: false,
            },
          },
        },
      };

      expect(isFunctionalityEnabled(customConfig, 'STAFF', 'orders_page', 'view_orders')).toBe(true);
      expect(isFunctionalityEnabled(customConfig, 'STAFF', 'orders_page', 'delete_order')).toBe(false);
    });
  });

  describe('mergeWithDefaultPermissions', () => {
    it('safely hydrates partial or empty stored configurations with defaults', () => {
      const partial = {
        STAFF: {
          orders_page: {
            enabled: true,
            functionalities: {
              delete_order: true,
            },
          },
        },
      };

      const merged = mergeWithDefaultPermissions(partial);
      // Preserves the overridden flag
      expect(merged.STAFF.orders_page.functionalities.delete_order).toBe(true);
      // Hydrates missing functionalities from defaults
      expect(merged.STAFF.orders_page.functionalities.view_orders).toBe(true);
      // Hydrates missing pages from defaults
      expect(merged.STAFF.stock_page).toBeDefined();
      expect(merged.OWNER).toBeDefined();
    });
  });

  describe('Store permission helpers', () => {
    it('dynamically responds to store updateRolePermissions calls', async () => {
      useAppStore.setState({
        currentUser: {
          id: 'u-admin-test',
          name: 'Active Admin',
          email: 'admin@kaatha.internal',
          phone: '9848011223',
          role: 'ADMIN',
          status: 'APPROVED',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      });

      const store = useAppStore.getState();
      expect(store.hasFunctionalityAccess('orders_page', 'delete_order')).toBe(true);

      // Disable delete_order functionality for ADMIN
      const adminConfig = { ...store.rolePermissions.ADMIN };
      adminConfig.orders_page = {
        ...adminConfig.orders_page,
        functionalities: {
          ...adminConfig.orders_page.functionalities,
          delete_order: false,
        },
      };

      await store.updateRolePermissions('ADMIN', adminConfig);

      // Access must now evaluate to false immediately
      const updatedStore = useAppStore.getState();
      expect(updatedStore.hasFunctionalityAccess('orders_page', 'delete_order')).toBe(false);
      // Other functionalities remain enabled
      expect(updatedStore.hasFunctionalityAccess('orders_page', 'view_orders')).toBe(true);
    });

    it('properly guards page access when whole module is disabled', async () => {
      useAppStore.setState({
        currentUser: {
          id: 'u-staff-test',
          name: 'Active Staff',
          email: 'staff@kaatha.internal',
          phone: '9848099887',
          role: 'STAFF',
          status: 'APPROVED',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      });

      const store = useAppStore.getState();
      expect(store.hasPageAccess('suppliers_page')).toBe(true);

      const staffConfig = { ...store.rolePermissions.STAFF };
      staffConfig.suppliers_page = {
        ...staffConfig.suppliers_page,
        enabled: false,
      };

      await store.updateRolePermissions('STAFF', staffConfig);

      const updatedStore = useAppStore.getState();
      expect(updatedStore.hasPageAccess('suppliers_page')).toBe(false);
      expect(updatedStore.hasFunctionalityAccess('suppliers_page', 'view_suppliers')).toBe(false);
    }, 15000);

    it('creates active user in store with temporary password and reset link', async () => {
      const store = useAppStore.getState();
      const res = await store.createUser({
        name: 'New Miller Staff',
        email: 'staff.miller@kaatha.internal',
        phone: '9848099112',
        role: 'STAFF',
      });

      expect(res.success).toBe(true);
      expect(res.user).toBeDefined();
      expect(res.user?.status).toBe('APPROVED');
      expect(res.user?.mustResetPassword).toBe(true);
      expect(res.tempPassword).toBeDefined();
      expect(res.tempPassword).toMatch(/^Kaatha@\d{4}$/);
      expect(res.resetLink).toBeDefined();
      expect(res.resetLink).toContain('/reset-password/rst-');

      // Verify user in store state
      const stateUsers = useAppStore.getState().users;
      const created = stateUsers.find((u) => u.email === 'staff.miller@kaatha.internal');
      expect(created).toBeDefined();
      expect(created?.passwordHash).toBeDefined();
    });
  });
});
