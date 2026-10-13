import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { LocalStorageAdapter } from '../lib/storage/local-adapter';

describe('LocalStorageAdapter', () => {
  const testStorePath = path.join(process.cwd(), 'data', 'test-store.json');
  let storage: LocalStorageAdapter;

  beforeEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }
    storage = new LocalStorageAdapter(testStorePath);
  });

  afterEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }
  });

  it('initializes automatically with realistic bakery seed data', async () => {
    const products = await storage.getProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products.some((p) => p.name.includes('Sourdough'))).toBe(true);

    const brand = await storage.getBrandProfile();
    expect(brand.businessName).toBe('WarmCrust Artisan Bakery & Café');
  });

  it('performs full Product CRUD', async () => {
    // Create
    const created = await storage.createProduct({
      name: 'Vegan Gluten-Free Brownie',
      category: 'pastry',
      sellingPrice: 4.5,
      unitCost: 1.2,
      currentStock: 15,
      reorderThreshold: 5,
      expiryDate: '2026-10-18',
      description: 'Valrhona dark chocolate with almond flour',
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Vegan Gluten-Free Brownie');

    // Read
    const found = await storage.getProductById(created.id);
    expect(found?.sellingPrice).toBe(4.5);

    // Update
    const updated = await storage.updateProduct(created.id, {
      sellingPrice: 4.95,
      currentStock: 12,
    });
    expect(updated.sellingPrice).toBe(4.95);
    expect(updated.currentStock).toBe(12);

    // Delete
    const deleted = await storage.deleteProduct(created.id);
    expect(deleted).toBe(true);
    const notFound = await storage.getProductById(created.id);
    expect(notFound).toBeNull();
  });

  it('records transactions and decrements inventory stock accurately', async () => {
    const products = await storage.getProducts();
    const product = products[0];
    const initialStock = product.currentStock;

    const tx = await storage.recordTransaction({
      productId: product.id,
      quantitySold: 2,
      sellingPrice: product.sellingPrice,
      discount: 1.0,
      notes: 'Customer discount test',
    });

    expect(tx.id).toBeDefined();
    expect(tx.quantitySold).toBe(2);
    expect(tx.totalRevenue).toBe(Number((2 * product.sellingPrice - 1.0).toFixed(2)));

    // Verify stock was decremented
    const refreshedProduct = await storage.getProductById(product.id);
    expect(refreshedProduct?.currentStock).toBe(initialStock - 2);

    // Verify transaction list includes new transaction
    const transactions = await storage.getTransactions();
    expect(transactions[0].id).toBe(tx.id);
  });
});
