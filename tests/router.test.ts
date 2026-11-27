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

describe('Router & Deep Linking Suite (Pure Slash Path Routing)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    window.location.hash = '';
    window.history.replaceState({}, '', '/');
  });

  describe('Route Parsing (Clean Slash Paths & Route Params)', () => {
    it('defaults to /orders when path is empty or root', () => {
      expect(parseRoute('')).toMatchObject({
        path: '/orders',
        view: 'orders',
        subView: null,
        paramId: null,
        isModalOpen: false
      });

      expect(parseRoute('/')).toMatchObject({
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

    it('parses orders view, /orders/:orderid param, and new order modal sub-route', () => {
      const ordersRoute = parseRoute('/orders');
      expect(ordersRoute.view).toBe('orders');
      expect(ordersRoute.subView).toBeNull();
      expect(ordersRoute.isModalOpen).toBe(false);

      const newOrderRoute = parseRoute('/orders/new');
      expect(newOrderRoute.view).toBe('orders');
      expect(newOrderRoute.subView).toBe('new');
      expect(newOrderRoute.isModalOpen).toBe(true);

      // Direct REST-style route param: /orders/:orderid
      const directParamRoute = parseRoute('/orders/ORD-2025-001');
      expect(directParamRoute.view).toBe('orders');
      expect(directParamRoute.subView).toBe('edit');
      expect(directParamRoute.paramId).toBe('ORD-2025-001');
      expect(directParamRoute.isModalOpen).toBe(true);

      // Explicit edit route: /orders/edit/:orderid
      const explicitEditRoute = parseRoute('/orders/edit/ORD-2025-001');
      expect(explicitEditRoute.view).toBe('orders');
      expect(explicitEditRoute.subView).toBe('edit');
      expect(explicitEditRoute.paramId).toBe('ORD-2025-001');
      expect(explicitEditRoute.isModalOpen).toBe(true);
    });

    it('parses stock registry view, /stock/:productid param, and commodity modals', () => {
      const stockRoute = parseRoute('/stock');
      expect(stockRoute.view).toBe('stock');
      expect(stockRoute.subView).toBeNull();

      const newStockRoute = parseRoute('/stock/new');
      expect(newStockRoute.view).toBe('stock');
      expect(newStockRoute.subView).toBe('new');
      expect(newStockRoute.isModalOpen).toBe(true);

      // Direct REST-style route param: /stock/:productid
      const directParamStock = parseRoute('/stock/PRD-RICE-01');
      expect(directParamStock.view).toBe('stock');
      expect(directParamStock.subView).toBe('edit');
      expect(directParamStock.paramId).toBe('PRD-RICE-01');
      expect(directParamStock.isModalOpen).toBe(true);

      const editStockRoute = parseRoute('/stock/edit/PRD-RICE-01');
      expect(editStockRoute.view).toBe('stock');
      expect(editStockRoute.subView).toBe('edit');
      expect(editStockRoute.paramId).toBe('PRD-RICE-01');
      expect(editStockRoute.isModalOpen).toBe(true);
    });

    it('parses customer directory and /customers/:customerid route params', () => {
      const custRoute = parseRoute('/customers');
      expect(custRoute.view).toBe('customers');

      const newCustRoute = parseRoute('/customers/new');
      expect(newCustRoute.view).toBe('customers');
      expect(newCustRoute.subView).toBe('new');
      expect(newCustRoute.isModalOpen).toBe(true);

      // Direct route param: /customers/:customerid
      const directCustRoute = parseRoute('/customers/CUST-77');
      expect(directCustRoute.view).toBe('customers');
      expect(directCustRoute.subView).toBe('edit');
      expect(directCustRoute.paramId).toBe('CUST-77');
      expect(directCustRoute.isModalOpen).toBe(true);
    });

    it('parses supplier directory and /suppliers/:supplierid route params', () => {
      const supRoute = parseRoute('/suppliers');
      expect(supRoute.view).toBe('suppliers');

      const newSupRoute = parseRoute('/suppliers/new');
      expect(newSupRoute.view).toBe('suppliers');
      expect(newSupRoute.subView).toBe('new');
      expect(newSupRoute.isModalOpen).toBe(true);

      // Direct route param: /suppliers/:supplierid
      const directSupRoute = parseRoute('/suppliers/SUP-88');
      expect(directSupRoute.view).toBe('suppliers');
      expect(directSupRoute.subView).toBe('edit');
      expect(directSupRoute.paramId).toBe('SUP-88');
      expect(directSupRoute.isModalOpen).toBe(true);
    });

    it('parses export center and settings routes correctly', () => {
      const exportRoute = parseRoute('/exports');
      expect(exportRoute.view).toBe('exports');

      const settingsRoute = parseRoute('/settings');
      expect(settingsRoute.view).toBe('settings');
    });

    it('parses admin user management and new user modal sub-route', () => {
      const adminRoute = parseRoute('/admin');
      expect(adminRoute.view).toBe('admin');
      expect(adminRoute.isModalOpen).toBe(false);

      const adminNewUserRoute = parseRoute('/admin/new-user');
      expect(adminNewUserRoute.view).toBe('admin');
      expect(adminNewUserRoute.subView).toBe('new-user');
      expect(adminNewUserRoute.isModalOpen).toBe(true);
    });

    it('parses auth views and reset password tokens via query params and route params', () => {
      expect(parseRoute('/login')).toMatchObject({ view: 'auth', subView: 'login' });
      expect(parseRoute('/register')).toMatchObject({ view: 'auth', subView: 'register' });
      expect(parseRoute('/forgot-password')).toMatchObject({ view: 'auth', subView: 'forgot' });

      const resetRoute = parseRoute('/reset-password?token=unique-token-abc');
      expect(resetRoute.view).toBe('auth');
      expect(resetRoute.subView).toBe('reset');
      expect(resetRoute.queryParams.token).toBe('unique-token-abc');

      const resetRouteWithParam = parseRoute('/reset-password/tok-12345');
      expect(resetRouteWithParam.view).toBe('auth');
      expect(resetRouteWithParam.subView).toBe('reset');
      expect(resetRouteWithParam.paramId).toBe('tok-12345');
    });

    it('strips base path prefixes e.g. /katha-app seamlessly', () => {
      expect(parseRoute('/katha-app/customers/new')).toMatchObject({
        view: 'customers',
        subView: 'new',
        isModalOpen: true
      });

      expect(parseRoute('/katha-app/orders/ORD-999')).toMatchObject({
        view: 'orders',
        subView: 'edit',
        paramId: 'ORD-999',
        isModalOpen: true
      });
    });

    it('backward-compatibility: migrates legacy # hash routes cleanly to canonical slash routes', () => {
      expect(parseRoute('#/orders/new')).toMatchObject({
        path: '/orders/new',
        view: 'orders',
        subView: 'new',
        isModalOpen: true
      });

      expect(parseRoute('#/stock/PRD-RICE-01')).toMatchObject({
        path: '/stock/PRD-RICE-01',
        view: 'stock',
        subView: 'edit',
        paramId: 'PRD-RICE-01'
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

  describe('Programmatic Navigation with Pure Slash Routing', () => {
    it('updates window.location.pathname on navigate with zero hash', () => {
      navigate('/stock/new');
      expect(window.location.pathname).toBe('/stock/new');
      expect(window.location.hash).toBe('');

      navigate('/orders/ORD-101');
      expect(window.location.pathname).toBe('/orders/ORD-101');
      expect(window.location.hash).toBe('');
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
      expect(window.location.pathname).toBe('/orders');
      expect(window.location.hash).toBe('');
    });
  });

  describe('Intended Route Persistence for Re-login', () => {
    it('stores, retrieves, and clears intended route across sessions without hash', () => {
      expect(getIntendedRoute()).toBeNull();

      setIntendedRoute('/stock/new');
      expect(getIntendedRoute()).toBe('/stock/new');

      // Legacy hash input is normalized to clean slash route
      setIntendedRoute('#/orders/ORD-123');
      expect(getIntendedRoute()).toBe('/orders/ORD-123');

      clearIntendedRoute();
      expect(getIntendedRoute()).toBeNull();
    });
  });

  describe('Document Title Localization', () => {
    it('updates document.title for English and Telugu routes', () => {
      const orderRoute = parseRoute('/orders');
      updateDocumentTitle(orderRoute, 'EN');
      expect(document.title).toContain('Kaatha CRM');
      expect(document.title).toContain('Orders Yet to Deliver');

      updateDocumentTitle(orderRoute, 'TE');
      expect(document.title).toContain('కాతా CRM');
      expect(document.title).toContain('పెండింగ్ ఆర్డర్లు');

      const newOrderRoute = parseRoute('/orders/new');
      updateDocumentTitle(newOrderRoute, 'EN');
      expect(document.title).toContain('Place Order');

      const stockEditRoute = parseRoute('/stock/PRD-1');
      updateDocumentTitle(stockEditRoute, 'EN');
      expect(document.title).toContain('Edit Commodity');

      const authResetRoute = parseRoute('/reset-password');
      updateDocumentTitle(authResetRoute, 'EN');
      expect(document.title).toContain('Reset Password');
    });
  });
});
