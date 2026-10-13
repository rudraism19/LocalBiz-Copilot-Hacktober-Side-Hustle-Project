import fs from 'fs';
import path from 'path';
import {
  Product,
  CreateProductInput,
  SaleTransaction,
  RecordSaleInput,
  BrandProfile,
  DailyBriefing,
  MarketingContentResult,
} from '../types';
import { StorageAdapter } from './types';
import {
  INITIAL_BRAND_PROFILE,
  INITIAL_PRODUCTS,
  INITIAL_TRANSACTIONS,
  INITIAL_SAMPLE_BRIEFING,
} from './seed-data';

interface LocalStoreData {
  products: Product[];
  transactions: SaleTransaction[];
  brandProfile: BrandProfile;
  briefings: DailyBriefing[];
  marketingHistory: MarketingContentResult[];
}

export class LocalStorageAdapter implements StorageAdapter {
  name: 'local_json' = 'local_json';
  private filePath: string;
  private isInitialized = false;

  constructor(customPath?: string) {
    this.filePath =
      customPath ||
      path.join(process.cwd(), 'data', 'local-biz-store.json');
  }

  isConfigured(): boolean {
    return true; // Always available in local dev without credentials
  }

  private ensureInitialized(): LocalStoreData {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      const initialData: LocalStoreData = {
        products: [...INITIAL_PRODUCTS],
        transactions: [...INITIAL_TRANSACTIONS],
        brandProfile: { ...INITIAL_BRAND_PROFILE },
        briefings: [INITIAL_SAMPLE_BRIEFING],
        marketingHistory: [],
      };
      fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2), 'utf-8');
      this.isInitialized = true;
      return initialData;
    }

    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(content) as LocalStoreData;
      this.isInitialized = true;
      return parsed;
    } catch {
      // If corrupted, re-seed safely
      const initialData: LocalStoreData = {
        products: [...INITIAL_PRODUCTS],
        transactions: [...INITIAL_TRANSACTIONS],
        brandProfile: { ...INITIAL_BRAND_PROFILE },
        briefings: [INITIAL_SAMPLE_BRIEFING],
        marketingHistory: [],
      };
      fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
  }

  private writeData(data: LocalStoreData): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${this.filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, this.filePath);
  }

  async getProducts(): Promise<Product[]> {
    const data = this.ensureInitialized();
    return data.products;
  }

  async getProductById(id: string): Promise<Product | null> {
    const data = this.ensureInitialized();
    return data.products.find((p) => p.id === id) || null;
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const data = this.ensureInitialized();
    const newProduct: Product = {
      ...input,
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.products.push(newProduct);
    this.writeData(data);
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<CreateProductInput>): Promise<Product> {
    const data = this.ensureInitialized();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Product with ID "${id}" not found.`);
    }

    const updated: Product = {
      ...data.products[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    data.products[index] = updated;
    this.writeData(data);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const data = this.ensureInitialized();
    const initialLen = data.products.length;
    data.products = data.products.filter((p) => p.id !== id);
    if (data.products.length !== initialLen) {
      this.writeData(data);
      return true;
    }
    return false;
  }

  async getTransactions(limit?: number): Promise<SaleTransaction[]> {
    const data = this.ensureInitialized();
    const sorted = [...data.transactions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async recordTransaction(input: RecordSaleInput): Promise<SaleTransaction> {
    const data = this.ensureInitialized();
    const product = data.products.find((p) => p.id === input.productId);
    if (!product) {
      throw new Error(`Product with ID "${input.productId}" not found.`);
    }

    const price = input.sellingPrice ?? product.sellingPrice;
    const discount = input.discount ?? 0;
    const totalRevenue = Number((input.quantitySold * price - discount).toFixed(2));

    // Calculate profit snapshot only when cost is known
    let estimatedGrossProfit: number | null = null;
    if (product.unitCost !== null && product.unitCost !== undefined && product.unitCost >= 0) {
      const cogs = input.quantitySold * product.unitCost;
      estimatedGrossProfit = Number((totalRevenue - cogs).toFixed(2));
    }

    const newTx: SaleTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      productName: product.name,
      quantitySold: input.quantitySold,
      sellingPrice: price,
      discount,
      totalRevenue,
      unitCostSnapshot: product.unitCost ?? null,
      estimatedGrossProfit,
      timestamp: new Date().toISOString(),
      notes: input.notes,
    };

    data.transactions.push(newTx);

    // Atomically decrement stock
    product.currentStock = Math.max(0, product.currentStock - input.quantitySold);
    product.updatedAt = new Date().toISOString();

    this.writeData(data);
    return newTx;
  }

  async getBrandProfile(): Promise<BrandProfile> {
    const data = this.ensureInitialized();
    return data.brandProfile;
  }

  async updateBrandProfile(updates: Partial<BrandProfile>): Promise<BrandProfile> {
    const data = this.ensureInitialized();
    data.brandProfile = {
      ...data.brandProfile,
      ...updates,
    };
    this.writeData(data);
    return data.brandProfile;
  }

  async getBriefings(limit: number = 10): Promise<DailyBriefing[]> {
    const data = this.ensureInitialized();
    const sorted = [...data.briefings].sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
    return sorted.slice(0, limit);
  }

  async getLatestBriefing(): Promise<DailyBriefing | null> {
    const briefings = await this.getBriefings(1);
    return briefings[0] || null;
  }

  async saveBriefing(briefing: DailyBriefing): Promise<void> {
    const data = this.ensureInitialized();
    data.briefings.unshift(briefing);
    // Keep max 30 history
    if (data.briefings.length > 30) {
      data.briefings = data.briefings.slice(0, 30);
    }
    this.writeData(data);
  }

  async getMarketingHistory(limit: number = 20): Promise<MarketingContentResult[]> {
    const data = this.ensureInitialized();
    const sorted = [...data.marketingHistory].sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
    return sorted.slice(0, limit);
  }

  async saveMarketingContent(content: MarketingContentResult): Promise<void> {
    const data = this.ensureInitialized();
    data.marketingHistory.unshift(content);
    if (data.marketingHistory.length > 50) {
      data.marketingHistory = data.marketingHistory.slice(0, 50);
    }
    this.writeData(data);
  }

  async resetToSampleData(): Promise<void> {
    const initialData: LocalStoreData = {
      products: [...INITIAL_PRODUCTS],
      transactions: [...INITIAL_TRANSACTIONS],
      brandProfile: { ...INITIAL_BRAND_PROFILE },
      briefings: [INITIAL_SAMPLE_BRIEFING],
      marketingHistory: [],
    };
    this.writeData(initialData);
  }
}
