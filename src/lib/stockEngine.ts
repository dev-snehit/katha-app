import { Product } from '../contracts';

/**
 * Calculates currently available stock for sale:
 * Available = Physical Stock - Reserved Stock
 */
export function getAvailableOuterStock(product: Product): number {
  return Math.max(0, product.stockPhysicalOuter - product.stockReservedOuter);
}

/**
 * Two-Stage Stock Allocation: Stage 1 (Reservation)
 * When an order is placed by Staff, stock is marked as RESERVED so other staff cannot oversell it.
 */
export function reserveStock(
  product: Product,
  quantityOuterBags: number
): { success: boolean; updatedProduct: Product; error?: string } {
  if (quantityOuterBags <= 0) {
    return { success: false, updatedProduct: product, error: 'Quantity must be positive' };
  }

  const available = getAvailableOuterStock(product);
  if (available < quantityOuterBags) {
    return {
      success: false,
      updatedProduct: product,
      error: `Insufficient stock: Requested ${quantityOuterBags} bags, but only ${available} available (${product.stockPhysicalOuter} physical, ${product.stockReservedOuter} already reserved)`,
    };
  }

  const updatedProduct: Product = {
    ...product,
    stockReservedOuter: product.stockReservedOuter + quantityOuterBags,
  };

  return { success: true, updatedProduct };
}

/**
 * Two-Stage Stock Allocation: Stage 2 (Commit / Deduction)
 * When an order is Approved by Owner and Dispatched, the reserved stock is committed:
 * - stockPhysicalOuter is reduced by the quantity
 * - stockReservedOuter is reduced by the quantity
 */
export function commitReservedStock(
  product: Product,
  quantityOuterBags: number
): Product {
  const newReserved = Math.max(0, product.stockReservedOuter - quantityOuterBags);
  const newPhysical = Math.max(0, product.stockPhysicalOuter - quantityOuterBags);

  return {
    ...product,
    stockPhysicalOuter: newPhysical,
    stockReservedOuter: newReserved,
  };
}

/**
 * Releases reserved stock back to available if an order is cancelled or rejected.
 */
export function releaseReservedStock(
  product: Product,
  quantityOuterBags: number
): Product {
  const newReserved = Math.max(0, product.stockReservedOuter - quantityOuterBags);
  return {
    ...product,
    stockReservedOuter: newReserved,
  };
}
