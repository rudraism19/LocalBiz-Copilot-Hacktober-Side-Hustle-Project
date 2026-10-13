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
import { INITIAL_BRAND_PROFILE } from './seed-data';

export class SupabaseStorageAdapter implements StorageAdapter {
  name: 'supabase' = 'supabase';
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(
      this.supabaseUrl &&
      this.supabaseKey &&
      this.supabaseUrl.startsWith('https://')
    );
  }

  private async fetchSupabase<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error(
        'Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local.'
      );
    }

    const url = `${this.supabaseUrl}/rest/v1/${endpoint}`;
    const headers: Record<string, string> = {
      'apikey': this.supabaseKey,
      'Authorization': `Bearer ${this.supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Supabase error [${res.status}]: ${errorText}`);
    }

    // For 204 or empty delete responses
    if (res.status === 204) {
      return {} as T;
    }

    return res.json() as Promise<T>;
  }

  async getProducts(): Promise<Product[]> {
    return this.fetchSupabase<Product[]>('products?select=*&order=createdAt.desc');
  }

  async getProductById(id: string): Promise<Product | null> {
    const list = await this.fetchSupabase<Product[]>(`products?id=eq.${encodeURIComponent(id)}&select=*`);
    return list[0] || null;
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const newProduct: Product = {
      ...input,
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const created = await this.fetchSupabase<Product[]>('products', {
      method: 'POST',
      body: JSON.stringify(newProduct),
    });
    return created[0] || newProduct;
  }

  async updateProduct(id: string, updates: Partial<CreateProductInput>): Promise<Product> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const updated = await this.fetchSupabase<Product[]>(`products?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return updated[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    await this.fetchSupabase(`products?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  }

  async getTransactions(limit: number = 50): Promise<SaleTransaction[]> {
    return this.fetchSupabase<SaleTransaction[]>(`sale_transactions?select=*&order=timestamp.desc&limit=${limit}`);
  }

  async recordTransaction(input: RecordSaleInput): Promise<SaleTransaction> {
    const product = await this.getProductById(input.productId);
    if (!product) {
      throw new Error(`Product ${input.productId} not found.`);
    }

    const price = input.sellingPrice ?? product.sellingPrice;
    const discount = input.discount ?? 0;
    const totalRevenue = Number((input.quantitySold * price - discount).toFixed(2));

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

    // Insert transaction
    await this.fetchSupabase<SaleTransaction[]>('sale_transactions', {
      method: 'POST',
      body: JSON.stringify(newTx),
    });

    // Update product stock
    const updatedStock = Math.max(0, product.currentStock - input.quantitySold);
    await this.updateProduct(product.id, { currentStock: updatedStock });

    return newTx;
  }

  async getBrandProfile(): Promise<BrandProfile> {
    const list = await this.fetchSupabase<BrandProfile[]>('brand_profiles?select=*&limit=1');
    return list[0] || INITIAL_BRAND_PROFILE;
  }

  async updateBrandProfile(updates: Partial<BrandProfile>): Promise<BrandProfile> {
    const current = await this.getBrandProfile();
    const updated = { ...current, ...updates };
    const saved = await this.fetchSupabase<BrandProfile[]>('brand_profiles', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(updated),
    });
    return saved[0] || updated;
  }

  async getBriefings(limit: number = 10): Promise<DailyBriefing[]> {
    return this.fetchSupabase<DailyBriefing[]>(`daily_briefings?select=*&order=generatedAt.desc&limit=${limit}`);
  }

  async getLatestBriefing(): Promise<DailyBriefing | null> {
    const list = await this.getBriefings(1);
    return list[0] || null;
  }

  async saveBriefing(briefing: DailyBriefing): Promise<void> {
    await this.fetchSupabase('daily_briefings', {
      method: 'POST',
      body: JSON.stringify(briefing),
    });
  }

  async getMarketingHistory(limit: number = 20): Promise<MarketingContentResult[]> {
    return this.fetchSupabase<MarketingContentResult[]>(`marketing_history?select=*&order=generatedAt.desc&limit=${limit}`);
  }

  async saveMarketingContent(content: MarketingContentResult): Promise<void> {
    await this.fetchSupabase('marketing_history', {
      method: 'POST',
      body: JSON.stringify(content),
    });
  }

  async resetToSampleData(): Promise<void> {
    throw new Error('Resetting remote Supabase sample data requires admin database migration script.');
  }
}
