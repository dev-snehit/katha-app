import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hashPassword, generateTemporaryPassword } from '../../src/lib/crypto';
import { decodeJwtPayload, getJwtRemainingSeconds, isJwtExpired } from '../../src/lib/jwt';
import { reserveStock } from '../../src/lib/stockEngine';
import { validatePurchaseRecord } from '../../src/lib/purchaseValidation';
import { validateCustomer } from '../../src/lib/customerValidation';
import { getLocalizedText } from '../../src/lib/bilingualHelper';
import { pullFromGoogleSheet, lockRemoteSheets, pingGoogleSheet, pushToGoogleSheet } from '../../src/lib/syncService';
import { parseRoute, updateDocumentTitle, setIntendedRoute, getIntendedRoute, clearIntendedRoute, navigate } from '../../src/lib/router';
import { generateSalesReportPDF, generateNumberTallyPDF, generateStockPositionPDF } from '../../src/lib/pdfGenerator';
import { exportMasterExcelFile } from '../../src/lib/excelExport';
import { en } from '../../src/locales/en';
import { te } from '../../src/locales/te';
import { Order, Product, Customer, Supplier } from '../../src/contracts';

// Mock jsPDF and jspdf-autotable for deterministic unit testing
vi.mock('jspdf', () => {
  return {
    default: class MockJsPDF {
      setFontSize = vi.fn();
      setTextColor = vi.fn();
      text = vi.fn();
      save = vi.fn();
      lastAutoTable = { finalY: 120 };
    },
  };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

describe('Unit Tests: Libs, Crypto, JWT, Sync, Router, PDF & Excel Exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('covers bilingual locales and helper fallbacks', () => {
    expect(en.appTitle).toBe('Kaatha Wholesale');
    expect(te.appTitle).toBe('కాతా హోల్‌సేల్');
    expect(getLocalizedText({ name: 'Rice', nameTe: 'బియ్యం' }, 'name', 'EN')).toBe('Rice');
    expect(getLocalizedText({ name: 'Rice', nameTe: 'బియ్యం' }, 'name', 'TE')).toBe('బియ్యం');
    expect(getLocalizedText({ name: 'Rice', nameTe: '' }, 'name', 'TE')).toBe('Rice');
    expect(getLocalizedText(null, 'name', 'EN')).toBe('');
  });

  it('covers crypto hashing (WebCrypto and fallback) and temporary password generation', async () => {
    const h1 = await hashPassword('admin');
    expect(h1).toBe('8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918');

    const origCrypto = globalThis.crypto;
    // Test fallback when subtle is undefined
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: origCrypto.getRandomValues.bind(origCrypto) },
      configurable: true,
    });
    const fallbackHash = await hashPassword('fallbackPass');
    expect(fallbackHash.length).toBeGreaterThan(0);
    Object.defineProperty(globalThis, 'crypto', { value: origCrypto, configurable: true });

    const tmp = generateTemporaryPassword();
    expect(tmp).toMatch(/^Kaatha-[A-Z0-9]{4}$/);
  });

  it('covers JWT payload decoding, malformed inputs, remaining seconds, and expiry checks', () => {
    expect(decodeJwtPayload(null)).toBeNull();
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.!!!invalid-base64!!!.c')).toBeNull();
    expect(getJwtRemainingSeconds(null)).toBe(0);
    expect(isJwtExpired(null)).toBe(true);

    const b64u = (obj: any) => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
    const nowSec = Math.floor(Date.now() / 1000);
    const validTok = `${b64u({ alg: 'HS256' })}.${b64u({ sub: 'u1', exp: nowSec + 1200 })}.sig`;
    expect(decodeJwtPayload(validTok)?.sub).toBe('u1');
    expect(isJwtExpired(validTok, nowSec * 1000)).toBe(false);
    expect(getJwtRemainingSeconds(validTok, nowSec * 1000)).toBe(1200);
    expect(isJwtExpired(validTok, (nowSec + 1205) * 1000)).toBe(true);
  });

  it('covers stockEngine non-positive quantity guard and validation edge cases', () => {
    const prod: Product = {
      id: 'p1', name: 'Sona', category: 'Rice', innerBagWeightKg: 26, innerBagsPerOuter: 1, outerBagTotalKg: 26,
      stockPhysicalOuter: 10, stockReservedOuter: 2, stockLooseInner: 0, stockLooseKg: 0,
      costPricePerBag: 1000, wholesalePriceBag: 1200, pricePerInnerBag: 1200, retailPriceBag: 1300,
    };
    expect(reserveStock(prod, 0).success).toBe(false);
    expect(reserveStock(prod, 20).success).toBe(false);

    const pErr = validatePurchaseRecord({
      name: '', category: 'Rice', brandOrMill: '123', innerBagWeightKg: 0, innerBagsPerOuter: 0,
      stockPhysicalOuter: -1, costPricePerBag: 0, wholesalePriceBag: 0, retailPriceBag: 0,
    }, 'TE');
    expect(pErr.isValid).toBe(false);

    const cErr = validateCustomer({ name: '123', phone: '123' }, 'TE');
    expect(cErr.isValid).toBe(false);
  });

  it('covers syncService GET fallback, lockRemoteSheets, HTTP error, and TOKEN_EXPIRED', async () => {
    const origFetch = global.fetch;

    expect((await pullFromGoogleSheet('')).success).toBe(false);
    expect((await lockRemoteSheets('')).success).toBe(false);
    expect((await pingGoogleSheet('')).success).toBe(false);

    // HTTP 500 error
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });
    const httpErr = await pushToGoogleSheet('https://example.com/exec', 'saveOrder', {});
    expect(httpErr.success).toBe(false);
    expect(httpErr.error).toContain('500');

    // TOKEN_EXPIRED on pullFromGoogleSheet
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'error', code: 'TOKEN_EXPIRED', message: 'Expired' }),
    });
    const expiredPull = await pullFromGoogleSheet('https://example.com/exec', 'tok');
    expect(expiredPull.success).toBe(false);
    expect(expiredPull.code).toBe('TOKEN_EXPIRED');

    // POST fails -> GET fallback succeeds
    let callIdx = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callIdx++;
      if (callIdx === 1) return { ok: true, json: async () => ({ status: 'error' }) };
      return { ok: true, json: async () => ({ status: 'success', data: { Users: [] } }) };
    });
    const getFallback = await pullFromGoogleSheet('https://example.com/exec');
    expect(getFallback.success).toBe(true);

    // lockRemoteSheets success
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'success', message: 'Locked' }) });
    expect((await lockRemoteSheets('https://example.com/exec')).success).toBe(true);

    // ping fallback to GET
    let pingIdx = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      pingIdx++;
      if (pingIdx === 1) return { ok: true, json: async () => ({ status: 'error' }) };
      return { ok: true, json: async () => ({ status: 'ok', message: 'Pong' }) };
    });
    expect((await pingGoogleSheet('https://example.com/exec')).success).toBe(true);

    global.fetch = origFetch;
  });

  it('covers router parsing, intendedRoute, navigate, and bilingual document titles for all views', () => {
    setIntendedRoute('/orders/ORD-99');
    expect(getIntendedRoute()).toBe('/orders/ORD-99');
    clearIntendedRoute();
    expect(getIntendedRoute()).toBeNull();

    navigate('/dashboard');
    expect(parseRoute('/dashboard').view).toBe('dashboard');
    expect(parseRoute('/admin/new-user').subView).toBe('new-user');
    expect(parseRoute('/reset-password/tok123').paramId).toBe('tok123');
    expect(parseRoute('/settings').view).toBe('settings');

    const views: Array<[string, 'EN' | 'TE']> = [
      ['/dashboard', 'EN'], ['/dashboard', 'TE'],
      ['/orders', 'EN'], ['/orders/new', 'TE'], ['/orders/ORD-1', 'EN'],
      ['/stock', 'EN'], ['/stock/new', 'TE'], ['/stock/P-1', 'EN'],
      ['/customers', 'EN'], ['/customers/new', 'TE'], ['/customers/C-1', 'EN'],
      ['/suppliers', 'EN'], ['/suppliers/new', 'TE'], ['/suppliers/S-1', 'EN'],
      ['/exports', 'EN'], ['/exports', 'TE'],
      ['/admin', 'EN'], ['/admin/new-user', 'TE'],
      ['/settings', 'EN'], ['/login', 'TE'], ['/register', 'EN'], ['/forgot-password', 'TE'], ['/reset-password/t1', 'EN'],
    ];
    for (const [p, lang] of views) {
      updateDocumentTitle(parseRoute(p), lang);
      expect(document.title).toContain(lang === 'TE' ? 'కాతా' : 'Kaatha');
    }
  });

  it('generates Sales, Number Tally, and Stock Position PDFs and Master Excel workbook', async () => {
    const sampleProducts: Product[] = [{
      id: 'p1', name: 'Sona Masoori', nameTe: 'సోనా మసూరి', category: 'Rice',
      innerBagWeightKg: 26, innerBagsPerOuter: 1, outerBagTotalKg: 26,
      stockPhysicalOuter: 50, stockReservedOuter: 10, stockLooseInner: 2, stockLooseKg: 5,
      costPricePerBag: 1100, wholesalePriceBag: 1250, pricePerInnerBag: 1250, retailPriceBag: 1350,
    }];
    const sampleCustomers: Customer[] = [{
      id: 'c1', name: 'Lakshmi Stores', phone: '9876543210', currentDue: 2500, createdAt: '2026-11-28T00:00:00.000Z',
    }];
    const sampleSuppliers: Supplier[] = [{
      id: 's1', businessName: 'Sri Sai Mill', bankName: 'SBI', accountNumber: '1234', ifscCode: 'SBIN0001', nickname: 'Sai', createdAt: '2026-11-28T00:00:00.000Z',
    }];
    const sampleOrders: Order[] = [{
      id: 'o1', orderNumber: 'ORD-101', customerId: 'c1', customerName: 'Lakshmi Stores', customerPhone: '9876543210',
      orderDate: '2026-11-28T10:00:00.000Z', createdAt: '2026-11-28T10:00:00.000Z',
      items: [{ productId: 'p1', productName: 'Sona Masoori', unitType: 'OUTER_BAG', quantity: 5, unitPrice: 1250, lineTotal: 6250 }],
      totalOuterBags: 5, totalInnerBags: 0, totalWeightKg: 130, subtotal: 6250, hamaliCharges: 50, transportCharges: 100, discount: 0, grandTotal: 6400,
      paymentMode: 'CASH', status: 'DELIVERED', submittedByRole: 'OWNER',
    }];

    expect(() => generateSalesReportPDF(sampleOrders, '2026-11-28', 'EN')).not.toThrow();
    expect(() => generateSalesReportPDF([], '2026-11-28', 'TE')).not.toThrow();
    expect(() => generateNumberTallyPDF(sampleOrders, sampleProducts, false, '2026-11-28')).not.toThrow();
    expect(() => generateStockPositionPDF(sampleProducts, 'Kaatha Wholesale')).not.toThrow();

    // Mock DOM anchor click + URL.createObjectURL for Excel export
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.fn();
    const origCreateEl = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreateEl(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    await exportMasterExcelFile(
      sampleProducts,
      sampleCustomers,
      sampleSuppliers,
      sampleOrders
    );
    expect(clickSpy).toHaveBeenCalled();

    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
  });
});
