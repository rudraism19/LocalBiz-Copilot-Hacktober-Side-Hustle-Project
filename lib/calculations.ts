import { Product, SaleTransaction } from './types';

export interface InventoryMetrics {
  totalProducts: number;
  totalUnitsInStock: number;
  lowStockCount: number;
  expiringSoonCount: number;
  totalInventoryRetailValue: number;
  totalInventoryCostKnown: number;
  productsWithMissingCost: number;
}

export interface FinancialMetrics {
  totalRevenue: number;
  totalGrossProfit: number | null; // null if all transactions lack cost info
  totalUnitsSold: number;
  transactionCount: number;
  averageOrderValue: number;
  overallGrossMarginPercentage: number | null; // null if any cost is missing
  hasMissingCosts: boolean;
  transactionsWithMissingCost: number;
}

export interface ProductHealthStatus {
  product: Product;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
  stockStatus: 'out_of_stock' | 'critical' | 'low' | 'healthy';
  unitMargin: number | null;
  unitMarginPercentage: number | null;
}

/**
 * Calculates stock level alerts and expiry status.
 * Deterministic business logic executed outside of any LLM.
 */
export function evaluateProductHealth(
  product: Product,
  referenceDate: Date = new Date()
): ProductHealthStatus {
  const isOutOfStock = product.currentStock === 0;
  const isCritical = product.currentStock > 0 && product.currentStock <= Math.floor(product.reorderThreshold / 2);
  const isLowStock = product.currentStock <= product.reorderThreshold;

  let stockStatus: ProductHealthStatus['stockStatus'] = 'healthy';
  if (isOutOfStock) stockStatus = 'out_of_stock';
  else if (isCritical) stockStatus = 'critical';
  else if (isLowStock) stockStatus = 'low';

  let daysUntilExpiry: number | null = null;
  let isExpiringSoon = false;

  if (product.expiryDate) {
    const expiry = new Date(product.expiryDate);
    const diffTime = expiry.getTime() - referenceDate.getTime();
    daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Considered expiring soon if within 3 days or already expired
    isExpiringSoon = daysUntilExpiry <= 3;
  }

  // Margin calculation strictly only when unit cost is known and valid
  let unitMargin: number | null = null;
  let unitMarginPercentage: number | null = null;

  if (product.unitCost !== null && product.unitCost !== undefined && product.unitCost >= 0) {
    unitMargin = product.sellingPrice - product.unitCost;
    unitMarginPercentage = product.sellingPrice > 0 ? (unitMargin / product.sellingPrice) * 100 : 0;
  }

  return {
    product,
    isLowStock,
    isExpiringSoon,
    daysUntilExpiry,
    stockStatus,
    unitMargin,
    unitMarginPercentage,
  };
}

/**
 * Calculates aggregated inventory metrics.
 */
export function calculateInventoryMetrics(
  products: Product[],
  referenceDate: Date = new Date()
): InventoryMetrics {
  let totalUnitsInStock = 0;
  let lowStockCount = 0;
  let expiringSoonCount = 0;
  let totalInventoryRetailValue = 0;
  let totalInventoryCostKnown = 0;
  let productsWithMissingCost = 0;

  for (const product of products) {
    totalUnitsInStock += product.currentStock;
    totalInventoryRetailValue += product.currentStock * product.sellingPrice;

    if (product.unitCost !== null && product.unitCost !== undefined && product.unitCost >= 0) {
      totalInventoryCostKnown += product.currentStock * product.unitCost;
    } else {
      productsWithMissingCost += 1;
    }

    const health = evaluateProductHealth(product, referenceDate);
    if (health.isLowStock) lowStockCount += 1;
    if (health.isExpiringSoon) expiringSoonCount += 1;
  }

  return {
    totalProducts: products.length,
    totalUnitsInStock,
    lowStockCount,
    expiringSoonCount,
    totalInventoryRetailValue: Number(totalInventoryRetailValue.toFixed(2)),
    totalInventoryCostKnown: Number(totalInventoryCostKnown.toFixed(2)),
    productsWithMissingCost,
  };
}

/**
 * Calculates aggregated sales and profit metrics deterministically.
 * Guardrail: Never assumes 100% margin or zero cost when unitCost is missing.
 */
export function calculateFinancialMetrics(
  transactions: SaleTransaction[],
  productsMap: Map<string, Product> = new Map()
): FinancialMetrics {
  let totalRevenue = 0;
  let totalGrossProfit: number = 0;
  let totalUnitsSold = 0;
  let transactionsWithMissingCost = 0;

  for (const tx of transactions) {
    const netRevenue = tx.totalRevenue ?? (tx.quantitySold * tx.sellingPrice - (tx.discount || 0));
    totalRevenue += netRevenue;
    totalUnitsSold += tx.quantitySold;

    // Check cost snapshot on transaction or fallback to current product unitCost
    let costPerUnit: number | null | undefined = tx.unitCostSnapshot;
    if (costPerUnit === undefined || costPerUnit === null) {
      const prod = productsMap.get(tx.productId);
      costPerUnit = prod?.unitCost;
    }

    if (costPerUnit !== null && costPerUnit !== undefined && costPerUnit >= 0) {
      const cogs = tx.quantitySold * costPerUnit;
      const profit = netRevenue - cogs;
      totalGrossProfit += profit;
    } else {
      transactionsWithMissingCost += 1;
    }
  }

  const hasMissingCosts = transactionsWithMissingCost > 0;
  const transactionCount = transactions.length;
  const averageOrderValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

  // Margin percentage can only be reliably calculated if all transactions have cost data
  const overallGrossMarginPercentage =
    !hasMissingCosts && totalRevenue > 0
      ? (totalGrossProfit / totalRevenue) * 100
      : null;

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalGrossProfit: hasMissingCosts ? null : Number(totalGrossProfit.toFixed(2)),
    totalUnitsSold,
    transactionCount,
    averageOrderValue: Number(averageOrderValue.toFixed(2)),
    overallGrossMarginPercentage: overallGrossMarginPercentage !== null ? Number(overallGrossMarginPercentage.toFixed(1)) : null,
    hasMissingCosts,
    transactionsWithMissingCost,
  };
}

/**
 * Validates whether a proposed promotional discount fits within the owner's budget.
 */
export function validatePromotionBudget(
  monthlyBudget: number,
  expectedPromoImpact: number
): { isWithinBudget: boolean; remainingBudget: number; warning?: string } {
  const remainingBudget = monthlyBudget - expectedPromoImpact;
  if (expectedPromoImpact > monthlyBudget) {
    return {
      isWithinBudget: false,
      remainingBudget,
      warning: `The estimated promotional cost of $${expectedPromoImpact.toFixed(2)} exceeds your monthly budget of $${monthlyBudget.toFixed(2)}.`,
    };
  }
  return {
    isWithinBudget: true,
    remainingBudget,
  };
}

/**
 * AI Security & Guardrail: Sanitizes untrusted user inputs (like product descriptions)
 * to prevent prompt injection or instructions from executing in the model.
 */
export function sanitizeUntrustedInput(text: string, maxLength: number = 500): string {
  if (!text) return '';
  // Strip control characters, excessive backticks, prompt injection tokens
  const clean = text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/<\|.*?\|>/g, '') // remove special model tokens
    .replace(/\[INST\]|\[\/INST\]|System:|Human:|Assistant:/gi, '')
    .trim();
  return clean.slice(0, maxLength);
}
