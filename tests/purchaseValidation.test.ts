import { describe, it, expect } from 'vitest';
import { 
  validatePurchaseRecord, 
  isOnlyAlphabets, 
  isPricingHierarchyValid,
  PurchaseRecordInput 
} from '../src/lib/purchaseValidation';

describe('Purchase Record Form & Pricing Hierarchy Validation', () => {
  const validForm: PurchaseRecordInput = {
    name: 'Sona Masoori Raw Rice',
    nameTe: 'సోనా మసూరి బియ్యం',
    category: 'RICE',
    brandOrMill: 'Sri Lalitha Rice Mill',
    innerBagWeightKg: 26,
    innerBagsPerOuter: 1,
    stockPhysicalOuter: 50,
    costPricePerBag: 1300,
    wholesalePriceBag: 1450,
    retailPriceBag: 1550,
  };

  describe('isOnlyAlphabets helper', () => {
    it('accepts letters with spaces', () => {
      expect(isOnlyAlphabets('Sona Masoori')).toBe(true);
      expect(isOnlyAlphabets('Sri Lalitha Mill')).toBe(true);
      expect(isOnlyAlphabets('Wheat Ravva')).toBe(true);
    });

    it('rejects numbers', () => {
      expect(isOnlyAlphabets('Rice 123')).toBe(false);
      expect(isOnlyAlphabets('42 Mill')).toBe(false);
    });

    it('rejects special characters and symbols', () => {
      expect(isOnlyAlphabets('Rice (Old)')).toBe(false);
      expect(isOnlyAlphabets('Lalitha & Sons')).toBe(false);
      expect(isOnlyAlphabets('Maida-Super')).toBe(false);
      expect(isOnlyAlphabets('Atta@Best')).toBe(false);
    });

    it('rejects empty or whitespace-only strings', () => {
      expect(isOnlyAlphabets('')).toBe(false);
      expect(isOnlyAlphabets('   ')).toBe(false);
    });
  });

  describe('isPricingHierarchyValid helper', () => {
    it('validates Purchase <= Wholesale <= Retail hierarchy', () => {
      expect(isPricingHierarchyValid(1300, 1450, 1550)).toBe(true);
      expect(isPricingHierarchyValid(100, 120, 150)).toBe(true);
    });

    it('allows equality between Purchase and Wholesale, or Wholesale and Retail', () => {
      expect(isPricingHierarchyValid(1450, 1450, 1550)).toBe(true); // Wholesale == Purchase
      expect(isPricingHierarchyValid(1300, 1550, 1550)).toBe(true); // Retail == Wholesale
      expect(isPricingHierarchyValid(1500, 1500, 1500)).toBe(true); // All three equal
    });

    it('rejects when Wholesale < Purchase', () => {
      expect(isPricingHierarchyValid(1500, 1450, 1550)).toBe(false);
    });

    it('rejects when Retail < Wholesale', () => {
      expect(isPricingHierarchyValid(1300, 1600, 1550)).toBe(false);
    });

    it('rejects zero or negative prices', () => {
      expect(isPricingHierarchyValid(0, 1450, 1550)).toBe(false);
      expect(isPricingHierarchyValid(-100, 1450, 1550)).toBe(false);
      expect(isPricingHierarchyValid(1300, 0, 1550)).toBe(false);
      expect(isPricingHierarchyValid(1300, 1450, 0)).toBe(false);
    });
  });

  describe('validatePurchaseRecord form validation', () => {
    it('accepts completely valid form data', () => {
      const result = validatePurchaseRecord(validForm, 'EN');
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
      expect(result.errorMessage).toBeUndefined();
    });

    it('accepts commodity name containing digits, hyphens, and symbols (no character restriction)', () => {
      const validWithSymbols = { ...validForm, name: 'Sona Masoori 2026 (No. 1 Premium - 100%)' };
      const res = validatePurchaseRecord(validWithSymbols, 'EN');
      expect(res.isValid).toBe(true);
      expect(res.errors.name).toBeUndefined();
    });

    it('rejects bill name containing digits or special symbols', () => {
      const invalid = { ...validForm, brandOrMill: 'Lalitha-Mill #1' };
      const res = validatePurchaseRecord(invalid, 'EN');
      expect(res.isValid).toBe(false);
      expect(res.errors.brandOrMill).toContain('should only accept alphabetic characters');
    });

    it('rejects empty commodity name or bill name', () => {
      const res = validatePurchaseRecord({ ...validForm, name: '', brandOrMill: '   ' }, 'EN');
      expect(res.isValid).toBe(false);
      expect(res.errors.name).toBeDefined();
      expect(res.errors.brandOrMill).toBeDefined();
    });

    it('enforces Wholesale >= Purchase rule in form', () => {
      // Equality is allowed:
      const equalAllowed = { 
        ...validForm, 
        costPricePerBag: 1450, 
        wholesalePriceBag: 1450, 
        retailPriceBag: 1600 
      };
      expect(validatePurchaseRecord(equalAllowed, 'EN').isValid).toBe(true);

      // Violation when Wholesale < Purchase:
      const invalid = { 
        ...validForm, 
        costPricePerBag: 1500, 
        wholesalePriceBag: 1450, 
        retailPriceBag: 1600 
      };
      const res = validatePurchaseRecord(invalid, 'EN');
      expect(res.isValid).toBe(false);
      expect(res.errors.pricingHierarchy).toContain('Wholesale value (₹1450) should be greater than or equal to Purchase value (₹1500)');
    });

    it('enforces Retail >= Wholesale rule in form', () => {
      // Equality is allowed:
      const equalAllowed = { 
        ...validForm, 
        costPricePerBag: 1300, 
        wholesalePriceBag: 1550, 
        retailPriceBag: 1550 
      };
      expect(validatePurchaseRecord(equalAllowed, 'EN').isValid).toBe(true);

      // Violation when Retail < Wholesale:
      const invalid = { 
        ...validForm, 
        costPricePerBag: 1300, 
        wholesalePriceBag: 1550, 
        retailPriceBag: 1500 
      };
      const res = validatePurchaseRecord(invalid, 'EN');
      expect(res.isValid).toBe(false);
      expect(res.errors.pricingHierarchy).toContain('Retail value (₹1500) must be greater than or equal to Wholesale value (₹1550)');
    });

    it('validates each and every form field (category, weight, packets, stock)', () => {
      const invalidFields: PurchaseRecordInput = {
        name: 'Rice',
        category: '', // missing
        brandOrMill: 'Mill',
        innerBagWeightKg: -5, // negative
        innerBagsPerOuter: 0, // must be >= 1
        stockPhysicalOuter: -2, // negative
        costPricePerBag: 100,
        wholesalePriceBag: 120,
        retailPriceBag: 150
      };
      const res = validatePurchaseRecord(invalidFields, 'EN');
      expect(res.isValid).toBe(false);
      expect(res.errors.category).toBeDefined();
      expect(res.errors.innerBagWeightKg).toBeDefined();
      expect(res.errors.innerBagsPerOuter).toBeDefined();
      expect(res.errors.stockPhysicalOuter).toBeDefined();
    });

    it('returns localized Telugu error messages when language is TE', () => {
      const invalid = { 
        ...validForm, 
        brandOrMill: 'Mill 123',
        costPricePerBag: 1500, 
        wholesalePriceBag: 1400 
      };
      const res = validatePurchaseRecord(invalid, 'TE');
      expect(res.isValid).toBe(false);
      expect(res.errors.brandOrMill).toContain('కేవలం అక్షరాలు మాత్రమే');
      expect(res.errors.pricingHierarchy).toContain('హోల్‌సేల్ ధర (₹1400) తప్పనిసరిగా కొనుగోలు ధర (₹1500) కంటే ఎక్కువ లేదా సమానంగా ఉండాలి');
    });
  });
});
