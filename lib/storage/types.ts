import {
  Product,
  CreateProductInput,
  SaleTransaction,
  RecordSaleInput,
  BrandProfile,
  DailyBriefing,
  MarketingContentResult,
} from '../types';

export interface StorageAdapter {
  name: 'local_json' | 'supabase';
  isConfigured(): boolean;

  // Products
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  createProduct(input: CreateProductInput): Promise<Product>;
  updateProduct(id: string, updates: Partial<CreateProductInput>): Promise<Product>;
  deleteProduct(id: string): Promise<boolean>;

  // Transactions
  getTransactions(limit?: number): Promise<SaleTransaction[]>;
  recordTransaction(input: RecordSaleInput): Promise<SaleTransaction>;

  // Brand Profile
  getBrandProfile(): Promise<BrandProfile>;
  updateBrandProfile(updates: Partial<BrandProfile>): Promise<BrandProfile>;

  // Daily Briefings
  getBriefings(limit?: number): Promise<DailyBriefing[]>;
  getLatestBriefing(): Promise<DailyBriefing | null>;
  saveBriefing(briefing: DailyBriefing): Promise<void>;

  // Marketing History
  getMarketingHistory(limit?: number): Promise<MarketingContentResult[]>;
  saveMarketingContent(content: MarketingContentResult): Promise<void>;

  // Demo / Reset
  resetToSampleData(): Promise<void>;
}
