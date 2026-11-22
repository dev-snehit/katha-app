import { describe, it, expect } from 'vitest';
import { CustomerSchema, SupplierSchema, ProductSchema, UserSchema, OrderSchema, INITIAL_ADMIN_USER } from '../src/contracts';

describe('Shared Zod Contracts & Validations', () => {
  it('validates pre-seeded master admin user', () => {
    const parsed = UserSchema.parse(INITIAL_ADMIN_USER);
    expect(parsed.email).toBe('dev.snehit@gmail.com');
    expect(parsed.name).toBe('Snehit Tadepalli');
    expect(parsed.role).toBe('ADMIN');
    expect(parsed.status).toBe('APPROVED');
  });

  it('enforces mandatory 10-digit Indian mobile number on customers', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sri Balaji Kirana',
      phone: '9848022338',
      createdAt: new Date().toISOString(),
    };
    expect(() => CustomerSchema.parse(valid)).not.toThrow();

    const invalid = { ...valid, phone: '12345' };
    expect(() => CustomerSchema.parse(invalid)).toThrow();
  });

  it('validates supplier IFSC format and mandatory bank details', () => {
    const validSupplier = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      businessName: 'Sri Lalitha Rice Mill',
      bankName: 'State Bank of India',
      accountNumber: '12345678901',
      ifscCode: 'SBIN0001234',
      nickname: 'Lalitha SBI',
      createdAt: new Date().toISOString(),
    };
    expect(() => SupplierSchema.parse(validSupplier)).not.toThrow();

    const invalidIfsc = { ...validSupplier, ifscCode: 'INVALID_IFSC' };
    expect(() => SupplierSchema.parse(invalidIfsc)).toThrow();
  });

  it('validates product 3 pricing values (Purchase, Wholesale, Retail)', () => {
    const validProduct = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'Sona Masoori Raw Rice',
      category: 'RICE',
      innerBagWeightKg: 26.0,
      innerBagsPerOuter: 1,
      outerBagTotalKg: 26.0,
      costPricePerBag: 1300, // Purchase Value
      wholesalePriceBag: 1450, // Wholesale Value
      retailPriceBag: 1550, // Retail Value
      pricePerInnerBag: 1550,
    };
    const parsed = ProductSchema.parse(validProduct);
    expect(parsed.costPricePerBag).toBe(1300);
    expect(parsed.wholesalePriceBag).toBe(1450);
    expect(parsed.retailPriceBag).toBe(1550);
  });

  it('validates order with custom discount application', () => {
    const orderWithDiscount = {
      id: 'ord-test-discount',
      orderNumber: 'ORD-5501',
      customerId: 'cust-1',
      customerName: 'Balaji Kirana',
      customerPhone: '9848022338',
      orderDate: new Date().toISOString(),
      status: 'PENDING_REVIEW' as const,
      totalOuterBags: 10,
      totalWeightKg: 260,
      items: [{
        productId: 'prod-1',
        productName: 'Rice',
        unitType: 'OUTER_BAG' as const,
        quantity: 10,
        unitPrice: 1450,
        lineTotal: 14500,
      }],
      subtotal: 14500,
      hamaliCharges: 80,
      transportCharges: 120,
      discount: 200, // Custom discount
      grandTotal: 14500, // 14500 + 80 + 120 - 200 = 14500
      paymentMode: 'CREDIT' as const,
      submittedByRole: 'STAFF' as const,
      createdAt: new Date().toISOString(),
    };
    const parsed = OrderSchema.parse(orderWithDiscount);
    expect(parsed.discount).toBe(200);
    expect(parsed.grandTotal).toBe(14500);
  });
});
