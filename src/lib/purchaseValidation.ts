/**
 * Purchase Record & Commodity Form Validation Engine
 * 
 * Enforces business rules:
 * 1. Commodity name and Bill name should only accept alphabetic characters [A-Za-z ]
 * 2. In Pricing values section: Wholesale value should be greater than or equal to Purchase value and retail value must be greater than or equal to wholesale value (Purchase <= Wholesale <= Retail)
 * 3. Granular field validation across category, weights, packet counts, and stock quantities
 */

export interface PurchaseRecordInput {
  name: string;
  nameTe?: string;
  category: string;
  brandOrMill: string; // Bill name / Mill name
  innerBagWeightKg: string | number;
  innerBagsPerOuter: string | number;
  stockPhysicalOuter: string | number;
  costPricePerBag: string | number; // Purchase Value
  wholesalePriceBag: string | number; // Wholesale Value
  retailPriceBag: string | number; // Retail Value
}

export interface PurchaseValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  errorMessage?: string;
}

/**
 * Validates whether string contains only letters [A-Za-z] and single/multiple spaces.
 * Strictly disallows numbers, punctuation, and special symbols.
 */
export function isOnlyAlphabets(value: string): boolean {
  if (!value) return false;
  return /^[A-Za-z\s]+$/.test(value.trim());
}

/**
 * Checks whether the pricing hierarchy satisfies:
 * Wholesale value should be greater than or equal to Purchase value and
 * retail value must be greater than or equal to wholesale value (Purchase <= Wholesale <= Retail)
 */
export function isPricingHierarchyValid(purchase: number, wholesale: number, retail: number): boolean {
  if (isNaN(purchase) || isNaN(wholesale) || isNaN(retail)) return false;
  if (purchase <= 0 || wholesale <= 0 || retail <= 0) return false;
  return wholesale >= purchase && retail >= wholesale;
}

/**
 * Validates each and every field in the Purchase Record form
 */
export function validatePurchaseRecord(
  data: PurchaseRecordInput,
  language: 'EN' | 'TE' = 'EN'
): PurchaseValidationResult {
  const errors: Record<string, string> = {};

  // 1. Validate Commodity Name (Only alphabets & spaces)
  const trimmedName = (data.name || '').trim();
  if (!trimmedName) {
    errors.name = language === 'TE' 
      ? 'సరుకు పేరు తప్పనిసరిగా నమోదు చేయాలి.' 
      : 'Commodity name is required.';
  } else if (!isOnlyAlphabets(trimmedName)) {
    errors.name = language === 'TE'
      ? 'సరుకు పేరులో కేవలం అక్షరాలు మాత్రమే ఉండాలి (అంకెలు లేదా గుర్తులు అనుమతించబడవు).'
      : 'Commodity name should only accept alphabetic characters (no numbers or symbols).';
  } else if (trimmedName.length < 2) {
    errors.name = language === 'TE'
      ? 'సరుకు పేరు కనీసం 2 అక్షరాలు ఉండాలి.'
      : 'Commodity name must be at least 2 characters long.';
  }

  // 2. Validate Bill Name / Brand / Mill (Only alphabets & spaces)
  const trimmedBillName = (data.brandOrMill || '').trim();
  if (!trimmedBillName) {
    errors.brandOrMill = language === 'TE'
      ? 'బిల్లు పేరు తప్పనిసరిగా నమోదు చేయాలి.'
      : 'Bill name is required.';
  } else if (!isOnlyAlphabets(trimmedBillName)) {
    errors.brandOrMill = language === 'TE'
      ? 'బిల్లు పేరులో కేవలం అక్షరాలు మాత్రమే ఉండాలి (అంకెలు లేదా గుర్తులు అనుమతించబడవు).'
      : 'Bill name should only accept alphabetic characters (no numbers or symbols).';
  } else if (trimmedBillName.length < 2) {
    errors.brandOrMill = language === 'TE'
      ? 'బిల్లు పేరు కనీసం 2 అక్షరాలు ఉండాలి.'
      : 'Bill name must be at least 2 characters long.';
  }

  // 3. Validate Category
  const trimmedCategory = (data.category || '').trim();
  if (!trimmedCategory) {
    errors.category = language === 'TE'
      ? 'దయచేసి సరుకు వర్గాన్ని ఎంచుకోండి.'
      : 'Please select a commodity category.';
  }

  // 4. Validate Packet Weight (kg)
  const innerWt = Number(data.innerBagWeightKg);
  if (data.innerBagWeightKg === '' || data.innerBagWeightKg === undefined || isNaN(innerWt) || innerWt <= 0) {
    errors.innerBagWeightKg = language === 'TE'
      ? 'ప్యాకెట్ బరువు 0 కంటే ఎక్కువ ధనాత్మక సంఖ్యగా ఉండాలి.'
      : 'Packet weight must be a valid positive number greater than 0.';
  }

  // 5. Validate Packets Per Bag
  const innerCount = Number(data.innerBagsPerOuter);
  if (data.innerBagsPerOuter === '' || data.innerBagsPerOuter === undefined || isNaN(innerCount) || innerCount < 1 || !Number.isInteger(innerCount)) {
    errors.innerBagsPerOuter = language === 'TE'
      ? 'సంచీలోని ప్యాకెట్ల సంఖ్య కనీసం 1 పూర్ణాంకం ఉండాలి.'
      : 'Packets per bag must be a whole number of at least 1.';
  }

  // 6. Validate Stock Bags
  const stockCount = Number(data.stockPhysicalOuter);
  if (data.stockPhysicalOuter === '' || data.stockPhysicalOuter === undefined || isNaN(stockCount) || stockCount < 0 || !Number.isInteger(stockCount)) {
    errors.stockPhysicalOuter = language === 'TE'
      ? 'స్టాక్ బస్తాల సంఖ్య 0 లేదా అంతకంటే ఎక్కువ పూర్ణాంకంగా ఉండాలి.'
      : 'Stock bags must be 0 or a positive whole number.';
  }

  // 7. Validate 3 Pricing Values & Enforce Wholesale >= Purchase and Retail >= Wholesale
  const purchase = Number(data.costPricePerBag);
  const wholesale = Number(data.wholesalePriceBag);
  const retail = Number(data.retailPriceBag);

  if (data.costPricePerBag === '' || isNaN(purchase) || purchase <= 0) {
    errors.costPricePerBag = language === 'TE'
      ? 'కొనుగోలు ధర తప్పనిసరి మరియు 0 కంటే ఎక్కువ ఉండాలి.'
      : 'Purchase value is required and must be greater than 0.';
  }

  if (data.wholesalePriceBag === '' || isNaN(wholesale) || wholesale <= 0) {
    errors.wholesalePriceBag = language === 'TE'
      ? 'హోల్‌సేల్ ధర తప్పనిసరి మరియు 0 కంటే ఎక్కువ ఉండాలి.'
      : 'Wholesale value is required and must be greater than 0.';
  }

  if (data.retailPriceBag === '' || isNaN(retail) || retail <= 0) {
    errors.retailPriceBag = language === 'TE'
      ? 'రిటైల్ ధర తప్పనిసరి మరియు 0 కంటే ఎక్కువ ఉండాలి.'
      : 'Retail value is required and must be greater than 0.';
  }

  // Pricing hierarchy check if all 3 pricing numbers are entered
  if (purchase > 0 && wholesale > 0 && retail > 0) {
    if (wholesale < purchase) {
      const msg = language === 'TE'
        ? `హోల్‌సేల్ ధర (₹${wholesale}) తప్పనిసరిగా కొనుగోలు ధర (₹${purchase}) కంటే ఎక్కువ లేదా సమానంగా ఉండాలి!`
        : `Wholesale value (₹${wholesale}) should be greater than or equal to Purchase value (₹${purchase})!`;
      errors.pricingHierarchy = msg;
      errors.costPricePerBag = errors.costPricePerBag || msg;
      errors.wholesalePriceBag = errors.wholesalePriceBag || msg;
    } else if (retail < wholesale) {
      const msg = language === 'TE'
        ? `రిటైల్ ధర (₹${retail}) తప్పనిసరిగా హోల్‌సేల్ ధర (₹${wholesale}) కంటే ఎక్కువ లేదా సమానంగా ఉండాలి!`
        : `Retail value (₹${retail}) must be greater than or equal to Wholesale value (₹${wholesale})!`;
      errors.pricingHierarchy = msg;
      errors.wholesalePriceBag = errors.wholesalePriceBag || msg;
      errors.retailPriceBag = errors.retailPriceBag || msg;
    }
  }

  const errorKeys = Object.keys(errors);
  const isValid = errorKeys.length === 0;
  const errorMessage = isValid ? undefined : errors.pricingHierarchy || Object.values(errors)[0];

  return {
    isValid,
    errors,
    errorMessage
  };
}
