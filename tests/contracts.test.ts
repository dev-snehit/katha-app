import { describe, it, expect } from 'vitest';
import { CustomerSchema, SupplierSchema, ProductSchema, UserSchema, INITIAL_ADMIN_USER } from '../src/contracts';

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

  it('validates product packaging multipliers', () => {
    const validProduct = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'Suji Ravva',
      category: 'SUJI_RAVVA',
      innerBagWeightKg: 1.0,
      innerBagsPerOuter: 25,
      outerBagTotalKg: 25.0,
      costPricePerBag: 900,
      wholesalePriceBag: 1050,
      pricePerInnerBag: 45,
    };
    expect(() => ProductSchema.parse(validProduct)).not.toThrow();
  });
});
