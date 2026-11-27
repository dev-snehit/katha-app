import { describe, it, expect } from 'vitest';
import { 
  validateCustomer, 
  isValid10DigitPhone, 
  CustomerValidationInput 
} from '../src/lib/customerValidation';

describe('Customer Form Validation Engine', () => {
  const validCustomer: CustomerValidationInput = {
    name: 'Sri Balaji Kirana Stores',
    nameTe: 'శ్రీ బాలాజీ కిరాణా స్టోర్స్',
    phone: '9848022338',
    businessName: 'Balaji Traders',
    address: 'Main Bazaar, Guntur',
  };

  describe('isValid10DigitPhone helper', () => {
    it('accepts exact 10-digit mobile numbers', () => {
      expect(isValid10DigitPhone('9848022338')).toBe(true);
      expect(isValid10DigitPhone('8008123456')).toBe(true);
      expect(isValid10DigitPhone('6301234567')).toBe(true);
      expect(isValid10DigitPhone('7012345678')).toBe(true);
      expect(isValid10DigitPhone('1234567890')).toBe(true);
    });

    it('rejects numbers with fewer than 10 digits', () => {
      expect(isValid10DigitPhone('984802233')).toBe(false);
      expect(isValid10DigitPhone('12345')).toBe(false);
      expect(isValid10DigitPhone('0')).toBe(false);
    });

    it('rejects numbers with more than 10 digits', () => {
      expect(isValid10DigitPhone('98480223381')).toBe(false);
      expect(isValid10DigitPhone('919848022338')).toBe(false);
    });

    it('rejects strings containing alphabets, spaces, or special characters', () => {
      expect(isValid10DigitPhone('98480abcde')).toBe(false);
      expect(isValid10DigitPhone('98480 22338')).toBe(false);
      expect(isValid10DigitPhone('98480-22338')).toBe(false);
      expect(isValid10DigitPhone('+9198480223')).toBe(false);
    });

    it('rejects empty or whitespace-only strings', () => {
      expect(isValid10DigitPhone('')).toBe(false);
      expect(isValid10DigitPhone('   ')).toBe(false);
    });
  });

  describe('validateCustomer', () => {
    it('accepts valid customer with alphabetic name and 10-digit mobile', () => {
      const res = validateCustomer(validCustomer, 'EN');
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors).length).toBe(0);
      expect(res.errorMessage).toBeUndefined();
    });

    it('accepts customer name with only alphabets and spaces', () => {
      const singleWord = { ...validCustomer, name: 'Srinivas' };
      expect(validateCustomer(singleWord, 'EN').isValid).toBe(true);

      const multipleWords = { ...validCustomer, name: 'Ramesh Kumar Gupta' };
      expect(validateCustomer(multipleWords, 'EN').isValid).toBe(true);
    });

    it('rejects customer name containing digits', () => {
      const invalid = { ...validCustomer, name: 'Sri Balaji 123' };
      const res = validateCustomer(invalid, 'EN');
      expect(res.isValid).toBe(false);
      expect(res.errors.name).toBe('Customer name should only accept alphabets.');
    });

    it('rejects customer name containing special symbols', () => {
      const invalidSymbols = [
        'Balaji & Sons',
        'Kirana #1',
        'Ramesh @ Home',
        'Store-Super',
        'Kaatha (Main)'
      ];

      for (const name of invalidSymbols) {
        const res = validateCustomer({ ...validCustomer, name }, 'EN');
        expect(res.isValid).toBe(false);
        expect(res.errors.name).toBe('Customer name should only accept alphabets.');
      }
    });

    it('rejects empty customer name', () => {
      const res = validateCustomer({ ...validCustomer, name: '' }, 'EN');
      expect(res.isValid).toBe(false);
      expect(res.errors.name).toBe('Customer name is required.');
    });

    it('rejects customer name shorter than 2 characters', () => {
      const res = validateCustomer({ ...validCustomer, name: 'A' }, 'EN');
      expect(res.isValid).toBe(false);
      expect(res.errors.name).toBe('Customer name must be at least 2 characters.');
    });

    it('enforces exact error message for mobile number: "Mobile number should have 10 digits. Please verify."', () => {
      const invalidPhones = [
        '98480',          // 5 digits
        '984802233',      // 9 digits
        '98480223381',    // 11 digits
        '98480abcde',     // alphanumeric
        '98480-22338',    // with hyphen
        '',               // empty
      ];

      for (const phone of invalidPhones) {
        const res = validateCustomer({ ...validCustomer, phone }, 'EN');
        expect(res.isValid).toBe(false);
        expect(res.errors.phone).toBe('Mobile number should have 10 digits. Please verify.');
      }
    });

    it('returns localized Telugu error messages in TE language mode', () => {
      const invalidName = { ...validCustomer, name: 'Balaji 123' };
      const resName = validateCustomer(invalidName, 'TE');
      expect(resName.isValid).toBe(false);
      expect(resName.errors.name).toContain('కేవలం అక్షరాలు మాత్రమే');

      const invalidPhone = { ...validCustomer, phone: '9848' };
      const resPhone = validateCustomer(invalidPhone, 'TE');
      expect(resPhone.isValid).toBe(false);
      expect(resPhone.errors.phone).toContain('మొబైల్ నంబర్ 10 అంకెలు కలిగి ఉండాలి');
    });
  });
});
