import { Product } from '../contracts';

/**
 * Calculates the total weight of an outer bag given the inner packet weight and count.
 * Outer Bag Total Weight (kg) = Inner Bag Weight (kg) * Inner Bags Count
 */
export function calculateOuterBagWeight(innerBagWeightKg: number, innerBagsPerOuter: number): number {
  if (innerBagWeightKg <= 0 || innerBagsPerOuter <= 0) {
    throw new Error('Inner bag weight and count must be positive numbers');
  }
  return Number((innerBagWeightKg * innerBagsPerOuter).toFixed(2));
}

/**
 * Calculates the total net weight across all packaging forms in kilograms.
 */
export function calculateTotalStockWeightKg(
  outerBags: number,
  outerBagTotalKg: number,
  looseInnerBags: number = 0,
  innerBagWeightKg: number = 0,
  looseKg: number = 0
): number {
  const outerWeight = outerBags * outerBagTotalKg;
  const innerWeight = looseInnerBags * innerBagWeightKg;
  return Number((outerWeight + innerWeight + looseKg).toFixed(2));
}

/**
 * Auto-unpacks 1 outer master bag into its constituent loose inner packets.
 * Decrements stockPhysicalOuter by 1 and increments stockLooseInner by innerBagsPerOuter.
 */
export function unpackMasterBag(product: Product): { product: Product; success: boolean; error?: string } {
  if (product.stockPhysicalOuter <= 0) {
    return {
      product,
      success: false,
      error: 'Cannot unpack: No physical outer bags available in stock',
    };
  }

  const updatedProduct: Product = {
    ...product,
    stockPhysicalOuter: product.stockPhysicalOuter - 1,
    stockLooseInner: product.stockLooseInner + product.innerBagsPerOuter,
  };

  return {
    product: updatedProduct,
    success: true,
  };
}
