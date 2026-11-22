import { describe, it, expect } from 'vitest';
import { getAvailableOuterStock, reserveStock, commitReservedStock, releaseReservedStock } from '../src/lib/stockEngine';
import { Product } from '../src/contracts';

describe('Two-Stage Stock Reservation Engine', () => {
  const baseProduct: Product = {
    id: 'prod-rice-1',
    name: 'Sona Masoori Rice (Raw Old)',
    category: 'RICE',
    brandOrMill: 'Sri Lalitha',
    innerBagWeightKg: 26.0,
    innerBagsPerOuter: 1,
    outerBagTotalKg: 26.0,
    stockPhysicalOuter: 50,
    stockReservedOuter: 0,
    stockLooseInner: 0,
    stockLooseKg: 0,
    costPricePerBag: 1350,
    wholesalePriceBag: 1480,
    pricePerInnerBag: 1480,
  };

  it('calculates available outer stock as physical minus reserved', () => {
    expect(getAvailableOuterStock(baseProduct)).toBe(50);

    const withReserved: Product = { ...baseProduct, stockPhysicalOuter: 50, stockReservedOuter: 15 };
    expect(getAvailableOuterStock(withReserved)).toBe(35);
  });

  it('reserves stock when staff creates an order within available limits', () => {
    const res = reserveStock(baseProduct, 20);
    expect(res.success).toBe(true);
    // Physical stock remains 50 in godown
    expect(res.updatedProduct.stockPhysicalOuter).toBe(50);
    // Reserved increments to 20
    expect(res.updatedProduct.stockReservedOuter).toBe(20);
    // Available becomes 30
    expect(getAvailableOuterStock(res.updatedProduct)).toBe(30);
  });

  it('prevents overselling when requested quantity exceeds available stock', () => {
    const res = reserveStock(baseProduct, 60);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Insufficient stock');
    expect(res.updatedProduct.stockReservedOuter).toBe(0);
  });

  it('commits reserved stock permanently upon Owner approval and dispatch', () => {
    // Starting with 20 reserved bags out of 50 physical
    const reservedProduct: Product = { ...baseProduct, stockPhysicalOuter: 50, stockReservedOuter: 20 };

    const committed = commitReservedStock(reservedProduct, 20);
    // Physical stock drops to 30
    expect(committed.stockPhysicalOuter).toBe(30);
    // Reserved resets to 0
    expect(committed.stockReservedOuter).toBe(0);
    // Available remains 30
    expect(getAvailableOuterStock(committed)).toBe(30);
  });

  it('releases reserved stock back to available upon cancellation or rejection', () => {
    const reservedProduct: Product = { ...baseProduct, stockPhysicalOuter: 50, stockReservedOuter: 20 };

    const released = releaseReservedStock(reservedProduct, 20);
    // Physical remains 50
    expect(released.stockPhysicalOuter).toBe(50);
    // Reserved resets to 0
    expect(released.stockReservedOuter).toBe(0);
    // Available returns to 50
    expect(getAvailableOuterStock(released)).toBe(50);
  });
});
