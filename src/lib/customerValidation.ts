import { isOnlyAlphabets } from './purchaseValidation';

export interface CustomerValidationInput {
  name: string;
  nameTe?: string;
  phone: string;
  businessName?: string;
  address?: string;
}

export interface CustomerValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  errorMessage?: string;
}

/**
 * Validates whether string contains exactly 10 digits [0-9].
 */
export function isValid10DigitPhone(phone: string): boolean {
  if (!phone) return false;
  return /^\d{10}$/.test(phone.trim());
}

/**
 * Validates Add Customer form inputs:
 * 1. Customer name should only accept alphabetic characters and spaces [A-Za-z ]
 * 2. Mobile number should definitely have 10 digits
 * 3. Mobile error message: "Mobile number should have 10 digits. Please verify."
 */
export function validateCustomer(
  data: CustomerValidationInput,
  language: 'EN' | 'TE' = 'EN'
): CustomerValidationResult {
  const errors: Record<string, string> = {};

  // 1. Customer Name Validation (Only alphabets & spaces)
  const trimmedName = (data.name || '').trim();
  if (!trimmedName) {
    errors.name = language === 'TE'
      ? 'కస్టమర్ పేరు తప్పనిసరిగా నమోదు చేయాలి.'
      : 'Customer name is required.';
  } else if (!isOnlyAlphabets(trimmedName)) {
    errors.name = language === 'TE'
      ? 'కస్టమర్ పేరులో కేవలం అక్షరాలు మాత్రమే ఉండాలి.'
      : 'Customer name should only accept alphabets.';
  } else if (trimmedName.length < 2) {
    errors.name = language === 'TE'
      ? 'కస్టమర్ పేరు కనీసం 2 అక్షరాలు ఉండాలి.'
      : 'Customer name must be at least 2 characters.';
  }

  // 2. Mobile Number Validation (Definitely 10 digits)
  const trimmedPhone = (data.phone || '').trim();
  if (!trimmedPhone || !isValid10DigitPhone(trimmedPhone)) {
    errors.phone = language === 'TE'
      ? 'మొబైల్ నంబర్ 10 అంకెలు కలిగి ఉండాలి. దయచేసి ధృవీకరించండి.'
      : 'Mobile number should have 10 digits. Please verify.';
  }

  const isValid = Object.keys(errors).length === 0;
  const errorMessage = isValid ? undefined : errors.name || errors.phone;

  return {
    isValid,
    errors,
    errorMessage,
  };
}
