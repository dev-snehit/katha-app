import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  parseRoute, 
  parseQueryParams, 
  navigate, 
  goBack, 
  getIntendedRoute, 
  setIntendedRoute, 
  clearIntendedRoute, 
  updateDocumentTitle 
} from '../src/lib/router';

describe('Router & Deep Linking Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  describe('Route Parsing', () => {
    it('defaults to /orders when hash is empty or root', () => {
      expect(parseRoute('')).toMatchObject({
        path: '/orders',
        view: 'orders',
        subView: null,
        paramId: null,
        isModalOpen: false
      });

      expect(parseRoute('#')).toMatchObject({
        path: '/orders',
        view: 'orders',
        subView: null,
        paramId: null,
        isModalOpen: false
      });

      expect(parseRoute('#/')).toMatchObject({
        path: '/orders',
        view: 'orders',
        subView: null,
        paramId: null,
        isModalOpen: false
      });
    });

    it('parses orders view and modal sub-routes correctly', () => {
      const ordersRoute = parseRoute('#/orders');
      expect(ordersRoute.view).toBe('orders');
      expect(ordersRoute.subView).toBeNull();
      expect(ordersRoute.isModalOpen).toBe(false);

      const newOrderRoute = parseRoute('#/orders/new');
      expect(newOrderRoute.view).toBe('orders');
      expect(newOrderRoute.subView).toBe('new');
      expect(newOrderRoute.isModalOpen).toBe(true);

      const editOrderRoute = parseRoute('#/orders/edit/ORD-2025-001');
      expect(editOrderRoute.view).toBe('orders');
      expect(editOrderRoute.subView).toBe('edit');
      expect(editOrderRoute.paramId).toBe('ORD-2025-001');
      expect(editOrderRoute.isModalOpen).toBe(true);
    });

    it('parses stock registry view and commodity modals correctly', () => {
      const stockRoute = parseRoute('#/stock');
      expect(stockRoute.view).toBe('stock');
      expect(stockRoute.subView).toBeNull();

      const newStockRoute = parseRoute('#/stock/new');
      expect(newStockRoute.view).toBe('stock');
      expect(newStockRoute.subView).toBe('new');
      expect(newStockRoute.isModalOpen).toBe(true);

      const editStockRoute = parseRoute('#/stock/edit/PRD-RICE-01');
      expect(editStockRoute.view).toBe('stock');
      expect(editStockRoute.subView).toBe('edit');
      expect(editStockRoute.paramId).toBe('PRD-RICE-01');
      expect(editStockRoute.isModalOpen).toBe(true);
    });

    it('parses customer directory and customer modals correctly', () => {
      const custRoute = parseRoute('#/customers');
      expect(custRoute.view).toBe('customers');

      const newCustRoute = parseRoute('#/customers/new');
      expect(newCustRoute.view).toBe('customers');
      expect(newCustRoute.subView).toBe('new');
      expect(newCustRoute.isModalOpen).toBe(true);

      const editCustRoute = parseRoute('#/customers/edit/CUST-77');
      expect(editCustRoute.view).toBe('customers');
      expect(editCustRoute.subView).toBe('edit');
      expect(editCustRoute.paramId).toBe('CUST-77');
      expect(editCustRoute.isModalOpen).toBe(true);
    });

    it('parses supplier directory and supplier modals correctly', () => {
      const supRoute = parseRoute('#/suppliers');
      expect(supRoute.view).toBe('suppliers');

      const newSupRoute = parseRoute('#/suppliers/new');
      expect(newSupRoute.view).toBe('suppliers');
      expect(newSupRoute.subView).toBe('new');
      expect(newSupRoute.isModalOpen).toBe(true);

      const editSupRoute = parseRoute('#/suppliers/edit/SUP-88');
      expect(editSupRoute.view).toBe('suppliers');
      expect(editSupRoute.subView).toBe('edit');
      expect(editSupRoute.paramId).toBe('SUP-88');
      expect(editSupRoute.isModalOpen).toBe(true);
    });

    it('parses export center and settings routes correctly', () => {
      const exportRoute = parseRoute('#/exports');
      expect(exportRoute.view).toBe('exports');

      const settingsRoute = parseRoute('#/settings');
      expect(settingsRoute.view).toBe('settings');
    });

    it('parses admin user management and new user simulation route correctly', () => {
      const adminRoute = parseRoute('#/admin');
      expect(adminRoute.view).toBe('admin');
      expect(adminRoute.isModalOpen).toBe(false);

      const adminNewUserRoute = parseRoute('#/admin/new-user');
      expect(adminNewUserRoute.view).toBe('admin');
      expect(adminNewUserRoute.subView).toBe('new-user');
      expect(adminNewUserRoute.isModalOpen).toBe(true);
    });

    it('parses auth views and reset password tokens correctly', () => {
      expect(parseRoute('#/login')).toMatchObject({ view: 'auth', subView: 'login' });
      expect(parseRoute('#/register')).toMatchObject({ view: 'auth', subView: 'register' });
      expect(parseRoute('#/forgot-password')).toMatchObject({ view: 'auth', subView: 'forgot' });

      const resetRoute = parseRoute('#/reset-password?token=unique-token-abc');
      expect(resetRoute.view).toBe('auth');
      expect(resetRoute.subView).toBe('reset');
      expect(resetRoute.queryParams.token).toBe('unique-token-abc');

      const resetRouteWithParam = parseRoute('#/reset-password/tok-12345');
      expect(resetRouteWithParam.view).toBe('auth');
      expect(resetRouteWithParam.subView).toBe('reset');
      expect(resetRouteWithParam.paramId).toBe('tok-12345');
    });

    it('normalizes direct pathnames into valid hash routes', () => {
      expect(parseRoute('/stock/new')).toMatchObject({
        view: 'stock',
        subView: 'new',
        isModalOpen: true
      });

      expect(parseRoute('/katha-app/customers/new')).toMatchObject({
        view: 'customers',
        subView: 'new',
        isModalOpen: true
      });
    });
  });

  describe('Query Parameters Parsing', () => {
    it('parses query string key-values accurately', () => {
      expect(parseQueryParams('')).toEqual({});
      expect(parseQueryParams('?token=abc&source=email')).toEqual({
        token: 'abc',
        source: 'email'
      });
      expect(parseQueryParams('filter=rice&page=2')).toEqual({
        filter: 'rice',
        page: '2'
      });
    });
  });

  describe('Programmatic Navigation', () => {
    it('updates window.location.hash on navigate', () => {
      navigate('/stock/new');
      expect(window.location.hash).toBe('#/stock/new');

      navigate('/orders/edit/ORD-101');
      expect(window.location.hash).toBe('#/orders/edit/ORD-101');
    });

    it('dispatches custom event on navigate for instant reactivity', () => {
      const listener = vi.fn();
      window.addEventListener('katha:route-change', listener);

      navigate('/customers');
      expect(listener).toHaveBeenCalled();

      window.removeEventListener('katha:route-change', listener);
    });

    it('goBack falls back to fallback path if history length <= 1', () => {
      vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
      goBack('/orders');
      expect(window.location.hash).toBe('#/orders');
    });
  });

  describe('Intended Route Persistence for Re-login', () => {
    it('stores, retrieves, and clears intended route across sessions', () => {
      expect(getIntendedRoute()).toBeNull();

      setIntendedRoute('#/stock/new');
      expect(getIntendedRoute()).toBe('#/stock/new');

      clearIntendedRoute();
      expect(getIntendedRoute()).toBeNull();
    });
  });

  describe('Document Title Localization', () => {
    it('updates document.title for English and Telugu routes', () => {
      const orderRoute = parseRoute('#/orders');
      updateDocumentTitle(orderRoute, 'EN');
      expect(document.title).toContain('Katha CRM');
      expect(document.title).toContain('Orders Yet to Deliver');

      updateDocumentTitle(orderRoute, 'TE');
      expect(document.title).toContain('కథా CRM');
      expect(document.title).toContain('పెండింగ్ ఆర్డర్లు');

      const newOrderRoute = parseRoute('#/orders/new');
      updateDocumentTitle(newOrderRoute, 'EN');
      expect(document.title).toContain('Place Order');

      const stockEditRoute = parseRoute('#/stock/edit/PRD-1');
      updateDocumentTitle(stockEditRoute, 'EN');
      expect(document.title).toContain('Edit Commodity');

      const authResetRoute = parseRoute('#/reset-password');
      updateDocumentTitle(authResetRoute, 'EN');
      expect(document.title).toContain('Reset Password');
    });
  });
});
