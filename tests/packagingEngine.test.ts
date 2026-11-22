import { describe, it, expect } from 'vitest';
import { calculateOuterBagWeight, calculateTotalStockWeightKg, unpackMasterBag } from '../src/lib/packagingEngine';
import { Product } from '../src/contracts';

describe('Packaging Engine', () => {
  it('correctly calculates outer bag total weight from inner weight and count', () => {
    // 25 packets of 1kg = 25kg outer bag
    expect(calculateOuterBagWeight(1.0, 25)).toBe(25.0);
    // 10 packets of 5kg = 50kg outer bag
    expect(calculateOuterBagWeight(5.0, 10)).toBe(50.0);
    // 12 packets of 2kg = 24kg outer bag
    expect(calculateOuterBagWeight(2.0, 12)).toBe(24.0);
    // Single solid sack: 1 bag of 26kg
    expect(calculateOuterBagWeight(26.0, 1)).toBe(26.0);
  });

  it('throws error for non-positive inner weight or count', () => {
    expect(() => calculateOuterBagWeight(0, 25)).toThrow();
    expect(() => calculateOuterBagWeight(1.0, -5)).toThrow();
  });

  it('correctly calculates total net stock weight across tiers', () => {
    // 10 outer bags (25kg each) + 5 loose packets (1kg each) + 2.5kg loose
    const totalKg = calculateTotalStockWeightKg(10, 25.0, 5, 1.0, 2.5);
    // 250 + 5 + 2.5 = 257.5 kg
    expect(totalKg).toBe(257.5);
  });

  it('unpacks 1 master bag into constituent loose inner packets', () => {
    const product: Product = {
      id: 'prod-1',
      name: 'Suji Ravva',
      category: 'SUJI_RAVVA',
      innerBagWeightKg: 1.0,
      innerBagsPerOuter: 25,
      outerBagTotalKg: 25.0,
      stockPhysicalOuter: 10,
      stockReservedOuter: 0,
      stockLooseInner: 0,
      stockLooseKg: 0,
      costPricePerBag: 900,
      wholesalePriceBag: 1050,
      pricePerInnerBag: 45,
    };

    const res = unpackMasterBag(product);
    expect(res.success).toBe(true);
    expect(res.product.stockPhysicalOuter).toBe(9);
    expect(res.product.stockLooseInner).toBe(25);
  });

  it('fails gracefully when attempting to unpack with 0 outer bags in stock', () => {
    const product: Product = {
      id: 'prod-2',
      name: 'Wheat Ravva',
      category: 'WHEAT_RAVVA',
      innerBagWeightKg: 1.0,
      innerBagsPerOuter: 25,
      outerBagTotalKg: 25.0,
      stockPhysicalOuter: 0,
      stockReservedOuter: 0,
      stockLooseInner: 5,
      stockLooseKg: 0,
      costPricePerBag: 900,
      wholesalePriceBag: 1050,
      pricePerInnerBag: 45,
    };

    const res = unpackMasterBag(product);
    expect(res.success).toBe(false);
    expect(res.product.stockPhysicalOuter).toBe(0);
    expect(res.product.stockLooseInner).toBe(5);
  });
});
